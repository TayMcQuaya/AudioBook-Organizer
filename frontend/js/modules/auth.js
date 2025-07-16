/**
 * Authentication Module for AudioBook Organizer
 * Handles Supabase authentication, user session management, and API calls
 */

import { showError, showSuccess, showInfo } from './notifications.js';
import { validatePassword, checkPasswordStrength } from './validators.js';
import { sessionManager } from './sessionManager.js';
import { showNotification } from './notifications.js';
import { recaptcha } from './recaptcha.js';
import { apiFetch } from './api.js';

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
class AuthModule {
    constructor() {
        if (AuthModule.instance) {
            return AuthModule.instance;
        }

        this.user = null;
        this.session = null;
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.lastWelcomeShown = 0;  // Prevent repeated welcome messages
        this.wasInitialized = false; // Track if we've seen the first auth state change
        this.welcomeShownThisSession = false; // Prevent multiple welcome messages - SESSION PERSISTENT
        this.userInitialized = false; // Prevent multiple user initialization calls - SESSION PERSISTENT
        this.newUserCreditsShown = false; // Prevent multiple new user credit messages - SESSION PERSISTENT
        this.sessionId = null; // Track session ID for persistence
        this.supabaseClient = null; // Store Supabase client instance
        this.authConfig = null; // Store auth configuration
        this.initPasswordStrengthMeter();
        this.initPasswordVisibilityToggle();
        
        // Restore session-persistent flags from localStorage
        this.restoreSessionFlags();
        
        AuthModule.instance = this;
    }

    /**
     * Restore session-persistent flags from localStorage
     */
    restoreSessionFlags() {
        try {
            const sessionData = localStorage.getItem('auth_session_data');
            if (sessionData) {
                const data = JSON.parse(sessionData);
                // Only restore if it's the same session
                if (data.sessionId && data.timestamp && (Date.now() - data.timestamp < 24 * 60 * 60 * 1000)) { // 24 hours
                    this.welcomeShownThisSession = data.welcomeShownThisSession || false;
                    this.userInitialized = data.userInitialized || false;
                    this.newUserCreditsShown = data.newUserCreditsShown || false;
                    this.sessionId = data.sessionId;
                    console.log('🔄 Restored session flags:', { 
                        welcomeShown: this.welcomeShownThisSession, 
                        userInit: this.userInitialized,
                        creditsShown: this.newUserCreditsShown 
                    });
                }
            }
        } catch (error) {
            console.warn('Failed to restore session flags:', error);
        }
    }

