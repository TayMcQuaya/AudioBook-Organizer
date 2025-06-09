// AudioBook Organizer - Simple Client-Side Router

import { showError, showInfo } from './notifications.js';

// Router state
let currentRoute = '/';
let isAuthenticated = true; // Set to true by default for now since we're not implementing auth yet
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
        requiresAuth: false, // Changed to false since we're not implementing auth yet
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
        requiresAuth: false, // Changed to false since we're not implementing auth yet
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

            // Clean up app-specific resources
            if (window.isAppInitialized) {
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
            const scriptId = 'landing-page-script';
            if (!document.getElementById(scriptId)) {
                const landingScript = document.createElement('script');
                landingScript.id = scriptId;
                landingScript.type = 'module';
                landingScript.src = '/pages/landing/landing.js';
                document.head.appendChild(landingScript);
            }
        } catch (error) {
            console.error('Error loading landing page:', error);
            showError('Failed to load landing page');
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

            // Load app scripts if they aren't already loaded
            if (!window.isAppInitialized) {
                const mainScript = document.createElement('script');
                mainScript.type = 'module';
                mainScript.src = '/js/main.js';
                document.head.appendChild(mainScript);
                window.isAppInitialized = true;
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
                const mainScript = document.querySelector('script[src="/js/main.js"]');
                if (mainScript) mainScript.remove();
                window.isAppInitialized = false;
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

            // Ensure auth page CSS is loaded
            let authCSS = document.querySelector('link[href="/css/auth.css"]');
            if (!authCSS) {
                authCSS = document.createElement('link');
                authCSS.rel = 'stylesheet';
                authCSS.href = '/css/auth.css';
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
            const scriptId = 'auth-page-script';
            const authScript = document.createElement('script');
            authScript.id = scriptId;
            authScript.type = 'module';
            authScript.src = '/pages/auth/main.js';
            document.head.appendChild(authScript);
            
            console.log('🔐 Auth page loaded successfully');
            
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
    
    // Handle popstate events
    handlePopState(event) {
        const path = event.state?.path || '/';
        this.handleRoute(path);
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
}

// Create router instance
const router = new Router();

// Make router globally available for navigation functions
window.router = router;

// Export for module use
export { router }; 