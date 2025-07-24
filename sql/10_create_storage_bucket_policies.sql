-- AudioBook Organizer - Supabase Storage Bucket Setup
-- Run this in Supabase SQL Editor after creating the 'audiofiles' bucket

-- =================================================================
-- 📦 STORAGE BUCKET SETUP INSTRUCTIONS
-- =================================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "Create bucket"
-- 3. Settings:
--    - Name: audiofiles
--    - Public bucket: OFF (keep it private)
--    - File size limit: 50MB
--    - Allowed MIME types: audio/mpeg,audio/mp3,audio/wav,audio/x-wav
-- 4. Save the bucket
-- 5. Run this SQL to set up policies

-- =================================================================
-- 🔐 STORAGE BUCKET RLS POLICIES
-- =================================================================

-- Policy 1: Users can upload their own audio files
-- Files must be stored in a folder named with their user ID
CREATE POLICY "Users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'audiofiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view/download their own files
CREATE POLICY "Users can view own audio files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'audiofiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'audiofiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can update their own files (for overwrites)
CREATE POLICY "Users can update own audio files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'audiofiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- =================================================================
-- 🔧 STORAGE HELPER FUNCTIONS
-- =================================================================

-- Function to generate storage path for a user's audio file
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
AS $$
DECLARE
    v_clean_filename TEXT;
    v_timestamp TEXT;
BEGIN
    -- Clean filename (remove special chars, keep extension)
    v_clean_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
    
    -- Add timestamp to ensure uniqueness
    v_timestamp := to_char(now(), 'YYYYMMDD_HH24MISS');
    
    -- Return path: user_id/project_id/chapter_section_timestamp_filename
    RETURN format('%s/%s/%s_%s_%s_%s',
        p_user_id::text,
        p_project_id::text,
        p_chapter_id::text,
        p_section_id::text,
        v_timestamp,
        v_clean_filename
    );
END;
$$;

-- Function to get signed URL for audio file (backend will use this)
CREATE OR REPLACE FUNCTION public.get_audio_signed_url(
    p_storage_path TEXT,
    p_expires_in INTEGER DEFAULT 3600  -- 1 hour default
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_signed_url TEXT;
BEGIN
    -- Note: This is a placeholder. Actual signed URL generation
    -- must be done through Supabase client SDK in the backend
    -- This function documents the expected behavior
    
    -- In production, the backend will:
    -- 1. Verify user owns the file
    -- 2. Generate signed URL using Supabase SDK
    -- 3. Return URL with expiration
    
    -- For now, return the storage path as documentation
    RETURN format('Storage path: %s (Generate signed URL in backend)', p_storage_path);
END;
$$;

-- =================================================================
-- 📊 STORAGE MONITORING VIEW
-- =================================================================

-- View to monitor storage bucket usage
CREATE OR REPLACE VIEW public.storage_bucket_stats
WITH (security_invoker = true) AS
SELECT 
    COUNT(DISTINCT (storage.foldername(name))[1]) as total_users,
    COUNT(*) as total_files,
    SUM(metadata->>'size')::BIGINT / 1024 / 1024 as total_size_mb,
    AVG(metadata->>'size')::BIGINT / 1024 / 1024 as avg_file_size_mb,
    MAX(created_at) as last_upload,
    MIN(created_at) as first_upload
FROM storage.objects
WHERE bucket_id = 'audiofiles';

-- Grant access to service role only
GRANT SELECT ON public.storage_bucket_stats TO service_role;

-- =================================================================
-- 📝 DOCUMENTATION
-- =================================================================

COMMENT ON FUNCTION public.generate_storage_path IS 'Generate organized storage path for audio files';
COMMENT ON FUNCTION public.get_audio_signed_url IS 'Placeholder for signed URL generation (implement in backend)';
COMMENT ON VIEW public.storage_bucket_stats IS 'Monitor audiofiles bucket usage (service role only)';

-- =================================================================
-- ✅ VERIFICATION
-- =================================================================

DO $$
BEGIN
    -- Check if policies exist (this will fail if bucket doesn't exist)
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%audio files%'
    ) THEN
        RAISE NOTICE 'SUCCESS: Storage policies created successfully';
    ELSE
        RAISE WARNING 'WARNING: Storage policies may not be created. Ensure audiofiles bucket exists first!';
    END IF;
    
    -- Verify helper functions
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'generate_storage_path'
    ) THEN
        RAISE NOTICE 'SUCCESS: Storage helper functions created';
    ELSE
        RAISE EXCEPTION 'ERROR: Storage helper functions were not created';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Make sure you created the audiofiles bucket in Supabase Dashboard before running this!';
    RAISE NOTICE '📦 Bucket settings: Name=audiofiles, Public=OFF, Size limit=50MB';
    RAISE NOTICE '🎵 Allowed types: audio/mpeg,audio/mp3,audio/wav,audio/x-wav';
END $$;