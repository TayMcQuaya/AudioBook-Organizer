// AudioBook Organizer - Reorder Module
// Handles drag-and-drop reordering of chapters and sections in a dedicated modal

import { chapters, findChapter } from './state.js';
import { updateChaptersList } from './ui.js';
import { showSuccess, showError } from './notifications.js';
import { getAccentColor } from '../utils/helpers.js';

// Store original order for cancellation
let originalChapterOrder = [];

export function showReorderModal() {
    // Store the original order in case user cancels
    originalChapterOrder = JSON.parse(JSON.stringify(chapters));
    
    // Populate the modal with current chapters
    populateReorderModal();
    
    // Show the modal
    document.getElementById('reorderModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
    
    // Initialize drag and drop for chapters
    initializeChapterDragAndDrop();
}

export function hideReorderModal() {
    document.getElementById('reorderModal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

export function applyReorderChanges() {
    // Apply the current order from the modal to the main chapters array
    const reorderItems = document.querySelectorAll('.reorder-chapter-item');
    const newOrder = [];
    
    reorderItems.forEach((item, index) => {
        const chapterId = parseInt(item.dataset.chapterId);
        const chapter = findChapter(chapterId);
        if (chapter) {
            // Update any sections that might have been reordered within chapters
            updateChapterSectionsFromModal(chapterId);
            newOrder.push(chapter);
        }
    });
    
    // Update the global chapters array
    chapters.length = 0; // Clear the array
    chapters.push(...newOrder); // Add the new order
    
    // Update the main UI
    updateChaptersList();
    
    // Close the modal
    hideReorderModal();
    
    showSuccess('📝 Chapter and section order updated successfully!');
}

export function cancelReorderChanges() {
    // Restore the original order
    chapters.length = 0;
    chapters.push(...originalChapterOrder);
    
    // Close the modal
    hideReorderModal();
}

function populateReorderModal() {
    const reorderList = document.getElementById('reorderChaptersList');
    
    reorderList.innerHTML = chapters.map((chapter, index) => `
        <div class="reorder-chapter-item" data-chapter-id="${chapter.id}" draggable="true">
            <div class="reorder-chapter-header">
                <div class="reorder-drag-handle">⋮⋮</div>
                <div class="color-indicator" style="background-color: var(--section-color-${chapter.colorIndex}); border-color: ${getAccentColor(chapter.colorIndex)}"></div>
                <div class="reorder-chapter-title editable-title" data-chapter-id="${chapter.id}" ondblclick="editChapterName(${chapter.id})">${chapter.name}</div>
                <button class="reorder-sections-toggle" onclick="toggleSectionsDropdown(${chapter.id})">
                    Sections (${chapter.sections.length}) ▼
                </button>
            </div>
            <div class="reorder-sections-dropdown" id="sections-dropdown-${chapter.id}">
                <div class="sections-reorder-list" data-chapter-id="${chapter.id}">
                    ${chapter.sections.map((section, sectionIndex) => `
                        <div class="reorder-section-item" data-section-id="${section.id}" data-section-index="${sectionIndex}" draggable="true">
                            <div class="reorder-section-drag-handle">⋮</div>
                            <div class="color-indicator" style="background-color: var(--section-color-${section.colorIndex}); border-color: ${getAccentColor(section.colorIndex)}"></div>
                            <div class="reorder-section-name editable-title" data-section-id="${section.id}" ondblclick="editSectionName(${section.id})">${section.name}</div>
                            <div class="section-status">${section.status}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function initializeChapterDragAndDrop() {
    const chapterItems = document.querySelectorAll('.reorder-chapter-item');
    const reorderList = document.getElementById('reorderChaptersList');
    let draggedChapter = null;

    chapterItems.forEach(item => {
        // Chapter drag start
        item.addEventListener('dragstart', (e) => {
            draggedChapter = item;
            item.classList.add('dragging');
            
            // Set drag data
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.chapterId);
            
            // Create custom drag image
            const dragImage = item.cloneNode(true);
            dragImage.style.transform = 'rotate(2deg)';
            dragImage.style.opacity = '0.8';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-9999px';
            dragImage.style.background = 'var(--bg-primary)';
            dragImage.style.border = '2px solid var(--primary-color)';
            dragImage.style.borderRadius = '8px';
            document.body.appendChild(dragImage);
            
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            
            // Clean up drag image after a short delay
            setTimeout(() => {
                if (dragImage.parentNode) {
                    document.body.removeChild(dragImage);
                }
            }, 0);
        });

        // Chapter drag end
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            draggedChapter = null;
            
            // Remove any drag-over classes
            document.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
                el.classList.remove('drag-over-above', 'drag-over-below');
            });
        });
    });

    // Handle drop zones for chapters
    reorderList.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedChapter) return;

        // Clear all previous drag-over states
        reorderList.querySelectorAll('.reorder-chapter-item').forEach(item => {
            item.classList.remove('drag-over-above', 'drag-over-below');
        });

        const afterElement = getChapterAfterElement(reorderList, e.clientY);
        
        if (afterElement && afterElement !== draggedChapter) {
            afterElement.classList.add('drag-over-above');
        } else {
            // Dragging to the end
            const lastItem = reorderList.querySelector('.reorder-chapter-item:last-child');
            if (lastItem && lastItem !== draggedChapter) {
                lastItem.classList.add('drag-over-below');
            }
        }
    });

    reorderList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!draggedChapter) return;

        const afterElement = getChapterAfterElement(reorderList, e.clientY);
        
        // Move the chapter to the new position
        if (afterElement) {
            reorderList.insertBefore(draggedChapter, afterElement);
        } else {
            reorderList.appendChild(draggedChapter);
        }
        
        // Clear drag-over classes
        reorderList.querySelectorAll('.reorder-chapter-item').forEach(item => {
            item.classList.remove('drag-over-above', 'drag-over-below');
        });
    });

    // Clean up drag-over states when leaving the list
    reorderList.addEventListener('dragleave', (e) => {
        if (!reorderList.contains(e.relatedTarget)) {
            reorderList.querySelectorAll('.reorder-chapter-item').forEach(item => {
                item.classList.remove('drag-over-above', 'drag-over-below');
            });
        }
    });

    // Initialize section drag and drop for each chapter
    initializeSectionDragAndDrop();
}

