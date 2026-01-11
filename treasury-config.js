// Treasury Configuration for Automated Withdrawals
// WARNING: This file contains sensitive information - keep secure!

export const TREASURY_CONFIG = {
    // Treasury wallet credentials
    publicKey: 'GXEJmMfgtnqNpHzbk5moMFiMXMNB7GagjAVvTv1tZi3g',
    privateKey: '3xKnfJf1yiWjhMfezeUAZR2Uzm991ZxKgFEXEzjNCYZsJkmVe8SxbEzyCy1br5kA3dX2SujLdV2bB8UH59tbwdi6',
    
    // Token configuration (update after Pump.fun deployment)
    tokenMintAddress: '3rWYgrDadQcX34jnc4rrWN9Rr3AAHCmgtoHHGFq8pump', // Your memecoin from Pump.fun
    
    // Network configuration
    network: 'mainnet-beta', // Use 'devnet' for testing
    
    // RPC URL - Replace with your Helius/Alchemy key for real transactions
    rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=a22943bd-77f2-4e3c-a8d0-3b73d2afc326',
    
    // Withdrawal settings
    minWithdrawal: 1000,
    maxWithdrawalPerDay: 100000,
    
    // Fee settings
    priorityFee: 0.00001, // SOL for priority fees
};

// Initialize treasury wallet
export function initializeTreasuryWallet() {
    if (!window.solanaWeb3) {
        console.error('[ERROR] Solana Web3.js not loaded');
        return null;
    }
    
    try {
        // Decode base58 private key using bs58 (included in browser)
        // First, convert base58 string to byte array manually
        const bs58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        const base58ToBytes = (str) => {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                let carry = bs58.indexOf(str[i]);
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
            // Add leading zeros
            for (let i = 0; i < str.length && str[i] === '1'; i++) {
                bytes.push(0);
            }
            return new Uint8Array(bytes.reverse());
        };
        
        const secretKey = base58ToBytes(TREASURY_CONFIG.privateKey);
        const keypair = window.solanaWeb3.Keypair.fromSecretKey(secretKey);
        
        console.log('[DEBUG] Treasury wallet initialized:', TREASURY_CONFIG.publicKey);
        return keypair;
    } catch (error) {
        console.error('[ERROR] Failed to initialize treasury wallet:', error);
        return null;
    }
}

// Update token mint address after deployment
export function setTokenMintAddress(mintAddress) {
    TREASURY_CONFIG.tokenMintAddress = mintAddress;
    console.log('[DEBUG] Token mint address set:', mintAddress);
}
