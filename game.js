import Cube3D from './cube3d.js';
import { AuthManager } from './auth.js';
import { WithdrawalService } from './withdrawal-service.js';
import { WithdrawalProcessor } from './withdrawal-processor.js';
import { initSupabase, getSupabaseClient } from './supabase-config.js';

const TOOLS = [
    { name: 'Genesis Miner', hits: 1, coinsPerBreak: 1, cost: 0, image: 'assets/hand.png', model: null },
    { name: 'Bronze Miner', hits: 1, coinsPerBreak: 2, cost: 0, image: 'assets/wooden_pickaxe.png', model: null },
    { name: 'Silver Miner', hits: 1, coinsPerBreak: 3, cost: 0, image: 'assets/stone_pickaxe.png', model: null },
    { name: 'Gold Miner', hits: 1, coinsPerBreak: 4, cost: 0, image: 'assets/iron_pickaxe.png', model: null },
    { name: 'Platinum Miner', hits: 1, coinsPerBreak: 5, cost: 0, image: 'assets/gold_pickaxe.png', model: null },
    { name: 'Diamond Miner', hits: 1, coinsPerBreak: 6, cost: 0, image: 'assets/platinum_pickaxe.png', model: null },
    { name: 'Quantum Miner', hits: 1, coinsPerBreak: 7, cost: 0, image: 'assets/netherite_pickaxe.png', model: null },
    { name: 'Crypto Miner', hits: 1, coinsPerBreak: 8, cost: 0, image: 'assets/hand.png', model: null },
    { name: 'DeFi Miner', hits: 1, coinsPerBreak: 9, cost: 0, image: 'assets/wooden_pickaxe.png', model: null },
    { name: 'NFT Miner', hits: 1, coinsPerBreak: 10, cost: 0, image: 'assets/stone_pickaxe.png', model: null },
    { name: 'DAO Miner', hits: 1, coinsPerBreak: 15, cost: 0, image: 'assets/iron_pickaxe.png', model: null },
    { name: 'Validator Miner', hits: 1, coinsPerBreak: 20, cost: 0, image: 'assets/gold_pickaxe.png', model: null },
    { name: 'Staking Miner', hits: 1, coinsPerBreak: 25, cost: 0, image: 'assets/platinum_pickaxe.png', model: null },
    { name: 'Metaverse Miner', hits: 1, coinsPerBreak: 30, cost: 0, image: 'assets/netherite_pickaxe.png', model: null },
    { name: 'Web3 Miner', hits: 1, coinsPerBreak: 35, cost: 0, image: 'assets/hand.png', model: null },
    { name: 'Smart Contract', hits: 1, coinsPerBreak: 40, cost: 0, image: 'assets/wooden_pickaxe.png', model: null },
    { name: 'Blockchain Miner', hits: 1, coinsPerBreak: 60, cost: 0, image: 'assets/stone_pickaxe.png', model: null },
    { name: 'Solana Miner', hits: 1, coinsPerBreak: 80, cost: 0, image: 'assets/iron_pickaxe.png', model: null },
    { name: 'Phantom Miner', hits: 1, coinsPerBreak: 100, cost: 0, image: 'assets/gold_pickaxe.png', model: null },
    { name: 'Ledger Miner', hits: 1, coinsPerBreak: 120, cost: 0, image: 'assets/platinum_pickaxe.png', model: null },
    { name: 'Consensus Miner', hits: 1, coinsPerBreak: 140, cost: 0, image: 'assets/netherite_pickaxe.png', model: null },
    { name: 'Proof-of-Work', hits: 1, coinsPerBreak: 190, cost: 0, image: 'assets/hand.png', model: null },
    { name: 'Proof-of-Stake', hits: 1, coinsPerBreak: 240, cost: 0, image: 'assets/wooden_pickaxe.png', model: null },
    { name: 'Decentralized', hits: 1, coinsPerBreak: 290, cost: 0, image: 'assets/stone_pickaxe.png', model: null },
    { name: 'Satoshi Miner', hits: 1, coinsPerBreak: 340, cost: 0, image: 'assets/iron_pickaxe.png', model: null },
    { name: 'Genesis Block', hits: 1, coinsPerBreak: 390, cost: 0, image: 'assets/gold_pickaxe.png', model: null }
];

class Game {
    constructor() {
        console.log('[DEBUG] Game constructor started');
        
        this.coins = 0;
        this.currentToolIndex = 0;
        this.currentHits = 0;
        this.totalMined = 0;
        this.unlockedTools = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];
        
