# 🚀 Quick Start Guide

## **TL;DR - Get Running in 5 Minutes** ⚡

### 1. Setup Environment
```bash
# Copy environment template
copy env.example .env

# Install dependencies (from root directory)
pip install -r requirements.txt
```

### 2. Configure Supabase (Optional for basic testing)
- Edit `.env` file
- Add Supabase credentials (or leave empty for basic testing)

### 3. Start Server
```bash
# From AudioBook directory
python -m backend.app
```

### 4. Test
- Open browser: `http://localhost:3000`
- Landing page should load
- Click "Get Started" → App should load
- Go to `http://localhost:3000/auth` → Auth page should load

## **That's it!** 🎉

**No separate frontend server needed!**
**No build process required!** 
**Everything runs on localhost:3000!**

---

## **With Authentication (10 minutes)**

### 1. Create Supabase Account
- Go to [supabase.com](https://supabase.com)
- Create project

### 2. Add Credentials to .env
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret
```

### 3. Setup Database
- In Supabase: SQL Editor
- Copy/paste from `database_schema.sql`
- Run SQL

### 4. Test Authentication
- Go to `http://localhost:3000/auth`
- Register test user
- Login

## **Troubleshooting** 🛠️
- Server won't start? → `pip install -r backend/requirements.txt`
- Auth not working? → Check `.env` file
- Need help? → See `TESTING_GUIDE.md` 