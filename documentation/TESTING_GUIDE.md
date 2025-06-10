# 🧪 AudioBook Organizer - Complete Testing Guide

## **Understanding the Setup** 🤔

**Port Configuration:**
- **Flask Backend:** Runs on `localhost:3000`
- **Frontend:** Served BY Flask (no separate server needed!)
- **Database:** Supabase (cloud-hosted PostgreSQL)

**Why this works perfectly:**
- ✅ No CORS issues (same origin)
- ✅ Simple deployment (one server)
- ✅ No frontend build process needed

---

## **Step 1: Initial Setup** ⚙️

### 1.1 Create Environment File
```bash
# Copy the example environment file
copy env.example .env
```

### 1.2 Install Python Dependencies
```bash
# Navigate to your project root
cd AudioBook

# Install dependencies (from root directory)
pip install -r requirements.txt
```

### 1.3 Create Supabase Project (Required for Authentication)
1. Go to [https://supabase.com](https://supabase.com)
2. Create free account
3. Create new project
4. Go to **Project Settings → API**
5. Copy these values to your `.env` file:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET_KEY` (from JWT Settings)

### 1.4 Setup Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Copy the contents from `database_schema.sql`
3. Run the SQL to create tables and policies

---

## **Step 2: Basic Testing (No Auth Required)** 🧪

### 2.1 Start the Server
```bash
# From your AudioBook directory
python -m backend.app
```

**Expected Output:**
```
Server starting...
Static folder: /path/to/AudioBook/frontend
Upload folder: /path/to/AudioBook/uploads
Export folder: /path/to/AudioBook/exports

Registered routes:
[List of all routes]

Starting server on http://localhost:3000
```

### 2.2 Test Basic Functionality
Open browser to `http://localhost:3000`

**✅ Landing Page Test:**
- [ ] Page loads correctly
- [ ] Navigation menu works
- [ ] "Get Started" button works
- [ ] Responsive design works (resize window)

**✅ App Page Test:**
- Go to `http://localhost:3000/app`
- [ ] File upload interface loads
- [ ] Drag & drop area visible
- [ ] Navigation works

**✅ API Test:**
- Go to `http://localhost:3000/api/test`
- Should see: `{"success": true, "message": "API is working"}`

---

## **Step 3: Authentication Testing** 🔐

### 3.1 Setup reCAPTCHA (Optional for basic testing)
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create v3 site
3. Add keys to `.env`:
   ```
   RECAPTCHA_SITE_KEY=your-site-key
   RECAPTCHA_SECRET_KEY=your-secret-key
   ```

### 3.2 Test Authentication Pages
Go to `http://localhost:3000/auth`

**✅ Auth Page Test:**
- [ ] Sign up form loads
- [ ] Sign in form loads
- [ ] Forgot password form loads
- [ ] Form switching animations work
- [ ] Input validation works (try invalid emails)

### 3.3 Test User Registration
**Without reCAPTCHA (for quick testing):**
1. Set `RECAPTCHA_ENABLED=false` in `.env`
2. Restart server
3. Try to register with:
   - Email: `test@example.com`
   - Password: `TestPass123!`

**Expected Results:**
- ✅ Success: User created, confirmation email sent
- ❌ Error: Check browser console and server logs

### 3.4 Test Login Flow
1. Check email for confirmation link (if email configured)
2. Click confirmation link in Supabase dashboard if needed:
   - Go to **Authentication → Users**
   - Manually confirm user if needed
3. Try logging in with test credentials

---

## **Step 4: Advanced Testing** 🚀

### 4.1 Test Security Features
**Rate Limiting:**
1. Try logging in with wrong password 6 times quickly
2. Should get blocked after 5 attempts

**Password Security:**
- Try weak passwords (should be rejected)
- Try passwords without numbers/special chars

### 4.2 Test Credits System
1. Check user profile after login
2. Verify default credits are assigned
3. Test credit consumption (when ElevenLabs integration is added)

---

## **Step 5: Troubleshooting** 🛠️

### Common Issues & Solutions

**🚨 Server Won't Start**
```
Error: ModuleNotFoundError: No module named 'supabase'
```
**Solution:** `pip install -r requirements.txt` (from root directory)

**🚨 Authentication Not Working**
```
Error: ⚠️ Supabase configuration not found
```
**Solution:** Check `.env` file has correct Supabase credentials

**🚨 Database Connection Failed**
```
Error: Invalid JWT
```
**Solution:** Check `JWT_SECRET_KEY` in `.env` matches Supabase

**🚨 reCAPTCHA Errors**
```
Error: reCAPTCHA verification failed
```
**Solution:** 
- Check `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`
- Or set `RECAPTCHA_ENABLED=false` for testing

**🚨 CORS Errors**
**Solution:** This shouldn't happen since frontend/backend are same origin

### Debug Mode
Add to `.env`:
```
FLASK_DEBUG=True
LOG_LEVEL=DEBUG
```

---

## **Step 6: Testing Checklist** ✅

### Basic Functionality
- [ ] Server starts without errors
- [ ] Landing page loads
- [ ] App page loads
- [ ] File upload interface works
- [ ] Navigation between pages works

### Authentication System
- [ ] Auth page loads and displays correctly
- [ ] User registration works
- [ ] Email confirmation works (if configured)
- [ ] User login works
- [ ] Password reset works (if email configured)
- [ ] Session management works
- [ ] User profile displays correctly

### Security Features
- [ ] reCAPTCHA integration works (if enabled)
- [ ] Rate limiting blocks excessive attempts
- [ ] Password complexity requirements enforced
- [ ] Login attempt protection works

### Database Integration
- [ ] User data saves to Supabase
- [ ] User profiles created automatically
- [ ] Credits system tracks properly
- [ ] RLS policies enforce security

---

## **What to Test First** 🎯

**Recommended Testing Order:**

1. **Basic Server** (2 minutes)
   - Start server
   - Check landing page
   - Check API endpoint

2. **Supabase Connection** (5 minutes)
   - Set up Supabase credentials
   - Check authentication endpoints
   - Verify database connection

3. **User Registration** (5 minutes)
   - Create test user
   - Check database entry
   - Test basic login

4. **Security Features** (10 minutes)
   - Test with reCAPTCHA disabled first
   - Then enable and test reCAPTCHA
   - Test rate limiting

**Total setup time: ~20 minutes for full testing**

---

## **Next Steps After Testing** 🎯

Once everything works:
1. ✅ **ElevenLabs Integration** - Add text-to-speech API
2. ✅ **Payment System** - Stripe/PayPal for credits
3. ✅ **Email System** - Password reset & notifications
4. ✅ **Production Deployment** - Heroku/Vercel/etc.

---

## **Need Help?** 💬

If anything doesn't work:
1. Check server console for error messages
2. Check browser console (F12) for JavaScript errors
3. Verify `.env` file has all required values
4. Check Supabase dashboard for database issues
5. Ask for help with specific error messages! 