        this.authManager = new AuthManager();
        this.withdrawalService = new WithdrawalService();
        this.withdrawalProcessor = new WithdrawalProcessor();
        this.currentUser = null;
        this.userSeedphrase = null;
        
        this.authModal = document.getElementById('authModal');
        this.gameContainer = document.getElementById('gameContainer');
        this.cubeContainer = document.getElementById('cubeContainer');
        this.coinCountElement = document.getElementById('coinCount');
        this.tokenBalance = document.getElementById('tokenBalance');
        this.tokensEarned = document.getElementById('tokensEarned');
        this.shopBtn = document.getElementById('shopBtn');
        this.shopDropdown = document.getElementById('shopDropdown');
        this.cube3D = null;
        
        this.profileBtn = document.getElementById('profileBtn');
        this.profileUsername = document.getElementById('profileUsername');
        this.profileDropdown = document.getElementById('profileDropdown');
        this.withdrawBtn = document.getElementById('withdrawBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        this.chatContainer = document.getElementById('chatContainer');
        this.chatBody = document.getElementById('chatBody');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.chatToggleBtn = document.getElementById('chatToggleBtn');
        this.chatHistory = [];
        
        this.hitSound = new Audio('assets/sounds/782969__qubodup__good-phone-notification-sound.wav');
        this.breakSound = null;
        this.coinSound = null;
        this.buySound = null;
        
        this.hitSound.volume = 0.5;
        
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
        
        // Clean up chat data if corrupted
        try {
            const chatData = localStorage.getItem('coinMinerChat');
            if (chatData) {
                const parsed = JSON.parse(chatData);
                if (!Array.isArray(parsed)) {
                    localStorage.removeItem('coinMinerChat');
                }
            }
        } catch (error) {
            localStorage.removeItem('coinMinerChat');
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
        
        this.cleanupCorruptedData();
        this.cube3D = new Cube3D('cubeContainer');
        this.cubeContainer.addEventListener('click', (e) => this.handleCubeClick(e));
        this.profileBtn.addEventListener('click', () => this.toggleProfile());
        
        // Start withdrawal processor for automated processing
        this.withdrawalProcessor.start();
        console.log('[DEBUG] Withdrawal processor started');
        this.withdrawBtn.addEventListener('click', () => this.showWithdrawModal());
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        this.shopBtn.addEventListener('click', () => this.toggleShop());
        
        this.updateUI();
        this.setupShop();
        this.loadGame();
        this.initChat();
        this.loadUserStats();
        
        document.addEventListener('click', (e) => {
            if (!this.shopDropdown.contains(e.target) && e.target !== this.shopBtn && !this.shopBtn.contains(e.target)) {
                this.shopDropdown.classList.add('hidden');
            }
            if (!this.profileDropdown.contains(e.target) && e.target !== this.profileBtn && !this.profileBtn.contains(e.target)) {
                this.profileDropdown.classList.add('hidden');
            }
        });
    }
    
    toggleShop() {
        this.shopDropdown.classList.toggle('hidden');
    }
    
    toggleProfile() {
        this.profileDropdown.classList.toggle('hidden');
        if (!this.profileDropdown.classList.contains('hidden')) {
            this.loadUserStats();
        }
    }
    
    async handleCubeClick(e) {
        console.log('[DEBUG] Cube clicked');
        this.currentHits++;
        
        this.playSound(this.hitSound);
        
        if (this.cube3D) {
            this.cube3D.shake();
        }
        
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
        
        this.coins += tokensEarned;
        this.totalMined += tokensEarned;
        
        if (this.currentUser) {
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
        
        this.playSound(this.breakSound);
        this.playSound(this.coinSound);
        this.showCoinPopup(tokensEarned);
        
        if (this.cube3D) {
            this.cube3D.breakAnimation();
            this.cube3D.updateCracks(0);
        }
    }
    
    async loadUserStats() {
        console.log('[DEBUG] Loading user stats');
        if (!this.currentUser) return;
        
        try {
            const stats = await this.authManager.getUserStats(this.currentUser.id);
            console.log('[DEBUG] User stats loaded:', stats);
            
            this.profileUsername.textContent = stats.username.toUpperCase();
            document.getElementById('statUsername').textContent = stats.username;
            document.getElementById('statBalance').textContent = stats.current_balance.toLocaleString();
            document.getElementById('statTotalEarned').textContent = stats.total_earned.toLocaleString();
            document.getElementById('statWithdrawn').textContent = stats.total_withdrawn.toLocaleString();
            
            this.tokenBalance.textContent = stats.current_balance.toLocaleString();
            this.tokensEarned.textContent = stats.total_earned.toLocaleString();
        } catch (error) {
            console.error('[ERROR] Failed to load user stats:', error);
        }
    }
    
    showCoinPopup(amount) {
        const popup = document.createElement('div');
        popup.className = 'coin-popup';
        popup.textContent = `+${amount}`;
        popup.style.left = '50%';
        popup.style.top = '50%';
        document.querySelector('.cube-container').appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }
    
    updateUI() {
        this.coinCountElement.textContent = Math.floor(this.coins * 10) / 10;
        const currentTool = TOOLS[this.currentToolIndex];
        
        document.getElementById('currentToolName').textContent = currentTool.name;
        document.getElementById('currentHits').textContent = currentTool.hits;
        document.getElementById('currentCoins').textContent = currentTool.coinsPerBreak;
        
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
            
                        
            this.playSound(this.buySound);
            
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
    
    playSound(audio) {
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
    }
    
    generateUsername() {
        const adjectives = ['Crypto', 'Quantum', 'Pixel', 'Neon', 'Cyber', 'Digital', 'Blockchain', 'Stellar', 'Cosmic', 'Phantom'];
        const nouns = ['Miner', 'Trader', 'Hodler', 'Whale', 'Builder', 'Validator', 'Staker', 'Pioneer', 'Legend', 'Master'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 999);
        return `${randomAdj}${randomNoun}${randomNum}`;
    }
    
    initChat() {
        this.chatSendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        this.chatToggleBtn.addEventListener('click', () => this.toggleChat());
        
        this.loadChatHistory();
        this.simulateOtherPlayers();
    }
    
    toggleChat() {
        this.chatBody.classList.toggle('minimized');
        this.chatToggleBtn.textContent = this.chatBody.classList.contains('minimized') ? '+' : '_';
    }
    
    sendMessage() {
        const message = this.chatInput.value.trim();
        if (message.length === 0) return;
        
        const timestamp = this.getTimestamp();
        const messageData = {
            username: this.username,
            text: message,
            timestamp: timestamp,
            isOwn: true
        };
        
        this.addMessageToChat(messageData);
        this.chatHistory.push(messageData);
        this.saveChatHistory();
        
        this.chatInput.value = '';
        
        this.broadcastToLocalStorage(messageData);
    }
    
    addMessageToChat(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = messageData.isOwn ? 'chat-message own-message' : 'chat-message';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'chat-message-header';
        
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'chat-username';
        usernameSpan.textContent = messageData.username;
        
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'chat-timestamp';
        timestampSpan.textContent = messageData.timestamp;
        
        headerDiv.appendChild(usernameSpan);
        headerDiv.appendChild(timestampSpan);
        
        const textDiv = document.createElement('div');
        textDiv.className = 'chat-message-text';
        textDiv.textContent = messageData.text;
        
        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(textDiv);
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        
        if (this.chatHistory.length > 50) {
            const firstMessage = this.chatMessages.querySelector('.chat-message');
            if (firstMessage) {
                firstMessage.remove();
            }
            this.chatHistory.shift();
        }
    }
    
    getTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    broadcastToLocalStorage(messageData) {
        const broadcastData = {
            ...messageData,
            isOwn: false,
            broadcastId: Date.now() + Math.random()
        };
        localStorage.setItem('chatBroadcast', JSON.stringify(broadcastData));
    }
    
    simulateOtherPlayers() {
        const messages = [
            'Just hit 1000 coins!',
            'Anyone else mining on devnet?',
            'This game is addictive lol',
            'Upgraded to Diamond Miner!',
            'GM everyone!',
            'To the moon! 🚀',
            'Best clicker game ever',
            'Just connected my wallet',
            'How many coins do you have?',
            'Love the blockchain theme'
        ];
        
        setInterval(() => {
            if (Math.random() > 0.7) {
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                const randomUsername = this.generateUsername();
                const messageData = {
                    username: randomUsername,
                    text: randomMessage,
                    timestamp: this.getTimestamp(),
                    isOwn: false
                };
                this.addMessageToChat(messageData);
            }
        }, 15000);
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'chatBroadcast' && e.newValue) {
                try {
                    const messageData = JSON.parse(e.newValue);
                    if (messageData.username !== this.username) {
                        this.addMessageToChat(messageData);
                    }
                } catch (error) {
                    console.log('Chat broadcast error:', error);
                }
            }
        });
    }
    
