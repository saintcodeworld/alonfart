import Cube3D from './cube3d.js';
import { AuthManager } from './auth.js';
import { WithdrawalService } from './withdrawal-service.js';
import { WithdrawalProcessor } from './withdrawal-processor.js';
import { initSupabase, getSupabaseClient } from './supabase-config.js';
// Chat functionality removed

const TOOLS = [
    { name: 'The Gust of Alon', hits: 1, coinsPerBreak: 750, cost: 0, image: 'assets/hand.png', model: null },
    { name: 'The Aftershock', hits: 1, coinsPerBreak: 1500, cost: 419999, image: 'assets/hand.png', model: null },
    { name: 'The Full System Flush', hits: 1, coinsPerBreak: 3500, cost: 999999, image: 'assets/hand.png', model: null }
];

class Game {
    constructor() {
        console.log('[DEBUG] Game constructor started');
        
        this.coins = 0;
        this.currentToolIndex = 0;
        this.currentHits = 0;
        this.totalMined = 0;
        this.unlockedTools = [true, false, false];
        
        this.authManager = new AuthManager();
        this.withdrawalService = new WithdrawalService();
        this.withdrawalProcessor = new WithdrawalProcessor();
        this.currentUser = null;
        this.userSeedphrase = null;
        
        // DEBUG: Flag to force server balance after withdrawal (prevents stale local data)
        this.forceServerBalance = false;
        
        // DEBUG: Click cooldown to prevent auto-clickers (2 second delay)
        this.lastClickTime = 0;
        this.clickCooldown = 2000; // 2 seconds in milliseconds
        this.cooldownOverlay = null;
        
        this.authModal = document.getElementById('authModal');
        this.gameContainer = document.getElementById('gameContainer');
        this.cubeContainer = document.getElementById('cubeContainer');
        this.coinCountElement = document.getElementById('coinCount');
        this.tokenBalance = document.getElementById('tokenBalance');
        this.tokensEarned = document.getElementById('tokensEarned');
        this.shopPanel = document.getElementById('shopPanel');
        this.cube3D = null;
        
        this.profilePanel = document.getElementById('profilePanel');
        this.withdrawBtn = document.getElementById('withdrawBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
        
        // DEBUG: Load fart sound effect
        this.fartSound = new Audio('assets/sounds/soundscrate-fart.mp3');
        this.fartSound.volume = 0.5;
        console.log('[DEBUG] Fart sound loaded');
        
        this.init();
    }
    
    cleanupCorruptedData() {
        // Clean up any corrupted localStorage data that might cause rendering issues
        try {
            const saveData = localStorage.getItem('coinMinerSave');
            if (saveData) {
                const parsed = JSON.parse(saveData);
                // Validate save data structure
                if (!parsed || typeof parsed.coins !== 'number' || !Array.isArray(parsed.unlockedTools)) {
                    console.log('Corrupted save data found, clearing...');
                    localStorage.removeItem('coinMinerSave');
                }
            }
        } catch (error) {
            console.log('Error reading save data, clearing...', error);
            localStorage.removeItem('coinMinerSave');
        }
    }
    
    async init() {
        console.log('[DEBUG] Game initialization started');
        
        initSupabase();
        this.setupAuthListeners();
        
        const session = await this.authManager.getCurrentSession();
        
        if (session) {
            console.log('[DEBUG] Active session found, loading game');
            this.currentUser = session;
            this.showGame();
        } else {
            console.log('[DEBUG] No session, showing auth modal');
            this.showAuth();
        }
    }
    
    showAuth() {
        console.log('[DEBUG] Showing auth modal');
        this.authModal.classList.remove('hidden');
        this.gameContainer.classList.add('hidden');
    }
    
    showGame() {
        console.log('[DEBUG] Showing game container');
        this.authModal.classList.add('hidden');
        this.gameContainer.classList.remove('hidden');
        
        // DEBUG: Always create fresh 3D model after container is visible
        // Clean up any existing broken instance first
        if (this.cube3D) {
            console.log('[DEBUG] Cleaning up existing 3D model instance');
            this.cube3D.cleanup();
            this.cube3D = null;
        }
        
        this.cleanupCorruptedData();
        console.log('[DEBUG] Initializing 3D model (container now visible)');
        this.cube3D = new Cube3D('cubeContainer');
        
        // DEBUG: Single click listener on cube container only to prevent multiple triggers
        this.cubeContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleCubeClick(e);
        });
        
