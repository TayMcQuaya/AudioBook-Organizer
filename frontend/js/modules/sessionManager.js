/**
 * Session Manager Module
 * Handles authentication state across all pages and manages UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';
import { supabaseClient } from './auth.js';

class SessionManager {
    constructor() {
        // Core state
        this.user = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        this.isPasswordRecovery = false; // Flag for password recovery state
        this.hasBeenAuthenticated = false; // Track if user was ever authenticated in this session
        
        // Operational flags
        this.isCheckingAuth = false;
        this.lastAuthCheck = 0;
        this.MIN_AUTH_CHECK_INTERVAL = 5000; // 5 seconds between auth checks
        this.lastEventProcessed = null; // Track last auth event to prevent duplicates
        this.lastEventTime = 0; // Track timing of last event
        
        // Event handling
        this.listeners = new Set();
        this.boundHandleVisibilityChange = this.handleVisibilityChange.bind(this);
        this.boundHandleStorageChange = this.handleStorageChange.bind(this);
    }

    /**
     * Initialize session manager
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔒 Initializing session manager...');
        
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        // Check for password recovery state ONCE on initialization
        if (window.location.hash.includes('type=recovery')) {
            this.isPasswordRecovery = true;
        }

        console.log('✅ Session manager initialized');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Auth state changes
        window.addEventListener('auth-state-changed', event => {
            const { isAuthenticated, user, session } = event.detail;
            this.handleAuthStateChange(isAuthenticated, user, session);
        });

        // Storage changes (logout from other tabs)
        window.addEventListener('storage', this.boundHandleStorageChange);

        // Page visibility changes
        document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
    }

    /**
     * Handle page visibility changes
     */
    handleVisibilityChange() {
        if (!document.hidden && this.isInitialized && this.isAuthenticated) {
            const now = Date.now();
            if (now - this.lastAuthCheck > this.MIN_AUTH_CHECK_INTERVAL) {
                this.checkAuthStatus();
            }
        }
    }

    /**
     * Handle storage changes
     */
    handleStorageChange(event) {
        // Only handle logout if there was a previous value (actual logout from another tab)
        if (event.key === 'auth_token' && !event.newValue && event.oldValue) {
            this.handleSignOut();
        }
    }

    /**
     * Clean up invalid tokens from localStorage
     */
    cleanupInvalidTokens() {
        const authToken = localStorage.getItem('auth_token');
        if (authToken && !this.isValidJWT(authToken)) {
            console.log('🧹 Cleaning up invalid token');
            localStorage.removeItem('auth_token');
        }
    }

    /**
     * Validate JWT token format
     */
    isValidJWT(token) {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('🚫 Invalid JWT format - wrong number of segments');
            return false;
        }
        
        const base64Pattern = /^[A-Za-z0-9_-]+$/;
        return parts.every(part => base64Pattern.test(part));
    }

    /**
     * Check current authentication status
     */
    async checkAuthStatus() {
        if (this.isCheckingAuth) {
            console.log('⏳ Auth check in progress, skipping');
            return;
        }
        
        const now = Date.now();
        if (now - this.lastAuthCheck < this.MIN_AUTH_CHECK_INTERVAL) {
            console.log('⏳ Auth check too frequent, skipping');
            return;
        }
        
        this.isCheckingAuth = true;
        this.lastAuthCheck = now;
        
        try {
            // First check auth module
            if (window.authModule?.isAuthenticated()) {
                this.user = window.authModule.getCurrentUser();
                this.isAuthenticated = true;
                return;
            }

            // Then check token
                const authToken = localStorage.getItem('auth_token');
            if (!authToken || !this.isValidJWT(authToken)) {
                this.setUnauthenticated();
                return;
            }

            // Verify with backend
                            const response = await fetch('/api/auth/status', {
                                headers: { 
                                    'Authorization': `Bearer ${authToken}`,
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            if (response.ok) {
                                const data = await response.json();
                                if (data.authenticated && data.user) {
                                    this.user = data.user;
                                    this.isAuthenticated = true;
                } else {
                    this.setUnauthenticated();
                }
            } else {
                this.setUnauthenticated();
            }
        } catch (error) {
            console.error('❌ Auth check error:', error);
            // Don't clear token on network errors
            this.isAuthenticated = false;
            this.user = null;
        } finally {
            this.isCheckingAuth = false;
            this.notifyStateChange();
        }
    }

    /**
     * Set unauthenticated state and clean up
     */
    setUnauthenticated() {
        localStorage.removeItem('auth_token');
        this.isAuthenticated = false;
        this.user = null;
    }

    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(isAuthenticated, user, session) {
        const now = Date.now();
        const userId = user?.id;
        const eventKey = `${isAuthenticated}_${userId}`;
        
        // Prevent duplicate events in quick succession (within 1 second)
        if (this.lastEventProcessed === eventKey && (now - this.lastEventTime) < 1000) {
            console.log('🔄 Session manager ignoring duplicate auth state change');
            return;
        }
        
        this.lastEventProcessed = eventKey;
        this.lastEventTime = now;
        
        console.log('🔄 Session manager received auth state changed:', isAuthenticated ? `Signed in as ${user?.email}` : 'Signed out');
        
        // Track if user becomes authenticated
        if (isAuthenticated && !this.isAuthenticated) {
            this.hasBeenAuthenticated = true;
        }
        
        // If we are in password recovery, route as unauthenticated.
        if (this.isPasswordRecovery) {
            this.isAuthenticated = false;
        } else {
            this.isAuthenticated = isAuthenticated;
        }
        
        this.user = user;
        
        if (isAuthenticated && session?.token && this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
        } else if (!isAuthenticated) {
            localStorage.removeItem('auth_token');
        }
        
        console.log(`Session state updated. Auth: ${this.isAuthenticated}, Recovery: ${this.isPasswordRecovery}`);
        
        this.notifyStateChange();
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        const wasAuthenticated = this.isAuthenticated;
        this.setUnauthenticated();
        
        if (window.authModule?.signOut) {
            await window.authModule.signOut();
        }
        
        // Only show logout message if user was previously authenticated in this session
        if (wasAuthenticated && this.hasBeenAuthenticated) {
            showInfo('You have been signed out');
        }
        
        if (window.router && ['/app', '/profile'].includes(window.location.pathname)) {
            window.router.navigate('/');
        }
        
        this.notifyStateChange();
    }

    /**
     * Get user display name
     */
    getUserDisplayName() {
        if (!this.user) return 'User';
        
        return this.user.user_metadata?.full_name ||
               this.user.user_metadata?.name ||
               this.user.full_name ||
               this.user.name ||
               this.user.email?.split('@')[0] ||
               'User';
    }

    /**
     * Add listener for auth state changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state changes
     */
    notifyStateChange() {
        const state = this.getAuthState();
        this.listeners.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    /**
     * Get current authentication state
     */
    getAuthState() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user
        };
    }

    /**
     * Navigate to app (authenticated users)
     */
    navigateToApp() {
        if (this.isAuthenticated) {
            window.router?.navigate('/app') || (window.location.href = '/app');
        } else {
            showInfo('Please sign in to access the app');
            window.router?.navigate('/auth') || (window.location.href = '/auth');
        }
    }

    /**
     * Sign out the user
     */
    async signOut() {
        await this.handleSignOut();
    }

    /**
     * Explicitly sets the password recovery state.
     * @param {boolean} isRecovery - True if in password recovery mode.
     */
    setPasswordRecovery(isRecovery) {
        this.isPasswordRecovery = isRecovery;
        if (isRecovery) {
            // If we're in recovery mode, we are never considered "authenticated" for routing purposes.
            this.isAuthenticated = false;
        }
        console.log(`Password recovery state set to: ${this.isPasswordRecovery}`);
    }

    /**
     * Clears the password recovery flag after the process is complete.
     */
    clearPasswordRecoveryFlag() {
        this.isPasswordRecovery = false;
        console.log('Password recovery state cleared.');
    }
}

// Create and export singleton instance
const sessionManager = new SessionManager();

// Make it globally available
window.sessionManager = sessionManager;

export default sessionManager; 