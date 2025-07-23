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

### Problem 5: Navigation Container Mismatch (SOLVED)
**Issue**: Navigation from app page to other pages failed with "Error: App container not found for router."

**Root Cause**: 
- App page (`/app`) has its own DOM structure with `.main-container` 
- Other pages (landing, auth, temp-auth) expect an `appContainer` element
- When navigating from app → other pages, the expected container didn't exist
- Router's page loader methods threw errors when `document.getElementById('appContainer')` returned null

**Files Changed**: 
- `frontend/js/modules/router.js` - All page loader methods

**Solution Applied**:
```javascript
// **BEFORE:** All page loaders had this problematic pattern
async loadLandingPage() {
    try {
        const appContainer = document.getElementById('appContainer');
        if (!appContainer) {
            throw new Error('App container not found for router.'); // ❌ FAILED HERE
        }
        // ... rest of loading
    }
}

// **AFTER:** Dynamic container creation with smooth transitions
async loadLandingPage() {
    try {
        // **FIX: Ensure appContainer exists or create it for page transitions**
        let appContainer = document.getElementById('appContainer');
        if (!appContainer) {
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
        
        // ... rest of loading logic ...
        
        // **PERFORMANCE: Make appContainer visible with smooth transition**
        setTimeout(() => {
            appContainer.style.opacity = '1';
        }, 100);
    }
}
```

**Methods Fixed**:
- `loadLandingPage()` - Landing page navigation
- `loadTempAuthPage()` - Testing mode navigation  
- `loadAuthPage()` - Authentication page navigation
- `loadResetPasswordPage()` - Password reset navigation
- Temp auth fallback method - Edge case handling

**Prevention for Future Pages**:
All new page loader methods MUST include the container detection pattern shown above.

### Problem 6: Landing Page Refresh Auto-Redirect (SOLVED)
**Issue**: Refreshing the landing page while authenticated automatically redirected users to the app page, breaking user's intended page choice and causing authentication confusion.

**Root Cause**: 
- Auth module's `handleAuthSuccess()` method had aggressive navigation logic
- Both `SIGNED_IN` and `INITIAL_SESSION` events could trigger unwanted navigation during session restoration
- No distinction between actual user login vs session restoration during page refresh
- Landing page user choice wasn't respected during authentication recovery

**Files Changed**: 
- `frontend/js/modules/auth.js` - Enhanced navigation logic in `handleAuthSuccess()`

**Solution Applied**:
```javascript
// **BEFORE:** Aggressive navigation during session restoration
if (authEvent === 'SIGNED_IN') {
    // Navigate to returnUrl or /app by default
    await window.router.navigate(returnUrl);
}

// **AFTER:** Smart detection of page refresh vs actual login
if (authEvent === 'SIGNED_IN') {
    const isPageRefresh = !document.referrer || document.referrer === window.location.href;
    const currentPath = window.location.pathname;
    
    if (isPageRefresh && currentPath === '/') {
        // CRITICAL FIX: Don't navigate away from landing page during refresh
        console.log('🚫 Preventing navigation from landing page during refresh');
        console.log('✅ User chose to be on landing page, respecting their choice');
    } else {
        // Normal navigation logic for actual logins
        await window.router.navigate(returnUrl);
    }
}

// Enhanced INITIAL_SESSION handling
} else if (authEvent === 'INITIAL_SESSION') {
    const currentPath = window.location.pathname;
    console.log(`🔄 Session restored on ${currentPath}, staying on current page`);
    
    // Users should stay on whatever page they refreshed
    if (currentPath === '/') {
        console.log('✅ Staying on landing page during session restore');
    } else if (currentPath === '/app') {
        console.log('✅ Staying on app page during session restore');
    }
}
```

**Behavior Changes**:
- **Before**: Landing page refresh → automatic redirect to app page
- **After**: Landing page refresh → stays on landing page as intended
- **Preserved**: Google OAuth flows, normal login navigation, app page functionality

**Prevention for Future Authentication Logic**:
Always distinguish between active user navigation vs passive session restoration when implementing authentication flows.

### Problem 7: Payment Page Auto-Redirect (SOLVED)
**Issue**: Users accessing payment result pages (`/payment/cancelled`, `/payment/failed`) were automatically redirected to the app page, preventing them from seeing payment confirmation or cancellation messages.

