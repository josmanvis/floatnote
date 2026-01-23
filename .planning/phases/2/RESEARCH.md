# Phase 2: E2E Tests - Research

**Researched:** 2026-01-22
**Domain:** Playwright + Electron E2E Testing
**Confidence:** HIGH

## Summary

This research covers how to implement end-to-end tests for Floatnote, an Electron 33 app, using Playwright's experimental but stable Electron support. The approach uses `@playwright/test` with `_electron.launch()` to start real Electron app instances, interact with the canvas-based drawing UI, create text overlays, manage multi-note navigation, and verify data persistence across app restarts.

The key challenges are: (1) canvas drawing requires low-level mouse events (`page.mouse.move/down/up`) since canvas content is not in the DOM, (2) data persistence tests require closing and relaunching the app with the same `userData` path, (3) the close dialog (`dialog.showMessageBox`) must be stubbed to prevent blocking, and (4) the 1-second auto-save debounce must be waited out before verifying persistence.

**Primary recommendation:** Use `@playwright/test` with `electron-playwright-helpers` for dialog stubbing, custom temp `userData` paths per test for isolation, screenshot comparison for canvas verification, and explicit waits for the auto-save debounce.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | ^1.50.0 | Test runner + Electron launch | Official Playwright test framework with built-in Electron support |
| playwright | ^1.50.0 | Core automation (peer dep) | Required for `_electron` module |
| electron-playwright-helpers | ^2.0.0 | Dialog stubbing, IPC helpers | Solves native dialog mocking, IPC testing, retry logic for Electron 27+ |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| xvfb-maybe | ^0.2.1 | Linux CI virtual display | Only needed if running on Linux CI runners |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| electron-playwright-helpers | Manual `evaluate()` stubbing | Helpers package has retry logic for Electron 27+ flakiness, manual approach is fragile |
| Screenshot comparison | Pixel sampling via evaluate | Screenshots are more maintainable, pixel sampling needs exact coordinates |
| Separate playwright.config.js | Integrate into jest.config.js | Playwright has its own runner, cannot share with Jest |

**Installation:**
```bash
npm install --save-dev @playwright/test playwright electron-playwright-helpers
```

