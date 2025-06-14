# AudioBook Organizer - Formatting Implementation Guide

## 📋 Overview

This document provides a complete implementation roadmap for adding Microsoft Word-like formatting capabilities to the AudioBook Organizer's editor mode using an **Overlay Formatting System**. This approach preserves all existing functionality while adding rich text features.

## 🎯 Approach: Overlay Formatting System

### Why This Approach?
- **✅ ZERO Breaking Changes**: All existing functionality preserved
- **✅ Backward Compatible**: Existing projects continue working unchanged  
- **✅ Clean Separation**: Text content separate from formatting presentation
- **✅ Progressive Enhancement**: Can be implemented incrementally

### Core Concept
Keep the current plain text system (`bookText` state) unchanged, but add a parallel formatting metadata system that tracks styling information by character positions.

---

## 🏗️ Architecture Design

### Current System (Unchanged)
```javascript
// state.js - remains exactly the same
export let bookText = 'This is the plain text content...';
export let chapters = [/* chapter data */];

// sections.js - continues working with .section-highlight spans
// smartSelect.js - character position tracking unchanged
// storage.js - JSON export/import continues working
```

### New Formatting Layer
```javascript
// New: formattingState.js
export let formattingData = {
  ranges: [
    {
      id: 'fmt_123',
      start: 150,           // Character position in bookText
      end: 200,            // Character position in bookText
      type: 'bold',        // bold, italic, underline, title, subtitle, quote
      level: 1,            // For hierarchical elements (h1=1, h2=2, etc.)
      className: 'fmt-bold', // CSS class to apply
      data: {}             // Additional formatting data
    }
  ],
  comments: [
    {
      id: 'comment_456',
      position: 300,       // Character position in bookText
      text: 'This needs revision',
      author: 'user',
      timestamp: '2024-01-01T12:00:00Z',
      resolved: false
    }
  ]
};
```

---

## 📁 File Structure Changes

### New Files to Create
```
frontend/js/modules/
├── formattingState.js       # Formatting metadata management
├── formattingRenderer.js    # Apply formatting to DOM
├── formattingToolbar.js     # Formatting UI toolbar
├── formattingCommands.js    # Format execution (bold, italic, etc.)
├── commentsSystem.js        # Comments functionality
└── formattingSync.js        # Sync formatting with text changes

frontend/css/
├── formatting.css           # Formatting-specific styles
└── comments.css            # Comments UI styles
```

### Files to Modify (Minimal Changes)
```
frontend/js/modules/
├── editMode.js             # Add toolbar integration
├── storage.js              # Include formatting in save/load
├── state.js                # Add formatting state hooks
└── bookUpload.js           # Reset formatting on new book

frontend/pages/app/
└── app.html                # Add toolbar HTML structure
```

---

## 🔧 Implementation Steps

### Phase 1: Core Formatting Infrastructure

#### Step 1.1: Create Formatting State Management
**File**: `frontend/js/modules/formattingState.js`

```javascript
// AudioBook Organizer - Formatting State Management

// Formatting data structure
export let formattingData = {
    ranges: [],
    comments: [],
    version: '1.0'
};

// Formatting range class
export class FormattingRange {
    constructor(start, end, type, level = 1, data = {}) {
        this.id = `fmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.start = start;
        this.end = end;
        this.type = type;
        this.level = level;
        this.className = `fmt-${type}${level > 1 ? `-${level}` : ''}`;
        this.data = data;
    }
}

// State management functions
export function addFormattingRange(start, end, type, level = 1, data = {}) {
    const range = new FormattingRange(start, end, type, level, data);
    formattingData.ranges.push(range);
    return range;
}

export function removeFormattingRange(id) {
    formattingData.ranges = formattingData.ranges.filter(r => r.id !== id);
}

export function getFormattingAtPosition(position) {
    return formattingData.ranges.filter(r => 
        position >= r.start && position <= r.end
    );
}

export function updateFormattingPositions(insertPosition, insertLength, deleteLength = 0) {
    // Update all formatting positions when text changes
    formattingData.ranges.forEach(range => {
        if (range.start >= insertPosition) {
            range.start += insertLength - deleteLength;
        }
        if (range.end >= insertPosition) {
            range.end += insertLength - deleteLength;
        }
    });
    
    formattingData.comments.forEach(comment => {
        if (comment.position >= insertPosition) {
            comment.position += insertLength - deleteLength;
        }
    });
}

