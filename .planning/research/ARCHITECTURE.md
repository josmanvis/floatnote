# Architecture: Testing, CI/CD, and npm Publishing

**Domain:** Electron desktop app testing + CI/CD + npm publishing
**Researched:** 2026-01-22
**Overall confidence:** HIGH (based on established Electron ecosystem patterns, verified against project structure)

## System Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              GitHub Repository              │
                    │                                             │
                    │  push/PR ─────► GitHub Actions CI           │
                    │                    │                        │
                    │                    ├── Lint (optional)      │
                    │                    ├── Unit Tests (Jest)    │
                    │                    └── Coverage Report      │
                    │                                             │
                    │  tag/release ──► GitHub Actions Release     │
                    │                    │                        │
                    │                    ├── Build (electron-     │
                    │                    │    builder DMG+ZIP)    │
                    │                    ├── Upload to Release    │
                    │                    └── Publish to npm       │
                    │                                             │
                    └─────────────────────────────────────────────┘
                                         │
                         ┌───────────────┼───────────────┐
                         ▼               ▼               ▼
                    GitHub Release   npm Registry    Coverage
                    (DMG, ZIP)       (CLI only)      (lcov report)
                         │               │
                         ▼               ▼
                    Direct download   npx floatnote
                    from Releases     (downloads from Releases)
```

## Component Boundaries

| Component | Responsibility | Inputs | Outputs |
|-----------|---------------|--------|---------|
| **Jest Unit Tests** | Validate logic correctness | Source code, mocks | Pass/fail, coverage data |
| **CI Pipeline (test)** | Run tests on every change | Push/PR event | Status check (pass/fail) |
| **CI Pipeline (build)** | Build macOS distributable | Tag/release event | DMG + ZIP artifacts |
| **CI Pipeline (publish)** | Publish CLI to npm | Successful build | npm package version |
| **electron-builder** | Package Electron app | src/, package.json | DMG, ZIP in dist/ |
| **npm package** | Distribute CLI launcher | bin/floatnote.js, package.json | npx-runnable CLI |

---

## 1. Test Architecture

### Test Layers (What to Test Where)

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 4: E2E (NOT recommended for this project)                │
│   - Would require Spectron/Playwright+Electron                 │
│   - Overkill for single-window overlay app                     │
│   - Manual testing sufficient for UI interactions              │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ Layer 3: Integration Tests (IPC round-trips)                   │
│   - Main ↔ Preload IPC channel contracts                      │
│   - Data persistence (save → load round-trip)                  │
│   - Window state transitions                                   │
│   Tests: tests/preload/, tests/main/ (IPC handlers)            │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ Layer 2: Component Tests (renderer logic units)                │
│   - Glassboard class methods (drawing, selection, transforms)  │
│   - Note management (create, navigate, delete)                 │
│   - History system (undo, redo, max size)                      │
│   - Settings mutations                                         │
│   Tests: tests/renderer/                                       │
└────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────┐
│ Layer 1: Pure Unit Tests (logic functions)                     │
│   - CLI utility functions (formatBytes, version compare)       │
│   - Data serialization/deserialization                         │
│   - Coordinate math (zoom, pan transforms)                     │
│   Tests: tests/cli/, extracted pure functions                  │
└────────────────────────────────────────────────────────────────┘
```

### Mocking Strategy

**Current state:** Tests mock at the boundary level (recreating logic inline) rather than testing actual source code. This means low actual code coverage despite tests passing.

**Recommended approach:** Test actual source code with dependencies mocked at process boundaries.

| Boundary | Mock Strategy | Implementation |
|----------|--------------|----------------|
| Electron APIs | `moduleNameMapper` pointing to `tests/mocks/electron.js` | Already done for main/preload projects |
| DOM/Canvas | `jsdom` environment + canvas mock | jsdom configured; canvas needs `jest-canvas-mock` or manual mock |
| File system | `jest.mock('fs')` per test file | Already done in CLI tests |
| Network (https) | `jest.mock('https')` per test file | Already done in CLI tests |
| Clipboard | Mock via preload bridge mock | Already done in preload tests |
| `window.glassboard` | Global mock in renderer test setup | Needs: setupFiles or beforeAll |

**Key gap:** The renderer tests currently test data structure logic in isolation (creating note objects, navigating arrays). They do NOT import or test the actual `Glassboard` class. To test real renderer code:

1. Extract testable pure functions from the 3000-line Glassboard class
2. OR test Glassboard methods by requiring renderer.js in jsdom with mocked DOM elements
3. Canvas context needs mocking: `jest-canvas-mock` package or manual `getContext('2d')` stub

### What to Test (Priority Order)

