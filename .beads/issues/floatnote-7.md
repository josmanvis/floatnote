# floatnote-7: Test renderer - Zoom, pan, and gestures

**Status:** open
**Priority:** medium
**Labels:** testing, renderer, gestures
**Depends:** floatnote-1

## Description
Test coverage for zoom, pan, rotation and gesture handling.

## Functions to Test
- `setupZoom()` - Zoom controls setup
- `setupGestures()` - Trackpad gesture handlers
- `zoomIn()` / `zoomOut()` - Zoom operations
- `resetZoom()` - Reset to 100%
- `applyTransform()` - Apply CSS transforms

## Test Cases
### Zoom
- [ ] Zoom in increases zoomLevel
- [ ] Zoom out decreases zoomLevel
- [ ] Zoom respects min/max bounds
- [ ] Reset zoom sets to 1.0
- [ ] Cmd++ zooms in
- [ ] Cmd+- zooms out
- [ ] Cmd+0 resets zoom

### Pan
- [ ] Two-finger pan updates panX/panY
- [ ] Pan disabled when setting is off

### Rotation
- [ ] Rotation gesture updates rotation
- [ ] Rotation disabled when setting is off

### Transforms
- [ ] applyTransform sets correct CSS
- [ ] Transform includes zoom, pan, rotation
