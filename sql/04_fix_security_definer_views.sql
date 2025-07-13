-- =================================================================
-- 🔒 SECURITY FIX: Replace SECURITY DEFINER views with SECURITY INVOKER
-- =================================================================
-- Date: 2025-07-12
-- Issue: Supabase security advisory - SECURITY DEFINER views bypass RLS
-- Solution: Recreate views with security_invoker = true
-- =================================================================

-- =================================================================
-- 📊 FIX USER_STATS VIEW
-- =================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.user_stats CASCADE;

-- Recreate with SECURITY INVOKER (respects RLS policies)
CREATE VIEW public.user_stats 
WITH (security_invoker = true) AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    uc.credits,
    COUNT(ap.id) as total_projects,
    COUNT(CASE WHEN ap.status = 'completed' THEN 1 END) as completed_projects,
    COALESCE(SUM(ul.credits_used), 0) as total_credits_used,
    p.created_at as user_since
FROM public.profiles p
LEFT JOIN public.user_credits uc ON p.id = uc.user_id
LEFT JOIN public.audiobook_projects ap ON p.id = ap.user_id
LEFT JOIN public.usage_logs ul ON p.id = ul.user_id
GROUP BY p.id, p.email, p.full_name, uc.credits, p.created_at;

-- Add comment
COMMENT ON VIEW public.user_stats IS 'Aggregated user statistics view - respects RLS policies';

-- =================================================================
-- 📋 FIX RECENT_ACTIVITY VIEW
-- =================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.recent_activity CASCADE;

-- Recreate with SECURITY INVOKER (respects RLS policies)
CREATE VIEW public.recent_activity 
WITH (security_invoker = true) AS
SELECT 
    ul.user_id,
    ul.action,
    ul.credits_used,
    ul.metadata,
    ul.created_at,
    p.email,
    p.full_name
FROM public.usage_logs ul
JOIN public.profiles p ON ul.user_id = p.id
ORDER BY ul.created_at DESC;

-- Add comment
COMMENT ON VIEW public.recent_activity IS 'Recent user activity logs - respects RLS policies';

-- =================================================================
-- 💳 FIX STRIPE_PAYMENT_ANALYTICS VIEW
-- =================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.stripe_payment_analytics CASCADE;

-- Recreate with SECURITY INVOKER (respects RLS policies)
CREATE VIEW public.stripe_payment_analytics 
WITH (security_invoker = true) AS
SELECT 
    DATE_TRUNC('day', ct.created_at) as payment_date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN ct.status = 'completed' THEN 1 ELSE 0 END) as successful_payments,
    SUM(CASE WHEN ct.status = 'failed' THEN 1 ELSE 0 END) as failed_payments,
    SUM(CASE WHEN ct.status = 'completed' THEN ct.credits_amount ELSE 0 END) as total_credits_sold,
    AVG(CASE WHEN ct.status = 'completed' AND ct.metadata->>'amount_cents' IS NOT NULL 
        THEN (ct.metadata->>'amount_cents')::INTEGER ELSE NULL END) as avg_payment_amount_cents
FROM public.credit_transactions ct
WHERE ct.transaction_type = 'purchase' 
    AND ct.stripe_session_id IS NOT NULL
GROUP BY DATE_TRUNC('day', ct.created_at)
ORDER BY payment_date DESC;

-- Re-grant necessary permissions
GRANT SELECT ON public.stripe_payment_analytics TO service_role;

-- Add comment
COMMENT ON VIEW public.stripe_payment_analytics IS 'Analytics view for Stripe payment performance (service role only) - respects RLS policies';

-- =================================================================
-- ✅ VERIFICATION QUERIES
-- =================================================================

-- You can run these queries to verify the views are working correctly:
-- SELECT * FROM public.user_stats LIMIT 5;
-- SELECT * FROM public.recent_activity LIMIT 5;
-- SELECT * FROM public.stripe_payment_analytics LIMIT 5;

-- =================================================================
-- 📝 NOTES
-- =================================================================
-- 1. SECURITY INVOKER means views execute with the permissions of the calling user
-- 2. This ensures RLS policies are properly enforced
-- 3. No impact on application functionality as these views are not currently used
-- 4. Service role still has access to stripe_payment_analytics for backend operations