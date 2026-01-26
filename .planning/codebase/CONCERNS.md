# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

**Monolithic Renderer Class:**
- Issue: `src/renderer.js` is 3,123 lines in a single Glassboard class with 90+ event listeners and 108 timer/interval operations. Methods are tightly coupled with DOM manipulation and state management.
- Files: `src/renderer.js`
- Impact: Difficult to test, maintain, and refactor. Adding features requires understanding the entire class. High risk of regressions when modifying one feature.
- Fix approach: Extract related functionality into separate classes (DrawingEngine, TextManager, StateManager, ClipboardManager). Use composition and dependency injection.

**Inconsistent Error Handling:**
- Issue: Main process and preload properly wrap IPC handlers in try-catch blocks, but renderer.js has minimal error handling. Only 4 catch blocks in 3,123 lines of renderer code. File operations and network-like clipboard access lack error boundaries.
- Files: `src/renderer.js` (lines 2852-2854, 2916-2918, 2925-2927, 3037-3038), `src/main.js` (lines 389-396, 407-409, 432-434, 447-449, 489-491)
- Impact: Silent failures in clipboard operations, file exports, and state management. Users see no feedback when operations fail.
- Fix approach: Wrap all async operations and file operations in consistent try-catch. Add user-facing error notifications via a unified error handler.

**Missing Event Listener Cleanup:**
- Issue: 90+ addEventListener calls throughout renderer.js with no corresponding removeEventListener calls. Global document listeners (lines 1033, 1937, 2054, 3064) are never cleaned up if the window is destroyed and recreated.
- Files: `src/renderer.js` (setupTextMode at line 1033, setupFileDrop at line 1937, setupLeftResize at line 3054)
- Impact: Memory leaks. Each time the app toggles visibility or recreates the window, event listeners accumulate without being removed.
- Fix approach: Create a cleanup/destroy method that removes all event listeners. Call it when the Glassboard instance is destroyed or the window closes.

**Unsafe innerHTML Usage:**
- Issue: 23 instances of innerHTML assignments throughout renderer.js (lines 433, 821, 884, 894, 906, 943, 1056, 1066, 1100, 1659, 1710, 1915, 2013, 2121, 2164, 2181, 2260, 2400, 2409, 2438, 2741, 2752, 2786). While mostly internal HTML, this is a security risk if any user-supplied content is ever inserted.
- Files: `src/renderer.js`
- Impact: Potential XSS vulnerability if user input from clipboard or files is inserted via innerHTML.
- Fix approach: Use textContent for text, createElement for structure, or sanitize HTML before insertion.

**Deprecated APIs:**
- Issue: renderer.js uses `document.execCommand()` (lines 1114, 1118, 1122, 1133) and `document.queryCommandState()` (lines 1176, 1179, 1182) for text formatting. These are deprecated in modern browsers.
- Files: `src/renderer.js` (text formatting section around lines 1110-1184)
- Impact: Future browser updates may remove support. Current behavior may be unreliable in newer Electron versions.
- Fix approach: Replace with Composition API or library like ProseMirror for robust rich text editing.

## Known Bugs

**Race Condition in Window Creation:**
- Issue: `isCreatingWindow` flag in `src/main.js` (lines 40-54) can race if createWindow is called multiple times rapidly. Flag is not atomic.
- Files: `src/main.js` (lines 40-54)
- Trigger: Press global shortcut multiple times very rapidly or call createWindow from multiple event handlers
- Workaround: Currently mitigated by checking mainWindow status, but only partially effective
- Fix: Use a Promise-based queue or proper async locking mechanism

**Note History Reset on Switch:**
- Issue: When switching between notes via pagination (`previousNote()`, `nextNote()`), the undo/redo history is cleared (line 237-238 in loadCurrentNote). Users cannot undo/redo actions from previous note views.
- Files: `src/renderer.js` (lines 215-240, specifically 237-238)
- Impact: Users lose undo/redo history when navigating between notes. Data is safe but workflow is broken.
- Fix: Maintain per-note history arrays instead of a single history

**Selection State Lost on Note Switch:**
- Issue: All selection states are cleared when switching notes (`clearDisplay()` at line 243), including selectedTextId, selectedObjectId, and allSelected. If user had selected items, they're deselected without warning.
- Files: `src/renderer.js` (lines 215-250)
- Impact: Unexpected UI state changes. If user switches notes and back, selection is gone.
- Fix: Save/restore selection state per note or include selection state in history

