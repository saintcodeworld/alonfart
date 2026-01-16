/**
 * Fake Live Chat System
 * Simulates organic chat activity with wallet addresses and bullish $ALON messages
 * DEBUG: This is local-only simulation for engagement
 */

// DEBUG: Configuration for chat timing (medium pace)
const CHAT_CONFIG = {
    minDelay: 2000,      // Minimum delay between messages (2s)
    maxDelay: 6000,      // Maximum delay between messages (6s)
    maxMessages: 50,     // Max messages to keep in chat
    initialBurst: 5,     // Initial messages to show
    burstDelay: 800      // Delay between initial burst messages
};

// DEBUG: Pre-generated fake wallet addresses (base58 Solana-like)
const FAKE_WALLETS = [
    "7xKXt...9mPq", "3nBvR...5kLw", "9pMhY...2xNc", "4dFjS...8vQr",
    "6wRnK...1tHs", "2cGbX...7yMd", "8sLpE...4rWf", "5hNvQ...6jKt",
    "1mXkR...3sPb", "DrWhy...8nLq", "Bz9Kp...2vFm", "Hj4Xt...5wRn",
    "Qm7Ls...1cGb", "Vn2Wd...9hNv", "Yk5Fp...4mXk", "Cr8Jt...6DrW",
    "Fs3Bz...7Hj4", "Lw6Qm...2Vn2", "Pd9Yk...5Cr8", "Rq1Fs...3Lw6",
    "Tn4Pd...8Rq1", "Wm7Tn...4Wm7", "Xb2Aj...9Xb2", "Zc5Ek...1Zc5",
    "Af8Hn...6Af8", "Bi1Kq...3Bi1", "Cj4Mt...7Cj4", "Dk7Nw...2Dk7",
    "Em9Px...5Em9", "Fn2Qz...8Fn2", "Go5Rc...1Go5", "Hp8Se...4Hp8",
    "Iq1Tf...7Iq1", "Jr4Ug...9Jr4", "Ks7Vh...2Ks7", "Lt9Wi...5Lt9",
    "Mu2Xj...8Mu2", "Nv5Yk...1Nv5", "Ow8Zl...4Ow8", "Px1Am...7Px1"
];

// DEBUG: Bullish messages about $ALON - focus on Alon/PumpFun fart jokes (no emojis for bots)
const BULLISH_MESSAGES = [
    // Alon PumpFun fart jokes
    "alon from pumpfun just ripped another one",
    "that fart was MASSIVE lmaooo",
    "alon's gas is more valuable than ETH gas",
    "pumpfun founder farting on the haters",
    "another legendary fart from the pumpfun goat",
    "the gas fees are literally alon's fart gas",
    "alon farting his way to a billion mcap",
    "that fart shook the entire solana network",
    "did yall hear that? LEGENDARY ALON FART",
    "alon's digestive system is a money printer",
    "bro farted and my bags pumped 10x",
    "the fart that launched pumpfun to the top",
    "alon built different with those farts fr fr",
    "sonic boom fart from alon incoming",
    "alon ate beans again, bullish af",
    "pumpfun ceo just crop dusted the entire office",
    "alon's farts smell like success",
    "every alon fart = new ATH",
    "alon farted during the team meeting again",
    "pumpfun headquarters smells like money and farts",
    "alon's morning fart ritual is legendary",
    "the secret to pumpfun success is alon's gas",
    "alon ripped one so hard it crashed the server",
    "pumpfun team had to evacuate after alon's lunch",
    "alon's farts are audible on the blockchain",
    "that wasnt thunder, that was alon farting",
    "alon's protein farts are unstoppable",
    "pumpfun office needs better ventilation lol",
    "alon farted and the price went up again",
    "correlation between alon farts and pumps is real",
    "scientific fact: alon farts = bullish signal",
    "alon's intestines are the real alpha",
    "pumpfun success secret: alon's gas chamber",
    "alon crop dusted the whole dev team",
    "that fart echoed through the pumpfun office",
    "alon's farts have their own gravitational pull",
    "pumpfun employees wear gas masks now",
    "alon farted so hard he broke the sound barrier",
    "the legendary alon fart of 2025",
    
    // Fart-focused hype
    "fart power is real",
    "this is the fart coin to rule them all",
    "never bet against alon's digestive system",
    "the fart heard round the crypto world",
    "fart gang taking over",
    "alon's gas is our gain",
    "bullish on farts",
    "fart economics 101",
    "the great fart revolution",
    "fart-to-earn is the future",
    
    // PumpFun references
    "pumpfun founder is a genius",
    "alon created pumpfun between farts",
    "pumpfun office must smell crazy",
    "alon the pumpfun legend",
    "pumpfun ceo farting on competitors",
    "alon built pumpfun with pure gas power",
    "pumpfun headquarters = fart factory",
    "alon's vision for pumpfun is insane",
    
    // Short reactions (no emojis)
    "bullish",
    "LFG",
    "PUMP IT",
    "HOLD THE LINE",
    "never selling",
    "im so early",
    "based",
    "gm frens",
    "bought more",
    "dip = discount",
    "just aped in",
    "all in on this",
    "fart gang",
    "BRRRRRRRR",
    "WAGMI",
    "iykyk",
    "ser this is THE fart coin",
    "the prophecy is real",
    "alon will save us all",
    "inject this into my veins",
    "cant stop wont stop",
    "we are so back",
    "its over for the bears",
    "cooked in a good way",
    "this is the one fr",
    "generational wealth loading",
    "paperhands gonna regret it",
    "diamond hands only",
    "accumulate while you can",
    "early buyers will be rich",
    "whales loading up rn",
    "smart money knows",
    "bears are so rekt lmaooo"
];

