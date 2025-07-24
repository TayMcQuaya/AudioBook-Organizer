-- AudioBook Organizer - Storage Tracking for Supabase Storage Migration
-- Run this after all other SQL files to add storage quota tracking

-- =================================================================
-- 📊 ADD STORAGE TRACKING TO USER CREDITS
-- =================================================================

-- Add storage quota tracking columns
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS storage_quota_mb INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS storage_used_mb DECIMAL(10,2) DEFAULT 0;

-- Update quota for users who have made purchases (5GB for paid users)
UPDATE public.user_credits uc
SET storage_quota_mb = 5120  -- 5GB in MB
WHERE EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = uc.user_id 
    AND ct.status = 'completed'
    AND ct.transaction_type = 'purchase'
);

-- =================================================================
-- 🗄️ ENHANCE FILE UPLOADS TABLE FOR SUPABASE STORAGE
-- =================================================================

-- Add columns for Supabase Storage integration
ALTER TABLE public.file_uploads
ADD COLUMN IF NOT EXISTS file_size_mb DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'audiofiles',
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS public_url TEXT,
ADD COLUMN IF NOT EXISTS chapter_id INTEGER,
ADD COLUMN IF NOT EXISTS section_id INTEGER,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- =================================================================
-- 📈 CREATE INDEXES FOR PERFORMANCE
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_file_uploads_storage_path ON public.file_uploads(storage_path);
CREATE INDEX IF NOT EXISTS idx_file_uploads_chapter_section ON public.file_uploads(chapter_id, section_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_storage_used ON public.user_credits(storage_used_mb);

-- =================================================================
-- 🔍 CREATE STORAGE ANALYTICS VIEW
-- =================================================================

-- View to monitor storage usage across users
CREATE OR REPLACE VIEW public.storage_usage_analytics 
WITH (security_invoker = true) AS
SELECT 
    uc.user_id,
    p.email,
    p.full_name,
    uc.storage_quota_mb,
    uc.storage_used_mb,
    ROUND((uc.storage_used_mb::NUMERIC / NULLIF(uc.storage_quota_mb, 0) * 100), 2) as usage_percentage,
    COUNT(fu.id) as total_files,
    COALESCE(SUM(fu.file_size_mb), 0) as calculated_usage_mb,
    uc.storage_quota_mb - uc.storage_used_mb as remaining_mb,
    CASE 
        WHEN uc.storage_quota_mb = 500 THEN 'Free'
        WHEN uc.storage_quota_mb = 5120 THEN 'Paid'
        ELSE 'Custom'
    END as user_tier
FROM public.user_credits uc
JOIN public.profiles p ON uc.user_id = p.id
LEFT JOIN public.file_uploads fu ON uc.user_id = fu.user_id AND fu.upload_status = 'completed'
GROUP BY uc.user_id, p.email, p.full_name, uc.storage_quota_mb, uc.storage_used_mb
ORDER BY usage_percentage DESC;

-- =================================================================
-- 🛡️ ROW LEVEL SECURITY UPDATES
-- =================================================================

-- Ensure RLS is enabled on file_uploads (should already be, but just in case)
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- View RLS: Users can only see their own storage analytics
CREATE POLICY "Users can view own storage analytics"
ON public.file_uploads FOR SELECT
USING (auth.uid() = user_id);

-- =================================================================
-- 🔧 HELPER FUNCTIONS
-- =================================================================

-- Function to check if user has storage space available
CREATE OR REPLACE FUNCTION public.check_storage_availability(
    p_user_id UUID,
    p_file_size_mb DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quota_mb INTEGER;
    v_used_mb DECIMAL;
    v_available_mb DECIMAL;
BEGIN
    -- Get user's current storage quota and usage
    SELECT storage_quota_mb, storage_used_mb
    INTO v_quota_mb, v_used_mb
    FROM user_credits
    WHERE user_id = p_user_id;
    
    -- Calculate available space
    v_available_mb := v_quota_mb - COALESCE(v_used_mb, 0);
    
    -- Return true if enough space available
    RETURN v_available_mb >= p_file_size_mb;
END;
$$;

-- Function to update storage usage after file upload/delete
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.upload_status = 'completed' THEN
        -- Increase storage usage
        UPDATE user_credits
        SET storage_used_mb = COALESCE(storage_used_mb, 0) + COALESCE(NEW.file_size_mb, 0)
        WHERE user_id = NEW.user_id;
        
    ELSIF TG_OP = 'UPDATE' AND OLD.upload_status != 'completed' AND NEW.upload_status = 'completed' THEN
        -- File just completed uploading
        UPDATE user_credits
        SET storage_used_mb = COALESCE(storage_used_mb, 0) + COALESCE(NEW.file_size_mb, 0)
        WHERE user_id = NEW.user_id;
        
    ELSIF TG_OP = 'DELETE' AND OLD.upload_status = 'completed' THEN
        -- Decrease storage usage
        UPDATE user_credits
        SET storage_used_mb = GREATEST(0, COALESCE(storage_used_mb, 0) - COALESCE(OLD.file_size_mb, 0))
        WHERE user_id = OLD.user_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for automatic storage usage updates
DROP TRIGGER IF EXISTS update_storage_usage_trigger ON public.file_uploads;
CREATE TRIGGER update_storage_usage_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.file_uploads
FOR EACH ROW EXECUTE FUNCTION public.update_storage_usage();

-- =================================================================
-- 📝 COMMENTS FOR DOCUMENTATION
-- =================================================================

COMMENT ON COLUMN public.user_credits.storage_quota_mb IS 'User storage quota in MB (500 for free, 5120 for paid)';
COMMENT ON COLUMN public.user_credits.storage_used_mb IS 'Current storage usage in MB';
COMMENT ON COLUMN public.file_uploads.storage_bucket IS 'Supabase Storage bucket name';
COMMENT ON COLUMN public.file_uploads.storage_path IS 'Path within the storage bucket';
COMMENT ON COLUMN public.file_uploads.public_url IS 'Public URL for the file (if applicable)';
COMMENT ON FUNCTION public.check_storage_availability IS 'Check if user has enough storage space for a file';
COMMENT ON FUNCTION public.update_storage_usage IS 'Automatically track storage usage changes';

-- =================================================================
-- ✅ VERIFICATION QUERIES
-- =================================================================

DO $$
BEGIN
    -- Verify columns were added
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_credits' 
        AND column_name = 'storage_quota_mb' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'SUCCESS: Storage tracking columns added to user_credits';
    ELSE
        RAISE EXCEPTION 'ERROR: Storage tracking columns were not added';
    END IF;
    
    -- Verify file_uploads enhancements
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'file_uploads' 
        AND column_name = 'storage_path' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'SUCCESS: Supabase Storage columns added to file_uploads';
    ELSE
        RAISE EXCEPTION 'ERROR: Supabase Storage columns were not added';
    END IF;
    
    -- Verify functions exist
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'check_storage_availability'
    ) THEN
        RAISE NOTICE 'SUCCESS: Storage helper functions created';
    ELSE
        RAISE EXCEPTION 'ERROR: Storage helper functions were not created';
    END IF;
    
    RAISE NOTICE 'SUCCESS: All storage tracking updates have been applied!';
END $$;