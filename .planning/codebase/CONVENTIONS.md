# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Lowercase with `.js` extension: `main.js`, `renderer.js`, `preload.js`
- CLI script in `bin/` directory: `bin/floatnote.js`
- Test files with `.test.js` suffix: `notes.test.js`, `main.test.js`, `preload.test.js`, `settings.test.js`, `history.test.js`, `floatnote.test.js`

**Functions:**
- camelCase for function and method names: `createWindow()`, `setupCanvas()`, `loadSavedData()`
- Private-like convention with underscore prefix not used; single class methods are public
- Descriptive verb-noun patterns: `getPinned()`, `setPinned()`, `saveState()`, `undoAction()`

**Variables:**
- camelCase for all variables: `mainWindow`, `currentNoteIndex`, `textContainer`, `isDrawing`
- State booleans prefixed with `is` or `has`: `isDrawing`, `isTextMode`, `isSelectMode`, `hasImage`
- Timeout/interval variables include unit context: `objectGroupTimeout`, `saveTimeout`, `lastStrokeTime`
- Array variables plural: `notes`, `lines`, `textItems`, `images`, `selectedObjects`

**Types/Constants:**
- UPPER_SNAKE_CASE for constants: `MAX_HISTORY`, `MAX_ZOOM`, `MIN_ZOOM`
- All object field names in camelCase: `currentNoteIndex`, `lastModified`, `textItems`

## Code Style

**Formatting:**
- No explicit formatter configuration (ESLint/Prettier not configured)
- 2-space indentation observed throughout codebase
- Semicolons used consistently at end of statements
- String literals use single quotes: `'#ffffff'`, `'transparent'`

**Linting:**
- No linting configuration detected (no `.eslintrc`, `.eslintignore`)
- Code follows implicit conventions through manual discipline

## Import Organization

**Order:**
1. Electron/Node modules: `const { app, BrowserWindow } = require("electron")`
2. Standard library modules: `const path = require("path")`, `const fs = require("fs")`
3. Third-party modules: (none currently in use)
4. Project modules: (not applicable - single-file structure or inline)

**Module.exports Pattern:**
```javascript
module.exports = {
  app,
  BrowserWindow,
  Tray,
  // ... other exports
};
```

**IPC Communication Naming:**
- Event channels use kebab-case: `'close-window'`, `'hide-window'`, `'set-pinned'`, `'save-data'`, `'export-png'`
- Handler verbs describe action: `'close-window'` (send), `'save-data'` (invoke), `'load-data'` (invoke)

## Error Handling

**Patterns:**
- Try-catch blocks used in async functions: `try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Failed to parse release data')); }`
- Error objects include descriptive messages
- Electron API methods check return values: `if (mainWindow && !mainWindow.isDestroyed())`
- File operations wrapped in existence checks: `if (fs.existsSync(filePath)) { ... }`
- Clipboard operations check for empty: `if (!image.isEmpty())`

**Return Value Patterns:**
- Functions return `null` for "not found" or "empty" cases (not `undefined`)
- Promise-based IPC returns resolve/reject with data or error objects
- Getter methods return empty arrays/empty objects on missing data: `return this.notes[this.currentNoteIndex]?.lines || []`

## Logging

**Framework:** `console.log()` (no logging library)

**Patterns:**
- CLI logging uses bracket prefix: `console.log('[floatnote] message')`
- Main process uses dev logging via `--enable-logging` flag (no persistent logging)
- Error information logged to stderr/stdout
- No structured logging format

## Comments

**When to Comment:**
- Section separators with descriptive comments: `// Multi-note system`, `// Object grouping state`, `// IPC Communication`
- Explanatory comments for non-obvious logic: `// Prevent race condition - if already creating, don't create another`
- Comments explain "why", not "what": avoid redundant comments like `// increment i` for `i++`
- Test file headers document purpose: `// Tests for src/main.js - Main Process`

**JSDoc/TSDoc:**
- Not used (no type annotations in codebase)
- Methods documented via inline comments above function definitions when needed
- Parameter descriptions in comments above complex functions

## Function Design

**Size:** Methods typically 20-100 lines; shorter methods for single responsibility

**Parameters:**
- Positional parameters for required values: `function createWindow(options = {})`
- Options object pattern for optional/configuration parameters: `options.x`, `options.y`
- Default values using `??` nullish coalescing: `const x = options.x ?? displayX + screenWidth - windowWidth`

**Return Values:**
- Void for state mutations and UI updates
- Values for queries and calculations
- Objects for structured data returns
- Promises for async IPC operations

## Module Design

**Exports:**
- CommonJS `require()` / `module.exports` pattern (Electron standard)
- Single class export: Glassboard class exported implicitly for renderer
- Multiple named exports in preload and mocks

**Barrel Files:**
- Not used (simple file structure with direct imports)

**Class Structure:**
- Single primary class per file: `Glassboard` in `renderer.js`
- Constructor initializes state and calls `init()` method
- Getter/setter properties for computed values: `get lines()`, `set lines(value)`
- Private state managed with property naming (no visibility modifiers in JavaScript)
- Methods organized by feature: `setup*` methods for initialization, action methods, getters/setters

## API Design Patterns

**Preload Bridge (window.glassboard):**
- Methods follow verb patterns: `closeWindow()`, `hideWindow()`, `saveData()`
- Configuration methods use setters: `setWindowSize()`, `setBackgroundMode()`
- Data retrieval methods use getters: `getClipboardContent()`, `loadData()`
- Listener registration methods: `onFocusChange(callback)`, `onWindowToggledOpen(callback)`

**Main Process IPC Handlers:**
- Named channels for ipcMain.on() and ipcMain.handle()
- Send channels for one-way communication: `ipcRenderer.send('close-window')`
- Invoke channels for request-response: `ipcRenderer.invoke('save-data', data)`

---

*Convention analysis: 2026-01-22*
