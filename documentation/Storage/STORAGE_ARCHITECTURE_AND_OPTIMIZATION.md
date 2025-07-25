# Storage Architecture and Optimization Guide

## Current Storage Implementation

### Overview
The AudioBook Organizer uses Supabase Storage for persisting audio files across Docker container restarts. The current implementation is actually quite efficient, despite initial appearances.

### How Storage Actually Works

**IMPORTANT CLARIFICATION**: The system does NOT duplicate existing audio files when restoring projects. Each restore creates a new project folder, but only NEW audio uploads go into these folders.

### Storage Structure Example
```
audiofiles/                                 # Root bucket
├── {user_id}/                             # User isolation
│   ├── project_{uuid1}/                   # Original project upload
│   │   ├── chapter_1/
│   │   │   ├── section_1/audio_file.mp3  # Uploaded in session 1
│   │   │   └── section_2/audio_file.mp3  # Uploaded in session 1
│   │   └── chapter_2/
│   │       └── section_1/audio_file.mp3  # Uploaded in session 1
│   │
│   ├── project_{uuid2}/                   # After restore/refresh
│   │   └── chapter_3/
│   │       └── section_1/new_audio.mp3   # NEW audio added in session 2
│   │                                      # Old audio still referenced from uuid1
│   │
│   └── project_{uuid3}/                   # After another restore
│       └── chapter_1/
│           └── section_5/another_new.mp3  # NEW audio added in session 3
```

## What Really Happens During Restore

### 1. Project Restore Process
When a project is restored from JSON:
- A new project UUID is generated
- Existing audio paths are preserved in the JSON
- No re-upload of existing audio occurs
- Only new audio uploads use the new project folder

### 2. Example Project JSON Structure
```json
{
  "id": "new-uuid-456",  // New ID generated on restore
  "chapters": [{
    "sections": [{
      "audio": "user-123/project_uuid1/chapter_1/section_1/audio.mp3", // Preserved path
      "hasAudio": true,
      "audioUrl": "signed-url-to-existing-file"  // Still points to original
    }]
  }]
}
```

### 2. Code Analysis
From `/backend/services/supabase_storage_service.py`:
```python
def upload_audio_file(self, file_content: bytes, user_id: str, project_id: str, 
                     chapter_id: int, section_id: int, filename: str) -> tuple[bool, str]:
    # Path includes project_id which changes on each restore
    file_path = f"{user_id}/project_{project_id}/chapter_{chapter_id}/section_{section_id}/{filename}"
```

From `/frontend/js/modules/bookUpload.js`:
```javascript
// When restoring a project, new IDs are generated
const projectData = {
    id: crypto.randomUUID(),  // New ID every time!
    name: jsonData.name,
    // ... rest of data
};
```

## Actual Storage Behavior

### The Only Duplication Scenario
Audio duplication only occurs when:
1. User uploads the same audio file to multiple sections
2. User uploads similar audio content with different filenames

This is legitimate usage, not a system inefficiency.

### Why This is Actually Efficient

1. **No Redundant Uploads**
   - Existing audio is never re-uploaded on restore
   - JSON preserves original storage paths
   - Only genuinely new content uses storage

2. **Clear Audit Trail**
   - Can see when audio was added (by project folder date)
   - Easy to track storage growth
   - Simple debugging of audio issues

3. **Scattered but Functional**
   - Audio files spread across project folders
   - System correctly tracks all paths
   - No functional impact on users

## Pros and Cons Analysis

### Advantages of Current Approach

1. **Storage Efficiency**
   - No duplicate uploads on restore ✅
   - Only new audio uses new storage ✅
   - Minimal waste

2. **Data Integrity**
   - Each session's uploads are isolated
   - No accidental overwrites
   - Clear ownership

3. **Simplicity**
   - No complex deduplication needed
   - Straightforward implementation
   - Easy to understand

### Minor Disadvantages

1. **Folder Proliferation**
   - Multiple project folders created
   - Can be confusing when browsing storage
   - But no actual storage waste

2. **Cross-Section Duplication**
   - Same audio in different sections = duplicate storage
   - This is a legitimate use case
   - Could be optimized with content-addressing

## Storage Cost Analysis

### Corrected Scenario
- Average audio file: 5MB
- Audiobook with 50 sections: 250MB (initial upload)
- User restores project 10 times: Still ~250MB (no re-uploads!)
- Add 5 new audio files per restore: +25MB × 10 = 250MB
- Total after 10 restores: ~500MB (not 2.5GB!)
- 100 active users: ~50GB total storage (not 250GB!)

