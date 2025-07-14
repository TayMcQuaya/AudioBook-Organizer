"""
Authentication Middleware for AudioBook Organizer
Handles JWT token verification and route protection
"""

import logging
from functools import wraps
from flask import request, jsonify, g
from typing import Optional, Dict, Any, Callable

from ..services.supabase_service import get_supabase_service

logger = logging.getLogger(__name__)

class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass

def extract_token_from_header() -> Optional[str]:
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header:
        return None
    
    # Expected format: "Bearer <token>"
    parts = auth_header.split()
    
    if len(parts) != 2:
        logger.warning(f"Invalid Authorization header format - expected 2 parts, got {len(parts)}: {auth_header}")
        return None
        
    if parts[0].lower() != 'bearer':
        logger.warning(f"Invalid Authorization header - expected 'Bearer', got '{parts[0]}': {auth_header}")
        return None
    
    token = parts[1]
    
    # Basic token validation
    if not token or len(token) < 10:  # JWT tokens are much longer
        logger.warning(f"Token too short or empty: {len(token) if token else 0} characters")
        return None
    
    return token

def get_current_user() -> Optional[Dict[str, Any]]:
    """Get current user from request context"""
    return getattr(g, 'current_user', None)

def require_auth(f: Callable) -> Callable:
    """
    Decorator to require authentication for a route
    Usage: @require_auth
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            from flask import current_app, session
            
            # Check if we're in testing mode
            if current_app.config.get('TESTING_MODE'):
                # In testing mode, check for temp authentication
                if session.get('temp_authenticated'):
                    # Create a mock user for testing mode
                    mock_user = {
                        'id': 'temp_user',
                        'email': 'temp@testing.mode',
                        'role': 'user'
                    }
                    g.current_user = mock_user
                    g.user_id = mock_user['id']
                    g.user_email = mock_user['email']
                    logger.info("✅ Testing mode - User authenticated via temp auth")
                    return f(mock_user, *args, **kwargs)
                else:
                    logger.warning("🔍 Testing mode - No temp authentication found")
                    return jsonify({
                        'error': 'Authentication required',
                        'message': 'Please authenticate with the temporary password first'
                    }), 401
            
            # Normal mode - require JWT token
            # Extract token from header
            token = extract_token_from_header()
            
            # DEBUG: Log token extraction
            logger.info(f"🔍 DEBUG: Token extracted - exists: {bool(token)}, length: {len(token) if token else 0}")
            
            if not token:
                logger.warning("🔍 DEBUG: No token found in header")
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'Authorization header with Bearer token is required'
                }), 401
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                logger.error("🔍 DEBUG: Supabase service not configured")
                return jsonify({
                    'error': 'Authentication service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # DEBUG: Log before token verification
            logger.info(f"🔍 DEBUG: About to verify token for user")
            
            # Verify token and extract user
            user = supabase_service.get_user_from_token(token)
            
            # DEBUG: Log verification result
            logger.info(f"🔍 DEBUG: Token verification result - user found: {bool(user)}")
            
            if not user:
                logger.warning("🔍 DEBUG: Token verification failed - user is None")
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'The provided token is invalid or expired'
                }), 401
            
            # Store user in request context
            g.current_user = user
            g.user_id = user['id']
            g.user_email = user['email']
            
            logger.info(f"✅ User authenticated: {user['email']} ({user['id']})")
            
            # Pass current_user as the first argument to the decorated function
            return f(user, *args, **kwargs)
            
        except AuthenticationError as e:
            logger.warning(f"Authentication failed: {e}")
            return jsonify({
                'error': 'Authentication failed',
                'message': str(e)
            }), 401
            
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}")
            return jsonify({
                'error': 'Authentication error',
                'message': 'An unexpected error occurred during authentication'
            }), 500
    
    return decorated_function

def optional_auth(f: Callable) -> Callable:
    """
    Decorator for optional authentication (user data available if authenticated)
    Usage: @optional_auth
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Extract token from header
            token = extract_token_from_header()
            
            if token:
                # Get Supabase service
                supabase_service = get_supabase_service()
                
                if supabase_service.is_configured():
                    # Try to verify token and extract user
                    user = supabase_service.get_user_from_token(token)
                    
                    if user:
                        # Store user in request context
                        g.current_user = user
                        g.user_id = user['id']
                        g.user_email = user['email']
                        logger.info(f"✅ Optional auth - User authenticated: {user['email']}")
            
            # Continue regardless of authentication status
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.warning(f"Optional authentication failed (continuing anyway): {e}")
            # Continue without authentication
            return f(*args, **kwargs)
    
    return decorated_function

