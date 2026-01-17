// Backend server for Alon Fart Game
// Handles Solana transactions securely - private keys never exposed to frontend
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } = require('@solana/spl-token');

// DEBUG: Token-2022 program ID for tokens using the new token standard
const TOKEN_2022_PROGRAM = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const { createClient } = require('@supabase/supabase-js');

// Validate required environment variables
const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SOLANA_RPC_URL',
    'SOLANA_NETWORK',
    'TREASURY_PRIVATE_KEY',
    'TOKEN_MINT_ADDRESS'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('=========================================');
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES');
    console.error('=========================================');
    console.error('The following environment variables are required but not set:');
    missingEnvVars.forEach(varName => {
        console.error(`  - ${varName}`);
    });
    console.error('\nPlease set these variables in:');
    console.error('  - Railway Dashboard → Variables tab (for production)');
    console.error('  - .env file (for local development)');
    console.error('\nSee RAILWAY_ENVIRONMENT_SETUP.md for detailed instructions.');
    console.error('=========================================');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Debug logging helper
const debug = (message, data = '') => {
    console.log(`[DEBUG] ${message}`, data);
};

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
debug('Supabase client initialized');

// Initialize Solana connection
const connection = new Connection(
    process.env.SOLANA_RPC_URL,
    {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
    }
);
debug('Solana connection initialized:', process.env.SOLANA_NETWORK);

// Initialize treasury wallet from private key
let treasuryKeypair = null;
let tokenMint = null;

// DEBUG: Token decimals - SPL tokens typically have 6 decimals
const TOKEN_DECIMALS = 6;

function initializeTreasury() {
    debug('Initializing treasury wallet...');
    
    try {
        // Decode base58 private key
        const bs58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const base58ToBytes = (str) => {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                let carry = bs58Alphabet.indexOf(str[i]);
                if (carry < 0) throw new Error('Invalid base58 character');
                for (let j = 0; j < bytes.length; j++) {
                    carry += bytes[j] * 58;
                    bytes[j] = carry & 0xff;
                    carry >>= 8;
                }
                while (carry > 0) {
                    bytes.push(carry & 0xff);
                    carry >>= 8;
                }
            }
            for (let i = 0; i < str.length && str[i] === '1'; i++) {
                bytes.push(0);
            }
            return new Uint8Array(bytes.reverse());
        };
        
        const secretKey = base58ToBytes(process.env.TREASURY_PRIVATE_KEY);
        treasuryKeypair = Keypair.fromSecretKey(secretKey);
        tokenMint = new PublicKey(process.env.TOKEN_MINT_ADDRESS);
        
        const pubKey = treasuryKeypair.publicKey.toString();
        debug('Treasury wallet initialized successfully');
        debug('Public Key:', pubKey.substring(0, 8) + '...' + pubKey.substring(pubKey.length - 4));
        debug('Token Mint:', process.env.TOKEN_MINT_ADDRESS);
        
        return true;
    } catch (error) {
        console.error('[ERROR] Failed to initialize treasury:', error.message);
        return false;
    }
}

// Initialize on startup
initializeTreasury();

// API: Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        treasury: !!treasuryKeypair,
        network: process.env.SOLANA_NETWORK
    });
});

// API: Get treasury public key (safe to expose)
app.get('/api/treasury/info', (req, res) => {
    if (!treasuryKeypair) {
        return res.status(500).json({ error: 'Treasury not initialized' });
    }
    
    res.json({
        publicKey: treasuryKeypair.publicKey.toString(),
        tokenMint: process.env.TOKEN_MINT_ADDRESS,
        network: process.env.SOLANA_NETWORK
    });
});

