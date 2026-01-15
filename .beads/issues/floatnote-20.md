# floatnote-20: Export note as PNG with Cmd+S

**Status:** closed
**Priority:** high
**Labels:** feature, export

## Description
Map Cmd+S to export the current note as a flattened PNG image.

## Requirements
- Cmd+S opens save dialog
- Export canvas + text + images as PNG
- User chooses destination
- Flatten all layers to single image

## Implementation
- Add Cmd+S handler in setupKeyboardShortcuts()
- Create exportAsPNG() method
- Use canvas.toDataURL() for drawing
- Render text and images to canvas before export
- Add IPC handler `export-png` with dialog.showSaveDialog()
- Add preload bridge function
