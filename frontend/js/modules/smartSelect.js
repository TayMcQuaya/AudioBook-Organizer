// AudioBook Organizer - Smart Selection Module

import { bookText } from './state.js';
import { showError, showWarning } from './notifications.js';

// Track our position in the text
let currentPosition = 0;

// Smart selection function - selects up to 3000 characters ending on a period
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

    // Check if we've reached the end of the text
    if (currentPosition >= actualText.length) {
        showWarning('Reached the end of the book! Resetting to beginning.');
        resetSmartSelect();
        return null;
    }

    const maxChars = 3000;
    let startPos = currentPosition;
    let endPos = Math.min(startPos + maxChars, actualText.length);
    
    console.log(`Smart Select: Starting at position ${startPos}, target end ${endPos}`);
    console.log(`Using DOM text length: ${actualText.length}, bookText length: ${bookText.length}`);
    
    // If we're not at the very end of the book, find a good stopping point
    if (endPos < actualText.length) {
        // Get the chunk we're considering from the actual DOM text
        let chunk = actualText.substring(startPos, endPos);
        
        // Find the last period in this chunk
        let lastPeriodIndex = -1;
        for (let i = chunk.length - 1; i >= 0; i--) {
            if (chunk[i] === '.') {
                lastPeriodIndex = i;
                break;
            }
        }
        
        if (lastPeriodIndex !== -1) {
            // Adjust end position to include the period
            endPos = startPos + lastPeriodIndex + 1;
            console.log(`Found period at chunk index ${lastPeriodIndex}, adjusting end to ${endPos}`);
        } else {
            console.log('No period found in chunk, keeping full chunk');
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

    // Update position for next selection
    currentPosition = endPos;
    
    // Update the position indicator (use actual text length)
    updatePositionIndicator(actualText.length);
    
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

// Clear any smart selection highlights from the text
function clearSmartSelection() {
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        // Remove smart selection highlighting
        const highlightedElements = bookContent.querySelectorAll('.smart-selected-text');
        highlightedElements.forEach(element => {
            element.classList.remove('smart-selected-text');
        });
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
                    range.surroundContents(span);
                    
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