    saveChatHistory() {
        const recentMessages = this.chatHistory.slice(-20);
        localStorage.setItem('coinMinerChat', JSON.stringify(recentMessages));
    }
    
    loadChatHistory() {
        const savedChat = localStorage.getItem('coinMinerChat');
        if (savedChat) {
            try {
                const messages = JSON.parse(savedChat);
                messages.forEach(msg => {
                    this.addMessageToChat(msg);
                });
                this.chatHistory = messages;
            } catch (error) {
                console.log('Chat history load error:', error);
            }
        }
    }
    
    setupAuthListeners() {
        console.log('[DEBUG] Setting up auth listeners');
        
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const recoverBtn = document.getElementById('recoverBtn');
        const showSignupBtn = document.getElementById('showSignupBtn');
        const showForgotBtn = document.getElementById('showForgotBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const backToLoginBtn2 = document.getElementById('backToLoginBtn2');
        const confirmSeedphraseBtn = document.getElementById('confirmSeedphraseBtn');
        
        loginBtn.addEventListener('click', () => this.handleLogin());
        signupBtn.addEventListener('click', () => this.handleSignup());
        recoverBtn.addEventListener('click', () => this.handleRecover());
        confirmSeedphraseBtn.addEventListener('click', () => this.confirmSeedphrase());
        
        showSignupBtn.addEventListener('click', () => this.showSignupForm());
        showForgotBtn.addEventListener('click', () => this.showForgotForm());
        backToLoginBtn.addEventListener('click', () => this.showLoginForm());
        backToLoginBtn2.addEventListener('click', () => this.showLoginForm());
    }
    
    showLoginForm() {
        console.log('[DEBUG] Showing login form');
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('forgotForm').classList.add('hidden');
        document.getElementById('seedphraseDisplay').classList.add('hidden');
        this.hideAuthMessage();
    }
    
    showSignupForm() {
        console.log('[DEBUG] Showing signup form');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.remove('hidden');
        document.getElementById('forgotForm').classList.add('hidden');
        document.getElementById('seedphraseDisplay').classList.add('hidden');
        this.hideAuthMessage();
    }
    
    showForgotForm() {
        console.log('[DEBUG] Showing forgot password form');
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('forgotForm').classList.remove('hidden');
        document.getElementById('seedphraseDisplay').classList.add('hidden');
        this.hideAuthMessage();
    }
    
    async handleLogin() {
        console.log('[DEBUG] Login attempt');
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!username || !password) {
            this.showAuthMessage('Please enter username and password', 'error');
            return;
        }
        
        try {
            const result = await this.authManager.signIn(username, password);
            console.log('[DEBUG] Login successful');
            this.currentUser = result.user;
            this.showGame();
        } catch (error) {
            console.error('[ERROR] Login failed:', error);
            this.showAuthMessage('Login failed. Check your credentials.', 'error');
        }
    }
    
