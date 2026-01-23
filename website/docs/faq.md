---
sidebar_position: 5
---

# FAQ

Frequently asked questions about Floatnote.

---

### Is Floatnote free?

Yes, Floatnote is completely free and open source under the MIT license. You can view the source code, contribute, or fork it on [GitHub](https://github.com/josmanvis/floatnote).

---

### Does it work on Windows or Linux?

Currently Floatnote is macOS only. It uses macOS-specific APIs for the transparent overlay functionality. Cross-platform support may be considered in the future.

---

### Where is my data stored?

Notes are stored in `~/.config/floatnote/floatnote-data.json`. Your data stays local and is never sent anywhere. You can back up this file or copy it to another machine.

---

### How do I update Floatnote?

Download the latest DMG from the [GitHub Releases](https://github.com/josmanvis/floatnote/releases/latest) page and replace the app in your Applications folder. If installed via npm, run:

```bash
npm update -g floatnote
```

---

### The app is not showing up when I press Cmd+Shift+D

Make sure Floatnote is running (check the menu bar tray icon). You may need to grant accessibility permissions:

1. Open **System Preferences** (or System Settings on macOS 13+)
2. Go to **Privacy & Security > Accessibility**
3. Add and enable Floatnote in the list

If the shortcut still does not work, another application may be using the same key combination.

---

### Can I change the keyboard shortcut?

The global shortcut (Cmd+Shift+D) is currently not configurable. If this is important to you, please request the feature on [GitHub Issues](https://github.com/josmanvis/floatnote/issues).

---

### How do I draw shapes?

1. Click the **shape dropdown** in the toolbar (or press **S**)
2. Select your shape type: rectangle, circle, triangle, line, or arrow
3. Click and drag on the canvas to draw the shape
4. Release to finalize the shape

---

### How do I select and move shapes?

1. Click the **pointer/select tool** in the toolbar
2. Click on a shape to select it (handles will appear)
3. **Drag** the shape to move it
4. **Drag handles** to resize
5. Use the **rotation handle** to rotate
6. Press **Delete/Backspace** to remove a selected shape

---

### Can I use Floatnote for presentations?

Yes! Floatnote's transparent overlay makes it perfect for annotating slides or any screen content during presentations. Use the **freeze** feature (press **F**) to lock the canvas in place while presenting.

---

### How do I export my drawings?

Press **Cmd+E** or use the export button in the toolbar to save the current canvas as a PNG file. The file is saved to your Desktop with a timestamped filename.
