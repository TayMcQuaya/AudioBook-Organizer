# AudioBook Organizer - Cursor Rules

This document outlines the coding standards, architectural patterns, and development guidelines for the AudioBook Organizer project.

## Project Architecture

### Frontend Structure
```
frontend/
├── js/
│   ├── main.js                 # Entry point, global function exports
│   ├── modules/                # Feature-specific modules
│   │   ├── state.js           # Global application state
│   │   ├── sections.js        # Section management
│   │   ├── chapters.js        # Chapter functionality
│   │   ├── smartSelect.js     # Text selection logic
│   │   ├── editMode.js        # Edit/view mode toggle
│   │   ├── ui.js              # UI rendering and updates
│   │   ├── notifications.js   # User feedback system
│   │   ├── bookUpload.js      # File upload handling
│   │   ├── textSelection.js   # Manual text selection
│   │   ├── selectionTools.js  # Selection UI tools
│   │   ├── export.js          # Export functionality
│   │   └── storage.js         # Local storage operations
│   └── utils/
│       └── helpers.js         # Utility functions
├── css/
│   ├── main.css              # Global styles and layout
│   ├── components.css        # Component-specific styles
│   └── themes.css           # Color themes and visual styling
└── public/
    └── index.html           # Main HTML structure
```

## Module Architecture Patterns

### 1. State Management
- **File**: [state.js](mdc:frontend/js/modules/state.js)
- **Pattern**: Centralized state with getter/setter functions
- **Usage**: Import state variables and setters from other modules
```javascript
// Export state variables and management functions
export let bookText = '';
export function setBookText(text) { bookText = text; }
```

### 2. Module Structure Template
Each module should follow this pattern:
```javascript
// Module imports
import { dependency1, dependency2 } from './otherModule.js';
import { showSuccess, showError } from './notifications.js';

// Private variables and functions
let privateVariable = null;

function privateFunction() {
    // Implementation
}

// Public exported functions
export function publicFunction() {
    // Implementation with error handling
    try {
        // Logic here
        showSuccess('Operation completed successfully!');
    } catch (error) {
        console.error('Error in publicFunction:', error);
        showError('Operation failed. Please try again.');
    }
}
```

### 3. Global Function Registration
- **File**: [main.js](mdc:frontend/js/main.js)
- **Pattern**: Import functions and attach to window object for HTML onclick handlers
```javascript
import { functionName } from './modules/moduleName.js';
window.functionName = functionName;
```

## UI Development Patterns

### 1. Dynamic HTML Generation
- **File**: [ui.js](mdc:frontend/js/modules/ui.js)
- **Pattern**: Template literals for complex HTML structures
```javascript
function renderComponent(data) {
    return `
        <div class="component-class" data-id="${data.id}">
            <h3>${data.title}</h3>
            <button onclick="handleAction(${data.id})">Action</button>
        </div>
    `;
}
```

### 2. User Feedback
- **File**: [notifications.js](mdc:frontend/js/modules/notifications.js)
- **Pattern**: Consistent notification system
```javascript
import { showSuccess, showError, showWarning, showInfo } from './notifications.js';

// Usage examples
showSuccess('✅ Operation completed!');
showError('❌ Something went wrong');
showWarning('⚠️ Please be careful');
showInfo('ℹ️ Helpful information');
```

### 3. Modal Dialogs
- **Pattern**: Create, position, and handle modal interactions
```javascript
function createModal() {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <!-- Modal content -->
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}
```

## DOM Manipulation Best Practices

### 1. Safe Range Operations
- **Context**: Text selection and manipulation
- **Pattern**: Always check range validity and handle edge cases
```javascript
function safeRangeOperation() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    // Perform operations
    
    // Clean up
    selection.removeAllRanges();
}
```

### 2. Element Creation and Cleanup
```javascript
// Create elements safely
const element = document.createElement('div');
element.className = 'my-class';
element.textContent = text; // Use textContent for safety

// Cleanup after operations
element.remove();
```

### 3. Event Handling
```javascript
// Add event listeners with cleanup
function initializeEventListeners() {
    const handler = (e) => { /* handle event */ };
    element.addEventListener('event', handler);
    
    // Store reference for cleanup
    return () => element.removeEventListener('event', handler);
}
```

## Error Handling Standards

