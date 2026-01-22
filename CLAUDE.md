# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Floatnote is a transparent always-on-top drawing and note-taking overlay for macOS, built with Electron. It provides a floating canvas that stays above all other windows for annotations, drawing, and text notes.

## Commands

```bash
npm start          # Run the app
npm run dev        # Run with logging enabled
npm run build      # Build distributable (electron-builder)
npm test           # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

Run a single test file:
```bash
npx jest tests/renderer/notes.test.js
```

Run tests for a specific project (main, renderer, cli, preload):
```bash
npx jest --selectProjects=renderer
```

## Architecture

### Electron Process Model

- **Main process** (`src/main.js`): Window management, global shortcuts, IPC handlers, tray menu, data persistence. Single-window architecture with `requestSingleInstanceLock()`.

- **Preload** (`src/preload.js`): Exposes `window.glassboard` API via contextBridge. Handles IPC communication, clipboard access, and file operations.

- **Renderer** (`src/renderer.js`): The `Glassboard` class manages the entire UI - canvas drawing, text overlays, multi-note system, gestures, undo/redo, and settings.

### Key Data Structures

Notes are stored as objects with `lines`, `textItems`, `images`, and `attachments` arrays. The current note is accessed via getters that delegate to `this.notes[this.currentNoteIndex]`.

Data persists to `~/.config/floatnote/floatnote-data.json` (via Electron's userData path). Notes can also be exported to `~/.floatnote/`.

### IPC Communication

Main ↔ Renderer communication uses named channels:
- `close-window`, `hide-window`, `set-pinned`, `set-window-size`, `set-background-mode` (send)
- `save-data`, `load-data`, `export-to-floatnote`, `export-png` (invoke/handle)
- `window-focus`, `background-mode-changed`, `window-toggled-open` (events to renderer)

### Testing

Jest with separate projects for different contexts:
- `main`: Uses electron mock (`tests/mocks/electron.js`)
- `renderer`: Uses jsdom environment
- `preload`: Uses electron mock
- `cli`: Node environment for CLI tests

The electron mock simulates BrowserWindow, app, globalShortcut, and other Electron APIs.