| Priority | What | Why | Jest Project |
|----------|------|-----|--------------|
| P0 | Data persistence (save/load) | Data loss is catastrophic | main |
| P0 | Note CRUD operations | Core user flow | renderer |
| P1 | IPC channel contracts | Main↔Renderer communication | preload |
| P1 | History (undo/redo) | User expects reliable undo | renderer |
| P1 | CLI download + launch | User's first experience | cli |
| P2 | Window management (show/hide/toggle) | Edge cases cause stuck windows | main |
| P2 | Drawing state management | Strokes, grouping, selection | renderer |
| P2 | Settings persistence | Settings must survive restart | renderer + main |
| P3 | Zoom/pan/rotate transforms | Math correctness | renderer |
| P3 | Keyboard shortcuts | Modifier key handling | renderer |

### Coverage Thresholds (Recommended)

Start with achievable gates and ratchet up:

```javascript
coverageThreshold: {
  global: {
    statements: 40,
    branches: 30,
    functions: 35,
    lines: 40
  }
}
```

Rationale: The monolithic renderer.js makes high coverage impractical without refactoring. Set thresholds based on what CI achieves after initial test expansion, then ratchet up 5% per milestone.

---

## 2. CI/CD Pipeline Components

### Pipeline 1: CI (Every Push/PR)

**Trigger:** `push` to any branch, `pull_request` to main

**Purpose:** Fast feedback on code correctness

```yaml
# .github/workflows/ci.yml
Jobs:
  test:
    runs-on: macos-latest    # macOS needed for Electron environment
    steps:
      - Checkout code
      - Setup Node.js 20
      - Install dependencies (npm ci)
      - Run tests (npm test)
      - Upload coverage (optional: codecov or artifact)
```

**Key decisions:**
- `macos-latest` runner: Required because Electron tests may need macOS APIs even with mocks. Also matches production target. GitHub provides free macOS runners for public repos.
- `npm ci` not `npm install`: Deterministic installs from lockfile.
- No Electron rebuild needed: Tests mock Electron, don't launch it.

**Alternative:** `ubuntu-latest` works if tests ONLY use mocked Electron (no native module compilation). Cheaper and faster. The current test suite would work on Ubuntu since it mocks all Electron APIs.

**Recommendation:** Use `ubuntu-latest` for CI tests (faster, cheaper) since all Electron APIs are mocked. Reserve `macos-latest` for the build job only.

### Pipeline 2: Release (On Tag/Release)

**Trigger:** `push` tags matching `v*` (e.g., `v1.0.3`) OR GitHub Release creation

**Purpose:** Build distributable, publish to npm

```yaml
# .github/workflows/release.yml
Jobs:
  build:
    runs-on: macos-latest    # REQUIRED for electron-builder macOS targets
    steps:
      - Checkout code
      - Setup Node.js 20
      - Install dependencies (npm ci)
      - Run tests (npm test) — gate: don't release broken code
      - Build app (npm run build)
      - Upload artifacts to GitHub Release (DMG + ZIP)

  publish-npm:
    needs: build             # Only after successful build
    runs-on: ubuntu-latest   # npm publish doesn't need macOS
    steps:
      - Checkout code
      - Setup Node.js 20 with registry-url
      - Publish to npm (npm publish)
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Why two jobs:**
- Build MUST run on macOS (electron-builder needs macOS for DMG signing/notarization)
- npm publish is platform-independent, ubuntu is faster/cheaper
- `needs: build` ensures npm only publishes if build succeeds

### Secrets Required

| Secret | Purpose | Where to Set |
|--------|---------|--------------|
| `NPM_TOKEN` | npm publish authentication | GitHub repo Settings > Secrets |
| `GH_TOKEN` | Upload release assets (may use GITHUB_TOKEN) | Built-in for public repos |
| `APPLE_ID` | macOS code signing (future) | GitHub repo Settings > Secrets |
| `APPLE_PASSWORD` | macOS notarization (future) | GitHub repo Settings > Secrets |

**Note on code signing:** For initial release, skip signing/notarization. Users will need to right-click > Open on first launch. Add signing in a later phase when distribution grows.

### Artifact Flow

```
Tag push (v1.0.3)
    │
    ▼
┌── Build Job (macos-latest) ──┐
│                               │
│  electron-builder --mac       │
│       │                       │
│       ├── dist/Floatnote.dmg  │
│       └── dist/Floatnote.zip  │
│                               │
│  Upload to GitHub Release     │
└───────────────────────────────┘
    │
    ▼ (needs: build)
