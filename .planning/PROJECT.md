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
- ✓ Shape drawing (rectangle, circle, triangle, line) with toolbar dropdown — v1.0
- ✓ Interactive shapes (select, resize, rotate) — v1.0
- ✓ Layer system (create, rename, delete, visibility, lock, reorder) — v1.0
- ✓ Integration tests for IPC contracts — v1.0
- ✓ E2E tests with Playwright for core user flows — v1.0
- ✓ GitHub Actions CI/CD (test on push, build+release on tag) — v1.0
- ✓ npm publishing (`npx floatnote`) — v1.0
- ✓ Docusaurus website on GitHub Pages — v1.0
- ✓ Menubar icon dark mode support — v1.0

### Out of Scope

- Cross-platform support — macOS only, by design
- Cloud sync — local-first, no accounts
- Collaborative features — single-user tool
- Mobile companion — desktop overlay only

## Context

- Full test suite: unit tests, integration tests (IPC contracts), E2E tests (Playwright + Electron)
- electron-builder configured for macOS DMG/ZIP builds (x64 + arm64)
- CLI (`bin/floatnote.js`) handles download and launch from GitHub Releases
- GitHub Actions: test workflow (push/PR), release workflow (tag → build → publish)
- npm package ships only bin/ (~5KB), app downloaded from GitHub Releases
- Layer system integrated into note data model with backward-compatible migration

## Constraints

- **Platform**: macOS only — Electron configured for mac target exclusively
- **Tech stack**: Electron 33 + vanilla JS — no framework migration
- **Distribution**: npm CLI downloads pre-built app from GitHub Releases — not bundled in npm package

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Jest 29 for integration, Playwright+Electron for E2E | Fast unit tests + real app verification | Complete |
| Skip code signing in CI | Defer to v2, unblocks releases now | Complete |
| npm ships only bin/ (~5KB CLI) | Keep npm package small, app is ~100MB+ | Complete |
| Layer data at note level with activeLayerId | Simple delegation, backward-compatible | Complete |
| Cross-layer selection auto-switches active layer | Intuitive UX, no manual layer switching needed | Complete |
| Explicit electron entry path (not main field) | Prevents src/ leaking into npm tarball | Complete |

---
*Last updated: 2026-01-24 after v1.0 milestone completion*
