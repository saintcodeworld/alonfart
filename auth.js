// Authentication module with BIP39 seedphrase and Solana wallet generation
// DEBUG: Auth operations - register generates wallet, login uses seed phrase only

import { getSupabaseClient } from './supabase-config.js';

// BIP39 word list (2048 words standard - using extended list for better security)
const BIP39_WORDLIST = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
    'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
    'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
    'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
    'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
    'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
    'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
    'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
    'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
    'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
    'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
    'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
    'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
    'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
    'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
    'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
    'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
    'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
    'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
    'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
    'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
    'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call',
    'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas',
    'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry',
    'cart', 'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category',
    'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century',
    'cereal', 'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase',
    'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child',
    'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle',
    'citizen', 'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk',
    'clever', 'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog', 'close',
    'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut',
    'code', 'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort',
    'comic', 'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control',
    'convince', 'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost',
    'cotton', 'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle',
    'craft', 'cram', 'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek',
    'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial',
    'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup',
    'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad',
    'damage', 'damp', 'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal',
    'debate', 'debris', 'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense',
    'define', 'defy', 'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny'
];

// DEBUG: Base58 encoding/decoding utilities for Solana keys
const BS58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58ToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        let carry = BS58_ALPHABET.indexOf(str[i]);
        if (carry < 0) throw new Error('Invalid base58 character');
        for (let j = 0; j < bytes.length; j++) {
            carry += bytes[j] * 58;
            bytes[j] = carry & 0xff;
            carry >>= 8;
        }
        while (carry > 0) {
            bytes.push(carry & 0xff);
            carry >>= 8;
        }
    }
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        bytes.push(0);
    }
    return new Uint8Array(bytes.reverse());
}

function bytesToBase58(bytes) {
    const digits = [0];
    for (let i = 0; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = 0; j < digits.length; j++) {
            carry += digits[j] << 8;
            digits[j] = carry % 58;
            carry = (carry / 58) | 0;
        }
        while (carry > 0) {
            digits.push(carry % 58);
            carry = (carry / 58) | 0;
        }
    }
    let str = '';
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
        str += '1';
    }
    for (let i = digits.length - 1; i >= 0; i--) {
        str += BS58_ALPHABET[digits[i]];
    }
    return str;
}

export class AuthManager {
    constructor() {
        this.supabase = getSupabaseClient();
        this.currentUser = null;
        console.log('[DEBUG] AuthManager initialized');
    }

    // Generate BIP39 12-word seedphrase
    generateSeedphrase() {
        console.log('[DEBUG] Generating BIP39 12-word seedphrase');
        const words = [];
        
        for (let i = 0; i < 12; i++) {
            const randomIndex = Math.floor(Math.random() * BIP39_WORDLIST.length);
            words.push(BIP39_WORDLIST[randomIndex]);
        }
        
        const seedphrase = words.join(' ');
        console.log('[DEBUG] Seedphrase generated successfully');
        return seedphrase;
    }

