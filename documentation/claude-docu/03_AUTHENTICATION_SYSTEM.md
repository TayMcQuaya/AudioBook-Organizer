# Authentication System - AudioBook Organizer

## Overview
The application uses a dual authentication system:
1. **Normal Mode**: Supabase Auth with JWT tokens
2. **Testing Mode**: Simplified password-based auth

## Authentication Flow

### Normal Mode Flow
```
1. User Login/Signup
   frontend/js/modules/auth.js:login()
   ↓
2. Supabase Authentication
   POST /api/auth/login (with reCAPTCHA)
   backend/routes/auth_routes.py:login()
   ↓
3. JWT Token Generation
   backend/services/supabase_service.py:verify_user()
   ↓
4. Session Creation
   frontend/js/modules/sessionManager.js:updateAuthState()
   ↓
5. Cross-Tab Sync
   localStorage events → all tabs updated
```

### Testing Mode Flow
```
1. Password Entry
   frontend/pages/temp-auth/temp-auth.html
   ↓
2. Temporary Auth
   POST /api/auth/temp-login
   backend/routes/password_protection.py:temp_login()
   ↓
3. Session Storage
   Flask session + frontend localStorage
   ↓
4. Access Granted
   Router allows /app access
```

## Key Components

### Backend Authentication

#### Auth Middleware (`backend/middleware/auth_middleware.py`)
```python
# Key decorators:
@require_auth          # Mandatory authentication
@optional_auth         # Optional, user available if authenticated
@require_credits(n)    # Minimum credit balance required
@consume_credits(n)    # Deduct credits after success

# JWT verification flow:
def require_auth(f):
    # 1. Extract token from Authorization header
    # 2. Verify JWT signature
    # 3. Check token expiration
    # 4. Attach user to request context
```

#### Supabase Service (`backend/services/supabase_service.py`)
- **Lines**: 537
- **Key Functions**:
  - `verify_jwt_token()` - Validates JWT tokens
  - `get_user_from_token()` - Extracts user data
  - `init_user_if_needed()` - First-time user setup
  - `get_user_credits()` - Credit balance check
  - `consume_credits()` - Credit deduction

#### Password Protection (`backend/routes/password_protection.py`)
- **Lines**: 303
- **Testing Mode Only**
- **Key Functions**:
  - `temp_login()` - Validate testing password
  - `temp_logout()` - Clear session
  - `check_temp_auth()` - Verify session status

### Frontend Authentication

#### Auth Module (`frontend/js/modules/auth.js`)
- **Lines**: 1,446
- **Dependencies**: notifications, validators, sessionManager, recaptcha
- **Key Functions**:
  - `initializeSupabase()` - Dynamic Supabase client setup
  - `login()/signup()` - User authentication
  - `handleGoogleAuth()` - OAuth flow
  - `refreshSession()` - Token refresh
  - `logout()` - Clear all auth state

#### Session Manager (`frontend/js/modules/sessionManager.js`)
- **Lines**: 720
- **Purpose**: Cross-tab authentication sync
- **Key Features**:
  - Storage event listeners for tab sync
  - Password recovery mode handling
  - Security event logging
  - Token validation

#### Testing Mode UI (`frontend/js/modules/testingModeUI.js`)
- **Lines**: 327
- **Purpose**: Testing mode interface
- **Features**:
  - Password prompt modal
  - Visual indicators
  - Navigation restrictions
  - Exit confirmation

## Authentication States

### User States
```javascript
// Not authenticated
{ isAuthenticated: false, user: null }

// Authenticated (Normal)
{
  isAuthenticated: true,
  user: {
    id: "uuid",
    email: "user@example.com",
    user_metadata: { ... }
  },
  session: { access_token: "jwt..." }
}

// Authenticated (Testing)
{
  isTestingMode: true,
  tempAuth: true
}
```

### Session Storage
```javascript
// Normal mode
localStorage.setItem('supabase.auth.token', {...})

// Testing mode
sessionStorage.setItem('temp-auth', 'true')
localStorage.setItem('testingModeActive', 'true')
```

## Security Features

