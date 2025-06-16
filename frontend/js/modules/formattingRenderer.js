// AudioBook Organizer - Enhanced Formatting Renderer for DOCX Import

import { formattingData } from './formattingState.js';
import { bookText } from './state.js';

// Apply formatting to the book content DOM with enhanced DOCX support
export function applyFormattingToDOM() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.warn('Book content element not found');
        return;
    }
    
    console.log('🎨 FORMATTING: Starting enhanced DOM formatting application...');
    console.log('🎨 FORMATTING: Book content text length:', bookContent.textContent.length);
    console.log('🎨 FORMATTING: Number of formatting ranges:', formattingData.ranges.length);
    
    // Store current cursor position to restore after rendering
    const cursorPosition = getCurrentCursorPosition();
    
    // Enhanced DOCX-aware DOM preparation
    prepareCleanDOMForDocx(bookContent);
    
    // Clear existing formatting (but preserve section highlights)
    clearFormattingFromDOM();
    
    // Apply all formatting ranges with enhanced DOCX algorithm
    applyFormattingRangesEnhanced();
    
    // Apply comments
    applyComments();
    
    // Restore cursor position
    if (cursorPosition !== -1) {
        setCursorPosition(cursorPosition);
    }
    
    console.log(`🎨 FORMATTING: Applied ${formattingData.ranges.length} formatting ranges and ${formattingData.comments.length} comments`);
    
    // Final validation for DOCX imports
    validateDocxFormatting();
}

// Enhanced DOM preparation specifically optimized for DOCX imports
function prepareCleanDOMForDocx(bookContent) {
    console.log('🔧 DOCX FORMATTING: Preparing optimized DOM for DOCX import...');
    
    const textContent = bookContent.textContent;
    
    // Create optimized text structure for DOCX
    bookContent.innerHTML = '';
    
    // Split text into logical chunks to reduce DOM fragmentation
    const textChunks = smartSplitTextForDocx(textContent);
    
    textChunks.forEach(chunk => {
        const textNode = document.createTextNode(chunk);
        bookContent.appendChild(textNode);
    });
    
    // Normalize to ensure clean structure
    bookContent.normalize();
    
    console.log(`🔧 DOCX FORMATTING: Created ${textChunks.length} optimized text chunks, total length: ${textContent.length}`);
}

// Smart text splitting that preserves DOCX structure
function smartSplitTextForDocx(text) {
    // Split by meaningful boundaries while preserving structure
    const chunks = [];
    const chunkSize = 1000; // Optimal chunk size for formatting
    
    if (text.length <= chunkSize) {
        return [text];
    }
    
    let currentIndex = 0;
    while (currentIndex < text.length) {
        let endIndex = Math.min(currentIndex + chunkSize, text.length);
    
        // Try to break at word boundaries near chunk end
        if (endIndex < text.length) {
            const nextSpace = text.indexOf(' ', endIndex - 50);
            const nextNewline = text.indexOf('\n', endIndex - 50);
            
            if (nextSpace !== -1 && nextSpace < endIndex + 50) {
                endIndex = nextSpace + 1;
            } else if (nextNewline !== -1 && nextNewline < endIndex + 50) {
                endIndex = nextNewline + 1;
        }
        }
        
        chunks.push(text.substring(currentIndex, endIndex));
        currentIndex = endIndex;
    }
    
    return chunks;
}

