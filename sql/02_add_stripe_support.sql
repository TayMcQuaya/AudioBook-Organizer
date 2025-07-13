-- AudioBook Organizer - Stripe Payment Support
-- Run this in your Supabase SQL editor to add Stripe payment support

-- =================================================================
-- 📊 ADD STRIPE EVENTS TABLE
-- =================================================================

-- Create stripe_events table for webhook event tracking
CREATE TABLE IF NOT EXISTS public.stripe_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    webhook_data JSONB DEFAULT '{}',
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- 🔄 EXTEND EXISTING TABLES FOR STRIPE
-- =================================================================

-- Add Stripe-specific columns to existing credit_transactions table
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_event_id TEXT;

-- =================================================================
-- 🔐 ROW LEVEL SECURITY FOR NEW TABLE
-- =================================================================

-- Enable RLS on stripe_events table
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for stripe_events (admin access only)
-- Users cannot directly access webhook events for security
CREATE POLICY "Service role can access stripe events" 
ON public.stripe_events FOR ALL 
USING (auth.role() = 'service_role');

-- =================================================================
-- 📈 PERFORMANCE INDEXES
-- =================================================================

-- Create indexes for performance on new columns
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON public.stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_status ON public.stripe_events(processing_status);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe_session ON public.credit_transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe_event ON public.credit_transactions(stripe_event_id);

-- =================================================================
-- 🔍 VIEWS FOR STRIPE ANALYTICS
-- =================================================================

-- Create view for payment analytics (service role access only)
CREATE OR REPLACE VIEW public.stripe_payment_analytics 
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

-- =================================================================
-- 🛡️ GRANT PERMISSIONS
-- =================================================================

-- Grant necessary permissions for service role (backend operations)
GRANT ALL ON public.stripe_events TO service_role;
GRANT SELECT ON public.stripe_payment_analytics TO service_role;

-- =================================================================
-- 📝 COMMENTS FOR DOCUMENTATION
-- =================================================================

COMMENT ON TABLE public.stripe_events IS 'Tracks Stripe webhook events for payment processing';
COMMENT ON COLUMN public.credit_transactions.stripe_session_id IS 'Stripe Checkout Session ID for payment tracking';
COMMENT ON COLUMN public.credit_transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID for transaction verification';
COMMENT ON COLUMN public.credit_transactions.stripe_event_id IS 'Associated Stripe event ID for audit trail';
COMMENT ON VIEW public.stripe_payment_analytics IS 'Analytics view for Stripe payment performance (service role only)';

-- =================================================================
-- ✅ VERIFICATION QUERIES
-- =================================================================

-- Verify tables exist
DO $$
BEGIN
    -- Check if stripe_events table was created
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stripe_events' AND table_schema = 'public') THEN
        RAISE NOTICE 'SUCCESS: stripe_events table created successfully';
    ELSE
        RAISE EXCEPTION 'ERROR: stripe_events table was not created';
    END IF;
    
    -- Check if columns were added to credit_transactions
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'credit_transactions' AND column_name = 'stripe_session_id' AND table_schema = 'public') THEN
        RAISE NOTICE 'SUCCESS: stripe_session_id column added to credit_transactions';
    ELSE
        RAISE EXCEPTION 'ERROR: stripe_session_id column was not added to credit_transactions';
    END IF;
    
    -- Check if indexes were created
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_stripe_events_event_id') THEN
        RAISE NOTICE 'SUCCESS: Stripe indexes created successfully';
    ELSE
        RAISE EXCEPTION 'ERROR: Stripe indexes were not created';
    END IF;
    
    RAISE NOTICE 'SUCCESS: All Stripe database extensions have been applied successfully!';
END $$; 