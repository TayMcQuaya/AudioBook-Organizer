# App Refresh Profile & Navigation Fix

## Issues After Initial Fix
After fixing the circular initialization, two new issues appeared when refreshing directly on `/app`:

1. **Old nickname displayed** instead of current profile name
2. **Navigation links not working** (can't go back to landing page)

## Root Cause
When `router.init(true)` skips initial route handling:
- Profile refresh wasn't triggered for authenticated users
- Navigation event listeners might not be properly attached in some edge cases

## Solution

### 1. Profile Refresh Fix
Added explicit profile refresh when router is initialized from app.html:

```javascript
// In app.html, after router.init(true)
if (window.authModule && window.authModule.isAuthenticated()) {
    console.log('🔄 Triggering profile refresh for direct app load...');
    window.authModule.refreshUserData(true, false).catch(err => {
        console.warn('Failed to refresh user data:', err);
    });
}
```

### 2. Navigation Event Listeners Fix
Re-attach event listeners after app initialization to ensure they work:

```javascript
// At the end of app initialization
if (window.router && window.router._setupEventListeners) {
    setTimeout(() => {
        document.removeEventListener('click', window.router.handleLinkClick);
        document.addEventListener('click', window.router.handleLinkClick);
        console.log('📡 Re-attached navigation event listeners for app page');
    }, 100);
}
```

## Why This Works
- Profile refresh ensures latest user data is loaded when accessing app directly
- Re-attaching event listeners ensures navigation links (`data-link` attributes) work properly
- Small timeout allows DOM to stabilize before re-attaching listeners

## Testing
1. Log in normally → Navigate to app → Refresh page
2. Check that correct nickname appears
3. Check that clicking brand logo or back arrow returns to landing page