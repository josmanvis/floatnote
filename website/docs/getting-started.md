---
sidebar_position: 1
---

# Getting Started

Get up and running with Floatnote in under a minute.

## Installation

### Download DMG (Recommended)

1. Go to the [Download page](/download) or [GitHub Releases](https://github.com/josmanvis/floatnote/releases/latest)
2. Download the DMG for your Mac:
   - **Apple Silicon** (M1/M2/M3/M4): `Floatnote-x.x.x-arm64.dmg`
   - **Intel**: `Floatnote-x.x.x.dmg`
3. Open the DMG and drag Floatnote to your Applications folder
4. Launch Floatnote from Applications

If the app doesn't open, you may need to remove the quarantine attribute:

```bash
xattr -cr Floatnote.app
```

Then try launching Floatnote again.

### Install via npm

```bash
npm install -g floatnote && floatnote
```

The npm package provides a CLI that automatically downloads and installs the latest release for your architecture.

## First Launch

When you first launch Floatnote:

1. A transparent overlay window appears on your screen
2. The app icon appears in your menu bar tray
3. You may need to grant **Accessibility permissions** in System Preferences > Privacy & Security > Accessibility

The overlay is transparent by default -- you can see and interact with everything behind it while drawing on top.

## Toggle Visibility

Press **Cmd+Shift+D** to show or hide Floatnote at any time. This global shortcut works from any application.

## Basic Usage

### Drawing

- Move your mouse/trackpad and draw directly on the canvas
- The default tool is the **pen** (freehand drawing)
- Change color and pen size from the toolbar

### Adding Text

- Press **T** or double-click on the canvas to add a text overlay
- Type your text and click elsewhere to place it
- Drag text items to reposition them

### Switching Notes

Floatnote supports multiple notes (canvases):

- Use **Left/Right arrow keys** to switch between notes
- Each note has its own independent canvas with drawings, text, and shapes

### Shapes

- Click the **shape dropdown** in the toolbar (press **S**)
- Select a shape type: rectangle, circle, triangle, line, or arrow
- Click and drag on the canvas to draw the shape

### Undo/Redo

- **Cmd+Z** to undo
- **Cmd+Shift+Z** to redo

## Next Steps

- Learn about all [Features](/docs/features)
- See the full [Keyboard Shortcuts](/docs/shortcuts) reference
- Configure [Settings](/docs/settings) to your preference
