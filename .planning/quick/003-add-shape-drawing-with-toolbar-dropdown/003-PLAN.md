---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/index.html
  - src/renderer.js
  - src/styles.css
autonomous: true

must_haves:
  truths:
    - "User can see a Shapes button in the toolbar"
    - "Hovering the Shapes button reveals a dropdown with Square, Triangle, Circle, Line, Arrow"
    - "Selecting a shape from the dropdown activates shape drawing mode"
    - "User can click-and-drag on canvas to draw the selected shape"
    - "Shapes use the current brush color and stroke width"
    - "Shapes integrate with undo/redo"
    - "Shapes persist across save/load (stored as line data)"
  artifacts:
    - path: "src/index.html"
      provides: "Shapes dropdown button in toolbar"
      contains: "shape-toggle"
    - path: "src/renderer.js"
      provides: "Shape drawing logic and mode handling"
      contains: "generateShapePoints"
    - path: "src/styles.css"
      provides: "Shape dropdown styling"
      contains: "shape-dropdown"
  key_links:
    - from: "src/index.html"
      to: "src/renderer.js"
      via: "shape-toggle button click handlers"
      pattern: "shape-toggle"
    - from: "src/renderer.js shape mode"
      to: "src/renderer.js lines array"
      via: "generateShapePoints produces line.points"
      pattern: "this\\.lines\\.push"
---

<objective>
Add shape drawing support with a toolbar dropdown for Square, Triangle, Circle, Line, and Arrow.

Purpose: Users need to draw geometric shapes quickly without freehand drawing. Shapes are drawn by click-and-drag and stored as line data (arrays of points) so they integrate seamlessly with the existing undo/redo, selection, persistence, and rendering systems.

Output: Working shape tool with dropdown in toolbar, all five shapes drawable on canvas.
</objective>

<context>
@src/index.html - toolbar HTML structure, dropdown patterns (color, stroke)
@src/renderer.js - Glassboard class, drawing system, mode management, line data structure
@src/styles.css - toolbar styling, dropdown styling patterns
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add shapes dropdown to toolbar HTML and CSS</name>
  <files>src/index.html, src/styles.css</files>
  <action>
In `src/index.html`, add a shapes dropdown between the text-mode button and the toolbar-divider (before the color dropdown). Use the same `dropdown-container` pattern as stroke/color. Structure:

```html
<div class="dropdown-container">
    <button id="shape-toggle" class="tool-btn" title="Shapes (S)">
        <!-- Pentagon/shapes icon SVG, 18x18, fill="currentColor" -->
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
    </button>
    <div class="dropdown-menu shape-dropdown">
        <button class="shape-option" data-shape="rectangle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>
            <span>Rectangle</span>
        </button>
        <button class="shape-option" data-shape="circle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>
            <span>Circle</span>
        </button>
        <button class="shape-option" data-shape="triangle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L22 21H2z"/></svg>
            <span>Triangle</span>
        </button>
        <button class="shape-option" data-shape="line">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="20" y2="4"/></svg>
            <span>Line</span>
        </button>
        <button class="shape-option" data-shape="arrow">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="20" y2="4"/><polyline points="10,4 20,4 20,14"/></svg>
            <span>Arrow</span>
        </button>
    </div>
</div>
```

Place this AFTER the `</div>` closing the `.toolbar-group` div and BEFORE the first `<div class="toolbar-divider"></div>` in the main toolbar. This puts shapes next to the draw modes, before color/stroke options.

In `src/styles.css`, add styles for the shape dropdown. Follow the same pattern as `.stroke-dropdown` and `.stroke-option`:

```css
/* Shape dropdown */
.shape-dropdown {
    min-width: 130px;
}

.shape-option {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: white;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s ease;
}

.shape-option:hover {
    background: rgba(255, 255, 255, 0.1);
}

.shape-option.active {
    background: rgba(255, 255, 255, 0.08);
}

.shape-option.active::after {
    content: "\2713";
    margin-left: auto;
    color: #facc15;
}

.shape-option svg {
    flex-shrink: 0;
    stroke: white;
}
```
  </action>
  <verify>Open `src/index.html` in a text editor and confirm the shape dropdown is present. Check `src/styles.css` has `.shape-dropdown` and `.shape-option` rules. Run `npm start` and hover the toolbar to see the shapes button with dropdown.</verify>
  <done>Shapes button visible in toolbar. Hovering it shows dropdown with Rectangle, Circle, Triangle, Line, Arrow options with icons.</done>
</task>

<task type="auto">
  <name>Task 2: Add shape mode and drawing logic to renderer</name>
  <files>src/renderer.js</files>
  <action>
Add shape drawing support to the Glassboard class in `src/renderer.js`. This involves three changes:

