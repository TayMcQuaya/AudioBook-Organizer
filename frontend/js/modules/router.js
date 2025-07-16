// AudioBook Organizer - Simple Client-Side Router

import { showError, showInfo } from './notifications.js';
import { auth } from './auth.js';
import { sessionManager } from './sessionManager.js';
import { tempAuthManager } from './tempAuth.js';
import { initializeBookUpload, uploadBook } from './bookUpload.js';
import { apiFetch } from './api.js';
import envManager from './envManager.js';
import appConfig from '../config/appConfig.js';

// Router state
let currentRoute = '/';
let routes = new Map();
let guards = new Map();

// Route definitions
const routeConfig = {
    '/': {
        title: 'AudioBook Organizer - Organize Your Digital Library',
        component: 'landing',
        requiresAuth: false,
        layout: 'landing'
    },
    '/temp-auth': {
        title: 'Access Required - AudioBook Organizer',
        component: 'temp-auth',
        requiresAuth: false,
        layout: 'temp-auth'
    },
    '/app': {
        title: 'AudioBook Organizer - App',
        component: 'app',
        requiresAuth: true, // App requires authentication
        layout: 'app'
    },
    '/auth': {
        title: 'Sign In - AudioBook Organizer',
        component: 'auth',
        requiresAuth: false,
        layout: 'auth'
    },
    '/auth/reset-password': {
        title: 'Reset Password - AudioBook Organizer',
        component: 'reset-password',
        requiresAuth: false, // Page is public, but requires a token in the URL
        layout: 'auth'
    },
    '/profile': {
        title: 'Profile - AudioBook Organizer',
        component: 'profile',
        requiresAuth: true, // Profile requires authentication
        layout: 'app'
    },
    '/payment/success': {
        title: 'Payment Successful - AudioBook Organizer',
        component: 'payment-success',
        requiresAuth: true, // Payment success requires authentication
        layout: 'app'
    },
    '/payment/cancelled': {
        title: 'Payment Cancelled - AudioBook Organizer',
        component: 'payment-cancelled',
        requiresAuth: true, // Payment cancelled requires authentication
        layout: 'app'
    },
    '/payment/failed': {
        title: 'Payment Failed - AudioBook Organizer',
        component: 'payment-failed',
        requiresAuth: true, // Payment failed requires authentication
        layout: 'app'
    },
    '/privacy': {
        title: 'Privacy Policy - AudioBook Organizer',
        component: 'privacy',
        requiresAuth: false,
        layout: 'landing'
    },
    '/terms': {
        title: 'Terms of Service - AudioBook Organizer',
        component: 'terms',
        requiresAuth: false,
        layout: 'landing'
    },
    '/contact': {
        title: 'Contact Us - AudioBook Organizer',
        component: 'contact',
        requiresAuth: false,
        layout: 'landing'
    }
};

// Router class
class Router {
    constructor() {
        if (Router.instance) {
            return Router.instance;
        }
        
        this.currentRoute = '/';
        this.previousRoute = null;
        this.isInitialized = false;
        this.isLoading = false;
        
        // Bind methods
        this.navigate = this.navigate.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
        
        Router.instance = this;
    }
    