### Supabase Storage Pricing (as of 2024)
- First 1GB: Free
- Additional storage: $0.021 per GB/month
- Bandwidth: $0.09 per GB

### Corrected Monthly Cost Projection
```
Storage: 50GB × $0.021 = $1.05/month
Bandwidth (assuming 2x storage): 100GB × $0.09 = $9/month
Total: ~$10/month for 100 active users (not $50!)
```

**The current implementation is 5x more efficient than initially calculated!**

## Optimization Strategies

### Option 1: Content-Based Addressing (Recommended)
Store files by content hash instead of project structure:

```python
# In audio_service.py
import hashlib

def get_content_hash(file_content: bytes) -> str:
    return hashlib.sha256(file_content).hexdigest()

def upload_audio_with_dedup(self, file_content: bytes, user_id: str, 
                           project_id: str, chapter_id: int, section_id: int):
    # Generate content hash
    content_hash = self.get_content_hash(file_content)
    
    # Check if file already exists
    existing_path = f"{user_id}/audio_pool/{content_hash}.mp3"
    if self.file_exists(existing_path):
        # Just create a reference in database
        return self.create_audio_reference(
            user_id, project_id, chapter_id, section_id, existing_path
        )
    
    # Upload new file
    return self.upload_new_audio(file_content, existing_path, ...)
```

**Database Schema Change:**
```sql
-- Add audio_references table
CREATE TABLE audio_references (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    project_id UUID,
    chapter_id INTEGER,
    section_id INTEGER,
    storage_path TEXT,  -- Points to deduplicated file
    original_filename TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Option 2: Project Name-Based Paths
Use stable project names instead of UUIDs:

```javascript
// In bookUpload.js
function generateStableProjectId(projectName, userId) {
    // Create deterministic ID from project name
    return `${userId}_${projectName.toLowerCase().replace(/\s+/g, '-')}`;
}
```

**Risks:**
- Name collisions
- Special character handling
- Rename complications

### Option 3: Hybrid Approach
Keep current structure but add cleanup:

```python
# Scheduled cleanup job
async def cleanup_orphaned_projects():
    # Find project folders not in database
    storage_projects = await list_storage_projects()
    db_projects = await get_active_projects()
    
    orphaned = storage_projects - db_projects
    for project in orphaned:
        if project.age > 30_days:
            await delete_project_folder(project)
```

## Implementation Recommendations

### Short Term (Current Approach is Fine)
- Storage costs are minimal for current scale
- Focus on core features over optimization
- Monitor storage growth patterns

### Medium Term (100+ Active Users)
- Implement content-based deduplication
- Add storage analytics dashboard
- Set up automated cleanup jobs

### Long Term (1000+ Users)
- Consider CDN for audio delivery
- Implement tiered storage (hot/cold)
- Add compression for inactive projects

## Migration Strategy

If implementing deduplication later:

1. **Phase 1: Dual Write**
   ```python
   # Write to both old and new structure
   old_path = f"{user_id}/project_{project_id}/..."
   new_path = f"{user_id}/audio_pool/{content_hash}.mp3"
   ```

2. **Phase 2: Migration Script**
   ```python
   # Scan existing files, deduplicate, update references
   for file in existing_files:
       hash = calculate_hash(file)
       move_to_pool(file, hash)
       update_references(file.path, new_path)
   ```

3. **Phase 3: Cleanup**
   - Remove old project folders
   - Update upload logic
   - Monitor for issues

## Monitoring and Maintenance

### Key Metrics to Track
```sql
-- Storage usage by user
SELECT 
    user_id,
    COUNT(DISTINCT project_id) as project_count,
    COUNT(*) as total_files,
    SUM(file_size_mb) as total_size_mb
FROM file_uploads
GROUP BY user_id
ORDER BY total_size_mb DESC;

-- Duplicate detection
SELECT 
    file_size_mb,
    COUNT(*) as duplicate_count
