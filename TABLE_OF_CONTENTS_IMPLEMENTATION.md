# Table of Contents Sidebar Implementation

## Overview

This document outlines the implementation of a collapsible Table of Contents (TOC) sidebar for the AudioBook Organizer application. The sidebar automatically generates navigation based on document headers and provides smooth scrolling functionality.

## Features

### Core Functionality
- **Auto-generation**: Automatically extracts headers from imported documents
- **Click Navigation**: Click any header to scroll to that section
- **Auto-collapse**: Sidebar closes automatically after navigation
- **Visual Feedback**: Highlights current section based on scroll position
- **Responsive Design**: Adapts to different screen sizes
- **Dark Mode Support**: Full theme integration

### User Experience
- **Smooth Animations**: 300ms CSS transitions for all interactions
- **Keyboard Accessible**: Full keyboard navigation support
- **Mobile Friendly**: Auto-collapses on mobile devices
- **Performance Optimized**: Uses IntersectionObserver for scroll tracking

## Technical Architecture

### File Structure
```
frontend/
├── js/modules/
│   └── tableOfContents.js     # New TOC module
├── css/
│   └── table-of-contents.css  # New TOC styles
└── pages/app/
    └── app.html              # Updated layout (minimal changes)
```

### Integration Points

#### 1. State Management (`state.js`)
```javascript
export let tocState = {
    isVisible: false,
    headers: [],
    activeHeaderId: null,
    isScrolling: false
};
```

#### 2. Header Extraction (`formattingState.js`)
```javascript
export function extractTableOfContents() {
    const headerTypes = ['title', 'subtitle', 'section', 'subsection'];
    return formattingData.ranges
        .filter(range => headerTypes.includes(range.type))
        .sort((a, b) => a.start - b.start)
        .map(range => ({
            id: range.id,
            type: range.type,
            level: getHeaderLevel(range.type),
            text: extractHeaderText(range),
            position: range.start,
            element: null // Will be populated during DOM mapping
        }));
}
```

#### 3. CSS Grid Layout Extension
```css
.main-container {
    grid-template-columns: var(--toc-width, 0) 1fr 1fr;
    transition: grid-template-columns 0.3s var(--animation-ease);
}

.main-container.toc-open {
    --toc-width: 280px;
}
```

## Implementation Details

### HTML Structure
```html
<!-- TOC Toggle Button (added to column header) -->
<button class="toc-toggle-btn" onclick="toggleTableOfContents()">
    <i>📋</i> <span class="toc-toggle-text">TOC</span>
</button>

<!-- TOC Sidebar (new first column) -->
<div class="toc-sidebar" id="tocSidebar">
    <div class="toc-header">
        <h3>📋 Table of Contents</h3>
        <button class="toc-close-btn" onclick="toggleTableOfContents()">×</button>
    </div>
    <div class="toc-content">
        <div id="tocList" class="toc-list">
            <!-- Headers will be populated here -->
        </div>
    </div>
    <div class="toc-footer">
        <small class="toc-count">0 headers found</small>
    </div>
</div>
```

### CSS Implementation

#### Layout Integration
```css
/* Extend existing grid system */
.main-container {
    grid-template-columns: var(--toc-width, 0) 1fr 1fr;
    grid-template-areas: "toc book-content sections";
}

.toc-sidebar {
    grid-area: toc;
    overflow: hidden;
    transition: all 0.3s var(--animation-ease);
}

/* Responsive behavior */
@media (max-width: 768px) {
    .main-container.toc-open {
        --toc-width: 0; /* Auto-collapse on mobile */
    }
}
```

#### Visual Design
```css
.toc-sidebar {
    background: var(--bg-primary);
    border-right: 1px solid var(--border-color);
    box-shadow: var(--shadow-sm);
}

.toc-header {
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
}

.toc-item {
    padding: 8px var(--spacing-md);
    border-bottom: 1px solid rgba(var(--primary-color-rgb), 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
}

.toc-item:hover {
    background: rgba(var(--primary-color-rgb), 0.1);
    transform: translateX(4px);
}

.toc-item.active {
    background: rgba(var(--primary-color-rgb), 0.15);
    border-left: 3px solid var(--primary-color);
}
```

### JavaScript Functionality

