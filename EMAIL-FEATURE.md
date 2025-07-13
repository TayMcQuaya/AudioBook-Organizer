 📧 Email System Clarification

  How emails work in your app:

  1. Signup/Password Reset → Handled by Supabase (FREE)
    - Supabase sends these automatically
    - Configure in Supabase Dashboard → Authentication → Email Templates
    - No code needed, just enable in Supabase settings
  2. Contact Form & Account Deletion → Your custom Gmail SMTP
    - Uses your email_service.py
    - Requires Gmail setup (100 emails/day free)
    - Currently NOT configured
  3. Payment Confirmation → NOT IMPLEMENTED
    - You'd need to add this to stripe_routes.py
    - Would use your Gmail SMTP