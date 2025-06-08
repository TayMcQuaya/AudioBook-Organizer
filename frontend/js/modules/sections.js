// AudioBook Organizer - Section Management

import { chapters, findChapter, currentColorIndex, chapterPlayers } from './state.js';
import { createNewChapter } from './chapters.js';
import { updateChaptersList, updateSelectionColor } from './ui.js';

// Section Management - preserving exact logic from original
export function createSection() {
    // Check if we have smart selection data first
    let text = '';
    let selectionRange = null;
    
    if (window.smartSelectionData) {
        // Use smart selection data
        text = window.smartSelectionData.text;
        console.log('Using smart selection data for section creation');
        
        // Try to get the range from the smart selected element
        const smartSelectedElement = document.querySelector('.smart-selected-text');
        if (smartSelectedElement) {
            selectionRange = document.createRange();
            selectionRange.selectNodeContents(smartSelectedElement);
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
        alert('No text selected. Please select some text first.');
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
    
    // Add section to the last chapter
    const lastChapter = chapters[chapters.length - 1];
    lastChapter.sections.push(section);
    
    // Update UI
    updateChaptersList();
    updateSelectionColor();
    
    // Clear selection and smart selection data
    if (window.smartSelectionData) {
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
        // Clear regular selection
        const windowSelection = window.getSelection();
        if (windowSelection) windowSelection.removeAllRanges();
    }
}

export function getNextSectionNumber(chapterId) {
    const chapter = findChapter(chapterId);
    return chapter ? chapter.sections.length + 1 : 1;
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
        chapter.sections = chapter.sections.filter(s => s.id !== sectionId);
        updateChaptersList();
    }
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
        alert('Failed to upload audio file: ' + error.message);
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