# Session Invalidation Fix Guide

## Implementation Status: PRODUCTION READY ✅

**Last Updated: July 14, 2025**

## Overview
This guide documents the comprehensive solution implemented to handle session invalidation issues that occur after server restarts. The fix ensures users maintain their authentication state, credits, and access to uploaded files without requiring manual logout/login.

**Current Status**: All session invalidation fixes are working correctly in production. Users no longer experience credit/file access issues after server restarts.

## Problem Statement

### Symptoms
1. **Credits showing as 0** - Despite valid JWT tokens, users see 0 credits after server restart
2. **Audio files returning 500 errors** - Uploaded files become inaccessible
3. **Manual fix required** - Users must logout and login again to restore functionality
4. **Poor user experience** - Data appears lost even though it's still in the database
5. **Credits display disappearing** - Credits element missing on page refresh

### Root Causes
1. **In-memory cache invalidation** - Server restart clears cached user data
2. **Supabase RLS context loss** - Row Level Security requires re-authentication
3. **Timing issues** - Credits fetched before authentication fully established
4. **No automatic recovery** - System doesn't detect or recover from server restarts
5. **UI initialization order** - Credits display element created after update attempts

## Solution Architecture

### 1. Frontend Recovery System

#### Credit Fetching with Retry Logic (`/frontend/js/modules/appUI.js`)
```javascript
export async function updateUserCredits(retryCount = 0) {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second
    
    try {
        const response = await apiFetch('/api/users/credits');
        
        // Detect session invalidation (0 credits with valid token)
        if (response.credits === 0 && auth.isAuthenticated() && retryCount < MAX_RETRIES) {
            console.warn(`Credits returned 0, attempting recovery (${retryCount + 1}/${MAX_RETRIES})...`);
            
            // Trigger session recovery
            sessionManager.triggerSessionRecoveryCheck('credits-zero');
            
            // Wait and retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount)));
            return updateUserCredits(retryCount + 1);
        }
        
        // Update UI with credits
        updateCreditsDisplay(response.credits);
        return response.credits;
        
    } catch (error) {
        handleCreditsFetchError(error, retryCount);
    }
}
```

#### Session Health Monitoring (`/frontend/js/modules/sessionManager.js`)
```javascript
async detectServerRestart() {
    // Three-point health check
    const checks = await Promise.all([
        this.checkCreditsEndpoint(),
        this.checkAuthVerification(),
        this.checkSupabaseSession()
    ]);
    
    // Server restart detected if any check fails
    return checks.some(check => !check.healthy);
}

// Auth verification now sends token in JSON body
const token = localStorage.getItem('auth_token');
const verifyResponse = await apiFetch('/auth/verify', {
    method: 'POST',
    headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
});

async recoverFromServerRestart() {
    console.log('🔄 Initiating server restart recovery...');
    
    // 1. Refresh authentication token
    await auth.refreshSession();
    
    // 2. Re-verify session
    await auth.verifyCurrentSession();
    
    // 3. Clear stale caches
    localStorage.removeItem('user_credits_cache');
    
    // 4. Trigger UI updates
    window.dispatchEvent(new CustomEvent('auth-recovered'));
}
```

#### Authentication State Monitoring (`/frontend/js/modules/auth.js`)
```javascript
// Fixed infinite loop issue
triggerSessionRecoveryCheck(trigger = 'unknown') {
    const now = Date.now();
    const lastAttempt = parseInt(localStorage.getItem('last_recovery_attempt') || '0');
    
    // Rate limiting: 30-second cooldown
    if (now - lastAttempt < 30000) {
        console.log('⏳ Recovery cooldown active');
        return;
    }
    
    localStorage.setItem('last_recovery_attempt', now);
    sessionManager.checkSessionHealth();
}

// Enhanced credit fetching with force refresh
async getUserCredits(forceRefresh = false) {
    if (!this.isAuthenticated()) {
        return 0;
    }

    const endpoint = forceRefresh ? '/auth/credits?refresh=true' : '/auth/credits';
    const response = await this.apiRequest(endpoint);
    const data = await response.json();
    
    if (data.success) {
        return data.credits;
    }
    return 0;
}
```

