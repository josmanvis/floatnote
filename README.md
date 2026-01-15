# Floatnote

Transparent always-on-top drawing and note-taking overlay for macOS.

![Floatnote](https://img.shields.io/npm/v/floatnote) ![License](https://img.shields.io/npm/l/floatnote)

## Installation

### Using npx (recommended)

```bash
npx floatnote
```

This will automatically download and launch the latest version of Floatnote.

### Using Homebrew

```bash
brew tap josmanvis/floatnote
brew install --cask floatnote
```

### Manual Download

Download the latest release from [GitHub Releases](https://github.com/josmanvis/floatnote/releases).

## Features

- **Transparent Overlay** - Draw on top of any application
- **Always on Top** - Never lose sight of your annotations
- **Drawing Tools** - Multiple colors and stroke sizes
- **Text Annotations** - Add text notes anywhere
- **Multi-note Support** - Create and navigate between multiple notes
- **Gesture Support** - Pinch to zoom, two-finger pan, rotate
- **Smart Paste** - Paste images directly from clipboard
- **Data Persistence** - Your notes are automatically saved

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle Floatnote | `Cmd+Shift+G` |
| Quick Toggle | `Alt+Space` or `Ctrl+\`` |
| Settings | `Cmd+,` |
| Previous Note | `[` |
| Next Note | `]` |
| Undo | `Cmd+Z` |
| Redo | `Cmd+Shift+Z` |
| Select Mode | `V` |
| Draw Mode | `B` |
| Text Mode | `T` |
| Select All | `Cmd+A` |
| Delete | `D` |
| Zoom In | `Cmd++` |
| Zoom Out | `Cmd+-` |
| Reset Zoom | `Cmd+0` |

## CLI Options

```bash
floatnote [options]

Options:
  -v, --version    Show version number
  -h, --help       Show help message
  --update         Force update to latest version
  --uninstall      Remove Floatnote from your system
```

## System Requirements

- macOS 10.13 or later
- Node.js 16+ (for npx installation)

## Development

```bash
# Clone the repository
git clone https://github.com/josmanvis/floatnote.git
cd floatnote

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for distribution
npm run build
```

## License

MIT
