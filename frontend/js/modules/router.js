// AudioBook Organizer - Simple Client-Side Router

import { showError, showInfo } from './notifications.js';
import auth from './auth.js';
import sessionManager from './sessionManager.js';
import tempAuthManager from './tempAuth.js';

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
    }
};

// Router class
class Router {
    constructor() {
        this.currentRoute = '/';
        this.previousRoute = null;
        this.isInitialized = false;
        this.isLoading = false;
        
        // Bind methods
        this.navigate = this.navigate.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }
    
    async init() {
        if (this.isInitialized) return;
        
        // Initialize temporary authentication manager first
        const tempAuthResult = await tempAuthManager.init();
        if (!tempAuthResult) {
            // Temp auth redirected us, don't continue with router init
            return;
        }
        
        // Initialize auth module only if not in testing mode
        if (!tempAuthManager.shouldBypassAuth()) {
            await auth.init();
            await sessionManager.init();
        } else {
            console.log('🧪 Testing mode: Bypassing normal authentication');
        }
        
        // Make auth module globally available
        window.authModule = auth;
        
        // Listen for browser back/forward
        window.addEventListener('popstate', this.handlePopState);
        
        // Handle internal link clicks
        document.addEventListener('click', this.handleLinkClick);
        
        // Wait for auth state to be ready before handling initial route
        if (!tempAuthManager.shouldBypassAuth()) {
            await this.waitForAuthReady();
        }
        
        // Initialize current route with full path including query parameters
        await this.handleRoute(window.location.pathname + window.location.search);
        
        this.isInitialized = true;
        console.log('📍 Router initialized with authentication');
    }
    
    /**
     * Wait for authentication state to be properly initialized
     */
    async waitForAuthReady() {
        return new Promise((resolve) => {
            // If auth is already ready or there's no token, resolve immediately
            if (sessionManager.isAuthenticated || !localStorage.getItem('auth_token')) {
                resolve();
                return;
            }
            
            // Listen for auth state changes
            const checkAuthReady = () => {
                if (sessionManager.isAuthenticated || !localStorage.getItem('auth_token')) {
                    window.removeEventListener('auth-state-changed', checkAuthReady);
                    resolve();
                }
            };
            
            window.addEventListener('auth-state-changed', checkAuthReady);
            
            // Timeout after 3 seconds to prevent hanging
            setTimeout(() => {
                window.removeEventListener('auth-state-changed', checkAuthReady);
                resolve();
            }, 3000);
        });
    }
    
    // Navigate to a route
    async navigate(path, replace = false) {
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
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('App container not found for router.');
            }

            // Clean up app-specific resources
            if (window.isAppInitialized) {
                // Clean up app-specific event listeners
                if (window.cleanupTextSelection) {
                    window.cleanupTextSelection();
                }
                
                const mainScript = document.querySelector('script[src="/js/main.js"]');
                if (mainScript) mainScript.remove();
                window.isAppInitialized = false;
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

        } catch (error) {
            console.error('Error loading landing page:', error);
            showError('Failed to load landing page');
        }
    }
    
    // Load temp auth page
    async loadTempAuthPage() {
        try {
            console.log('🔧 Loading temp auth page...');
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('App container not found for router.');
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
            console.log('🔧 First 200 chars of content:', bodyContent.substring(0, 200));
            appContainer.innerHTML = bodyContent;

            document.body.className = 'temp-auth-body app-ready';
            
            // Ensure the loading screen is hidden and appContainer is visible
            const loadingScreen = document.getElementById('appLoading');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Make sure appContainer is visible
            appContainer.style.display = 'block';
            appContainer.style.opacity = '1';
            
            console.log('🔧 Loading screen hidden, temp-auth content should be visible');

            // Wait a moment for DOM to be ready, then load the script
            console.log('🔧 Loading temp-auth script...');
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for DOM
            
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
            // Use console instead of showError in case it's not available
            if (typeof showError === 'function') {
                showError('Failed to load temp auth page');
            } else {
                console.error('Failed to load temp auth page - showError not available');
            }
        }
    }
    
    // Load app
    async loadApp() {
        try {
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('App container not found for router.');
            }

            // Check if we need to load the app HTML shell first
            if (!document.body.classList.contains('app-body')) {
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
                
                // Set the correct body class
                document.body.className = 'app-body';
            }

            // Only load app HTML if not already loaded
            if (!appContainer.querySelector('.main-container')) {
                // Fetch and inject the actual app UI
                const response = await fetch('/pages/app/app.html');
                if (!response.ok) throw new Error(`Failed to fetch app page: ${response.status}`);
                const appHtml = await response.text();
                
                // Parse the HTML and extract only the body content
                const parser = new DOMParser();
                const doc = parser.parseFromString(appHtml, 'text/html');
                const bodyContent = doc.body.innerHTML;
                
                // Inject only the body content, not the full HTML
                appContainer.innerHTML = bodyContent;
            }

            // Initialize app if not already initialized
            if (!window.isAppInitialized) {
                try {
                    const { initialize, cleanup } = await import('/js/main.js');
                    await initialize();
                    window.cleanupApp = cleanup;
                    window.isAppInitialized = true;
                } catch (error) {
                    console.error('Error initializing app:', error);
                    window.isAppInitialized = false;
                }
            }
            
            console.log('📱 App loaded successfully');
            
        } catch (error) {
            console.error('Error loading app:', error);
            showError('Failed to load application');
        }
    }
    
    // Load auth page
    async loadAuthPage() {
        try {
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('App container not found for router.');
            }

            // Clean up app-specific resources
            if (window.isAppInitialized) {
                // Clean up app-specific event listeners
                if (window.cleanupTextSelection) {
                    window.cleanupTextSelection();
                }
                
                const mainScript = document.querySelector('script[src="/js/main.js"]');
                if (mainScript) mainScript.remove();
                window.isAppInitialized = false;
                window.isAppInitializing = false;
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

            console.log('🔐 Auth page loaded successfully');
            
        } catch (error) {
            console.error('Error loading auth page:', error);
            showError('Failed to load authentication page');
        }
    }
    
    // Load password reset page
    async loadResetPasswordPage() {
        try {
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                throw new Error('App container not found for router.');
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
    
    // Handle popstate events
    handlePopState(event) {
        // **FIX: Ignore popstate events during password recovery initialization**
        // Supabase triggers popstate events when processing recovery URLs
        if (sessionManager.isPasswordRecovery && window.location.pathname === '/auth/reset-password') {
            console.log('🚫 Ignoring popstate event during password recovery initialization');
            return;
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
        }
    }
}

// Create router instance
const router = new Router();

// Make router globally available for navigation functions
window.router = router;

// Export for module use
export { router }; 