### 1. Async Function Pattern
```javascript
export async function asyncFunction() {
    try {
        const result = await someAsyncOperation();
        showSuccess('Operation completed!');
        return result;
    } catch (error) {
        console.error('Error in asyncFunction:', error);
        showError('Operation failed. Please try again.');
        throw error; // Re-throw if caller needs to handle
    }
}
```

### 2. Browser Compatibility
- **Pattern**: Provide fallbacks for modern APIs
```javascript
function modernFeatureWithFallback() {
    if (navigator.clipboard && window.isSecureContext) {
        // Use modern API
        return navigator.clipboard.writeText(text);
    } else {
        // Provide fallback
        return fallbackMethod(text);
    }
}
```

## CSS Organization

### 1. Component Styles
- **File**: [components.css](mdc:frontend/css/components.css)
- **Pattern**: Component-scoped class names
```css
.component-name {
    /* Base styles */
}

.component-name:hover {
    /* Hover states */
}

.component-name.modifier {
    /* State variations */
}
```

### 2. Theme Variables
- **File**: [themes.css](mdc:frontend/css/themes.css)
- **Pattern**: CSS custom properties for consistency
```css
:root {
    --primary-color: #4CAF50;
    --section-color-1: #fff3e0;
    /* More variables */
}
```

## Feature Development Guidelines

### 1. Adding New Features
1. **Create Module**: Add new file in `frontend/js/modules/`
2. **Define Interface**: Export public functions clearly
3. **Update Main**: Add global function exports to [main.js](mdc:frontend/js/main.js)
4. **Add Styles**: Create component styles in [components.css](mdc:frontend/css/components.css)
5. **Update UI**: Modify [ui.js](mdc:frontend/js/modules/ui.js) if needed

### 2. State Changes
- **Always use state setters**: Never modify state variables directly
- **Update UI after state changes**: Call appropriate UI update functions
- **Maintain consistency**: Keep state synchronized across modules

### 3. User Interactions
- **Provide feedback**: Always inform users of action results
- **Handle edge cases**: Validate inputs and handle errors gracefully
- **Maintain accessibility**: Ensure keyboard navigation and screen reader support

## Code Quality Standards

### 1. Function Documentation
```javascript
/**
 * Brief description of the function
 * @param {type} paramName - Description of parameter
 * @returns {type} Description of return value
 */
export function documentedFunction(paramName) {
    // Implementation
}
```

### 2. Console Logging
- **Development**: Use console.log for debugging
- **Production**: Use console.error for errors, console.warn for warnings
- **User Feedback**: Always provide UI feedback in addition to console logs

### 3. Variable Naming
- **Functions**: Use camelCase with descriptive verbs
- **Variables**: Use camelCase with descriptive nouns
- **Constants**: Use UPPER_SNAKE_CASE
- **CSS Classes**: Use kebab-case with BEM methodology when appropriate

## Testing Considerations

### 1. Browser Compatibility
- Test in multiple browsers (Chrome, Firefox, Safari, Edge)
- Provide fallbacks for unsupported features
- Handle edge cases gracefully

### 2. User Scenarios
- Test with different file sizes and content types
- Verify error handling with invalid inputs
- Ensure accessibility with keyboard-only navigation

### 3. Performance
- Optimize DOM operations (batch updates when possible)
- Use event delegation for dynamic content
- Minimize memory leaks (remove event listeners, clear timeouts)

## Deployment Notes

### 1. File Organization
- Keep modules focused on single responsibilities
- Maintain clear import/export relationships
- Document dependencies between modules

### 2. Security Considerations
- Sanitize user inputs when displaying in DOM
- Use textContent instead of innerHTML when possible
- Validate file uploads and content types

### 3. Future Extensibility
- Design modules with extension points
- Use consistent patterns across the codebase
- Document architectural decisions and rationale

---

## Quick Reference

### Common Imports
```javascript
// State management
import { bookText, setBookText, chapters } from './state.js';

// User feedback
import { showSuccess, showError, showWarning, showInfo } from './notifications.js';

// UI updates
import { updateChaptersList, updateSelectionColor } from './ui.js';
```

### File Modification Checklist
- [ ] Update relevant module file
- [ ] Add imports if using new dependencies
- [ ] Export new functions if needed
- [ ] Update [main.js](mdc:frontend/js/main.js) for global access
- [ ] Add/update CSS styles
- [ ] Test functionality across browsers
- [ ] Update documentation if architecture changes

This guide ensures consistency and maintainability across the AudioBook Organizer codebase. Follow these patterns when implementing new features or modifying existing functionality. 