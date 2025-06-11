# AudioBook Organizer - Complete Architecture & Developer Guide

## 🏗️ Overview

This document provides a comprehensive guide to the AudioBook Organizer codebase architecture, file organization, and debugging strategies for future developers and AI agents.

**Application Type**: Full-stack web application  
**Backend**: Flask (Python) with modular architecture  
**Frontend**: Single Page Application (Vanilla JavaScript ES6 modules)  
**Database**: PostgreSQL via Supabase  
**Authentication**: Supabase Auth with JWT tokens  

---

## 📁 Project Structure

```
AudioBook/
├── app.py                          # Main entry point
├── requirements.txt                # Python dependencies
├── database_schema_cloud.sql       # Complete database schema
├── backend/                        # Flask backend
│   ├── app.py                     # Flask app factory and configuration
│   ├── config.py                  # Configuration management
│   ├── routes/                    # API endpoint definitions
│   ├── services/                  # Business logic layer
│   ├── middleware/                # Authentication & request processing
│   └── utils/                     # Helper utilities
├── frontend/                      # Client-side application
│   ├── public/                    # Static assets and main HTML
│   ├── css/                       # Stylesheets
│   ├── js/                        # JavaScript modules
│   └── pages/                     # Page-specific components
├── documentation/                 # All project documentation
├── test files/                    # Testing utilities
├── uploads/                       # Audio file storage (created at runtime)
└── exports/                       # Export output directory (created at runtime)
```

---

## 🔧 Backend Architecture

### Core Components

#### 1. Application Entry Points
- **`app.py`** (root): Main entry point that imports and runs the Flask app
- **`backend/app.py`**: Flask application factory with complete configuration

#### 2. Configuration System
- **`backend/config.py`**: Environment-based configuration
  - Base Config class with common settings
  - DevelopmentConfig and ProductionConfig variants
  - Environment variable loading via python-dotenv
  - Security settings, rate limiting, reCAPTCHA configuration

#### 3. Route Organization
```
backend/routes/
├── auth_routes.py          # Authentication endpoints (/api/auth/*)
├── upload_routes.py        # File upload handling (/api/upload)
├── export_routes.py        # Audiobook export (/api/export)
└── static_routes.py        # Frontend file serving and SPA routing
```

**Key Routing Logic:**
- `auth_routes.py`: Handles login, signup, profile, credits, OAuth callbacks
- `upload_routes.py`: Audio file upload with MP3→WAV conversion
- `export_routes.py`: Audiobook creation with metadata and audio merging
- `static_routes.py`: Serves frontend files and handles SPA routing

#### 4. Service Layer (Business Logic)
```
backend/services/
├── supabase_service.py     # Database operations & authentication
├── security_service.py     # reCAPTCHA, rate limiting, attack prevention
├── audio_service.py        # Audio file processing
└── export_service.py       # Audiobook creation and export
```

**Service Responsibilities:**

**SupabaseService** (`supabase_service.py`):
- JWT token verification and user extraction
- User profile CRUD operations
- Credits system management
- Database connection handling
- User initialization for new accounts

**SecurityService** (`security_service.py`):
- Google reCAPTCHA v3 verification
- Rate limiting (per-minute and per-hour)
- Failed login attempt tracking
- IP-based attack prevention
- Client IP detection through proxies

**AudioService** (`audio_service.py`):
- File upload handling with unique naming
- MP3 to WAV conversion using pydub
- Temporary file cleanup
- URL-safe path generation

**ExportService** (`export_service.py`):
- Metadata export to JSON
- Individual audio file copying
- Audio merging with configurable silence
- ZIP archive creation
- Chapter-based organization

#### 5. Middleware Layer
```
backend/middleware/
└── auth_middleware.py      # Authentication decorators and token handling
```

**Authentication Decorators:**
- `@require_auth`: Mandatory authentication
- `@optional_auth`: Optional authentication (user data available if present)
- `@require_credits(n)`: Minimum credit balance requirement
- `@consume_credits(n, action)`: Credit consumption after successful operations

#### 6. Utilities
```
backend/utils/
├── audio_utils.py          # Audio processing functions
└── file_utils.py           # File handling utilities
```

---

## 🎨 Frontend Architecture

### Core Structure

#### 1. Application Entry Point
- **`frontend/public/index.html`**: Main HTML file with SPA shell
  - Loading screen implementation
  - CSS preloading
  - Module initialization script
  - Router bootstrapping

#### 2. JavaScript Module System
```
frontend/js/
├── main.js                 # Legacy entry point (being phased out)
├── modules/                # Core application modules
└── utils/                  # Helper utilities
```

#### 3. Core Modules

**Router System** (`modules/router.js`):
- Client-side routing with authentication guards
- Route definitions with auth requirements
- Page loading and cleanup
- History management
- Authentication state integration

