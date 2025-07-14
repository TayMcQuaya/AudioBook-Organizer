-- Fix for credit abuse: Only give credits after email verification
-- This prevents users from creating multiple accounts with fake emails to farm credits

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create updated function that checks email verification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Always create profile (needed for the user to exist in the system)
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Only give credits if:
    -- 1. Email is already confirmed (OAuth users like Google)
    -- 2. OR it's a social auth provider (they verify emails)
    IF NEW.email_confirmed_at IS NOT NULL OR 
       NEW.raw_app_meta_data->>'provider' IN ('google', 'github', 'facebook') OR
       NEW.raw_user_meta_data->>'iss' IS NOT NULL THEN  -- OAuth providers set 'iss'
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (NEW.id, 100);
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create profile/credits for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to grant credits after email verification
CREATE OR REPLACE FUNCTION public.grant_verification_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if user just got verified and doesn't have credits yet
    IF OLD.email_confirmed_at IS NULL AND 
       NEW.email_confirmed_at IS NOT NULL AND
       NOT EXISTS (SELECT 1 FROM public.user_credits WHERE user_id = NEW.id) THEN
        
        -- Grant the initial credits
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (NEW.id, 100);
        
        RAISE LOG 'Granted verification credits to user %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for email verification
CREATE TRIGGER on_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW 
    WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
    EXECUTE FUNCTION public.grant_verification_credits();

-- Add comments
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile on signup, credits only for verified emails or OAuth users';
COMMENT ON FUNCTION public.grant_verification_credits() IS 'Grants initial credits when email is verified';

-- Grant necessary permissions
GRANT INSERT ON public.profiles TO postgres;
GRANT INSERT ON public.user_credits TO postgres;
GRANT UPDATE ON auth.users TO postgres;