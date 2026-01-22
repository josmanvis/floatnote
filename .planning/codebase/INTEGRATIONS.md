# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**GitHub:**
- GitHub Releases API - Used for auto-update checks and release data retrieval
  - SDK/Client: Built-in `https` module
  - Endpoint: `api.github.com/repos/{owner}/{repo}/releases/latest`
  - Purpose: CLI tool fetches latest release information for app updates
  - Auth: User-Agent header only (`floatnote-cli`)

## Data Storage

**Databases:**
- Not used - No database backend

**File Storage:**
- Local filesystem only
  - Application data: `~/.config/floatnote/floatnote-data.json` (managed by Electron)
  - User exports: `~/.floatnote/` directory (user-accessible)
  - PNG exports: User-selected location via system save dialog

**Caching:**
- None - No caching mechanism implemented

## Authentication & Identity

**Auth Provider:**
- Custom/None - No authentication system
- Single-user, local-only application with no user accounts or authentication

## System APIs

**Electron Native APIs:**
- BrowserWindow - Window management
- globalShortcut - Keyboard shortcut registration
- ipcMain/ipcRenderer - Inter-process communication
- clipboard - System clipboard read operations (images and text)
- screen - Display detection and cursor positioning
- Tray - Menu bar integration
- Menu - Context menus
- nativeImage - Icon handling
- shell - File system operations (open folders, paths)
- dialog - File save dialogs
- app - Application lifecycle, userData path access

**Node.js APIs:**
- fs - File system operations (read/write JSON)
- path - Path resolution
- child_process - Process spawning and execution (in CLI)
- https - HTTP requests (GitHub API calls)

## Monitoring & Observability

**Error Tracking:**
- None - No external error tracking service

**Logs:**
- Console logging only (`console.log`, `console.error`)
- Enabled via CLI flag: `npm run dev --enable-logging`
- Log locations: stdout/stderr of Electron process

## CI/CD & Deployment

**Hosting:**
- GitHub Releases - Distribution of DMG and ZIP files

**CI Pipeline:**
- Not detected in codebase
- Releases appear to be manual via `electron-builder` with GitHub publisher configuration

## Environment Configuration

**Required env vars:**
- None detected - No environment variables required for runtime

**Secrets location:**
- None - No secrets management implemented

## Webhooks & Callbacks

**Incoming:**
- IPC handlers from renderer to main process:
  - `save-data` - Persist note data to JSON file
  - `load-data` - Load persisted notes from JSON file
  - `export-to-floatnote` - Export note to `~/.floatnote/` directory
  - `export-png` - Export canvas as PNG image
  - `open-floatnote-folder` - Open export directory in Finder
  - `close-window` - Trigger window close (with confirmation dialog)
  - `hide-window` - Hide window without closing
  - `set-pinned` - Control always-on-top behavior
  - `set-window-size` - Resize window to preset dimensions (sm/md/lg)
  - `resize-window-left` - Allow left-edge drag resize

**Outgoing:**
- IPC events from main to renderer:
  - `window-focus` - Notify when window gains/loses focus
  - `window-toggled-open` - Notify when window is shown via toggle shortcut
  - `background-mode-changed` - Notify when appearance settings change
- GitHub API - HTTP requests to fetch release information (CLI only)

## CLI Distribution

**Update Mechanism:**
- Manual check via CLI: `bin/floatnote.js`
- Queries GitHub releases API
- Downloads latest app from release assets
- Extracts to `~/.floatnote/Floatnote.app`
- Supports progress reporting during download

**Network Requirements:**
- HTTPS only
- Handles 301/302 redirects for download links
- User-Agent header: `floatnote-cli`

---

*Integration audit: 2026-01-22*
