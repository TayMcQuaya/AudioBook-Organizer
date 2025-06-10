# 🛡️ Security Setup Guide - AudioBook Organizer

## Overview

This guide covers the setup and testing of the enhanced security features including reCAPTCHA v3, rate limiting, and advanced authentication protection.

## 🔒 Security Features Implemented

### ✅ Completed Security Features

1. **Google reCAPTCHA v3 Integration**
   - Invisible reCAPTCHA on all auth forms
   - Score-based bot detection
   - Action-specific verification (login, signup, forgot_password)

2. **Rate Limiting**
   - Per-IP authentication attempt limits
   - Configurable thresholds
   - Exponential backoff for failed attempts

3. **Login Attempt Protection**
   - Failed login tracking per email/IP
   - Temporary lockouts after multiple failures
   - Configurable time windows

4. **Enhanced JWT Security**
   - Proper token verification with Supabase secrets
   - Audience validation
   - Expiration checking
   - Secure token extraction

5. **Password Security**
   - Configurable complexity requirements
   - Strength indicators
   - Real-time validation

## 🚀 Setup Instructions

### 1. Environment Configuration

Copy `env.example` to `.env` and configure the following:

```bash
cp env.example .env
```

#### Required reCAPTCHA Settings
```env
# reCAPTCHA v3 Settings
RECAPTCHA_ENABLED=true
RECAPTCHA_SITE_KEY=your-site-key-from-google
RECAPTCHA_SECRET_KEY=your-secret-key-from-google
RECAPTCHA_THRESHOLD=0.5
```

#### Security Settings
```env
# Rate Limiting
RATE_LIMITING_ENABLED=true
AUTH_ATTEMPTS_PER_MINUTE=5
AUTH_ATTEMPTS_PER_HOUR=20

# Login Protection
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW=900
```

#### Supabase Settings
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

### 2. Google reCAPTCHA Setup

#### Step 1: Create reCAPTCHA Site
1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "+" to create a new site
3. Fill in the form:
   - **Label**: AudioBook Organizer
   - **reCAPTCHA type**: reCAPTCHA v3
   - **Domains**: 
     - `localhost` (for development)
     - `yourdomain.com` (for production)
   - Accept the terms

#### Step 2: Get Keys
1. Copy the **Site Key** to `RECAPTCHA_SITE_KEY` in `.env`
2. Copy the **Secret Key** to `RECAPTCHA_SECRET_KEY` in `.env`

#### Step 3: Update HTML (if needed)
The HTML template includes a placeholder for the site key:
```html
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_SITE_KEY"></script>
```

Replace `YOUR_SITE_KEY` with your actual site key in `frontend/pages/auth/auth.html`.

### 3. Supabase Configuration

#### Step 1: Get Supabase Credentials
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to Settings > API
3. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_ANON_KEY`
   - **JWT Secret** → `JWT_SECRET_KEY` (from JWT Settings)

#### Step 2: Database Setup
Run the database schema if you haven't already:
```sql
-- Run the contents of database_schema.sql in your Supabase SQL editor
```

### 4. Installation

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Start the Development Server
```bash
python backend/app.py
```

## 🧪 Testing Guide

### 1. Basic Security Tests

#### Test reCAPTCHA Integration
1. Open `http://localhost:3000/auth`
2. Check browser console for reCAPTCHA initialization messages
3. Look for "Protected by reCAPTCHA" indicator
4. Submit forms and verify reCAPTCHA tokens in network requests

#### Test Rate Limiting
1. Disable reCAPTCHA temporarily: `RECAPTCHA_ENABLED=false`
2. Attempt login 6+ times rapidly
3. Verify rate limit error (429 status)
4. Wait for cooldown period

#### Test Login Attempt Protection
1. Try logging in with wrong password 6+ times
2. Verify account lockout message
3. Wait for cooldown (15 minutes by default)

### 2. Security Status Endpoint

Check security configuration:
```bash
curl http://localhost:3000/api/auth/security-status
```

Expected response:
```json
{
  "success": true,
  "security_status": {
    "recaptcha_enabled": true,
    "recaptcha_site_key": "your-site-key",
    "rate_limiting_enabled": true,
    "rate_limit_status": {
      "allowed": true,
      "remaining_minute": 5,
      "remaining_hour": 20
    },
    "client_ip": "127.0.0.1",
    "security_features": {
      "rate_limiting": true,
      "login_attempt_protection": true,
      "captcha_protection": true,
      "jwt_verification": true
    }
  }
}
```

### 3. Manual Testing Checklist

#### ✅ Login Form Testing
- [ ] Form validates email format
- [ ] Password strength indicator works
- [ ] reCAPTCHA token generated on submit
- [ ] Rate limiting prevents spam attempts
- [ ] Failed attempts are tracked
- [ ] Success redirects to dashboard

#### ✅ Signup Form Testing
- [ ] All required fields validated
- [ ] Password confirmation matching
- [ ] Terms and conditions required
- [ ] reCAPTCHA verification
- [ ] Rate limiting active
- [ ] Email format validation

