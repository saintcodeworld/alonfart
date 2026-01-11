// Automated Withdrawal Processor
// This script runs in the background to process pending withdrawals

import { WithdrawalService } from './withdrawal-service.js';

class WithdrawalProcessor {
    constructor() {
        this.withdrawalService = new WithdrawalService();
        this.isProcessing = false;
        this.processingInterval = null;
        console.log('[DEBUG] WithdrawalProcessor initialized');
    }

    start() {
        console.log('[DEBUG] Starting withdrawal processor');
        
        if (this.isProcessing) {
            console.log('[DEBUG] Processor already running');
            return;
        }

        this.isProcessing = true;
        
        // Process every 30 seconds
        this.processingInterval = setInterval(async () => {
            await this.processPendingWithdrawals();
        }, 30000);

        // Also process immediately on start
        this.processPendingWithdrawals();
    }

    stop() {
        console.log('[DEBUG] Stopping withdrawal processor');
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        this.isProcessing = false;
    }

    async processPendingWithdrawals() {
        if (!this.isProcessing) {
            return;
        }

        try {
            console.log('[DEBUG] Checking for pending withdrawals');
            
            const { data: pendingWithdrawals, error } = await this.withdrawalService.supabase
                .from('withdrawals')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(10); // Process max 10 at a time

            if (error) {
                console.error('[ERROR] Failed to fetch pending withdrawals:', error);
                return;
            }

            if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
                console.log('[DEBUG] No pending withdrawals found');
                return;
            }

            console.log(`[DEBUG] Found ${pendingWithdrawals.length} pending withdrawals`);

            for (const withdrawal of pendingWithdrawals) {
                try {
                    console.log(`[DEBUG] Processing withdrawal ${withdrawal.id} for ${withdrawal.amount} tokens`);
                    
                    const result = await this.withdrawalService.processWithdrawal(withdrawal.id);
                    
                    if (result.success) {
                        console.log(`[DEBUG] Successfully processed withdrawal ${withdrawal.id}`);
                    } else {
                        console.log(`[DEBUG] Withdrawal ${withdrawal.id} marked as pending: ${result.message}`);
                    }
                } catch (error) {
                    console.error(`[ERROR] Failed to process withdrawal ${withdrawal.id}:`, error);
                    
                    // Mark as failed
                    await this.withdrawalService.supabase
                        .from('withdrawals')
                        .update({
                            status: 'failed',
                            error_message: error.message
                        })
                        .eq('id', withdrawal.id);
                }
            }

        } catch (error) {
            console.error('[ERROR] Withdrawal processing failed:', error);
        }
    }

    async processSingleWithdrawal(withdrawalId) {
        console.log(`[DEBUG] Manually processing withdrawal ${withdrawalId}`);
        
        try {
            const result = await this.withdrawalService.processWithdrawal(withdrawalId);
            
            if (result.success) {
                console.log(`[DEBUG] Successfully processed withdrawal ${withdrawalId}`);
            } else {
                console.log(`[DEBUG] Withdrawal ${withdrawalId} could not be processed: ${result.message}`);
            }
            
            return result;
        } catch (error) {
            console.error(`[ERROR] Failed to process withdrawal ${withdrawalId}:`, error);
            throw error;
        }
    }

    getProcessingStatus() {
        return {
            isProcessing: this.isProcessing,
            hasInterval: this.processingInterval !== null
        };
    }
}

// Export for use in main application
export { WithdrawalProcessor };

// Auto-start if running in Node.js environment
if (typeof window === 'undefined') {
    const processor = new WithdrawalProcessor();
    processor.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('[DEBUG] Shutting down withdrawal processor...');
        processor.stop();
        process.exit(0);
    });
}
