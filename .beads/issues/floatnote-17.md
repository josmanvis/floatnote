# floatnote-17: Background opacity controls

**Status:** open
**Priority:** medium
**Labels:** feature, appearance

## Description
Allow setting opacity for both active and inactive backgrounds.

## Requirements
- Opacity slider (0-100%) for active background
- Opacity slider (0-100%) for inactive background
- Real-time preview as slider moves
- Persisted in settings

## Implementation
- Add `activeBgOpacity` and `inactiveBgOpacity` to settings
- Add range sliders to settings panel
- Apply opacity via CSS or window opacity
- Update on focus/blur events