// DEBUG: Chat manager class
class FakeChatManager {
    constructor() {
        this.messages = [];
        this.chatContainer = null;
        this.messagesContainer = null;
        this.chatInput = null;
        this.chatSendBtn = null;
        this.isRunning = false;
        this.userWallet = null;
        console.log('[FakeChat] DEBUG: Manager initialized');
    }

    // DEBUG: Initialize chat UI with optional real user wallet
    init(realUserWallet = null) {
        this.chatContainer = document.getElementById('liveChat');
        this.messagesContainer = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        
        if (!this.chatContainer || !this.messagesContainer) {
            console.error('[FakeChat] DEBUG: Chat containers not found');
            return;
        }

        // DEBUG: Use real user wallet if provided, otherwise generate fake one
        if (realUserWallet) {
            this.userWallet = this.formatWalletAddress(realUserWallet);
            console.log('[FakeChat] DEBUG: Using real user wallet:', this.userWallet);
        } else {
            this.userWallet = this.generateFakeWallet();
            console.log('[FakeChat] DEBUG: Generated fake wallet for user:', this.userWallet);
        }

        // DEBUG: Setup user input handlers
        this.setupUserInput();

        console.log('[FakeChat] DEBUG: Starting fake chat system');
        this.startChat();
    }

    // DEBUG: Format real wallet address to show more characters
    formatWalletAddress(address) {
        if (!address || address.length < 12) {
            return address;
        }
        // Show first 8 and last 6 characters for real wallet
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    }

    // DEBUG: Generate a fake wallet for bots (shorter, less visible)
    generateFakeWallet() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
        const getRandomChars = (length) => {
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        };
        return `${getRandomChars(5)}...${getRandomChars(4)}`;
    }

    // DEBUG: Setup user input handlers
    setupUserInput() {
        if (!this.chatInput || !this.chatSendBtn) {
            console.error('[FakeChat] DEBUG: Input elements not found');
            return;
        }

        // DEBUG: Send button click
        this.chatSendBtn.addEventListener('click', () => this.sendUserMessage());

        // DEBUG: Enter key press
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendUserMessage();
            }
        });

        console.log('[FakeChat] DEBUG: User input handlers setup complete');
    }

    // DEBUG: Send user message
    sendUserMessage() {
        const message = this.chatInput.value.trim();
        
        if (!message) {
            return;
        }

        console.log('[FakeChat] DEBUG: User sending message:', message);

        // DEBUG: Create user message object
        const msgData = {
            wallet: this.userWallet,
            message: message,
            timestamp: new Date(),
            isUser: true
        };

        // DEBUG: Add to chat
        this.addMessage(msgData);

        // DEBUG: Clear input
        this.chatInput.value = '';

        console.log('[FakeChat] DEBUG: User message sent');
    }

    // DEBUG: Get random item from array
    getRandomItem(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // DEBUG: Get random delay between min and max
    getRandomDelay() {
        return Math.random() * (CHAT_CONFIG.maxDelay - CHAT_CONFIG.minDelay) + CHAT_CONFIG.minDelay;
    }

    // DEBUG: Generate a fake chat message
    generateMessage() {
        const wallet = this.getRandomItem(FAKE_WALLETS);
        const message = this.getRandomItem(BULLISH_MESSAGES);
        
        return {
            wallet,
            message,
            timestamp: new Date()
        };
    }

    // DEBUG: Create message DOM element
    createMessageElement(msgData) {
        const msgEl = document.createElement('div');
        msgEl.className = msgData.isUser ? 'chat-message user-message' : 'chat-message';
        
        const walletEl = document.createElement('span');
        walletEl.className = 'chat-wallet';
        walletEl.textContent = msgData.wallet;
        
        const textEl = document.createElement('span');
        textEl.className = 'chat-text';
        textEl.textContent = msgData.message;
        
        msgEl.appendChild(walletEl);
        msgEl.appendChild(textEl);
        
        return msgEl;
    }

    // DEBUG: Add message to chat
    addMessage(msgData) {
        const msgEl = this.createMessageElement(msgData);
        this.messagesContainer.appendChild(msgEl);
        this.messages.push(msgData);

        // DEBUG: Remove old messages if over limit
        if (this.messages.length > CHAT_CONFIG.maxMessages) {
            this.messages.shift();
            if (this.messagesContainer.firstChild) {
                this.messagesContainer.removeChild(this.messagesContainer.firstChild);
            }
        }

        // DEBUG: Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    // DEBUG: Initial burst of messages
    async showInitialBurst() {
        for (let i = 0; i < CHAT_CONFIG.initialBurst; i++) {
            const msgData = this.generateMessage();
            this.addMessage(msgData);
            await this.sleep(CHAT_CONFIG.burstDelay);
        }
    }

    // DEBUG: Sleep helper
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // DEBUG: Main chat loop
    async startChat() {
        if (this.isRunning) return;
        this.isRunning = true;

        // DEBUG: Show initial burst of messages
        await this.showInitialBurst();

        // DEBUG: Continuous message generation
        while (this.isRunning) {
            await this.sleep(this.getRandomDelay());
            const msgData = this.generateMessage();
            this.addMessage(msgData);
        }
    }

    // DEBUG: Stop chat (if needed)
    stopChat() {
        this.isRunning = false;
        console.log('[FakeChat] DEBUG: Chat stopped');
    }
}

// DEBUG: Global instance
const fakeChatManager = new FakeChatManager();

// DEBUG: Export for use
export { fakeChatManager, FakeChatManager };
