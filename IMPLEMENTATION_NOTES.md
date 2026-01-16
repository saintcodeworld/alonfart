# Implementation Notes

## Summary of Changes

This document outlines all changes made to transform the Alon Fart game into an authenticated, token-based system with withdrawal functionality.

### 1. Authentication System (✅ Complete)

**Files Added:**
- `supabase-config.js` - Supabase client initialization
- `auth.js` - Authentication manager with BIP39 seedphrase support
- `SUPABASE_SETUP.md` - Database schema and setup instructions

**Features:**
- Username/password login and signup
- BIP39 12-word seedphrase generation on signup
- Seedphrase-based password recovery
- Session management
- Secure seedphrase hashing (SHA-256)

### 2. Removed Features (✅ Complete)

**Wallet Connection Removed:**
- Removed Solana Web3.js dependency from HTML
- Removed wallet connect/disconnect functions
- Removed wallet UI elements (connect button, wallet address display)
- Removed blockchain network status and block height display

### 3. New UI Components (✅ Complete)

**Authentication Modal:**
- Login form
- Signup form with seedphrase display
- Forgot password form with seedphrase recovery
- Form validation and error messages

**Profile Sidebar:**
- Located in top-left corner (replacing wallet section)
- Displays username
- Shows current token balance
- Shows total earned tokens
- Shows total withdrawn tokens
- Logout button
- Withdraw tokens button

**Withdrawal Modal:**
- Phantom wallet address input
- Withdrawal amount input
- Balance display
- Treasury wallet placeholder note
- Success/error messaging

### 4. Token System (✅ Complete)

**Database Schema:**
- `users` table with token tracking columns
- `withdrawals` table for withdrawal history
- Database functions for atomic operations:
  - `add_tokens()` - Updates user balance when mining
  - `process_withdrawal()` - Handles withdrawal requests

**Token Mechanics:**
- Each click earns tokens based on current miner (1-390 tokens per click)
- Tokens are immediately synced to database
- Real-time balance updates in UI
- Profile shows live statistics

### 5. Game Flow Changes

**Before:**
1. Load game → Optional wallet connection → Play

**After:**
1. Load game → Authentication required
2. Login or Signup (with seedphrase save)
3. Play game with automatic token tracking
4. View stats in profile
5. Withdraw tokens to Phantom wallet

### 6. Technical Implementation

**Debug Logging:**
- All major operations have console debug logs
- Format: `[DEBUG]` for info, `[ERROR]` for errors
- Helps track authentication flow and database operations

**Security:**
- Seedphrases hashed with SHA-256 before storage
- Row-level security on Supabase tables
- Password min length: 6 characters
- Username uniqueness enforced

**Data Flow:**
```
Click → Earn Tokens → Update Database → Refresh UI → Show in Profile
```

## TODO: Treasury Wallet Implementation

**Current State:** Withdrawals create database records but don't transfer tokens yet.

**Required Steps:**
1. Create Solana wallet for treasury
2. Fund with memecoin tokens
3. Build backend service to:
   - Monitor withdrawal requests
   - Validate Phantom wallet addresses
   - Execute token transfers
   - Update withdrawal status with transaction hash
4. Update UI to show withdrawal status/history

**Database Structure Already Ready:**
- `withdrawals` table has `status`, `transaction_hash`, and `processed_at` fields
- `process_withdrawal()` function creates withdrawal records

## Configuration Required

### 1. Supabase Setup (CRITICAL)

Edit `supabase-config.js`:
```javascript
url: 'YOUR_SUPABASE_URL',
anonKey: 'YOUR_SUPABASE_ANON_KEY'
```

### 2. Run Database Schema

Execute all SQL in `SUPABASE_SETUP.md` in order:
1. Create users table
2. Create withdrawals table  
3. Create add_tokens function
4. Create process_withdrawal function
5. Create triggers

### 3. Supabase Auth Settings

- Enable Email provider
- Disable email confirmation (dev) or configure (prod)
- Set up proper redirect URLs

## Testing Checklist

- [ ] Signup creates user and generates seedphrase
- [ ] Seedphrase is 12 words from BIP39 wordlist
- [ ] Login works with username/password
- [ ] Clicking cube earns tokens
- [ ] Tokens sync to database
- [ ] Profile shows correct stats
- [ ] Withdrawal creates database record
- [ ] Logout clears session
- [ ] Password recovery validates seedphrase

## File Structure

```
mineclicker-main/
├── auth.js (NEW)
├── supabase-config.js (NEW)
├── game.js (MODIFIED - major rewrite)
├── index.html (MODIFIED - auth modal + profile UI)
├── style.css (MODIFIED - auth/profile styles)
├── cube3d.js (unchanged)
├── pickaxe3d.js (unchanged)
├── SUPABASE_SETUP.md (NEW)
├── IMPLEMENTATION_NOTES.md (NEW)
└── assets/ (unchanged)
```

## Key Code Patterns

### Authentication
```javascript
// Signup
const result = await authManager.signUp(username, password);
// Returns: { user, seedphrase }

// Login
const result = await authManager.signIn(username, password);
// Returns: { user }

// Recovery
const result = await authManager.recoverPassword(username, seedphrase, newPassword);
```

### Token Updates
```javascript
// After each cube break
await authManager.updateTokenBalance(userId, tokensEarned);
```

### User Stats
```javascript
const stats = await authManager.getUserStats(userId);
// Returns: { username, total_earned, total_withdrawn, current_balance }
```

## Notes for Future Development

1. **Chat System:** Currently uses random username generator. Could integrate with real usernames from auth.

2. **Leaderboards:** Database has all user stats. Easy to add leaderboards table and queries.

3. **Multiple Games:** User-specific save data in database instead of localStorage.

4. **Admin Panel:** Monitor withdrawals, manage users, view analytics.

5. **Token Economics:** Add costs to miners, implement in-game purchases, add daily rewards.

6. **Security Hardening:**
   - Add rate limiting on auth endpoints
   - Implement CAPTCHA on signup
   - Add 2FA option
   - Encrypt seedphrase storage (currently hashed only)

## Common Issues & Solutions

**Issue:** Supabase client not initialized
- **Solution:** Check console for errors, verify URL and key in config

**Issue:** Login fails silently
- **Solution:** Check browser console for debug logs, verify Supabase tables exist

**Issue:** Tokens not updating
- **Solution:** Verify RPC function `add_tokens` exists and has proper permissions

**Issue:** Withdrawal fails
- **Solution:** Check user has sufficient balance, verify `process_withdrawal` function exists

## Performance Considerations

- Token balance updates are async but non-blocking
- UI updates optimistically (doesn't wait for database)
- Game saves locally for offline play
- Database syncs happen in background

## Security Considerations

- Never expose Supabase service_role key in frontend
- Always use anon key with Row Level Security
- Seedphrase hash prevents rainbow table attacks
- Password minimum length enforced
- SQL injection prevented by Supabase prepared statements
