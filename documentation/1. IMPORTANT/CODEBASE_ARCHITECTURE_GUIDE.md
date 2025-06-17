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
├── docx_routes.py          # DOCX processing endpoints (/api/upload/docx)
├── project_routes.py       # Project persistence endpoints (/api/project)
├── password_protection.py  # Temporary authentication for testing (/api/auth/temp-*)
└── static_routes.py        # Frontend file serving and SPA routing
```

**Key Routing Logic:**
- `auth_routes.py`: Handles login, signup, profile, credits, OAuth callbacks
- `upload_routes.py`: Audio file upload with MP3→WAV conversion
- `export_routes.py`: Audiobook creation with metadata and audio merging
- `docx_routes.py`: DOCX processing and validation
- `project_routes.py`: Project persistence and auto-save
- `password_protection.py`: Temporary authentication for testing
- `static_routes.py`: Serves frontend files and handles SPA routing

#### 4. Service Layer (Business Logic)
```
backend/services/
├── supabase_service.py     # Database operations & authentication
├── security_service.py     # reCAPTCHA, rate limiting, attack prevention
├── audio_service.py        # Audio file processing
├── export_service.py       # Audiobook creation and export
└── docx_service.py         # DOCX processing and extraction
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

**DOCXService** (`docx_service.py`):
- Advanced text extraction with formatting preservation
- Style mapping for Word styles (Heading 1, Title, etc.)
- Dynamic heading detection based on font size
- Enhanced whitespace preservation
- Hyperlink preservation from original documents
- Validation and processing info (file validation, processing time estimation)

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

## 🎨 Interactive UI Components & Systems

### Table of Contents System (`frontend/js/modules/tableOfContents.js`)
A dynamic, interactive Table of Contents (TOC) is generated from the document's formatting.
- **Header Extraction**: `extractTableOfContents` parses the `formattingData` array to find ranges with header types (`title`, `section`, etc.).
- **Dynamic Generation**: The TOC is built as a hierarchical list in a collapsible sidebar.
- **Scroll Spy**: An `IntersectionObserver` (`setupScrollObserver`) watches the header elements in the main content area and automatically highlights the corresponding item in the TOC as the user scrolls.
- **Click Navigation**: Clicking an item in the TOC smoothly scrolls the corresponding header into view.
- **Live Updates**: `refreshTableOfContents` is called whenever the document's content or formatting changes to ensure the TOC is always up-to-date.

### Landing Page UI System (`frontend/js/modules/landingUI.js`)
The landing page is not static; it contains several dynamic and interactive components.
- **Interactive Demos**: `playFeatureDemo` can launch modals that showcase animated demos of application features like chapter organization and audio management.
- **Testimonial Carousel**: `initTestimonialCarousel` creates an auto-playing carousel for user testimonials.
- **FAQ Accordion**: `initFAQ` builds an accordion-style interface for the Frequently Asked Questions section.
- **Newsletter Signup**: Includes logic for handling newsletter form submissions with validation.

### Notification System (`frontend/js/modules/notifications.js`)
The application uses a custom notification system instead of native browser alerts.
- **Types of Notifications**: Provides `showSuccess`, `showError`, `showWarning`, and `showInfo` functions, each with a distinct color and icon.
- **Confirmation Dialogs**: `showConfirm` creates a promise-based confirmation dialog, which is used for critical actions like deleting chapters.
- **Custom Styling**: All notifications and dialogs are styled with CSS to match the application's theme and are fully responsive.

### Comments System (`frontend/js/modules/commentsSystem.js`)
Provides a complete in-line commenting system.
- **Comment Creation**: Users can highlight text and add a comment, which is stored with its character position in the `formattingData` array.
- **Visual Indicators**: Comments are represented by a small, non-intrusive icon in the text.
- **Pop-up Display**: Clicking an indicator shows a pop-up with the comment text, author, and timestamp.
- **Resolution**: Comments can be marked as "resolved," changing their visual state.
- **Management**: The system includes functions to get all active or resolved comments and to export all comments to a text file.

