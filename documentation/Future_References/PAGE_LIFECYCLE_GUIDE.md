# 📄 Page Lifecycle & Development Guide

This document explains the page initialization and cleanup lifecycle, and provides a guide for adding new pages to the AudioBook Organizer application.

## Overview: The Init/Cleanup Lifecycle

To prevent bugs like duplicate event listeners and ensure the application runs smoothly as a Single-Page App (SPA), we use a structured lifecycle for each page. The `Router` is responsible for managing this lifecycle.

-   **`init<PageName>Page()`**: A function that sets up everything a page needs. This includes adding event listeners, initializing UI components, etc.
-   **`cleanup<PageName>Page()`**: A function that tears down everything `init` created. Its primary job is to remove event listeners to prevent memory leaks and unpredictable behavior when the user navigates away.

### Page Lifecycle Diagram

```mermaid
graph TD
    A[User Clicks Link] --> B{Router: navigate()};
    B --> C{handleRoute()};
    C --> D[cleanupCurrentPage()];
    D --> E[loadRoute()];
    E --> F[Dynamically import JS for new page];
    F --> G[Run init() function from new page's JS];
    G --> H[New page is now active];
```

## 🚨 Common Authentication & Navigation Problems (SOLVED)

During development, we encountered several critical authentication and navigation issues. Here are the problems and their solutions:

### Problem 1: Authentication State Loss During Navigation
**Issue**: Users appeared "signed out" when navigating between app ↔ landing pages, even though they were still authenticated.

**Root Cause**: Pages were not properly checking authentication state from all sources (sessionManager, authModule, stored tokens).

**Files Changed**: 
- `frontend/pages/landing/landing.js`
- `frontend/js/modules/appUI.js`

**Solution Applied**:
```javascript
// Enhanced auth checking in landing.js
async checkAuthenticationState() {
    const isSessionAuth = window.sessionManager?.isAuthenticated;
    const isAuthModuleAuth = window.authModule?.isAuthenticated;
    
    if (!isSessionAuth && !isAuthModuleAuth) {
        // Try to recover auth state from stored tokens
        const storedToken = localStorage.getItem('supabase.auth.token') || 
                           sessionStorage.getItem('access_token');
        if (storedToken && window.authModule) {
            await window.authModule.initializeUser();
        }
    }
}
```

### Problem 2: Slow Navigation Performance (4+ seconds)
**Issue**: Navigation between pages took 4+ seconds and showed "Sign In" button temporarily.

**Root Cause**: 
- Direct page reloads via `href="/app"` instead of router navigation
- Missing auth module initialization checks
- Full app reinitialization on every navigation

**Files Changed**:
- `frontend/js/modules/router.js`
- `frontend/pages/landing/landing.js`
- `frontend/js/modules/appInitialization.js`

**Solution Applied**:
```javascript
// Router optimization - smart reuse detection
async loadApp() {
    // Check if app is already initialized and user is authenticated
    if (this.isAppInitialized && window.authModule?.isAuthenticated) {
        await this.refreshEssentialFeatures();
        return;
    }
    // Full initialization only when needed
}

// Landing page - use router instead of direct navigation
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="open-app"]')) {
        e.preventDefault();
        if (window.router) {
            window.router.navigate('/app');
        } else {
            window.location.href = '/app';
        }
    }
});
```

### Problem 3: Missing Credit Display & Project Content on Return
**Issue**: When returning to app from landing, credits weren't displayed and project content was missing.

**Root Cause**: Fast navigation skipped essential feature initialization.

**Files Changed**: 
- `frontend/js/modules/router.js`

**Solution Applied**:
```javascript
// Added refreshEssentialFeatures() method
async refreshEssentialFeatures() {
    try {
        // 1. Refresh credit system
        if (window.authModule?.getUserCredits) {
            await window.authModule.updateUserCredits();
        }

        // 2. Restore project content if missing
        const contentArea = document.querySelector('.content-area');
        if (contentArea && !contentArea.innerHTML.trim()) {
            await window.storage.loadFromDatabase();
        }

        // 3. Reinitialize table of contents if content was restored
        if (window.tableOfContents?.generateTableOfContents) {
            window.tableOfContents.generateTableOfContents();
        }
    } catch (error) {
        console.warn('Error refreshing features, falling back to full init:', error);
        this.isAppInitialized = false;
        await this.loadApp();
    }
}
```

### Problem 4: App Page Independent Loading Issues
**Issue**: Direct access to `/app` page bypassed router authentication setup.

**Files Changed**:
- `frontend/pages/app/app.html`

