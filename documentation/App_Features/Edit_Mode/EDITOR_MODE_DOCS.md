# AudioBook Organizer - Editor Mode System Documentation

## Overview

The Editor Mode system enables users to edit book content with rich text formatting capabilities. It consists of multiple interconnected modules that handle state management, UI interactions, formatting application, and data persistence.

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Edit Mode     │    │ Formatting      │    │ Formatting      │
│   Controller    │◄──►│ Toolbar         │◄──►│ State Manager   │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DOM Content   │    │ Formatting      │    │ Storage         │
│   (#bookContent)│◄──►│ Renderer        │◄──►│ System          │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Files and Responsibilities

### 1. Edit Mode Controller
**File**: `frontend/js/modules/editMode.js`

**Purpose**: Main controller for edit mode state and transitions

**Key Functions**:
- `getEditMode()` - Returns current edit mode state (boolean)
- `toggleEditMode()` - Main function to switch between view/edit modes
- `enterEditMode()` - Activates edit mode with all formatting capabilities
- `exitEditMode()` - Deactivates edit mode and handles save/discard logic
- `applyEditProtection()` - Prevents accidental edits in view mode
- `removeEditProtection()` - Allows editing in edit mode

**Key Variables**:
```javascript
let isEditMode = false;                    // Current edit state
let originalContent = '';                 // HTML content when entering edit mode
let originalFormattingData = null;        // Formatting data backup for discard functionality
let protectionHandlers = {};              // Event handlers for edit protection
```

**State Transitions**:
```
VIEW MODE → EDIT MODE:
1. Store original content and formatting data
2. Add 'edit-mode' CSS class to bookContent
3. Remove edit protection event handlers
4. Show formatting toolbar
5. Apply existing formatting to DOM
6. Initialize keyboard shortcuts
7. Focus content area

EDIT MODE → VIEW MODE:
1. Check for changes (compare current vs original)
2. Show confirmation dialog if changes exist
3. Handle user choice (save/discard/cancel)
4. Restore original data if discarding
5. Hide formatting toolbar
6. Remove 'edit-mode' CSS class
7. Re-apply edit protection
```

### 2. Formatting Toolbar
**File**: `frontend/js/modules/formattingToolbar.js`

**Purpose**: Interactive toolbar for applying text formatting

**Key Functions**:
- `createFormattingToolbar()` - Creates toolbar DOM element
- `showFormattingToolbar()` - Displays toolbar above book content
- `hideFormattingToolbar()` - Removes toolbar from DOM
- `handleToolbarClick(e)` - Processes button clicks
- `handleToolbarChange(e)` - Processes dropdown changes
- `applyFormatting(type, level)` - Applies formatting to selected text
- `clearHeadingFormatting()` - Removes heading formats from selection
- `handleClearFormatting()` - Clears all formatting (selection-aware)
- `initializeFormattingShortcuts()` - Sets up keyboard shortcuts
- `initializeSelectionTracking()` - Tracks text selection changes

**Toolbar Structure**:
```html
<div class="formatting-toolbar">
  <div class="toolbar-section">
    <!-- Text formatting buttons -->
    <button data-format="bold">B</button>
    <button data-format="italic">I</button>
    <button data-format="underline">U</button>
  </div>
  <div class="toolbar-section">
    <!-- Heading selector -->
    <select class="heading-select">
      <option value="">Normal Text</option>
      <option value="title">Title (H1)</option>
      <option value="subtitle">Subtitle (H2)</option>
      <option value="section">Section (H3)</option>
      <option value="subsection">Subsection (H4)</option>
    </select>
  </div>
  <div class="toolbar-section">
    <!-- Special formatting -->
    <button data-format="quote">"</button>
    <button data-format="comment">💬</button>
    <button data-format="clear">🧹</button>
  </div>
</div>
```

**Keyboard Shortcuts**:
- `Ctrl+B` - Bold
- `Ctrl+I` - Italic  
- `Ctrl+U` - Underline
- `Ctrl+Q` - Quote block
- `Ctrl+K` - Add comment

### 3. Formatting State Manager
**File**: `frontend/js/modules/formattingState.js`

**Purpose**: Manages formatting data structure and operations

**Data Structure**:
```javascript
export let formattingData = {
    ranges: [],      // Array of FormattingRange objects
    comments: [],    // Array of FormattingComment objects
    version: '1.0'   // Data format version
};
```

**FormattingRange Class**:
```javascript
class FormattingRange {
    constructor(start, end, type, level = 1, data = {}) {
        this.id = `fmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.start = start;        // Start position in plain text
        this.end = end;           // End position in plain text
        this.type = type;         // 'bold', 'italic', 'title', etc.
        this.level = level;       // Heading level (1-4)
        this.className = `fmt-${type}`;  // CSS class name
        this.data = data;         // Additional metadata
    }
}
```

**FormattingComment Class**:
```javascript
class FormattingComment {
    constructor(position, text, author = 'user') {
        this.id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.position = position;  // Position in plain text
        this.text = text;         // Comment content
        this.author = author;     // Comment author
        this.timestamp = new Date().toISOString();
        this.resolved = false;    // Resolution status
    }
}
```

**Key Functions**:
- `addFormattingRange(start, end, type, level, data)` - Creates new formatting range
- `removeFormattingRange(id)` - Removes formatting range by ID
- `getFormattingAtPosition(position)` - Returns all formatting at text position
- `getFormattingInRange(start, end)` - Returns overlapping formatting ranges
- `updateFormattingPositions(insertPos, insertLen, deleteLen)` - Updates positions after text changes
- `cleanupFormattingRanges()` - Removes invalid ranges
- `clearFormatting()` - Removes all formatting data
- `setFormattingData(newData)` - Replaces entire formatting dataset

### 4. Formatting Renderer
**File**: `frontend/js/modules/formattingRenderer.js`

**Purpose**: Applies formatting data to DOM elements

**Key Functions**:
- `applyFormattingToDOM()` - Main function to render all formatting
- `clearFormattingFromDOM()` - Removes formatting elements from DOM
- `applyFormattingRanges()` - Applies text formatting ranges
- `groupOverlappingRanges(ranges)` - Combines overlapping ranges for rendering
- `applyFormattingGroup(group, container)` - Renders a group of overlapping ranges
- `findTextNodes(container, startPos, endPos)` - Locates text nodes for positioning
- `getCurrentCursorPosition()` - Gets current cursor position
- `setCursorPosition(position)` - Restores cursor position after rendering

**Rendering Process**:
```
1. Store current cursor position
2. Clear existing formatting elements (preserve section highlights)
3. Group overlapping formatting ranges
4. For each group:
   a. Find corresponding text nodes in DOM
   b. Determine element type (span vs div for block-level)
   c. Combine CSS classes from all ranges in group
   d. Create formatted element with combined classes
   e. Replace text nodes with formatted element
