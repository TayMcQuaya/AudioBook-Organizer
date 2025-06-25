# 🔧 Environment Configuration Guide

## Overview

This guide ensures your **localhost behaves EXACTLY like production** by using standardized configuration and deterministic initialization.

## 🚨 **Critical Configuration for Consistency**

### **Local Development (.env file)**

Create a `.env` file in your project root:

```env
# =============================================================================
# ENVIRONMENT SETTINGS
# =============================================================================
FLASK_ENV=development
FLASK_DEBUG=true
SECRET_KEY=dev-secret-key-for-localhost-testing

# =============================================================================
# SERVER CONFIGURATION
# =============================================================================
FLASK_HOST=localhost
FLASK_PORT=3000

# =============================================================================
# TESTING MODE CONFIGURATION
# =============================================================================
# Set to 'true' to enable testing mode (password-protected access)
# Set to 'false' to use normal Supabase authentication
TESTING_MODE=true

# Password for testing mode (only used when TESTING_MODE=true)
TEMPORARY_PASSWORD=your-testing-password-here

# =============================================================================
# SESSION CONFIGURATION (for consistency with production)
# =============================================================================
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax

# =============================================================================
# SUPABASE CONFIGURATION (for normal mode)
# =============================================================================
# Leave empty to use testing mode, or configure for full authentication
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
JWT_SECRET_KEY=

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
# reCAPTCHA (optional for development)
RECAPTCHA_ENABLED=false
RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
RECAPTCHA_THRESHOLD=0.5

# Rate limiting
RATE_LIMITING_ENABLED=false
AUTH_ATTEMPTS_PER_MINUTE=10
AUTH_ATTEMPTS_PER_HOUR=50
```

### **Production Configuration (Vercel/Digital Ocean)**

Update your production environment variables:

```env
# =============================================================================
# ENVIRONMENT SETTINGS
# =============================================================================
FLASK_ENV=production
FLASK_DEBUG=false
SECRET_KEY=your-super-secure-production-secret-key

# =============================================================================
# SERVER CONFIGURATION (Gunicorn)
# =============================================================================
HOST=0.0.0.0
PORT=8000

# =============================================================================
# TESTING MODE CONFIGURATION
# =============================================================================
TESTING_MODE=true
TEMPORARY_PASSWORD=your-secure-production-password

# =============================================================================
# SESSION CONFIGURATION (for cross-domain)
# =============================================================================
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=None

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
RECAPTCHA_ENABLED=true
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RATE_LIMITING_ENABLED=true
```

## 🔄 **Mode Switching Instructions**

### **Switch to Testing Mode**

1. Set `TESTING_MODE=true` in your `.env`
2. Set `TEMPORARY_PASSWORD=your-password`
3. Restart your server: `python app.py`
4. Access your app - you'll see password entry page

### **Switch to Normal Mode**

1. Set `TESTING_MODE=false` in your `.env`
2. Configure Supabase variables (URL, keys, etc.)
3. Restart your server: `python app.py`
4. Access your app - you'll see normal landing page

## 🛠️ **New Architecture Benefits**

### **Environment Manager**
- Detects Flask dev server vs Gunicorn automatically
- Applies environment-specific optimizations
- Provides fallback configuration if backend unreachable

### **App Configuration**
- Different timing for Flask dev (slower) vs Gunicorn (faster)
- Consistent behavior across environments
- Detailed logging in development, quiet in production

### **Deterministic Initialization**
1. Environment detection first
2. Configuration loading
3. CSS and layout stabilization
4. Authentication initialization
5. UI application with proper timing

### **Layout Consistency**
- Forces single-column layout on localhost to match production
- Applies testing mode styles with proper timing
- Prevents grid layout issues

## 🐛 **Troubleshooting**

### **If UI elements appear incorrectly:**

1. Check browser console for initialization errors
2. Verify environment configuration at `/debug/config`
3. Clear browser cache and localStorage
4. Restart Flask server

### **If layout is wrong (sections beside chapters instead of below):**

1. Check if `single-column-layout` class is applied to body
2. Verify CSS files are loading completely
3. Check for JavaScript errors during initialization

### **If testing mode buttons don't appear correctly:**

1. Verify `TESTING_MODE=true` in environment
2. Check console for testing mode UI initialization logs
3. Ensure `testing-mode` class is applied to body
4. Clear browser cache

## 📊 **Configuration Verification**

Visit `/debug/config` in your browser to see:

```json
{
  "testing_mode": true,
  "server_type": "flask-dev",
  "environment": "development",
  "session_config": {
    "lifetime_hours": 24,
    "cookie_secure": false,
    "cookie_samesite": "Lax"
  }
}
```

## 🚀 **Running the Application**

### **Development (Flask)**
```bash
python app.py
```

### **Production (Gunicorn)**
```bash
gunicorn --bind 0.0.0.0:8000 app:app
```

## ✅ **Success Indicators**

You've configured everything correctly when:

1. **Console shows proper initialization order:**
   ```
   🔧 Step 1: Initializing environment manager...
   📋 Step 2: Initializing app configuration...
   🎯 Step 3: Applying environment settings...
   🎨 Step 4: Waiting for DOM stability...
   🌐 Step 5: Initializing router...
   ✨ Step 7: Completing UI transition...
   ✅ AudioBook Organizer initialized successfully
   ```

2. **Testing mode works identically on localhost and production:**
   - Password entry page appears
   - Exit button replaces sign-in button
   - No back arrow in navigation
   - Sections appear below chapters

3. **Layout is consistent:**
   - Chapters in top section
   - Sections in bottom section
   - No side-by-side layout issues

## 🔄 **Migration from Old System**

If you have an existing setup:

1. **Backup your current `.env` file**
2. **Update your `.env` with the new structure above**
3. **Clear browser cache and localStorage**
4. **Restart your Flask server**
5. **Test both testing mode and normal mode**

The new system is **backwards compatible** but provides much more reliable behavior across environments. 