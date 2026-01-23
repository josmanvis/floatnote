# Quick Task 003: Add Shape Drawing with Toolbar Dropdown

**One-liner:** Shape drawing tool with toolbar dropdown for rectangle/circle/triangle/line/arrow via click-drag, stored as line data for undo/redo/persistence compatibility.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add shapes dropdown to toolbar HTML and CSS | 626552e | src/index.html, src/styles.css |
| 2 | Add shape mode and drawing logic to renderer | 599d468 | src/renderer.js |
| 3 | Add keyboard shortcut to settings panel | 2fb4a5d | src/index.html |

## What Was Built

### Toolbar Dropdown
- Shapes button (rect icon) placed in toolbar between mode buttons and the divider
- Dropdown reveals on hover with five options: Rectangle, Circle, Triangle, Line, Arrow
- Each option has an SVG icon and label
- Active shape shows checkmark indicator (matching existing dropdown patterns)
- Shape button highlights when shape mode is active

### Shape Drawing Logic
- Click-and-drag on canvas draws the selected shape
- Live preview during drag (shape updates in real-time)
- Shapes use current brush color and stroke width
- Five shape types implemented:
  - **Rectangle:** 4-corner closed path
  - **Circle:** 64-segment ellipse fitting drag bounding box
  - **Triangle:** Isoceles triangle (top-center apex, wide base)
  - **Line:** Simple two-point straight line
  - **Arrow:** Line with arrowhead (30-degree wings, proportional size)

### Integration
- Shapes stored as line objects (points array) in `this.lines`
- Full undo/redo support (Cmd+Z / Cmd+Shift+Z)
- Persistence via existing save/load system (no changes needed)
- Selection, dragging, and deletion work on shapes
- Mode switching between shape/draw/select/text works correctly
- Keyboard shortcut 'S' re-activates shape mode with last used shape

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Store shapes as line data (points array) | Seamless integration with existing undo/redo, persistence, selection, and rendering systems |
| 64 segments for circle/ellipse | Smooth appearance at any zoom level without excessive point count |
| Arrow head proportional sizing (min 20px, max 30% of length) | Looks good at all sizes |
| Shape mode is separate from draw mode | Cleaner UX - draw mode is freehand, shape mode is geometric |

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- All 181 existing tests pass (no regressions)
- Toolbar shows Shapes button with working dropdown
- All five shapes drawable via click-drag
- Shapes use current color and stroke width
- Undo/redo works with shapes
- Mode switching deactivates shape mode
- 'S' key re-activates shape mode
- Shape mode shortcut listed in settings panel
- Shapes persist (stored as line data in notes array)

## Metrics

- **Duration:** ~2.4 minutes
- **Completed:** 2026-01-23
- **Tasks:** 3/3
- **Tests:** 181 passed, 0 failed
