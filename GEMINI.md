# Glassboard macOS App

This document provides instructions on how to build and run the Glassboard application.

## Prerequisites

- Node.js (v18 or later)
- npm (comes with Node.js)

No Xcode required! This app uses Electron which works with any IDE or text editor.

## Core Features

*   **Always-on-top windows:** Windows will "float" above all other applications.
*   **Transparency:** Windows will be completely transparent, with a blur effect when focused.
*   **Focus Indication:** A yellow border will appear when a window is in focus.
*   **Standard Shortcuts:**
    *   `Cmd+N`: Create a new Glassboard window.
    *   `Cmd+W`: Close the focused window (with confirmation).
*   **Content Creation:** Support for both drawing and typing on the boards.
*   **Resizable:** Windows can be freely resized by the user.

## How to Run the Project

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm start
   ```

3. Build a distributable app:
   ```bash
   npm run build
   ```

## Usage

- **Drawing Mode** (default): Click and drag to draw on the canvas
- **Text Mode**: Click the "T" button, then double-click anywhere to add text
- **Colors**: Click any color in the toolbar to change the drawing/text color
- **Stroke Width**: Click the size buttons to change the stroke width
- **Clear**: Click the trash button to clear all content
- **Move Window**: Drag from the top of the window
- **New Window**: Press `Cmd+N` to create a new Glassboard window
- **Close Window**: Press `Cmd+W` or close normally (with confirmation dialog)
