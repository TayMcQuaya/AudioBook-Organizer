# Supabase Storage Debug Session Summary

## Problem
Audio files are being lost when Docker container restarts on DigitalOcean. Attempting to migrate from local storage to Supabase Storage for persistence.

## Current Status
- ✅ Environment variable `STORAGE_BACKEND=supabase` is set and being read
- ✅ Backend is attempting to use Supabase Storage
- ❌ Uploads failing with: `"new row violates row-level security policy"`
- ❌ No files appearing in Supabase Storage bucket

## What We've Discovered

### 1. Parameter Name Mismatch (FIXED)
- Frontend sends: `chapterId`, `sectionId` (camelCase)
- Backend was expecting: `chapter_id`, `section_id` (snake_case)
- **Fixed**: Updated backend to accept camelCase parameters

### 2. AudioService Initialization Timing (FIXED)
- AudioService was being initialized before environment variables were loaded
- **Fixed**: Implemented lazy initialization with `get_audio_service()`

### 3. RLS Policy Issues (ONGOING)
The main blocker is Row Level Security (RLS) policies on Supabase Storage.

#### What We've Tried:
1. **SQL File 11**: Added RLS policies for `file_uploads` table - ✅ Applied successfully
2. **SQL File 12**: Added service role bypass for storage.objects - ❌ Policy not showing in results
3. **SQL File 13**: Debug queries showed RLS is enabled on storage.objects
4. **SQL File 14**: Cannot disable RLS (no permission on Supabase managed tables)
5. **SQL File 17**: Checked bucket configuration - bucket exists correctly

### 4. Bucket Configuration
```
- Name: audiofiles
- Public: false
- File size limit: 50MB
- Allowed MIME types: ["audio/mpeg","audio/mp3","audio/wav","audio/x-wav"]
- Owner: NULL (might be causing issues)
```

### 5. Current Error Pattern
```
❌ Failed to upload to Supabase Storage: {'statusCode': 400, 'error': 'Unauthorized', 'message': 'new row violates row-level security policy'}
Supabase Storage error, falling back to local: Storage upload failed: Storage access denied.
Audio upload failed: [Errno 2] No such file or directory: '/app/uploads/...'
```

The error occurs when trying to upload to Supabase Storage bucket, then falls back to local storage which fails because the file was already processed.

## Code Changes Made

### Backend Changes:
1. `/backend/routes/upload_routes.py`:
   - Changed parameter names from snake_case to camelCase
   - Added lazy initialization for AudioService
   - Added debug logging

2. `/backend/services/audio_service.py`:
   - Added Supabase Storage support
   - Added storage backend detection

3. `/backend/services/supabase_storage_service.py`:
   - New service for Supabase Storage operations

### Frontend Changes:
1. `/frontend/js/modules/sections.js`:
   - Added project_id to upload requests
   - Added getSignedAudioUrl function

2. `/frontend/js/modules/ui.js`:
   - Added storage backend tracking to audio elements
   - Added initializeAudioUrls function

## SQL Files Created
- `09_add_storage_tracking.sql` - Adds storage quota tracking
- `10_create_storage_bucket_policies.sql` - Storage bucket RLS policies
- `11_fix_file_uploads_rls.sql` - Fix RLS for file_uploads table
- `12_fix_storage_bucket_service_role.sql` - Attempt to add service role bypass
- `13_debug_storage_policies.sql` - Debug queries
- `14_temporary_disable_storage_rls.sql` - Attempt to disable RLS (failed)
- `15_check_active_policies.sql` - Check active policies
- `16_alternative_storage_approach.sql` - Alternative approach
- `17_check_bucket_and_fix.sql` - Check bucket configuration

## Environment Variables Set
- `STORAGE_BACKEND=supabase` (in DigitalOcean app-level settings)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` all configured

## Next Steps to Try

1. **Make Bucket Public** (Current recommendation):
   - In Supabase Dashboard, change audiofiles bucket to public
   - This bypasses RLS policies
   - Test upload immediately

2. **Alternative: Recreate Bucket**:
   - Delete current bucket
   - Create new bucket without any RLS policies
   - Let Supabase handle auth with service key

3. **Check Supabase Project**:
   - Verify the service key is from the same project where SQL is run
   - Ensure no project mismatch

## Key Insight
The issue appears to be that Supabase's internal RLS policies on storage.objects cannot be overridden by user-created policies. The service_role should bypass RLS, but something is preventing this from working correctly.

## Test Results Needed
- Need to see logs AFTER making bucket public
- Current logs shown are all from before changes
- Need fresh upload attempt with timestamps after 23:00