export function clearFormatting() {
    formattingData.ranges = [];
    formattingData.comments = [];
}

export function setFormattingData(newData) {
    formattingData = newData;
}
```

#### Step 1.2: Create Rendering Engine
**File**: `frontend/js/modules/formattingRenderer.js`

```javascript
// AudioBook Organizer - Formatting Renderer

import { formattingData } from './formattingState.js';
import { bookText } from './state.js';

// Apply formatting to the book content DOM
export function applyFormattingToDOM() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // Store current cursor position
    const cursorPosition = getCurrentCursorPosition();
    
    // Clear existing formatting (except section highlights)
    clearFormattingFromDOM();
    
    // Apply all formatting ranges
    applyFormattingRanges();
    
    // Apply comments
    applyComments();
    
    // Restore cursor position
    if (cursorPosition !== -1) {
        setCursorPosition(cursorPosition);
    }
}

function clearFormattingFromDOM() {
    const bookContent = document.getElementById('bookContent');
    
    // Remove all formatting elements except section highlights
    const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
    formattingElements.forEach(element => {
        const parent = element.parentNode;
        const textNode = document.createTextNode(element.textContent);
        parent.replaceChild(textNode, element);
        parent.normalize();
    });
}

function applyFormattingRanges() {
    const bookContent = document.getElementById('bookContent');
    
    // Sort ranges by start position (apply from end to beginning to maintain positions)
    const sortedRanges = [...formattingData.ranges].sort((a, b) => b.start - a.start);
    
    sortedRanges.forEach(range => {
        applyFormattingRange(range);
    });
}

function applyFormattingRange(range) {
    const bookContent = document.getElementById('bookContent');
    
    try {
        // Find the text nodes that contain this range
        const { startNode, startOffset, endNode, endOffset } = 
            findTextNodes(bookContent, range.start, range.end);
        
        if (!startNode || !endNode) return;
        
        // Create the formatting element
        const formattingElement = document.createElement('span');
        formattingElement.className = range.className;
        formattingElement.dataset.formattingId = range.id;
        formattingElement.dataset.formattingType = range.type;
        
        // Create range and replace content
        const domRange = document.createRange();
        domRange.setStart(startNode, startOffset);
        domRange.setEnd(endNode, endOffset);
        
        const selectedText = domRange.toString();
        formattingElement.textContent = selectedText;
        
        domRange.deleteContents();
        domRange.insertNode(formattingElement);
        
    } catch (error) {
        console.warn('Failed to apply formatting range:', range, error);
    }
}

function findTextNodes(container, startPos, endPos) {
    // Use TreeWalker to find exact text positions
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        node => {
            // Skip nodes inside section highlights and formatting elements
            const parent = node.parentNode;
            if (parent.classList.contains('section-highlight') || 
                parent.dataset.formattingId) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let currentPos = 0;
    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;
    
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent.length;
        
        // Check if start position is in this node
        if (!startNode && currentPos + nodeLength > startPos) {
            startNode = node;
            startOffset = startPos - currentPos;
        }
        
        // Check if end position is in this node
        if (currentPos + nodeLength >= endPos) {
            endNode = node;
            endOffset = endPos - currentPos;
            break;
        }
        
        currentPos += nodeLength;
    }
    
    return { startNode, startOffset, endNode, endOffset };
}

function getCurrentCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return -1;
    
    const range = selection.getRangeAt(0);
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent.contains(range.startContainer)) return -1;
    
    const preRange = document.createRange();
    preRange.setStart(bookContent, 0);
    preRange.setEnd(range.startContainer, range.startOffset);
    
    return preRange.toString().length;
}

