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
            // Use the RPC URL from treasury config instead of the default one
            this.connection = new window.solanaWeb3.Connection(
                TREASURY_CONFIG.rpcUrl,
                'confirmed'
            );
            console.log('[DEBUG] Using RPC URL:', TREASURY_CONFIG.rpcUrl);
            
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
        console.log('[DEBUG] Creating and processing withdrawal request for user:', userId);
        
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

            console.log('[DEBUG] Creating withdrawal with status "sent" and processing immediately');
            
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

            console.log('[DEBUG] Withdrawal created with ID:', withdrawalId);
            
            // Update status to 'sent' immediately
            const { error: statusError } = await this.supabase
                .from('withdrawals')
                .update({ status: 'sent' })
                .eq('id', withdrawalId);
                
            if (statusError) {
                console.error('[ERROR] Failed to update status to sent:', statusError);
                throw statusError;
            }

            console.log('[DEBUG] Status updated to "sent", processing blockchain transaction...');
            
            // Process withdrawal immediately
            const result = await this.processWithdrawal(withdrawalId);
            
            return result;

        } catch (error) {
            console.error('[ERROR] Withdrawal request failed:', error);
            throw error;
        }
    }

    async processWithdrawal(withdrawalId, retryCount = 0) {
        console.log(`[DEBUG] Processing withdrawal: ${withdrawalId}`);
        const redactedPublicKey = TREASURY_CONFIG.publicKey.substring(0, 4) + '...' + TREASURY_CONFIG.publicKey.substring(TREASURY_CONFIG.publicKey.length - 4);
        console.log('[DEBUG] Treasury config:', {
            publicKey: redactedPublicKey,
            tokenMint: TREASURY_CONFIG.tokenMintAddress,
            network: TREASURY_CONFIG.network,
            rpcUrl: TREASURY_CONFIG.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***REDACTED***')
        });
        
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
            console.log('[DEBUG] Solana connection initialized with RPC:', rpcUrl.replace(/api-key=[^&]+/, 'api-key=***REDACTED***'));
        }
        
        if (!this.treasuryWallet) {
            console.log('[DEBUG] Treasury wallet not initialized, initializing now...');
            this.initializeTreasury();
            if (!this.treasuryWallet) {
                console.error('[ERROR] Failed to initialize treasury wallet');
                return {
                    success: false,
                    message: 'Treasury wallet initialization failed. Check private key configuration.'
                };
            }
            const pubKey = this.treasuryWallet.publicKey.toString();
            console.log('[DEBUG] Treasury wallet initialized:', pubKey.substring(0, 4) + '...' + pubKey.substring(pubKey.length - 4));
        }
        
        if (!this.tokenMint && TREASURY_CONFIG.tokenMintAddress) {
            this.tokenMint = new window.solanaWeb3.PublicKey(TREASURY_CONFIG.tokenMintAddress);
            console.log('[DEBUG] Token mint initialized:', TREASURY_CONFIG.tokenMintAddress);
        }
        
        if (!this.connection || !this.treasuryWallet || !this.tokenMint) {
            console.error('[ERROR] Treasury not fully configured:', {
                hasConnection: !!this.connection,
                hasTreasuryWallet: !!this.treasuryWallet,
                hasTokenMint: !!this.tokenMint
            });
            return {
                success: false,
                message: 'Treasury wallet not fully configured. Withdrawal pending manual processing.'
            };
        }

        // Check treasury SOL balance before processing
        try {
            const solBalance = await this.connection.getBalance(this.treasuryWallet.publicKey);
            const solBalanceInSol = solBalance / 1e9;
            console.log(`[DEBUG] Treasury SOL balance: ${solBalanceInSol} SOL`);
            
            if (solBalance < 5000) { // Need at least 0.000005 SOL for fees
                console.error(`[ERROR] Insufficient SOL for transaction fees. Balance: ${solBalanceInSol} SOL`);
                const pubKey = this.treasuryWallet.publicKey.toString();
                console.error(`[ERROR] Please send SOL to treasury wallet: ${pubKey.substring(0, 4)}...${pubKey.substring(pubKey.length - 4)}`);
                return {
                    success: false,
                    message: `Treasury wallet has insufficient SOL (${solBalanceInSol} SOL). Please fund the wallet with at least 0.01 SOL to cover transaction fees.`
                };
            }
        } catch (balanceError) {
            console.error('[ERROR] Failed to check SOL balance:', balanceError);
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

            // Check if already processed
            if (withdrawal.status === 'completed') {
                console.log(`[DEBUG] Withdrawal ${withdrawalId} already completed`);
                return {
                    success: true,
                    transactionHash: withdrawal.transaction_hash,
                    message: 'Withdrawal already completed'
                };
            }
            
            if (withdrawal.status === 'failed') {
                console.log(`[DEBUG] Withdrawal ${withdrawalId} already failed`);
                throw new Error('Withdrawal already failed');
            }

            // Only process if status is 'sent'
            if (withdrawal.status !== 'sent') {
                console.log(`[DEBUG] Withdrawal ${withdrawalId} has invalid status: ${withdrawal.status}`);
                throw new Error(`Withdrawal status must be "sent" to process, current status: ${withdrawal.status}`);
            }

            // Check if transaction was already sent (has transaction_hash)
            if (withdrawal.transaction_hash) {
                console.log(`[DEBUG] Withdrawal ${withdrawalId} already has transaction hash: ${withdrawal.transaction_hash}`);
                console.log(`[DEBUG] Marking as completed`);
                
                await this.supabase
                    .from('withdrawals')
                    .update({
                        status: 'completed',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', withdrawalId);
                
                return {
                    success: true,
                    transactionHash: withdrawal.transaction_hash,
                    message: 'Withdrawal already completed (transaction hash exists)'
                };
            }
            
            console.log(`[DEBUG] Processing withdrawal ${withdrawalId}`);
            console.log('[DEBUG] Validating recipient address:', withdrawal.phantom_wallet_address);
            const recipientAddress = new window.solanaWeb3.PublicKey(withdrawal.phantom_wallet_address);
            
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
            
            // Use SPL Token library for transfer instruction
            const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
            
            // Create transfer instruction using SPL Token if available, otherwise manual
            let transferInstruction;
            
            if (window.splToken && window.splToken.createTransferInstruction) {
                console.log('[DEBUG] Using SPL Token library for transfer');
                transferInstruction = window.splToken.createTransferInstruction(
                    treasuryTokenAccount,
                    recipientTokenAccount,
                    this.treasuryWallet.publicKey,
                    BigInt(withdrawal.amount),
                    [],
                    TOKEN_PROGRAM_ID
                );
            } else {
                console.log('[DEBUG] Using manual transfer instruction');
                // Fallback to manual instruction
                const dataLayout = new Uint8Array(9);
                dataLayout[0] = 3; // Transfer instruction
                const amountBytes = new BigUint64Array([BigInt(withdrawal.amount)]);
                dataLayout.set(new Uint8Array(amountBytes.buffer), 1);
                
                const keys = [
                    { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: recipientTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: this.treasuryWallet.publicKey, isSigner: true, isWritable: false }
                ];
                
                transferInstruction = new window.solanaWeb3.TransactionInstruction({
                    keys,
                    programId: TOKEN_PROGRAM_ID,
                    data: dataLayout
                });
            }
            
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

            console.log('[DEBUG] ✅ BLOCKCHAIN TRANSACTION SUCCESSFUL');
            console.log('[DEBUG] Transaction signature:', signature);
            
            // Verify transaction on chain
            const txStatus = await this.connection.getSignatureStatus(signature);
            console.log('[DEBUG] Transaction status:', txStatus);
            
            if (txStatus?.value?.err) {
                console.error('[ERROR] Transaction failed on-chain:', txStatus.value.err);
                throw new Error(`Transaction failed on-chain: ${JSON.stringify(txStatus.value.err)}`);
            }

            // Update status to 'completed' with transaction details
            console.log(`[DEBUG] Updating withdrawal ${withdrawalId} to 'completed'`);
            const currentTime = new Date().toISOString();
            const { error: updateError } = await this.supabase
                .from('withdrawals')
                .update({
                    status: 'completed',
                    transaction_hash: signature,
                    processed_at: currentTime,
                    error_message: null
                })
                .eq('id', withdrawalId);

            if (updateError) {
                console.error('[ERROR] Failed to update withdrawal status:', updateError);
                console.error('[ERROR] Transaction sent successfully:', signature);
                console.error('[ERROR] Please manually update the database!');
            } else {
                console.log('[DEBUG] ✅ Withdrawal completed successfully');
                console.log('[DEBUG] Transaction Hash:', signature);
            }

            return {
                success: true,
                transactionHash: signature,
                message: 'Withdrawal processed successfully'
            };

        } catch (error) {
            console.error('[ERROR] Withdrawal processing failed:', error);
            console.error('[ERROR] Error details:', {
                message: error.message,
                stack: error.stack?.substring(0, 200)
            });

            // Mark as failed
            console.error(`[ERROR] Marking withdrawal ${withdrawalId} as FAILED`);
            const { error: failError } = await this.supabase
                .from('withdrawals')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    processed_at: new Date().toISOString()
                })
                .eq('id', withdrawalId);

            if (failError) {
                console.error('[ERROR] Failed to update withdrawal to failed status:', failError);
            }

            return {
                success: false,
                message: error.message || 'Withdrawal processing failed'
            };
        }
    }

    async getOrCreateTokenAccount(ownerPublicKey) {
        const ownerPubKey = ownerPublicKey.toString();
        console.log('[DEBUG] Getting or creating token account for:', ownerPubKey.substring(0, 4) + '...' + ownerPubKey.substring(ownerPubKey.length - 4));
        
        const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        
        // Calculate associated token address using SPL Token library if available
        let associatedTokenAddress;
        
        if (window.splToken && window.splToken.getAssociatedTokenAddress) {
            console.log('[DEBUG] Using SPL Token library for ATA derivation');
            associatedTokenAddress = await window.splToken.getAssociatedTokenAddress(
                this.tokenMint,
                ownerPublicKey,
                false,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
        } else {
            console.log('[DEBUG] Using manual ATA derivation');
            // Fallback to manual derivation
            const [ata] = await window.solanaWeb3.PublicKey.findProgramAddress(
                [
                    ownerPublicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    this.tokenMint.toBuffer()
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            associatedTokenAddress = ata;
        }

        console.log('[DEBUG] Associated token address:', associatedTokenAddress.toString());
        const accountInfo = await this.connection.getAccountInfo(associatedTokenAddress);

        if (accountInfo) {
            console.log('[DEBUG] Token account exists');
            return associatedTokenAddress;
        }

        console.log('[DEBUG] Creating new token account');
        
        // Create associated token account instruction
        let createAccountInstruction;
        
        if (window.splToken && window.splToken.createAssociatedTokenAccountInstruction) {
            console.log('[DEBUG] Using SPL Token library for ATA creation');
            createAccountInstruction = window.splToken.createAssociatedTokenAccountInstruction(
                this.treasuryWallet.publicKey,
                associatedTokenAddress,
                ownerPublicKey,
                this.tokenMint,
                TOKEN_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
        } else {
            console.log('[DEBUG] Using manual ATA creation instruction');
            // Fallback to manual instruction
            const keys = [
                { pubkey: this.treasuryWallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
                { pubkey: ownerPublicKey, isSigner: false, isWritable: false },
                { pubkey: this.tokenMint, isSigner: false, isWritable: false },
                { pubkey: window.solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
            
            createAccountInstruction = new window.solanaWeb3.TransactionInstruction({
                keys,
                programId: ASSOCIATED_TOKEN_PROGRAM_ID,
                data: new Uint8Array(0)
            });
        }
        
        const transaction = new window.solanaWeb3.Transaction().add(createAccountInstruction);

        console.log('[DEBUG] Sending create ATA transaction');
        await window.solanaWeb3.sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.treasuryWallet],
            {
                commitment: 'confirmed',
                maxRetries: 3
            }
        );

        console.log('[DEBUG] Token account created successfully');
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
