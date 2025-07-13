-- =================================================================
-- 🔒 SECURITY FIX: Function Search Path Mutable
-- =================================================================
-- Date: 2025-07-12
-- Issue: Supabase security advisory - Functions with mutable search_path
-- Solution: Set fixed search_path to prevent accessing unintended schemas
-- =================================================================

-- =================================================================
-- 🆕 FIX HANDLE_NEW_USER FUNCTION
-- =================================================================
-- This function also needs SECURITY DEFINER removed and replaced with SECURITY INVOKER

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    -- Insert user profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Initialize user credits
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 100);
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile and initializes credits on signup - uses SECURITY INVOKER with fixed search path';

-- =================================================================
-- 🕐 FIX HANDLE_UPDATED_AT FUNCTION
-- =================================================================

DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER audiobook_projects_updated_at
    BEFORE UPDATE ON public.audiobook_projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add comment
COMMENT ON FUNCTION public.handle_updated_at() IS 'Updates timestamp on record modification - uses fixed search path';

-- =================================================================
-- 💳 FIX HANDLE_CREDITS_UPDATED FUNCTION
-- =================================================================

DROP FUNCTION IF EXISTS public.handle_credits_updated() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_credits_updated()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER user_credits_updated
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE FUNCTION public.handle_credits_updated();

-- Add comment
COMMENT ON FUNCTION public.handle_credits_updated() IS 'Updates credits timestamp on modification - uses fixed search path';

-- =================================================================
-- ✅ VERIFICATION QUERIES
-- =================================================================

-- You can run these queries to verify the functions are working correctly:
-- SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('handle_new_user', 'handle_updated_at', 'handle_credits_updated');

-- =================================================================
-- 📝 NOTES
-- =================================================================
-- 1. SET search_path = '' ensures functions only access explicitly qualified objects
-- 2. SECURITY INVOKER means functions run with calling user's permissions
-- 3. All table references use explicit schema qualification (public.tablename)
-- 4. These changes improve security without affecting functionality

-- =================================================================
-- ⚠️ IMPORTANT: Additional Dashboard Configuration Required
-- =================================================================
-- The following settings must be configured in Supabase Dashboard:
-- 
-- 1. Auth → Email Settings:
--    - Set "OTP Expiry" to 30 minutes (currently > 1 hour)
-- 
-- 2. Auth → Security:
--    - Enable "Leaked Password Protection" (HaveIBeenPwned integration)
-- 
-- These cannot be fixed via SQL and require manual configuration.