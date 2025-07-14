# Quick Reference Guide for AudioBook Organizer
**Last Updated: July 14, 2025**

## 🚨 CURRENT ISSUES (July 14, 2025)
- **Gift Credits System**: Backend API endpoints failing with 500 errors
- **Location**: `/api/auth/check-gift` endpoint in `backend/routes/auth_routes.py`
- **Impact**: Gift notifications not working, credit display not updating after gifts
- **Status**: Under investigation - JSONB metadata query issues suspected
- **Workaround**: SQL script works fine, gifts appear in history, just notifications broken

## 🚀 Common Tasks & Where to Find Code

### Authentication & User Management
- **Login/Signup Flow**: `backend/routes/auth_routes.py:login()` → `frontend/js/modules/auth.js:login()`
- **JWT Verification**: `backend/middleware/auth_middleware.py:require_auth` decorator
- **Session Management**: `frontend/js/modules/sessionManager.js` (cross-tab sync)
- **Testing Mode Auth**: `backend/routes/password_protection.py` + `frontend/js/modules/tempAuth.js`
- **Account Deletion**: `backend/routes/auth_routes.py:delete_account()` → `frontend/js/modules/profileModal.js:handleAccountDeletion()`
- **Email Verification**: `backend/routes/auth_routes.py:signup()` → Email sent → User verifies
- **Google OAuth Fix**: `sql/07_fix_oauth_trigger.sql` → Database trigger with SECURITY DEFINER

### File Processing
- **DOCX Upload**: `backend/routes/docx_routes.py:upload_docx()` → `backend/services/docx_service.py`
- **Audio Upload**: `backend/routes/upload_routes.py:upload_audio()` → `backend/services/audio_service.py`
- **Text Processing**: `frontend/js/modules/bookUpload.js:processDocxFileHybrid()`
- **Formatting Application**: `frontend/js/modules/formattingRenderer.js:applyFormattingToDOM()`

### Project Management
- **Save Project**: `backend/routes/project_routes.py:save_project()` → Supabase
- **Load Project**: `frontend/js/modules/storage.js:loadFromFile()`
- **Auto-save**: `frontend/js/modules/storage.js:autoSaveToDatabase()`
- **Merge Projects**: `frontend/js/modules/projectMerge.js` + `conflictResolution.js`

### Export & Download
- **Create Audiobook**: `backend/routes/export_routes.py:export_audiobook()`
- **Audio Merging**: `backend/services/export_service.py:merge_audio_files()`
- **Download Handler**: `frontend/js/modules/export.js:exportBook()`

### UI & Interactions
- **Main Router**: `frontend/js/modules/router.js` (2,185 lines - largest module)
- **Notifications**: `frontend/js/modules/notifications.js:showSuccess/Error/Info()`
- **Modal Management**: `frontend/js/modules/profileModal.js` + `reorder.js`
- **Theme Switching**: `frontend/js/modules/themeManager.js`
- **Legal Pages**: `/frontend/pages/privacy/`, `/frontend/pages/terms/`, `/frontend/pages/contact/`

### Rich Text & Formatting
- **Formatting Toolbar**: `frontend/js/modules/formattingToolbar.js:showFormattingToolbar()`
- **State Management**: `frontend/js/modules/formattingState.js` (no dependencies)
- **Comment System**: `frontend/js/modules/commentsSystem.js`
- **Table of Contents**: `frontend/js/modules/tableOfContents.js:generateTableOfContents()`

### Payment Integration
- **Stripe Checkout**: `backend/routes/stripe_routes.py:create_checkout_session()`
- **Credit System**: `backend/services/supabase_service.py:get_user_credits()`
- **Payment UI**: `frontend/js/modules/stripe.js`

## 🔍 Key File Locations

### Entry Points
- **Backend**: `/app.py` → `/backend/app.py` (Flask app)
- **Frontend**: `/frontend/index.html` → `/frontend/js/main.js`

### Configuration
- **Backend Config**: `/backend/config.py` (env vars, settings)
- **Frontend Config**: `/frontend/js/config/appConfig.js`
- **Environment**: `.env` file (use `env.example` as template)

### Database
- **Schema**: `/sql/database_schema_cloud.sql`
- **Migrations**: `/sql/add_*.sql` files
- **Service**: `/backend/services/supabase_service.py`

### Middleware
- **Authentication**: `/backend/middleware/auth_middleware.py`
- **CSRF Protection**: `/backend/middleware/csrf_middleware.py`
- **Rate Limiting**: `/backend/middleware/rate_limiter.py`
- **Security Headers**: `/backend/middleware/security_headers.py`
- **Domain Redirect**: `/backend/middleware/domain_redirect.py` → Enforces www subdomain

## 🛠️ Debugging Tips

### Common Issues
1. **Auth Failures**: Check JWT in `auth_middleware.py:65-85`
2. **CORS Issues**: See `app.py:configure_cors()`
3. **File Upload Errors**: Debug in `upload_routes.py` + check `/uploads` directory
4. **Formatting Not Showing**: Check `formattingRenderer.js` + DOM structure
5. **Session Sync Issues**: Debug `sessionManager.js` localStorage events

### Testing Commands
```bash
# Test auth
python test_files/test_auth_verification.py

# Test DOCX processing
python test_files/debug-docx-upload.py

# Run with testing mode
TESTING_MODE=true python app.py
```

### Key Environment Variables
- `TESTING_MODE`: Enable simplified auth
- `TEMPORARY_PASSWORD`: Testing mode password
- `SUPABASE_URL` & `SUPABASE_KEY`: Database connection
- `RECAPTCHA_SECRET_KEY`: Bot protection

## 📊 Module Statistics
- **Total Files**: 68 (30 backend + 38 frontend)
- **Total Lines**: ~25,000
- **Largest File**: `frontend/js/modules/router.js` (2,185 lines)
- **Most Imported**: `notifications.js` (used by 25+ modules)

## 🔗 Critical Dependencies
- **No Dependencies**: `state.js`, `formattingState.js`, `notifications.js`, `api.js`
- **High Dependencies**: Router depends on 15+ modules
- **External**: Supabase, Stripe, Google reCAPTCHA, Mammoth.js