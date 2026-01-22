# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `/Users/jose/Developer/floatnote/jest.config.js`

**Assertion Library:**
- Jest built-in matchers (`expect()`)

**Run Commands:**
```bash
npm test              # Run all tests across all projects
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npx jest --selectProjects=renderer  # Run specific project
npx jest tests/renderer/notes.test.js  # Run single file
```

## Test File Organization

**Location:**
- Tests co-located in `/Users/jose/Developer/floatnote/tests/` directory (separate from source)
- Organized by process type: `tests/main/`, `tests/renderer/`, `tests/preload/`, `tests/cli/`

**Naming:**
- All test files end with `.test.js`
- File names mirror source file names: `main.test.js` for `src/main.js`, `preload.test.js` for `src/preload.js`

**Structure:**
```
tests/
├── main/
│   └── main.test.js              # Main process tests
├── renderer/
│   ├── notes.test.js             # Multi-note system
│   ├── settings.test.js          # Settings management
│   └── history.test.js           # Undo/redo history
├── cli/
│   └── floatnote.test.js         # CLI utility tests
├── preload/
│   └── preload.test.js           # IPC bridge tests
└── mocks/
    └── electron.js               # Electron API mock
```

## Test Structure

**Suite Organization:**
```javascript
describe('Main Process', () => {
  let mockBrowserWindow;
  let mockApp;

  beforeEach(() => {
    jest.clearAllMocks();
    // Create fresh mocks for each test
    mockBrowserWindow = { /* ... */ };
    mockApp = { /* ... */ };
  });

  describe('Data storage paths', () => {
    test('should use correct user data path', () => {
      // Arrange
      const userDataPath = mockApp.getPath('userData');

      // Act & Assert
      expect(userDataPath).toBe('/mock/userData');
    });
  });
});
```

**Patterns:**
- Top-level `describe()` wraps entire test file
- Nested `describe()` blocks group related tests by feature/component
- `beforeEach()` hooks reset mocks and set up fresh state for each test
- Test naming follows "should X when Y" pattern: `test('should create a new note with correct structure', ...)`
- Arrange-Act-Assert structure implied (setup in beforeEach, single action, then assertion)

## Mocking

**Framework:** Jest `jest.fn()` and `jest.mock()`

**Patterns:**

### Manual Mocks (Electron):
```javascript
mockBrowserWindow = {
  loadFile: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  isDestroyed: jest.fn(() => false),
  webContents: {
    send: jest.fn()
  }
};
```

### Module Mocks (fs, https, child_process):
```javascript
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));
```

### Mock Configuration in Jest Project:
File: `jest.config.js`
```javascript
{
  displayName: 'main',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/main/**/*.test.js'],
  moduleNameMapper: {
    '^electron$': '<rootDir>/tests/mocks/electron.js'  // Route electron requires to mock
  }
}
```

**What to Mock:**
- External modules (Electron, fs, https, child_process)
- Async APIs (Promise-based operations)
- System calls (file I/O, network requests, clipboard access)
- Third-party library calls

**What NOT to Mock:**
- Core logic being tested
- Simple built-in operations (Math, Date, string operations)
- Internal class methods (unless testing isolation)
- Pure functions

## Fixtures and Factories

**Test Data:**

Note fixture pattern:
```javascript
const newNote = {
  id: Date.now().toString(),
  lines: [],
  textItems: [],
  images: [],
  createdAt: Date.now(),
  lastModified: Date.now()
};
```

Settings fixture:
```javascript
const mockSettings = {
  pinchZoom: true,
  pan: true,
  rotate: true,
  showZoomControls: true,
  openWithCleanSlate: false,
  activeBgMode: 'transparent',
  inactiveBgMode: 'transparent',
  activeOpacity: 100,
  inactiveOpacity: 50,
  autoSaveToFolder: false
};
```

BrowserWindow bounds calculation for testing:
```javascript
const bounds = { x: 1000, y: 0, width: 400, height: 600 };
const screenWidth = 1920;
const screenHeight = 1080;
```

