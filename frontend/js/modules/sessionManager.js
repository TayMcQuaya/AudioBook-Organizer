/**
 * Session Manager Module
 * Handles authentication state across all pages and manages UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';

class SessionManager {
    constructor() {
        // Core state
        this.user = null;
        this.isAuthenticated = false;
        this.isInitialized = false;
        
        // Operational flags
        this.isCheckingAuth = false;
        this.lastAuthCheck = 0;
        this.MIN_AUTH_CHECK_INTERVAL = 5000; // 5 seconds between auth checks
        
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
        
        // Clean up any invalid tokens
        this.cleanupInvalidTokens();
        
        // Initial auth check
        await this.checkAuthStatus();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.isInitialized = true;
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
        if (event.key === 'auth_token' && !event.newValue) {
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
        console.log('🔄 Auth state changed:', isAuthenticated ? `Signed in as ${user?.email}` : 'Signed out');
        
        this.isAuthenticated = isAuthenticated;
        this.user = user;
        
        if (isAuthenticated && session?.token && this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
        }
        
        this.notifyStateChange();
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        this.setUnauthenticated();
        
        if (window.authModule?.signOut) {
            await window.authModule.signOut();
        }
        
        showInfo('You have been signed out');
        
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
}

// Create and export singleton instance
const sessionManager = new SessionManager();

// Make it globally available
window.sessionManager = sessionManager;

export default sessionManager; 