// AudioBook Organizer - Storage Management

import { bookText, chapters, currentColorIndex, setBookText, setChapters, setCurrentColorIndex } from './state.js';
import { updateChaptersList } from './ui.js';
import { getNodeOffset, findTextNodeWithContent } from '../utils/helpers.js';
import { createBlob, createObjectURL, revokeObjectURL, createDownloadLink } from '../utils/dom.js';
import { showError, showSuccess } from './notifications.js';
import { initializeSmartSelect } from './smartSelect.js';

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

    const projectData = {
        bookText: bookText,
        chapters: chapters,
        currentColorIndex: currentColorIndex,
        highlights: highlights,
        timestamp: new Date().toISOString(),
        version: '1.0'
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
                const projectData = JSON.parse(e.target.result);
                
                // Validate project data
                if (!projectData.version || !projectData.chapters || !projectData.bookText) {
                    throw new Error('Invalid project file format');
                }

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
                
                // Show success message
                showSuccess('📂 Project loaded successfully!');
                
                console.log('Project loaded successfully:', {
                    bookTextLength: bookText.length,
                    chaptersCount: chapters.length,
                    highlightsRestored: projectData.highlights?.length || 0
                });
                
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