**Authentication** (`modules/auth.js`):
- Supabase client initialization
- Login/signup/logout functionality
- Google OAuth integration
- JWT token management
- Password strength validation
- Session state management

**Session Management** (`modules/sessionManager.js`):
- Cross-tab authentication state
- Password recovery mode handling
- Authentication event coordination
- Security event logging
- Global state persistence

#### 4. Application Features

**State Management** (`modules/state.js`):
- Global application state
- Chapter and section data
- Color coding system
- State persistence hooks

**Text Processing**:
- `modules/smartSelect.js`: Intelligent text selection with configurable chunk sizes
- `modules/textSelection.js`: Text selection utilities
- `modules/selectionTools.js`: UI tools for text manipulation

**Content Management**:
- `modules/chapters.js`: Chapter CRUD operations
- `modules/sections.js`: Section management and audio attachment
- `modules/editMode.js`: Content editing functionality

**File Operations**:
- `modules/bookUpload.js`: Text file upload and processing
- `modules/export.js`: Audiobook export functionality
- `modules/storage.js`: Local storage persistence

**UI Components**:
- `modules/notifications.js`: Custom notification system
- `modules/ui.js`: General UI utilities
- `modules/themeManager.js`: Theme switching and persistence

**Security**:
- `modules/recaptcha.js`: Google reCAPTCHA integration
- `modules/validators.js`: Form validation utilities

#### 5. Page Components
```
frontend/pages/
├── landing/                # Landing page (marketing/home)
├── auth/                   # Authentication pages
└── app/                    # Main application interface
```

#### 6. Styling System
```
frontend/css/
├── main.css               # Base styles and layout
├── components.css         # Reusable UI components
├── themes.css             # Theme system and color schemes
├── auth.css               # Authentication page styles
└── landing.css            # Landing page styles
```

---

## 🗄️ Database Schema

### Core Tables

**User Management:**
- `auth.users` (Supabase built-in): Core user authentication
- `public.profiles`: Extended user profile information
- `public.user_credits`: Credit system for API usage

**Content Management:**
- `public.audiobook_projects`: User projects and settings
- `public.file_uploads`: File upload tracking

**Analytics & Billing:**
- `public.usage_logs`: API usage tracking
- `public.credit_transactions`: Payment and credit history

### Key Relationships
```sql
auth.users (1) → (1) profiles
auth.users (1) → (1) user_credits
auth.users (1) → (*) audiobook_projects
auth.users (1) → (*) file_uploads
auth.users (1) → (*) usage_logs
audiobook_projects (1) → (*) file_uploads
```

### Security Implementation
- **Row Level Security (RLS)** on all tables
- **Automatic user initialization** via database triggers
- **JWT-based access control** through Supabase
- **Comprehensive indexing** for performance

---

## 🔄 Data Flow & Integration

### Authentication Flow

1. **Frontend Authentication Request**:
   ```
   auth.js → /api/auth/login → supabase_service.py → Supabase Auth
   ```

2. **Token Verification**:
   ```
   middleware/auth_middleware.py → supabase_service.py → JWT validation
   ```

3. **Cross-Tab Synchronization**:
   ```
   sessionManager.js → localStorage events → auth state sync
   ```

### File Upload Flow

1. **Audio Upload**:
   ```
   bookUpload.js → /api/upload → upload_routes.py → audio_service.py → pydub conversion
   ```

2. **File Processing**:
   ```
   audio_utils.py → MP3→WAV conversion → unique filename generation → storage
   ```

### Export Flow

1. **Audiobook Creation**:
   ```
   export.js → /api/export → export_routes.py → export_service.py → file operations
   ```

2. **Audio Merging**:
   ```
   export_service.py → pydub operations → chapter merging → ZIP creation
   ```

### State Management Flow

1. **Application State**:
   ```
   state.js ↔ storage.js ↔ localStorage persistence
   ```

2. **UI Updates**:
   ```
   state changes → event triggers → UI module updates → DOM manipulation
   ```

---

## 🔍 Debugging Guide

### Common Issues & Solutions

#### Authentication Problems

**Issue**: "Token invalid or expired"
- **Check**: `backend/services/supabase_service.py` → `verify_jwt_token()`
- **Debug**: JWT secret configuration in `backend/config.py`
- **Frontend**: Check token storage in `modules/auth.js`

**Issue**: Cross-tab authentication sync issues
- **Check**: `modules/sessionManager.js` → storage event handlers
- **Debug**: localStorage events and recovery state handling

#### File Upload Issues

**Issue**: Audio conversion failures
- **Check**: `backend/utils/audio_utils.py` → pydub operations
- **Debug**: File format support and temporary file cleanup

