-- RUN EACH QUERY SEPARATELY

-- 1. Check if ANY webhook events exist
SELECT COUNT(*) as total_webhook_events FROM stripe_events;

-- 2. Check ANY credit transactions exist
SELECT COUNT(*) as total_transactions FROM credit_transactions;

-- 3. Find your friend (CHANGE THE EMAIL!)
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'your-friends-email@example.com';

-- 4. Check all recent credit purchases
SELECT 
    u.email,
    ct.credits_amount,
    ct.status,
    ct.created_at,
    ct.metadata
FROM credit_transactions ct
JOIN auth.users u ON ct.user_id = u.id
WHERE ct.created_at > NOW() - INTERVAL '7 days'
ORDER BY ct.created_at DESC;

-- 5. Check current user credits (recent)
SELECT 
    u.email,
    uc.credits,
    uc.last_updated
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
WHERE uc.last_updated > NOW() - INTERVAL '7 days'
ORDER BY uc.last_updated DESC;