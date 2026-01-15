# floatnote-13: Test preload.js IPC bridge

**Status:** open
**Priority:** medium
**Labels:** testing, preload, ipc
**Depends:** floatnote-1

## Description
Test coverage for the preload script IPC bridge.

## Functions to Test
- `onFocusChange()` - Focus event listener
- `closeWindow()` - Close IPC
- `hideWindow()` - Hide IPC
- `setPinned()` - Pin state IPC
- `setWindowSize()` - Size IPC
- `setBackgroundMode()` - Background IPC
- `getClipboardContent()` - Read clipboard
- `readClipboardImage()` - Read image
- `readClipboardText()` - Read text
- `saveData()` - Save IPC
- `loadData()` - Load IPC
- `resizeWindowLeft()` - Resize IPC

## Test Cases
- [ ] onFocusChange registers callback
- [ ] closeWindow sends correct IPC
- [ ] hideWindow sends correct IPC
- [ ] setPinned sends boolean value
- [ ] setWindowSize sends size string
- [ ] setBackgroundMode sends mode string
- [ ] getClipboardContent returns image data
- [ ] getClipboardContent returns text data
- [ ] getClipboardContent returns null if empty
- [ ] saveData invokes IPC handler
- [ ] loadData invokes IPC handler
- [ ] resizeWindowLeft sends delta value
