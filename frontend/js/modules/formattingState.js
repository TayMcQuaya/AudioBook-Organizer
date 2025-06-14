// AudioBook Organizer - Formatting State Management

// Formatting data structure - separate from main bookText to preserve existing functionality
export let formattingData = {
    ranges: [],
    comments: [],
    version: '1.0'
};

// Formatting range class for type safety and consistent structure
export class FormattingRange {
    constructor(start, end, type, level = 1, data = {}) {
        this.id = `fmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.start = start;
        this.end = end;
        this.type = type;
        this.level = level;
        // For heading types, don't append level to className since CSS classes are predefined
        // For other types (like future multi-level formatting), keep the level
        const headingTypes = ['title', 'subtitle', 'section', 'subsection'];
        this.className = headingTypes.includes(type) ? `fmt-${type}` : `fmt-${type}${level > 1 ? `-${level}` : ''}`;
        this.data = data;
        
        // NEW: User attribution for collaboration
        const currentUser = window.authModule?.getCurrentUser();
        this.createdBy = currentUser?.id || 'anonymous';
        this.createdAt = new Date().toISOString();
    }
}

// Comment class for consistent structure
export class FormattingComment {
    constructor(position, text, author = 'user') {
        this.id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.position = position;
        this.text = text;
        this.author = author;
        this.timestamp = new Date().toISOString();
        this.resolved = false;
        
        // NEW: Enhanced user attribution for collaboration
        const currentUser = window.authModule?.getCurrentUser();
        this.createdBy = currentUser?.id || author || 'anonymous';
        this.createdAt = this.timestamp;
    }
}

// State management functions - following same pattern as state.js
export function addFormattingRange(start, end, type, level = 1, data = {}) {
    // Validate input parameters
    if (typeof start !== 'number' || typeof end !== 'number' || start < 0 || end < start) {
        console.warn('Invalid formatting range parameters:', { start, end, type });
        return null;
    }
    
    // Check for existing overlapping ranges of the same type
    const overlappingRanges = formattingData.ranges.filter(range => 
        range.type === type &&
        !(range.end < start || range.start > end)
    );
    
    // If there are overlapping ranges of the same type, merge them
    if (overlappingRanges.length > 0) {
        // Remove all overlapping ranges
        overlappingRanges.forEach(range => {
            const index = formattingData.ranges.findIndex(r => r.id === range.id);
            if (index !== -1) {
                formattingData.ranges.splice(index, 1);
            }
        });
        
        // Create a new range that encompasses all
        start = Math.min(start, ...overlappingRanges.map(r => r.start));
        end = Math.max(end, ...overlappingRanges.map(r => r.end));
    }
    
    // Create and add the new range
    const range = new FormattingRange(start, end, type, level, data);
    formattingData.ranges.push(range);
    
    // Sort ranges by start position and length for consistent rendering
    formattingData.ranges.sort((a, b) => {
        if (a.start !== b.start) {
            return a.start - b.start;
        }
        return (a.end - a.start) - (b.end - b.start);
    });
    
    console.log(`Added formatting range: ${type} at ${start}-${end}`);
    return range;
}

export function removeFormattingRange(id) {
    if (!formattingData || !formattingData.ranges) {
        console.warn('🎨 FORMATTING STATE: formattingData not initialized');
        return false;
    }
    
    const index = formattingData.ranges.findIndex(range => range.id === id);
    if (index !== -1) {
        const removedRange = formattingData.ranges.splice(index, 1)[0];
        console.log(`🎨 FORMATTING STATE: Removed formatting range ${id} (${removedRange.type})`);
        return true;
    }
    console.warn(`🎨 FORMATTING STATE: Range ${id} not found for removal`);
    return false;
}

export function getFormattingAtPosition(position) {
    return formattingData.ranges.filter(range => 
        position >= range.start && position <= range.end
    );
}

export function getFormattingInRange(start, end) {
    return formattingData.ranges.filter(r => 
        !(r.end < start || r.start > end) // Overlapping ranges
    );
}

export function addComment(position, text, author = 'user') {
    if (typeof position !== 'number' || position < 0 || !text || !text.trim()) {
        console.warn('Invalid comment parameters:', { position, text });
        return null;
    }
    
    const comment = new FormattingComment(position, text.trim(), author);
    formattingData.comments.push(comment);
    console.log(`Added comment at position ${position}`);
    return comment;
}

export function removeComment(id) {
    const originalLength = formattingData.comments.length;
    formattingData.comments = formattingData.comments.filter(c => c.id !== id);
    const removed = formattingData.comments.length < originalLength;
    if (removed) {
        console.log(`Removed comment: ${id}`);
    }
    return removed;
}

export function resolveComment(id) {
    const comment = formattingData.comments.find(c => c.id === id);
    if (comment) {
        comment.resolved = true;
        console.log(`Resolved comment: ${id}`);
        return true;
    }
    return false;
}

// Critical function: Update formatting positions when text changes
export function updateFormattingPositions(insertPosition, insertLength, deleteLength = 0) {
    const netChange = insertLength - deleteLength;
    
    console.log(`Updating formatting positions: insert at ${insertPosition}, net change: ${netChange}`);
    
    // Update formatting ranges
    formattingData.ranges.forEach(range => {
        // If change is before the range, shift the entire range
        if (insertPosition <= range.start) {
            range.start += netChange;
            range.end += netChange;
        }
        // If change is within the range, only shift the end
        else if (insertPosition < range.end) {
            range.end += netChange;
            // Ensure range doesn't become invalid
            if (range.end <= range.start) {
                range.end = range.start + 1;
            }
        }
        // If change is after the range, no update needed
    });
    
    // Update comment positions
    formattingData.comments.forEach(comment => {
        if (comment.position >= insertPosition) {
            comment.position += netChange;
            // Ensure position doesn't become negative
            if (comment.position < 0) {
                comment.position = 0;
            }
        }
    });
    
    console.log(`Updated ${formattingData.ranges.length} ranges and ${formattingData.comments.length} comments`);
}

// Remove overlapping or invalid ranges
export function cleanupFormattingRanges() {
    const originalLength = formattingData.ranges.length;
    
    // Remove invalid ranges (where start >= end)
    formattingData.ranges = formattingData.ranges.filter(range => range.start < range.end);
    
    // Sort ranges by start position for easier processing
    formattingData.ranges.sort((a, b) => a.start - b.start);
    
    const cleaned = originalLength - formattingData.ranges.length;
    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} invalid formatting ranges`);
    }
}