**A) Add shape state properties in constructor (after line 20, near `this.currentLine = null`):**

```javascript
// Shape drawing state
this.currentShape = null;       // 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow' | null
this.isShapeMode = false;
this.shapeStartPoint = null;    // {x, y} where drag started
this.shapePreviewLine = null;   // Preview line during drag
```

**B) Add shape toolbar setup in `setupToolbar()` method (after the text mode click handler around line 332, before the color picker section):**

```javascript
// Shape tool dropdown
const shapeToggle = document.getElementById('shape-toggle');
const shapeOptions = document.querySelectorAll('.shape-option');

shapeOptions.forEach(btn => {
    btn.addEventListener('click', () => {
        shapeOptions.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentShape = btn.dataset.shape;
        this.isShapeMode = true;
        // Activate shape mode (similar to draw mode but with shape behavior)
        this.isSelectMode = false;
        this.isTextMode = false;
        selectModeBtn.classList.remove('active');
        drawModeBtn.classList.remove('active');
        textModeBtn.classList.remove('active');
        shapeToggle.classList.add('active');
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = 'crosshair';
        this.textContainer.style.pointerEvents = 'none';
    });
});
```

Also update `setMode` so that switching to select/draw/text deactivates shape mode:
After `this.isTextMode = mode === 'text';` add:
```javascript
this.isShapeMode = false;
this.currentShape = null;
shapeToggle.classList.remove('active');
shapeOptions.forEach(b => b.classList.remove('active'));
```

**C) Modify the `startDrawing`, `draw`, and `stopDrawing` functions in `setupDrawing()` to handle shape mode:**

In `startDrawing` (around line 486), add a shape mode branch AFTER the `this.isTextMode` return check and BEFORE the object-at-point check. Only enter this branch if `this.isShapeMode`:

```javascript
if (this.isShapeMode && this.currentShape) {
    this.isDrawing = true;
    this.app.classList.add('drawing');
    this.shapeStartPoint = point;
    // Create a preview line that will be updated during drag
    const now = Date.now();
    this.currentObjectId = now.toString();
    this.shapePreviewLine = {
        points: [point],
        color: this.currentColor,
        width: this.currentStrokeWidth,
        objectId: this.currentObjectId
    };
    this.currentLine = this.shapePreviewLine;
    return;
}
```

In `draw` (around line 537), add a shape mode branch AFTER the `this.isTextMode` return check and BEFORE the selection handling. Check `this.isShapeMode && this.isDrawing && this.shapeStartPoint`:

```javascript
if (this.isShapeMode && this.isDrawing && this.shapeStartPoint) {
    const shapePoints = this.generateShapePoints(this.currentShape, this.shapeStartPoint, point);
    this.shapePreviewLine.points = shapePoints;
    this.currentLine = this.shapePreviewLine;
    this.redraw();
    return;
}
```

In `stopDrawing` (around line 570), add a shape mode branch BEFORE the selection handling:

```javascript
if (this.isShapeMode && this.isDrawing && this.shapeStartPoint) {
    this.isDrawing = false;
    this.app.classList.remove('drawing');
    if (this.shapePreviewLine && this.shapePreviewLine.points.length > 1) {
        this.lines.push(this.shapePreviewLine);
        this.saveState();
    }
    this.shapePreviewLine = null;
    this.shapeStartPoint = null;
    this.currentLine = null;
    return;
}
```

**D) Add `generateShapePoints` method to the Glassboard class (after the `drawLine` method around line 1842):**

```javascript
generateShapePoints(shape, start, end) {
    const points = [];
    switch (shape) {
        case 'rectangle': {
            points.push(
                { x: start.x, y: start.y },
                { x: end.x, y: start.y },
                { x: end.x, y: end.y },
                { x: start.x, y: end.y },
                { x: start.x, y: start.y } // close the rectangle
            );
            break;
        }
        case 'circle': {
            // Generate points along an ellipse
            const cx = (start.x + end.x) / 2;
            const cy = (start.y + end.y) / 2;
            const rx = Math.abs(end.x - start.x) / 2;
            const ry = Math.abs(end.y - start.y) / 2;
            const segments = 64;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                points.push({
                    x: cx + rx * Math.cos(angle),
                    y: cy + ry * Math.sin(angle)
                });
            }
            break;
        }
        case 'triangle': {
            // Isoceles triangle: top-center, bottom-left, bottom-right
            const topX = (start.x + end.x) / 2;
            const topY = Math.min(start.y, end.y);
            const bottomY = Math.max(start.y, end.y);
            const leftX = Math.min(start.x, end.x);
            const rightX = Math.max(start.x, end.x);
            points.push(
                { x: topX, y: topY },
                { x: rightX, y: bottomY },
                { x: leftX, y: bottomY },
                { x: topX, y: topY } // close the triangle
            );
            break;
        }
        case 'line': {
            points.push(
                { x: start.x, y: start.y },
                { x: end.x, y: end.y }
            );
            break;
        }
        case 'arrow': {
            // Line with arrowhead at end
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) {
                points.push(start, end);
                break;
            }
            const headLen = Math.min(20, len * 0.3); // arrowhead length
            const angle = Math.atan2(dy, dx);
            const headAngle = Math.PI / 6; // 30 degrees

            // Main line
            points.push({ x: start.x, y: start.y });
            points.push({ x: end.x, y: end.y });
            // Left wing of arrowhead (pen-up simulated by returning to tip)
            points.push({
                x: end.x - headLen * Math.cos(angle - headAngle),
                y: end.y - headLen * Math.sin(angle - headAngle)
            });
            points.push({ x: end.x, y: end.y }); // back to tip
            // Right wing of arrowhead
            points.push({
                x: end.x - headLen * Math.cos(angle + headAngle),
                y: end.y - headLen * Math.sin(angle + headAngle)
            });
            break;
        }
    }
    return points;
}
```

