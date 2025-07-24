-- Fix RLS policies for file_uploads table
-- This allows the service role to create upload records

-- First, check if the table exists and has RLS enabled
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Service role has full access" ON public.file_uploads;

-- Create comprehensive policies
-- 1. Users can view their own uploads
CREATE POLICY "Users can view own uploads"
ON public.file_uploads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can insert their own uploads
CREATE POLICY "Users can insert own uploads"
ON public.file_uploads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own uploads
CREATE POLICY "Users can update own uploads"
ON public.file_uploads FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Users can delete their own uploads
CREATE POLICY "Users can delete own uploads"
ON public.file_uploads FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Service role bypass (for backend operations)
CREATE POLICY "Service role has full access"
ON public.file_uploads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE tablename = 'file_uploads'
ORDER BY policyname;

-- Output should show all 5 policies created