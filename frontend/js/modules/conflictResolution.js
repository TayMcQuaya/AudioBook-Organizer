// AudioBook Organizer - Conflict Resolution UI

import { showSuccess, showError } from './notifications.js';

/**
 * Show conflict resolution dialog
 * @param {Array} conflicts - Array of conflict objects
 * @param {Function} onResolve - Callback with resolution choices
 */
export function showConflictResolutionDialog(conflicts, onResolve) {
    // Remove any existing dialog
    const existingDialog = document.getElementById('conflictResolutionDialog');
    if (existingDialog) {
        existingDialog.remove();
    }

    // Create dialog HTML
    const dialog = document.createElement('div');
    dialog.id = 'conflictResolutionDialog';
    dialog.innerHTML = `
        <div class="conflict-dialog-overlay">
            <div class="conflict-dialog">
                <div class="dialog-header">
                    <h3>🔀 Merge Conflicts Detected</h3>
                    <p>Choose how to resolve ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''}:</p>
                </div>
                <div class="conflicts-container">
                    ${conflicts.map((conflict, index) => createConflictHTML(conflict, index)).join('')}
                </div>
                <div class="dialog-actions">
                    <button id="applyResolutionBtn" class="btn btn-primary">
                        ✅ Apply Merge
                    </button>
                    <button id="cancelMergeBtn" class="btn btn-secondary">
                        ❌ Cancel Merge
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add styles
    addConflictDialogStyles();
    
    // Add to page
    document.body.appendChild(dialog);
    
    // Show with animation
    setTimeout(() => {
        dialog.classList.add('show');
    }, 10);
    
    // Handle apply button
    dialog.querySelector('#applyResolutionBtn').addEventListener('click', () => {
        const resolutions = collectResolutions(conflicts);
        dialog.remove();
        onResolve(resolutions);
    });
    
    // Handle cancel button
    dialog.querySelector('#cancelMergeBtn').addEventListener('click', () => {
        dialog.remove();
        showError('Merge cancelled. No changes were made.');
    });
    
    // Handle escape key
    function handleKeydown(e) {
        if (e.key === 'Escape') {
            dialog.remove();
            showError('Merge cancelled. No changes were made.');
            document.removeEventListener('keydown', handleKeydown);
        }
    }
    document.addEventListener('keydown', handleKeydown);
}

/**
 * Create HTML for a single conflict
 */
function createConflictHTML(conflict, index) {
    const conflictId = `conflict_${index}`;
    
    return `
        <div class="conflict-item">
            <div class="conflict-header">
                <h4>${getConflictTitle(conflict)}</h4>
                <p class="conflict-description">${conflict.description}</p>
            </div>
            <div class="conflict-options">
                <label class="conflict-option">
                    <input type="radio" name="${conflictId}" value="current" checked>
                    <div class="option-content">
                        <div class="option-header">
                            <span class="option-label">Keep Current</span>
                            <span class="option-user">(${conflict.current.user})</span>
                        </div>
                        <div class="option-preview">${getPreviewText(conflict.current.value)}</div>
                    </div>
                </label>
                <label class="conflict-option">
                    <input type="radio" name="${conflictId}" value="imported">
                    <div class="option-content">
                        <div class="option-header">
                            <span class="option-label">Use Imported</span>
                            <span class="option-user">(${conflict.imported.user})</span>
                        </div>
                        <div class="option-preview">${getPreviewText(conflict.imported.value)}</div>
                    </div>
                </label>
                ${conflict.type !== 'bookText' ? `
                <label class="conflict-option">
                    <input type="radio" name="${conflictId}" value="both">
                    <div class="option-content">
                        <div class="option-header">
                            <span class="option-label">Keep Both</span>
                            <span class="option-user">(where possible)</span>
                        </div>
                        <div class="option-preview">Preserve both versions</div>
                    </div>
                </label>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Get conflict title based on type
 */
function getConflictTitle(conflict) {
    switch (conflict.type) {
        case 'bookText':
            return '📖 Book Text Conflict';
        case 'chapterName':
            return '📚 Chapter Name Conflict';
        case 'sectionText':
            return '📝 Section Text Conflict';
        case 'sectionName':
            return '🏷️ Section Name Conflict';
        default:
            return '⚠️ Content Conflict';
    }
}

/**
 * Get preview text (truncated)
 */
function getPreviewText(text) {
    if (typeof text !== 'string') return 'N/A';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
}

/**
 * Collect resolution choices from dialog
 */
function collectResolutions(conflicts) {
    const resolutions = {};
    
    conflicts.forEach((conflict, index) => {
        const conflictId = `conflict_${index}`;
        const selectedOption = document.querySelector(`input[name="${conflictId}"]:checked`);
        resolutions[index] = selectedOption ? selectedOption.value : 'current';
    });
    
    return resolutions;
}

/**
 * Add CSS styles for conflict dialog
 */
function addConflictDialogStyles() {
    if (document.getElementById('conflict-dialog-styles')) {
        return; // Styles already added
    }
    
    const style = document.createElement('style');
    style.id = 'conflict-dialog-styles';
    style.textContent = `
        .conflict-dialog-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .conflict-dialog-overlay.show {
            opacity: 1;
        }
        
        .conflict-dialog {
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 800px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            transform: translateY(-20px) scale(0.95);
            transition: transform 0.3s ease;
        }
        
        .conflict-dialog-overlay.show .conflict-dialog {
            transform: translateY(0) scale(1);
        }
        
        .dialog-header h3 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 24px;
        }
        
        .dialog-header p {
            margin: 0 0 24px 0;
            color: #666;
            font-size: 16px;
        }
        
        .conflicts-container {
            max-height: 400px;
            overflow-y: auto;
            margin-bottom: 24px;
        }
        
        .conflict-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
            background: #fafafa;
        }
        
        .conflict-header h4 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 18px;
        }
        
        .conflict-description {
            margin: 0 0 16px 0;
            color: #666;
            font-size: 14px;
        }
        
        .conflict-options {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .conflict-option {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            background: white;
        }
        
        .conflict-option:hover {
            border-color: #4CAF50;
            background: #f8fff8;
        }
        
        .conflict-option input[type="radio"] {
            margin-top: 4px;
        }
        
        .option-content {
            flex: 1;
        }
        
        .option-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .option-label {
            font-weight: 600;
            color: #333;
        }
        
        .option-user {
            font-size: 12px;
            color: #666;
            background: #f0f0f0;
            padding: 2px 8px;
            border-radius: 12px;
        }
        
        .option-preview {
            font-size: 14px;
            color: #555;
            background: #f9f9f9;
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid #ddd;
            font-family: monospace;
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .dialog-actions {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
        }
        
        .dialog-actions .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.2s ease;
        }
        
        .dialog-actions .btn-primary {
            background: #4CAF50;
            color: white;
        }
        
        .dialog-actions .btn-primary:hover {
            background: #45a049;
            transform: translateY(-1px);
        }
        
        .dialog-actions .btn-secondary {
            background: #f44336;
            color: white;
        }
        
        .dialog-actions .btn-secondary:hover {
            background: #d32f2f;
            transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
            .conflict-dialog {
                width: 95%;
                padding: 16px;
                max-height: 90vh;
            }
            
            .option-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
        }
    `;
    
    document.head.appendChild(style);
} 