# Complete File Index - AudioBook Organizer

## Backend Files (30 files, ~5,041 lines)

### Main Application
| File | Lines | Purpose |
|------|-------|---------|
| `/app.py` | 3 | Root entry point, imports backend app |
| `/backend/app.py` | 187 | Flask application factory, route registration |
| `/backend/config.py` | 153 | Environment-based configuration management |

### Routes (11 files, ~3,219 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `/backend/routes/auth_routes.py` | 710 | Authentication endpoints (login, signup, OAuth) |
| `/backend/routes/docx_routes.py` | 377 | DOCX upload and processing endpoints |
| `/backend/routes/stripe_routes.py` | 365 | Payment processing and subscription management |
| `/backend/routes/password_protection.py` | 303 | Testing mode authentication bypass |
| `/backend/routes/upload_routes.py` | 292 | File upload handling (audio, text) |
| `/backend/routes/project_routes.py` | 226 | Project CRUD operations |
| `/backend/routes/static_routes.py` | 145 | Static file serving and SPA support |
| `/backend/routes/export_routes.py` | 131 | Audiobook export functionality |
| `/backend/routes/security_routes.py` | 23 | CAPTCHA verification endpoints |

### Services (6 files, ~1,822 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `/backend/services/supabase_service.py` | 537 | Database operations and user management |
| `/backend/services/docx_service.py` | 442 | DOCX parsing with formatting preservation |
| `/backend/services/stripe_service.py` | 372 | Stripe API integration |
| `/backend/services/security_service.py` | 278 | CAPTCHA and rate limiting |
| `/backend/services/export_service.py` | 178 | Export and ZIP creation |
| `/backend/services/audio_service.py` | 72 | Audio processing and conversion |

### Middleware (4 files, ~525 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `/backend/middleware/auth_middleware.py` | 305 | JWT verification and auth decorators |
| `/backend/middleware/rate_limiter.py` | 85 | Request rate limiting |
| `/backend/middleware/csrf_middleware.py` | 76 | CSRF protection |
| `/backend/middleware/security_headers.py` | 59 | Security headers middleware |

### Utilities (4 files, ~358 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `/backend/utils/validation.py` | 120 | Input validation and password strength |
| `/backend/utils/file_cleanup.py` | 109 | Temporary file cleanup |
| `/backend/utils/audio_utils.py` | 88 | Audio processing utilities |
| `/backend/utils/file_utils.py` | 41 | File system operations |

## Frontend Files (38 modules, ~20,083 lines)

### Core Modules (State & Config)
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/state.js` | 132 | Central application state (no deps) |
| `/frontend/js/modules/formattingState.js` | 687 | Formatting data management (no deps) |
| `/frontend/js/config/appConfig.js` | ~50 | Frontend configuration |

### Large Modules (>1000 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/router.js` | 2,185 | Client-side routing and navigation |
| `/frontend/js/modules/auth.js` | 1,446 | Authentication and session management |
| `/frontend/js/modules/formattingRenderer.js` | 1,058 | DOM formatting application |

### Authentication & Session
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/sessionManager.js` | 720 | Cross-tab session synchronization |
| `/frontend/js/modules/tempAuth.js` | 271 | Testing mode authentication |
| `/frontend/js/modules/recaptcha.js` | 289 | Google reCAPTCHA integration |
| `/frontend/js/modules/validators.js` | 47 | Form validation utilities |

### UI Components
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/notifications.js` | 423 | Toast notifications (no deps) |
| `/frontend/js/modules/ui.js` | 337 | General UI utilities |
| `/frontend/js/modules/appUI.js` | 445 | Application-specific UI |
| `/frontend/js/modules/landingUI.js` | 809 | Landing page interactions |
| `/frontend/js/modules/profileModal.js` | 723 | User profile management |
| `/frontend/js/modules/testingModeUI.js` | 327 | Testing mode UI overlay |
| `/frontend/js/modules/themeManager.js` | 229 | Theme switching logic |

### Content Management
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/chapters.js` | 333 | Chapter CRUD operations |
| `/frontend/js/modules/sections.js` | 887 | Section management within chapters |
| `/frontend/js/modules/bookUpload.js` | 623 | File upload handling |
| `/frontend/js/modules/storage.js` | 915 | Project persistence and auto-save |
| `/frontend/js/modules/export.js` | 328 | Export functionality |

### Text Processing & Formatting
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/formattingToolbar.js` | 859 | Rich text formatting toolbar |
| `/frontend/js/modules/editMode.js` | 764 | Edit mode management |
| `/frontend/js/modules/smartSelect.js` | 531 | Intelligent text selection |
| `/frontend/js/modules/textSelection.js` | 86 | Basic text selection |
| `/frontend/js/modules/selectionTools.js` | 171 | Selection utility tools |
| `/frontend/js/modules/htmlToFormatting.js` | 266 | HTML to formatting conversion |
| `/frontend/js/modules/docxProcessor.js` | 213 | DOCX file processing |

### Advanced Features
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/tableOfContents.js` | 827 | TOC generation and navigation |
| `/frontend/js/modules/commentsSystem.js` | 344 | Inline commenting system |
| `/frontend/js/modules/reorder.js` | 502 | Drag-and-drop reordering |
| `/frontend/js/modules/projectMerge.js` | 243 | Project merging logic |
| `/frontend/js/modules/conflictResolution.js` | 370 | Merge conflict resolution |

### Infrastructure
| File | Lines | Purpose |
|------|-------|---------|
| `/frontend/js/modules/api.js` | 145 | Backend API communication |
| `/frontend/js/modules/stripe.js` | 731 | Stripe payment integration |
| `/frontend/js/modules/envManager.js` | 245 | Environment management |
| `/frontend/js/modules/moduleLoader.js` | 223 | Dynamic module loading |
| `/frontend/js/modules/appInitialization.js` | 349 | Application bootstrap |

## Other Important Files

### Database Schema
- `/sql/database_schema_cloud.sql` - Main database structure
- `/sql/add_stripe_support.sql` - Stripe integration tables
- `/sql/add_credits.sql` - Credit system tables
- `/sql/rls_issue_fix.sql` - Row-level security fixes

### Configuration
- `/requirements.txt` - Python dependencies
- `/env.example` - Environment variable template
- `/frontend/vercel.json` - Vercel deployment config
- `/Dockerfile` - Docker configuration

### Documentation
- `/README.md` - Project overview
- `/CLAUDE.md` - AI assistant instructions
- `/documentation/` - Extensive documentation folder

### Test Files
- `/test_files/` - Various test scripts
- Key tests: `test_auth_verification.py`, `debug-docx-upload.py`

## File Organization Patterns

### Naming Conventions
- Routes: `*_routes.py`
- Services: `*_service.py`
- Middleware: `*_middleware.py` or descriptive names
- Frontend modules: camelCase `.js` files

### Module Dependencies
- Core modules with no dependencies: `state.js`, `formattingState.js`, `notifications.js`, `api.js`
- Most imported module: `notifications.js` (25+ imports)
- Largest dependency tree: `router.js` (imports 15+ modules)

### File Size Distribution
- Small (<200 lines): 15 files
- Medium (200-500 lines): 28 files
- Large (500-1000 lines): 20 files
- Extra Large (>1000 lines): 5 files