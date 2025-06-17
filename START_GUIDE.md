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
