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
    
    def send_contact_form_confirmation(self, user_email: str, user_name: str) -> Dict[str, Any]:
        """
        Send confirmation email to user who submitted contact form
        
        Args:
            user_email: User's email address
            user_name: User's name
            
        Returns:
            Dict with success status and message
        """
        subject = "Thank you for contacting AudioBook Organizer"
        
        body = f"""
Dear {user_name},

Thank you for contacting AudioBook Organizer! We have received your message and will get back to you as soon as possible.

If your inquiry is urgent, please don't hesitate to reach out to us directly at {self.contact_email}.

Best regards,
The AudioBook Organizer Team

---
This is an automated confirmation email. Please do not reply to this message.
        """.strip()
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">Thank you for contacting AudioBook Organizer!</h2>
                
                <p>Dear {user_name},</p>
                
                <p>Thank you for contacting AudioBook Organizer! We have received your message and will get back to you as soon as possible.</p>
                
                <p>If your inquiry is urgent, please don't hesitate to reach out to us directly at <a href="mailto:{self.contact_email}">{self.contact_email}</a>.</p>
                
                <p>Best regards,<br>
                The AudioBook Organizer Team</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated confirmation email. Please do not reply to this message.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, body, html_body)
    
    def send_account_deletion_confirmation(self, user_email: str, user_name: str) -> Dict[str, Any]:
        """
        Send account deletion confirmation email
        
        Args:
            user_email: User's email address
            user_name: User's name
            
        Returns:
            Dict with success status and message
        """
        subject = "AudioBook Organizer - Account Deletion Confirmation"
        
        body = f"""
Dear {user_name},

Your AudioBook Organizer account has been successfully deleted.

All your data has been permanently removed from our systems, including:
- Your profile information
- All uploaded files and projects
- Credit history and transactions
- Audio files stored on our servers

If you deleted your account by mistake or have any questions, please contact us at {self.contact_email} within 30 days.

Thank you for using AudioBook Organizer.

Best regards,
The AudioBook Organizer Team

---
This is an automated notification. Please do not reply to this message.
        """.strip()
        
        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #e74c3c;">Account Deletion Confirmation</h2>
                
                <p>Dear {user_name},</p>
                
                <p>Your AudioBook Organizer account has been <strong>successfully deleted</strong>.</p>
                
                <div style="background-color: #f8f9fa; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">All your data has been permanently removed:</h3>
                    <ul>
                        <li>Your profile information</li>
                        <li>All uploaded files and projects</li>
                        <li>Credit history and transactions</li>
                        <li>Audio files stored on our servers</li>
                    </ul>
                </div>
                
                <p>If you deleted your account by mistake or have any questions, please contact us at <a href="mailto:{self.contact_email}">{self.contact_email}</a> within 30 days.</p>
                
                <p>Thank you for using AudioBook Organizer.</p>
                
                <p>Best regards,<br>
                The AudioBook Organizer Team</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated notification. Please do not reply to this message.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(user_email, subject, body, html_body)

# Global email service instance
_email_service = None

def get_email_service() -> EmailService:
    """Get or create email service instance"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service