# Audio File Deletion Implementation Guide

## Overview
This document details the implementation of automatic audio file deletion from Supabase Storage when users remove audio files, delete sections, or delete chapters in the AudioBook Organizer application.

## Problem Statement
- Audio files uploaded to Supabase Storage were never deleted, even when users removed them from the UI
- This led to:
  - Storage bloat with orphaned files
  - Unnecessary storage costs
  - Inaccurate storage usage tracking
  - Potential quota issues for users

## Solution Architecture

### Design Principles
1. **Graceful Degradation**: Deletion failures should never block user operations
2. **Comprehensive Coverage**: Handle all deletion scenarios (remove, clear, delete section, delete chapter)
3. **Automatic Tracking**: Database triggers automatically update storage usage
4. **Error Resilience**: Operations continue even if storage deletion fails

### Technical Flow
```
User Action → Frontend → Backend API → Supabase Storage → Database Update
                ↓                              ↓                    ↓
           UI Update ← Success/Error ← File Deleted ← Usage Updated
```

## Implementation Details

### 1. Backend Delete Endpoint

**File**: `/backend/routes/upload_routes.py`

**Endpoint**: `POST /api/audio/delete`

```python
@app.route('/api/audio/delete', methods=['POST', 'OPTIONS'])
def delete_audio():
    """
    Delete audio file from Supabase Storage and database
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        # ... CORS headers ...
        return response
    
    # Authentication (supports both testing and normal modes)
    # ... auth logic ...
    
    # Process deletion request
    data = request.get_json()
    audio_path = data.get('audioPath')
    storage_backend = data.get('storageBackend', 'local')
    upload_id = data.get('uploadId')
    
    if storage_backend == 'supabase':
        # Delete from storage bucket
        storage_service.delete_audio_file(audio_path)
        
        # Delete database record (triggers storage usage update)
        if upload_id:
            supabase.table('file_uploads').delete()...
```

**Key Features**:
- Handles both Supabase and local storage backends
- Deletes from storage bucket first, then database
- Continues operation even if storage deletion fails
- Returns success even for partial failures (graceful degradation)

### 2. Frontend Updates

#### 2.1 Remove Audio Function
**File**: `/frontend/js/modules/sections.js`

```javascript
export async function removeAudio(chapterId, sectionId) {
    const section = chapter?.sections.find(s => s.id === sectionId);
    
    // If using Supabase Storage, delete the file first
    if (section.storageBackend === 'supabase' && section.audioPath) {
        try {
            const response = await apiFetch('/audio/delete', {
                method: 'POST',
                body: JSON.stringify({
                    audioPath: section.audioPath,
                    storageBackend: section.storageBackend,
                    uploadId: section.uploadId
                })
            });
            
            if (!response.ok) {
                // Show warning but continue with removal
                showWarning('Audio file could not be deleted from storage...');
            }
        } catch (error) {
            // Continue with removal even if delete fails
        }
    }
    
    // Clear section audio data
    section.audioPath = null;
    section.storageBackend = null;
    section.uploadId = null;
    // ... rest of cleanup ...
}
```

#### 2.2 Clear Missing Audio Function
**File**: `/frontend/js/modules/sections.js`

Similar implementation but specifically for corrupted/missing files:
- Attempts to delete database record even if file is missing
- Uses `originalAudioPath` as fallback
- Clears all audio-related properties

#### 2.3 Delete Section Function
**File**: `/frontend/js/modules/sections.js`

```javascript
export async function deleteSection(chapterId, sectionId) {
    // Find section and check for audio
    const section = chapter.sections.find(s => s.id === sectionId);
    
    // Delete audio if exists
    if (section && section.storageBackend === 'supabase' && section.audioPath) {
        // ... deletion logic ...
    }
    
    // Continue with section deletion regardless
    removeHighlightFromText(sectionId);
    chapter.sections = chapter.sections.filter(s => s.id !== sectionId);
}
```

#### 2.4 Delete Chapter Function
**File**: `/frontend/js/modules/chapters.js`

```javascript
export function deleteChapter(chapterId) {
    showConfirm('Are you sure...', async () => {
        // Delete all Supabase audio files in parallel
        const audioDeletePromises = chapter.sections
            .filter(section => section.storageBackend === 'supabase' && section.audioPath)
            .map(section => {
                return apiFetch('/audio/delete', {...})
                    .catch(error => {
                        console.error(`Failed to delete audio...`);
                        return null; // Don't fail the whole operation
                    });
            });
        
        // Wait for all deletions to complete
        await Promise.allSettled(audioDeletePromises);
        
        // Continue with chapter deletion
        removeChapterHighlights(chapterId);
        removeChapter(chapterId);
    });
}
```

**Key Features**:
- Uses `Promise.allSettled()` for parallel deletion
- Individual failures don't block chapter deletion
- Comprehensive logging for debugging

### 3. UI Handler Updates

**File**: `/frontend/js/modules/ui.js`

