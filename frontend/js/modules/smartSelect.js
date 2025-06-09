// AudioBook Organizer - Smart Selection Module

import { bookText } from './state.js';
import { showError, showWarning } from './notifications.js';

// Track our position in the text
let currentPosition = 0;
let userHasManuallyClickedCursor = false;
let manualCursorPosition = -1;

// Get cursor position in the text
function getCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        return -1; // No selection/cursor
    }
    
    const range = selection.getRangeAt(0);
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent || !bookContent.contains(range.startContainer)) {
        return -1; // Cursor not in book content
    }
    
    try {
        // Create a range from the start of bookContent to the cursor position
        const fullRange = document.createRange();
        fullRange.setStart(bookContent, 0);
        fullRange.setEnd(range.startContainer, range.startOffset);
        
        // Get the text content up to the cursor position
        const textToCursor = fullRange.toString();
        
        console.log(`Cursor detected at position: ${textToCursor.length}`);
        return textToCursor.length;
    } catch (error) {
        console.warn('Error getting cursor position:', error);
        return -1;
    }
}

// Alternative method to get cursor position using mouse coordinates
function getCursorPositionFromEvent(event) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return -1;
    
    try {
        // Use caretRangeFromPoint to get cursor position from mouse coordinates
        let range;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(event.clientX, event.clientY);
        } else if (document.caretPositionFromPoint) {
            const caretPos = document.caretPositionFromPoint(event.clientX, event.clientY);
            if (caretPos) {
                range = document.createRange();
                range.setStart(caretPos.offsetNode, caretPos.offset);
                range.collapse(true);
            }
        }
        
        if (!range || !bookContent.contains(range.startContainer)) {
            return -1;
        }
        
        // Create a range from the start of bookContent to the cursor position
        const fullRange = document.createRange();
        fullRange.setStart(bookContent, 0);
        fullRange.setEnd(range.startContainer, range.startOffset);
        
        const position = fullRange.toString().length;
        console.log(`Cursor position from event: ${position}`);
        return position;
    } catch (error) {
        console.warn('Error getting cursor position from event:', error);
        return -1;
    }
}

// Smart selection function - selects specified number of characters ending on a period
export function performSmartSelect() {
    // Get the actual DOM text content to ensure consistency
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        showError('Book content not found!');
        return null;
    }
    
    const actualText = bookContent.textContent;
    if (!actualText || actualText.length === 0) {
        showWarning('Please upload a book first!');
        return null;
    }

    // Get the desired character count from the input field
    const charInput = document.getElementById('smartSelectChars');
    const maxChars = charInput ? parseInt(charInput.value) || 3000 : 3000;
    
    console.log(`Smart Select: Using ${maxChars} characters`);

    // Check if user has manually placed cursor - use that as starting position
    let startPos;
    console.log(`Smart Select Debug - userHasManuallyClickedCursor: ${userHasManuallyClickedCursor}, manualCursorPosition: ${manualCursorPosition}`);
    
    if (userHasManuallyClickedCursor && manualCursorPosition !== -1) {
        // Use the stored manual cursor position
        startPos = manualCursorPosition;
        currentPosition = startPos;
        console.log('✓ Using stored manual cursor position:', startPos);
        
        // Reset manual cursor tracking after using it
        userHasManuallyClickedCursor = false;
        manualCursorPosition = -1;
    } else {
        // No manual cursor, use current sequential position
        startPos = currentPosition;
        console.log('✗ No manual cursor detected, using sequential position:', startPos);
    }

    // Check if we've reached the end of the text
    if (startPos >= actualText.length) {
        showWarning('Reached the end of the book! Resetting to beginning.');
        resetSmartSelect();
        return null;
    }
    
    let endPos = Math.min(startPos + maxChars, actualText.length);
    
    console.log(`Smart Select: Starting at position ${startPos}, target end ${endPos}`);
    console.log(`Using DOM text length: ${actualText.length}, bookText length: ${bookText.length}`);
    
    // If we're not at the very end of the book, find a good stopping point
    if (endPos < actualText.length) {
        // Get the chunk we're considering from the actual DOM text
        let chunk = actualText.substring(startPos, endPos);
        
        // Find the last line break in this chunk (looking for \n or \r\n)
        let lastLineBreakIndex = -1;
        for (let i = chunk.length - 1; i >= 0; i--) {
            if (chunk[i] === '\n') {
                lastLineBreakIndex = i;
                break;
            }
        }
        
        if (lastLineBreakIndex !== -1) {
            // Adjust end position to include the line break
            endPos = startPos + lastLineBreakIndex + 1;
            console.log(`Found line break at chunk index ${lastLineBreakIndex}, adjusting end to ${endPos}`);
        } else {
            console.log('No line break found in chunk, keeping full chunk');
        }
    }
    
    // Extract the final text from the actual DOM content
    const finalText = actualText.substring(startPos, endPos);
    
    // Debug output
    console.log('Final selection:');
    console.log(`- Length: ${finalText.length}`);
    console.log(`- Ends with period: ${finalText.endsWith('.')}`);
    console.log(`- Last char: "${finalText.charAt(finalText.length - 1)}"`);
    console.log(`- Last 10 chars: "${finalText.slice(-10)}"`);
    
    // Create the selection object
    const selection = {
        text: finalText,
        startPosition: startPos,
        endPosition: endPos,
        length: finalText.length
    };

    // Don't update position yet - only advance after section is created
    // The position will be updated when advanceSmartSelectPosition() is called
    
    return selection;
}