    /**
     * Save session-persistent flags to localStorage
     */
    saveSessionFlags() {
        try {
            const sessionData = {
                sessionId: this.sessionId,
                welcomeShownThisSession: this.welcomeShownThisSession,
                userInitialized: this.userInitialized,
                newUserCreditsShown: this.newUserCreditsShown,
                timestamp: Date.now()
            };
            localStorage.setItem('auth_session_data', JSON.stringify(sessionData));
        } catch (error) {
            console.warn('Failed to save session flags:', error);
        }
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
                if (this.supabaseClient) {
                    // Set up auth state listener, which handles all auth states including initial session
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
            const response = await apiFetch('/auth/config');
            const data = await response.json();
            
            if (data.success && data.config) {
                authConfig = data.config;
                this.authConfig = data.config; // Store in class instance
                console.log('✅ Authentication config loaded');
            } else {
                console.warn('⚠️ No authentication config available');
                authConfig = null;
                this.authConfig = null;
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
            // Use globally loaded Supabase if available
            let createClient = window.supabaseCreateClient;
            
            if (!createClient) {
                console.warn('⚠️ Supabase not loaded globally, attempting dynamic import...');
                try {
                    // Try jsdelivr as fallback
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
            } else {
                console.log('✅ Using globally loaded Supabase');
            }
            
            const client = createClient(
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
            
            // Store in both places for compatibility
            supabaseClient = client;
            this.supabaseClient = client;
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
       // This method is deprecated and will be removed. 
       // onAuthStateChange with the INITIAL_SESSION event handles this now.
    }

    /**
     * Set up authentication state listener
     */
    setupAuthListener() {
        if (!this.supabaseClient) return;

        let lastEvent = null;
        let lastEventTime = 0;
        const MIN_EVENT_INTERVAL = 500; // Minimum time between same events in ms

        this.supabaseClient.auth.onAuthStateChange(async (event, session) => {
            // Prevent duplicate processing of the same event
            if (this.lastEventProcessed === event && (Date.now() - this.lastEventTime) < 1000) {
                console.log('🔄 Ignoring duplicate auth event:', event);
                return;
            }
            
            this.lastEventProcessed = event;
            this.lastEventTime = Date.now();
            
            console.log('🔄 Auth state changed:', event);

            // **FIX: Handle PASSWORD_RECOVERY events FIRST to set recovery mode correctly**
            if (event === 'PASSWORD_RECOVERY') {
                console.log('🔑 Password recovery event detected - activating recovery mode');
                sessionManager.activatePasswordRecovery();
                this.notifyAuthListeners(event, session);
                // **CRITICAL: Don't return here - let normal processing continue for session setup**
            }

            // **CRITICAL SAFETY: Force recovery mode for any auth event on reset page**
            // This prevents auto-login when Supabase incorrectly sends SIGNED_IN instead of PASSWORD_RECOVERY
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !sessionManager.isPasswordRecovery) {
                if (this.isLikelyPasswordRecovery()) {
                    console.log('🚨 FORCED RECOVERY MODE: Supabase sent ' + event + ' instead of PASSWORD_RECOVERY on reset page');
                    sessionManager.activatePasswordRecovery();
                    // **OVERRIDE EVENT**: Treat this as PASSWORD_RECOVERY to prevent auto-login
                    event = 'PASSWORD_RECOVERY';
                    console.log('🔄 Event overridden to PASSWORD_RECOVERY to prevent auto-login bug');
                }
            }

            // **ENHANCED: Modified recovery mode handling - allow processing but control behavior**
            if (sessionManager.isPasswordRecovery) {
                switch (event) {
                    case 'PASSWORD_RECOVERY':
                        // Already handled above, continue with normal processing
                        break;
                    case 'SIGNED_OUT':
                        console.log('🔑 Sign out during password recovery - allowing.');
                        await this.handleSignOut();
                        return;
                    case 'SIGNED_IN':
                    case 'INITIAL_SESSION':
                        console.log(`🔑 ${event} during recovery - allowing session setup but preventing login behavior.`);
                        // **KEY FIX: Allow normal session processing but prevent login navigation/UI**
                        if (session && session.user) {
                            // Let the normal handleAuthSuccess process this but mark it as recovery
                            await this.handleAuthSuccess(session, false, 'PASSWORD_RECOVERY');
                            return;
                        }
                        break;
                    default:
                        console.log(`🔑 Ignoring ${event} during password recovery mode.`);
                        return;
                }
            }

            // Centralized handling of all auth events (normal processing when NOT in password recovery)
            switch (event) {
                case 'SIGNED_IN':
                    await this.handleAuthSuccess(session, true /* isLogin */, event);
                    break;
                
                case 'INITIAL_SESSION':
                    if (session) {
                        await this.handleAuthSuccess(session, false /* isLogin */, event);
                        // **REMOVED: Initial session doesn't need recovery check - it's already a fresh session**
                        // Only check recovery on actual failures, not on successful sessions
                    } else {
                        // Check if this might be a Google OAuth callback that hasn't processed yet
                        const isGoogleOAuthCallback = window.location.search.includes('from=google');
                        if (isGoogleOAuthCallback) {
                            console.log('🔄 Google OAuth callback detected with no session yet, waiting...');
                            // Don't sign out immediately for OAuth callbacks - give it time
                            setTimeout(async () => {
                                // Check again after a delay
                                const { data } = await this.supabaseClient.auth.getSession();
                                if (!data.session) {
                                    console.log('⚠️ Still no session after OAuth delay, proceeding with sign out');
                                    await this.handleSignOut();
                                }
                            }, 3000);
                        } else {
                            await this.handleSignOut();
                        }
                    }
                    break;

                case 'SIGNED_OUT':
                    await this.handleSignOut();
                    break;

                case 'TOKEN_REFRESHED':
                    await this.handleTokenRefresh(session);
                    // **REMOVED: This was causing infinite loops - token refresh is already a recovery action**
                    // Don't trigger recovery check here as it will cause another token refresh
                    break;

                case 'USER_UPDATED':
                    console.log('👤 User data was updated.');
                    if (session && session.user) {
                        this.user = { ...this.user, ...session.user };
                        sessionManager.handleAuthStateChange(true, this.user);
                        this.notifyAuthListeners(event, session);
                    }
                    break;

                case 'PASSWORD_RECOVERY':
                    // Already handled at the top
                    break;
                    
                default:
                    console.warn(`Unhandled auth event: ${event}`);
            }
        });
    }

    /**
     * Handle successful authentication
     */
    async handleAuthSuccess(session, isLogin = false, authEvent = null) {
        if (!session || !session.user) {
            console.error('Invalid session provided');
            return;
        }

        // **NEW: Enhanced security checks before processing authentication**
        if (!this.validateSessionSecurity(session, authEvent)) {
            console.warn('🚨 Session failed security validation - blocking authentication');
            await this.handleSignOut();
            return;
        }

        // Generate or use existing session ID for tracking
        const currentSessionId = session.access_token?.substring(0, 12) || Date.now().toString();
        const isNewSession = this.sessionId !== currentSessionId;
        
        // More comprehensive duplicate check - if we already have the same user and session
        if (this.user?.id === session.user.id && 
            this.session?.access_token === session.access_token &&
            this.userInitialized && !isNewSession) {
            console.log('🔄 Ignoring duplicate auth success for same user session');
            return;
        }

        // Update session tracking
        if (isNewSession) {
            this.sessionId = currentSessionId;
            // **SECURITY FIX: Removed session ID to prevent session identifier exposure**
        console.log('🆕 New session detected');
        }

        this.session = session;
        this.user = session.user;
        currentUser = session.user;
        
        // Ensure we get the access_token from the session
        authToken = session.access_token;
        
        if (!authToken) {
            // **SECURITY FIX: Removed session object logging to prevent exposure**
        console.error('❌ No access token in session');
            showError('Authentication failed - no access token received');
            return;
        }

        // Validate token format before storing
        if (!this.isValidJWT(authToken)) {
            console.error('❌ Received invalid JWT token format');
            showError('Authentication failed - invalid token format');
            return;
        }

        // Store token in localStorage for API calls
        localStorage.setItem('auth_token', authToken);
        // **SECURITY FIX: Removed email logging to prevent privacy exposure**
        console.log('✅ Valid JWT token stored for authenticated user');
        
        // **FIX: Handle PASSWORD_RECOVERY differently - no login flows or navigation**
        if (authEvent === 'PASSWORD_RECOVERY') {
            console.log('✅ Password recovery session established - ready for password update');
            
            // Dispatch auth state for session manager but mark as recovery
            window.dispatchEvent(new CustomEvent('auth-state-changed', {
                detail: {
                    isAuthenticated: false, // Don't mark as authenticated during recovery
                    user: session.user,
                    session: { token: authToken, event: authEvent }
                }
            }));
            
            // Notify listeners but prevent login UI changes
            this.notifyAuthListeners('PASSWORD_RECOVERY', session);
            return; // Don't continue with normal login processing
        }
        
        // **NORMAL LOGIN PROCESSING** (only when not in PASSWORD_RECOVERY)
        // Dispatch auth state change event for session manager
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: {
                isAuthenticated: true,
                user: session.user,
                session: { token: authToken, event: authEvent }
            }
        }));
        
        try {
            // Initialize user profile and credits if this is a new user
            await this.initializeUser();
            
            // **SECURITY FIX: Sanitized user data logging to prevent exposure of sensitive information**
            console.log('✅ User initialized successfully');
            
            // Welcome message logic: Show ONLY on actual login (SIGNED_IN event), not session restoration
            // And only if we haven't shown it for this session yet
            if ((authEvent === 'SIGNED_IN' || window.location.search.includes('from=google')) && !this.welcomeShownThisSession) {
                // Use actual name if available, otherwise use email
                const displayName = this.user.user_metadata?.full_name || 
                                  this.user.user_metadata?.name || 
                                  this.user.full_name || 
                                  this.user.name || 
                                  this.user.email.split('@')[0];
                showSuccess(`Welcome back, ${displayName}!`);
                this.welcomeShownThisSession = true;
                console.log('👋 Welcome message shown for login');
            } else if (authEvent === 'INITIAL_SESSION') {
                console.log('🔄 Session restored, skipping welcome message');
            }
            
            // Save session flags to persist across page navigations
            this.saveSessionFlags();
            
            // Get the return URL if it exists
            const params = new URLSearchParams(window.location.search);
            const returnUrl = params.get('return') || '/app';
            
            // Navigate after successful authentication
            if (authEvent === 'SIGNED_IN') {
                // **FIX: Detect page refresh scenarios to prevent unwanted navigation**
                const isPageRefresh = !document.referrer || document.referrer === window.location.href;
                const currentPath = window.location.pathname;
                
                // For Google OAuth callback, always navigate to app
                if (window.location.search.includes('from=google')) {
                    console.log('🔄 Google OAuth completed, navigating to app page');
                    if (window.router) {
                        await window.router.navigate('/app');
                    } else {
                        window.location.href = '/app';
                    }
                } else if ((isPageRefresh && currentPath === '/') || (currentPath === '/' && window.location.hash)) {
                    // **CRITICAL FIX: Don't navigate away from landing page during refresh OR when user specifically navigated to landing page with hash**
                    if (window.location.hash) {
                        // **SECURITY FIX: Removed URL exposure to prevent privacy leak**
            console.log('🚫 Preventing navigation from landing page - user specifically navigated here');
                        console.log('✅ User chose landing page with hash, respecting their choice (e.g., pricing section)');
                    } else {
                        console.log('🚫 Preventing navigation from landing page during refresh/session restoration');
                        console.log('✅ User chose to be on landing page, respecting their choice');
                    }
                } else if (currentPath.startsWith('/payment/')) {
                    // **CRITICAL FIX: Don't navigate away from any payment pages**
                    console.log(`🚫 Preventing navigation from payment page: ${currentPath}`);
                    console.log('✅ User should see their payment result page, respecting their choice');
                } else {
                    // **FIX: Only navigate if not already on the target page**
                    if (currentPath !== returnUrl) {
                        console.log(`🔄 Navigating from ${currentPath} to ${returnUrl} after login`);
                        if (window.router) {
                            await window.router.navigate(returnUrl);
                        } else {
                            window.location.href = returnUrl;
                        }
                    } else {
                        console.log(`✅ Already on target page ${returnUrl}, skipping navigation`);
                    }
                }
            } else if (authEvent === 'INITIAL_SESSION') {
                // **FIX: Respect user's current page during session restoration**
                const currentPath = window.location.pathname;
                
                // For Google OAuth on auth page, navigate to app
                if (window.location.search.includes('from=google') && currentPath === '/auth') {
                    console.log('🔄 Google OAuth session restored, navigating to app page');
                    if (window.router) {
                        await window.router.navigate('/app');
                    } else {
                        window.location.href = '/app';
                    }
                } else {
                    console.log(`🔄 Session restored on ${currentPath}, staying on current page`);
                    // **IMPORTANT: Never automatically navigate during session restoration**
                    // Users should stay on whatever page they refreshed (landing, app, etc.)
                    // This prevents unwanted redirects during page refresh
                    if (currentPath === '/') {
                        if (window.location.hash) {
                            // **SECURITY FIX: Removed URL hash logging to prevent privacy exposure**
                    console.log('✅ Staying on landing page with hash during session restore');
                        } else {
                            console.log('✅ Staying on landing page during session restore');
                        }
                    } else if (currentPath === '/app') {
                        console.log('✅ Staying on app page during session restore');
                    } else if (currentPath.startsWith('/payment/')) {
                        console.log(`✅ Staying on payment page (${currentPath}) during session restore`);
                    } else {
                        console.log(`✅ Staying on ${currentPath} during session restore`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Error during user initialization:', error);
            showError('Authentication successful, but failed to load user data');
        }
    }

    /**
     * Detect if current URL is likely a password recovery that was missed by initial detection
     */
    isLikelyPasswordRecovery() {
        const urlHash = window.location.hash;
        const urlSearch = window.location.search;
        const currentPath = window.location.pathname;
        
        // Check if we're on the reset password page
        if (currentPath === '/auth/reset-password') {
            return true;
        }
        
        // Check if URL contains recovery-related parameters
        if (urlHash.includes('type=recovery') || urlSearch.includes('type=recovery')) {
            return true;
        }
        
        // Check if we have access_token on reset-password page (common pattern)
        if (currentPath === '/auth/reset-password' && urlHash.includes('access_token=')) {
            return true;
        }
        
        return false;
    }

    /**
     * NEW: Validate session security to prevent attacks
     */
    validateSessionSecurity(session, authEvent) {
        // **FIX: Always allow PASSWORD_RECOVERY events - they are legitimate**
        if (authEvent === 'PASSWORD_RECOVERY') {
            console.log('✅ Allowing PASSWORD_RECOVERY event - legitimate password reset');
            return true;
        }

        // 1. Check for concurrent password recovery attacks
        if (sessionManager.isPasswordRecovery && authEvent === 'SIGNED_IN') {
            console.warn('🚨 Blocked SIGNED_IN during password recovery - potential session hijacking');
            return false;
        }

        // 2. Validate JWT token structure
        if (session.access_token && !this.isValidJWT(session.access_token)) {
            console.warn('🚨 Invalid JWT structure detected');
            return false;
        }

        // 3. **FIX: Don't flag rapid attempts during password recovery - it's normal**
        if (!sessionManager.isPasswordRecovery) {
            // Check for rapid successive authentication attempts (but allow OAuth flows)
            const now = Date.now();
            const timeSinceLastAuth = now - (this.lastAuthTime || 0);
            const isGoogleOAuthFlow = window.location.search.includes('from=google');
            
            // Allow rapid events during OAuth flow and certain legitimate scenarios
            if (timeSinceLastAuth < 1000 && !isGoogleOAuthFlow && authEvent !== 'INITIAL_SESSION' && authEvent !== 'TOKEN_VERIFICATION') {
                console.warn('🚨 Rapid authentication attempts detected');
                sessionManager.logSecurityEvent('rapid_auth_attempt', {
                    timeSinceLastAuth,
                    authEvent,
                    userId: session.user?.id
                });
                return false;
            }
            this.lastAuthTime = now;
        } else {
            console.log('✅ Skipping rapid auth check during password recovery');
        }

        // 4. Validate user email format to prevent injection
        if (session.user?.email && !this.isValidEmail(session.user.email)) {
            console.warn('🚨 Invalid email format in session');
            return false;
        }

        return true;
    }

    /**
     * NEW: Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate JWT token format
     */
    isValidJWT(token) {
        if (!token || typeof token !== 'string') {
            return false;
        }
        
        // JWT should have exactly 3 parts separated by dots
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.warn('🚫 Invalid JWT format - not enough segments');
            return false;
        }
        
        // Each part should be base64-like (allow for padding)
        const base64Pattern = /^[A-Za-z0-9_-]+$/;
        for (const part of parts) {
            if (!base64Pattern.test(part)) {
                console.warn('🚫 Invalid JWT format - invalid characters');
                return false;
            }
        }
        
        return true;
    }

    /**
     * Handle sign out
     */
    async handleSignOut() {
        this.session = null;
        this.user = null;
        currentUser = null;
        authToken = null;
        this.welcomeShownThisSession = false; // Reset welcome flag for next login
        this.userInitialized = false; // Reset user initialization flag for next login
        this.newUserCreditsShown = false; // Reset new user credits flag for next login
        this.sessionId = null; // Clear session ID

        // Clear stored token and session flags
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_session_data');
        
        // Dispatch auth state change event for session manager
        window.dispatchEvent(new CustomEvent('auth-state-changed', {
            detail: {
                isAuthenticated: false,
                user: null,
                session: { event: 'SIGNED_OUT' }
            }
        }));
        
        console.log('ℹ️ User signed out and session cleared.');
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
     * Initialize user profile and credits
     */
    async initializeUser() {
        if (!authToken) return;
        
        // Prevent multiple initialization calls for the same user session
        if (this.userInitialized) {
            console.log('🔄 User already initialized, skipping duplicate call');
            return;
        }

        try {
            // Prepare user data for initialization, including Google profile data
            const userData = {};
            
            // If this is a Google user, include their profile data
            if (this.user && this.user.user_metadata) {
                const metadata = this.user.user_metadata;
                
                // Extract Google profile information
                if (metadata.full_name || metadata.name) {
                    userData.full_name = metadata.full_name || metadata.name;
                }
                
                // Include Google profile picture
                if (metadata.picture || metadata.avatar_url) {
                    userData.avatar_url = metadata.picture || metadata.avatar_url;
                    console.log('📸 Including Google profile picture in user initialization');
                }
                
                // Include provider information
                if (metadata.iss && metadata.iss.includes('google')) {
                    userData.auth_provider = 'google';
                }
            }

            const response = await this.apiRequest('/auth/init-user', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.userInitialized = true; // Mark as initialized
                
                // Only show new user credits message once per session AND only for truly new users
                if (data.is_new_user && !this.newUserCreditsShown) {
                    showSuccess(`Welcome! You've been granted ${data.credits} credits to get started.`);
                    this.newUserCreditsShown = true;
                    console.log('🎉 New user credits message shown');
                } else if (data.is_new_user && this.newUserCreditsShown) {
                    console.log('🔄 New user credits message already shown this session');
                }
                
                // **SECURITY FIX: Sanitized user data logging to prevent exposure of sensitive information**
                console.log('✅ User initialized successfully');
                
                // Save session flags after initialization
                this.saveSessionFlags();
            } else {
                // **SECURITY FIX: Removed data object to prevent backend structure exposure**
            console.error('Failed to initialize user: API response error');
            }
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email, password, recaptchaToken = null) {
        if (!supabaseClient) {
            throw new Error('Supabase client not available');
        }

        try {
            // Call backend login endpoint with reCAPTCHA token first for security
            const response = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email: email,
                    password: password,
                    recaptcha_token: recaptchaToken
                })
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Login failed');
            }

            // Now sign in with Supabase directly to get the session
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw new Error(error.message || 'Authentication failed');
            }

            console.log('✅ Supabase sign-in successful');
            return { success: true, data };
        } catch (error) {
            showError(error.message || 'Sign in failed');
            return { success: false, error: error.message };
        }
    }

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        if (!supabaseClient) {
            throw new Error('Supabase client not available');
        }

        try {
            console.log('🔐 Starting Google OAuth sign in...');
            
            // Use Supabase's Google OAuth
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth?from=google`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) {
                console.error('❌ Google OAuth error:', error);
                throw new Error(error.message || 'Google sign in failed');
            }

            console.log('✅ Google OAuth initiated successfully');
            // Note: The actual authentication completion will be handled by the URL redirect
            // and the onAuthStateChange listener will pick it up
            
            return { success: true };
        } catch (error) {
            console.error('❌ Google sign in failed:', error);
            showError(error.message || 'Google sign in failed');
            return { success: false, error: error.message };
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
        if (!this.supabaseClient) {
            throw new Error('Authentication not configured');
        }

        try {
            // **FIX: Clear any existing session first to prevent interference**
            // This ensures Supabase sends PASSWORD_RECOVERY instead of SIGNED_IN
            const currentSession = await this.supabaseClient.auth.getSession();
            if (currentSession.data.session) {
                console.log('🔄 Clearing existing session before password reset to prevent auto-login');
                await this.supabaseClient.auth.signOut();
            }

            // Use current origin to ensure correct redirect
            const { error } = await this.supabaseClient.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo: `${window.location.origin}/auth/reset-password`
                }
            );

            if (error) {
                // Handle specific error cases for OAuth users
                if (error.message && (
                    error.message.includes('OAuth') || 
                    error.message.includes('external') ||
                    error.message.includes('cannot reset password')
                )) {
                    throw new Error('This account was created with Google. Please sign in using the "Continue with Google" button instead of resetting your password.');
                }
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
        // Quick check for in-memory user
        if (currentUser && this.user) {
            return true;
        }
        
        // **ENHANCED: For page refresh scenarios, check multiple sources**
        if (supabaseClient && !this.isLoading) {
            try {
                // First try to get session synchronously from Supabase storage
                const storedSession = supabaseClient.auth._getSessionFromStorage?.() || 
                                    this.getStoredSupabaseSession();
                
                if (storedSession && storedSession.access_token && storedSession.user) {
                    // Found a valid stored session, update our state immediately
                    currentUser = storedSession.user;
                    this.user = storedSession.user;
                    authToken = storedSession.access_token;
                    this.session = storedSession;
                    
                    // Store token for API calls
                    localStorage.setItem('auth_token', authToken);
                    
                    console.log('✅ Auth state recovered from Supabase storage');
                    
                    // **NEW: Notify session manager for UI updates**
                    if (window.sessionManager && !window.sessionManager.isAuthenticated) {
                        setTimeout(() => {
                            window.sessionManager.handleAuthStateChange(true, this.user, storedSession);
                        }, 0);
                    }
                    
                    return true;
                }
            } catch (error) {
                console.warn('Error checking stored Supabase session:', error);
            }
        }
        
        // **NEW: Check if session manager has auth state but we don't**
        if (window.sessionManager?.isAuthenticated && window.sessionManager.user && !currentUser) {
            console.log('🔄 Session manager has auth state, syncing to auth module');
            currentUser = window.sessionManager.user;
            this.user = window.sessionManager.user;
            
            // Try to get token
            const token = localStorage.getItem('auth_token');
            if (token) {
                authToken = token;
            }
            
            return true;
        }
        
        // **NEW: Final check - do we have a valid stored token but no user?**
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken && this.isValidJWT(storedToken) && !currentUser) {
            console.log('🔄 Found valid token but no user, triggering async verification');
            
            // Trigger async verification (don't wait for it)
            this.verifyStoredToken(storedToken).catch(error => {
                console.warn('Async token verification failed:', error);
            });
        }
        
        return false;
    }
    
    /**
     * NEW: Async method to verify stored token and restore session
     */
    async verifyStoredToken(token) {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (session && session.access_token && !error) {
                console.log('✅ Async session verification successful');
                await this.handleAuthSuccess(session, false, 'TOKEN_VERIFICATION');
                return true;
            }
        } catch (error) {
            console.warn('Async token verification failed:', error);
        }
        return false;
    }
    
    /**
     * Get stored Supabase session from localStorage/sessionStorage
     */
    getStoredSupabaseSession() {
        try {
            // Check localStorage for Supabase session
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase.auth.token')) {
                    const value = localStorage.getItem(key);
                    if (value) {
                        const parsed = JSON.parse(value);
                        if (parsed && parsed.access_token && parsed.user) {
                            return parsed;
                        }
                    }
                }
            }
            
            // Check sessionStorage as fallback
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.includes('supabase.auth.token')) {
                    const value = sessionStorage.getItem(key);
                    if (value) {
                        const parsed = JSON.parse(value);
                        if (parsed && parsed.access_token && parsed.user) {
                            return parsed;
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Error parsing stored Supabase session:', error);
            return null;
        }
    }

    /**
     * Check authentication status from backend
     */
    async checkAuthStatus() {
        try {
            const response = await apiFetch('/auth/status');

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
    async getUserCredits(forceRefresh = false) {
        if (!this.isAuthenticated()) {
            console.log('💎 getUserCredits: Not authenticated, returning 0');
            return 0;
        }

        try {
            console.log(`💎 getUserCredits: Fetching credits from API... (refresh: ${forceRefresh})`);
            const endpoint = forceRefresh ? '/auth/credits?refresh=true' : '/auth/credits';
            const response = await this.apiRequest(endpoint);

            const data = await response.json();
            console.log('💎 getUserCredits: API response:', data);
            
            if (data.success) {
                console.log(`💎 getUserCredits: Returning ${data.credits} credits`);
                return data.credits;
            }
            
            console.warn('💎 getUserCredits: API returned success=false, returning 0');
            return 0;
        } catch (error) {
            console.error('💎 getUserCredits: Error fetching credits:', error);
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
        // Notify registered listeners
        authListeners.forEach(callback => {
            try {
                callback(event, session, currentUser);
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
        
        // Dispatch browser event for cross-component communication
        const authStateEvent = new CustomEvent('auth-state-changed', {
            detail: {
                event,
                isAuthenticated: !!currentUser,
                user: currentUser,
                session: session ? {
                    token: session.access_token,
                    user: session.user,
                    ...session
                } : null
            }
        });
        window.dispatchEvent(authStateEvent);
    }

    /**
     * Centralized method for making authenticated API requests
     * @param {string} endpoint - The API endpoint (e.g., '/api/data')
     * @param {object} options - Options for the fetch call
     * @returns {Promise<Response>}
     */
    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {}
        };

        // Get the latest auth token from Supabase with retry logic
        let sessionToken = null;
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            console.log('💎 API Request - Session check:', session ? 'Found' : 'NULL', endpoint);
            
            if (session && session.access_token) {
                sessionToken = session.access_token;
                defaultOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
            } else {
                console.warn('💎 API Request - No session found, attempting retry...', endpoint);
                
                // Wait a bit and try again (session recovery might still be in progress)
                await new Promise(resolve => setTimeout(resolve, 100));
                const { data: { session: retrySession } } = await supabaseClient.auth.getSession();
                
                if (retrySession && retrySession.access_token) {
                    sessionToken = retrySession.access_token;
                    defaultOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
                    console.log('💎 API Request - Retry successful:', endpoint);
                } else {
                    console.warn('💎 API Request - No token after retry, request may fail:', endpoint);
                }
            }
        } catch (error) {
            console.warn('💎 API Request - Session retrieval failed:', error, endpoint);
        }

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        const response = await apiFetch(endpoint, mergedOptions);

        if (response.status === 401) {
            // **SECURITY FIX: Removed endpoint logging to prevent API structure exposure**
            console.warn('Unauthorized API request detected');
            // Attempt to refresh the token and retry, or sign out
            // For now, we rely on the main auth listener to catch this
            showNotification('Your session may have expired. Please refresh if you see issues.', 'warning');
        }
        
        return response;
    }

    handlePasswordRecoveryPage() {
        // Prevent multiple initializations
        if (this._passwordRecoveryPageInitialized) {
            console.log("Password recovery page already initialized, skipping...");
            return;
        }
        
        console.log("Setting up password recovery page...");
        this._passwordRecoveryPageInitialized = true;

        const resetCard = document.getElementById('resetCard');
        const loadingOverlay = document.getElementById('loadingOverlay');
        const form = document.getElementById('reset-password-form');
        
        if (!resetCard || !form) {
            console.error("Could not find required elements on the password reset page.");
            showError("An error occurred loading the page. Please try again.");
            this._passwordRecoveryPageInitialized = false; // Reset on error
            return;
        }

        // Show loading overlay until we confirm recovery state
        loadingOverlay.classList.add('show');
        
        // Check if we have recovery token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasRecoveryToken = urlParams.get('type') === 'recovery' || 
                               hashParams.get('type') === 'recovery' ||
                               window.location.hash.includes('type=recovery');
        
        // If we're on the reset password page with a recovery token, immediately activate recovery mode
        if (hasRecoveryToken && !sessionManager.isPasswordRecovery) {
            console.log('🔑 Recovery token detected - forcing recovery mode activation');
            sessionManager.activatePasswordRecovery();
        }
        
        // Function to check and show reset form
        const checkAndShowResetForm = () => {
            if (sessionManager.isPasswordRecovery) {
                console.log('✅ Password recovery state confirmed, showing reset form');
                loadingOverlay.classList.remove('show');
                resetCard.style.display = 'block';
                this.setupPasswordResetForm();
                return true;
            }
            return false;
        };
        
        // If we have a recovery token, wait a bit longer for Supabase to process
        if (hasRecoveryToken) {
            console.log('🔑 Recovery token detected in URL, waiting for Supabase to process...');
            
            // Try multiple times with increasing delays
            let attempts = 0;
            const maxAttempts = 5;
            
            const tryShowForm = () => {
                attempts++;
                if (checkAndShowResetForm()) {
                    return;
                }
                
                if (attempts < maxAttempts) {
                    console.log(`⏳ Attempt ${attempts}/${maxAttempts}: Waiting for recovery state...`);
                    setTimeout(tryShowForm, 500 * attempts); // Exponential backoff
                } else {
                    console.error('❌ Failed to confirm recovery state after multiple attempts');
                    showError("Failed to load password reset form. Please try refreshing the page.");
                    loadingOverlay.classList.remove('show');
                }
            };
            
            // Start checking after initial delay
            setTimeout(tryShowForm, 500);
        } else {
            // No recovery token, show error immediately
            console.error('❌ No recovery token found in URL');
            loadingOverlay.classList.remove('show');
            showError("Invalid or expired password reset link.");
            setTimeout(() => window.router.navigate('/auth'), 3000);
        }
    }
    
    setupPasswordResetForm() {
        const form = document.getElementById('reset-password-form');
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const updateBtn = document.getElementById('updatePasswordBtn');
        const formError = document.getElementById('formErrorMessage');

        if (!form || !newPasswordInput || !confirmPasswordInput || !updateBtn) return;

        // Initialize password strength meter and requirements validation
        this.initPasswordStrengthMeter(newPasswordInput.id);
        this.initPasswordRequirementsChecker(newPasswordInput.id);
        this.initPasswordVisibilityToggle();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Clear previous errors
            formError.textContent = '';
            formError.classList.remove('show');

            if (newPassword !== confirmPassword) {
                formError.textContent = "Passwords do not match.";
                formError.classList.add('show');
                return;
            }

            if (!validatePassword(newPassword)) {
                formError.textContent = "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.";
                formError.classList.add('show');
                return;
            }

            this.setLoading(updateBtn, true);

            try {
                // **SECURITY FIX: Reduced session information exposure in logs**
                const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
                console.log('🔍 Password update session check:', {
                    hasValidSession: !!currentSession?.access_token,
                    recoveryMode: sessionManager.isPasswordRecovery
                });
                
                if (!currentSession || !currentSession.access_token) {
                    throw new Error('No valid Supabase session found for password update. Please refresh the page and try again.');
                }

                const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

                if (error) {
                    throw error;
                }
                
                showSuccess('Password updated successfully!', 'You can now log in with your new password.');
                
                // After successful password update, sign the user out completely
                await this.signOut();

                // **ENHANCED: Clear both local and global recovery state**
                sessionManager.clearPasswordRecoveryFlag();
                
                // Navigate to login
                router.navigate('/auth');

            } catch (error) {
                console.error('❌ Failed to update password:', error);
                
                // Handle specific error cases with user-friendly messages
                let errorMessage = 'Password update failed. Please try again.';
                
                if (error.message && error.message.includes('New password should be different')) {
                    errorMessage = 'Your new password must be different from your current password. Please choose a different password.';
                } else if (error.message && error.message.includes('Password should be at least')) {
                    errorMessage = 'Password must be at least 6 characters long. Please choose a longer password.';
                } else if (error.message && error.message.includes('expired')) {
                    errorMessage = 'Your password reset link has expired. Please request a new password reset.';
                    // If expired, sign out and redirect to auth after a delay
                    setTimeout(async () => {
                        await this.signOut();
                        sessionManager.clearPasswordRecoveryFlag();
                        router.navigate('/auth');
                    }, 3000);
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                // Show error in form
                formError.textContent = errorMessage;
                formError.classList.add('show');
                
            } finally {
                this.setLoading(updateBtn, false);
            }
        });

        // **NEW: Add event listener for the exit recovery link**
        const exitLink = document.getElementById('exit-recovery-link');
        if (exitLink) {
            exitLink.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('🚪 User manually exiting password recovery');
                
                // **FIX: Sign out completely to prevent auth restoration in other tabs**
                try {
                    await this.signOut();
                    console.log('✅ Signed out during recovery exit');
                } catch (error) {
                    console.warn('⚠️ Sign out failed during recovery exit:', error);
                }
                
                // Clear recovery state after sign out
                sessionManager.clearPasswordRecoveryFlag();
                router.navigate('/');
            });
        }
    }

    initPasswordStrengthMeter(inputId = 'password') {
        const passwordInput = document.getElementById(inputId);
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');

        if (!passwordInput || !strengthFill || !strengthText) return;

        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = this.calculatePasswordStrength(password);

            // Update bar with proper level classes
            strengthFill.className = `strength-fill ${strength.level}`;
            strengthText.textContent = strength.text;
            strengthText.className = `strength-text ${strength.level}`;
        });
    }

    calculatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;
        
        if (score <= 1) {
            return { level: 'weak', text: 'Weak' };
        } else if (score <= 2) {
            return { level: 'fair', text: 'Fair' };
        } else if (score <= 3) {
            return { level: 'good', text: 'Good' };
        } else {
            return { level: 'strong', text: 'Strong' };
        }
    }

    initPasswordRequirementsChecker(inputId) {
        const passwordInput = document.getElementById(inputId);
        const requirements = {
            length: document.getElementById('req-length'),
            lower: document.getElementById('req-lower'),
            upper: document.getElementById('req-upper'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        if (!passwordInput) return;

        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            
            // Check each requirement
            this.updateRequirement(requirements.length, password.length >= 8);
            this.updateRequirement(requirements.lower, /[a-z]/.test(password));
            this.updateRequirement(requirements.upper, /[A-Z]/.test(password));
            this.updateRequirement(requirements.number, /[0-9]/.test(password));
            
            // Check for special characters - comprehensive list
            this.updateRequirement(requirements.special, /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password));
        });
    }

    updateRequirement(element, isMet) {
        if (!element) return;
        
        if (isMet) {
            element.classList.add('met');
        } else {
            element.classList.remove('met');
        }
    }

    initPasswordVisibilityToggle() {
        const toggles = document.querySelectorAll('.password-toggle');
        toggles.forEach(toggle => {
            // Prevent duplicate listeners
            if (toggle.dataset.listenerAttached) return;

            toggle.addEventListener('click', () => {
                const targetId = toggle.dataset.target;
                const passwordInput = document.getElementById(targetId);
                if (passwordInput) {
                    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                    passwordInput.setAttribute('type', type);
                    toggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
                }
            });
            toggle.dataset.listenerAttached = 'true';
        });
    }
    
    /**
     * NEW: Trigger session recovery check to detect and handle server restart issues
     */
    triggerSessionRecoveryCheck(trigger = 'unknown') {
        // **FIX: Prevent recovery loops by tracking recent attempts**
        const now = Date.now();
        const lastRecoveryKey = 'last_session_recovery_attempt';
        const lastAttempt = parseInt(localStorage.getItem(lastRecoveryKey) || '0');
        
        // Don't attempt recovery if we just did one in the last 30 seconds
        if (now - lastAttempt < 30000) {
            console.log(`🔄 Skipping recovery check - too recent (${Math.round((now - lastAttempt) / 1000)}s ago)`);
            return;
        }
        
        console.log(`🔄 Triggering session recovery check (trigger: ${trigger})`);
        localStorage.setItem(lastRecoveryKey, now.toString());
        
        // Small delay to allow auth state to stabilize
        setTimeout(async () => {
            try {
                // Test if session is working properly by checking critical endpoints
                const isWorking = await this.testSessionHealth();
                
                if (!isWorking) {
                    console.warn('🔄 Session health check failed - possible server restart detected');
                    
                    // Notify UI components that session recovery is needed
                    window.dispatchEvent(new CustomEvent('session-recovery-needed', {
                        detail: { trigger, timestamp: Date.now() }
                    }));
                    
                    // Try to refresh session automatically
                    const recovered = await this.attemptSessionRecovery();
                    
                    if (recovered) {
                        console.log('✅ Session recovery successful');
                        window.dispatchEvent(new CustomEvent('session-recovery-successful', {
                            detail: { trigger, timestamp: Date.now() }
                        }));
                    } else {
                        console.warn('❌ Session recovery failed');
                        window.dispatchEvent(new CustomEvent('session-recovery-failed', {
                            detail: { trigger, timestamp: Date.now() }
                        }));
                    }
                }
            } catch (error) {
                console.error('❌ Session recovery check failed:', error);
            }
        }, 1000); // 1 second delay
    }

    /**
     * NEW: Test session health by trying critical operations
     */
    async testSessionHealth() {
        try {
            // Test 1: Try to fetch user credits (common failure after restart)
            const credits = await this.getUserCredits();
            
            // Test 2: Try to verify auth status with proper token
            const token = this.getAuthToken();
            if (!token) {
                console.warn('🔄 No auth token available for health check');
                return false;
            }
            
            const response = await this.apiRequest('/auth/verify', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
            
            if (!response.ok) {
                console.warn('🔄 Auth verification failed in health check');
                return false;
            }
            
            // If we get here, session seems healthy
            console.log('✅ Session health check passed');
            return true;
            
        } catch (error) {
            console.warn('🔄 Session health check failed:', error);
            return false;
        }
    }

    /**
     * NEW: Attempt to recover session after server restart
     */
    async attemptSessionRecovery() {
        try {
            console.log('🔄 Attempting session recovery...');
            
            // Get current session from Supabase
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error) {
                console.error('🔄 Failed to get session for recovery:', error);
                return false;
            }
            
            if (!session) {
                console.warn('🔄 No session available for recovery');
                return false;
            }
            
            // Try to refresh the session
            const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
            
            if (refreshError) {
                console.error('🔄 Session refresh failed:', refreshError);
                return false;
            }
            
            if (refreshData.session) {
                console.log('✅ Session refreshed successfully');
                
                // Update local state
                this.session = refreshData.session;
                this.user = refreshData.session.user;
                
                // Store updated token
                localStorage.setItem('auth_token', refreshData.session.access_token);
                
                // Notify session manager
                if (window.sessionManager && typeof window.sessionManager.notifyStateChange === 'function') {
                    window.sessionManager.user = this.user;
                    window.sessionManager.isAuthenticated = true;
                    window.sessionManager.notifyStateChange();
                }
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Session recovery attempt failed:', error);
            return false;
        }
    }

    setLoading(button, isLoading) {
        const btnText = button.querySelector('.btn-text');
        btnText.textContent = isLoading ? 'Processing...' : 'Update Password';
        button.disabled = isLoading;
    }
}

// Create singleton instance
const auth = new AuthModule();

// Export the instance
export { auth };
export { supabaseClient }; 