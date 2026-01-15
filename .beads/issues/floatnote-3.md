# floatnote-3: Test main process (src/main.js)

**Status:** open
**Priority:** high
**Labels:** testing, electron, main-process
**Depends:** floatnote-1

## Description
100% test coverage for the Electron main process.

## Functions to Test
- `createWindow()` - Window creation and configuration
- `createTray()` - Tray icon and menu setup
- `toggleFloatnote()` - Show/hide window
- IPC handlers (save-data, load-data, set-pinned, etc.)

## Test Cases
### Window Management
- [ ] Creates window with correct dimensions
- [ ] Window is transparent and always-on-top
- [ ] Window positioned on correct display
- [ ] Single instance lock works
- [ ] Second instance focuses existing window
- [ ] Close confirmation dialog works
- [ ] Hide window handler works

### Tray
- [ ] Tray icon created with correct image
- [ ] Tray tooltip shows "Floatnote"
- [ ] Context menu has all items
- [ ] Left-click shows/focuses window
- [ ] Right-click shows context menu

### IPC Handlers
- [ ] save-data writes to file
- [ ] load-data reads from file
- [ ] set-pinned updates always-on-top
- [ ] set-window-size resizes correctly
- [ ] set-background-mode changes vibrancy
- [ ] resize-window-left adjusts bounds
- [ ] hide-window hides window

### Global Shortcuts
- [ ] Cmd+Shift+G toggles window
- [ ] Alt+Space toggles window
- [ ] Ctrl+\` toggles window

## Mocks Required
- Electron modules (BrowserWindow, Tray, Menu, etc.)
- fs module for data persistence
