// Mock Electron for testing

const mockBrowserWindow = {
  loadFile: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  focus: jest.fn(),
  close: jest.fn(),
  destroy: jest.fn(),
  isDestroyed: jest.fn(() => false),
  isMinimized: jest.fn(() => false),
  isVisible: jest.fn(() => true),
  restore: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  setVisibleOnAllWorkspaces: jest.fn(),
  setVibrancy: jest.fn(),
  setBackgroundColor: jest.fn(),
  setBounds: jest.fn(),
  getBounds: jest.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
  on: jest.fn(),
  webContents: {
    send: jest.fn()
  }
};

const BrowserWindow = jest.fn(() => mockBrowserWindow);
BrowserWindow.fromWebContents = jest.fn(() => mockBrowserWindow);

const mockTray = {
  setToolTip: jest.fn(),
  on: jest.fn(),
  popUpContextMenu: jest.fn()
};

const Tray = jest.fn(() => mockTray);

const Menu = {
  buildFromTemplate: jest.fn(() => ({}))
};

const nativeImage = {
  createFromDataURL: jest.fn(() => ({
    setTemplateImage: jest.fn()
  }))
};

const dialog = {
  showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
  showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/test/path.png' }))
};

const ipcMain = {
  on: jest.fn(),
  handle: jest.fn()
};

const ipcRenderer = {
  on: jest.fn(),
  send: jest.fn(),
  invoke: jest.fn(() => Promise.resolve({ success: true }))
};

const globalShortcut = {
  register: jest.fn(),
  unregisterAll: jest.fn()
};

const screen = {
  getCursorScreenPoint: jest.fn(() => ({ x: 500, y: 500 })),
  getDisplayNearestPoint: jest.fn(() => ({
    workAreaSize: { width: 1920, height: 1080 },
    workArea: { x: 0, y: 0 }
  }))
};

const shell = {
  openPath: jest.fn(() => Promise.resolve(''))
};

const clipboard = {
  availableFormats: jest.fn(() => []),
  readImage: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    toDataURL: jest.fn(() => ''),
    getSize: jest.fn(() => ({ width: 0, height: 0 }))
  })),
  readText: jest.fn(() => '')
};

const contextBridge = {
  exposeInMainWorld: jest.fn()
};

const app = {
  getPath: jest.fn((name) => {
    if (name === 'userData') return '/mock/userData';
    if (name === 'home') return '/mock/home';
    return '/mock/path';
  }),
  whenReady: jest.fn(() => Promise.resolve()),
  on: jest.fn(),
  quit: jest.fn(),
  requestSingleInstanceLock: jest.fn(() => true),
  dock: {
    setIcon: jest.fn()
  }
};

module.exports = {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  dialog,
  ipcMain,
  ipcRenderer,
  globalShortcut,
  screen,
  shell,
  clipboard,
  contextBridge,
  // Export mocks for direct access in tests
  mockBrowserWindow,
  mockTray
};
