# Gmail Email Setup Guide for AudioBook Organizer

This guide explains how to set up Gmail for sending automated emails in AudioBook Organizer.

## Overview

AudioBook Organizer uses two separate email systems:
1. **Supabase Auth** - Handles signup confirmation and password reset emails
2. **Backend Email Service** - Handles purchase confirmations and other transactional emails

## Part 1: Supabase Auth Emails (Signup & Password Reset)

### Option A: Use Supabase Default SMTP (Easiest)
- No configuration needed
- Emails sent from Supabase's domain
- Limited customization

### Option B: Configure Gmail in Supabase Dashboard
1. Go to your Supabase Dashboard
2. Navigate to **Settings → Auth**
3. Scroll to **SMTP Settings**
4. Enable "Custom SMTP"
5. Enter these settings:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **Username**: Your Gmail address (e.g., `support@yourdomain.com`)
   - **Password**: Your Gmail App Password (see below how to get it)
   - **Sender email**: Your Gmail address
   - **Sender name**: AudioBook Organizer
6. Click **Save**

### Configure Rate Limits (IMPORTANT!)
Even with custom SMTP, Supabase enforces rate limits. Configure them properly:

1. Go to **Authentication → Rate Limits** in Supabase Dashboard
2. Adjust these settings:
   - **Rate limit for sending emails**: Set to **10-20** (default is only 2!)
   - **Rate limit for sending SMS messages**: Keep at **30** (if not using SMS)
   - **Rate limit for sign ups**: Keep at **30** (reasonable default)
   - **Rate limit for token refreshes**: Keep at **150** or higher
   - **Other limits**: Keep default values
3. Click **Save changes**

**Why this matters:**
- Default email limit is only **2 emails per hour**
- This causes "email rate limit exceeded" errors
- With 10-20, you can handle normal development/testing
- Production sites may need higher limits

## Part 2: Backend Email Service (Purchase Confirmations)

### Configure Environment Variables
Add these to your `.env` file (or production environment):

```bash
# Enable email service
SMTP_ENABLED=true

# Gmail SMTP settings
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
CONTACT_EMAIL=your-email@gmail.com
```

## Getting a Gmail App Password

Gmail requires an "App Password" for SMTP authentication:

1. **Enable 2-Step Verification** (Required)
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Click on "2-Step Verification"
   - Follow the setup process

2. **Generate App Password**
   - Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" as the app
   - Select your device (or "Other" and name it "AudioBook Organizer")
   - Click **Generate**
   - Copy the 16-character password (spaces don't matter)
   - Use this password in your configuration

## What Emails Are Sent

### Via Supabase (Auth Emails):
- **Signup Confirmation** - When new users register
- **Password Reset** - When users request password reset

### Via Backend Service (Transactional Emails):
- **Purchase Confirmations** - After successful Stripe payments
  - Starter Pack ($4.99)
  - Creator Pack ($19.99)
  - Professional Pack ($49.99)
- **Contact Form Notifications** - When users submit contact form
- **Account Deletion Confirmations** - When users delete their account

## Testing Your Setup

### Test Backend Email Service:
```python
# Quick test script
from backend.services.email_service import get_email_service

email_service = get_email_service()
if email_service.is_configured():
    result = email_service.send_email(
        "test@example.com",
        "Test Email",
        "This is a test email from AudioBook Organizer"
    )
    print(result)
else:
    print("Email service not configured")
```

### Test Supabase Auth Emails:
1. Try signing up with a new email
2. Request a password reset
3. Check if emails are received

## Production Deployment Notes

### For Production:
1. **DO NOT** commit `.env` files with credentials
2. Set environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Heroku: Config Vars
   - AWS: Parameter Store or Secrets Manager

3. **Email Templates Location**:
   - Auth templates: Upload to Supabase Dashboard
   - Purchase templates: `/email_templates_supabase/` directory

### Security Best Practices:
- Use a dedicated Gmail account for the service
- Enable 2-factor authentication
- Regularly rotate app passwords
- Monitor for unusual activity
- Set up SPF/DKIM records if using custom domain

## Troubleshooting

### Common Issues:

1. **"Invalid credentials"**
   - Verify app password is correct
   - Ensure 2-Step Verification is enabled
   - Check if less secure app access is needed

2. **"Connection refused"**
   - Check firewall settings
   - Verify SMTP port (587 for TLS)
   - Ensure SMTP_ENABLED=true

3. **"Email rate limit exceeded"** (Supabase Auth)
   - Check Supabase Dashboard → Authentication → Rate Limits
   - Increase "Rate limit for sending emails" from default 2 to 10-20
   - Wait 1 hour for rate limit to reset
   - Use different email addresses for testing

4. **Emails going to spam**
   - Add SPF records to your domain
   - Use a professional email address
   - Avoid spam trigger words

5. **Rate limiting**
   - Supabase: Configurable in dashboard (default 2/hour, increase to 10-20)
   - Gmail SMTP: 100 emails/day via SMTP, 500/day via web
   - Backend has built-in rate limiting (1 email/minute per recipient)

## Alternative Email Services

If Gmail doesn't meet your needs, consider:
- **SendGrid** - 100 emails/day free
- **Mailgun** - 5,000 emails/month free
- **Amazon SES** - $0.10 per 1,000 emails
- **Postmark** - 100 emails/month free

Each requires updating the SMTP settings in both Supabase and backend configuration.