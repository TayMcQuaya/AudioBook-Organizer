# Project Management System - AudioBook Organizer

## Overview
The project management system handles:
1. Project state persistence (auto-save)
2. Cloud storage via Supabase
3. Local file import/export
4. Project merging and conflict resolution
5. Collaboration features

## Project Data Structure

### Complete Project Schema
```javascript
{
  // Core content
  bookText: "Full text content...",
  
  // Project metadata
  projectMetadata: {
    title: "Project Title",
    description: "Project description",
    collaborators: ["user1@email.com", "user2@email.com"],
    lastModified: "2024-01-01T00:00:00Z",
    version: "1.2",
    createdBy: "user@email.com",
    fileType: "docx"  // or "txt"
  },
  
  // Formatting and comments
  formattingData: {
    ranges: [...],    // Text formatting
    comments: [...]   // Inline comments
  },
  
  // Chapter organization
  chapters: [
    {
      id: "chapter-uuid",
      name: "Chapter 1",
      color: "#FF6B6B",
      sections: ["section-id-1", "section-id-2"]
    }
  ],
  
  // Text sections
  sections: [
    {
      id: "section-uuid",
      text: "Section content...",
      chapterId: "chapter-uuid",
      audioPath: "/uploads/audio.wav",
      duration: 120.5
    }
  ],
  
  // Visual highlights
  highlights: [
    {
      text: "Highlighted text",
      startOffset: 100,
      endOffset: 150
    }
  ],
  
  // Reading state
  smartSelect: {
    enabled: true,
    chunkSize: 150,
    currentPosition: 500
  }
}
```

## Backend Project Management

### Project Routes (`backend/routes/project_routes.py`)
- **Lines**: 226
- **Endpoints**:
  - `POST /api/projects/save` - Save project
  - `GET /api/projects/latest` - Get latest project
  - `GET /api/projects/status` - Project info
  - `GET /api/projects/debug` - Debug endpoint

### Database Schema
```sql
-- audiobook_projects table
CREATE TABLE audiobook_projects (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    title TEXT,
    description TEXT,
    project_data JSONB,  -- Complete project JSON
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_user_projects ON audiobook_projects(user_id);
CREATE INDEX idx_updated_at ON audiobook_projects(updated_at DESC);
```

### Save Process
```python
# backend/routes/project_routes.py
@project_bp.route('/save', methods=['POST'])
@require_auth
def save_project():
    # 1. Get project data from request
    # 2. Validate data structure
    # 3. Check if project exists
    # 4. Update or create project
    # 5. Return success status
```

## Frontend Project Management

### Storage Module (`frontend/js/modules/storage.js`)
- **Lines**: 915
- **Key Functions**:
  - `saveToFile()` - Export to JSON file
  - `loadFromFile()` - Import from file
  - `saveToDatabase()` - Cloud save
  - `loadFromDatabase()` - Cloud load
  - `autoSaveToDatabase()` - Auto-save logic

### Auto-Save System
```javascript
// Debounced auto-save
let autoSaveTimer;
const AUTO_SAVE_DELAY = 5000; // 5 seconds

function triggerAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveToDatabase();
  }, AUTO_SAVE_DELAY);
}

// Triggered by:
- Text changes
- Section creation/deletion
- Chapter modifications
- Formatting changes
```

### Save State Management
```javascript
// Save state tracking
const saveState = {
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
  saveError: null
};

// Visual indicators
function updateSaveIndicator(state) {
  if (state.isSaving) showSpinner();
  else if (state.hasUnsavedChanges) showWarning();
  else showSaved(state.lastSaved);
}
```

## Project Import/Export

### Export Process
```javascript
// storage.js:saveToFile()
async function exportProject() {
  const projectData = gatherProjectData();
  const blob = new Blob(
    [JSON.stringify(projectData, null, 2)],
    { type: 'application/json' }
  );
  
  const fileName = `audiobook_${timestamp}.json`;
  downloadBlob(blob, fileName);
}
```

### Import Process
```javascript
// storage.js:loadFromFile()
async function importProject(file) {
  const text = await file.text();
  const projectData = JSON.parse(text);
  
  // Check for existing project
  if (hasExistingProject()) {
    const action = await promptMergeOrReplace();
    if (action === 'merge') {
      return mergeProjects(currentProject, projectData);
    }
  }
  
  return loadProjectData(projectData);
}
```

## Project Merging

