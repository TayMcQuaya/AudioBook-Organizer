# Testing & Development Guide - AudioBook Organizer

## Testing Mode System

### Overview
Testing mode provides a simplified authentication system for development and testing without requiring Supabase setup.

### Enabling Testing Mode
```bash
# In .env file
TESTING_MODE=true
TEMPORARY_PASSWORD=testaccess

# Run application
python app.py
```

### Testing Mode Features
1. Bypasses Supabase authentication
2. Uses simple password authentication
3. No credit consumption
4. Stripe payments disabled
5. Debug endpoints enabled

## Backend Testing Components

### Password Protection (`backend/routes/password_protection.py`)
- **Lines**: 303
- **Purpose**: Temporary authentication system
- **Key Endpoints**:
  - `POST /api/auth/temp-login` - Password login
  - `POST /api/auth/temp-logout` - Clear session
  - `GET /api/auth/temp-status` - Check auth
  - `GET /api/auth/debug-session` - Debug info

### Testing Mode Flow
```python
# Authentication check
def check_temp_auth():
    if not app.config.get('TESTING_MODE'):
        return None
    
    # Check session
    if session.get('temp_authenticated'):
        return {
            'id': 'test-user',
            'email': 'test@example.com',
            'testing_mode': True
        }
    
    return None

# Login endpoint
@auth_bp.route('/temp-login', methods=['POST'])
def temp_login():
    password = request.json.get('password')
    
    if password == app.config.get('TEMPORARY_PASSWORD'):
        session['temp_authenticated'] = True
        return jsonify({'success': True})
    
    return jsonify({'error': 'Invalid password'}), 401
```

## Frontend Testing Components

### Testing Mode UI (`frontend/js/modules/testingModeUI.js`)
- **Lines**: 327
- **Features**:
  - Password entry modal
  - Visual testing indicators
  - Navigation restrictions
  - Exit confirmation

### Testing Mode Detection
```javascript
// Check if in testing mode
function isTestingMode() {
    return localStorage.getItem('testingModeActive') === 'true' ||
           sessionStorage.getItem('temp-auth') === 'true';
}

// Apply testing mode UI
if (isTestingMode()) {
    applyTestingModeStyles();
    disableNavigation();
    showTestingBanner();
}
```

### Temporary Auth (`frontend/js/modules/tempAuth.js`)
- **Lines**: 271
- **Purpose**: Handle testing authentication
- **Features**:
  - Password prompt
  - Session management
  - Router integration

## Test Files Directory

### Available Test Scripts
```bash
test_files/
├── test_auth_verification.py      # Auth system tests
├── test_auth_fix.html            # Frontend auth testing
├── test_credit_system.py         # Credit functionality
├── test_profile_modal_fixes.py   # UI component tests
├── test_security_implementation.py # Security tests
├── test_production_readiness.py  # Production checks
├── debug_docx_upload.py          # DOCX processing tests
└── setup_testing_env.py          # Environment setup
```

### Running Tests
```bash
# Test authentication
python test_files/test_auth_verification.py

# Test DOCX processing
python test_files/debug_docx_upload.py

# Test credit system
python test_files/test_credit_system.py

# Full production readiness check
python test_files/test_production_readiness.py
```

## Development Workflow

### Initial Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd AudioBook-Organizer

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment
cp env.example .env
# Edit .env with your values

# 5. Run in testing mode
TESTING_MODE=true python app.py
```

### Development Tools

#### Debug Endpoints
```python
# Available in testing mode only
@app.route('/debug/config')
def debug_config():
    return jsonify({
        'testing_mode': app.config.get('TESTING_MODE'),
        'backend_url': app.config.get('BACKEND_URL'),
        'upload_folder': app.config.get('UPLOAD_FOLDER'),
        'max_file_size': app.config.get('MAX_CONTENT_LENGTH')
    })

@app.route('/api/projects/debug')
def debug_projects():
    return jsonify({
        'supabase_configured': bool(supabase_service.supabase),
        'projects_table': 'audiobook_projects',
        'can_connect': test_connection()
    })
```

#### Frontend Debug Helpers
```javascript
// Global debug functions
window.debugAuth = () => {
    console.log('Auth State:', {
        isAuthenticated: authModule.isAuthenticated(),
        user: authModule.getCurrentUser(),
        testingMode: isTestingMode()
    });
};

window.debugState = () => {
    import('./modules/state.js').then(module => {
        console.log('App State:', {
            chapters: module.chapters,
            sections: module.sections,
            bookText: module.bookText.substring(0, 100) + '...'
        });
    });
};

