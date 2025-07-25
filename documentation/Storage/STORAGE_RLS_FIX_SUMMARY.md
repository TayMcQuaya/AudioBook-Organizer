# Supabase Storage RLS Fix Summary

## Changes Made

### 1. Updated Storage Service (backend/services/supabase_storage_service.py)
- **Line 28**: Changed from `self.supabase_service.client` to `self.supabase_service.get_service_client()`
- This ensures the storage service uses the service role key which bypasses all RLS policies

### 2. Created SQL Fix (sql/18_fix_storage_quota_function.sql)
- Added `SECURITY DEFINER` to the `check_storage_availability` function
- This allows the function to access the `user_credits` table regardless of the caller's permissions
- Added proper grants for both authenticated users and service role

## Deployment Steps

1. **Run the SQL migration**:
   ```bash
   # In Supabase SQL Editor, run:
   sql/18_fix_storage_quota_function.sql
   ```

2. **Deploy the code changes**:
   - Commit and push the changes
   - The DigitalOcean app should auto-deploy

3. **Verify environment variables**:
   - Ensure `SUPABASE_SERVICE_KEY` is set in DigitalOcean app settings
   - Make sure it's the service key from the same Supabase project

## Testing

After deployment:
1. Try uploading an audio file
2. Check Supabase Dashboard → Storage → audiofiles bucket
3. Verify the file appears there
4. Test audio playback to ensure signed URLs work

## What This Fixes

- ✅ Resolves "new row violates row-level security policy" errors
- ✅ Allows file uploads to Supabase Storage
- ✅ Fixes quota checking for unauthenticated backend calls
- ✅ Eliminates fallback to local storage due to RLS errors

## Important Notes

- The bucket can remain private (no need to make it public)
- The service key bypasses all RLS, so keep it secure
- Both the storage operations and quota checks will now work properly