        // Start withdrawal processor for automated processing
        this.withdrawalProcessor.start();
        console.log('[DEBUG] Withdrawal processor started');
        this.withdrawBtn.addEventListener('click', () => this.showClaimModal());
        
        // DEBUG: Setup wallet info display in profile
        const showPrivateKeyBtn = document.getElementById('showPrivateKeyBtn');
        const copyPrivateKeyBtn = document.getElementById('copyPrivateKeyBtn');
        
        if (showPrivateKeyBtn) {
            showPrivateKeyBtn.addEventListener('click', () => this.togglePrivateKeyDisplay());
        }
        if (copyPrivateKeyBtn) {
            copyPrivateKeyBtn.addEventListener('click', () => this.copyPrivateKey());
        }
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.refreshHistoryBtn.addEventListener('click', () => this.refreshWithdrawalHistory());
        
        this.updateUI();
        this.setupShop();
        this.loadGame();
        this.loadUserStats();
        this.loadWithdrawalHistory();
    }
    
    async handleCubeClick(e) {
        console.log('[DEBUG] Cube clicked');
        
        // DEBUG: Check click cooldown to prevent auto-clickers
        const now = Date.now();
        const timeSinceLastClick = now - this.lastClickTime;
        
        if (timeSinceLastClick < this.clickCooldown) {
            const remainingTime = ((this.clickCooldown - timeSinceLastClick) / 1000).toFixed(1);
            console.log(`[DEBUG] Click blocked - cooldown active. ${remainingTime}s remaining`);
            return; // Block the click
        }
        
        // DEBUG: Update last click time and start cooldown indicator
        this.lastClickTime = now;
        this.startCooldownIndicator();
        
        this.currentHits++;
        
        // DEBUG: Play fart sound on every click
        if (this.fartSound) {
            this.fartSound.currentTime = 0;
            this.fartSound.play().catch(err => console.log('[DEBUG] Sound play failed:', err));
        }
        
        // Trigger fart animation on click (30% chance for surprise factor)
        if (this.cube3D && Math.random() < 0.3) {
            this.cube3D.fartAnimation();
        }
        
        // Removed shake animation for smoother experience
        
        this.updateCracks();
        
        const currentTool = TOOLS[this.currentToolIndex];
        
        if (this.currentHits >= currentTool.hits) {
            await this.breakCube();
        } else {
            this.updateUI();
        }
    }
    
    updateCracks() {
        const currentTool = TOOLS[this.currentToolIndex];
        const crackLevel = Math.floor((this.currentHits / currentTool.hits) * 4);
        
        if (this.cube3D) {
            this.cube3D.updateCracks(crackLevel);
        }
    }
    
    async breakCube() {
        console.log('[DEBUG] Cube broken');
        this.currentHits = 0;
        const currentTool = TOOLS[this.currentToolIndex];
        const tokensEarned = currentTool.coinsPerBreak;
        
        // Trigger fart animation on break (always happens for comedic effect)
        if (this.cube3D) {
            this.cube3D.fartAnimation();
        }
        
        // Removed shake animation for smoother experience
        
        this.coins += tokensEarned;
        this.totalMined += tokensEarned;
        
        if (this.currentUser) {
            // Update the token balance display immediately for instant UI feedback
            const currentBalance = parseFloat(this.tokenBalance.textContent.replace(/,/g, ''));
            const newBalance = currentBalance + tokensEarned;
            this.tokenBalance.textContent = newBalance.toLocaleString();
            this.tokensEarned.textContent = (parseFloat(this.tokensEarned.textContent.replace(/,/g, '')) + tokensEarned).toLocaleString();
            
            try {
                await this.authManager.updateTokenBalance(this.currentUser.id, tokensEarned);
                console.log('[DEBUG] Token balance updated in database');
            } catch (error) {
                console.error('[ERROR] Failed to update token balance:', error);
            }
        }
        
        this.saveGame();
        this.updateUI();
        this.updateShop();
        
        this.showCoinPopup(tokensEarned);
        
        if (this.cube3D) {
            this.cube3D.breakAnimation();
            this.cube3D.updateCracks(0);
        }
    }
    
    // DEBUG: Start cooldown indicator overlay on cube
    startCooldownIndicator() {
        console.log('[DEBUG] Starting cooldown indicator');
        
        // Create overlay if it doesn't exist
        if (!this.cooldownOverlay) {
            this.cooldownOverlay = document.createElement('div');
            this.cooldownOverlay.className = 'cooldown-overlay';
            this.cooldownOverlay.innerHTML = `
                <div class="cooldown-progress"></div>
                <span class="cooldown-text">WAIT</span>
            `;
            this.cubeContainer.appendChild(this.cooldownOverlay);
        }
        
        // Show and animate the overlay
        const overlay = this.cooldownOverlay;
        const progressBar = overlay.querySelector('.cooldown-progress');
        
        overlay.classList.add('active');
        progressBar.style.transition = 'none';
        progressBar.style.width = '100%';
        
        // Force reflow to restart animation
        progressBar.offsetHeight;
        
        // Animate progress bar shrinking over cooldown duration
        progressBar.style.transition = `width ${this.clickCooldown}ms linear`;
        progressBar.style.width = '0%';
        
        // Hide overlay after cooldown
        setTimeout(() => {
            overlay.classList.remove('active');
            console.log('[DEBUG] Cooldown complete - click ready');
        }, this.clickCooldown);
    }
    
    async loadUserStats() {
        console.log('[DEBUG] Loading user stats');
        if (!this.currentUser) return;
        
        try {
            const stats = await this.authManager.getUserStats(this.currentUser.id);
            console.log('[DEBUG] User stats loaded:', stats);
            
            // DEBUG: Handle null/undefined values with proper defaults
            const username = stats?.username || 'Unknown';
            const totalWithdrawn = stats?.total_withdrawn ?? 0;
            const dbBalance = stats?.current_balance ?? 0;
            const dbTotalEarned = stats?.total_earned ?? 0;
            
            // DEBUG: Update profile stats display
            document.getElementById('statUsername').textContent = username;
            document.getElementById('statWithdrawn').textContent = totalWithdrawn.toLocaleString();
            
            // DEBUG: Use localStorage as source of truth for balance
            // This prevents Supabase from overwriting local progress
            const localBalance = this.coins;
            const localTotalMined = this.totalMined;
            
            // DEBUG: After withdrawal, force use of server values to show correct balance
            let displayBalance, displayTotalEarned;
            
            if (this.forceServerBalance) {
                // After withdrawal, trust server values and sync local state
                console.log('[DEBUG] Forcing server balance after withdrawal');
                displayBalance = dbBalance;
                displayTotalEarned = dbTotalEarned;
                this.coins = dbBalance;
                this.totalMined = dbTotalEarned;
                this.forceServerBalance = false;
                this.saveGame();
                console.log('[DEBUG] Local state synced with server: balance=', dbBalance, 'totalEarned=', dbTotalEarned);
            } else {
                // Normal operation: use higher of local/server
                displayBalance = Math.max(localBalance, dbBalance);
                displayTotalEarned = Math.max(localTotalMined, dbTotalEarned);
            }
            
            document.getElementById('statBalance').textContent = displayBalance.toLocaleString();
            document.getElementById('statTotalEarned').textContent = displayTotalEarned.toLocaleString();
            
            this.tokenBalance.textContent = displayBalance.toLocaleString();
            this.tokensEarned.textContent = displayTotalEarned.toLocaleString();
            this.coinCountElement.textContent = displayBalance.toLocaleString();
            
            // DEBUG: Sync local balance to Supabase if local is higher
            if (localBalance > dbBalance) {
                console.log('[DEBUG] Local balance higher than Supabase, syncing...');
                const diff = localBalance - dbBalance;
                try {
                    await this.authManager.updateTokenBalance(this.currentUser.id, diff);
                    console.log('[DEBUG] Synced local balance to Supabase');
                } catch (syncError) {
                    console.warn('[WARN] Failed to sync to Supabase:', syncError);
                }
            }
            
            // DEBUG: Display wallet address in profile (shortened)
            if (this.currentUser.wallet_address) {
                const walletAddr = this.currentUser.wallet_address;
                const shortAddr = walletAddr.substring(0, 8) + '...' + walletAddr.substring(walletAddr.length - 4);
                document.getElementById('statWalletAddress').textContent = shortAddr;
            }
            
            await this.loadWithdrawalHistory();
        } catch (error) {
            console.error('[ERROR] Failed to load user stats:', error);
            // DEBUG: Fallback to localStorage values on error
            this.coinCountElement.textContent = this.coins.toLocaleString();
            this.tokenBalance.textContent = this.coins.toLocaleString();
            this.tokensEarned.textContent = this.totalMined.toLocaleString();
        }
    }
    
    async loadWithdrawalHistory() {
        console.log('[DEBUG] Loading withdrawal history');
        if (!this.currentUser) return;
        
        try {
            const withdrawals = await this.withdrawalService.getWithdrawalHistory(this.currentUser.id);
            console.log('[DEBUG] Withdrawal history loaded:', withdrawals);
            
            this.displayWithdrawalHistory(withdrawals);
        } catch (error) {
            console.error('[ERROR] Failed to load withdrawal history:', error);
        }
    }
    
    async refreshWithdrawalHistory() {
        console.log('[DEBUG] Manually refreshing withdrawal history');
        if (!this.currentUser) return;
        
        try {
            // Show loading state
            const historyList = document.getElementById('withdrawalHistoryList');
            historyList.innerHTML = '<div class="no-withdrawals">Loading...</div>';
            
            await this.loadWithdrawalHistory();
            console.log('[DEBUG] Withdrawal history refreshed successfully');
        } catch (error) {
            console.error('[ERROR] Failed to refresh withdrawal history:', error);
            const historyList = document.getElementById('withdrawalHistoryList');
            historyList.innerHTML = '<div class="no-withdrawals">Error loading history</div>';
        }
    }

    displayWithdrawalHistory(withdrawals) {
        console.log('[DEBUG] Displaying withdrawal history');
        console.log('[DEBUG] Withdrawals data:', withdrawals);
        const historyList = document.getElementById('withdrawalHistoryList');
        
        if (!withdrawals || withdrawals.length === 0) {
            console.log('[DEBUG] No withdrawals found, showing default message');
            historyList.innerHTML = '<div class="no-withdrawals">No withdrawals yet</div>';
            return;
        }
        
        console.log(`[DEBUG] Found ${withdrawals.length} withdrawals`);
        historyList.innerHTML = '';
        
        withdrawals.forEach((withdrawal, index) => {
            console.log(`[DEBUG] Processing withdrawal ${index + 1}:`, withdrawal);
            const item = document.createElement('div');
            item.className = `withdrawal-item ${withdrawal.status}`;
            
            const amount = document.createElement('div');
            amount.className = 'withdrawal-amount';
            amount.textContent = `${withdrawal.amount.toLocaleString()} TOKENS`;
            
            const date = document.createElement('div');
            date.className = 'withdrawal-date';
            const withdrawalDate = new Date(withdrawal.created_at);
            date.textContent = withdrawalDate.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const details = document.createElement('div');
            details.className = 'withdrawal-details';
            
            const status = document.createElement('span');
            status.className = `withdrawal-status ${withdrawal.status}`;
            status.textContent = withdrawal.status;
            
            details.appendChild(status);
            
            console.log(`[DEBUG] Transaction hash for withdrawal ${index + 1}:`, withdrawal.transaction_hash);
            if (withdrawal.transaction_hash) {
                console.log(`[DEBUG] Creating Solscan link for transaction: ${withdrawal.transaction_hash}`);
                
                // Add only Solscan button (no transaction hash text)
                const solscanBtn = document.createElement('a');
                solscanBtn.className = 'solscan-btn';
                solscanBtn.href = `https://solscan.io/tx/${withdrawal.transaction_hash}`;
                solscanBtn.target = '_blank';
                solscanBtn.rel = 'noopener noreferrer';
                solscanBtn.textContent = 'VIEW TX';
                details.appendChild(solscanBtn);
                console.log(`[DEBUG] Solscan button added for withdrawal ${index + 1}`);
            } else {
                console.log(`[DEBUG] No transaction hash found for withdrawal ${index + 1}`);
            }
            
            const wallet = document.createElement('div');
            wallet.className = 'withdrawal-wallet';
            const walletAddr = withdrawal.phantom_wallet_address;
            wallet.textContent = `TO: ${walletAddr.substring(0, 4)}...${walletAddr.substring(walletAddr.length - 4)}`;
            
            item.appendChild(amount);
            item.appendChild(date);
            item.appendChild(wallet);
            item.appendChild(details);
            
            historyList.appendChild(item);
            console.log(`[DEBUG] Withdrawal ${index + 1} added to DOM`);
        });
        
        console.log('[DEBUG] All withdrawals processed and displayed');
    }
    
    showCoinPopup(amount) {
        const popup = document.createElement('div');
        popup.className = 'coin-popup';
        popup.textContent = `+${amount.toLocaleString()}`;
        
        // Position next to coin display instead of on 3D model
        const coinDisplay = document.querySelector('.coin-display');
        const coinDisplayRect = coinDisplay.getBoundingClientRect();
        
        // Position to the right of the coin display
        popup.style.position = 'fixed';
        popup.style.left = (coinDisplayRect.right + 10) + 'px';
        popup.style.top = coinDisplayRect.top + 'px';
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }
    
    updateUI() {
        // Show current token balance if logged in, otherwise show internal coin count
        if (this.currentUser) {
            // When logged in, show the current token balance (same as top-right display)
            const currentBalance = parseFloat(this.tokenBalance.textContent.replace(/,/g, ''));
            this.coinCountElement.textContent = currentBalance.toLocaleString();
        } else {
            // When not logged in, show the internal coin count
            this.coinCountElement.textContent = Math.floor(this.coins).toLocaleString();
        }
        
        const currentTool = TOOLS[this.currentToolIndex];
        
        document.getElementById('currentToolName').textContent = currentTool.name;
        document.getElementById('currentHits').textContent = currentTool.hits;
        document.getElementById('currentCoins').textContent = currentTool.coinsPerBreak.toLocaleString();
        
        document.getElementById('hashRate').textContent = `${(currentTool.coinsPerBreak * 0.1).toFixed(1)} H/s`;
        document.getElementById('totalMined').textContent = `${this.totalMined.toLocaleString()} TOKENS`;
        
        if (this.currentUser) {
            this.loadUserStats();
        }
    }
    
    setupShop() {
        const toolItems = document.querySelectorAll('.tool-item');
        
        toolItems.forEach((item, index) => {
            const buyBtn = item.querySelector('.buy-btn');
            
            if (index === 0) {
                item.classList.add('equipped');
                item.classList.remove('locked');
                buyBtn.textContent = 'Equipped';
                buyBtn.classList.add('equipped-btn');
                return;
            }
            
            buyBtn.addEventListener('click', () => {
                if (this.canBuyTool(index)) {
                    this.buyTool(index);
                }
            });
        });
        
        this.updateShop();
    }
    
    canBuyTool(index) {
        if (index === 0) return false;
        if (this.unlockedTools[index]) return false;
        if (!this.unlockedTools[index - 1]) return false;
        
        const tool = TOOLS[index];
        return this.coins >= tool.cost;
    }
    
    buyTool(index) {
        const tool = TOOLS[index];
        
        if (this.coins >= tool.cost && !this.unlockedTools[index] && this.unlockedTools[index - 1]) {
            this.coins -= tool.cost;
            this.unlockedTools[index] = true;
            this.currentToolIndex = index;
            this.currentHits = 0;
            
                        
            
            this.saveGame();
            this.updateUI();
            this.updateShop();
        }
    }
    
    updateShop() {
        const toolItems = document.querySelectorAll('.tool-item');
        
        toolItems.forEach((item, index) => {
            const buyBtn = item.querySelector('.buy-btn');
            
            if (this.unlockedTools[index]) {
                item.classList.remove('locked');
                item.classList.add('unlocked');
                
                if (index === this.currentToolIndex) {
                    item.classList.add('equipped');
                    buyBtn.textContent = 'Equipped';
                    buyBtn.classList.add('equipped-btn');
                    buyBtn.disabled = true;
                } else {
                    item.classList.remove('equipped');
                    buyBtn.textContent = 'Equip';
                    buyBtn.classList.remove('equipped-btn');
                    buyBtn.disabled = false;
                    
                    buyBtn.onclick = () => {
                        this.currentToolIndex = index;
                        this.currentHits = 0;
                        const tool = TOOLS[index];
                        
                        this.saveGame();
                        this.updateUI();
                        this.updateShop();
                    };
                }
            } else {
                if (index > 0 && this.unlockedTools[index - 1]) {
                    const tool = TOOLS[index];
                    buyBtn.disabled = this.coins < tool.cost;
                    
                    if (this.coins >= tool.cost) {
                        item.style.opacity = '1';
                    }
                } else {
                    buyBtn.disabled = true;
                }
            }
        });
    }
    
    
    generateUsername() {
        const adjectives = ['Crypto', 'Quantum', 'Pixel', 'Neon', 'Cyber', 'Digital', 'Blockchain', 'Stellar', 'Cosmic', 'Phantom'];
        const nouns = ['Miner', 'Trader', 'Hodler', 'Whale', 'Builder', 'Validator', 'Staker', 'Pioneer', 'Legend', 'Master'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 999);
        return `${randomAdj}${randomNoun}${randomNum}`;
    }
    
    
    
    
    
    
    
    
    
    
    setupAuthListeners() {
        console.log('[DEBUG] Setting up auth listeners');
        
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const showSignupBtn = document.getElementById('showSignupBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const confirmSeedphraseBtn = document.getElementById('confirmSeedphraseBtn');
        
        // DEBUG: New auth flow - seed phrase based
        loginBtn.addEventListener('click', () => this.handleLogin());
        signupBtn.addEventListener('click', () => this.handleSignup());
        confirmSeedphraseBtn.addEventListener('click', () => this.confirmSeedphrase());
        
        showSignupBtn.addEventListener('click', () => this.showSignupForm());
        backToLoginBtn.addEventListener('click', () => this.showLoginForm());
        
        // DEBUG: How to use button functionality
        const howToUseBtn = document.getElementById('howToUseBtn');
        const closeInstructionsBtn = document.getElementById('closeInstructionsBtn');
        const instructionsModal = document.getElementById('instructionsModal');
        
        if (howToUseBtn) {
            howToUseBtn.addEventListener('click', () => {
                console.log('[DEBUG] Showing instructions modal');
                instructionsModal.classList.remove('hidden');
            });
        }
        
        if (closeInstructionsBtn) {
            closeInstructionsBtn.addEventListener('click', () => {
                console.log('[DEBUG] Closing instructions modal');
                instructionsModal.classList.add('hidden');
            });
        }
    }
    
    showLoginForm() {
        console.log('[DEBUG] Showing login form');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('seedphraseDisplay').classList.add('hidden');
        this.hideAuthMessage();
    }
    
    showSignupForm() {
        console.log('[DEBUG] Showing signup form');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        document.getElementById('seedphraseDisplay').classList.add('hidden');
        this.hideAuthMessage();
    }
    
    async handleLogin() {
        console.log('[DEBUG] Login attempt with seed phrase');
        const seedphrase = document.getElementById('loginSeedphrase').value.trim().toLowerCase();
        
        if (!seedphrase) {
            this.showAuthMessage('Please enter your seed phrase', 'error');
            return;
        }
        
        // DEBUG: Validate seed phrase has 12 words
        const words = seedphrase.split(/\s+/);
        if (words.length !== 12) {
            this.showAuthMessage('Seed phrase must be exactly 12 words', 'error');
            return;
        }
        
        try {
            const result = await this.authManager.signIn(seedphrase);
            console.log('[DEBUG] Login successful');
            this.currentUser = result.user;
            this.showGame();
        } catch (error) {
            console.error('[ERROR] Login failed:', error);
            this.showAuthMessage(error.message || 'Login failed. Check your seed phrase.', 'error');
        }
    }
    
    async handleSignup() {
        console.log('[DEBUG] Signup attempt - generating new account');
        
        try {
            // DEBUG: Generate new account with wallet
            const result = await this.authManager.signUp();
            console.log('[DEBUG] Signup successful - wallet generated');
            this.currentUser = result.user;
            this.userSeedphrase = result.seedphrase;
            this.userWallet = result.wallet;
            
            // NOTE: Cannot preload 3D model here - container is hidden and has 0 dimensions
            // Model will be initialized when showGame() is called after container becomes visible
            
            // Display seed phrase and wallet info
            this.displaySeedphraseAndWallet(result.seedphrase, result.wallet);
        } catch (error) {
            console.error('[ERROR] Signup failed:', error);
            let errorMessage = 'Account creation failed. ';
            
            if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.showAuthMessage(errorMessage, 'error');
        }
    }
    
    // DEBUG: Display seed phrase and wallet info after registration
    displaySeedphraseAndWallet(seedphrase, wallet) {
        console.log('[DEBUG] Displaying seedphrase and wallet info');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('seedphraseDisplay').classList.remove('hidden');
        
        // Display seed phrase words
        const words = seedphrase.split(' ');
        const seedphraseDisplay = document.getElementById('seedphraseWords');
        seedphraseDisplay.innerHTML = '';
        
        words.forEach((word, index) => {
            const wordDiv = document.createElement('div');
            wordDiv.textContent = `${index + 1}. ${word}`;
            seedphraseDisplay.appendChild(wordDiv);
        });
        
        // Display wallet address
        const walletAddressDisplay = document.getElementById('walletAddressDisplay');
        walletAddressDisplay.textContent = wallet.publicKey;
        
        // Display private key
        const privateKeyDisplay = document.getElementById('privateKeyDisplay');
        privateKeyDisplay.textContent = wallet.privateKey;
        
        // Add copy buttons
        const existingCopyBtn = document.getElementById('copySeedphraseBtn');
        if (existingCopyBtn) existingCopyBtn.remove();
        
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copySeedphraseBtn';
        copyBtn.className = 'pixel-btn secondary-btn copy-btn';
        copyBtn.textContent = 'COPY SEED PHRASE';
        copyBtn.style.marginTop = '15px';
        copyBtn.style.marginRight = '10px';
        
        const confirmBtn = document.getElementById('confirmSeedphraseBtn');
        confirmBtn.parentNode.insertBefore(copyBtn, confirmBtn);
        
        copyBtn.addEventListener('click', () => this.copySeedphrase(seedphrase));
        
        // Add copy wallet button
        const copyWalletBtn = document.createElement('button');
        copyWalletBtn.id = 'copyWalletBtn';
        copyWalletBtn.className = 'pixel-btn secondary-btn copy-btn';
        copyWalletBtn.textContent = 'COPY PRIVATE KEY';
        copyWalletBtn.style.marginTop = '10px';
        
        confirmBtn.parentNode.insertBefore(copyWalletBtn, confirmBtn);
        
        copyWalletBtn.addEventListener('click', () => this.copyToClipboard(wallet.privateKey, copyWalletBtn));
        
        // DEBUG: Show instructions modal automatically after account generation
        const instructionsModal = document.getElementById('instructionsModal');
        if (instructionsModal) {
            console.log('[DEBUG] Showing instructions modal after account generation');
            instructionsModal.classList.remove('hidden');
        }
    }
    
    // DEBUG: Generic copy to clipboard function
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = '✓ COPIED!';
            button.style.backgroundColor = '#4CAF50';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.backgroundColor = '';
            }, 2000);
        } catch (error) {
            console.error('[ERROR] Copy failed:', error);
            alert('Failed to copy. Please copy manually.');
        }
    }
    
    async copySeedphrase(seedphrase) {
        console.log('[DEBUG] Copying seedphrase to clipboard');
        try {
            await navigator.clipboard.writeText(seedphrase);
            
            // Show success feedback
            const copyBtn = document.getElementById('copySeedphraseBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ COPIED!';
            copyBtn.style.backgroundColor = '#4CAF50';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '';
            }, 2000);
            
        } catch (error) {
            console.error('[ERROR] Failed to copy seedphrase:', error);
            
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = seedphrase;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                const copyBtn = document.getElementById('copySeedphraseBtn');
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✓ COPIED!';
                copyBtn.style.backgroundColor = '#4CAF50';
                
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.style.backgroundColor = '';
                }, 2000);
            } catch (fallbackError) {
                console.error('[ERROR] Fallback copy failed:', fallbackError);
                alert('Failed to copy seedphrase. Please copy it manually.');
            }
            
            document.body.removeChild(textArea);
        }
    }
    
    confirmSeedphrase() {
        console.log('[DEBUG] Seedphrase confirmed, starting game');
        this.showGame();
    }
    
    
    showAuthMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type}`;
        messageEl.classList.remove('hidden');
    }
    
    hideAuthMessage() {
        document.getElementById('authMessage').classList.add('hidden');
    }
    
    async handleLogout() {
        console.log('[DEBUG] Logout initiated');
        try {
            await this.authManager.signOut();
            this.currentUser = null;
            this.userSeedphrase = null;
            
            localStorage.removeItem('coinMinerSave');
            
            window.location.reload();
        } catch (error) {
            console.error('[ERROR] Logout failed:', error);
        }
    }
    
    // DEBUG: Toggle private key visibility in profile
    async togglePrivateKeyDisplay() {
        console.log('[DEBUG] Toggling private key display');
        const privateKeySection = document.getElementById('privateKeySection');
        const showBtn = document.getElementById('showPrivateKeyBtn');
        
        if (privateKeySection.classList.contains('hidden')) {
            // Load and show private key
            try {
                const walletInfo = await this.authManager.getWalletInfo(this.currentUser.id);
                document.getElementById('statPrivateKey').textContent = walletInfo.private_key;
                privateKeySection.classList.remove('hidden');
                showBtn.textContent = 'HIDE PRIVATE KEY';
            } catch (error) {
                console.error('[ERROR] Failed to load private key:', error);
            }
        } else {
            privateKeySection.classList.add('hidden');
            showBtn.textContent = 'SHOW PRIVATE KEY';
        }
    }
    
    // DEBUG: Copy private key from profile
    async copyPrivateKey() {
        const privateKey = document.getElementById('statPrivateKey').textContent;
        const copyBtn = document.getElementById('copyPrivateKeyBtn');
        await this.copyToClipboard(privateKey, copyBtn);
    }
    
    // DEBUG: Show claim rewards modal
    showClaimModal() {
        console.log('[DEBUG] Opening claim rewards modal');
        const claimModal = document.getElementById('claimModal');
        claimModal.classList.remove('hidden');
        
        if (this.currentUser) {
            // DEBUG: Use this.coins (localStorage) directly as source of truth
            document.getElementById('claimBalance').textContent = this.coins.toLocaleString();
            console.log('[DEBUG] Claim modal balance set to:', this.coins);
            
            // Show wallet address (shortened)
            const walletAddr = this.currentUser.wallet_address;
            if (walletAddr) {
                document.getElementById('claimWalletAddress').textContent = 
                    walletAddr.substring(0, 8) + '...' + walletAddr.substring(walletAddr.length - 4);
            }
        }
        
        const confirmBtn = document.getElementById('confirmClaimBtn');
        const cancelBtn = document.getElementById('cancelClaimBtn');
        
        confirmBtn.onclick = () => this.handleClaimRewards();
        cancelBtn.onclick = () => {
            claimModal.classList.add('hidden');
            document.getElementById('claimMessage').classList.add('hidden');
        };
    }
    
    // DEBUG: Handle claim rewards - sends entire balance to user's wallet
    async handleClaimRewards() {
        console.log('[DEBUG] Claim rewards initiated');
        const messageEl = document.getElementById('claimMessage');
        
        if (!this.currentUser || !this.currentUser.wallet_address) {
            messageEl.textContent = 'Wallet not found. Please re-login.';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        // DEBUG: Use this.coins (localStorage) directly as source of truth
        const balance = this.coins;
        console.log('[DEBUG] Claiming balance:', balance);
        
        if (!balance || balance <= 0) {
            messageEl.textContent = 'No tokens to claim.';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        if (balance < 1000) {
            messageEl.textContent = 'Minimum claim is 1,000 tokens.';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        try {
            messageEl.textContent = 'Processing claim... Please wait.';
            messageEl.className = 'auth-message';
            messageEl.classList.remove('hidden');
            
            // DEBUG: Send entire balance to user's generated wallet
            const result = await this.withdrawalService.createWithdrawalRequest(
                this.currentUser.id,
                balance,
                this.currentUser.wallet_address
            );
            
            console.log('[DEBUG] Claim successful:', result);
            messageEl.textContent = 'Tokens claimed successfully! Check your wallet.';
            messageEl.className = 'auth-message success';
            messageEl.classList.remove('hidden');
            
            // DEBUG: Reset local balance after successful claim and force server refresh
            this.coins = 0;
            this.totalMined = 0;
            this.forceServerBalance = true;  // Force next loadUserStats to use server values
            this.saveGame();
            this.updateUI();
            console.log('[DEBUG] Local balance reset to 0 after claim, forceServerBalance=true');
            
            await this.loadUserStats();
            await this.loadWithdrawalHistory();
            
            setTimeout(() => {
                document.getElementById('claimModal').classList.add('hidden');
                messageEl.classList.add('hidden');
            }, 3000);
            
        } catch (error) {
            console.error('[ERROR] Claim failed:', error);
            messageEl.textContent = error.message || 'Claim failed. Please try again.';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
        }
    }
    
    saveGame() {
        const gameState = {
            coins: this.coins,
            currentToolIndex: this.currentToolIndex,
            unlockedTools: this.unlockedTools,
            totalMined: this.totalMined
        };
        localStorage.setItem('coinMinerSave', JSON.stringify(gameState));
    }
    
    loadGame() {
        const savedGame = localStorage.getItem('coinMinerSave');
        if (savedGame) {
            const gameState = JSON.parse(savedGame);
            this.coins = gameState.coins || 0;
            this.currentToolIndex = gameState.currentToolIndex || 0;
            this.unlockedTools = gameState.unlockedTools || [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
            this.totalMined = gameState.totalMined || 0;
            
            const tool = TOOLS[this.currentToolIndex];
            this.updateUI();
            this.updateShop();
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
});
