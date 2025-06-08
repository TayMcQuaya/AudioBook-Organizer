// AudioBook Organizer - Section Management

import { chapters, findChapter, currentColorIndex, chapterPlayers } from './state.js';
import { createNewChapter } from './chapters.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';
import { showWarning, showError, showSuccess } from './notifications.js';

// Section Management - preserving exact logic from original
export function createSection() {
    // Check if we have smart selection data first
    let text = '';
    let selectionRange = null;
    
    if (window.smartSelectionData) {
        // Use smart selection data
        text = window.smartSelectionData.text;
        console.log('Using smart selection data for section creation');
        
        // Find and remove the smart selected element, replacing it with plain text
        const smartSelectedElement = document.querySelector('.smart-selected-text');
        if (smartSelectedElement) {
            // Get the text content before manipulating the DOM
            const selectedText = smartSelectedElement.textContent;
            const parent = smartSelectedElement.parentNode;
            
            // Create a range that selects only the text content, not the element itself
            selectionRange = document.createRange();
            selectionRange.selectNodeContents(smartSelectedElement);
            
            // Store the start and end containers/offsets before DOM manipulation
            const startContainer = selectionRange.startContainer;
            const startOffset = selectionRange.startOffset;
            const endContainer = selectionRange.endContainer;
            const endOffset = selectionRange.endOffset;
            
            // Replace the smart selected element with plain text
            const textNode = document.createTextNode(selectedText);
            parent.replaceChild(textNode, smartSelectedElement);
            
            // DON'T normalize yet - create the range first
            // Create a precise range that selects exactly the text we want
            selectionRange = document.createRange();
            selectionRange.setStart(textNode, 0);
            selectionRange.setEnd(textNode, selectedText.length);
            
            console.log('Smart selection element removed and replaced with plain text');
        }
    } else {
        // Fall back to regular selection
        const selection = window.getSelection();
        text = selection.toString().trim();
        if (selection.rangeCount > 0) {
            selectionRange = selection.getRangeAt(0);
        }
    }
    
    if (!text || !selectionRange) {
        showWarning('No text selected. Please select some text first.');
        return;
    }

    // If no chapters exist, create one
    if (chapters.length === 0) {
        createNewChapter();
    }
    const colorIndex = currentColorIndex;
    
    // Create section object
    const section = {
        id: Date.now(),
        text: text,
        colorIndex: colorIndex,
        status: 'pending',
        name: `Section ${getNextSectionNumber(chapters[chapters.length - 1].id)}`,
        chapterId: chapters[chapters.length - 1].id
    };
    
    // Create highlight span
    const span = document.createElement('span');
    span.className = `section-highlight section-color-${colorIndex}`;
    span.textContent = text;
    span.dataset.sectionId = section.id;
    
    // Replace selected text with highlighted span
    selectionRange.deleteContents();
    selectionRange.insertNode(span);
    
    // Now normalize the parent to clean up any fragmented text nodes
    const bookContent = document.getElementById('bookContent');
    if (bookContent) {
        bookContent.normalize();
    }
    
    // Add section to the last chapter
    const lastChapter = chapters[chapters.length - 1];
    lastChapter.sections.push(section);
    
    // Update UI
    updateChaptersList();
    updateSelectionColor();
    
    // Update smart selection position and clear selection data
    if (window.smartSelectionData) {
        // Update smart selection to continue from where this selection ended
        import('./smartSelect.js').then(({ setCurrentPosition }) => {
            setCurrentPosition(window.smartSelectionData.endPosition);
            console.log(`Smart selection updated to continue from position ${window.smartSelectionData.endPosition}`);
        });
        
        // Clear smart selection data and hide tools
        window.smartSelectionData = null;
        
        // Hide selection tools
        const tools = document.getElementById('selection-tools');
        const charCounter = document.querySelector('.char-counter');
        if (tools) tools.style.display = 'none';
        if (charCounter) charCounter.style.display = 'none';
        
        // Clear any text selection
        const windowSelection = window.getSelection();
        if (windowSelection) windowSelection.removeAllRanges();
    } else {
        // For manual selections, update smart selection position based on selection end
        const windowSelection = window.getSelection();
        if (windowSelection && windowSelection.rangeCount > 0) {
            // Get the book content to calculate position
            const bookContent = document.getElementById('bookContent');
            if (bookContent) {
                const range = windowSelection.getRangeAt(0);
                const beforeRange = document.createRange();
                beforeRange.setStart(bookContent, 0);
                beforeRange.setEnd(range.endContainer, range.endOffset);
                const textBeforeEnd = beforeRange.toString().length;
                
                // Update smart selection position
                import('./smartSelect.js').then(({ setCurrentPosition }) => {
                    setCurrentPosition(textBeforeEnd);
                    console.log(`Smart selection updated to continue from manual selection end at position ${textBeforeEnd}`);
                });
            }
        }
        
        // Clear regular selection
        if (windowSelection) windowSelection.removeAllRanges();
    }
}

