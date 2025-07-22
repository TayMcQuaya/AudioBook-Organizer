"""
Email Service - Gmail SMTP Integration
Handles all email functionality for AudioBook Organizer
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
import time
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailService:
    """Gmail SMTP email service for transactional emails"""
    
    def __init__(self):
        """Initialize email service with Gmail SMTP configuration"""
        self.enabled = os.environ.get('SMTP_ENABLED', 'false').lower() in ['true', '1', 'yes']
        self.smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.environ.get('SMTP_PORT', 587))
        self.username = os.environ.get('SMTP_USERNAME')
        self.password = os.environ.get('SMTP_PASSWORD')
        self.from_email = os.environ.get('SMTP_FROM_EMAIL', self.username)
        self.contact_email = os.environ.get('CONTACT_EMAIL', self.username)
        
        # Rate limiting (basic protection)
        self._last_sent = {}
        self._rate_limit_seconds = 60  # 1 email per minute per recipient
        
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        if not self.enabled:
            return False
            
        required_fields = [self.username, self.password]
        configured = all(field for field in required_fields)
        
        if not configured:
            logger.warning("📧 Email service not fully configured - missing credentials")
        
        return configured
    
    def _check_rate_limit(self, recipient: str) -> bool:
        """Basic rate limiting to prevent spam"""
        now = time.time()
        last_sent = self._last_sent.get(recipient, 0)
        
        if now - last_sent < self._rate_limit_seconds:
            logger.warning(f"📧 Rate limit: Too soon to send another email to {recipient}")
            return False
            
        return True
    
    def _update_rate_limit(self, recipient: str):
        """Update rate limit tracking"""
        self._last_sent[recipient] = time.time()
    
    def _replace_template_variables(self, template_content: str) -> str:
        """
        Replace template variables with actual values from environment variables
        
        Args:
            template_content: The template content to process
            
        Returns:
            Template content with variables replaced
        """
        from ..config import Config
        
        # Replace email addresses
        template_content = template_content.replace('help@audiobookorganizer.com', Config.CONTACT_FROM_EMAIL)
        template_content = template_content.replace('support@audiobookorganizer.com', Config.CONTACT_FROM_EMAIL)
        
        return template_content
    
    def send_email(self, to_email: str, subject: str, body: str, html_body: Optional[str] = None) -> Dict[str, Any]:
        """
        Send an email using Gmail SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Plain text body
            html_body: Optional HTML body
            
        Returns:
            Dict with success status and message
        """
        try:
            if not self.is_configured():
                return {
                    'success': False,
                    'error': 'Email service not configured'
                }
            
            # Rate limiting check
            if not self._check_rate_limit(to_email):
                return {
                    'success': False,
                    'error': 'Rate limit exceeded. Please wait before sending another email.'
                }
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Add plain text part
            text_part = MIMEText(body, 'plain')
            msg.attach(text_part)
            
            # Add HTML part if provided
            if html_body:
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
            
            # Update rate limiting
            self._update_rate_limit(to_email)
            
            logger.info(f"📧 Email sent successfully to {to_email}")
            return {
                'success': True,
                'message': 'Email sent successfully'
            }
            
        except Exception as e:
            logger.error(f"📧 Failed to send email to {to_email}: {e}")
            return {
                'success': False,
                'error': f'Failed to send email: {str(e)}'
            }
    
    def send_contact_form_notification(self, form_data: Dict[str, str]) -> Dict[str, Any]:
        """
        Send contact form notification to admin
        
        Args:
            form_data: Dict with name, email, subject, message
            
        Returns:
            Dict with success status and message
        """
        subject = f"New Contact Form Submission: {form_data.get('subject', 'No Subject')}"
        
        body = f"""
New contact form submission from AudioBook Organizer:

Name: {form_data.get('name', 'Not provided')}
Email: {form_data.get('email', 'Not provided')}
Subject: {form_data.get('subject', 'Not provided')}

Message:
{form_data.get('message', 'No message provided')}

