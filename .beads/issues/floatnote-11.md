# floatnote-11: Test renderer - Settings and persistence

**Status:** open
**Priority:** medium
**Labels:** testing, renderer, settings
**Depends:** floatnote-1

## Description
Test coverage for settings panel and data persistence.

## Functions to Test
- `setupSettings()` - Settings panel setup
- `toggleSettings()` - Show/hide panel
- `hideSettings()` / `showSettings()`
- `saveData()` - Persist all data
- `loadSavedData()` - Restore saved data
- `autoSave()` - Debounced save

## Test Cases
### Settings Panel
- [ ] Cmd+, opens settings
- [ ] Close button hides settings
- [ ] Escape key hides settings
- [ ] Click outside hides settings
- [ ] Toggle changes update settings object
- [ ] Background mode changes apply

### Persistence
- [ ] saveData includes all notes
- [ ] saveData includes settings
- [ ] saveData includes transform
- [ ] loadSavedData restores notes
- [ ] loadSavedData restores settings
- [ ] loadSavedData handles legacy format
- [ ] Clean slate setting creates new note
- [ ] autoSave debounces multiple calls
