# 🚀 AudioBook Organizer - Complete Production & Development Guide

This comprehensive guide covers everything you need to know about deployment, environment switching, testing modes, and code updates for production.

## 📋 **1. FETCH CALLS THAT NEED UPDATING**

After scanning your entire codebase, here are the **remaining fetch calls** that need to be updated to `apiFetch`:

### ❌ **Files that NEED to be updated:**

#### `frontend/js/modules/auth.js`
- **Line 589**: `fetch('/api/auth/init-user', ...)` → **Needs `apiFetch`**
- **Line 634**: `fetch('/api/auth/login', ...)` → **Needs `apiFetch`**  
- **Line 847**: `fetch('/api/auth/status', ...)` → **Needs `apiFetch`**
- **Line 875**: `fetch('/api/auth/credits', ...)` → **Needs `apiFetch`**

#### `frontend/js/modules/export.js`
- **Line 224**: `fetch('/exports/${exportId}/metadata.json')` → **Needs `apiFetch`**

### ✅ **Files that are ALREADY CORRECT:**
- `storage.js` ✅ (Updated)
- `tempAuth.js` ✅ (Uses apiFetch)
- `sessionManager.js` ✅ (Uses apiFetch)
- `sections.js` ✅ (Uses apiFetch)
- `recaptcha.js` ✅ (Uses apiFetch)
- `bookUpload.js` ✅ (Uses apiFetch)

### 🏠 **Files that should STAY as regular fetch:**
- `router.js` → **Keep as `fetch`** (loads local HTML files: `/pages/landing/landing.html`, etc.)

---

## 🧪 **2. TESTING MODE vs NORMAL MODE**

Your app has two authentication systems that can be controlled independently:

### **Testing Mode** 🧪
- **Purpose**: Simple password-based access for testing/demos
- **Authentication**: Single password (set in `TEMPORARY_PASSWORD`)
- **Storage**: Uses `localStorage` instead of database
- **Features**: Full app functionality but isolated from production data

### **Normal Mode** 🔐
- **Purpose**: Full production authentication with Supabase
- **Authentication**: Email/password + Google OAuth
- **Storage**: Uses Supabase database
- **Features**: Complete user management, credits system, etc.

### **How to Switch Between Modes:**

#### **🏠 Local Development:**

**To Enable Testing Mode:**
```env
# In your .env file
TESTING_MODE=true
TEMPORARY_PASSWORD=your-test-password
```

**To Enable Normal Mode:**
```env
# In your .env file
TESTING_MODE=false
# Add your Supabase credentials
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

#### **🌐 Production (DigitalOcean):**

**To Enable Testing Mode in Production:**
Set these environment variables in DigitalOcean App Platform:
```
TESTING_MODE=true
TEMPORARY_PASSWORD=your-secure-password
```

**To Enable Normal Mode in Production:**
Set these environment variables in DigitalOcean App Platform:
```
TESTING_MODE=false
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

### **Testing Mode Features:**
- 🔐 Single password access at `/temp-auth`
- 💾 Data stored in browser localStorage
- 🧪 Special UI indicators showing "Testing Mode"
- 🚫 Blocks access to landing page and auth pages
- 🔄 Can exit testing mode with confirmation dialog

---

## 🔄 **3. SWITCHING BETWEEN LOCAL AND PRODUCTION**

Your app is designed to **automatically detect** the environment! Here's how it works:

### **Automatic Environment Detection:**

#### **Local Development** (Automatic):
- **Triggered when**: `localhost`, `127.0.0.1`, or any URL with a port number
- **Backend URL**: Uses relative paths (`''`)
- **Settings**: Debug mode enabled, development config

#### **Production** (Automatic):
- **Triggered when**: Deployed on Vercel domain
- **Backend URL**: Uses configured DigitalOcean URL
- **Settings**: Production optimizations enabled

### **Manual Override (if needed):**

If you need to force a specific environment, you can:

#### **Force Production Mode Locally:**
```javascript
// In frontend/js/modules/api.js, modify getApiBaseUrl():
return 'https://your-backend-url.ondigitalocean.app'; // Force production backend
```

#### **Force Local Backend on Production:**
```javascript
// In frontend/js/modules/api.js, modify getApiBaseUrl():
return ''; // Force relative paths (only works if backend is on same domain)
```

### **Easy Switching Commands:**

```bash
# Local Development
python app.py  # Automatically uses local settings

# Test Production Configuration Locally
FLASK_ENV=production python app.py  # Uses production config but local URLs

# Test with Production Backend Locally
# Update api.js to point to production URL temporarily
```

---

## 🚀 **4. COMPLETE DEPLOYMENT GUIDE**

### **Repository Structure for Deployment:**

You have **ONE repository** that deploys to **TWO platforms**:

```
AudioBook/                    # Your single repository
├── backend/                  # → Deploys to DigitalOcean
├── frontend/                 # → Deploys to Vercel
├── Dockerfile               # → DigitalOcean uses this
├── vercel.json             # → Vercel uses this
├── requirements.txt        # → DigitalOcean uses this
└── app.py                  # → DigitalOcean entry point
```

