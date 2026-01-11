// Supabase configuration
// Debug: Supabase client initialization

export const SUPABASE_CONFIG = {
    url: 'https://lyqrljcmfmhmowktfgrl.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5cXJsamNtZm1obW93a3RmZ3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNzg5ODgsImV4cCI6MjA4MzY1NDk4OH0.x5_DBlARJrKHE3ae4LQp0iukcJvz6LsOEitXLbVaS50'
};

// Initialize Supabase client
let supabaseClient = null;

export function initSupabase() {
    console.log('[DEBUG] Initializing Supabase client');
    
    if (!window.supabase) {
        console.error('[ERROR] Supabase library not loaded');
        return null;
    }
    
    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_CONFIG.url,
            SUPABASE_CONFIG.anonKey
        );
        console.log('[DEBUG] Supabase client initialized successfully');
        return supabaseClient;
    } catch (error) {
        console.error('[ERROR] Failed to initialize Supabase:', error);
        return null;
    }
}

export function getSupabaseClient() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}
