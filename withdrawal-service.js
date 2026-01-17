import { getSupabaseClient } from './supabase-config.js';

// DEBUG: WithdrawalService now uses backend API for secure transactions
// Private keys are kept server-side, never exposed to frontend

export class WithdrawalService {
    constructor() {
        this.supabase = getSupabaseClient();
        this.apiBaseUrl = ''; // Empty for same-origin requests
        console.log('[DEBUG] WithdrawalService initialized (using backend API)');
    }

    // DEBUG: Check backend health and treasury status
    async checkBackendHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            const data = await response.json();
            console.log('[DEBUG] Backend health:', data);
            return data;
        } catch (error) {
            console.error('[ERROR] Backend health check failed:', error);
            return { status: 'error', treasury: false };
        }
    }

    // DEBUG: Get treasury info from backend (public key only, no sensitive data)
    async getTreasuryInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/treasury/info`);
            const data = await response.json();
            console.log('[DEBUG] Treasury info:', data);
            return data;
        } catch (error) {
            console.error('[ERROR] Failed to get treasury info:', error);
            return null;
        }
    }

    // DEBUG: Validate Solana address using backend API
    async validateSolanaAddress(address) {
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
            // Use backend API for validation
            const response = await fetch(`${this.apiBaseUrl}/api/validate-address`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address })
            });
            const data = await response.json();
            console.log('[DEBUG] Address validation result:', data.valid);
            return data.valid;
        } catch (error) {
            console.log('[DEBUG] Invalid address: failed validation', error.message);
            return false;
        }
    }

    // DEBUG: Create withdrawal request and process via backend API
    // CRITICAL FIX: Balance is NOT deducted until blockchain transaction succeeds
    async createWithdrawalRequest(userId, amount, walletAddress) {
        console.log('[DEBUG] Creating and processing withdrawal request for user:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // Validate address via backend API
            const isValidAddress = await this.validateSolanaAddress(walletAddress);
            if (!isValidAddress) {
                throw new Error('Invalid Phantom wallet address');
            }

            // DEBUG: Check user balance first (without deducting)
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

            console.log('[DEBUG] Creating withdrawal record with status "pending" (balance NOT deducted yet)');
            
            // DEBUG: Create withdrawal record as PENDING - do NOT deduct balance yet
            // Balance will only be deducted by backend AFTER successful blockchain transaction
            const { data: withdrawalData, error: withdrawalError } = await this.supabase
                .from('withdrawals')
                .insert({
                    user_id: userId,
                    amount: amount,
                    phantom_wallet_address: walletAddress,
                    status: 'pending',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (withdrawalError) {
                console.error('[ERROR] Withdrawal creation failed:', withdrawalError);
                throw withdrawalError;
            }

            const withdrawalId = withdrawalData.id;
            console.log('[DEBUG] Withdrawal created with ID:', withdrawalId, '(balance still intact)');
            
            // DEBUG: Process withdrawal via backend API
            // Backend will deduct balance ONLY after successful blockchain transaction
            console.log('[DEBUG] Calling backend API for blockchain transaction...');
            const result = await this.processWithdrawalViaBackend(withdrawalId, userId, amount, walletAddress);
            
            return result;

        } catch (error) {
            console.error('[ERROR] Withdrawal request failed:', error);
            throw error;
        }
    }

    // DEBUG: Process withdrawal via secure backend API
    // Private keys are kept on the server, never exposed to frontend
    async processWithdrawalViaBackend(withdrawalId, userId, amount, walletAddress) {
        console.log(`[DEBUG] Processing withdrawal via backend API: ${withdrawalId}`);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/withdraw`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    withdrawalId,
                    userId,
                    amount,
                    walletAddress
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                console.error('[ERROR] Backend withdrawal failed:', result);
                throw new Error(result.error || 'Withdrawal processing failed');
            }

            console.log('[DEBUG] ✅ Backend withdrawal successful');
            console.log('[DEBUG] Transaction hash:', result.transactionHash);
            
            return {
                success: true,
                transactionHash: result.transactionHash,
                message: result.message || 'Withdrawal processed successfully'
            };

        } catch (error) {
            console.error('[ERROR] Backend withdrawal request failed:', error);
            
            // Update withdrawal status to failed in database
            try {
                await this.supabase
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

            return {
                success: false,
                message: error.message || 'Withdrawal processing failed'
            };
        }
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