**Root Cause**: 
- Auth module's auto-redirect logic only excluded `/payment/success` from navigation
- Other payment pages (`/payment/cancelled`, `/payment/failed`) triggered automatic app page navigation
- Session restoration during payment page access caused unwanted redirects
- User payment result page choice wasn't respected during authentication recovery

**Files Changed**: 
- `frontend/js/modules/auth.js` - Extended payment page exclusion logic in `handleAuthSuccess()`

**Solution Applied**:
```javascript
// **BEFORE:** Only payment success page was excluded from auto-redirect
} else if (currentPath === '/payment/success') {
    // **CRITICAL FIX: Don't navigate away from payment success page**
    console.log('🚫 Preventing navigation from payment success page');
    console.log('✅ User should see their payment confirmation, staying on payment success');

// **AFTER:** All payment pages excluded from auto-redirect
} else if (currentPath.startsWith('/payment/')) {
    // **CRITICAL FIX: Don't navigate away from any payment pages**
    console.log(`🚫 Preventing navigation from payment page: ${currentPath}`);
    console.log('✅ User should see their payment result page, respecting their choice');

// Also updated INITIAL_SESSION handling:
// **BEFORE:** Only payment success logging
} else if (currentPath === '/payment/success') {
    console.log('✅ Staying on payment success page during session restore');

// **AFTER:** All payment pages logging
} else if (currentPath.startsWith('/payment/')) {
    console.log(`✅ Staying on payment page (${currentPath}) during session restore`);
```

**Behavior Changes**:
- **Before**: Payment cancelled/failed pages → automatic redirect to app page
- **After**: Payment cancelled/failed pages → stays on payment result page as intended
- **Preserved**: Payment success functionality, normal authentication flows

**Payment Pages Affected**:
- ✅ `/payment/success` - Payment completed successfully
- ✅ `/payment/cancelled` - User cancelled checkout
- ✅ `/payment/failed` - Payment processing failed

**Prevention for Future Payment Pages**:
Any new payment-related routes should start with `/payment/` to automatically inherit this redirect prevention behavior.

## How It Works

1.  **Navigation**: A user clicks a link, calling `router.navigate('/new-page')`.
2.  **Cleanup (The Important Part!)**: The router's `handleRoute` method first calls `cleanupCurrentPage()`. This function checks what the *previous* route was and calls its specific cleanup function (e.g., `window.cleanupLandingPage()`). This removes all listeners from the page the user is leaving.
3.  **Loading**: The router then calls `loadRoute()` which in turn calls the specific `loadNewPage()` method.
4.  **Dynamic Import & Init**: The `loadNewPage()` method dynamically `imports` the JavaScript file for the new page (e.g., `/pages/new-page/main.js`). This import must provide `init` and `cleanup` functions.
5.  **Initialization**: The `init` function is immediately called, setting up the new page's listeners and functionality.
6.  **Store Cleanup**: The `cleanup` function is stored on the global `window` object (e.g., `window.cleanupNewPage = cleanup`) so the router can find and call it on the *next* navigation.

## 🛡️ Authentication Best Practices for New Pages

When creating new pages, follow these practices to avoid authentication issues:

### ⚠️ **CRITICAL: Avoid Duplicate Authentication Initialization**

**❌ WRONG APPROACH:**
```javascript
// DON'T DO THIS - App page trying to initialize auth directly
async function ensureAuthenticationReady() {
    const { AuthModule } = await import('/js/modules/auth.js');
    window.authModule = new AuthModule(); // ❌ This will fail!
    await window.authModule.init();
}
```

**✅ CORRECT APPROACH:**
```javascript
// DO THIS - Check if router has already initialized auth
async function ensureAuthenticationReady() {
    // Router handles all auth initialization
    if (window.authModule && window.sessionManager) {
        console.log('✅ Auth modules available via router');
        return;
    }
    
    // Wait for router to complete auth initialization
    let attempts = 0;
    while (!window.authModule && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
    }
}
```