**Solution Applied**:
```javascript
// Added ensureAuthenticationReady() in app.html
async function ensureAuthenticationReady() {
    try {
        // Parallel loading for performance
        const [sessionManager, authModule] = await Promise.all([
            window.sessionManager || import('/js/modules/sessionManager.js'),
            window.authModule || import('/js/modules/auth.js')
        ]);
        
        // Initialize if needed
        if (!window.sessionManager?.isInitialized) {
            await sessionManager.initialize();
        }
        
        return true;
    } catch (error) {
        console.error('Authentication setup failed:', error);
        return false;
    }
}
```

## How It Works

1.  **Navigation**: A user clicks a link, calling `router.navigate('/new-page')`.
2.  **Cleanup (The Important Part!)**: The router's `handleRoute` method first calls `cleanupCurrentPage()`. This function checks what the *previous* route was and calls its specific cleanup function (e.g., `window.cleanupLandingPage()`). This removes all listeners from the page the user is leaving.
3.  **Loading**: The router then calls `loadRoute()` which in turn calls the specific `loadNewPage()` method.
4.  **Dynamic Import & Init**: The `loadNewPage()` method dynamically `imports` the JavaScript file for the new page (e.g., `/pages/new-page/main.js`). This import must provide `init` and `cleanup` functions.
5.  **Initialization**: The `init` function is immediately called, setting up the new page's listeners and functionality.
6.  **Store Cleanup**: The `cleanup` function is stored on the global `window` object (e.g., `window.cleanupNewPage = cleanup`) so the router can find and call it on the *next* navigation.

## 🛡️ Authentication Best Practices for New Pages

When creating new pages, follow these practices to avoid authentication issues:

### 1. Always Check Multiple Auth Sources
```javascript
function checkAuthState() {
    const isSessionAuth = window.sessionManager?.isAuthenticated;
    const isAuthModuleAuth = window.authModule?.isAuthenticated;
    const hasStoredToken = localStorage.getItem('supabase.auth.token') || 
                          sessionStorage.getItem('access_token');
    
    return isSessionAuth || isAuthModuleAuth || hasStoredToken;
}
```

### 2. Use Router Navigation, Not Direct Links
```javascript
// ❌ WRONG - causes full page reload
<a href="/app">Open App</a>

// ✅ CORRECT - uses router
<a href="#" data-action="navigate" data-route="/app">Open App</a>

// JavaScript handler
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="navigate"]')) {
        e.preventDefault();
        const route = e.target.dataset.route;
        if (window.router) {
            window.router.navigate(route);
        }
    }
});
```

### 3. Implement Auth Recovery in Page Init
```javascript
function init() {
    // Check auth state and recover if needed
    if (!window.authModule?.isAuthenticated) {
        tryRecoverAuthState();
    }
    
    // Rest of page initialization
}

async function tryRecoverAuthState() {
    const storedToken = localStorage.getItem('supabase.auth.token');
    if (storedToken && window.authModule) {
        await window.authModule.initializeUser();
    }
}
```

### 4. Add Auth Module Initialization Check
```javascript
// In your page's loader method (router.js)
async loadYourPage() {
    try {
        // Ensure auth module is available
        if (!window.authModule) {
            await import('/js/modules/auth.js');
        }
        
        // Load page content
        const response = await fetch('/pages/your-page/your-page.html');
        // ... rest of loading logic
    } catch (error) {
        console.error('Error loading page:', error);
    }
}
```

## How to Add a New Page (e.g., "Dashboard")

Follow this pattern precisely to ensure your new page works with the existing authentication and routing system.

**1. Create Page Files**

Create the necessary files for your page.

```
frontend/
└── pages/
    └── dashboard/
        ├── dashboard.html
        ├── dashboard.css
        └── main.js  (The entry point for your page's logic)
```

**2. Implement Page Logic (`main.js`)**

Your page's main JavaScript file **must** export `init` and `cleanup` functions.