┌── Publish Job (ubuntu-latest) ─┐
│                                 │
│  npm publish                    │
│       │                         │
│       └── floatnote@1.0.3      │
│           on npmjs.com          │
└─────────────────────────────────┘
```

---

## 3. npm Package Structure

### What Gets Published

The npm package is a **CLI-only launcher**, NOT the full Electron app. The .npmignore already correctly excludes tests, build artifacts, and docs.

**Published files (what npm pack includes):**

```
floatnote/
├── package.json          # name, version, bin, description, keywords
├── bin/
│   └── floatnote.js      # CLI launcher (the entire npm value)
├── src/
│   ├── main.js           # Included but only used by Electron, not CLI
│   ├── renderer.js       # Same
│   ├── preload.js        # Same
│   ├── index.html        # Same
│   ├── styles.css        # Same
│   └── icon-template.png # Same
└── LICENSE               # If exists
```

**Excluded (via .npmignore):**

```
node_modules/, dist/, .build/, mac-arm64/,
tests/, jest.config.js, coverage/,
.git/, .github/, .claude/, .beads/,
*.dmg, *.zip, *.blockmap, *.tgz, *.log,
CLAUDE.md, GEMINI.md, README.md, package-lock.json
```

### Package Size Consideration

**Problem:** Even with .npmignore, src/ files (3700 lines) get published but are useless for CLI users.

**Current approach (acceptable):** Include src/ — adds ~100KB to npm package, negligible vs the 100MB+ app download the CLI triggers.

**Future optimization (optional):** Add `"files"` field to package.json:
```json
"files": ["bin/", "LICENSE"]
```
This would publish ONLY the CLI. But it breaks `npm start` / `electron .` for developers who clone the repo. Keep current approach.

### npm Publish Checklist

Before first publish:
- [ ] `package.json` name `floatnote` is available on npm (check with `npm view floatnote`)
- [ ] `version` in package.json matches intended release
- [ ] `bin.floatnote` correctly points to `bin/floatnote.js`
- [ ] `bin/floatnote.js` has `#!/usr/bin/env node` shebang (already present)
- [ ] `engines.node` specifies minimum (already `>=16.0.0`)
- [ ] `.npmignore` excludes build artifacts and dev files (already configured)
- [ ] `NPM_TOKEN` secret set in GitHub repo settings

### Version Synchronization

The version in `package.json` must match the git tag that triggers the release:
- Tag `v1.0.3` should correspond to `"version": "1.0.3"` in package.json
- The CLI checks GitHub Releases for the latest version, NOT npm versions
- This means: git tag = npm version = GitHub Release version

**Recommended flow:**
1. Bump version in package.json (`npm version patch/minor/major`)
2. `npm version` automatically creates a git tag
3. Push tag: `git push --tags`
4. CI detects tag, builds, publishes

---

## 4. Build Order (Dependency Graph)

```
Phase 1: Test Infrastructure
    │   (No external dependencies, self-contained)
    │
    ├── Expand renderer tests (extract testable code from Glassboard)
    ├── Add canvas mock for drawing tests
    ├── Expand main process tests (IPC handlers, window management)
    ├── Set realistic coverage thresholds
    │
    ▼
Phase 2: CI Pipeline
    │   (Depends on: tests passing reliably)
    │
    ├── Create .github/workflows/ci.yml
    ├── Validate tests pass on GitHub runner
    ├── Add coverage reporting (artifact or badge)
    │
    ▼
Phase 3: Release Pipeline
    │   (Depends on: CI pipeline working, electron-builder config correct)
    │
    ├── Create .github/workflows/release.yml
    ├── Configure electron-builder for CI (no interactive prompts)
    ├── Test build on macos-latest runner
    ├── Upload artifacts to GitHub Release
    │
    ▼
Phase 4: npm Publish
    │   (Depends on: Release pipeline producing artifacts,
    │    CLI correctly downloading from Releases)
    │
    ├── Verify package name availability
    ├── Set NPM_TOKEN secret
    ├── Add publish step to release workflow
    ├── Test npx floatnote end-to-end
    │
    ▼
Done: Push tag → Tests pass → Build DMG → Upload Release → Publish npm
```

### Why This Order

1. **Tests first** because CI is pointless without tests to run
2. **CI before Release** because you want test gates before building releases
3. **Release before npm** because npm package's CLI downloads from Releases — Releases must exist first
4. **npm last** because it depends on everything else working

### Critical Path Dependencies

| Step | Hard Dependency | Reason |
|------|----------------|--------|
| CI workflow | Tests passing locally | Don't debug test failures in CI |
| Release workflow | electron-builder working locally | `npm run build` must succeed |
| npm publish | GitHub Release exists with ZIP asset | CLI downloads ZIP from Release |
| `npx floatnote` working | All of the above | Full chain must work |

---

## 5. Patterns to Follow

### Pattern: Test Extraction for Monolithic Classes

**Problem:** Glassboard class (3000+ lines) is untestable as a unit — constructor requires DOM, canvas, and calls `init()` immediately.

