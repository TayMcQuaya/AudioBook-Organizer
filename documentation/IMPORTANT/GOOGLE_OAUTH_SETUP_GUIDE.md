# 🔐 Google OAuth Setup Guide for AudioBook Creator

## Overview

This guide will help you set up Google OAuth authentication for your AudioBook Creator application using Supabase. The integration is now complete on the frontend - you just need to configure the backend services.

## 📋 Prerequisites

- A Google Cloud Platform (GCP) account
- A Supabase project
- Access to your AudioBook Creator backend configuration

---

## 🚀 Step 1: Google Cloud Console Setup

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Enter a project name (e.g., "AudioBook Creator Auth")
4. Click **"Create"**

### 1.2 Enable Google+ API

1. Navigate to **"APIs & Services" → "Library"**
2. Search for **"Google+ API"**
3. Click on it and press **"Enable"**

### 1.3 Create OAuth 2.0 Credentials

1. Go to **"APIs & Services" → "Credentials"**
2. Click **"+ Create Credentials" → "OAuth 2.0 Client IDs"**
3. If prompted, configure the **OAuth Consent Screen** first:
   - Choose **"External"** for user type
   - Fill in required fields:
     - App name: `AudioBook Creator`
     - User support email: Your email
     - Developer contact info: Your email
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed
4. Create the OAuth client:
   - Application type: **"Web application"**
   - Name: `AudioBook Creator Web Client`
   - **Authorized JavaScript origins:**
     ```
     http://localhost:3000
     https://yourdomain.com
     ```
   - **Authorized redirect URIs:**
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```

### 1.4 Save Your Credentials

After creating, you'll get:
- **Client ID**: `xxxxx.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-xxxxx`

**⚠️ Keep these secure! You'll need them for Supabase configuration.**

---

## 🔧 Step 2: Supabase Configuration

### 2.1 Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your AudioBook Creator project
3. Navigate to **"Authentication" → "Providers"**

### 2.2 Configure Google Provider

1. Find **"Google"** in the providers list
2. Toggle it **ON**
3. Enter your Google credentials:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
4. **Redirect URL** should already be filled:
   ```
   https://your-project.supabase.co/auth/v1/callback
   
   ```
5. Click **"Save"**

### 2.3 Update Site URL

1. Go to **"Authentication" → "URL Configuration"**
2. Set **Site URL** to your application URL:
   ```
   http://localhost:3000    (for development)
   https://yourdomain.com   (for production)
   ```
3. Add **Redirect URLs**:
   ```
   http://localhost:3000/app
   https://yourdomain.com/app
   ```

---

## 🖥️ Step 3: Backend Configuration

### 3.1 Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration (you should already have these)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Optional: Google OAuth direct configuration (if needed)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3.2 Backend Service Updates

Your existing `supabase_service.py` should already handle OAuth users automatically. However, you might want to add user profile handling for Google OAuth users.

Add this method to your `SupabaseService` class:

```python
def handle_oauth_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle OAuth user data and ensure profile exists"""
    try:
        user_id = user_data.get('id')
        email = user_data.get('email')
        
        # Extract Google profile data
        user_metadata = user_data.get('user_metadata', {})
        full_name = user_metadata.get('full_name') or user_metadata.get('name')
        avatar_url = user_metadata.get('avatar_url') or user_metadata.get('picture')
        
        # Check if user profile exists
        existing_profile = self.get_user_profile(user_id)
        
        if not existing_profile:
            # Create new profile for OAuth user
            profile_data = {
                'email': email,
                'full_name': full_name,
                'avatar_url': avatar_url,
                'auth_provider': 'google'
            }
            self.create_user_profile(user_id, email, profile_data)
            
            # Initialize credits for new user
            self.initialize_user_credits(user_id, 100)
            
            logger.info(f"✅ Created profile for Google OAuth user: {email}")
        
        return {
            'success': True,
            'user': user_data,
            'is_new_user': not existing_profile
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to handle OAuth user: {e}")
        return {
            'success': False,
            'error': str(e)
        }
```

---

## 🧪 Step 4: Testing

### 4.1 Frontend Testing

1. Start your application:
   ```bash
   # Start your backend server
   python app.py
   
   # Navigate to your frontend
   # Open http://localhost:3000/auth
   ```

2. Click **"Continue with Google"** button
3. You should be redirected to Google OAuth
4. After authentication, you should return to `/app`

### 4.2 Check Browser Console

Look for these log messages:
```
🔍 Initiating Google sign-in...
✅ Google sign-in initiated
```

### 4.3 Check Supabase Dashboard

1. Go to **"Authentication" → "Users"**
2. You should see your Google OAuth user listed
3. Check the user metadata for Google profile info

---

## 🔍 Step 5: Troubleshooting

### Common Issues

#### ❌ "redirect_uri_mismatch" Error

**Problem**: Google OAuth redirect URI doesn't match configuration

**Solution**:
1. Check your Google Console authorized redirect URIs
2. Ensure they match your Supabase callback URL exactly:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

#### ❌ "invalid_client" Error

**Problem**: Google Client ID or Secret is incorrect

**Solution**:
1. Double-check your Google Console credentials
2. Verify they're correctly entered in Supabase dashboard
3. Ensure no extra spaces or characters

#### ❌ OAuth Popup Blocked

**Problem**: Browser blocks OAuth popup

**Solution**:
1. The current implementation uses redirect (not popup) - this should work
2. Check browser console for popup blocker messages
3. Ensure HTTPS in production (OAuth requires secure origins)

#### ❌ User Profile Not Created

**Problem**: User authenticates but profile isn't created

**Solution**:
1. Check your backend logs for profile creation errors
2. Ensure your database tables exist
3. Verify the `handle_oauth_user` method is called

### Debug Commands

#### Frontend Console Testing:
```javascript
// Check if auth module is available
console.log('Auth module:', window.authModule);

// Test Google OAuth method
window.authModule.signInWithGoogle()
  .then(result => console.log('OAuth result:', result))
  .catch(error => console.error('OAuth error:', error));

// Check current auth state
console.log('Current user:', window.authModule.getCurrentUser());
console.log('Is authenticated:', window.authModule.isAuthenticated());
```

#### Backend API Testing:
```bash
# Check if Supabase service is working
curl -X GET http://localhost:5000/api/auth/config

# Check user status after OAuth
curl -X GET http://localhost:5000/api/auth/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Step 6: Production Deployment

### 6.1 Update Google OAuth Settings

1. In Google Console, add your production domain:
   - **Authorized JavaScript origins**: `https://yourdomain.com`
   - **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`

### 6.2 Update Supabase Settings

1. In Supabase dashboard:
   - **Site URL**: `https://yourdomain.com`
   - **Redirect URLs**: `https://yourdomain.com/app`

### 6.3 Environment Variables

Ensure production environment has:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key
SUPABASE_JWT_SECRET=your-production-jwt-secret
```

---

## ✅ Verification Checklist

- [ ] Google Cloud project created
- [ ] Google OAuth credentials configured
- [ ] Supabase Google provider enabled
- [ ] Redirect URLs correctly set
- [ ] Environment variables configured
- [ ] Frontend Google buttons working
- [ ] OAuth flow redirects to Google
- [ ] User returns to app after authentication
- [ ] User profile created in database
- [ ] Credits initialized for new users

---

## 🚀 Your Integration is Ready!

Once you complete these steps, your Google OAuth integration will be fully functional. Users will be able to:

1. ✅ Click "Continue with Google" on login/signup forms
2. ✅ Authenticate with their Google account
3. ✅ Automatically return to the app with full access
4. ✅ Have their profile and credits set up automatically
5. ✅ Use all app features seamlessly

The frontend code is already implemented and will work as soon as you configure the backend services!

### 🛡️ reCAPTCHA Note

Google OAuth **bypasses** your reCAPTCHA protection (which is expected behavior), since Google's own authentication already provides strong security verification. Users who sign in with Google won't trigger reCAPTCHA challenges, but users using email/password will still be protected by your reCAPTCHA v3 implementation.

---

## 📞 Need Help?

If you encounter issues:

1. Check browser console for frontend errors
2. Check backend logs for API errors
3. Verify all URLs match exactly between services
4. Test with different browsers/incognito mode
5. Ensure all environment variables are set correctly

Your Google OAuth integration is now complete! 🎉 