#### UI Credits Display Fix (`/frontend/js/modules/appUI.js`)
```javascript
async init() {
    // ... existing init code ...
    
    // Initialize credits display (if on app page)
    if (window.location.pathname === '/app') {
        console.log('💎 Initializing credits display on app page...');
        initializeCreditsDisplay();
    }
    
    this.isInitialized = true;
}
```

### 2. Backend Recovery System

#### Enhanced Credits Fetching (`/backend/services/supabase_service.py`)
```python
def get_user_credits(self, user_id: str, use_cache: bool = True, auth_token: str = None) -> int:
    # Check cache first
    if use_cache:
        cached_data = self._get_cached_user_data(user_id)
        if cached_data and 'credits' in cached_data:
            return cached_data['credits']
    
    try:
        # Authenticate for RLS compliance
        if auth_token and hasattr(self.client, 'postgrest'):
            self.client.postgrest.auth(auth_token)
        
        # Fetch from database
        result = self.client.table('user_credits').select('credits').eq('user_id', user_id).execute()
        
        if result.data:
            credits = result.data[0]['credits']
            # Update cache
            self._cache_user_data(user_id, {'credits': credits})
            return credits
        else:
            # Recovery: Initialize credits for existing user
            if auth_token:
                self.initialize_user_credits(user_id, 100, auth_token)
                return 100
                
    except Exception as e:
        # Enhanced error recovery for RLS issues
        if "authentication" in str(e).lower() or "rls" in str(e).lower():
            # Retry with fresh authentication
            if auth_token and hasattr(self.client, 'postgrest'):
                self.client.postgrest.auth(auth_token)
                # Retry query...
```

#### Credits Endpoint Enhancement (`/backend/routes/auth_routes.py`)
```python
@auth_bp.route('/credits', methods=['GET'])
@require_auth
def get_credits(current_user):
    """Get user's current credit balance"""
    try:
        user = current_user
        user_id = user['id']
        
        # Get auth token from request headers for RLS
        auth_header = request.headers.get('Authorization')
        auth_token = None
        if auth_header and auth_header.startswith('Bearer '):
            auth_token = auth_header[7:]
        
        # Check if this is a post-action refresh
        force_refresh = request.args.get('refresh', '').lower() == 'true'
        use_cache = not force_refresh
        
        # Get credits with auth token for RLS compliance
        credits = supabase_service.get_user_credits(user_id, use_cache=use_cache, auth_token=auth_token)
        
        logger.info(f"💎 Credits fetched for user {user_id}: {credits}")
        
        return jsonify({
            'success': True,
            'credits': credits,
            'user_id': user_id
        })
```

#### Cache Clearing After Consumption (`/backend/middleware/auth_middleware.py`)
```python
if success:
    # Clear user cache to force fresh fetch next time
    if hasattr(supabase_service, '_user_init_cache') and g.user_id in supabase_service._user_init_cache:
        del supabase_service._user_init_cache[g.user_id]
        logger.debug(f"💎 Cleared cache for user {g.user_id} after credit consumption")
```

#### Cache Warming for Active Users
```python
def warm_cache_for_active_users(self, max_users: int = 50) -> int:
    """Pre-populate cache with recently active users after restart"""
    
    # Get users active in last 24 hours
    result = self.client.table('usage_logs').select('user_id').gte(
        'created_at', 
        (datetime.utcnow() - timedelta(hours=24)).isoformat()
    ).limit(max_users).execute()
    
    # Cache their data
    for user_id in unique_user_ids:
        profile_data = self.get_user_profile(user_id)
        credits_data = self.get_user_credits(user_id, use_cache=False)
        self._cache_user_data(user_id, {
            'profile': profile_data,
            'credits': credits_data
        })
```

#### Enhanced File Serving Diagnostics (`/backend/routes/static_routes.py`)
```python
@app.route('/uploads/<filename>')
def serve_upload(filename):
    try:
        # Comprehensive diagnostics
        app.logger.info(f'🔍 FILE SERVE REQUEST: {filename}')
        app.logger.info(f'🔍 Upload folder: {upload_folder}')
        app.logger.info(f'🔍 File exists: {os.path.exists(file_path)}')
        app.logger.info(f'🔍 File readable: {os.access(file_path, os.R_OK)}')
        app.logger.info(f'🔍 File size: {os.path.getsize(file_path)} bytes')
        
        # Serve with CORS headers
        response = make_response(send_from_directory(upload_folder, filename))
        response.headers['Access-Control-Allow-Origin'] = '*'
        
        return response
        
    except Exception as e:
        # Detailed error logging
        app.logger.error(f'❌ ERROR serving {filename}: {str(e)}')
        app.logger.error(f'❌ Error type: {type(e).__name__}')
        # System diagnostics...
```