    // Hash seedphrase for secure storage
    async hashSeedphrase(seedphrase) {
        console.log('[DEBUG] Hashing seedphrase for secure storage');
        const encoder = new TextEncoder();
        const data = encoder.encode(seedphrase);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Encrypt seedphrase for secure storage in database
    async encryptSeedphrase(seedphrase, userId) {
        console.log('[DEBUG] Encrypting seedphrase for storage');
        const encoder = new TextEncoder();
        const data = encoder.encode(seedphrase);
        
        // Use userId as part of the encryption key for user-specific encryption
        const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(userId));
        const key = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        );
        
        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt the data
        const encryptedBuffer = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        // Combine IV and encrypted data
        const encryptedArray = new Uint8Array(encryptedBuffer);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv);
        combined.set(encryptedArray, iv.length);
        
        // Convert to base64 for storage
        return btoa(String.fromCharCode(...combined));
    }

    // Decrypt seedphrase from database
    async decryptSeedphrase(encryptedData, userId) {
        console.log('[DEBUG] Decrypting seedphrase');
        const encoder = new TextEncoder();
        
        // Convert from base64
        const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        // Extract IV and encrypted data
        const iv = combined.slice(0, 12);
        const encryptedArray = combined.slice(12);
        
        // Derive key from userId
        const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(userId));
        const key = await crypto.subtle.importKey(
            'raw',
            keyMaterial,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        );
        
        // Decrypt the data
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encryptedArray
        );
        
        // Convert back to string
        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
    }

    // Validate seedphrase format
    validateSeedphrase(seedphrase) {
        console.log('[DEBUG] Validating seedphrase format');
        
        if (!seedphrase || typeof seedphrase !== 'string') {
            console.log('[DEBUG] Invalid seedphrase: not a string');
            return false;
        }
        
        const words = seedphrase.trim().toLowerCase().split(/\s+/);
        
        if (words.length !== 12) {
            console.log('[DEBUG] Invalid seedphrase: must be 12 words');
            return false;
        }
        
        const allWordsValid = words.every(word => BIP39_WORDLIST.includes(word));
        
        if (!allWordsValid) {
            console.log('[DEBUG] Invalid seedphrase: contains invalid words');
            return false;
        }
        
        console.log('[DEBUG] Seedphrase validation passed');
        return true;
    }

    // DEBUG: Generate Solana keypair from seed phrase
    async generateWalletFromSeed(seedphrase) {
        console.log('[DEBUG] Generating Solana wallet from seed phrase');
        
        if (!window.solanaWeb3) {
            throw new Error('Solana Web3.js not loaded');
        }
        
        // Hash the seed phrase to get deterministic bytes for keypair
        const encoder = new TextEncoder();
        const data = encoder.encode(seedphrase);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const seed = new Uint8Array(hashBuffer);
        
        // Generate keypair from seed
        const keypair = window.solanaWeb3.Keypair.fromSeed(seed);
        
        // Get public key (wallet address) and private key
        const publicKey = keypair.publicKey.toString();
        const privateKey = bytesToBase58(keypair.secretKey);
        
        console.log('[DEBUG] Wallet generated - Public Key:', publicKey.substring(0, 8) + '...');
        
        return {
            publicKey: publicKey,
            privateKey: privateKey,
            keypair: keypair
        };
    }

    // Sign up new user - generates seed phrase and wallet automatically
    // DEBUG: No username/password required - seed phrase is the only auth method
    async signUp() {
        console.log('[DEBUG] Starting sign up process - generating new account');
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // Generate unique seedphrase
            const seedphrase = this.generateSeedphrase();
            const seedphraseHash = await this.hashSeedphrase(seedphrase);
            
            // Generate Solana wallet from seed phrase
            const wallet = await this.generateWalletFromSeed(seedphrase);
            
            // Use wallet public key as username (first 8 chars + last 4 chars)
            const username = wallet.publicKey.substring(0, 8) + '...' + wallet.publicKey.substring(wallet.publicKey.length - 4);
            
            // Create email from wallet address (Supabase requires email)
            const email = `${wallet.publicKey}@coinminer.app`;
            
            // Generate a random password (not used for login, but required by Supabase)
            const randomPassword = seedphraseHash.substring(0, 32);

            console.log('[DEBUG] Creating Supabase auth user with wallet:', wallet.publicKey.substring(0, 8) + '...');
            
            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: randomPassword,
                options: {
                    data: {
                        username: username,
                        wallet_address: wallet.publicKey
                    }
                }
            });

            if (authError) {
                console.error('[ERROR] Supabase auth signup failed:', authError);
                throw authError;
            }

            // Encrypt seedphrase for storage
            console.log('[DEBUG] Encrypting seedphrase for storage');
            const encryptedSeedphrase = await this.encryptSeedphrase(seedphrase, authData.user.id);
            
            // Insert user profile data
            console.log('[DEBUG] Creating user profile in database');
            const { data: profileData, error: profileError } = await this.supabase
                .from('users')
                .insert(
                    {
                        id: authData.user.id,
                        username: username,
                        seedphrase_hash: seedphraseHash,
                        wallet_address: wallet.publicKey,
                        private_key: wallet.privateKey,
                        encrypted_seedphrase: encryptedSeedphrase,
                        total_earned: 0,
                        total_withdrawn: 0,
                        current_balance: 0
                    }
                )
                .select()
                .single();

            if (profileError) {
                console.error('[ERROR] Failed to create user profile:', profileError);
                throw profileError;
            }

            console.log('[DEBUG] Sign up successful - wallet created');
            this.currentUser = profileData;

            return {
                success: true,
                seedphrase: seedphrase,
                wallet: wallet,
                user: profileData
            };

        } catch (error) {
            console.error('[ERROR] Sign up failed:', error);
            throw error;
        }
    }

    // Sign in existing user using seed phrase only
    // DEBUG: No password needed - seed phrase authenticates and derives wallet
    async signIn(seedphrase) {
        console.log('[DEBUG] Starting sign in process with seed phrase');
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // Validate seed phrase format
            if (!this.validateSeedphrase(seedphrase)) {
                throw new Error('Invalid seed phrase format. Must be 12 words.');
            }
            
            // Hash the seed phrase to find the user
            const seedphraseHash = await this.hashSeedphrase(seedphrase);
            
            // Derive wallet from seed phrase
            const wallet = await this.generateWalletFromSeed(seedphrase);
            
            console.log('[DEBUG] Looking up user by seed phrase hash');
            
            // Find user by seedphrase hash
            const { data: userData, error: userError } = await this.supabase
                .from('users')
                .select('*')
                .eq('seedphrase_hash', seedphraseHash)
                .single();

            if (userError || !userData) {
                console.error('[ERROR] User not found with this seed phrase');
                throw new Error('Invalid seed phrase. No account found.');
            }
            
            // Verify wallet matches (extra security check)
            if (userData.wallet_address !== wallet.publicKey) {
                console.error('[ERROR] Wallet address mismatch - possible data corruption');
                throw new Error('Wallet verification failed.');
            }

            // Sign in with Supabase Auth using the derived credentials
            const email = `${userData.wallet_address}@coinminer.app`;
            const password = seedphraseHash.substring(0, 32);
            
            console.log('[DEBUG] Authenticating with Supabase');
            
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                console.error('[ERROR] Supabase auth failed:', authError);
                throw new Error('Authentication failed. Please try again.');
            }

            console.log('[DEBUG] Sign in successful');
            this.currentUser = userData;

            return {
                success: true,
                user: userData,
                wallet: wallet
            };

        } catch (error) {
            console.error('[ERROR] Sign in failed:', error);
            throw error;
        }
    }

    // Get wallet info for user (for displaying private key in profile)
    // DEBUG: Returns wallet details for the current user
    async getWalletInfo(userId) {
        console.log('[DEBUG] Fetching wallet info for user:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('wallet_address, private_key, encrypted_seedphrase')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[ERROR] Failed to fetch wallet info:', error);
                throw error;
            }

            console.log('[DEBUG] Wallet info retrieved successfully');
            return data;

        } catch (error) {
            console.error('[ERROR] Wallet info fetch failed:', error);
            throw error;
        }
    }

    // Get decrypted seedphrase for user
    // DEBUG: Returns the decrypted 12-word seed phrase
    async getSeedphrase(userId) {
        console.log('[DEBUG] Fetching and decrypting seedphrase for user:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('encrypted_seedphrase')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[ERROR] Failed to fetch encrypted seedphrase:', error);
                throw error;
            }

            if (!data.encrypted_seedphrase) {
                throw new Error('No seedphrase found for this user');
            }

            // Decrypt the seedphrase
            const seedphrase = await this.decryptSeedphrase(data.encrypted_seedphrase, userId);
            console.log('[DEBUG] Seedphrase decrypted successfully');
            return seedphrase;

        } catch (error) {
            console.error('[ERROR] Seedphrase fetch/decrypt failed:', error);
            throw error;
        }
    }

    // Sign out
    async signOut() {
        console.log('[DEBUG] Signing out user');
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('[ERROR] Sign out failed:', error);
                throw error;
            }

            this.currentUser = null;
            console.log('[DEBUG] Sign out successful');
            
            return { success: true };

        } catch (error) {
            console.error('[ERROR] Sign out failed:', error);
            throw error;
        }
    }

    // Get current session
    async getCurrentSession() {
        console.log('[DEBUG] Getting current session');
        
        if (!this.supabase) {
            return null;
        }

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('[ERROR] Session fetch failed:', error);
                return null;
            }

            if (session) {
                console.log('[DEBUG] Active session found');
                // Fetch user profile
                const { data: profileData } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                this.currentUser = profileData;
                return profileData;
            }

            console.log('[DEBUG] No active session');
            return null;

        } catch (error) {
            console.error('[ERROR] Session check failed:', error);
            return null;
        }
    }

    // Update user token balance
    async updateTokenBalance(userId, tokensEarned) {
        console.log('[DEBUG] Updating token balance for user:', userId, 'tokens:', tokensEarned);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .rpc('add_tokens', {
                    user_id: userId,
                    tokens: tokensEarned
                });

            if (error) {
                console.error('[ERROR] Token balance update failed:', error);
                throw error;
            }

            console.log('[DEBUG] Token balance updated successfully');
            return data;

        } catch (error) {
            console.error('[ERROR] Token balance update failed:', error);
            throw error;
        }
    }

    // Get user stats (including wallet info)
    async getUserStats(userId) {
        console.log('[DEBUG] Fetching user stats for:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('username, total_earned, total_withdrawn, current_balance, wallet_address')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[ERROR] Stats fetch failed:', error);
                throw error;
            }

            console.log('[DEBUG] Stats fetched successfully');
            return data;

        } catch (error) {
            console.error('[ERROR] Stats fetch failed:', error);
            throw error;
        }
    }
}