// API: Process withdrawal (main secure endpoint)
app.post('/api/withdraw', async (req, res) => {
    debug('=== WITHDRAWAL REQUEST RECEIVED ===');
    
    const { withdrawalId, userId, amount, walletAddress } = req.body;
    
    debug('Request data:', { withdrawalId, userId, amount, walletAddress: walletAddress?.substring(0, 8) + '...' });
    
    if (!withdrawalId || !userId || !amount || !walletAddress) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!treasuryKeypair || !tokenMint) {
        console.error('[ERROR] Treasury not initialized');
        return res.status(500).json({ error: 'Treasury not configured' });
    }
    
    // DEBUG: Convert amount to smallest units (multiply by 10^decimals)
    // User's game balance is in whole tokens, but blockchain needs smallest units
    const amountInSmallestUnits = BigInt(amount) * BigInt(10 ** TOKEN_DECIMALS);
    debug('Amount conversion:', { originalAmount: amount, amountInSmallestUnits: amountInSmallestUnits.toString() });
    
    try {
        // Validate wallet address
        let recipientPubkey;
        try {
            recipientPubkey = new PublicKey(walletAddress);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }
        
        // Check treasury SOL balance for fees
        const solBalance = await connection.getBalance(treasuryKeypair.publicKey);
        debug('Treasury SOL balance:', solBalance / 1e9, 'SOL');
        
        if (solBalance < 5000) {
            console.error('[ERROR] Insufficient SOL for fees');
            return res.status(500).json({ 
                error: 'Treasury has insufficient SOL for transaction fees',
                details: `Balance: ${solBalance / 1e9} SOL`
            });
        }
        
        // Get or create token accounts
        // DEBUG: Using Token-2022 program for this token
        debug('Getting treasury token account (Token-2022)...');
        const treasuryTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            treasuryKeypair.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        debug('Treasury token account:', treasuryTokenAccount.toString());
        
        debug('Getting recipient token account (Token-2022)...');
        const recipientTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            recipientPubkey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        debug('Recipient token account:', recipientTokenAccount.toString());
        
        // Check if recipient token account exists
        const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
        
        // DEBUG: Check if treasury token account exists BEFORE trying to get balance
        const treasuryAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
        if (!treasuryAccountInfo) {
            console.error('[ERROR] Treasury token account does not exist! Treasury needs to receive tokens first.');
            return res.status(500).json({ 
                error: 'Treasury token account not initialized',
                details: 'The treasury wallet needs to receive tokens to create its token account. Please fund the treasury first.'
            });
        }
        
        // Build transaction
        const transaction = new Transaction();
        
        // Create recipient token account if needed (using Token-2022)
        if (!recipientAccountInfo) {
            debug('Creating recipient token account (Token-2022)...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    treasuryKeypair.publicKey,
                    recipientTokenAccount,
                    recipientPubkey,
                    tokenMint,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }
        
        // Check treasury token balance (now safe since we verified account exists)
        const treasuryBalance = await connection.getTokenAccountBalance(treasuryTokenAccount);
        debug('Treasury token balance (smallest units):', treasuryBalance.value.amount);
        debug('Treasury token balance (tokens):', treasuryBalance.value.uiAmount);
        
        // DEBUG: Compare in smallest units for accurate balance check
        if (BigInt(treasuryBalance.value.amount) < amountInSmallestUnits) {
            console.error('[ERROR] Insufficient treasury token balance');
            return res.status(500).json({ 
                error: 'Insufficient treasury token balance',
                details: `Has: ${treasuryBalance.value.uiAmount} tokens, Needs: ${amount} tokens`
            });
        }
        
        // Add transfer instruction (using Token-2022)
        // DEBUG: Use amountInSmallestUnits for the actual blockchain transfer
        debug('Creating transfer instruction for', amount, 'tokens (', amountInSmallestUnits.toString(), 'smallest units)');
        transaction.add(
            createTransferInstruction(
                treasuryTokenAccount,
                recipientTokenAccount,
                treasuryKeypair.publicKey,
                amountInSmallestUnits,
                [],
                TOKEN_2022_PROGRAM_ID
            )
        );
        
        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = treasuryKeypair.publicKey;
        
        // Sign and send transaction
        debug('Signing and sending transaction...');
        transaction.sign(treasuryKeypair);
        
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        
        debug('Transaction sent, signature:', signature);
        
        // Confirm transaction
        debug('Waiting for confirmation...');
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        }, 'confirmed');
        
        if (confirmation.value.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        debug('✅ TRANSACTION CONFIRMED');
        debug('Signature:', signature);
        
        // CRITICAL: Now deduct balance from user AFTER successful blockchain transaction
        debug('Deducting balance from user after successful transaction...');
        const { error: balanceError } = await supabase
            .rpc('deduct_balance_after_withdrawal', {
                p_user_id: userId,
                p_amount: amount
            });
        
        if (balanceError) {
            console.error('[ERROR] RPC deduct_balance_after_withdrawal not found, using direct SQL...');
            // Fallback: Use direct SQL query to deduct balance
            const { error: directError } = await supabase
                .rpc('sql', {
                    query: `UPDATE users SET current_balance = current_balance - ${amount}, total_withdrawn = total_withdrawn + ${amount} WHERE id = '${userId}'`
                });
            
            if (directError) {
                // Second fallback: Fetch current values and update
                console.error('[ERROR] Direct SQL also failed, trying fetch-update approach...');
                const { data: userData } = await supabase
                    .from('users')
                    .select('current_balance, total_withdrawn')
                    .eq('id', userId)
                    .single();
                
                if (userData) {
                    const newBalance = Math.max(0, userData.current_balance - amount);
                    const newWithdrawn = userData.total_withdrawn + amount;
                    
                    const { error: updateErr } = await supabase
                        .from('users')
                        .update({
                            current_balance: newBalance,
                            total_withdrawn: newWithdrawn
                        })
                        .eq('id', userId);
                    
                    if (updateErr) {
                        console.error('[ERROR] All balance deduction methods failed:', updateErr);
                    } else {
                        debug('Balance deducted via fetch-update fallback');
                    }
                }
            }
        }
        debug('Balance deducted successfully');
        
        // Update withdrawal status in database
        const { error: updateError } = await supabase
            .from('withdrawals')
            .update({
                status: 'completed',
                transaction_hash: signature,
                processed_at: new Date().toISOString(),
                error_message: null
            })
            .eq('id', withdrawalId);
        
        if (updateError) {
            console.error('[ERROR] Failed to update withdrawal status:', updateError);
            // Transaction succeeded, so still return success
        }
        
        debug('=== WITHDRAWAL COMPLETED SUCCESSFULLY ===');
        
        res.json({
            success: true,
            transactionHash: signature,
            message: 'Withdrawal processed successfully'
        });
        
    } catch (error) {
        console.error('[ERROR] Withdrawal failed:', error.message);
        console.error('[ERROR] Stack:', error.stack?.substring(0, 300));
        
        // Update withdrawal as failed
        try {
            await supabase
                .from('withdrawals')
                .update({
                    status: 'failed',
                    error_message: error.message,
                    processed_at: new Date().toISOString()
                })
                .eq('id', withdrawalId);
        } catch (dbError) {
            console.error('[ERROR] Failed to update withdrawal status:', dbError);
        }
        
        res.status(500).json({
            success: false,
            error: error.message || 'Withdrawal processing failed'
        });
    }
});

// API: Validate Solana address
app.post('/api/validate-address', (req, res) => {
    const { address } = req.body;
    
    if (!address) {
        return res.json({ valid: false, error: 'No address provided' });
    }
    
    try {
        const pubkey = new PublicKey(address);
        const isValid = PublicKey.isOnCurve(pubkey.toBytes());
        res.json({ valid: isValid });
    } catch (error) {
        res.json({ valid: false, error: 'Invalid address format' });
    }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('=========================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Network: ${process.env.SOLANA_NETWORK}`);
    console.log(`💰 Treasury: ${treasuryKeypair ? 'Initialized' : 'NOT INITIALIZED'}`);
    console.log(`🔗 RPC: ${process.env.SOLANA_RPC_URL?.replace(/api-key=[^&]+/, 'api-key=***')}`);
    console.log('=========================================');
});
