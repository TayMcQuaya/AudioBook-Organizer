// AudioBook Organizer - Storage Management

import { bookText, chapters, currentColorIndex, setBookText, setChapters, setCurrentColorIndex } from './state.js';
import { updateChaptersList } from './ui.js';
import { getNodeOffset, findTextNodeWithContent } from '../utils/helpers.js';
import { createBlob, createObjectURL, revokeObjectURL, createDownloadLink } from '../utils/dom.js';

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

                // Restore highlights
                if (projectData.highlights && Array.isArray(projectData.highlights)) {
                    projectData.highlights.forEach(highlight => {
                        try {
                            // Create the highlight element
                            const span = document.createElement('span');
                            span.className = highlight.className;
                            span.textContent = highlight.text;
                            span.dataset.sectionId = highlight.sectionId;

                            // Find the text in the content
                            const textNode = findTextNodeWithContent(bookContent, highlight.text);
                            if (textNode) {
                                const range = document.createRange();
                                range.setStart(textNode, textNode.textContent.indexOf(highlight.text));
                                range.setEnd(textNode, textNode.textContent.indexOf(highlight.text) + highlight.text.length);
                                range.deleteContents();
                                range.insertNode(span);
                            }
                        } catch (highlightError) {
                            console.warn('Failed to restore highlight:', highlightError);
                        }
                    });
                }

                // Update UI
                updateChaptersList();
                
            } catch (error) {
                console.error('Error loading project:', error);
                alert('Failed to load project: ' + error.message);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Error reading file:', error);
        alert('Failed to read file: ' + error.message);
    }
} 