**Solution:** Extract pure logic into importable functions.

```javascript
// src/renderer.js (current)
class Glassboard {
  saveState() {
    const state = JSON.stringify({
      lines: this.lines,
      textItems: this.textItems,
      images: this.images
    });
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
    this.history.push(state);
    this.historyIndex = this.history.length - 1;
  }
}

// Extraction approach for testability:
// src/history.js (new, testable module)
function addToHistory(history, state, maxSize) {
  const trimmed = history.length >= maxSize
    ? history.slice(-(maxSize - 1))
    : [...history];
  trimmed.push(state);
  return { history: trimmed, index: trimmed.length - 1 };
}
module.exports = { addToHistory };
```

**Trade-off:** Extracting functions adds files but each is independently testable. The Glassboard class delegates to these functions. Start with the highest-value extractions (history, note management, coordinate transforms).

### Pattern: GitHub Actions with Electron Builder

**Key configuration for CI builds:**

```yaml
- name: Build Electron app
  run: npm run build
  env:
    # Skip code signing in CI (no Apple certs configured)
    CSC_IDENTITY_AUTO_DISCOVERY: false
```

Without `CSC_IDENTITY_AUTO_DISCOVERY: false`, electron-builder will attempt to find a signing identity and fail on CI.

### Pattern: Conditional npm Publish

Only publish when the build succeeds AND version hasn't been published:

```yaml
- name: Publish to npm
  run: |
    CURRENT=$(node -p "require('./package.json').version")
    PUBLISHED=$(npm view floatnote version 2>/dev/null || echo "0.0.0")
    if [ "$CURRENT" != "$PUBLISHED" ]; then
      npm publish
    else
      echo "Version $CURRENT already published, skipping"
    fi
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 6. Anti-Patterns to Avoid

### Anti-Pattern: Testing Mocks Instead of Code

**Current state:** Several renderer tests create mock data structures and test operations on those mocks rather than importing and testing actual source code.

**Example (current):**
```javascript
test('should create a new note with correct structure', () => {
  const newNote = { id: '...', lines: [], textItems: [] };
  notes.push(newNote);
  expect(notes.length).toBe(1);  // Testing Array.push, not Glassboard
});
```

**Instead:** Import the actual function/class and test its behavior with mocked dependencies.

### Anti-Pattern: macOS Runner for All CI Jobs

**Problem:** macOS runners are 10x more expensive and slower than Linux runners.

**Instead:** Use `ubuntu-latest` for tests (Electron is fully mocked) and npm publish. Reserve `macos-latest` only for `electron-builder` which requires macOS.

### Anti-Pattern: Publishing Electron Binary via npm

**Problem:** Bundling a 100MB+ Electron app in the npm package.

**Floatnote correctly avoids this:** The npm package contains only the CLI launcher (~5KB), which downloads the binary from GitHub Releases at runtime. Keep this pattern.

### Anti-Pattern: Manual Version Bumps Without Tags

**Problem:** Forgetting to tag, or tag not matching package.json version.

**Instead:** Use `npm version patch/minor/major` which bumps package.json AND creates a git tag atomically.

---

## 7. Data Flow: Complete Release Cycle

```
Developer                  GitHub                    npm              User
    │                         │                       │                 │
    │  npm version patch      │                       │                 │
    │  git push --tags        │                       │                 │
    │ ───────────────────────►│                       │                 │
    │                         │                       │                 │
    │                    [Tag detected]                │                 │
    │                         │                       │                 │
    │                    [CI: Run tests]               │                 │
    │                         │                       │                 │
    │                    [Build: electron-builder]     │                 │
    │                         │                       │                 │
    │                    [Upload DMG+ZIP to Release]   │                 │
    │                         │                       │                 │
    │                    [Publish: npm publish] ──────►│                 │
    │                         │                       │                 │
    │                         │                       │   npx floatnote │
    │                         │                       │◄────────────────│
    │                         │                       │                 │
    │                         │   CLI fetches latest  │                 │
    │                         │◄──────────────────────│────────────────►│
    │                         │                       │                 │
    │                         │   Downloads ZIP       │                 │
    │                         │──────────────────────────────────────►  │
    │                         │                       │                 │
    │                         │                       │   App launches  │
    │                         │                       │                 │
```

---

## Sources

- Project inspection: package.json, jest.config.js, .npmignore, src/, tests/, bin/
- Existing planning docs: .planning/codebase/TESTING.md, .planning/codebase/ARCHITECTURE.md
- Domain knowledge: Electron testing patterns, GitHub Actions for Electron, npm publishing conventions (HIGH confidence - established patterns, verified against project structure)

---

*Architecture research: 2026-01-22*
