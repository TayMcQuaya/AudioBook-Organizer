# Email Verification Setup to Prevent Credit Abuse

## The Problem
Currently, users can register with fake emails and immediately get 100 credits, allowing abuse through multiple accounts.

## Solution 1: Enable Email Confirmation (Recommended)

### Step 1: Configure Supabase
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Enable "Confirm email" 
3. Configure email templates for verification

### Step 2: Update Frontend to Handle Unverified Users
The app should check if email is verified before allowing access:

```javascript
// In auth.js handleAuthSuccess method
if (session.user && !session.user.email_confirmed_at) {
    // Redirect to email verification page
    showInfo('Please check your email to verify your account');
    return;
}
```

### Step 3: Defer Credits Until Verification
Modify the database trigger to only give credits after email verification:

```sql
-- Modified handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Always create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Only give credits if email is confirmed OR if it's OAuth
    IF NEW.email_confirmed_at IS NOT NULL OR 
       NEW.raw_app_meta_data->>'provider' = 'google' THEN
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (NEW.id, 100);
    END IF;
    
    RETURN NEW;
END;
$$;
```

## Solution 2: Additional Anti-Abuse Measures

### 1. Rate Limiting by IP
- Limit signups per IP address per hour
- Already partially implemented in your security_service

### 2. Email Domain Validation
- Block disposable email services
- Maintain a blacklist of known temporary email domains

### 3. Phone Verification (Premium)
- Require phone number for high-value actions
- More difficult to fake than email

### 4. Behavioral Analysis
- Track usage patterns
- Flag accounts that immediately use all credits
- Require human verification for suspicious activity

## Solution 3: Business Model Adjustments

### 1. Trial Credits Instead of Free Credits
- Give 10-20 credits for testing
- Require payment for meaningful usage

### 2. Time-Limited Credits
- Credits expire after 7-30 days
- Prevents accumulation through multiple accounts

### 3. Progressive Verification
- Basic features with unverified email
- Require verification for credit usage
- Require payment method for full access

## Recommended Implementation

1. **Immediate**: Enable email confirmation in Supabase
2. **Short-term**: Modify trigger to defer credits until verification
3. **Medium-term**: Add disposable email detection
4. **Long-term**: Implement usage analytics and fraud detection

## Google OAuth is Already Secure
Note: Google OAuth users are already verified by Google, so they can receive credits immediately. The issue is only with email/password signups.