function setCursorPosition(position) {
    const bookContent = document.getElementById('bookContent');
    const { startNode, startOffset } = findTextNodes(bookContent, position, position);
    
    if (startNode) {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.collapse(true);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function applyComments() {
    // Comment rendering implementation
    formattingData.comments.forEach(comment => {
        applyComment(comment);
    });
}

function applyComment(comment) {
    // Create comment indicator at position
    const bookContent = document.getElementById('bookContent');
    const { startNode, startOffset } = findTextNodes(bookContent, comment.position, comment.position);
    
    if (startNode) {
        const commentIndicator = document.createElement('span');
        commentIndicator.className = 'comment-indicator';
        commentIndicator.dataset.commentId = comment.id;
        commentIndicator.textContent = '💬';
        commentIndicator.title = comment.text;
        
        // Insert comment indicator
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.insertNode(commentIndicator);
    }
}
```

#### Step 1.3: Create Formatting Toolbar
**File**: `frontend/js/modules/formattingToolbar.js`

```javascript
// AudioBook Organizer - Formatting Toolbar

import { addFormattingRange, getFormattingAtPosition } from './formattingState.js';
import { applyFormattingToDOM } from './formattingRenderer.js';
import { getEditMode } from './editMode.js';

let toolbar = null;

export function createFormattingToolbar() {
    if (toolbar) return toolbar;
    
    toolbar = document.createElement('div');
    toolbar.id = 'formattingToolbar';
    toolbar.className = 'formatting-toolbar';
    toolbar.innerHTML = `
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="bold" title="Bold (Ctrl+B)">
                <strong>B</strong>
            </button>
            <button class="toolbar-btn" data-format="italic" title="Italic (Ctrl+I)">
                <em>I</em>
            </button>
            <button class="toolbar-btn" data-format="underline" title="Underline (Ctrl+U)">
                <u>U</u>
            </button>
        </div>
        <div class="toolbar-section">
            <select class="heading-select" data-format="heading">
                <option value="">Normal</option>
                <option value="title">Title (H1)</option>
                <option value="subtitle">Subtitle (H2)</option>
                <option value="section">Section (H3)</option>
                <option value="subsection">Subsection (H4)</option>
            </select>
        </div>
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="quote" title="Quote">
                <span>"</span>
            </button>
        </div>
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="comment" title="Add Comment">
                💬
            </button>
        </div>
    `;
    
    // Add event listeners
    toolbar.addEventListener('click', handleToolbarClick);
    toolbar.addEventListener('change', handleToolbarChange);
    
    return toolbar;
}

export function showFormattingToolbar() {
    if (!getEditMode()) return;
    
    const toolbar = createFormattingToolbar();
    const bookContent = document.getElementById('bookContent');
    
    // Position toolbar above book content
    const bookRect = bookContent.getBoundingClientRect();
    toolbar.style.position = 'fixed';
    toolbar.style.top = (bookRect.top - 50) + 'px';
    toolbar.style.left = bookRect.left + 'px';
    toolbar.style.zIndex = '1000';
    toolbar.style.display = 'flex';
    
    document.body.appendChild(toolbar);
}

export function hideFormattingToolbar() {
    if (toolbar && toolbar.parentNode) {
        toolbar.parentNode.removeChild(toolbar);
    }
}

function handleToolbarClick(e) {
    const button = e.target.closest('.toolbar-btn');
    if (!button) return;
    
    const format = button.dataset.format;
    applyFormatting(format);
}

function handleToolbarChange(e) {
    const select = e.target;
    if (select.classList.contains('heading-select')) {
        const format = select.value || 'normal';
        const level = getHeadingLevel(format);
        applyFormatting(format, level);
    }
}

function applyFormatting(type, level = 1) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) return;
    
    // Calculate positions in bookText
    const bookContent = document.getElementById('bookContent');
    const startPos = getPositionInText(bookContent, range.startContainer, range.startOffset);
    const endPos = getPositionInText(bookContent, range.endContainer, range.endOffset);
    
    // Add formatting range
    addFormattingRange(startPos, endPos, type, level);
    
    // Re-render with formatting
    applyFormattingToDOM();
    
    // Clear selection
    selection.removeAllRanges();
}

function getPositionInText(container, node, offset) {
    const range = document.createRange();
    range.setStart(container, 0);
    range.setEnd(node, offset);
    return range.toString().length;
}

function getHeadingLevel(format) {
    const levels = {
        'title': 1,
        'subtitle': 2,
        'section': 3,
        'subsection': 4
    };
    return levels[format] || 1;
}