    async handleSignup() {
        console.log('[DEBUG] Signup attempt');
        const username = document.getElementById('signupUsername').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;
        
        if (!username || !password || !confirmPassword) {
            this.showAuthMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showAuthMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showAuthMessage('Passwords do not match', 'error');
            return;
        }
        
        try {
            const result = await this.authManager.signUp(username, password);
            console.log('[DEBUG] Signup successful');
            this.currentUser = result.user;
            this.userSeedphrase = result.seedphrase;
            
            this.displaySeedphrase(result.seedphrase);
        } catch (error) {
            console.error('[ERROR] Signup failed:', error);
            let errorMessage = 'Signup failed. ';
            
            if (error.message) {
                errorMessage += error.message;
            } else if (error.code === '23505') {
                errorMessage += 'Username already exists.';
            } else {
                errorMessage += 'Please try again.';
            }
            
            this.showAuthMessage(errorMessage, 'error');
        }
    }
    
    displaySeedphrase(seedphrase) {
        console.log('[DEBUG] Displaying seedphrase');
        document.getElementById('signupForm').classList.add('hidden');
        document.getElementById('seedphraseDisplay').classList.remove('hidden');
        
        const words = seedphrase.split(' ');
        const seedphraseDisplay = document.getElementById('seedphraseWords');
        seedphraseDisplay.innerHTML = '';
        
        words.forEach((word, index) => {
            const wordDiv = document.createElement('div');
            wordDiv.textContent = `${index + 1}. ${word}`;
            seedphraseDisplay.appendChild(wordDiv);
        });
        
        // Add copy button functionality
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copySeedphraseBtn';
        copyBtn.className = 'pixel-btn secondary-btn copy-btn';
        copyBtn.textContent = 'COPY SEEDPHRASE';
        copyBtn.style.marginTop = '15px';
        copyBtn.style.marginRight = '10px';
        
        // Insert copy button before the confirm button
        const confirmBtn = document.getElementById('confirmSeedphraseBtn');
        confirmBtn.parentNode.insertBefore(copyBtn, confirmBtn);
        
        copyBtn.addEventListener('click', () => this.copySeedphrase(seedphrase));
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
    
    async handleRecover() {
        console.log('[DEBUG] Password recovery attempt');
        const username = document.getElementById('forgotUsername').value.trim();
        const seedphrase = document.getElementById('forgotSeedphrase').value.trim();
        const newPassword = document.getElementById('forgotNewPassword').value;
        const confirmPassword = document.getElementById('forgotNewPasswordConfirm').value;
        
        if (!username || !seedphrase || !newPassword || !confirmPassword) {
            this.showAuthMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            this.showAuthMessage('Passwords do not match', 'error');
            return;
        }
        
        try {
            const result = await this.authManager.recoverPassword(username, seedphrase, newPassword);
            console.log('[DEBUG] Recovery verification successful');
            this.showAuthMessage('Seedphrase verified! Contact support to complete password reset.', 'success');
        } catch (error) {
            console.error('[ERROR] Recovery failed:', error);
            this.showAuthMessage('Recovery failed. Check username and seedphrase.', 'error');
        }
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
            localStorage.removeItem('coinMinerChat');
            
            window.location.reload();
        } catch (error) {
            console.error('[ERROR] Logout failed:', error);
        }
    }
    
