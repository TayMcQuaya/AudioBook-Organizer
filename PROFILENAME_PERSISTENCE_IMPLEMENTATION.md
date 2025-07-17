# Name Persistence Implementation Documentation

## Overview

This document details the implementation of a persistent display name system for the AudioBook Organizer application. The system ensures that when users update their display name in profile settings, the change persists across page refreshes, navigation, and login/logout cycles for both OAuth (Google) and non-OAuth users.

## Problem Statement

The original implementation had several issues:
1. **Name updates were not persisting to the database** due to Row Level Security (RLS) constraints
2. **OAuth users saw their old Google-cached name** instead of their updated profile name
3. **Page refresh showed the old name** before eventually updating
4. **Multiple competing profile refresh calls** caused race conditions
5. **Session recovery during page refresh** disrupted the authentication flow

## Architecture Overview

### Key Components

1. **Backend Services**
   - `supabase_service.py`: Handles database operations with RLS authentication
   - `auth_routes.py`: API endpoints for profile management
   - Profile table in Supabase with `full_name` column

2. **Frontend Modules**
   - `auth.js`: Core authentication and profile refresh logic
   - `sessionManager.js`: Session state management and recovery
   - `profileModal.js`: UI for profile updates
   - `appUI.js`: Display name resolution and UI updates
   - `router.js`: Page navigation and session recovery

### Data Flow

```
User Updates Name → Profile Modal → Backend API → Database
                                                      ↓
Page Refresh → Session Recovery → Profile Refresh → UI Update
```

## Implementation Details

### 1. Database Update Fix

**Problem**: Profile updates weren't persisting due to RLS policies requiring authenticated requests.

**Solution**: Modified `update_user_profile` in `supabase_service.py` to authenticate with user token:

```python
def update_user_profile(self, user_id: str, updates: Dict[str, Any], auth_token: str = None) -> bool:
    # Authenticate the postgrest client with user's token for RLS
    if auth_token and hasattr(self.client, 'postgrest'):
        self.client.postgrest.auth(auth_token)
    
    # Update profile with authenticated client
    result = self.client.table('profiles').update(updates).eq('id', user_id).execute()
```

### 2. Profile Data Refresh System

**Problem**: Updated names weren't being fetched from the database on page load.

**Solution**: Implemented `refreshUserData()` method in `auth.js`:

```javascript
async refreshUserData(forceRefresh = false, dispatchEvents = true) {
    // Fetch latest profile from database
    const response = await this.apiRequest('/auth/profile');
    
    // Update user object with fresh data
    this.user.full_name = data.profile.full_name;
    this.user.user_metadata.full_name = data.profile.full_name;
    
    // Optionally dispatch events to update UI
    if (dispatchEvents) {
        window.dispatchEvent(new CustomEvent('auth-state-changed', {...}));
    }
}
```

### 3. Session Recovery Optimization

**Problem**: Multiple competing refresh calls during page refresh caused conflicts.

**Solution**: 
- Detect page load vs actual login using `performance.now()`
- Add flags to prevent duplicate refreshes
- Trigger immediate refresh in session manager

```javascript
// In sessionManager.js - Immediate profile refresh on session recovery
if (!window._profileRefreshStarted) {
    window._profileRefreshStarted = true;
    await window.authModule.refreshUserData(true, false);
    
    // Update session manager's user object
    this.user = window.authModule.getCurrentUser();
}
```

### 4. OAuth Priority Fix

**Problem**: OAuth users' names were showing Google's cached metadata instead of updated profile data.

**Solution**: Changed display name priority in `appUI.js`:

```javascript
getUserDisplayName(user) {
    // Prioritize profile table data over OAuth metadata
    return user.full_name ||                    // Updated profile name (highest priority)
           user.name ||                         // Alternative profile name
           user.user_metadata?.full_name ||     // OAuth cached name (fallback)
           user.user_metadata?.name ||          // Alternative OAuth name
           user.email?.split('@')[0] ||         // Email prefix
           'User';                              // Default
}
```

### 5. Metadata Synchronization

**Problem**: Supabase Auth metadata wasn't updated when profile changed.

**Solution**: Update both profile table and auth metadata:

