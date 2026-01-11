# Quick Setup Guide

Follow these steps to get your Coin Miner game running with authentication and token system.

## Step 1: Supabase Project Setup (15 minutes)

### 1.1 Create Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new organization (if needed)
4. Create new project:
   - Name: `coin-miner` (or your choice)
   - Database Password: (save this securely)
   - Region: Choose closest to your users
   - Click "Create new project"
5. Wait 2-3 minutes for project to provision

### 1.2 Get API Keys
1. In Supabase dashboard, go to Settings → API
2. Copy your:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### 1.3 Configure Game
1. Open `supabase-config.js`
2. Replace placeholders:
```javascript
export const SUPABASE_CONFIG = {
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key-here'
};
```

## Step 2: Database Setup (10 minutes)

### 2.1 Create Tables
1. In Supabase dashboard, go to SQL Editor
2. Click "New query"
3. Open `SUPABASE_SETUP.md`
4. Copy and paste each SQL block in order:
   - ✅ Users table + policies
   - ✅ Withdrawals table + policies
   - ✅ add_tokens function
   - ✅ process_withdrawal function
   - ✅ Triggers
5. Execute each query (click "Run" or Ctrl+Enter)
6. Verify no errors appear

### 2.2 Verify Tables Created
1. Go to Table Editor in Supabase
2. You should see:
   - `users` table
   - `withdrawals` table
3. Click on `users` to verify columns exist:
   - id, username, seedphrase_hash, total_earned, total_withdrawn, current_balance

## Step 3: Authentication Settings (5 minutes)

### 3.1 Configure Auth Provider
1. In Supabase dashboard, go to Authentication → Providers
2. Enable "Email" provider (should be enabled by default)

### 3.2 Email Settings (Development)
1. Go to Authentication → Settings
2. Under "User Signups":
   - ✅ Enable email confirmations: **OFF** (for development)
   - ⚠️ **For production**: Turn ON and configure email templates
3. Under "Email Templates":
   - Review default templates (optional)

### 3.3 Site URL Settings
1. Go to Authentication → URL Configuration
2. Add your site URL:
   - Development: `http://localhost:8080` or `http://127.0.0.1:5500`
   - Production: Your actual domain
3. Add redirect URLs if needed

## Step 4: Test the Game (5 minutes)

### 4.1 Start Local Server
You need a local server (not just opening HTML file):

**Option A - Python:**
```bash
cd /path/to/mineclicker-main
python -m http.server 8080
```

**Option B - Node.js:**
```bash
npx http-server -p 8080
```

**Option C - VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 4.2 Test Signup Flow
1. Open browser to `http://localhost:8080`
2. Should see login screen
3. Click "CREATE ACCOUNT"
4. Enter:
   - Username: `testuser`
   - Password: `password123`
   - Confirm password: `password123`
5. Click "SIGN UP"
6. **IMPORTANT:** You'll see 12-word seedphrase
   - Copy it somewhere safe
   - Click "I'VE SAVED IT"
7. Game should load

### 4.3 Test Gameplay
1. Click the cube to mine
2. You should earn tokens (shown in top-right)
3. Click profile button (top-left)
4. Verify stats show:
   - Username
   - Balance increasing
   - Total earned matches balance

### 4.4 Test Logout & Login
1. Click "LOGOUT" in profile dropdown
2. Should return to login screen
3. Enter same credentials:
   - Username: `testuser`
   - Password: `password123`
4. Click "LOGIN"
5. Should load game with saved progress

### 4.5 Test Password Recovery
1. Logout
2. Click "FORGOT PASSWORD?"
3. Enter:
   - Username: `testuser`
   - Your 12-word seedphrase
   - New password
   - Confirm new password
4. Click "RECOVER ACCOUNT"
5. Should see success message
   - Note: Full password reset requires admin API (see note below)

## Step 5: Verify Database (Optional)

### 5.1 Check User Created
1. Go to Table Editor → users
2. Should see your test user
3. Check columns:
   - `total_earned` should be > 0
   - `current_balance` should match earned
   - `seedphrase_hash` should be a long hex string

### 5.2 Monitor Real-time Updates
1. Keep Table Editor open on `users` table
2. In game, click cube multiple times
3. Manually refresh table
4. `total_earned` and `current_balance` should increase

## Troubleshooting

### "Supabase client not initialized"
- Check console for errors
- Verify URL and key in `supabase-config.js`
- Ensure no typos in configuration

### "Login failed"
- Open browser DevTools (F12) → Console
- Look for `[ERROR]` messages
- Verify Supabase tables were created
- Check Auth is enabled in Supabase

### "Failed to update token balance"
- Verify `add_tokens` function exists:
  - Supabase → Database → Functions
  - Should see `add_tokens` listed
- Check function permissions (SECURITY DEFINER)

### Page shows blank/white screen
- Check browser console for errors
- Verify all files are present
- Ensure running on local server (not file://)
- Check Supabase project is active

### Tokens not updating in UI
- Check browser console for `[DEBUG]` messages
- Verify internet connection
- Check Supabase project status
- Review RLS policies are correctly set

## Next Steps

### For Development
- Test all features thoroughly
- Create multiple test accounts
- Test edge cases (invalid inputs, etc.)
- Review console logs for errors

### For Production
1. **Enable Email Confirmation:**
   - Supabase → Authentication → Settings
   - Turn ON email confirmations
   - Configure email templates

2. **Secure Environment Variables:**
   - Move Supabase keys to environment variables
   - Never commit keys to git
   - Use different projects for dev/prod

3. **Treasury Wallet Setup:**
   - See `IMPLEMENTATION_NOTES.md` → TODO section
   - Set up Solana wallet
   - Implement withdrawal processing service

4. **Deploy:**
   - Host on Netlify, Vercel, or similar
   - Update Supabase redirect URLs
   - Test production authentication flow

## Quick Reference

**Default Ports:**
- Python server: `http://localhost:8080`
- Live Server: `http://127.0.0.1:5500`

**Important Files:**
- Config: `supabase-config.js`
- Database: `SUPABASE_SETUP.md`
- Game logic: `game.js`
- Auth logic: `auth.js`

**Console Commands to Test:**
```javascript
// In browser console:
// Check if Supabase loaded
console.log(window.supabase);

// Check current user
// (must be on game page)
```

## Support

If you encounter issues:
1. Check browser console for `[DEBUG]` and `[ERROR]` logs
2. Review `IMPLEMENTATION_NOTES.md` for detailed info
3. Verify all SQL scripts ran successfully
4. Check Supabase dashboard for errors
5. Ensure RLS policies are active
