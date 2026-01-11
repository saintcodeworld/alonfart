// Authentication module with BIP39 seedphrase
// Debug: Auth operations with seedphrase generation and recovery

import { getSupabaseClient } from './supabase-config.js';

// BIP39 word list (first 100 words for compact implementation)
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
    'butter', 'buyer', 'buzz'
];

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

    // Sign up new user
    async signUp(username, password) {
        console.log('[DEBUG] Starting sign up process for username:', username);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // Generate seedphrase
            const seedphrase = this.generateSeedphrase();
            const seedphraseHash = await this.hashSeedphrase(seedphrase);

            // Create email from username (Supabase requires email)
            const email = `${username}@coinminer.app`;

            console.log('[DEBUG] Creating Supabase auth user');
            
            // Sign up with Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        username: username
                    }
                }
            });

            if (authError) {
                console.error('[ERROR] Supabase auth signup failed:', authError);
                throw authError;
            }

            console.log('[DEBUG] Auth user created, creating user profile');

            // Create user profile in database
            const { data: profileData, error: profileError } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: authData.user.id,
                        username: username,
                        seedphrase_hash: seedphraseHash,
                        total_earned: 0,
                        total_withdrawn: 0,
                        current_balance: 0
                    }
                ])
                .select()
                .single();

            if (profileError) {
                console.error('[ERROR] Profile creation failed:', profileError);
                throw profileError;
            }

            console.log('[DEBUG] Sign up successful');
            this.currentUser = profileData;

            return {
                success: true,
                seedphrase: seedphrase,
                user: profileData
            };

        } catch (error) {
            console.error('[ERROR] Sign up failed:', error);
            throw error;
        }
    }

    // Sign in existing user
    async signIn(username, password) {
        console.log('[DEBUG] Starting sign in process for username:', username);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const email = `${username}@coinminer.app`;

            console.log('[DEBUG] Authenticating with Supabase');
            
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) {
                console.error('[ERROR] Authentication failed:', authError);
                throw authError;
            }

            console.log('[DEBUG] Auth successful, fetching user profile');

            // Get user profile
            const { data: profileData, error: profileError } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (profileError) {
                console.error('[ERROR] Profile fetch failed:', profileError);
                throw profileError;
            }

            console.log('[DEBUG] Sign in successful');
            this.currentUser = profileData;

            return {
                success: true,
                user: profileData
            };

        } catch (error) {
            console.error('[ERROR] Sign in failed:', error);
            throw error;
        }
    }

    // Recover password using seedphrase
    async recoverPassword(username, seedphrase, newPassword) {
        console.log('[DEBUG] Starting password recovery for username:', username);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            // Validate seedphrase format
            if (!this.validateSeedphrase(seedphrase)) {
                throw new Error('Invalid seedphrase format');
            }

            const seedphraseHash = await this.hashSeedphrase(seedphrase);

            console.log('[DEBUG] Verifying seedphrase against database');

            // Verify seedphrase matches username
            const { data: userData, error: fetchError } = await this.supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .eq('seedphrase_hash', seedphraseHash)
                .single();

            if (fetchError || !userData) {
                console.error('[ERROR] Seedphrase verification failed');
                throw new Error('Invalid username or seedphrase');
            }

            console.log('[DEBUG] Seedphrase verified, updating password');

            // Update password (requires admin access or workaround)
            // Note: This requires Supabase Admin API or password reset flow
            // For now, we'll return success and handle password update separately
            
            return {
                success: true,
                message: 'Seedphrase verified. Password update requires admin privileges.',
                userId: userData.id
            };

        } catch (error) {
            console.error('[ERROR] Password recovery failed:', error);
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

    // Get user stats
    async getUserStats(userId) {
        console.log('[DEBUG] Fetching user stats for:', userId);
        
        if (!this.supabase) {
            throw new Error('Supabase client not initialized');
        }

        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('username, total_earned, total_withdrawn, current_balance')
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