```python
# In auth_routes.py
if 'full_name' in data and auth_token:
    # Update the user's metadata in Supabase Auth
    supabase_service.update_user_metadata(user_id, {'full_name': data['full_name']}, auth_token)
```

## Authentication Flow

### Login Flow
1. User logs in (OAuth or email/password)
2. `handleAuthSuccess` is called with `isLogin=true`
3. Profile data is immediately refreshed with events
4. UI updates with latest name from database

### Page Refresh Flow
1. Router detects stored authentication
2. Session manager recovers session
3. Immediate profile refresh is triggered
4. UI updates without delay
5. No disruption to authentication state

### Profile Update Flow
1. User updates name in profile modal
2. Backend updates both profile table and auth metadata
3. Frontend refreshes user data with events
4. All UI components update immediately

## Key Design Decisions

### 1. Profile Data Priority
- **Decision**: Profile table data takes precedence over OAuth metadata
- **Rationale**: Allows users to customize their display name regardless of OAuth provider

### 2. Immediate vs Delayed Refresh
- **Decision**: Refresh profile data immediately on session recovery
- **Rationale**: Minimizes the time users see outdated information

### 3. Event-Driven Updates
- **Decision**: Use custom events for UI synchronization
- **Rationale**: Loose coupling between components, consistent updates

### 4. RLS Compliance
- **Decision**: Always authenticate Supabase client with user token
- **Rationale**: Ensures database operations respect security policies

## Error Handling

1. **Timeout Protection**: API calls have 10-second timeout to prevent hanging
2. **Graceful Degradation**: Falls back to cached data if refresh fails
3. **Error Logging**: Detailed error information for debugging
4. **User Feedback**: Clear error messages for authentication issues

## Performance Considerations

1. **Single Refresh**: Flags prevent duplicate API calls
2. **Async Operations**: Non-blocking profile updates
3. **Minimal Delay**: ~200-300ms from page load to name update
4. **Cache Strategy**: Profile data cached in session for performance

## Testing Scenarios

### Non-OAuth Users
1. ✓ Update name in profile settings
2. ✓ Refresh page - name persists
3. ✓ Navigate between pages - name remains
4. ✓ Logout and login - name shows correctly

### OAuth Users (Google)
1. ✓ Login with Google
2. ✓ Update name in profile settings
3. ✓ Refresh page - updated name shows (not Google's)
4. ✓ Logout and login - updated name persists

### Edge Cases
1. ✓ Server restart during session
2. ✓ Network failures during refresh
3. ✓ Concurrent profile updates
4. ✓ Missing profile data

## Security Considerations

1. **RLS Enforcement**: All database operations require authenticated client
2. **Token Validation**: JWT tokens verified before operations
3. **CORS Protection**: API endpoints validate origin
4. **Input Sanitization**: Profile updates are validated

## Future Improvements

1. **Optimistic Updates**: Show new name immediately while saving
2. **Offline Support**: Cache profile data for offline access
3. **Real-time Sync**: Use Supabase real-time for instant updates
4. **Username Support**: Add unique username functionality

## Troubleshooting

### Name Not Updating
1. Check browser console for API errors
2. Verify RLS policies in Supabase
3. Ensure auth token is valid
4. Check network tab for failed requests

### OAuth Name Issues
1. Verify profile table has updated value
2. Check display name priority in code
3. Clear browser cache if needed
4. Verify metadata sync is working

### Performance Issues
1. Check for duplicate refresh calls
2. Verify timeout settings
3. Monitor API response times
4. Check browser performance tab

## Code References

- Profile Update Backend: `backend/routes/auth_routes.py:376-430`
- Profile Service: `backend/services/supabase_service.py:285-335`
- Auth Module: `frontend/js/modules/auth.js:1187-1291`
- Session Manager: `frontend/js/modules/sessionManager.js:195-242`
- Profile Modal: `frontend/js/modules/profileModal.js:629-672`
- UI Manager: `frontend/js/modules/appUI.js:470-480`

## Conclusion

The name persistence system now provides a seamless user experience across all authentication methods. The implementation prioritizes user-customized data while maintaining compatibility with OAuth providers, ensures data consistency through proper RLS authentication, and provides immediate updates through an event-driven architecture.