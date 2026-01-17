# Railway Environment Variables Setup

## Critical: Fix Deployment Errors

Your Railway deployment is failing because environment variables are not configured. Follow these steps to fix it:

## Required Environment Variables

You **MUST** set these environment variables in Railway for your app to work:

### 1. Go to Railway Dashboard
1. Open your project in Railway
2. Click on your service
3. Go to the **Variables** tab

### 2. Add These Variables

Copy and paste each variable from your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://lyqrljcmfmhmowktfgrl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cXJsamNtZm1obW93a3RmZ3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzg5ODgsImV4cCI6MjA4MzY1NDk4OH0.x5_DBlARJrKHE3ae4LQp0iukcJvz6LsOEitXLbVaS50

# Solana Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=82eda54f-31da-4604-8adf-39b313fdb933

# Treasury Wallet (KEEP SECRET!)
TREASURY_PRIVATE_KEY=5E4qVRM3jq8iZgZLqBYnW5wqbPHPDkTS4H3pxhSZfg84M3oCUrsTu7bdE8cKWoHEnqMjwYCKK98hLAayv6duhoqH

# Token Configuration
TOKEN_MINT_ADDRESS=3XqhD29jyCa72WeZKPoUDtz4XUxWoWKK42roF4EBpump

# Withdrawal Settings
MIN_WITHDRAWAL=1000
MAX_WITHDRAWAL_PER_DAY=100000000

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 3. How to Add Variables in Railway

**Option A: Using the Railway Dashboard (Recommended)**
1. Click "New Variable" button
2. Enter variable name (e.g., `SUPABASE_URL`)
3. Enter variable value
4. Click "Add"
5. Repeat for all variables above

**Option B: Using Railway CLI**
```bash
railway variables set SUPABASE_URL=https://lyqrljcmfmhmowktfgrl.supabase.co
railway variables set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# ... repeat for all variables
```

**Option C: Bulk Import (Fastest)**
1. In Railway dashboard, click "Raw Editor" in Variables tab
2. Paste all variables in `KEY=VALUE` format
3. Click "Update Variables"

### 4. Redeploy

After adding all variables:
1. Railway will automatically redeploy
2. Or manually trigger: Click "Deploy" → "Redeploy"

### 5. Verify Deployment

Check the deployment logs:
- Look for: `✅ Server running on port 3000`
- Should NOT see: `Error: supabaseUrl is required`

## Troubleshooting

### Error: "supabaseUrl is required"
- **Cause**: `SUPABASE_URL` or `SUPABASE_ANON_KEY` not set
- **Fix**: Add both variables in Railway dashboard

### Error: "Treasury not initialized"
- **Cause**: `TREASURY_PRIVATE_KEY` not set or invalid
- **Fix**: Add the private key from your `.env` file

### Error: "Insufficient SOL for fees"
- **Cause**: Treasury wallet needs SOL for transaction fees
- **Fix**: Send ~0.01 SOL to your treasury wallet address

### Node.js Version Warning
The logs show: `Node.js 18 and below are deprecated`
- **Fix**: Add `NODE_VERSION=20` to Railway variables
- Or create a `.nvmrc` file with `20` in it

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` file to git
- Keep `TREASURY_PRIVATE_KEY` secret
- Only share environment variables through secure channels
- Use different keys for development and production

## Next Steps

1. ✅ Add all environment variables to Railway
2. ✅ Wait for automatic redeploy
3. ✅ Check logs for successful startup
4. ✅ Test your app at the Railway URL
5. ✅ Fund treasury wallet with SOL if needed

## Quick Copy-Paste for Railway

If you want to quickly copy all variables, use the Raw Editor in Railway and paste:

```
SUPABASE_URL=https://lyqrljcmfmhmowktfgrl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cXJsamNtZm1obW93a3RmZ3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzg5ODgsImV4cCI6MjA4MzY1NDk4OH0.x5_DBlARJrKHE3ae4LQp0iukcJvz6LsOEitXLbVaS50
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=82eda54f-31da-4604-8adf-39b313fdb933
TREASURY_PRIVATE_KEY=5E4qVRM3jq8iZgZLqBYnW5wqbPHPDkTS4H3pxhSZfg84M3oCUrsTu7bdE8cKWoHEnqMjwYCKK98hLAayv6duhoqH
TOKEN_MINT_ADDRESS=3XqhD29jyCa72WeZKPoUDtz4XUxWoWKK42roF4EBpump
MIN_WITHDRAWAL=1000
MAX_WITHDRAWAL_PER_DAY=100000000
PORT=3000
NODE_ENV=production
```
