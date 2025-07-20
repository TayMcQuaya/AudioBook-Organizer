"""
Contact Routes - Handle contact form submissions
"""

from flask import Blueprint, request, jsonify
import logging
from backend.services.email_service import get_email_service
from backend.services.security_service import get_security_service
from backend.utils.validation import validate_email

logger = logging.getLogger(__name__)

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('/api/contact', methods=['POST'])
def submit_contact_form():
    """Handle contact form submissions"""
    try:
        # Get security service for rate limiting
        security_service = get_security_service()
        
        # Rate limiting check (5 submissions per hour)
        client_ip = security_service._get_client_ip()
        rate_limit_result = security_service.check_rate_limit(
            client_ip, 
            'contact'  # Use standard rate limit type
        )
        
        if not rate_limit_result['allowed']:
            return jsonify({
                'error': 'Please wait',
                'message': 'We\'re experiencing high demand. Please wait a few minutes before sending another message.'
            }), 429
        
        # Record the attempt
        security_service.record_attempt(client_ip, 'contact')
        
        # Get form data
        data = request.get_json()
        if not data:
            return jsonify({
                'error': 'Invalid request',
                'message': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'email', 'subject', 'message']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return jsonify({
                'error': 'Information needed',
                'message': f'Please fill in all required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({
                'error': 'Email format',
                'message': 'Please check your email address and try again'
            }), 400
        
        # Validate field lengths
        if len(data['name']) > 100:
            return jsonify({
                'error': 'Name too long',
                'message': 'Please use a shorter name (under 100 characters)'
            }), 400
        
        if len(data['subject']) > 200:
            return jsonify({
                'error': 'Subject too long',
                'message': 'Please use a shorter subject line (under 200 characters)'
            }), 400
            
        if len(data['message']) > 2000:
            return jsonify({
                'error': 'Message too long',
                'message': 'Please shorten your message to under 2000 characters'
            }), 400
        
        # Check for spam patterns (basic check)
        spam_keywords = ['viagra', 'casino', 'lottery', 'winner', 'click here', 'urgent']
        message_lower = data['message'].lower()
        if any(keyword in message_lower for keyword in spam_keywords):
            logger.warning(f"Potential spam contact form submission from {request.remote_addr}")
            return jsonify({
                'error': 'Message not sent',
                'message': 'Your message couldn\'t be processed. Please rephrase and try again, or email us directly at support@audiobookorganizer.com'
            }), 400
        
        # Get email service
        email_service = get_email_service()
        
        if not email_service.is_configured():
            logger.error("Email service not configured for contact form")
            return jsonify({
                'error': 'Service temporarily busy',
                'message': 'Our messaging system is currently busy. Please try again in a few moments or email us directly at support@audiobookorganizer.com'
            }), 503
        
        # Send notification email to admin
        notification_result = email_service.send_contact_form_notification(data)
        
        # Send confirmation email to user (optional - don't fail if this fails)
        confirmation_result = email_service.send_contact_form_confirmation(
            data['email'], 
            data['name'],
            data  # Pass the full form data for template
        )
        
        if notification_result['success']:
            logger.info(f"Contact form submission successful from {data['email']}")
            
            # Return success even if confirmation email failed
            response_data = {
                'success': True,
                'message': 'Thank you for your message! We\'ll get back to you soon.'
            }
            
            if not confirmation_result['success']:
                logger.warning(f"Failed to send confirmation email: {confirmation_result.get('error')}")
                # Don't expose internal error to user
            
            return jsonify(response_data), 200
        else:
            logger.error(f"Failed to send contact form notification: {notification_result.get('error')}")
            return jsonify({
                'error': 'Temporary issue',
                'message': 'We\'re having a temporary issue processing messages. Please try again in a moment or reach us at support@audiobookorganizer.com'
            }), 500
    
    except Exception as e:
        logger.error(f"Contact form submission error: {e}")
        return jsonify({
            'error': 'Service busy',
            'message': 'Our servers are currently busy. Please wait a moment and try again, or contact us at support@audiobookorganizer.com'
        }), 500

@contact_bp.route('/api/contact/test', methods=['GET'])
def test_contact_service():
    """Test endpoint to check if contact service is working"""
    try:
        email_service = get_email_service()
        
        return jsonify({
            'email_service_configured': email_service.is_configured(),
            'smtp_server': email_service.smtp_server if email_service.is_configured() else 'Not configured',
            'from_email': email_service.from_email if email_service.is_configured() else 'Not configured',
            'contact_email': email_service.contact_email if email_service.is_configured() else 'Not configured'
        }), 200
        
    except Exception as e:
        logger.error(f"Contact service test error: {e}")
        return jsonify({
            'error': 'Test failed',
            'message': str(e)
        }), 500