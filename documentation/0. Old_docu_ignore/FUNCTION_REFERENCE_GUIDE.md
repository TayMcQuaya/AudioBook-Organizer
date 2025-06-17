# 📚 AI Agent Function Reference & Implementation Rules

## 🚨 CRITICAL RULES FOR AI AGENTS

### **MANDATORY PRE-IMPLEMENTATION CHECKS**
1. **ALWAYS** read and analyze existing code in target files before writing new code
2. **NEVER** assume functionality exists - verify by reading the actual file contents
3. **SCAN** for existing similar functions to avoid duplication
4. **PRESERVE** all existing logic unless explicitly told to modify it
5. **EXTEND** existing patterns rather than creating new ones

### **REDUNDANCY PREVENTION PROTOCOL**
```
BEFORE implementing ANY feature:
1. READ target file completely (use read_file tool)
2. SEARCH for similar functionality (use grep_search)
3. CHECK import/export patterns in existing files
4. VERIFY authentication patterns match existing code
5. CONFIRM database interaction patterns
```

### **CODE MODIFICATION RULES**
- ✅ **EXTEND** existing functions with new parameters
- ✅ **ADD** new functions that follow existing patterns
- ✅ **MODIFY** only the specific parts mentioned in requirements
- ❌ **NEVER** change existing function signatures without explicit instruction
- ❌ **NEVER** remove existing functionality
- ❌ **NEVER** create duplicate functions

---

## 📁 ACTUAL CODEBASE STRUCTURE (VERIFIED)

### **Backend Python Files**
```
backend/
├── utils/
│   ├── audio_utils.py           # convert_mp3_to_wav(), process_audio_file()
│   └── file_utils.py           # generate_unique_filename(), ensure_directories_exist()
├── services/
│   ├── export_service.py       # export_audiobook(), _merge_chapter_audio()
│   ├── supabase_service.py     # get_user_credits(), update_user_credits(), log_usage()
│   └── security_service.py     # verify_recaptcha(), check_rate_limit()
├── routes/
│   ├── auth_routes.py          # /api/auth/login, /api/auth/verify routes
│   ├── export_routes.py        # /api/export route
│   └── upload_routes.py        # /api/upload route
└── middleware/
    └── auth_middleware.py      # require_auth decorator
```

### **Frontend JavaScript Modules**
```
frontend/js/modules/
├── auth.js                     # AuthModule singleton, apiRequest()
├── sessionManager.js           # Session state management
├── router.js                   # Page routing with auth guards
├── state.js                    # Global app state (chapters, bookText)
├── export.js                   # startExport(), importExportedContent()
├── chapters.js                 # createNewChapter(), ChapterAudioPlayer class
├── sections.js                 # attachAudio(), removeAudio(), createSection()
├── ui.js                       # updateChaptersList(), showExportModal()
└── notifications.js            # showSuccess(), showError(), showConfirm()
```

---

## 🔍 EXACT FUNCTION INVENTORY (CURRENT STATE)

### **Audio Processing - VERIFIED IMPLEMENTATIONS**

#### `backend/utils/audio_utils.py`
- `convert_mp3_to_wav(temp_path, output_path)` - Uses pydub AudioSegment.from_mp3()
- `process_audio_file(temp_path, original_filename, upload_folder, timestamp)` - Handles MP3→WAV conversion

#### `frontend/js/modules/sections.js`
- `attachAudio(chapterId, sectionId, input)` - Upload audio via FormData to /api/upload
- `removeAudio(chapterId, sectionId)` - Remove audio from section, clear audioPath

**🎯 EXTENSION POINTS FOR AUDIO CUTTING:**
- Add new functions in `audio_utils.py`: `cut_audio(input_path, start_ms, end_ms, output_path)`
- Extend `sections.js` with timeline UI components

### **Export System - VERIFIED IMPLEMENTATIONS**

#### `backend/services/export_service.py`
- `export_audiobook(data)` - Main export function with ZIP creation
- `_merge_chapter_audio(audio_files, chapter_dir, chapter_idx, export_options)` - Uses pydub AudioSegment

**⚠️ CURRENT FORMAT SUPPORT:** Only WAV export implemented
**🎯 MP3 EXTENSION POINT:** Modify `_merge_chapter_audio()` to accept format parameter

