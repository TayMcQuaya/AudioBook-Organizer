// AudioBook Organizer - Storage Management

import { bookText, chapters, currentColorIndex, setBookText, setChapters, setCurrentColorIndex, setAutoSaveTrigger, findChapter } from './state.js';
import { updateChaptersList } from './ui.js';
import { getNodeOffset, findTextNodeWithContent } from '../utils/helpers.js';
import { createBlob, createObjectURL, revokeObjectURL, createDownloadLink } from '../utils/dom.js';
import { showError, showSuccess, showConfirm, showWarning } from './notifications.js';
import { initializeSmartSelect } from './smartSelect.js';
import { formattingData, setFormattingData, clearFormatting } from './formattingState.js';
import { apiFetch } from './api.js';

// Save/Load functions - preserving exact logic from original
export function saveProgress() {
    // Get all highlights from the book content
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        innerHTML: highlight.innerHTML,  // Save the HTML content to preserve formatting
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
export function getCurrentProjectData() {
    // Get current user info
    const currentUser = window.authModule?.getCurrentUser();
    const userId = currentUser?.id || 'anonymous';
    
    // Get current file info
    let currentFileType = 'txt';
    let currentFileName = '';
    try {
        const stateModule = window.stateModule || {};
        currentFileType = stateModule.getCurrentFileType?.() || 'txt';
        currentFileName = stateModule.getCurrentFileName?.() || '';
    } catch (error) {
        console.warn('Could not get file type info:', error);
    }
    
    // Get all highlights from DOM
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        innerHTML: highlight.innerHTML,  // Save the HTML content to preserve formatting
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
        metadata: {
            filename: currentFileName,
            fileType: currentFileType
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
        
        // Detect and set file type based on formatting data
        const hasFormattingRanges = projectData.formattingData.ranges && projectData.formattingData.ranges.length > 0;
        const fileType = hasFormattingRanges ? 'docx' : 'txt';
        const fileName = projectData.metadata?.filename || '';
        
        // Import and set file type for proper edit mode behavior
        import('./state.js').then(({ setCurrentFileType }) => {
            setCurrentFileType(fileType, fileName);
            if (fileType) {
                // **SECURITY FIX: Removed filename logging to prevent exposure**
                console.log(`📁 File type detected and set during load: ${fileType}`);
            }
        }).catch(error => {
            console.error('Error setting file type during load:', error);
        });
        
        // Apply formatting immediately for consistent view/edit mode display
        import('./formattingRenderer.js').then(({ applyFormattingToDOM }) => {
            applyFormattingToDOM();
            console.log('Applied formatting to loaded project (immediate)');
            
            // ✅ NEW: Refresh TOC immediately after formatting is applied
            import('./tableOfContents.js').then(({ refreshTableOfContents }) => {
                refreshTableOfContents();
                console.log('✅ Table of Contents refreshed after formatting application');
            }).catch(error => {
                console.error('❌ Failed to refresh TOC after formatting:', error);
            });
            
            // Check if we have pending highlights to restore after formatting
            if (bookContent._pendingHighlights && Array.isArray(bookContent._pendingHighlights)) {
                console.log('Restoring highlights after formatting...');
                restoreHighlightsAsync(bookContent._pendingHighlights, bookContent);
                delete bookContent._pendingHighlights;
            } else {
                // Complete project load if no highlights
                completeProjectLoad(projectData);
            }
        }).catch(error => {
            console.error('Error applying formatting during load:', error);
        });
    } else {
        // No formatting data - this is a TXT file
        import('./state.js').then(({ setCurrentFileType }) => {
            setCurrentFileType('txt', '');
            console.log('📁 File type set to TXT (no formatting data)');
            
            // ✅ NEW: Refresh TOC for TXT files too (might have chapter-based headers)
            import('./tableOfContents.js').then(({ refreshTableOfContents }) => {
                refreshTableOfContents();
                console.log('✅ Table of Contents refreshed for TXT file');
            }).catch(error => {
                console.error('❌ Failed to refresh TOC for TXT file:', error);
            });
            
            // For TXT files, restore highlights immediately since there's no formatting to apply
            if (bookContent._pendingHighlights && Array.isArray(bookContent._pendingHighlights)) {
                console.log('Restoring highlights for TXT file...');
                restoreHighlightsAsync(bookContent._pendingHighlights, bookContent);
                delete bookContent._pendingHighlights;
            } else {
                // Complete project load if no highlights
                completeProjectLoad(projectData);
            }
        }).catch(error => {
            console.error('Error setting file type during load:', error);
        });
        
        clearFormatting();
        console.log('No formatting data in project file');
    }

    // Update UI immediately (don't wait for highlights)
    updateChaptersList();
    
    // Show success message early
    showSuccess('📂 Project loaded successfully!');
    
    console.log('Project loaded successfully:', {
        bookTextLength: bookText.length,
        chaptersCount: chapters.length,
        highlightsToRestore: projectData.highlights?.length || 0
    });

    // Store highlights for later restoration after formatting
    bookContent._pendingHighlights = projectData.highlights;

    // ✅ NEW: Validate and restore audio files after project load
    validateAndRestoreAudioFiles(projectData);
}

/**
 * Restore highlights asynchronously using requestAnimationFrame to avoid blocking UI
 */
async function restoreHighlightsAsync(highlights, bookContent) {
    console.log(`🔄 Restoring ${highlights.length} highlights asynchronously...`);
    let restoredCount = 0;
    const batchSize = 5; // Process 5 highlights at a time
    
    // Process highlights in batches
    for (let i = 0; i < highlights.length; i += batchSize) {
        const batch = highlights.slice(i, i + batchSize);
        
        // Process this batch
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                batch.forEach((highlight, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    try {
                        if (restoreSingleHighlight(highlight, globalIndex + 1, bookContent)) {
                            restoredCount++;
                        }
                    } catch (error) {
                        console.error(`✗ Failed to restore highlight ${globalIndex + 1}:`, error);
                    }
                });
                resolve();
            });
        });
        
        // Small delay between batches to keep UI responsive
        if (i + batchSize < highlights.length) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }
    
    console.log(`✅ Highlight restoration complete: ${restoredCount}/${highlights.length} restored`);
    
    // Complete the project load
    completeProjectLoad({ formattingData: window.formattingData });
}