**Issue**: Upload path problems
- **Check**: `backend/config.py` → directory configuration
- **Debug**: File permissions and directory creation

#### Frontend Routing Issues

**Issue**: Page not loading or authentication redirects
- **Check**: `modules/router.js` → route definitions and guards
- **Debug**: Authentication state in router initialization

#### Database Connection Issues

**Issue**: Supabase connection failures
- **Check**: `backend/config.py` → Supabase configuration
- **Debug**: Environment variables and service initialization

### Debugging Tools & Locations

#### Backend Debugging
```python
# Enable debug logging in backend/app.py
app.logger.setLevel('DEBUG')

# Check service initialization
backend/services/supabase_service.py → init_supabase_service()
backend/services/security_service.py → init_security_service()
```

#### Frontend Debugging
```javascript
// Router debugging
console.log('Router state:', window.router.currentRoute);

// Authentication debugging
console.log('Auth state:', window.authModule.isAuthenticated());

// State debugging
import { chapters, bookText } from './modules/state.js';
console.log('App state:', { chapters, bookText });
```

#### Database Debugging
```sql
-- Check user data
SELECT * FROM public.profiles WHERE id = 'user-id';
SELECT * FROM public.user_credits WHERE user_id = 'user-id';

-- Check recent activity
SELECT * FROM public.usage_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 🚀 Development Workflow

### Setting Up Development Environment

1. **Backend Setup**:
   ```bash
   pip install -r requirements.txt
   python app.py
   ```

2. **Environment Variables**:
   ```bash
   # Create .env file with:
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   JWT_SECRET_KEY=your_jwt_secret
   RECAPTCHA_SITE_KEY=your_recaptcha_site_key
   RECAPTCHA_SECRET_KEY=your_recaptcha_secret
   ```

3. **Database Setup**:
   - Run `database_schema_cloud.sql` in Supabase SQL editor
   - Configure Row Level Security policies

### Adding New Features

#### Adding New API Endpoints
1. Create route in appropriate `backend/routes/` file
2. Add business logic to relevant service in `backend/services/`
3. Update middleware if authentication needed
4. Add frontend API calls in relevant `frontend/js/modules/` file

#### Adding New Frontend Pages
1. Create page components in `frontend/pages/`
2. Add route definition in `modules/router.js`
3. Create page-specific CSS if needed
4. Update navigation components

#### Adding New Database Tables
1. Update `database_schema_cloud.sql`
2. Add RLS policies for security
3. Update relevant service files for data access
4. Add any needed triggers or functions

### Testing Approach

**Backend Testing**:
- Use `test files/test_auth.py` for authentication testing
- Test API endpoints with proper authentication headers
- Verify database operations with test data

**Frontend Testing**:
- Use `test files/test_auth_fix.html` for authentication flow testing
- Test cross-tab scenarios for session management
- Verify file upload and export functionality

---

## 📚 Key Dependencies

### Backend Dependencies
- **Flask 3.0**: Web framework
- **supabase**: Database and authentication client
- **python-jose**: JWT token handling
- **pydub**: Audio processing
- **requests**: HTTP client for reCAPTCHA
- **python-dotenv**: Environment configuration

### Frontend Dependencies
- **Supabase JS**: Client-side authentication
- **Native ES6 modules**: No build process required
- **Fetch API**: HTTP requests
- **Web Storage API**: Local persistence

---

## 🔒 Security Considerations

### Authentication Security
- JWT token validation with proper secret management
- Rate limiting on authentication endpoints
- reCAPTCHA v3 integration for bot protection
- Cross-tab session synchronization with security checks

### Data Security
- Row Level Security on all database tables
- Proper input validation and sanitization
- Secure file upload handling with type validation
- Error handling without information leakage

### Frontend Security
- XSS prevention through proper DOM manipulation
- CSRF protection through authentication tokens
- Secure storage of sensitive data
- Proper logout and session cleanup

---

## 🎯 Performance Optimization

### Backend Performance
- Database indexing on frequently queried columns
- Connection pooling through Supabase
- Efficient file handling with proper cleanup
- Rate limiting to prevent abuse

### Frontend Performance
- CSS preloading and critical path optimization
- JavaScript module lazy loading
- Local storage for state persistence
- Optimized asset delivery

---

## 📞 Support & Maintenance

### Monitoring & Logging
- Backend logging through Flask logger
- Frontend error tracking through console logs
- Database activity monitoring through usage_logs table
- Security event logging in sessionManager

### Maintenance Tasks
- Regular cleanup of uploaded files
- Database maintenance and backup verification
- Security configuration updates
- Dependency updates and security patches

---

This guide provides a comprehensive overview of the AudioBook Organizer codebase. For specific implementation details, refer to the inline code comments and individual file documentation. 