### Advanced Reordering Modal (`frontend/js/modules/reorder.js`)
Provides a dedicated, full-screen modal for reordering both chapters and the sections within them.
- **Isolated Reordering**: Users can safely reorder content in the modal without affecting the main application view until they click "Apply."
- **Two-Level Drag-and-Drop**: Supports dragging and dropping of entire chapter blocks, as well as individual sections within each chapter's dropdown.
- **State Management**: It creates a deep copy (`originalChapterOrder`) of the chapters array when opened, which is used to restore the original order if the user cancels.

### Text Selection Tools (`frontend/js/modules/textSelection.js` & `selectionTools.js`)
When a user manually selects text with their mouse, a floating toolbar appears.
- **Contextual Tools**: The toolbar provides buttons like "Create Section."
- **Dynamic Positioning**: The tools are intelligently positioned above or below the selected text to ensure they remain within the viewport, and they reposition on scroll.
- **Character Counter**: A small, floating counter appears near the selection showing the number of selected characters.

---

## 💾 Project Collaboration & Merging

### Project Merge Engine (`frontend/js/modules/projectMerge.js`)
The application has a "smart merge" capability for combining two different project files.
- **Conflict Detection**: The engine compares the two projects and identifies conflicts in base text, chapter names, and section content.
- **Automatic Merging**: For non-conflicting data (like new chapters or sections), it automatically merges them.
- **Collaborator Merging**: It combines the `collaborators` list from both projects' metadata.

### Conflict Resolution UI (`frontend/js/modules/conflictResolution.js`)
When the merge engine finds conflicts, it displays a dedicated UI to resolve them.
- **Conflict Listing**: Each conflict is presented to the user in a clear, itemized list.
- **Resolution Options**: For each conflict, the user can choose to keep their "current" version, use the "imported" version, or, where applicable, "keep both."
- **Callback System**: Once the user has made their choices, the dialog passes an array of their resolutions back to the storage module, which then constructs the final, merged project.

---

## 🔌 HTML Conversion Engine (`frontend/js/modules/htmlToFormatting.js`)

This module is a crucial part of the DOCX import process, converting the HTML output from `mammoth.js` into the application's internal `formattingData` structure.
- **DOM Traversal**: It recursively traverses the HTML DOM generated from the DOCX file.
- **Tag-to-Format Mapping**: It maps standard HTML tags (`<strong>`, `<em>`, `<h1>`, `<li>`, etc.) to the application's internal format types (`bold`, `italic`, `heading`, `list-item`).
- **Position Tracking**: Critically, it maintains an exact `currentPosition` character count as it traverses the text nodes, ensuring that the `start` and `end` positions of the generated formatting ranges are perfectly aligned with the final plain text content.
- **Range Merging**: After the initial pass, it runs a `_mergeRanges` function to combine any adjacent, overlapping ranges of the same type for cleaner data.

---

## 🔐 Advanced Authentication & Security (`frontend/js/modules/auth.js`)

The `auth.js` module provides a comprehensive suite of authentication features beyond simple login/logout.

- **Dynamic Config Loading**: It first fetches its configuration (`supabase_url`, `supabase_anon_key`) from a backend endpoint (`/api/auth/config`), preventing hardcoded keys on the frontend.
- **Dynamic Supabase Import**: It attempts to load the Supabase client library from three different CDNs, providing resilience against a single point of failure.
- **Password Strength Meter**: When a user signs up, a password strength meter provides real-time feedback on their password quality.
- **Graceful Failure**: If the Supabase client fails to initialize, the application continues to run in a "demo mode" where auth-related forms are still visible for UI validation but cannot be submitted.
- **User Initialization**: On a user's first sign-in, it calls a backend endpoint (`/api/auth/initialize-user`) to perform any necessary database setup for the new user, such as granting starting credits.

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

## 🆕 New Features & Enhanced Functionality

### DOCX Processing System

#### Backend DOCX Service (`backend/services/docx_service.py`)
- **Advanced Text Extraction**: Complete DOCX parsing with formatting preservation
- **Style Mapping**: Maps Word styles (Heading 1, Title, etc.) to AudioBook CSS classes
- **Dynamic Heading Detection**: Font size-based automatic heading classification
- **Enhanced Whitespace Preservation**: Maintains document structure and line breaks
- **Hyperlink Preservation**: Maintains URLs and links from original documents
- **Validation & Processing Info**: File validation and processing time estimation

