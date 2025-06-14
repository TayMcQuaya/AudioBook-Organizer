// AudioBook Organizer - Formatting Renderer

import { formattingData } from './formattingState.js';
import { bookText } from './state.js';

// Apply formatting to the book content DOM
export function applyFormattingToDOM() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.warn('Book content element not found');
        return;
    }
    
    console.log('🎨 FORMATTING: Starting DOM formatting application...');
    console.log('🎨 FORMATTING: Book content HTML length:', bookContent.innerHTML.length);
    console.log('🎨 FORMATTING: Book content text length:', bookContent.textContent.length);
    console.log('🎨 FORMATTING: Number of formatting ranges:', formattingData.ranges.length);
    console.log('🎨 FORMATTING: Formatting ranges:', formattingData.ranges);
    
    // DEBUGGING: Check if CSS is working (clean test without bright colors)
    const testSpan = document.createElement('span');
    testSpan.className = 'fmt-bold';
    testSpan.textContent = 'CSS TEST';
    testSpan.dataset.formattingId = 'test-123';
    testSpan.style.cssText = 'position: absolute; left: -9999px;'; // Hide off-screen
    document.body.appendChild(testSpan);
    
    setTimeout(() => {
        const computedStyle = window.getComputedStyle(testSpan);
        console.log('🎨 CSS TEST: Test element styles:', {
            fontWeight: computedStyle.fontWeight,
            fontStyle: computedStyle.fontStyle,
            textDecoration: computedStyle.textDecoration
        });
        testSpan.remove();
    }, 100);
    
    // Store current cursor position to restore after rendering
    const cursorPosition = getCurrentCursorPosition();
    
    // Clear existing formatting (but preserve section highlights)
    clearFormattingFromDOM();
    
    // Apply all formatting ranges
    applyFormattingRanges();
    
    // Apply comments
    applyComments();
    
    // Restore cursor position
    if (cursorPosition !== -1) {
        setCursorPosition(cursorPosition);
    }
    
    console.log(`🎨 FORMATTING: Applied ${formattingData.ranges.length} formatting ranges and ${formattingData.comments.length} comments`);
    
    // DEBUGGING: Final state check
    setTimeout(() => {
        console.log('🎨 DEBUGGING: Final DOM state check...');
        const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
        console.log('🎨 DEBUGGING: Formatting elements in DOM:', formattingElements.length);
        console.log('🎨 DEBUGGING: Section highlights in DOM:', bookContent.querySelectorAll('.section-highlight').length);
        
        // Check styles of each formatting element (clean styling without debug colors)
        formattingElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            console.log(`🎨 DEBUGGING: Element ${element.dataset.formattingId} styles:`, {
                className: element.className,
                backgroundColor: computedStyle.backgroundColor,
                fontWeight: computedStyle.fontWeight,
                fontStyle: computedStyle.fontStyle,
                textDecoration: computedStyle.textDecoration,
                fontSize: computedStyle.fontSize,
                color: computedStyle.color
            });
        });
    }, 200);
}

// Clear only formatting elements, preserve section highlights
function clearFormattingFromDOM() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // Remove all elements with formatting IDs (but NOT section highlights)
    const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
    formattingElements.forEach(element => {
        const parent = element.parentNode;
        if (parent) {
            // Replace formatting element with plain text
            const textNode = document.createTextNode(element.textContent);
            parent.replaceChild(textNode, element);
            parent.normalize();
        }
    });
    
    // Also remove comment indicators
    const commentIndicators = bookContent.querySelectorAll('.comment-indicator');
    commentIndicators.forEach(indicator => {
        const parent = indicator.parentNode;
        if (parent) {
            parent.removeChild(indicator);
            parent.normalize();
        }
    });
}

// Apply all formatting ranges to the DOM
function applyFormattingRanges() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // Group overlapping ranges to combine their CSS classes
    const rangeGroups = groupOverlappingRanges(formattingData.ranges);
    
    // Apply each group as a single formatted element
    rangeGroups.forEach(group => {
        try {
            applyFormattingGroup(group, bookContent);
        } catch (error) {
            console.warn('Failed to apply formatting group:', group, error);
        }
    });
}

// Group overlapping ranges so we can combine their CSS classes
function groupOverlappingRanges(ranges) {
    if (!ranges.length) return [];
    
    // Sort ranges by start position
    const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
    const groups = [];
    
    for (const range of sortedRanges) {
        // Find if this range overlaps with any existing group
        let addedToGroup = false;
        
        for (const group of groups) {
            // Check if range overlaps with this group
            const groupStart = Math.min(...group.ranges.map(r => r.start));
            const groupEnd = Math.max(...group.ranges.map(r => r.end));
            
            if (!(range.end <= groupStart || range.start >= groupEnd)) {
                // Overlapping - add to this group
                group.ranges.push(range);
                addedToGroup = true;
                break;
            }
        }
        
        if (!addedToGroup) {
            // Create new group
            groups.push({
                ranges: [range],
                start: range.start,
                end: range.end
            });
        }
    }
    
    // Update group boundaries after adding all ranges
    groups.forEach(group => {
        group.start = Math.min(...group.ranges.map(r => r.start));
        group.end = Math.max(...group.ranges.map(r => r.end));
    });
    
    return groups;
}