### **STEP 1: Prepare Your Code**

#### **Fix Remaining Fetch Calls:**
```bash
# Run this to update the remaining fetch calls
python fix-fetch-calls.py  # (I'll create this script)
```

#### **Push to GitHub:**
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main  # or your branch name
```

### **STEP 2: Deploy Backend to DigitalOcean**

#### **2.1: Create App on DigitalOcean**
1. Go to: https://cloud.digitalocean.com/apps
2. Click **"Launch App"**
3. Choose **GitHub** as source
4. Select your **AudioBook repository**
5. Choose branch (`main` or `prod1`)

#### **2.2: Configure Build Settings**
- **Source Directory**: `/` (root)
- **Dockerfile Path**: `Dockerfile`
- **HTTP Port**: `8000`

#### **2.3: Set Environment Variables** (Critical!)
Add these in DigitalOcean environment variables:
```env
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-here
PORT=8000

# For Normal Mode (recommended for production):
TESTING_MODE=false
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET_KEY=your-jwt-secret-key
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# OR for Testing Mode:
# TESTING_MODE=true
# TEMPORARY_PASSWORD=your-secure-test-password
```

#### **2.4: Deploy and Get URL**
- Click **"Deploy"**
- Wait for deployment to complete (5-10 minutes)
- Copy the generated URL: `https://your-app-abc123.ondigitalocean.app`

### **STEP 3: Configure Frontend for Production**

#### **3.1: Run Setup Script**
```bash
python deploy-setup.py --backend-url https://your-backend-url.ondigitalocean.app
```

#### **3.2: Update Fetch Calls**
```bash
# Fix remaining fetch calls (I'll create this script)
python fix-fetch-calls.py
```

#### **3.3: Commit Changes**
```bash
git add .
git commit -m "Configure frontend for production"
git push origin main
```

### **STEP 4: Deploy Frontend to Vercel**

#### **4.1: Create Project on Vercel**
1. Go to: https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your **GitHub repository**

#### **4.2: Configure Build Settings**
- **Framework Preset**: `Other`
- **Root Directory**: `frontend`
- **Build Command**: (leave empty)
- **Output Directory**: (leave empty)
- **Install Command**: (leave empty)

#### **4.3: Deploy**
- Click **"Deploy"**
- Wait for deployment (2-3 minutes)
- Get your live URL: `https://your-app.vercel.app`

### **STEP 5: Test Your Deployment**

#### **Backend Health Check:**
```bash
curl https://your-backend-url.ondigitalocean.app/api/test
```

#### **Frontend Test:**
1. Visit your Vercel URL
2. Test user registration/login
3. Upload a text file
4. Create sections and chapters
5. Export functionality

---

## 🔧 **MAINTENANCE & UPDATES**

### **Updating Your Deployment:**

#### **Backend Updates:**
1. Make changes to backend code
2. Push to GitHub
3. DigitalOcean automatically rebuilds and deploys

#### **Frontend Updates:**
1. Make changes to frontend code
2. Push to GitHub  
3. Vercel automatically rebuilds and deploys

#### **Environment Variable Updates:**
- **DigitalOcean**: Go to App Platform → Your App → Settings → Environment
- **Local**: Edit your `.env` file

### **Switching Between Testing and Normal Mode in Production:**

#### **Enable Testing Mode:**
```bash
# In DigitalOcean environment variables:
TESTING_MODE=true
TEMPORARY_PASSWORD=your-secure-password
# Remove or comment out Supabase variables
```

#### **Enable Normal Mode:**
```bash
# In DigitalOcean environment variables:
TESTING_MODE=false
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

### **Quick Environment Switching:**

You can create environment-specific configurations:

#### **Local Development (.env):**
```env
FLASK_ENV=development
TESTING_MODE=true
TEMPORARY_PASSWORD=dev123
```

#### **Production Normal (.env.production):**
```env
FLASK_ENV=production
TESTING_MODE=false
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

#### **Production Testing (.env.testing):**
```env
FLASK_ENV=production
TESTING_MODE=true
TEMPORARY_PASSWORD=secure-test-password
```

---

## 🎯 **SUMMARY**

### **What You Have Now:**
1. ✅ **Smart Environment Detection**: Automatically works locally and in production
2. ✅ **Dual Authentication Modes**: Testing mode and normal mode
3. ✅ **Single Repository Deployment**: One repo, two platforms
4. ✅ **Automatic Builds**: Push to GitHub = automatic deployment

### **Next Actions:**
1. **Fix remaining fetch calls** (I'll create the script)
2. **Deploy backend to DigitalOcean**
3. **Run setup script with backend URL**
4. **Deploy frontend to Vercel**
5. **Test everything works**

### **Environment Control:**
- **Local + Testing**: Set `TESTING_MODE=true` in `.env`
- **Local + Normal**: Set `TESTING_MODE=false` in `.env` with Supabase credentials
- **Production + Testing**: Set `TESTING_MODE=true` in DigitalOcean environment
- **Production + Normal**: Set `TESTING_MODE=false` in DigitalOcean environment

Your app is designed to be flexible and work in any combination of these modes! 🎉 