#### DOCX API Routes (`backend/routes/docx_routes.py`)
- **`/api/upload/docx`**: Main DOCX upload and processing endpoint
- **`/api/upload/docx/validate`**: File validation without processing
- **Credit System Integration**: 5 credits per DOCX processing
- **Error Handling**: Comprehensive error handling for various DOCX issues
- **File Size Limits**: 25MB maximum file size with validation

#### Frontend DOCX Processing (`frontend/js/modules/docxProcessor.js`)
- **Mammoth.js Integration**: Rich content extraction with images, tables, links
- **Dual Processing**: Both rich HTML and raw text extraction capabilities
- **Dynamic Library Loading**: CDN-based mammoth.js loading with fallbacks
- **Processing Metrics**: Detailed processing statistics and feature detection

### Rich Text Formatting System

#### Formatting Toolbar (`frontend/js/modules/formattingToolbar.js`)
- **Adaptive Toolbars**: Different toolbars for TXT vs DOCX files
- **Rich Text Controls**: Bold, italic, underline, headings, quotes, comments
- **Keyboard Shortcuts**: Ctrl+B/I/U for formatting, positioning support
- **File Type Awareness**: Context-sensitive tools based on file type
- **Visual State Updates**: Real-time toolbar state based on selection

#### Formatting State Management (`frontend/js/modules/formattingState.js`)
- **Range-Based Formatting**: Character-level formatting range management
- **Comment Integration**: Inline comment system with resolve/unresolve
- **Conflict Detection**: Overlapping format detection and resolution
- **Persistence**: Auto-save formatting data with state
- **Validation**: Range validation and boundary checking

#### Formatting Renderer (`frontend/js/modules/formattingRenderer.js`)
- **DOM Application**: Applies formatting ranges to live DOM
- **Performance Optimization**: Efficient rendering with minimal DOM manipulation
- **Comment Indicators**: Visual comment markers with click handlers
- **Style Preservation**: Maintains formatting across content updates
- **Accessibility**: ARIA labels and semantic markup

### Table of Contents System (`frontend/js/modules/tableOfContents.js`)
- **Automatic Header Detection**: Scans formatting data for headings
- **Hierarchical Display**: Multi-level heading organization with icons
- **Navigation**: Click-to-scroll with smooth scrolling
- **Real-time Updates**: Automatic refresh when content changes
- **Keyboard Shortcuts**: Ctrl+Shift+T to toggle, Escape to close
- **Responsive Design**: Overlay sidebar with responsive positioning
- **Scroll Tracking**: Active header highlighting during scroll

### Comments & Annotation System (`frontend/js/modules/commentsSystem.js`)
- **Inline Comments**: Position-based comment anchoring
- **Comment Dialog**: Rich comment creation interface
- **Resolution System**: Mark comments as resolved/unresolved
- **Visual Indicators**: Comment markers in text with click popups
- **Comment Management**: Export, delete, and filter comments
- **Keyboard Support**: Escape to close, Ctrl+Enter to save

### Testing Mode Framework

#### Backend Testing Support (`backend/routes/password_protection.py`)
- **Temporary Authentication**: Simple password-based access
- **Session Management**: Flask session-based authentication state
- **Testing Mode Routes**: `/api/auth/temp-login`, `/api/auth/temp-logout`, `/api/auth/temp-status`
- **Environment Integration**: Configurable via `TESTING_MODE` environment variable

#### Frontend Testing UI (`frontend/js/modules/testingModeUI.js`)
- **Testing Mode Detection**: Automatic UI adaptation for testing
- **Navigation Restrictions**: Disabled navigation links in testing mode
- **Exit Confirmation**: Modal dialog for testing mode exit
- **Visual Indicators**: Testing mode badges and styling
- **Data Cleanup**: Secure localStorage clearing on exit

#### Temporary Authentication (`frontend/js/modules/tempAuth.js`)
- **Bypass System**: Alternative to full Supabase authentication
- **Router Integration**: Testing mode routing logic
- **State Management**: Testing authentication state tracking

