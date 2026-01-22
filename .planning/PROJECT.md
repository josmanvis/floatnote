# Floatnote

## What This Is

A transparent always-on-top drawing and note-taking overlay for macOS. It provides a floating canvas that stays above all other windows for annotations, drawing, and text notes. Built with Electron, distributed via npm CLI that auto-downloads the app from GitHub Releases.

## Core Value

A persistent, transparent scratch space that's always one keyboard shortcut away — draw, type, annotate without switching windows.

## Requirements

### Validated

- ✓ Canvas drawing with configurable brush (color, size, opacity) — existing
- ✓ Text overlay items with rich formatting (bold, italic, underline) — existing
- ✓ Multi-note system with pagination navigation — existing
- ✓ Auto-save to persistent JSON storage — existing
- ✓ Always-on-top transparent window with opacity controls — existing
- ✓ Global keyboard shortcut toggle (Cmd+Shift+G) — existing
- ✓ Tray menu integration — existing
- ✓ Window size presets (sm/md/lg) — existing
- ✓ Clipboard paste support (images and text) — existing
- ✓ File drag-and-drop support — existing
- ✓ PNG export — existing
- ✓ Note export to ~/.floatnote/ — existing
- ✓ Undo/redo history — existing
- ✓ Object selection and manipulation (move, resize, delete) — existing
- ✓ CLI launcher with auto-update from GitHub Releases — existing

### Active

- [ ] Core flow test coverage (drawing, text, notes, save/load)
- [ ] GitHub Actions CI/CD pipeline (build DMG on release)
- [ ] npm publish (make `npx floatnote` discoverable)

### Out of Scope

- Cross-platform support — macOS only, by design
- Cloud sync — local-first, no accounts
- Collaborative features — single-user tool
- Mobile companion — desktop overlay only

## Context

- Existing test suite covers basic unit tests but lacks coverage on core renderer logic (drawing, selection, transforms)
- electron-builder already configured for macOS DMG/ZIP builds
- CLI (`bin/floatnote.js`) already handles download and launch from GitHub Releases
- package.json has `bin` field pointing to CLI, ready for npm publish
- Publisher configured as `josmanvis/floatnote` in package.json build config

## Constraints

- **Platform**: macOS only — Electron configured for mac target exclusively
- **Tech stack**: Electron 33 + vanilla JS — no framework migration
- **Distribution**: npm CLI downloads pre-built app from GitHub Releases — not bundled in npm package

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Test core flows only (not comprehensive) | Ship fast, cover what matters | — Pending |
| Full CI/CD pipeline (Actions + npm) | Reproducible builds, easy updates | — Pending |
| CLI downloads from Releases (not bundled) | Keep npm package small, app is ~100MB+ | — Pending |

---
*Last updated: 2026-01-22 after initialization*
