// versionManager.js
export const VERSION = Date.now(); // This will be set at build time

export function addVersionToUrl(url) {
    if (!url) return url;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${VERSION}`;
}

// Function to version all script and style tags
export function versionAllResources() {
    // Version CSS files
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href) {
            link.href = addVersionToUrl(link.href);
        }
    });

    // Version JS files
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src) {
            script.src = addVersionToUrl(script.src);
        }
    });
} 