### Project Persistence System (`backend/routes/project_routes.py`)
- **Auto-Save**: Automatic project saving to database
- **Project Loading**: Latest project retrieval for users
- **State Persistence**: Complete application state storage
- **Metadata Tracking**: Project titles, descriptions, timestamps
- **Debug Endpoints**: Service status and configuration checking

### Conflict Resolution System (`frontend/js/modules/conflictResolution.js`)
- **Merge Conflicts**: Detection and resolution of content conflicts
- **Resolution UI**: Modal dialog for conflict resolution choices
- **Conflict Types**: Book text, chapter names, section content conflicts
- **Resolution Options**: Keep current, use imported, or merge both
- **Visual Preview**: Conflict content preview in resolution dialog

### Enhanced Content Management

#### Smart Text Selection (`frontend/js/modules/smartSelect.js`)
- **Intelligent Chunking**: Configurable text chunk sizes for audio processing
- **Selection Tools**: Advanced text selection with formatting awareness
- **Boundary Detection**: Smart boundary detection for natural breaks
- **Visual Feedback**: Selection highlighting and boundary indicators

#### Section Management (`frontend/js/modules/sections.js`)
- **Formatting-Preserving Section Creation**: Creates sections while keeping all rich text formatting intact.
- **Advanced Clipboard Functionality**: Implements a multi-layered copy-to-clipboard system, including a modern `navigator.clipboard` API, a legacy `execCommand` fallback, and a final manual-copy dialog if all else fails.
- **Drag-and-Drop Reordering**: Allows users to visually reorder sections and move them between chapters. The system intelligently updates chapter and section data models.
- **Audio Attachment**: Connects audio files to specific text sections, handling the upload process and linking the audio path to the section data.
- **Navigation and Highlighting**: Provides `navigateToSection` to scroll to and flash a section's highlight in the main text, with logic to scroll within the correct container.

#### Chapter Organization (`frontend/js/modules/chapters.js`)
- **Chapter Management**: Full CRUD operations for chapters
- **Audio Organization**: Chapter-level audio file management
- **Duration Tracking**: Total duration calculation per chapter
- **Reordering**: Drag-and-drop chapter reordering support

### Advanced UI Components

#### Landing Page (`frontend/js/modules/landingUI.js`)
- **Dynamic Content**: Feature showcase and testimonials
- **Authentication Integration**: Seamless auth flow from landing
- **Responsive Design**: Mobile-optimized layout
- **Marketing Features**: Pricing, features, and call-to-action sections

#### Notification System (`frontend/js/modules/notifications.js`)
- **Rich Notifications**: Success, error, info, and warning messages
- **Toast System**: Non-blocking notification toasts
- **Queue Management**: Notification stacking and timing
- **Action Support**: Clickable notifications with callbacks

#### Theme Management (`frontend/js/modules/themeManager.js`)
- **Theme Switching**: Light/dark theme support
- **Persistence**: Theme preference storage
- **CSS Custom Properties**: Dynamic theme variable management
- **System Integration**: Respect system theme preferences

### Enhanced Export System (`frontend/js/modules/export.js`)
- **Smart ZIP Detection**: Automatic ZIP creation for multiple files
- **Format Options**: MP3/WAV export format selection
- **Book Content Export**: Complete project export with highlights
- **Metadata Export**: Comprehensive metadata in JSON format
- **Single File Downloads**: Direct download for single files

### Application Lifecycle

#### App Initialization (`frontend/js/modules/appInitialization.js`)
- **Bootstrap Process**: Systematic application startup
- **Module Loading**: Coordinated module initialization
- **Error Recovery**: Graceful handling of initialization failures
- **Performance Monitoring**: Startup time tracking

#### Session Management (`frontend/js/modules/sessionManager.js`)
- **Cross-Tab Sync**: Authentication state across browser tabs
- **Password Recovery**: Special modes for password reset flows
- **Security Events**: Authentication event logging and handling
- **Storage Events**: localStorage change detection and response

### HTML to Formatting Conversion (`frontend/js/modules/htmlToFormatting.js`)
- **HTML Parsing**: Convert HTML content to formatting ranges
- **Style Mapping**: Map HTML elements to internal formatting types
- **Content Extraction**: Extract text content while preserving formatting
- **DOCX Integration**: Specialized handling for DOCX-generated HTML

