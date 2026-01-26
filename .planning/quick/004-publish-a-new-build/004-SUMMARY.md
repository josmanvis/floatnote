# Quick Task 004: Publish a New Build — Summary

## What was done

1. **Pulled remote changes** — Rebased local shape drawing commits over GitHub App workflow addition
2. **Pushed 5 commits** to origin/main (shape drawing feature + docs)
3. **Bumped version** — 1.0.5 → 1.0.6 via `npm version patch`
4. **Pushed tag** — `v1.0.6` triggered release workflow
5. **Workflow succeeded** — Build, release, and npm publish all passed

## Release v1.0.6

- GitHub Release: v1.0.6 with macOS x64 + arm64 artifacts (DMG + ZIP)
- npm: floatnote@1.0.6 published successfully

## New in this release

- Shape drawing: Rectangle, Circle, Triangle, Line, Arrow
- Shapes toolbar button with dropdown
- Click-and-drag drawing with live preview
- Keyboard shortcut `S` for shape mode
