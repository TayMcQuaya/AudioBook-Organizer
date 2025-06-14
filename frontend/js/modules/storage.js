// AudioBook Organizer - Storage Management

import { bookText, chapters, currentColorIndex, setBookText, setChapters, setCurrentColorIndex } from './state.js';
import { updateChaptersList } from './ui.js';
import { getNodeOffset, findTextNodeWithContent } from '../utils/helpers.js';
import { createBlob, createObjectURL, revokeObjectURL, createDownloadLink } from '../utils/dom.js';
import { showError, showSuccess, showConfirm } from './notifications.js';
import { initializeSmartSelect } from './smartSelect.js';
import { formattingData, setFormattingData, clearFormatting } from './formattingState.js';

// Save/Load functions - preserving exact logic from original
export function saveProgress() {
    // Get all highlights from the book content
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        sectionId: highlight.dataset.sectionId,
        className: highlight.className,
        startOffset: getNodeOffset(highlight),
        length: highlight.textContent.length
    }));

    // Get current user info for project metadata
    const currentUser = window.authModule?.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    const timestamp = new Date().toISOString();

    // Get all collaborators from chapters and sections
    const collaborators = new Set();
    chapters.forEach(chapter => {
        if (chapter.createdBy) collaborators.add(chapter.createdBy);
        if (chapter.lastModifiedBy) collaborators.add(chapter.lastModifiedBy);
        chapter.sections?.forEach(section => {
            if (section.createdBy) collaborators.add(section.createdBy);
            if (section.lastModifiedBy) collaborators.add(section.lastModifiedBy);
        });
    });

    const projectData = {
        bookText: bookText,
        projectMetadata: {
            createdBy: userId,
            lastModifiedBy: userId,
            lastModified: timestamp,
            collaborators: Array.from(collaborators),
            version: '1.2'
        },
        chapters: chapters,
        currentColorIndex: currentColorIndex,
        highlights: highlights,
        formattingData: formattingData,
        timestamp: timestamp,
        version: '1.2'
    };

    // Create and download the JSON file
    const blob = createBlob(JSON.stringify(projectData, null, 2), 'application/json');
    const url = createObjectURL(blob);
    createDownloadLink(url, `audiobook_progress_${new Date().toISOString().split('T')[0]}.json`);
    revokeObjectURL(url);
}

export async function loadProgress(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedProject = JSON.parse(e.target.result);
                
                // Validate project data
                if (!importedProject.version || !importedProject.chapters || !importedProject.bookText) {
                    throw new Error('Invalid project file format');
                }

                // Check if current project exists
                const hasCurrentProject = chapters.length > 0 || bookText.length > 0;
                
                if (hasCurrentProject) {
                    // Offer merge option
                    showMergeDialog(importedProject);
                } else {
                    // No current project - just load
                    loadProjectDirectly(importedProject);
                }
                
            } catch (error) {
                console.error('Error loading project:', error);
                showError('Failed to load project: ' + error.message);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error reading file:', error);
        showError('Failed to read file: ' + error.message);
    }
}

/**
 * Show merge dialog when importing into existing project
 */
function showMergeDialog(importedProject) {
    showConfirm(
        'You have an existing project. Would you like to merge the imported project with your current work, or replace your current project?',
        () => {
            // User chose to merge
            mergeProjects(importedProject);
        },
        () => {
            // User chose to replace
            showConfirm(
                'Are you sure you want to replace your current project? All current work will be lost.',
                () => loadProjectDirectly(importedProject),
                null,
                'Replace Project',
                'Cancel'
            );
        },
        'Merge Projects',
        'Replace Current'
    );
}

/**
 * Merge imported project with current project
 */
