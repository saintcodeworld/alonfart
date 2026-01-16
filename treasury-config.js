// Treasury Configuration for Automated Withdrawals
// ⚠️ SECURITY WARNING: NEVER expose this file publicly or commit to public repos!
// Contains sensitive API keys and private keys that could compromise your wallet

export const TREASURY_CONFIG = {
    // Treasury wallet credentials (Developer wallet for sending rewards)
    // DEBUG: This wallet will send memecoins to users when they claim rewards
    publicKey: '', // Will be derived from private key
    privateKey: '2R2QJtB4gAY9qtaooui8ngRFNTbVHo88j9zHUzAUuUZrhrpHX2JWpZ4cCyjkhmkFJYwgfQHXjen27GHJDJnUf7T8',
    
    // Token configuration (update after Pump.fun deployment)
    tokenMintAddress: '3rWYgrDadQcX34jnc4rrWN9Rr3AAHCmgtoHHGFq8pump', // Your memecoin from Pump.fun
    
    // Network configuration
    network: 'mainnet-beta', // Use 'devnet' for testing
    
    // RPC URL - Using valid Helius API key
    rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=82eda54f-31da-4604-8adf-39b313fdb933',
    
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
        
        const derivedPublicKey = keypair.publicKey.toString();
        const redactedDerived = derivedPublicKey.substring(0, 4) + '...' + derivedPublicKey.substring(derivedPublicKey.length - 4);
        
        // DEBUG: Update public key from derived value
        TREASURY_CONFIG.publicKey = derivedPublicKey;
        
        console.log('[DEBUG] ========================================');
        console.log('[DEBUG] Treasury Wallet (Developer Wallet) Initialized');
        console.log('[DEBUG] ========================================');
        console.log('[DEBUG] Public Key:', redactedDerived);
        console.log('[DEBUG] Full Public Key:', derivedPublicKey);
        console.log('[DEBUG] Private Key: ***REDACTED FOR SECURITY***');
        console.log('[DEBUG] ✅ Treasury wallet ready for sending rewards!');
        console.log('[DEBUG] ========================================');
        
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
