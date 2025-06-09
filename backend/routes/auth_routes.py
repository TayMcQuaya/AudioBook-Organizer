"""
Authentication Routes for AudioBook Organizer
Handles user authentication, authorization, and account management
"""

import logging
from flask import Blueprint, request, jsonify, g
from typing import Dict, Any

from ..services.supabase_service import get_supabase_service
from ..services.security_service import get_security_service
from ..middleware.auth_middleware import require_auth, optional_auth, get_current_user

logger = logging.getLogger(__name__)

def create_auth_routes() -> Blueprint:
    """Create and configure authentication routes"""
    auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
    
    @auth_bp.route('/config', methods=['GET'])
    def get_auth_config():
        """Get public authentication configuration for frontend"""
        try:
            from ..config import Config
            
            # Only return public configuration (not secrets)
            config_data = {
                'supabase_url': Config.SUPABASE_URL,
                'supabase_anon_key': Config.SUPABASE_ANON_KEY,
                'recaptcha_enabled': Config.RECAPTCHA['ENABLED'],
                'recaptcha_site_key': Config.RECAPTCHA['SITE_KEY'] if Config.RECAPTCHA['ENABLED'] else None
            }
            
            # Check if Supabase is properly configured
            supabase_configured = bool(config_data['supabase_url'] and config_data['supabase_anon_key'])
            
            return jsonify({
                'success': True,
                'config': config_data,
                'configured': supabase_configured
            })
            
        except Exception as e:
            logger.error(f"Config retrieval error: {e}")
            return jsonify({
                'success': False,
                'error': 'Configuration unavailable',
                'message': 'Failed to retrieve authentication configuration'
            }), 500
    
    @auth_bp.route('/status', methods=['GET'])
    @optional_auth
    def get_auth_status():
        """Get current authentication status"""
        try:
            # Get current user from middleware (if authenticated)
            user = get_current_user()
            
            if user:
                # Get Supabase service
                supabase_service = get_supabase_service()
                
                # Get user profile and credits
                profile = supabase_service.get_user_profile(user['id'])
                credits = supabase_service.get_user_credits(user['id'])
                
                return jsonify({
                    'authenticated': True,
                    'user': user,
                    'profile': profile,
                    'credits': credits
                })
            else:
                return jsonify({
                    'authenticated': False,
                    'user': None
                })
                
        except Exception as e:
            logger.error(f"Auth status check error: {e}")
            return jsonify({
                'authenticated': False,
                'user': None,
                'error': 'Status check failed'
            })

    @auth_bp.route('/verify', methods=['POST'])
    def verify_token():
        """Verify JWT token and return user information"""
        try:
            # Get security service for rate limiting
            security_service = get_security_service()
            client_ip = security_service._get_client_ip()
            
            # Check rate limiting
            rate_limit = security_service.check_rate_limit(client_ip, 'auth')
            if not rate_limit['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': rate_limit['reason'],
                    'retry_after': rate_limit.get('retry_after', 60)
                }), 429
            
            # Record the attempt
            security_service.record_attempt(client_ip, 'auth')
            
            # Get token from request
            data = request.get_json()
            token = data.get('token') if data else None
            
            if not token:
                return jsonify({
                    'error': 'Token required',
                    'message': 'JWT token is required for verification'
                }), 400
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                return jsonify({
                    'error': 'Service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # Verify token
            user = supabase_service.get_user_from_token(token)
            
            if not user:
                return jsonify({
                    'error': 'Invalid token',
                    'message': 'The provided token is invalid or expired'
                }), 401
            
            # Get user profile and credits
            profile = supabase_service.get_user_profile(user['id'])
            credits = supabase_service.get_user_credits(user['id'])
            
            return jsonify({
                'success': True,
                'user': user,
                'profile': profile,
                'credits': credits
            })
            
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return jsonify({
                'error': 'Verification failed',
                'message': 'An error occurred during token verification'
            }), 500
    
    @auth_bp.route('/login', methods=['POST'])
    def login():
        """Handle user login with reCAPTCHA verification"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            email = data.get('email')
            password = data.get('password')
            recaptcha_token = data.get('recaptcha_token')
            
            # Basic validation
            if not email or not password:
                return jsonify({
                    'error': 'Missing credentials',
                    'message': 'Email and password are required'
                }), 400
            
            # Get security service
            security_service = get_security_service()
            client_ip = security_service._get_client_ip()
            
            # Check rate limiting
            rate_limit = security_service.check_rate_limit(client_ip, 'auth')
            if not rate_limit['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': rate_limit['reason'],
                    'retry_after': rate_limit.get('retry_after', 60)
                }), 429
            
            # Check login attempts for this email/IP
            login_check = security_service.check_login_attempts(email)
            if not login_check['allowed']:
                return jsonify({
                    'error': 'Too many failed attempts',
                    'message': login_check['reason'],
                    'time_remaining': login_check['time_remaining']
                }), 429
            
            # Verify reCAPTCHA
            recaptcha_result = security_service.verify_recaptcha(recaptcha_token, 'login')
            if not recaptcha_result['success']:
                security_service.record_failed_login(email)
                return jsonify({
                    'error': 'Security verification failed',
                    'message': recaptcha_result.get('error', 'Please complete the security verification'),
                    'recaptcha_error': True
                }), 400
            
            # Record the auth attempt
            security_service.record_attempt(client_ip, 'auth')
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                return jsonify({
                    'error': 'Service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # Attempt login with Supabase
            auth_result = supabase_service.sign_in_with_password(email, password)
            
            if not auth_result['success']:
                # Record failed login
                security_service.record_failed_login(email)
                return jsonify({
                    'error': 'Authentication failed',
                    'message': auth_result.get('error', 'Invalid email or password')
                }), 401
            
            # Clear failed login attempts on successful login
            security_service.clear_login_attempts(email)
            
            logger.info(f"Successful login for {email} - reCAPTCHA score: {recaptcha_result.get('score', 'N/A')}")
            
            return jsonify({
                'success': True,
                'message': 'Login successful',
                'session': auth_result['session'],
                'user': auth_result['user'],
                'recaptcha_score': recaptcha_result.get('score')
            })
            
        except Exception as e:
            logger.error(f"Login error: {e}")
            return jsonify({
                'error': 'Login failed',
                'message': 'An error occurred during login'
            }), 500
    
    @auth_bp.route('/signup', methods=['POST'])
    def signup():
        """Handle user signup with reCAPTCHA verification"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            email = data.get('email')
            password = data.get('password')
            full_name = data.get('full_name')
            recaptcha_token = data.get('recaptcha_token')
            
            # Basic validation
            if not email or not password or not full_name:
                return jsonify({
                    'error': 'Missing information',
                    'message': 'Email, password, and full name are required'
                }), 400
            
            # Get security service
            security_service = get_security_service()
            client_ip = security_service._get_client_ip()
            
            # Check rate limiting
            rate_limit = security_service.check_rate_limit(client_ip, 'auth')
            if not rate_limit['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': rate_limit['reason'],
                    'retry_after': rate_limit.get('retry_after', 60)
                }), 429
            
            # Verify reCAPTCHA
            recaptcha_result = security_service.verify_recaptcha(recaptcha_token, 'signup')
            if not recaptcha_result['success']:
                return jsonify({
                    'error': 'Security verification failed',
                    'message': recaptcha_result.get('error', 'Please complete the security verification'),
                    'recaptcha_error': True
                }), 400
            
            # Record the auth attempt
            security_service.record_attempt(client_ip, 'auth')
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                return jsonify({
                    'error': 'Service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # Attempt signup with Supabase
            auth_result = supabase_service.sign_up_with_password(email, password, {'full_name': full_name})
            
            if not auth_result['success']:
                return jsonify({
                    'error': 'Registration failed',
                    'message': auth_result.get('error', 'Failed to create account')
                }), 400
            
            logger.info(f"Successful signup for {email} - reCAPTCHA score: {recaptcha_result.get('score', 'N/A')}")
            
            return jsonify({
                'success': True,
                'message': 'Account created successfully',
                'session': auth_result['session'],
                'user': auth_result['user'],
                'recaptcha_score': recaptcha_result.get('score')
            })
            
        except Exception as e:
            logger.error(f"Signup error: {e}")
            return jsonify({
                'error': 'Signup failed',
                'message': 'An error occurred during signup'
            }), 500
    
    @auth_bp.route('/profile', methods=['GET'])
    @require_auth
    def get_profile():
        """Get user profile information"""
        try:
            user = get_current_user()
            user_id = user['id']
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get user profile
            profile = supabase_service.get_user_profile(user_id)
            
            if not profile:
                return jsonify({
                    'error': 'Profile not found',
                    'message': 'User profile could not be found'
                }), 404
            
            return jsonify({
                'success': True,
                'profile': profile
            })
            
        except Exception as e:
            logger.error(f"Get profile error: {e}")
            return jsonify({
                'error': 'Profile retrieval failed',
                'message': 'An error occurred while retrieving profile'
            }), 500
    
    @auth_bp.route('/profile', methods=['PUT'])
    @require_auth
    def update_profile():
        """Update user profile information"""
        try:
            user = get_current_user()
            user_id = user['id']
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Update profile
            success = supabase_service.update_user_profile(user_id, data)
            
            if not success:
                return jsonify({
                    'error': 'Update failed',
                    'message': 'Failed to update profile'
                }), 500
            
            # Get updated profile
            updated_profile = supabase_service.get_user_profile(user_id)
            
            return jsonify({
                'success': True,
                'message': 'Profile updated successfully',
                'profile': updated_profile
            })
            
        except Exception as e:
            logger.error(f"Update profile error: {e}")
            return jsonify({
                'error': 'Profile update failed',
                'message': 'An error occurred while updating profile'
            }), 500
    
    @auth_bp.route('/credits', methods=['GET'])
    @require_auth
    def get_credits():
        """Get user's current credit balance"""
        try:
            user = get_current_user()
            user_id = user['id']
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get credits
            credits = supabase_service.get_user_credits(user_id)
            
            return jsonify({
                'success': True,
                'credits': credits,
                'user_id': user_id
            })
            
        except Exception as e:
            logger.error(f"Get credits error: {e}")
            return jsonify({
                'error': 'Credits retrieval failed',
                'message': 'An error occurred while retrieving credits'
            }), 500
    
    @auth_bp.route('/init-user', methods=['POST'])
    @require_auth
    def initialize_user():
        """Initialize user profile and credits for new users"""
        try:
            user = get_current_user()
            user_id = user['id']
            email = user['email']
            
            # Get additional data from request
            data = request.get_json() or {}
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Check if profile already exists
            existing_profile = supabase_service.get_user_profile(user_id)
            
            if not existing_profile:
                # Create profile
                profile_success = supabase_service.create_user_profile(user_id, email, data)
                
                if not profile_success:
                    return jsonify({
                        'error': 'Profile creation failed',
                        'message': 'Failed to create user profile'
                    }), 500
            
            # Note: Credits are automatically created by database trigger on signup
            # We don't need to manually initialize them here
            
            # Get final profile and credits
            profile = supabase_service.get_user_profile(user_id)
            credits = supabase_service.get_user_credits(user_id)
            
            return jsonify({
                'success': True,
                'message': 'User data retrieved successfully',
                'profile': profile,
                'credits': credits,
                'is_new_user': not existing_profile  # Indicate if profile was just created
            })
            
        except Exception as e:
            logger.error(f"User initialization error: {e}")
            return jsonify({
                'error': 'Initialization failed',
                'message': 'An error occurred during user initialization'
            }), 500
    
    @auth_bp.route('/security-status', methods=['GET'])
    def get_security_status():
        """Get current security configuration status"""
        try:
            security_service = get_security_service()
            client_ip = security_service._get_client_ip()
            
            # Get rate limiting status
            rate_limit = security_service.check_rate_limit(client_ip, 'auth')
            
            from ..config import Config
            
            return jsonify({
                'success': True,
                'security_status': {
                    'recaptcha_enabled': Config.RECAPTCHA['ENABLED'],
                    'recaptcha_site_key': Config.RECAPTCHA['SITE_KEY'],
                    'rate_limiting_enabled': Config.RATE_LIMITING['ENABLED'],
                    'rate_limit_status': rate_limit,
                    'client_ip': client_ip,
                    'security_features': {
                        'rate_limiting': Config.RATE_LIMITING['ENABLED'],
                        'login_attempt_protection': True,
                        'captcha_protection': Config.RECAPTCHA['ENABLED'],
                        'jwt_verification': True
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Security status error: {e}")
            return jsonify({
                'error': 'Security status failed',
                'message': 'An error occurred while retrieving security status'
            }), 500
    
    # Error handlers for the auth blueprint
    @auth_bp.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request could not be understood'
        }), 400
    
    @auth_bp.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication is required'
        }), 401
    
    @auth_bp.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource'
        }), 403
    
    @auth_bp.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'error': 'Rate Limit Exceeded',
            'message': 'Too many requests. Please try again later.'
        }), 429
    
    @auth_bp.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500
    
    return auth_bp 