**E) Add keyboard shortcut 'S' for shape mode in `setupKeyboardShortcuts`:**

Find the section with key handlers (where 'v', 'b', 't' are handled) and add:
```javascript
case 's':
    if (this.currentShape) {
        // Re-activate shape mode with last used shape
        this.isShapeMode = true;
        this.isSelectMode = false;
        this.isTextMode = false;
        const shapeToggle = document.getElementById('shape-toggle');
        const selectModeBtn = document.getElementById('select-mode');
        const drawModeBtn = document.getElementById('draw-mode');
        const textModeBtn = document.getElementById('text-mode');
        selectModeBtn.classList.remove('active');
        drawModeBtn.classList.remove('active');
        textModeBtn.classList.remove('active');
        shapeToggle.classList.add('active');
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.style.cursor = 'crosshair';
        this.textContainer.style.pointerEvents = 'none';
    }
    break;
```
  </action>
  <verify>Run `npm test` to ensure existing tests still pass. Then run `npm start`, select a shape from the dropdown, and click-drag on the canvas to draw it. Verify: rectangle draws a closed rect, circle draws an ellipse, triangle draws an isoceles triangle, line draws a straight line, arrow draws a line with arrowhead. Switch to draw mode (B key) and back to verify mode switching works. Draw a shape, press Cmd+Z to undo, Cmd+Shift+Z to redo.</verify>
  <done>All five shapes drawable via click-drag. Shapes use current color and stroke width. Shapes integrate with undo/redo. Mode switching between shape/draw/select/text works correctly. Shapes persist in the lines array and render on redraw.</done>
</task>

<task type="auto">
  <name>Task 3: Add keyboard shortcut to settings panel and verify persistence</name>
  <files>src/index.html</files>
  <action>
Add the shapes keyboard shortcut to the settings panel shortcuts list in `src/index.html`. Find the shortcuts list section and add this entry after the "Text mode" shortcut item:

```html
<div class="shortcut-item">
    <span>Shape mode</span><kbd>S</kbd>
</div>
```

Also verify that shape data persists correctly by testing: draw shapes, navigate to a different note, navigate back -- shapes should still be there. This works automatically because shapes are stored as line objects in the `this.lines` array which is the `notes[currentNoteIndex].lines` getter/setter, and `saveState()` is called after shape completion. No additional persistence code is needed.
  </action>
  <verify>Open the app with `npm start`. Open settings (Cmd+,), scroll to Keyboard Shortcuts section, confirm "Shape mode S" is listed. Draw a shape, switch notes and back, confirm shape persists. Close and reopen app, confirm shapes are still present.</verify>
  <done>Shape mode shortcut appears in settings panel. Shapes persist across note switching and app restarts.</done>
</task>

</tasks>

<verification>
- `npm test` passes (existing tests not broken)
- Toolbar shows Shapes button between mode buttons and divider
- Hovering Shapes button shows dropdown with 5 shape options
- Clicking a shape option activates shape mode (crosshair cursor, shape button highlighted)
- Click-and-drag draws the selected shape using current color and stroke width
- Live preview shown during drag
- Shapes work with undo/redo (Cmd+Z / Cmd+Shift+Z)
- Switching to draw/select/text mode deactivates shape mode
- 'S' key re-activates shape mode with last used shape
- Shapes persist in save data (close and reopen app)
- Settings panel shows Shape mode shortcut
</verification>

<success_criteria>
All five shapes (Rectangle, Circle, Triangle, Line, Arrow) are drawable via click-and-drag from a toolbar dropdown. Shapes render as line data, integrate with the existing undo/redo and persistence systems, and the UI follows the existing toolbar dropdown patterns.
</success_criteria>