#### Core Functions
```javascript
// Initialize TOC system
export function initializeTableOfContents() {
    createTOCElements();
    extractAndDisplayHeaders();
    setupScrollListener();
    setupEventListeners();
}

// Toggle sidebar visibility
export function toggleTableOfContents() {
    const mainContainer = document.querySelector('.main-container');
    const isOpen = tocState.isVisible;
    
    mainContainer.classList.toggle('toc-open', !isOpen);
    tocState.isVisible = !isOpen;
    
    updateToggleButton();
}

// Navigate to header
export function navigateToHeader(headerId) {
    const header = tocState.headers.find(h => h.id === headerId);
    if (!header) return;
    
    scrollToPosition(header.position);
    if (tocState.isVisible) {
        setTimeout(() => toggleTableOfContents(), 300);
    }
}

// Update active header based on scroll
function updateActiveHeader() {
    const bookContent = document.getElementById('bookContent');
    const scrollTop = bookContent.scrollTop;
    
    // Find closest header using IntersectionObserver
    // Implementation details...
}
```

## Integration Workflow

### 1. App Initialization
```javascript
// In appInitialization.js
import { initializeTableOfContents } from './tableOfContents.js';

export async function initApp() {
    // ... existing initialization
    
    // Initialize TOC after content is loaded
    initializeTableOfContents();
    
    // ... rest of initialization
}
```

### 2. Book Upload Integration
```javascript
// In bookUpload.js
import { refreshTableOfContents } from './tableOfContents.js';

function handleUploadSuccess(text, formattingData) {
    // ... existing upload handling
    
    // Refresh TOC with new content
    setTimeout(() => {
        refreshTableOfContents();
    }, 200); // Allow DOM to update
}
```

### 3. Formatting System Integration
```javascript
// In formattingState.js
import { refreshTableOfContents } from './tableOfContents.js';

export function addFormattingRange(start, end, type, level = 1, data = {}) {
    // ... existing formatting logic
    
    // Refresh TOC if header was added
    if (['title', 'subtitle', 'section', 'subsection'].includes(type)) {
        setTimeout(refreshTableOfContents, 100);
    }
    
    return range;
}
```

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: TOC only initializes when first opened
2. **Debounced Scroll**: Scroll listener uses requestAnimationFrame
3. **Virtual Scrolling**: For documents with 100+ headers
4. **Caching**: Header positions cached until content changes

### Memory Management
- Event listeners cleaned up on page navigation
- IntersectionObserver disconnected when not needed
- DOM elements removed on cleanup

## Testing Strategy

### Unit Tests
- Header extraction accuracy
- Position calculation correctness
- State management consistency

### Integration Tests
- Book upload → TOC generation
- Header navigation → scroll behavior
- Responsive design → mobile collapse

### User Acceptance Tests
- Click header → scroll to section ✓
- Auto-close after navigation ✓
- Visual feedback on scroll ✓
- Dark mode compatibility ✓

## Browser Compatibility

### Supported Features
- **CSS Grid**: IE11+ (with prefixes)
- **IntersectionObserver**: Chrome 51+, Firefox 55+, Safari 12.1+
- **CSS Custom Properties**: IE11+ (with fallbacks)
- **ES6 Modules**: All modern browsers

### Fallback Strategy
- Progressive enhancement: TOC gracefully disabled if APIs unavailable
- CSS fallbacks for older browsers
- Polyfills only loaded when needed

## Deployment Checklist

### Pre-deployment
- [ ] TOC generates correctly for all document types
- [ ] Smooth scrolling works across browsers
- [ ] Auto-collapse functions properly
- [ ] Dark mode styling matches app theme
- [ ] Mobile responsive behavior verified
- [ ] Performance impact measured (< 5ms initialization)

### Post-deployment Monitoring
- [ ] User engagement with TOC feature
- [ ] Error rates for scroll navigation
- [ ] Performance metrics (scroll lag, memory usage)
- [ ] Accessibility compliance verification

## Future Enhancements

### Phase 2 Features
- **Search within TOC**: Filter headers by text
- **Nested Collapsing**: Expand/collapse subsections
- **Bookmark System**: Save frequently accessed sections
- **Export TOC**: Generate standalone navigation file

### Advanced Features
- **Smart Highlighting**: ML-based section detection
- **Reading Progress**: Visual progress indicator
- **Voice Navigation**: "Navigate to Chapter 3"
- **Collaborative TOC**: Shared bookmarks and notes

---

This implementation provides a robust, production-ready Table of Contents system that integrates seamlessly with the existing AudioBook Organizer architecture while maintaining performance and accessibility standards. 