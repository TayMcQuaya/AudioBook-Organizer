# Docker Migration Implementation Guide

## Pre-Migration Checklist

- [ ] Backup current production data
- [ ] Document all current environment variables
- [ ] Test current functionality thoroughly
- [ ] Ensure Git repository is up to date

## Step 1: Update Dockerfile

**File**: `/Dockerfile`

```dockerfile
# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies for audio processing
# ffmpeg is required by pydub for MP3 conversion
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

# Copy frontend files into the container - NEW LINE
COPY frontend/ ./frontend/

# Create necessary directories
RUN mkdir -p uploads exports

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Set production environment variables
ENV FLASK_ENV=production
ENV FLASK_DEBUG=False

# Run app.py when the container launches with optimized settings for concurrency
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "--threads", "2", "--worker-class", "gthread", "--timeout", "120", "--max-requests", "1000", "--max-requests-jitter", "100", "backend.app:create_app()"]
```

## Step 2: Update Frontend Configuration

**File**: `frontend/js/config/appConfig.js`

```javascript
export const appConfig = {
    appName: 'AudioBook Organizer',
    version: '1.0.0',
    environment: window.ENV?.ENVIRONMENT || 'production',
    
    // Update to support same-domain deployment
    get backendUrl() {
        // If backend URL is not set or is relative, use current origin
        const configuredUrl = window.ENV?.BACKEND_URL;
        if (!configuredUrl || configuredUrl.startsWith('/')) {
            return window.location.origin + (configuredUrl || '/api');
        }
        return configuredUrl;
    },
    
    // Rest of the config remains the same...
    supabase: {
        url: window.ENV?.SUPABASE_URL || '',
        anonKey: window.ENV?.SUPABASE_ANON_KEY || ''
    },
    
    features: {
        enableTesting: window.ENV?.ENABLE_TESTING === 'true',
        enableAuth: window.ENV?.ENABLE_AUTH !== 'false',
        enablePayments: window.ENV?.ENABLE_PAYMENTS === 'true'
    }
};
```

## Step 3: Update API Module for Relative URLs

**File**: `frontend/js/modules/api.js`

Update the API module to handle relative URLs properly:

```javascript
// Add at the beginning of makeRequest function
async makeRequest(endpoint, options = {}) {
    try {
        // Handle relative URLs for same-domain deployment
        const baseUrl = appConfig.backendUrl;
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
        
        // Set default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Rest of the function remains the same...
```

## Step 4: Update Backend App Configuration

**File**: `backend/app.py`

Ensure CORS is configured for production:

```python
def create_app():
    # ... existing code ...
    
    # Update CORS configuration for unified deployment
    if not app.config.get('TESTING'):
        # In production with unified deployment, we might not need CORS
        # or can restrict it to specific origins
        CORS(app, origins=[
            "http://localhost:3000",
            "http://localhost:8000",
            app.config.get('FRONTEND_URL', '*')
        ])
    else:
        CORS(app)
    
    # ... rest of the configuration ...
```

## Step 5: Create DigitalOcean App Spec

**File**: `app-spec.yaml`

```yaml
name: audiobook-organizer
region: nyc
services:
- name: web
  github:
    repo: YOUR_GITHUB_USERNAME/AudioBook-Organizer
    branch: main
    deploy_on_push: true
  dockerfile_path: Dockerfile
  source_dir: /
  http_port: 8000
  instance_count: 1
  instance_size_slug: basic-xs
  health_check:
    http_path: /api/health
    initial_delay_seconds: 10
    period_seconds: 10
    timeout_seconds: 5
    success_threshold: 1
    failure_threshold: 3
  envs:
  # Core Configuration
  - key: FLASK_ENV
    value: "production"
  - key: APP_MODE
    value: "normal"  # or "testing" for early access
  
  # Supabase Configuration
  - key: SUPABASE_URL
    value: "YOUR_SUPABASE_URL"
  - key: SUPABASE_KEY
    value: "YOUR_SUPABASE_SERVICE_KEY"
    type: SECRET
  
  # Session Configuration
  - key: SECRET_KEY
    value: "YOUR_SECRET_KEY"
    type: SECRET
  - key: SESSION_COOKIE_SECURE
    value: "True"
  - key: SESSION_COOKIE_SAMESITE
    value: "Lax"
  
  # Security Configuration
  - key: RECAPTCHA_SECRET_KEY
    value: "YOUR_RECAPTCHA_SECRET"
    type: SECRET
  
  # File Upload Configuration
  - key: MAX_CONTENT_LENGTH
    value: "524288000"  # 500MB
  
  # URL Configuration
  - key: BACKEND_URL
    value: "/api"
  - key: FRONTEND_URL
    value: "https://your-domain.com"
  
  # Feature Flags
  - key: ENABLE_TESTING
    value: "false"
  - key: ENABLE_AUTH
    value: "true"
  - key: ENABLE_PAYMENTS
    value: "true"
  
  # Payment Configuration (if using Stripe)
  - key: STRIPE_SECRET_KEY
    value: "YOUR_STRIPE_SECRET_KEY"
    type: SECRET
  - key: STRIPE_WEBHOOK_SECRET
    value: "YOUR_STRIPE_WEBHOOK_SECRET"  
    type: SECRET
```

