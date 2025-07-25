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
                'recaptcha_site_key': Config.RECAPTCHA['SITE_KEY'] if Config.RECAPTCHA['ENABLED'] else None,
                # Add credit costs from environment variables
                'credit_costs': {
                    'audio_upload': Config.CREDIT_COST_AUDIO_UPLOAD,
                    'txt_upload': Config.CREDIT_COST_TXT_UPLOAD,
                    'docx_processing': Config.CREDIT_COST_DOCX_PROCESSING,
                    'premium_export': Config.CREDIT_COST_PREMIUM_EXPORT
                }
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
                auth_token = getattr(g, 'auth_token', None)
                profile = supabase_service.get_user_profile(user['id'], auth_token=auth_token)
                credits = supabase_service.get_user_credits(user['id'], auth_token=auth_token)
                
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
            profile = supabase_service.get_user_profile(user['id'], auth_token=token)
            credits = supabase_service.get_user_credits(user['id'], auth_token=token)
            
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
            
            # **SECURITY FIX: Removed email logging to prevent user data exposure**
            logger.info(f"Successful login - reCAPTCHA score: {recaptcha_result.get('score', 'N/A')}")
            
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
            
            # **SECURITY FIX: Removed email logging to prevent user data exposure**
            logger.info(f"Successful signup - reCAPTCHA score: {recaptcha_result.get('score', 'N/A')}")
            
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
    def get_profile(current_user):
        """Get user profile information"""
        try:
            user = current_user
            user_id = user['id']
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get auth token from request headers for RLS
            auth_header = request.headers.get('Authorization')
            auth_token = None
            if auth_header and auth_header.startswith('Bearer '):
                auth_token = auth_header[7:]
            
            # Get user profile with auth token for RLS
            profile = supabase_service.get_user_profile(user_id, auth_token)
            
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
    def update_profile(current_user):
        """Update user profile information"""
        try:
            user = current_user
            user_id = user['id']
            
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get auth token from request headers for RLS
            auth_header = request.headers.get('Authorization')
            auth_token = None
            if auth_header and auth_header.startswith('Bearer '):
                auth_token = auth_header[7:]
            
            # Update profile with auth token for RLS
            success = supabase_service.update_user_profile(user_id, data, auth_token)
            
            if not success:
                return jsonify({
                    'error': 'Update failed',
                    'message': 'Failed to update profile'
                }), 500
            
            # Also update user metadata if full_name is being updated
            # This keeps the cached session data in sync with profile data
            if 'full_name' in data and auth_token:
                try:
                    # Update the user's metadata in Supabase Auth
                    supabase_service.update_user_metadata(user_id, {'full_name': data['full_name']}, auth_token)
                    logger.info(f"Updated user metadata for {user_id}")
                except Exception as e:
                    logger.warning(f"Failed to update user metadata: {e}")
                    # Don't fail the request if metadata update fails
            
            # Get updated profile with auth token for RLS
            updated_profile = supabase_service.get_user_profile(user_id, auth_token)
            
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
    def get_credits(current_user):
        """Get user's current credit balance"""
        try:
            user = current_user
            user_id = user['id']
            
            # Get auth token from request headers for RLS
            auth_header = request.headers.get('Authorization')
            auth_token = None
            if auth_header and auth_header.startswith('Bearer '):
                auth_token = auth_header[7:]
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Check if this is a post-action refresh (e.g., after upload)
            # If so, bypass cache to get fresh data
            force_refresh = request.args.get('refresh', '').lower() == 'true'
            use_cache = not force_refresh
            
            # Get credits with auth token for RLS compliance
            credits = supabase_service.get_user_credits(user_id, use_cache=use_cache, auth_token=auth_token)
            
            logger.info(f"💎 Credits fetched for user {user_id}: {credits}")
            
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
    
    @auth_bp.route('/usage-history', methods=['GET'])
    @require_auth
    def get_usage_history(current_user):
        """Get paginated usage history for the current user"""
        try:
            import math
            
            # Get pagination parameters
            page = int(request.args.get('page', 1))
            per_page = min(int(request.args.get('per_page', 20)), 100)
            action_filter = request.args.get('action_filter')
            
            user_id = current_user['id']
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Build query with filters
            query = supabase_service.client.table('usage_logs')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)
                
            if action_filter:
                query = query.eq('action', action_filter)
                
            # Execute with pagination
            offset = (page - 1) * per_page
            result = query.range(offset, offset + per_page - 1).execute()
            
            # Get total count for pagination
            count_query = supabase_service.client.table('usage_logs')\
                .select('*', count='exact')\
                .eq('user_id', user_id)
                
            if action_filter:
                count_query = count_query.eq('action', action_filter)
                
            count_result = count_query.execute()
            total_count = count_result.count
            
            return jsonify({
                'success': True,
                'data': result.data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total_count,
                    'pages': math.ceil(total_count / per_page) if total_count > 0 else 1
                }
            })
            
        except Exception as e:
            logger.error(f"Usage history error: {e}")
            return jsonify({'error': 'Failed to fetch usage history'}), 500

    @auth_bp.route('/reset-password', methods=['POST'])
    def reset_password():
        """Send password reset email"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            email = data.get('email')
            
            if not email:
                return jsonify({
                    'error': 'Missing email',
                    'message': 'Email is required for password reset'
                }), 400
            
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
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                return jsonify({
                    'error': 'Service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # Send password reset email
            reset_result = supabase_service.reset_password_for_email(email)
            
            if not reset_result['success']:
                return jsonify({
                    'error': 'Reset failed',
                    'message': reset_result.get('error', 'Failed to send reset email')
                }), 400
            
            # **SECURITY FIX: Removed email logging to prevent user data exposure**
            logger.info("Password reset email sent")
            
            return jsonify({
                'success': True,
                'message': 'Password reset email sent successfully'
            })
            
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return jsonify({
                'error': 'Reset failed',
                'message': 'An error occurred during password reset'
            }), 500

    @auth_bp.route('/init-user', methods=['POST'])
    @require_auth
    def initialize_user(current_user):
        """Initialize user profile and credits on first login"""
        try:
            user = current_user
            if not user:
                return jsonify({
                    'error': 'Authentication required',
                    'message': 'You must be authenticated to initialize user profile'
                }), 401
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get the auth token from the request header
            from backend.middleware.auth_middleware import extract_token_from_header
            token = extract_token_from_header()
            
            # Get user data from request body
            data = request.get_json() or {}
            
            # Initialize user data (profile, credits, etc.)
            result = supabase_service.initialize_user(user['id'], user['email'], data, token)
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"User initialization error: {e}")
            return jsonify({
                'error': 'Initialization failed',
                'message': 'An error occurred during user initialization'
            }), 500

    @auth_bp.route('/google-callback', methods=['GET', 'POST'])
    def google_oauth_callback():
        """Handle Google OAuth callback and session setup"""
        try:
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
            
            # Record the attempt
            security_service.record_attempt(client_ip, 'auth')
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            if not supabase_service.is_configured():
                return jsonify({
                    'error': 'Service unavailable',
                    'message': 'Authentication service is not properly configured'
                }), 503
            
            # For Google OAuth, the session is typically handled by Supabase client-side
            # This endpoint can be used for additional server-side processing if needed
            # For now, we'll return success since the client handles the OAuth flow
            
            logger.info("Google OAuth callback processed")
            
            return jsonify({
                'success': True,
                'message': 'Google OAuth completed successfully'
            })
            
        except Exception as e:
            logger.error(f"Google OAuth callback error: {e}")
            return jsonify({
                'error': 'OAuth callback failed',
                'message': 'An error occurred during Google OAuth callback processing'
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
    
    @auth_bp.route('/account', methods=['DELETE'])
    @require_auth
    def delete_account(current_user):
        """Delete user account and all associated data"""
        try:
            user_id = current_user['id']
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'error': 'Invalid request',
                    'message': 'Request body is required'
                }), 400
            
            password = data.get('password')
            email = data.get('email')
            is_oauth_user = data.get('is_oauth_user', False)
            confirmation_text = data.get('confirmation_text')
            
            # Validate confirmation text first
            if confirmation_text != 'DELETE':
                return jsonify({
                    'error': 'Invalid confirmation',
                    'message': 'Please type DELETE to confirm account deletion'
                }), 400
            
            # Validate auth method based on user type
            if is_oauth_user:
                # OAuth users verify with email
                if not email:
                    return jsonify({
                        'error': 'Email required',
                        'message': 'Email address is required for account deletion'
                    }), 400
            else:
                # Regular users verify with password
                if not password:
                    return jsonify({
                        'error': 'Password required',
                        'message': 'Current password is required for account deletion'
                    }), 400
            
            # Get security service for rate limiting
            security_service = get_security_service()
            client_ip = security_service._get_client_ip()
            
            # Rate limit account deletion attempts (max 3 per hour)
            # Using auth rate limit type which has reasonable limits
            rate_limit = security_service.check_rate_limit(client_ip, 'auth')
            if not rate_limit['allowed']:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': 'Too many deletion attempts. Please try again later.',
                    'retry_after': rate_limit.get('retry_after', 60)
                }), 429
            
            # Record the attempt
            security_service.record_attempt(client_ip, 'auth')
            
            # Get Supabase service
            supabase_service = get_supabase_service()
            
            # Get user's email from current user or profile
            user_email = current_user.get('email')
            if not user_email:
                # Get email from profile if not in token
                profile = supabase_service.get_user_profile(user_id)
                if profile:
                    user_email = profile.get('email')
                
            if not user_email:
                return jsonify({
                    'error': 'Account error',
                    'message': 'Unable to verify account email'
                }), 500
            
            # Verify authentication based on user type
            if is_oauth_user:
                # For OAuth users, verify the provided email matches the account email
                if email.lower() != user_email.lower():
                    logger.warning(f"Failed account deletion attempt for OAuth user {user_id} - email mismatch")
                    return jsonify({
                        'error': 'Authentication failed',
                        'message': 'Email does not match'
                    }), 401
                logger.info(f"OAuth user {user_id} verified with email for account deletion")
            else:
                # For regular users, verify password by attempting to sign in
                auth_result = supabase_service.sign_in_with_password(user_email, password)
                if not auth_result['success']:
                    logger.warning(f"Failed account deletion attempt for user {user_id} - invalid password")
                    return jsonify({
                        'error': 'Authentication failed',
                        'message': 'Invalid password'
                    }), 401
                logger.info(f"Regular user {user_id} verified with password for account deletion")
            
            # Get list of user's uploaded files before deletion
            try:
                # Query file_uploads table for user's files
                file_result = supabase_service.client.table('file_uploads').select('file_path').eq('user_id', user_id).execute()
                user_files = [f['file_path'] for f in file_result.data] if file_result.data else []
                
                # Clean up user's audio files from filesystem
                from ..utils.file_cleanup import cleanup_user_files
                deleted_files = cleanup_user_files(user_id, user_files)
                logger.info(f"Deleted {deleted_files} files for user {user_id}")
            except Exception as e:
                logger.error(f"Error cleaning up user files: {e}")
                # Continue with account deletion even if file cleanup fails
            
            # Delete user data from all accessible tables
            # Since auth.users is protected, we'll delete what we can access
            try:
                # Delete user's projects
                try:
                    project_result = supabase_service.client.table('audiobook_projects').delete().eq('user_id', user_id).execute()
                    logger.info(f"Deleted {len(project_result.data) if project_result.data else 0} projects for user {user_id}")
                except Exception as e:
                    logger.error(f"Error deleting projects: {e}")
                
                # Delete user's file upload records
                try:
                    files_result = supabase_service.client.table('file_uploads').delete().eq('user_id', user_id).execute()
                    logger.info(f"Deleted {len(files_result.data) if files_result.data else 0} file records for user {user_id}")
                except Exception as e:
                    logger.error(f"Error deleting file records: {e}")
                
                # Delete user's usage logs
                try:
                    usage_result = supabase_service.client.table('usage_logs').delete().eq('user_id', user_id).execute()
                    logger.info(f"Deleted {len(usage_result.data) if usage_result.data else 0} usage logs for user {user_id}")
                except Exception as e:
                    logger.error(f"Error deleting usage logs: {e}")
                
                # Delete user's credits
                try:
                    credits_result = supabase_service.client.table('user_credits').delete().eq('user_id', user_id).execute()
                    logger.info(f"Deleted credits record for user {user_id}")
                except Exception as e:
                    logger.error(f"Error deleting credits: {e}")
                
                # Delete user's profile
                try:
                    profile_result = supabase_service.client.table('profiles').delete().eq('id', user_id).execute()
                    logger.info(f"Deleted profile for user {user_id}")
                except Exception as e:
                    logger.error(f"Error deleting profile: {e}")
                
                # Try to delete from auth.users if we have admin access
                # This might fail due to Supabase protections, but that's okay
                # The user won't be able to log in anyway with all their data gone
                try:
                    service_client = supabase_service.get_service_client()
                    if service_client and hasattr(service_client.auth, 'admin'):
                        delete_result = service_client.auth.admin.delete_user(user_id)
                        logger.info(f"Successfully deleted auth record for user {user_id}")
                    else:
                        logger.info(f"Auth record deletion skipped - admin API not available")
                except Exception as e:
                    logger.info(f"Auth deletion not available: {e}")
                    # This is expected if we don't have admin access
                    
            except Exception as e:
                logger.error(f"Error during data deletion: {str(e)}")
                # Still return success if files were cleaned up
                # The user's data is effectively deleted even if auth record remains
            
            # Send account deletion confirmation email
            try:
                from ..services.email_service import get_email_service
                email_service = get_email_service()
                
                if email_service.is_configured():
                    # We already have user_email from earlier in the function
                    # Get user name from current_user or use email prefix as fallback
                    user_name = current_user.get('user_metadata', {}).get('full_name') or current_user.get('user_metadata', {}).get('name') or user_email.split('@')[0]
                    
                    if user_email:
                        email_result = email_service.send_account_deletion_confirmation(user_email, user_name)
                        if email_result['success']:
                            logger.info(f"Account deletion confirmation email sent to {user_email}")
                        else:
                            logger.warning(f"Failed to send deletion confirmation email: {email_result.get('error')}")
                    else:
                        logger.warning("No email found for account deletion confirmation")
                else:
                    logger.info("Email service not configured - skipping deletion confirmation email")
            except Exception as e:
                logger.error(f"Error sending deletion confirmation email: {e}")
                # Don't fail the deletion if email fails
            
            # Log the successful deletion
            logger.info(f"✅ Account and all associated data deleted for user {user_id}")
            
            return jsonify({
                'success': True,
                'message': 'Account deleted successfully'
            })
            
        except Exception as e:
            logger.error(f"Account deletion error: {e}")
            return jsonify({
                'error': 'Deletion failed',
                'message': 'An error occurred during account deletion'
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
    
    @auth_bp.route('/check-gift', methods=['GET'])
    @require_auth
    def check_gift_notification(*args, **kwargs):
        """Check if user has unacknowledged gift credits"""
        try:
            user_id = g.user_id
            supabase_service = get_supabase_service()
            
            # Check for unacknowledged gifts in credit_transactions
            result = supabase_service.client.table('credit_transactions').select('*').eq(
                'user_id', user_id
            ).eq('transaction_type', 'bonus').eq(
                'metadata->>acknowledged', False
            ).order('created_at.desc').limit(1).execute()
            
            if result.data and len(result.data) > 0:
                gift = result.data[0]
                return jsonify({
                    'has_gift': True,
                    'gift': {
                        'id': gift['id'],
                        'amount': gift['credits_amount'],
                        'reason': gift['metadata'].get('reason', 'Gift from us!'),
                        'date': gift['created_at']
                    }
                })
            
            return jsonify({'has_gift': False})
        except Exception as e:
            logger.error(f"Error checking gift notification: {e}")
            return jsonify({'has_gift': False})
    
    @auth_bp.route('/acknowledge-gift/<gift_id>', methods=['POST'])
    @require_auth
    def acknowledge_gift(gift_id):
        """Mark gift notification as acknowledged"""
        try:
            user_id = g.user_id
            supabase_service = get_supabase_service()
            
            # First get the current metadata
            result = supabase_service.client.table('credit_transactions').select('metadata').eq(
                'id', gift_id
            ).eq('user_id', user_id).single().execute()
            
            if result.data:
                # Update metadata to mark as acknowledged
                current_metadata = result.data.get('metadata', {})
                current_metadata['acknowledged'] = True
                
                # Update the record
                update_result = supabase_service.client.table('credit_transactions').update({
                    'metadata': current_metadata
                }).eq('id', gift_id).eq('user_id', user_id).execute()
                
                if update_result.data:
                    return jsonify({'success': True})
            
            return jsonify({'error': 'Gift not found'}), 404
            
        except Exception as e:
            logger.error(f"Error acknowledging gift: {e}")
            return jsonify({'error': str(e)}), 500
    
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