// New, robust formatting application function that rebuilds the DOM from scratch.
function applyFormattingRangesEnhanced() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // Use the state's bookText as the single source of truth for content.
    // But also validate against the actual DOM content to ensure consistency
    const domText = bookContent.textContent;
    const stateText = bookText;
    
    // Use DOM text if state text is not available or they're significantly different
    const text = (typeof stateText === 'string' && Math.abs(stateText.length - domText.length) < 10) 
        ? stateText 
        : domText;
    
    if (typeof text !== 'string') {
        console.error("🎨 FORMATTING: No valid text source available, cannot render.");
        return;
    }
    
    console.log(`🎨 FORMATTING: Using text source - State: ${stateText?.length || 'N/A'}, DOM: ${domText.length}, Selected: ${text.length}`);

    // Generate a complete map of all segments (formatted and unformatted).
    const segments = optimizeFormattingRangesForDocx(formattingData.ranges, text.length);

    const fragment = document.createDocumentFragment();

    segments.forEach(segment => {
        const segmentText = text.substring(segment.start, segment.end);
        
        if (segmentText.length === 0) {
            return;
        }

        if (segment.types && segment.types.length > 0) {
            // This is a formatted segment. Create a styled element.
            const isLink = segment.types.some(t => t.startsWith('link-'));
            
            if (isLink) {
                // Handle hyperlinks separately
                const linkType = segment.types.find(t => t.startsWith('link-'));
                const url = linkType.substring('link-'.length);
                const linkElement = document.createElement('a');
                linkElement.href = url;
                linkElement.textContent = segmentText;
                linkElement.target = '_blank'; // Open in new tab
                linkElement.rel = 'noopener noreferrer';
                linkElement.className = 'fmt-link';
                 // Add other formatting classes if they exist
                const otherTypes = segment.types.filter(t => !t.startsWith('link-'));
                if(otherTypes.length > 0) {
                    linkElement.className += ' ' + otherTypes.map(type => `fmt-${type}`).join(' ');
                }
                fragment.appendChild(linkElement);

            } else if (segment.types.includes('image')) {
                // Handle images
                const imageElement = createImageElement(segment, segmentText);
                fragment.appendChild(imageElement);

            } else if (segment.types.includes('table')) {
                // Handle tables
                const tableElement = createTableElement(segment, segmentText);
                fragment.appendChild(tableElement);

            } else if (segment.types.includes('list') || segment.types.includes('list-item')) {
                // Handle lists - create simple bullet points only for non-empty content
                if (segmentText.trim().length > 0) {
                    const listElement = document.createElement('div');
                    listElement.className = 'fmt-list-item';
                    
                    // Add bullet point for list items
                    if (segment.types.includes('list-item')) {
                        // Enhanced bullet cleaning for complex corrupted patterns
                        let cleanText = segmentText;
                        
                        // First pass: Remove obvious bullet patterns
                        cleanText = cleanText
                            .replace(/^[•·‣▪▫‪‫\s]*/, '') // Remove leading bullets and whitespace
                            .replace(/[•·‣▪▫‪‫]\s*$/, '') // Remove trailing bullets
                            .replace(/^\d+\.\s*/, '') // Remove numbered list prefixes
                            .replace(/^[a-zA-Z]\.\s*/, '') // Remove lettered list prefixes
                            .replace(/^[-*+]\s*/, '') // Remove dash/asterisk bullets
                            .replace(/\n\s*[•·‣▪▫‪‫]\s*/g, '\n') // Remove bullets after line breaks
                            .replace(/\s+[•·‣▪▫‪‫]\s+/g, ' ') // Remove bullets in middle of text
                            .trim();
                        
                        // Second pass: Handle complex corrupted patterns from console logs
                        // Pattern: "• / sssss Johnson..." -> "Johnson..."
                        cleanText = cleanText.replace(/^[•·‣▪▫‪‫]\s*\/?\s*[a-zA-Z0-9]*\s*/, '');
                        
                        // Pattern: "• 30• 01889 National..." -> "National..."
                        cleanText = cleanText.replace(/^[•·‣▪▫‪‫]\s*\d*[•·‣▪▫‪‫]?\s*\d*\s*/, '');
                        
                        // Pattern: "C• 74• 59880/ Smith..." -> "Smith..."
                        cleanText = cleanText.replace(/^[a-zA-Z]*[•·‣▪▫‪‫]\s*\d*[•·‣▪▫‪‫]?\s*\d*\/?\s*/, '');
                        
                        // Pattern: "ic• le• /127796 Universitat..." -> "Universitat..."
                        cleanText = cleanText.replace(/^[a-zA-Z]*[•·‣▪▫‪‫]\s*[a-zA-Z]*[•·‣▪▫‪‫]?\s*\/?\d*\s*/, '');
                        
                        // Third pass: Aggressive cleanup for any remaining artifacts
                        // Remove any sequence of: letters/numbers + bullets + more letters/numbers at start
                        cleanText = cleanText.replace(/^[a-zA-Z0-9\/]*[•·‣▪▫‪‫][a-zA-Z0-9\/]*[•·‣▪▫‪‫]?[a-zA-Z0-9\/]*\s*/, '');
                        
                        // Fourth pass: Handle specific patterns from user's example
                        // Pattern: "sss • National Library..." -> "National Library..."
                        cleanText = cleanText.replace(/^[a-zA-Z0-9]+\s*[•·‣▪▫‪‫]\s*/, '');
                        
                        // Pattern: "880/ • Smith..." -> "Smith..."
                        cleanText = cleanText.replace(/^\d+\/?\s*[•·‣▪▫‪‫]\s*/, '');
                        
                        // Fifth pass: Ultra-aggressive cleanup for remaining corruption
                        // Remove any remaining bullets mixed with random characters at the start
                        cleanText = cleanText.replace(/^[^A-Z]*[•·‣▪▫‪‫][^A-Z]*/, '');
                        
                        // Final cleanup: normalize whitespace and trim
                        cleanText = cleanText.replace(/\s+/g, ' ').trim();
                        
                        // Debug logging for bullet cleaning
                        if (segmentText !== cleanText) {
                            console.log(`🔧 LIST ITEM: Cleaned "${segmentText}" -> "${cleanText}"`);
                        }
                        
                        // Only add bullet if there's actual content after cleaning
                        if (cleanText.length > 0) {
                            listElement.innerHTML = `• ${cleanText}`;
                        } else {
                            // If no content after cleaning, don't add bullet
                            console.log(`🔧 LIST ITEM: Empty after cleaning, using original: "${segmentText}"`);
                            listElement.textContent = segmentText;
                        }
                    } else {
                        listElement.textContent = segmentText;
                    }
                    
                    fragment.appendChild(listElement);
                } else {
                    // For empty list items, just add the text without bullet
                    fragment.appendChild(document.createTextNode(segmentText));
                }

            } else {
                // Handle standard formatting
                const wrapper = document.createElement('span');
                const cssClasses = segment.types.map(type => `fmt-${type}`).join(' ');
                
                wrapper.className = cssClasses;
                wrapper.dataset.formattingId = `docx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                wrapper.dataset.formatTypes = segment.types.join(',');
                
                wrapper.appendChild(document.createTextNode(segmentText));
                fragment.appendChild(wrapper);
            }
        } else {
            // This is an unformatted segment. Create a simple text node.
            fragment.appendChild(document.createTextNode(segmentText));
        }
    });

    // Replace the entire content at once for performance and to prevent DOM fragmentation.
    bookContent.innerHTML = '';
    bookContent.appendChild(fragment);
    bookContent.normalize(); // Consolidate any adjacent text nodes.
}

// New optimization function that creates a full map of formatted and unformatted segments.
function optimizeFormattingRangesForDocx(ranges, textLength) {
    if (!ranges || !ranges.length) {
        // If no formatting exists, return a single segment for the entire text.
        return [{ start: 0, end: textLength, types: [] }];
    }

    // Collect all unique start and end points, bookended by the start and end of the text.
    const points = new Set([0, textLength]);
    ranges.forEach(range => {
        if (typeof range.start === 'number' && typeof range.end === 'number' && range.start < range.end) {
            if (range.start >= 0 && range.start <= textLength) points.add(range.start);
            if (range.end >= 0 && range.end <= textLength) points.add(range.end);
            // Special handling for link hrefs if they are stored in range.meta
            if (range.type === 'link' && range.meta && range.meta.href) {
                range.type = `link-${range.meta.href}`;
            }
        }
    });

    const sortedPoints = Array.from(points).sort((a, b) => a - b);
    
    const segments = [];

    // Create segments between each adjacent pair of points.
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const start = sortedPoints[i];
        const end = sortedPoints[i + 1];

        if (start >= end) continue; // Skip any zero-length segments.

        const applicableTypes = new Set();
        
        // A format applies to a segment if the segment is fully contained within the format's range.
    ranges.forEach(range => {
            if (range.start <= start && range.end >= end) {
                 applicableTypes.add(range.type);
            }
        });

        segments.push({
            start: start,
            end: end,
            types: Array.from(applicableTypes),
        });
    }
    
    console.log(`🔧 DOCX FORMATTING: Mapped ${ranges.length} ranges into ${segments.length} total segments.`);
    return segments;
}

// Enhanced text node finding with better DOCX position mapping
function findTextNodesEnhanced(container, startPos, endPos) {
    if (!container) {
        console.warn('🔧 DOCX FORMATTING: No container provided');
        return { startNode: null, startOffset: 0, endNode: null, endOffset: 0 };
    }
    
    const containerText = container.textContent;
    const maxPos = containerText.length;
    
    // Clamp positions with better bounds checking
    const safeStartPos = Math.max(0, Math.min(startPos, maxPos));
    const safeEndPos = Math.max(safeStartPos, Math.min(endPos, maxPos));
    
    console.log(`🔧 DOCX FORMATTING: Finding nodes for positions ${safeStartPos}-${safeEndPos} (max: ${maxPos})`);
    
    // Create TreeWalker with DOCX-optimized filtering
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        node => {
            // Skip empty nodes and comment indicators
            if (!node.textContent || node.textContent.length === 0) {
                return NodeFilter.FILTER_REJECT;
            }
            const parent = node.parentNode;
            if (parent && parent.classList && parent.classList.contains('comment-indicator')) {
                return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
        },
        false
    );
    
    let currentPos = 0;
    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;
    
    // Walk through text nodes with enhanced tracking
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeText = node.textContent;
        const nodeLength = nodeText.length;
        const nodeEnd = currentPos + nodeLength;
        
        // Find start position
        if (!startNode && currentPos <= safeStartPos && safeStartPos < nodeEnd) {
            startNode = node;
            startOffset = safeStartPos - currentPos;
            console.log(`🔧 DOCX FORMATTING: Found start node at offset ${startOffset}`);
        }
        
        // Find end position
        if (currentPos <= safeEndPos && safeEndPos <= nodeEnd) {
            endNode = node;
            endOffset = safeEndPos - currentPos;
            console.log(`🔧 DOCX FORMATTING: Found end node at offset ${endOffset}`);
            break;
        }
        
        currentPos = nodeEnd;
    }
    
    // Enhanced fallback handling for edge cases
    if (!startNode || !endNode) {
        return handleTextNodeFallback(container, safeStartPos, safeEndPos);
    }
    
    // Validate offsets
    if (startNode) {
        startOffset = Math.max(0, Math.min(startOffset, startNode.textContent.length));
    }
    if (endNode) {
        endOffset = Math.max(0, Math.min(endOffset, endNode.textContent.length));
    }
    
    return { startNode, startOffset, endNode, endOffset };
}

// Fallback handler for difficult text node cases
function handleTextNodeFallback(container, startPos, endPos) {
    console.log('🔧 DOCX FORMATTING: Using fallback text node detection');
    
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    while (walker.nextNode()) {
        if (walker.currentNode.textContent.length > 0) {
            textNodes.push(walker.currentNode);
        }
    }
    
    if (textNodes.length === 0) {
        return { startNode: null, startOffset: 0, endNode: null, endOffset: 0 };
    }
    
    // Use first and last text nodes as fallback
    const firstNode = textNodes[0];
    const lastNode = textNodes[textNodes.length - 1];
    
    return {
        startNode: firstNode,
        startOffset: Math.min(startPos, firstNode.textContent.length),
        endNode: lastNode,
        endOffset: Math.min(endPos, lastNode.textContent.length)
    };
}

// Helper function to create image elements
function createImageElement(segment, segmentText) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'fmt-image-container';
    
    // Find image metadata from formatting ranges
    const imageRange = formattingData.ranges.find(range => 
        range.type === 'image' && 
        range.start <= segment.start && 
        range.end >= segment.end
    );
    
    if (imageRange && imageRange.meta && imageRange.meta.src) {
        const img = document.createElement('img');
        img.src = imageRange.meta.src;
        img.alt = imageRange.meta.alt || 'Document image';
        img.className = 'fmt-image';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        
        imageContainer.appendChild(img);
        
        // Add caption if alt text exists
        if (imageRange.meta.alt && imageRange.meta.alt !== 'Document image') {
            const caption = document.createElement('div');
            caption.className = 'fmt-image-caption';
            caption.textContent = imageRange.meta.alt;
            imageContainer.appendChild(caption);
        }
    } else {
        // Fallback: show placeholder text
        const placeholder = document.createElement('div');
        placeholder.className = 'fmt-image-placeholder';
        placeholder.textContent = segmentText;
        imageContainer.appendChild(placeholder);
    }
    
    return imageContainer;
}

// Helper function to create table elements
function createTableElement(segment, segmentText) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'fmt-table-container';
    
    // For now, show table content as formatted text
    // In a full implementation, you'd parse the table structure
    const tableContent = document.createElement('div');
    tableContent.className = 'fmt-table-content';
    tableContent.textContent = segmentText;
    
    tableContainer.appendChild(tableContent);
    return tableContainer;
}

// Helper function to create list elements
function createListElement(segment, segmentText) {
    const listContainer = document.createElement('div');
    listContainer.className = 'fmt-list-container';
    
    // Find list metadata from formatting ranges
    const listRange = formattingData.ranges.find(range => 
        (range.type === 'list' || range.type === 'list-item') && 
        range.start <= segment.start && 
        range.end >= segment.end
    );
    
    if (listRange && listRange.meta && listRange.meta.type) {
        const listElement = document.createElement(listRange.meta.type === 'ordered' ? 'ol' : 'ul');
        listElement.className = 'fmt-list';
        
        const listItem = document.createElement('li');
        listItem.className = 'fmt-list-item';
        listItem.textContent = segmentText;
        
        listElement.appendChild(listItem);
        listContainer.appendChild(listElement);
    } else {
        // Fallback: show as formatted text
        const listContent = document.createElement('div');
        listContent.className = 'fmt-list-content';
        listContent.textContent = segmentText;
        listContainer.appendChild(listContent);
    }
    
    return listContainer;
}

// Validation function specifically for DOCX formatting
function validateDocxFormatting() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    console.log('🔧 DOCX FORMATTING: Running post-application validation...');
    
    const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
    const issues = [];
    
    formattingElements.forEach(element => {
        // Check for empty formatting elements
        if (!element.textContent.trim()) {
            issues.push(`Empty formatting element: ${element.dataset.formattingId}`);
        }
        
        // Check for nested formatting conflicts
        const nestedFormatting = element.querySelectorAll('[data-formatting-id]');
        if (nestedFormatting.length > 0) {
            issues.push(`Nested formatting detected in: ${element.dataset.formattingId}`);
}
    });
    
    if (issues.length > 0) {
        console.warn('🔧 DOCX FORMATTING: Validation issues found:', issues);
    } else {
        console.log('✅ DOCX FORMATTING: Validation passed - all formatting elements are valid');
    }
    
    // Log final statistics
    console.log(`📊 DOCX FORMATTING: Final stats - ${formattingElements.length} formatted elements, ${bookContent.textContent.length} total characters`);
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
    const { startNode, startOffset } = findTextNodesEnhanced(bookContent, position, position);
    
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
    const { startNode, startOffset } = findTextNodesEnhanced(bookContent, comment.position, comment.position);
    
    if (startNode) {
        const commentIndicator = document.createElement('span');
        commentIndicator.className = 'comment-indicator';
        commentIndicator.dataset.commentId = comment.id;
        commentIndicator.textContent = '💬';
        commentIndicator.title = comment.text;
        
        try {
            // Split text node and insert comment indicator
            const textNode = startNode;
            const beforeText = textNode.textContent.substring(0, startOffset);
            const afterText = textNode.textContent.substring(startOffset);
            
            // Create new text nodes
            const beforeNode = document.createTextNode(beforeText);
            const afterNode = document.createTextNode(afterText);
            
            // Replace original text node with new structure
            const parent = textNode.parentNode;
            parent.insertBefore(beforeNode, textNode);
            parent.insertBefore(commentIndicator, textNode);
            parent.insertBefore(afterNode, textNode);
            parent.removeChild(textNode);
            
        } catch (error) {
            console.warn('Error applying comment indicator:', error);
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

// COMPREHENSIVE DOCX IMPORT DIAGNOSTIC FUNCTION
export function runDocxImportDiagnostics() {
    console.log('\n🔍 === DOCX IMPORT DIAGNOSTICS ===\n');
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.log('❌ No book content element found');
        return;
    }
    
    // 1. Analyze current DOM state
    console.log('📋 1. DOM STATE ANALYSIS:');
    const totalText = bookContent.textContent;
    console.log(`   📝 Total text length: ${totalText.length}`);
    
    const textNodes = [];
    const walker = document.createTreeWalker(
        bookContent,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    while (walker.nextNode()) {
        textNodes.push(walker.currentNode);
    }
    
    console.log(`   🔗 Text nodes count: ${textNodes.length}`);
    
    // Show fragmentation issues
    const emptyNodes = textNodes.filter(node => node.textContent.length === 0);
    const tinyNodes = textNodes.filter(node => node.textContent.length > 0 && node.textContent.length < 5);
    
    console.log(`   ⚠️  Empty nodes: ${emptyNodes.length}`);
    console.log(`   ⚠️  Tiny nodes (<5 chars): ${tinyNodes.length}`);
    
    if (tinyNodes.length > 0) {
        console.log('   🔍 Sample tiny nodes:');
        tinyNodes.slice(0, 5).forEach((node, i) => {
            console.log(`      ${i+1}. "${node.textContent}" (${node.textContent.length} chars)`);
        });
    }
    
    // 2. Analyze formatting data
    console.log('\n📋 2. FORMATTING DATA ANALYSIS:');
    if (!formattingData || !formattingData.ranges) {
        console.log('   ❌ No formatting data found');
        return;
    }
    
    console.log(`   📊 Total formatting ranges: ${formattingData.ranges.length}`);
    
    // Check for out-of-bounds ranges
    const outOfBounds = formattingData.ranges.filter(range => 
        range.start < 0 || range.end > totalText.length || range.start >= range.end
    );
    console.log(`   ⚠️  Out-of-bounds ranges: ${outOfBounds.length}`);
    
    if (outOfBounds.length > 0) {
        console.log('   🔍 Out-of-bounds range details:');
        outOfBounds.slice(0, 3).forEach((range, i) => {
            console.log(`      ${i+1}. ${range.start}-${range.end} (${range.type}) - Text length: ${totalText.length}`);
        });
    }
    
    // Check for overlapping ranges
    const sortedRanges = [...formattingData.ranges].sort((a, b) => a.start - b.start);
    const overlapping = [];
    for (let i = 0; i < sortedRanges.length - 1; i++) {
        const current = sortedRanges[i];
        const next = sortedRanges[i + 1];
        if (current.end > next.start) {
            overlapping.push([current, next]);
        }
    }
    console.log(`   🔗 Overlapping ranges: ${overlapping.length}`);
    
    // 3. Test position mapping
    console.log('\n📋 3. POSITION MAPPING TEST:');
    const testPositions = [0, Math.floor(totalText.length / 4), Math.floor(totalText.length / 2), Math.floor(totalText.length * 3/4), totalText.length - 1];
    
    testPositions.forEach(pos => {
        const result = findTextNodesEnhanced(bookContent, pos, pos + 1);
        const success = result.startNode && result.endNode;
        console.log(`   ${success ? '✅' : '❌'} Position ${pos}: ${success ? 'Found' : 'Failed'}`);
        if (!success) {
            console.log(`      📍 Attempted range: ${pos}-${pos + 1}, Text length: ${totalText.length}`);
        }
    });
    
    // 4. Check CSS classes and styles
    console.log('\n📋 4. CSS/STYLING CHECK:');
    const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
    console.log(`   🎨 Applied formatting elements: ${formattingElements.length}`);
    
    const cssClasses = new Set();
    formattingElements.forEach(el => {
        el.classList.forEach(cls => cssClasses.add(cls));
    });
    console.log(`   📝 Unique CSS classes: ${cssClasses.size}`);
    console.log(`   🔍 Classes found: ${Array.from(cssClasses).join(', ')}`);
    
    // 5. Performance metrics
    console.log('\n📋 5. PERFORMANCE METRICS:');
    const allElements = bookContent.querySelectorAll('*');
    console.log(`   📊 Total DOM elements: ${allElements.length}`);
    console.log(`   📊 Text nodes to elements ratio: ${(textNodes.length / Math.max(allElements.length, 1)).toFixed(2)}`);
    
    // Calculate DOM complexity score
    const complexityScore = textNodes.length * 1 + allElements.length * 0.5 + formattingData.ranges.length * 0.1;
    console.log(`   📊 DOM complexity score: ${complexityScore.toFixed(1)} ${complexityScore > 100 ? '(HIGH)' : complexityScore > 50 ? '(MEDIUM)' : '(LOW)'}`);
    
    // 6. Recommendations
    console.log('\n📋 6. RECOMMENDATIONS:');
    if (emptyNodes.length > 0) {
        console.log('   💡 Clean up empty text nodes');
    }
    if (tinyNodes.length > 10) {
        console.log('   💡 DOM is heavily fragmented - consider rebuilding');
    }
    if (outOfBounds.length > 0) {
        console.log('   💡 Fix out-of-bounds formatting ranges in backend');
    }
    if (overlapping.length > 20) {
        console.log('   💡 High overlap complexity - consider range grouping optimization');
    }
    if (complexityScore > 100) {
        console.log('   💡 High DOM complexity - may cause performance issues');
    }
    
    console.log('\n🔍 === DIAGNOSTICS COMPLETE ===\n');
    
    return {
        textLength: totalText.length,
        textNodes: textNodes.length,
        emptyNodes: emptyNodes.length,
        tinyNodes: tinyNodes.length,
        formattingRanges: formattingData.ranges.length,
        outOfBounds: outOfBounds.length,
        overlapping: overlapping.length,
        formattingElements: formattingElements.length,
        complexityScore: complexityScore
    };
}

// Quick function to fix common DOCX import issues
export function fixDocxImportIssues() {
    console.log('🔧 FIXING COMMON DOCX IMPORT ISSUES...');
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // 1. Clean and rebuild DOM
    prepareCleanDOMForDocx(bookContent);
    
    // 2. Re-validate and re-apply formatting
    clearFormattingFromDOM();
    
    // 3. Apply formatting with error handling
    if (formattingData && formattingData.ranges) {
        try {
            applyFormattingRangesEnhanced();
            console.log('✅ DOCX formatting reapplied successfully');
        } catch (error) {
            console.error('❌ Error reapplying formatting:', error);
        }
    }
    
    return runDocxImportDiagnostics();
}

// Quick test function you can call from browser console
export function testDocxFix() {
    console.log('🧪 TESTING DOCX FIX...');
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.log('❌ No book content found');
        return;
    }
    
    console.log('1. Running initial diagnostics...');
    const beforeStats = runDocxImportDiagnostics();
    
    console.log('2. Applying fix...');
    const afterStats = fixDocxImportIssues();
    
    console.log('3. Comparing results...');
    console.log(`📊 Text nodes: ${beforeStats.textNodes} → ${afterStats.textNodes}`);
    console.log(`📊 Empty nodes: ${beforeStats.emptyNodes} → ${afterStats.emptyNodes}`);
    console.log(`📊 Tiny nodes: ${beforeStats.tinyNodes} → ${afterStats.tinyNodes}`);
    console.log(`📊 Formatting elements: ${beforeStats.formattingElements} → ${afterStats.formattingElements}`);
    
    const improvement = beforeStats.textNodes - afterStats.textNodes;
    if (improvement > 0) {
        console.log(`✅ Reduced fragmentation by ${improvement} text nodes!`);
    } else {
        console.log(`⚠️ No fragmentation improvement detected`);
    }
    
    console.log('✅ Test complete!');
    return { before: beforeStats, after: afterStats };
}

// Export functions for external testing
window.runDocxImportDiagnostics = runDocxImportDiagnostics;
window.testDocxFix = testDocxFix;
window.fixDocxImportIssues = fixDocxImportIssues; 