def require_credits(min_credits: int = 1):
    """
    Decorator to require minimum credits for a route
    Usage: @require_credits(10)
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        @require_auth  # Must be authenticated first
        def decorated_function(*args, **kwargs):
            try:
                from flask import current_app
                
                # In testing mode, bypass credit checks
                if current_app.config.get('TESTING_MODE'):
                    g.current_credits = 999999  # Unlimited credits in testing
                    logger.info(f"✅ Testing mode - Bypassing credit check for {min_credits} credits")
                    return f(*args, **kwargs)
                
                user_id = g.user_id
                
                # Get Supabase service
                supabase_service = get_supabase_service()
                
                # Check user's credit balance
                # CRITICAL FIX: Always get fresh credits for pre-action checks
                current_credits = supabase_service.get_user_credits(user_id, use_cache=False)
                
                if current_credits < min_credits:
                    return jsonify({
                        'error': 'Insufficient credits',
                        'message': f'This action requires {min_credits} credits. You have {current_credits} credits.',
                        'current_credits': current_credits,
                        'required_credits': min_credits
                    }), 402  # Payment Required status code
                
                # Store current credits in context for the route to use
                g.current_credits = current_credits
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error checking credits: {e}")
                return jsonify({
                    'error': 'Credit check failed',
                    'message': 'Unable to verify credit balance'
                }), 500
        
        return decorated_function
    return decorator

def consume_credits(credits_to_consume: int, action: str):
    """
    Decorator to consume credits after successful action
    Usage: @consume_credits(5, "text_to_speech")
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Execute the original function first
            result = f(*args, **kwargs)
            
            # Only consume credits if the function was successful
            # Check if it's a successful response (status 2xx or Flask Response object)
            is_successful = False
            
            if hasattr(result, 'status_code'):
                # It's a Flask Response object
                is_successful = 200 <= result.status_code < 300
            elif isinstance(result, tuple):
                # It's a (response, status_code) tuple
                is_successful = len(result) > 1 and 200 <= result[1] < 300
            else:
                # Assume success if no status code (direct return)
                is_successful = True
            
            if is_successful and hasattr(g, 'user_id'):
                try:
                    from flask import current_app
                    
                    # In testing mode, don't actually consume credits
                    if current_app.config.get('TESTING_MODE'):
                        logger.info(f"✅ Testing mode - Simulated consumption of {credits_to_consume} credits for {action}")
                        return result
                    
                    # Get Supabase service
                    supabase_service = get_supabase_service()
                    
                    # Consume credits
                    success = supabase_service.update_user_credits(g.user_id, -credits_to_consume)
                    
                    if success:
                        # Cache is now automatically cleared in update_user_credits()
                        
                        # Log the usage
                        supabase_service.log_usage(
                            g.user_id, 
                            action, 
                            credits_to_consume,
                            {'endpoint': request.endpoint, 'method': request.method}
                        )
                        logger.info(f"✅ Consumed {credits_to_consume} credits for {action} by user {g.user_id}")
                    else:
                        logger.warning(f"⚠️ Failed to consume credits for user {g.user_id}")
                        
                except Exception as e:
                    logger.error(f"Error consuming credits: {e}")
                    # Don't fail the request if credit consumption fails
            
            return result
        
        return decorated_function
    return decorator

def get_user_info() -> Dict[str, Any]:
    """
    Helper function to get current user information
    Returns empty dict if not authenticated
    """
    user = get_current_user()
    return user if user else {}

def is_authenticated() -> bool:
    """
    Helper function to check if current request is authenticated
    """
    return get_current_user() is not None 