**Key Principle:** **Single Responsibility** - Only the router should initialize authentication. Pages should only verify availability.

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
            
            // ✅ CRITICAL: Dynamic appContainer detection and creation
            // **MUST INCLUDE THIS PATTERN** to prevent navigation errors
            let appContainer = document.getElementById('appContainer');
            if (!appContainer) {
                console.log('🔧 Creating appContainer for dashboard page transition');
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
            
            // A. Load HTML
            const response = await fetch('/pages/dashboard/dashboard.html');
            if (!response.ok) throw new Error(`Failed to fetch dashboard page: ${response.status}`);
            appContainer.innerHTML = await response.text();

            // B. Set body class for styling
            document.body.className = 'dashboard-body app-ready';

            // C. Import and run page logic
            const { initDashboardPage, cleanupDashboardPage } = await import('/pages/dashboard/main.js');
            initDashboardPage();
            window.cleanupDashboardPage = cleanupDashboardPage; // Make cleanup available for next navigation

            // ✅ PERFORMANCE: Make appContainer visible with smooth transition
            setTimeout(() => {
                appContainer.style.opacity = '1';
            }, 100);

        } catch (error) {
            console.error('Error loading dashboard page:', error);
            showError('Failed to load dashboard page');
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
6. **🚨 CRITICAL: Include container detection pattern** to prevent navigation errors

## 🚨 **MANDATORY: Container Pattern for All New Pages**

**Every new page loader method MUST include this exact pattern** to prevent "App container not found" errors:

```javascript
async loadYourNewPage() {
    try {
        // **STEP 1: MANDATORY Container Detection & Creation**
        let appContainer = document.getElementById('appContainer');
        if (!appContainer) {
            console.log('🔧 Creating appContainer for [page-name] transition');
            appContainer = document.createElement('div');
            appContainer.id = 'appContainer';
            appContainer.style.opacity = '0';
            appContainer.style.transition = 'opacity 0.5s ease-in-out';
            
            // Replace current page content with container
            document.body.innerHTML = '';
            document.body.appendChild(appContainer);
            
            // Restore essential CSS
            if (!document.querySelector('link[href="/css/main.css"]')) {
                const mainCSS = document.createElement('link');
                mainCSS.rel = 'stylesheet';
                mainCSS.href = '/css/main.css';
                document.head.appendChild(mainCSS);
            }
        }
        
        // **STEP 2: Continue with normal page loading**
        const response = await fetch('/pages/your-page/your-page.html');
        if (!response.ok) throw new Error(`Failed to fetch page: ${response.status}`);
        appContainer.innerHTML = await response.text();
        
        // **STEP 3: Page-specific setup**
        document.body.className = 'your-page-body app-ready';
        
        // **STEP 4: Initialize page logic**
        const { initYourPage, cleanupYourPage } = await import('/pages/your-page/main.js');
        initYourPage();
        window.cleanupYourPage = cleanupYourPage;
        
        // **STEP 5: MANDATORY Smooth visibility transition**
        setTimeout(() => {
            appContainer.style.opacity = '1';
        }, 100);
        
    } catch (error) {
        console.error('Error loading your page:', error);
        showError('Failed to load page');
    }
}
```

**Why This Pattern is Required**:
- App page (`/app`) uses `.main-container`, not `appContainer`
- Other pages expect `appContainer` to exist
- Without this pattern, navigation from app → other pages fails
- Pattern provides smooth transitions and preserves CSS

**⚠️ Failure to include this pattern will cause navigation errors!**

**Files That Handle Auth Automatically**:
- `frontend/js/modules/auth.js` - Main authentication logic
- `frontend/js/modules/sessionManager.js` - Session state management  
- `frontend/js/modules/router.js` - Navigation and page lifecycle
- `frontend/js/modules/appUI.js` - User interface updates

Following this guide ensures your new pages will have seamless authentication, fast navigation (1-2 seconds instead of 4+ seconds), and no session loss during page transitions.

---

## 📋 **RECENT UPDATES & CRITICAL FIXES**

### ✅ **Landing Page Hash Navigation Auto-Redirect Fix (Latest)**
**Issue Resolved**: Clicking "View Pricing" button from payment pages (`/payment/cancelled`, `/payment/failed`) automatically redirected to app page instead of landing page pricing section.

**What Changed**:
- Enhanced auth module's auto-redirect logic to detect intentional navigation to landing page sections with hashes
- Added detection for `window.location.hash` in addition to page refresh detection
- Improved both `SIGNED_IN` and `INITIAL_SESSION` event handling for landing page hash navigation
- Preserves user's intended destination when navigating to specific landing page sections

**Action Required**: 
- ✅ **All payment page "View Pricing" buttons now work correctly**
- ✅ **Direct navigation to `/#pricing`, `/#features`, etc. preserved**
- 📋 Test navigation from payment pages to landing page sections

**Files Modified**: `frontend/js/modules/auth.js` (handleAuthSuccess method)

**Pages Affected**: All payment result pages when clicking "View Pricing" button

### ✅ **Payment Page Auto-Redirect Fix**
**Issue Resolved**: Payment result pages (`/payment/cancelled`, `/payment/failed`) automatically redirected to app page.

**What Changed**:
- Extended auth module's auto-redirect prevention to cover all payment pages
- Changed from specific `/payment/success` check to general `/payment/` prefix check
- Enhanced both `SIGNED_IN` and `INITIAL_SESSION` event handling for payment pages
- Improved payment result page preservation during authentication recovery

**Action Required**: 
- ✅ **All payment pages now preserved during session restoration**
- 🚨 **New payment routes should start with `/payment/` prefix**
- 📋 Test all payment result pages to ensure proper display without redirects

**Files Modified**: `frontend/js/modules/auth.js` (handleAuthSuccess method)

**Pages Affected**: `/payment/success`, `/payment/cancelled`, `/payment/failed`

### ✅ **Landing Page Refresh Auto-Redirect Fix**
**Issue Resolved**: Landing page refresh automatically redirected authenticated users to app page.

**What Changed**:
- Enhanced auth module's `handleAuthSuccess()` method with page refresh detection
- Added distinction between actual login vs session restoration scenarios  
- Implemented page choice preservation during authentication recovery
- Improved `SIGNED_IN` and `INITIAL_SESSION` event handling

**Action Required**: 
- ✅ **All existing authentication flows are fixed**
- 🚨 **New authentication logic should distinguish between login vs refresh**
- 📋 Test page refresh behavior on all pages to ensure user choice is respected

**Files Modified**: `frontend/js/modules/auth.js` (handleAuthSuccess method)

This fix ensures users stay on their chosen page during refresh while preserving all normal authentication functionality.

### ✅ **Navigation Container Fix**
**Issue Resolved**: "App container not found for router" error during page navigation.

**What Changed**:
- All page loader methods in `router.js` now include dynamic container creation
- Added smooth opacity transitions for better user experience
- Implemented CSS preservation during page transitions

**Action Required**: 
- ✅ **All existing page loaders are fixed** 
- 🚨 **New pages MUST include the mandatory container pattern** shown above
- 📋 Review the "MANDATORY: Container Pattern" section before creating new pages

**Files Modified**: `frontend/js/modules/router.js` (5 methods updated)

This fix ensures seamless navigation between all page types and prevents container-related errors that were blocking page transitions from the app page to other pages.

### ✅ **Legal Pages Added (July 2025)**
**Pages Created**: Privacy Policy, Terms of Service, and Contact Us pages following proper lifecycle management.

**What Changed**:
- Added three new pages (`/privacy`, `/terms`, `/contact`) with full SPA integration
- Each page implements proper init/cleanup lifecycle pattern
- CSS loading with smooth transitions to prevent styling flicker
- Consistent navigation and footer across all legal pages
- Professional legal content tailored to AudioBook Organizer's data practices

**Router Integration**:
- Added `loadPrivacyPage()`, `loadTermsPage()`, `loadContactPage()` methods
- Implemented proper cleanup for all three components
- Dynamic CSS loading with promise-based waiting for style application
- Scroll-to-top behavior for consistent navigation experience
- Fixed "Back to Home" buttons to navigate to top of landing page (window.scrollTo(0, 0))

**Page Structure**:
```javascript
// Each legal page follows this pattern
function init() {
    console.log('🚀 Initializing [Page] page');
    setupNavigationHandlers();
    // Page-specific initialization
}

function cleanup() {
    console.log('🧹 Cleaning up [Page] page');
    removeNavigationHandlers();
    // Page-specific cleanup
}

// Navigation handler for SPA links
function handleNavigationClick(event) {
    const target = event.target.closest('[data-action="navigate"]');
    if (!target) return;
    
    event.preventDefault();
    const route = target.dataset.route;
    
    if (window.router) {
        window.router.navigate(route);
    } else {
        window.location.href = route;
    }
}

function setupNavigationHandlers() {
    document.addEventListener('click', handleNavigationClick);
}

function removeNavigationHandlers() {
    document.removeEventListener('click', handleNavigationClick);
}

export { init as init[Page]Page, cleanup as cleanup[Page]Page };
```

**HTML Navigation Pattern**:
```html
<!-- Footer navigation example from legal pages -->
<nav class="footer-nav" role="navigation" aria-label="Footer navigation">
    <a href="#" data-action="navigate" data-route="/">Home</a>
    <a href="#" data-action="navigate" data-route="/privacy">Privacy Policy</a>
    <a href="#" data-action="navigate" data-route="/terms">Terms of Service</a>
    <a href="#" data-action="navigate" data-route="/contact">Contact Us</a>
</nav>
```

**CSS Loading Pattern**:
```javascript
// Dynamic CSS loading with smooth transitions
let pageCSS = document.querySelector('link[href="/pages/page/page.css"]');
if (!pageCSS) {
    pageCSS = document.createElement('link');
    pageCSS.rel = 'stylesheet';
    pageCSS.href = '/pages/page/page.css';
    document.head.appendChild(pageCSS);
    await new Promise((resolve) => {
        pageCSS.onload = resolve;
        pageCSS.onerror = resolve;
    });
    await new Promise(resolve => setTimeout(resolve, 50));
}
```

**Files Modified**: 
- `frontend/js/modules/router.js` - Added route handling and page loaders
- `backend/routes/static_routes.py` - Added route definitions to prevent 404s

**Content Features**:
- Privacy Policy includes AudioBook Organizer-specific data practices
- Terms of Service covers credit system and actual app functionality  
- Contact page provides structured form for user communication
- All pages maintain consistent theming and responsive design

### ✅ **Static Page Navigation Fix (January 2025)**
**Issue Resolved**: Privacy, Terms, and Contact pages failed to load properly when navigating from landing page footer links on desktop, while working correctly on mobile.

**Root Cause**: 
- Desktop and mobile footer links used different navigation approaches
- Desktop footer links had `data-action="navigate"` and `data-route` attributes for SPA navigation
- Mobile footer links used simple `href` attributes triggering full page reloads
- Static pages (privacy, terms, contact) were designed for full page loads, not SPA navigation

**CSS Implementation**:
```css
/* Desktop - hides simple footer links */
@media (min-width: 769px) {
    .footer-links-simple {
        display: none !important;
    }
}

/* Mobile - shows simple footer links */
@media (max-width: 768px) {
    .footer-links-simple {
        display: flex;
        justify-content: center;
        gap: 24px;
    }
}
```

**Files Changed**: 
- `frontend/pages/landing/landing.html` - Removed SPA navigation attributes from desktop footer links

**Solution Applied**:
```html
<!-- BEFORE: Desktop footer links with SPA navigation -->
<a href="/privacy" data-action="navigate" data-route="/privacy" class="footer-link">Privacy Policy</a>
<a href="/terms" data-action="navigate" data-route="/terms" class="footer-link">Terms of Service</a>
<a href="/contact" data-action="navigate" data-route="/contact" class="footer-link">Contact Support</a>

<!-- AFTER: Desktop footer links with standard navigation -->
<a href="/privacy" class="footer-link">Privacy Policy</a>
<a href="/terms" class="footer-link">Terms of Service</a>
<a href="/contact" class="footer-link">Contact Support</a>
```

**Key Takeaway**: 
Not all pages need SPA navigation. Static content pages (legal, contact, etc.) can work better with traditional full page loads to ensure all resources (CSS, JS) are properly loaded. When deciding between SPA and traditional navigation:
- Use SPA navigation for app-like pages requiring state preservation
- Use traditional navigation for static content pages with minimal interactivity

**Prevention for Future Static Pages**:
- Consider whether the page truly benefits from SPA navigation
- If the page is mostly static content, use simple `href` links
- Test both mobile and desktop navigation paths
- Ensure CSS and JS dependencies load correctly for both navigation methods

