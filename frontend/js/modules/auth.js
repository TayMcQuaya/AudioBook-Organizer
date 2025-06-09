/**
 * Authentication Module for AudioBook Organizer
 * Handles Supabase authentication, user session management, and API calls
 */

import { showError, showSuccess, showInfo } from './notifications.js';

// Supabase client (will be initialized dynamically)
let supabaseClient = null;
let authConfig = null;

// Authentication state
let currentUser = null;
let authToken = null;
let isInitialized = false;

// Event listeners for auth state changes
const authListeners = new Set();

/**
 * Authentication Module Class
 */
export class AuthModule {
    constructor() {
        this.user = null;
        this.session = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize the authentication module
     */
    async init() {
        if (isInitialized) return;

        console.log('🔐 Initializing authentication module...');
        
        try {
            // Load authentication configuration from backend
            await this.loadAuthConfig();
            
            // Initialize Supabase client if configured
            if (authConfig && authConfig.supabase_url && authConfig.supabase_anon_key) {
                await this.initSupabaseClient();
                
                // Only proceed with session/listener setup if Supabase initialized successfully
                if (supabaseClient) {
                    // Check for existing session
                    await this.checkExistingSession();
                    
                    // Set up auth state listener
                    this.setupAuthListener();
                } else {
                    console.warn('⚠️ Supabase failed to initialize - forms will work for validation only');
                }
            } else {
                console.warn('⚠️ Authentication not configured - running in demo mode');
            }
            
            isInitialized = true;
            console.log('✅ Authentication module initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize authentication:', error);
            // Continue without auth in case of configuration issues
            isInitialized = true;
        }
    }

    /**
     * Load authentication configuration from backend
     */
    async loadAuthConfig() {
        try {
            const response = await fetch('/api/auth/config');
            const data = await response.json();
            
            if (data.success && data.config) {
                authConfig = data.config;
                console.log('✅ Authentication config loaded');
            } else {
                console.warn('⚠️ No authentication config available');
                authConfig = null;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load auth config:', error);
            authConfig = null;
        }
    }

    /**
     * Initialize Supabase client
     */
    async initSupabaseClient() {
        if (!authConfig || !authConfig.supabase_url || !authConfig.supabase_anon_key) {
            throw new Error('Supabase configuration incomplete');
        }

        try {
            // Try multiple CDNs for Supabase
            let createClient;
            
            try {
                // Try jsdelivr first
                const supabaseModule = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
                createClient = supabaseModule.createClient;
                console.log('✅ Loaded Supabase from jsdelivr');
            } catch (e1) {
                try {
                    // Fallback to unpkg
                    const supabaseModule = await import('https://unpkg.com/@supabase/supabase-js@2/dist/module/index.js');
                    createClient = supabaseModule.createClient;
                    console.log('✅ Loaded Supabase from unpkg');
                } catch (e2) {
                    // Final fallback to skypack
                    const supabaseModule = await import('https://cdn.skypack.dev/@supabase/supabase-js@2');
                    createClient = supabaseModule.createClient;
                    console.log('✅ Loaded Supabase from skypack');
                }
            }
            
            supabaseClient = createClient(
                authConfig.supabase_url,
                authConfig.supabase_anon_key,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );
            
            console.log('✅ Supabase client initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Supabase client:', error);
            console.warn('⚠️ Running without Supabase - forms will show validation only');
            // Don't throw error, allow app to continue without Supabase
        }
    }

    /**
     * Check for existing authentication session
     */
    async checkExistingSession() {
        if (!supabaseClient) return;

        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('Error getting session:', error);
                return;
            }

            if (session) {
                await this.handleAuthSuccess(session);
                console.log('✅ Existing session found and restored');
            } else {
                console.log('ℹ️ No existing session found');
            }
        } catch (error) {
            console.error('Error checking existing session:', error);
        }
    }

