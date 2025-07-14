-- AudioBook Organizer - Gift Credits to All Users
-- This script adds bonus credits to all existing users
-- Run this script in your Supabase SQL editor to gift credits

-- ============================================
-- CONFIGURATION: Modify these values as needed
-- ============================================
DO $$
DECLARE
    gift_amount INTEGER := 50; -- Change this to desired credit amount
    gift_reason TEXT := 'Holiday gift from AudioBook Organizer team! 🎁';
    gift_batch_id TEXT := 'holiday_2025_01'; -- Unique ID for this gift batch
BEGIN
    -- Ensure we don't accidentally run the same gift twice
    IF EXISTS (
        SELECT 1 FROM public.credit_transactions 
        WHERE metadata->>'gift_batch' = gift_batch_id 
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'Gift batch % has already been processed!', gift_batch_id;
    END IF;

    -- Step 1: Update all user credit balances
    UPDATE public.user_credits
    SET 
        credits = credits + gift_amount,
        last_updated = NOW()
    WHERE user_id IN (
        SELECT id FROM auth.users WHERE deleted_at IS NULL
    );

    -- Step 2: Record gift in credit_transactions for tracking
    INSERT INTO public.credit_transactions (
        user_id,
        transaction_type,
        credits_amount,
        status,
        metadata,
        created_at
    )
    SELECT 
        uc.user_id,
        'bonus',
        gift_amount,
        'completed',
        jsonb_build_object(
            'reason', gift_reason,
            'gift_batch', gift_batch_id,
            'acknowledged', false,
            'source', 'admin_gift',
            'gifted_at', NOW()
        ),
        NOW()
    FROM public.user_credits uc
    INNER JOIN auth.users u ON u.id = uc.user_id
    WHERE u.deleted_at IS NULL;

    -- Step 3: Log gift in usage_logs for history display
    INSERT INTO public.usage_logs (
        user_id,
        action,
        credits_used,
        metadata,
        created_at
    )
    SELECT 
        uc.user_id,
        'gift_credits',
        -gift_amount, -- Negative because it's adding credits
        jsonb_build_object(
            'reason', gift_reason,
            'source', 'admin_gift',
            'gift_batch', gift_batch_id,
            'display_name', 'Gift from us'
        ),
        NOW()
    FROM public.user_credits uc
    INNER JOIN auth.users u ON u.id = uc.user_id
    WHERE u.deleted_at IS NULL;

    -- Output results
    RAISE NOTICE '✅ Successfully gifted % credits to all active users!', gift_amount;
    RAISE NOTICE '📊 Gift batch ID: %', gift_batch_id;
    RAISE NOTICE '💝 Reason: %', gift_reason;
    RAISE NOTICE '';
    RAISE NOTICE 'Users will see a one-time notification when they next log in.';
    
END $$;

-- Verify the gift was applied (optional - comment out if not needed)
SELECT 
    COUNT(DISTINCT user_id) as users_gifted,
    SUM(credits_amount) as total_credits_gifted,
    MIN(created_at) as gift_time
FROM public.credit_transactions
WHERE 
    transaction_type = 'bonus' 
    AND metadata->>'gift_batch' = 'holiday_2025_01'; -- Update this to match your gift_batch_id