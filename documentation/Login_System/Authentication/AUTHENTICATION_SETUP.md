# 🔐 AudioBook Organizer - Authentication Setup Guide

This guide will walk you through setting up complete authentication with Supabase for both local development and production deployment.

## 📋 Prerequisites

- [Supabase Account](https://supabase.com) (free tier is sufficient for development)
- Python 3.8+ installed
- Node.js 16+ (for frontend dependencies if needed)

## 🚀 Quick Start

### 1. Supabase Project Setup

1. **Create a new Supabase project:**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Create a new organization (if needed)
   - Create a new project with these settings:
     - **Name**: `audiobook-creator`
     - **Database Password**: Generate a secure password
     - **Region**: Choose closest to your users

2. **Wait for project initialization** (usually takes 2-3 minutes)

### 2. Database Schema Setup

1. **Open Supabase SQL Editor:**
   - In your Supabase dashboard, go to "SQL Editor"
   - Click "New query"

2. **Run the database schema:**
   - Copy the entire contents of `database_schema.sql`
   - Paste it into the SQL editor
   - **IMPORTANT**: Replace `'your-jwt-secret-here'` with your actual JWT secret (found in Settings > API)
   - Click "Run" to execute the schema

3. **Verify tables were created:**
   - Go to "Table Editor" in Supabase
   - You should see these tables:
     - `profiles`
     - `user_credits`
     - `usage_logs`
     - `credit_transactions`
     - `audiobook_projects`
     - `file_uploads`

### 3. Environment Configuration

1. **Copy environment template:**
   ```bash
   cp env.example .env
   ```

2. **Get your Supabase credentials:**
   - In Supabase dashboard, go to Settings > API
   - Copy these values:
     - **Project URL** → `SUPABASE_URL`
     - **anon public key** → `SUPABASE_ANON_KEY`
     - **service_role secret** → `SUPABASE_SERVICE_KEY`
     - **JWT Secret** → `SUPABASE_JWT_SECRET`

3. **Update your `.env` file:**
   ```env
   # Flask Configuration
   FLASK_HOST=localhost
   FLASK_PORT=3000
   FLASK_DEBUG=True
   SECRET_KEY=your-super-secret-key-for-flask-sessions

   # Supabase Configuration
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase

   # Credits System
   DEFAULT_CREDITS=100
   MAX_CREDITS_PER_USER=10000
   ```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Test the Setup

1. **Start the development server:**
   ```bash
   python app.py
   ```

2. **Test authentication:**
   - Open http://localhost:3000
   - Click "Sign In" in the navigation
   - Try creating a new account
   - Check that the user appears in Supabase dashboard under Authentication > Users

## 🔧 Authentication Features Included

### ✅ Frontend Features
- **Beautiful Authentication UI** with modern design
- **Login/Signup Forms** with real-time validation
- **Password Strength Indicator** 
- **Password Reset Functionality**
- **Remember Me** option
- **Social Auth Placeholders** (Google OAuth ready)
- **Responsive Design** for mobile devices
- **Loading States** and error handling
- **Form Validation** with helpful error messages

### ✅ Backend Features
- **JWT Token Verification** for API protection
- **User Profile Management** with automatic creation
- **Credits System** with 100 free credits on signup
- **Usage Tracking** for API calls and credit consumption
- **Route Protection** with `@require_auth` decorator
- **Credit Verification** with `@require_credits()` decorator
- **Automatic Credit Consumption** with `@consume_credits()` decorator
- **Comprehensive Error Handling**

### ✅ Database Features
- **Automatic Profile Creation** on user signup
- **Row Level Security** (RLS) policies
- **Credit Tracking** and transaction history
- **Usage Analytics** and logging
- **Performance Indexes** for fast queries
- **Triggers and Functions** for data consistency

## 🛡️ Security Features

### Authentication Security
- **JWT Token Verification** with proper secret validation
- **Row Level Security** ensures users only access their data
- **CORS Protection** configured properly
- **Password Requirements** enforced on frontend and backend
- **Session Management** with automatic token refresh

### API Security
- **Authentication Required** for all protected endpoints
- **Credit Verification** before expensive operations
- **Rate Limiting Ready** (can be added with Redis)
- **Input Validation** on all forms and API calls
- **SQL Injection Protection** through parameterized queries

## 📁 File Structure

```
AudioBook/
├── backend/
│   ├── routes/
│   │   └── auth_routes.py          # Authentication API endpoints
│   ├── services/
│   │   └── supabase_service.py     # Supabase integration service
│   ├── middleware/
│   │   └── auth_middleware.py      # Authentication decorators
│   └── config.py                   # Configuration with auth settings
├── frontend/
│   ├── pages/auth/
│   │   ├── auth.html              # Authentication page UI
│   │   └── auth.js                # Authentication page logic
│   ├── js/modules/
│   │   └── auth.js                # Global authentication module
│   └── css/
│       └── auth.css               # Authentication page styles
├── database_schema.sql            # Complete database setup
├── env.example                    # Environment configuration template
└── requirements.txt               # Updated Python dependencies
```

## 🔄 Authentication Flow

### User Registration Flow
1. User fills signup form on `/auth?mode=signup`
2. Frontend validates input and calls Supabase auth
3. Supabase creates user account and sends confirmation email
4. User clicks email confirmation link
5. Database trigger automatically creates:
   - User profile in `profiles` table
   - Initial 100 credits in `user_credits` table
6. User can now sign in and access the app

### User Login Flow
1. User enters credentials on `/auth`
2. Frontend calls Supabase authentication
3. Supabase returns JWT token and user data
4. Frontend stores token and calls `/api/auth/initialize`
5. Backend verifies token and returns user profile + credits
6. User is redirected to `/app` with full access

### API Request Flow
1. Frontend includes JWT token in `Authorization: Bearer <token>` header
2. Backend middleware (`@require_auth`) verifies token
3. If valid, user data is stored in Flask's `g` object
4. Protected route can access `g.user_id`, `g.user_email`, etc.
5. Credit-protected routes check and consume credits automatically

## 🎯 API Endpoints

### Authentication Endpoints
- `GET /api/auth/config` - Get public Supabase configuration
- `POST /api/auth/verify` - Verify JWT token and get user data
- `GET /api/auth/status` - Check authentication status (optional auth)
- `POST /api/auth/initialize` - Initialize new user profile and credits

### User Management Endpoints
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/credits` - Get user credit balance

## 💳 Credits System

### How Credits Work
- **New users get 100 free credits** automatically
- **Credits are consumed** for API-intensive operations like:
  - Text-to-speech conversion (future ElevenLabs integration)
  - Large file processing
  - Premium features
- **Credit tracking** logs all usage for analytics
- **Payment integration ready** for Stripe/PayPal

### Using Credit System in Your Code

**Protect routes with credit requirements:**
```python
@app.route('/api/convert-text', methods=['POST'])
@require_credits(10)  # Requires 10 credits
@consume_credits(10, 'text_to_speech')  # Consumes 10 credits on success
def convert_text():
    # Your text-to-speech logic here
    return jsonify({'success': True})
```

**Check credits in frontend:**
```javascript
import { auth } from '/js/modules/auth.js';

const credits = await auth.getUserCredits();
if (credits < 10) {
    showError('Insufficient credits for this operation');
    return;
}
```

## 🌐 Production Deployment

### Environment Variables for Production
```env
FLASK_DEBUG=False
SECRET_KEY=your-production-secret-key-min-32-chars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### Production Checklist
- [ ] Set `FLASK_DEBUG=False`
- [ ] Use strong `SECRET_KEY` (32+ random characters)
- [ ] Configure proper CORS settings
- [ ] Set up SSL/HTTPS
- [ ] Configure email templates in Supabase
- [ ] Set up proper backup strategy
- [ ] Monitor usage and costs
- [ ] Configure rate limiting
- [ ] Set up logging and monitoring

## 🔗 Social Authentication (Future)

The system is prepared for social authentication. To add Google OAuth:

1. **In Supabase Dashboard:**
   - Go to Authentication > Settings
   - Enable Google provider
   - Add your Google OAuth credentials

2. **Update the frontend:**
   ```javascript
   // In auth.js, update handleGoogleAuth function
   async function handleGoogleAuth() {
       const { data, error } = await supabaseClient.auth.signInWithOAuth({
           provider: 'google'
       });
   }
   ```

## 🐛 Troubleshooting

### Common Issues

**1. "Authentication service unavailable"**
- Check that your `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Verify Supabase project is running (not paused)

**2. "JWT verification failed"**
- Ensure `SUPABASE_JWT_SECRET` matches the one in Supabase Settings > API
- Check that the JWT token format is correct

**3. "Database connection failed"**
- Verify database schema was applied correctly
- Check that RLS policies are enabled
- Ensure service role has proper permissions

**4. "User profile not found"**
- Check if the trigger `on_auth_user_created` was created
- Manually run the profile creation function if needed

### Debug Mode
Enable detailed logging by setting `FLASK_DEBUG=True` in your `.env` file.

## 📞 Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Check the Flask server logs for backend errors
3. Verify your Supabase project status
4. Ensure all environment variables are set correctly

## 🎉 Success!

Once everything is set up, you'll have:
- ✅ Complete user authentication system
- ✅ Beautiful, responsive auth UI
- ✅ Secure API with JWT protection
- ✅ Credits system ready for monetization
- ✅ Database with proper security policies
- ✅ Production-ready architecture

Your users can now register, log in, and access the AudioBook Organizer app with full authentication protection! 