### Edit Mode System (`frontend/js/modules/editMode.js`)
- **Mode Management**: Toggle between view and edit modes
- **Content Protection**: Prevent editing in view mode
- **State Persistence**: Remember edit mode preferences
- **UI Adaptation**: Conditional UI element display based on mode

### File Upload & Processing (`frontend/js/modules/bookUpload.js`)
- **Hybrid DOCX Processing Pipeline**: Implements a `processDocxFileHybrid` function that processes DOCX files using both a backend service and a frontend (mammoth.js) processor in parallel.
- **Intelligent Result Merging**: The `mergeDocxResults` function uses backend text as the source of truth and intelligently aligns formatting ranges from the frontend. It can handle perfect text matches, perform fuzzy alignment for minor differences, and falls back to backend ranges if discrepancies are too large.
- **Robust Error Handling**: Provides specific user-facing error messages for various failure scenarios, including auth failures, file size limits, invalid file types, and insufficient credits.
- **State Management**: Correctly sets the application's file type (`docx` or `txt`) based on the upload, which is crucial for enabling or disabling formatting features.

### Storage & Project Management (`frontend/js/modules/storage.js`)

#### Project Persistence System
- **Complete Project Export**: Full project data including formatting, comments, collaborator info
- **Merge Detection**: Automatically detects existing projects on import
- **Smart Merging**: Conflict resolution with user choice (merge vs replace)
- **Version Control**: Project versioning with metadata tracking
- **Auto-save System**: Configurable automatic saving with debouncing to prevent excessive writes.

#### Advanced Save/Load Features
- **Collaborative Metadata**: Tracks multiple contributors per project
- **Asynchronous Highlight Restoration**: Uses `requestAnimationFrame` to restore section highlights in batches, preventing the UI from freezing on large projects.
- **Robust Text Finding**: Employs a `TreeWalker`-based approach (`restoreSingleHighlight`) to accurately find and re-highlight text even in a complex, formatted DOM.
- **Database Integration**: Cloud storage via Supabase with local fallback
- **Progress Tracking**: Saves reading position and smart selection state

**Storage Formats**:
```json
{
  "bookText": "...",
  "projectMetadata": {
    "collaborators": ["user1", "user2"],
    "lastModified": "2024-01-01T00:00:00Z",
    "version": "1.2"
  },
  "formattingData": { "ranges": [...], "comments": [...] },
  "chapters": [...],
  "highlights": [...]
}
```

### UI Management System (`frontend/js/modules/appUI.js`)

#### Dynamic Interface Adaptation
- **Authentication-Aware UI**: Shows/hides elements based on auth state
- **User Navigation Generation**: Dynamic user menus with profile management
- **Mobile-Responsive Elements**: Separate mobile and desktop navigation
- **Dropdown Management**: Click-outside-to-close behavior

#### Real-Time UI Updates
- **Cross-Tab UI Sync**: UI updates when auth changes in other tabs
- **User Display Name Logic**: Handles various user data formats
- **Navigation State Persistence**: Maintains UI state across page loads

### Formatting & User Interaction

#### Formatting Toolbar (`frontend/js/modules/formattingToolbar.js`)
- **Context-Aware Toolbars**: Displays different toolbars for `.txt` and `.docx` files.
- **Selection Preservation**: After applying or removing formatting, the user's text selection is carefully restored.
- **Formatting Shortcuts**: Initializes keyboard shortcuts (e.g., Ctrl+B for bold) for quick text formatting.
- **State-Aware Buttons**: The toolbar buttons and dropdowns update their state (e.g., showing "bold" as active) based on the current text selection.

#### Smart Selection System (`frontend/js/modules/smartSelect.js`)
- **Manual Cursor Override**: Detects user clicks via multiple event listeners (`click`, `mouseup`, `keyup`) to override automatic positioning.
- **Character Count Control**: Configurable chunk sizes with visual indicators
- **Accurate Highlighting**: Uses a `TreeWalker`-based approach to accurately find and wrap the selected text in a highlighting span, even across multiple DOM nodes.
- **Position Tracking**: Shows percentage progress through book

