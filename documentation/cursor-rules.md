# Comic Creator Codebase Rules & Guidelines

## 1. Introduction

This document outlines the structure, coding style, and implementation patterns used in the Comic Creator codebase. Its purpose is to ensure consistency, maintainability, and prevent regressions when adding new features or modifying existing ones. Adhering to these guidelines is crucial for smooth development.

## 2. Core Structure

The application follows a modular structure orchestrated by a central class.

*   **HTML Structure:** `index.html` defines the main pages (`#upload-page`, `#layout-page`, `#editor-page`), the editor layout (`.editor-container`, `.editor-sidebar`, `.properties-panel`, `.comic-canvas-container`), and modals (using `#*-modal-overlay` and `#*-modal` IDs). Use specific IDs for major sections and structural elements.
*   **Main Entry Point:** `src/js/main.js` initializes the application and imports necessary modules.
*   **Central Orchestrator:** The `ComicCreator` class in `main.js` serves as the main controller. It:
    *   Holds the primary application state (e.g., `pages`, `currentPageIndex`, `folderStructure`).
    *   Instantiates all Manager modules.
    *   Initializes the application flow (`init` method).
    *   Handles global event listeners and delegates actions.
    *   Manages page navigation and core state transitions (save/load).
*   **Manager Modules:** Located in `src/js/modules/`, each manager encapsulates a specific feature or area of responsibility:
    *   `PanelManager.js`: Manages comic panel creation, image placement within panels, panel selection, and panel-specific controls (zoom, position).
    *   `TextManager.js`: Handles text bubble creation (in panels or on canvas), editing, styling, selection, and state management. Includes formatting popups.
    *   `ImageLibrary.js`: Manages uploaded images (storage, retrieval, deletion), thumbnail display, and asset selection (including multi-select and shift-select).
    *   `FolderSystem.js`: Manages the folder hierarchy for organizing images within the library (creation, navigation, renaming, moving items).
    *   `DragAndDropManager.js`: Encapsulates all drag-and-drop logic (images to panels/canvas, stickers, text bubbles, image library reordering, folder interactions).
    *   `StickerManager.js`: Handles adding, selecting, deleting, and controlling sticker properties (size, flip).
    *   `BackgroundManager.js`: Manages canvas background styles (presets, custom images, global vs. per-page), including state and sidebar controls.
    *   `UIManager.js`: Manages general UI elements and interactions like sidebar tab switching, the right-side properties panel updates, **modals** (using the standard `overlay`/`modal` structure defined in `index.html`), notifications, and helper UI functions (e.g., making slider values editable).
    *   `ExportManager.js`: Handles exporting the comic pages to PDF, leveraging `html2canvas` and `jsPDF` (included in `index.html`). May also manage font preloading via `FontFaceObserver`.
    *   `Utils.js`: Contains standalone utility functions (e.g., `globalRgbToHex`, `getTextWithLineBreaks`).
*   **Styling:** `src/styles/main.css` contains all styles. It uses CSS variables (`:root`) extensively for theming and is organized by page/component. Use specific classes for components and states.
*   **External Libraries:** Key libraries like `jsPDF`, `html2canvas`, `jszip`, and `FontFaceObserver` are included in `index.html`. Ensure they are used correctly within the relevant managers.

## 3. Adding New Features

Follow these steps to integrate new features consistently:

1.  **Create a Manager:** For significant features, create a new manager class in `src/js/modules/`. Name it descriptively (e.g., `NewFeatureManager.js`).
2.  **Import & Instantiate:** Import the new manager in `src/js/main.js` and instantiate it within the `ComicCreator` constructor, passing `this` (the `comicCreator` instance) if the manager needs access to shared state or other managers.
    ```javascript
    import { NewFeatureManager } from './modules/NewFeatureManager.js';

    class ComicCreator {
        constructor() {
            // ... other managers
            this.newFeatureManager = new NewFeatureManager(this);
            // ...
            this.init();
        }
        // ...
    }
    ```