window.debugFormatting = () => {
    import('./modules/formattingState.js').then(module => {
        console.log('Formatting:', module.formattingData);
    });
};
```

## Environment Configuration

### Development Environment
```bash
# .env for development
FLASK_ENV=development
FLASK_DEBUG=true
TESTING_MODE=true
TEMPORARY_PASSWORD=testaccess
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Optional for development
SUPABASE_URL=
SUPABASE_ANON_KEY=
RECAPTCHA_SITE_KEY=
```

### Production Environment
```bash
# .env for production
FLASK_ENV=production
FLASK_DEBUG=false
TESTING_MODE=false
BACKEND_URL=https://your-backend.com
FRONTEND_URL=https://your-frontend.com

# Required for production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
JWT_SECRET_KEY=your-secret-key
RECAPTCHA_SITE_KEY=6Lc...
RECAPTCHA_SECRET_KEY=6Lc...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Common Development Tasks

### Adding New API Endpoint
```python
# 1. Create route in backend/routes/
@bp.route('/new-endpoint', methods=['POST'])
@require_auth
def new_endpoint():
    data = request.json
    # Process data
    return jsonify({'success': True})

# 2. Add to app.py
app.register_blueprint(new_bp, url_prefix='/api')

# 3. Create frontend API call
async function callNewEndpoint(data) {
    return await api.post('/api/new-endpoint', data);
}
```

### Adding New Frontend Module
```javascript
// 1. Create module in frontend/js/modules/
// newFeature.js
export function initNewFeature() {
    // Module code
}

// 2. Import in dependent modules
import { initNewFeature } from './newFeature.js';

// 3. Initialize in appInitialization.js
await initNewFeature();
```

### Database Schema Changes
```sql
-- 1. Create migration file
-- sql/add_new_feature.sql
ALTER TABLE audiobook_projects 
ADD COLUMN new_field JSONB DEFAULT '{}';

-- 2. Apply to Supabase
-- Run in Supabase SQL editor

-- 3. Update RLS policies if needed
CREATE POLICY "Users can access own data"
ON new_table FOR ALL
USING (auth.uid() = user_id);
```

## Debugging Guide

### Backend Debugging
```python
# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Add debug prints
app.logger.debug(f"User data: {user_data}")
app.logger.error(f"Error occurred: {str(e)}")

# Use Flask debugger
app.run(debug=True)
```

### Frontend Debugging
```javascript
// Browser DevTools
console.log('Debug info:', data);
console.table(arrayData);
console.trace('Call stack');

// Breakpoints
debugger; // Pauses execution

// Network debugging
console.log('API Response:', await response.json());

// Performance profiling
console.time('operation');
// ... code ...
console.timeEnd('operation');
```

### Common Issues

#### CORS Errors
```python
# Check backend/app.py CORS configuration
CORS(app, 
    origins=['http://localhost:3000'],
    supports_credentials=True
)
```

#### Module Import Errors
```javascript
// Check file paths and extensions
import { module } from './module.js'; // Include .js
// Not: import { module } from './module';
```

#### Database Connection Issues
```python
# Check Supabase configuration
print(f"SUPABASE_URL: {app.config.get('SUPABASE_URL')}")
print(f"Supabase client: {supabase_service.supabase}")
```

## Testing Best Practices

### Unit Testing
```python
# Example test structure
def test_credit_consumption():
    # Setup
    user_id = 'test-user'
    initial_credits = 100
    
    # Action
    new_balance = consume_credits(user_id, 10, 'test_action')
    
    # Assert
    assert new_balance == 90
    assert get_user_credits(user_id) == 90
```

### Integration Testing
```javascript
// Test full flow
async function testDocxUpload() {
    // 1. Login
    await login('test@example.com', 'password');
    
    // 2. Upload file
    const file = new File(['content'], 'test.docx');
    const result = await uploadDocx(file);
    
    // 3. Verify result
    assert(result.success === true);
    assert(result.formatting.length > 0);
}
```

### Performance Testing
```bash
# Use Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/test

# Monitor memory usage
python -m memory_profiler app.py

# Profile code
python -m cProfile app.py
```

## Deployment Preparation

### Pre-deployment Checklist
1. Set `TESTING_MODE=false`
2. Update all environment variables
3. Run `test_production_readiness.py`
4. Check security headers
5. Verify HTTPS configuration
6. Test payment integration
7. Verify database migrations
8. Check file permissions

### Build Commands
```bash
# Backend preparation
pip freeze > requirements.txt
python deploy-setup.py --backend-url https://your-backend.com

# Frontend build (if needed)
# Currently uses vanilla JS, no build required

# Docker build
docker build -t audiobook-organizer .
docker run -p 8000:8000 audiobook-organizer
```