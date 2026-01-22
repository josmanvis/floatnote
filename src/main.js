const {
  app,
  BrowserWindow,
  globalShortcut,
  dialog,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  shell,
} = require("electron");
const path = require("path");
const fs = require("fs");

// Data storage path
const userDataPath = app.getPath("userData");
const dataFilePath = path.join(userDataPath, "floatnote-data.json");

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.exit(0);
}

// Single window reference
let mainWindow = null;
let tray = null;

// Handle second instance attempt - show existing window
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Track if we're currently creating a window to prevent race conditions
let isCreatingWindow = false;

function createWindow(options = {}) {
  // If window already exists, just show it
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  // Prevent race condition - if already creating, don't create another
  if (isCreatingWindow) {
    return null;
  }
  isCreatingWindow = true;

  // Close any stray windows (safety check)
  BrowserWindow.getAllWindows().forEach((win) => {
    if (win !== mainWindow) {
      win.destroy();
    }
  });

  // Get the display where the cursor is (or primary display)
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { width: screenWidth, height: screenHeight } =
    currentDisplay.workAreaSize;
  const { x: displayX, y: displayY } = currentDisplay.workArea;

  // Default: 30% width, full height, anchored to right
  const windowWidth = Math.round(screenWidth * 0.3);
  const windowHeight = screenHeight;

  // Position on the right edge of the current display
  const x = options.x ?? displayX + screenWidth - windowWidth;
  const y = options.y ?? displayY;

  const win = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "customButtonsOnHover",
    trafficLightPosition: { x: -100, y: -100 },
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    skipTaskbar: false,

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Ensure window stays on top at all times
  win.setAlwaysOnTop(true, "floating", 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.loadFile(path.join(__dirname, "index.html"));

  // Track focus for yellow glow effect
  win.on("focus", () => {
    win.webContents.send("window-focus", true);
  });

  win.on("blur", () => {
    win.webContents.send("window-focus", false);
  });

  // Handle close confirmation
  win.on("close", (e) => {
    e.preventDefault();

    dialog
      .showMessageBox(win, {
        type: "warning",
        buttons: ["Close", "Cancel"],
        defaultId: 1,
        title: "Close Floatnote?",
        message: "Are you sure you want to close Floatnote?",
        detail: "Any unsaved content will be lost.",
      })
      .then((result) => {
        if (result.response === 0) {
          mainWindow = null;
          win.destroy();
        }
      });
  });

  // Ensure cleanup when window is destroyed
  win.on("closed", () => {
    mainWindow = null;
  });

  mainWindow = win;
  isCreatingWindow = false;
  return win;
}

app.whenReady().then(() => {
  // Set dock icon for macOS app switcher
  if (process.platform === "darwin" && app.dock) {
    // Create a 512x512 dock icon (simple "G" icon)
    const dockIconBase64 =
      "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";
    const dockIcon = nativeImage.createFromDataURL(
      `data:image/png;base64,${dockIconBase64}`,
    );
    app.dock.setIcon(dockIcon);
  }

  // Create menu bar tray icon
  createTray();

  // Create the window
  createWindow();

  // Register global shortcut to toggle Floatnote (Cmd+Shift+G)
  globalShortcut.register("CommandOrControl+Shift+G", () => {
    toggleFloatnote();
  });

  // Alternative quick toggle: Option+Space (like Spotlight)
  globalShortcut.register("Alt+Space", () => {
    toggleFloatnote();
  });
});

function createTray() {
  // Create a 16x16 template icon embedded as base64
  // This is a simple "G" letter icon that works as a macOS template image
  const iconBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAABBPTzcAAAACXBIWXMAAAsTAAALEwEAmpwYAAACamlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTY8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+MTY8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KXwjvyAAAALNJREFUOBFjZGBg+M+ABjCYGP4z/GdgUGBkYDjPwMDwH0XOf4b/TP8ZGM4zMjD8h8oBOU9AgMxMBrDAf4b/jAz/kZ3AwPD/PyMDw38kJwAF/zOC+CCJf0BBRkYGhv8MDIwMDAwgJ/xnAgr8Z2D4z8Dw//9/BkZGRob/ICdAxRj+MzAygBQCJRgYGP6D+EB5kPP/MzD8R3ECUAwiBhYEOYGRkeE/0GAGBgYgG+oloCAA7jIp5c7VUCUAAAAASUVORK5CYII=";

  const icon = nativeImage.createFromDataURL(
    `data:image/png;base64,${iconBase64}`,
  );
  icon.setTemplateImage(true);

  tray = new Tray(icon);
  tray.setToolTip("Floatnote");

  // Create context menu for right-click
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Floatnote",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: "Hide Floatnote",
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.hide();
        }
      },
    },
    { type: "separator" },
    {
      label: "Shortcuts",
      submenu: [
        { label: "Toggle: ⌘⇧G", enabled: false },
        { label: "Quick Toggle: ⌥Space", enabled: false },
        { label: "Quick Toggle: ⌃`", enabled: false },
        { label: "Settings: ⌘,", enabled: false },
        { label: "Close: ⌘W", enabled: false },
        { type: "separator" },
        { label: "Undo: ⌘Z", enabled: false },
        { label: "Redo: ⌘⇧Z", enabled: false },
        { type: "separator" },
        { label: "Select Mode: V", enabled: false },
        { label: "Draw Mode: B", enabled: false },
        { label: "Text Mode: T", enabled: false },
        { type: "separator" },
        { label: "Copy: ⌘C", enabled: false },
        { label: "Paste: ⌘V", enabled: false },
        { label: "Delete: D", enabled: false },
        { type: "separator" },
        { label: "Zoom In: ⌘+", enabled: false },
        { label: "Zoom Out: ⌘-", enabled: false },
        { label: "Reset Zoom: ⌘0", enabled: false },
      ],
    },
    { type: "separator" },
    {
      label: "About Floatnote",
      click: () => {
        dialog.showMessageBox({
          type: "info",
          title: "About Floatnote",
          message: "Floatnote",
          detail:
            "A transparent drawing and note-taking overlay for macOS.\n\nVersion 1.0.0",
        });
      },
    },
    { type: "separator" },
    {
      label: "Quit Floatnote",
      accelerator: "CommandOrControl+Q",
      click: () => app.quit(),
    },
  ]);

  // Left-click: Show/focus the window
  tray.on("click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });

  // Right-click: Show context menu
  tray.on("right-click", () => {
    tray.popUpContextMenu(contextMenu);
  });
}