#### `frontend/js/modules/export.js`
- `startExport()` - Collects export options from DOM, calls /api/export
- `importExportedContent(exportId)` - Loads metadata.json from previous exports

**🎯 CHAPTER SELECTION EXTENSION:** Modify `startExport()` to filter chapters array

### **Authentication - VERIFIED PATTERNS**

#### `frontend/js/modules/auth.js` (Singleton Pattern)
- `signIn(email, password, recaptchaToken)` - Supabase authentication
- `apiRequest(endpoint, options)` - Authenticated API calls with JWT headers
- `getCurrentUser()` - Returns current user object

**🔑 CRITICAL ACCESS PATTERN:** Always use `window.authModule.functionName()`

#### `backend/services/supabase_service.py`
- `get_user_credits(user_id)` - Returns integer credit balance
- `update_user_credits(user_id, credit_change)` - Add/subtract credits
- `log_usage(user_id, action, credits_used, metadata)` - Activity logging

### **State Management - VERIFIED IMPLEMENTATIONS**

#### `frontend/js/modules/state.js`
- `chapters` (array) - Global chapters array
- `setChapters(newChapters)` - Update chapters array
- `findChapter(chapterId)` - Lookup chapter by ID
- `addChapter(chapter)` - Add new chapter to array

**🎯 COLLABORATION EXTENSION POINT:** Add user identification to chapter/section objects

### **UI Functions - VERIFIED IMPLEMENTATIONS**

#### `frontend/js/modules/chapters.js`
- `createNewChapter()` - Creates chapter with auto-incrementing name
- `ChapterAudioPlayer` class - Audio playback for chapters
- `toggleChapterPlayback(chapterId)` - Play/pause chapter audio

#### `frontend/js/modules/ui.js`
- `updateChaptersList()` - Refresh chapter display
- `showExportModal()` / `hideExportModal()` - Export dialog management

---

## 🚀 IMPLEMENTATION ROADMAP FOR REQUESTED FEATURES

### **1. MP3 Export (PRIORITY 1)**
**Files to Modify:**
- `backend/services/export_service.py._merge_chapter_audio()`
- `frontend/pages/app/app.html` (export modal)
- `frontend/js/modules/export.js.startExport()`

**Implementation Steps:**
```python
# 1. Modify _merge_chapter_audio() in export_service.py
def _merge_chapter_audio(self, audio_files, chapter_dir, chapter_idx, export_options):
    # ADD: format parameter support
    output_format = export_options.get('audioFormat', 'wav')  # NEW
    file_extension = 'mp3' if output_format == 'mp3' else 'wav'  # NEW
    
    # MODIFY: file path to use dynamic extension
    chapter_audio_path = os.path.join(chapter_dir, f"chapter_{chapter_idx+1}_merged.{file_extension}")
    
    # MODIFY: export call to use format parameter
    merged_audio.export(chapter_audio_path, format=output_format)  # CHANGED
```

### **2. Chapter Selection Export (PRIORITY 2)**
**Files to Modify:**
- `frontend/pages/app/app.html` (add checkboxes)
- `frontend/js/modules/export.js.startExport()`

**Implementation Steps:**
```javascript
// 1. Modify startExport() in export.js
export async function startExport() {
    // ADD: Filter selected chapters
    const selectedChapters = chapters.filter(chapter => {
        const checkbox = document.getElementById(`export-chapter-${chapter.id}`);
        return checkbox ? checkbox.checked : true; // Default to include if no checkbox
    });
    
    const exportOptions = {
        // ... existing options
        chapters: selectedChapters.map(chapter => ({ // MODIFIED
            ...chapter,
            sections: chapter.sections.map(section => ({
                ...section,
                chapterName: chapter.name
            }))
        })),
        // ... rest unchanged
    };
}
```

### **3. Audio Cutting Tool (PRIORITY 3)**
**New Files Needed:**
- `frontend/js/modules/audioCutter.js` (new)
- `backend/utils/audio_cutting.py` (new)

**Extension Points:**
```python
# backend/utils/audio_cutting.py (NEW FILE)
def cut_audio_segment(input_path, start_ms, end_ms, output_path):
    """Cut audio segment using pydub"""
    audio = AudioSegment.from_wav(input_path)
    segment = audio[start_ms:end_ms]
    segment.export(output_path, format='wav')
    return output_path
```