    async init() {
        if (this.isInitialized) return;
        
        console.log('🌐 Starting router initialization...');
        const startTime = Date.now();
        
        try {
            // STEP 1: Initialize environment manager (critical first step)
            await envManager.init();
            
            // STEP 2: Initialize app configuration based on environment
            const envConfig = envManager.getConfig();
            appConfig.init(envConfig.server_type, envConfig.testing_mode);
            
            console.log('✅ Environment and configuration initialized');
            
            // STEP 3: Apply environment settings immediately
            envManager.applyEnvironmentSettings();
            
            // **PERFORMANCE: Run authentication, layout, and DOM stability in parallel**
            console.log('🚀 Running parallel initialization tasks...');
            
            await Promise.all([
                appConfig.delay('domReadyDelay'),
                this._initializeAuthentication(envConfig),
                this._ensureLayoutStability()
            ]);
            
            // Set up event listeners (synchronous)
            this._setupEventListeners();
            
            // Wait for auth state to be ready (only if needed)
            if (!envConfig.testing_mode || !tempAuthManager.shouldBypassAuth()) {
                await this.waitForAuthReady();
            }
            
            // **PERFORMANCE: Reduce final initialization delay**
            await appConfig.delay('initializationDelay');
            
            // STEP 10: Handle initial route
            // **FIX: Include hash in initial route to preserve recovery tokens**
            const initialPath = window.location.pathname + window.location.search + window.location.hash;
            await this.handleRoute(initialPath);
            
            this.isInitialized = true;
            appConfig.logTiming('Router initialization', startTime);
            console.log('✅ Router initialization complete');
            
        } catch (error) {
            console.error('❌ Router initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Initialize authentication based on environment
     */
    async _initializeAuthentication(envConfig) {
        console.log('🔐 Initializing authentication...');
        
        // Initialize temp auth manager first with environment config
        const tempAuthResult = await tempAuthManager.init(envConfig);
        
        if (envConfig.testing_mode) {
            console.log('🧪 Testing mode: Using temporary authentication');
            
            if (!tempAuthResult) {
                // Temp auth redirected us, don't continue with router init
                console.log('🔄 Temp auth redirect detected, stopping router init');
                return false;
            }
            
            // Make tempAuthManager globally available
            window.tempAuthManager = tempAuthManager;
            
        } else {
            console.log('🔑 Normal mode: Using Supabase authentication');
            
            // Initialize auth module first
            console.log('🔧 Initializing auth module...');
            await auth.init();
            window.authModule = auth;
            console.log('✅ Auth module initialized and available globally');
            
            // Initialize session manager after auth module
            console.log('🔧 Initializing session manager...');
            await sessionManager.init();
            window.sessionManager = sessionManager;
            console.log('✅ Session manager initialized and available globally');
            
            // Attempt session recovery if we have stored auth but no current session
            if (!sessionManager.isAuthenticated && this.hasAnyStoredAuth()) {
                console.log('🔄 Attempting session recovery for page refresh...');
                const recoverySuccess = await this.attemptSessionRecovery();
                
                if (recoverySuccess) {
                    console.log('✅ Session recovery completed successfully');
                } else {
                    console.log('⚠️ Session recovery failed, proceeding as unauthenticated');
                }
            } else if (sessionManager.isAuthenticated) {
                console.log('✅ User already authenticated');
            } else {
                console.log('ℹ️ No stored auth found, proceeding as unauthenticated');
            }
            
            // Make temp auth manager available for compatibility
            window.tempAuthManager = tempAuthManager;
        }
        
        return true;
    }
    
    /**
     * Attempt to recover session state on page refresh
     */
    async attemptSessionRecovery() {
        try {
            console.log('🔄 Starting session recovery attempt...');
            
            // Check if we have any stored authentication data
            if (this.hasAnyStoredAuth()) {
                console.log('🔍 Found stored auth data, attempting recovery...');
                
                // Give Supabase a moment to initialize if needed
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // **ENHANCED: Try multiple recovery approaches**
                
                // 1. Try session manager's auth check first (most comprehensive)
                if (window.sessionManager && typeof window.sessionManager.checkAuthStatus === 'function') {
                    console.log('🔄 Using session manager for recovery...');
                    await window.sessionManager.checkAuthStatus();
                    
                    if (window.sessionManager.isAuthenticated) {
                        console.log('✅ Session manager recovery successful');
                        return true;
                    }
                }
                
                // 2. Try to get current session from Supabase directly
                if (window.authModule?.supabaseClient) {
                    console.log('🔄 Checking Supabase session directly...');
                    
                    const { data: { session }, error } = await window.authModule.supabaseClient.auth.getSession();
                    
                    if (session && !error) {
                        console.log('✅ Found valid Supabase session, updating state...');
                        
                        // **ENHANCED: Update both auth module and session manager**
                        if (window.authModule) {
                            window.authModule.user = session.user;
                            window.authModule.session = session;
                            console.log('✅ Auth module state updated');
                        }
                        
                        // Update session manager state
                        if (!sessionManager.isAuthenticated) {
                            sessionManager.handleAuthStateChange(true, session.user, session);
                            console.log('✅ Session manager state updated');
                        }
                        
                        console.log('✅ Session recovery completed successfully');
                        return true;
                    } else {
                        console.log('🚫 No valid Supabase session found:', error?.message || 'Unknown error');
                    }
                }
                
                // 3. Final attempt: Check stored JWT token
                const storedToken = localStorage.getItem('auth_token');
                if (storedToken && window.authModule?.isValidJWT(storedToken)) {
                    console.log('🔄 Attempting recovery with stored JWT token...');
                    
                    try {
                        // Try to verify token with backend
                        const response = await fetch('/api/auth/verify', {
                            method: 'POST',
                            headers: { 
                                'Authorization': `Bearer ${storedToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ token: storedToken })
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.user) {
                                console.log('✅ Token verification successful, restoring session');
                                
                                // Create session object
                                const mockSession = {
                                    access_token: storedToken,
                                    user: data.user
                                };
                                
                                // Update both auth systems
                                if (window.authModule) {
                                    window.authModule.user = data.user;
                                    window.authModule.session = mockSession;
                                }
                                
                                sessionManager.handleAuthStateChange(true, data.user, mockSession);
                                
                                console.log('✅ Token-based session recovery completed');
                                return true;
                            }
                        }
                    } catch (error) {
                        console.warn('Token verification failed:', error);
                    }
                }
                
                // Fallback: trigger session manager to check auth status
                console.log('🔄 Triggering session manager auth check...');
                await sessionManager.checkAuthStatus();
                
                // Final check to see if recovery succeeded
                if (sessionManager.isAuthenticated || window.authModule?.isAuthenticated?.()) {
                    console.log('✅ Session recovery successful via session manager');
                    return true;
                } else {
                    console.log('⚠️ Session recovery failed - stored auth may be expired');
                    return false;
                }
            } else {
                console.log('ℹ️ No stored auth data found, proceeding as unauthenticated');
                return false;
            }
        } catch (error) {
            console.warn('⚠️ Session recovery attempt failed:', error);
            // Continue anyway - the app should work without session recovery
            return false;
        }
    }
    
    /**
     * Ensure layout stability across environments
     */
    async _ensureLayoutStability() {
        console.log('🎨 Ensuring layout stability...');
        
        // Apply layout class immediately
        document.body.classList.add('layout-ready');
        
        // Force single column layout if on localhost (to match production)
        const envConfig = envManager.getConfig();
        if (envConfig.server_type === 'flask-dev') {
            document.body.classList.add('single-column-layout');
            console.log('🔧 Applied single-column layout for local development');
        }
        
        // Wait for CSS to be applied
        await appConfig.delay('cssApplicationDelay');
        
        // Ensure layout stabilization
        await appConfig.delay('layoutStabilizationDelay');
    }
    
    /**
     * Set up event listeners
     */
    _setupEventListeners() {
        // Listen for browser back/forward
        window.addEventListener('popstate', this.handlePopState);
        
        // Handle internal link clicks
        document.addEventListener('click', this.handleLinkClick);
        
        console.log('📡 Event listeners set up');
    }
    
    /**
     * Wait for authentication state to be properly initialized
     */
    async waitForAuthReady() {
        return new Promise((resolve) => {
            console.log('⏳ Waiting for auth state to be ready...');
            
            // Check multiple sources for stored auth tokens
            const hasAuthToken = localStorage.getItem('auth_token');
            const hasSupabaseSession = localStorage.getItem('sb-') || // Supabase session storage prefix
                                     sessionStorage.getItem('sb-') ||
                                     this.checkSupabaseLocalStorageKeys();
            
            // If there's no evidence of any stored authentication, resolve immediately
            if (!hasAuthToken && !hasSupabaseSession) {
                console.log('✅ No stored auth found, proceeding...');
                resolve();
                return;
            }
            
            // If already authenticated, resolve immediately
            if (sessionManager.isAuthenticated || window.authModule?.isAuthenticated?.()) {
                console.log('✅ Already authenticated, proceeding...');
                resolve();
                return;
            }
            
            console.log('🔍 Found stored auth, waiting for session recovery...');
            
            // Listen for auth state changes
            const checkAuthReady = (event) => {
                const isAuth = sessionManager.isAuthenticated || window.authModule?.isAuthenticated?.();
                console.log('🔄 Auth state change detected:', event.detail?.event, 'isAuth:', isAuth);
                
                if (isAuth || !this.hasAnyStoredAuth()) {
                    window.removeEventListener('auth-state-changed', checkAuthReady);
                    console.log('✅ Auth state ready, proceeding...');
                    resolve();
                }
            };
            
            window.addEventListener('auth-state-changed', checkAuthReady);
            
            // Give Supabase time to process INITIAL_SESSION event
            // Longer timeout for page refresh scenarios
            setTimeout(() => {
                window.removeEventListener('auth-state-changed', checkAuthReady);
                console.log('⏰ Auth wait timeout, proceeding anyway...');
                resolve();
            }, 5000); // Increased from 3 to 5 seconds for reliable session recovery
        });
    }
    
    /**
     * Check for Supabase session keys in localStorage
     */
    checkSupabaseLocalStorageKeys() {
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('supabase') || key && key.startsWith('sb-')) {
                    const value = localStorage.getItem(key);
                    if (value && value.includes('access_token')) {
                        return true;
                    }
                }
            }
            return false;
        } catch (error) {
            console.warn('Error checking Supabase localStorage keys:', error);
            return false;
        }
    }
    
    /**
     * Check if there's any stored authentication data
     */
    hasAnyStoredAuth() {
        return localStorage.getItem('auth_token') || 
               sessionStorage.getItem('auth_token') ||
               this.checkSupabaseLocalStorageKeys();
    }
    
    // Navigate to a route
    async navigate(path, replace = false) {
        // **CRITICAL FIX: Block navigation during password recovery**
        if (sessionManager && sessionManager.isPasswordRecovery) {
            const currentPath = window.location.pathname;
            const targetPath = new URL(path, window.location.origin).pathname;
            
            // If we're on reset password page, block navigation to any other page
            if (currentPath === '/auth/reset-password' && targetPath !== '/auth/reset-password') {
                console.log('🚫 NAVIGATION BLOCKED: Cannot navigate away from password reset during recovery');
                console.log(`🚫 Attempted: ${currentPath} → ${targetPath}`);
                return;
            }
        }
        
        // Extract pathname from URL for comparison
        const url = new URL(path, window.location.origin);
        const pathname = url.pathname;
        
        if (pathname === this.currentRoute) return;
        
        this.previousRoute = this.currentRoute;
        
        if (replace) {
            window.history.replaceState({ path }, '', path);
        } else {
            window.history.pushState({ path }, '', path);
        }
        
        await this.handleRoute(path);
    }
    
    // Handle route changes
    async handleRoute(path = null, state = {}) {
        // If already loading, ignore new requests unless it's a popstate
        if (this.isLoading && !state.isPopState) {
            console.warn('Router is already loading a page, ignoring request.');
            return;
        }
        
        this.isLoading = true;
        
        // Extract pathname for route matching, but preserve full path for navigation
        const fullPath = path || window.location.pathname + window.location.search;
        const targetPath = path ? new URL(path, window.location.origin).pathname : window.location.pathname;
        const route = routeConfig[targetPath];
        
        try {
            if (!route) {
                console.warn(`Route not found: ${fullPath} (pathname: ${targetPath})`);
                await this.navigate('/', true);
                return;
            }
            
            // **TESTING MODE CHECKS**
            const envConfig = envManager.getConfig();
            console.log('🔍 Debug: envConfig.testing_mode =', envConfig.testing_mode, 'tempAuthManager.isTestingMode =', tempAuthManager.isTestingMode);
            
            if (tempAuthManager.isTestingMode) {
                // If not authenticated in testing mode, redirect to temp-auth page
                if (!tempAuthManager.isAuthenticated && targetPath !== '/temp-auth') {
                    console.log('🧪 Testing mode: Redirecting to temp authentication');
                    this.isLoading = false; // Reset loading state before redirect
                    await this.navigate('/temp-auth', true);
                    return;
                }
                
                // Block access to normal auth pages in testing mode (redirect to temp-auth)
                if ((targetPath === '/auth' || targetPath === '/auth/reset-password' || targetPath === '/profile') && tempAuthManager.shouldBlockAuthPages()) {
                    console.log('🧪 Testing mode: Blocking auth page access');
                    this.isLoading = false; // Reset loading state before redirect
                    await this.navigate('/temp-auth', true);
                    return;
                }
                
                // If authenticated and on temp-auth page, redirect to app
                if (tempAuthManager.isAuthenticated && targetPath === '/temp-auth') {
                    console.log('🧪 Testing mode: Already authenticated, redirecting to app');
                    this.isLoading = false; // Reset loading state before redirect
                    await this.navigate('/app', true);
                    return;
                }
            }
            
            // **NEW: Clean up previous page's resources before loading new one**
            await this.cleanupCurrentPage();
            
            // Resolve authentication status
            const isAuthenticated = state.isAuthenticated ?? (tempAuthManager.shouldBypassAuth() ? true : sessionManager.isAuthenticated);
            const isPasswordRecovery = tempAuthManager.shouldBypassAuth() ? false : sessionManager.isPasswordRecovery;
            
            // **FIXED: Only block authenticated routes during password recovery, allow public pages**
            if (isPasswordRecovery && route.requiresAuth) {
                console.log('In password recovery mode, blocking access to authenticated route:', targetPath);
                showInfo('Please complete your password reset first, or exit recovery mode to access this page.');
                this.isLoading = false; // Reset loading state before redirect
                await this.navigate('/auth/reset-password', { pushState: false });
                return;
            }
            
            // **SAFETY CHECK: Clear orphaned recovery state if navigating to non-recovery public pages**
            if (isPasswordRecovery && !route.requiresAuth && targetPath !== '/auth/reset-password') {
                sessionManager.checkAndCleanupRecoveryState();
            }

            // Check authentication requirements
            if (route.requiresAuth && !isAuthenticated) {
                // Special case: If this is a Google OAuth callback to /app, wait for auth to process
                const isGoogleOAuthToApp = fullPath.includes('from=google') && targetPath === '/app';
                if (isGoogleOAuthToApp) {
                    console.log('🔄 Google OAuth callback detected, waiting for auth processing...');
                    // Wait a moment for Supabase to process the OAuth tokens
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    // Check auth again after waiting
                    if (sessionManager.isAuthenticated) {
                        console.log('✅ Authentication completed after OAuth processing');
                        // Continue to load the app
                    } else {
                        console.warn('⚠️ OAuth processing failed, redirecting to auth');
                        this.isLoading = false; // Reset loading state before redirect
                        await this.navigate('/auth');
                        return;
                    }
                } else {
                    console.warn(`🔒 Route ${targetPath} requires authentication. Redirecting to login.`);
                    showInfo('Please sign in to access this page');
                    this.isLoading = false; // Reset loading state before redirect
                    await this.navigate('/auth');
                    return;
                }
            }
            
            // Redirect authenticated users away from auth page, UNLESS it's a password recovery flow
            if (targetPath === '/auth' && isAuthenticated && !isPasswordRecovery) {
                // Check if this is a Google OAuth callback - if so, don't redirect here as auth module will handle it
                const isGoogleCallback = fullPath.includes('from=google');
                if (!isGoogleCallback) {
                    console.log('👤 User already authenticated, redirecting to app');
                    this.isLoading = false; // Reset loading state before redirect
                    await this.navigate('/app');
                    return;
                }
            }

            // Update current route (use pathname for consistency)
            this.currentRoute = targetPath;
            
            // Update document title
            document.title = route.title;
            
            // Load the appropriate content
            await this.loadRoute(route);
            
            // Track navigation
            this.trackNavigation(targetPath);
        } catch (error) {
            console.error('Error handling route:', error);
            showError('Failed to load page. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }
    
    // Load route content
    async loadRoute(route) {
        try {
            switch (route.component) {
                case 'landing':
                    await this.loadLandingPage();
                    break;
                case 'temp-auth':
                    await this.loadTempAuthPage();
                    break;
                case 'app':
                    await this.loadApp();
                    break;
                case 'auth':
                    await this.loadAuthPage();
                    break;
                case 'reset-password':
                    await this.loadResetPasswordPage();
                    break;
                case 'profile':
                    await this.loadProfilePage();
                    break;
                case 'payment-success':
                    await this.loadPaymentSuccessPage();
                    break;
                case 'payment-cancelled':
                    await this.loadPaymentCancelledPage();
                    break;
                case 'payment-failed':
                    await this.loadPaymentFailedPage();
                    break;
                case 'privacy':
                    await this.loadPrivacyPage();
                    break;
                case 'terms':
                    await this.loadTermsPage();
                    break;
                case 'contact':
                    await this.loadContactPage();
                    break;
                default:
                    throw new Error(`Unknown component: ${route.component}`);
            }
        } catch (error) {
            console.error('Error loading route:', error);
            showError('Failed to load page. Please try again.');
        }
    }
    
    // Load landing page
    async loadLandingPage() {
        try {
            // **FIX: Ensure appContainer exists or create it for page transitions**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                // If no appContainer exists (e.g., we're coming from app page), create one
                console.log('🔧 Creating appContainer for page transition');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                
                // Replace the current page content with the container
                document.body.innerHTML = '';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links that might have been removed
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }

            // Clean up app-specific resources
            if (window.isAppInitialized) {
                // Only do minimal cleanup for landing page - keep app state intact
                if (window.cleanupTextSelection) {
                    window.cleanupTextSelection();
                }
                
                // DON'T reset isAppInitialized - this allows faster navigation back to app
                console.log('🔧 App resources cleaned for landing page, but keeping app initialized');
            }

            // Ensure landing page CSS is loaded and app CSS is removed
            let landingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (!landingCSS) {
                landingCSS = document.createElement('link');
                landingCSS.rel = 'stylesheet';
                landingCSS.href = '/css/landing.css';
                document.head.appendChild(landingCSS);
            }

            // Load landing page HTML
            const response = await fetch('/pages/landing/landing.html');
            if (!response.ok) throw new Error(`Failed to fetch landing page: ${response.status}`);
            const html = await response.text();

            // Extract body content and inject it
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            appContainer.innerHTML = doc.body.innerHTML;

            document.body.className = 'landing-body app-ready';

            // Load landing page JavaScript
            const { initLandingPage, cleanupLandingPage } = await import('/pages/landing/landing.js');
            initLandingPage();
            window.cleanupLandingPage = cleanupLandingPage; // Make cleanup available to the router

            // Scroll to top and make container visible
            window.scrollTo(0, 0);
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);

        } catch (error) {
            console.error('Error loading landing page:', error);
            showError('Failed to load landing page');
        }
    }
    
    // Load temp auth page
    async loadTempAuthPage() {
        try {
            console.log('🔧 Loading temp auth page...');
            // **FIX: Ensure appContainer exists or create it for page transitions**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for temp auth page transition');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                
                // Replace the current page content with the container
                document.body.innerHTML = '';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }

            // Load temp auth page HTML
            console.log('🔧 Fetching temp-auth.html...');
            const response = await fetch('/pages/temp-auth/temp-auth.html');
            if (!response.ok) throw new Error(`Failed to fetch temp auth page: ${response.status}`);
            const html = await response.text();
            console.log('🔧 HTML fetched successfully');

            // Parse the HTML and extract both head and body content
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Debug: Check what document was parsed
            console.log('🔧 Parsed document title:', doc.title);
            // **SECURITY FIX: Removed content preview logging to prevent exposure**
        console.log('🔧 Document body content parsed successfully');
            
            // Extract and inject the styles from the temp-auth page
            const styles = doc.querySelector('style');
            if (styles) {
                // Remove any existing temp-auth styles first
                const existingTempAuthStyles = document.querySelector('#temp-auth-styles');
                if (existingTempAuthStyles) {
                    existingTempAuthStyles.remove();
                }
                
                // Create a new style element with ID for easy cleanup
                const newStyleElement = document.createElement('style');
                newStyleElement.id = 'temp-auth-styles';
                newStyleElement.textContent = styles.textContent;
                document.head.appendChild(newStyleElement);
                console.log('🔧 Temp auth styles injected');
            }
            
            // Extract body content and inject it
            const bodyContent = doc.body.innerHTML;
            console.log('🔧 Temp-auth body content length:', bodyContent.length);
            // **SECURITY FIX: Removed content preview logging to prevent exposure**
            console.log('🔧 Content extracted successfully');
            
            // Verify this is actually temp-auth content by checking for the temp-auth-container
            if (!bodyContent.includes('temp-auth-container')) {
                console.error('❌ ERROR: Extracted content does not contain temp-auth-container!');
                console.error('🔧 This suggests wrong HTML file was parsed or extraction failed');
                // **SECURITY FIX: Removed HTML content logging to prevent exposure**
            console.error('🔧 Failed to extract content from fetched HTML');
                throw new Error('Wrong HTML content extracted - missing temp-auth-container');
            }
            
            appContainer.innerHTML = bodyContent;

            // Force DOM to flush/render
            appContainer.offsetHeight; // Trigger reflow
            
            document.body.className = 'temp-auth-body app-ready';
            
            // Ensure the loading screen is hidden and appContainer is visible
            const loadingScreen = document.getElementById('appLoading');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Make sure appContainer is visible
            appContainer.style.display = 'block';
            appContainer.style.opacity = '1';
            
            // Force another reflow
            appContainer.offsetHeight;
            
            console.log('🔧 Loading screen hidden, temp-auth content should be visible');

            // Wait a moment for DOM to be ready, then load the script
            console.log('🔧 Loading temp-auth script...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for DOM
            
            // Add debugging to verify DOM injection worked
            const tempForm = document.getElementById('tempAuthForm');
            console.log('🔧 DOM check after injection - tempAuthForm found:', !!tempForm);
            console.log('🔧 appContainer innerHTML length:', appContainer.innerHTML.length);
            // **SECURITY FIX: Removed HTML content logging to prevent exposure**
            console.log('🔧 appContainer content injected successfully');
            
            // Debug: Show content length instead of actual content
            console.log('🔧 Injected HTML content length:', appContainer.innerHTML.length);
            console.log('🔧 Searching for form elements in injected HTML...');
            console.log('🔧 Forms found via querySelectorAll:', appContainer.querySelectorAll('form').length);
            console.log('🔧 Elements with tempAuthForm ID:', appContainer.querySelectorAll('#tempAuthForm').length);
            console.log('🔧 All elements with IDs containing "temp":', appContainer.querySelectorAll('[id*="temp"]').length);
            
            // Debug: Check if there are nested containers
            const tempAuthContainer = appContainer.querySelector('.temp-auth-container');
            console.log('🔧 temp-auth-container found:', !!tempAuthContainer);
            if (tempAuthContainer) {
                console.log('🔧 Forms inside temp-auth-container:', tempAuthContainer.querySelectorAll('form').length);
            }
            
            try {
                // Import the temp-auth module to ensure it initializes
                await import('/pages/temp-auth/temp-auth.js?t=' + Date.now());
                console.log('🔧 Temp-auth script loaded');
            } catch (scriptError) {
                console.error('Error loading temp-auth script:', scriptError);
            }

            console.log('✅ Temp auth page loaded successfully');

        } catch (error) {
            console.error('Error loading temp auth page:', error);
            
            // Fallback: Create the temp auth form programmatically
            console.log('🔧 Attempting fallback: Creating temp auth form programmatically...');
            
            try {
                // **FIX: Ensure appContainer exists even for fallback**
                let appContainer = document.getElementById('appContainer');
                if (!appContainer) {
                    console.log('🔧 Creating appContainer for temp auth fallback');
                    appContainer = document.createElement('div');
                    appContainer.id = 'appContainer';
                    appContainer.style.opacity = '0';
                    appContainer.style.transition = 'opacity 0.5s ease-in-out';
                    
                    // Replace the current page content with the container
                    document.body.innerHTML = '';
                    document.body.appendChild(appContainer);
                }
                
                // Create the temp auth form HTML directly
                const tempAuthHTML = `
                    <div class="temp-auth-container" style="
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 3rem;
                        max-width: 400px;
                        width: 90%;
                        margin: 2rem auto;
                        text-align: center;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: white;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    ">
                        <div class="logo" style="font-size: 3rem; margin-bottom: 1rem;">🎧</div>
                        <h1 class="title" style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">AudioBook Organizer</h1>
                        <p class="subtitle" style="font-size: 1rem; opacity: 0.8; margin-bottom: 2rem;">Access Required</p>
                        
                        <div class="testing-badge" style="
                            background: rgba(255, 193, 7, 0.2);
                            color: #ffc107;
                            padding: 0.5rem 1rem;
                            border-radius: 20px;
                            font-size: 0.9rem;
                            margin-bottom: 2rem;
                            border: 1px solid rgba(255, 193, 7, 0.3);
                        ">
                            ⚡ Early Access Mode
                        </div>
                        
                        <div id="errorMessage" class="error-message" style="
                            background: rgba(244, 67, 54, 0.2);
                            border: 1px solid rgba(244, 67, 54, 0.5);
                            color: #ff6b6b;
                            padding: 1rem;
                            border-radius: 10px;
                            margin-bottom: 1rem;
                            font-size: 0.9rem;
                            display: none;
                        "></div>
                        
                        <form id="tempAuthForm">
                            <div class="form-group" style="margin-bottom: 1.5rem; text-align: left;">
                                <label for="password" class="form-label" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Enter Access Password</label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password" 
                                    class="form-input" 
                                    placeholder="Password"
                                    required
                                    autocomplete="current-password"
                                    style="
                                        width: 100%;
                                        padding: 1rem;
                                        border: 2px solid rgba(255, 255, 255, 0.2);
                                        border-radius: 10px;
                                        background: rgba(255, 255, 255, 0.1);
                                        color: white;
                                        font-size: 1rem;
                                        transition: all 0.3s ease;
                                        box-sizing: border-box;
                                    "
                                >
                            </div>
                            
                            <button type="submit" class="submit-btn" id="submitBtn" style="
                                width: 100%;
                                padding: 1rem;
                                background: rgba(255, 255, 255, 0.2);
                                border: 2px solid rgba(255, 255, 255, 0.3);
                                border-radius: 10px;
                                color: white;
                                font-size: 1rem;
                                font-weight: 600;
                                cursor: pointer;
                                transition: all 0.3s ease;
                            ">
                                Access Application
                            </button>
                            
                            <div id="loadingIndicator" class="loading-indicator" style="display: none; margin-top: 1rem;">
                                <div class="loading-spinner" style="
                                    width: 20px;
                                    height: 20px;
                                    border: 2px solid rgba(255, 255, 255, 0.3);
                                    border-top: 2px solid white;
                                    border-radius: 50%;
                                    animation: spin 1s linear infinite;
                                    margin: 0 auto;
                                "></div>
                            </div>
                        </form>
                        
                        <p class="footer-note" style="margin-top: 2rem; font-size: 0.8rem; opacity: 0.6;">
                            This is an early access method for testing purposes.
                        </p>
                    </div>
                `;
                
                // Set body background and inject HTML
                document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                document.body.style.minHeight = '100vh';
                document.body.style.display = 'flex';
                document.body.style.alignItems = 'center';
                document.body.style.justifyContent = 'center';
                document.body.className = 'temp-auth-body app-ready';
                
                appContainer.innerHTML = tempAuthHTML;
                appContainer.style.display = 'block';
                appContainer.style.opacity = '1';
                
                // Hide loading screen
                const loadingScreen = document.getElementById('appLoading');
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                }
                
                console.log('✅ Fallback temp auth form created successfully');
                
                // Load the script
                await new Promise(resolve => setTimeout(resolve, 100));
                await import('/pages/temp-auth/temp-auth.js?t=' + Date.now());
                
                console.log('✅ Fallback temp auth page loaded successfully');
                
            } catch (fallbackError) {
                console.error('Error in fallback temp auth creation:', fallbackError);
                // Show a basic error message
                if (document.getElementById('appContainer')) {
                    document.getElementById('appContainer').innerHTML = `
                        <div style="text-align: center; padding: 2rem; color: white;">
                            <h1>Unable to load authentication page</h1>
                            <p>Please refresh the page or contact support.</p>
                        </div>
                    `;
                }
            }
        }
    }
    
    // Load main app
    async loadApp() {
        try {
            console.log('📱 Loading main application...');
            
            // **REVERTED: Keep router-based approach but eliminate CSS flash**
            // This maintains all existing navigation patterns while fixing the CSS issue
            
            // **FIX: Handle case where we're already on app page (no appContainer needed)**
            const appContainer = document.getElementById('appContainer');
            const isAlreadyOnAppPage = document.body.classList.contains('app-body') && 
                                      document.querySelector('.main-container');
            
            if (!appContainer && !isAlreadyOnAppPage) {
                throw new Error('App container not found for router.');
            }
            
            if (isAlreadyOnAppPage) {
                console.log('✅ Already on app page, skipping HTML injection');
                // If we're already on the app page, we don't need to load HTML
                // Just ensure auth and initialize
            } else {
                // **NEW: Inject skeleton UI before loading actual content**
                console.log('🦴 Injecting app skeleton UI...');
                this.injectAppSkeleton();
            }

            // **OPTIMIZED: Pre-load CSS to eliminate flash**
            if (!isAlreadyOnAppPage) {
                console.log('🎨 Pre-loading app CSS to prevent flash...');
                
                // **FIXED: Simplified CSS loading to prevent hangs**
                const requiredCSS = [
                    '/css/main.css',
                    '/css/components.css', 
                    '/css/themes.css',
                    '/css/table-of-contents.css',
                    '/css/formatting.css',
                    '/css/skeleton.css'  // Add skeleton CSS for app page
                ];
                
                const cssPromises = requiredCSS.map(href => {
                    return new Promise((resolve) => {
                        // Check if already loaded and working
                        const existingLink = document.querySelector(`link[href="${href}"]`);
                        if (existingLink && existingLink.sheet && existingLink.sheet.cssRules) {
                            console.log(`✅ CSS already loaded: ${href}`);
                            resolve();
                            return;
                        }
                        
                        // Always create a new link element to avoid race conditions
                        const link = document.createElement('link');
                        link.rel = 'stylesheet';
                        link.href = href;
                        
                        const onLoad = () => {
                            console.log(`✅ CSS loaded: ${href}`);
                            resolve();
                        };
                        
                        const onError = () => {
                            console.warn(`⚠️ Failed to load CSS: ${href}`);
                            resolve(); // Don't block on CSS load failures
                        };
                        
                        link.addEventListener('load', onLoad, { once: true });
                        link.addEventListener('error', onError, { once: true });
                        
                        // Set a timeout fallback
                        setTimeout(() => {
                            console.warn(`⏰ CSS load timeout: ${href}`);
                            resolve();
                        }, 3000);
                        
                        document.head.appendChild(link);
                    });
                });
                
                // Wait for all CSS to load with overall timeout
                try {
                    await Promise.race([
                        Promise.all(cssPromises),
                        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second max wait
                    ]);
                } catch (error) {
                    console.warn('⚠️ CSS loading error:', error);
                }
                
                // **IMPROVED: Add extra delay for local development CSS processing**
                const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalDev) {
                    console.log('🔧 Local development detected, adding CSS processing delay...');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                console.log('✅ App CSS pre-loaded successfully');
            }

            // Check if we need to load the app HTML shell first (only if not already on app page)
            if (!isAlreadyOnAppPage && !document.body.classList.contains('app-body')) {
                // Remove landing CSS to prevent conflicts
                const landingCSS = document.querySelector('link[href="/css/landing.css"]');
                if (landingCSS) {
                    landingCSS.remove();
                }

                // Clean up any landing page scripts/event listeners
                const landingScript = document.getElementById('landing-page-script');
                if (landingScript) {
                    landingScript.remove();
                }
                
                // Ensure scroll position is reset BEFORE changing body class to prevent layout shift
                window.scrollTo(0, 0);
                
                // **CRITICAL: Apply CSS classes BEFORE content injection**
                document.body.className = 'app-body layout-ready';
                
                // Small delay to ensure CSS is applied
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Only load app HTML if not already loaded (and we have an appContainer)
            if (appContainer && !appContainer.querySelector('.main-container')) {
                console.log('🔧 Loading app HTML structure...');
                
                // Fetch and inject the actual app UI
                const response = await fetch('/pages/app/app.html');
                if (!response.ok) throw new Error(`Failed to fetch app page: ${response.status}`);
                const appHtml = await response.text();
                console.log('✅ App HTML fetched successfully');
                
                // Parse the HTML and extract only the body content
                const parser = new DOMParser();
                const doc = parser.parseFromString(appHtml, 'text/html');
                const bodyContent = doc.body.innerHTML;
                
                // **IMPROVED: Inject content with CSS already loaded and ensure proper styling**
                // First, remove skeleton if present
                this.removeAppSkeleton();
                
                // Then inject the actual content
                appContainer.innerHTML = bodyContent;
                
                // Ensure critical layout classes are applied
                document.body.classList.add('layout-ready');
                if (tempAuthManager.isTestingMode) {
                    document.body.classList.add('testing-mode');
                }
                
                // **PERFORMANCE: Force immediate layout calculation**
                appContainer.offsetHeight; // Trigger reflow
                
                // **IMPROVED: Additional delay for CSS application in local development**
                const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (isLocalDev) {
                    console.log('🔧 Local development: allowing extra time for CSS application...');
                    await new Promise(resolve => setTimeout(resolve, 50));
                    // Force another layout calculation after delay
                    appContainer.offsetHeight;
                }
                
                console.log('✅ App HTML injected with CSS pre-loaded - no flash!');
            } else {
                console.log('✅ App HTML already loaded, skipping injection');
            }
            
            // Ensure auth module is available before app initialization
            if (!window.authModule && !tempAuthManager.isTestingMode) {
                console.log('🔧 Auth module not found, initializing authentication...');
                await this._initializeAuthentication(this.envConfig);
            }

            // **CRITICAL FIX: Always attempt session recovery BEFORE checking app reuse**
            // This ensures authentication state is properly restored from storage before any other checks
            if (!tempAuthManager.isTestingMode) {
                console.log('🔄 Ensuring session recovery before app load...');
                
                // Check if we have stored auth but current session manager isn't authenticated
                const hasStoredAuth = this.hasAnyStoredAuth();
                const isCurrentlyAuthenticated = window.sessionManager?.isAuthenticated || window.authModule?.isAuthenticated?.();
                
                if (hasStoredAuth && !isCurrentlyAuthenticated) {
                    console.log('🔄 Found stored auth but not currently authenticated - forcing session recovery...');
                    const recoverySuccess = await this.attemptSessionRecovery();
                    
                    if (recoverySuccess) {
                        console.log('✅ Session recovery completed before app load');
                        // Give the auth state change events time to propagate
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } else {
                        console.log('⚠️ Session recovery failed, proceeding as unauthenticated');
                    }
                } else if (isCurrentlyAuthenticated) {
                    console.log('✅ Already authenticated, no recovery needed');
                } else {
                    console.log('ℹ️ No stored auth found');
                }
            }

            // **IMPROVED: Now check app reuse with properly restored authentication state**
            const isAuthenticatedNow = window.authModule?.isAuthenticated?.() || window.sessionManager?.isAuthenticated || tempAuthManager.shouldBypassAuth();
            
            if (window.isAppInitialized && isAuthenticatedNow) {
                console.log('✅ App already initialized and user authenticated, reusing existing app state');
                
                try {
                    // Ensure the UI is properly updated for the current user
                    if (window.appUI && window.appUI.getComprehensiveAuthState) {
                        const authState = window.appUI.getComprehensiveAuthState();
                        if (authState.isAuthenticated && authState.user) {
                            console.log('🔄 Refreshing UI with current auth state');
                            window.appUI.updateUI(authState);
                        } else {
                            console.log('⚠️ Auth state incomplete, forcing UI refresh');
                            // Force UI manager to re-check all auth sources
                            await window.appUI.init();
                        }
                    }
                    
                    // Initialize/refresh essential features that might have been cleaned up
                    await this.refreshEssentialFeatures();
                    
                    console.log('📱 App reused successfully - skipping full initialization');
                    return;
                    
                } catch (error) {
                    console.error('❌ Error refreshing app features:', error);
                    // Fall back to full initialization if refresh fails
                    window.isAppInitialized = false;
                    console.log('🔄 Falling back to full initialization due to refresh error');
                }
            } else if (window.isAppInitialized && !isAuthenticatedNow) {
                console.log('⚠️ App was initialized but user is no longer authenticated - full reinit needed');
                window.isAppInitialized = false;
            }
            
            // Initialize app if not already initialized
            if (!window.isAppInitialized) {
                console.log('🔧 App not initialized yet, starting initialization...');
                
                try {
                    // In testing mode, wait a moment to ensure auth status is properly set
                    if (tempAuthManager.isTestingMode) {
                        console.log('🧪 Testing mode: Waiting for auth status to be properly set...');
                        
                        // Wait for either auth success event or timeout
                        await new Promise((resolve) => {
                            const timeout = setTimeout(resolve, 500); // Max 500ms wait
                            
                            const handleAuthSuccess = () => {
                                clearTimeout(timeout);
                                window.removeEventListener('temp-auth-success', handleAuthSuccess);
                                resolve();
                            };
                            
                            // If already authenticated, resolve immediately
                            if (tempAuthManager.isAuthenticated) {
                                clearTimeout(timeout);
                                resolve();
                            } else {
                                window.addEventListener('temp-auth-success', handleAuthSuccess);
                            }
                        });
                        
                        console.log('🧪 Testing mode: Auth status check complete, proceeding with app init');
                    }
                    
                    console.log('🔧 Starting dynamic import of main.js...');
                    
                    // Use the robust module loader
                    const { moduleLoader } = await import('./moduleLoader.js');
                    const appModule = await moduleLoader.loadMainApp();
                    
                    console.log(`✅ App module loaded via ${appModule.loadMethod}`);
                    
                    // Initialize the app
                    await appModule.initialize();
                    window.cleanupApp = appModule.cleanup;
                    window.isAppInitialized = true;
                    console.log('✅ App initialization complete');
                } catch (error) {
                    console.error('❌ Error initializing app:', error);
                    window.isAppInitialized = false;
                }
            } else {
                console.log('✅ App already initialized, skipping initialization');
            }
            
            console.log('📱 App loaded successfully');
            
            // Scroll to top to ensure consistent positioning regardless of where user clicked from
            window.scrollTo(0, 0);
            
        } catch (error) {
            console.error('Error loading app:', error);
            showError('Failed to load application');
        }
    }
    
    // Load auth page
    async loadAuthPage() {
        try {
            // **FIX: Ensure appContainer exists or create it for page transitions**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for auth page transition');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                
                // Replace the current page content with the container
                document.body.innerHTML = '';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }

            // Clean up app-specific resources only if actually leaving the app context
            if (window.isAppInitialized) {
                // Only do minimal cleanup for auth page - don't fully destroy app
                if (window.cleanupTextSelection) {
                    window.cleanupTextSelection();
                }
                
                // DON'T reset isAppInitialized - this causes unnecessary reinitializations
                // when navigating back to app. The app can be reused.
                console.log('🔧 App resources cleaned for auth page, but keeping app initialized');
            }

            // Clean up any existing auth scripts
            const existingAuthScript = document.getElementById('auth-page-script');
            if (existingAuthScript) {
                existingAuthScript.remove();
            }

            // Clean up any landing page scripts
            const landingScript = document.getElementById('landing-page-script');
            if (landingScript) {
                landingScript.remove();
            }

            // Remove conflicting CSS files that can interfere with auth styling
            const conflictingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (conflictingCSS) {
                conflictingCSS.remove();
            }

            // Ensure auth page CSS is loaded and takes precedence
            let authCSS = document.querySelector('link[href="/css/auth.css"]');
            if (!authCSS) {
                authCSS = document.createElement('link');
                authCSS.rel = 'stylesheet';
                authCSS.href = '/css/auth.css';
                // Add at the end to ensure it has higher priority
                document.head.appendChild(authCSS);
            } else {
                // Move existing auth CSS to the end to ensure priority
                document.head.appendChild(authCSS);
            }

            // Load auth page HTML
            const response = await fetch('/pages/auth/auth.html');
            if (!response.ok) throw new Error(`Failed to fetch auth page: ${response.status}`);
            const html = await response.text();

            // Extract body content and inject it, but exclude script tags from the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Remove any script tags from the parsed document to avoid conflicts
            const scripts = doc.querySelectorAll('script');
            scripts.forEach(script => script.remove());
            
            appContainer.innerHTML = doc.body.innerHTML;

            document.body.className = 'auth-body app-ready';

            // Load auth page JavaScript with proper module loading
            const { initAuthPage, cleanupAuthPage } = await import('/pages/auth/main.js');
            initAuthPage(auth);
            window.cleanupAuthPage = cleanupAuthPage; // Make cleanup available

            // **PERFORMANCE: Make appContainer visible with smooth transition**
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);

            console.log('🔐 Auth page loaded successfully');
            
        } catch (error) {
            console.error('Error loading auth page:', error);
            showError('Failed to load authentication page');
        }
    }
    
    // Load password reset page
    async loadResetPasswordPage() {
        try {
            // **FIX: Ensure appContainer exists or create it for page transitions**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for password reset page transition');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                
                // Replace the current page content with the container
                document.body.innerHTML = '';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }

            // Ensure correct body class and remove conflicting assets
            document.body.className = 'auth-body app-ready';
            const landingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (landingCSS) landingCSS.remove();
            const landingScript = document.getElementById('landing-page-script');
            if (landingScript) landingScript.remove();

            // Ensure auth page CSS is loaded for reset password page
            let authCSS = document.querySelector('link[href="/css/auth.css"]');
            if (!authCSS) {
                authCSS = document.createElement('link');
                authCSS.rel = 'stylesheet';
                authCSS.href = '/css/auth.css';
                document.head.appendChild(authCSS);
            } else {
                // Move existing auth CSS to the end to ensure priority
                document.head.appendChild(authCSS);
            }

            // Load reset password page HTML
            const response = await fetch('/pages/auth/reset-password.html');
            if (!response.ok) throw new Error(`Failed to fetch reset password page: ${response.status}`);
            
            appContainer.innerHTML = await response.text();

            // The auth module will handle the logic after this
            if (window.authModule) {
                window.authModule.handlePasswordRecoveryPage();
            } else {
                console.error("Auth module not initialized for password recovery page.");
                showError("An error occurred. Please try again.");
            }
        } catch (error) {
            console.error('Error loading reset password page:', error);
            showError('Failed to load the password reset page.');
        }
    }
    
    // Load profile page
    async loadProfilePage() {
        try {
            // Profile will be part of the app for now
            await this.loadApp();
            showInfo('Profile management coming soon!');
        } catch (error) {
            console.error('Error loading profile page:', error);
            showError('Failed to load profile page');
        }
    }
    
    // Load payment success page
    async loadPaymentSuccessPage() {
        try {
            // Get session ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            
            if (!sessionId) {
                console.error('No session ID found in URL');
                await this.navigate('/app');
                return;
            }

            // Wait for auth module to be ready if it's not available yet
            if (!window.authModule) {
                console.log('⏳ Auth module not available, waiting for initialization...');
                await new Promise((resolve) => {
                    const checkAuth = () => {
                        if (window.authModule && typeof window.authModule.isAuthenticated === 'function') {
                            console.log('✅ Auth module is now available');
                            resolve();
                        } else {
                            setTimeout(checkAuth, 100);
                        }
                    };
                    checkAuth();
                });
            }

            // Debug log the auth module state
            console.log('🔍 Auth module state:', {
                available: !!window.authModule,
                methods: window.authModule ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.authModule)) : 'N/A',
                isAuthenticated: window.authModule ? window.authModule.isAuthenticated() : false
            });
            
            // **FIX: Use consistent container management like other pages**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                // Create main container and clear existing content completely
                console.log('🔧 Creating appContainer for payment success page');
                document.body.innerHTML = '';
                
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }
            
            // Show loading state
            appContainer.innerHTML = `
                <div class="payment-success-container">
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>Verifying your payment...</p>
                    </div>
                </div>
            `;
            
            // Verify payment with backend
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add authentication token if available
            if (window.authModule && window.authModule.isAuthenticated()) {
                try {
                    // Try getAuthToken first (new method), fallback to getToken for compatibility
                    const token = window.authModule.getAuthToken?.() || window.authModule.getToken?.();
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.warn('Error getting auth token:', error);
                    // Try alternative token sources
                    const storedToken = localStorage.getItem('auth_token');
                    if (storedToken) {
                        headers['Authorization'] = `Bearer ${storedToken}`;
                    }
                }
            }
            
            const response = await fetch(`/api/stripe/session/${sessionId}`, {
                credentials: 'include',
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error('Failed to verify payment');
            }
            
            const data = await response.json();
            
            if (data.success) {
                const session = data.session;
                const credits = session.metadata?.credits || '0';
                const packageType = session.metadata?.package_type || 'Unknown';
                
                // Show success page
                appContainer.innerHTML = `
                    <div class="payment-success-container">
                        <div class="success-content">
                            <div class="success-icon">✅</div>
                            <h1>Payment Successful!</h1>
                            <p>Thank you for your purchase. Your credits have been added to your account.</p>
                            
                            <div class="payment-details">
                                <div class="detail-item">
                                    <span class="label">Package:</span>
                                    <span class="value">${packageType.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Credits Added:</span>
                                    <span class="value">${credits}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="label">Payment Status:</span>
                                    <span class="value">Completed</span>
                                </div>
                            </div>
                            
                            <div class="success-actions">
                                <button class="btn primary" onclick="router.handlePaymentSuccessNavigation()">
                                    Continue to App
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add CSS for payment success page
                if (!document.querySelector('#payment-success-css')) {
                    const style = document.createElement('style');
                    style.id = 'payment-success-css';
                    style.textContent = `
                        .payment-success-container {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 100vh;
                            padding: 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        
                        .success-content {
                            background: white;
                            border-radius: 15px;
                            padding: 40px;
                            text-align: center;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                            max-width: 500px;
                            width: 100%;
                        }
                        
                        .success-icon {
                            font-size: 64px;
                            margin-bottom: 20px;
                        }
                        
                        .success-content h1 {
                            color: #2d3748;
                            margin-bottom: 10px;
                        }
                        
                        .payment-details {
                            margin: 30px 0;
                            text-align: left;
                        }
                        
                        .detail-item {
                            display: flex;
                            justify-content: space-between;
                            padding: 10px 0;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        
                        .detail-item:last-child {
                            border-bottom: none;
                        }
                        
                        .label {
                            font-weight: 600;
                            color: #4a5568;
                        }
                        
                        .value {
                            color: #2d3748;
                        }
                        
                        .success-actions {
                            margin-top: 30px;
                        }
                        
                        .loading-container {
                            text-align: center;
                            padding: 40px;
                            color: white;
                        }
                        
                        .loading-spinner {
                            border: 4px solid rgba(255,255,255,0.3);
                            border-radius: 50%;
                            border-top: 4px solid white;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin: 0 auto 20px;
                        }
                        
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // **PERFORMANCE: Make appContainer visible with smooth transition**
                setTimeout(() => {
                    appContainer.style.opacity = '1';
                }, 100);
                
            } else {
                throw new Error(data.error || 'Payment verification failed');
            }
            
        } catch (error) {
            console.error('Error loading payment success page:', error);
            
            // Show error state
            const errorContainer = document.getElementById('appContainer') || document.getElementById('app');
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div class="payment-success-container">
                        <div class="success-content">
                            <div class="error-icon">❌</div>
                            <h1>Payment Verification Failed</h1>
                            <p>We couldn't verify your payment. Please contact support if you were charged.</p>
                            
                            <div class="success-actions">
                                <button class="btn primary" onclick="router.navigate('/app')">
                                    Return to App
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    }

    async loadPaymentCancelledPage() {
        try {
            console.log('💳 Loading payment cancelled page...');
            
            // **FIX: Use consistent container management like other pages**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                // Create main container and clear existing content completely
                console.log('🔧 Creating appContainer for payment cancelled page');
                document.body.innerHTML = '';
                
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }
            
            // Show cancelled page content
            appContainer.innerHTML = `
                <div class="payment-result-container">
                    <div class="result-content">
                        <div class="cancelled-icon">❌</div>
                        <h1>Payment Cancelled</h1>
                        <p>Your payment was cancelled. No charges were made to your account.</p>
                        
                        <div class="result-details">
                            <p>You can try again anytime to purchase credits and continue using our service.</p>
                        </div>
                        
                        <div class="result-actions">
                            <button class="btn primary" onclick="router.navigate('/app')">
                                Return to App
                            </button>
                            <button class="btn secondary" onclick="router.navigateToLandingPricing()">
                                View Pricing
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add CSS for payment result pages
            this.addPaymentResultCSS();
            
            // **PERFORMANCE: Make appContainer visible with smooth transition**
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            console.error('Error loading payment cancelled page:', error);
            // Fallback to app page
            await this.navigate('/app');
        }
    }

    async loadPaymentFailedPage() {
        try {
            console.log('💳 Loading payment failed page...');
            
            // **FIX: Use consistent container management like other pages**
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                // Create main container and clear existing content completely
                console.log('🔧 Creating appContainer for payment failed page');
                document.body.innerHTML = '';
                
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
                
                // Restore necessary CSS links
                if (!document.querySelector('link[href="/css/main.css"]')) {
                    const mainCSS = document.createElement('link');
                    mainCSS.rel = 'stylesheet';
                    mainCSS.href = '/css/main.css';
                    document.head.appendChild(mainCSS);
                }
            }
            
            // Get error details from URL if available
            const urlParams = new URLSearchParams(window.location.search);
            const errorMessage = urlParams.get('error') || 'An error occurred during payment processing';
            
            // Show failed page content
            appContainer.innerHTML = `
                <div class="payment-result-container">
                    <div class="result-content">
                        <div class="failed-icon">⚠️</div>
                        <h1>Payment Failed</h1>
                        <p>We couldn't process your payment. Please try again or use a different payment method.</p>
                        
                        <div class="result-details">
                            <div class="detail-item">
                                <span class="label">Error:</span>
                                <span class="value">${errorMessage}</span>
                            </div>
                            <p class="help-text">If you continue to experience issues, please contact our support team.</p>
                        </div>
                        
                        <div class="result-actions">
                            <button class="btn primary" onclick="router.navigateToLandingPricing()">
                                View Pricing
                            </button>
                            <button class="btn secondary" onclick="router.navigate('/app')">
                                Return to App
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add CSS for payment result pages
            this.addPaymentResultCSS();
            
            // **PERFORMANCE: Make appContainer visible with smooth transition**
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            console.error('Error loading payment failed page:', error);
            // Fallback to app page
            await this.navigate('/app');
        }
    }

    // Helper method to add shared CSS for payment result pages
    addPaymentResultCSS() {
        if (!document.querySelector('#payment-result-css')) {
            const style = document.createElement('style');
            style.id = 'payment-result-css';
            style.textContent = `
                .payment-result-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                
                .result-content {
                    background: white;
                    border-radius: 15px;
                    padding: 40px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    max-width: 500px;
                    width: 100%;
                }
                
                .cancelled-icon, .failed-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                
                .cancelled-icon {
                    color: #f56565;
                }
                
                .failed-icon {
                    color: #ed8936;
                }
                
                .result-content h1 {
                    color: #2d3748;
                    margin-bottom: 10px;
                    font-size: 2rem;
                }
                
                .result-content p {
                    color: #4a5568;
                    margin-bottom: 20px;
                    line-height: 1.6;
                }
                
                .result-details {
                    margin: 30px 0;
                    text-align: left;
                }
                
                .detail-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e2e8f0;
                    margin-bottom: 15px;
                }
                
                .label {
                    font-weight: 600;
                    color: #4a5568;
                }
                
                .value {
                    color: #2d3748;
                    word-break: break-word;
                }
                
                .help-text {
                    font-size: 0.9rem;
                    color: #718096;
                    font-style: italic;
                    text-align: center;
                    margin-top: 15px;
                }
                
                .result-actions {
                    margin-top: 30px;
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .result-actions .btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-decoration: none;
                    display: inline-block;
                }
                
                .result-actions .btn.primary {
                    background: #667eea;
                    color: white;
                }
                
                .result-actions .btn.primary:hover {
                    background: #5a67d8;
                    transform: translateY(-1px);
                }
                
                .result-actions .btn.secondary {
                    background: #e2e8f0;
                    color: #4a5568;
                }
                
                .result-actions .btn.secondary:hover {
                    background: #cbd5e0;
                    transform: translateY(-1px);
                }
                
                @media (max-width: 768px) {
                    .result-actions {
                        flex-direction: column;
                    }
                    
                    .result-actions .btn {
                        width: 100%;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Helper method to show pricing modal (can be implemented later)
    async showPricingModal() {
        try {
            // Try to load the stripe module and show pricing
            const { stripeService } = await import('/js/modules/stripe.js');
            if (stripeService && typeof stripeService.showPricingModal === 'function') {
                stripeService.showPricingModal();
            } else {
                // Fallback: navigate to app page where pricing should be available
                await this.navigate('/app');
                showInfo('Please use the "Buy Credits" button to view pricing options.');
            }
        } catch (error) {
            console.error('Error showing pricing modal:', error);
            await this.navigate('/app');
        }
    }

    // Navigate to landing page pricing section
    async navigateToLandingPricing() {
        try {
            console.log('🏠 Navigating to landing page pricing section...');
            
            // Use window.location.href to ensure we go to landing page with hash
            window.location.href = '/#pricing';
            
        } catch (error) {
            console.error('Error navigating to landing pricing:', error);
            // Fallback: just go to landing page
            window.location.href = '/';
        }
    }

    // Load privacy page
    async loadPrivacyPage() {
        try {
            console.log('📜 Loading privacy page...');
            
            const response = await fetch('/pages/privacy/privacy.html');
            if (!response.ok) {
                throw new Error(`Failed to load privacy page: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Ensure appContainer exists
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for privacy page');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
            }
            
            // Ensure landing CSS is loaded for navigation styles
            let landingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (!landingCSS) {
                landingCSS = document.createElement('link');
                landingCSS.rel = 'stylesheet';
                landingCSS.href = '/css/landing.css';
                document.head.appendChild(landingCSS);
            }
            
            // Ensure privacy page CSS is loaded first
            let privacyCSS = document.querySelector('link[href="/pages/privacy/privacy.css"]');
            if (!privacyCSS) {
                privacyCSS = document.createElement('link');
                privacyCSS.rel = 'stylesheet';
                privacyCSS.href = '/pages/privacy/privacy.css';
                document.head.appendChild(privacyCSS);
                
                // Wait for CSS to load
                await new Promise((resolve) => {
                    privacyCSS.onload = resolve;
                    privacyCSS.onerror = resolve; // Resolve even on error to prevent hanging
                });
                
                // Small delay to ensure styles are applied
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Set body class before content injection
            document.body.className = 'privacy-body';
            
            // Extract body content and inject it
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            appContainer.innerHTML = doc.body.innerHTML;
            
            // Load privacy page specific JavaScript
            const { initPrivacyPage, cleanupPrivacyPage } = await import('/pages/privacy/main.js');
            initPrivacyPage();
            window.cleanupPrivacyPage = cleanupPrivacyPage;
            
            // Scroll to top and make container visible
            window.scrollTo(0, 0);
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            console.error('Error loading privacy page:', error);
            showError('Failed to load privacy page');
            await this.navigate('/');
        }
    }

    // Load terms page
    async loadTermsPage() {
        try {
            console.log('📜 Loading terms page...');
            
            const response = await fetch('/pages/terms/terms.html');
            if (!response.ok) {
                throw new Error(`Failed to load terms page: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Ensure appContainer exists
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for terms page');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
            }
            
            // Ensure landing CSS is loaded for navigation styles
            let landingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (!landingCSS) {
                landingCSS = document.createElement('link');
                landingCSS.rel = 'stylesheet';
                landingCSS.href = '/css/landing.css';
                document.head.appendChild(landingCSS);
            }
            
            // Ensure terms page CSS is loaded first
            let termsCSS = document.querySelector('link[href="/pages/terms/terms.css"]');
            if (!termsCSS) {
                termsCSS = document.createElement('link');
                termsCSS.rel = 'stylesheet';
                termsCSS.href = '/pages/terms/terms.css';
                document.head.appendChild(termsCSS);
                
                // Wait for CSS to load
                await new Promise((resolve) => {
                    termsCSS.onload = resolve;
                    termsCSS.onerror = resolve; // Resolve even on error to prevent hanging
                });
                
                // Small delay to ensure styles are applied
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Set body class before content injection
            document.body.className = 'terms-body';
            
            // Extract body content and inject it
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            appContainer.innerHTML = doc.body.innerHTML;
            
            // Load terms page specific JavaScript
            const { initTermsPage, cleanupTermsPage } = await import('/pages/terms/main.js');
            initTermsPage();
            window.cleanupTermsPage = cleanupTermsPage;
            
            // Scroll to top and make container visible
            window.scrollTo(0, 0);
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            console.error('Error loading terms page:', error);
            showError('Failed to load terms page');
            await this.navigate('/');
        }
    }

    // Load contact page
    async loadContactPage() {
        try {
            console.log('📧 Loading contact page...');
            
            const response = await fetch('/pages/contact/contact.html');
            if (!response.ok) {
                throw new Error(`Failed to load contact page: ${response.status}`);
            }
            
            const html = await response.text();
            
            // Ensure appContainer exists
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for contact page');
                appContainer = document.createElement('div');
                appContainer.id = 'appContainer';
                appContainer.style.opacity = '0';
                appContainer.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(appContainer);
            }
            
            // Ensure landing CSS is loaded for navigation styles
            let landingCSS = document.querySelector('link[href="/css/landing.css"]');
            if (!landingCSS) {
                landingCSS = document.createElement('link');
                landingCSS.rel = 'stylesheet';
                landingCSS.href = '/css/landing.css';
                document.head.appendChild(landingCSS);
            }
            
            // Ensure contact page CSS is loaded first
            let contactCSS = document.querySelector('link[href="/pages/contact/contact.css"]');
            if (!contactCSS) {
                contactCSS = document.createElement('link');
                contactCSS.rel = 'stylesheet';
                contactCSS.href = '/pages/contact/contact.css';
                document.head.appendChild(contactCSS);
                
                // Wait for CSS to load
                await new Promise((resolve) => {
                    contactCSS.onload = resolve;
                    contactCSS.onerror = resolve; // Resolve even on error to prevent hanging
                });
                
                // Small delay to ensure styles are applied
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            // Set body class before content injection
            document.body.className = 'contact-body';
            
            // Extract body content and inject it
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            appContainer.innerHTML = doc.body.innerHTML;
            
            // Load contact page specific JavaScript
            const { initContactPage, cleanupContactPage } = await import('/pages/contact/main.js');
            initContactPage();
            window.cleanupContactPage = cleanupContactPage;
            
            // Scroll to top and make container visible
            window.scrollTo(0, 0);
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);
            
        } catch (error) {
            console.error('Error loading contact page:', error);
            showError('Failed to load contact page');
            await this.navigate('/');
        }
    }

    // Handle navigation from payment success page with credit refresh
    async handlePaymentSuccessNavigation() {
        try {
            console.log('💎 Handling post-payment navigation - refreshing credits...');
            
            // First, navigate to the app
            await this.navigate('/app');
            
            // Then refresh credits after a short delay to ensure the app is loaded
            setTimeout(async () => {
                try {
                    const { updateUserCredits } = await import('/js/modules/appUI.js');
                    await updateUserCredits();
                    console.log('✅ Credits refreshed after payment success');
                } catch (error) {
                    console.warn('⚠️ Failed to refresh credits after payment:', error);
                }
            }, 1000); // 1 second delay to ensure app is fully loaded
            
        } catch (error) {
            console.error('Error handling payment success navigation:', error);
            // Fallback to regular navigation
            await this.navigate('/app');
        }
    }
    
    // Refresh essential features for fast app reuse
    async refreshEssentialFeatures() {
        console.log('🔄 Refreshing essential app features...');
        
        try {
            // 1. Refresh credit system
            console.log('💎 Refreshing credit display...');
            const { initializeCreditsDisplay, updateUserCredits } = await import('/js/modules/appUI.js');
            
            // Always ensure credit display exists
            initializeCreditsDisplay();
            
            // Update credits if user is authenticated
            if (window.authModule && window.authModule.isAuthenticated()) {
                await updateUserCredits();
                console.log('✅ Credits refreshed');
            }
            
            // 2. Check if project needs restoration (only if content is missing)
            console.log('📂 Checking project restoration needs...');
            const bookContent = document.getElementById('bookContent');
            const hasContent = bookContent && bookContent.textContent.trim().length > 0;
            
            if (!hasContent && (window.authModule?.isAuthenticated?.() || window.sessionManager?.isAuthenticated)) {
                console.log('📂 No content detected, attempting project restoration...');
                const { loadFromDatabase } = await import('/js/modules/storage.js');
                const restored = await loadFromDatabase();
                if (restored) {
                    console.log('✅ Project restored during fast navigation');
                } else {
                    console.log('📭 No project to restore');
                }
            } else if (hasContent) {
                console.log('📝 Content already present, skipping project restoration');
            } else {
                console.log('👤 User not authenticated, skipping project restoration');
            }
            
            // 3. Restart auto-save if it was stopped
            console.log('💾 Ensuring auto-save is active...');
            const { startAutoSave } = await import('/js/modules/storage.js');
            startAutoSave();
            
            // 4. Reinitialize Table of Contents if content was restored
            console.log('📋 Ensuring Table of Contents is properly initialized...');
            if (window.initializeTableOfContents && typeof window.initializeTableOfContents === 'function') {
                try {
                    window.initializeTableOfContents();
                    console.log('✅ Table of Contents reinitialized');
                } catch (error) {
                    console.warn('⚠️ Table of Contents initialization failed:', error);
                }
            }
            
            console.log('✅ Essential features refreshed successfully');
            
        } catch (error) {
            console.error('❌ Error refreshing essential features:', error);
            throw error; // Re-throw to trigger fallback to full initialization
        }
    }
    
    // Handle popstate events
    handlePopState(event) {
        // **ENHANCED FIX: More robust password recovery protection**
        // Prevent ANY navigation away from reset password page during recovery
        if (sessionManager && sessionManager.isPasswordRecovery) {
            const currentPath = window.location.pathname;
            const targetPath = event.state ? event.state.path : '/';
            
            // If we're on reset password page, block navigation to any other page
            if (currentPath === '/auth/reset-password' && targetPath !== '/auth/reset-password') {
                console.log('🚫 BLOCKED: Preventing navigation away from password reset page during recovery');
                console.log(`🚫 Attempted navigation from ${currentPath} to ${targetPath}`);
                return;
            }
            
            // Log for debugging
            console.log('🔑 Popstate during recovery - Current:', currentPath, 'Target:', targetPath);
        }
        
        const path = event.state ? event.state.path : '/';
        this.handleRoute(path, { ...(event.state || {}), isPopState: true });
    }
    
    // Handle link clicks
    handleLinkClick(event) {
        const link = event.target.closest('a[data-link]');
        if (!link) return;
        
        event.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
            this.navigate(href);
        }
    }
    
    // Track navigation (for analytics)
    trackNavigation(path) {
        console.log(`📊 Navigation tracked: ${path}`);
    }

    // Check if user is authenticated
    isAuthenticated() {
        return sessionManager.isAuthenticated;
    }
    
    // Get current user
    getCurrentUser() {
        return sessionManager.user;
    }

    /**
     * NEW: Inject app skeleton UI while loading
     */
    injectAppSkeleton() {
        const appContainer = document.getElementById('appContainer');
        if (!appContainer) return;
        
        // Create skeleton HTML matching app structure
        const skeletonHTML = `
            <div class="skeleton-ui" id="appSkeletonUI">
                <div class="skeleton-header">
                    <div class="skeleton-brand"></div>
                    <div class="skeleton-nav">
                        <div class="skeleton-nav-item"></div>
                        <div class="skeleton-nav-item"></div>
                        <div class="skeleton-nav-item"></div>
                    </div>
                </div>
                <div class="skeleton-main">
                    <div class="skeleton-column">
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                    </div>
                    <div class="skeleton-column">
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                        <div class="skeleton-content"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Inject skeleton
        appContainer.innerHTML = skeletonHTML;
        console.log('🦴 App skeleton UI injected');
    }
    
    /**
     * NEW: Remove app skeleton UI before injecting real content
     */
    removeAppSkeleton() {
        const skeleton = document.getElementById('appSkeletonUI');
        if (skeleton) {
            // Add hiding class for smooth transition
            skeleton.classList.add('hiding');
            
            // Remove after transition
            setTimeout(() => {
                skeleton.remove();
                console.log('🦴 App skeleton UI removed');
            }, 300);
        }
    }
    
    /**
     * NEW: Clean up resources of the current page before navigating away
     */
    async cleanupCurrentPage() {
        if (!this.previousRoute) return;

        console.log(`🧹 Cleaning up resources for route: ${this.previousRoute}`);
        const previousRouteConfig = routeConfig[this.previousRoute];
        if (!previousRouteConfig) return;

        switch (previousRouteConfig.component) {
            case 'landing':
                if (window.cleanupLandingPage) {
                    window.cleanupLandingPage();
                }
                break;
            case 'temp-auth':
                // Clean up temp-auth specific styles
                const tempAuthStyles = document.querySelector('#temp-auth-styles');
                if (tempAuthStyles) {
                    tempAuthStyles.remove();
                }
                break;
            case 'app':
                // Clean up app-specific resources
                if (window.isAppInitialized && window.cleanupApp) {
                     window.cleanupApp();
                }
                // Also clean up Table of Contents
                if (window.cleanupTableOfContents) {
                    window.cleanupTableOfContents();
                }
                break;
            case 'auth':
                 if (window.cleanupAuthPage) {
                    window.cleanupAuthPage();
                }
                break;
            case 'payment-success':
                // Clean up payment success page specific styles and content
                const paymentSuccessStyles = document.querySelector('#payment-success-css');
                if (paymentSuccessStyles) {
                    paymentSuccessStyles.remove();
                    console.log('🧹 Cleaned up payment success page styles');
                }
                // Clear any leftover payment success content
                const appContainer = document.getElementById('appContainer');
                if (appContainer) {
                    // Only clean if it contains payment success content
                    if (appContainer.innerHTML.includes('payment-success-container')) {
                        appContainer.innerHTML = '';
                        console.log('🧹 Cleaned up payment success page content');
                    }
                }
                break;
            case 'payment-cancelled':
            case 'payment-failed':
                // Clean up payment result page styles and content
                const paymentResultStyles = document.querySelector('#payment-result-css');
                if (paymentResultStyles) {
                    paymentResultStyles.remove();
                    console.log('🧹 Cleaned up payment result page styles');
                }
                // Clear any leftover payment result content
                const resultContainer = document.getElementById('appContainer');
                if (resultContainer) {
                    // Only clean if it contains payment result content
                    if (resultContainer.innerHTML.includes('payment-result-container')) {
                        resultContainer.innerHTML = '';
                        console.log('🧹 Cleaned up payment result page content');
                    }
                }
                break;
            case 'privacy':
                if (window.cleanupPrivacyPage) {
                    window.cleanupPrivacyPage();
                }
                break;
            case 'terms':
                if (window.cleanupTermsPage) {
                    window.cleanupTermsPage();
                }
                break;
            case 'contact':
                if (window.cleanupContactPage) {
                    window.cleanupContactPage();
                }
                break;
        }
    }
}

// Create singleton router instance
const router = new Router();

// Export for module use
export { router }; 