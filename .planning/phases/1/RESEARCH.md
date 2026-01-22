# Phase 1: Integration Tests - Research

**Researched:** 2026-01-22
**Domain:** Electron IPC testing, Jest integration patterns
**Confidence:** HIGH

## Summary

This research investigates how to write integration tests that verify IPC communication contracts between Floatnote's main process, preload bridge, and renderer. The existing tests are purely unit tests that re-implement mock logic rather than importing actual source modules. The integration tests need to actually require `main.js` and `preload.js`, capture the handlers they register, and verify the round-trip behavior.

The key challenge is that `main.js` is a side-effect-heavy module: it calls `app.getPath()`, `app.requestSingleInstanceLock()`, registers IPC handlers via `ipcMain.on/handle`, and creates windows -- all at module load time. Integration tests must mock `electron` at the module level (already supported by the existing `moduleNameMapper`) but then capture the actual handler functions registered to `ipcMain`.

**Primary recommendation:** Create a new `integration` Jest project that uses a smarter electron mock which captures IPC handler registrations, then exercises those actual handlers against a mock filesystem to verify full round-trips.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jest | ^29.7.0 | Test framework | Already in use, no change needed |
| jest-environment-jsdom | ^29.7.0 | DOM simulation for renderer tests | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| memfs | ^4.x | In-memory filesystem | Replace fs calls in integration tests without touching disk |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| memfs | jest.mock('fs') manual | memfs gives real fs semantics; manual mock is simpler but less realistic |
| New jest project | Same `main` project | Separate project gives clear isolation of unit vs integration tests |

**Installation:**
```bash
npm install --save-dev memfs
```

