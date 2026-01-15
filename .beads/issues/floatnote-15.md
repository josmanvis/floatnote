# floatnote-15: Note pagination UI island

**Status:** closed
**Priority:** high
**Labels:** feature, ui

## Description
Add a visible pagination control island showing prev/next buttons and current page number. Pinned to the right side, follows same visibility rules as toolbar.

## Requirements
- Island pinned to right side of screen
- Shows: [<] [1/5] [>] style controls
- Same show/hide rules as toolbar (visible on hover/focus)
- Click < for previous note
- Click > for next note
- Page number shows current/total

## Implementation
- Add `#pagination-island` element to HTML
- Style similar to other control islands
- Wire up to previousNote/nextNote functions
- Update display when notes change