### Merge Engine (`frontend/js/modules/projectMerge.js`)
- **Lines**: 243
- **Purpose**: Smart project merging
- **Features**:
  - Conflict detection
  - Automatic merging
  - Collaborator tracking

### Merge Algorithm
```javascript
function mergeProjects(current, imported) {
  const conflicts = [];
  const merged = {};
  
  // 1. Compare base text
  if (current.bookText !== imported.bookText) {
    conflicts.push({
      type: 'bookText',
      current: current.bookText,
      imported: imported.bookText
    });
  }
  
  // 2. Merge chapters (by name)
  merged.chapters = mergeChapters(
    current.chapters,
    imported.chapters,
    conflicts
  );
  
  // 3. Merge sections (by content)
  merged.sections = mergeSections(
    current.sections,
    imported.sections,
    conflicts
  );
  
  // 4. Combine collaborators
  merged.collaborators = [
    ...new Set([
      ...current.collaborators,
      ...imported.collaborators
    ])
  ];
  
  return { merged, conflicts };
}
```

### Conflict Resolution (`frontend/js/modules/conflictResolution.js`)
- **Lines**: 370
- **UI for resolving conflicts**
- **Resolution options**:
  - Keep current
  - Use imported
  - Keep both (where applicable)

### Conflict Resolution UI
```javascript
// Present conflicts to user
function showConflictDialog(conflicts) {
  const dialog = createConflictDialog();
  
  conflicts.forEach(conflict => {
    dialog.addConflict({
      type: conflict.type,
      description: getConflictDescription(conflict),
      options: getResolutionOptions(conflict)
    });
  });
  
  return dialog.show(); // Returns resolution choices
}
```

## Collaboration Features

### Collaborator Tracking
```javascript
// Add collaborator on edit
function trackCollaborator(userId) {
  if (!projectMetadata.collaborators) {
    projectMetadata.collaborators = [];
  }
  
  if (!projectMetadata.collaborators.includes(userId)) {
    projectMetadata.collaborators.push(userId);
    projectMetadata.lastModifiedBy = userId;
    projectMetadata.lastModified = new Date().toISOString();
  }
}
```

### Version Management
```javascript
// Simple version incrementing
function incrementVersion(version) {
  const [major, minor] = version.split('.');
  return `${major}.${parseInt(minor) + 1}`;
}

// Track version on save
projectMetadata.version = incrementVersion(
  projectMetadata.version || '1.0'
);
```

## Highlight Restoration

### Highlight System
```javascript
// Save highlights
function saveHighlights() {
  const highlights = [];
  document.querySelectorAll('.highlighted-section').forEach(el => {
    highlights.push({
      text: el.textContent,
      startOffset: getTextOffset(el),
      endOffset: getTextOffset(el) + el.textContent.length
    });
  });
  return highlights;
}

// Restore highlights
async function restoreHighlights(highlights) {
  for (const highlight of highlights) {
    await restoreSingleHighlight(highlight);
    // Use requestAnimationFrame for performance
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
}
```

## Performance Optimization

### Large Project Handling
```javascript
// Chunked loading for large projects
async function loadLargeProject(projectData) {
  // Load text first
  await loadText(projectData.bookText);
  
  // Load formatting in chunks
  const chunks = chunkArray(projectData.formattingData.ranges, 100);
  for (const chunk of chunks) {
    await applyFormattingChunk(chunk);
    await delay(10); // Prevent UI blocking
  }
  
  // Load sections
  await loadSections(projectData.sections);
}
```

### Save Optimization
```javascript
// Differential saves (planned)
function calculateDiff(oldData, newData) {
  // Only send changed data
  const diff = {};
  
  if (oldData.bookText !== newData.bookText) {
    diff.bookText = newData.bookText;
  }
  
  // ... check other fields
  
  return diff;
}
```

## Error Handling

### Save Errors
```javascript
// Retry logic
async function saveWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await saveToDatabase(data);
    } catch (error) {
      if (i === maxRetries - 1) {
        showSaveError(error);
        enableOfflineMode();
        throw error;
      }
      await delay(1000 * Math.pow(2, i));
    }
  }
}
```

### Recovery Mechanisms
- Local storage backup
- Offline queue for saves
- Conflict resolution on reconnect
- Data validation before save

## Integration Points

### With Authentication
- User ID attached to projects
- Permission checking
- Multi-user awareness

### With Export System
- Include project metadata
- Preserve all formatting
- Export collaboration info

### With UI System
- Save status indicators
- Unsaved changes warnings
- Auto-save notifications