/**
 * Restore a single highlight (optimized version)
 */
function restoreSingleHighlight(highlight, index, bookContent) {
    // **SECURITY FIX: Removed highlight text logging to prevent user content exposure**
    console.log(`Restoring highlight ${index}`);
    
    // Create the highlight element
    const span = document.createElement('span');
    span.className = highlight.className;
    span.dataset.sectionId = highlight.sectionId;
    
    // Use innerHTML if available to preserve formatting, otherwise fallback to text
    if (highlight.innerHTML) {
        span.innerHTML = highlight.innerHTML;
    } else {
        span.textContent = highlight.text;
    }

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
                console.log(`✓ Successfully restored highlight ${index}`);
                return true;
            } else {
                console.warn(`✗ Text mismatch for highlight ${index}:`, {
                    expected: searchText,
                    found: selectedText
                });
            }
        } else {
            console.warn(`✗ Could not create range for highlight ${index}`);
        }
    } else {
        // **SECURITY FIX: Removed text content logging to prevent user content exposure**
        console.warn(`✗ Text not found for highlight ${index}`);
    }
    
    return false;
}

/**
 * Complete project loading after highlights are restored
 */
function completeProjectLoad(projectData) {
    // Reinitialize smart select functionality
    initializeSmartSelect();
    
    // ✅ NEW: Refresh Table of Contents after project restoration
    try {
        // Import and refresh TOC to pick up restored formatting data
        import('./tableOfContents.js').then(({ refreshTableOfContents }) => {
            refreshTableOfContents();
            console.log('✅ Table of Contents refreshed after project restoration');
        }).catch(error => {
            console.error('❌ Failed to refresh TOC after project restoration:', error);
        });
    } catch (error) {
        console.error('❌ Error importing TOC module for refresh:', error);
    }
    
    // Note: Formatting is now applied immediately during loadProjectDirectly(),
    // so we don't need to apply it again here
    console.log('Project load completed - formatting already applied');
}

// =============================================================================
// AUTO-PERSISTENCE FUNCTIONALITY
// =============================================================================

/**
 * Auto-save timer and debouncing
 */
let autoSaveTimer = null;
let autoSaveInterval = null;
const AUTO_SAVE_DELAY = 2000; // 2 seconds debounce
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds periodic save

/**
 * Save current project to database (auto-save)
 * This extends the existing saveProgress() functionality
 */
export async function saveToDatabase() {
    try {
        // Get current project data using existing function
        const projectData = getCurrentProjectData();
        
        // Only save if we have meaningful content
        if (!projectData.bookText.trim() && projectData.chapters.length === 0) {
            console.log('🔄 Skipping auto-save: No meaningful content to save');
            return false;
        }
        
        // Check if we're in testing mode - use localStorage instead
        if (window.tempAuthManager?.isTestingMode) {
            return saveToLocalStorage(projectData);
        }
        
        // Get auth token for API call (normal mode)
        const authToken = window.authModule?.getAuthToken();
        if (!authToken) {
            console.warn('⚠️ Cannot auto-save: User not authenticated');
            return false;
        }
        
        // Make API call to save project using authenticated request
        const response = await window.authModule.apiRequest('/projects/save', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Project auto-saved to database');
            
            // Dispatch custom event for UI updates (optional)
            window.dispatchEvent(new CustomEvent('project-auto-saved', {
                detail: { timestamp: new Date().toISOString() }
            }));
            
            return true;
        } else {
            const error = await response.json();
            console.warn('⚠️ Auto-save failed:', error.error || 'Unknown error');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Auto-save error:', error);
        return false;
    }
}

/**
 * Save project data to localStorage (testing mode)
 */
function saveToLocalStorage(projectData) {
    try {
        const storageData = {
            ...projectData,
            savedAt: new Date().toISOString(),
            testingMode: true
        };
        
        localStorage.setItem('audiobook_testing_project', JSON.stringify(storageData));
        console.log('✅ Project auto-saved to localStorage (testing mode)');
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('project-auto-saved', {
            detail: { 
                timestamp: new Date().toISOString(),
                storage: 'localStorage'
            }
        }));
        
        return true;
    } catch (error) {
        console.error('❌ localStorage save error:', error);
        return false;
    }
}

