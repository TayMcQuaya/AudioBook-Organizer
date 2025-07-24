-- Fix file_uploads table to allow NULL in file_path
-- Since we're using storage_path for Supabase Storage, file_path can be NULL

ALTER TABLE public.file_uploads 
ALTER COLUMN file_path DROP NOT NULL;

-- Verify the change
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'file_uploads'
  AND column_name IN ('file_path', 'storage_path', 'project_id')
ORDER BY column_name;