// Clear all formatting - useful for new book uploads
export function clearFormatting() {
    const rangeCount = formattingData.ranges.length;
    const commentCount = formattingData.comments.length;
    
    formattingData.ranges = [];
    formattingData.comments = [];
    
    console.log(`Cleared ${rangeCount} formatting ranges and ${commentCount} comments`);
}

// Set complete formatting data - for loading projects
export function setFormattingData(newData) {
    if (!newData || typeof newData !== 'object') {
        console.warn('Invalid formatting data provided');
        clearFormatting();
        return;
    }
    
    // Ensure required structure exists
    formattingData = {
        ranges: Array.isArray(newData.ranges) ? newData.ranges : [],
        comments: Array.isArray(newData.comments) ? newData.comments : [],
        version: newData.version || '1.0'
    };
    
    // Clean up any invalid ranges after loading
    cleanupFormattingRanges();
    
    console.log(`Loaded formatting data: ${formattingData.ranges.length} ranges, ${formattingData.comments.length} comments`);
}

// Get current formatting statistics
export function getFormattingStats() {
    return {
        ranges: formattingData.ranges.length,
        comments: formattingData.comments.length,
        activeComments: formattingData.comments.filter(c => !c.resolved).length,
        version: formattingData.version
    };
}

// Debugging helper
export function logFormattingState() {
    console.log('Current formatting state:', {
        ranges: formattingData.ranges,
        comments: formattingData.comments,
        stats: getFormattingStats()
    });
}