#### ✅ Forgot Password Testing
- [ ] Email validation
- [ ] reCAPTCHA required
- [ ] Rate limiting prevents abuse
- [ ] Success message displayed

#### ✅ Security Indicators
- [ ] reCAPTCHA badge visible
- [ ] Processing states show correctly
- [ ] Error messages clear and helpful
- [ ] Loading states prevent double-submission

### 4. Browser Testing

Test across different browsers and devices:
- ✅ Chrome (desktop/mobile)
- ✅ Firefox
- ✅ Safari
- ✅ Edge

### 5. Production Testing

Before deploying to production:

1. **Update domains in reCAPTCHA settings**
2. **Test with production URLs**
3. **Verify HTTPS configuration**
4. **Check security headers**
5. **Test rate limiting under load**

## 🔧 Configuration Options

### reCAPTCHA Settings

```env
# Enable/disable reCAPTCHA
RECAPTCHA_ENABLED=true

# Score threshold (0.0 to 1.0, lower = stricter)
RECAPTCHA_THRESHOLD=0.5

# Keys from Google
RECAPTCHA_SITE_KEY=your-site-key
RECAPTCHA_SECRET_KEY=your-secret-key
```

### Rate Limiting

```env
# Enable rate limiting
RATE_LIMITING_ENABLED=true

# Attempts per time window
AUTH_ATTEMPTS_PER_MINUTE=5
AUTH_ATTEMPTS_PER_HOUR=20
```

### Login Protection

```env
# Failed login attempts before lockout
MAX_LOGIN_ATTEMPTS=5

# Lockout duration in seconds (900 = 15 minutes)
LOGIN_ATTEMPT_WINDOW=900
```

## 🚨 Security Best Practices

### 1. Production Deployment

- [ ] Use HTTPS in production
- [ ] Set secure cookie flags
- [ ] Configure proper CORS headers
- [ ] Use environment variables for secrets
- [ ] Enable security headers
- [ ] Set up monitoring and alerts

### 2. reCAPTCHA Best Practices

- [ ] Monitor reCAPTCHA scores and adjust threshold
- [ ] Handle reCAPTCHA service outages gracefully
- [ ] Implement fallback verification methods
- [ ] Regularly review reCAPTCHA analytics

### 3. Rate Limiting

- [ ] Monitor rate limit triggers
- [ ] Adjust limits based on usage patterns
- [ ] Implement IP whitelisting for trusted sources
- [ ] Consider geographic rate limiting

### 4. Monitoring

Set up alerts for:
- [ ] High reCAPTCHA failure rates
- [ ] Rate limit triggers
- [ ] Failed authentication attempts
- [ ] Unusual traffic patterns

## 🐛 Troubleshooting

### Common Issues

#### reCAPTCHA Not Loading
1. Check if site key is correct
2. Verify domain is registered in reCAPTCHA settings
3. Check browser console for errors
4. Ensure internet connectivity

#### Rate Limiting Too Strict
1. Adjust limits in `.env` file
2. Restart the server
3. Clear any existing rate limit data

#### Authentication Failures
1. Verify Supabase configuration
2. Check JWT secret is correct
3. Ensure database schema is up to date
4. Verify network connectivity to Supabase

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request format and required fields |
| 401 | Unauthorized | Verify authentication credentials |
| 429 | Rate Limited | Wait for cooldown period |
| 503 | Service Unavailable | Check service configuration |

## 📊 Security Metrics

Monitor these metrics in production:

1. **reCAPTCHA Scores**: Average score and failure rates
2. **Rate Limit Hits**: Frequency and patterns
3. **Failed Login Attempts**: Trends and source IPs
4. **Authentication Success Rates**: Overall system health
5. **Response Times**: Impact of security measures on performance

## 🔄 Future Enhancements

Planned security improvements:

1. **Multi-Factor Authentication (MFA)**
   - TOTP support
   - SMS verification
   - Email verification

2. **Advanced Threat Detection**
   - IP geolocation analysis
   - Device fingerprinting
   - Behavioral analysis

3. **Enhanced Session Management**
   - Session rotation
   - Concurrent session limits
   - Device management

4. **Security Headers**
   - Content Security Policy
   - HSTS headers
   - X-Frame-Options

5. **Audit Logging**
   - Comprehensive security event logging
   - Suspicious activity detection
   - Compliance reporting

---

## ✅ Quick Start Checklist

1. [ ] Copy `env.example` to `.env`
2. [ ] Set up Google reCAPTCHA (get site and secret keys)
3. [ ] Configure Supabase credentials
4. [ ] Install dependencies: `pip install -r requirements.txt`
5. [ ] Start server: `python backend/app.py`
6. [ ] Test authentication at `http://localhost:3000/auth`
7. [ ] Verify security features are working
8. [ ] Review security configuration for production

For questions or issues, refer to the troubleshooting section or check the application logs.