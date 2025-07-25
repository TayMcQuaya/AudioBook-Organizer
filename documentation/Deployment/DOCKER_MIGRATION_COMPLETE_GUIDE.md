# Docker Migration Complete Guide: From Vercel + DigitalOcean to Unified Docker

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [What You Actually Need to Change](#what-you-actually-need-to-change)
3. [Security Analysis](#security-analysis)
4. [Domain Migration Requirements](#domain-migration-requirements)
5. [Implementation Steps](#implementation-steps)
6. [File-by-File Changes](#file-by-file-changes)
7. [Testing & Verification](#testing--verification)
8. [Rollback Plan](#rollback-plan)

## Executive Summary

### Current Architecture
- **Frontend**: Vercel (static hosting with CDN)
- **Backend**: DigitalOcean App Platform (Docker-based)
- **Database**: Supabase (external service - remains unchanged)
- **Issues**: Vercel caching delays, complex dual deployment

### Proposed Architecture
- **Unified**: Single Docker container on DigitalOcean App Platform
- **Benefits**: No caching issues, simpler deployment, cost savings
- **Security**: Actually more secure (no cross-origin risks)

## What You Actually Need to Change

### The Simple Truth:
You already have everything set up in DigitalOcean! You just need:

1. **One line in Dockerfile**: Add `COPY frontend/ ./frontend/`
2. **Update 5 files**: Change hardcoded URLs to your new domain
3. **Update environment variables**: In DigitalOcean dashboard (not YAML!)

**NO YAML FILES NEEDED!** DigitalOcean auto-detects your Dockerfile.

## Security Analysis

### Is Unified Deployment Less Secure? NO!

#### Current Setup Security Risks:
1. **Cross-Origin Requests**: Frontend → Backend requires CORS
2. **Attack Surface**: Two separate platforms to secure
3. **CORS Misconfiguration**: Common security vulnerability
4. **Split Security Policies**: Harder to manage consistently

#### Unified Docker Security Benefits:
1. ✅ **Same-Origin Policy**: Browser's built-in protection
2. ✅ **No CORS Required**: Eliminates cross-origin attack vectors
3. ✅ **Single Security Boundary**: One firewall, one SSL cert
4. ✅ **Unified Monitoring**: All logs in one place
5. ✅ **DDoS Protection**: DigitalOcean's built-in protection

#### Your Security Features (All Remain Intact):
- JWT Authentication ✓
- Supabase Row Level Security ✓
- reCAPTCHA Protection ✓
- Rate Limiting ✓
- Password Hashing (bcrypt) ✓
- CSRF Protection ✓
- Security Headers ✓

## Domain Migration Requirements

### Files Requiring Domain Updates

1. **Frontend API Configuration** - `/frontend/js/modules/api.js`
2. **Backend CORS Settings** - `/backend/app.py`
3. **Security Headers** - `/backend/middleware/security_headers.py`
4. **Environment Detection** - `/frontend/js/modules/envManager.js`
5. **Environment Variables** - `.env`

### Current Hardcoded Domains
- Frontend: `audio-book-organizer.vercel.app`
- Backend: `audiobook-organizer-test-vdhku.ondigitalocean.app`
- Local: `localhost:3000`, `localhost:5000`

## Implementation Steps

### Step 1: Update Dockerfile (One Line Change!)

**File**: `/Dockerfile`

Add this ONE line to include frontend files:

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code and main app file into the container
COPY backend/ ./backend/
COPY app.py .

# Copy frontend files into the container - THIS IS THE ONLY NEW LINE!
COPY frontend/ ./frontend/

# Create necessary directories
RUN mkdir -p uploads exports

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Set production environment variables
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False

# Run app.py when the container launches
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--worker-class", "gthread", "--timeout", "120", "--max-requests", "1000", "--max-requests-jitter", "100", "backend.app:create_app()"]
```

### Step 2: Update Environment Variables in DigitalOcean Dashboard

**NO YAML NEEDED!** Just update these in your DigitalOcean App Platform dashboard:

1. Go to your app in DigitalOcean dashboard
2. Click on "Settings" → "App-Level Environment Variables"
3. Update or add these variables:

```bash
# You're already using DigitalOcean dashboard for environment variables!
# Just update these existing variables:

# CHANGE THIS ONE:
BACKEND_URL=/api  # Change from full URL to relative path

# ADD THIS ONE (REQUIRED for payment redirects):
FRONTEND_URL=https://your-new-domain.com  # Your actual domain

# KEEP ALL YOUR EXISTING VARIABLES:
# FLASK_ENV=production
# SECRET_KEY=your-secret-key
# SUPABASE_URL=your-supabase-url
# SUPABASE_ANON_KEY=your-anon-key
# STRIPE_SECRET_KEY=your-stripe-key
# (etc... all your current variables stay the same)
```

That's it! DigitalOcean will automatically rebuild and deploy.

## File-by-File Changes

### 1. Frontend API Configuration

**File**: `/frontend/js/modules/api.js`  
**Line**: 16  
**Current**:
```javascript
getApiBaseUrl() {
    // In production, use the actual backend URL
    return 'https://audiobook-organizer-test-vdhku.ondigitalocean.app';
}
```

**Change to**:
```javascript
getApiBaseUrl() {
    // For unified deployment, use relative URL
    return window.location.origin + '/api';
    // Or if you have a custom domain:
    // return 'https://your-new-domain.com/api';
}
```

### 2. Backend CORS Configuration

**File**: `/backend/app.py`  
**Lines**: 51, 66-67  
**Current**:
```python
# Line 51
origins=r'https://audio-book-organizer(-[a-z0-9\-]+)?\.vercel\.app'

# Lines 66-67
origins=[
    "https://audio-book-organizer.vercel.app",
    r"https://audio-book-organizer.*\.vercel\.app",
]
```

**Change to**:
```python
# For unified deployment with custom domain
origins=[
    "https://your-new-domain.com",
    "http://localhost:3000",  # Keep for local development
    "http://localhost:8000",  # Local Docker testing
]

# Or if you want to disable CORS entirely (same-origin only):
# Comment out the CORS initialization entirely
```

### 3. Security Headers Configuration

**File**: `/backend/middleware/security_headers.py`  
**Line**: 18  
**Current**:
```python
"default-src 'self' https://audiobook-organizer-test-vdhku.ondigitalocean.app https://*.supabase.co https://js.stripe.com;"
```

**Change to**:
```python
"default-src 'self' https://your-new-domain.com https://*.supabase.co https://js.stripe.com;"
# Or for relative URLs:
"default-src 'self' https://*.supabase.co https://js.stripe.com;"
```

### 4. Environment Detection

**File**: `/frontend/js/modules/envManager.js`  
**Lines**: 111-112  
**Current**:
```javascript
if (hostname.includes('ondigitalocean.app') || hostname.includes('vercel.app')) {
    return 'production';
}
```

**Change to**:
```javascript
if (hostname.includes('your-new-domain.com') || hostname.includes('ondigitalocean.app')) {
    return 'production';
}
```

### 5. Frontend Configuration

**File**: `/frontend/js/config/appConfig.js`  
**Current**: Uses window.ENV.BACKEND_URL

**Add this logic**:
```javascript
export const appConfig = {
    appName: 'AudioBook Organizer',
    version: '1.0.0',
    environment: window.ENV?.ENVIRONMENT || 'production',
    
    // Support for unified deployment
    get backendUrl() {
        const configuredUrl = window.ENV?.BACKEND_URL;
        // If backend URL is relative or not set, use current origin
        if (!configuredUrl || configuredUrl.startsWith('/')) {
            return window.location.origin + (configuredUrl || '/api');
        }
        return configuredUrl;
    },
    
    // Rest of config...
};
```

### 6. Environment Variables (DigitalOcean Dashboard Only)

**Since you use DigitalOcean dashboard for environment variables:**

1. Go to your app in DigitalOcean dashboard
2. Navigate to Settings → App-Level Environment Variables
3. Update these variables:

```bash
# CHANGE THIS:
BACKEND_URL=/api  # Change from full URL to relative path

# ADD THIS:
FRONTEND_URL=https://your-new-domain.com  # Your actual domain
```

**Note**: Keep all your other existing environment variables exactly as they are!

### 7. Add Health Check Endpoint

**Create File**: `/backend/routes/health_routes.py`
```python
from flask import Blueprint, jsonify
from datetime import datetime
import os

health_bp = Blueprint('health', __name__)

@health_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'audiobook-organizer',
        'mode': os.getenv('APP_MODE', 'normal'),
        'timestamp': datetime.utcnow().isoformat()
    }), 200
```

**Add to**: `/backend/app.py` (after other blueprint imports)
```python
from backend.routes.health_routes import health_bp
# Then in create_app function:
app.register_blueprint(health_bp)
```

## Testing & Verification

### Local Docker Testing

1. **Build and Run**:
```bash
# Build Docker image
docker build -t audiobook-organizer .

# Run with environment variables
docker run -p 8000:8000 --env-file .env audiobook-organizer
```

2. **Test All Features**:
- [ ] Landing page: http://localhost:8000
- [ ] Authentication (both modes)
- [ ] File upload
- [ ] Audio playback
- [ ] Export functionality
- [ ] API endpoints: http://localhost:8000/api/health

### Production Deployment

1. **Push to GitHub**:
```bash
git add Dockerfile
git commit -m "Add frontend to Docker container"
git push origin main
```

2. **DigitalOcean Auto-Deploys**:
- Wait 5-10 minutes for automatic rebuild
- Check deployment logs in DigitalOcean dashboard

3. **Update DNS** (if changing domain):
- Add CNAME record pointing to `your-app.ondigitalocean.app`
- SSL certificate auto-provisions

4. **Verify Everything Works**:
- [ ] Your site loads at new URL
- [ ] Authentication works
- [ ] File upload/download works
- [ ] No console errors

## Rollback Plan

If issues occur:

1. **Immediate Rollback**:
   - Point DNS back to Vercel
   - Backend remains on DigitalOcean

2. **Debug**:
   - Check logs in DigitalOcean dashboard
   - Or use their mobile app for quick access

3. **Fix and Redeploy**:
   - Push fixes to GitHub
   - Auto-deploy triggers

## Common Issues & Solutions

### Issue: Static files not loading
**Solution**: Verify Dockerfile copies frontend folder

### Issue: API calls failing
**Solution**: Check BACKEND_URL is set correctly (relative vs absolute)

### Issue: Authentication not working
**Solution**: Verify SESSION_COOKIE_SECURE and domain settings

### Issue: CORS errors
**Solution**: Update origins in app.py or remove CORS for same-origin

## Flask vs Gunicorn Explanation

**Flask**: Your web application framework (the chef)  
**Gunicorn**: The production server (the waiters)

Your Dockerfile correctly uses Gunicorn to serve Flask in production with 3 workers for handling multiple requests simultaneously.

## Monitoring & Scaling

### Automatic Monitoring (Built-in):
- Health checks every 10 seconds
- Email alerts on failures
- Automatic restarts
- Performance metrics dashboard

### Scaling Options:
- Start with 1 instance ($5/month)
- Scale horizontally when needed
- DigitalOcean handles load balancing

## Summary: What You ACTUALLY Need to Do

1. **Add ONE line to Dockerfile**: `COPY frontend/ ./frontend/`
2. **Update 5 files**: Change hardcoded URLs (detailed above)
3. **Update 2 environment variables** in DigitalOcean dashboard:
   - Change `BACKEND_URL=/api`
   - Add `FRONTEND_URL=https://your-new-domain.com`
4. **Push to GitHub**: Auto-deploy handles the rest

**NO YAML FILES!** Your existing DigitalOcean setup handles everything.

This migration will:
- ✅ Solve all caching issues (no more Vercel delays!)
- ✅ Reduce costs (~50%)
- ✅ Simplify deployment (one platform instead of two)
- ✅ Improve security (no cross-origin requests)
- ✅ Keep everything working exactly the same

Total time: ~30 minutes of work + deployment time.