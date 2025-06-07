// AudioBook Organizer - Helper Utilities

export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function getAccentColor(colorIndex) {
    const accentColors = {
        1: '#ffb74d', // Orange
        2: '#81c784', // Green
        3: '#64b5f6', // Blue
        4: '#f06292', // Pink
        5: '#a1887f', // Brown
        6: '#4dd0e1', // Cyan
        7: '#ba68c8', // Purple
        8: '#7986cb'  // Indigo
    };
    return accentColors[colorIndex] || accentColors[1];
}

export function getNodeOffset(node) {
    const range = document.createRange();
    range.selectNode(node);
    return range.startOffset;
}

export function findTextNodeWithContent(element, searchText) {
    const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                return node.textContent.includes(searchText)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );

    return walker.nextNode();
} 