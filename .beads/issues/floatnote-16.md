# floatnote-16: Inactive background options

**Status:** open
**Priority:** medium
**Labels:** feature, appearance

## Description
Allow choosing a background style for when the window is not focused (inactive). Same options as active: transparent, blur, dark.

## Requirements
- Settings panel has "Active background" and "Inactive background" sections
- Same three options: Clear, Blur, Dark
- Window switches between backgrounds on focus/blur events
- Persisted in settings

## Implementation
- Add `inactiveBgMode` to settings
- Add UI controls in settings panel
- Update focus/blur handlers to switch background
- Call setBackgroundMode with appropriate mode