async function mergeProjects(importedProject) {
    try {
        // Import merge engine
        const { smartMerge } = await import('./projectMerge.js');
        const { showConflictResolutionDialog } = await import('./conflictResolution.js');
        
        // Get current project data
        const currentProject = getCurrentProjectData();
        
        // Perform smart merge
        const mergeResult = smartMerge(currentProject, importedProject);
        
        if (mergeResult.conflicts.length === 0) {
            // No conflicts - auto-apply merge
            applyMergedProject(mergeResult.merged);
            showSuccess(`✅ Projects merged successfully! Added ${mergeResult.summary.chaptersAdded} chapters and ${mergeResult.summary.sectionsAdded} sections.`);
        } else {
            // Show conflict resolution UI
            showConflictResolutionDialog(mergeResult.conflicts, (resolutions) => {
                const finalProject = applyConflictResolutions(mergeResult.merged, mergeResult.conflicts, resolutions);
                applyMergedProject(finalProject);
                showSuccess(`✅ Projects merged with ${mergeResult.conflicts.length} conflicts resolved.`);
            });
        }
        
    } catch (error) {
        console.error('Error during merge:', error);
        showError('Failed to merge projects: ' + error.message);
    }
}

/**
 * Get current project data in standard format
 */
function getCurrentProjectData() {
    // Get current user info
    const currentUser = window.authModule?.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    
    // Get all highlights from DOM
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        sectionId: highlight.dataset.sectionId,
        className: highlight.className,
        startOffset: getNodeOffset(highlight),
        length: highlight.textContent.length
    }));
    
    return {
        bookText: bookText,
        projectMetadata: {
            createdBy: userId,
            lastModifiedBy: userId,
            lastModified: new Date().toISOString(),
            collaborators: [userId],
            version: '1.2'
        },
        chapters: chapters,
        currentColorIndex: currentColorIndex,
        highlights: highlights,
        formattingData: formattingData,
        timestamp: new Date().toISOString(),
        version: '1.2'
    };
}

/**
 * Apply conflict resolutions to merged project
 */
function applyConflictResolutions(mergedProject, conflicts, resolutions) {
    const finalProject = { ...mergedProject };
    
    conflicts.forEach((conflict, index) => {
        const resolution = resolutions[index] || 'current';
        
        switch (conflict.type) {
            case 'bookText':
                if (resolution === 'imported') {
                    finalProject.bookText = conflict.imported.value;
                }
                // 'current' keeps existing value, 'both' not applicable for bookText
                break;
                
            case 'chapterName':
                const chapter = finalProject.chapters.find(c => c.id === conflict.chapterId);
                if (chapter) {
                    if (resolution === 'imported') {
                        chapter.name = conflict.imported.value;
                    }
                    // 'both' could append both names, but keeping simple for now
                }
                break;
                
            case 'sectionText':
            case 'sectionName':
                // Find section in chapters
                for (const chapter of finalProject.chapters) {
                    const section = chapter.sections?.find(s => s.id === conflict.sectionId);
                    if (section) {
                        if (resolution === 'imported') {
                            if (conflict.type === 'sectionText') {
                                section.text = conflict.imported.value;
                            } else {
                                section.name = conflict.imported.value;
                            }
                        }
                        break;
                    }
                }
                break;
        }
    });
    
    return finalProject;
}

/**
 * Apply merged project to current state
 */
function applyMergedProject(projectData) {
    // This is the same as loadProjectDirectly but with merge context
    loadProjectDirectly(projectData);
}

/**
 * Load project directly (existing functionality)
 */
