# floatnote-19: Open notes folder in Finder

**Status:** closed
**Priority:** medium
**Labels:** feature, ui

## Description
Add a button in settings to open the ~/.floatnote folder in Finder.

## Requirements
- Button: "Open Notes Folder" in settings panel
- Opens ~/.floatnote in Finder
- Creates folder if it doesn't exist

## Implementation
- Add IPC handler `open-floatnote-folder` in main.js
- Use shell.openPath() from Electron
- Add preload bridge function
- Add button in settings UI
