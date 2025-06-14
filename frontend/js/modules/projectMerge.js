// AudioBook Organizer - Project Merge Engine

import { showError, showSuccess, showConfirm } from './notifications.js';

/**
 * Smart merge two project JSON files
 * @param {Object} currentProject - Current project data
 * @param {Object} importedProject - Imported project data
 * @returns {Object} Merge result with merged data and conflicts
 */
export function smartMerge(currentProject, importedProject) {
    const result = {
        merged: {
            bookText: currentProject.bookText,
            projectMetadata: mergeProjectMetadata(currentProject, importedProject),
            chapters: [],
            currentColorIndex: currentProject.currentColorIndex,
            highlights: [...currentProject.highlights],
            formattingData: { ranges: [], comments: [] },
            timestamp: new Date().toISOString(),
            version: '1.2'
        },
        conflicts: [],
        summary: {
            chaptersAdded: 0,
            sectionsAdded: 0,
            conflictsFound: 0,
            formattingMerged: 0
        }
    };
    
    // 1. Check for book text conflicts
    if (currentProject.bookText !== importedProject.bookText) {
        result.conflicts.push({
            type: 'bookText',
            description: 'Base book text differs between projects',
            current: {
                value: currentProject.bookText,
                user: currentProject.projectMetadata?.lastModifiedBy || 'Unknown'
            },
            imported: {
                value: importedProject.bookText,
                user: importedProject.projectMetadata?.lastModifiedBy || 'Unknown'
            }
        });
    }
    
    // 2. Merge chapters
    const mergeChaptersResult = mergeChapters(currentProject.chapters, importedProject.chapters);
    result.merged.chapters = mergeChaptersResult.chapters;
    result.conflicts.push(...mergeChaptersResult.conflicts);
    result.summary.chaptersAdded = mergeChaptersResult.added;
    result.summary.sectionsAdded = mergeChaptersResult.sectionsAdded;
    
    // 3. Merge formatting data
    const mergeFormattingResult = mergeFormattingData(
        currentProject.formattingData, 
        importedProject.formattingData
    );
    result.merged.formattingData = mergeFormattingResult.merged;
    result.conflicts.push(...mergeFormattingResult.conflicts);
    result.summary.formattingMerged = mergeFormattingResult.merged.ranges.length;
    
    // 4. Merge highlights (combine both)
    result.merged.highlights = mergeHighlights(currentProject.highlights, importedProject.highlights);
    
    result.summary.conflictsFound = result.conflicts.length;
    
    return result;
}

/**
 * Merge project metadata
 */
function mergeProjectMetadata(currentProject, importedProject) {
    const currentMeta = currentProject.projectMetadata || {};
    const importedMeta = importedProject.projectMetadata || {};
    
    // Combine collaborators
    const allCollaborators = new Set([
        ...(currentMeta.collaborators || []),
        ...(importedMeta.collaborators || [])
    ]);
    
    return {
        createdBy: currentMeta.createdBy || 'unknown',
        lastModifiedBy: currentMeta.lastModifiedBy || 'unknown',
        lastModified: new Date().toISOString(),
        collaborators: Array.from(allCollaborators),
        version: '1.2'
    };
}

/**
 * Merge chapters from two projects
 */
function mergeChapters(currentChapters, importedChapters) {
    const result = {
        chapters: [...currentChapters],
        conflicts: [],
        added: 0,
        sectionsAdded: 0
    };
    
    importedChapters.forEach(importedChapter => {
        const existingChapter = result.chapters.find(c => c.id === importedChapter.id);
        
        if (!existingChapter) {
            // New chapter - add it
            result.chapters.push(importedChapter);
            result.added++;
            result.sectionsAdded += importedChapter.sections?.length || 0;
        } else {
            // Chapter exists - check for conflicts and merge sections
            if (existingChapter.name !== importedChapter.name) {
                result.conflicts.push({
                    type: 'chapterName',
                    description: `Chapter "${existingChapter.name}" has different names`,
                    chapterId: existingChapter.id,
                    current: {
                        value: existingChapter.name,
                        user: existingChapter.lastModifiedBy || 'Unknown'
                    },
                    imported: {
                        value: importedChapter.name,
                        user: importedChapter.lastModifiedBy || 'Unknown'
                    }
                });
            }
            
            // Merge sections within this chapter
            const sectionMergeResult = mergeSections(existingChapter.sections, importedChapter.sections);
            existingChapter.sections = sectionMergeResult.sections;
            result.conflicts.push(...sectionMergeResult.conflicts);
            result.sectionsAdded += sectionMergeResult.added;
        }
    });
    
    return result;
}

/**
 * Merge sections within a chapter
 */
function mergeSections(currentSections, importedSections) {
    const result = {
        sections: [...currentSections],
        conflicts: [],
        added: 0
    };
    
    importedSections.forEach(importedSection => {
        const existingSection = result.sections.find(s => s.id === importedSection.id);
        
        if (!existingSection) {
            // New section - add it
            result.sections.push(importedSection);
            result.added++;
        } else {
            // Section exists - check for conflicts
            if (existingSection.text !== importedSection.text) {
                result.conflicts.push({
                    type: 'sectionText',
                    description: `Section "${existingSection.name}" has different text content`,
                    sectionId: existingSection.id,
                    current: {
                        value: existingSection.text,
                        user: existingSection.lastModifiedBy || 'Unknown'
                    },
                    imported: {
                        value: importedSection.text,
                        user: importedSection.lastModifiedBy || 'Unknown'
                    }
                });
            }
            
            if (existingSection.name !== importedSection.name) {
                result.conflicts.push({
                    type: 'sectionName',
                    description: `Section has different names`,
                    sectionId: existingSection.id,
                    current: {
                        value: existingSection.name,
                        user: existingSection.lastModifiedBy || 'Unknown'
                    },
                    imported: {
                        value: importedSection.name,
                        user: importedSection.lastModifiedBy || 'Unknown'
                    }
                });
            }
        }
    });
    
    return result;
}

/**
 * Merge formatting data
 */
function mergeFormattingData(currentFormatting, importedFormatting) {
    const result = {
        merged: {
            ranges: [],
            comments: [],
            version: '1.0'
        },
        conflicts: []
    };
    
    // Combine all ranges (conflicts will be detected by overlap)
    const allRanges = [
        ...(currentFormatting?.ranges || []),
        ...(importedFormatting?.ranges || [])
    ];
    
    // Simple merge - just combine all ranges
    // TODO: Add overlap detection for conflicts
    result.merged.ranges = allRanges;
    
    // Combine comments
    result.merged.comments = [
        ...(currentFormatting?.comments || []),
        ...(importedFormatting?.comments || [])
    ];
    
    return result;
}

/**
 * Merge highlights arrays
 */
function mergeHighlights(currentHighlights, importedHighlights) {
    // Simple merge - combine and deduplicate by sectionId
    const highlightMap = new Map();
    
    [...currentHighlights, ...importedHighlights].forEach(highlight => {
        if (!highlightMap.has(highlight.sectionId)) {
            highlightMap.set(highlight.sectionId, highlight);
        }
    });
    
    return Array.from(highlightMap.values());
} 