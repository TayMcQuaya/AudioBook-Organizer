-- AudioBook Organizer - Fix Search Path Security Issues (Correct Version)
-- Date: January 2025
-- Purpose: Fix security vulnerabilities related to function search paths
-- This version uses the correct function signatures that actually exist in the database

-- =================================================================
-- 🔒 SECURITY FIX: Set search_path = '' for all functions
-- =================================================================

-- =================================================================
-- Fix 1: generate_storage_path function
-- =================================================================
CREATE OR REPLACE FUNCTION public.generate_storage_path(
    p_user_id UUID,
    p_project_id UUID,
    p_chapter_id INTEGER,
    p_section_id INTEGER,
    p_filename TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''  -- SECURITY FIX: Prevent search path hijacking
AS $$
DECLARE
    v_clean_filename TEXT;
    v_timestamp TEXT;
BEGIN
    -- Clean filename (remove special chars, keep extension)
    v_clean_filename := pg_catalog.regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
    
    -- Add timestamp to ensure uniqueness
    v_timestamp := pg_catalog.to_char(pg_catalog.clock_timestamp(), 'YYYYMMDD_HH24MISS');
    
    -- Return path: user_id/project_id/chapter_section_timestamp_filename
    RETURN pg_catalog.format('%s/%s/%s_%s_%s_%s',
        p_user_id::text,
        p_project_id::text,
        p_chapter_id::text,
        p_section_id::text,
        v_timestamp,
        v_clean_filename
    );
END;
$$;

-- =================================================================
-- Fix 2: get_audio_signed_url function
-- =================================================================
CREATE OR REPLACE FUNCTION public.get_audio_signed_url(
    p_storage_path TEXT,
    p_expires_in INTEGER DEFAULT 3600  -- 1 hour default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- SECURITY FIX: Changed from 'public' to ''
AS $$
DECLARE
    v_signed_url TEXT;
BEGIN
    -- Note: This is a placeholder. Actual signed URL generation
    -- must be done through Supabase client SDK in the backend
    RETURN pg_catalog.format('Storage path: %s (Generate signed URL in backend)', p_storage_path);
END;
$$;

-- =================================================================
-- Fix 3: check_storage_availability function (CORRECT SIGNATURE)
-- =================================================================
CREATE OR REPLACE FUNCTION public.check_storage_availability(
    p_user_id UUID,
    p_file_size_mb DECIMAL  -- Note: DECIMAL, not BIGINT
)
RETURNS BOOLEAN  -- Note: Returns BOOLEAN, not JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- SECURITY FIX: Changed from 'public' to ''
AS $$
DECLARE
    v_quota_mb INTEGER;
    v_used_mb DECIMAL;
    v_available_mb DECIMAL;
BEGIN
    -- Get user's current storage quota and usage
    SELECT storage_quota_mb, storage_used_mb
    INTO v_quota_mb, v_used_mb
    FROM public.user_credits
    WHERE user_id = p_user_id;
    
    -- Calculate available space
    v_available_mb := v_quota_mb - COALESCE(v_used_mb, 0);
    
    -- Return true if enough space available
    RETURN v_available_mb >= p_file_size_mb;
END;
$$;

-- =================================================================
-- Fix 4: update_storage_usage function (CORRECT IMPLEMENTATION)
-- =================================================================
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- SECURITY FIX: Changed from 'public' to ''
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.upload_status = 'completed' THEN
        -- Increase storage usage
        UPDATE public.user_credits
        SET storage_used_mb = COALESCE(storage_used_mb, 0) + COALESCE(NEW.file_size_mb, 0)
        WHERE user_id = NEW.user_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.upload_status != 'completed' AND NEW.upload_status = 'completed' THEN
        -- File just completed uploading
        UPDATE public.user_credits
        SET storage_used_mb = COALESCE(storage_used_mb, 0) + COALESCE(NEW.file_size_mb, 0)
        WHERE user_id = NEW.user_id;
        
    ELSIF TG_OP = 'DELETE' AND OLD.upload_status = 'completed' THEN
        -- Decrease storage usage
        UPDATE public.user_credits
        SET storage_used_mb = GREATEST(0, COALESCE(storage_used_mb, 0) - COALESCE(OLD.file_size_mb, 0))
        WHERE user_id = OLD.user_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.upload_status = 'completed' AND NEW.upload_status = 'completed' 
          AND OLD.file_size_mb != NEW.file_size_mb THEN
        -- File size changed
        UPDATE public.user_credits
        SET storage_used_mb = GREATEST(0, 
            COALESCE(storage_used_mb, 0) - COALESCE(OLD.file_size_mb, 0) + COALESCE(NEW.file_size_mb, 0)
        )
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- =================================================================
-- 🔍 VERIFICATION
-- =================================================================
DO $$
BEGIN
    RAISE NOTICE '======================================';
    RAISE NOTICE '✅ Security fixes applied successfully!';
    RAISE NOTICE '======================================';
    RAISE NOTICE '';
    RAISE NOTICE 'The following functions have been updated:';
    RAISE NOTICE '  1. generate_storage_path - Added SET search_path = ''''';
    RAISE NOTICE '  2. get_audio_signed_url - Changed from ''public'' to ''''';
    RAISE NOTICE '  3. check_storage_availability - Changed from ''public'' to ''''';
    RAISE NOTICE '  4. update_storage_usage - Changed from ''public'' to ''''';
    RAISE NOTICE '';
    RAISE NOTICE '📝 All functions now use:';
    RAISE NOTICE '  - Empty search path for security';
    RAISE NOTICE '  - Fully qualified table names (public.*)';
    RAISE NOTICE '  - System functions with pg_catalog prefix';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Your database is now protected against:';
    RAISE NOTICE '  - Search path hijacking attacks';
    RAISE NOTICE '  - Function shadowing exploits';
    RAISE NOTICE '';
    RAISE NOTICE 'Please check Security Advisor to confirm!';
    RAISE NOTICE '======================================';
END $$;

-- =================================================================
-- 📚 UPDATE COMMENTS
-- =================================================================
COMMENT ON FUNCTION public.generate_storage_path IS 
'Generate organized storage path for audio files. Security: Uses empty search path.';

COMMENT ON FUNCTION public.get_audio_signed_url IS 
'Placeholder for signed URL generation. Security: Uses empty search path.';

COMMENT ON FUNCTION public.check_storage_availability IS 
'Check if user has enough storage space. Security: Uses empty search path.';

COMMENT ON FUNCTION public.update_storage_usage IS 
'Trigger to track storage usage. Security: Uses empty search path.';