/**
 * Load latest project from database (auto-restore)
 */
export async function loadFromDatabase() {
    try {
        // Check if we're in testing mode - use localStorage instead
        if (window.tempAuthManager?.isTestingMode) {
            return loadFromLocalStorage();
        }
        
        // Get auth token for API call (normal mode) with retry logic
        let authToken = window.authModule?.getAuthToken();
        if (!authToken) {
            console.log('📂 No auth token found, attempting retry for project restoration...');
            
            // Wait a bit for session restoration to complete
            await new Promise(resolve => setTimeout(resolve, 200));
            authToken = window.authModule?.getAuthToken();
            
            if (!authToken) {
                console.log('👤 User not authenticated after retry, skipping auto-restore');
                return false;
            } else {
                console.log('📂 Auth token found after retry, proceeding with project restoration');
            }
        }
        
        // Make API call to get latest project using authenticated request
        const response = await window.authModule.apiRequest('/projects/latest', {
            method: 'GET'
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.project) {
                console.log('📂 Restoring project from database...');
                
                // Use existing loadProjectDirectly function
                loadProjectDirectly(result.project);
                
                // Show restore notification
                showSuccess(`📂 Project restored! Last saved: ${new Date(result.metadata.updated_at).toLocaleString()}`);
                
                console.log('✅ Project restored from database');
                
                return true;
            } else {
                console.log('📭 No previous project found in database');
                return false;
            }
        } else if (response.status === 404) {
            console.log('📭 No previous project found in database');
            return false;
        } else {
            const error = await response.json();
            console.warn('⚠️ Failed to load project from database:', error.error || 'Unknown error');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Auto-restore error:', error);
        return false;
    }
}

/**
 * Load project data from localStorage (testing mode)
 */
function loadFromLocalStorage() {
    try {
        const stored = localStorage.getItem('audiobook_testing_project');
        if (!stored) {
            console.log('📭 No previous project found in localStorage');
            return false;
        }
        
        const projectData = JSON.parse(stored);
        
        // Validate the data
        if (!projectData.bookText && (!projectData.chapters || projectData.chapters.length === 0)) {
            console.log('📭 No meaningful content in stored project');
            return false;
        }
        
        console.log('📂 Restoring project from localStorage...');
        
        // Use existing loadProjectDirectly function
        loadProjectDirectly(projectData);
        
        // Show restore notification
        const savedTime = projectData.savedAt ? new Date(projectData.savedAt).toLocaleString() : 'Unknown';
        showSuccess(`📂 Work restored! Last saved: ${savedTime}`);
        
        console.log('✅ Project restored from localStorage:', {
            bookTextLength: projectData.bookText?.length || 0,
            chaptersCount: projectData.chapters?.length || 0,
            savedAt: projectData.savedAt
        });
        
        return true;
    } catch (error) {
        console.error('❌ localStorage restore error:', error);
        return false;
    }
}

/**
 * Trigger debounced auto-save
 * Called whenever project state changes
 */
export function triggerAutoSave() {
    // Clear existing debounce timer
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // Set new debounce timer
    autoSaveTimer = setTimeout(() => {
        saveToDatabase();
    }, AUTO_SAVE_DELAY);
}

/**
 * Start periodic auto-save
 * Called during app initialization
 */
export function startAutoSave() {
    // Clear any existing interval
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    // Set up the auto-save trigger for state changes
    setAutoSaveTrigger(triggerAutoSave);
    
    // Start periodic auto-save
    autoSaveInterval = setInterval(() => {
        // Only save if we have meaningful content
        if (bookText.trim() || chapters.length > 0) {
            saveToDatabase();
        }
    }, AUTO_SAVE_INTERVAL);
    
    console.log('🔄 Auto-save started (30-second intervals + state change triggers)');
}

/**
 * Stop auto-save (cleanup)
 */
export function stopAutoSave() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
    
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    
    // Clear the auto-save trigger
    setAutoSaveTrigger(null);
    
    console.log('🛑 Auto-save stopped');
}