**Key Functions**:
- `performSmartSelect()` - Main selection algorithm with boundary detection

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

## 🔍 Debugging New Features

### DOCX Processing Issues

**Issue**: DOCX upload fails or formatting not extracted
- **Check**: `backend/services/docx_service.py` → `extract_content_with_formatting()`
- **Debug**: File validation in `backend/routes/docx_routes.py`
- **Frontend**: Check `frontend/js/modules/docxProcessor.js` mammoth.js loading
- **Error Types**: ValidationError, processing timeout, unsupported format

**Issue**: Formatting not displaying correctly
- **Check**: `frontend/js/modules/formattingRenderer.js` → DOM application
- **Debug**: Formatting ranges in `frontend/js/modules/formattingState.js`
- **Console**: Look for range validation errors or conflicts

### Rich Text Formatting Issues

**Issue**: Formatting toolbar not appearing or not working
- **Check**: `frontend/js/modules/formattingToolbar.js` → `showFormattingToolbar()`
- **Debug**: Edit mode state in `frontend/js/modules/editMode.js`
- **Prerequisites**: Ensure edit mode is enabled and file type is detected

**Issue**: Formatting ranges not saving or overlapping
- **Check**: `frontend/js/modules/formattingState.js` → range validation
- **Debug**: Conflict detection and resolution in state management
- **Storage**: Check localStorage persistence of formatting data

### Table of Contents Issues

**Issue**: TOC not showing headers or navigation not working
- **Check**: `frontend/js/modules/tableOfContents.js` → `extractTableOfContents()`
- **Debug**: Formatting data and header detection logic
- **DOM**: Ensure header elements have proper IDs for navigation

### Comments System Issues

**Issue**: Comments not appearing or click handlers not working
- **Check**: `frontend/js/modules/commentsSystem.js` → event handlers
- **Debug**: Comment rendering in `frontend/js/modules/formattingRenderer.js`
- **State**: Verify comments are stored in formattingData.comments

### Testing Mode Issues

**Issue**: Testing mode not activating or password not working
- **Check**: `backend/routes/password_protection.py` → temp authentication
- **Debug**: Environment variable `TESTING_MODE` and `TEMPORARY_PASSWORD`
- **Frontend**: Check `frontend/js/modules/tempAuth.js` initialization

**Issue**: Testing mode UI not applying correctly
- **Check**: `frontend/js/modules/testingModeUI.js` → style application
- **Debug**: CSS class application and navigation link disabling

### Project Persistence Issues

**Issue**: Auto-save not working or projects not loading
- **Check**: `backend/routes/project_routes.py` → save/load endpoints
- **Debug**: Supabase service configuration and RLS policies
- **Authentication**: Verify user is properly authenticated for database access

**Issue**: Project data corruption or merge conflicts
- **Check**: `frontend/js/modules/conflictResolution.js` → conflict detection
- **Debug**: Project data structure validation in save/load process

### Performance & Memory Issues

**Issue**: Large DOCX files causing slowdown or memory issues
- **Check**: File size limits in `backend/routes/docx_routes.py` (25MB limit)
- **Debug**: Processing time estimation in `backend/services/docx_service.py`
- **Optimization**: Consider chunked processing for very large documents

**Issue**: Formatting rendering performance issues
- **Check**: `frontend/js/modules/formattingRenderer.js` → DOM optimization
- **Debug**: Number of formatting ranges and DOM manipulation frequency
- **Solutions**: Implement range merging or virtual scrolling for large documents

### Frontend Module Loading Issues

**Issue**: ES6 modules not loading or import errors
- **Check**: Module import paths and circular dependencies
- **Debug**: Browser developer tools network tab for failed imports
- **Common**: Verify file paths and module export/import syntax

### Integration Debugging

**Issue**: Cross-module communication failures
- **Check**: Event system and global state management
- **Debug**: Module initialization order in `frontend/js/modules/appInitialization.js`
- **State**: Verify shared state objects and event listeners

### Development Tools

