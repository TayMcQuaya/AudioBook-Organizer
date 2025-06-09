"""
Security Service - CAPTCHA verification and rate limiting
Handles security measures for the AudioBook application
"""

import os
import logging
import requests
import time
from typing import Dict, Optional, Any
from collections import defaultdict, deque
from flask import request

from ..config import Config

logger = logging.getLogger(__name__)

class SecurityService:
    """Service for handling security measures like CAPTCHA and rate limiting"""
    
    def __init__(self):
        """Initialize security service"""
        self.rate_limit_storage = defaultdict(deque)
        self.login_attempts = defaultdict(deque)
        
    def verify_recaptcha(self, recaptcha_token: str, action: str = None) -> Dict[str, Any]:
        """
        Verify Google reCAPTCHA token
        
        Args:
            recaptcha_token: The reCAPTCHA token from frontend
            action: The action name for reCAPTCHA v3 (optional)
            
        Returns:
            Dict containing verification results
        """
        if not Config.RECAPTCHA['ENABLED']:
            logger.info("reCAPTCHA is disabled, skipping verification")
            return {'success': True, 'score': 1.0, 'action': action}
        
        if not Config.RECAPTCHA['SECRET_KEY']:
            logger.error("reCAPTCHA secret key not configured")
            return {'success': False, 'error': 'reCAPTCHA not configured'}
        
        if not recaptcha_token:
            logger.warning("No reCAPTCHA token provided")
            return {'success': False, 'error': 'reCAPTCHA token required'}
        
        try:
            # Prepare verification request
            verify_data = {
                'secret': Config.RECAPTCHA['SECRET_KEY'],
                'response': recaptcha_token,
                'remoteip': self._get_client_ip()
            }
            
            # Send verification request to Google
            response = requests.post(
                Config.RECAPTCHA['VERIFY_URL'],
                data=verify_data,
                timeout=10
            )
            
            if response.status_code != 200:
                logger.error(f"reCAPTCHA API returned status {response.status_code}")
                return {'success': False, 'error': 'reCAPTCHA verification failed'}
            
            result = response.json()
            
            # Check if verification was successful
            if not result.get('success', False):
                error_codes = result.get('error-codes', [])
                logger.warning(f"reCAPTCHA verification failed: {error_codes}")
                return {
                    'success': False, 
                    'error': 'reCAPTCHA verification failed',
                    'error_codes': error_codes
                }
            
            # For reCAPTCHA v3, check the score
            score = result.get('score', 0.0)
            threshold = Config.RECAPTCHA['THRESHOLD']
            
            if score < threshold:
                logger.warning(f"reCAPTCHA score too low: {score} < {threshold}")
                return {
                    'success': False,
                    'error': 'Suspicious activity detected',
                    'score': score,
                    'threshold': threshold
                }
            
            # Verify action if provided (reCAPTCHA v3)
            if action and result.get('action') != action:
                logger.warning(f"reCAPTCHA action mismatch: expected {action}, got {result.get('action')}")
                return {
                    'success': False,
                    'error': 'Action verification failed'
                }
            
            logger.info(f"✅ reCAPTCHA verification successful - Score: {score}")
            return {
                'success': True,
                'score': score,
                'action': result.get('action'),
                'challenge_ts': result.get('challenge_ts'),
                'hostname': result.get('hostname')
            }
            
        except requests.RequestException as e:
            logger.error(f"Error communicating with reCAPTCHA API: {e}")
            return {'success': False, 'error': 'reCAPTCHA service unavailable'}
        except Exception as e:
            logger.error(f"Unexpected error during reCAPTCHA verification: {e}")
            return {'success': False, 'error': 'reCAPTCHA verification error'}
    
    def check_rate_limit(self, identifier: str, limit_type: str = 'auth') -> Dict[str, Any]:
        """
        Check if request exceeds rate limits
        
        Args:
            identifier: IP address or user identifier
            limit_type: Type of rate limit ('auth', 'api', etc.)
            
        Returns:
            Dict containing rate limit status
        """
        if not Config.RATE_LIMITING['ENABLED']:
            return {'allowed': True, 'remaining': 999}
        
        current_time = time.time()
        
        if limit_type == 'auth':
            # Auth-specific rate limiting
            per_minute_limit = Config.RATE_LIMITING['AUTH_ATTEMPTS_PER_MINUTE']
            per_hour_limit = Config.RATE_LIMITING['AUTH_ATTEMPTS_PER_HOUR']
            
            # Clean old entries and count recent attempts
            minute_key = f"{identifier}:auth:minute"
            hour_key = f"{identifier}:auth:hour"
            
            minute_attempts = self._clean_and_count(minute_key, current_time, 60)
            hour_attempts = self._clean_and_count(hour_key, current_time, 3600)
            
            if minute_attempts >= per_minute_limit:
                return {
                    'allowed': False,
                    'reason': 'Too many attempts per minute',
                    'retry_after': 60,
                    'minute_attempts': minute_attempts,
                    'hour_attempts': hour_attempts
                }
            
            if hour_attempts >= per_hour_limit:
                return {
                    'allowed': False,
                    'reason': 'Too many attempts per hour',
                    'retry_after': 3600,
                    'minute_attempts': minute_attempts,
                    'hour_attempts': hour_attempts
                }
            
            return {
                'allowed': True,
                'remaining_minute': per_minute_limit - minute_attempts,
                'remaining_hour': per_hour_limit - hour_attempts,
                'minute_attempts': minute_attempts,
                'hour_attempts': hour_attempts
            }
        
        return {'allowed': True, 'remaining': 999}
    
    def record_attempt(self, identifier: str, limit_type: str = 'auth') -> None:
        """Record an attempt for rate limiting"""
        if not Config.RATE_LIMITING['ENABLED']:
            return
        
        current_time = time.time()
        
        if limit_type == 'auth':
            minute_key = f"{identifier}:auth:minute"
            hour_key = f"{identifier}:auth:hour"
            
            self.rate_limit_storage[minute_key].append(current_time)
            self.rate_limit_storage[hour_key].append(current_time)
    
    def check_login_attempts(self, identifier: str) -> Dict[str, Any]:
        """
        Check failed login attempts for an identifier
        
        Args:
            identifier: IP address or email
            
        Returns:
            Dict containing login attempt status
        """
        current_time = time.time()
        max_attempts = Config.SECURITY['MAX_LOGIN_ATTEMPTS']
        window = Config.SECURITY['LOGIN_ATTEMPT_WINDOW']
        
        # Clean old attempts
        attempts = self.login_attempts[identifier]
        while attempts and current_time - attempts[0] > window:
            attempts.popleft()
        
        failed_attempts = len(attempts)
        
        if failed_attempts >= max_attempts:
            oldest_attempt = attempts[0] if attempts else current_time
            time_remaining = int(window - (current_time - oldest_attempt))
            
            return {
                'allowed': False,
                'failed_attempts': failed_attempts,
                'max_attempts': max_attempts,
                'time_remaining': time_remaining,
                'reason': f'Too many failed login attempts. Try again in {time_remaining} seconds.'
            }
        
        return {
            'allowed': True,
            'failed_attempts': failed_attempts,
            'max_attempts': max_attempts,
            'remaining_attempts': max_attempts - failed_attempts
        }
    
    def record_failed_login(self, identifier: str) -> None:
        """Record a failed login attempt"""
        current_time = time.time()
        self.login_attempts[identifier].append(current_time)
        logger.warning(f"Failed login attempt recorded for {identifier}")
    
    def clear_login_attempts(self, identifier: str) -> None:
        """Clear failed login attempts for successful login"""
        if identifier in self.login_attempts:
            self.login_attempts[identifier].clear()
            logger.info(f"Login attempts cleared for {identifier}")
    
    def _clean_and_count(self, key: str, current_time: float, window: int) -> int:
        """Clean old entries and return count of recent attempts"""
        attempts = self.rate_limit_storage[key]
        
        # Remove old entries
        while attempts and current_time - attempts[0] > window:
            attempts.popleft()
        
        return len(attempts)
    
    def _get_client_ip(self) -> str:
        """Get client IP address from request"""
        # Check for forwarded IP (behind proxy/load balancer)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fall back to remote address
        return request.remote_addr or 'unknown'

# Global security service instance
_security_service = None

def get_security_service() -> SecurityService:
    """Get the global security service instance"""
    global _security_service
    if _security_service is None:
        _security_service = SecurityService()
    return _security_service

def init_security_service() -> SecurityService:
    """Initialize the security service"""
    global _security_service
    _security_service = SecurityService()
    logger.info("✅ Security service initialized")
    return _security_service 