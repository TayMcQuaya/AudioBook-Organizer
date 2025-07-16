-- =====================================================
-- MANUAL CREDIT FIX SCRIPT
-- Use this to manually add credits for your friend
-- =====================================================

-- STEP 1: First find your friend's user ID
-- Replace with their actual email
SELECT 
    id as user_id, 
    email 
FROM auth.users 
WHERE email = 'your-friends-email@example.com';  -- CHANGE THIS!

-- STEP 2: Copy the user_id from above and paste it below
-- This simulates a successful Starter Pack purchase (250 credits for $4.99)

-- Set the user ID here
DO $$
DECLARE
    target_user_id UUID := 'PASTE-USER-ID-HERE';  -- CHANGE THIS!
    credits_to_add INTEGER := 250;  -- Starter pack
    package_type TEXT := 'starter';
BEGIN
    -- Add transaction record
    INSERT INTO credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        payment_method,
        status,
        metadata,
        stripe_session_id,
        stripe_payment_intent_id
    ) VALUES (
        target_user_id,
        'purchase',
        credits_to_add,
        'stripe',
        'completed',
        jsonb_build_object(
            'package_type', package_type,
            'amount_cents', 499,
            'currency', 'USD',
            'manual_fix', true,
            'reason', 'Manual credit addition for missing webhook'
        ),
        'manual_fix_' || gen_random_uuid()::text,
        'manual_fix_' || gen_random_uuid()::text
    );
    
    -- Update or insert credits
    INSERT INTO user_credits (user_id, credits)
    VALUES (target_user_id, credits_to_add)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        credits = user_credits.credits + EXCLUDED.credits,
        last_updated = NOW();
    
    -- Log in usage_logs for profile history
    INSERT INTO usage_logs (
        user_id,
        action,
        credits_used,
        metadata
    ) VALUES (
        target_user_id,
        'credit_purchase',
        credits_to_add,
        jsonb_build_object(
            'package_type', package_type,
            'amount_cents', 499,
            'currency', 'USD',
            'transaction_type', 'purchase',
            'manual_fix', true
        )
    );
    
    RAISE NOTICE 'Successfully added % credits to user %', credits_to_add, target_user_id;
END $$;

-- STEP 3: Verify the credits were added
-- Replace with the actual user_id
SELECT 
    uc.user_id,
    u.email,
    uc.credits as current_credits,
    uc.last_updated
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE uc.user_id = 'PASTE-USER-ID-HERE';  -- CHANGE THIS!