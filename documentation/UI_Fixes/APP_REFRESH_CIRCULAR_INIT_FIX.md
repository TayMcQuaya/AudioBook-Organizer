# App Page Refresh Circular Initialization Fix

## Issue
When refreshing the browser on `/app` page, the application would get stuck showing "Restoring your project..." overlay indefinitely, even though authentication was working (user's name displayed).

## Root Cause
Circular initialization occurred when refreshing directly on `/app`:

1. `app.html` loads and starts initialization
2. `app.html` checks if router exists, finds it missing
3. `app.html` initializes the router via `router.init()`
4. Router's `init()` automatically calls `handleRoute('/app')`
5. This tries to load `/app` again, creating a circular dependency
6. API request to `/projects/latest` would hang in this circular state

## Solution
Modified router initialization to accept a `skipInitialRoute` parameter:

```javascript
// In app.html
await router.init(true);  // Pass true to skip initial route handling

// In router.js
async init(skipInitialRoute = false) {
    // ... initialization code ...
    
    if (!skipInitialRoute) {
        await this.handleRoute(initialPath);
    } else {
        console.log('⏭️ Skipping initial route handling (app.html will handle it)');
    }
}
```

## Files Modified
- `/frontend/pages/app/app.html` - Added `true` parameter to `router.init()`
- `/frontend/js/modules/router.js` - Added `skipInitialRoute` parameter to `init()` method

## Key Learning
When a page initializes infrastructure (like a router) that would normally handle that same page, you must prevent automatic route handling to avoid circular initialization.