// COMPREHENSIVE DEBUGGING FUNCTION
export function runFormattingSystemDiagnostics() {
    console.log('🔍 ===== FORMATTING SYSTEM DIAGNOSTICS =====');
    
    // 1. Check CSS Loading
    console.log('🔍 1. CSS LOADING CHECK:');
    const testElement = document.createElement('div');
    testElement.className = 'fmt-bold';
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    document.body.appendChild(testElement);
    
    const computedStyle = window.getComputedStyle(testElement);
    console.log('   - CSS background color:', computedStyle.backgroundColor);
    console.log('   - CSS font weight:', computedStyle.fontWeight);
    console.log('   - CSS border:', computedStyle.border);
    document.body.removeChild(testElement);
    
    // 2. Check DOM Structure
    console.log('🔍 2. DOM STRUCTURE CHECK:');
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        console.log('   - Book content element found:', true);
        console.log('   - Book content classes:', bookContent.className);
        console.log('   - Book content text length:', bookContent.textContent.length);
        console.log('   - Book content innerHTML length:', bookContent.innerHTML.length);
        console.log('   - Section highlights:', bookContent.querySelectorAll('.section-highlight').length);
        console.log('   - Formatting elements:', bookContent.querySelectorAll('[data-formatting-id]').length);
    } else {
        console.log('   - Book content element found:', false);
    }
    
    // 3. Check Formatting State
    console.log('🔍 3. FORMATTING STATE CHECK:');
    console.log('   - Number of ranges:', formattingData.ranges.length);
    console.log('   - Number of comments:', formattingData.comments.length);
    console.log('   - Formatting ranges:', formattingData.ranges);
    
    // 4. Check Edit Mode
    console.log('🔍 4. EDIT MODE CHECK:');
    import('./editMode.js').then(({ getEditMode }) => {
        console.log('   - Edit mode active:', getEditMode());
    }).catch(error => {
        console.log('   - Could not check edit mode:', error);
    });
    
    // 5. Check Toolbar
    console.log('🔍 5. TOOLBAR CHECK:');
    const toolbar = document.getElementById('formattingToolbar');
    console.log('   - Toolbar element found:', !!toolbar);
    if (toolbar) {
        console.log('   - Toolbar visible:', toolbar.style.display !== 'none');
        console.log('   - Toolbar parent:', toolbar.parentNode ? toolbar.parentNode.tagName : 'none');
    }
    
    // 6. Test Formatting Application
    console.log('🔍 6. FORMATTING APPLICATION TEST:');
    if (bookContent && bookContent.textContent.length > 10) {
        // Add a test formatting range
        const testRange = addFormattingRange(0, 10, 'bold', 1, { test: true });
        console.log('   - Test range created:', !!testRange);
        
        if (testRange) {
            // Try to apply it
            import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
                console.log('   - Applying test formatting...');
                applyFormattingToDOM();
                
                setTimeout(() => {
                    const testElements = bookContent.querySelectorAll('[data-formatting-id]');
                    console.log('   - Test formatting elements created:', testElements.length);
                    
                    if (testElements.length > 0) {
                        const testEl = testElements[0];
                        const styles = window.getComputedStyle(testEl);
                        console.log('   - Test element styles:', {
                            backgroundColor: styles.backgroundColor,
                            fontWeight: styles.fontWeight,
                            border: styles.border
                        });
                    }
                    
                    // Clean up test range
                    removeFormattingRange(testRange.id);
                    console.log('   - Test range cleaned up');
                }, 500);
            }).catch(error => {
                console.log('   - Error applying test formatting:', error);
            });
        }
    } else {
        console.log('   - Cannot test: no book content or too short');
    }
    
    console.log('🔍 ===== DIAGNOSTICS COMPLETE =====');
}

// Test function for console debugging
export function testFormattingSystem() {
    console.log('🧪 ===== FORMATTING SYSTEM TEST =====');
    
    // Clear any existing formatting
    clearFormatting();
    
    // Add a test range
    const testRange = addFormattingRange(0, 20, 'bold', 1, { test: true });
    console.log('✅ Test range added:', testRange);
    
    // Check if we can retrieve it
    const formatsAt10 = getFormattingAtPosition(10);
    console.log('✅ Formats at position 10:', formatsAt10);
    
    // Test removal
    if (testRange) {
        const removed = removeFormattingRange(testRange.id);
        console.log('✅ Test range removed:', removed);
    }
    
    // Check state
    console.log('✅ Final formatting data:', formattingData);
    console.log('✅ Final stats:', getFormattingStats());
    
    console.log('🧪 ===== TEST COMPLETE =====');
    return 'Test completed - check console for results';
}

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
    window.testFormattingSystem = testFormattingSystem;
} 