// Reset the smart select position to beginning
export function resetSmartSelect() {
    currentPosition = 0;
    
    // Get actual DOM text length for position indicator
    const bookContent = document.getElementById('bookContent');
    const actualTextLength = bookContent ? bookContent.textContent.length : bookText.length;
    updatePositionIndicator(actualTextLength);
    
    // Clear any existing smart selection highlights
    clearSmartSelection();
}

// Update the position indicator display
function updatePositionIndicator(textLength = null) {
    const indicator = document.getElementById('positionIndicator');
    if (indicator) {
        // Use provided length or fall back to bookText length
        const totalLength = textLength || bookText.length;
        const percentage = totalLength > 0 ? Math.round((currentPosition / totalLength) * 100) : 0;
        indicator.textContent = `Position: ${currentPosition.toLocaleString()} (${percentage}%)`;
    }
}

// Get current position (useful for other modules)
export function getCurrentPosition() {
    return currentPosition;
}

// Set current position (useful for loading saved progress)
export function setCurrentPosition(position) {
    const bookContent = document.getElementById('bookContent');
    const actualTextLength = bookContent ? bookContent.textContent.length : bookText.length;
    currentPosition = Math.max(0, Math.min(position, actualTextLength));
    updatePositionIndicator(actualTextLength);
}

// Advance smart selection position (call this when a section is actually created)
export function advanceSmartSelectPosition(endPosition) {
    // Update position to continue from the end of the created section
    currentPosition = endPosition;
    
    // Clear any manual cursor tracking - once a section is created, we continue sequentially
    userHasManuallyClickedCursor = false;
    manualCursorPosition = -1;
    
    // Get actual DOM text length for position indicator
    const bookContent = document.getElementById('bookContent');
    const actualTextLength = bookContent ? bookContent.textContent.length : bookText.length;
    updatePositionIndicator(actualTextLength);
    
    console.log(`Smart selection position advanced to: ${currentPosition} (manual cursor tracking cleared)`);
}

// Clear any smart selection highlights from the text
export function clearSmartSelection() {
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        // Remove smart selection highlighting
        const highlightedElements = bookContent.querySelectorAll('.smart-selected-text');
        highlightedElements.forEach(element => {
            // Remove the class and unwrap the content
            const parent = element.parentNode;
            const textNode = document.createTextNode(element.textContent);
            parent.replaceChild(textNode, element);
            parent.normalize();
        });
        
        console.log('Smart selection highlights cleared');
    }
}

