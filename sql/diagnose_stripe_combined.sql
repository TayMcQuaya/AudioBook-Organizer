-- =====================================================
-- STRIPE PAYMENT DIAGNOSTIC - COMBINED RESULTS
-- This version shows all results in one output
-- =====================================================

-- IMPORTANT: Change this email to your friend's actual email!
WITH user_lookup AS (
    SELECT id FROM auth.users 
    WHERE email = 'your-friends-email@example.com'  -- CHANGE THIS!
)

-- Combine all diagnostic queries
SELECT 'STRIPE_EVENTS' as category, 
       stripe_event_id as id,
       event_type as detail1,
       processing_status as detail2,
       error_message as detail3,
       created_at::text as timestamp
FROM stripe_events
ORDER BY created_at DESC
LIMIT 10

UNION ALL

SELECT 'USER_CREDITS' as category,
       uc.user_id::text as id,
       u.email as detail1,
       uc.credits::text as detail2,
       uc.last_updated::text as detail3,
       uc.created_at::text as timestamp
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE uc.user_id IN (SELECT id FROM user_lookup)
   OR uc.last_updated > NOW() - INTERVAL '7 days'
ORDER BY uc.last_updated DESC
LIMIT 10

UNION ALL

SELECT 'TRANSACTIONS' as category,
       ct.user_id::text as id,
       ct.transaction_type || ' - ' || ct.status as detail1,
       ct.credits_amount::text || ' credits' as detail2,
       COALESCE(ct.metadata->>'package_type', 'N/A') as detail3,
       ct.created_at::text as timestamp
FROM credit_transactions ct
WHERE ct.user_id IN (SELECT id FROM user_lookup)
   OR ct.created_at > NOW() - INTERVAL '7 days'
ORDER BY ct.created_at DESC
LIMIT 10

UNION ALL

SELECT 'USAGE_LOGS' as category,
       ul.user_id::text as id,
       ul.action as detail1,
       ul.credits_used::text || ' credits' as detail2,
       COALESCE(ul.metadata->>'package_type', 'N/A') as detail3,
       ul.created_at::text as timestamp
FROM usage_logs ul
WHERE ul.action = 'credit_purchase'
  AND (ul.user_id IN (SELECT id FROM user_lookup)
   OR ul.created_at > NOW() - INTERVAL '7 days')
ORDER BY ul.created_at DESC
LIMIT 10

UNION ALL

SELECT 'FRIEND_USER' as category,
       id::text as id,
       email as detail1,
       'Account created' as detail2,
       '' as detail3,
       created_at::text as timestamp
FROM auth.users
WHERE email = 'your-friends-email@example.com'  -- CHANGE THIS!

ORDER BY category, timestamp DESC;