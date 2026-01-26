# Phase 5: Layers and Layer Management - Research

**Researched:** 2026-01-23
**Domain:** Canvas drawing app layer system (vanilla JS, Electron, single-canvas architecture)
**Confidence:** HIGH

## Summary

This phase adds a modern, minimal layer system to Floatnote's existing single-canvas drawing architecture. The current app stores all drawing objects (lines/shapes) in a flat `lines` array on each note, with each line having an `objectId` for grouping strokes. Text items and images are stored in separate arrays.

The recommended approach is to introduce a `layers` array at the note level, where each layer object wraps its own `lines`, `textItems`, and `images` arrays. The rendering order follows the layer array order (index 0 drawn first/bottom, last index drawn on top). This integrates cleanly with the existing `saveState()` snapshot-based undo/redo system since layer state is captured as part of the note data.

For UI, a collapsible side panel on the left (matching the app's existing glassmorphism style) provides layer controls. The panel should be minimal: a list of layers with visibility toggle (eye icon), lock toggle (lock icon), and up/down reorder buttons. No drag-and-drop library is needed for this minimal approach.

**Primary recommendation:** Add a `layers` array to the note data model. Each layer holds its own content arrays. Render by iterating layers in order. Use a simple left-side collapsible panel with icon-based controls. Keep it zero-dependency.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla JS | N/A | Layer data model and rendering logic | Zero dependencies; matches existing codebase approach |
| HTML/CSS | N/A | Layer panel UI | Matches existing toolbar/settings panel patterns |
| Canvas 2D API | N/A | Multi-layer rendering in draw order | Already used; single canvas with ordered draw calls |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| SortableJS | 1.15.6 | Drag-to-reorder layers | Only if up/down buttons feel insufficient; adds ~14KB gzipped |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single canvas + draw order | Multiple stacked canvases (one per layer) | More DOM elements, complex z-index management, but allows per-layer caching. Overkill for this app's complexity level. |
| Up/down buttons | SortableJS drag reorder | Better UX for many layers, but adds dependency. Start with buttons, upgrade later if needed. |
| Custom layer panel | Konva.js framework | Full-featured but massive dependency, complete rewrite. Not appropriate. |

**Installation:**
```bash
# No additional packages needed for the minimal approach
# Optional future enhancement:
# npm install sortablejs
```

## Architecture Patterns

### Recommended Data Model Structure

```javascript
// Note structure (updated)
{
    id: "1706123456789",
    layers: [
        {
            id: "layer-1706123456789",
            name: "Layer 1",
            visible: true,
            locked: false,
            lines: [],       // drawing strokes and shapes
            textItems: [],   // text overlays
            images: []       // pasted images
        },
        {
            id: "layer-1706123456790",
            name: "Layer 2",
            visible: true,
            locked: false,
            lines: [],
            textItems: [],
            images: []
        }
    ],
    activeLayerId: "layer-1706123456789",
    // Legacy fields kept during migration (removed after migration):
    // lines: [], textItems: [], images: [],
    attachments: [],
    originX: 400,
    originY: 300,
    createdAt: 1706123456789,
    lastModified: 1706123456789
}
```

### Pattern 1: Active Layer Delegation via Getters

**What:** Maintain backward-compatible getters that delegate to the active layer instead of the note directly.
**When to use:** Always -- this is the core integration pattern that makes layer-awareness transparent to existing drawing code.
**Example:**
```javascript
// Updated getters in Glassboard class
get lines() {
    const layer = this.getActiveLayer();
    return layer ? layer.lines : [];
}
set lines(value) {
    const layer = this.getActiveLayer();
    if (layer) layer.lines = value;
}

get textItems() {
    const layer = this.getActiveLayer();
    return layer ? layer.textItems : [];
}
set textItems(value) {
    const layer = this.getActiveLayer();
    if (layer) layer.textItems = value;
}

get images() {
    const layer = this.getActiveLayer();
    return layer ? layer.images : [];
}
set images(value) {
    const layer = this.getActiveLayer();
    if (layer) layer.images = value;
}

getActiveLayer() {
    const note = this.notes[this.currentNoteIndex];
    if (!note || !note.layers) return null;
    return note.layers.find(l => l.id === note.activeLayerId) || note.layers[0];
}
```

### Pattern 2: Ordered Rendering Across All Layers

**What:** The `redraw()` method iterates all visible layers in order, drawing each layer's content sequentially on the single canvas.
**When to use:** Every canvas redraw.
**Example:**
```javascript
redraw() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width / this.zoomLevel, rect.height / this.zoomLevel);
    this.drawCenterDot();

    const note = this.notes[this.currentNoteIndex];
    if (!note || !note.layers) return;

    // Draw layers in order (index 0 = bottom, last = top)
    note.layers.forEach(layer => {
        if (!layer.visible) return;
        layer.lines.forEach(line => this.drawLine(line));
    });

    // Draw current line (always on top during drawing)
    if (this.currentLine) {
        this.drawLine(this.currentLine);
    }

    // Draw selection highlights
    if (this.selectedObjectId) {
        this.drawSelectionHighlight();
    }
    // ... multi-selection highlights
}
```

### Pattern 3: Locked Layer Guard

**What:** Before any drawing/editing operation, check if the active layer is locked and prevent the action.
**When to use:** At the start of `startDrawing`, text creation, paste operations, and selection/manipulation.
**Example:**
```javascript
isActiveLayerLocked() {
    const layer = this.getActiveLayer();
    return layer ? layer.locked : false;
}

// In startDrawing:
const startDrawing = (e) => {
    if (this.isTextMode) return;
    if (this.isActiveLayerLocked()) return; // Prevent drawing on locked layer
    // ... existing logic
};
```

### Pattern 4: Data Migration for Legacy Notes

**What:** On load, detect notes without `layers` array and migrate them to the new format.
**When to use:** In `loadSavedData()` when processing loaded note data.
**Example:**
```javascript
migrateNoteToLayers(note) {
    if (note.layers) return note; // Already migrated

    const defaultLayer = {
        id: 'layer-' + (note.id || Date.now()),
        name: 'Layer 1',
        visible: true,
        locked: false,
        lines: note.lines || [],
        textItems: note.textItems || [],
        images: note.images || []
    };

    return {
        ...note,
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,
        // Remove legacy flat arrays
        lines: undefined,
        textItems: undefined,
        images: undefined
    };
}
```

### Pattern 5: Layer Panel UI as Collapsible Side Panel

**What:** A glassmorphism-styled panel on the left side, toggled by a button, showing layer list with controls.
**When to use:** Visible when user activates it via toolbar button or keyboard shortcut.
**Example structure:**
```html
<div id="layer-panel" class="layer-panel">
    <div class="layer-panel-header">
        <span>Layers</span>
        <button id="add-layer-btn" class="layer-action-btn" title="Add layer">+</button>
    </div>
    <div class="layer-list">
        <!-- Layer items rendered dynamically -->
        <div class="layer-item active" data-layer-id="layer-123">
            <button class="layer-visibility-btn" title="Toggle visibility">
                <!-- eye icon SVG -->
            </button>
            <span class="layer-name" contenteditable="false">Layer 1</span>
            <button class="layer-lock-btn" title="Toggle lock">
                <!-- lock icon SVG -->
            </button>
            <div class="layer-order-btns">
                <button class="layer-up-btn" title="Move up">^</button>
                <button class="layer-down-btn" title="Move down">v</button>
            </div>
        </div>
    </div>
</div>
```

### Anti-Patterns to Avoid
- **Multiple canvas elements per layer:** Adds DOM complexity, z-index management issues, and makes zoom/pan/rotation transforms harder to synchronize. Stick with single canvas, ordered draw calls.
- **Storing layer index instead of ID:** Layer reordering would break references. Always use stable IDs.
- **Separate undo history per layer:** Overly complex. The existing full-state snapshot approach naturally captures all layers.
- **Deep nesting/sub-layers:** Adds complexity with minimal UX benefit for a simple drawing app. Keep layers flat.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Layer reorder animation | Custom drag-drop with animation | Simple up/down buttons (or SortableJS if needed later) | Drag reorder is surprisingly complex with edge cases; buttons are trivial and reliable |
| Unique ID generation | Custom UUID function | `Date.now().toString() + Math.random().toString(36).substr(2, 9)` | Simple, fast, unique enough for local layer IDs (matches existing objectId pattern) |

**Key insight:** The existing codebase already uses timestamp-based IDs for objects and notes. Layers should follow the same pattern. The primary complexity is in the data model migration and getter/setter rewiring, not in UI libraries.

## Common Pitfalls

### Pitfall 1: Breaking Existing Object Selection Across Layers
**What goes wrong:** `findObjectAtPoint()` currently searches the flat `this.lines` array. With layers, it needs to search all visible, unlocked layers but only allow interaction with items on the active layer (or optionally, clicking selects and switches to that layer).
**Why it happens:** The getter `this.lines` now only returns the active layer's lines, but selection should work across visible layers.
**How to avoid:** Create a `getAllVisibleLines()` method that returns lines from all visible layers (for rendering and hit-testing), but only allow manipulation of items on the active layer. Clicking an object on a different layer could auto-switch to that layer.
**Warning signs:** Objects become unselectable after switching layers; or selections "bleed" across layers.

### Pitfall 2: Undo/Redo State Size Explosion
**What goes wrong:** The `saveState()` method deep-clones all lines. With multiple layers each containing many objects, state snapshots become very large.
**Why it happens:** `JSON.parse(JSON.stringify(...))` on the entire layers array for every stroke.
**How to avoid:** The current approach (50 history states max) provides a natural cap. Monitor memory usage. If it becomes an issue, consider storing only changed layers in diffs, but start with the simple full-snapshot approach.
**Warning signs:** Lag on undo/redo, high memory usage with many layers.

### Pitfall 3: Text/Image DOM Elements Not Respecting Layer Visibility
**What goes wrong:** Text items and pasted images are DOM elements overlaid on the canvas. Hiding a layer hides canvas strokes but the DOM elements remain visible.
**Why it happens:** Text/image rendering is DOM-based, not canvas-based. Layer visibility toggle only affects `redraw()`.
**How to avoid:** When toggling layer visibility, also toggle `display: none` on all DOM elements (text items, pasted images) belonging to that layer. Each DOM element needs a `data-layer-id` attribute.
**Warning signs:** Hiding a layer removes drawn strokes but text/images remain visible.

### Pitfall 4: Locked Layer Doesn't Prevent All Interactions
**What goes wrong:** Locking a layer prevents drawing but not selection, deletion via keyboard, or paste operations.
**Why it happens:** Lock check only added to `startDrawing()` but not other interaction entry points.
**How to avoid:** Add `isActiveLayerLocked()` checks at ALL interaction entry points: drawing start, text creation, paste, delete, drag, resize, rotate, color/width change.
**Warning signs:** User can still modify objects on a locked layer through non-drawing operations.

### Pitfall 5: Migration Doesn't Handle All Edge Cases
**What goes wrong:** Old notes load but lose data, or the app crashes on notes with unexpected shapes.
**Why it happens:** Migration logic doesn't handle empty arrays, missing fields, or partial data.
**How to avoid:** Make migration defensive: check for existence of each field, provide defaults for everything. Keep the old format readable (don't delete old fields until migration is confirmed working).
**Warning signs:** Data loss after upgrade; crash on load with old data.

### Pitfall 6: Layer Panel Blocks Canvas Interactions
**What goes wrong:** The layer panel covers part of the canvas and intercepts mouse/touch events meant for drawing.
**Why it happens:** Panel is positioned over the canvas area.
**How to avoid:** Use `pointer-events: none` on the panel during drawing mode (similar to how the existing toolbar handles this with the `.drawing` class). Or position the panel to not overlap the canvas drawing area.
**Warning signs:** Cannot draw in the area behind the layer panel.

## Code Examples

Verified patterns from the existing codebase:

### Saving State with Layers (Updated saveState)
```javascript
saveState() {
    if (this.isUndoRedoAction) return;

    const note = this.notes[this.currentNoteIndex];
    const state = {
        layers: JSON.parse(JSON.stringify(note.layers)),
        activeLayerId: note.activeLayerId
    };

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex++;

    if (this.history.length > this.maxHistorySize) {
        this.history.shift();
        this.historyIndex--;
    }

    this.autoSave();
}
```

### Restoring State with Layers (Updated restoreState)
```javascript
restoreState(state) {
    const note = this.notes[this.currentNoteIndex];
    note.layers = JSON.parse(JSON.stringify(state.layers));
    note.activeLayerId = state.activeLayerId;

    // Clear and restore all DOM elements across all layers
    this.textContainer.querySelectorAll('.text-item').forEach(el => el.remove());
    this.textContainer.querySelectorAll('.pasted-image').forEach(el => el.remove());

    note.layers.forEach(layer => {
        layer.textItems.forEach(item => {
            this.restoreTextItem(item, layer.id);
        });
        layer.images.forEach(img => {
            this.restoreImage(img, layer.id);
        });
    });

    this.redraw();
    this.updateLayerPanel();
}
```

### Layer Panel Toggle CSS (Matching Existing Style)
```css
.layer-panel {
    position: absolute;
    left: 12px;
    top: 60px;
    bottom: 60px;
    width: 180px;
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 90;
    opacity: 0;
    visibility: hidden;
    transform: translateX(-10px);
    transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.layer-panel.visible {
    opacity: 1;
    visibility: visible;
    transform: translateX(0);
}

.layer-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
}

.layer-item:hover {
    background: rgba(255, 255, 255, 0.1);
}

.layer-item.active {
    background: rgba(59, 130, 246, 0.2);
    border: 1px solid rgba(59, 130, 246, 0.4);
}

.layer-item.hidden {
    opacity: 0.5;
}
```

### Creating a New Layer
```javascript
createLayer(name) {
    const note = this.notes[this.currentNoteIndex];
    const newLayer = {
        id: 'layer-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        name: name || `Layer ${note.layers.length + 1}`,
        visible: true,
        locked: false,
        lines: [],
        textItems: [],
        images: []
    };
    note.layers.push(newLayer);
    note.activeLayerId = newLayer.id;
    this.saveState();
    this.updateLayerPanel();
    this.redraw();
}
```

### Finding Objects Across All Visible Layers (for hit-testing)
```javascript
findObjectAtPointAcrossLayers(point) {
    const note = this.notes[this.currentNoteIndex];
    if (!note || !note.layers) return null;

    // Search layers in reverse order (top layer first for proper z-order hit detection)
    for (let i = note.layers.length - 1; i >= 0; i--) {
        const layer = note.layers[i];
        if (!layer.visible) continue;

        for (const line of layer.lines) {
            if (this.isPointOnLine(point, line)) {
                return { objectId: line.objectId, layerId: layer.id };
            }
        }
    }
    return null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple canvas elements per layer | Single canvas with ordered draw calls | ~2020+ for simple apps | Simpler state management, easier zoom/pan/transforms |
| Drag-and-drop for reorder | Up/down buttons or compact arrow buttons | Minimal apps trend | Zero dependency, accessible, works on all devices |
| Complex layer tree (Photoshop-style) | Flat layer list with visibility/lock | Modern minimal apps | Reduced cognitive load, faster workflows |
| Framework-based (Konva/Fabric) | Vanilla JS with canvas API | For lightweight apps | Smaller bundle, full control, matches existing codebase |

**Deprecated/outdated:**
- Multiple canvas elements per layer: Was popular for performance optimization, but adds complexity that's unnecessary for apps with fewer than 100-200 objects per layer.
- Layer groups/folders: Overkill for minimal drawing apps. Flat layers are sufficient.

## Open Questions

1. **Should clicking an object on a non-active layer auto-switch the active layer?**
   - What we know: tldraw allows interaction with any visible object regardless of layer. Figma requires you to be on the correct layer.
   - What's unclear: Which behavior feels more natural for a minimal overlay app.
   - Recommendation: Auto-switch to the layer containing the clicked object. This is more intuitive and prevents confusion. Only locked layers should prevent interaction.

2. **Maximum number of layers per note?**
   - What we know: More layers = larger state snapshots for undo/redo. Konva recommends max 3-5 canvas layers for performance.
   - What's unclear: At what point does the layer list become unwieldy.
   - Recommendation: Soft limit of 10 layers with a UI warning. No hard limit. Memory is the real constraint.

3. **Should layer opacity be a feature?**
   - What we know: Layer opacity is common in full drawing apps but adds complexity.
   - What's unclear: Whether users of a transparent overlay app need per-layer opacity.
   - Recommendation: Defer to a future enhancement. Start with binary visible/hidden. The app already has global opacity settings.

4. **How should "Select All" (Cmd+A) work with layers?**
   - What we know: Currently selects all objects across the entire note.
   - What's unclear: Should it select all on the active layer only, or all visible layers?
   - Recommendation: Select all on the active layer only. This is consistent with how other layer-based apps work and prevents accidental modification of other layers.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis (`src/renderer.js`, `src/index.html`, `src/styles.css`) - Data model, rendering, undo/redo, UI patterns
- Konva.js official docs (https://konvajs.org/docs/performance/Layer_Management.html) - Layer management performance tips

### Secondary (MEDIUM confidence)
- tldraw layer panel example (https://tldraw.dev/examples/layer-panel) - Minimal layer panel UI patterns (tree view, visibility toggle, selection sync)
- Excalidraw GitHub issues (#7725, #2170, #6266) - Community discussion on layer needs and expectations
- SortableJS (https://www.npmjs.com/package/sortablejs) - Reorderable list library specs (~14KB gzipped)
- tahazsh.com drag-to-reorder tutorial - Vanilla JS drag reorder implementation patterns

### Tertiary (LOW confidence)
- Canvas layer stacking patterns (dustinpfister.github.io) - Multi-canvas layer approach reference
- Various 2025 UI design trend articles - Glassmorphism, minimal panel patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No external dependencies needed; patterns verified against existing codebase
- Architecture: HIGH - Data model and rendering patterns derived directly from existing code analysis
- Pitfalls: HIGH - Identified from understanding the specific interaction between canvas rendering, DOM elements, and the undo/redo system
- UI patterns: MEDIUM - Based on tldraw reference and existing app styling patterns

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (stable domain, no fast-moving dependencies)
