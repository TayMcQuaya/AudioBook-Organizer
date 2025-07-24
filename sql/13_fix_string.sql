-- First, drop the foreign key constraint
  ALTER TABLE public.file_uploads
  DROP CONSTRAINT IF EXISTS file_uploads_project_id_fkey;

  -- Then change the column type
  ALTER TABLE public.file_uploads
  ALTER COLUMN project_id TYPE TEXT;

  -- The column is now TEXT and can accept your string project ID