    showWithdrawModal() {
        console.log('[DEBUG] Opening withdraw modal');
        const withdrawModal = document.getElementById('withdrawModal');
        withdrawModal.classList.remove('hidden');
        
        if (this.currentUser) {
            this.loadUserStats().then(() => {
                const balance = document.getElementById('statBalance').textContent;
                document.getElementById('withdrawBalance').textContent = balance;
            });
        }
        
        const confirmBtn = document.getElementById('confirmWithdrawBtn');
        const cancelBtn = document.getElementById('cancelWithdrawBtn');
        
        confirmBtn.onclick = () => this.handleWithdraw();
        cancelBtn.onclick = () => {
            withdrawModal.classList.add('hidden');
            document.getElementById('withdrawMessage').classList.add('hidden');
        };
    }
    
    async handleWithdraw() {
        console.log('[DEBUG] Withdraw initiated');
        const walletAddress = document.getElementById('withdrawWallet').value.trim();
        const amount = parseInt(document.getElementById('withdrawAmount').value);
        const messageEl = document.getElementById('withdrawMessage');
        
        if (!walletAddress) {
            messageEl.textContent = 'Please enter wallet address';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        if (!this.withdrawalService.validateSolanaAddress(walletAddress)) {
            messageEl.textContent = 'Invalid Phantom wallet address format';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        if (!amount || amount <= 0) {
            messageEl.textContent = 'Please enter valid amount';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        if (amount < 1000) {
            messageEl.textContent = 'Minimum withdrawal is 1,000 tokens';
            messageEl.className = 'auth-message error';
            messageEl.classList.remove('hidden');
            return;
        }
        
        try {
            const result = await this.withdrawalService.createWithdrawalRequest(
                this.currentUser.id,
                amount,
                walletAddress
            );
            
            console.log('[DEBUG] Withdrawal created successfully:', result);
            messageEl.textContent = 'Withdrawal request submitted! Tokens will be sent to your Phantom wallet.';
            messageEl.className = 'auth-message success';
            messageEl.classList.remove('hidden');
            
            await this.loadUserStats();
            
            setTimeout(() => {
                document.getElementById('withdrawModal').classList.add('hidden');
                messageEl.classList.add('hidden');
                document.getElementById('withdrawWallet').value = '';
                document.getElementById('withdrawAmount').value = '';
            }, 3000);
            
        } catch (error) {
            console.error('[ERROR] Withdrawal failed:', error);
            messageEl.textContent = error.message || 'Withdrawal failed. Check your balance.';
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
    
    // Cleanup on page unload/reload to prevent rendering issues
    window.addEventListener('beforeunload', () => {
        if (game.cube3D) {
            game.cube3D.forceClear();
        }
    });
});
