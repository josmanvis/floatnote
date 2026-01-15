# floatnote-6: Test renderer - Select mode and object manipulation

**Status:** open
**Priority:** high
**Labels:** testing, renderer, selection
**Depends:** floatnote-1

## Description
Test coverage for selection and object manipulation.

## Functions to Test
- `selectObject()` - Select drawing object
- `deselectObject()` - Clear selection
- `findObjectAtPoint()` - Hit testing
- `deleteObject()` - Delete selected object
- `copyObject()` - Copy to clipboard
- `selectAll()` - Select all objects
- `deleteSelected()` - Bulk delete

## Test Cases
- [ ] Click on object selects it
- [ ] Click elsewhere deselects
- [ ] Selection highlight renders correctly
- [ ] Hit testing finds correct object
- [ ] Delete removes object from lines array
- [ ] Copy stores object in clipboard
- [ ] Cmd+A selects all objects
- [ ] D key deletes selected
- [ ] Bulk delete removes multiple objects
- [ ] Selection state persists across redraws
