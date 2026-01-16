// Backend server for Alon Fart Game
// Handles Solana transactions securely - private keys never exposed to frontend
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const { createClient } = require('@supabase/supabase-js');

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
        debug('Getting treasury token account...');
        const treasuryTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            treasuryKeypair.publicKey
        );
        debug('Treasury token account:', treasuryTokenAccount.toString());
        
        debug('Getting recipient token account...');
        const recipientTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            recipientPubkey
        );
        debug('Recipient token account:', recipientTokenAccount.toString());
        
        // Check if recipient token account exists
        const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
        
        // Build transaction
        const transaction = new Transaction();
        
        // Create recipient token account if needed
        if (!recipientAccountInfo) {
            debug('Creating recipient token account...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    treasuryKeypair.publicKey,
                    recipientTokenAccount,
                    recipientPubkey,
                    tokenMint
                )
            );
        }
        
        // Check treasury token balance
        const treasuryBalance = await connection.getTokenAccountBalance(treasuryTokenAccount);
        debug('Treasury token balance:', treasuryBalance.value.amount);
        
        if (BigInt(treasuryBalance.value.amount) < BigInt(amount)) {
            console.error('[ERROR] Insufficient treasury token balance');
            return res.status(500).json({ 
                error: 'Insufficient treasury token balance',
                details: `Has: ${treasuryBalance.value.amount}, Needs: ${amount}`
            });
        }
        
        // Add transfer instruction
        debug('Creating transfer instruction for', amount, 'tokens');
        transaction.add(
            createTransferInstruction(
                treasuryTokenAccount,
                recipientTokenAccount,
                treasuryKeypair.publicKey,
                BigInt(amount)
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