// Keyboard shortcuts
export function initializeFormattingShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!getEditMode()) return;
        
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    applyFormatting('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    applyFormatting('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    applyFormatting('underline');
                    break;
            }
        }
    });
}
```

### Phase 2: Integration with Existing System

#### Step 2.1: Modify Edit Mode Integration
**File**: `frontend/js/modules/editMode.js` (ADD to existing file)

```javascript
// ADD these imports at the top
import { showFormattingToolbar, hideFormattingToolbar } from './formattingToolbar.js';
import { applyFormattingToDOM } from './formattingRenderer.js';

// MODIFY the enterEditMode function (around line 244)
function enterEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = true;
    
    // Store original content when entering edit mode
    originalContent = bookContent.textContent;
    
    // Update UI
    bookContent.classList.add('edit-mode');
    toggleBtn.classList.add('edit-active');
    btnIcon.textContent = '📝';
    btnText.textContent = 'Edit Mode';
    
    // Remove edit protection
    removeEditProtection();
    
    // ADD: Show formatting toolbar
    showFormattingToolbar();
    
    // ADD: Apply any existing formatting
    applyFormattingToDOM();
    
    // Focus the content area
    bookContent.focus();
    
    showInfo('📝 Edit mode enabled! You can now modify the book text and apply formatting.');
}

// MODIFY the exitEditMode function (around line 270)
function exitEditMode() {
    const bookContent = document.getElementById('bookContent');
    const toggleBtn = document.getElementById('toggleEditBtn');
    const btnIcon = toggleBtn.querySelector('i');
    const btnText = document.getElementById('editModeText');
    
    isEditMode = false;
    
    // Update UI
    bookContent.classList.remove('edit-mode');
    toggleBtn.classList.remove('edit-active');
    btnIcon.textContent = '👁';
    btnText.textContent = 'View Mode';
    
    // Re-apply edit protection
    applyEditProtection();
    
    // ADD: Hide formatting toolbar
    hideFormattingToolbar();
    
    // Clear original content
    originalContent = '';
}
```

#### Step 2.2: Modify Storage System
**File**: `frontend/js/modules/storage.js` (ADD to existing file)

```javascript
// ADD import at the top
import { formattingData, setFormattingData, clearFormatting } from './formattingState.js';

// MODIFY saveProgress function (around line 11)
export function saveProgress() {
    // Get all highlights from the book content
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        sectionId: highlight.dataset.sectionId,
        className: highlight.className,
        startOffset: getNodeOffset(highlight),
        length: highlight.textContent.length
    }));

    const projectData = {
        bookText: bookText,
        chapters: chapters,
        currentColorIndex: currentColorIndex,
        highlights: highlights,
        formattingData: formattingData, // ADD formatting data
        timestamp: new Date().toISOString(),
        version: '1.1' // UPDATE version
    };

    // Create and download the JSON file
    const blob = createBlob(JSON.stringify(projectData, null, 2), 'application/json');
    const url = createObjectURL(blob);
    createDownloadLink(url, `audiobook_progress_${new Date().toISOString().split('T')[0]}.json`);
    revokeObjectURL(url);
}

// MODIFY loadProgress function - ADD after line 58 (after setCurrentColorIndex)
                // Restore formatting data
                if (projectData.formattingData) {
                    setFormattingData(projectData.formattingData);
                } else {
                    clearFormatting();
                }
```

#### Step 2.3: Add CSS Styles
**File**: `frontend/css/formatting.css` (NEW FILE)

```css
/* AudioBook Organizer - Formatting Styles */