3.  **Initialization:** If the feature requires setup (e.g., adding event listeners, initializing UI elements defined in `index.html`), call an initialization method (e.g., `this.newFeatureManager.initFeature()`) from within `ComicCreator.init()`.
4.  **Event Handling:**
    *   Add global event listeners (e.g., keyboard shortcuts) in `ComicCreator.setupEventListeners()` and delegate to the new manager.
    *   Add element-specific listeners within the manager's initialization or methods that create the relevant elements (targeting IDs or classes from `index.html` or dynamically created elements).
    *   Leverage `DragAndDropManager` for any drag-and-drop functionality.
5.  **State Management:**
    *   Determine if state needs to be managed globally (in `ComicCreator`) or locally within the manager.
    *   Integrate with `ComicCreator.saveCurrentPageState()` and `ComicCreator.loadPageState()` by adding calls to the manager's specific save/load methods (e.g., `this.newFeatureManager.saveState()`, `this.newFeatureManager.loadState(currentPage)`).
    *   Ensure the feature's state is included in `ComicCreator.saveProject()` and correctly restored in `ComicCreator.loadProject()`. Remember to handle versioning if the project structure changes.
6.  **DOM Manipulation:** The manager should be responsible for creating, updating, and removing DOM elements related to its feature, interacting with the structure defined in `index.html` as needed.
7.  **UI Integration:**
    *   If the feature requires controls in the right sidebar (`#properties-panel`), integrate with `UIManager.updateRightSidebarView()`. Add a new `case` or modify an existing one. The manager should provide a method to populate the controls (similar to `panelManager.updatePanelControls`).
    *   Use `UIManager.showNotification()` for user feedback.
    *   Use `UIManager` for modals, following the `#*-modal-overlay` / `#*-modal` pattern from `index.html`.
8.  **CSS:** Add new styles to `src/styles/main.css`, following the existing organization. Use CSS variables where appropriate. Comment new sections clearly.

## 4. Coding Style & Patterns

*   **Modularity:** Keep features encapsulated within their respective managers. Managers should have clear responsibilities.
*   **Central Orchestration:** `ComicCreator` coordinates managers. Managers can access `comicCreator` (passed in constructor) to interact with other managers or shared state *when necessary*, but avoid excessive coupling.
*   **State:** Follow the existing pattern of central state in `ComicCreator` and specific state within managers. Ensure clear save/load pathways.
*   **DOM & Events:** Managers handle their own DOM elements. Event listeners should be clearly defined and added either centrally or within the manager responsible for the element.
*   **Naming:** Use `camelCase` for variables and functions, `PascalCase` for classes. Use descriptive names.
*   **ES6:** Use `import`/`export`, `class`, `const`/`let`.
*   **Utils:** Place reusable, standalone functions in `Utils.js`.
*   **Comments:** Add comments to explain non-obvious logic, new feature sections, or complex interactions.
*   **Error Handling:** Use `console.warn`/`console.error` for development debugging. Use `UIManager.showNotification` for user-facing errors. Use `try...catch` for operations that might fail (e.g., file loading, API calls if added later).

## 5. CSS Guidelines

*   **Variables:** Utilize existing CSS variables in `:root` for colors, fonts, and common spacing/sizing. Add new variables if introducing fundamentally new theme elements.
*   **Organization:** Group styles by page (`#upload-page`, `#editor-page`) or component (`.comic-panel`, `.text-bubble`, `.properties-panel`). Add comments to delineate new sections.
*   **Selectors:** Use specific, descriptive class names (e.g., `.thumbnail-container`, `.modal-buttons`). Use IDs for unique, top-level elements or major sections (`#comic-canvas`, `#properties-panel`).
*   **State Classes:** Use classes like `.active`, `.selected`, `.dragging`, `.hidden` to manage UI states via JavaScript.
*   **Responsiveness:** Consider how new UI elements behave on different screen sizes and add/update `@media` queries if necessary.

## 6. Important Considerations

*   **No Redundancy:** Before implementing, check if similar functionality exists in another manager or `Utils.js`.
*   **No Regressions:** Ensure adding a new feature does not break or negatively impact any existing functionality. Test interactions between features.
*   **Testing:** Manually test new features thoroughly across different scenarios (e.g., adding/deleting items, saving/loading projects, switching pages/modes).
*   **Update Guidelines:** If significant structural changes are made (e.g., changing the state management approach), update this document accordingly. 