```javascript
// frontend/pages/dashboard/main.js

function handleSomeClick() {
    // Page-specific logic
    console.log('Dashboard button clicked');
}

// 1. INIT FUNCTION
function init() {
    console.log('🚀 Initializing Dashboard page');
    
    // ✅ ALWAYS check auth state from multiple sources
    const isAuth = checkMultipleAuthSources();
    if (!isAuth) {
        tryRecoverAuthState();
    }
    
    const myButton = document.getElementById('myDashboardButton');
    myButton.addEventListener('click', handleSomeClick);
}

// 2. CLEANUP FUNCTION
function cleanup() {
    console.log('🧹 Cleaning up Dashboard page');
    const myButton = document.getElementById('myDashboardButton');
    // Important: remove the exact same listener function
    if (myButton) {
        myButton.removeEventListener('click', handleSomeClick);
    }
}

// 3. AUTH HELPER FUNCTIONS
function checkMultipleAuthSources() {
    return window.sessionManager?.isAuthenticated || 
           window.authModule?.isAuthenticated ||
           localStorage.getItem('supabase.auth.token');
}

async function tryRecoverAuthState() {
    const storedToken = localStorage.getItem('supabase.auth.token');
    if (storedToken && window.authModule) {
        await window.authModule.initializeUser();
    }
}

// 4. EXPORT
export { init as initDashboardPage, cleanup as cleanupDashboardPage };
```

**3. Update the Router (`router.js`)**

Tell the router about your new page.

```javascript
// frontend/js/modules/router.js

// Step 3.1: Add the route to the configuration object
const routeConfig = {
    // ... other routes
    '/dashboard': {
        title: 'My Dashboard - AudioBook Organizer',
        component: 'dashboard',
        requiresAuth: true, // Does this page require login?
        layout: 'app' // Or 'landing', 'auth'
    }
};

class Router {
    // ... existing constructor, init, navigate, handleRoute...

    // Step 3.2: Add a case to the loadRoute method
    async loadRoute(route) {
        switch (route.component) {
            // ... other cases
            case 'dashboard':
                await this.loadDashboardPage();
                break;
            default:
                throw new Error(`Unknown component: ${route.component}`);
        }
    }

    // Step 3.3: Add a case to the cleanupCurrentPage method
    async cleanupCurrentPage() {
        // ...
        switch (previousRouteConfig.component) {
            // ... other cases
            case 'dashboard':
                 if (window.cleanupDashboardPage) {
                    window.cleanupDashboardPage();
                }
                break;
        }
    }

    // Step 3.4: Create the loader method for your page
    async loadDashboardPage() {
        try {
            // ✅ CRITICAL: Ensure auth module is available
            if (!window.authModule) {
                await import('/js/modules/auth.js');
            }
            
            // A. Load HTML
            const appContainer = document.getElementById('appContainer');
            const response = await fetch('/pages/dashboard/dashboard.html');
            appContainer.innerHTML = await response.text();

            // B. Set body class for styling
            document.body.className = 'dashboard-body app-ready';

            // C. Import and run page logic
            const { initDashboardPage, cleanupDashboardPage } = await import('/pages/dashboard/main.js');
            initDashboardPage();
            window.cleanupDashboardPage = cleanupDashboardPage; // Make cleanup available for next navigation

        } catch (error) {
            console.error('Error loading dashboard page:', error);
        }
    }

    // ... rest of the router code
}
``` 

## 🚀 Performance Optimization Tips

### 1. Implement Smart Reuse Detection
```javascript
// Check if page can be reused instead of full reload
if (this.isPageInitialized && this.hasValidAuthState()) {
    await this.refreshEssentialFeatures();
    return; // Skip full initialization
}
```

### 2. Use Parallel Loading for Auth Components
```javascript
// Load auth components in parallel for faster initialization
const [sessionManager, authModule] = await Promise.all([
    window.sessionManager || import('/js/modules/sessionManager.js'),
    window.authModule || import('/js/modules/auth.js')
]);
```

### 3. Implement Minimal vs Full Cleanup
```javascript
// In appInitialization.js
function cleanupApp(fullCleanup = false) {
    if (fullCleanup) {
        // Complete teardown for permanent exit
        this.isAppInitialized = false;
    } else {
        // Minimal cleanup for temporary navigation
        // Preserve app state and initialization status
    }
}
```

## Will auth work on a new page?

**Yes**, the authentication and session management will work automatically for any new page you create, **provided you follow the patterns above**. The AuthModule and SessionManager are persistent across the entire application.

**Key Requirements for New Pages**:
1. **Check multiple auth sources** in your init function
2. **Use router navigation** instead of direct links
3. **Import auth module** in your page loader
4. **Implement auth recovery** for edge cases
5. **Follow the init/cleanup pattern** exactly as shown

**Files That Handle Auth Automatically**:
- `frontend/js/modules/auth.js` - Main authentication logic
- `frontend/js/modules/sessionManager.js` - Session state management  
- `frontend/js/modules/router.js` - Navigation and page lifecycle
- `frontend/js/modules/appUI.js` - User interface updates

Following this guide ensures your new pages will have seamless authentication, fast navigation (1-2 seconds instead of 4+ seconds), and no session loss during page transitions.

