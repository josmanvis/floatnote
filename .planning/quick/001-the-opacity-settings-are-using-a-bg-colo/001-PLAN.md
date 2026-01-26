# Quick Task 001: Fix opacity background color

## Goal
Change the opacity settings background color from white to black in the `#app` CSS rule.

## Tasks

### Task 1: Update rgba color in styles.css
- **File:** `src/styles.css`
- **Change:** Line 1385 - replace `rgba(255, 255, 255, var(--bg-opacity))` with `rgba(0, 0, 0, var(--bg-opacity))`
- **Rationale:** The overlay background should be black (dark) so that opacity creates a darkening effect, not a whitening/washing-out effect on the content beneath.
