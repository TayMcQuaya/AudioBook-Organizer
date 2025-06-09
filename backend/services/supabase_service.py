"""
Supabase Service - Authentication and Database Operations
Handles all Supabase interactions for the AudioBook Organizer
"""

import os
import logging
from typing import Dict, Optional, Any, List
from supabase import create_client, Client
from jose import jwt, JWTError
import datetime

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for Supabase authentication and database operations"""
    
    def __init__(self, supabase_url: str, supabase_key: str, jwt_secret: str):
        """Initialize Supabase client"""
        self.url = supabase_url
        self.key = supabase_key
        self.jwt_secret = jwt_secret
        self.client: Client = None
        
        if supabase_url and supabase_key:
            try:
                # Try simple initialization first (most compatible)
                self.client = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase client initialized successfully")
            except Exception as e:
                error_msg = str(e)
                if 'proxy' in error_msg.lower():
                    # This is a known compatibility issue, but auth might still work
                    logger.warning(f"⚠️ Supabase proxy compatibility issue (auth may still work): {e}")
                    self.client = None
                else:
                    logger.error(f"❌ Failed to initialize Supabase client: {e}")
                    self.client = None
        else:
            logger.warning("⚠️ Supabase configuration not found - auth features will be disabled")
    
    def is_configured(self) -> bool:
        """Check if Supabase is properly configured"""
        return self.client is not None
    
    # Authentication Methods
    
    def sign_in_with_password(self, email: str, password: str) -> Dict[str, Any]:
        """Sign in user with email and password using Supabase Auth"""
        if not self.client:
            return {
                'success': False,
                'error': 'Supabase client not configured'
            }
        
        try:
            # Use Supabase auth client to sign in
            result = self.client.auth.sign_in_with_password({
                'email': email,
                'password': password
            })
            
            if result.user and result.session:
                logger.info(f"✅ User signed in successfully: {email}")
                return {
                    'success': True,
                    'user': result.user.model_dump() if hasattr(result.user, 'model_dump') else result.user,
                    'session': result.session.model_dump() if hasattr(result.session, 'model_dump') else result.session
                }
            else:
                return {
                    'success': False,
                    'error': 'Invalid credentials'
                }
                
        except Exception as e:
            logger.error(f"❌ Sign in error: {e}")
            error_message = str(e)
            if 'invalid_grant' in error_message.lower():
                error_message = 'Invalid email or password'
            elif 'email_not_confirmed' in error_message.lower():
                error_message = 'Please check your email and confirm your account'
            return {
                'success': False,
                'error': error_message
            }
    
    def sign_up_with_password(self, email: str, password: str, user_metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Sign up user with email and password using Supabase Auth"""
        if not self.client:
            return {
                'success': False,
                'error': 'Supabase client not configured'
            }
        
        try:
            # Prepare signup data
            signup_data = {
                'email': email,
                'password': password,
                'options': {
                    'data': user_metadata or {}
                }
            }
            
            # Use Supabase auth client to sign up
            result = self.client.auth.sign_up(signup_data)
            
            if result.user:
                logger.info(f"✅ User signed up successfully: {email}")
                return {
                    'success': True,
                    'user': result.user.model_dump() if hasattr(result.user, 'model_dump') else result.user,
                    'session': result.session.model_dump() if hasattr(result.session, 'model_dump') else result.session if result.session else None
                }
            else:
                return {
                    'success': False,
                    'error': 'Registration failed'
                }
                
        except Exception as e:
            logger.error(f"❌ Sign up error: {e}")
            error_message = str(e)
            if 'email_address_invalid' in error_message.lower():
                error_message = 'Please enter a valid email address'
            elif 'weak_password' in error_message.lower():
                error_message = 'Password is too weak. Please choose a stronger password'
            elif 'email_already_exists' in error_message.lower():
                error_message = 'An account with this email already exists'
            return {
                'success': False,
                'error': error_message
            }
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token from Supabase"""
        if not self.jwt_secret:
            logger.error("JWT secret not configured")
            return None
            
        if not token:
            logger.warning("No token provided for verification")
            return None
            
        # Validate token format before attempting to decode
        if not isinstance(token, str):
            logger.warning(f"Token is not a string: {type(token)}")
            return None
            
        # Check if token has the expected JWT format (3 parts separated by dots)
        token_parts = token.split('.')
        if len(token_parts) != 3:
            logger.warning(f"JWT verification failed: Invalid token format - expected 3 parts, got {len(token_parts)} parts")
            return None
            
        try:
            # Decode the token using Supabase JWT secret
            payload = jwt.decode(
                token, 
                self.jwt_secret, 
                algorithms=['HS256'],
                audience='authenticated'
            )
            
            # Check if token is expired
            exp = payload.get('exp')
            if exp and datetime.datetime.utcnow().timestamp() > exp:
                logger.warning("Token has expired")
                return None
                
            logger.debug(f"JWT token verified successfully for user: {payload.get('email', 'unknown')}")
            return payload
            
        except JWTError as e:
            error_msg = str(e).lower()
            if 'not enough segments' in error_msg:
                logger.warning(f"JWT verification failed: Invalid token format - {e}")
            elif 'expired' in error_msg:
                logger.warning(f"JWT verification failed: Token expired - {e}")
            elif 'signature' in error_msg:
                logger.warning(f"JWT verification failed: Invalid signature - {e}")
            else:
                logger.error(f"JWT verification failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during token verification: {e}")
            return None
    
    def get_user_from_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Extract user information from JWT token"""
        payload = self.verify_jwt_token(token)
        if not payload:
            return None
            
        return {
            'id': payload.get('sub'),
            'email': payload.get('email'),
            'role': payload.get('role', 'authenticated'),
            'app_metadata': payload.get('app_metadata', {}),
            'user_metadata': payload.get('user_metadata', {})
        }
    
    # User Profile Methods
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile from profiles table"""
        if not self.client:
            return None
            
        try:
            result = self.client.table('profiles').select('*').eq('id', user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return None
    
    def create_user_profile(self, user_id: str, email: str, user_data: Dict[str, Any] = None) -> bool:
        """Create a new user profile"""
        if not self.client:
            return False
            
        try:
            profile_data = {
                'id': user_id,
                'email': email,
                'created_at': datetime.datetime.utcnow().isoformat(),
                'updated_at': datetime.datetime.utcnow().isoformat()
            }
            
            if user_data:
                profile_data.update({
                    'full_name': user_data.get('full_name'),
                    'username': user_data.get('username'),
                    'avatar_url': user_data.get('avatar_url')
                })
            
            result = self.client.table('profiles').insert(profile_data).execute()
            
            if result.data:
                logger.info(f"✅ User profile created for {email}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            return False
    
    def update_user_profile(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update user profile"""
        if not self.client:
            return False
            
        try:
            updates['updated_at'] = datetime.datetime.utcnow().isoformat()
            
            result = self.client.table('profiles').update(updates).eq('id', user_id).execute()
            
            if result.data:
                logger.info(f"✅ User profile updated for {user_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating user profile: {e}")
            return False
    
    # Credits System Methods
    
    def get_user_credits(self, user_id: str) -> int:
        """Get user's current credit balance"""
        if not self.client:
            return 0
            
        try:
            result = self.client.table('user_credits').select('credits').eq('user_id', user_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]['credits']
            return 0
            
        except Exception as e:
            logger.error(f"Error fetching user credits: {e}")
            return 0
    
    def initialize_user_credits(self, user_id: str, initial_credits: int = 100) -> bool:
        """Initialize credits for a new user"""
        if not self.client:
            return False
            
        try:
            credits_data = {
                'user_id': user_id,
                'credits': initial_credits,
                'last_updated': datetime.datetime.utcnow().isoformat()
            }
            
            result = self.client.table('user_credits').insert(credits_data).execute()
            
            if result.data:
                logger.info(f"✅ Credits initialized for user {user_id}: {initial_credits}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error initializing user credits: {e}")
            return False
    
    def update_user_credits(self, user_id: str, credit_change: int) -> bool:
        """Update user credits (positive to add, negative to subtract)"""
        if not self.client:
            return False
            
        try:
            # Get current credits
            current_credits = self.get_user_credits(user_id)
            new_credits = max(0, current_credits + credit_change)  # Prevent negative credits
            
            result = self.client.table('user_credits').update({
                'credits': new_credits,
                'last_updated': datetime.datetime.utcnow().isoformat()
            }).eq('user_id', user_id).execute()
            
            if result.data:
                logger.info(f"✅ Credits updated for user {user_id}: {current_credits} → {new_credits}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error updating user credits: {e}")
            return False
    
    def log_usage(self, user_id: str, action: str, credits_used: int = 0, metadata: Dict[str, Any] = None) -> bool:
        """Log user action for analytics and billing"""
        if not self.client:
            return False
            
        try:
            usage_data = {
                'user_id': user_id,
                'action': action,
                'credits_used': credits_used,
                'metadata': metadata or {},
                'created_at': datetime.datetime.utcnow().isoformat()
            }
            
            result = self.client.table('usage_logs').insert(usage_data).execute()
            
            if result.data:
                logger.info(f"✅ Usage logged for user {user_id}: {action} ({credits_used} credits)")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error logging usage: {e}")
            return False

# Global Supabase service instance
_supabase_service: Optional[SupabaseService] = None

def get_supabase_service() -> SupabaseService:
    """Get the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        from ..config import config
        app_config = config['default']()
        _supabase_service = SupabaseService(
            app_config.SUPABASE_URL,
            app_config.SUPABASE_KEY,
            app_config.SUPABASE_JWT_SECRET
        )
    return _supabase_service

def init_supabase_service(supabase_url: str, supabase_key: str, jwt_secret: str) -> SupabaseService:
    """Initialize the global Supabase service instance with custom configuration"""
    global _supabase_service
    _supabase_service = SupabaseService(supabase_url, supabase_key, jwt_secret)
    return _supabase_service 