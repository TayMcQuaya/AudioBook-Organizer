// AudioBook Organizer - DOM Utilities

export function getElementById(id) {
    return document.getElementById(id);
}

export function querySelector(selector) {
    return document.querySelector(selector);
}

export function querySelectorAll(selector) {
    return document.querySelectorAll(selector);
}

export function createElement(tagName) {
    return document.createElement(tagName);
}

export function createDownloadLink(href, filename) {
    const link = createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return link;
}

export function createBlob(data, type) {
    return new Blob([data], { type });
}

export function createObjectURL(blob) {
    return URL.createObjectURL(blob);
}

export function revokeObjectURL(url) {
    URL.revokeObjectURL(url);
}

export function showElement(element) {
    if (element) element.style.display = 'block';
}

export function hideElement(element) {
    if (element) element.style.display = 'none';
}

export function setElementText(element, text) {
    if (element) element.textContent = text;
}

export function setElementHTML(element, html) {
    if (element) element.innerHTML = html;
}

export function addClassName(element, className) {
    if (element) element.classList.add(className);
}

export function removeClassName(element, className) {
    if (element) element.classList.remove(className);
}

export function toggleClassName(element, className) {
    if (element) element.classList.toggle(className);
} 