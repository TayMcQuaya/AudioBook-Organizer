// AudioBook Organizer - Formatting Toolbar

import { 
    addFormattingRange, 
    removeFormattingRange, 
    getFormattingAtPosition,
    formattingData 
} from './formattingState.js';
import { applyFormattingToDOM } from './formattingRenderer.js';
import { getEditMode } from './editMode.js';

let toolbar = null;
let activeFormats = new Set();

// Note: Comments system will be imported dynamically when needed
let showCommentDialog = null;

// Load comment system on demand
async function loadCommentSystem() {
    if (!showCommentDialog) {
        try {
            const module = await import('./commentsSystem.js');
            showCommentDialog = module.showCommentDialog;
        } catch (error) {
            console.error('Error loading comments system:', error);
        }
    }
    return showCommentDialog;
}

// Create the formatting toolbar
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
            <select class="heading-select" data-format="heading" title="Text Style">
                <option value="">Normal Text</option>
                <option value="title">Title (H1)</option>
                <option value="subtitle">Subtitle (H2)</option>
                <option value="section">Section (H3)</option>
                <option value="subsection">Subsection (H4)</option>
            </select>
        </div>
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="quote" title="Quote Block">
                <span style="font-family: serif; font-size: 18px;">"</span>
            </button>
        </div>
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="comment" title="Add Comment">
                💬
            </button>
        </div>
        <div class="toolbar-section">
            <button class="toolbar-btn" data-format="clear" title="Clear Formatting">
                🧹
            </button>
        </div>
    `;
    
    // Add event listeners
    toolbar.addEventListener('click', handleToolbarClick);
    toolbar.addEventListener('change', handleToolbarChange);
    
    console.log('Formatting toolbar created');
    return toolbar;
}

// Show the formatting toolbar
export function showFormattingToolbar() {
    if (!getEditMode()) {
        console.log('Not showing formatting toolbar - not in edit mode');
        return;
    }
    
    const toolbar = createFormattingToolbar();
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent) {
        console.warn('Book content not found - cannot show toolbar');
        return;
    }
    
    // Position toolbar above book content
    const bookRect = bookContent.getBoundingClientRect();
    toolbar.style.position = 'fixed';
    toolbar.style.top = Math.max(10, bookRect.top - 60) + 'px';
    toolbar.style.left = bookRect.left + 'px';
    toolbar.style.zIndex = '1000';
    toolbar.style.display = 'flex';
    
    // Add to DOM if not already present
    if (!toolbar.parentNode) {
        document.body.appendChild(toolbar);
    }
    
    console.log('Formatting toolbar shown');
}

// Hide the formatting toolbar
export function hideFormattingToolbar() {
    if (toolbar && toolbar.parentNode) {
        toolbar.parentNode.removeChild(toolbar);
        console.log('Formatting toolbar hidden');
    }
}

// Handle toolbar button clicks
function handleToolbarClick(e) {
    const button = e.target.closest('.toolbar-btn');
    if (!button) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const format = button.dataset.format;
    
    if (format === 'comment') {
        handleCommentCreation();
    } else if (format === 'clear') {
        handleClearFormatting();
    } else {
        applyFormatting(format);
    }
}

// Clear heading formatting from selected text
function clearHeadingFormatting() {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        console.log('🔧 FORMATTING TOOLBAR: No text selected for clearing formatting');
        return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) {
        console.log('🔧 FORMATTING TOOLBAR: No text selected for clearing formatting');
        return;
    }
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.error('Book content element not found');
        return;
    }
    
    // Calculate positions in the plain text content
    const startPos = getPositionInText(bookContent, range.startContainer, range.startOffset);
    const endPos = getPositionInText(bookContent, range.endContainer, range.endOffset);
    
    // Find overlapping heading formats
    const headingTypes = ['title', 'subtitle', 'section', 'subsection'];
    const overlappingHeadings = formattingData.ranges.filter(r => 
        headingTypes.includes(r.type) && !(r.end <= startPos || r.start >= endPos)
    );
    
    console.log(`🔧 FORMATTING TOOLBAR: Found ${overlappingHeadings.length} heading formats to remove`);
    
    // Remove all heading formatting in the selected range
    overlappingHeadings.forEach(range => {
        console.log(`🔧 FORMATTING TOOLBAR: Removing ${range.type} formatting`);
        removeFormattingRange(range.id);
    });
    
    if (overlappingHeadings.length > 0) {
        // Apply DOM changes after removing formatting
        applyFormattingToDOM();
        
        // Preserve selection after clearing formatting
        setTimeout(() => {
            try {
                const { startNode, startOffset, endNode, endOffset } = 
                    findTextNodesAtPositions(bookContent, startPos, endPos);
                
                if (startNode && endNode) {
                    const newRange = document.createRange();
                    newRange.setStart(startNode, startOffset);
                    newRange.setEnd(endNode, endOffset);
                    
                    const newSelection = window.getSelection();
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);
                    
                    console.log('🔧 FORMATTING TOOLBAR: Selection preserved after clearing formatting');
                }
            } catch (error) {
                console.error('🔧 FORMATTING TOOLBAR: Error preserving selection after clearing:', error);
            }
        }, 50);
    } else {
        console.log('🔧 FORMATTING TOOLBAR: No heading formatting found to clear');
    }
}

// Handle select dropdown changes
function handleToolbarChange(e) {
    const select = e.target;
    if (!select.classList.contains('heading-select')) return;
    
    const format = select.value || 'normal';
    console.log('🎯 HEADING SELECTION: Format selected:', format);
    
    if (format === 'normal') {
        console.log('🔧 FORMATTING TOOLBAR: Normal text selected - clearing heading formatting');
        clearHeadingFormatting();
    } else {
        const level = getHeadingLevel(format);
        console.log('🎯 HEADING SELECTION: Applying format:', format, 'with level:', level);
        applyFormatting(format, level);
    }
}

// Calculate exact position in plain text content, ignoring HTML formatting
function getPositionInText(container, targetNode, targetOffset) {
    if (!container || !targetNode) return 0;
    
    try {
        // Create a range from start of container to target position
        const range = document.createRange();
        range.setStart(container, 0);
        range.setEnd(targetNode, targetOffset);
        
        // Get the plain text content of this range
        return range.toString().length;
    } catch (error) {
        console.warn('Error calculating text position:', error);
        return 0;
    }
}

// Helper function to find text nodes at specific positions for selection restoration
function findTextNodesAtPositions(container, startPos, endPos) {
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        node => {
            const parent = node.parentNode;
            // Skip ONLY comment indicators (not formatting elements)
            if (parent.classList.contains('comment-indicator')) {
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
            startOffset = Math.max(0, startPos - currentPos);
        }
        
        // Check if end position is in this node
        if (currentPos + nodeLength >= endPos) {
            endNode = node;
            endOffset = Math.min(nodeLength, endPos - currentPos);
            break;
        }
        
        currentPos += nodeLength;
    }
    
    return { startNode, startOffset, endNode, endOffset };
}

// Apply a specific formatting type to selected text
function applyFormatting(type, level = 1) {
    console.log(`🔧 FORMATTING TOOLBAR: Starting formatting application...`);
    console.log(`🔧 FORMATTING TOOLBAR: Type: ${type} Level: ${level}`);
    
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        console.log('🔧 FORMATTING TOOLBAR: No text selected for formatting');
        return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    if (!selectedText.trim()) {
        console.log('🔧 FORMATTING TOOLBAR: No text selected for formatting');
        return;
    }
    
    console.log(`🔧 FORMATTING TOOLBAR: Selected text: "${selectedText}"`);
    console.log(`🔧 FORMATTING TOOLBAR: Selected text length: ${selectedText.length}`);
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) {
        console.error('Book content element not found');
        return;
    }
    
    // Ensure selection is within book content
    if (!bookContent.contains(range.startContainer) || !bookContent.contains(range.endContainer)) {
        console.log('Selection not in book content area');
        return;
    }
    
    console.log('🔧 FORMATTING TOOLBAR: Book content container found');
    console.log('🔧 FORMATTING TOOLBAR: Range start container:', range.startContainer.textContent ? `"${range.startContainer.textContent.substring(0, 50)}..."` : '');
    console.log('🔧 FORMATTING TOOLBAR: Range end container:', range.endContainer.textContent ? `"${range.endContainer.textContent.substring(0, 50)}..."` : '');
    
    // Calculate positions in the plain text content
    const startPos = getPositionInText(bookContent, range.startContainer, range.startOffset);
    const endPos = getPositionInText(bookContent, range.endContainer, range.endOffset);
    
    // Validate positions
    if (startPos === endPos || startPos < 0 || endPos < 0) {
        console.warn('Invalid text positions calculated:', { startPos, endPos });
        return;
    }
    
    // Get overlapping formatting ranges
    const overlappingRanges = formattingData.ranges.filter(r => 
        !(r.end <= startPos || r.start >= endPos) // Any overlap
    );
    
    console.log(`🔧 FORMATTING TOOLBAR: Found ${overlappingRanges.length} overlapping ranges`);
    
    // Check if we're trying to apply the same format that's already there
    const sameTypeFormat = overlappingRanges.find(f => f.type === type);
    if (sameTypeFormat) {
        console.log(`🔧 FORMATTING TOOLBAR: Removing existing ${type} formatting`);
        removeFormattingRange(sameTypeFormat.id);
        
        // Apply DOM changes after removing formatting
        applyFormattingToDOM();
        
        // Preserve selection after removing formatting
        setTimeout(() => {
            try {
                const { startNode, startOffset, endNode, endOffset } = 
                    findTextNodesAtPositions(bookContent, startPos, endPos);
                
                if (startNode && endNode) {
                    const newRange = document.createRange();
                    newRange.setStart(startNode, startOffset);
                    newRange.setEnd(endNode, endOffset);
                    
                    const newSelection = window.getSelection();
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);
                    
                    console.log('🔧 FORMATTING TOOLBAR: Selection preserved after removing formatting');
                }
            } catch (error) {
                console.error('🔧 FORMATTING TOOLBAR: Error preserving selection after removal:', error);
            }
        }, 50);
        return;
    }
    
    // For heading formats, remove any existing heading formats (only one heading type allowed)
    const headingTypes = ['title', 'subtitle', 'section', 'subsection'];
    if (headingTypes.includes(type)) {
        const existingHeadings = overlappingRanges.filter(r => headingTypes.includes(r.type));
        existingHeadings.forEach(range => {
            console.log(`🔧 FORMATTING TOOLBAR: Removing existing heading ${range.type} to apply new heading ${type}`);
            removeFormattingRange(range.id);
        });
    }
    
    // For text formats (bold, italic, underline), we can combine them with headings
    // So we don't remove overlapping heading formats when applying text formats
    
    console.log(`🔧 FORMATTING TOOLBAR: Applying ${type} formatting to text "${selectedText.substring(0, 50)}..." at positions ${startPos}-${endPos}`);
    console.log('🔧 FORMATTING TOOLBAR: Total book content length:', bookContent.textContent.length);
    
    // Add formatting range
    const formattingRange = addFormattingRange(startPos, endPos, type, level);
    
    if (formattingRange) {
        console.log('🔧 FORMATTING TOOLBAR: Formatting range created:', formattingRange);
        
        // Store original selection details before DOM manipulation
        const originalStartContainer = range.startContainer;
        const originalStartOffset = range.startOffset;
        const originalEndContainer = range.endContainer;
        const originalEndOffset = range.endOffset;
        const originalSelectedText = selectedText;
        
        // Re-render with formatting
        console.log('🔧 FORMATTING TOOLBAR: About to apply formatting to DOM...');
        applyFormattingToDOM();
        
        // FIXED: Preserve selection after formatting instead of clearing it
        setTimeout(() => {
            try {
                // Find the newly formatted element containing our text
                const formattingElements = bookContent.querySelectorAll('[data-formatting-id]');
                let selectionRestored = false;
                
                // Look for the element we just created
                for (const element of formattingElements) {
                    if (element.dataset.formattingId === formattingRange.id && 
                        element.textContent === originalSelectedText) {
                        
                        // Select the entire formatted element
                        const newRange = document.createRange();
                        newRange.selectNodeContents(element);
                        
                        const newSelection = window.getSelection();
                        newSelection.removeAllRanges();
                        newSelection.addRange(newRange);
                        
                        console.log('🔧 FORMATTING TOOLBAR: Selection preserved on formatted element');
                        selectionRestored = true;
                        break;
                    }
                }
                
                if (!selectionRestored) {
                    console.log('🔧 FORMATTING TOOLBAR: Could not find exact formatted element, trying alternative...');
                    
                    // Alternative: try to select text at the same positions
                    try {
                        const { startNode, startOffset, endNode, endOffset } = 
                            findTextNodesAtPositions(bookContent, startPos, endPos);
                        
                        if (startNode && endNode) {
                            const newRange = document.createRange();
                            newRange.setStart(startNode, startOffset);
                            newRange.setEnd(endNode, endOffset);
                            
                            const newSelection = window.getSelection();
                            newSelection.removeAllRanges();
                            newSelection.addRange(newRange);
                            
                            console.log('🔧 FORMATTING TOOLBAR: Selection restored using position-based approach');
                            selectionRestored = true;
                        }
                    } catch (error) {
                        console.warn('🔧 FORMATTING TOOLBAR: Alternative selection restore failed:', error);
                    }
                }
                
                if (!selectionRestored) {
                    console.log('🔧 FORMATTING TOOLBAR: Could not restore selection - keeping it cleared');
                }
                
                // DEBUGGING: Check DOM after formatting
                console.log('🔧 FORMATTING TOOLBAR: Formatting elements after DOM update:', formattingElements.length);
                
                if (formattingElements.length > 0) {
                    formattingElements.forEach((el, index) => {
                        const styles = window.getComputedStyle(el);
                        console.log(`🔧 FORMATTING TOOLBAR: Element ${index} styles:`, {
                            className: el.className,
                            backgroundColor: styles.backgroundColor,
                            fontStyle: styles.fontStyle,
                            fontWeight: styles.fontWeight,
                            textDecoration: styles.textDecoration
                        });
                    });
                }
            } catch (error) {
                console.error('🔧 FORMATTING TOOLBAR: Error in selection preservation:', error);
            }
        }, 50);
    }
}

// Handle comment creation
function handleCommentCreation() {
    const selection = window.getSelection();
    let position = 0;
    
    if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        const bookContent = document.getElementById('bookContent');
        if (bookContent.contains(range.startContainer)) {
            position = getPositionInText(bookContent, range.startContainer, range.startOffset);
        }
    }
    
    // Import and show comment dialog
    loadCommentSystem().then((showDialog) => {
        showDialog(position);
    }).catch(error => {
        console.error('Error loading comments system:', error);
    });
}

// Handle clear formatting
function handleClearFormatting() {
    const selection = window.getSelection();
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent) {
        console.error('🧹 CLEAR FORMATTING: Book content element not found');
        return;
    }
    
    let startPos, endPos, hasSelection = false;
    
    // Check if there's a text selection
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        
        // Only treat as selection if there's actual text selected
        if (selectedText.trim() && bookContent.contains(range.startContainer)) {
            hasSelection = true;
            startPos = getPositionInText(bookContent, range.startContainer, range.startOffset);
            endPos = getPositionInText(bookContent, range.endContainer, range.endOffset);
            console.log(`🧹 CLEAR FORMATTING: Clearing formatting from selected text (positions ${startPos} to ${endPos})`);
        }
    }
    
    let rangesToRemove;
    
    if (hasSelection) {
        // Clear formatting only in the selected range
        rangesToRemove = formattingData.ranges.filter(r => 
            !(r.end <= startPos || r.start >= endPos) // Overlapping ranges
        );
        console.log(`🧹 CLEAR FORMATTING: Found ${rangesToRemove.length} formatting ranges in selection to remove:`);
    } else {
        // Clear ALL formatting in the entire document
        rangesToRemove = [...formattingData.ranges]; // Copy all ranges
        console.log(`🧹 CLEAR FORMATTING: No text selected - clearing ALL formatting (${rangesToRemove.length} ranges):`);
    }
    
    // Log what we're removing
    rangesToRemove.forEach(r => {
        console.log(`🧹 CLEAR FORMATTING: - Removing ${r.type} formatting (${r.start}-${r.end})`);
    });
    
    // Remove all the formatting ranges
    rangesToRemove.forEach(r => removeFormattingRange(r.id));
    
    if (rangesToRemove.length > 0) {
        applyFormattingToDOM();
        updateToolbarState();
        
        if (hasSelection) {
            console.log(`🧹 CLEAR FORMATTING: Successfully cleared ${rangesToRemove.length} formatting ranges from selection`);
            
            // Preserve selection after clearing formatting
            setTimeout(() => {
                try {
                    const { startNode, startOffset, endNode, endOffset } = 
                        findTextNodesAtPositions(bookContent, startPos, endPos);
                    
                    if (startNode && endNode) {
                        const newRange = document.createRange();
                        newRange.setStart(startNode, startOffset);
                        newRange.setEnd(endNode, endOffset);
                        
                        const newSelection = window.getSelection();
                        newSelection.removeAllRanges();
                        newSelection.addRange(newRange);
                        
                        console.log('🧹 CLEAR FORMATTING: Selection preserved after clearing formatting');
                    }
                } catch (error) {
                    console.error('🧹 CLEAR FORMATTING: Error preserving selection after clearing:', error);
                }
            }, 50);
        } else {
            console.log(`🧹 CLEAR FORMATTING: Successfully cleared ALL ${rangesToRemove.length} formatting ranges from entire document`);
        }
    } else {
        if (hasSelection) {
            console.log('🧹 CLEAR FORMATTING: No formatting found to clear in selected range');
        } else {
            console.log('🧹 CLEAR FORMATTING: No formatting found to clear in entire document');
        }
    }
}

// Update toolbar state based on current selection
function updateToolbarState() {
    if (!toolbar) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        // Clear active states
        activeFormats.clear();
        updateToolbarButtons();
        return;
    }
    
    const range = selection.getRangeAt(0);
    const bookContent = document.getElementById('bookContent');
    
    if (!bookContent.contains(range.startContainer)) {
        activeFormats.clear();
        updateToolbarButtons();
        return;
    }
    
    // Get position and check for active formatting
    const position = getPositionInText(bookContent, range.startContainer, range.startOffset);
    const formatsAtPosition = getFormattingAtPosition(position);
    
    // Update active formats
    activeFormats.clear();
    formatsAtPosition.forEach(format => {
        activeFormats.add(format.type);
    });
    
    updateToolbarButtons();
}

// Update visual state of toolbar buttons
function updateToolbarButtons() {
    if (!toolbar) return;
    
    // Update button states
    const buttons = toolbar.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
        const format = btn.dataset.format;
        if (activeFormats.has(format)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update select dropdown
    const select = toolbar.querySelector('.heading-select');
    if (select) {
        const headingFormat = Array.from(activeFormats).find(f => 
            ['title', 'subtitle', 'section', 'subsection'].includes(f)
        );
        select.value = headingFormat || '';
        console.log('Updated dropdown to:', headingFormat || 'normal');
    }
}

// Get heading level from format type
function getHeadingLevel(format) {
    const levels = {
        'title': 1,
        'subtitle': 2,
        'section': 3,
        'subsection': 4
    };
    return levels[format] || 1;
}

// Initialize keyboard shortcuts
export function initializeFormattingShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (!getEditMode()) return;
        
        // Only handle shortcuts with Ctrl/Cmd
        if (!(e.ctrlKey || e.metaKey)) return;
        
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
            case 'q':
                e.preventDefault();
                applyFormatting('quote');
                break;
            case 'k':
                e.preventDefault();
                handleCommentCreation();
                break;
        }
    });
    
    console.log('Formatting keyboard shortcuts initialized');
}

// Initialize selection change listener
export function initializeSelectionTracking() {
    document.addEventListener('selectionchange', () => {
        if (!getEditMode() || !toolbar) return;
        
        // Debounce selection changes
        clearTimeout(updateToolbarState.timeout);
        updateToolbarState.timeout = setTimeout(updateToolbarState, 100);
    });
    
    console.log('Selection tracking initialized');
}

// Reposition toolbar when window resizes
function repositionToolbar() {
    if (!toolbar || !toolbar.parentNode || !getEditMode()) return;
    
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    const bookRect = bookContent.getBoundingClientRect();
    toolbar.style.top = Math.max(10, bookRect.top - 60) + 'px';
    toolbar.style.left = bookRect.left + 'px';
}

// Initialize window resize listener
export function initializeToolbarPositioning() {
    window.addEventListener('resize', repositionToolbar);
    window.addEventListener('scroll', repositionToolbar);
    
    console.log('Toolbar positioning initialized');
}

// Cleanup function
export function cleanupFormattingToolbar() {
    hideFormattingToolbar();
    toolbar = null;
    activeFormats.clear();
    
    console.log('Formatting toolbar cleaned up');
} 