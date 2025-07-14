# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Initial Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Set up environment (creates .env from template)
python setup.py

# Run the application
python app.py
```

### Development Commands
```bash
# Run in development mode
python app.py

# Run authentication tests
python test_files/test_auth.py
python test_files/test_auth_verification.py

# Test DOCX functionality
python test_files/debug-docx-upload.py

# Prepare for deployment
python deploy-setup.py --backend-url https://your-backend.ondigitalocean.app
```

### Stripe Testing
```bash
# For testing Stripe locally, run this command in another terminal:
.\stripe.exe listen --forward-to localhost:3000/api/stripe/webhook

# Test card number: 4242 4242 4242 4242
# Any fields after that don't matter as long as you don't use past dates
```

### Gift Credits System
```bash
# Status: PARTIALLY IMPLEMENTED (July 14, 2025)
# SQL Script: sql/gift_credits_to_all_users.sql (WORKING)
# Frontend: frontend/js/modules/appUI.js (IMPLEMENTED)
# Backend: backend/routes/auth_routes.py (500 ERROR - DEBUGGING NEEDED)

# To test gift system:
# 1. Modify sql/gift_credits_to_all_users.sql (lines 10-12)
# 2. Run SQL script in Supabase
# 3. Check /api/auth/check-gift endpoint (currently failing)
# 4. Issues: JSONB metadata queries, credit display caching
```

### Docker Commands
```bash
# Build Docker image
docker build -t audiobook-organizer .