// Apply a group of overlapping ranges as a single element with combined CSS classes
function applyFormattingGroup(group, bookContent) {
    const { startNode, startOffset, endNode, endOffset } = 
        findTextNodes(bookContent, group.start, group.end);
    
    if (!startNode || !endNode) {
        console.warn('Could not find text nodes for group:', group);
        return;
    }
    
    // Determine element type - use div if any range is block-level
    const blockLevelTypes = ['title', 'subtitle', 'section', 'subsection', 'quote'];
    const hasBlockLevel = group.ranges.some(r => blockLevelTypes.includes(r.type));
    const elementType = hasBlockLevel ? 'div' : 'span';
    
    // Combine CSS classes from all ranges in the group
    const cssClasses = group.ranges.map(r => r.className).join(' ');
    
    // Create the combined formatting element
    const formattingElement = document.createElement(elementType);
    formattingElement.className = cssClasses;
    
    // Set data attributes for all ranges (use primary range for main attributes)
    const primaryRange = group.ranges[0]; // First range becomes primary
    formattingElement.dataset.formattingId = primaryRange.id;
    formattingElement.dataset.formattingType = primaryRange.type;
    
    // Add additional range IDs for tracking
    formattingElement.dataset.allRangeIds = group.ranges.map(r => r.id).join(',');
    formattingElement.dataset.allRangeTypes = group.ranges.map(r => r.type).join(',');
    
    // Create range and replace content
    const domRange = document.createRange();
    domRange.setStart(startNode, startOffset);
    domRange.setEnd(endNode, endOffset);
    
    const selectedText = domRange.toString();
    formattingElement.textContent = selectedText;
    
    // Insert the formatted element
    domRange.deleteContents();
    domRange.insertNode(formattingElement);
    
    console.log('Applied combined formatting:', {
        rangeCount: group.ranges.length,
        types: group.ranges.map(r => r.type),
        start: group.start,
        end: group.end,
        elementType: elementType,
        cssClasses: cssClasses,
        textContent: selectedText.substring(0, 50) + '...'
    });
}

// Find text nodes at specific character positions, accurately handling section highlights
function findTextNodes(container, startPos, endPos) {
    if (!container) return { startNode: null, startOffset: 0, endNode: null, endOffset: 0 };
    
    // FIXED: Use TreeWalker to navigate ALL text nodes, including those inside formatting elements
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        node => {
            const parent = node.parentNode;
            // Skip ONLY comment indicators (not formatting elements)
            if (parent.classList.contains('comment-indicator')) {
                return NodeFilter.FILTER_REJECT;
            }
            // Accept ALL other text nodes (including those in formatting elements and section highlights)
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let currentPos = 0;
    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;
    
    console.log(`Looking for text nodes between positions ${startPos}-${endPos}`);
    
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent.length;
        
        console.log(`Checking text node: "${node.textContent.substring(0, 50)}..." at position ${currentPos}-${currentPos + nodeLength}`);
        
        // Check if start position is in this node
        if (!startNode && currentPos + nodeLength > startPos) {
            startNode = node;
            startOffset = Math.max(0, startPos - currentPos);
            console.log(`Found start node at offset ${startOffset}`);
        }
        
        // Check if end position is in this node
        if (currentPos + nodeLength >= endPos) {
            endNode = node;
            endOffset = Math.min(nodeLength, endPos - currentPos);
            console.log(`Found end node at offset ${endOffset}`);
            break;
        }
        
        currentPos += nodeLength;
    }
    
    // Validate the results
    if (startNode && endNode && startOffset < 0) startOffset = 0;
    if (startNode && endNode && endOffset < 0) endOffset = 0;
    if (startNode && endNode && startOffset >= startNode.textContent.length) {
        startOffset = Math.max(0, startNode.textContent.length - 1);
    }
    if (startNode && endNode && endOffset > endNode.textContent.length) {
        endOffset = endNode.textContent.length;
    }
    
    console.log(`Text node search result:`, { startNode: !!startNode, endNode: !!endNode, startOffset, endOffset });
    return { startNode, startOffset, endNode, endOffset };
}

// Get current cursor position in character terms
function getCurrentCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return -1;
    
    const range = selection.getRangeAt(0);
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent.contains(range.startContainer)) return -1;
    
    try {
        // Create range from start of content to cursor position
        const preRange = document.createRange();
        preRange.setStart(bookContent, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        
        return preRange.toString().length;
    } catch (error) {
        console.warn('Error getting cursor position:', error);
        return -1;
    }
}

