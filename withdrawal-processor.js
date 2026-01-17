// Automated Withdrawal Processor
// This script runs in the background to process pending withdrawals

import { WithdrawalService } from './withdrawal-service.js';

// Global lock to prevent multiple processor instances
let GLOBAL_PROCESSOR_INSTANCE = null;
const PROCESSOR_LOCK_KEY = 'withdrawal_processor_lock';
const LOCK_TIMEOUT_MS = 120000; // 2 minutes - if a lock is older than this, it's considered stale

class WithdrawalProcessor {
    constructor() {
        this.withdrawalService = new WithdrawalService();
        this.isProcessing = false;
        this.processingInterval = null;
        this.instanceId = `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.lastProcessTime = 0;
        this.minProcessInterval = 10000; // Minimum 10 seconds between processing runs
        console.log('[DEBUG] WithdrawalProcessor initialized with ID:', this.instanceId);
    }

    start() {
        console.log('[DEBUG] Starting withdrawal processor:', this.instanceId);
        
        // Check if another processor is already running globally
        if (GLOBAL_PROCESSOR_INSTANCE && GLOBAL_PROCESSOR_INSTANCE !== this) {
            console.log('[DEBUG] Another processor instance is already running globally, stopping this one');
            return;
        }
        
        if (this.isProcessing) {
            console.log('[DEBUG] Processor already running');
            return;
        }

        // Acquire global lock
        if (!this.acquireGlobalLock()) {
            console.log('[DEBUG] Failed to acquire global lock, another processor may be running');
            return;
        }

        GLOBAL_PROCESSOR_INSTANCE = this;
        this.isProcessing = true;
        
        // Process every 30 seconds
        this.processingInterval = setInterval(async () => {
            await this.processPendingWithdrawals();
        }, 30000);

        // Wait 5 seconds before first process to avoid immediate duplicate processing
        console.log('[DEBUG] Waiting 5 seconds before first processing run...');
        setTimeout(() => {
            this.processPendingWithdrawals();
        }, 5000);
    }
    
    acquireGlobalLock() {
        try {
            const lockData = localStorage.getItem(PROCESSOR_LOCK_KEY);
            
            if (lockData) {
                const lock = JSON.parse(lockData);
                const lockAge = Date.now() - lock.timestamp;
                
                // If lock is stale (older than timeout), we can take it
                if (lockAge < LOCK_TIMEOUT_MS) {
                    console.log('[DEBUG] Active lock found from instance:', lock.instanceId, 'age:', lockAge, 'ms');
                    return false;
                }
                
                console.log('[DEBUG] Stale lock found, acquiring...');
            }
            
            // Set our lock
            localStorage.setItem(PROCESSOR_LOCK_KEY, JSON.stringify({
                instanceId: this.instanceId,
                timestamp: Date.now()
            }));
            
            console.log('[DEBUG] Global lock acquired by:', this.instanceId);
            return true;
        } catch (error) {
            console.error('[ERROR] Failed to acquire global lock:', error);
            return false;
        }
    }
    
    releaseGlobalLock() {
        try {
            const lockData = localStorage.getItem(PROCESSOR_LOCK_KEY);
            if (lockData) {
                const lock = JSON.parse(lockData);
                // Only release if it's our lock
                if (lock.instanceId === this.instanceId) {
                    localStorage.removeItem(PROCESSOR_LOCK_KEY);
                    console.log('[DEBUG] Global lock released by:', this.instanceId);
                }
            }
        } catch (error) {
            console.error('[ERROR] Failed to release global lock:', error);
        }
    }
    
    refreshLock() {
        try {
            const lockData = localStorage.getItem(PROCESSOR_LOCK_KEY);
            if (lockData) {
                const lock = JSON.parse(lockData);
                if (lock.instanceId === this.instanceId) {
                    localStorage.setItem(PROCESSOR_LOCK_KEY, JSON.stringify({
                        instanceId: this.instanceId,
                        timestamp: Date.now()
                    }));
                }
            }
        } catch (error) {
            console.error('[ERROR] Failed to refresh lock:', error);
        }
    }

    stop() {
        console.log('[DEBUG] Stopping withdrawal processor:', this.instanceId);
        
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        this.isProcessing = false;
        
        // Release global lock
        this.releaseGlobalLock();
        
        if (GLOBAL_PROCESSOR_INSTANCE === this) {
            GLOBAL_PROCESSOR_INSTANCE = null;
        }
    }

    async processPendingWithdrawals() {
        if (!this.isProcessing) {
            return;
        }
        
        // Debouncing: prevent processing too frequently
        const timeSinceLastProcess = Date.now() - this.lastProcessTime;
        if (timeSinceLastProcess < this.minProcessInterval) {
            console.log('[DEBUG] Skipping processing - too soon since last run (', timeSinceLastProcess, 'ms)');
            return;
        }
        
        // Refresh our lock to show we're still active
        this.refreshLock();

        try {
            console.log('[DEBUG] Checking for pending withdrawals (Instance:', this.instanceId, ')');
            this.lastProcessTime = Date.now();
            
            const { data: pendingWithdrawals, error } = await this.withdrawalService.supabase
                .from('withdrawals')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(5); // Process max 5 at a time to reduce load

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
                    
                    // CRITICAL: Check if withdrawal is still pending before processing
                    // This prevents duplicate processing by multiple instances
                    const { data: checkResult, error: checkError } = await this.withdrawalService.supabase
                        .from('withdrawals')
                        .select('status')
                        .eq('id', withdrawal.id)
                        .single();
                    
                    if (checkError || !checkResult || checkResult.status !== 'pending') {
                        console.log(`[DEBUG] Withdrawal ${withdrawal.id} is no longer pending - skipping`);
                        continue;
                    }
                    
                    console.log(`[DEBUG] Processing withdrawal ${withdrawal.id} (will go directly to completed/failed)`);
                    
                    // DEBUG: Process withdrawal via backend API (secure)
                    const result = await this.withdrawalService.processWithdrawalViaBackend(
                        withdrawal.id,
                        withdrawal.user_id,
                        withdrawal.amount,
                        withdrawal.phantom_wallet_address
                    );
                    
                    if (result.success) {
                        console.log(`[DEBUG] Successfully processed withdrawal ${withdrawal.id}`);
                    } else {
                        console.log(`[DEBUG] Withdrawal ${withdrawal.id} marked as pending: ${result.message}`);
                    }
                } catch (error) {
                    console.error(`[ERROR] Failed to process withdrawal ${withdrawal.id}:`, error);
                    
                    // Mark as failed if still pending (backend may have already updated it)
                    await this.withdrawalService.supabase
                        .from('withdrawals')
                        .update({
                            status: 'failed',
                            error_message: error.message,
                            processed_at: new Date().toISOString()
                        })
                        .eq('id', withdrawal.id)
                        .eq('status', 'pending'); // Only update if still pending
                }
            }

        } catch (error) {
            console.error('[ERROR] Withdrawal processing failed:', error);
        }
    }

    // DEBUG: Manual single withdrawal processing via backend API
    async processSingleWithdrawal(withdrawalId) {
        console.log(`[DEBUG] Manually processing withdrawal ${withdrawalId}`);
        
        try {
            // Fetch withdrawal details first
            const { data: withdrawal, error: fetchError } = await this.withdrawalService.supabase
                .from('withdrawals')
                .select('*')
                .eq('id', withdrawalId)
                .single();
            
            if (fetchError || !withdrawal) {
                throw new Error('Withdrawal not found');
            }
            
            const result = await this.withdrawalService.processWithdrawalViaBackend(
                withdrawal.id,
                withdrawal.user_id,
                withdrawal.amount,
                withdrawal.phantom_wallet_address
            );
            
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