export function getNextSectionNumber(chapterId) {
    const chapter = findChapter(chapterId);
    return chapter ? chapter.sections.length + 1 : 1;
}

// Copy section text to clipboard
export function copySectionText(sectionId) {
    // Find the section in all chapters
    let sectionText = '';
    for (const chapter of chapters) {
        const section = chapter.sections.find(s => s.id === sectionId);
        if (section) {
            sectionText = section.text;
            break;
        }
    }
    
    if (!sectionText) {
        showError('Section not found!');
        return;
    }
    
    console.log('Attempting to copy text:', sectionText.substring(0, 50) + '...');
    
    // Try multiple copy methods in order of preference
    if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API (HTTPS required)
        console.log('Using modern clipboard API');
        navigator.clipboard.writeText(sectionText).then(() => {
            showSuccess('📋 Section text copied to clipboard!');
        }).catch(err => {
            console.error('Modern clipboard failed:', err);
            fallbackCopyMethod(sectionText);
        });
    } else if (navigator.clipboard) {
        // Clipboard API exists but not secure context
        console.log('Clipboard API exists but not secure context, trying anyway');
        navigator.clipboard.writeText(sectionText).then(() => {
            showSuccess('📋 Section text copied to clipboard!');
        }).catch(err => {
            console.error('Clipboard API failed:', err);
            fallbackCopyMethod(sectionText);
        });
    } else {
        // Use fallback method
        console.log('Using fallback copy method');
        fallbackCopyMethod(sectionText);
    }
}

// Improved fallback copy method
function fallbackCopyMethod(text) {
    // Try multiple fallback approaches
    let success = false;
    
    // Method 1: Create textarea and select
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        textarea.setAttribute('readonly', '');
        
        document.body.appendChild(textarea);
        
        // Select the text
        textarea.select();
        textarea.setSelectionRange(0, text.length);
        
        // Try to copy
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
            console.log('Fallback method 1 succeeded');
            showSuccess('📋 Section text copied to clipboard!');
            return;
        }
    } catch (err) {
        console.error('Fallback method 1 failed:', err);
    }
    
    // Method 2: Try with different approach
    try {
        const range = document.createRange();
        const span = document.createElement('span');
        span.textContent = text;
        span.style.position = 'absolute';
        span.style.left = '-9999px';
        
        document.body.appendChild(span);
        range.selectNode(span);
        
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const successful = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(span);
        
        if (successful) {
            console.log('Fallback method 2 succeeded');
            showSuccess('📋 Section text copied to clipboard!');
            return;
        }
    } catch (err) {
        console.error('Fallback method 2 failed:', err);
    }
    
    // If all methods fail, show manual copy option
    showManualCopyDialog(text);
}

