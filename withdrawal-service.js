import { getSupabaseClient } from './supabase-config.js';
import { TREASURY_CONFIG, initializeTreasuryWallet } from './treasury-config.js';

export class WithdrawalService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.treasuryWallet = null;
        this.tokenMint = null;
        this.connection = null;
        
        // Initialize treasury wallet
        this.initializeTreasury();
        console.log('[DEBUG] WithdrawalService initialized');
    }

    initializeTreasury() {
        console.log('[DEBUG] Initializing treasury wallet');
        
        if (!window.solanaWeb3) {
            console.log('[DEBUG] Solana Web3.js not available, treasury will initialize later');
            return;
        }
        
        try {
            this.treasuryWallet = initializeTreasuryWallet();
            if (this.treasuryWallet) {
                console.log('[DEBUG] Treasury wallet initialized successfully');
            }
        } catch (error) {
            console.error('[ERROR] Treasury wallet initialization failed:', error);
        }
    }

    async initializeSolana(treasuryPrivateKey, tokenMintAddress) {
        console.log('[DEBUG] Initializing Solana connection');
        
        if (!window.solanaWeb3) {
            console.error('[ERROR] Solana Web3.js not loaded');
            throw new Error('Solana Web3.js library not loaded');
        }

        try {
            this.connection = new window.solanaWeb3.Connection(
                window.solanaWeb3.clusterApiUrl('mainnet-beta'),
                'confirmed'
            );
            
            this.tokenMint = new window.solanaWeb3.PublicKey(tokenMintAddress);
            
            if (treasuryPrivateKey) {
                const secretKey = Uint8Array.from(JSON.parse(treasuryPrivateKey));
                this.treasuryWallet = window.solanaWeb3.Keypair.fromSecretKey(secretKey);
            }
            
            console.log('[DEBUG] Solana connection initialized successfully');
            return true;
        } catch (error) {
            console.error('[ERROR] Failed to initialize Solana:', error);
            throw error;
        }
    }

    validateSolanaAddress(address) {
        console.log('[DEBUG] Validating Solana address:', address);
        
        if (!address || typeof address !== 'string') {
            console.log('[DEBUG] Invalid address: not a string');
            return false;
        }

        if (address.length < 32 || address.length > 44) {
            console.log('[DEBUG] Invalid address: incorrect length');
            return false;
        }

        try {
            const publicKey = new window.solanaWeb3.PublicKey(address);
            const isValid = window.solanaWeb3.PublicKey.isOnCurve(publicKey.toBytes());
            console.log('[DEBUG] Address validation result:', isValid);
            return isValid;
        } catch (error) {
            console.log('[DEBUG] Invalid address: failed validation', error.message);
            return false;
        }
    }

    async createWithdrawalRequest(userId, amount, walletAddress) {
        console.log('[DEBUG] Creating withdrawal request for user:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            if (!this.validateSolanaAddress(walletAddress)) {
                throw new Error('Invalid Phantom wallet address');
            }

            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('current_balance')
                .eq('id', userId)
                .single();

            if (userError) {
                console.error('[ERROR] Failed to fetch user balance:', userError);
                throw userError;
            }

            if (userData.current_balance < amount) {
                throw new Error('Insufficient balance');
            }

            const minWithdrawal = 1000;
            if (amount < minWithdrawal) {
                throw new Error(`Minimum withdrawal amount is ${minWithdrawal} tokens`);
            }

            console.log('[DEBUG] Calling process_withdrawal function');
            
            const { data: withdrawalId, error: withdrawalError } = await this.supabase
                .rpc('process_withdrawal', {
                    user_id: userId,
                    withdrawal_amount: amount,
                    wallet_address: walletAddress
                });

            if (withdrawalError) {
                console.error('[ERROR] Withdrawal creation failed:', withdrawalError);
                throw withdrawalError;
            }

            console.log('[DEBUG] Withdrawal request created successfully:', withdrawalId);

            return {
                success: true,
                withdrawalId: withdrawalId,
                message: 'Withdrawal request created. Processing will begin shortly.'
            };

        } catch (error) {
            console.error('[ERROR] Withdrawal request failed:', error);
            throw error;
        }
    }

    async processWithdrawal(withdrawalId, retryCount = 0) {
        console.log(`[DEBUG] Processing withdrawal: ${withdrawalId} (attempt ${retryCount + 1}/3)`);
        
        // Initialize if not already done
        if (!this.connection) {
            // Use custom RPC endpoint from config for real transactions
            const rpcUrl = TREASURY_CONFIG.network === 'devnet' 
                ? 'https://api.devnet.solana.com'
                : TREASURY_CONFIG.rpcUrl; // Your Helius/Alchemy RPC endpoint
            
            this.connection = new window.solanaWeb3.Connection(
                rpcUrl,
                {
                    commitment: 'confirmed',
                    confirmTransactionInitialTimeout: 60000,
                    disableRetryOnRateLimit: false
                }
            );
            console.log('[DEBUG] Solana connection initialized with RPC:', rpcUrl);
        }
        
        if (!this.treasuryWallet) {
            this.initializeTreasury();
        }
        
        if (!this.tokenMint && TREASURY_CONFIG.tokenMintAddress) {
            this.tokenMint = new window.solanaWeb3.PublicKey(TREASURY_CONFIG.tokenMintAddress);
            console.log('[DEBUG] Token mint initialized:', TREASURY_CONFIG.tokenMintAddress);
        }
        
        if (!this.connection || !this.treasuryWallet || !this.tokenMint) {
            console.log('[DEBUG] Treasury not fully configured - withdrawal marked as pending');
            return {
                success: false,
                message: 'Treasury wallet not fully configured. Withdrawal pending manual processing.'
            };
        }

        try {
            const { data: withdrawal, error: fetchError } = await this.supabase
                .from('withdrawals')
                .select('*')
                .eq('id', withdrawalId)
                .single();

            if (fetchError || !withdrawal) {
                throw new Error('Withdrawal not found');
            }

            if (withdrawal.status !== 'pending') {
                throw new Error('Withdrawal already processed');
            }

            console.log('[DEBUG] Validating recipient address:', withdrawal.phantom_wallet_address);
            const recipientAddress = new window.solanaWeb3.PublicKey(withdrawal.phantom_wallet_address);
            
            // Update status to processing
            await this.supabase
                .from('withdrawals')
                .update({ status: 'processing' })
                .eq('id', withdrawalId);
            
            console.log('[DEBUG] Getting treasury token account');
            const treasuryTokenAccount = await this.getOrCreateTokenAccount(
                this.treasuryWallet.publicKey
            );
            console.log('[DEBUG] Treasury token account:', treasuryTokenAccount.toString());
            
            console.log('[DEBUG] Getting recipient token account');
            const recipientTokenAccount = await this.getOrCreateTokenAccount(
                recipientAddress
            );
            console.log('[DEBUG] Recipient token account:', recipientTokenAccount.toString());

            // Check treasury balance
            const treasuryBalance = await this.connection.getTokenAccountBalance(treasuryTokenAccount);
            console.log('[DEBUG] Treasury balance:', treasuryBalance.value.amount);
            
            if (BigInt(treasuryBalance.value.amount) < BigInt(withdrawal.amount)) {
                throw new Error(`Insufficient treasury balance. Has: ${treasuryBalance.value.amount}, Needs: ${withdrawal.amount}`);
            }

            console.log('[DEBUG] Creating transaction for', withdrawal.amount, 'tokens');
            const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            
            // Create transfer instruction data (instruction 3 = Transfer)
            const dataLayout = new Uint8Array(9);
            dataLayout[0] = 3; // Transfer instruction
            const amountBytes = new BigUint64Array([BigInt(withdrawal.amount)]);
            dataLayout.set(new Uint8Array(amountBytes.buffer), 1);
            
            const keys = [
                { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
                { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
                { pubkey: this.treasuryWallet.publicKey, isSigner: true, isWritable: false }
            ];
            
            const transferInstruction = new window.solanaWeb3.TransactionInstruction({
                keys,
                programId: TOKEN_PROGRAM_ID,
                data: dataLayout
            });
            
            const transaction = new window.solanaWeb3.Transaction().add(transferInstruction);

            // Get recent blockhash
            const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.treasuryWallet.publicKey;
            
            console.log('[DEBUG] Signing and sending transaction');
            const signature = await window.solanaWeb3.sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.treasuryWallet],
                {
                    commitment: 'confirmed',
                    maxRetries: 3
                }
            );

            console.log('[DEBUG] Transaction confirmed:', signature);
            
            // Verify transaction on chain
            const txStatus = await this.connection.getSignatureStatus(signature);
            console.log('[DEBUG] Transaction status:', txStatus);

            const { error: updateError } = await this.supabase
                .from('withdrawals')
                .update({
                    status: 'completed',
                    transaction_hash: signature,
                    processed_at: new Date().toISOString()
                })
                .eq('id', withdrawalId);

            if (updateError) {
                console.error('[ERROR] Failed to update withdrawal status:', updateError);
            }

            return {
                success: true,
                transactionHash: signature,
                message: 'Withdrawal processed successfully'
            };

        } catch (error) {
            console.error(`[ERROR] Withdrawal processing failed (attempt ${retryCount + 1}):`, error);

            // Retry logic for network errors
            const retryableErrors = [
                'blockhash not found',
                'Transaction was not confirmed',
                'Network request failed',
                'timeout'
            ];
            
            const shouldRetry = retryableErrors.some(msg => 
                error.message?.toLowerCase().includes(msg.toLowerCase())
            ) && retryCount < 2;

            if (shouldRetry) {
                console.log(`[DEBUG] Retrying withdrawal ${withdrawalId} in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                return this.processWithdrawal(withdrawalId, retryCount + 1);
            }

            // Mark as failed after retries exhausted
            await this.supabase
                .from('withdrawals')
                .update({
                    status: 'failed',
                    error_message: `${error.message} (after ${retryCount + 1} attempts)`
                })
                .eq('id', withdrawalId);

            throw error;
        }
    }

    async getOrCreateTokenAccount(ownerPublicKey) {
        console.log('[DEBUG] Getting or creating token account for:', ownerPublicKey.toString());
        
        // Use solanaWeb3 for token operations since splToken might not be available
        const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        // Calculate associated token address
        const [associatedTokenAddress] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [
                ownerPublicKey.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                this.tokenMint.toBuffer()
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const accountInfo = await this.connection.getAccountInfo(associatedTokenAddress);

        if (accountInfo) {
            console.log('[DEBUG] Token account exists');
            return associatedTokenAddress;
        }

        console.log('[DEBUG] Creating new token account');
        
        // Create associated token account instruction manually
        const keys = [
            { pubkey: this.treasuryWallet.publicKey, isSigner: true, isWritable: true },
            { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
            { pubkey: ownerPublicKey, isSigner: false, isWritable: false },
            { pubkey: this.tokenMint, isSigner: false, isWritable: false },
            { pubkey: window.solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];
        
        const createAccountInstruction = new window.solanaWeb3.TransactionInstruction({
            keys,
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            data: new Uint8Array(0)
        });
        
        const transaction = new window.solanaWeb3.Transaction().add(createAccountInstruction);

        await window.solanaWeb3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.treasuryWallet]
        );

        return associatedTokenAddress;
    }

    async getWithdrawalHistory(userId) {
        console.log('[DEBUG] Fetching withdrawal history for user:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ERROR] Failed to fetch withdrawal history:', error);
                throw error;
            }

            console.log('[DEBUG] Withdrawal history fetched successfully');
            return data;

        } catch (error) {
            console.error('[ERROR] Withdrawal history fetch failed:', error);
            throw error;
        }
    }
}
