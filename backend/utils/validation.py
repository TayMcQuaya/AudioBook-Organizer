"""
Input Validation Utilities
Provides secure input validation functions
"""

import re
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

def validate_package_type(package_type: str) -> bool:
    """Validate credit package type against whitelist"""
    allowed_packages = ['starter', 'creator', 'professional']
    return package_type in allowed_packages

def validate_string_input(value: Any, max_length: int = 255, allow_empty: bool = False) -> str:
    """Validate and sanitize string input"""
    if value is None:
        if allow_empty:
            return ""
        raise ValidationError("Value cannot be None")
    
    if not isinstance(value, str):
        raise ValidationError("Value must be a string")
    
    # Remove null bytes and control characters except common whitespace
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
    
    if not allow_empty and not sanitized.strip():
        raise ValidationError("Value cannot be empty")
    
    if len(sanitized) > max_length:
        raise ValidationError(f"Value exceeds maximum length of {max_length}")
    
    return sanitized.strip()

def validate_url(url: str) -> bool:
    """Validate URL format"""
    if not isinstance(url, str) or len(url) > 500:
        return False
        
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(url) is not None

def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """Sanitize metadata dictionary"""
    if not isinstance(metadata, dict):
        return {}
    
    sanitized = {}
    for key, value in metadata.items():
        if isinstance(key, str) and len(key) <= 50:
            # Sanitize key - only allow alphanumeric, underscore, and hyphen
            clean_key = re.sub(r'[^a-zA-Z0-9_-]', '', key)
            if clean_key:
                # Sanitize value based on type
                if isinstance(value, str):
                    try:
                        clean_value = validate_string_input(value, 1000, True)
                        sanitized[clean_key] = clean_value
                    except ValidationError:
                        # Skip invalid string values
                        continue
                elif isinstance(value, (int, float, bool)):
                    sanitized[clean_key] = value
                # Skip other types for security
    
    return sanitized

def validate_session_id(session_id: str) -> bool:
    """Validate Stripe session ID format"""
    if not isinstance(session_id, str):
        return False
    
    # Stripe session IDs have specific format: cs_test_* or cs_live_*
    pattern = re.compile(r'^cs_(test|live)_[a-zA-Z0-9]{24,}$')
    return bool(pattern.match(session_id))

def validate_email(email: str) -> bool:
    """Basic email validation"""
    if not isinstance(email, str) or len(email) > 254:
        return False
    
    email_pattern = re.compile(
        r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    )
    return bool(email_pattern.match(email))

def sanitize_log_string(value: str, max_length: int = 200) -> str:
    """Sanitize string for safe logging (removes potential sensitive data)"""
    if not isinstance(value, str):
        return str(value)[:max_length]
    
    # Remove potential sensitive patterns
    sanitized = value
    
    # Remove potential tokens/keys
    sensitive_patterns = [
        r'sk_[a-zA-Z0-9_]+',
        r'pk_[a-zA-Z0-9_]+', 
        r'whsec_[a-zA-Z0-9_]+',
        r'cs_(test|live)_[a-zA-Z0-9]+',
        r'eyJ[a-zA-Z0-9_\-\.]+',  # JWT tokens
        r'Bearer\s+[a-zA-Z0-9_\-\.]+',
    ]
    
    for pattern in sensitive_patterns:
        sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
    
    return sanitized[:max_length] 