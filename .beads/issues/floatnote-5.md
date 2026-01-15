# floatnote-5: Test renderer - Text mode functionality

**Status:** open
**Priority:** high
**Labels:** testing, renderer, text
**Depends:** floatnote-1

## Description
Test coverage for text annotation functionality.

## Functions to Test
- `setupTextMode()` - Text mode initialization
- `createTextItem()` - Create new text element
- `restoreTextItem()` - Restore text from saved data
- `setupTextDrag()` - Dragging text items
- `setupTextResize()` - Resizing text items

## Test Cases
- [ ] Click in text mode creates text item
- [ ] Text item positioned at click location
- [ ] Text item has editable contenteditable
- [ ] Text uses current color
- [ ] Text item can be dragged
- [ ] Text item can be resized
- [ ] Empty text items are removed on blur
- [ ] Text items saved to textItems array
- [ ] Restored text items match saved data
- [ ] Selected text item has visual indicator
