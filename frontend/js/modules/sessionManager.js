/**
 * Session Manager Module
 * Handles authentication state across all pages and manages UI updates
 */

import { showSuccess, showError, showInfo } from './notifications.js';
import { supabaseClient } from './auth.js';
import { apiFetch } from './api.js';

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
        this.currentTabId = this.generateTabId(); // Generate unique tab ID for this session
        this.isInitializing = true; // Flag to prevent storage event processing during init
        this.lastLocalStorageWrite = null; // Track recent localStorage writes to prevent self-triggering
        
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
        
        // **FIX: Set up event listeners FIRST, then check recovery state**
        this.setupEventListeners();
        
        this.isInitialized = true;
        
        // **REFINED: More specific check for password recovery state activation**
        const urlHash = window.location.hash;
        const urlSearch = window.location.search;
        const currentPath = window.location.pathname;
        
        // **NEW: Detect Google OAuth callback**
        const isGoogleOAuthCallback = urlSearch.includes('from=google') || 
                                    urlHash.includes('provider=google') ||
                                    (urlHash.includes('access_token=') && !urlHash.includes('type=recovery'));
        
        // **FIX: More robust password recovery detection to prevent race conditions**
        const isRecoveryUrl = this.isPasswordRecoveryUrl(urlHash, urlSearch, currentPath);

        if (isGoogleOAuthCallback) {
            console.log('🔑 Google OAuth callback detected - clearing any orphaned recovery state');
            // Clear any orphaned recovery state that might interfere with OAuth
            this.clearPasswordRecoveryFlag();
            this.isPasswordRecovery = false;
        } else if (isRecoveryUrl) {
            // **SECURITY FIX: Removed URL path/hash logging to prevent privacy exposure**
        console.log('🔑 Password recovery URL detected.');
            // **FIX: Don't activate recovery mode immediately - let Supabase process the URL first**
            // We'll activate recovery mode when we receive the PASSWORD_RECOVERY event from Supabase
            console.log('⏳ Waiting for Supabase to process recovery URL and trigger PASSWORD_RECOVERY event...');
        } else {
            // Check for global recovery state from other tabs
            const globalRecoveryState = this.getGlobalRecoveryState();
            if (globalRecoveryState) {
                if (this.isRecoveryStateExpired(globalRecoveryState)) {
                    console.log('🚮 Found and cleared expired password recovery state on initialization.');
                    this.clearPasswordRecoveryFlag();
                } else {
                    console.log('🔑 Adopting active password recovery state from another session.');
                    this.isPasswordRecovery = true; // Adopt state without refreshing the timer
                    this.notifyStateChange();
                }
            }
        }

        // Final state reporting
        console.log(`✅ Session manager initialized ${this.isPasswordRecovery ? '(Password Recovery Mode)' : ''}`);
        
        // **NEW: Start server restart monitoring after initialization**
        setTimeout(() => {
            this.startServerRestartMonitoring();
        }, 5000); // Wait 5 seconds after init to start monitoring
        
        // **FIX: Clear initialization flag after a brief delay to allow initial setup**
        setTimeout(() => {
            this.isInitializing = false;
        }, 100);
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
        
        // **RESTORED: Cross-tab recovery state listening - needed for security per documentation**
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
     * Check authentication status and restore from stored session if available
     */
    async checkAuthStatus() {
        // Prevent concurrent auth checks
        if (this.isCheckingAuth) {
            console.log('⏳ Auth check already in progress, skipping...');
            return;
        }
        
        const now = Date.now();
        if (now - this.lastAuthCheck < this.MIN_AUTH_CHECK_INTERVAL) {
            console.log('⏳ Auth check too recent, skipping...');
            return;
        }
        
        this.isCheckingAuth = true;
        this.lastAuthCheck = now;
        
        try {
            console.log('🔍 Session Manager: Checking authentication status...');
            
            // **ENHANCED: First check if auth module already has valid session**
            if (window.authModule) {
                try {
                    const authModuleAuth = window.authModule.isAuthenticated();
                    const authModuleUser = window.authModule.getCurrentUser();
                    
                    if (authModuleAuth && authModuleUser) {
                        console.log('✅ Auth module already has valid session, syncing with session manager');
                        this.user = authModuleUser;
                        this.isAuthenticated = true;
                        
                        // Ensure token is stored
                        const token = window.authModule.getAuthToken();
                        if (token) {
                            localStorage.setItem('auth_token', token);
                        }
                        
                        // **FIX: Immediately start profile refresh on page load**
                        if (!window._profileRefreshStarted && window.authModule && typeof window.authModule.refreshUserData === 'function') {
                            window._profileRefreshStarted = true;
                            console.log('🔄 Starting immediate profile refresh...');
                            window.authModule.refreshUserData(true, false).then(() => {
                                console.log('✅ Immediate profile refresh completed');
                                
                                // Update session manager's user object with refreshed data
                                const refreshedUser = window.authModule.getCurrentUser();
                                if (refreshedUser) {
                                    this.user = refreshedUser;
                                    console.log('✅ Session manager user object updated with fresh profile data');
                                }
                                
                                // Update UI if available
                                if (window.appUI && window.appUI.updateUI) {
                                    window.appUI.updateUI({ 
                                        isAuthenticated: true, 
                                        user: refreshedUser 
                                    });
                                }
                                window._profileRefreshStarted = false;
                            }).catch(error => {
                                console.error('❌ Immediate profile refresh failed:', error);
                                window._profileRefreshStarted = false;
                            });
                        }
                        
                        // Notify other components
                        this.notifyStateChange();
                        return;
                    }
                } catch (error) {
                    console.warn('Error checking auth module state:', error);
                }
            }
            
            // Check local token first (fastest check)
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken && this.isValidJWT(storedToken)) {
                console.log('🔍 Found stored JWT token, attempting verification...');
                
                try {
                    // Try to verify with backend if available
                    const response = await apiFetch('/auth/verify', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${storedToken}` },
                        body: JSON.stringify({ token: storedToken })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.user) {
                            console.log('✅ Token verified with backend, restoring session');
                            this.user = data.user;
                            this.isAuthenticated = true;
                            
                            // **NEW: Also update auth module state for consistency**
                            if (window.authModule && !window.authModule.isAuthenticated()) {
                                window.authModule.user = data.user;
                                window.authModule.session = { access_token: storedToken };
                                console.log('✅ Auth module state synchronized with verified session');
                            }
                            
                            this.notifyStateChange();
                            return;
                        }
                    }
                } catch (error) {
                    console.warn('Backend token verification failed:', error);
                }
            }
            
            // Check if Supabase has a session (for page refresh scenarios)
            if (window.authModule?.supabaseClient) {
                try {
                    const { data: { session }, error } = await window.authModule.supabaseClient.auth.getSession();
                    if (session && session.access_token && !error) {
                        console.log('✅ Found Supabase session on refresh, triggering auth recovery');
                        
                        // **ENHANCED: Properly synchronize all auth state**
                        this.user = session.user;
                        this.isAuthenticated = true;
                        
                        // Update auth module state
                        if (window.authModule) {
                            window.authModule.user = session.user;
                            window.authModule.session = session;
                            console.log('✅ Auth module state updated from Supabase session');
                        }
                        
                        // Store the token for consistency
                        localStorage.setItem('auth_token', session.access_token);
                        
                        // Notify other components with comprehensive state
                        window.dispatchEvent(new CustomEvent('auth-state-changed', {
                            detail: {
                                isAuthenticated: true,
                                user: session.user,
                                session: session,
                                event: 'RECOVERED_SESSION'
                            }
                        }));
                        
                        // Force UI update
                        this.notifyStateChange();
                        return;
                    }
                } catch (error) {
                    console.warn('Error checking Supabase session:', error);
                }
            }
            
            // No valid authentication found
            this.setUnauthenticated();
            
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.setUnauthenticated();
        } finally {
            this.isCheckingAuth = false;
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
        
        // **SECURITY FIX: Removed email logging to prevent privacy exposure**
        console.log('🔄 Session manager received auth state changed:', isAuthenticated ? 'User authenticated' : 'Signed out');
        
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
        
        // Handle token storage - but handle password recovery specially
        if (isAuthenticated && session?.token && !this.isPasswordRecovery) {
            if (this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
                console.log('✅ Valid auth token stored');
            } else {
                console.warn('⚠️ Invalid JWT token received');
            }
        } else if (session?.token && this.isPasswordRecovery) {
            // **FIX: During password recovery, preserve the token for password updates**
            if (this.isValidJWT(session.token)) {
                localStorage.setItem('auth_token', session.token);
                console.log('✅ Password recovery token preserved for password update');
            }
        } else if (!isAuthenticated && !this.isPasswordRecovery) {
            // Only remove tokens during normal sign out, NOT during password recovery
            const existingToken = localStorage.getItem('auth_token');
            if (existingToken) {
                localStorage.removeItem('auth_token');
                console.log('🔑 Auth token removed (signed out)');
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
     * Clear password recovery flag - FIXED to properly clear global state
     */
    clearPasswordRecoveryFlag(updateStorage = true) {
        this.isPasswordRecovery = false;
        
        // **FIX: Clear global recovery state properly**
        if (updateStorage) {
            // Track localStorage write to prevent same-tab processing
            this.lastLocalStorageWrite = Date.now();
            localStorage.removeItem(this.RECOVERY_STORAGE_KEY);
            console.log('🔑 Global password recovery state cleared');
        }
        
        this.notifyStateChange();
    }

    /**
     * Check and cleanup expired recovery state when navigating to non-recovery pages
     */
    checkAndCleanupRecoveryState() {
        if (!this.isPasswordRecovery) {
            return;
        }
        
        const globalRecoveryState = this.getGlobalRecoveryState();
        if (globalRecoveryState && this.isRecoveryStateExpired(globalRecoveryState)) {
            console.log('🚮 Cleaning up expired password recovery state during navigation');
            this.clearPasswordRecoveryFlag();
        } else if (this.isPasswordRecovery) {
            console.log('🔑 Clearing recovery state - user navigated away from password reset');
            this.clearPasswordRecoveryFlag();
        }
    }

    /**
     * Robust password recovery URL detection to prevent race conditions
     */
    isPasswordRecoveryUrl(urlHash, urlSearch, currentPath) {
        // Method 1: Direct type=recovery parameter detection
        if (urlHash.includes('type=recovery') || urlSearch.includes('type=recovery')) {
            console.log('🔑 Recovery URL detected via type=recovery parameter');
            return true;
        }
        
        // Method 2: Path-based detection
        if (currentPath === '/auth/reset-password') {
            console.log('🔑 Recovery URL detected via reset-password path');
            return true;
        }
        
        // Method 3: Combined access_token + type=recovery detection with retry
        if (urlHash.includes('access_token=')) {
            // Parse the hash more carefully
            const hashParams = new URLSearchParams(urlHash.substring(1));
            const urlParams = new URLSearchParams(urlSearch);
            
            // Check both hash and search parameters for type=recovery
            if (hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery') {
                console.log('🔑 Recovery URL detected via parsed parameters');
                return true;
            }
            
            // Method 4: Fallback - if we're on reset-password path with access_token, assume recovery
            if (currentPath === '/auth/reset-password' && urlHash.includes('access_token=')) {
                console.log('🔑 Recovery URL detected via path + access_token fallback');
                return true;
            }
        }
        
        return false;
    }

    // **REMOVED: Cross-tab recovery handling - password reset should be tab-isolated**

    /**
     * NEW: Activate password recovery mode - FIXED to allow recovery session while preventing cross-tab interference
     */
    activatePasswordRecovery(updateStorage = true) {
        this.isPasswordRecovery = true;
        
        // **FIX: Don't clear auth tokens immediately - let Supabase create the recovery session first**
        // The recovery session is needed for password updates
        // We'll control the auth events instead of blocking the session entirely
        
        if (window.location.pathname === '/auth/reset-password') {
            console.log('🔑 Password recovery mode activated - allowing Supabase recovery session creation');
        }
        
        // **FIX: Set global recovery state to prevent auto-login in other tabs**
        // This is actually needed for cross-tab protection per the documentation
        if (updateStorage) {
            this.setGlobalRecoveryState();
            console.log('🔑 Global password recovery state activated (prevents cross-tab auto-login)');
        }
        
        // Force unauthenticated state ONLY for UI purposes - don't clear the actual session yet
        this.isAuthenticated = false;
        this.user = null;
        this.notifyStateChange();
    }

    // **RESTORED: Global recovery state methods - needed for cross-tab protection per documentation**
    
    /**
     * Set global recovery state in localStorage for cross-tab communication
     */
    setGlobalRecoveryState() {
        const recoveryState = {
            active: true,
            timestamp: Date.now(),
            tabId: this.currentTabId,
            path: window.location.pathname
        };
        
        // Track localStorage write to prevent same-tab processing
        this.lastLocalStorageWrite = Date.now();
        
        localStorage.setItem(this.RECOVERY_STORAGE_KEY, JSON.stringify(recoveryState));
        console.log('🔑 Global password recovery state activated', recoveryState);
    }

    /**
     * Get global recovery state
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
     * Check if recovery state has expired
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
        // **FIX: Reduce security event logging during password recovery to prevent spam**
        if (this.isPasswordRecovery && (eventType === 'recovery_bypass_attempt' || eventType === 'potential_recovery_exploit')) {
            console.log(`✅ Ignoring security event "${eventType}" during legitimate password recovery`);
            return;
        }

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
        
        // Check for attack patterns (but not during password recovery)
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
        // **FIX: Don't analyze security patterns during password recovery - it causes false positives**
        if (this.isPasswordRecovery) {
            console.log('✅ Skipping security pattern analysis during password recovery');
            return;
        }

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

    /**
     * Handle password recovery state changes across tabs - RESTORED for security
     */
    handleRecoveryStorageChange(event) {
        if (event.key === this.RECOVERY_STORAGE_KEY) {
            // Ignore storage events during initialization
            if (this.isInitializing) {
                console.log('🚫 Ignoring storage event during initialization');
                return;
            }
            
            const recoveryState = event.newValue ? JSON.parse(event.newValue) : null;
            console.log('🔄 Recovery storage change detected from another tab');
            
            // Enhanced same-tab detection to prevent interference
            if (recoveryState) {
                // Check 1: Tab ID comparison
                if (recoveryState.tabId === this.currentTabId) {
                    console.log('🚫 Ignoring storage event from same tab (ID match):', recoveryState.tabId);
                    return;
                }
                
                // Check 2: Recent localStorage write detection
                if (this.lastLocalStorageWrite && (Date.now() - this.lastLocalStorageWrite) < 200) {
                    console.log('🚫 Ignoring storage event - recent write detected');
                    return;
                }
                
                // Check 3: Current path matches event path
                if (recoveryState.path === window.location.pathname && window.location.pathname === '/auth/reset-password') {
                    console.log('🚫 Ignoring storage event - same reset password page');
                    return;
                }
            }
            
            if (recoveryState && !this.isRecoveryStateExpired(recoveryState)) {
                console.log('🔑 Password recovery activated from another tab - preventing auto-login');
                this.activatePasswordRecovery(false); // Don't update storage again
            } else if (!recoveryState) {
                console.log('🔑 Password recovery cleared from another tab');
                this.clearPasswordRecoveryFlag(false); // Don't update storage again
            }
        }
    }

    /**
     * NEW: Detect server restart and session invalidation
     */
    async detectServerRestart() {
        try {
            // Multiple indicators of server restart issues
            const hasValidToken = !!localStorage.getItem('auth_token');
            const isAuthModuleAuthenticated = window.authModule?.isAuthenticated();
            const hasUserData = !!this.user;
            
            // If we think we're authenticated but something seems wrong, investigate
            if ((hasValidToken || isAuthModuleAuthenticated || hasUserData) && this.isAuthenticated) {
                
                // Test 1: Try to fetch user credits (common failure after restart)
                try {
                    const creditsResponse = await apiFetch('/auth/credits');
                    if (!creditsResponse.ok) {
                        console.warn('🔄 Credits fetch failed - possible server restart detected');
                        return true;
                    }
                    
                    const creditsData = await creditsResponse.json();
                    if (creditsData.credits === 0 && hasValidToken) {
                        console.warn('🔄 Credits returned 0 despite valid token - possible session invalidation');
                        return true;
                    }
                } catch (error) {
                    console.warn('🔄 Credits request failed - server may have restarted:', error);
                    return true;
                }
                
                // Test 2: Try to verify auth status
                try {
                    const token = localStorage.getItem('auth_token');
                    const verifyResponse = await apiFetch('/auth/verify', {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ token })
                    });
                    
                    if (!verifyResponse.ok) {
                        console.warn('🔄 Auth verification failed - possible server restart detected');
                        return true;
                    }
                } catch (error) {
                    console.warn('🔄 Auth verification request failed - server may have restarted:', error);
                    return true;
                }
                
                // Test 3: Check if Supabase session is valid but backend fails
                if (window.authModule?.supabaseClient) {
                    try {
                        const { data: { session } } = await window.authModule.supabaseClient.auth.getSession();
                        if (session && session.access_token) {
                            // We have a valid Supabase session but backend tests failed
                            console.log('🔄 Supabase session valid but backend failing - server restart likely');
                            return true;
                        }
                    } catch (error) {
                        console.warn('🔄 Supabase session check failed:', error);
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('🔄 Error during server restart detection:', error);
            return false;
        }
    }

    /**
     * NEW: Recover from server restart by refreshing session
     */
    async recoverFromServerRestart() {
        console.log('🔄 Attempting session recovery from server restart...');
        
        try {
            // Step 1: Check if we have a valid Supabase session
            if (window.authModule?.supabaseClient) {
                const { data: { session }, error } = await window.authModule.supabaseClient.auth.getSession();
                
                if (session && session.access_token) {
                    console.log('🔄 Found valid Supabase session, refreshing backend authentication...');
                    
                    // Step 2: Re-authenticate with backend using the Supabase token
                    try {
                        const response = await apiFetch('/auth/verify', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session.access_token}` },
                            body: JSON.stringify({ token: session.access_token })
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.user) {
                                console.log('✅ Session recovered successfully after server restart');
                                
                                // Update local state
                                this.user = data.user;
                                this.isAuthenticated = true;
                                localStorage.setItem('auth_token', session.access_token);
                                
                                // Update auth module state
                                if (window.authModule) {
                                    window.authModule.user = data.user;
                                    window.authModule.session = session;
                                }
                                
                                // Notify all listeners
                                this.notifyStateChange();
                                
                                return true;
                            }
                        }
                    } catch (error) {
                        console.error('🔄 Backend re-authentication failed:', error);
                    }
                }
            }
            
            // Step 3: If Supabase session recovery fails, try token refresh
            console.log('🔄 Attempting token refresh...');
            if (window.authModule && typeof window.authModule.refreshSession === 'function') {
                const refreshed = await window.authModule.refreshSession();
                if (refreshed) {
                    console.log('✅ Session refreshed successfully');
                    return true;
                }
            }
            
            console.warn('❌ Session recovery failed - user may need to re-authenticate');
            return false;
            
        } catch (error) {
            console.error('❌ Error during session recovery:', error);
            return false;
        }
    }

    /**
     * NEW: Monitor for server restart issues and auto-recover
     */
    startServerRestartMonitoring() {
        // Check every 30 seconds for potential server restart issues
        setInterval(async () => {
            if (this.isAuthenticated && !this.isCheckingAuth) {
                const serverRestarted = await this.detectServerRestart();
                if (serverRestarted) {
                    console.log('🔄 Server restart detected, attempting automatic recovery...');
                    const recovered = await this.recoverFromServerRestart();
                    
                    if (recovered) {
                        console.log('✅ Automatic session recovery successful');
                        // Trigger UI updates by notifying state change
                        this.notifyStateChange();
                    } else {
                        console.warn('❌ Automatic session recovery failed');
                        // Could show a notification to user here
                    }
                }
            }
        }, 30000); // Check every 30 seconds
        
        console.log('✅ Server restart monitoring started');
    }
}

// Create singleton instance
const sessionManager = new SessionManager();

// Export the instance
export { sessionManager }; 