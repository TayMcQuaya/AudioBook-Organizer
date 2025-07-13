-- Production-ready fix for Stripe webhook RLS issue
DROP POLICY IF EXISTS "Service role can access stripe events" ON public.stripe_events;

-- Create the correct policy using modern Supabase RLS best practices
CREATE POLICY "Enable service role access for stripe_events" 
ON public.stripe_events 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);