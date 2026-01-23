---
phase: quick-005
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [src/renderer.js]
autonomous: true

must_haves:
  truths:
    - "Clicking inside a shape (fill area) selects it"
    - "Dragging a selected shape moves it"
    - "Dragging corner/edge handles resizes the shape"
    - "Dragging the rotation handle rotates the shape"
    - "Selecting a shape and clicking a color swatch changes its color"
    - "All transforms modify the underlying points array so undo/redo works"
  artifacts:
    - path: "src/renderer.js"
      provides: "Shape selection, resize, rotate, move, color change"
  key_links:
    - from: "drawSelectionHighlight"
      to: "startDrawing/draw/stopDrawing"
      via: "handle hit detection and drag state"
      pattern: "handleType.*resize|rotate"
---

<objective>
Add interactive shape manipulation: select shapes by clicking inside them, resize via 8 handles (4 corners + 4 midpoints), rotate via a handle above the bounding box, move by dragging the shape body, and change color via the existing palette. All transforms modify points[] directly so undo/redo and persistence work automatically.

Purpose: Shapes drawn in task 003 are static -- users need to adjust them after creation.
Output: Fully interactive shapes in select mode with visual handles.
</objective>

<context>
@src/renderer.js

Key existing code to understand:
- `findObjectAtPoint(point)` at line ~696: checks point proximity, needs shape-fill-aware override
- `selectObject(objectId)` at line ~711: sets selectedObjectId, calls redraw
- `moveObject(objectId, dx, dy)` at line ~723: translates all points
- `drawSelectionHighlight()` at line ~2046: draws bounding box + 4 corner handles (visual only)
- `generateShapePoints(shape, start, end)` at line ~1941: creates point arrays for shapes
- `changeObjectColor(objectId, color)` at line ~866: already works for color changes
- Shapes are stored as regular line objects with `objectId` property
- The drawing event handlers (startDrawing/draw/stopDrawing) at line ~522 handle mouse events
</context>

<tasks>

<task type="auto">
  <name>Task 1: Shape-aware hit detection and fill-area selection</name>
  <files>src/renderer.js</files>
  <action>
Improve `findObjectAtPoint` to detect clicks inside shape fill areas, not just near their edge points.

Add a helper method `isPointInsideShape(point, line)` that:
- For rectangles (5 points, first==last): use point-in-polygon test (ray casting)
- For circles/ellipses (65 points, first near last): check if point is within the ellipse by computing distance from center relative to radii. Get center as average of all points, get rx/ry from bounding box.
- For triangles (4 points, first==last): use point-in-polygon (ray casting)
- For lines/arrows (2-5 points, no closure): keep existing proximity check (no fill area)
- For freehand strokes: keep existing proximity check

