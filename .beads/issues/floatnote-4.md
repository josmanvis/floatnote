# floatnote-4: Test renderer - Drawing functionality

**Status:** open
**Priority:** high
**Labels:** testing, renderer, drawing
**Depends:** floatnote-1

## Description
Test coverage for canvas drawing functionality in renderer.js.

## Functions to Test
- `setupCanvas()` - Canvas initialization
- `setupDrawing()` - Mouse event handlers
- `startDrawing()` - Begin stroke
- `draw()` - Continue stroke
- `stopDrawing()` - End stroke
- `drawLine()` - Render line to canvas
- `redraw()` - Full canvas redraw
- `smoothLine()` - Line smoothing algorithm

## Test Cases
- [ ] Canvas resizes to window dimensions
- [ ] Mouse down starts drawing in draw mode
- [ ] Mouse move creates points
- [ ] Mouse up ends stroke and saves line
- [ ] Lines grouped by objectId within timeout
- [ ] Drawing respects current color
- [ ] Drawing respects current stroke width
- [ ] Redraw renders all saved lines
- [ ] Line smoothing reduces point count
- [ ] Drawing disabled in select/text mode
