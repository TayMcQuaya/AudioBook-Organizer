# Email Service Implementation Documentation

This document details the complete email service implementation for AudioBook Organizer, including all code changes, setup requirements, and email types.

## Overview

AudioBook Organizer uses two separate email systems:
1. **Supabase Auth** - Handles authentication emails (signup confirmation, password reset)
2. **Backend Email Service (Gmail SMTP)** - Handles transactional emails (purchase confirmations, account deletion)

## Email Types Sent

### Via Supabase Auth:
- **Signup Confirmation** - When new users register
- **Password Reset** - When users request password reset

### Via Backend Email Service:
- **Purchase Confirmations** - After successful Stripe payments
  - Starter Pack ($4.99)
  - Creator Pack ($19.99)  
  - Professional Pack ($49.99)
- **Contact Form Notifications** - When users submit contact form
- **Contact Form Auto-Reply** - Confirmation to user who submitted form
- **Account Deletion Confirmation** - When users delete their account

## Code Changes Made

### 1. Email Service Enhancement (`backend/services/email_service.py`)

**Added purchase confirmation methods:**
```python
def send_starter_purchase_confirmation(self, user_email: str, user_name: str, 
                                      transaction_id: str, purchase_date: str,
                                      payment_method: str) -> Dict[str, Any]:
    """Send Starter Pack purchase confirmation email"""
    template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                               'email_templates_supabase', 'starter_purchase.html')
    # Loads HTML template, replaces variables, sends email

def send_creator_purchase_confirmation(self, user_email: str, user_name: str, 
                                     transaction_id: str, purchase_date: str,
                                     payment_method: str) -> Dict[str, Any]:
    """Send Creator Pack purchase confirmation email"""
    # Similar implementation

def send_professional_purchase_confirmation(self, user_email: str, user_name: str, 
                                          transaction_id: str, purchase_date: str,
                                          payment_method: str) -> Dict[str, Any]:
    """Send Professional Pack purchase confirmation email"""
    # Similar implementation
```

**Updated account deletion to use HTML template:**
```python
def send_account_deletion_confirmation(self, user_email: str, user_name: str) -> Dict[str, Any]:
    """Send account deletion confirmation email using the styled template"""
    template_path = os.path.join(os.path.dirname(__file__), '..', '..', 
                               'email_templates_supabase', 'account_deletion.html')
    # Now uses the beautiful HTML template instead of plain text
```

### 2. Stripe Webhook Integration (`backend/services/stripe_service.py`)

**Added import:**
```python
from ..services.email_service import get_email_service
```

**Added email sending after successful payment (in `process_payment_success` method):**
```python
# Send purchase confirmation email
try:
    # Get user details for email
    user_result = supabase.auth.admin.get_user_by_id(user_id)
    if user_result and user_result.user:
        user_email = user_result.user.email
        
        # Get display name from profiles table
        profile_result = supabase.table('profiles').select('full_name').eq('id', user_id).execute()
        if profile_result.data and profile_result.data[0].get('full_name'):
            user_name = profile_result.data[0]['full_name']
        else:
            # Fallback to user metadata or email prefix
            user_name = (user_result.user.user_metadata.get('full_name') or 
                       user_result.user.user_metadata.get('name') or 
                       user_email.split('@')[0])
        
        # Get transaction details
        transaction_id = session.get('payment_intent', session_id)
        purchase_date = datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')
        payment_method = 'Credit Card'
        
        # Send appropriate email based on package type
        email_service = get_email_service()
        if email_service.is_configured():
            if package_type == 'starter':
                email_service.send_starter_purchase_confirmation(
                    user_email, user_name, transaction_id, 
                    purchase_date, payment_method
                )
            elif package_type == 'creator':
                email_service.send_creator_purchase_confirmation(
                    user_email, user_name, transaction_id,
                    purchase_date, payment_method
                )
            elif package_type == 'professional':
                email_service.send_professional_purchase_confirmation(
                    user_email, user_name, transaction_id,
                    purchase_date, payment_method
                )
            logger.info(f"Purchase confirmation email sent to {user_email}")
        else:
            logger.warning("Email service not configured, skipping purchase confirmation email")
            
except Exception as email_error:
    # Log email error but don't fail the payment
    logger.error(f"Failed to send purchase confirmation email: {email_error}")
    # Continue - payment was successful even if email failed
```

