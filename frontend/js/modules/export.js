// AudioBook Organizer - Export Management

import { chapters, bookText } from './state.js';
import { hideExportModal } from './ui.js';
import { createDownloadLink } from '../utils/dom.js';
import { showError } from './notifications.js';
import { apiFetch } from './api.js';

// Update preview when export options change
function updateExportPreview() {
    const exportMetadata = document.getElementById('exportMetadata').checked;
    const exportAudio = document.getElementById('exportAudio').checked;
    const exportBookContent = document.getElementById('exportBookContent').checked;
    const mergeAudio = document.getElementById('mergeAudio').checked;
    const audioFormat = document.querySelector('input[name="audioFormat"]:checked').value;
    
    const previewContent = document.getElementById('previewContent');
    const selectedItems = [];
    
    // Count what's selected
    if (exportMetadata) selectedItems.push('metadata');
    if (exportAudio) selectedItems.push('audio');
    if (exportBookContent) selectedItems.push('bookContent');
    if (mergeAudio) selectedItems.push('merged');
    
    // Count chapters that actually have audio files
    let chaptersWithAudio = 0;
    let totalSections = 0;
    chapters.forEach(chapter => {
        if (chapter.sections && chapter.sections.length > 0) {
            const sectionsWithAudio = chapter.sections.filter(section => section.audioPath).length;
            if (sectionsWithAudio > 0) {
                chaptersWithAudio++;
                totalSections += sectionsWithAudio;
            }
        }
    });
    
    // Generate preview based on selections
    if (selectedItems.length === 0) {
        previewContent.innerHTML = '<span style="color: var(--error-color);">⚠️ No export options selected</span>';
        return;
    }
    
    // Calculate credit cost
    let creditCost = 0;
    let exportType = "basic export";
    
    if ((exportAudio || mergeAudio) && chaptersWithAudio > 0) {
        creditCost = 15; // Premium audio export (computational work)
        exportType = "premium audio export";
    } else {
        creditCost = 0;  // Data exports are free (same as project save)
        exportType = "free data export";
    }
    
    // Check for single file downloads (no ZIP needed)
    const isSingleFile = (
        (selectedItems.length === 1 && mergeAudio && !exportMetadata && !exportAudio && !exportBookContent) ||
        (selectedItems.length === 1 && exportMetadata && !exportAudio && !exportBookContent && !mergeAudio) ||
        (selectedItems.length === 1 && exportBookContent && !exportMetadata && !exportAudio && !mergeAudio)
    );
    
    if (isSingleFile) {
        if (mergeAudio) {
            // Only merged audio selected - direct download
            const extension = audioFormat === 'mp3' ? 'mp3' : 'wav';
            const chapterText = chaptersWithAudio === 1 ? '1 chapter' : `${chaptersWithAudio} chapters`;
            const costDisplay = creditCost > 0 ? `💎 <strong>Cost: ${creditCost} credits</strong> (${exportType})` : `✅ <strong>FREE</strong> (${exportType})`;
            previewContent.innerHTML = `Will download <strong>"merged_audiobook.${extension} (${chapterText})"</strong> (single file)<br><br>${costDisplay}`;
        } else if (exportMetadata) {
            // Only metadata selected
            const costDisplay = creditCost > 0 ? `💎 <strong>Cost: ${creditCost} credits</strong> (${exportType})` : `✅ <strong>FREE</strong> (${exportType})`;
            previewContent.innerHTML = `Will download <strong>"metadata.json"</strong> (single file)<br><br>${costDisplay}`;
        } else if (exportBookContent) {
            // Only book content selected
            const costDisplay = creditCost > 0 ? `💎 <strong>Cost: ${creditCost} credits</strong> (${exportType})` : `✅ <strong>FREE</strong> (${exportType})`;
            previewContent.innerHTML = `Will download <strong>"book_content.json"</strong> (single file)<br><br>${costDisplay}`;
        }
    } else {
        // Multiple items - ZIP download
        const files = [];
        if (exportMetadata) files.push('• metadata.json (project structure)');
        if (exportBookContent) files.push('• book_content.json (highlights & content)');
        
        if (exportAudio && totalSections > 0) {
            const extension = audioFormat === 'mp3' ? 'mp3' : 'wav';
            files.push(`• ${totalSections} individual audio file (.${extension})`);
        }
        
        if (mergeAudio && chaptersWithAudio > 0) {
            const extension = audioFormat === 'mp3' ? 'mp3' : 'wav';
            const chapterText = chaptersWithAudio === 1 ? '1 chapter' : `${chaptersWithAudio} chapters`;
            files.push(`• merged_audiobook.${extension} (${chapterText})`);
        }
        
        const costDisplay = creditCost > 0 ? `💎 <strong>Cost: ${creditCost} credits</strong> (${exportType})` : `✅ <strong>FREE</strong> (${exportType})`;
        previewContent.innerHTML = `Will download <strong>"audiobook_export.zip"</strong> containing:<br>${files.join('<br>')}<br><br>${costDisplay}`;
    }
}

