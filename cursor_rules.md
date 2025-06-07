# Cursor Rules for AudioBook Organizer

## Project Overview
This document outlines the rules and best practices for working with the AudioBook Organizer project in Cursor IDE.

## Code Organization

### File Structure
- `public/` - Contains all frontend assets and HTML
- `uploads/` - Stores uploaded audio files
- `exports/` - Contains exported audiobook data
- Server-side files in root directory

### Naming Conventions
1. **Files**
   - Use lowercase with hyphens for file names: `audio-player.js`
   - HTML files: `index.html`, `templates/*.html`
   - JavaScript files: `*.js`
   - Style files: `*.css`

2. **Functions**
   - Use camelCase for function names: `playChapter()`, `attachAudio()`
   - Event handlers should start with a verb: `handleDragStart()`, `toggleChapter()`

3. **Variables**
   - Use camelCase for variable names: `chapterPlayers`, `currentSection`
   - Constants in UPPER_SNAKE_CASE: `MAX_COLORS`, `UPLOAD_FOLDER`
   - Boolean variables should be prefixed with is/has: `isPlaying`, `hasAudio`

4. **CSS Classes**
   - Use kebab-case for class names: `chapter-item`, `section-highlight`
   - State classes should be descriptive: `is-playing`, `is-collapsed`

## Code Style

### JavaScript
1. **Functions**
   - Keep functions focused and single-purpose
   - Document complex functions with JSDoc comments
   - Maximum function length: 30 lines (excluding comments)

2. **Variables**
   - Use `const` by default, `let` when reassignment is needed
   - Avoid global variables except for app-wide state (`chapters`, `bookText`)
   - Initialize variables at declaration when possible

3. **Error Handling**
   - Use try/catch blocks for async operations
   - Provide user-friendly error messages
   - Log errors to console for debugging

### HTML
1. **Structure**
   - Use semantic HTML elements
   - Keep nesting levels minimal
   - Include ARIA attributes for accessibility

2. **Components**
   - Each major feature should be a self-contained component
   - Use consistent class naming within components
   - Document component structure with comments

### CSS
1. **Organization**
   - Group related styles together
   - Use CSS variables for theming
   - Follow mobile-first approach

2. **Best Practices**
   - Avoid !important
   - Use classes over IDs for styling
   - Keep selectors specific but not overly complex

## Audio Handling

### File Management
1. **Uploads**
   - Validate audio files before upload
   - Use unique filenames to prevent conflicts
   - Clean up unused audio files periodically

2. **Processing**
   - Handle both MP3 and WAV formats
   - Convert files to consistent format if needed
   - Preserve audio metadata when possible

### Playback
1. **Chapter Player**
   - Initialize players only when needed
   - Clean up resources when stopping playback
   - Handle section reordering gracefully

2. **Section Audio**
   - Maintain proper audio state during drag-and-drop
   - Update UI to reflect audio status
   - Handle missing audio files gracefully

## State Management

### Data Structure
1. **Chapters**
   - Maintain consistent chapter structure
   - Update all related components on changes
   - Validate chapter data before updates

2. **Sections**
   - Keep section order synchronized
   - Update highlight spans when sections change
   - Maintain section-audio relationships

### UI Updates
1. **Rendering**
   - Use efficient DOM updates
   - Maintain scroll position during updates
   - Handle large chapter lists smoothly

2. **Event Handling**
   - Debounce frequent events
   - Clean up event listeners when removing elements
   - Prevent event bubbling when needed

## Testing

### Manual Testing
1. **Features to Test**
   - Chapter creation and deletion
   - Section reordering
   - Audio playback
   - Export/Import functionality

2. **Edge Cases**
   - Empty chapters/sections
   - Invalid audio files
   - Concurrent operations
   - Browser compatibility

### Bug Reporting
1. **Information to Include**
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS details
   - Console errors if any

## Version Control

### Commits
1. **Message Format**
   - Start with verb (add, fix, update)
   - Keep messages clear and concise
   - Reference issue numbers when applicable

2. **Best Practices**
   - Commit related changes together
   - Test before committing
   - Keep commits focused and atomic

## Documentation

### Code Comments
1. **When to Comment**
   - Complex algorithms
   - Non-obvious business logic
   - Public API methods
   - Important state changes

2. **Format**
   - Use JSDoc for function documentation
   - Keep comments current with code
   - Explain why, not what

### README Updates
1. **Keep Updated**
   - Installation instructions
   - Usage examples
   - Configuration options
   - Known issues

## Performance

### Optimization
1. **Audio**
   - Load audio files on demand
   - Clean up unused audio elements
   - Optimize file sizes when possible

2. **UI**
   - Minimize DOM updates
   - Use efficient selectors
   - Implement virtual scrolling for large lists

### Memory Management
1. **Resource Cleanup**
   - Remove event listeners
   - Dispose of audio players
   - Clear temporary data 