# Security Middleware System - AudioBook Organizer

## Overview
The security system implements multiple layers:
1. JWT authentication
2. CSRF protection
3. Rate limiting
4. Security headers
5. reCAPTCHA integration
6. Input validation
7. File upload security

## Authentication Middleware

### Auth Middleware (`backend/middleware/auth_middleware.py`)
- **Lines**: 305
- **Core Decorators**:

```python
@require_auth
# Mandatory authentication - returns 401 if not authenticated

@optional_auth  
# Optional - attaches user if authenticated, continues if not

@require_credits(amount)
# Checks minimum credit balance before allowing access

@consume_credits(amount, action)
# Deducts credits after successful operation
```

### JWT Verification Flow
```python
def verify_jwt_token(token):
    try:
        # 1. Decode token
        payload = jwt.decode(
            token,
            app.config['JWT_SECRET_KEY'],
            algorithms=['HS256'],
            audience='authenticated'
        )
        
        # 2. Check expiration
        if payload['exp'] < time.time():
            raise TokenExpiredError()
        
        # 3. Verify user exists
        user = get_user_by_id(payload['sub'])
        if not user:
            raise UserNotFoundError()
        
        # 4. Return user data
        return {
            'id': payload['sub'],
            'email': payload.get('email'),
            'role': payload.get('role', 'user')
        }
        
    except jwt.InvalidTokenError:
        return None
```

### Request Context
```python
# User attached to Flask g object
@require_auth
def protected_route():
    user = g.current_user
    # user = {
    #     'id': 'uuid',
    #     'email': 'user@email.com',
    #     'role': 'user'
    # }
```

## CSRF Protection

### CSRF Middleware (`backend/middleware/csrf_middleware.py`)
- **Lines**: 76
- **Implementation**:

```python
class CSRFProtection:
    def __init__(self, app):
        self.app = app
        self.init_app(app)
    
    def generate_token(self):
        """Generate CSRF token for session"""
        if 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_urlsafe(32)
        return session['csrf_token']
    
    def validate_token(self, token):
        """Validate CSRF token from request"""
        return token == session.get('csrf_token')
    
    def protect(self, f):
        """Decorator for CSRF protection"""
        @wraps(f)
        def decorated(*args, **kwargs):
            if request.method in ['POST', 'PUT', 'DELETE']:
                token = request.headers.get('X-CSRF-Token')
                if not token or not self.validate_token(token):
                    return jsonify({'error': 'CSRF token invalid'}), 403
            return f(*args, **kwargs)
        return decorated
```

### Frontend Integration
```javascript
// Get CSRF token
async function getCSRFToken() {
    const response = await fetch('/api/security/csrf-token');
    const data = await response.json();
    return data.token;
}

// Include in requests
const csrfToken = await getCSRFToken();
fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
        'X-CSRF-Token': csrfToken,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
});
```

## Rate Limiting

### Rate Limiter (`backend/middleware/rate_limiter.py`)
- **Lines**: 85
- **Configuration**:

```python
class RateLimiter:
    def __init__(self, per_minute=60, per_hour=600):
        self.per_minute = per_minute
        self.per_hour = per_hour
        self.requests = defaultdict(list)
    
    def is_allowed(self, identifier):
        """Check if request is within rate limits"""
        now = time.time()
        
        # Clean old requests
        self.requests[identifier] = [
            req for req in self.requests[identifier]
            if now - req < 3600  # Keep last hour
        ]
        
        # Check limits
        recent_requests = self.requests[identifier]
        minute_requests = sum(1 for req in recent_requests if now - req < 60)
        hour_requests = len(recent_requests)
        
        if minute_requests >= self.per_minute:
            return False, "Rate limit exceeded (per minute)"
        if hour_requests >= self.per_hour:
            return False, "Rate limit exceeded (per hour)"
        
        # Record request
        self.requests[identifier].append(now)
        return True, None
```

### Route-Specific Limits
```python
# Different limits for different endpoints
auth_limiter = RateLimiter(per_minute=5, per_hour=20)
upload_limiter = RateLimiter(per_minute=10, per_hour=50)
api_limiter = RateLimiter(per_minute=30, per_hour=200)

@auth_bp.route('/login', methods=['POST'])
@auth_limiter.limit
def login():
    pass
```

## Security Headers

### Security Headers Middleware (`backend/middleware/security_headers.py`)
- **Lines**: 59
- **Headers Applied**:

```python
def add_security_headers(response):
    """Add security headers to all responses"""
    
    # Prevent XSS attacks
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Content Security Policy
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://api.stripe.com https://*.supabase.co; "
        "frame-src https://www.google.com https://checkout.stripe.com"
    )
    
    # HTTPS enforcement
    if not app.debug:
        response.headers['Strict-Transport-Security'] = (
            'max-age=31536000; includeSubDomains'
        )
    
    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    
    # Permissions policy
    response.headers['Permissions-Policy'] = (
        'geolocation=(), microphone=(), camera=()'
    )
    
    return response
```

## reCAPTCHA Integration

### Security Service (`backend/services/security_service.py`)
- **Lines**: 278
- **reCAPTCHA v3 Implementation**:

```python
def verify_recaptcha(token, action='login'):
    """Verify reCAPTCHA v3 token"""
    
    if app.config.get('TESTING_MODE'):
        return True  # Skip in testing
    
    data = {
        'secret': app.config['RECAPTCHA_SECRET_KEY'],
        'response': token
    }
    
    response = requests.post(
        'https://www.google.com/recaptcha/api/siteverify',
        data=data
    )
    
    result = response.json()
    
    # Check success and score
    if not result.get('success'):
        return False
    
    # Verify action matches
    if result.get('action') != action:
        return False
    
    # Check score threshold (0.0 - 1.0)
    score = result.get('score', 0)
    return score >= 0.5  # Configurable threshold
```

### Frontend Integration
```javascript
// recaptcha.js
async function executeRecaptcha(action) {
    return new Promise((resolve) => {
        grecaptcha.ready(() => {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action })
                .then(token => resolve(token))
                .catch(() => resolve(null));
        });
    });
}

// Usage in auth
async function login(email, password) {
    const recaptchaToken = await executeRecaptcha('login');
    
    const response = await api.post('/api/auth/login', {
        email,
        password,
        recaptchaToken
    });
}
```

## Input Validation

### Validation Utils (`backend/utils/validation.py`)
- **Lines**: 120
- **Validation Functions**:

```python
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain special character"
    
    return True, "Password is strong"

def sanitize_input(text):
    """Remove potentially dangerous characters"""
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Escape HTML
    text = html.escape(text)
    
    # Limit length
    return text[:10000]  # Configurable max length
```

### File Upload Validation
```python
def validate_file_upload(file):
    """Validate uploaded files"""
    
    # Check file exists
    if not file:
        return False, "No file provided"
    
    # Check file extension
    allowed_extensions = {'.mp3', '.wav', '.m4a', '.txt', '.docx'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        return False, f"File type {ext} not allowed"
    
    # Check MIME type
    mime_type = magic.from_buffer(file.read(1024), mime=True)
    file.seek(0)  # Reset file pointer
    
    allowed_mimes = {
        'audio/mpeg', 'audio/wav', 'audio/mp4',
        'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    if mime_type not in allowed_mimes:
        return False, "Invalid file content"
    
    # Check file size
    file.seek(0, 2)  # Seek to end
    size = file.tell()
    file.seek(0)  # Reset
    
    max_sizes = {
        '.mp3': 100 * 1024 * 1024,  # 100MB
        '.wav': 200 * 1024 * 1024,  # 200MB
        '.docx': 25 * 1024 * 1024,  # 25MB
        '.txt': 10 * 1024 * 1024    # 10MB
    }
    
    if size > max_sizes.get(ext, 10 * 1024 * 1024):
        return False, "File too large"
    
    return True, "File valid"
```

## Session Security

### Session Configuration
```python
# backend/config.py
class Config:
    # Session security
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True  # No JS access
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    
    # Additional security
    SECRET_KEY = os.getenv('SESSION_SECRET_KEY', secrets.token_hex(32))
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None  # No time limit on CSRF tokens
```

## Attack Prevention

### SQL Injection Prevention
```python
# Always use parameterized queries
def get_user_by_email(email):
    # Safe - uses parameters
    query = "SELECT * FROM users WHERE email = %s"
    return db.execute(query, (email,))
    
    # Unsafe - DON'T DO THIS
    # query = f"SELECT * FROM users WHERE email = '{email}'"
```

### XSS Prevention
```javascript
// Frontend - always escape user content
function displayUserContent(content) {
    const escaped = escapeHtml(content);
    element.textContent = escaped;  // Safe
    // element.innerHTML = content;  // Unsafe!
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
```

### Path Traversal Prevention
```python
def serve_upload(filename):
    # Sanitize filename
    filename = os.path.basename(filename)
    
    # Ensure file is in uploads directory
    safe_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    real_path = os.path.realpath(safe_path)
    
    if not real_path.startswith(os.path.realpath(app.config['UPLOAD_FOLDER'])):
        abort(403)  # Forbidden
    
    return send_file(real_path)
```

## Security Monitoring

### Login Attempt Tracking
```python
# Track failed login attempts
failed_attempts = {}

def track_failed_login(email, ip_address):
    key = f"{email}:{ip_address}"
    
    if key not in failed_attempts:
        failed_attempts[key] = []
    
    failed_attempts[key].append(time.time())
    
    # Check if account should be locked
    recent_attempts = [
        t for t in failed_attempts[key] 
        if time.time() - t < 3600  # Last hour
    ]
    
    if len(recent_attempts) >= 5:
        lock_account(email)
        notify_security_team(email, ip_address)
```

### Security Event Logging
```python
def log_security_event(event_type, user_id=None, details=None):
    """Log security-relevant events"""
    
    event = {
        'type': event_type,
        'timestamp': datetime.utcnow(),
        'user_id': user_id,
        'ip_address': get_client_ip(),
        'user_agent': request.headers.get('User-Agent'),
        'details': details
    }
    
    # Log to database
    db.security_events.insert(event)
    
    # Alert on critical events
    if event_type in ['account_locked', 'suspicious_activity']:
        send_security_alert(event)
```