/* Formatting Toolbar */
.formatting-toolbar {
    display: flex;
    gap: 12px;
    padding: 8px 16px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.toolbar-section {
    display: flex;
    gap: 4px;
    align-items: center;
    padding-right: 12px;
    border-right: 1px solid #eee;
}

.toolbar-section:last-child {
    border-right: none;
    padding-right: 0;
}

.toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.toolbar-btn:hover {
    background: #f0f0f0;
    border-color: #ddd;
}

.toolbar-btn:active,
.toolbar-btn.active {
    background: #4CAF50;
    color: white;
    border-color: #4CAF50;
}

.heading-select {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
    min-width: 120px;
}

/* Text Formatting Styles */
.fmt-bold {
    font-weight: bold;
}

.fmt-italic {
    font-style: italic;
}

.fmt-underline {
    text-decoration: underline;
}

.fmt-title {
    font-size: 2.5em;
    font-weight: bold;
    margin: 1.5em 0 1em 0;
    line-height: 1.2;
    color: #2c3e50;
    border-bottom: 3px solid #4CAF50;
    padding-bottom: 0.3em;
}

.fmt-subtitle {
    font-size: 2em;
    font-weight: bold;
    margin: 1.2em 0 0.8em 0;
    line-height: 1.3;
    color: #34495e;
}

.fmt-section {
    font-size: 1.5em;
    font-weight: 600;
    margin: 1em 0 0.6em 0;
    line-height: 1.4;
    color: #4CAF50;
}

.fmt-subsection {
    font-size: 1.2em;
    font-weight: 600;
    margin: 0.8em 0 0.5em 0;
    line-height: 1.4;
    color: #5D6D7E;
}

.fmt-quote {
    display: block;
    margin: 1em 2em;
    padding: 1em 1.5em;
    background: #f9f9f9;
    border-left: 4px solid #4CAF50;
    font-style: italic;
    color: #555;
    position: relative;
}

.fmt-quote::before {
    content: '"';
    font-size: 4em;
    color: #4CAF50;
    position: absolute;
    top: -0.2em;
    left: 0.2em;
    opacity: 0.3;
}

/* Comments */
.comment-indicator {
    display: inline-block;
    width: 16px;
    height: 16px;
    background: #FF9800;
    color: white;
    text-align: center;
    font-size: 10px;
    line-height: 16px;
    border-radius: 50%;
    cursor: pointer;
    margin: 0 2px;
    vertical-align: baseline;
    position: relative;
    animation: commentPulse 2s infinite;
}

@keyframes commentPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.comment-indicator:hover {
    background: #F57C00;
    transform: scale(1.2);
}

/* Comment popup */
.comment-popup {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-width: 300px;
    z-index: 1001;
    font-size: 14px;
}

.comment-popup .comment-text {
    margin-bottom: 8px;
    line-height: 1.4;
}

.comment-popup .comment-meta {
    font-size: 12px;
    color: #666;
    border-top: 1px solid #eee;
    padding-top: 8px;
}

/* Edit mode enhancements */
.book-content.edit-mode {
    caret-color: #4CAF50;
}

.book-content.edit-mode .fmt-title,
.book-content.edit-mode .fmt-subtitle,
.book-content.edit-mode .fmt-section,
.book-content.edit-mode .fmt-subsection {
    border: 1px dashed transparent;
    padding: 2px 4px;
    margin: 0.5em 0;
    border-radius: 4px;
}

.book-content.edit-mode .fmt-title:hover,
.book-content.edit-mode .fmt-subtitle:hover,
.book-content.edit-mode .fmt-section:hover,
.book-content.edit-mode .fmt-subsection:hover {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.05);
}

/* Responsive design */
@media (max-width: 768px) {
    .formatting-toolbar {
        flex-wrap: wrap;
        gap: 8px;
        padding: 6px 12px;
    }
    
    .toolbar-section {
        padding-right: 8px;
        margin-bottom: 4px;
    }
    
    .heading-select {
        min-width: 100px;
        font-size: 13px;
    }
}
```

#### Step 2.4: Update HTML Structure
**File**: `frontend/pages/app/app.html` (ADD before closing `</body>`)

```html
<!-- ADD before the closing </body> tag -->
<!-- Formatting CSS -->
<link rel="stylesheet" href="/css/formatting.css">
```

### Phase 3: Advanced Features Implementation

#### Step 3.1: Comments System
**File**: `frontend/js/modules/commentsSystem.js` (NEW FILE)

```javascript
// AudioBook Organizer - Comments System

import { formattingData } from './formattingState.js';

let activeCommentPopup = null;

export function addComment(position, text) {
    const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        position: position,
        text: text,
        author: 'user', // Could be expanded for multi-user
        timestamp: new Date().toISOString(),
        resolved: false
    };
    
    formattingData.comments.push(comment);
    return comment;
}

