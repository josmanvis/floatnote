# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Multi-process desktop application with layered architecture

**Key Characteristics:**
- Electron-based desktop app with main and renderer process separation
- Single-window architecture with tray menu integration
- Canvas-based drawing layer with DOM text overlay layer
- Multi-note management system (pagination-based note switching)
- Command-based IPC (Inter-Process Communication) for main-renderer interaction
- Context isolation with secure preload bridge
- Debounced auto-save to persistent JSON storage

## Layers

**Main Process:**
- Purpose: Lifecycle, window management, global shortcuts, file I/O, system integration
- Location: `src/main.js`
- Contains: Window creation, tray menu, shortcut registration, IPC handlers, data persistence
- Depends on: Electron APIs (app, BrowserWindow, globalShortcut, ipcMain, dialog, screen, shell)
- Used by: Renderer process via IPC channels

**Preload Bridge:**
- Purpose: Secure contextBridge exposing safe APIs from main process to renderer
- Location: `src/preload.js`
- Contains: `window.glassboard` API exposing clipboard, file ops, IPC handlers
- Depends on: Electron APIs (contextBridge, ipcRenderer, clipboard, nativeImage)
- Used by: Renderer code via `window.glassboard` object

**Renderer UI Layer:**
- Purpose: Entire user interface - canvas drawing, text editing, toolbar, settings
- Location: `src/renderer.js`, `src/index.html`, `src/styles.css`
- Contains: `Glassboard` class (singleton managing all UI state and interactions)
- Depends on: DOM, Canvas 2D API, `window.glassboard` preload API
- Used by: User interactions (mouse, keyboard, touch, gestures)

**CLI Launcher:**
- Purpose: macOS command-line binary to update/launch the app
- Location: `bin/floatnote.js`
- Contains: Release fetching, binary download, extraction, app launch
- Depends on: Node.js APIs (fs, path, https, execSync, spawn)
- Used by: Terminal/shell or npm globally

## Data Flow

**Drawing & Editing Flow:**
1. User draws on canvas or creates text item in renderer
2. `Glassboard` class captures mouse/touch events, updates model state
3. `saveState()` creates history snapshot and triggers `autoSave()`
4. `autoSave()` debounces (1 second) then calls `saveData()`
5. `saveData()` sends via `window.glassboard.saveData()` to main process
6. Main process handler `ipcMain.handle('save-data')` writes to `~/.config/floatnote/floatnote-data.json`
7. Optional: If `autoSaveToFolder` enabled, also exports to `~/.floatnote/note-{id}.json`

**Note Navigation Flow:**
1. User clicks pagination button or presses `[`/`]` keyboard shortcut
2. `previousNote()` or `nextNote()` called in `Glassboard`
3. `saveCurrentNoteState()` saves current note and calls `autoSave()`
4. `currentNoteIndex` incremented/decremented, or new note created
5. `loadCurrentNote()` clears display and re-renders from `this.notes[currentNoteIndex]`
6. `updateNoteIndicator()` shows temporary "X / Y" UI feedback

**Window Toggle Flow:**
1. User presses `Cmd+Shift+G` or `Alt+Space` global shortcut
2. Main process handler calls `toggleFloatnote()`
3. If visible: hide window; if hidden/destroyed: create or show window
4. If shown via toggle, main sends `window-toggled-open` event to renderer
5. Renderer handler `handleWindowToggledOpen()` checks `openWithCleanSlate` setting
6. If enabled: creates new empty note and clears canvas

**State Management:**
- Canvas drawing state: `this.lines` array (draw objects with points, color, width)
- Text items state: `this.textItems` array (text objects with position, color, content)
- Images state: `this.images` array (pasted images with position, data URL)
- Attachments state: `this.attachments` array (file references)
- All stored per-note in `this.notes[currentNoteIndex]`
- Settings persisted separately in `this.settings` object
- Undo/redo via `this.history` array with `this.historyIndex` pointer

## Key Abstractions

