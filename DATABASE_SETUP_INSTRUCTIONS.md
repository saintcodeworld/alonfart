# DATABASE SETUP INSTRUCTIONS

## ⚠️ IMPORTANT: Read This First

Your profile stats issue is caused by **missing or incorrect database schema**. Follow these steps exactly to fix it.

## 🔧 Step-by-Step Setup

### 1. Access Your Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your project
3. Click on **SQL Editor** in the left sidebar

### 2. Clear Old Schema (IMPORTANT!)

**⚠️ WARNING: This will delete all existing data!**

If you have existing tables with issues, run this first:

```sql
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP FUNCTION IF EXISTS add_tokens(UUID, BIGINT);
DROP FUNCTION IF EXISTS process_withdrawal(UUID, BIGINT, TEXT);
DROP FUNCTION IF EXISTS update_updated_at_column();
```

### 3. Run the Complete Schema

1. Open the file: `COMPLETE_DATABASE_SCHEMA.sql`
2. Copy the ENTIRE contents
3. Paste into Supabase SQL Editor
4. Click **Run** or press `Cmd/Ctrl + Enter`
5. Wait for success message

### 4. Verify Setup

Run this query to check your tables:

```sql
-- Check users table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check withdrawals table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'withdrawals' 
ORDER BY ordinal_position;
```

You should see:

**Users table columns:**
- id (uuid)
- username (text)
- seedphrase_hash (text)
- wallet_address (text)
- private_key (text)
- total_earned (bigint, default 0)
- total_withdrawn (bigint, default 0)
- current_balance (bigint, default 0)
- created_at (timestamp)
- updated_at (timestamp)

**Withdrawals table columns:**
- id (uuid)
- user_id (uuid)
- amount (bigint)
- phantom_wallet_address (text)
- status (text, default 'pending')
- transaction_hash (text)
- error_message (text)
- created_at (timestamp)
- processed_at (timestamp)

### 5. Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. For testing, you can disable email confirmation:
   - Go to **Authentication** → **Settings**
   - Turn OFF "Confirm email"

### 6. Update Your Configuration

Check your `supabase-config.js` file has correct credentials:

```javascript
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

Get these from: **Settings** → **API** in Supabase Dashboard

### 7. Test Your Application

1. Clear browser cache and localStorage
2. Open your app
3. Click **SIGN UP**
4. After signup, check your profile - all stats should now display correctly!

## 🐛 Troubleshooting

### Profile still shows "---" or "0"

**Check browser console for errors:**
- Press F12 → Console tab
- Look for red error messages
- Common issues:
  - RLS policies blocking access
  - Wrong Supabase credentials
  - CORS issues

**Verify RLS policies:**

```sql
-- Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('users', 'withdrawals');
```

You should see 5 policies total:
- 3 for users table
- 2 for withdrawals table

### "Insufficient privileges" error

Your RLS policies might be wrong. Re-run the RLS section from `COMPLETE_DATABASE_SCHEMA.sql`:

```sql
-- Re-run STEP 6 and STEP 7 from the schema file
```

### New users not appearing in database

1. Check Supabase Auth users:
   - Go to **Authentication** → **Users**
   - Verify user was created in auth.users

2. Check users table:
   ```sql
   SELECT id, username, wallet_address, current_balance FROM users;
   ```

3. If auth user exists but not in users table:
   - Check browser console for errors during signup
   - Verify RLS "Anyone can insert" policy exists

### Balance not updating

1. Check if `add_tokens` function exists:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'add_tokens';
   ```

2. Test the function manually:
   ```sql
   -- Replace USER_ID with actual user ID
   SELECT add_tokens('USER_ID'::UUID, 100);
   
   -- Check if balance updated
   SELECT username, current_balance, total_earned FROM users;
   ```

## 📊 What This Schema Includes

### Tables
1. **users** - Stores user profiles, wallets, and token balances
2. **withdrawals** - Tracks all withdrawal requests and their status

### Functions
1. **add_tokens()** - Safely adds tokens to user balance (atomic)
2. **process_withdrawal()** - Handles withdrawal requests (atomic)
3. **update_updated_at_column()** - Auto-updates timestamps

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Atomic operations prevent race conditions

### Indexes
- Optimized for fast lookups on username, wallet_address, seedphrase_hash
- Fast withdrawal queries by user_id and status

## 🎯 What Was Wrong Before

**Common issues in old schemas:**
1. ❌ Missing NOT NULL constraints on required fields
2. ❌ No default values for balance fields (caused NULL instead of 0)
3. ❌ Missing indexes (slow queries)
4. ❌ Incomplete RLS policies (access denied errors)
5. ❌ No validation constraints (invalid data)
6. ❌ Missing functions (balance updates failed)

**This schema fixes ALL of these issues!**

## 🚀 After Setup

Once setup is complete:
1. All profile stats will display correctly
2. Token balances will update properly
3. Withdrawals will be tracked
4. No more "---" or missing data

## 📝 Need Help?

If you still have issues after following these steps:
1. Check browser console for specific error messages
2. Verify all SQL commands completed successfully
3. Ensure Supabase credentials are correct in your code
