# floatnote-8: Test renderer - Undo/redo and history

**Status:** open
**Priority:** high
**Labels:** testing, renderer, history
**Depends:** floatnote-1

## Description
Test coverage for undo/redo functionality.

## Functions to Test
- `saveState()` - Save current state to history
- `undo()` - Restore previous state
- `redo()` - Restore next state
- `restoreState()` - Apply state from history

## Test Cases
- [ ] saveState adds to history array
- [ ] History limited to maxHistorySize
- [ ] Undo decrements historyIndex
- [ ] Undo restores previous lines
- [ ] Undo restores previous textItems
- [ ] Redo increments historyIndex
- [ ] Redo restores next state
- [ ] Redo unavailable at latest state
- [ ] Undo unavailable at oldest state
- [ ] Cmd+Z triggers undo
- [ ] Cmd+Shift+Z triggers redo
- [ ] New action clears redo stack
