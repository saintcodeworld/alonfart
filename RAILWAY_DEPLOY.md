# Railway Deployment Guide

## Overview
This project is configured for secure deployment to Railway with mainnet Solana transactions.

**Security Model**: Private keys and sensitive credentials are stored server-side only. The frontend calls backend API endpoints for blockchain transactions.

---

## Pre-Deployment Checklist

### 1. Treasury Wallet Requirements
Before deploying, ensure your treasury wallet has:
- [ ] **SOL for fees**: At least 0.01-0.1 SOL for transaction fees
- [ ] **Tokens**: Your memecoins to distribute to users

Treasury Wallet Address: Check your `.env` file for `TREASURY_PRIVATE_KEY` and derive the public key.

### 2. Verify Your Token
- Token Mint: `3rWYgrDadQcX34jnc4rrWN9Rr3AAHCmgtoHHGFq8pump`
- Network: `mainnet-beta`

---

## Railway Deployment Steps

### Step 1: Install Dependencies Locally (Optional Test)
```bash
cd /Users/saintcodeworld/Downloads/mineclicker-main
npm install
npm start
```
Visit `http://localhost:3000` to test locally.

### Step 2: Deploy to Railway

**Option A: Railway CLI**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project (first time only)
railway init

# Deploy
railway up
```

**Option B: Railway Dashboard (GitHub)**
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js and deploys

### Step 3: Set Environment Variables in Railway

Go to your Railway project → **Variables** tab and add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://lyqrljcmfmhmowktfgrl.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (full key from .env) |
| `SOLANA_NETWORK` | `mainnet-beta` |
| `SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY` |
| `TREASURY_PRIVATE_KEY` | Your treasury wallet private key |
| `TOKEN_MINT_ADDRESS` | `3rWYgrDadQcX34jnc4rrWN9Rr3AAHCmgtoHHGFq8pump` |
| `MIN_WITHDRAWAL` | `1000` |
| `MAX_WITHDRAWAL_PER_DAY` | `100000` |

⚠️ **IMPORTANT**: Copy values from your `.env` file. Never commit `.env` to git!

### Step 4: Generate Domain
1. In Railway, go to **Settings** → **Domains**
2. Click "Generate Domain" to get a `*.up.railway.app` URL
3. Or add a custom domain

---

## API Endpoints

The backend server exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check and treasury status |
| `/api/treasury/info` | GET | Get treasury public key (safe) |
| `/api/withdraw` | POST | Process withdrawal (secure) |
| `/api/validate-address` | POST | Validate Solana address |

---

## Files Modified for Security

| File | Change |
|------|--------|
| `server.js` | NEW - Backend server with secure API |
| `package.json` | NEW - Node.js dependencies |
| `.env` / `.env.local` | NEW - Environment variables |
| `treasury-config.js` | Removed private keys |
| `withdrawal-service.js` | Calls backend API instead of direct blockchain |
| `withdrawal-processor.js` | Updated to use backend API |
| `.gitignore` | Protects .env files |

---

## Troubleshooting

### "Treasury not initialized"
- Check that `TREASURY_PRIVATE_KEY` is set correctly in Railway variables

### "Insufficient SOL for fees"
- Send at least 0.01 SOL to your treasury wallet

### "Insufficient treasury token balance"
- Ensure your treasury wallet has tokens to distribute

### Transaction failures
- Check Helius API rate limits
- Verify RPC URL is correct

---

## Security Notes

✅ Private keys are **server-side only** - never exposed to browser
✅ `.env` files are gitignored
✅ Frontend calls secure API endpoints
✅ Treasury config no longer contains secrets

---

## Test After Deployment

1. Visit your Railway URL
2. Create a new account
3. Mine some tokens
4. Click "CLAIM REWARDS"
5. Check transaction on [Solscan](https://solscan.io)

If you see the transaction on Solscan, mainnet transactions are working! 🎉
