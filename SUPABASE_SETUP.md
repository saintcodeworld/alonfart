# Supabase Setup Instructions

## Database Schema

### 1. Create Users Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table for storing user profiles and token balances
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    seedphrase_hash TEXT NOT NULL,
    total_earned BIGINT DEFAULT 0,
    total_withdrawn BIGINT DEFAULT 0,
    current_balance BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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

-- Policy: Anyone can insert (for signup)
CREATE POLICY "Anyone can insert"
    ON users
    FOR INSERT
    WITH CHECK (true);

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);
```

### 2. Create Withdrawals Table

```sql
-- Withdrawals table for tracking token withdrawal history
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    phantom_wallet_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    transaction_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

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

-- Create index for faster queries
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
```

### 3. Create Database Function for Adding Tokens

```sql
-- Function to add tokens to user balance (atomic operation)
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
```

### 4. Create Database Function for Processing Withdrawals

```sql
-- Function to process withdrawal (atomic operation)
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
    IF current_bal < withdrawal_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Deduct from balance
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
```

### 5. Create Trigger for Updated_at

```sql
-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## Configuration Steps

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note your project URL and anon key

2. **Run SQL Scripts**
   - Go to SQL Editor in Supabase Dashboard
   - Copy and paste each SQL block above
   - Execute them in order

3. **Update Configuration File**
   - Open `supabase-config.js`
   - Replace `YOUR_SUPABASE_URL` with your project URL (format: `https://[project-ref].supabase.co`)
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon key from Settings > API

4. **Configure Email Authentication**
   - Go to Authentication > Sign In / Providers
   - Ensure "Enable Email provider" is ON
   - Turn OFF "Secure email change" for development (re-enable for production)
   - This allows users to sign up without email verification during testing

## Treasury Wallet Implementation (TODO)

**NOTE**: Treasury wallet functionality is placeholder for now. Implementation needed:

1. Create a Solana wallet for treasury
2. Fund it with your memecoin tokens
3. Implement backend service to process withdrawals
4. Connect withdrawal records to actual token transfers
5. Update withdrawal status when processed

Current implementation creates withdrawal records but does not transfer tokens yet.