**Clipboard Check Timeout Race:**
- Issue: `setupClipboardPaste()` initiates clipboard check after 500ms delay (line 1930), but also on window focus. If window focuses before timeout fires, double-check occurs.
- Files: `src/renderer.js` (lines 1919-1931)
- Impact: Minor - redundant clipboard reads, but no data loss
- Fix: Cancel timeout if focus event occurs

## Security Considerations

**Sandbox Disabled:**
- Risk: Electron BrowserWindow has `sandbox: false` (src/main.js line 97). This disables the Electron sandbox protection and allows preload script full Node.js access.
- Files: `src/main.js` (line 97: `sandbox: false`)
- Current mitigation: contextIsolation is enabled (line 96), which limits what preload can expose. Only explicit glassboard APIs are exposed via contextBridge.
- Recommendations: Enable sandbox (sandbox: true) and use IPC for all operations instead of direct Node.js access in preload. This removes the risk of malicious renderer code gaining node access.

**FileReader Usage Without Validation:**
- Risk: `handleFileDrop()` uses FileReader to load dropped files without validating file size limits (lines 1988-1998). Large files could cause memory exhaustion.
- Files: `src/renderer.js` (lines 1988-1998, 1961-1981)
- Current mitigation: Only image and attachment file types are accepted, reducing attack surface
- Recommendations: Add maximum file size checks before reading files. Implement chunk-based loading for large images.

**Clipboard Content Not Sanitized:**
- Risk: `getClipboardContent()` in preload.js returns raw clipboard data. If malicious HTML is copied, restoring it via innerHTML could execute scripts.
- Files: `src/preload.js` (lines 23-51), `src/renderer.js` (line 906: `editor.innerHTML = this.clipboard.data.content`)
- Current mitigation: Clipboard is user-initiated, limiting attacker scenarios. No remote clipboard exposure.
- Recommendations: Sanitize HTML clipboard content before insertion. Use textContent for plain text only.

## Performance Bottlenecks

**Redraw on Every State Change:**
- Issue: `redraw()` method redraws entire canvas from scratch on every modification. Called on every drawing stroke, object selection, zoom, pan, and text change. No dirty-region optimization.
- Files: `src/renderer.js` - called frequently throughout
- Cause: Monolithic redraw function that iterates all lines, text items, and images every time any state changes
- Improvement path: Implement dirty rectangle tracking or request animation frame batching. Cache rendered objects.

**Large History Array:**
- Issue: History array set to max 50 items (line 76), but each state stores entire note (all lines, text items, images). With complex drawings, this uses significant memory.
- Files: `src/renderer.js` (line 76: `this.maxHistorySize = 50`)
- Cause: Full state snapshots instead of incremental changes or operation recording
- Improvement: Record operations (draw stroke, add text, delete object) instead of full snapshots. Reduce history limit if memory is constrained.

**No Viewport Culling:**
- Issue: All objects (lines, text items, images) are always rendered, even if off-screen due to pan/zoom. With large drawings, rendering is inefficient.
- Files: `src/renderer.js` - redraw function and rendering loops
- Cause: Simple iteration without bounds checking against viewport
- Improvement: Only render objects within current viewport bounds

**Debounced Auto-Save Not Truly Debounced:**
- Issue: `autoSave()` uses a debounce pattern with setTimeout (line 80, saveTimeout), but pattern is incomplete. Multiple rapid saves could still trigger multiple writes.
- Files: `src/renderer.js` (auto-save implementation)
- Cause: Timeout reference not always cleared before setting new timeout
- Improvement: Use proper debounce implementation or throttle auto-save interval

## Fragile Areas

**Data Format Migration:**
- Files: `src/renderer.js` (lines 3009-3022)
- Why fragile: Legacy format detection is loose - checks if `data.lines || data.textItems || data.images` exist. If future data format also has these fields, migration could apply incorrectly.
- Safe modification: Add explicit version field to saved data (e.g., `data.format: 'v1'`). Update all save operations to include version.
- Test coverage: Only basic migration tests exist. Add tests for edge cases (empty data, partial migration, format conflicts).

**Multi-Selection State:**
- Files: `src/renderer.js` (multi-selection logic throughout)
- Why fragile: Multiple selection tracking variables: `selectedObjectId`, `selectedTextId`, `allSelected`, `multiSelectedObjects`, `selectedObjects`. These can get out of sync.
- Safe modification: Create unified SelectionManager class that enforces invariants (only one type selected at a time, or explicitly allow multi-type).
- Test coverage: Minimal tests for multi-selection edge cases

