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
        
        // **NEW: Global password recovery state management**
        this.RECOVERY_STORAGE_KEY = 'supabase_password_recovery_active';
        this.RECOVERY_TIMEOUT = 30 * 60 * 1000; // 30 minutes max recovery session
        
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
        this.boundHandleRecoveryStorageChange = this.handleRecoveryStorageChange.bind(this);
    }

    /**
     * Initialize session manager
     */
    async init() {
        if (this.isInitialized) return;
        
        console.log('🔒 Initializing session manager...');
        
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        // **ENHANCED: Check for password recovery state from multiple sources**
        const urlHash = window.location.hash;
        const urlSearch = window.location.search;
        const currentPath = window.location.pathname;
        
        // Check if this is a password recovery scenario
        const isRecoveryFromUrl = urlHash.includes('type=recovery') || 
                                 urlHash.includes('#access_token') && currentPath === '/auth/reset-password' ||
                                 urlSearch.includes('type=recovery') ||
                                 currentPath === '/auth/reset-password';
        
        // **NEW: Check for global recovery state (cross-tab detection)**
        const globalRecoveryState = this.getGlobalRecoveryState();
        const isGlobalRecoveryActive = globalRecoveryState && !this.isRecoveryStateExpired(globalRecoveryState);
        
        if (isRecoveryFromUrl || isGlobalRecoveryActive) {
            console.log('🔑 Password recovery mode detected during initialization', {
                fromUrl: isRecoveryFromUrl,
                fromGlobal: isGlobalRecoveryActive,
                currentTab: currentPath
            });
            
            this.activatePasswordRecovery();
        }

        console.log('✅ Session manager initialized', this.isPasswordRecovery ? '(Password Recovery Mode)' : '');
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
        
        // **NEW: Listen for recovery state changes across tabs**
        window.addEventListener('storage', this.boundHandleRecoveryStorageChange);

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
        
        // **NEW: Security check - detect cross-tab recovery bypass attempts**
        if (isAuthenticated && this.isPasswordRecovery) {
            this.logSecurityEvent('recovery_bypass_attempt', {
                userId: userId,
                path: window.location.pathname,
                event: 'auth_during_recovery'
            });
        }
        
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
        
        // **CRITICAL: If we are in password recovery, ALWAYS force isAuthenticated to false**
        if (this.isPasswordRecovery) {
            console.log('🔑 Password recovery mode active - forcing unauthenticated state');
            this.isAuthenticated = false;
            // Don't store user data during password recovery to prevent confusion
            this.user = null;
        } else {
            this.isAuthenticated = isAuthenticated;
            this.user = user;
        }
        
        // Handle token storage - but DON'T store tokens during password recovery
        if (isAuthenticated && session?.token && !this.isPasswordRecovery) {
            if (this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
                console.log('✅ Valid auth token stored');
            } else {
                console.warn('⚠️ Invalid JWT token received');
            }
        } else if (!isAuthenticated || this.isPasswordRecovery) {
            // Remove any existing tokens during sign out OR password recovery
            const existingToken = localStorage.getItem('auth_token');
            if (existingToken) {
                localStorage.removeItem('auth_token');
                console.log('🔑 Auth token removed' + (this.isPasswordRecovery ? ' (password recovery mode)' : ''));
            }
        }
        
        // Check if this is a Google OAuth callback
        const params = new URLSearchParams(window.location.search);
        const isGoogleCallback = params.get('from') === 'google';
        
        if (isAuthenticated && isGoogleCallback) {
            console.log('✅ Google OAuth authentication completed');
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
        
        // Clear all auth-related storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_session_data');
        
        // If on protected route, redirect to home
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
    clearPasswordRecoveryFlag(updateStorage = true) {
        this.isPasswordRecovery = false;
        console.log('Password recovery state cleared.');
        
        // **NEW: Clear global recovery state for cross-tab communication**
        if (updateStorage) {
            localStorage.removeItem(this.RECOVERY_STORAGE_KEY);
            console.log('🔑 Global password recovery state cleared');
        }
    }

    /**
     * NEW: Handle password recovery state changes across tabs
     */
    handleRecoveryStorageChange(event) {
        if (event.key === this.RECOVERY_STORAGE_KEY) {
            const recoveryState = event.newValue ? JSON.parse(event.newValue) : null;
            
            if (recoveryState && !this.isRecoveryStateExpired(recoveryState)) {
                console.log('🔑 Password recovery activated from another tab');
                this.activatePasswordRecovery(false); // Don't update storage again
            } else if (!recoveryState) {
                console.log('🔑 Password recovery cleared from another tab');
                this.clearPasswordRecoveryFlag(false); // Don't update storage again
            }
        }
    }

    /**
     * NEW: Activate password recovery mode
     */
    activatePasswordRecovery(updateStorage = true) {
        this.isPasswordRecovery = true;
        
        // Clear any existing auth tokens to prevent automatic login
        const existingToken = localStorage.getItem('auth_token');
        if (existingToken) {
            localStorage.removeItem('auth_token');
            console.log('🔑 Cleared existing auth token for password recovery');
        }
        
        // **NEW: Set global recovery state for cross-tab communication**
        if (updateStorage) {
            this.setGlobalRecoveryState();
        }
        
        // Force unauthenticated state
        this.isAuthenticated = false;
        this.user = null;
        this.notifyStateChange();
    }

    /**
     * NEW: Set global recovery state in localStorage for cross-tab communication
     */
    setGlobalRecoveryState() {
        const recoveryState = {
            active: true,
            timestamp: Date.now(),
            tabId: this.generateTabId(),
            path: window.location.pathname
        };
        localStorage.setItem(this.RECOVERY_STORAGE_KEY, JSON.stringify(recoveryState));
        console.log('🔑 Global password recovery state activated', recoveryState);
    }

    /**
     * NEW: Get global recovery state
     */
    getGlobalRecoveryState() {
        try {
            const recoveryData = localStorage.getItem(this.RECOVERY_STORAGE_KEY);
            return recoveryData ? JSON.parse(recoveryData) : null;
        } catch (error) {
            console.warn('Failed to parse recovery state:', error);
            return null;
        }
    }

    /**
     * NEW: Check if recovery state has expired
     */
    isRecoveryStateExpired(recoveryState) {
        if (!recoveryState || !recoveryState.timestamp) return true;
        return (Date.now() - recoveryState.timestamp) > this.RECOVERY_TIMEOUT;
    }

    /**
     * NEW: Generate unique tab identifier
     */
    generateTabId() {
        return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * NEW: Monitor and log security events
     */
    logSecurityEvent(eventType, details = {}) {
        const securityEvent = {
            type: eventType,
            timestamp: Date.now(),
            tabId: this.generateTabId(),
            path: window.location.pathname,
            recoveryMode: this.isPasswordRecovery,
            authenticated: this.isAuthenticated,
            details
        };
        
        console.warn('🚨 Security Event:', securityEvent);
        
        // Store recent security events for analysis
        const recentEvents = this.getRecentSecurityEvents();
        recentEvents.push(securityEvent);
        
        // Keep only last 10 events
        const trimmedEvents = recentEvents.slice(-10);
        localStorage.setItem('security_events', JSON.stringify(trimmedEvents));
        
        // Check for attack patterns
        this.analyzeSecurityPatterns(trimmedEvents);
    }

    /**
     * NEW: Get recent security events
     */
    getRecentSecurityEvents() {
        try {
            const events = localStorage.getItem('security_events');
            return events ? JSON.parse(events) : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * NEW: Analyze security patterns for potential attacks
     */
    analyzeSecurityPatterns(events) {
        const now = Date.now();
        const recentEvents = events.filter(e => (now - e.timestamp) < 5 * 60 * 1000); // Last 5 minutes
        
        // Check for rapid authentication attempts
        const authEvents = recentEvents.filter(e => e.type === 'rapid_auth_attempt');
        if (authEvents.length >= 3) {
            this.logSecurityEvent('potential_brute_force', { 
                attempts: authEvents.length,
                timespan: '5_minutes'
            });
        }
        
        // Check for cross-tab recovery exploitation
        const recoveryEvents = recentEvents.filter(e => e.type === 'recovery_bypass_attempt');
        if (recoveryEvents.length >= 2) {
            this.logSecurityEvent('potential_recovery_exploit', {
                attempts: recoveryEvents.length
            });
        }
    }
}

// Create and export singleton instance
const sessionManager = new SessionManager();

// Make it globally available
window.sessionManager = sessionManager;

export default sessionManager; 