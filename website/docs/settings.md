---
sidebar_position: 4
---

# Settings

Configure Floatnote to match your workflow.

## Pen Settings

Customize your drawing tool:

- **Color picker**: Click the color swatch in the toolbar to choose a pen color
- **Size slider**: Adjust the pen stroke width using the size control
- Settings persist between sessions

## Window Size

Choose from preset window sizes:

| Size | Dimensions | Best for |
|------|-----------|----------|
| SM | 33% width x 50% height | Quick annotations |
| MD | 33% width x 100% height | Side panel notes |
| LG | 50% width x 100% height | Detailed drawings |

Access window size options from the toolbar or tray menu.

## Background Modes

Control the canvas transparency:

- **Transparent**: Fully see-through canvas (default). Draw on top of visible content.
- **Semi-transparent**: Slightly darkened background for better visibility of annotations.
- **Opaque**: Solid background for focused note-taking without distractions.

## Pin Mode

Control window behavior:

- **Pinned (default)**: Window stays on top of all other windows at all times
- **Unpinned**: Window can go behind other windows when they receive focus

Toggle via the pin button in the toolbar.

## Data Storage

Floatnote stores all data locally:

- **Data file**: `~/.config/floatnote/floatnote-data.json`
- **Contents**: All notes, drawings, text items, shapes, and settings
- **Format**: JSON (human-readable, can be backed up)
- **Auto-save**: Changes save automatically

### Backup

To back up your Floatnote data:

```bash
cp ~/.config/floatnote/floatnote-data.json ~/floatnote-backup.json
```

### Reset

To reset all data and start fresh:

```bash
rm ~/.config/floatnote/floatnote-data.json
```

Restart Floatnote after deleting the data file.

## Export Location

When exporting canvases as PNG:

- **Default location**: Desktop (`~/Desktop`)
- **File name**: `floatnote-export-{timestamp}.png`
- **Triggered by**: Cmd+E or the export button in the toolbar