Note: `memfs` is optional. The simpler approach (recommended for this project's size) is to use `jest.mock('fs')` with jest.fn() implementations that store data in local variables. This avoids an extra dependency while still testing actual handler logic.

## Architecture Patterns

### Recommended Test Structure
```
tests/
├── integration/
│   ├── ipc-handlers.test.js       # TEST-01: Main process IPC handler round-trips
│   └── preload-bridge.test.js     # TEST-02: Preload bridge API verification
├── main/
│   └── main.test.js               # (existing, unchanged)
├── preload/
│   └── preload.test.js            # (existing, unchanged)
├── renderer/
│   └── ...                        # (existing, unchanged)
└── mocks/
    └── electron.js                # (existing, enhanced with handler capture)
```

### Pattern 1: Handler Capture Mock

**What:** An enhanced electron mock where `ipcMain.handle()` and `ipcMain.on()` store their handler functions in a retrievable map, so tests can invoke the actual handlers directly.

**When to use:** When testing IPC handlers that are registered as side effects of requiring main.js.

**Example:**
```javascript
// tests/mocks/electron-integration.js (or inline in test setup)
const handlers = {};
const listeners = {};

const ipcMain = {
  handle: jest.fn((channel, handler) => {
    handlers[channel] = handler;
  }),
  on: jest.fn((channel, handler) => {
    listeners[channel] = handler;
  })
};

// Export so tests can invoke handlers directly
module.exports.getHandler = (channel) => handlers[channel];
module.exports.getListener = (channel) => listeners[channel];
```

### Pattern 2: IPC Round-Trip Test

**What:** Load main.js (which registers handlers via mock ipcMain), then invoke the captured handlers with mock event objects, and verify the return value and side effects.

**When to use:** For testing save-data, load-data, export-to-floatnote, export-png, open-floatnote-folder.

**Example:**
```javascript
// After requiring main.js, handlers are captured
const saveHandler = getHandler('save-data');
const loadHandler = getHandler('load-data');

// Create mock event (needed for handlers that use event.sender)
const mockEvent = {
  sender: { /* webContents mock */ }
};

// Test round-trip
const testData = { notes: [{ id: '1', lines: [] }], settings: {} };
const saveResult = await saveHandler(mockEvent, testData);
expect(saveResult).toEqual({ success: true });

const loadResult = await loadHandler(mockEvent);
expect(loadResult.success).toBe(true);
expect(loadResult.data).toEqual(testData);
```

### Pattern 3: Preload Bridge Contract Test

**What:** Require actual preload.js (with electron mock), capture what contextBridge.exposeInMainWorld receives, then verify the API object matches what renderer.js actually calls.

**When to use:** For TEST-02 - verifying the preload bridge exposes all needed APIs.

**Example:**
```javascript
// The electron mock's contextBridge.exposeInMainWorld is a jest.fn()
// After requiring preload.js, we can get the exposed API:
require('../../src/preload.js');

const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];

// Verify all methods renderer.js calls exist
expect(exposedAPI.saveData).toBeInstanceOf(Function);
expect(exposedAPI.loadData).toBeInstanceOf(Function);
expect(exposedAPI.closeWindow).toBeInstanceOf(Function);
// ... etc
```

### Anti-Patterns to Avoid
- **Re-implementing handler logic in tests:** The existing main.test.js creates its own mock fs and manually calls writeFileSync -- this tests the mock, not the actual handler. Integration tests must import the actual source.
- **Testing ipcRenderer.send was called without testing the main side:** Verifying `send('close-window')` was called only proves the preload bridge works, not that main.js actually handles it.
- **Launching Electron for IPC tests:** Real Electron windows are slow and flaky in CI. All tests should use mocked electron modules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Filesystem for save/load tests | Real disk I/O | In-memory store via jest.mock('fs') | Tests are fast, isolated, no cleanup needed |
| IPC handler extraction | Manual copy-paste of handler code | Require actual main.js with mock ipcMain | Tests real code, catches regressions |
| API surface enumeration | Manually listing APIs | Grep renderer.js for window.glassboard.* calls | Single source of truth |

**Key insight:** The existing tests in `tests/main/main.test.js` never actually `require('../../src/main.js')`. They rebuild mock objects from scratch and test the mock's behavior. This means they cannot catch regressions in the actual handlers. Integration tests MUST require the actual source files.

## Common Pitfalls

### Pitfall 1: Module-level side effects in main.js
**What goes wrong:** `require('../../src/main.js')` immediately calls `app.getPath()`, `app.requestSingleInstanceLock()`, and `app.whenReady()`. If the mock doesn't handle these, the require fails.
**Why it happens:** Electron apps initialize at module load time, not in exported functions.
**How to avoid:** Ensure the electron mock handles ALL module-level calls:
- `app.getPath('userData')` -> returns a fake path
- `app.getPath('home')` -> returns a fake path
- `app.requestSingleInstanceLock()` -> returns true
- `app.whenReady()` -> returns a resolved Promise
- `BrowserWindow.getAllWindows()` -> returns []
**Warning signs:** "Cannot read property of undefined" errors on require.

### Pitfall 2: Handler capture timing
**What goes wrong:** Tests try to get handlers before requiring main.js.
**Why it happens:** Jest moduleNameMapper replaces electron before test code runs, but handlers are registered when main.js is required.
**How to avoid:** Require main.js at the top of the test file or in beforeAll, THEN access captured handlers.
**Warning signs:** `getHandler('save-data')` returns undefined.

### Pitfall 3: Async handler testing
**What goes wrong:** `ipcMain.handle` handlers are async and return Promises. Tests that don't await will pass silently even when the handler throws.
**Why it happens:** Jest doesn't automatically fail on unhandled promise rejections in older configs.
**How to avoid:** Always `await` handler calls; use `expect(...).resolves` or try/catch patterns.
**Warning signs:** Tests pass but coverage shows handler error paths never executed.

### Pitfall 4: fs mock state leaking between tests
**What goes wrong:** A save test writes data that a subsequent load test reads, making tests order-dependent.
**Why it happens:** If using a shared mock fs store, state persists across tests.
**How to avoid:** Clear the mock fs store in beforeEach, or use isolated store per test.
**Warning signs:** Tests pass individually but fail when run together (or vice versa).

### Pitfall 5: BrowserWindow.fromWebContents in handlers
**What goes wrong:** The `export-png`, `close-window`, `hide-window`, `set-pinned`, `set-window-size`, and `resize-window-left` handlers call `BrowserWindow.fromWebContents(event.sender)`. If this returns null/undefined, tests fail.
**Why it happens:** Mock event objects don't automatically wire up to BrowserWindow.
**How to avoid:** Mock `BrowserWindow.fromWebContents` to return a mock window object.
**Warning signs:** "Cannot read property 'setAlwaysOnTop' of null" in test output.

### Pitfall 6: Stale preload bridge API
**What goes wrong:** renderer.js calls a window.glassboard method that preload.js doesn't expose (or vice versa).
**Why it happens:** Someone adds a feature to renderer.js but forgets to add the bridge method in preload.js.
**How to avoid:** The preload-bridge contract test should programmatically grep renderer.js for all `window.glassboard.*` calls and verify each exists in the exposed API.
**Warning signs:** Runtime errors in the app ("window.glassboard.newMethod is not a function").

## Code Examples

### Complete IPC Handler Integration Test Structure

```javascript
// tests/integration/ipc-handlers.test.js

const path = require('path');

// In-memory file store for fs mock
let fileStore = {};

// Mock fs before requiring main.js
jest.mock('fs', () => ({
  existsSync: jest.fn((filePath) => filePath in fileStore),
  readFileSync: jest.fn((filePath, encoding) => {
    if (!(filePath in fileStore)) throw new Error('ENOENT: no such file');
    return fileStore[filePath];
  }),
  writeFileSync: jest.fn((filePath, content) => {
    fileStore[filePath] = content;
  }),
  mkdirSync: jest.fn()
}));

// Capture IPC handlers
const handlers = {};
const listeners = {};

const mockBrowserWindow = {
  setAlwaysOnTop: jest.fn(),
  setBounds: jest.fn(),
  getBounds: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
  close: jest.fn(),
  hide: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  // ... other methods as needed
};

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn((name) => {
      if (name === 'userData') return '/mock/userData';
      if (name === 'home') return '/mock/home';
      return '/mock/path';
    }),
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    quit: jest.fn(),
    exit: jest.fn(),
    requestSingleInstanceLock: jest.fn(() => true),
    dock: { setIcon: jest.fn() }
  },
  BrowserWindow: Object.assign(jest.fn(() => mockBrowserWindow), {
    fromWebContents: jest.fn(() => mockBrowserWindow),
    getAllWindows: jest.fn(() => [])
  }),
  ipcMain: {
    handle: jest.fn((channel, handler) => { handlers[channel] = handler; }),
    on: jest.fn((channel, handler) => { listeners[channel] = handler; })
  },
  globalShortcut: { register: jest.fn(), unregisterAll: jest.fn() },
  screen: {
    getCursorScreenPoint: jest.fn(() => ({ x: 500, y: 500 })),
    getDisplayNearestPoint: jest.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 },
      workArea: { x: 0, y: 0 }
    }))
  },
  dialog: {
    showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
    showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/test/export.png' }))
  },
  shell: { openPath: jest.fn(() => Promise.resolve('')) },
  Tray: jest.fn(() => ({ setToolTip: jest.fn(), on: jest.fn(), popUpContextMenu: jest.fn() })),
  Menu: { buildFromTemplate: jest.fn(() => ({})) },
  nativeImage: { createFromDataURL: jest.fn(() => ({ setTemplateImage: jest.fn() })) }
}));

// NOW require main.js - this registers all handlers
require('../../src/main.js');

describe('IPC Handler Integration Tests', () => {
  const mockEvent = {
    sender: {} // webContents mock
  };

  beforeEach(() => {
    fileStore = {}; // Reset file store
    jest.clearAllMocks();
  });

  describe('save-data / load-data round-trip', () => {
    test('saves data and loads it back', async () => {
      const testData = {
        notes: [{ id: '1', lines: [], textItems: [], images: [] }],
        settings: { penColor: '#ffffff' }
      };

      const saveResult = await handlers['save-data'](mockEvent, testData);
      expect(saveResult).toEqual({ success: true });

      const loadResult = await handlers['load-data'](mockEvent);
      expect(loadResult.success).toBe(true);
      expect(loadResult.data).toEqual(testData);
    });

    test('load-data returns null when no file exists', async () => {
      const result = await handlers['load-data'](mockEvent);
      expect(result).toEqual({ success: true, data: null });
    });
  });
});
```

### Complete Preload Bridge Contract Test Structure

```javascript
// tests/integration/preload-bridge.test.js

jest.mock('electron', () => require('../mocks/electron'));

const { contextBridge, ipcRenderer } = require('electron');

// Require actual preload
require('../../src/preload.js');

describe('Preload Bridge Contract Tests', () => {
  let exposedAPI;

  beforeAll(() => {
    // contextBridge.exposeInMainWorld was called with ('glassboard', apiObject)
    expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith(
      'glassboard',
      expect.any(Object)
    );
    exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];
  });

  describe('API completeness', () => {
    // All methods renderer.js actually calls via window.glassboard.*
    const requiredMethods = [
      'onFocusChange',
      'onWindowToggledOpen',
      'closeWindow',
      'hideWindow',
      'setPinned',
      'setWindowSize',
      'getClipboardContent',
      'saveData',
      'loadData',
      'resizeWindowLeft',
      'exportToFloatnote',
      'openFloatnoteFolder',
      'exportPNG',
      'openFile',
    ];

    test.each(requiredMethods)('exposes %s', (method) => {
      expect(exposedAPI[method]).toBeDefined();
      expect(typeof exposedAPI[method]).toBe('function');
    });
  });

  describe('IPC channel mapping', () => {
    test('closeWindow sends close-window', () => {
      exposedAPI.closeWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith('close-window');
    });

    test('saveData invokes save-data', async () => {
      const data = { notes: [] };
      await exposedAPI.saveData(data);
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('save-data', data);
    });
  });
});
```

## IPC Channel Inventory

Complete mapping of IPC channels in the codebase:

### ipcMain.handle (request/response via invoke)
| Channel | Args | Returns | Used in renderer |
|---------|------|---------|-----------------|
| `save-data` | data object | `{ success, error? }` | Yes - saveData() |
| `load-data` | none | `{ success, data?, error? }` | Yes - loadSavedData() |
| `export-to-floatnote` | noteData | `{ success, path?, error? }` | Yes - saveData() autoSave |
| `open-floatnote-folder` | none | `{ success, error? }` | Yes - openFloatnoteFolder() |
| `export-png` | imageDataUrl | `{ success, path?, canceled?, error? }` | Yes - exportAsPNG() |

### ipcMain.on (fire-and-forget via send)
| Channel | Args | Effect | Used in renderer |
|---------|------|--------|-----------------|
| `close-window` | none | Calls win.close() | Yes |
| `hide-window` | none | Calls win.hide() | Yes |
| `set-pinned` | boolean | win.setAlwaysOnTop(pinned) | Yes |
| `set-window-size` | 'sm'/'md'/'lg' | win.setBounds(...) | Yes |
| `resize-window-left` | deltaX number | Adjusts window left edge | Yes |
| `open-file` | filePath string | shell.openPath(filePath) | Yes |

### Events from main to renderer (webContents.send)
| Channel | Args | When |
|---------|------|------|
| `window-focus` | boolean | Window focus/blur events |
| `window-toggled-open` | none | Toggle shortcut shows window |

## Preload API Inventory

Complete list of methods exposed via `window.glassboard`:

| Method | Type | IPC Channel | Direction |
|--------|------|-------------|-----------|
| `onFocusChange(cb)` | listener | `window-focus` | main -> renderer |
| `onWindowToggledOpen(cb)` | listener | `window-toggled-open` | main -> renderer |
| `closeWindow()` | send | `close-window` | renderer -> main |
| `hideWindow()` | send | `hide-window` | renderer -> main |
| `setPinned(bool)` | send | `set-pinned` | renderer -> main |
| `setWindowSize(size)` | send | `set-window-size` | renderer -> main |
| `getClipboardContent()` | local | N/A (uses clipboard directly) | local |
| `readClipboardImage()` | local | N/A | local |
| `readClipboardText()` | local | N/A | local |
| `saveData(data)` | invoke | `save-data` | renderer -> main |
| `loadData()` | invoke | `load-data` | renderer -> main |
| `resizeWindowLeft(delta)` | send | `resize-window-left` | renderer -> main |
| `exportToFloatnote(data)` | invoke | `export-to-floatnote` | renderer -> main |
| `openFloatnoteFolder()` | invoke | `open-floatnote-folder` | renderer -> main |
| `exportPNG(dataUrl)` | invoke | `export-png` | renderer -> main |
| `openFile(path)` | send | `open-file` | renderer -> main |

## Renderer Usage Inventory

All `window.glassboard.*` calls found in renderer.js:

| Call | Location (approx line) | Context |
|------|------------------------|---------|
| `setPinned(bool)` | 387, 397 | Settings pin checkbox |
| `setWindowSize(size)` | 418, 1488, 1494, 1500 | Size shortcuts |
| `onWindowToggledOpen(cb)` | 735 | Toggle open handler |
| `closeWindow()` | 1326 | Cmd+W handler |
| `hideWindow()` | 1516 | Quick-hide shortcut |
| `onFocusChange(cb)` | 1526, 1921 | Focus glow effect |
| `openFile(path)` | 2101 | Open attachment |
| `getClipboardContent()` | 2138 | Paste handler |
| `saveData(data)` | 2846 | Auto-save |
| `exportToFloatnote(data)` | 2850 | Auto-export |
| `exportPNG(dataUrl)` | 2911 | PNG export |
| `openFloatnoteFolder()` | 2924 | Open folder |
| `loadData()` | 2932 | Load on startup |
| `resizeWindowLeft(delta)` | 3059 | Left-edge drag resize |

## Jest Configuration for Integration Tests

Add a new project entry to `jest.config.js`:

```javascript
{
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/mocks/electron-integration.js'
  }
}
```

**Key decisions:**
- Node environment (not jsdom) since integration tests exercise main-process code
- Separate mock file (`electron-integration.js`) to avoid breaking existing tests
- Could also use inline jest.mock() in each test file to avoid a separate mock file

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spectron (deprecated) | Playwright/Electron or mock-based | 2022 | Mock-based is simpler for IPC tests |
| electron-rebuild test utils | jest.mock('electron') | Ongoing | No special tooling needed |
| Testing handler copies | Requiring actual modules | Best practice | Catches real regressions |

**Deprecated/outdated:**
- Spectron: Selenium-based Electron test tool, deprecated in 2022. Not needed for IPC-level tests.
- @electron/remote: Sometimes used in older test patterns, not relevant here.

## Open Questions

1. **Should integration tests use the same electron mock or a new one?**
   - What we know: The existing mock (`tests/mocks/electron.js`) uses simple jest.fn() that don't capture handlers.
   - What's unclear: Whether enhancing the existing mock would break current tests.
   - Recommendation: Use inline `jest.mock('electron', () => ...)` in integration test files rather than a shared mock file. This keeps integration tests self-contained and avoids changing existing infrastructure.

2. **Should we use memfs or simple jest.mock('fs')?**
   - What we know: The project has no other dependencies beyond electron/jest. The fs usage is straightforward (writeFileSync/readFileSync/existsSync/mkdirSync).
   - What's unclear: Whether edge cases in fs behavior matter (e.g., encoding, error objects).
   - Recommendation: Use simple jest.mock('fs') with an in-memory store object. The handlers only use basic fs operations and the mock can accurately simulate them. Skip memfs to avoid adding a dependency.

## Sources

### Primary (HIGH confidence)
- `/Users/jose/Developer/floatnote/src/main.js` - All IPC handlers, module-level initialization
- `/Users/jose/Developer/floatnote/src/preload.js` - Complete bridge API
- `/Users/jose/Developer/floatnote/src/renderer.js` - All window.glassboard.* usage (grep)
- `/Users/jose/Developer/floatnote/jest.config.js` - Existing test projects/configuration
- `/Users/jose/Developer/floatnote/tests/mocks/electron.js` - Existing mock structure
- `/Users/jose/Developer/floatnote/tests/main/main.test.js` - Existing test patterns to improve upon
- `/Users/jose/Developer/floatnote/tests/preload/preload.test.js` - Existing preload test patterns

### Secondary (MEDIUM confidence)
- Jest 29 documentation (moduleNameMapper, projects configuration) - from training data, verified against existing config

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses only existing tools (Jest 29), no new dependencies required
- Architecture: HIGH - Pattern derived directly from source code analysis of actual IPC registration
- Pitfalls: HIGH - Identified from actual module structure (side effects, mock requirements)
- IPC inventory: HIGH - Exhaustive grep/read of all three source files

**Research date:** 2026-01-22
**Valid until:** Stable (project architecture unlikely to change rapidly)