export function showCommentDialog(position) {
    const dialog = document.createElement('div');
    dialog.className = 'comment-dialog';
    dialog.innerHTML = `
        <div class="comment-dialog-content">
            <h4>Add Comment</h4>
            <textarea placeholder="Enter your comment..." rows="3" cols="40" id="commentText"></textarea>
            <div class="comment-dialog-actions">
                <button id="saveComment" class="btn btn-primary">Save</button>
                <button id="cancelComment" class="btn btn-secondary">Cancel</button>
            </div>
        </div>
    `;
    
    // Position dialog
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.zIndex = '1002';
    dialog.style.background = 'white';
    dialog.style.border = '1px solid #ddd';
    dialog.style.borderRadius = '8px';
    dialog.style.padding = '20px';
    dialog.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
    
    document.body.appendChild(dialog);
    
    // Focus textarea
    const textarea = dialog.querySelector('#commentText');
    textarea.focus();
    
    // Handle save
    dialog.querySelector('#saveComment').onclick = () => {
        const text = textarea.value.trim();
        if (text) {
            addComment(position, text);
            // Re-render to show comment
            import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
                applyFormattingToDOM();
            });
        }
        document.body.removeChild(dialog);
    };
    
    // Handle cancel
    dialog.querySelector('#cancelComment').onclick = () => {
        document.body.removeChild(dialog);
    };
    
    // Handle escape key
    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(dialog);
        }
    });
}

export function showCommentPopup(commentId, x, y) {
    hideCommentPopup();
    
    const comment = formattingData.comments.find(c => c.id === commentId);
    if (!comment) return;
    
    const popup = document.createElement('div');
    popup.className = 'comment-popup';
    popup.innerHTML = `
        <div class="comment-text">${comment.text}</div>
        <div class="comment-meta">
            ${new Date(comment.timestamp).toLocaleDateString()} 
            <button onclick="resolveComment('${commentId}')" class="resolve-btn">Resolve</button>
        </div>
    `;
    
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
    document.body.appendChild(popup);
    activeCommentPopup = popup;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (activeCommentPopup === popup) {
            hideCommentPopup();
        }
    }, 5000);
}

export function hideCommentPopup() {
    if (activeCommentPopup) {
        activeCommentPopup.remove();
        activeCommentPopup = null;
    }
}

export function resolveComment(commentId) {
    const comment = formattingData.comments.find(c => c.id === commentId);
    if (comment) {
        comment.resolved = true;
        hideCommentPopup();
        // Re-render to update UI
        import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
            applyFormattingToDOM();
        });
    }
}

// Initialize comment interactions
export function initializeCommentsSystem() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('comment-indicator')) {
            const commentId = e.target.dataset.commentId;
            const rect = e.target.getBoundingClientRect();
            showCommentPopup(commentId, rect.right + 10, rect.top);
        } else {
            hideCommentPopup();
        }
    });
}
```

### Phase 4: Testing & Integration

#### Step 4.1: Initialize New System
**File**: `frontend/js/main.js` (ADD to existing file)

```javascript
// ADD these imports at the top
import { initializeFormattingShortcuts } from './modules/formattingToolbar.js';
import { initializeCommentsSystem } from './modules/commentsSystem.js';
import { applyFormattingToDOM } from './modules/formattingRenderer.js';

// ADD to existing initApp function or create if not exists
window.initializeFormattingSystem = function() {
    initializeFormattingShortcuts();
    initializeCommentsSystem();
    applyFormattingToDOM();
};

// ADD to window globals for HTML access
window.showCommentPopup = function(commentId, x, y) {
    import('./modules/commentsSystem.js').then(({ showCommentPopup }) => {
        showCommentPopup(commentId, x, y);
    });
};