### **4. Collaboration V1 (PRIORITY 4)**
**Files to Modify:**
- `frontend/js/modules/state.js` (add user IDs)
- `frontend/js/modules/export.js` (enhanced import/export)
- `backend/services/supabase_service.py` (project management)

**Implementation Pattern:**
```javascript
// EXTEND chapter/section objects with user identification
const chapter = {
    id: Date.now(),
    name: `Chapter ${chapters.length + 1}`,
    createdBy: window.authModule.getCurrentUser().id,  // NEW
    lastModifiedBy: window.authModule.getCurrentUser().id,  // NEW
    lastModified: new Date().toISOString(),  // NEW
    // ... existing properties
};
```

---

## ⚠️ ANTI-PATTERNS TO AVOID

### **Authentication Mistakes**
❌ **DON'T:** Create new auth checking functions
✅ **DO:** Use existing `window.authModule.isAuthenticated()`

❌ **DON'T:** Manual JWT token handling
✅ **DO:** Use `window.authModule.apiRequest(endpoint, options)`

### **State Management Mistakes**
❌ **DON'T:** Direct chapter array manipulation
✅ **DO:** Use `setChapters()`, `addChapter()`, `findChapter()`

❌ **DON'T:** Create new state storage mechanisms
✅ **DO:** Extend existing state.js patterns

### **Audio Processing Mistakes**
❌ **DON'T:** Create new audio conversion functions
✅ **DO:** Extend existing `audio_utils.py` functions

❌ **DON'T:** Bypass existing upload/processing flow
✅ **DO:** Use existing `attachAudio()` → `/api/upload` → `process_audio_file()`

---

## 🔧 DEVELOPMENT WORKFLOW FOR AI AGENTS

### **Pre-Implementation Checklist**
```
□ Read target file completely with read_file tool
□ Search for existing similar functions with grep_search
□ Verify current function signatures match documentation
□ Check import statements and dependencies
□ Confirm authentication patterns
□ Review existing error handling patterns
```

### **Implementation Protocol**
```
1. ANALYZE: Read existing code structure
2. PLAN: Identify exact extension points
3. EXTEND: Modify existing functions with new parameters
4. TEST: Verify no existing functionality breaks
5. DOCUMENT: Update only modified functions
```

### **Required File Analysis Before Modification**
```
Target: backend/services/export_service.py
Action: read_file (complete file) → verify _merge_chapter_audio() signature

Target: frontend/js/modules/export.js  
Action: read_file (complete file) → verify startExport() implementation

Target: Any auth-related file
Action: grep_search "window.authModule" → verify usage patterns
```

---

## 📋 EXACT CURRENT CAPABILITIES (VERIFIED)

### **✅ IMPLEMENTED AND WORKING**
- MP3→WAV conversion (pydub-based)
- Audio file upload and processing
- WAV audio export and merging
- Chapter/section creation and management
- Project export to ZIP with metadata
- Import from exported metadata.json
- JWT-based authentication
- Credit system with database tracking
- Cross-tab session synchronization

### **⚠️ PARTIALLY IMPLEMENTED**
- Export system (only WAV format)
- Collaboration (basic import/export only)
- Audio playback (basic implementation)

### **❌ NOT IMPLEMENTED**
- Audio cutting/trimming tools
- MP3 export format
- Chapter selection for export
- Real-time collaboration
- Advanced audio editing features

---

## 🎯 SUCCESS CRITERIA FOR NEW FEATURES

### **MP3 Export Success**
- [ ] `_merge_chapter_audio()` accepts format parameter
- [ ] Export modal has WAV/MP3 radio buttons
- [ ] `startExport()` passes format to backend
- [ ] Existing WAV functionality unchanged

### **Chapter Selection Success**
- [ ] Export modal shows chapter checkboxes
- [ ] `startExport()` filters chapters array
- [ ] Backend processes filtered chapters correctly
- [ ] "Select All" / "Select None" toggle works

### **Audio Cutting Success**
- [ ] New waveform visualization component
- [ ] Cut points selection interface
- [ ] Backend cutting function using pydub
- [ ] Integration with existing upload flow

### **Collaboration V1 Success**
- [ ] User IDs added to all project data
- [ ] Export includes user attribution
- [ ] Import handles user identification
- [ ] Conflict detection for overlapping work

---

This guide ensures AI agents have precise, verified information about the current codebase and clear implementation paths for new features while preventing redundancies and preserving existing functionality. 