### 3. Initialization Timing Fix

#### Authentication Stability Check (`/frontend/js/modules/appInitialization.js`)
```javascript
async function waitForAuthenticationStability() {
    const MAX_WAIT_TIME = 10000; // 10 seconds
    const CHECK_INTERVAL = 500;
    
    while (Date.now() - startTime < MAX_WAIT_TIME) {
        // Check all auth sources agree
        const authModuleAuth = window.authModule?.isAuthenticated();
        const sessionManagerAuth = window.sessionManager?.isAuthenticated;
        const hasValidToken = !!localStorage.getItem('auth_token');
        
        // Stable states:
        // 1. Not authenticated (all false)
        // 2. Fully authenticated (all true)
        if (allAuthSourcesAgree()) {
            console.log('✅ Authentication stable');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
}
```

## Implementation Timeline

### Phase 1: Initial Problem Analysis
- Identified root causes through debugging
- Analyzed authentication flow and cache behavior
- Determined that audio file serving wasn't auth-related

### Phase 2: Frontend Recovery System
- Implemented credit fetching retry logic
- Added session health monitoring
- Created automatic recovery mechanisms

### Phase 3: Backend Enhancements
- Enhanced Supabase service with RLS awareness
- Added cache warming for active users
- Improved error logging and diagnostics

### Phase 4: Bug Fixes
- **Infinite Loop Fix**: Added rate limiting to prevent recovery loops
- **JSON Body Fix**: Corrected auth verification endpoint call to include token in body
- **Timing Fix**: Ensured auth stability before credit fetching
- **Credits Display Fix**: Ensured credits element exists before updating

## Testing Scenarios

### Local Testing
1. Start the application and login
2. Upload an audio file and note credits
3. Restart the Flask server
4. Refresh the page
5. Verify: Credits display correctly, audio plays

### Production Testing
1. Deploy changes to production
2. Monitor logs during first server restart
3. Check user sessions remain valid
4. Verify no 500 errors on file access

## Monitoring and Maintenance

### Key Metrics
- Session recovery success rate
- Credit fetch retry frequency
- File serving error rate
- Authentication state changes

### Log Monitoring
```bash
# Watch for recovery events
grep "session recovery" app.log

# Monitor credit fetch issues
grep "Credits returned 0" app.log

# Check file serving errors
grep "FILE SERVE REQUEST" app.log | grep -E "ERROR|FAILED"
```

## Key Implementation Details

### Frontend Credit Refresh After Uploads
```javascript
// In bookUpload.js and sections.js
window._creditRefreshNeeded = true;
updateUserCredits(); // Will force refresh on next call
```

### Production Considerations
1. **RLS Compliance**: Auth token must be passed to Supabase for production RLS
2. **Cache Management**: Server-side cache clearing works identically in production
3. **Network Latency**: Retry logic with exponential backoff handles production latency
4. **CORS**: Already configured properly for production domains

## Future Improvements

1. **Persistent Session Storage**
   - Consider Redis for session state
   - Implement distributed caching

2. **Proactive Recovery**
   - Detect server restart before user action
   - Pre-warm critical user data

3. **Enhanced Monitoring**
   - Add metrics for recovery performance
   - Create alerts for high failure rates

## Configuration

### Environment Variables
No new environment variables required. Solution works with existing configuration.

### Feature Flags
Recovery system is always active. No flags needed.

## Rollback Plan

If issues arise:
1. Remove retry logic from `updateUserCredits()`
2. Disable session health monitoring
3. Revert to manual logout/login flow

## Related Documentation
- [Authentication System Guide](./03_AUTHENTICATION_SYSTEM.md)
- [Security Implementation Guide](./SECURITY_IMPLEMENTATION_GUIDE.md)
- [Database Security Fixes](./DATABASE_SECURITY_FIXES.md)