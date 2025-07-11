// AudioBook Organizer - Section Management

import { chapters, findChapter, currentColorIndex, chapterPlayers } from './state.js';
import { createNewChapter } from './chapters.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';
import { consumeTestCredits } from './appUI.js';
import { showWarning, showError, showSuccess } from './notifications.js';
import { apiFetch } from './api.js';

// Section Management - preserving exact logic from original
export async function createSection() {
    // Consume credits for section creation
    await consumeTestCredits(3, 'section creation');
    
    // Check if we have smart selection data first
    let text = '';
    let selectionRange = null;
    
    if (window.smartSelectionData) {
        // Use smart selection data
        text = window.smartSelectionData.text;
        console.log('Using smart selection data for section creation');
        
        // Find the smart selected element - but preserve its formatted content
        const smartSelectedElement = document.querySelector('.smart-selected-text');
        if (smartSelectedElement) {
            // Create a range that selects the entire smart-selected element
            selectionRange = document.createRange();
            selectionRange.selectNode(smartSelectedElement);
            
            console.log('Smart selection element found - will preserve its formatting');
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
        await createNewChapter();
    }
    const colorIndex = currentColorIndex;
    
    // Get current user info for attribution
    const currentUser = window.authModule?.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    const timestamp = new Date().toISOString();
    
    // Create section object
    const section = {
        id: Date.now(),
        text: text,
        colorIndex: colorIndex,
        status: 'pending',
        name: `Section ${getNextSectionNumber(chapters[chapters.length - 1].id)}`,
        chapterId: chapters[chapters.length - 1].id,
        // NEW: User attribution for collaboration
        createdBy: userId,
        lastModifiedBy: userId,
        lastModified: timestamp
    };
    
    // Create highlight span that will preserve existing formatting
    const span = document.createElement('span');
    span.className = `section-highlight section-color-${colorIndex}`;
    span.dataset.sectionId = section.id;
    
    // ✅ PRESERVE FORMATTING: Extract and preserve existing content instead of replacing with plain text
    try {
        // Extract the existing formatted content (this preserves all HTML formatting)
        const formattedContent = selectionRange.extractContents();
        
        // If the content came from a smart-selected-text element, unwrap it first
        if (window.smartSelectionData) {
            // The formattedContent is the smart-selected-text span, get its children
            const smartSpan = formattedContent.querySelector('.smart-selected-text');
            if (smartSpan) {
                // Move all children from smart span to our section span
                while (smartSpan.firstChild) {
                    span.appendChild(smartSpan.firstChild);
                }
            } else {
                // Fallback: append the extracted content directly
                span.appendChild(formattedContent);
            }
        } else {
            // For manual selections, append the extracted content directly
            span.appendChild(formattedContent);
        }
        
        // Insert the section highlight span at the selection position
        selectionRange.insertNode(span);
        
        console.log('✅ Section created with preserved formatting');
        
    } catch (error) {
        console.error('Error preserving formatting during section creation:', error);
        
        // Fallback to original behavior if preservation fails
        console.log('Falling back to plain text section creation');
        span.textContent = text;
        selectionRange.deleteContents();
        selectionRange.insertNode(span);
    }
    
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
        // Store the end position before clearing the data
        const endPosition = window.smartSelectionData.endPosition;
        
        // Advance smart selection to continue from where this selection ended
        import('./smartSelect.js').then(({ advanceSmartSelectPosition }) => {
            advanceSmartSelectPosition(endPosition);
            console.log(`Smart selection advanced to position ${endPosition}`);
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
                
                // Advance smart selection position
                import('./smartSelect.js').then(({ advanceSmartSelectPosition }) => {
                    advanceSmartSelectPosition(textBeforeEnd);
                    console.log(`Smart selection advanced to continue from manual selection end at position ${textBeforeEnd}`);
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
    
            // **SECURITY FIX: Removed text content logging to prevent user content exposure**
        console.log('Attempting to copy selected text');
    
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
            // Update name and track modification
            section.name = newName;
            
            // Update modification tracking
            const currentUser = window.authModule?.getCurrentUser();
            const userId = currentUser?.id || 'anonymous';
            section.lastModifiedBy = userId;
            section.lastModified = new Date().toISOString();
            
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
    
    // ✅ PRESERVE FORMATTING: Extract all child nodes (which contain the formatting)
    // instead of just getting the text content
    const fragment = document.createDocumentFragment();
    
    // Move all child nodes from the highlight span to the fragment
    while (highlight.firstChild) {
        fragment.appendChild(highlight.firstChild);
    }
    
    // Replace the highlight span with the fragment containing all the formatted content
    parent.replaceChild(fragment, highlight);
    
    // Normalize the parent to merge any adjacent text nodes
    // This cleans up the DOM structure after removing highlights
    parent.normalize();
    
    console.log(`Highlight successfully removed for section ID: ${sectionId} with formatting preserved`);
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
        
        // ✅ PRESERVE FORMATTING: Extract all child nodes instead of just text
        const fragment = document.createDocumentFragment();
        
        // Move all child nodes from the highlight span to the fragment
        while (highlight.firstChild) {
            fragment.appendChild(highlight.firstChild);
        }
        
        // Replace the highlight span with the fragment containing all the formatted content
        parent.replaceChild(fragment, highlight);
        parent.normalize();
    });
}

export function navigateToSection(sectionId) {
    // Find the section highlight in the book content
    const highlight = document.querySelector(`.section-highlight[data-section-id="${sectionId}"]`);
    if (!highlight) return;

    // ✅ FIX: Scroll within the content container instead of the entire page
    const bookContent = document.getElementById('bookContent');
    const columnContent = bookContent?.closest('.column-content');
    
    if (columnContent) {
        // Get the position of the highlight relative to the scrollable container
        const highlightRect = highlight.getBoundingClientRect();
        const containerRect = columnContent.getBoundingClientRect();
        const relativeTop = highlightRect.top - containerRect.top;
        const containerHeight = columnContent.clientHeight;
        
        // Calculate the scroll position to center the highlight in the container
        const targetScrollTop = columnContent.scrollTop + relativeTop - (containerHeight / 2) + (highlightRect.height / 2);
        
        // Smooth scroll within the content container only
        columnContent.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
        
        console.log(`✅ Scrolled to section ${sectionId} within content container`);
    } else {
        // Fallback to original behavior if container not found
        console.warn('Column content container not found, using fallback scroll');
        highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Add flash animation
    highlight.classList.remove('flash');
    void highlight.offsetWidth; // Force reflow to restart animation
    highlight.classList.add('flash');

    // Remove flash class after animation
    setTimeout(() => {
        highlight.classList.remove('flash');
    }, 1000);
}

// Audio attachment functions - preserving exact logic from original
export async function attachAudio(chapterId, sectionId, input) {
    const file = input.files[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3'];
    if (!allowedTypes.includes(file.type)) {
        showError('Please upload an MP3 or WAV file.');
        return;
    }
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showError('File is too large. Maximum size is 50MB.');
        return;
    }

    // Check credits before uploading audio file
    const { checkCreditsForAction } = await import('./appUI.js');
    const hasCredits = await checkCreditsForAction(2, 'Audio upload');
    
    if (!hasCredits) {
        // Reset the file input
        input.value = '';
        return;
    }

    // 🔄 NEW: Show upload progress feedback
    const uploadFeedback = showUploadProgress(input, file);

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('chapterId', chapterId);
    formData.append('sectionId', sectionId);

    try {
        // Update progress message for processing stage
        updateUploadProgress(uploadFeedback, 'uploading', file);

        const response = await apiFetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Update progress for processing stage (MP3 conversion, etc.)
        updateUploadProgress(uploadFeedback, 'processing', file);

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to upload audio');
        }

        // Update progress for finalizing
        updateUploadProgress(uploadFeedback, 'finalizing', file);

        // Update credit display after successful upload
        const { updateUserCredits } = await import('./appUI.js');
        updateUserCredits(); // Refresh credit display to show consumption

        // Update section state with audio path
        const chapter = findChapter(chapterId);
        if (chapter) {
            const section = chapter.sections.find(s => s.id === sectionId);
            if (section) {
                section.audioPath = data.path;
                section.status = 'processed';
                // Clear any missing audio status since we have a new valid file
                section.audioStatus = null;
                section.originalAudioPath = null;
                // Update player in state
                if (chapterPlayers[chapter.id]) {
                    chapterPlayers[chapter.id].updatePlaylist();
                }
            }
        }

        // 🔄 NEW: Remove upload feedback and update UI
        hideUploadProgress(uploadFeedback);
        updateChaptersList();
        showSuccess('Audio attached successfully!');

    } catch (error) {
        console.error('Audio upload failed:', error);
        // 🔄 NEW: Remove upload feedback on error
        hideUploadProgress(uploadFeedback);
        showError(`Audio upload failed: ${error.message}`);
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

/**
 * Clear missing audio reference from a section
 * This removes the audioPath and audioStatus properties when audio is confirmed missing
 */
export function clearMissingAudio(chapterId, sectionId) {
    const chapter = findChapter(chapterId);
    const section = chapter?.sections.find(s => s.id === sectionId);
    if (section) {
        // Clear all audio-related properties
        section.audioPath = null;
        section.audioStatus = null;
        section.originalAudioPath = null;
        section.status = 'pending';
        
        // Stop and reset chapter player if it exists
        const player = chapterPlayers.get(chapterId);
        if (player) {
            player.stop();
            chapterPlayers.delete(chapterId);
        }
        
        updateChaptersList();
        showSuccess('Missing audio reference cleared. You can now upload a new audio file.');
        
        // **SECURITY FIX: Removed section name to prevent user content exposure**
        console.log('✅ Cleared missing audio reference for section');
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

// =============================================================================
// UPLOAD PROGRESS FEEDBACK SYSTEM
// =============================================================================

/**
 * Show upload progress feedback for audio files
 * Creates visual indicator and disables input during upload
 */
function showUploadProgress(inputElement, file) {
    // Disable the file input to prevent multiple uploads
    inputElement.disabled = true;
    
    // Find the audio controls container
    const audioControls = inputElement.closest('.audio-controls');
    if (!audioControls) {
        console.warn('Could not find audio controls container for upload feedback');
        return null;
    }
    
    // Create progress container
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    progressContainer.innerHTML = `
        <div class="upload-progress-content">
            <div class="upload-progress-spinner"></div>
            <div class="upload-progress-text">
                <div class="upload-file-name">${file.name}</div>
                <div class="upload-status">Preparing upload...</div>
            </div>
        </div>
    `;
    
    // Insert progress indicator before the file input
    audioControls.insertBefore(progressContainer, inputElement);
    
    // Hide the file input during upload
    inputElement.style.display = 'none';
    
    // Show upload progress
    // **SECURITY FIX: Removed filename logging to prevent exposure**
    console.log('🔄 Upload progress started for file');
    
    return {
        container: progressContainer,
        statusElement: progressContainer.querySelector('.upload-status'),
        inputElement: inputElement
    };
}

/**
 * Update upload progress with current stage
 */
function updateUploadProgress(uploadFeedback, stage, file) {
    if (!uploadFeedback || !uploadFeedback.statusElement) {
        return;
    }
    
    const messages = {
        'uploading': file.name.toLowerCase().endsWith('.mp3') ? 
            'Uploading and converting to WAV...' : 'Uploading audio file...',
        'processing': 'Processing audio file...',
        'finalizing': 'Finalizing upload...'
    };
    
    const message = messages[stage] || 'Processing...';
    uploadFeedback.statusElement.textContent = message;
    
    console.log(`🔄 Upload progress [${stage}]: ${message}`);
}

/**
 * Hide upload progress and restore normal UI
 */
function hideUploadProgress(uploadFeedback) {
    if (!uploadFeedback) {
        return;
    }
    
    try {
        // Remove progress container
        if (uploadFeedback.container && uploadFeedback.container.parentNode) {
            uploadFeedback.container.parentNode.removeChild(uploadFeedback.container);
        }
        
        // Restore file input
        if (uploadFeedback.inputElement) {
            uploadFeedback.inputElement.style.display = '';
            uploadFeedback.inputElement.disabled = false;
            uploadFeedback.inputElement.value = ''; // Clear the file input
        }
        
        console.log('✅ Upload progress feedback removed');
        
    } catch (error) {
        console.error('Error hiding upload progress:', error);
        
        // Fallback: at least re-enable the input
        if (uploadFeedback.inputElement) {
            uploadFeedback.inputElement.disabled = false;
        }
    }
}