-- Fix for Google OAuth signup error: "Database error saving new user"
-- The handle_new_user trigger needs SECURITY DEFINER to bypass RLS during OAuth signup

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER  -- Changed from INVOKER to DEFINER to bypass RLS
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

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile and initializes credits on signup - uses SECURITY DEFINER to bypass RLS during OAuth';

-- Grant necessary permissions to the function owner (postgres)
GRANT INSERT ON public.profiles TO postgres;
GRANT INSERT ON public.user_credits TO postgres;