// Highlight the selected text in the book content
export function highlightSmartSelection(selection) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent || !selection) return false;

    try {
        // Clear previous smart selections
        clearSmartSelection();
        
        console.log('DOM Selection Debug:');
        console.log(`Target: ${selection.startPosition} to ${selection.endPosition} (${selection.length} chars)`);
        
        // Use the exact text from our selection object instead of trying to map positions
        const targetText = selection.text;
        console.log(`Using exact text (${targetText.length} chars)`);
        console.log(`Text ends with: "${targetText.slice(-10)}"`);
        console.log(`Text ends with period: ${targetText.endsWith('.')}`);
        
        // Find this exact text in the DOM starting from our calculated position
        const fullTextContent = bookContent.textContent;
        const textToFind = targetText;
        
        // Find the text starting from the expected position
        const foundIndex = fullTextContent.indexOf(textToFind, selection.startPosition);
        
        if (foundIndex === selection.startPosition) {
            console.log('✓ Found exact text at expected position');
            
            // Create a text node walker to select this exact text
            const walker = document.createTreeWalker(
                bookContent,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let currentPos = 0;
            let startNode = null;
            let startOffset = 0;
            let endNode = null;
            let endOffset = 0;
            let charsToSelect = textToFind.length;
            let charsSelected = 0;

            // Find start and end positions for the exact text
            while (walker.nextNode() && charsSelected < charsToSelect) {
                const node = walker.currentNode;
                const nodeText = node.textContent;
                const nodeLength = nodeText.length;
                
                // Check if start position is in this node
                if (!startNode && currentPos + nodeLength > selection.startPosition) {
                    startNode = node;
                    startOffset = selection.startPosition - currentPos;
                    console.log(`Start node found at DOM pos ${currentPos}, offset ${startOffset}`);
                }
                
                // If we have a start node, calculate how many characters we need from this node
                if (startNode) {
                    const availableFromThisNode = nodeLength - (startNode === node ? startOffset : 0);
                    const neededFromThisNode = Math.min(availableFromThisNode, charsToSelect - charsSelected);
                    
                    charsSelected += neededFromThisNode;
                    
                    if (charsSelected >= charsToSelect) {
                        endNode = node;
                        endOffset = (startNode === node ? startOffset : 0) + neededFromThisNode;
                        console.log(`End node found, selecting ${charsSelected} chars total`);
                        break;
                    }
                }
                
                currentPos += nodeLength;
            }

            if (startNode && endNode) {
                // Create a range and select the exact text
                const range = document.createRange();
                range.setStart(startNode, startOffset);
                range.setEnd(endNode, endOffset);
                
                // Verify what we're actually selecting
                const actualSelectedText = range.toString();
                console.log(`Final DOM selection: ${actualSelectedText.length} chars`);
                console.log(`Final ends with: "${actualSelectedText.slice(-10)}"`);
                console.log(`Final ends with period: ${actualSelectedText.endsWith('.')}`);
                
                // Create selection
                const windowSelection = window.getSelection();
                windowSelection.removeAllRanges();
                windowSelection.addRange(range);
                
                // Add visual highlighting by wrapping in a span
                try {
                    const span = document.createElement('span');
                    span.className = 'smart-selected-text';
                    
                    // Use a safer approach than surroundContents()
                    const contents = range.extractContents();
                    span.appendChild(contents);
                    range.insertNode(span);
                    
                    // Update the range to select the new span content
                    range.selectNodeContents(span);
                    
                    // Update window selection to the new range
                    const windowSelection = window.getSelection();
                    windowSelection.removeAllRanges();
                    windowSelection.addRange(range);
                    
                    // Scroll to the selection
                    span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    return true;
                } catch (e) {
                    console.warn('Could not add visual highlighting:', e);
                    // Still return true as the text selection worked
                    return true;
                }
            }
        } else {
            console.error('Could not find exact text at expected position');
            console.error(`Expected at ${selection.startPosition}, found at ${foundIndex}`);
        }
    } catch (error) {
        console.error('Error highlighting smart selection:', error);
    }
    
    return false;
}

