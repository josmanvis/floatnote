# floatnote-9: Test renderer - Multi-note system

**Status:** open
**Priority:** high
**Labels:** testing, renderer, notes
**Depends:** floatnote-1

## Description
Test coverage for multi-note navigation system.

## Functions to Test
- `createEmptyNote()` - Create blank note
- `previousNote()` - Navigate backward
- `nextNote()` - Navigate forward or create new
- `saveCurrentNoteState()` - Save before switch
- `loadCurrentNote()` - Load note content
- `clearDisplay()` - Clear current display
- `updateNoteIndicator()` - Show note position

## Test Cases
- [ ] createEmptyNote has correct structure
- [ ] previousNote decrements currentNoteIndex
- [ ] previousNote does nothing at index 0
- [ ] nextNote increments if more notes exist
- [ ] nextNote creates new note at end
- [ ] loadCurrentNote restores lines
- [ ] loadCurrentNote restores textItems
- [ ] loadCurrentNote restores images
- [ ] clearDisplay removes text elements
- [ ] Note indicator shows correct position
- [ ] [ key goes to previous note
- [ ] ] key goes to next note
