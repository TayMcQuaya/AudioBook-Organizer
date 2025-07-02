# Text Processing System - AudioBook Organizer

## Overview
The text processing system handles:
1. DOCX file parsing with formatting preservation
2. Rich text editing with formatting toolbar
3. Smart text selection for audio segments
4. Comment and annotation system
5. Table of contents generation

## DOCX Processing Pipeline

### Upload Flow
```
1. File Upload
   frontend/js/modules/bookUpload.js:handleDocxFile()
   ↓
2. Hybrid Processing (Parallel)
   ├─ Backend: /api/upload/docx
   │  backend/services/docx_service.py
   └─ Frontend: mammoth.js conversion
      frontend/js/modules/docxProcessor.js
   ↓
3. Result Merging
   bookUpload.js:mergeDocxResults()
   ↓
4. Formatting Application
   frontend/js/modules/formattingRenderer.js
```

### Backend DOCX Service (`backend/services/docx_service.py`)
- **Lines**: 442
- **Key Functions**:
  - `extract_content_with_formatting()` - Main extraction
  - `validate_docx_file()` - Pre-processing validation
  - `get_processing_info()` - Complexity analysis
  - `_process_paragraph()` - Paragraph parsing
  - `_determine_heading_level()` - Dynamic heading detection

### Formatting Detection
```python
# Style mapping
STYLE_MAPPING = {
    'Title': 'title',
    'Heading 1': 'heading',
    'Heading 2': 'subheading',
    'Quote': 'quote'
}

# Dynamic font size detection
if font_size >= 20: level = 'title'
elif font_size >= 16: level = 'heading'
elif font_size >= 14: level = 'subheading'
```

## Frontend Text Processing

### DOCX Processor (`frontend/js/modules/docxProcessor.js`)
- **Lines**: 213
- **Purpose**: Client-side DOCX processing
- **Features**:
  - Mammoth.js integration
  - HTML to formatting conversion
  - Image extraction support
  - Table preservation

### HTML to Formatting (`frontend/js/modules/htmlToFormatting.js`)
- **Lines**: 266
- **Purpose**: Convert HTML to internal format
- **Process**:
  1. Parse HTML DOM
  2. Track character positions
  3. Map tags to format types
  4. Generate formatting ranges

## Formatting System

### Formatting State (`frontend/js/modules/formattingState.js`)
- **Lines**: 687
- **No Dependencies**
- **Data Structure**:
```javascript
formattingData = {
  ranges: [
    {
      start: 0,
      end: 100,
      type: 'bold',
      className: 'formatted-bold'
    }
  ],
  comments: [
    {
      start: 50,
      end: 60,
      text: 'Comment text',
      author: 'user@example.com',
      timestamp: '2024-01-01T00:00:00Z'
    }
  ]
}
```

### Formatting Toolbar (`frontend/js/modules/formattingToolbar.js`)
- **Lines**: 859
- **Features**:
  - File type awareness (TXT vs DOCX)
  - Keyboard shortcuts (Ctrl+B/I/U)
  - Dropdown menus for headings
  - State-aware button updates

### Formatting Renderer (`frontend/js/modules/formattingRenderer.js`)
- **Lines**: 1,058
- **Purpose**: Apply formatting to DOM
- **Key Functions**:
  - `applyFormattingToDOM()` - Main rendering
  - `createFormattedSpan()` - Create formatted elements
  - `findTextNodes()` - DOM traversal
  - `splitTextNode()` - Precise text splitting

## Smart Selection System

### Smart Select (`frontend/js/modules/smartSelect.js`)
- **Lines**: 531
- **Features**:
  - Intelligent chunk boundaries
  - Character count limits
  - Progress tracking
  - Manual override detection

### Selection Algorithm
```javascript
// Find optimal end point
function findBoundary(text, maxChars) {
  // Priority order:
  // 1. Period followed by space
  // 2. Line break
  // 3. Other punctuation
  // 4. Word boundary
  // 5. Max character limit
}
```

### Text Selection Tools (`frontend/js/modules/selectionTools.js`)
- **Lines**: 171
- **Features**:
  - Floating toolbar on selection
  - Character counter
  - Smart positioning
  - Section creation from selection

## Comment System

### Comments System (`frontend/js/modules/commentsSystem.js`)
- **Lines**: 344
- **Features**:
  - Inline comment creation
  - Resolution tracking
  - Comment export
  - Visual indicators

### Comment Data Structure
```javascript
{
  id: 'comment-uuid',
  start: 100,      // Character position
  end: 150,
  text: 'Comment content',
  author: 'user@example.com',
  timestamp: '2024-01-01T00:00:00Z',
  resolved: false
}
```

## Table of Contents

### TOC Generator (`frontend/js/modules/tableOfContents.js`)
- **Lines**: 827
- **Features**:
  - Automatic header extraction
  - Hierarchical organization
  - Scroll spy (active tracking)
  - Keyboard shortcuts (Ctrl+Shift+T)

### TOC Structure
```javascript
tocItems = [
  {
    id: 'toc-1',
    text: 'Chapter Title',
    level: 1,        // Heading level
    elementId: 'heading-uuid',
    children: []     // Nested items
  }
]
```

## Edit Mode System

### Edit Mode (`frontend/js/modules/editMode.js`)
- **Lines**: 764
- **Purpose**: Toggle editing capabilities
- **Features**:
  - Prevent accidental edits
  - UI state management
  - Toolbar visibility control
  - Content protection

## File Type Handling

### Supported Formats
| Format | Upload Endpoint | Credits | Features |
|--------|----------------|---------|----------|
| TXT | `/api/upload/txt` | 1 | Basic text, manual formatting |
| DOCX | `/api/upload/docx` | 5 | Rich formatting, images, tables |

### File Validation
```python
# backend/services/docx_service.py
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_EXTENSIONS = ['.docx']

# Validation checks:
- File extension
- MIME type
- File size
- DOCX structure
```

## Processing Optimizations

### Backend Optimizations
- Streaming XML parsing for large files
- Paragraph batching
- Style caching
- Memory-efficient text extraction

### Frontend Optimizations
- Virtual scrolling for long documents
- Debounced formatting updates
- Range merging for efficiency
- RequestAnimationFrame rendering

## Common Issues & Debugging

### DOCX Not Processing
- **Check**: File size < 25MB
- **Debug**: `/api/upload/docx/validate`
- **Log**: `backend/services/docx_service.py` errors

### Formatting Not Showing
- **Check**: Edit mode enabled
- **Debug**: `formattingState.js` ranges
- **Verify**: DOM structure intact

### Smart Selection Issues
- **Check**: `smartSelectEnabled` state
- **Debug**: Character count settings
- **Test**: Manual selection override

### Comments Not Appearing
- **Check**: `formattingData.comments`
- **Debug**: Comment indicators in DOM
- **Verify**: Character positions accurate

## Performance Considerations

### Large Documents
```javascript
// Chunked processing for >1MB
if (text.length > 1000000) {
  processInChunks(text, 10000);
}

// Debounced saves
const debouncedSave = debounce(saveFormatting, 1000);
```

### Memory Management
- Clear unused formatting ranges
- Limit undo history
- Use WeakMap for DOM references
- Cleanup event listeners

## Integration Points

### With Storage System
- Formatting saved with project
- Comments included in export
- Version control aware

### With Export System
- Formatting preserved in exports
- Comments exported separately
- TOC included in metadata

### With Audio System
- Smart selection creates sections
- Sections linked to audio files
- Character positions maintained