/**
 * Enhanced save functionality that supports both manual download and auto-save to database
 * This maintains backward compatibility - existing saveProgress() works as before
 * New saveProgressEnhanced() supports both modes
 */
export function saveProgressEnhanced(isAutoSave = false) {
    if (isAutoSave) {
        // Auto-save to database
        return saveToDatabase();
    } else {
        // Manual save - use existing download functionality
        return saveProgress();
    }
}

/**
 * Clear testing mode data from localStorage
 * Called when exiting testing mode for security
 */
export function clearTestingModeData() {
    try {
        localStorage.removeItem('audiobook_testing_project');
        console.log('🧹 Testing mode data cleared from localStorage');
        return true;
    } catch (error) {
        console.error('❌ Error clearing testing mode data:', error);
        return false;
    }
}

/**
 * Validate and restore audio files for restored projects
 * This ensures uploaded audio files are properly accessible after restoration
 */
async function validateAndRestoreAudioFiles(projectData) {
    try {
        console.log('🎵 Validating audio files for restored project...');
        
        // Collect all sections with audio paths from the project
        const sectionsWithAudio = [];
        if (projectData.chapters && Array.isArray(projectData.chapters)) {
            projectData.chapters.forEach(chapter => {
                if (chapter.sections && Array.isArray(chapter.sections)) {
                    chapter.sections.forEach(section => {
                        if (section.audioPath) {
                            sectionsWithAudio.push({
                                chapterId: chapter.id,
                                sectionId: section.id,
                                audioPath: section.audioPath,
                                section: section
                            });
                        }
                    });
                }
            });
        }
        
        if (sectionsWithAudio.length === 0) {
            console.log('📭 No audio files to validate in restored project');
            return;
        }
        
        console.log(`🔍 Found ${sectionsWithAudio.length} audio files to validate`);
        
        // Validate each audio file by attempting to load it
        const validationPromises = sectionsWithAudio.map(async (item) => {
            try {
                // Create a test audio element to validate the file exists and is accessible
                const testAudio = new Audio();
                
                // Promise-based audio loading test
                const isValid = await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn(`⚠️ Audio validation timeout for: ${item.audioPath}`);
                        resolve(false);
                    }, 5000); // 5 second timeout
                    
                    testAudio.oncanplaythrough = () => {
                        clearTimeout(timeout);
                        resolve(true);
                    };
                    
                    testAudio.onerror = (error) => {
                        clearTimeout(timeout);
                        console.warn(`❌ Audio file validation failed for: ${item.audioPath}`, error);
                        resolve(false);
                    };
                    
                    testAudio.onabort = () => {
                        clearTimeout(timeout);
                        resolve(false);
                    };
                    
                    // Start loading the audio file
                    testAudio.src = item.audioPath;
                    testAudio.load();
                });
                
                return {
                    ...item,
                    isValid: isValid
                };
                
            } catch (error) {
                console.warn(`❌ Audio validation error for ${item.audioPath}:`, error);
                return {
                    ...item,
                    isValid: false
                };
            }
        });
        
        // Wait for all validations to complete
        const validationResults = await Promise.all(validationPromises);
        
        // Process results
        const validAudio = validationResults.filter(item => item.isValid);
        const invalidAudio = validationResults.filter(item => !item.isValid);
        
        console.log(`✅ Audio validation complete: ${validAudio.length} valid, ${invalidAudio.length} invalid`);
        
        // Handle invalid audio files
        if (invalidAudio.length > 0) {
            console.warn(`⚠️ ${invalidAudio.length} audio files are no longer accessible`);
            
            // Update section status for invalid audio files
            invalidAudio.forEach(item => {
                // Find the section in current state and mark it as having missing audio
                const chapter = findChapter(item.chapterId);
                if (chapter) {
                    const section = chapter.sections.find(s => s.id === item.sectionId);
                    if (section) {
                        section.audioStatus = 'missing';
                        section.originalAudioPath = section.audioPath; // Store original path for reference
                        // **SECURITY FIX: Removed section name to prevent user content exposure**
                        console.warn('⚠️ Marked section as having missing audio');
                    }
                }
            });
            
            // Show user notification about missing audio files
            showWarning(`⚠️ ${invalidAudio.length} audio file(s) are no longer accessible. You may need to re-upload them.`);
            
            // Update UI to reflect the missing audio status
            updateChaptersList();
        }
        
        // Success notification for valid audio files
        if (validAudio.length > 0) {
            console.log(`✅ ${validAudio.length} audio files successfully validated and restored`);
        }
        
    } catch (error) {
        console.error('❌ Audio validation process failed:', error);
        // Don't fail the entire restoration if audio validation fails
        showWarning('Audio file validation encountered an issue. Some audio files may not be accessible.');
    }
} 