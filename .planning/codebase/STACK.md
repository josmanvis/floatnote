# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- JavaScript (Node.js) - Main process, preload, IPC handling
- JavaScript (Browser/DOM) - Renderer process, UI interactions, canvas drawing

**Secondary:**
- Bash - CLI operations in `bin/floatnote.js`

## Runtime

**Environment:**
- Node.js 16.0.0+ (specified in `engines` field in `package.json`)
- Electron 33.0.0 - Desktop application framework

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present in repo)

## Frameworks

**Core:**
- Electron 33.0.0 - Desktop app framework providing main process, renderer process, and native APIs

**Testing:**
- Jest 29.7.0 - Test runner and framework
- jest-environment-jsdom 29.7.0 - DOM testing environment for renderer tests

**Build/Dev:**
- electron-builder 25.0.0 - Application packaging and distribution for macOS (dmg, zip)

## Key Dependencies

**Critical:**
- electron - Provides IPC, file I/O, clipboard access, window management, system shortcuts
- electron-builder - Enables macOS application distribution with auto-update support via GitHub releases

**Infrastructure:**
- None - No third-party backend services or data storage libraries

## Configuration

**Environment:**
- No `.env` file detected - all configuration is hardcoded or stored in `~/.config/floatnote/` directory
- Development mode enabled via CLI flag: `npm run dev --enable-logging`

**Build:**
- `electron-builder` configuration in `package.json` under `build` field
- App ID: `com.floatnote.app`
- macOS targets: `dmg` and `zip`
- Auto-update provider: GitHub releases
- Publisher: `josmanvis/floatnote`

**Electron Preload:**
- `contextBridge` exposes safe APIs to renderer
- No Node.js integration in renderer (`nodeIntegration: false`)
- Context isolation enabled (`contextIsolation: true`)
- Sandbox disabled (`sandbox: false`) - necessary for clipboard and file operations

## Platform Requirements

**Development:**
- macOS (hardcoded for window positioning, dock icons, tray icons, all-windows-on-top behavior)
- Node.js 16+
- npm

**Production:**
- macOS only (Electron builder configured for `mac` target only)
- Deployed via GitHub releases (ZIP and DMG formats)
- Single-instance lock enforced - only one app window can run at a time

## Data Storage

**Local:**
- JSON file persistence at `~/.config/floatnote/floatnote-data.json` (via Electron `app.getPath('userData')`)
- Export directory: `~/.floatnote/` for exporting individual notes
- PNG export: User-selected location via save dialog

## System Integration

**Keyboard Shortcuts (Global):**
- `Cmd+Shift+G` - Toggle Floatnote window
- `Alt+Space` - Quick toggle alternative

**macOS Integration:**
- Dock icon support
- Menu bar tray icon
- Always-on-top floating window
- Transparent background support
- Finder integration for opening exported folders

---

*Stack analysis: 2026-01-22*
