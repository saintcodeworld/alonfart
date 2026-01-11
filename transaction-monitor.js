// Transaction Monitoring and Status Tracking
// Debug and monitor withdrawal transactions in real-time

import { getSupabaseClient } from './supabase-config.js';

export class TransactionMonitor {
    constructor() {
        this.supabase = getSupabaseClient();
        this.listeners = [];
        console.log('[DEBUG] TransactionMonitor initialized');
    }

    async getWithdrawalStats() {
        console.log('[DEBUG] Fetching withdrawal statistics');
        
        try {
            const { data: withdrawals, error } = await this.supabase
                .from('withdrawals')
                .select('status, amount, created_at');

            if (error) {
                console.error('[ERROR] Failed to fetch withdrawal stats:', error);
                return null;
            }

            const stats = {
                total: withdrawals.length,
                pending: withdrawals.filter(w => w.status === 'pending').length,
                processing: withdrawals.filter(w => w.status === 'processing').length,
                completed: withdrawals.filter(w => w.status === 'completed').length,
                failed: withdrawals.filter(w => w.status === 'failed').length,
                totalAmount: withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0),
                completedAmount: withdrawals
                    .filter(w => w.status === 'completed')
                    .reduce((sum, w) => sum + (w.amount || 0), 0)
            };

            console.log('[DEBUG] Withdrawal stats:', stats);
            return stats;

        } catch (error) {
            console.error('[ERROR] Failed to get withdrawal stats:', error);
            return null;
        }
    }

    async getPendingWithdrawals() {
        console.log('[DEBUG] Fetching pending withdrawals');
        
        try {
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[ERROR] Failed to fetch pending withdrawals:', error);
                return [];
            }

            console.log(`[DEBUG] Found ${data.length} pending withdrawals`);
            return data;

        } catch (error) {
            console.error('[ERROR] Failed to get pending withdrawals:', error);
            return [];
        }
    }

    async getRecentWithdrawals(limit = 10) {
        console.log('[DEBUG] Fetching recent withdrawals');
        
        try {
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('[ERROR] Failed to fetch recent withdrawals:', error);
                return [];
            }

            console.log(`[DEBUG] Found ${data.length} recent withdrawals`);
            return data;

        } catch (error) {
            console.error('[ERROR] Failed to get recent withdrawals:', error);
            return [];
        }
    }

    async getFailedWithdrawals() {
        console.log('[DEBUG] Fetching failed withdrawals');
        
        try {
            const { data, error } = await this.supabase
                .from('withdrawals')
                .select('*')
                .eq('status', 'failed')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[ERROR] Failed to fetch failed withdrawals:', error);
                return [];
            }

            console.log(`[DEBUG] Found ${data.length} failed withdrawals`);
            return data;

        } catch (error) {
            console.error('[ERROR] Failed to get failed withdrawals:', error);
            return [];
        }
    }

    async verifyTransaction(transactionHash) {
        console.log('[DEBUG] Verifying transaction:', transactionHash);
        
        if (!window.solanaWeb3) {
            console.error('[ERROR] Solana Web3.js not loaded');
            return null;
        }

        try {
            const connection = new window.solanaWeb3.Connection(
                window.solanaWeb3.clusterApiUrl('mainnet-beta'),
                'confirmed'
            );

            const status = await connection.getSignatureStatus(transactionHash);
            console.log('[DEBUG] Transaction status:', status);

            return {
                confirmed: status.value?.confirmationStatus === 'confirmed' || 
                          status.value?.confirmationStatus === 'finalized',
                status: status.value?.confirmationStatus,
                error: status.value?.err
            };

        } catch (error) {
            console.error('[ERROR] Failed to verify transaction:', error);
            return null;
        }
    }

    subscribeToWithdrawals(callback) {
        console.log('[DEBUG] Subscribing to withdrawal updates');
        
        const subscription = this.supabase
            .channel('withdrawals_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'withdrawals'
                },
                (payload) => {
                    console.log('[DEBUG] Withdrawal update received:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        this.listeners.push(subscription);
        return subscription;
    }

    unsubscribeAll() {
        console.log('[DEBUG] Unsubscribing from all withdrawal updates');
        
        this.listeners.forEach(listener => {
            listener.unsubscribe();
        });
        
        this.listeners = [];
    }

    async retryFailedWithdrawal(withdrawalId) {
        console.log('[DEBUG] Retrying failed withdrawal:', withdrawalId);
        
        try {
            const { error } = await this.supabase
                .from('withdrawals')
                .update({
                    status: 'pending',
                    error_message: null
                })
                .eq('id', withdrawalId);

            if (error) {
                console.error('[ERROR] Failed to retry withdrawal:', error);
                return false;
            }

            console.log('[DEBUG] Withdrawal marked as pending for retry');
            return true;

        } catch (error) {
            console.error('[ERROR] Failed to retry withdrawal:', error);
            return false;
        }
    }

    logTransactionDetails(withdrawal) {
        console.log('=== WITHDRAWAL DETAILS ===');
        console.log('ID:', withdrawal.id);
        console.log('User ID:', withdrawal.user_id);
        console.log('Amount:', withdrawal.amount);
        console.log('Wallet:', withdrawal.phantom_wallet_address);
        console.log('Status:', withdrawal.status);
        console.log('Transaction Hash:', withdrawal.transaction_hash || 'N/A');
        console.log('Created:', withdrawal.created_at);
        console.log('Processed:', withdrawal.processed_at || 'N/A');
        console.log('Error:', withdrawal.error_message || 'N/A');
        console.log('========================');
    }

    async getTreasuryBalance() {
        console.log('[DEBUG] Checking treasury balance');
        
        if (!window.solanaWeb3 || !window.splToken) {
            console.error('[ERROR] Solana libraries not loaded');
            return null;
        }

        try {
            const connection = new window.solanaWeb3.Connection(
                window.solanaWeb3.clusterApiUrl('mainnet-beta'),
                'confirmed'
            );

            // This would need treasury public key and token mint
            // Placeholder for now
            console.log('[DEBUG] Treasury balance check requires configuration');
            return null;

        } catch (error) {
            console.error('[ERROR] Failed to get treasury balance:', error);
            return null;
        }
    }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitor();