# Run Docker container
docker run -p 8000:8000 audiobook-organizer
```

## High-Level Architecture

### Backend Architecture (Flask)

The backend follows a **service-oriented architecture** with clear separation of concerns:

1. **Entry Point**: `app.py` - Flask application factory pattern with environment-based configuration
2. **Routes Layer** (`backend/routes/`): RESTful endpoints organized by feature
   - `auth_routes.py`: Authentication flows including JWT validation
   - `upload_routes.py`: File upload handling for text/audio/DOCX
   - `export_routes.py`: Project export functionality
3. **Service Layer** (`backend/services/`): Business logic isolation
   - `supabase_service.py`: Database operations and authentication
   - `audio_service.py`: Audio processing and conversion
   - `docx_service.py`: DOCX parsing and formatting preservation
4. **Middleware** (`backend/middleware/`): Cross-cutting concerns
   - `auth_middleware.py`: JWT verification decorators
5. **Security Features**: reCAPTCHA v3, rate limiting, password validation

### Frontend Architecture (Pure JavaScript SPA)

The frontend is a **module-based single-page application** without build tools:

1. **Module System**: ES6 modules with direct imports (no bundling)
2. **Core Modules** (`frontend/js/modules/`):
   - `state.js`: Centralized state management with getters/setters
   - `auth.js`: Authentication handling and session management
   - `chapters.js` & `sections.js`: Core functionality for audiobook organization
   - `router.js`: Client-side routing with authentication guards
3. **Component Communication**: 
   - Direct imports for tight coupling
   - Custom events for loose coupling between features
   - Global state for shared data
4. **UI Patterns**: Template literals for dynamic HTML, event delegation

### Critical Architectural Patterns

1. **Authentication Flow**:
   - Supabase Auth → JWT tokens → Backend verification → Frontend session
   - Cross-tab synchronization via localStorage events
   - Testing mode bypass with simple password

2. **File Processing Pipeline**:
   - **Audio**: Upload → Convert to WAV → Store → Export with merging
   - **DOCX**: Parallel processing (backend + frontend) → Format preservation → Rich text

3. **Project Persistence**:
   - Auto-save with debouncing (5-second delay)
   - Cloud storage via Supabase with conflict resolution
   - Complete state serialization including formatting

4. **Security Implementation**:
   - Row Level Security on all database tables
   - JWT-based authentication with refresh tokens
   - CORS configuration for production domains

5. **Section Highlight System**:
   - **Visual Highlighting**: Colored backgrounds for text sections linked to audio
   - **Edit Protection**: Section highlights are protected in edit mode to prevent accidental modifications
   - **Context-Aware Positioning**: Highlights maintain position through formatting changes using surrounding text context
   - **Formatted Text Support**: Works with headers, titles, and all formatted text from DOCX files
   - **DOM Structure**: `<span class="section-highlight section-color-X"><span class="fmt-title">Text</span></span>`

### Key Integration Points

1. **Frontend → Backend API Calls**:
   - All protected routes require JWT in Authorization header
   - Error responses follow consistent format with user-friendly messages
   - File uploads use multipart/form-data

2. **Database Structure** (Supabase/PostgreSQL):
   - `users` table with auth integration
   - `projects` table with user_id foreign key
   - `audio_files` table for uploaded audio metadata

3. **File Storage**:
   - Local filesystem for audio files (uploads/ directory)
   - Temporary exports in exports/ directory
   - Cleanup utilities for orphaned files

### Development Considerations

1. **Environment Variables** (configured in `.env`):
   - `SUPABASE_URL` and `SUPABASE_KEY` for database
   - `BACKEND_URL` for frontend API calls
   - `APP_MODE` (testing/production)
   - `RECAPTCHA_SECRET_KEY` for bot protection

2. **Testing Mode**:
   - Bypass authentication with password "testaccess"
   - Mock data generation for development
   - Feature flags for experimental features

3. **Error Handling**:
   - Backend: Try-catch blocks with logging
   - Frontend: User notifications via notification.js module
   - Network errors: Automatic retry with exponential backoff

4. **Performance Optimizations**:
   - Lazy loading of modules
   - Debounced autosave
   - Audio streaming for large files
   - LocalStorage caching for offline support

5. **Recent Improvements** (July 14, 2025):
   - **Session Invalidation Fix**: Complete automatic recovery system after server restart
     - Fixed 500 errors on /api/auth/verify endpoint (JSON body issue)
     - Credits display persists on page refresh (UI initialization fix)
     - RLS-compliant credit fetching with auth token passthrough
     - Cache management with force refresh after credit consumption
     - Rate-limited recovery to prevent infinite loops
   - **Domain Redirect**: Implemented redirect from audiobookorganizer.com to www.audiobookorganizer.com
   - **API Endpoint Fix**: Resolved double /api/api/ prefix issue in frontend requests
   - **RLS Fix**: Fixed Row Level Security errors by authenticating Supabase client
   - **Google OAuth Fix**: Database trigger now properly creates user records on signup
   - **Email Verification**: Added email verification requirement to prevent fake accounts
   - **Signup Validation**: Enhanced form validation with password requirements display

6. **Previous Session Improvements**:
   - **Section Highlight Preservation**: Highlights now persist through edit mode toggles
   - **Table of Contents Auto-Refresh**: TOC populates correctly after project restoration
   - **Formatted Text Highlighting**: Headers/titles now show section highlights properly
   - **Edit Protection System**: Section highlights are protected from accidental editing
   - **Context-Based Positioning**: Robust positioning system prevents highlight drift

## Comprehensive Documentation

The following documentation files provide detailed information about specific aspects of the codebase:

@documentation/claude-docu/00_QUICK_REFERENCE.md
@documentation/claude-docu/01_FILE_INDEX.md
@documentation/claude-docu/02_API_ENDPOINTS.md
@documentation/claude-docu/03_AUTHENTICATION_SYSTEM.md
@documentation/claude-docu/04_TEXT_PROCESSING.md
@documentation/claude-docu/05_AUDIO_SYSTEM.md
@documentation/claude-docu/06_PROJECT_MANAGEMENT.md
@documentation/claude-docu/07_UI_COMPONENTS.md
@documentation/claude-docu/08_PAYMENT_SYSTEM.md
@documentation/claude-docu/09_SECURITY_MIDDLEWARE.md
@documentation/claude-docu/10_TESTING_DEVELOPMENT.md
@documentation/claude-docu/11_RECENT_UPDATES.md