5. Apply comment indicators
6. Restore cursor position
```

**Element Type Selection**:
- **Block-level types** (`div`): title, subtitle, section, subsection, quote
- **Inline types** (`span`): bold, italic, underline

### 5. Comments System
**File**: `frontend/js/modules/commentsSystem.js`

**Purpose**: Handles comment creation, display, and management

**Key Functions**:
- `showCommentDialog(position)` - Shows comment creation dialog
- `createCommentIndicator(comment)` - Creates visual comment indicator
- `showCommentPopup(comment, indicator)` - Shows comment content popup
- `resolveComment(commentId)` - Marks comment as resolved
- `exportComments()` - Exports all comments for external use

### 6. Storage Integration
**File**: `frontend/js/modules/storage.js`

**Purpose**: Persists formatting data with book content

**Integration Points**:
```javascript
// Save project data including formatting
const projectData = {
    bookText: bookText,
    formattingData: formattingData,  // ← Formatting data included
    // ... other data
};

// Load project data and restore formatting
if (projectData.formattingData) {
    setFormattingData(projectData.formattingData);
    // Apply formatting to DOM after loading
    import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
        applyFormattingToDOM();
    });
}
```

## CSS Styling System

### Core Formatting Styles
**File**: `frontend/css/formatting.css`

**Heading Styles** (Industry Standard):
```css
.fmt-title {    /* H1 - 2em, bold */
    font-size: 2em !important;
    font-weight: bold !important;
    margin: 0.67em 0 !important;
}

