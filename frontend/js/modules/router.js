// AudioBook Organizer - Simple Client-Side Router

import { showError, showInfo } from './notifications.js';

// Router state
let currentRoute = '/';
let isAuthenticated = false;
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
    '/app': {
        title: 'AudioBook Organizer - App',
        component: 'app',
        requiresAuth: true,
        layout: 'app'
    },
    '/auth': {
        title: 'Sign In - AudioBook Organizer',
        component: 'auth',
        requiresAuth: false,
        layout: 'auth'
    },
    '/profile': {
        title: 'Profile - AudioBook Organizer',
        component: 'profile',
        requiresAuth: true,
        layout: 'app'
    }
};

// Router class
class Router {
    constructor() {
        this.currentRoute = '/';
        this.previousRoute = null;
        this.isInitialized = false;
        
        // Bind methods
        this.navigate = this.navigate.bind(this);
        this.handlePopState = this.handlePopState.bind(this);
        this.handleLinkClick = this.handleLinkClick.bind(this);
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Listen for browser back/forward
        window.addEventListener('popstate', this.handlePopState);
        
        // Handle internal link clicks
        document.addEventListener('click', this.handleLinkClick);
        
        // Initialize current route
        this.handleRoute(window.location.pathname);
        
        this.isInitialized = true;
        console.log('📍 Router initialized');
    }
    
    // Navigate to a route
    navigate(path, replace = false) {
        if (path === this.currentRoute) return;
        
        this.previousRoute = this.currentRoute;
        
        if (replace) {
            window.history.replaceState({ path }, '', path);
        } else {
            window.history.pushState({ path }, '', path);
        }
        
        this.handleRoute(path);
    }
    
    // Handle route changes
    async handleRoute(path) {
        const route = routeConfig[path];
        
        if (!route) {
            console.warn(`Route not found: ${path}`);
            this.navigate('/', true);
            return;
        }
        
        // Check authentication requirements
        if (route.requiresAuth && !isAuthenticated) {
            console.log('🔒 Route requires authentication, redirecting to auth');
            this.navigate('/auth');
            return;
        }
        
        // Check route guards
        const canActivate = await this.runGuards(path);
        if (!canActivate) {
            console.log('🚫 Route guard blocked navigation');
            return;
        }
        
        // Update current route
        this.currentRoute = path;
        
        // Update document title
        document.title = route.title;
        
        // Load the appropriate content
        await this.loadRoute(route);
        
        // Track navigation
        this.trackNavigation(path);
    }
    