Updated all onclick handlers to prevent default behavior:
```javascript
// Before:
<button onclick="removeAudio(${chapter.id}, ${section.id})">Remove Audio</button>

// After:
<button onclick="event.preventDefault(); removeAudio(${chapter.id}, ${section.id})">Remove Audio</button>
```

This prevents form submission and ensures proper async handling.

## Database Integration

### Storage Tracking
The database automatically tracks storage usage through triggers:

**File**: `/sql/09_add_storage_tracking.sql`

```sql
CREATE OR REPLACE FUNCTION public.update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' AND OLD.upload_status = 'completed' THEN
        -- Decrease storage usage
        UPDATE user_credits
        SET storage_used_mb = GREATEST(0, COALESCE(storage_used_mb, 0) - COALESCE(OLD.file_size_mb, 0))
        WHERE user_id = OLD.user_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;
```

This ensures:
- Storage usage is automatically decremented when files are deleted
- User quotas are accurately maintained
- No manual tracking needed

## Error Handling Strategy

### Frontend
1. **Try-Catch Blocks**: All deletion calls are wrapped in try-catch
2. **Warning Toasts**: Users see warnings if deletion fails, but can continue
3. **Console Logging**: Detailed error logging for debugging
4. **Operation Continuation**: UI updates proceed regardless of deletion success

### Backend
1. **Partial Success**: Returns success even if only database record is deleted
2. **Detailed Logging**: Logs all deletion attempts and failures
3. **Error Messages**: Provides context in error responses
4. **Graceful Fallback**: Local storage files just return success (no-op)

## API Design

### Request
```http
POST /api/audio/delete
Content-Type: application/json
Authorization: Bearer <token>

{
    "audioPath": "user_id/project_id/file.wav",
    "storageBackend": "supabase",
    "uploadId": "uuid-here"
}
```

### Response
```json
{
    "success": true,
    "message": "Audio file deleted successfully"
}
```

### Error Response
```json
{
    "success": false,
    "error": "Failed to delete file: <error details>"
}
```

## CORS and Authentication

### CORS Handling
- **Production**: No CORS needed (unified deployment)
- **Development**: Proper CORS headers configured
- **OPTIONS**: Preflight requests handled explicitly

### Authentication Support
1. **Testing Mode**: Uses session-based temp auth
2. **Normal Mode**: Uses Bearer token from Supabase
3. **User Context**: Properly extracts user_id for database operations

## Testing Checklist

### Manual Testing Steps
1. **Remove Audio Button**
   - Upload audio file
   - Click "Remove Audio"
   - Verify: File deleted from bucket, UI updated
   
2. **Clear Missing Audio**
   - Delete file manually from bucket
   - Click "Clear" on warning
   - Verify: Database record removed
   
3. **Delete Section**
   - Create section with audio
   - Delete the section
   - Verify: Audio deleted before section
   
4. **Delete Chapter**
   - Create chapter with multiple audio sections
   - Delete entire chapter
   - Verify: All audio files deleted

### Verification Points
- Check Supabase Storage bucket for file removal
- Query `file_uploads` table for record deletion
- Verify `user_credits.storage_used_mb` is updated
- Monitor console for success/error messages

## Benefits

1. **Storage Efficiency**: No orphaned files consuming space
2. **Cost Savings**: Reduced storage costs
3. **Accurate Tracking**: Storage usage always reflects reality
4. **User Experience**: Clean, predictable behavior
5. **Scalability**: Prevents storage bloat over time

## Future Enhancements

1. **Batch Operations**: Delete multiple files in single API call
2. **Background Cleanup**: Periodic job to clean orphaned files
3. **Soft Delete**: Option to move to "trash" before permanent deletion
4. **Recovery Options**: Ability to restore recently deleted files
5. **Admin Dashboard**: View and manage all storage usage

## Troubleshooting

### Common Issues

1. **404 on Delete**
   - Check if file exists in bucket
   - Verify storage_path format
   - Confirm user has permission

2. **Database Record Not Deleted**
   - Check upload_id is correct
   - Verify user_id matches
   - Look for RLS policy issues

3. **Storage Usage Not Updated**
   - Check trigger is active
   - Verify file_size_mb is set
   - Look for trigger execution errors

### Debug Commands

```sql
-- Check file uploads for user
SELECT id, storage_path, file_size_mb, upload_status 
FROM file_uploads 
WHERE user_id = '<user_id>';

-- Check storage usage
SELECT storage_used_mb, storage_quota_mb 
FROM user_credits 
WHERE user_id = '<user_id>';

-- Monitor trigger execution
SELECT * FROM pg_trigger WHERE tgname = 'update_storage_usage_trigger';
```

## Conclusion

This implementation provides a robust, user-friendly solution for managing audio file deletion in Supabase Storage. By following the principle of graceful degradation and comprehensive error handling, users can confidently manage their audio files without worrying about storage bloat or failed operations.