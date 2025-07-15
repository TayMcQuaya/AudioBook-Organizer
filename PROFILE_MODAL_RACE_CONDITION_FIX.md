# Profile Modal and Payment System Race Condition Fix

## Issue Description
When refreshing the page on production (or local), clicking the Profile button or purchase credits button would fail silently. The onclick handlers were trying to access JavaScript modules that hadn't finished loading yet due to module loading timing.

## Root Cause
1. HTML loads with onclick handlers like `onclick="window.profileModal.open()"`
2. User clicks immediately after page refresh
3. JavaScript modules haven't finished loading/initializing yet
4. `window.profileModal` is undefined, causing the onclick to fail silently

## Additional Issues Found and Fixed
1. **Stripe.js not loading**: Script was missing from app.html page
2. **Profile modal CSS missing**: Stylesheet wasn't included in app.html
3. **Project restoration hanging**: Missing import and duplicate API calls
4. **Credits API race condition**: Multiple concurrent requests causing conflicts

## Solution Implemented

### 1. Safe Wrapper Functions
Created defensive wrapper functions that check module availability before calling methods:

#### In appUI.js:
```javascript
window.safeOpenProfile = function() {
    if (window.appUI && typeof window.appUI.openProfile === 'function') {
        window.appUI.openProfile();
    } else {
        // Retry logic and fallback
    }
};

window.safeToggleUserDropdown = function() {
    // Similar defensive logic
};

window.safeOpenCreditsModal = async function() {
    // Safe credits modal opening
};
```

#### In profileModal.js:
```javascript
window.safeProfileClose = function() { /* ... */ };
window.safeProfileChangePage = function(page) { /* ... */ };
window.safeProfileHandleFilterChange = function(value) { /* ... */ };
window.safeProfileHandleUpdate = function(event) { /* ... */ };
window.safeProfileHandlePasswordReset = function() { /* ... */ };
window.safeProfileShowDeleteDialog = function() { /* ... */ };
```

#### In stripe.js:
```javascript
window.safePurchaseCredits = function(packageId) { /* ... */ };
window.safeLoadPackages = function() { /* ... */ };
window.safeRefreshTransactions = function() { /* ... */ };
```

### 2. Updated onclick Handlers
Changed all onclick handlers from direct module calls to safe wrappers:

- `onclick="window.appUI.openProfile()"` → `onclick="window.safeOpenProfile()"`
- `onclick="window.profileModal.close()"` → `onclick="window.safeProfileClose()"`
- `onclick="window.stripeService?.purchaseCredits?.()"` → `onclick="window.safePurchaseCredits()"`

### 3. Immediate Global Availability
Ensured modules are globally available immediately when loaded:

```javascript
// CRITICAL: Make globally available immediately
window.appUI = appUI;
window.profileModal = profileModal;
window.stripeService = stripeService;
```

## Files Modified

1. **frontend/js/modules/appUI.js**
   - Added safe wrapper functions
   - Updated user navigation HTML generation
   - Added credits modal wrapper
   - Fixed duplicate credit fetches with concurrency flag
   - Modified initialization to prevent early credit fetching
   - Delayed auth recovery credit updates

2. **frontend/js/modules/profileModal.js**
   - Added safe wrapper functions for all onclick handlers
   - Updated modal HTML generation to use safe wrappers
   - Improved modal state management (checks DOM consistency)
   - Enhanced error handling in createModal()
   - Fixed close() method to handle missing elements

3. **frontend/js/modules/stripe.js**
   - Added safe wrapper functions for purchase actions
   - Updated package card HTML generation
   - Enhanced safePurchaseCredits with retry logic

4. **frontend/js/modules/ui.js**
   - Updated credits display click handler
   - Added safe wrapper for hiding credits modal

5. **frontend/pages/app/app.html**
   - Added Stripe.js script tag
   - Added profile-modal.css stylesheet
   - Added stripe.css stylesheet

6. **frontend/js/modules/appInitialization.js**
   - Added missing showError import
   - Added updateUserCredits call after project restoration
   - Removed duplicate credit fetching from initializeCreditsDisplay

## Testing Instructions

1. **Local Testing:**
   ```bash
   python app.py
   # Open http://localhost:3000
   # Login or use testing mode
   # Refresh the page (F5)
   # Immediately click Profile button
   # Should open without errors
   ```

2. **Production Testing:**
   - Deploy changes to production
   - Login to the app
   - Refresh the page
   - Immediately click Profile or credits display
   - Should work without errors

3. **Console Verification:**
   Open browser console and check:
   ```javascript
   // Should all return true
   typeof window.safeOpenProfile === 'function'
   typeof window.safePurchaseCredits === 'function'
   typeof window.safeProfileClose === 'function'
   ```

## Key Implementation Details

### Preventing Duplicate Credit Fetches
```javascript
// Flag to prevent concurrent credit fetches
let creditsFetchInProgress = false;

export async function updateUserCredits(retryCount = 0) {
    if (creditsFetchInProgress && retryCount === 0) {
        console.log('💎 Credits fetch already in progress, skipping duplicate request');
        return;
    }
    creditsFetchInProgress = true;
    // ... fetch logic ...
}
```

### Profile Modal State Management
```javascript
async open() {
    if (this.isOpen) {
        const existingModal = document.querySelector('.profile-modal');
        if (!existingModal) {
            console.warn('Modal marked as open but not in DOM, resetting...');
            this.isOpen = false;
        } else {
            return;
        }
    }
    // ... continue opening ...
}
```

## Benefits

1. **Eliminates Race Conditions**: Safe wrappers handle cases where modules aren't loaded yet
2. **Retry Logic**: Automatically retries if module isn't available
3. **Fallback Handling**: Provides graceful fallbacks for error cases
4. **User Experience**: No more silent failures after page refresh
5. **Backward Compatible**: Old direct calls still work when modules are loaded
6. **Prevents API Overload**: Duplicate credit fetch prevention
7. **Consistent State**: Modal state always matches DOM state

## Future Considerations

1. Consider using a module loader that guarantees order
2. Implement a global ready state for all critical modules
3. Add loading indicators while modules initialize
4. Consider server-side rendering for critical UI elements
5. Implement a centralized module registry for better management