// Initialize export preview functionality
export function initializeExportPreview() {
    // Get all export option checkboxes and radio buttons
    const checkboxes = document.querySelectorAll('#exportModal input[type="checkbox"], #exportModal input[type="radio"]');
    
    // Add event listeners to update preview when options change
    checkboxes.forEach(input => {
        input.addEventListener('change', () => {
            updateExportPreview();
            updateVisualStates(); // Update visual states for fallback browsers
        });
    });
    
    // Initial preview update
    updateExportPreview();
    updateVisualStates();
}

// Update visual states for browsers without :has() support
function updateVisualStates() {
    // Handle main export option labels
    const exportLabels = document.querySelectorAll('.export-options > label');
    exportLabels.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');
        if (checkbox) {
            label.classList.toggle('checked', checkbox.checked);
        }
    });
    
    // Handle audio format labels
    const audioFormatLabels = document.querySelectorAll('.audio-format-selection > label:not(:first-of-type)');
    audioFormatLabels.forEach(label => {
        const radio = label.querySelector('input[type="radio"]');
        if (radio) {
            label.classList.toggle('checked', radio.checked);
        }
    });
}

// Export function - preserving exact logic from original
export async function startExport() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    status.className = 'status';
    status.textContent = 'Checking credits...';
    
    // Get export options first to calculate credit cost
    let exportMetadata = document.getElementById('exportMetadata').checked;
    let exportAudio = document.getElementById('exportAudio').checked;
    let exportBookContent = document.getElementById('exportBookContent').checked;
    let mergeAudio = document.getElementById('mergeAudio').checked;
    
    // Calculate credit cost before starting export
    let creditCost = 0;
    let exportType = "basic export";
    
    if (exportAudio || mergeAudio) {
        creditCost = 15; // Premium audio export
        exportType = "premium audio export";
    } else {
        creditCost = 0;  // Data exports are free
        exportType = "free data export";
    }
    
    // Check credits before processing (only for paid features)
    if (creditCost > 0) {
        const { checkCreditsForAction } = await import('./appUI.js');
        const hasCredits = await checkCreditsForAction(creditCost, exportType);
        
        if (!hasCredits) {
            status.className = 'status error';
            status.textContent = `Insufficient credits for ${exportType}. Required: ${creditCost} credits.`;
            setTimeout(() => {
                status.style.display = 'none';
            }, 3000);
            return;
        }
    }
    
    status.textContent = 'Exporting...';
    
    // Collect highlight information
    const bookContent = document.getElementById('bookContent');
    const highlights = Array.from(bookContent.querySelectorAll('.section-highlight')).map(highlight => ({
        text: highlight.textContent,
        sectionId: highlight.dataset.sectionId,
        className: highlight.className
    }));
    
    // Variables already declared above for credit checking
    
    // Smart ZIP detection - automatically create ZIP for multiple selections
    const selectedCount = [exportMetadata, exportAudio, exportBookContent, mergeAudio].filter(Boolean).length;
    const isSingleFileDownload = (
        (selectedCount === 1 && mergeAudio && !exportMetadata && !exportAudio && !exportBookContent) ||
        (selectedCount === 1 && exportMetadata && !exportAudio && !exportBookContent && !mergeAudio) ||
        (selectedCount === 1 && exportBookContent && !exportMetadata && !exportAudio && !mergeAudio)
    );
    const autoCreateZip = !isSingleFileDownload;
    
    const exportOptions = {
        exportMetadataFlag: exportMetadata,
        exportAudioFlag: exportAudio,
        exportBookContentFlag: exportBookContent,
        createZipFlag: autoCreateZip, // Smart auto-detection
        mergeAudioFlag: mergeAudio,
        silenceDuration: parseInt(document.getElementById('silenceDuration').value),
        audioFormat: document.querySelector('input[name="audioFormat"]:checked').value,
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
        const response = await apiFetch('/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportOptions)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update credit display after successful export
            if (exportAudio || mergeAudio) {
                // Only refresh credits if this was a paid export
                const { updateUserCredits } = await import('./appUI.js');
                updateUserCredits(); // Refresh credit display to show consumption
            }
            
            status.className = 'status success';
            status.textContent = 'Export completed successfully!';
            
            // Smart download logic based on what was selected
            if (autoCreateZip) {
                createDownloadLink(`/exports/${result.exportId}/audiobook_export.zip`, 'audiobook_export.zip');
            } else {
                // Single file download
                if (mergeAudio) {
                    // Only merged audio selected - direct download
                    const audioFormat = exportOptions.audioFormat || 'wav';
                    const fileExtension = audioFormat === 'mp3' ? 'mp3' : 'wav';
                    // Look for merged file in first chapter directory
                    const fileName = `chapter_1_merged.${fileExtension}`;
                    createDownloadLink(`/exports/${result.exportId}/chapter_1/${fileName}`, `merged_audiobook.${fileExtension}`);
                } else if (exportMetadata) {
                    // Only metadata selected
                    createDownloadLink(`/exports/${result.exportId}/metadata.json`, 'metadata.json');
                } else if (exportBookContent) {
                    // Only book content selected  
                    createDownloadLink(`/exports/${result.exportId}/book_content.json`, 'book_content.json');
                }
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
        const response = await apiFetch(`/exports/${exportId}/metadata.json`);
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
        showError('Failed to import content: ' + error.message);
        return false;
    }
}