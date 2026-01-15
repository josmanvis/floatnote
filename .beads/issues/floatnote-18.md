# floatnote-18: Auto-save notes to ~/.floatnote folder

**Status:** closed
**Priority:** medium
**Labels:** feature, storage

## Description
Add a setting to automatically save notes to ~/.floatnote folder for backup and external access.

## Requirements
- Toggle setting: "Auto-save notes to ~/.floatnote"
- On save, write note JSON to `~/.floatnote/note-{id}.json`
- Create directory if it doesn't exist
- Only save when setting is enabled

## Implementation
- Add `autoSaveToFolder` setting
- Add IPC handler `export-to-floatnote` in main.js
- Add preload bridge function
- Add toggle in settings UI
- Call export on each autoSave() if enabled