### 3. Account Deletion Email Fix (`backend/routes/auth_routes.py`)

**Fixed email sending in delete_account method:**
```python
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
```

### 4. Email Template Updates

**Added Stripe receipt notice to all purchase templates:**
- `email_templates_supabase/starter_purchase.html`
- `email_templates_supabase/creator_purchase.html`
- `email_templates_supabase/professional_purchase.html`

Added this HTML block before the footer:
```html
<div style="margin:20px 0 0 0; padding:15px; background-color:#e3f2fd; border-radius:8px; border-left:4px solid #2196f3;">
    <p style="margin:0; color:#1976d2; font-size:13px; line-height:1.5;">
        <strong>📧 Note:</strong> You will receive a separate payment receipt from Stripe to this email address shortly.
    </p>
</div>
```

## Setup Requirements

### 1. Gmail App Password
1. Enable 2-Step Verification on your Gmail account
2. Go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an app password for "Mail"
4. Copy the 16-character password (ignore spaces)

### 2. Environment Variables (.env)
```bash
# Email Service Configuration
SMTP_ENABLED=true
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-app-password-no-spaces
SMTP_FROM_EMAIL=your-gmail@gmail.com
CONTACT_EMAIL=your-gmail@gmail.com
```

### 3. Supabase Dashboard Configuration (for auth emails)
1. Go to Supabase Dashboard → Settings → Auth
2. Scroll to "SMTP Settings"
3. Enable "Custom SMTP"
4. Enter:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your Gmail address
   - Password: Your Gmail App Password
   - Sender email: Your Gmail address
   - Sender name: AudioBook Organizer

### 4. Dependencies
Ensure these are installed (already in requirements.txt):
- `python-dotenv` - For loading .env file
- `email` (built-in Python module)
- `smtplib` (built-in Python module)

## Testing

### Test Purchase Emails:
1. Set `SMTP_ENABLED=true` in .env
2. Configure Gmail credentials
3. Restart Flask server
4. Make a test purchase
5. Check for email with transaction details

### Test Account Deletion Email:
1. Delete a test account from profile settings
2. Check for deletion confirmation email

### Debug Tips:
- Check Flask console for:
  - "📧 Email service not configured" - Means env vars not loaded
  - "📧 Purchase confirmation email sent to..." - Success
  - Error messages with details
- Add debug prints to check env vars:
  ```python
  import os
  print(f"SMTP_ENABLED: {os.environ.get('SMTP_ENABLED')}")
  print(f"SMTP_USERNAME: {os.environ.get('SMTP_USERNAME')}")
  ```

## Gmail Limitations

- **100 emails/day** via SMTP for free accounts
- **20 emails/hour** recommended to avoid suspension
- Cannot change FROM address (always shows authenticated Gmail account)
- 1-24 hour suspension if limits exceeded

## Production Deployment

1. Add same environment variables to hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Heroku: Config Vars
   - AWS: Parameter Store

2. No code changes needed between local and production

3. Consider switching to professional email service when scaling:
   - SendGrid: 100 emails/day free
   - Mailgun: 5,000 emails/month free
   - Amazon SES: $0.10 per 1,000 emails

## Troubleshooting

### Email not sending:
1. Check `SMTP_ENABLED=true` in environment
2. Verify Flask loaded .env file (check for `load_dotenv()` in app.py/config.py)
3. Ensure Gmail App Password is correct (16 chars, no spaces)
4. Check Flask console for error messages

### Wrong display name in emails:
- Display name is fetched from profiles table `full_name` field
- Falls back to user metadata or email prefix if not found

### Gmail shows wrong FROM address:
- Gmail always shows the authenticated account
- Cannot be changed with free Gmail
- Use professional email service for custom FROM address