.fmt-subtitle { /* H2 - 1.5em, bold */
    font-size: 1.5em !important;
    font-weight: bold !important;
    margin: 0.83em 0 !important;
}

.fmt-section {  /* H3 - 1.17em, bold */
    font-size: 1.17em !important;
    font-weight: bold !important;
    margin: 1em 0 !important;
}

.fmt-subsection { /* H4 - 1em, bold */
    font-size: 1em !important;
    font-weight: bold !important;
    margin: 1.33em 0 !important;
}
```

**Text Formatting**:
```css
.fmt-bold { font-weight: bold !important; }
.fmt-italic { font-style: italic !important; }
.fmt-underline { text-decoration: underline !important; }
```

**Combined Formatting** (Bold + Heading, etc.):
```css
.fmt-title.fmt-bold,
.fmt-subtitle.fmt-italic,
.fmt-section.fmt-underline {
    /* Combinations work automatically */
}
```

**Quote Formatting**:
```css
.fmt-quote {
    display: block !important;
    margin: 1em 2em !important;
    padding: 1em 1.5em !important;
    background: #f9f9f9 !important;
    border-left: 4px solid #4CAF50 !important;
    font-style: italic !important;
    color: #555 !important;
    border-radius: 5px !important;
}
```

### Dark Theme Support
```css
[data-theme="dark"] .formatting-toolbar {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
}

[data-theme="dark"] .fmt-quote {
    background: #2d2d2d !important;
    color: #e0e0e0 !important;
}
```

### Edit Mode Enhancements
**File**: `frontend/css/components.css`

```css
.book-content.edit-mode {
    caret-color: #4CAF50;  /* Green cursor */
    position: relative;
}

.book-content.edit-mode ::selection {
    background: rgba(76, 175, 80, 0.3);  /* Green selection */
}
```

## Data Flow and Interactions

### Text Selection → Formatting Application
```
1. User selects text in edit mode
2. Selection tracking updates toolbar state
3. User clicks formatting button or uses keyboard shortcut
4. handleToolbarClick() → applyFormatting()
5. Calculate text positions using getPositionInText()
6. Create FormattingRange with addFormattingRange()
7. Apply to DOM with applyFormattingToDOM()
8. Update storage with formatting data
```

### Position Calculation System
```javascript
// Convert DOM selection to plain text positions
function getPositionInText(container, node, offset) {
    const range = document.createRange();
    range.setStart(container, 0);
    range.setEnd(node, offset);
    return range.toString().length;  // Plain text length
}
```

### Overlapping Range Handling
```
Example: Bold + Italic + H1 on same text
┌─────────────────────────────────┐
│ Range 1: Bold (pos 10-20)      │
│ Range 2: Italic (pos 15-25)    │  
│ Range 3: Title (pos 12-18)     │
└─────────────────────────────────┘
                ↓
Groups: [10-12: Bold], [12-18: Bold+Italic+Title], [18-20: Bold+Italic], [20-25: Italic]
                ↓
