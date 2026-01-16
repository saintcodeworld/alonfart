# Withdrawal Flow Documentation

## New Simplified Flow

### 1. User Clicks Withdrawal Button
- Status is set to: `sent`
- No background processor needed
- No locking mechanism required
- Transaction processes immediately

### 2. Validation Checks (Before Creating Withdrawal)
```javascript
// Check 1: Valid Solana wallet address
if (!this.validateSolanaAddress(walletAddress)) {
    throw new Error('Invalid Phantom wallet address');
}

// Check 2: User has sufficient balance
if (userData.current_balance < amount) {
    throw new Error('Insufficient balance');
}

// Check 3: Meets minimum withdrawal amount
if (amount < 1000) {
    throw new Error('Minimum withdrawal amount is 1000 tokens');
}
```

### 3. Create Withdrawal Record
```javascript
// Creates withdrawal in database with RPC function
const { data: withdrawalId } = await this.supabase.rpc('process_withdrawal', {
    user_id: userId,
    withdrawal_amount: amount,
    wallet_address: walletAddress
});

// Immediately update status to 'sent'
await this.supabase
    .from('withdrawals')
    .update({ status: 'sent' })
    .eq('id', withdrawalId);
```

### 4. Process Blockchain Transaction Immediately
```javascript
// Check treasury balance
const treasuryBalance = await this.connection.getTokenAccountBalance(treasuryTokenAccount);

if (BigInt(treasuryBalance.value.amount) < BigInt(withdrawal.amount)) {
    throw new Error('Insufficient treasury balance');
}

// Create and send transaction
const signature = await window.solanaWeb3.sendAndConfirmTransaction(
    this.connection,
    transaction,
    [this.treasuryWallet],
    { commitment: 'confirmed', maxRetries: 3 }
);
```

### 5. Update Status to Completed
```javascript
// On success
await this.supabase
    .from('withdrawals')
    .update({
        status: 'completed',
        transaction_hash: signature,
        processed_at: currentTime
    })
    .eq('id', withdrawalId);

// On failure
await this.supabase
    .from('withdrawals')
    .update({
        status: 'failed',
        error_message: error.message,
        processed_at: currentTime
    })
    .eq('id', withdrawalId);
```

## Status Flow

```
User Clicks Button
       ↓
   [sent] ← Only one time when button clicked
       ↓
Validate & Process Transaction
       ↓
   ┌───────┐
   ↓       ↓
[completed] [failed]
```

## Key Points

1. **One-time processing**: Status `sent` means transaction is being processed right now
2. **No background processor**: Everything happens when user clicks the button
3. **No race conditions**: Each button click creates a new withdrawal with status `sent`
4. **Immediate feedback**: User gets success or error response immediately
5. **Treasury balance check**: Only sends if treasury has enough tokens

## Safety Checks

- **Duplicate prevention**: Checks for existing `transaction_hash` before sending
- **Status validation**: Only processes withdrawals with status `sent`
- **Balance verification**: Verifies both user balance and treasury balance
- **Transaction confirmation**: Waits for blockchain confirmation before marking complete