// Find the position after the last created section
function findLastSectionEndPosition() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return 0;
    
    // Find all section highlights in the book content
    const sectionHighlights = bookContent.querySelectorAll('.section-highlight');
    if (sectionHighlights.length === 0) return 0;
    
    // Get the last section highlight
    const lastSection = sectionHighlights[sectionHighlights.length - 1];
    
    // Calculate position after this section
    const range = document.createRange();
    range.setStart(bookContent, 0);
    range.setEndAfter(lastSection);
    const positionAfterLastSection = range.toString().length;
    
    console.log(`Found last section ending at position ${positionAfterLastSection}`);
    return positionAfterLastSection;
}

// Initialize smart select when book is loaded
export function initializeSmartSelect() {
    // Reset manual cursor tracking on initialization
    userHasManuallyClickedCursor = false;
    manualCursorPosition = -1;
    
    // Add multiple listeners to detect manual cursor placement
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        // Remove existing listeners if any
        bookContent.removeEventListener('click', handleManualCursorClick);
        bookContent.removeEventListener('mouseup', handleManualCursorClick);
        bookContent.removeEventListener('keyup', handleManualCursorClick);
        bookContent.removeEventListener('focusin', handleManualCursorClick);
        
        // Add multiple listeners to catch cursor placement
        bookContent.addEventListener('click', handleManualCursorClick, true); // Use capture
        bookContent.addEventListener('mouseup', handleManualCursorClick);
        bookContent.addEventListener('keyup', handleManualCursorClick);
        bookContent.addEventListener('focusin', handleManualCursorClick);
        
        // Make book content focusable so it can receive cursor events
        if (!bookContent.hasAttribute('tabindex')) {
            bookContent.setAttribute('tabindex', '-1');
        }
        
        console.log('Multiple listeners attached to book content for manual cursor detection');
    } else {
        console.warn('BookContent element not found, cannot attach click listener');
    }
    
    // Check if there are existing sections and start from the last one
    const lastSectionEndPosition = findLastSectionEndPosition();
    if (lastSectionEndPosition > 0) {
        setCurrentPosition(lastSectionEndPosition);
        console.log(`Smart selection initialized to continue from last section at position ${lastSectionEndPosition}`);
    } else {
        resetSmartSelect();
    }
    
    // Enable the smart select button
    const smartSelectBtn = document.getElementById('smartSelectBtn');
    if (smartSelectBtn && bookText && bookText.length > 0) {
        smartSelectBtn.disabled = false;
    }
}

// Handle manual cursor clicks in book content
function handleManualCursorClick(event) {
    // Check if we're in edit mode - if so, don't interfere
    if (window.getEditMode && window.getEditMode()) {
        console.log('Edit mode active - skipping smart select cursor tracking');
        return;
    }
    
    console.log('Click detected on book content');
    
    // Try to get cursor position immediately from the event
    let cursorPosition = getCursorPositionFromEvent(event);
    
    if (cursorPosition !== -1) {
        userHasManuallyClickedCursor = true;
        manualCursorPosition = cursorPosition;
        console.log(`✓ User manually clicked cursor at position ${cursorPosition} - stored for next smart select`);
        return;
    }
    
    // If event method failed, try with delay for selection-based method
    setTimeout(() => {
        cursorPosition = getCursorPosition();
        console.log(`Cursor position after click (delayed): ${cursorPosition}`);
        
        if (cursorPosition !== -1) {
            userHasManuallyClickedCursor = true;
            manualCursorPosition = cursorPosition;
            console.log(`✓ User manually clicked cursor at position ${cursorPosition} - stored for next smart select`);
        } else {
            console.log('✗ Could not get cursor position after click - trying fallback method');
            
            // Final fallback: try to create a selection at the click point
            if (event.target && event.target.nodeType === Node.TEXT_NODE) {
                const bookContent = document.getElementById('bookContent');
                if (bookContent && bookContent.contains(event.target)) {
                    try {
                        const range = document.createRange();
                        range.setStart(bookContent, 0);
                        range.setEnd(event.target, 0);
                        const position = range.toString().length;
                        
                        userHasManuallyClickedCursor = true;
                        manualCursorPosition = position;
                        console.log(`✓ Fallback cursor position: ${position}`);
                    } catch (error) {
                        console.warn('Fallback cursor detection failed:', error);
                    }
                }
            }
        }
    }, 100); // Slightly longer delay for selection method
} 