function initializeSectionDragAndDrop() {
    const sectionLists = document.querySelectorAll('.sections-reorder-list');
    
    sectionLists.forEach(list => {
        const sectionItems = list.querySelectorAll('.reorder-section-item');
        let draggedSection = null;

        sectionItems.forEach(item => {
            // Section drag start
            item.addEventListener('dragstart', (e) => {
                e.stopPropagation(); // Prevent chapter drag
                draggedSection = item;
                item.classList.add('dragging');
                
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.sectionId);
                
                // Prevent text selection during drag
                document.body.style.userSelect = 'none';
                
                // Create custom drag image
                const dragImage = item.cloneNode(true);
                dragImage.style.transform = 'rotate(3deg)';
                dragImage.style.opacity = '0.8';
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-9999px';
                dragImage.style.background = 'var(--bg-primary)';
                dragImage.style.border = '2px solid var(--primary-color)';
                dragImage.style.borderRadius = '8px';
                document.body.appendChild(dragImage);
                
                e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
                
                // Clean up drag image after a short delay
                setTimeout(() => {
                    if (dragImage.parentNode) {
                        document.body.removeChild(dragImage);
                    }
                }, 0);
            });

            // Section drag end
            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.classList.remove('dragging');
                draggedSection = null;
                
                // Restore text selection
                document.body.style.userSelect = '';
                
                // Remove any drag-over classes
                document.querySelectorAll('.drag-over-above, .drag-over-below').forEach(el => {
                    el.classList.remove('drag-over-above', 'drag-over-below');
                });
            });
        });

        // Section drop handling
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedSection) return;

            // Clear all previous drag-over states
            list.querySelectorAll('.reorder-section-item').forEach(item => {
                item.classList.remove('drag-over-above', 'drag-over-below');
            });

            const afterElement = getSectionAfterElement(list, e.clientY);
            
            if (afterElement && afterElement !== draggedSection) {
                afterElement.classList.add('drag-over-above');
            } else {
                // Dragging to the end
                const lastItem = list.querySelector('.reorder-section-item:last-child');
                if (lastItem && lastItem !== draggedSection) {
                    lastItem.classList.add('drag-over-below');
                }
            }
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedSection) return;

            const afterElement = getSectionAfterElement(list, e.clientY);
            
            // Move the section to the new position
            if (afterElement) {
                list.insertBefore(draggedSection, afterElement);
            } else {
                list.appendChild(draggedSection);
            }
            
            // Clear drag-over classes
            list.querySelectorAll('.reorder-section-item').forEach(item => {
                item.classList.remove('drag-over-above', 'drag-over-below');
            });
        });

        // Clean up drag-over states when leaving the list
        list.addEventListener('dragleave', (e) => {
            if (!list.contains(e.relatedTarget)) {
                list.querySelectorAll('.reorder-section-item').forEach(item => {
                    item.classList.remove('drag-over-above', 'drag-over-below');
                });
            }
        });
    });
}

function getChapterAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.reorder-chapter-item:not(.dragging)')];
    
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

function getSectionAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.reorder-section-item:not(.dragging)')];
    
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

function updateChapterSectionsFromModal(chapterId) {
    const chapter = findChapter(chapterId);
    if (!chapter) return;

    const sectionsList = document.querySelector(`[data-chapter-id="${chapterId}"] .sections-reorder-list`);
    if (!sectionsList) return;

    const sectionItems = sectionsList.querySelectorAll('.reorder-section-item');
    const reorderedSections = [];

    sectionItems.forEach(item => {
        const sectionId = parseInt(item.dataset.sectionId);
        const section = chapter.sections.find(s => s.id === sectionId);
        if (section) {
            reorderedSections.push(section);
        }
    });

    // Update the chapter's sections array
    chapter.sections = reorderedSections;
}

// Make functions available globally for onclick handlers
window.showReorderModal = showReorderModal;
window.hideReorderModal = hideReorderModal;
window.applyReorderChanges = applyReorderChanges;
window.cancelReorderChanges = cancelReorderChanges;

// Toggle sections dropdown
window.toggleSectionsDropdown = function(chapterId) {
    const dropdown = document.getElementById(`sections-dropdown-${chapterId}`);
    const toggle = dropdown.previousElementSibling.querySelector('.reorder-sections-toggle');
    
    if (dropdown.classList.contains('open')) {
        dropdown.classList.remove('open');
        toggle.textContent = toggle.textContent.replace('▲', '▼');
    } else {
        // Close other dropdowns
        document.querySelectorAll('.reorder-sections-dropdown.open').forEach(d => {
            d.classList.remove('open');
            const t = d.previousElementSibling.querySelector('.reorder-sections-toggle');
            t.textContent = t.textContent.replace('▲', '▼');
        });
        
        dropdown.classList.add('open');
        toggle.textContent = toggle.textContent.replace('▼', '▲');
        
        // Reinitialize section drag and drop when dropdown opens
        setTimeout(() => {
            initializeSectionDragAndDrop();
        }, 100);
    }
};

// Inline editing functions
window.editChapterName = function(chapterId) {
    const chapter = findChapter(chapterId);
    if (!chapter) return;
    
    const titleElement = document.querySelector(`[data-chapter-id="${chapterId}"].editable-title`);
    if (!titleElement) return;
    
    const originalText = chapter.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'inline-edit-input';
    
    // Replace title with input
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement.nextSibling);
    input.focus();
    input.select();
    
    // Save function
    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalText) {
            chapter.name = newName;
            titleElement.textContent = newName;
            // Update dropdown button text
            const toggle = titleElement.parentNode.querySelector('.reorder-sections-toggle');
            toggle.textContent = `Sections (${chapter.sections.length}) ▼`;
        }
        titleElement.style.display = '';
        input.remove();
    };
    
    // Cancel function
    const cancelEdit = () => {
        titleElement.style.display = '';
        input.remove();
    };
    
    // Event handlers
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
};

window.editSectionName = function(sectionId) {
    // Find the section across all chapters
    let section = null;
    for (const chapter of chapters) {
        section = chapter.sections.find(s => s.id === sectionId);
        if (section) break;
    }
    
    if (!section) return;
    
    const titleElement = document.querySelector(`[data-section-id="${sectionId}"].editable-title`);
    if (!titleElement) return;
    
    const originalText = section.name;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'inline-edit-input';
    
    // Replace title with input
    titleElement.style.display = 'none';
    titleElement.parentNode.insertBefore(input, titleElement.nextSibling);
    input.focus();
    input.select();
    
    // Save function
    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== originalText) {
            section.name = newName;
            titleElement.textContent = newName;
        }
        titleElement.style.display = '';
        input.remove();
    };
    
    // Cancel function
    const cancelEdit = () => {
        titleElement.style.display = '';
        input.remove();
    };
    
    // Event handlers
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}; 