FROM file_uploads
GROUP BY file_size_mb, user_id
HAVING COUNT(*) > 1;
```

### Automated Alerts
- Storage usage > 80% of quota
- Rapid growth in storage (>10GB/day)
- Failed cleanup jobs
- Orphaned files > 30 days old

## Conclusion

The current storage architecture is **much more efficient than initially thought**. There is no duplicate storage issue on restore - only new audio files create new storage usage. The system is well-designed and cost-effective.

### Corrected Decision Matrix
| Factor | Current Approach | Content-Based Dedup |
|--------|-----------------|-------------------|
| Complexity | Low ✅ | High ❌ |
| Storage Efficiency | Good ✅ | Excellent ✅ |
| Data Integrity | High ✅ | Medium ⚠️ |
| Implementation Time | Done ✅ | 2-3 weeks ❌ |
| Maintenance | Low ✅ | Medium ⚠️ |
| Actual Need | No ✅ | Not justified ❌ |

**Updated Recommendation:** The current approach is excellent. No optimization needed until you have 1000+ active users or specific use cases with heavy cross-section audio duplication.

### Key Insights
1. **No duplication on restore** - System correctly preserves existing audio paths
2. **Minimal storage waste** - Only genuinely new content uses storage  
3. **Cost-effective** - ~$10/month for 100 users is very reasonable
4. **Well-architected** - The scattered folders are cosmetic, not functional issues

The system is working exactly as it should! 🎉

## Audio Loss Prevention System

### The Challenge
When users upload a new text file without saving their current project, any audio files associated with the current project become orphaned in storage. While the audio files remain in Supabase Storage, the references to them are lost.

### Initial Solution Attempt
The first implementation tracked `lastProjectSaveTime` and compared it with `lastAudioAddedTime`. However, this approach had a critical flaw:

```javascript
// Problem: Auto-save interferes with detection
autoSaveInterval = setInterval(() => {
    saveToDatabase();  // Updates lastProjectSaveTime
}, 30000);  // Every 30 seconds

// Also triggers on any change after 2 seconds
triggerAutoSave() -> saveToDatabase() -> updates lastProjectSaveTime
```

Since the project auto-saves to the database every 30 seconds and after changes, the warning would rarely trigger.

### Improved Solution
The system now differentiates between:
1. **Auto-saves to database** - Preserves work automatically
2. **Manual JSON exports** - User's explicit action to save complete project

#### Implementation Details

**1. Track Manual Exports Separately**
```javascript
// In storage.js - saveProgress()
localStorage.setItem('lastManualExportTime', new Date().toISOString());
```

**2. Check for Unxported Audio**
```javascript
// In bookUpload.js - hasUnsavedAudio()
function hasUnsavedAudio() {
    // Check if any section has audio
    const hasAudio = chapters.some(chapter => 
        chapter.sections?.some(section => 
            section.audioPath || section.storageBackend
        )
    );
    
    if (!hasAudio) return false;
    
    // Check if user has ever manually exported
    const lastManualExportTime = localStorage.getItem('lastManualExportTime');
    if (!lastManualExportTime) return true;
    
    // Check if audio was added after last export
    const lastAudioAddedTime = localStorage.getItem('lastAudioAddedTime');
    if (lastAudioAddedTime && new Date(lastAudioAddedTime) > new Date(lastManualExportTime)) {
        return true;
    }
    
    return false;
}
```

**3. Clear Warning Message**
```javascript
showConfirm(
    'You have audio files that haven\'t been exported to JSON. ' +
    'Uploading a new text will clear all current work including audio. ' +
    'To save your audio references, use "Save Progress" to export your ' +
    'project as JSON before continuing. Do you want to continue without exporting?',
    // ... callbacks
    'Continue Without Export',
    'Cancel & Export First'
);
```

### How It Works

1. **Auto-save continues normally**
   - Every 30 seconds
   - 2 seconds after changes
   - Ensures work isn't lost

2. **Warning appears only when**:
   - User has audio files in current project
   - AND hasn't exported to JSON since adding audio
   - Auto-saves don't affect this check

3. **User guidance**:
   - Clear message about JSON export
   - Specific instruction to use "Save Progress"
   - Meaningful button labels

4. **Fresh start on new upload**:
   ```javascript
   // Clear timestamps when uploading new text
   localStorage.removeItem('lastManualExportTime');
   localStorage.removeItem('lastAudioAddedTime');
   ```

### Benefits

1. **No false positives** - Auto-save doesn't trigger unnecessary warnings
2. **Clear user action** - Distinguishes between automatic and manual saves
3. **Better UX** - Users understand exactly what to do
4. **Preserves audio** - Encourages JSON export before losing references

### Edge Cases Handled

1. **Never exported** - Warns if audio exists but no JSON export ever made
2. **Audio after export** - Warns if new audio added since last export
3. **No audio** - No warning if project has no audio files
4. **New project** - Clears tracking for fresh start

This solution elegantly balances automatic work preservation with user awareness of manual export needs.