---
Sent from AudioBook Organizer Contact Form
        """.strip()
        
        html_body = f"""
        <html>
        <body>
            <h2>New Contact Form Submission</h2>
            <p><strong>From:</strong> AudioBook Organizer</p>
            
            <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Name:</strong></td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{form_data.get('name', 'Not provided')}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Email:</strong></td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{form_data.get('email', 'Not provided')}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;"><strong>Subject:</strong></td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{form_data.get('subject', 'Not provided')}</td>
                </tr>
            </table>
            
            <h3>Message:</h3>
            <div style="border: 1px solid #ddd; padding: 15px; background-color: #f9f9f9; white-space: pre-wrap;">{form_data.get('message', 'No message provided')}</div>
            
            <hr>
            <p style="color: #666; font-size: 12px;">Sent from AudioBook Organizer Contact Form</p>
        </body>
        </html>
        """
        
        return self.send_email(self.contact_email, subject, body, html_body)
    
    def send_contact_form_confirmation(self, user_email: str, user_name: str, form_data: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Send confirmation email to user who submitted contact form using the beautiful template
        
        Args:
            user_email: User's email address
            user_name: User's name
            form_data: Optional form data for additional context
            
        Returns:
            Dict with success status and message
        """
        template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                                   'email_templates_supabase', 'auto_respond.html')
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Replace template variables with environment variables first
            html_template = self._replace_template_variables(html_template)
            
            # Replace template variables
            timestamp = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')
            
            html_body = html_template.replace('{{name}}', user_name)
            html_body = html_body.replace('{{email}}', user_email)
            if form_data:
                html_body = html_body.replace('{{subject}}', form_data.get('subject', 'General Inquiry'))
            else:
                html_body = html_body.replace('{{subject}}', 'General Inquiry')
            html_body = html_body.replace('{{timestamp}}', timestamp)
            
            subject = "We Received Your Message - AudioBook Organizer"
            
            body = f"""
Dear {user_name},

We have successfully received your message and want to thank you for reaching out to AudioBook Organizer.

What happens next?
- Our support team will review your message carefully
- We'll respond within 24-48 hours on business days
- You'll receive a detailed response from our team

Business Hours: Monday - Friday, 9:00 AM - 6:00 PM (EST)
Response Time: 24-48 hours on business days

Thank you for choosing AudioBook Organizer!

© 2025 AudioBook Organizer. All rights reserved.
This is an automated confirmation message.
            """.strip()
            
            return self.send_email(user_email, subject, body, html_body)
            
        except Exception as e:
            logger.error(f"📧 Failed to load auto-response template: {e}")
            # Fallback to simple version
            return self.send_email(user_email, 
                                 "Thank you for contacting AudioBook Organizer",
                                 f"Dear {user_name}, Thank you for contacting us! We'll get back to you soon.",
                                 None)
    
    def send_account_deletion_confirmation(self, user_email: str, user_name: str) -> Dict[str, Any]:
        """
        Send account deletion confirmation email using the styled template
        
        Args:
            user_email: User's email address
            user_name: User's name
            
        Returns:
            Dict with success status and message
        """
        template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                                   'email_templates_supabase', 'account_deletion.html')
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Replace template variables with actual values
            html_template = self._replace_template_variables(html_template)
            
            # Get contact email for text body
            from ..config import Config
            contact_email = Config.CONTACT_FROM_EMAIL
            
            subject = "Account Deletion Confirmation - AudioBook Organizer"
            
            body = f"""
Dear Valued User,

This email confirms that your AudioBook Organizer account has been successfully deleted as requested.

What has been deleted:
- Your account information and profile
- All uploaded books and documents
- Audio files and narrations
- Usage history and preferences
- Remaining credits (if any)

What happens next:
- All your data has been permanently removed from our servers
- You will no longer receive emails from AudioBook Organizer
- Any active subscriptions have been cancelled
- This action cannot be undone

If you deleted your account by mistake or have any questions, please contact our support team immediately at {contact_email}.

Thank you for using AudioBook Organizer.

© 2025 AudioBook Organizer. All rights reserved.
            """.strip()
            
            return self.send_email(user_email, subject, body, html_template)
            
        except Exception as e:
            logger.error(f"📧 Failed to load account deletion template: {e}")
            # Fallback to simple version
            return self.send_email(user_email, 
                                 "Account Deletion Confirmation - AudioBook Organizer",
                                 "Your AudioBook Organizer account has been successfully deleted. All your data has been permanently removed from our systems.",
                                 None)
    
    def send_starter_purchase_confirmation(self, user_email: str, user_name: str, 
                                          transaction_id: str, purchase_date: str,
                                          payment_method: str) -> Dict[str, Any]:
        """Send Starter Pack purchase confirmation email"""
        template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                                   'email_templates_supabase', 'starter_purchase.html')
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Replace template variables with environment variables first
            html_template = self._replace_template_variables(html_template)
            
            # Replace template variables
            html_body = html_template.replace('{{customer_name}}', user_name)
            html_body = html_body.replace('{{customer_email}}', user_email)
            html_body = html_body.replace('{{transaction_id}}', transaction_id)
            html_body = html_body.replace('{{purchase_date}}', purchase_date)
            html_body = html_body.replace('{{payment_method}}', payment_method)
            
            subject = "Starter Pack Purchase Confirmed - AudioBook Organizer"
            
            body = f"""
Dear {user_name},

Your Starter Pack purchase has been successfully processed!

Purchase Details:
- Package: Starter Pack
- Credits Added: 500 Credits
- Amount Paid: $4.99
- Transaction ID: {transaction_id}
- Date: {purchase_date}

Your credits have been automatically added to your account.

Thank you for choosing AudioBook Organizer!

Best regards,
The AudioBook Organizer Team
            """.strip()
            
            return self.send_email(user_email, subject, body, html_body)
            
        except Exception as e:
            logger.error(f"📧 Failed to send starter purchase email: {e}")
            return self.send_email(user_email, 
                                 "Purchase Confirmation - AudioBook Organizer",
                                 f"Thank you for your Starter Pack purchase! Your 500 credits have been added to your account.",
                                 None)
    
    def send_creator_purchase_confirmation(self, user_email: str, user_name: str, 
                                         transaction_id: str, purchase_date: str,
                                         payment_method: str) -> Dict[str, Any]:
        """Send Creator Pack purchase confirmation email"""
        template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                                   'email_templates_supabase', 'creator_purchase.html')
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Replace template variables with environment variables first
            html_template = self._replace_template_variables(html_template)
            
            # Replace template variables
            html_body = html_template.replace('{{customer_name}}', user_name)
            html_body = html_body.replace('{{customer_email}}', user_email)
            html_body = html_body.replace('{{transaction_id}}', transaction_id)
            html_body = html_body.replace('{{purchase_date}}', purchase_date)
            html_body = html_body.replace('{{payment_method}}', payment_method)
            
            subject = "Creator Pack Purchase Confirmed - AudioBook Organizer"
            
            body = f"""
Dear {user_name},

Your Creator Pack purchase has been successfully processed!

Purchase Details:
- Package: Creator Pack (Most Popular)
- Credits Added: 5,000 Credits
- Amount Paid: $19.99
- Transaction ID: {transaction_id}
- Date: {purchase_date}

Your credits have been automatically added to your account.

Thank you for choosing AudioBook Organizer!

Best regards,
The AudioBook Organizer Team
            """.strip()
            
            return self.send_email(user_email, subject, body, html_body)
            
        except Exception as e:
            logger.error(f"📧 Failed to send creator purchase email: {e}")
            return self.send_email(user_email, 
                                 "Purchase Confirmation - AudioBook Organizer",
                                 f"Thank you for your Creator Pack purchase! Your 5,000 credits have been added to your account.",
                                 None)
    
    def send_professional_purchase_confirmation(self, user_email: str, user_name: str, 
                                              transaction_id: str, purchase_date: str,
                                              payment_method: str) -> Dict[str, Any]:
        """Send Professional Pack purchase confirmation email"""
        template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                                   'email_templates_supabase', 'professional_purchase.html')
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                html_template = f.read()
            
            # Replace template variables with environment variables first
            html_template = self._replace_template_variables(html_template)
            
            # Replace template variables
            html_body = html_template.replace('{{customer_name}}', user_name)
            html_body = html_body.replace('{{customer_email}}', user_email)
            html_body = html_body.replace('{{transaction_id}}', transaction_id)
            html_body = html_body.replace('{{purchase_date}}', purchase_date)
            html_body = html_body.replace('{{payment_method}}', payment_method)
            
            subject = "Professional Pack Purchase Confirmed - AudioBook Organizer"
            
            body = f"""
Dear {user_name},

Your Professional Pack purchase has been successfully processed!

Purchase Details:
- Package: Professional Pack (Best Value)
- Credits Added: 25,000 Credits
- Amount Paid: $49.99
- Transaction ID: {transaction_id}
- Date: {purchase_date}

Your credits have been automatically added to your account.

Thank you for choosing AudioBook Organizer!

Best regards,
The AudioBook Organizer Team
            """.strip()
            
            return self.send_email(user_email, subject, body, html_body)
            
        except Exception as e:
            logger.error(f"📧 Failed to send professional purchase email: {e}")
            return self.send_email(user_email, 
                                 "Purchase Confirmation - AudioBook Organizer",
                                 f"Thank you for your Professional Pack purchase! Your 25,000 credits have been added to your account.",
                                 None)

# Global email service instance
_email_service = None

def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service