No `npx playwright install` needed (we use the project's own Electron binary, not Playwright browsers).

## Architecture Patterns

### Recommended Project Structure
```
tests/
  e2e/
    fixtures/
      electron-app.js       # Shared fixture: launch, cleanup, helpers
      test-image.png        # Test fixture: small PNG for clipboard tests
    drawing.spec.js         # TEST-03: Drawing flow
    text-overlay.spec.js    # TEST-04: Text overlay creation/editing
    multi-note.spec.js      # TEST-05: Multi-note navigation
    persistence.spec.js     # TEST-06: Save/load across restart
    clipboard.spec.js       # TEST-07: Clipboard paste
    settings.spec.js        # TEST-08: Settings persistence
playwright.config.js        # Playwright configuration (separate from jest.config.js)
```

### Pattern 1: Electron App Fixture with Temp userData
**What:** Shared test fixture that launches Electron with an isolated temp directory for each test
**When to use:** Every E2E test needs this pattern
**Example:**
```javascript
// tests/e2e/fixtures/electron-app.js
const { test: base, _electron: electron } = require('@playwright/test');
const { stubDialog } = require('electron-playwright-helpers');
const path = require('path');
const fs = require('fs');
const os = require('os');

exports.test = base.extend({
  electronApp: async ({}, use) => {
    // Create isolated temp directory for userData
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-test-'));

    const app = await electron.launch({
      args: [path.join(__dirname, '../../../src/main.js')],
      env: {
        ...process.env,
        ELECTRON_USER_DATA_DIR: tmpDir,
        NODE_ENV: 'test'
      }
    });

    // Stub the close confirmation dialog to auto-confirm
    await stubDialog(app, 'showMessageBox', { response: 0 });

    await use(app);

    // Cleanup
    await app.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    // Wait for app to fully initialize
    await page.waitForSelector('#draw-canvas');
    await use(page);
  }
});
```

### Pattern 2: Canvas Drawing via Mouse Events
**What:** Simulate drawing strokes on the canvas using Playwright's Mouse API
**When to use:** Any test that needs to verify drawing functionality
**Example:**
```javascript
// Draw a stroke from point A to point B
async function drawStroke(page, startX, startY, endX, endY) {
  const canvas = page.locator('#draw-canvas');
  const box = await canvas.boundingBox();

  await page.mouse.move(box.x + startX, box.y + startY);
  await page.mouse.down();
  // Multiple intermediate points for a visible stroke
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const x = box.x + startX + (endX - startX) * (i / steps);
    const y = box.y + startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
  }
  await page.mouse.up();
}
```

### Pattern 3: App Restart for Persistence Tests
**What:** Close and relaunch the app with the same userData path to verify persistence
**When to use:** TEST-06 and TEST-08 (save/load and settings persistence)
**Example:**
```javascript
// Restart the app, preserving the userData directory
async function restartApp(electronApp, tmpDir) {
  await electronApp.close();

  const newApp = await electron.launch({
    args: [path.join(__dirname, '../../../src/main.js')],
    env: {
      ...process.env,
      ELECTRON_USER_DATA_DIR: tmpDir,
      NODE_ENV: 'test'
    }
  });

  await stubDialog(newApp, 'showMessageBox', { response: 0 });
  const page = await newApp.firstWindow();
  await page.waitForSelector('#draw-canvas');

  return { app: newApp, page };
}
```

### Pattern 4: Waiting for Auto-Save
**What:** The app debounces saves by 1 second. Tests must wait for the save to complete before restarting.
**When to use:** Any persistence test
**Example:**
```javascript
// Wait for auto-save to complete (debounce is 1000ms)
async function waitForAutoSave(page) {
  await page.waitForTimeout(1500); // 1s debounce + 500ms buffer
}
```

### Pattern 5: Custom userData via Environment Variable
**What:** The main process needs modification to respect a test-only env var for userData path
**When to use:** Required for test isolation
**Implementation note:** Add to top of `src/main.js`:
```javascript
// Allow tests to override userData path
if (process.env.ELECTRON_USER_DATA_DIR) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA_DIR);
}
```
This must be called before any code reads `app.getPath('userData')`.

### Anti-Patterns to Avoid
- **Relying on pixel coordinates without boundingBox:** Canvas position varies by window size. Always use `canvas.boundingBox()` to get absolute coordinates.
- **Not waiting for auto-save:** The app debounces saves by 1 second. Restarting too soon means data is lost.
- **Using `page.waitForTimeout` for everything:** Prefer `waitForSelector`, `waitForFunction`, or polling the data file. Only use timeout for the debounce wait.
- **Not stubbing the close dialog:** The app shows a confirmation dialog on close. Without stubbing, `app.close()` will hang.
- **Hardcoding window dimensions:** The transparent window's size depends on the display. Use relative coordinates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dialog mocking | Custom `evaluate()` to override `dialog.showMessageBox` | `electron-playwright-helpers` `stubDialog()` | Has retry logic for Electron 27+ context destruction bugs |
| IPC testing | Manual `evaluate` + `ipcMain` inspection | `electron-playwright-helpers` `ipcMainInvokeHandler()` | Handles async, retries, and serialization |
| Visual regression | Manual pixel reading from canvas | `expect(page).toHaveScreenshot()` or `expect(canvas).toHaveScreenshot()` | Playwright's built-in handles baselines, diffs, thresholds |
| Temp directory management | Manual mkdir + manual cleanup | `fs.mkdtempSync` + `fs.rmSync` in fixture | Standard Node.js pattern, guaranteed unique paths |
| CI virtual display | Complex xvfb setup scripts | `xvfb-maybe` package | Auto-detects if xvfb is needed (Linux) or not (macOS) |

**Key insight:** Playwright's Electron support is "experimental" but well-used (VS Code uses it). The main pain point is native dialogs and Electron-specific APIs, which `electron-playwright-helpers` solves cleanly.

## Common Pitfalls

### Pitfall 1: Single Instance Lock Blocks Test Parallelism
**What goes wrong:** Floatnote uses `app.requestSingleInstanceLock()`. Running multiple test files in parallel will cause the second instance to exit immediately.
**Why it happens:** Each test launches a new Electron process, but the single-instance lock prevents multiple instances.
**How to avoid:** Run tests serially (`workers: 1` in playwright.config.js), OR disable the single-instance lock in test mode via environment variable check.
**Warning signs:** Tests pass individually but fail when run together.

### Pitfall 2: Auto-Save Debounce Causes Data Loss in Tests
**What goes wrong:** Test draws a stroke, immediately restarts app, stroke is not persisted.
**Why it happens:** `autoSave()` debounces by 1000ms. If app closes before the timeout fires, `saveData()` never executes.
**How to avoid:** After any mutation, wait at least 1500ms before restarting. Or trigger `saveData()` explicitly via `page.evaluate()`.
**Warning signs:** Persistence tests are flaky - sometimes pass, sometimes fail.

### Pitfall 3: Close Dialog Blocks app.close()
**What goes wrong:** `electronApp.close()` hangs indefinitely.
**Why it happens:** The `close` event handler shows `dialog.showMessageBox` and calls `e.preventDefault()`. The dialog waits for user input that never comes.
**How to avoid:** Use `stubDialog(app, 'showMessageBox', { response: 0 })` immediately after launch. Response 0 = "Close" button.
**Warning signs:** Tests time out at the cleanup phase.

### Pitfall 4: Canvas Screenshots on Transparent Background
**What goes wrong:** Screenshot comparison fails because the transparent window shows whatever is behind it (desktop, other windows).
**Why it happens:** The window has `transparent: true` and `backgroundColor: "#00000000"`.
**How to avoid:** Use `locator('#draw-canvas').screenshot()` instead of `page.screenshot()`. The canvas element itself has its own rendering context. Or compare only specific canvas regions. Or set a known background via CSS override in test mode.
**Warning signs:** Visual tests pass locally but fail in CI (different desktop backgrounds).

### Pitfall 5: Drawing in Select Mode vs Draw Mode
**What goes wrong:** Mouse events on canvas don't produce strokes.
**Why it happens:** The app defaults to draw mode, but if the test clicks a toolbar button first, mode might change. In select mode, mousedown triggers drag-box selection instead of drawing.
**How to avoid:** Always explicitly set draw mode before drawing: `await page.click('#draw-mode')`.
**Warning signs:** Drawing tests pass sometimes but fail when test order changes.

### Pitfall 6: Text Mode Click Target is text-container, Not Canvas
**What goes wrong:** Clicking the canvas in text mode does nothing.
**Why it happens:** Text items are created by clicking `#text-container`, not `#draw-canvas`. The text container overlays the canvas.
**How to avoid:** Click `#text-container` after switching to text mode.
**Warning signs:** Text creation tests always fail.

### Pitfall 7: Electron 33 + requestSingleInstanceLock on macOS
**What goes wrong:** Second launch attempt in persistence tests gets `gotTheLock = false` and exits.
**Why it happens:** The first instance's lock may not be released immediately after `app.close()`.
**How to avoid:** Ensure `await electronApp.close()` fully resolves. Add a small delay (200ms) between close and relaunch. Or use a different app name per test via env var.
**Warning signs:** Restart tests fail with the second instance immediately quitting.

## Code Examples

### Complete Drawing Test
```javascript
// tests/e2e/drawing.spec.js
const { test, expect } = require('./fixtures/electron-app');

test('draw a stroke and verify it appears on canvas', async ({ page }) => {
  // Ensure we're in draw mode
  await page.click('#draw-mode');

  // Get canvas bounds
  const canvas = page.locator('#draw-canvas');
  const box = await canvas.boundingBox();

  // Draw a diagonal stroke
  const startX = box.x + 100;
  const startY = box.y + 100;
  const endX = box.x + 300;
  const endY = box.y + 300;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(
      startX + (endX - startX) * (i / 10),
      startY + (endY - startY) * (i / 10)
    );
  }
  await page.mouse.up();

  // Verify stroke exists in the app's data model
  const lineCount = await page.evaluate(() => {
    return window.glassboardInstance.lines.length;
  });
  expect(lineCount).toBeGreaterThan(0);

  // Visual verification via screenshot
  await expect(canvas).toHaveScreenshot('stroke-drawn.png', {
    maxDiffPixelRatio: 0.01
  });
});
```

### Text Overlay Test
```javascript
test('create text overlay and verify content', async ({ page }) => {
  // Switch to text mode
  await page.click('#text-mode');

  // Click on text container to create text item
  const textContainer = page.locator('#text-container');
  const box = await textContainer.boundingBox();
  await page.mouse.click(box.x + 200, box.y + 200);

  // Wait for text input to appear and be focused
  const textInput = page.locator('.text-item .text-input');
  await textInput.waitFor({ state: 'visible' });

  // Type content
  await page.keyboard.type('Hello E2E Test');

  // Verify text content
  const content = await textInput.textContent();
  expect(content).toBe('Hello E2E Test');

  // Verify in data model
  const textItems = await page.evaluate(() => {
    return window.glassboardInstance.textItems;
  });
  expect(textItems).toHaveLength(1);
  expect(textItems[0].content).toContain('Hello E2E Test');
});
```

### Multi-Note Navigation Test
```javascript
test('create and navigate between notes', async ({ page }) => {
  // Draw on first note
  await page.click('#draw-mode');
  const canvas = page.locator('#draw-canvas');
  const box = await canvas.boundingBox();
  await drawStroke(page, 50, 50, 150, 150);

  // Create new note
  await page.click('#new-note');

  // Verify counter shows "2/2"
  const counter = page.locator('#note-counter');
  await expect(counter).toHaveText('2/2');

  // Draw on second note
  await drawStroke(page, 200, 200, 300, 300);

  // Go back to first note
  await page.click('#prev-note');
  await expect(counter).toHaveText('1/2');

  // Verify first note's content is still there
  const lineCount = await page.evaluate(() => {
    return window.glassboardInstance.lines.length;
  });
  expect(lineCount).toBeGreaterThan(0);
});
```

### Persistence Across Restart Test
```javascript
const { test: base, _electron: electron } = require('@playwright/test');
const { stubDialog } = require('electron-playwright-helpers');

test('data persists across app restart', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-test-'));

  try {
    // First session: create content
    let app = await electron.launch({
      args: [path.join(__dirname, '../../src/main.js')],
      env: { ...process.env, ELECTRON_USER_DATA_DIR: tmpDir, NODE_ENV: 'test' }
    });
    await stubDialog(app, 'showMessageBox', { response: 0 });
    let page = await app.firstWindow();
    await page.waitForSelector('#draw-canvas');

    // Draw something
    await drawStroke(page, 100, 100, 200, 200);

    // Wait for auto-save (1s debounce + buffer)
    await page.waitForTimeout(1500);

    // Close first session
    await app.close();
    await new Promise(r => setTimeout(r, 500)); // Brief delay for lock release

    // Second session: verify persistence
    app = await electron.launch({
      args: [path.join(__dirname, '../../src/main.js')],
      env: { ...process.env, ELECTRON_USER_DATA_DIR: tmpDir, NODE_ENV: 'test' }
    });
    await stubDialog(app, 'showMessageBox', { response: 0 });
    page = await app.firstWindow();
    await page.waitForSelector('#draw-canvas');

    // Wait for data to load
    await page.waitForTimeout(500);

    // Verify data was loaded
    const lineCount = await page.evaluate(() => {
      return window.glassboardInstance.lines.length;
    });
    expect(lineCount).toBeGreaterThan(0);

    await app.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
```

### Clipboard Paste Test
```javascript
test('paste image from clipboard', async ({ electronApp, page }) => {
  // Write image to Electron's clipboard via main process
  const testImagePath = path.join(__dirname, 'fixtures/test-image.png');

  await electronApp.evaluate(async ({ clipboard, nativeImage }, imgPath) => {
    const image = nativeImage.createFromPath(imgPath);
    clipboard.writeImage(image);
  }, testImagePath);

  // Trigger paste (Cmd+V on macOS)
  await page.keyboard.press('Meta+v');

  // Wait for pasted image to appear
  const pastedImage = page.locator('.pasted-image');
  await pastedImage.waitFor({ state: 'visible', timeout: 5000 });

  // Verify image was added to data model
  const imageCount = await page.evaluate(() => {
    return window.glassboardInstance.images.length;
  });
  expect(imageCount).toBe(1);
});
```

### Settings Persistence Test
```javascript
test('settings persist across restart', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'floatnote-test-'));

  try {
    // First session: change a setting
    let app = await launchApp(tmpDir);
    let page = await app.firstWindow();
    await page.waitForSelector('#draw-canvas');

    // Open settings (Cmd+,)
    await page.keyboard.press('Meta+,');
    await page.waitForSelector('#settings-panel', { state: 'visible' });

    // Toggle a setting (e.g., disable pinch zoom)
    const pinchZoomToggle = page.locator('#setting-pinch-zoom');
    await pinchZoomToggle.uncheck();

    // Wait for auto-save
    await page.waitForTimeout(1500);

    await app.close();
    await new Promise(r => setTimeout(r, 500));

    // Second session: verify setting persists
    app = await launchApp(tmpDir);
    page = await app.firstWindow();
    await page.waitForSelector('#draw-canvas');
    await page.waitForTimeout(500); // Wait for loadSavedData

    // Verify setting was restored
    const isChecked = await page.locator('#setting-pinch-zoom').isChecked();
    expect(isChecked).toBe(false);

    await app.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
```

## Accessing the Glassboard Instance

The renderer creates the Glassboard instance at the bottom of `renderer.js`. To access it from tests:

```javascript
// At the end of renderer.js, the instance is created:
// const glassboard = new Glassboard();
// We need to expose it for testing:
// window.glassboardInstance = glassboard;

// OR access it via evaluate without modifying source:
const lines = await page.evaluate(() => {
  // The Glassboard constructor stores references on DOM elements
  // We can access the canvas context directly
  const canvas = document.getElementById('draw-canvas');
  // But for data, we need the instance...
});
```

**Recommendation:** Add a single line to the end of `renderer.js` for test access:
```javascript
// Expose instance for E2E testing (no-op in production since nothing reads it)
window.glassboardInstance = glassboard;
```
This is a common pattern for Electron E2E testing. The variable is harmless in production.

## Playwright Configuration

```javascript
// playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Serial execution required (single-instance lock)
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.3,
    }
  }
});
```

## CI Configuration (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test-e2e:
    runs-on: macos-latest  # macOS doesn't need xvfb
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright test
        timeout-minutes: 5
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-results
          path: test-results/
```

For Linux CI, prepend `xvfb-run --auto-servernum --`:
```yaml
      - run: xvfb-run --auto-servernum -- npx playwright test
```

## Main Process Modification Required

The `src/main.js` file needs a small modification to support test isolation:

```javascript
// Add near the top of main.js, BEFORE userDataPath is set:
if (process.env.ELECTRON_USER_DATA_DIR) {
  app.setPath('userData', process.env.ELECTRON_USER_DATA_DIR);
}

// Optionally, disable single-instance lock in test mode:
if (process.env.NODE_ENV === 'test') {
  // Skip single-instance lock for test parallelism
} else {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.exit(0);
  }
}
```

This is a minimal, safe change that only activates when specific environment variables are set.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spectron (deprecated) | Playwright `_electron` | 2021 | Spectron is unmaintained, Playwright is actively developed |
| WebdriverIO Electron | Playwright `_electron` | 2023 | Playwright has simpler API, better Electron integration |
| electron-playwright-helpers v1 | v2.0 with retry logic | 2024 | v2 handles Electron 27+ context destruction bugs |
| Manual xvfb scripts | `xvfb-maybe` package | 2022 | Cross-platform without conditional scripting |
| Chromium-based Playwright | Chrome for Testing (1.57+) | Nov 2025 | No impact on Electron tests (uses app's own Chromium) |

**Deprecated/outdated:**
- Spectron: Deprecated since 2021, do not use
- `@playwright/test` < 1.14: Electron support added in 1.14
- electron-playwright-helpers v1.x: Use v2.0+ for Electron 27+ compatibility

## Open Questions

1. **Exposing Glassboard instance for testing**
   - What we know: The instance is created as `const glassboard = new Glassboard()` at bottom of renderer.js
   - What's unclear: Whether adding `window.glassboardInstance = glassboard` is acceptable to the project owner
   - Recommendation: Add it -- it's harmless in production and standard practice for E2E testing

2. **Screenshot baseline management**
   - What we know: Playwright stores baselines in `__snapshots__` dirs, they need to be committed
   - What's unclear: Whether canvas rendering is deterministic across macOS versions (font rendering, etc.)
   - Recommendation: Use generous `maxDiffPixelRatio` (0.02) and focus on data-model assertions as primary verification, screenshots as secondary

3. **Auto-save timing in CI**
   - What we know: Debounce is 1000ms, CI machines may be slower
   - What's unclear: Whether 1500ms buffer is sufficient on slow CI
   - Recommendation: Use 2000ms wait in CI, or better: poll the data file until it appears

## Sources

### Primary (HIGH confidence)
- [Playwright Electron API](https://playwright.dev/docs/api/class-electron) - Launch configuration, supported versions (v14+)
- [Playwright ElectronApplication API](https://playwright.dev/docs/api/class-electronapplication) - firstWindow, evaluate, close, windows methods
- [Electron Automated Testing Tutorial](https://www.electronjs.org/docs/latest/tutorial/automated-testing) - Official guide, written with @playwright/test@1.52.0
- [Electron Testing on Headless CI](https://www.electronjs.org/docs/latest/tutorial/testing-on-headless-ci) - xvfb configuration for Linux
- Source code analysis: `src/main.js`, `src/renderer.js`, `src/preload.js`, `src/index.html`

### Secondary (MEDIUM confidence)
- [electron-playwright-helpers GitHub](https://github.com/spaceagetv/electron-playwright-helpers) - stubDialog, IPC helpers, v2.0 retry logic
- [Simon Willison's TIL: Testing Electron with Playwright + GitHub Actions](https://til.simonwillison.net/electron/testing-electron-playwright) - macOS CI pattern, video recording
- [Playwright Mouse API](https://playwright.dev/docs/api/class-mouse) - move, down, up for canvas interaction

### Tertiary (LOW confidence)
- [Playwright GitHub Issue #13288: Headless Electron](https://github.com/microsoft/playwright/issues/13288) - No headless Electron support confirmed
- [Electron Issue #47419: Electron 36.x breaks Playwright](https://github.com/electron/electron/issues/47419) - Electron 33 is safe, issue is 36+

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Playwright docs + Electron tutorial confirm approach
- Architecture: HIGH - Patterns derived from source code analysis + official examples
- Pitfalls: HIGH - Identified from source code (debounce, single-instance, dialog) + community reports
- Canvas testing: MEDIUM - Mouse events documented, screenshot comparison is standard, but canvas transparency adds complexity
- CI configuration: HIGH - macOS needs no xvfb, Linux needs it, well-documented

**Research date:** 2026-01-22
**Valid until:** 2026-03-22 (stable ecosystem, 60-day validity)