    // Load route content
    async loadRoute(route) {
        try {
            switch (route.component) {
                case 'landing':
                    await this.loadLandingPage();
                    break;
                case 'app':
                    await this.loadApp();
                    break;
                case 'auth':
                    await this.loadAuthPage();
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
            const scriptId = 'landing-page-script';
            if (!document.getElementById(scriptId)) {
                const landingScript = document.createElement('script');
                landingScript.id = scriptId;
                landingScript.type = 'module';
                landingScript.src = '/pages/landing/landing.js';
                document.head.appendChild(landingScript);
            }
        } catch (error) {
            console.error('Error loading landing page from router:', error);
            showError('Failed to load landing page');
        }
    }
    
    // Load app (current audiobook organizer)
    async loadApp() {
        try {
            const appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                 throw new Error('App container not found for router.');
            }

            // Check if we need to load the app HTML shell first
            if (!document.body.classList.contains('app-body')) {
                // This logic is simplified as the main index.html already sets up the shell.
                // We just need to ensure the body class is correct.
                 document.body.className = 'app-body';
            }

            // Fetch and inject the actual app UI
            const response = await fetch('/pages/app/app.html');
            if (!response.ok) throw new Error(`Failed to fetch app page: ${response.status}`);
            const appHtml = await response.text();
            appContainer.innerHTML = appHtml;

            // Load app scripts if they aren't already loaded
            if (!window.isAppInitialized) {
                const mainScript = document.createElement('script');
                mainScript.type = 'module';
                mainScript.src = '/js/main.js';
                document.head.appendChild(mainScript);
                window.isAppInitialized = true; 
            } else {
                // If already initialized, we might need to re-run some setup
                const { initializeApp } = await import('/js/modules/appInitialization.js');
                initializeApp();
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
            // For now, show auth modal on landing page
            if (window.showAuthModal) {
                window.showAuthModal('login');
            } else {
                // Fallback: redirect to landing with auth modal
                this.navigate('/');
                setTimeout(() => {
                    if (window.showAuthModal) {
                        window.showAuthModal('login');
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error loading auth page:', error);
            showError('Failed to load authentication page');
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
    
    // Handle browser back/forward
    handlePopState(event) {
        const path = event.state?.path || window.location.pathname;
        this.handleRoute(path);
    }
    
    // Handle internal link clicks
    handleLinkClick(event) {
        const link = event.target.closest('a');
        
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Only handle internal links
        if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('#')) {
            return;
        }
        
        // Check if it's a route we handle
        if (routeConfig[href]) {
            event.preventDefault();
            this.navigate(href);
        }
    }
    
    // Add route guard
    addGuard(path, guardFunction) {
        if (!guards.has(path)) {
            guards.set(path, []);
        }
        guards.get(path).push(guardFunction);
    }
    
    // Run route guards
    async runGuards(path) {
        const routeGuards = guards.get(path) || [];
        
        for (const guard of routeGuards) {
            const result = await guard(path, this.currentRoute);
            if (!result) {
                return false;
            }
        }
        
        return true;
    }
    
    // Set authentication status
    setAuthenticated(authenticated) {
        isAuthenticated = authenticated;
        console.log(`🔐 Authentication status: ${authenticated ? 'authenticated' : 'not authenticated'}`);
        
        // If user logged out and on protected route, redirect
        if (!authenticated && routeConfig[this.currentRoute]?.requiresAuth) {
            this.navigate('/');
        }
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return isAuthenticated;
    }
    
    // Get current route
    getCurrentRoute() {
        return this.currentRoute;
    }
    
    // Get previous route
    getPreviousRoute() {
        return this.previousRoute;
    }
    
    // Track navigation (for analytics)
    trackNavigation(path) {
        if (window.landingUI?.trackPageView) {
            window.landingUI.trackPageView(path);
        }
        console.log(`📊 Navigation tracked: ${path}`);
    }
    
    // Go back
    back() {
        window.history.back();
    }
    
    // Go forward
    forward() {
        window.history.forward();
    }
    
    // Reload current route
    reload() {
        this.handleRoute(this.currentRoute);
    }
}

// Create router instance
const router = new Router();

// Authentication guard
router.addGuard('/app', async (to, from) => {
    if (!isAuthenticated) {
        showInfo('Please sign in to access the application');
        return false;
    }
    return true;
});

router.addGuard('/profile', async (to, from) => {
    if (!isAuthenticated) {
        showInfo('Please sign in to access your profile');
        return false;
    }
    return true;
});

// Utility functions for common navigation patterns
const navigation = {
    // Go to landing page
    toLanding() {
        router.navigate('/');
    },
    
    // Go to app
    toApp() {
        router.navigate('/app');
    },
    
    // Show auth modal/page
    toAuth(mode = 'login') {
        if (window.showAuthModal) {
            window.showAuthModal(mode);
        } else {
            router.navigate('/auth');
        }
    },
    
    // Go to profile
    toProfile() {
        router.navigate('/profile');
    },
    
    // Sign out and redirect
    signOut() {
        isAuthenticated = false;
        router.setAuthenticated(false);
        router.navigate('/');
        showInfo('You have been signed out');
    }
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    router.init();
});

// Make router and navigation globally available
window.router = router;
window.navigation = navigation;

// Export for module use
export { router, navigation };
export default router; 