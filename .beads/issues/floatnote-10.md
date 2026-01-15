# floatnote-10: Test renderer - Clipboard and paste

**Status:** open
**Priority:** medium
**Labels:** testing, renderer, clipboard
**Depends:** floatnote-1

## Description
Test coverage for clipboard and paste functionality.

## Functions to Test
- `setupClipboardPaste()` - Paste event handler
- `paste()` - Handle paste action
- `pasteImage()` - Paste image from clipboard
- `pasteText()` - Paste text from clipboard
- `setupImageResize()` - Image resize handles

## Test Cases
- [ ] Cmd+V triggers paste
- [ ] Paste detects image content
- [ ] Paste detects text content
- [ ] Pasted image creates DOM element
- [ ] Pasted image positioned correctly
- [ ] Pasted image can be dragged
- [ ] Pasted image can be resized
- [ ] Pasted text creates text item
- [ ] Images saved to images array
- [ ] Restored images match saved data
