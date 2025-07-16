-- =====================================================
-- STRIPE PAYMENT DIAGNOSTIC SCRIPT
-- Run this entire script in Supabase SQL Editor
-- =====================================================

-- 1. CHECK RECENT WEBHOOK EVENTS
-- This shows what Stripe events your server received
SELECT 
    '=== RECENT STRIPE WEBHOOK EVENTS ===' as section;
    
SELECT 
    stripe_event_id,
    event_type,
    processing_status,
    error_message,
    created_at
FROM stripe_events 
ORDER BY created_at DESC 
LIMIT 20;

-- 2. FIND YOUR FRIEND'S USER
-- Replace 'your-friends-email@example.com' with their actual email
SELECT 
    '=== FINDING USER BY EMAIL ===' as section;
    
SELECT 
    id as user_id, 
    email,
    created_at as account_created
FROM auth.users 
WHERE email = 'your-friends-email@example.com';  -- CHANGE THIS EMAIL!

-- 3. CHECK ALL USERS' RECENT TRANSACTIONS
-- This shows all recent credit purchases
SELECT 
    '=== RECENT CREDIT TRANSACTIONS (ALL USERS) ===' as section;

SELECT 
    ct.user_id,
    u.email,
    ct.transaction_type,
    ct.credits_amount,
    ct.status,
    ct.stripe_session_id,
    ct.created_at,
    ct.metadata->>'package_type' as package_type
FROM credit_transactions ct
JOIN auth.users u ON ct.user_id = u.id
WHERE ct.transaction_type = 'purchase'
ORDER BY ct.created_at DESC
LIMIT 20;

-- 4. CHECK ALL USERS' CURRENT CREDITS
-- Shows credit balances for recent users
SELECT 
    '=== CURRENT USER CREDITS ===' as section;

SELECT 
    uc.user_id,
    u.email,
    uc.credits,
    uc.last_updated,
    uc.created_at
FROM user_credits uc
JOIN auth.users u ON uc.user_id = u.id
ORDER BY uc.last_updated DESC
LIMIT 20;

-- 5. CHECK FOR ORPHANED STRIPE EVENTS
-- Events that were received but not processed
SELECT 
    '=== FAILED OR PENDING STRIPE EVENTS ===' as section;

SELECT 
    stripe_event_id,
    event_type,
    processing_status,
    error_message,
    webhook_data->>'id' as webhook_id,
    created_at
FROM stripe_events 
WHERE processing_status IN ('failed', 'pending')
ORDER BY created_at DESC;

-- 6. CHECK USAGE LOGS FOR CREDIT PURCHASES
-- This should show credit_purchase actions
SELECT 
    '=== RECENT CREDIT PURCHASE LOGS ===' as section;

SELECT 
    ul.user_id,
    u.email,
    ul.action,
    ul.credits_used,
    ul.metadata,
    ul.created_at
FROM usage_logs ul
JOIN auth.users u ON ul.user_id = u.id
WHERE ul.action = 'credit_purchase'
ORDER BY ul.created_at DESC
LIMIT 20;

-- 7. SUMMARY STATISTICS
SELECT 
    '=== SUMMARY STATISTICS ===' as section;

SELECT 
    COUNT(DISTINCT user_id) as total_users_with_credits,
    SUM(credits) as total_credits_in_system,
    AVG(credits) as average_credits_per_user,
    MAX(credits) as highest_credit_balance,
    MIN(credits) as lowest_credit_balance
FROM user_credits;

-- 8. CHECK IF STRIPE TABLES EXIST
SELECT 
    '=== DATABASE TABLES CHECK ===' as section;

SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('stripe_events', 'credit_transactions', 'user_credits', 'usage_logs')
        THEN '✅ Exists'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stripe_events', 'credit_transactions', 'user_credits', 'usage_logs', 'profiles')
ORDER BY table_name;