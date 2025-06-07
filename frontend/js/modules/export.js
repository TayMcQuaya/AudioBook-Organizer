// AudioBook Organizer - Export Management

import { chapters, bookText } from './state.js';
import { hideExportModal } from './ui.js';
import { createDownloadLink } from '../utils/dom.js';

// Export function - preserving exact logic from original
export async function startExport() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    status.className = 'status';
    status.textContent = 'Exporting...';
    
    // Collect highlight information
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        sectionId: highlight.dataset.sectionId,
        className: highlight.className
    }));
    
    const exportOptions = {
        exportMetadataFlag: document.getElementById('exportMetadata').checked,
        exportAudioFlag: document.getElementById('exportAudio').checked,
        exportBookContentFlag: document.getElementById('exportBookContent').checked,
        createZipFlag: document.getElementById('createZip').checked,
        mergeAudioFlag: document.getElementById('mergeAudio').checked,
        silenceDuration: parseInt(document.getElementById('silenceDuration').value),
        chapters: chapters.map(chapter => ({
            ...chapter,
            sections: chapter.sections.map(section => ({
                ...section,
                chapterName: chapter.name
            }))
        })),
        bookContent: document.getElementById('bookContent').innerHTML,
        bookText: bookText,
        highlights: highlights,
        version: '1.0'
    };
    
    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportOptions)
        });
        
        const result = await response.json();
        
        if (result.success) {
            status.className = 'status success';
            status.textContent = 'Export completed successfully!';
            
            if (exportOptions.createZipFlag) {
                createDownloadLink(`/exports/${result.exportId}/audiobook_export.zip`, 'audiobook_export.zip');
            } else if (exportOptions.mergeAudioFlag) {
                createDownloadLink(`/exports/${result.exportId}/merged_audiobook.wav`, 'merged_audiobook.wav');
            }
            
            setTimeout(hideExportModal, 2000);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Export failed:', error);
        status.className = 'status error';
        status.textContent = `Export failed: ${error.message}`;
    }
}

// Import exported content function - preserving exact logic from original
export async function importExportedContent(exportId) {
    try {
        const response = await fetch(`/exports/${exportId}/metadata.json`);
        if (!response.ok) throw new Error('Failed to load exported content');
        
        const exportData = await response.json();
        
        // Validate the export data
        if (!exportData.version || !exportData.chapters) {
            throw new Error('Invalid export format');
        }

        // Load the book content if available
        if (exportData.bookContent) {
            document.getElementById('bookContent').innerHTML = exportData.bookContent;
        } else if (exportData.bookText) {
            document.getElementById('bookContent').textContent = exportData.bookText;
            
            // Restore highlights
            if (exportData.highlights) {
                exportData.highlights.forEach(highlight => {
                    const span = document.createElement('span');
                    span.className = highlight.className;
                    span.textContent = highlight.text;
                    span.dataset.sectionId = highlight.sectionId;
                    
                    // Find the text in the content and replace it with the highlight
                    const textNode = findTextNodeWithContent(bookContent, highlight.text);
                    if (textNode) {
                        const range = document.createRange();
                        range.setStart(textNode, textNode.textContent.indexOf(highlight.text));
                        range.setEnd(textNode, textNode.textContent.indexOf(highlight.text) + highlight.text.length);
                        range.deleteContents();
                        range.insertNode(span);
                    }
                });
            }
        }

        // Load chapters and sections
        chapters = exportData.chapters;
        
        // Update UI
        updateChaptersList();
        
        return true;
    } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import content: ' + error.message);
        return false;
    }
}