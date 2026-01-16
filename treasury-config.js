// Treasury Configuration for Frontend
// DEBUG: Sensitive credentials are now handled server-side via backend API
// This file only contains public configuration that's safe to expose

export const TREASURY_CONFIG = {
    // Token configuration (public info - safe to expose)
    tokenMintAddress: '3XqhD29jyCa72WeZKPoUDtz4XUxWoWKK42roF4EBpump',
    
    // Network configuration (public info)
    network: 'mainnet-beta',
    
    // Withdrawal settings (public info)
    minWithdrawal: 1000,
    maxWithdrawalPerDay: 100000,
};

// DEBUG: Treasury wallet is now initialized on the backend server
// Frontend no longer has access to private keys for security
export function initializeTreasuryWallet() {
    console.log('[DEBUG] Treasury wallet operations moved to backend API');
    console.log('[DEBUG] Frontend will call /api/withdraw for secure transactions');
    return null;
}

// DEBUG: Fetch treasury info from backend (public key only)
export async function getTreasuryInfo() {
    try {
        const response = await fetch('/api/treasury/info');
        const data = await response.json();
        console.log('[DEBUG] Treasury info fetched from backend:', {
            publicKey: data.publicKey?.substring(0, 8) + '...',
            network: data.network
        });
        return data;
    } catch (error) {
        console.error('[ERROR] Failed to fetch treasury info:', error);
        return null;
    }
}
