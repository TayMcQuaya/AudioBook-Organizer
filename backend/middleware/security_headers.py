"""
Security Headers Middleware
Adds security headers to all responses
"""

import os
from flask import current_app

def add_security_headers(response):
    """Add security headers to response"""
    
    # Content Security Policy - tailored for AudioBook Organizer
    # Environment-aware configuration for unified deployment
    app_domain = os.environ.get('APP_DOMAIN', '')
    
    csp_policy = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.jsdelivr.net https://www.google.com https://www.gstatic.com https://unpkg.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        f"connect-src 'self' https://api.stripe.com https://*.supabase.co {app_domain} https://www.google.com; "
        "frame-src https://js.stripe.com https://www.google.com; "
        "object-src 'none'; "
        "base-uri 'self';"
    )
    
    # Check if custom CSP is provided via environment
    custom_csp = os.environ.get('CSP_POLICY')
    if custom_csp:
        csp_policy = custom_csp
    
    # Security headers
    security_headers = {
        'Content-Security-Policy': csp_policy,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
    
    # Only add HSTS in production with HTTPS
    if current_app.config.get('SESSION_COOKIE_SECURE'):
        security_headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    # Apply headers only if security headers are enabled
    if current_app.config.get('SECURITY_HEADERS_ENABLED', True):
        for header, value in security_headers.items():
            if value:  # Only add if value is not None
                response.headers[header] = value
    
    return response

def init_security_headers(app):
    """Initialize security headers for the app"""
    
    @app.after_request
    def apply_security_headers(response):
        return add_security_headers(response)
    
    app.logger.info("✅ Security headers middleware initialized")
    return app 