function loadProjectDirectly(projectData) {
    // Load the book text
    setBookText(projectData.bookText);
    const bookContent = document.getElementById('bookContent');
    bookContent.textContent = bookText;

    // Load chapters
    setChapters(projectData.chapters);
    
    // Restore color index
    if (projectData.currentColorIndex !== undefined) {
        setCurrentColorIndex(projectData.currentColorIndex);
    }

    // Restore formatting data
    if (projectData.formattingData) {
        setFormattingData(projectData.formattingData);
        console.log(`Loaded formatting data: ${projectData.formattingData.ranges?.length || 0} ranges, ${projectData.formattingData.comments?.length || 0} comments`);
    } else {
        clearFormatting();
        console.log('No formatting data in project file');
    }

    // Restore highlights with improved logic
    if (projectData.highlights && Array.isArray(projectData.highlights)) {
        console.log(`Restoring ${projectData.highlights.length} highlights...`);
        let restoredCount = 0;
        
        projectData.highlights.forEach((highlight, index) => {
            try {
                console.log(`Restoring highlight ${index + 1}: "${highlight.text.substring(0, 50)}..."`);
                
                // Create the highlight element
                const span = document.createElement('span');
                span.className = highlight.className;
                span.textContent = highlight.text;
                span.dataset.sectionId = highlight.sectionId;

                // More robust text finding approach
                const fullText = bookContent.textContent;
                const searchText = highlight.text;
                let foundIndex = fullText.indexOf(searchText);
                
                if (foundIndex === -1) {
                    // Try trimmed version in case of whitespace differences
                    foundIndex = fullText.indexOf(searchText.trim());
                }
                
                if (foundIndex !== -1) {
                    // Use TreeWalker to find the exact text nodes
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
                    let charsToSelect = searchText.length;
                    let charsSelected = 0;

                    // Find start and end positions for the exact text
                    while (walker.nextNode() && charsSelected < charsToSelect) {
                        const node = walker.currentNode;
                        const nodeText = node.textContent;
                        const nodeLength = nodeText.length;
                        
                        // Check if start position is in this node
                        if (!startNode && currentPos + nodeLength > foundIndex) {
                            startNode = node;
                            startOffset = foundIndex - currentPos;
                        }
                        
                        // If we have a start node, calculate how many characters we need
                        if (startNode) {
                            const availableFromThisNode = nodeLength - (startNode === node ? startOffset : 0);
                            const neededFromThisNode = Math.min(availableFromThisNode, charsToSelect - charsSelected);
                            
                            charsSelected += neededFromThisNode;
                            
                            if (charsSelected >= charsToSelect) {
                                endNode = node;
                                endOffset = (startNode === node ? startOffset : 0) + neededFromThisNode;
                                break;
                            }
                        }
                        
                        currentPos += nodeLength;
                    }

                    if (startNode && endNode) {
                        const range = document.createRange();
                        range.setStart(startNode, startOffset);
                        range.setEnd(endNode, endOffset);
                        
                        // Verify we're selecting the right text
                        const selectedText = range.toString();
                        if (selectedText === searchText || selectedText === searchText.trim()) {
                            range.deleteContents();
                            range.insertNode(span);
                            restoredCount++;
                            console.log(`✓ Successfully restored highlight ${index + 1}`);
                        } else {
                            console.warn(`✗ Text mismatch for highlight ${index + 1}:`, {
                                expected: searchText,
                                found: selectedText
                            });
                        }
                    } else {
                        console.warn(`✗ Could not create range for highlight ${index + 1}`);
                    }
                } else {
                    console.warn(`✗ Text not found for highlight ${index + 1}: "${searchText.substring(0, 50)}..."`);
                }
            } catch (highlightError) {
                console.error(`✗ Failed to restore highlight ${index + 1}:`, highlightError);
            }
        });
        
        console.log(`Highlight restoration complete: ${restoredCount}/${projectData.highlights.length} restored`);
    }

    // Update UI
    updateChaptersList();
    
    // Reinitialize smart select functionality
    initializeSmartSelect();
    
    // Apply formatting if it exists
    if (projectData.formattingData && (projectData.formattingData.ranges?.length > 0 || projectData.formattingData.comments?.length > 0)) {
        import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
            applyFormattingToDOM();
            console.log('Applied formatting to loaded project');
        }).catch(error => {
            console.error('Error applying formatting after load:', error);
        });
    }
    
    // Show success message
    showSuccess('📂 Project loaded successfully!');
    
    console.log('Project loaded successfully:', {
        bookTextLength: bookText.length,
        chaptersCount: chapters.length,
        highlightsRestored: projectData.highlights?.length || 0
    });
} 