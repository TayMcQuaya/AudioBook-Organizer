# Supabase Storage Testing Guide

This guide covers testing the complete Supabase Storage implementation for audio files.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Local testing (keep using local storage)
   STORAGE_BACKEND=local
   
   # Production (use Supabase Storage)
   STORAGE_BACKEND=supabase
   ```

2. **Database Setup**
   - Run SQL files in order (09 and 10)
   - Create `audiofiles` bucket in Supabase Dashboard

## Testing Checklist

### 1. Storage Bucket Setup
- [ ] Create `audiofiles` bucket in Supabase Dashboard
- [ ] Set bucket to private (not public)
- [ ] Set file size limit to 50MB
- [ ] Set allowed MIME types: `audio/mpeg,audio/mp3,audio/wav,audio/x-wav`

### 2. SQL Execution
```sql
-- Run these in order:
-- 1. Run 09_add_storage_tracking.sql
-- 2. Create bucket in Supabase Dashboard
-- 3. Run 10_create_storage_bucket_policies.sql
```

### 3. Local Testing (with STORAGE_BACKEND=local)

#### A. Upload Test
1. Upload a new audio file to a section
2. Verify:
   - [ ] File uploads successfully
   - [ ] Audio plays in the UI
   - [ ] Storage quota is updated (check user_credits table)
   - [ ] File is saved to local `/uploads` directory

#### B. Playback Test
1. Refresh the page
2. Verify:
   - [ ] Audio files still play correctly
   - [ ] No console errors

#### C. Project Save/Restore Test
1. Save the project
2. Clear browser storage
3. Restore the project
4. Verify:
   - [ ] All audio files are restored
   - [ ] Audio playback works

### 4. Supabase Storage Testing (with STORAGE_BACKEND=supabase)

#### A. Upload Test
1. Change `STORAGE_BACKEND=supabase` in `.env`
2. Restart the backend
3. Upload a new audio file
4. Verify:
   - [ ] File uploads successfully
   - [ ] Check Supabase Dashboard → Storage → audiofiles bucket
   - [ ] File appears in correct path: `user_id/project_id/chapter_id/section_id/filename`
   - [ ] Audio plays in the UI using signed URL
   - [ ] Storage quota is updated

#### B. Signed URL Test
1. Check browser network tab
2. Verify:
   - [ ] Audio URLs contain `token` parameter
   - [ ] URLs expire after 1 hour
   - [ ] New URLs are fetched when needed

#### C. Storage Quota Test
1. Check user's storage quota:
   ```sql
   SELECT storage_quota_mb, storage_used_mb 
   FROM user_credits 
   WHERE user_id = 'YOUR_USER_ID';
   ```
2. Upload files until near quota
3. Verify:
   - [ ] Warning shown when approaching limit
   - [ ] Upload blocked when quota exceeded
   - [ ] Appropriate error message displayed

#### D. Cross-Session Test
1. Upload audio files in one browser
2. Login from different browser/device
3. Restore the project
4. Verify:
   - [ ] All audio files play correctly
   - [ ] No "missing audio" warnings

### 5. Migration Testing

#### A. Dry Run Test
```bash
cd backend
python scripts/migrate_audio_to_supabase.py
```
Verify:
- [ ] Script finds all local audio files
- [ ] Shows what would be migrated
- [ ] No actual changes made

#### B. Real Migration (Optional)
```bash
# Actually migrate files
python scripts/migrate_audio_to_supabase.py --execute

# Migrate and delete local files
python scripts/migrate_audio_to_supabase.py --execute --delete-after
```

### 6. Error Handling Tests

#### A. Network Failure
1. Disconnect internet while uploading
2. Verify:
   - [ ] Appropriate error message shown
   - [ ] No partial uploads left in storage

#### B. Expired URL
1. Wait for signed URL to expire (>1 hour)
2. Try to play audio
3. Verify:
   - [ ] New signed URL is fetched automatically
   - [ ] Audio plays without user intervention

#### C. Missing File
1. Delete an audio file from Supabase Storage
2. Load the project
3. Verify:
   - [ ] "Missing audio" warning shown
   - [ ] Option to re-upload the file
   - [ ] Other audio files still work

### 7. Performance Tests

#### A. Large File Upload
1. Upload a 45MB audio file
2. Verify:
   - [ ] Upload completes successfully
   - [ ] Progress indicator works
   - [ ] No timeout errors

#### B. Multiple Concurrent Uploads
1. Upload audio to multiple sections quickly
2. Verify:
   - [ ] All uploads complete
   - [ ] Storage quota updated correctly
   - [ ] No race conditions

### 8. Production Deployment Checklist

- [ ] Set `STORAGE_BACKEND=supabase` in DigitalOcean env vars
- [ ] Verify Supabase connection from DigitalOcean
- [ ] Test upload from production site
- [ ] Monitor Supabase Storage dashboard for usage
- [ ] Set up storage usage alerts if needed

## Troubleshooting

### Common Issues

1. **"Failed to upload to Supabase Storage"**
   - Check Supabase service key is correct
   - Verify bucket exists and has correct policies
   - Check file size and MIME type

2. **"Audio won't play"**
   - Check if signed URL is valid (not expired)
   - Verify RLS policies allow read access
   - Check browser console for CORS errors

3. **"Storage quota exceeded"**
   - Check user's storage usage in database
   - Verify quota calculation is correct
   - Consider upgrading user's storage limit

### Debug Commands

```bash
# Check storage usage for a user
curl -X GET "http://localhost:5000/api/user/storage-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get signed URL for testing
curl -X GET "http://localhost:5000/api/audio/url?path=USER_ID/PROJECT_ID/audio.mp3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Success Criteria

The migration is successful when:
1. ✅ All new audio uploads go to Supabase Storage
2. ✅ Existing audio files still work (backward compatibility)
3. ✅ Audio playback works across sessions and devices
4. ✅ Storage quotas are enforced correctly
5. ✅ No audio files are lost when Docker container restarts