# 📄 Page Lifecycle & Development Guide

This document explains the page initialization and cleanup lifecycle, and provides a guide for adding new pages to the AudioBook Creator application.

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

## How It Works

1.  **Navigation**: A user clicks a link, calling `router.navigate('/new-page')`.
2.  **Cleanup (The Important Part!)**: The router's `handleRoute` method first calls `cleanupCurrentPage()`. This function checks what the *previous* route was and calls its specific cleanup function (e.g., `window.cleanupLandingPage()`). This removes all listeners from the page the user is leaving.
3.  **Loading**: The router then calls `loadRoute()` which in turn calls the specific `loadNewPage()` method.
4.  **Dynamic Import & Init**: The `loadNewPage()` method dynamically `imports` the JavaScript file for the new page (e.g., `/pages/new-page/main.js`). This import must provide `init` and `cleanup` functions.
5.  **Initialization**: The `init` function is immediately called, setting up the new page's listeners and functionality.
6.  **Store Cleanup**: The `cleanup` function is stored on the global `window` object (e.g., `window.cleanupNewPage = cleanup`) so the router can find and call it on the *next* navigation.

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
    const myButton = document.getElementById('myDashboardButton');
    myButton.addEventListener('click', handleSomeClick);
    
    // Check auth state to show correct content
    if (window.sessionManager?.isAuthenticated) {
        console.log('Welcome to the dashboard, authenticated user!');
    }
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

// 3. EXPORT
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


Will auth work on a new page?

Yes, the authentication and session management will work automatically for any new page you create. The AuthModule and SessionManager that handle the user's logged-in state are persistent across the entire application.
However, to ensure the new page integrates smoothly, you need to follow the new init/cleanup pattern we just established. For any new page (e.g., a "Dashboard"):
Create the Files: Add dashboard.html, dashboard.css, and dashboard.js.
Export Functions: In dashboard.js, you must export initDashboardPage and cleanupDashboardPage functions.
Update Router: In router.js, you would:
Add the new route (/dashboard) to the routeConfig object.
Add a loadDashboardPage() method that loads the HTML and dynamically imports dashboard.js to run its init function.
Add a case 'dashboard' to the cleanupCurrentPage method to call the cleanup function.
So, while you do need to tell the router how to load and clean up the page, the core session logic will work without any changes, and the user will remain logged in.