## Step 6: Add Health Check Endpoint

**File**: `backend/routes/health_routes.py`

Create a new file:

```python
from flask import Blueprint, jsonify
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

Add to `backend/app.py`:

```python
from backend.routes.health_routes import health_bp
app.register_blueprint(health_bp)
```

## Step 7: Update .gitignore

Ensure Docker-related files are properly handled:

```
# Docker
.dockerignore
docker-compose.override.yml

# DigitalOcean
.do/
app-spec.local.yaml
```

## Step 8: Create Docker Compose for Local Testing

**File**: `docker-compose.yml`

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - FLASK_ENV=development
      - APP_MODE=testing
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - ./exports:/app/exports
```

## Step 9: Testing Procedures

### Local Docker Testing

```bash
# Build the Docker image
docker build -t audiobook-organizer .

# Run with environment file
docker run -p 8000:8000 --env-file .env audiobook-organizer

# Or use docker-compose
docker-compose up
```

### Test Checklist

- [ ] Landing page loads correctly
- [ ] Authentication flow works (both testing and normal modes)
- [ ] File upload functionality
- [ ] Audio processing and playback
- [ ] Export functionality
- [ ] Payment flow (if enabled)
- [ ] All API endpoints respond correctly
- [ ] Static assets load properly
- [ ] No CORS errors in console

## Step 10: Deployment to DigitalOcean

### Using DigitalOcean CLI

```bash
# Install doctl (DigitalOcean CLI)
# Login to DigitalOcean
doctl auth init

# Create app from spec
doctl apps create --spec app-spec.yaml

# Or update existing app
doctl apps update YOUR_APP_ID --spec app-spec.yaml
```

### Using GitHub Integration

1. Push code to GitHub
2. Connect repository in DigitalOcean App Platform
3. Configure environment variables in App Platform dashboard
4. Deploy

## Step 11: Post-Deployment Verification

### Update DNS Records

Point your domain to the new DigitalOcean app:
- Type: CNAME
- Name: @ (or subdomain)
- Value: your-app.ondigitalocean.app

### SSL Certificate

DigitalOcean App Platform automatically provisions Let's Encrypt certificates.

### Monitor Logs

```bash
# View app logs
doctl apps logs YOUR_APP_ID --follow
```

## Step 12: Rollback Plan

If issues occur:

1. **Immediate Rollback**: 
   - Revert DNS to Vercel
   - Keep DigitalOcean backend running

2. **Fix Forward**:
   - Debug using DigitalOcean logs
   - Deploy fixes through GitHub

3. **Data Safety**:
   - Supabase data remains unaffected
   - Local file storage can be backed up

## Performance Optimization

### 1. Add Nginx Reverse Proxy (Optional)

For better static file serving, add Nginx:

```dockerfile
# In Dockerfile, add Nginx
RUN apt-get update && apt-get install -y nginx
COPY nginx.conf /etc/nginx/nginx.conf
```

### 2. Enable Gzip Compression

Add to Flask app:

```python
from flask_compress import Compress
Compress(app)
```

### 3. Add CDN (Optional)

For global performance:
- Cloudflare
- DigitalOcean Spaces CDN
- Fastly

## Maintenance Scripts

### Backup Uploads

```bash
#!/bin/bash
# backup-uploads.sh
doctl apps logs YOUR_APP_ID > logs-$(date +%Y%m%d).log
# Add rsync or similar for file backup
```

### Environment Update

```bash
#!/bin/bash
# update-env.sh
doctl apps update YOUR_APP_ID --spec app-spec.yaml
```

## Troubleshooting Common Issues

### 1. Static Files Not Loading
- Check Dockerfile includes frontend copy
- Verify static routes in Flask
- Check browser console for 404s

### 2. Authentication Issues
- Verify environment variables
- Check session cookie settings
- Ensure SECRET_KEY is set

### 3. File Upload Failures
- Check upload directory permissions
- Verify MAX_CONTENT_LENGTH
- Monitor disk space

### 4. CORS Errors
- Update allowed origins
- Check API endpoint URLs
- Verify cookie settings

## Success Metrics

Monitor these after migration:
- Page load time < 2s
- API response time < 200ms
- Zero failed deployments
- 99.9% uptime
- No increase in error rates

## Conclusion

This migration maintains all existing functionality while solving caching issues and simplifying deployment. The unified architecture reduces complexity and improves maintainability.