# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
floatnote/
├── bin/                    # CLI executable
│   └── floatnote.js        # macOS app launcher with auto-update
├── src/                    # Application source code
│   ├── main.js             # Electron main process
│   ├── preload.js          # IPC bridge to renderer
│   ├── renderer.js         # UI controller (Glassboard class)
│   ├── index.html          # UI markup and canvas
│   ├── styles.css          # All styling
│   └── icon-template.png   # macOS app icon
├── tests/                  # Jest test suites
│   ├── main/               # Main process tests
│   ├── renderer/           # Renderer/UI tests
│   ├── cli/                # CLI launcher tests
│   ├── preload/            # Preload bridge tests
│   └── mocks/              # Electron and fs mocks
├── jest.config.js          # Jest configuration (multi-project)
├── package.json            # Dependencies and scripts
├── CLAUDE.md               # Development guide
└── .planning/              # GSD planning documents
    └── codebase/           # (This directory)
```

## Directory Purposes

**bin/**
- Purpose: Command-line entry point for `npm bin` field
- Contains: Single executable script for app installation/launch
- Key files: `bin/floatnote.js`

**src/**
- Purpose: All application source code
- Contains: Main process, preload bridge, renderer UI, HTML markup, CSS
- Key files:
  - `src/main.js` (19KB) - Window and process lifecycle
  - `src/renderer.js` (111KB) - Complete UI implementation
  - `src/preload.js` (2.7KB) - Secure API bridge
  - `src/index.html` (22KB) - DOM structure with all toolbars
  - `src/styles.css` (27KB) - All styling

**tests/**
- Purpose: Jest test suites organized by process
- Contains: Unit tests for each component, mocks for Electron APIs
- Key files:
  - `tests/main/main.test.js` - Main process window/IPC tests
  - `tests/renderer/notes.test.js` - Multi-note navigation tests
  - `tests/renderer/settings.test.js` - Settings management tests
  - `tests/renderer/history.test.js` - Undo/redo tests
  - `tests/mocks/electron.js` - Mock Electron APIs
  - `tests/mocks/fs.js` - Mock fs module

**.planning/codebase/**
- Purpose: Orchestrated documentation from `/gsd:map-codebase` command
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

## Key File Locations

**Entry Points:**
- `src/main.js`: Electron main process (entry via package.json "main" field)
- `src/renderer.js`: Glassboard class instantiated when index.html loads
- `bin/floatnote.js`: CLI launcher (entry via package.json "bin" field)

**Configuration:**
- `package.json`: Dependencies, scripts, build config
- `jest.config.js`: Test configuration with 4 projects (main, renderer, cli, preload)
- `src/index.html`: HTML structure defining UI zones and elements

**Core Logic:**
- `src/renderer.js`: 111KB monolithic class - drawing canvas, text editing, note management
- `src/main.js`: 19KB - window lifecycle, shortcuts, IPC handlers, file persistence
- `src/preload.js`: 2.7KB - safe API exposure via contextBridge

**Testing:**
- `tests/main/main.test.js`: 80+ lines covering window creation, IPC handlers
- `tests/renderer/notes.test.js`: Multi-note navigation and creation
- `tests/renderer/settings.test.js`: Settings persistence
- `tests/renderer/history.test.js`: Undo/redo state machine
- `tests/mocks/electron.js`: Complete Electron API mock

**Styling:**
- `src/styles.css`: 27KB single file with all styles (no preprocessor)

## Naming Conventions

**Files:**
- `*.js`: JavaScript source files and tests
- `.test.js`: Jest test files (collocated with source in tests/ by project)
- `*.html`: Single index.html for UI
- `*.css`: Single styles.css for all styling
- `*.png`: Icon files (embedded as base64 in main.js)

**Directories:**
- Kebab-case for config files: `jest.config.js`
- Lowercase single-word dirs: `src/`, `bin/`, `tests/`
- Lowercase organized by process: `tests/main/`, `tests/renderer/`, `tests/preload/`
- Plural: `tests/`, `src/` (convention, not enforced)

**CSS Classes:**
- Kebab-case: `.pin-toggle`, `.dropdown-menu`, `.text-item`, `.format-bar`
- Prefix with functionality: `.tool-btn` (toolbar button), `.size-label` (size dropdown)
- State classes: `.active`, `.visible`, `.selected`

**JavaScript Variables:**
- camelCase for properties: `currentNoteIndex`, `isDrawing`, `selectedTextId`
- camelCase for methods: `saveState()`, `loadCurrentNote()`, `autoSave()`
- CONST case for constants: Rare, most configuration is in settings object
- Private convention: None enforced, but prefixed with `_` not used

**HTML Elements:**
- kebab-case IDs: `#draw-canvas`, `#text-container`, `#toolbar`, `#note-indicator`
- data- attributes: `data-id`, `data-color`, `data-size`, `data-format`
- Semantic grouping: `.toolbar-group`, `.dropdown-container`

