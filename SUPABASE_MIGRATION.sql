-- Supabase Migration: Add wallet_address and private_key columns to users table
-- DEBUG: Run this in your Supabase SQL Editor to update the schema
-- This migration adds wallet support for the new seed phrase based authentication

-- Add wallet_address column (stores the user's Solana public key)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add private_key column (stores the user's Solana private key in base58 format)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS private_key TEXT;

-- Add encrypted_seedphrase column (stores the user's encrypted 12-word seed phrase)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS encrypted_seedphrase TEXT;

-- Create index on wallet_address for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Update RLS policy to allow users to read their own wallet info
-- (Assuming RLS is already enabled on users table)

-- Policy: Users can read their own private_key
-- Note: Drop policy first if it exists, then recreate
DROP POLICY IF EXISTS "Users can view own wallet info" ON users;
CREATE POLICY "Users can view own wallet info"
ON users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own record
DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record"
ON users
FOR UPDATE
USING (auth.uid() = id);


-- Verification query - run this to check the columns were added
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';

-- Note: After running this migration, new users will have wallet_address and private_key
-- populated automatically when they register through the app.