DOM: <span class="fmt-bold">text</span><div class="fmt-bold fmt-italic fmt-title">text</div>...
```

## Error Handling and Edge Cases

### Edit Mode Protection
```javascript
// Prevents accidental edits in view mode
function applyEditProtection() {
    const bookContent = document.getElementById('bookContent');
    
    protectionHandlers.input = (e) => e.preventDefault();
    protectionHandlers.paste = (e) => e.preventDefault();
    protectionHandlers.drop = (e) => e.preventDefault();
    protectionHandlers.keydown = (e) => {
        if (e.key.length === 1 || ['Backspace', 'Delete', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }
    };
    
    // Apply all protection handlers
    Object.entries(protectionHandlers).forEach(([event, handler]) => {
        bookContent.addEventListener(event, handler);
    });
}
```

### Position Synchronization
```javascript
// Update formatting positions when text changes
export function updateFormattingPositions(insertPosition, insertLength, deleteLength = 0) {
    const netChange = insertLength - deleteLength;
    
    formattingData.ranges.forEach(range => {
        if (insertPosition <= range.start) {
            // Change before range - shift entire range
            range.start += netChange;
            range.end += netChange;
        } else if (insertPosition < range.end) {
            // Change within range - only shift end
            range.end += netChange;
            if (range.end <= range.start) {
                range.end = range.start + 1;  // Prevent invalid ranges
            }
        }
    });
}
```

## Debugging and Diagnostics

### Formatting System Diagnostics
```javascript
// Run comprehensive system check
export function runFormattingSystemDiagnostics() {
    console.log('🔍 FORMATTING SYSTEM DIAGNOSTICS:');
    
    // 1. Check DOM elements
    const bookContent = document.getElementById('bookContent');
    console.log('   - Book content found:', !!bookContent);
    
    // 2. Check formatting data
    console.log('   - Formatting ranges:', formattingData.ranges.length);
    console.log('   - Comments:', formattingData.comments.length);
    
    // 3. Check CSS loading
    const testElement = document.createElement('span');
    testElement.className = 'fmt-bold';
    document.body.appendChild(testElement);
    const styles = window.getComputedStyle(testElement);
    console.log('   - CSS loaded:', styles.fontWeight === 'bold' || styles.fontWeight === '700');
    testElement.remove();
    
    // 4. Check edit mode
    console.log('   - Edit mode active:', getEditMode());
    
    // 5. Check toolbar
    const toolbar = document.getElementById('formattingToolbar');
    console.log('   - Toolbar found:', !!toolbar);
}
```

## Common Development Tasks

### Adding New Formatting Type
1. **Add CSS styles** (formatting.css):
   ```css
   .fmt-newtype {
       /* Your styles here */
   }
   ```

2. **Add to toolbar** (formattingToolbar.js):
   ```html
   <button class="toolbar-btn" data-format="newtype" title="New Type">
       Icon
   </button>
   ```

3. **Add keyboard shortcut** (optional):
   ```javascript
   case 'n':  // Ctrl+N
       e.preventDefault();
       applyFormatting('newtype');
       break;
   ```

### Modifying Toolbar Layout
Edit the toolbar HTML in `createFormattingToolbar()`:
```javascript
toolbar.innerHTML = `
    <div class="toolbar-section">
        <!-- Add/remove/modify buttons here -->
    </div>
`;
```

## Performance Considerations

### Efficient DOM Updates
- Formatting is applied in batches during `applyFormattingToDOM()`
- Cursor position is preserved to prevent jarring user experience
- Overlapping ranges are grouped to minimize DOM elements

### Memory Management
- Event handlers are properly cleaned up when exiting edit mode
- Temporary elements (like CSS test elements) are removed after use
- Original content is cleared when no longer needed

## Testing and Validation

### Manual Testing Checklist
- [ ] Edit mode toggle works (view ↔ edit)
- [ ] Formatting toolbar appears/disappears correctly
- [ ] All formatting types apply correctly
- [ ] Combined formatting works (bold + heading, etc.)
- [ ] Clear formatting works (selection-aware)
- [ ] Keyboard shortcuts function
- [ ] Dark theme support works
- [ ] Save/discard functionality works
- [ ] Position tracking survives text changes
- [ ] Comments system integrates properly

### Automated Diagnostics
Run `runFormattingSystemDiagnostics()` in browser console to check system health.

## Troubleshooting Common Issues

### Formatting Not Applying
1. Check if CSS file is loaded: `runFormattingSystemDiagnostics()`
2. Verify edit mode is active: `getEditMode()`
3. Check browser console for JavaScript errors
4. Ensure text is selected before applying formatting

### Toolbar Not Showing
1. Verify edit mode is active
2. Check if `bookContent` element exists
3. Look for CSS conflicts with `z-index`
4. Check browser console for import errors

### Position Tracking Issues
1. Verify `updateFormattingPositions()` is called after text changes
2. Check for invalid ranges (start >= end)
3. Run `cleanupFormattingRanges()` to remove invalid data
4. Ensure plain text positions are used consistently

### Performance Issues
1. Check number of formatting ranges (too many can slow rendering)
2. Verify DOM elements are being cleaned up properly
3. Look for memory leaks in event handlers
4. Consider debouncing frequent operations

This documentation provides a complete reference for developers working with the AudioBook Organizer's editor mode system. Each component is designed to work independently while maintaining clean interfaces for integration. 