function toggleFloatnote() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
    // Notify renderer that window was shown via toggle
    mainWindow.webContents.send("window-toggled-open");
  }
}

// Handle Cmd+W from renderer
ipcMain.on("close-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
  }
});

// Handle hide window (no confirmation, just hide)
ipcMain.on("hide-window", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.hide();
  }
});

// Handle pin toggle from renderer
ipcMain.on("set-pinned", (event, pinned) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setAlwaysOnTop(pinned, "floating", 1);
  }
});

// Handle window size change from renderer
ipcMain.on("set-window-size", (event, size) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { width: screenWidth, height: screenHeight } =
    currentDisplay.workAreaSize;
  const { x: displayX, y: displayY } = currentDisplay.workArea;

  let newWidth, newHeight, newX, newY;

  switch (size) {
    case "sm":
      newWidth = Math.round(screenWidth * 0.33);
      newHeight = Math.round(screenHeight * 0.5);
      newX = displayX + screenWidth - newWidth;
      newY = displayY + screenHeight - newHeight;
      break;
    case "md":
      newWidth = Math.round(screenWidth * 0.33);
      newHeight = screenHeight;
      newX = displayX + screenWidth - newWidth;
      newY = displayY;
      break;
    case "lg":
      newWidth = screenWidth;
      newHeight = screenHeight;
      newX = displayX;
      newY = displayY;
      break;
    default:
      return;
  }

  win.setBounds({ x: newX, y: newY, width: newWidth, height: newHeight });
});

app.on("window-all-closed", () => {
  // Don't quit on macOS
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Handle horizontal resize from left edge
ipcMain.on("resize-window-left", (event, deltaX) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  const bounds = win.getBounds();
  const minWidth = 200;
  const newWidth = bounds.width - deltaX;

  if (newWidth >= minWidth) {
    win.setBounds({
      x: bounds.x + deltaX,
      y: bounds.y,
      width: newWidth,
      height: bounds.height,
    });
  }
});

// Data persistence handlers
ipcMain.handle("save-data", async (event, data) => {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Failed to save data:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("load-data", async () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, "utf-8");
      return { success: true, data: JSON.parse(data) };
    }
    return { success: true, data: null };
  } catch (error) {
    console.error("Failed to load data:", error);
    return { success: false, error: error.message };
  }
});

// Floatnote folder path
const floatnoteFolder = path.join(app.getPath("home"), ".floatnote");

// Export note to ~/.floatnote folder
ipcMain.handle("export-to-floatnote", async (event, noteData) => {
  try {
    console.log("export-to-floatnote called, saving to:", floatnoteFolder);
    // Create folder if it doesn't exist
    if (!fs.existsSync(floatnoteFolder)) {
      console.log("Creating folder:", floatnoteFolder);
      fs.mkdirSync(floatnoteFolder, { recursive: true });
    }

    const filename = `note-${noteData.id}.json`;
    const filePath = path.join(floatnoteFolder, filename);
    console.log("Writing file:", filePath);
    fs.writeFileSync(filePath, JSON.stringify(noteData, null, 2));
    console.log("File written successfully");
    return { success: true, path: filePath };
  } catch (error) {
    console.error("Failed to export note:", error);
    return { success: false, error: error.message };
  }
});

// Open ~/.floatnote folder in Finder
ipcMain.handle("open-floatnote-folder", async () => {
  try {
    // Create folder if it doesn't exist
    if (!fs.existsSync(floatnoteFolder)) {
      fs.mkdirSync(floatnoteFolder, { recursive: true });
    }
    await shell.openPath(floatnoteFolder);
    return { success: true };
  } catch (error) {
    console.error("Failed to open folder:", error);
    return { success: false, error: error.message };
  }
});

// Open file in default application
ipcMain.on("open-file", (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.openPath(filePath);
  }
});

// Export note as PNG with save dialog
ipcMain.handle("export-png", async (event, imageDataUrl) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender);

    // Temporarily disable always-on-top so dialog appears in front
    if (win) {
      win.setAlwaysOnTop(false);
    }

    const result = await dialog.showSaveDialog(win, {
      title: "Export Note as PNG",
      defaultPath: `floatnote-${Date.now()}.png`,
      filters: [{ name: "PNG Images", extensions: ["png"] }],
    });

    // Re-enable always-on-top
    if (win) {
      win.setAlwaysOnTop(true, "floating", 1);
    }

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    // Remove data URL prefix and write file
    const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(result.filePath, Buffer.from(base64Data, "base64"));
    return { success: true, path: result.filePath };
  } catch (error) {
    console.error("Failed to export PNG:", error);
    return { success: false, error: error.message };
  }
});
