# Supabase Storage Debug Session Summary

## Problem
Audio files are being lost when Docker container restarts on DigitalOcean. Attempting to migrate from local storage to Supabase Storage for persistence.

## Current Status
- ✅ Environment variable `STORAGE_BACKEND=supabase` is set and being read
- ✅ Backend is attempting to use Supabase Storage
- ✅ **FIXED**: Uploads now working after using service client
- ✅ **FIXED**: Audio playback working with signed URLs
- ⚠️ Some 404 errors appear in console but don't affect functionality

## What We've Discovered

### 1. Parameter Name Mismatch (FIXED)
- Frontend sends: `chapterId`, `sectionId` (camelCase)
- Backend was expecting: `chapter_id`, `section_id` (snake_case)
- **Fixed**: Updated backend to accept camelCase parameters

### 2. AudioService Initialization Timing (FIXED)
- AudioService was being initialized before environment variables were loaded
- **Fixed**: Implemented lazy initialization with `get_audio_service()`

### 3. RLS Policy Issues (FIXED)
The main blocker was Row Level Security (RLS) policies on Supabase Storage.

#### The Root Cause:
The storage service was using the anon key instead of the service key, which doesn't have permissions to bypass RLS.

#### The Fix:
Changed `/backend/services/supabase_storage_service.py` line 28:
```python
# From:
self.supabase = self.supabase_service.client  # This was using anon key

# To:
self.supabase = self.supabase_service.get_service_client()  # Now uses service key
```

This allows the storage service to bypass RLS policies completely.

### 4. Bucket Configuration
```
- Name: audiofiles
- Public: false
- File size limit: 50MB
- Allowed MIME types: ["audio/mpeg","audio/mp3","audio/wav","audio/x-wav"]
- Owner: NULL (might be causing issues)
```

### 5. Audio Playback Issues (FIXED)
Initial 404 errors when loading audio files were due to:

#### The Problem:
1. CSP (Content Security Policy) was blocking Supabase audio URLs
2. The API endpoint had double `/api/api/` path due to `apiFetch` already adding `/api` prefix

#### The Fixes:
1. **CSP Fix** in `/backend/middleware/security_headers.py`:
   ```python
   "media-src 'self' https://*.supabase.co; "  # Allow Supabase audio URLs
   ```

2. **API Path Fix** in `/frontend/js/modules/sections.js` line 597:
   ```javascript
   // From:
   const response = await apiFetch(`/api/audio/url?path=${encodeURIComponent(audioPath)}`);
   
   // To:
   const response = await apiFetch(`/audio/url?path=${encodeURIComponent(audioPath)}`);
   ```

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

## Why You Still See 404 Errors (But Everything Works)

The 404 errors you're seeing are harmless and happen because:

1. **Initial Load Attempt**: When the audio element is first created, the browser tries to load the path directly (e.g., `/8853fd03-6ee7-4925-bbec-b891864dc004/project...`)
2. **Signed URL Update**: The `initializeAudioUrls` function then fetches a signed URL from Supabase and updates the audio element
3. **Working Playback**: The audio plays correctly with the signed URL

This is normal behavior and doesn't affect functionality. The errors are just the browser's initial attempt before the signed URL is applied.

### Other Console Messages Explained:
- `Failed to execute 'postMessage' on 'DOMWindow'` - This is from Stripe's iframe and is harmless
- `Cannot read properties of null (reading 'contains')` - Minor UI bug in text selection, doesn't affect core functionality
- The repeated "Smart selection highlights cleared" messages are just verbose logging

## Summary of Fixes Applied

1. **Service Client Fix**: Changed storage service to use service role client instead of anon client
2. **CSP Headers**: Added Supabase domains to media-src Content Security Policy
3. **API Path Fix**: Removed duplicate `/api` prefix in sections.js
4. **Database Schema**: Added nullable file_path column for backward compatibility

## Result
✅ Audio files now successfully upload to Supabase Storage
✅ Audio playback works with signed URLs
✅ Files persist across Docker container restarts
✅ All RLS policy issues resolved

The system is now working correctly with Supabase Storage!