Detection heuristic to distinguish shape types from the points array (since there's no `tool` field stored on the line object after creation -- check if it was added in task 003):
- Check if line has a `tool` property. If so, use it directly.
- Fallback: rectangle = 5 points with first==last and right angles; circle = 60+ points; triangle = 4 points with first==last.

Update `findObjectAtPoint` to call `isPointInsideShape` first, falling back to the existing point-proximity check.

Ray casting algorithm for point-in-polygon:
```
let inside = false;
for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    if ((vertices[i].y > point.y) !== (vertices[j].y > point.y) &&
        point.x < (vertices[j].x - vertices[i].x) * (point.y - vertices[i].y) / (vertices[j].y - vertices[i].y) + vertices[i].x) {
        inside = !inside;
    }
}
```
  </action>
  <verify>Run `npm test` to ensure no regressions. Manual: start app, draw a rectangle, switch to select mode, click inside the rectangle body -- it should highlight with the selection box.</verify>
  <done>Clicking anywhere inside a closed shape (rectangle, circle, triangle) selects it. Lines/arrows/freehand still use proximity detection.</done>
</task>

<task type="auto">
  <name>Task 2: Interactive resize handles (8-point) with proportional scaling</name>
  <files>src/renderer.js</files>
  <action>
Extend the selection system to support interactive resize handles.

1. Add state properties to constructor:
   - `this.activeHandle = null` -- which handle is being dragged (e.g., 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w')
   - `this.handleSize = 8` -- size of handle squares (reuse existing constant)
   - `this.isResizing = false`
   - `this.resizeAnchor = null` -- the fixed point opposite the dragged handle

2. Update `drawSelectionHighlight()`:
   - Keep the existing 4 corner handles
   - Add 4 midpoint handles: top-center, right-center, bottom-center, left-center
   - Use white fill with blue border for handles (more visible): `fillStyle='#ffffff'`, `strokeStyle='#3b82f6'`, lineWidth 2

3. Add `getHandleAtPoint(point)` method:
   - Compute bounding box of selectedObjectId (same as drawSelectionHighlight)
   - Check if point is within handleSize/2 of any of the 8 handle positions
   - Return handle id ('nw','n','ne','e','se','s','sw','w') or null

4. Modify `startDrawing`:
   - BEFORE checking `findObjectAtPoint`, if `this.selectedObjectId` is set, call `getHandleAtPoint(point)`
   - If a handle is hit: set `this.isResizing = true`, `this.activeHandle = handleId`, compute and store `this.resizeAnchor` (the point diagonally/directly opposite), store `this.resizeStartBounds` (the current bounding box), return early
   - This ensures handle clicks take priority over shape body clicks

5. Modify `draw` (mousemove):
   - If `this.isResizing`: compute new bounding box based on which handle is dragged and current mouse position, then call `this.resizeObject(this.selectedObjectId, oldBounds, newBounds)`

6. Add `resizeObject(objectId, oldBounds, newBounds)` method:
   - For each point in the object's lines: normalize to [0,1] range relative to oldBounds, then map to newBounds
   - Formula: `newX = newBounds.x + ((p.x - oldBounds.x) / oldBounds.width) * newBounds.width`
   - Same for Y
   - Call `this.redraw()`

7. Modify `stopDrawing`:
   - If `this.isResizing`: set `this.isResizing = false`, `this.activeHandle = null`, call `this.saveState()`

8. Update cursor: when hovering over handles, set appropriate CSS cursor on the canvas element:
   - nw/se: 'nwse-resize'
   - ne/sw: 'nesw-resize'
   - n/s: 'ns-resize'
   - e/w: 'ew-resize'
   - Reset to default when not over handle
   - Add cursor update logic in the `draw` handler when not actively drawing/resizing (check if selectedObjectId exists and mouse is over a handle)
  </action>
  <verify>Run `npm test`. Manual: draw a shape, select it, drag a corner handle -- shape should scale proportionally. Drag a midpoint handle -- shape should stretch in that axis only. Cursor should change when hovering handles.</verify>
  <done>8 resize handles appear on selected shapes. Dragging any handle resizes the shape by transforming its points. Cursor changes on handle hover. State is saved after resize.</done>
</task>

<task type="auto">
  <name>Task 3: Rotation handle with point transformation</name>
  <files>src/renderer.js</files>
  <action>
Add a rotation handle above the selected shape's bounding box.

1. Add state to constructor:
   - `this.isRotating = false`
   - `this.rotateStartAngle = 0` -- angle when rotation drag started
   - `this.objectRotation = 0` -- accumulated rotation during current drag

2. Update `drawSelectionHighlight()`:
   - After drawing the bounding box and handles, draw a rotation handle:
   - Position: centered horizontally above the top edge, 25px above the top of the bounding box
   - Draw a thin line from top-center of bounding box to the rotation handle (strokeStyle '#3b82f6', lineWidth 1)
   - Draw a circle (radius 6) at the rotation handle position (white fill, blue border)

3. Update `getHandleAtPoint(point)`:
   - Also check if point is within 8px of the rotation handle position
   - Return 'rotate' if so

4. Modify `startDrawing`:
   - If `getHandleAtPoint` returns 'rotate': set `this.isRotating = true`, compute center of bounding box as rotation pivot, store the initial angle from center to mouse point using `Math.atan2`, return early

5. Modify `draw`:
   - If `this.isRotating`: compute current angle from center to mouse, get delta from startAngle, call `this.rotateObject(this.selectedObjectId, center, deltaAngle)`
   - Update `this.rotateStartAngle` to current angle (incremental rotation)

6. Add `rotateObject(objectId, center, angle)` method:
   - For each point in the object's lines:
     - Translate to origin: `dx = p.x - center.x`, `dy = p.y - center.y`
     - Rotate: `newX = dx * cos(angle) - dy * sin(angle)`, `newY = dx * sin(angle) + dy * cos(angle)`
     - Translate back: `p.x = newX + center.x`, `p.y = newY + center.y`
   - Call `this.redraw()`

7. Modify `stopDrawing`:
   - If `this.isRotating`: set `this.isRotating = false`, call `this.saveState()`

8. Cursor for rotation handle: set cursor to 'grab' when hovering the rotation handle, 'grabbing' when actively rotating.
  </action>
  <verify>Run `npm test`. Manual: draw a shape, select it, drag the circular handle above the shape -- it should rotate around its center. Undo should reverse the rotation.</verify>
  <done>A rotation handle appears 25px above selected shapes. Dragging it rotates all points around the shape center. Undo reverses rotation. Cursor shows grab/grabbing states.</done>
</task>

<task type="auto">
  <name>Task 4: Stroke width change for selected shapes and polish</name>
  <files>src/renderer.js</files>
  <action>
1. Wire up stroke width changes for selected objects:
   - Find the stroke width dropdown handler (near line ~392 based on the color handler pattern)
   - When a stroke width option is clicked and `this.selectedObjectId` is set, update the width of all lines belonging to that objectId
   - Add method `changeObjectWidth(objectId, width)` -- same pattern as `changeObjectColor`
   - Call `this.saveState()` after width change

2. Ensure the existing `changeObjectColor` calls `this.saveState()` after changing color (check if it already does -- if not, add it).

3. Fix `findObjectAtPoint` to also check shape fill when in select mode specifically (not in draw mode). Add a guard: only use fill-area detection when `this.isSelectMode` is true. In draw mode, keep the original proximity-only behavior so drawing over shapes works naturally.

4. Ensure deselection works cleanly:
   - Clicking empty canvas while a shape is selected: deselects (already works via existing code)
   - Switching away from select mode: deselects (check if `setMode` already does this)
   - Starting a new shape draw: deselects any selected shape

5. Set cursor to 'move' when hovering over a selected shape body (not a handle), and 'default' otherwise.
  </action>
  <verify>Run `npm test`. Manual: select a shape, pick a new stroke width from dropdown -- shape thickness changes. Select a shape, pick a color -- color changes. Click empty space -- deselects. Switch modes -- deselects.</verify>
  <done>Selected shapes respond to stroke width and color changes from the toolbar. Deselection is clean across all interactions. Cursor provides clear affordance for move/resize/rotate states.</done>
</task>

<task type="auto">
  <name>Task 5: Bump version and push to trigger release</name>
  <files>package.json</files>
  <action>
1. Run `npm version patch` to bump from 1.0.6 to 1.0.7
2. Run `git push origin main --tags` to push the version commit and tag, which triggers the GitHub Actions release workflow

Do NOT modify any other files. The npm version command auto-creates the commit and tag.
  </action>
  <verify>`git tag` shows v1.0.7. `git log --oneline -1` shows the version bump commit. Remote has the tag (push succeeded).</verify>
  <done>v1.0.7 tag pushed to origin, release workflow triggered automatically.</done>
</task>

</tasks>

<verification>
- `npm test` passes after each task
- Shapes can be selected by clicking inside their fill area
- Selected shapes show 8 resize handles + 1 rotation handle
- Dragging handles resizes/rotates the shape (points are transformed)
- Dragging shape body moves it
- Color and stroke width changes work on selected shapes
- Undo reverses all transforms (move, resize, rotate, color, width)
- v1.0.7 tag pushed and release workflow triggered
</verification>

<success_criteria>
- All shape types (rectangle, circle, triangle, line, arrow) are selectable and movable
- Closed shapes (rectangle, circle, triangle) support fill-area click detection
- Resize handles scale points proportionally
- Rotation handle rotates points around center
- Toolbar color/width changes apply to selected shape
- All transforms persist (modify points array directly)
- Undo/redo works for all transform operations
- New version published via tag push
</success_criteria>

<output>
After each task, commit with descriptive message. Final state: v1.0.7 released with interactive shape manipulation.
</output>
