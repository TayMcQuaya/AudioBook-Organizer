🌐LIVE PRODUCTION - TEST PHASE:

# Basic Flask Settings
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=3Z5pC-hUvfzW_YEcW3NiIK9NTgTNyCuxbvj3-Ue2UXA <- oh lol , it has been already replaced dont even try :)

# Testing Mode Settings
TESTING_MODE=true
TEMPORARY_PASSWORD=YourStrongTestPassword123

# Production Security
SESSION_COOKIE_SECURE=true
FORCE_HTTPS=true

# Server Settings
HOST=0.0.0.0
PORT=8000

🌐LIVE PRODUCTION - NORMAL MODE:
# Basic Flask Settings
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=3Z5pC-hUvfzW_YEcW3NiIK9NTgTNyCuxbvj3-Ue2UXA

# Normal Mode Settings
TESTING_MODE=false

# Production Security
SESSION_COOKIE_SECURE=true
FORCE_HTTPS=true

# Server Settings
HOST=0.0.0.0
PORT=8000

# Supabase Configuration (Required for normal mode)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret-from-supabase

# Security Features
RECAPTCHA_ENABLED=true
RECAPTCHA_SITE_KEY=your-recaptcha-site-key
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key
RECAPTCHA_THRESHOLD=0.5

# Rate Limiting
RATE_LIMITING_ENABLED=true
AUTH_ATTEMPTS_PER_MINUTE=5
AUTH_ATTEMPTS_PER_HOUR=20

# Password Security
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=true

# Login Protection
MAX_LOGIN_ATTEMPTS=5
LOGIN_ATTEMPT_WINDOW=900

--------------------------------------------------------------------------------------------

🏠 LOCAL + TESTING MODE (Simplest)

# Create .env file:
FLASK_ENV=development
TESTING_MODE=true
TEMPORARY_PASSWORD=test123
SECRET_KEY=dev-key
HOST=localhost
PORT=3000
SESSION_COOKIE_SECURE=false

# Start: python app.py
# Visit: http://localhost:3000 (password: test123)

🏠 LOCAL + NORMAL MODE (Full features)

# Same as above, but add:
TESTING_MODE=false
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET_KEY=your-jwt-secret

🌐 PRODUCTION + TESTING MODE (Easy deployment)

# DigitalOcean environment variables:
FLASK_ENV=production
TESTING_MODE=true
TEMPORARY_PASSWORD=secure-password
SECRET_KEY=strong-production-key

# Then run: python deploy-setup.py --backend-url https://your-url

🌐 PRODUCTION + NORMAL MODE (Full production)

# Same as production testing, but add:
TESTING_MODE=false
SUPABASE_URL=your-supabase-url
# + all Supabase credentials



for stripe to listen locally:
.\stripe.exe listen --forward-to localhost:5000/api/stripe/webhook