import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Base configuration settings"""
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ['true', '1', 'yes']
    
    # File upload settings
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size
    
    # Directory paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    EXPORT_FOLDER = os.path.join(BASE_DIR, 'exports')
    STATIC_FOLDER = os.path.join(BASE_DIR, 'frontend')
    STATIC_URL_PATH = ''
    
    # Server settings
    HOST = os.environ.get('FLASK_HOST', 'localhost')
    PORT = int(os.environ.get('FLASK_PORT', 3000))
    
    # Temporary production password (for testing phase)
    TEMPORARY_PASSWORD = os.environ.get('TEMPORARY_PASSWORD')
    TESTING_MODE = os.environ.get('TESTING_MODE', 'false').lower() in ['true', '1', 'yes']
    
    # Session configuration - industry standard for demo/testing environments
    # Testing mode gets extended sessions for better UX, production gets shorter sessions for security
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24) if os.environ.get('TESTING_MODE', 'false').lower() in ['true', '1', 'yes'] else timedelta(hours=1)
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() in ['true', '1', 'yes']
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_REFRESH_EACH_REQUEST = True  # Refresh session timeout on each request
    
    # Supabase configuration
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_ANON_KEY')  # Fixed: Use ANON_KEY for main key
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')  # Keep separate service key
    SUPABASE_ANON_KEY = os.environ.get('SUPABASE_ANON_KEY')
    SUPABASE_JWT_SECRET = os.environ.get('JWT_SECRET_KEY')  # Fixed: Match .env variable name
    
    # Credits system configuration (for future ElevenLabs integration)
    DEFAULT_CREDITS = int(os.environ.get('DEFAULT_CREDITS', 100))
    MAX_CREDITS_PER_USER = int(os.environ.get('MAX_CREDITS_PER_USER', 10000))
    
    # Payment configuration (for future Stripe/PayPal integration)
    STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY')
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
    PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET')

    # Security Configuration
    SECURITY = {
        'PASSWORD_MIN_LENGTH': 8,
        'PASSWORD_REQUIRE_UPPERCASE': True,
        'PASSWORD_REQUIRE_LOWERCASE': True,
        'PASSWORD_REQUIRE_NUMBERS': True,
        'PASSWORD_REQUIRE_SPECIAL': True,
        'MAX_LOGIN_ATTEMPTS': 5,
        'LOGIN_ATTEMPT_WINDOW': 900,  # 15 minutes in seconds
    }

    # reCAPTCHA Configuration
    RECAPTCHA = {
        'SITE_KEY': os.getenv('RECAPTCHA_SITE_KEY'),
        'SECRET_KEY': os.getenv('RECAPTCHA_SECRET_KEY'),
        'ENABLED': os.getenv('RECAPTCHA_ENABLED', 'true').lower() == 'true',
        'THRESHOLD': float(os.getenv('RECAPTCHA_THRESHOLD', '0.5')),  # Score threshold for v3
        'VERIFY_URL': 'https://www.google.com/recaptcha/api/siteverify'
    }

    # Rate Limiting Configuration
    RATE_LIMITING = {
        'ENABLED': os.getenv('RATE_LIMITING_ENABLED', 'true').lower() == 'true',
        'AUTH_ATTEMPTS_PER_MINUTE': int(os.getenv('AUTH_ATTEMPTS_PER_MINUTE', '5')),
        'AUTH_ATTEMPTS_PER_HOUR': int(os.getenv('AUTH_ATTEMPTS_PER_HOUR', '20')),
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    # Local development gets generous session times
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Production server settings
    HOST = '0.0.0.0'
    PORT = int(os.environ.get('PORT', 8000))
    
    # Enhanced security settings for production - configured for cross-domain
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'None'  # Required for cross-domain cookies
    
    # Production session configuration - balanced between security and UX
    # Testing mode: 24 hours for demo purposes, Normal mode: 4 hours for security
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24) if os.environ.get('TESTING_MODE', 'false').lower() in ['true', '1', 'yes'] else timedelta(hours=4)
    SESSION_REFRESH_EACH_REQUEST = True  # Extend session on activity
    
    # Production-specific rate limiting
    RATE_LIMITING = {
        'ENABLED': True,
        'AUTH_ATTEMPTS_PER_MINUTE': int(os.getenv('AUTH_ATTEMPTS_PER_MINUTE', '3')),
        'AUTH_ATTEMPTS_PER_HOUR': int(os.getenv('AUTH_ATTEMPTS_PER_HOUR', '10')),
    }

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
} 