#### Frontend Debugging Extensions
```javascript
// Global debugging helpers for new features
window.debugFormatting = () => {
    import('./modules/formattingState.js').then(module => {
        console.log('Formatting Data:', module.formattingData);
        console.log('Active Ranges:', module.getActiveFormattingRanges());
    });
};

window.debugTOC = () => {
    import('./modules/tableOfContents.js').then(module => {
        console.log('TOC State:', module.getTOCState());
    });
};

window.debugComments = () => {
    import('./modules/commentsSystem.js').then(module => {
        console.log('All Comments:', module.getAllComments());
        console.log('Active Comments:', module.getActiveComments());
    });
};
```

#### Backend Debugging for New Features
```python
# Enable detailed DOCX processing logs
logging.getLogger('backend.services.docx_service').setLevel('DEBUG')

# Enable project persistence debugging
logging.getLogger('backend.routes.project_routes').setLevel('DEBUG')

# Enable testing mode debugging
logging.getLogger('backend.routes.password_protection').setLevel('DEBUG')
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

## 🎨 Advanced Frontend Module Ecosystem

### Smart Selection System (`frontend/js/modules/smartSelect.js`)
- **Intelligent Text Chunking**: Automatically selects optimal text chunks ending on periods/line breaks
- **Sequential Processing**: Tracks reading position through book
- **Manual Cursor Override**: Detects user clicks to override automatic positioning
- **Character Count Control**: Configurable chunk sizes with visual indicators
- **Position Tracking**: Shows percentage progress through book

**Key Functions**:
- `performSmartSelect()` - Main selection algorithm with boundary detection
- `advanceSmartSelectPosition()` - Updates position after section creation
- `highlightSmartSelection()` - Visual feedback for selected text
- `resetSmartSelect()` - Returns to beginning of book

**Usage Pattern**: Users upload book → set chunk size → smart select automatically finds optimal sections → create sections with one click

---

### Storage & Project Management (`frontend/js/modules/storage.js`)

#### Project Persistence System
- **Complete Project Export**: Full project data including formatting, comments, collaborator info
- **Merge Detection**: Automatically detects existing projects on import
- **Smart Merging**: Conflict resolution with user choice (merge vs replace)
- **Version Control**: Project versioning with metadata tracking
- **Auto-save System**: Configurable automatic saving with debouncing to prevent excessive writes.

#### Advanced Save/Load Features
- **Collaborative Metadata**: Tracks multiple contributors per project
- **Asynchronous Highlight Restoration**: Uses `requestAnimationFrame` to restore section highlights in batches, preventing the UI from freezing on large projects.
- **Robust Text Finding**: Employs a `TreeWalker`-based approach (`restoreSingleHighlight`) to accurately find and re-highlight text even in a complex, formatted DOM.
- **Database Integration**: Cloud storage via Supabase with local fallback
- **Progress Tracking**: Saves reading position and smart selection state

**Storage Formats**:
```json
{
  "bookText": "...",
  "projectMetadata": {
    "collaborators": ["user1", "user2"],
    "lastModified": "2024-01-01T00:00:00Z",
    "version": "1.2"
  },
  "formattingData": { "ranges": [...], "comments": [...] },
  "chapters": [...],
  "highlights": [...]
}
```

---

### Session Management (`frontend/js/modules/sessionManager.js`)

#### Cross-Tab Authentication System
- **Global State Sync**: Maintains auth state across browser tabs
- **Password Recovery**: Special mode for password reset flows
- **Security Event Logging**: Tracks login attempts and suspicious activity  
- **Token Validation**: Includes client-side `isValidJWT` checks for token structure before use.
- **Visibility-Based Refresh**: Re-checks auth when tab becomes active

#### Advanced Auth Features
- **Google OAuth Integration**: Seamless Google authentication flow
- **Cross-Tab Password Recovery**: A sophisticated system using `localStorage` to manage a global password recovery state. It uses a unique tab ID and timestamps to prevent race conditions and ensures that an auth session cannot be started while another tab is in recovery mode.
- **Security Event Logging**: The `logSecurityEvent` function tracks actions like `recovery_bypass_attempt` to monitor for unusual behavior.
- **Session Timeout**: Automatic logout with configurable timeouts

**Event System**:
```javascript
// Cross-component auth events
window.addEventListener('auth-state-changed', (event) => {
  const { isAuthenticated, user, session } = event.detail;
});
```

---

### UI Management System (`frontend/js/modules/appUI.js`)

#### Dynamic Interface Adaptation
- **Authentication-Aware UI**: Shows/hides elements based on auth state
- **User Navigation Generation**: Dynamic user menus with profile management
- **Mobile-Responsive Elements**: Separate mobile and desktop navigation
- **Dropdown Management**: Click-outside-to-close behavior

#### Real-Time UI Updates
- **Cross-Tab UI Sync**: UI updates when auth changes in other tabs
- **User Display Name Logic**: Handles various user data formats
- **Navigation State Persistence**: Maintains UI state across page loads

---

### Module Integration & Communication

#### Event-Driven Architecture
- **Global Event Bus**: Modules communicate via standardized events
- **State Change Broadcasting**: Real-time updates across components
- **Error Event Handling**: Centralized error reporting and recovery

#### Module Dependencies
```javascript
// Typical module import pattern
import { showSuccess, showError } from './notifications.js';
import { formattingData } from './formattingState.js';
import { getCurrentUser } from './auth.js';
```

#### Initialization System (`frontend/js/modules/appInitialization.js`)
- **Dependency Order Management**: Ensures modules load in correct sequence
- **Router Integration**: Coordinates with client-side routing
- **Error Recovery**: Graceful handling of initialization failures

---

## 🔧 Enhanced Backend Services

### DOCX Service Advanced Features (`backend/services/docx_service.py`)

#### Validation & Processing Estimates
- **Pre-processing Validation**: Validates DOCX files before processing
- **Processing Time Estimation**: Predicts processing time based on complexity
- **Formatting Density Analysis**: Calculates ratio of formatted to plain text
- **Style Usage Detection**: Identifies which styles are present in document

#### Text-Only Extraction Mode
- **Pure Text Mode**: Option to extract only text without any formatting
- **Whitespace Preservation**: Maintains original spacing and line breaks
- **Performance Optimization**: Faster processing for simple text extraction
- **Fallback Option**: Available when formatting extraction fails

**Methods**:
- `validate_docx_file()` - Pre-processing validation
- `get_processing_info()` - Document complexity analysis  
- `extract_text_only()` - Simple text extraction without formatting
- `_estimate_processing_time()` - Processing time prediction

---

## 🎯 Testing & Development Features

### Testing Mode System (`frontend/js/modules/testingModeUI.js`)
- **Development Interface**: Special UI for testing features
- **Mock Data Generation**: Automated test data creation
- **Feature Flag Management**: Enable/disable experimental features
- **Debug Information Display**: Real-time system state visualization

### Validator System (`frontend/js/modules/validators.js`)
- **Input Validation**: Client-side validation for all forms
- **File Type Checking**: Validates uploaded files
- **Data Integrity Checks**: Ensures data consistency across operations

---

## 🌐 Advanced Features Summary

### Complete Feature Matrix

| Feature Category | Components | Key Capabilities |
|------------------|------------|------------------|
| **Rich Text** | formattingState.js, formattingRenderer.js, formattingToolbar.js | DOCX import, real-time formatting, collaborative editing |
| **Smart Selection** | smartSelect.js, selectionTools.js | Intelligent chunking, progress tracking, manual override |
| **Project Management** | storage.js, projectMerge.js, conflictResolution.js | Save/load, merging, collaboration, version control |
| **Authentication** | sessionManager.js, auth.js, appUI.js | Cross-tab sync, OAuth, password recovery, security logging |
| **Audio Processing** | chapters.js, sections.js, audio_service.py | Multi-format support, chapter playback, audio merging |
| **Export System** | export.js, export_service.py | Multiple formats, custom styling, batch operations |
| **UI/UX** | ui.js, appUI.js, themeManager.js | Responsive design, theme switching, dynamic interfaces |

### Development Tools & Testing
- **Testing Mode**: Complete development interface for feature testing
- **Debug Tools**: Real-time state inspection and manipulation
- **Validation System**: Comprehensive input and data validation
- **Error Handling**: Graceful degradation and user-friendly error messages

---

## Security Implementation

This guide provides a comprehensive overview of the AudioBook Organizer codebase. For specific implementation details, refer to the inline code comments and individual file documentation. 