**Location:**
- Fixtures defined inline in `beforeEach()` hooks (`tests/renderer/settings.test.js` lines 7-20)
- Data objects created within test cases for specific scenarios
- Mock objects defined at top of each test file in beforeEach

## Coverage

**Requirements:** Not enforced

**Configuration:**
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    statements: 0,
    branches: 0,
    functions: 0,
    lines: 0
  }
}
```

All thresholds set to 0 (no minimum coverage requirement).

**View Coverage:**
```bash
npm run test:coverage
# Generates: coverage/ directory with HTML report
# Open: coverage/lcov-report/index.html
```

**Collected files:**
```javascript
collectCoverageFrom: [
  'src/**/*.js',
  'bin/**/*.js',
  '!**/node_modules/**'
]
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and methods
- Approach: Test isolated logic with mocked dependencies
- Example: `tests/renderer/notes.test.js` - tests note creation, navigation, state management
- Pattern: Setup state → call method → assert result

**Integration Tests:**
- Scope: IPC communication and data persistence
- Approach: Test how main and preload interact through mocked IPC
- Example: `tests/preload/preload.test.js` - tests IPC method invocation
- Pattern: Simulate IPC calls → verify correct channel and data passed

**E2E Tests:**
- Framework: Not used
- Alternative: Manual testing with `npm start` and `npm run dev`

## Common Patterns

**Async Testing:**
```javascript
test('should show save dialog', async () => {
  await mockDialog.showSaveDialog(mockBrowserWindow, {
    title: 'Export Note as PNG',
    defaultPath: 'floatnote.png'
  });
  expect(mockDialog.showSaveDialog).toHaveBeenCalled();
});

test('should invoke invoke-based IPC', async () => {
  const data = { notes: [], settings: {} };
  await exposedAPI.saveData(data);
  expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-data', data);
});
```

**Error Testing:**
```javascript
test('should return null when clipboard is empty', () => {
  mockClipboard.availableFormats.mockReturnValue([]);
  const result = exposedAPI.getClipboardContent();
  expect(result).toBeNull();
});

test('should handle file not exists case', () => {
  mockFs.existsSync.mockReturnValue(false);
  const exists = mockFs.existsSync('/mock/path');
  expect(exists).toBe(false);
});
```

**State Mutation Testing:**
```javascript
test('should update pinchZoom setting', () => {
  mockSettings.pinchZoom = false;
  expect(mockSettings.pinchZoom).toBe(false);
});

test('should save current note state before switching', () => {
  const currentNote = { id: 'note-1', lines: [{ id: 'line-1' }] };
  notes.push(currentNote);
  notes[currentNoteIndex] = { ...currentNote };
  expect(notes[0].lines.length).toBe(1);
});
```

**List/Collection Testing:**
```javascript
test('should add state to history', () => {
  const state = { lines: [], textItems: [], images: [] };
  history.push(JSON.stringify(state));
  historyIndex = 0;

  expect(history.length).toBe(1);
  expect(historyIndex).toBe(0);
});

test('should trim history when exceeding max', () => {
  for (let i = 0; i < MAX_HISTORY + 10; i++) {
    history.push(JSON.stringify({ lines: [i] }));
  }

  if (history.length > MAX_HISTORY) {
    history = history.slice(-MAX_HISTORY);
    historyIndex = Math.min(historyIndex, history.length - 1);
  }

  expect(history.length).toBe(MAX_HISTORY);
});
```

## Jest Project Configuration

The codebase uses Jest's `projects` feature to run tests in different environments:

**Main Process:**
- Environment: Node
- Mocks Electron at `tests/mocks/electron.js`
- Tests: `tests/main/**/*.test.js`

**Renderer:**
- Environment: jsdom (browser-like DOM)
- No mocked modules
- Tests: `tests/renderer/**/*.test.js`

**CLI:**
- Environment: Node
- No special mocking
- Tests: `tests/cli/**/*.test.js`

**Preload:**
- Environment: Node
- Mocks Electron at `tests/mocks/electron.js`
- Tests: `tests/preload/**/*.test.js`

Select specific project:
```bash
npx jest --selectProjects=renderer
npx jest --selectProjects=main,preload
```

---

*Testing analysis: 2026-01-22*
