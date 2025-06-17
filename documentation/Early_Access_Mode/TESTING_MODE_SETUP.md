# 🧪 Testing Mode Setup Guide

## Overview

This temporary authentication system allows you to deploy your AudioBook Creator to production with simple password protection while bypassing the full Supabase authentication system during testing.

## Setup Steps

### 1. Environment Configuration

Create or update your `.env` file with these settings:

```env
# Enable testing mode
TESTING_MODE=true

# Set your temporary password (choose a strong password)
TEMPORARY_PASSWORD=your-secure-testing-password-here

# Your other existing environment variables...
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-production-secret-key
```

### 2. What Happens in Testing Mode

When `TESTING_MODE=true`:

✅ **Users see a password entry page** instead of the landing page  
✅ **Only the app page is accessible** after password entry  
✅ **Landing page, auth pages, and profile pages are blocked**  
✅ **Navigation links to landing/auth are hidden**  
✅ **All app functionality remains intact**  
✅ **Visual testing mode indicator appears**  
✅ **Exit testing button provided**  

### 3. User Experience

**Production Flow:**
1. User visits your website
2. Password entry page appears
3. User enters the temporary password
4. User gains access to the full app interface
5. All AudioBook Creator features work normally
6. No signup/login required

### 4. Security Features

- Password is stored in environment variables (server-side only)
- Session-based authentication prevents repeat password entry
- Failed attempts are logged
- No database dependencies for authentication
- Easy to disable by setting `TESTING_MODE=false`

### 5. Restoring Full Authentication

When testing is complete, simply:

1. Set `TESTING_MODE=false` in your `.env` file
2. Restart your application
3. Full Supabase authentication will be restored
4. Landing page and auth pages become accessible again

### 6. Development vs Production

**Development:** Keep `TESTING_MODE=false` for normal development  
**Production Testing:** Set `TESTING_MODE=true` with a strong password  
**Production Release:** Set `TESTING_MODE=false` to restore full features  

## Important Notes

⚠️ **This is temporary** - All original authentication code is preserved  
⚠️ **Use a strong password** - This is your only protection  
⚠️ **HTTPS recommended** - Use SSL/TLS in production  
⚠️ **Monitor access** - Keep track of who has the password  

## Quick Toggle Commands

**Enable Testing Mode:**
```bash
# Update .env file
echo "TESTING_MODE=true" >> .env
echo "TEMPORARY_PASSWORD=your-password-here" >> .env

# Restart application
python app.py
```

**Disable Testing Mode:**
```bash
# Update .env file (set to false)
TESTING_MODE=false

# Restart application  
python app.py
```

---

This system allows you to quickly deploy for testing while maintaining the ability to restore full functionality later! 