window.resolveComment = function(commentId) {
    import('./modules/commentsSystem.js').then(({ resolveComment }) => {
        resolveComment(commentId);
    });
};
```

---

## 🧪 Testing Plan

### Manual Testing Checklist

#### Basic Formatting
- [ ] **Bold**: Select text, click B button or Ctrl+B
- [ ] **Italic**: Select text, click I button or Ctrl+I  
- [ ] **Underline**: Select text, click U button or Ctrl+U
- [ ] **Clear**: Remove formatting from selected text

#### Hierarchical Structure
- [ ] **Title (H1)**: Apply title formatting
- [ ] **Subtitle (H2)**: Apply subtitle formatting
- [ ] **Section (H3)**: Apply section formatting
- [ ] **Subsection (H4)**: Apply subsection formatting

#### Special Elements
- [ ] **Quotes**: Apply quote formatting with visual styling
- [ ] **Comments**: Add comments at cursor position
- [ ] **Comment Interaction**: Show/hide comment popups

#### Integration Testing
- [ ] **Section Creation**: Ensure sections still work with formatting
- [ ] **Smart Selection**: Verify smart select works with formatted text
- [ ] **Save/Load**: Test formatting persistence in projects
- [ ] **Edit Mode**: Formatting only available in edit mode
- [ ] **Undo Protection**: Change confirmation works with formatting

#### Edge Cases
- [ ] **Overlapping Formats**: Bold + italic text
- [ ] **Section Highlights**: Formatting + section highlights
- [ ] **Text Editing**: Insert/delete text updates formatting positions
- [ ] **Large Documents**: Performance with many formatting ranges

---

## 🚀 Rollout Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Implement `formattingState.js`
2. Implement `formattingRenderer.js`
3. Basic CSS styling
4. Unit tests for position tracking

### Phase 2: UI Integration (Week 2)
1. Implement `formattingToolbar.js`
2. Integrate with `editMode.js`
3. Add keyboard shortcuts
4. Basic user testing

### Phase 3: Advanced Features (Week 3)
1. Implement comments system
2. Advanced formatting options
3. Persistence integration
4. Performance optimization

### Phase 4: Polish & Launch (Week 4)
1. Comprehensive testing
2. User documentation
3. Performance tuning
4. Production deployment

---

## 🔧 Technical Considerations

### Performance Optimization
- **Debounced Rendering**: Don't re-render on every keystroke
- **Range Caching**: Cache computed text node positions
- **Minimal DOM Updates**: Only update changed regions
- **Position Indexing**: Use efficient data structures for position lookups

### Browser Compatibility
- **contenteditable**: Extensive testing across browsers
- **Range API**: Fallbacks for older browsers
- **CSS Flexbox**: Ensure toolbar works on all devices
- **Touch Devices**: Formatting UI for mobile

### Error Handling
- **Position Conflicts**: Handle overlapping/invalid ranges
- **DOM Corruption**: Recover from malformed DOM states  
- **Data Migration**: Handle old projects without formatting
- **Graceful Degradation**: Fall back to plain text on errors

### Future Extensibility
- **Plugin Architecture**: Easy to add new formatting types
- **Theme Support**: Formatting styles should respect themes
- **Export Compatibility**: Maintain export functionality
- **API Design**: Clean interfaces for future features

---

## 📚 Context for AI Implementation

### Key Integration Requirements
1. **Preserve Existing Functionality**: The current section highlight system, smart selection, and storage must continue working unchanged
2. **Character Position Tracking**: All formatting is based on character positions in the plain text `bookText` 
3. **Edit Mode Integration**: Formatting is only available when `isEditMode = true`
4. **DOM Synchronization**: Keep DOM formatting in sync with metadata when text changes
5. **Storage Compatibility**: Extend existing JSON format without breaking old projects

### Critical Implementation Notes
- **Text Node Navigation**: Use TreeWalker API to skip section highlights and existing formatting
- **Position Updates**: When text is inserted/deleted, update all formatting positions accordingly
- **Render Timing**: Apply formatting after section highlights are restored
- **Event Coordination**: Formatting keyboard shortcuts should not interfere with existing shortcuts
- **Memory Management**: Clean up formatting elements and event listeners properly

### Development Priorities
1. **Start with Basic Formatting**: Bold, italic, underline only
2. **Test Integration**: Ensure no conflicts with existing features
3. **Add Hierarchical Structure**: Titles, subtitles, sections
4. **Implement Comments**: As separate feature
5. **Polish UI/UX**: Responsive design and accessibility

This guide provides complete context and step-by-step implementation for adding Microsoft Word-like formatting capabilities while preserving all existing functionality. 