## Where to Add New Code

**New Feature (Drawing/Text/Image Enhancement):**
- Primary code: Add methods to `Glassboard` class in `src/renderer.js`
- UI markup: Add to appropriate section in `src/index.html` (toolbar/settings)
- Styling: Add to `src/styles.css` (organize by section: canvas, toolbar, text, settings)
- Tests: `tests/renderer/*.test.js` appropriate file
- Main process logic: `src/main.js` IPC handlers if needed
- Export: Update `src/preload.js` if new API needed

**New Component/Module:**
- Implementation: Add method to `Glassboard` class OR create helper functions at bottom of `src/renderer.js`
- No separate module system in use - monolithic architecture
- If complex: Extract helper functions to end of renderer.js before class definition
- Tests: Corresponding file in `tests/renderer/`

**Settings/Configuration:**
- Add property to `this.settings` object (line 46-56 in renderer.js)
- Add UI control in settings section of `src/index.html`
- Bind event handler in `setupSettings()` method (line 2410+)
- Persists automatically via `saveData()` on change

**Keyboard Shortcuts:**
- Add binding in `setupKeyboardShortcuts()` method (line 1850+)
- Register global shortcut in `src/main.js` via `globalShortcut.register()`
- Add documentation to tray menu shortcuts list (main.js line 215-236)

**Data Persistence:**
- Default: Auto-save debounced to JSON in `~/.config/floatnote/floatnote-data.json`
- Optional: Per-note export to `~/.floatnote/note-{id}.json` via `exportToFloatnote()`
- Manual export: PNG via `exportAsPNG()` and file save dialog
- IPC handlers: `src/main.js` lines 389-451

**Utilities:**
- Shared helpers: Add as methods to `Glassboard` class
- Math/geometry helpers: Add as arrow functions at top of `src/renderer.js`
- No separate utils directory - all in single renderer.js file

**Tests:**
- Unit tests for renderer logic: `tests/renderer/{feature}.test.js`
- Main process tests: `tests/main/main.test.js`
- CLI tests: `tests/cli/floatnote.test.js`
- Use Jest describe/test blocks, jest.fn() for mocks
- Mock Electron APIs via `jest.mock('electron', () => require('./mocks/electron'))`

## Special Directories

**coverage/**
- Purpose: Code coverage reports from Jest
- Generated: Yes (npm run test:coverage)
- Committed: No (in .gitignore)

**dist/**
- Purpose: Built electron-builder DMG/ZIP distributions
- Generated: Yes (npm run build)
- Committed: No

**.build/ and .npm-cache/**
- Purpose: Build artifacts and npm cache
- Generated: Yes
- Committed: No

**.git/**
- Purpose: Git repository metadata
- Committed: Yes

**.claude/**
- Purpose: Claude Code environment (not part of source)
- Committed: No (project-specific)

## Loading and Initialization Order

1. `package.json` main field → `src/main.js` (Node.js process)
2. `src/main.js` calls `app.whenReady()` → sets up window, shortcuts, tray
3. `new BrowserWindow()` → loads `src/index.html`
4. `src/index.html` loads `src/styles.css` + `<script src="src/renderer.js">`
5. `src/main.js` preload option → loads `src/preload.js` before DOM scripts
6. `src/renderer.js` instantiates `new Glassboard()` → calls `.init()`
7. Glassboard.init() sets up all event handlers and loads saved data

## CLI Launch Process

1. User runs `floatnote` command (via npm bin or global install)
2. `bin/floatnote.js` executes (Node.js)
3. Fetches latest release from GitHub API
4. Downloads `.zip` if version differs or app missing
5. Extracts to `~/.floatnote/Floatnote.app`
6. Creates symlink in `~/Applications/`
7. Calls `spawn('open', [appPath])` to launch

---

*Structure analysis: 2026-01-22*
