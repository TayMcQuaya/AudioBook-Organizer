"""
Rate Limiting Middleware
Provides configurable rate limiting for API endpoints
"""

import os
import logging
from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logger = logging.getLogger(__name__)

def get_user_id():
    """Get user ID for rate limiting (fallback to IP if not authenticated)"""
    from flask import g
    return getattr(g, 'user_id', get_remote_address())

def create_limiter(app):
    """Create and configure rate limiter"""
    
    # Rate limiting configuration from environment
    rate_limiting_enabled = os.environ.get('RATE_LIMITING_ENABLED', 'true').lower() == 'true'
    
    if not rate_limiting_enabled:
        # Return a dummy limiter that doesn't limit anything
        class NoOpLimiter:
            def limit(self, *args, **kwargs):
                def decorator(f):
                    return f
                return decorator
            
            def exempt(self, f):
                return f
        
        logger.info("Rate limiting is disabled")
        return NoOpLimiter()
    
    # Configure Redis or in-memory storage
    storage_uri = os.environ.get('REDIS_URL', 'memory://')
    
    try:
        limiter = Limiter(
            key_func=get_user_id,
            storage_uri=storage_uri,
            default_limits=["1000 per hour"],
            headers_enabled=True,
            strategy="fixed-window",
            on_breach=lambda limit: jsonify({
                'success': False,
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'RATE_LIMIT_EXCEEDED'
            })
        )
        
        # Initialize with the app
        limiter.init_app(app)
        logger.info(f"Rate limiting initialized with storage: {storage_uri}")
        return limiter
        
    except Exception as e:
        logger.error(f"Failed to initialize rate limiter: {e}")
        # Return no-op limiter if initialization fails
        class NoOpLimiter:
            def limit(self, *args, **kwargs):
                def decorator(f):
                    return f
                return decorator
            
            def exempt(self, f):
                return f
        
        return NoOpLimiter()

# Rate limiting decorators for different endpoint types
def payment_rate_limit():
    """Rate limit for payment-related endpoints"""
    return os.environ.get('PAYMENT_RATE_LIMIT', '5 per minute, 20 per hour')

def auth_rate_limit():
    """Rate limit for authentication endpoints"""
    return os.environ.get('AUTH_RATE_LIMIT', '10 per minute, 50 per hour')

def api_rate_limit():
    """Rate limit for general API endpoints"""
    return os.environ.get('API_RATE_LIMIT', '100 per minute, 1000 per hour') 