### JWT Token Structure
```javascript
{
  "aud": "authenticated",
  "exp": 1234567890,  // Expiration timestamp
  "sub": "user-uuid",  // User ID
  "email": "user@example.com",
  "iat": 1234567890,   // Issued at
  "role": "authenticated"
}
```

### reCAPTCHA Integration
- **Backend**: `backend/services/security_service.py`
- **Frontend**: `frontend/js/modules/recaptcha.js`
- **Version**: reCAPTCHA v3
- **Threshold**: 0.5 score required

### Rate Limiting
```python
# backend/middleware/rate_limiter.py
login_limiter = RateLimiter(
    per_minute=5,
    per_hour=20
)
```

### Password Requirements
```javascript
// frontend/js/modules/validators.js
- Minimum 8 characters
- At least one number
- At least one special character
- Password strength meter shown
- Live validation with checkmarks (○ → ✓)
```

## Email Verification

### Purpose
Prevents fake account abuse and credit farming

### Implementation
```javascript
// Email verification required for new signups
if (!user.email_confirmed_at) {
    showInfo('Please check your email to verify your account');
    // Redirect to verification pending page
}
```

### Features
- Verification email sent automatically on signup
- Users must verify before accessing app
- Credits only granted after verification
- Google OAuth users exempt (pre-verified)

### Database Trigger
```sql
-- Only give credits if email is confirmed OR OAuth user
IF NEW.email_confirmed_at IS NOT NULL OR 
   NEW.raw_app_meta_data->>'provider' IN ('google', 'github', 'facebook') THEN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 100);
END IF;
```

## Cross-Tab Synchronization

### Implementation (`sessionManager.js`)
```javascript
// Listen for auth changes
window.addEventListener('storage', (e) => {
  if (e.key === 'auth-state-change') {
    updateAuthState(e.newValue);
  }
});

// Broadcast auth changes
function broadcastAuthChange(state) {
  localStorage.setItem('auth-state-change', JSON.stringify({
    timestamp: Date.now(),
    state: state
  }));
}
```

### Recovery Mode
- Prevents auth during password reset
- Uses unique tab IDs
- 5-minute timeout
- Blocks other tabs from authenticating

## API Authentication

### Request Headers
```javascript
// Normal mode
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}

// Testing mode
headers: {
  'X-Testing-Mode': 'true',
  'Content-Type': 'application/json'
}
```

### Backend Verification
```python
# Check both auth types
def get_current_user():
    # 1. Check JWT token
    if auth_header:
        return verify_jwt_token()
    
    # 2. Check testing mode
    if app.config['TESTING_MODE']:
        return check_temp_auth()
    
    return None
```

## Common Issues & Debugging

### Token Expiration
- **Location**: `auth_middleware.py:85`
- **Fix**: Implement token refresh
- **Frontend**: `auth.js:refreshSession()`

### Google OAuth Signup Fix
- **Problem**: "Database error saving new user"
- **Cause**: Database trigger using SECURITY INVOKER without auth context
- **Solution**: Changed to SECURITY DEFINER in trigger
- **File**: `/sql/07_fix_oauth_trigger.sql`

### Cross-Tab Issues
- **Location**: `sessionManager.js:handleStorageChange()`
- **Debug**: Check localStorage events
- **Fix**: Clear all storage and re-login

### Testing Mode Not Working
- **Check**: `TESTING_MODE=true` in .env
- **Check**: `TEMPORARY_PASSWORD` set
- **Debug**: `/api/auth/debug-session`

### OAuth Redirect Issues
- **Location**: `auth_routes.py:google_callback()`
- **Check**: Redirect URLs in Supabase
- **Debug**: Network tab for callback

## Environment Variables

### Required for Normal Mode
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET_KEY=your-secret-key
```

### Required for Testing Mode
```bash
TESTING_MODE=true
TEMPORARY_PASSWORD=testaccess
```

### Optional Security
```bash
RECAPTCHA_SITE_KEY=6Lc...
RECAPTCHA_SECRET_KEY=6Lc...
SESSION_SECRET_KEY=random-secret
```