// Show manual copy dialog as last resort
function showManualCopyDialog(text) {
    // Create a modal with the text selected for manual copying
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 80%;
        overflow: hidden;
    `;
    
    dialog.innerHTML = `
        <h3 style="margin-top: 0;">📋 Copy Text Manually</h3>
        <p>Your browser doesn't support automatic copying. Please select all the text below and copy it manually (Ctrl+C or Cmd+C):</p>
        <textarea readonly style="width: 100%; height: 200px; margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 14px;">${text}</textarea>
        <div style="text-align: right;">
            <button onclick="this.closest('.copy-modal').remove()" style="background: #4CAF50; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
        </div>
    `;
    
    modal.className = 'copy-modal';
    modal.appendChild(dialog);
    document.body.appendChild(modal);
    
    // Auto-select the text
    const textarea = dialog.querySelector('textarea');
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 100);
    
    // Close on escape or outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

export function updateSectionName(sectionId, newName) {
    for (const chapter of chapters) {
        const section = chapter.sections.find(s => s.id === sectionId);
        if (section) {
            section.name = newName;
            updateChaptersList();
            break;
        }
    }
}

export function deleteSection(chapterId, sectionId) {
    const chapter = findChapter(chapterId);
    if (chapter) {
        // Remove the highlighted text from the DOM first
        removeHighlightFromText(sectionId);
        
        // Remove the section from the chapter data
        chapter.sections = chapter.sections.filter(s => s.id !== sectionId);
        updateChaptersList();
    }
}

/**
 * Removes the visual highlight for a section from the book content
 * @param {number} sectionId - The ID of the section to remove highlighting for
 */
export function removeHighlightFromText(sectionId) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    // Find the highlighted element for this section
    const highlight = bookContent.querySelector(`.section-highlight[data-section-id="${sectionId}"]`);
    if (!highlight) {
        console.warn(`No highlight found for section ID: ${sectionId}`);
        return;
    }
    
    console.log(`Removing highlight for section ID: ${sectionId}`);
    
    // Store the parent element for cleanup
    const parent = highlight.parentNode;
    
    // Replace the highlighted span with its text content
    const textNode = document.createTextNode(highlight.textContent);
    parent.replaceChild(textNode, highlight);
    
    // Normalize the parent to merge any adjacent text nodes
    // This cleans up the DOM structure after removing highlights
    parent.normalize();
    
    console.log(`Highlight successfully removed for section ID: ${sectionId}`);
}

/**
 * Removes all section highlights from the book content
 * Useful for clearing all visual highlights at once
 */
export function removeAllHighlights() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    const highlights = bookContent.querySelectorAll('.section-highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        const textNode = document.createTextNode(highlight.textContent);
        parent.replaceChild(textNode, highlight);
        parent.normalize();
    });
}

export function navigateToSection(sectionId) {
    // Find the section highlight in the book content
    const highlight = document.querySelector(`.section-highlight[data-section-id="${sectionId}"]`);
    if (!highlight) return;

    // Scroll the highlight into view with some padding
    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add flash animation
    highlight.classList.remove('flash');
    void highlight.offsetWidth; // Force reflow to restart animation
    highlight.classList.add('flash');

    // Remove flash class after animation
    setTimeout(() => {
        highlight.classList.remove('flash');
    }, 1000);

    // Update URL hash for direct linking
    window.location.hash = `section-${sectionId}`;
}

// Audio attachment functions - preserving exact logic from original
export async function attachAudio(chapterId, sectionId, input) {
    const file = input.files[0];
    if (!file) return;
    
    try {
        const formData = new FormData();
        formData.append('audio', file);
        
        const audioControls = input.parentElement;
        const loadingSpan = document.createElement('span');
        loadingSpan.textContent = file.name.toLowerCase().endsWith('.mp3') ? 'Converting and uploading...' : 'Uploading...';
        audioControls.appendChild(loadingSpan);
        input.disabled = true;
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const chapter = findChapter(chapterId);
        const section = chapter?.sections.find(s => s.id === sectionId);
        if (section) {
            section.audioPath = result.path;
            section.status = 'done';
            updateChaptersList();
        }
    } catch (error) {
        console.error('Error uploading audio:', error);
        showError('Failed to upload audio file: ' + error.message);
    } finally {
        const audioControls = input.parentElement;
        const loadingSpan = audioControls.querySelector('span');
        if (loadingSpan) {
            audioControls.removeChild(loadingSpan);
        }
        input.disabled = false;
    }
}

export function removeAudio(chapterId, sectionId) {
    const chapter = findChapter(chapterId);
    const section = chapter?.sections.find(s => s.id === sectionId);
    if (section) {
        section.audioPath = null;
        section.status = 'pending';
        
        // Stop and reset chapter player if it exists
        const player = chapterPlayers.get(chapterId);
        if (player) {
            player.stop();
            chapterPlayers.delete(chapterId);
        }
        
        updateChaptersList();
    }
}

// Drag and Drop functionality - preserving exact logic from original
export function initializeDragAndDrop() {
    const draggables = document.querySelectorAll('.section-item');
    const containers = document.querySelectorAll('.chapter-sections');
    let draggedElement = null;
    let placeholder = null;

    draggables.forEach(draggable => {
        // Handle drag start
        draggable.addEventListener('dragstart', (e) => {
            draggedElement = draggable;
            draggable.classList.add('dragging');
            
            // Create and insert placeholder
            placeholder = document.createElement('div');
            placeholder.className = 'drag-placeholder';
            draggable.parentNode.insertBefore(placeholder, draggable.nextSibling);
            
            // Set drag data
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggable.dataset.sectionId);
            
            // Set custom drag image (optional)
            const dragImage = draggable.cloneNode(true);
            dragImage.style.width = draggable.offsetWidth + 'px';
            dragImage.style.height = draggable.offsetHeight + 'px';
            dragImage.style.transform = 'translateX(-99999px)';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, 0, 0);
            setTimeout(() => document.body.removeChild(dragImage), 0);
        });

        // Handle drag end
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
            draggedElement = null;
            placeholder = null;
            
            // Remove all drag-over classes
            document.querySelectorAll('.drag-over').forEach(el => {
                el.classList.remove('drag-over');
            });
        });
    });

    containers.forEach(container => {
        // Handle drag enter
        container.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (draggedElement && !container.contains(draggedElement)) {
                container.classList.add('drag-over');
            }
        });

        // Handle drag leave
        container.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (e.relatedTarget && !container.contains(e.relatedTarget)) {
                container.classList.remove('drag-over');
            }
        });

        // Handle drag over
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (!draggedElement) return;

            const afterElement = getDragAfterElement(container, e.clientY);
            
            if (placeholder) {
                if (afterElement) {
                    container.insertBefore(placeholder, afterElement);
                } else {
                    container.appendChild(placeholder);
                }
            }
        });

        // Handle drop
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            if (!draggedElement) return;
            
            const newChapterId = parseInt(container.dataset.chapterId);
            const sectionId = parseInt(draggedElement.dataset.sectionId);
            const afterElement = getDragAfterElement(container, e.clientY);
            
            // Calculate new index
            let newIndex;
            if (afterElement) {
                newIndex = parseInt(afterElement.dataset.index);
            } else {
                const sections = container.querySelectorAll('.section-item');
                newIndex = sections.length;
            }
            
            // Move section in the data structure
            moveSection(sectionId, newChapterId, newIndex);
        });
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.section-item:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function moveSection(sectionId, newChapterId, newIndex) {
    let section;
    let oldChapter;
    
    // Find and remove section from old chapter
    for (const chapter of chapters) {
        const sectionIndex = chapter.sections.findIndex(s => s.id === sectionId);
        if (sectionIndex !== -1) {
            section = chapter.sections[sectionIndex];
            oldChapter = chapter;
            chapter.sections.splice(sectionIndex, 1);
            break;
        }
    }
    
    // Add section to new chapter at the specified index
    if (section) {
        const newChapter = findChapter(newChapterId);
        if (newChapter) {
            section.chapterId = newChapterId;
            newChapter.sections.splice(newIndex, 0, section);
            
            // Reinitialize audio players for affected chapters
            if (oldChapter) {
                const oldPlayer = chapterPlayers.get(oldChapter.id);
                if (oldPlayer) {
                    oldPlayer.stop();
                    chapterPlayers.delete(oldChapter.id);
                }
            }
            
            const newPlayer = chapterPlayers.get(newChapterId);
            if (newPlayer) {
                newPlayer.stop();
                chapterPlayers.delete(newChapterId);
            }
            
            updateChaptersList();
        }
    }
}