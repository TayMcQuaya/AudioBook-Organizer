# Supabase Storage Migration Plan - AudioBook Organizer

## Overview
This document outlines the complete migration from local Docker storage to Supabase Storage for audio files. The migration fixes the critical issue where audio files are lost when Docker containers restart.

## Current State Analysis

### Problem
- Audio files stored in `/uploads` directory inside Docker container
- Files are lost on container restart (ephemeral storage)
- File paths stored in `chapters` JSONB column in `audiobook_projects` table
- No backup or persistence mechanism

### Current Implementation
- **Upload endpoint**: `/api/upload` in `backend/routes/upload_routes.py`
- **Audio service**: `backend/services/audio_service.py` handles file processing
- **Storage path**: `uploads/` directory (configured in `backend/config.py`)
- **File format**: MP3 files converted to WAV, stored with timestamp prefix
- **Frontend**: `attachAudio()` in `frontend/js/modules/sections.js`
- **Credit cost**: 2 credits per audio upload

### Existing Database Schema
- `file_uploads` table exists but is NOT currently used
- Audio paths stored directly in `chapters` JSONB as `section.audioPath`
- No relationship between audio files and `file_uploads` table

## Migration Strategy

### Storage Limits (with Supabase Pro Plan)
- **Per file limit**: 50MB (keep current limit)
- **Per user quota**:
  - Free users: 500MB total (~10 files)
  - Paid users (any credit purchase): 5GB total (~100 files)
- **Total Pro plan storage**: 100GB included

### Implementation Phases

## Phase 1: Database Schema Updates

### 1.1 Add Storage Tracking to user_credits
```sql
-- Add storage quota tracking
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS storage_quota_mb INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS storage_used_mb DECIMAL(10,2) DEFAULT 0;

-- Update quota for users who have made purchases
UPDATE public.user_credits uc
SET storage_quota_mb = 5120  -- 5GB in MB
WHERE EXISTS (
    SELECT 1 FROM public.credit_transactions ct
    WHERE ct.user_id = uc.user_id 
    AND ct.status = 'completed'
    AND ct.transaction_type = 'purchase'
);
```

### 1.2 Update file_uploads Table
```sql
-- Add missing columns for better tracking
ALTER TABLE public.file_uploads
ADD COLUMN IF NOT EXISTS file_size_mb DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'audiofiles',
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS public_url TEXT,
ADD COLUMN IF NOT EXISTS chapter_id INTEGER,
ADD COLUMN IF NOT EXISTS section_id INTEGER,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'uploading', 'processing', 'completed', 'failed'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_uploads_storage_path ON public.file_uploads(storage_path);
CREATE INDEX IF NOT EXISTS idx_file_uploads_chapter_section ON public.file_uploads(chapter_id, section_id);
```

## Phase 2: Supabase Storage Setup

### 2.1 Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket:
   - Name: `audiofiles`
   - Public: No (private bucket)
   - File size limit: 50MB
   - Allowed MIME types: `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`

### 2.2 Set RLS Policies
```sql
-- Policy 1: Users can upload their own files
CREATE POLICY "Users can upload audio files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'audiofiles' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can view their own files
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
```

## Phase 3: Backend Implementation

### 3.1 Update Environment Variables
```bash
# Add to .env and production environment
SUPABASE_STORAGE_URL=https://[project-id].supabase.co/storage/v1
STORAGE_BACKEND=supabase  # or 'local' for fallback
```

### 3.2 Create Supabase Storage Service
New file: `backend/services/supabase_storage_service.py`
- Upload files to Supabase Storage
- Generate signed URLs for playback
- Check user storage quota
- Update storage usage tracking

### 3.3 Update Audio Service
Modify `backend/services/audio_service.py`:
- Add Supabase Storage integration
- Keep local storage as fallback
- Update file paths to use Supabase URLs

### 3.4 Update Upload Route
Modify `backend/routes/upload_routes.py`:
- Check user storage quota before upload
- Create entry in `file_uploads` table
- Upload to Supabase Storage
- Update user's storage usage

## Phase 4: Frontend Updates

### 4.1 Update Audio URL Handling
Modify `frontend/js/modules/sections.js`:
- Handle Supabase Storage URLs (signed URLs)
- Update `validateAndRestoreAudioFiles()` for new URL format
- Add storage quota display in UI

### 4.2 Update Audio Player
- Support for signed URLs with expiration
- Refresh URLs if expired
- Handle CORS for Supabase domain

### 4.3 Add Storage Quota UI
- Show storage used/available in profile modal
- Warning when approaching limit
- Clear messaging about upgrade options

## Phase 5: Migration Script

### 5.1 Create Migration Tool
Script to migrate existing audio files:
1. Read all projects from database
2. For each audio file path:
   - Download from local storage
   - Upload to Supabase Storage
   - Update path in database
   - Create entry in `file_uploads` table
3. Verify all files migrated successfully

## Phase 6: Testing Plan

### 6.1 Test Scenarios
1. **New Upload**: Upload audio file, verify Supabase Storage
2. **Playback**: Test audio playback with signed URLs
3. **Storage Quota**: Test quota enforcement
4. **Project Save/Load**: Ensure paths persist correctly
5. **Docker Restart**: Verify files remain accessible
6. **Migration**: Test migration script on sample data

### 6.2 Rollback Plan
- Keep `STORAGE_BACKEND` environment variable
- Can switch back to local storage if issues
- Maintain backward compatibility for 30 days

## Implementation Order

1. **Database Changes** (30 min)
   - Run SQL updates for storage tracking
   - Verify schema changes

2. **Supabase Bucket Setup** (15 min)
   - Create bucket with policies
   - Test upload permissions

3. **Backend Services** (2 hours)
   - Create storage service
   - Update audio service
   - Modify upload routes

4. **Frontend Updates** (1 hour)
   - Update URL handling
   - Add quota UI
   - Test playback

5. **Migration Script** (1 hour)
   - Write migration tool
   - Test on dev data

6. **Testing & Deployment** (1 hour)
   - Full integration testing
   - Deploy to production
   - Monitor for issues

## Success Metrics

- Zero audio files lost after Docker restart
- All existing files successfully migrated
- Upload/playback performance acceptable
- Storage costs within budget
- User experience unchanged or improved

## Monitoring

- Track storage usage per user
- Monitor failed uploads
- Alert on quota exceeded
- Track migration progress

## Future Considerations

- ElevenLabs integration will use same storage system
- Consider CDN for global performance
- Implement audio compression to reduce storage
- Add batch upload capabilities

---

**Total Implementation Time**: ~6 hours
**Risk Level**: Medium (due to data migration)
**Rollback Time**: <10 minutes