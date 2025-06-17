# 🚀 AudioBook Organizer - Deployment Guide

This guide will help you deploy your AudioBook Organizer to production while maintaining the ability to develop locally.

## 📋 Prerequisites

- **GitHub Repository**: Your code should be pushed to a GitHub repository
- **DigitalOcean Account**: For backend deployment
- **Vercel Account**: For frontend deployment  
- **Supabase Project**: For database and authentication

## 🔧 Quick Setup

### 1. **Prepare for Deployment**

First, you'll deploy your backend to get the URL, then use our setup script:

```bash
# After you have your DigitalOcean backend URL, run:
python deploy-setup.py --backend-url https://your-backend-url.ondigitalocean.app
```

This script will:
- ✅ Update frontend configuration files
- ✅ Create environment templates
- ✅ Show you the next steps

### 2. **Backend Deployment (DigitalOcean)**

1. **Go to DigitalOcean App Platform**
   - Visit: https://cloud.digitalocean.com/apps
   - Click "Launch App"

2. **Connect Your Repository**
   - Select GitHub as source
   - Choose your AudioBook repository
   - Select branch (usually `main` or `prod1`)

3. **Configure App Settings**
   - DigitalOcean will auto-detect the Dockerfile
   - Keep the default settings

4. **Set Environment Variables** (Critical!)
   ```
   FLASK_ENV=production
   SECRET_KEY=your-secret-key-here
   SUPABASE_URL=your-supabase-project-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   JWT_SECRET_KEY=your-jwt-secret-key
   RECAPTCHA_SITE_KEY=your-recaptcha-site-key
   RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
   ```

5. **Deploy and Get URL**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy the generated URL (e.g., `https://your-app-abc123.ondigitalocean.app`)

### 3. **Frontend Deployment (Vercel)**

1. **Run the Setup Script** (using the URL from step 2)
   ```bash
   python deploy-setup.py --backend-url https://your-backend-url.ondigitalocean.app
   ```

2. **Deploy to Vercel**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure settings:
     - **Framework Preset**: Other
     - **Root Directory**: `frontend`
     - **Build Command**: (leave empty)
     - **Output Directory**: (leave empty)
   - Click "Deploy"

## 🏠 Local Development

Your app is now configured to work both locally and in production!

### Running Locally

```bash
# Backend
python app.py

# Frontend
# Open http://localhost:3000 in your browser
# The frontend will automatically connect to your local backend
```

### Environment Variables for Local Development

Create a `.env` file in the root directory:

```env
# Local Development Environment
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=dev-secret-key
FLASK_HOST=localhost
FLASK_PORT=3000

# Your Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
JWT_SECRET_KEY=your-jwt-secret

# Optional: Testing Mode
TESTING_MODE=true
TEMPORARY_PASSWORD=test123
```

## 🔄 How It Works

### Environment Detection

The app automatically detects whether it's running locally or in production:

- **Local Development**: 
  - Frontend uses relative URLs to connect to local backend
  - Backend runs on `localhost:3000`
  - Debug mode enabled

- **Production**:
  - Frontend connects to your DigitalOcean backend URL
  - Backend runs on DigitalOcean with production settings
  - Debug mode disabled

### Configuration Files

- **`frontend/js/modules/api.js`**: Handles environment detection and API routing
- **`frontend/public/index.html`**: Contains configuration script
- **`backend/config.py`**: Environment-based backend configuration
- **`Dockerfile`**: Production container configuration

## 🛠️ Troubleshooting

### Backend Issues

1. **Environment Variables**: Make sure all required variables are set in DigitalOcean
2. **Logs**: Check DigitalOcean app logs for errors
3. **Health Check**: Visit `https://your-backend-url.ondigitalocean.app/api/test`

### Frontend Issues

1. **API Connection**: Check browser console for API errors
2. **Configuration**: Verify backend URL is correctly set
3. **CORS**: Make sure your backend allows your frontend domain

### Local Development Issues

1. **Port Conflicts**: Make sure port 3000 is available
2. **Environment Variables**: Check your `.env` file exists and is properly formatted
3. **Dependencies**: Run `pip install -r requirements.txt`

## 📱 Testing Your Deployment

### Backend Health Check
```bash
curl https://your-backend-url.ondigitalocean.app/api/test
```

### Frontend Test
1. Visit your Vercel URL
2. Try creating an account
3. Upload a text file
4. Check that all features work

## 🔒 Security Notes

- Never commit `.env` files to Git
- Use strong secret keys in production
- Enable HTTPS (both platforms do this automatically)
- Set up proper CORS headers (already configured)

## 📞 Need Help?

If you encounter issues:

1. Check the logs in both DigitalOcean and Vercel dashboards
2. Verify all environment variables are set correctly
3. Test your backend endpoints directly
4. Check browser console for frontend errors

---

**Your AudioBook Organizer is now ready for production! 🎉**

The app will automatically work in both local development and production environments without any code changes needed. 