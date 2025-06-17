# 🚀 QUICK DEPLOYMENT GUIDE - Testing Mode

## What You're Deploying
- **Backend**: Flask app to DigitalOcean (API server)
- **Frontend**: Static files to Vercel (Web interface)
- **Mode**: Testing Mode (simple password access, no database needed)

## Step 1: Deploy Backend to DigitalOcean

### 1.1 Create DigitalOcean App
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Choose "GitHub" as source
4. Select your repository and `prod1` branch
5. DigitalOcean will auto-detect the Dockerfile

### 1.2 Set Environment Variables
In the DigitalOcean app settings, add these environment variables:

```
FLASK_ENV=production
TESTING_MODE=true
TEMPORARY_PASSWORD=YourTestPassword123
SECRET_KEY=your-super-secret-key-change-this
```

### 1.3 Deploy
- Click "Create Resources"
- Wait for deployment (5-10 minutes)
- Copy your app URL (will be something like: `https://your-app-name.ondigitalocean.app`)

## Step 2: Deploy Frontend to Vercel

### 2.1 Run Setup Script
In your project folder, run:
```bash
python deploy-setup.py
```
When prompted, enter your DigitalOcean backend URL.

### 2.2 Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. **Important**: Set root directory to `frontend`
5. Deploy

## Step 3: Test Your App

### Access Your App
- Frontend URL: Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- Password: Whatever you set as `TEMPORARY_PASSWORD`

### Testing Mode Features
- ✅ Password protection
- ✅ Upload audio files
- ✅ Create chapters and sections
- ✅ Export to JSON
- ✅ All core functionality

## Step 4: Switch to Normal Mode Later (Optional)

When ready for full authentication:
1. Change `TESTING_MODE=false` in DigitalOcean
2. Add Supabase credentials to DigitalOcean environment variables
3. Redeploy

## Troubleshooting

### Backend Issues
- Check DigitalOcean app logs
- Verify environment variables are set

### Frontend Issues
- Check browser console for errors
- Verify backend URL in deploy-setup.py was correct

### CORS Issues
- Make sure backend URL in frontend matches exactly
- No trailing slashes in URLs

## Total Time: ~15 minutes
- DigitalOcean: 5-10 minutes
- Vercel: 2-5 minutes
- Setup: 2 minutes 