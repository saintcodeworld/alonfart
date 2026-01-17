-- ============================================================================
-- COMPLETE DATABASE SCHEMA FOR COIN MINER PROJECT
-- ============================================================================
-- This is the ONLY schema you need. Run this to set up a fresh database.
-- If you have existing tables, DROP them first or this will fail.
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING TABLES (if any) - CAREFUL: This deletes all data!
-- ============================================================================
-- Uncomment these lines if you want to start fresh:
-- DROP TABLE IF EXISTS withdrawals CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS add_tokens(UUID, BIGINT);
-- DROP FUNCTION IF EXISTS process_withdrawal(UUID, BIGINT, TEXT);
-- DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- STEP 2: CREATE USERS TABLE
-- ============================================================================
-- This table stores all user data including wallet info and token balances
CREATE TABLE IF NOT EXISTS users (
    -- Primary key linked to Supabase Auth
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- User identification
    username TEXT NOT NULL,
    seedphrase_hash TEXT NOT NULL UNIQUE,
    
    -- Solana wallet information (auto-generated on signup)
    wallet_address TEXT NOT NULL,
    private_key TEXT NOT NULL,
    
    -- Token balance tracking (using BIGINT for large numbers)
    total_earned BIGINT NOT NULL DEFAULT 0,
    total_withdrawn BIGINT NOT NULL DEFAULT 0,
    current_balance BIGINT NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================================================
-- STEP 3: CREATE WITHDRAWALS TABLE
-- ============================================================================
-- This table tracks all withdrawal requests and their status
CREATE TABLE IF NOT EXISTS withdrawals (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to users table
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Withdrawal details
    amount BIGINT NOT NULL,
    phantom_wallet_address TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_hash TEXT,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_seedphrase_hash ON users(seedphrase_hash);

-- Withdrawals table indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- ============================================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES FOR USERS TABLE
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Anyone can insert" ON users;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
    ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- Policy: Anyone can insert (needed for signup)
CREATE POLICY "Anyone can insert"
    ON users
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES FOR WITHDRAWALS TABLE
-- ============================================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON withdrawals;

-- Policy: Users can read their own withdrawals
CREATE POLICY "Users can read own withdrawals"
    ON withdrawals
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own withdrawals
CREATE POLICY "Users can insert own withdrawals"
    ON withdrawals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STEP 8: CREATE DATABASE FUNCTIONS
-- ============================================================================

-- Function: Add tokens to user balance (atomic operation)
-- This is called when users mine tokens in the game
CREATE OR REPLACE FUNCTION add_tokens(user_id UUID, tokens BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE users
    SET 
        total_earned = total_earned + tokens,
        current_balance = current_balance + tokens,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$;

-- Function: Process withdrawal (atomic operation)
-- This is called by the backend when processing withdrawals
-- IMPORTANT: This deducts balance and creates withdrawal record atomically
CREATE OR REPLACE FUNCTION process_withdrawal(
    user_id UUID, 
    withdrawal_amount BIGINT,
    wallet_address TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    withdrawal_id UUID;
    current_bal BIGINT;
BEGIN
    -- Check current balance
    SELECT current_balance INTO current_bal
    FROM users
    WHERE id = user_id;
    
    -- Verify sufficient balance
    IF current_bal IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF current_bal < withdrawal_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Deduct from balance and update total withdrawn
    UPDATE users
    SET 
        current_balance = current_balance - withdrawal_amount,
        total_withdrawn = total_withdrawn + withdrawal_amount,
        updated_at = NOW()
    WHERE id = user_id;
    
    -- Create withdrawal record
    INSERT INTO withdrawals (user_id, amount, phantom_wallet_address, status)
    VALUES (user_id, withdrawal_amount, wallet_address, 'pending')
    RETURNING id INTO withdrawal_id;
    
    RETURN withdrawal_id;
END;
$$;

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 9: CREATE TRIGGERS
-- ============================================================================
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Trigger: Auto-update updated_at on users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after setup to verify everything is correct:

-- Check users table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- Check withdrawals table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'withdrawals' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('users', 'withdrawals');

-- Check functions
-- SELECT routine_name FROM information_schema.routines WHERE routine_type = 'FUNCTION' AND routine_schema = 'public';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Update your .env or supabase-config.js with your Supabase URL and anon key
-- 2. Enable Email authentication in Supabase Dashboard (Authentication > Providers)
-- 3. Test signup and login in your application
-- ============================================================================