**Transform State (Zoom, Pan, Rotation):**
- Files: `src/renderer.js` (lines 33-43, transform operations)
- Why fragile: Zoom, pan, and rotation are applied via canvas transforms and style transforms but also stored separately in state. Canvas transforms are not persisted; only state values are. Discrepancies can occur.
- Safe modification: Refactor to single source of truth - either always compute transforms from state or always apply to canvas immediately.
- Test coverage: No tests for transform persistence and restoration

**Attachment/Image Data Persistence:**
- Files: `src/renderer.js` (image handling around lines 2900-2908)
- Why fragile: Images are stored as base64 data URLs in notes, creating massive JSON payloads. If images fail to load or are corrupted, entire note's image index is invalid.
- Safe modification: Store images separately with checksums. Index them by reference instead of embedding data.
- Test coverage: No tests for large image handling or persistence

## Scaling Limits

**Single File Data Storage:**
- Current: All notes stored in single JSON file (~/.config/floatnote/floatnote-data.json)
- Limit: File grows with each note. With 100+ notes with large drawings, file becomes unwieldy (potentially 100s of MB). File sync/write performance degrades.
- Scaling path: Switch to IndexedDB or SQLite for indexed storage, or implement note archiving

**Canvas Resolution:**
- Current: Canvas resolution tied to window size at devicePixelRatio
- Limit: Large high-DPI displays create very large canvas buffers. Export or rendering of very large canvases will be slow.
- Scaling: Implement canvas tiling or WebGL for large-scale drawing

**Memory Accumulation in Zoom/Pan:**
- Current: No cleanup of transform history. Pan/zoom operations store state but don't clear intermediate states.
- Limit: Extended use accumulates transforms in memory
- Scaling: Implement transform state cleanup or compression

## Dependencies at Risk

**Electron Version Pinned:**
- Risk: package.json pins electron to ^33.0.0. Deprecated APIs (execCommand) are already issues. Major versions may drop support for deprecated features entirely.
- Impact: clipboard operations, text formatting may break with next major Electron update
- Migration: Replace deprecated APIs before Electron major version bump

## Missing Critical Features

**No Collaborative Locking:**
- Problem: If user opens same note file in multiple windows, data can be corrupted by concurrent writes
- Blocks: Multi-workspace support, mobile companion apps
- Recommendation: Add file locking or conflict resolution

**No Backup/Recovery:**
- Problem: Single JSON file - corrupted or deleted data is unrecoverable. No version history or backups.
- Blocks: Robust production use
- Recommendation: Implement shadow saves, versioned backups, or cloud sync

**No Search/Filter:**
- Problem: No way to search across notes or within large drawings
- Blocks: Usability with large note collections

## Test Coverage Gaps

**Renderer Core Logic:**
- What's not tested: Drawing operations (stroke creation, point accumulation), object selection, multi-selection, zoom/pan transforms, text editing with formatting, image/file handling
- Files: `src/renderer.js` (most of the code)
- Risk: Core drawing features have zero unit test coverage. Regressions in drawing logic would not be caught.
- Priority: **High** - Add unit tests for drawing engine, selection logic, and transforms

**Integration Between Processes:**
- What's not tested: IPC communication round-trips, data persistence/restoration, main ↔ renderer ↔ preload flows
- Files: Integration between `src/main.js`, `src/preload.js`, `src/renderer.js`
- Risk: IPC serialization errors, data corruption during save/load, window state inconsistencies
- Priority: **High** - Add integration tests for data flow

**File I/O Error Cases:**
- What's not tested: Corrupted JSON files, missing directories, permission errors, disk full errors
- Files: `src/main.js` (data handlers at lines 389-410, 415-435, 437-450)
- Risk: App may crash or hang on I/O errors instead of gracefully handling them
- Priority: **Medium** - Add error scenario tests

**Export Functions:**
- What's not tested: PNG export with various content types (images, text, mixed), large canvas exports, export permission denial
- Files: `src/main.js` (lines 459-492), `src/renderer.js` (lines 2857-2919)
- Risk: Export failures are silently logged. Users have no feedback.
- Priority: **Medium** - Add export validation tests

**Settings Persistence:**
- What's not tested: Settings migration between versions, invalid settings restoration, partial settings in saved data
- Files: `src/renderer.js` (settings load at lines 2937-2980)
- Risk: Settings UI state can mismatch actual settings if save/load fails
- Priority: **Low** - Add settings round-trip tests

---

*Concerns audit: 2026-01-22*
