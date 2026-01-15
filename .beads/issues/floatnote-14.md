# floatnote-14: Multi-select with drag box

**Status:** closed
**Priority:** high
**Labels:** feature, selection

## Description
Allow users to click-hold-drag with the select tool to draw a selection rectangle and select all objects within it.

## Requirements
- In select mode, click and drag creates a selection rectangle
- All objects (drawings, text, images) within the rectangle are selected
- Visual feedback showing the selection rectangle while dragging
- Selected objects highlighted with selection indicator
- Works with existing selection (shift to add to selection?)

## Implementation
- Add `selectionRect` state for drag selection
- Track mousedown position as start point
- Draw selection rectangle overlay during drag
- On mouseup, find all objects intersecting rectangle
- Add to `selectedObjects` array