**Glassboard Class:**
- Purpose: Monolithic UI controller and state container
- Location: `src/renderer.js` lines 4-end
- Pattern: Single instance managing canvas, text editor, toolbar, settings, multi-note system
- Responsibilities:
  - Canvas drawing with multi-stroke object grouping
  - Text item creation and editing with formatting
  - Image pasting and positioning
  - Selection and multi-selection handling
  - Undo/redo state machine
  - Gesture recognition (pinch, rotate, pan)
  - Auto-save and persistence coordination

**Note Object:**
- Purpose: Container for all content in a single note
- Structure (lines 166-178):
  ```javascript
  {
    id: timestamp-string,
    lines: [...],           // Draw strokes
    textItems: [...],       // Text overlays
    images: [...],          // Pasted images
    attachments: [...],     // File references
    originX, originY,       // Viewport center for zoom/pan
    createdAt, lastModified: timestamps
  }
  ```

**Line Object (drawing strokes):**
- Purpose: Single drawn stroke or grouped strokes
- Contains: `points[]`, `color`, `width`, `objectId` (for grouping related strokes)
- Pattern: Multiple points within `objectGroupTimeout` (500ms) grouped into single object

**Text Item Object:**
- Purpose: Positioned text overlay
- Contains: `id`, `x`, `y`, `content`, `color`, `width`, formatting metadata
- Editable: contentEditable div, saved on blur

**Image Object:**
- Purpose: Pasted or dragged image
- Contains: `id`, `x`, `y`, `width`, `height`, `dataUrl` (base64 encoded)

## Entry Points

**Application Launch:**
- Location: `src/main.js` (Electron main entry via package.json "main" field)
- Triggers: `app.whenReady()` event
- Responsibilities:
  - Single instance lock verification (requestSingleInstanceLock)
  - Tray menu creation
  - Window creation with specific bounds and properties
  - Global shortcut registration (Cmd+Shift+G, Alt+Space)
  - IPC handler setup

**Renderer Initialization:**
- Location: `src/renderer.js` lines 89-123 (`Glassboard.init()`)
- Triggers: When `index.html` loads (BrowserWindow.loadFile)
- Responsibilities:
  - Canvas setup with device pixel ratio scaling
  - Toolbar event binding
  - Keyboard shortcut binding
  - Drawing/text/select mode setup
  - Gesture and zoom handlers
  - Load saved data and restore state

**CLI Entry:**
- Location: `bin/floatnote.js` (npm bin field, runs as `floatnote` command)
- Triggers: Shell invocation or npm start
- Responsibilities:
  - Check for updates via GitHub API
  - Download/extract latest release
  - Symlink to ~/Applications
  - Launch app via `open` command

## Error Handling

**Strategy:** Try-catch with console.error logging, no error dialogs to user

**Patterns:**

- Data load errors (main process, line 406):
  ```javascript
  try {
    fs.existsSync(dataFilePath) ? JSON.parse(fs.readFileSync(...)) : null
  } catch (error) {
    return { success: false, error: error.message }
  }
  ```

- IPC handlers return `{ success: boolean, error?: string, data?: any }`

- Renderer promise-based operations use `.catch(error => console.error())`

- File operations silently fail and return null/false rather than throwing

## Cross-Cutting Concerns

**Logging:**
- Main process: `console.error()` for failures (data save, file operations)
- Renderer: `console.error()` for save failures
- Dev mode: `--enable-logging` flag available (package.json "dev" script)
- No structured logging framework

**Validation:**
- Main: File path existence checks before read/write
- Main: Dialog response codes validated (button indices)
- Renderer: Canvas bounds checking for drawing
- No input sanitization or schema validation

**Authentication:**
- Context isolation enabled (webPreferences.contextIsolation: true)
- Preload sandbox disabled but contextBridge used
- No user authentication system
- Tray menu accessible without authentication

**Security:**
- CSP header set: `default-src 'self'`, no unsafe-eval
- Context isolation prevents direct Node access from renderer
- No file system access from renderer (only via preload bridge)
- Global shortcuts limited to platform-specific hotkeys

---

*Architecture analysis: 2026-01-22*