    /**
     * Set up authentication state listener
     */
    setupAuthListener() {
        if (!supabaseClient) return;

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state changed:', event);
            
            switch (event) {
                case 'SIGNED_IN':
                    await this.handleAuthSuccess(session);
                    break;
                case 'SIGNED_OUT':
                    await this.handleSignOut();
                    break;
                case 'TOKEN_REFRESHED':
                    await this.handleTokenRefresh(session);
                    break;
                case 'USER_UPDATED':
                    await this.handleUserUpdate(session);
                    break;
            }
            
            // Notify all listeners
            this.notifyAuthListeners(event, session);
        });
    }

    /**
     * Handle successful authentication
     */
    async handleAuthSuccess(session) {
        if (!session || !session.user) {
            console.error('Invalid session provided');
            return;
        }

        this.session = session;
        this.user = session.user;
        currentUser = session.user;
        authToken = session.access_token;

        // Store token in localStorage for API calls
        localStorage.setItem('auth_token', authToken);
        
        try {
            // Initialize user profile and credits if this is a new user
            await this.initializeUser();
            
            console.log('✅ User authenticated:', this.user.email);
            showSuccess(`Welcome back, ${this.user.email}!`);
            
        } catch (error) {
            console.error('Error during user initialization:', error);
            showError('Authentication successful, but failed to load user data');
        }
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        this.session = null;
        this.user = null;
        currentUser = null;
        authToken = null;

        // Clear stored token
        localStorage.removeItem('auth_token');
        
        console.log('👋 User signed out');
        showInfo('You have been signed out');
    }

    /**
     * Handle token refresh
     */
    async handleTokenRefresh(session) {
        if (session && session.access_token) {
            authToken = session.access_token;
            localStorage.setItem('auth_token', authToken);
            console.log('🔄 Auth token refreshed');
        }
    }

    /**
     * Handle user update
     */
    async handleUserUpdate(session) {
        if (session && session.user) {
            this.user = session.user;
            currentUser = session.user;
            console.log('👤 User data updated');
        }
    }

    /**
     * Initialize user profile and credits
     */
    async initializeUser() {
        if (!authToken) return;

        try {
            const response = await fetch('/api/auth/initialize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                if (data.is_new_user) {
                    showSuccess(`Welcome! You've been granted ${data.credits} credits to get started.`);
                }
                console.log('✅ User initialized:', data);
            } else {
                console.error('Failed to initialize user:', data);
            }
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available - simulating validation only');
            showError('Authentication service is not available. This is a demo environment.');
            throw new Error('Authentication not configured');
        }

        this.isLoading = true;
        
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                throw error;
            }

            console.log('✅ Sign in successful');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ Sign in failed:', error);
            showError(error.message || 'Sign in failed');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Sign up with email and password
     */
    async signUp(email, password, options = {}) {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase not available - simulating validation only');
            showError('Authentication service is not available. This is a demo environment.');
            throw new Error('Authentication not configured');
        }

        this.isLoading = true;
        
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: options.metadata || {}
                }
            });

            if (error) {
                throw error;
            }

            if (data.user && !data.user.email_confirmed_at) {
                showInfo('Please check your email and click the confirmation link to complete registration');
            }

            console.log('✅ Sign up successful');
            return { success: true, data };
            
        } catch (error) {
            console.error('❌ Sign up failed:', error);
            showError(error.message || 'Sign up failed');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Sign out current user
     */
    async signOut() {
        if (!supabaseClient) {
            // Handle local sign out if Supabase not configured
            await this.handleSignOut();
            return;
        }

        this.isLoading = true;
        
        try {
            const { error } = await supabaseClient.auth.signOut();
            
            if (error) {
                throw error;
            }

            console.log('✅ Sign out successful');
            
        } catch (error) {
            console.error('❌ Sign out failed:', error);
            showError(error.message || 'Sign out failed');
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Reset password
     */
    async resetPassword(email) {
        if (!supabaseClient) {
            throw new Error('Authentication not configured');
        }

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: `${window.location.origin}/auth/reset-password`
                }
            );

            if (error) {
                throw error;
            }

            showSuccess('Password reset email sent! Please check your inbox.');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Password reset failed:', error);
            showError(error.message || 'Password reset failed');
            throw error;
        }
    }

    /**
     * Get current user information
     */
    getCurrentUser() {
        return currentUser;
    }

    /**
     * Get current auth token
     */
    getAuthToken() {
        return authToken || localStorage.getItem('auth_token');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!currentUser;
    }

    /**
     * Check authentication status from backend
     */
    async checkAuthStatus() {
        try {
            const token = this.getAuthToken();
            
            const response = await fetch('/api/auth/status', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            const data = await response.json();
            
            if (data.authenticated && data.user) {
                currentUser = data.user;
                return data.user;
            } else {
                currentUser = null;
                return null;
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
            return null;
        }
    }

    /**
     * Get user credits
     */
    async getUserCredits() {
        if (!this.isAuthenticated()) {
            return 0;
        }

        try {
            const response = await fetch('/api/auth/credits', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                return data.credits;
            }
            
            return 0;
        } catch (error) {
            console.error('Error fetching credits:', error);
            return 0;
        }
    }

    /**
     * Add authentication state listener
     */
    addAuthListener(callback) {
        authListeners.add(callback);
    }

    /**
     * Remove authentication state listener
     */
    removeAuthListener(callback) {
        authListeners.delete(callback);
    }

    /**
     * Notify all authentication listeners
     */
    notifyAuthListeners(event, session) {
        authListeners.forEach(callback => {
            try {
                callback(event, session, currentUser);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        const token = this.getAuthToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(endpoint, mergedOptions);
            
            // Handle authentication errors
            if (response.status === 401) {
                console.warn('Authentication token expired or invalid');
                await this.signOut();
                throw new Error('Authentication required');
            }
            
            return response;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
}

// Create global auth instance
const auth = new AuthModule();

// Export auth instance and helper functions
export { auth };
export const {
    init: initAuth,
    signIn,
    signUp,
    signOut,
    resetPassword,
    getCurrentUser,
    getAuthToken,
    isAuthenticated,
    checkAuthStatus,
    getUserCredits,
    addAuthListener,
    removeAuthListener,
    apiRequest
} = auth; 