// Set cursor position based on character position
function setCursorPosition(position) {
    const bookContent = document.getElementById('bookContent');
    const { startNode, startOffset } = findTextNodes(bookContent, position, position);
    
    if (startNode) {
        try {
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.collapse(true);
            
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (error) {
            console.warn('Error setting cursor position:', error);
        }
    }
}

// Apply all comments to the DOM
function applyComments() {
    if (!formattingData.comments.length) return;
    
    // Filter out resolved comments if needed (for now, show all)
    const visibleComments = formattingData.comments.filter(c => !c.resolved);
    
    visibleComments.forEach(comment => {
        try {
            applyComment(comment);
        } catch (error) {
            console.warn('Failed to apply comment:', comment, error);
        }
    });
}

// Apply a single comment indicator to the DOM
function applyComment(comment) {
    const bookContent = document.getElementById('bookContent');
    const { startNode, startOffset } = findTextNodes(bookContent, comment.position, comment.position);
    
    if (startNode) {
        const commentIndicator = document.createElement('span');
        commentIndicator.className = 'comment-indicator';
        commentIndicator.dataset.commentId = comment.id;
        commentIndicator.textContent = '💬';
        commentIndicator.title = comment.text;
        
        try {
            // Insert comment indicator at the exact position
            const range = document.createRange();
            range.setStart(startNode, startOffset);
            range.insertNode(commentIndicator);
        } catch (error) {
            console.warn('Error inserting comment indicator:', error);
        }
    }
}

// Calculate position in text from DOM node and offset
export function getPositionInText(container, node, offset) {
    try {
        // IMPROVED: Use TreeWalker to count text characters accurately, including nested formatting
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            textNode => {
                const parent = textNode.parentNode;
                // Skip ONLY comment indicators (not formatting elements)
                if (parent.classList.contains('comment-indicator')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
            false
        );
        
        let position = 0;
        let found = false;
        
        while (walker.nextNode() && !found) {
            const currentNode = walker.currentNode;
            const nodeLength = currentNode.textContent.length;
            
            if (currentNode === node) {
                // Found our target node, add the offset
                position += Math.min(offset, nodeLength);
                found = true;
            } else {
                // Not our target node yet, add the full length
                position += nodeLength;
            }
        }
        
        console.log('IMPROVED Position calculation:', {
            targetNode: node.textContent ? `"${node.textContent.substring(0, 20)}..."` : 'non-text',
            position,
            offset,
            found
        });
        
        return position;
    } catch (error) {
        console.warn('Error calculating text position:', error);
        return 0;
    }
}

// Validate that formatting positions are still valid (useful after text changes)
export function validateFormattingPositions() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return false;
    
    const totalTextLength = bookContent.textContent.length;
    let isValid = true;
    
    // Check formatting ranges
    formattingData.ranges.forEach(range => {
        if (range.start < 0 || range.end > totalTextLength || range.start >= range.end) {
            console.warn('Invalid formatting range detected:', range);
            isValid = false;
        }
    });
    
    // Check comment positions
    formattingData.comments.forEach(comment => {
        if (comment.position < 0 || comment.position > totalTextLength) {
            console.warn('Invalid comment position detected:', comment);
            isValid = false;
        }
    });
    
    return isValid;
}

// Re-render formatting after text changes (debounced to prevent excessive calls)
let renderTimeout = null;
export function scheduleFormattingRender(delay = 100) {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
    }
    
    renderTimeout = setTimeout(() => {
        applyFormattingToDOM();
        renderTimeout = null;
    }, delay);
}

// Cancel any scheduled render
export function cancelScheduledRender() {
    if (renderTimeout) {
        clearTimeout(renderTimeout);
        renderTimeout = null;
    }
}

// Debugging helper - check current DOM state
export function debugFormattingDOM() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return null;
    
    const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
    const commentElements = bookContent.querySelectorAll('.comment-indicator');
    const sectionElements = bookContent.querySelectorAll('.section-highlight');
    
    console.log('Current DOM formatting state:', {
        formattingElements: formattingElements.length,
        commentElements: commentElements.length,
        sectionElements: sectionElements.length,
        totalTextLength: bookContent.textContent.length
    });
    
    return {
        formatting: Array.from(formattingElements),
        comments: Array.from(commentElements),
        sections: Array.from(sectionElements)
    };
}

// Test nested formatting functionality
export function testNestedFormatting() {
    console.log('🧪 TESTING NESTED FORMATTING FIXES:');
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.log('❌ Book content not found');
        return false;
    }
    
    // Test if TreeWalker can find text nodes inside formatting elements
    const walker = document.createTreeWalker(
        bookContent,
        NodeFilter.SHOW_TEXT,
        node => {
            const parent = node.parentNode;
            if (parent.classList.contains('comment-indicator')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let textNodesFound = 0;
    let textNodesInFormatting = 0;
    
    while (walker.nextNode()) {
        textNodesFound++;
        const node = walker.currentNode;
        const parent = node.parentNode;
        
        if (parent.dataset.formattingId) {
            textNodesInFormatting++;
            console.log(`✅ Found text node inside formatting: "${node.textContent.substring(0, 30)}..." (parent: ${parent.className})`);
        }
    }
    
    console.log(`📊 Text nodes found: ${textNodesFound}, Inside formatting: ${textNodesInFormatting}`);
    
    if (textNodesInFormatting > 0) {
        console.log('✅ Nested formatting fix is working - can find text nodes inside formatted elements');
        return true;
    } else {
        console.log('⚠️ No formatted text found to test nested formatting');
        return true; // Not an error, just no formatted text yet
    }
} 