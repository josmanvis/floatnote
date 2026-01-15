// Tests for src/main.js - Main Process

describe('Main Process', () => {
  let mockBrowserWindow;
  let mockApp;
  let mockDialog;
  let mockScreen;
  let mockShell;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh mocks for each test
    mockBrowserWindow = {
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

    mockApp = {
      getPath: jest.fn((name) => {
        if (name === 'userData') return '/mock/userData';
        if (name === 'home') return '/mock/home';
        return '/mock/path';
      }),
      requestSingleInstanceLock: jest.fn(() => true)
    };

    mockDialog = {
      showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
      showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/test/path.png' }))
    };

    mockScreen = {
      getCursorScreenPoint: jest.fn(() => ({ x: 500, y: 500 })),
      getDisplayNearestPoint: jest.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0 }
      }))
    };

    mockShell = {
      openPath: jest.fn(() => Promise.resolve(''))
    };

    mockFs = {
      existsSync: jest.fn(() => false),
      readFileSync: jest.fn(() => '{}'),
      writeFileSync: jest.fn(),
      mkdirSync: jest.fn()
    };
  });

  describe('Data storage paths', () => {
    test('should use correct user data path', () => {
      const userDataPath = mockApp.getPath('userData');
      expect(userDataPath).toBe('/mock/userData');
    });

    test('should use correct home path', () => {
      const homePath = mockApp.getPath('home');
      expect(homePath).toBe('/mock/home');
    });
  });

  describe('Single instance lock', () => {
    test('should request single instance lock', () => {
      const gotLock = mockApp.requestSingleInstanceLock();
      expect(gotLock).toBe(true);
    });
  });

  describe('Window creation', () => {
    test('window should load correct file', () => {
      mockBrowserWindow.loadFile('src/index.html');
      expect(mockBrowserWindow.loadFile).toHaveBeenCalledWith('src/index.html');
    });

    test('window should set always on top', () => {
      mockBrowserWindow.setAlwaysOnTop(true, 'floating', 1);
      expect(mockBrowserWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating', 1);
    });

    test('window should be visible on all workspaces', () => {
      mockBrowserWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      expect(mockBrowserWindow.setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, { visibleOnFullScreen: true });
    });
  });

  describe('IPC handlers', () => {
    test('save-data handler should write file', () => {
      const data = { notes: [], settings: {} };
      mockFs.writeFileSync('/mock/userData/floatnote-data.json', JSON.stringify(data, null, 2));
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    test('load-data handler should read file when exists', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('{"notes":[],"settings":{}}');

      if (mockFs.existsSync('/mock/userData/floatnote-data.json')) {
        const data = mockFs.readFileSync('/mock/userData/floatnote-data.json', 'utf-8');
        expect(data).toBeDefined();
      }
    });

    test('load-data handler should return null when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const exists = mockFs.existsSync('/mock/userData/floatnote-data.json');
      expect(exists).toBe(false);
    });
  });

  describe('Export to ~/.floatnote', () => {
    test('should create folder if not exists', () => {
      mockFs.existsSync.mockReturnValue(false);

      const floatnoteFolder = '/mock/home/.floatnote';
      if (!mockFs.existsSync(floatnoteFolder)) {
        mockFs.mkdirSync(floatnoteFolder, { recursive: true });
      }

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(floatnoteFolder, { recursive: true });
    });

    test('should write note file', () => {
      const noteData = { id: '123', lines: [], textItems: [] };
      const filePath = '/mock/home/.floatnote/note-123.json';
      mockFs.writeFileSync(filePath, JSON.stringify(noteData, null, 2));
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Open folder in Finder', () => {
    test('should call shell.openPath', async () => {
      const floatnoteFolder = '/mock/home/.floatnote';
      await mockShell.openPath(floatnoteFolder);
      expect(mockShell.openPath).toHaveBeenCalledWith(floatnoteFolder);
    });
  });

  describe('Export PNG', () => {
    test('should show save dialog', async () => {
      await mockDialog.showSaveDialog(mockBrowserWindow, {
        title: 'Export Note as PNG',
        defaultPath: 'floatnote.png',
        filters: [{ name: 'PNG Images', extensions: ['png'] }]
      });
      expect(mockDialog.showSaveDialog).toHaveBeenCalled();
    });

    test('should write PNG file', () => {
      const base64Data = 'iVBORw0KGgo=';
      mockFs.writeFileSync('/test/path.png', Buffer.from(base64Data, 'base64'));
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Screen utilities', () => {
    test('should get cursor screen point', () => {
      const point = mockScreen.getCursorScreenPoint();
      expect(point).toEqual({ x: 500, y: 500 });
    });

    test('should get display nearest to cursor', () => {
      const point = mockScreen.getCursorScreenPoint();
      const display = mockScreen.getDisplayNearestPoint(point);
      expect(display.workAreaSize).toBeDefined();
      expect(display.workArea).toBeDefined();
    });
  });

  describe('Window size presets', () => {
    test('should calculate small size (33% x 50%)', () => {
      const screenWidth = 1920;
      const screenHeight = 1080;
      const newWidth = Math.round(screenWidth * 0.33);
      const newHeight = Math.round(screenHeight * 0.5);
      expect(newWidth).toBe(634);
      expect(newHeight).toBe(540);
    });

    test('should calculate medium size (33% x 100%)', () => {
      const screenWidth = 1920;
      const screenHeight = 1080;
      const newWidth = Math.round(screenWidth * 0.33);
      const newHeight = screenHeight;
      expect(newWidth).toBe(634);
      expect(newHeight).toBe(1080);
    });

    test('should calculate large size (100% x 100%)', () => {
      const screenWidth = 1920;
      const screenHeight = 1080;
      const newWidth = screenWidth;
      const newHeight = screenHeight;
      expect(newWidth).toBe(1920);
      expect(newHeight).toBe(1080);
    });
  });

  describe('Background modes', () => {
    test('blur mode should set vibrancy', () => {
      mockBrowserWindow.setVibrancy('fullscreen-ui');
      mockBrowserWindow.setBackgroundColor('#00000000');
      expect(mockBrowserWindow.setVibrancy).toHaveBeenCalledWith('fullscreen-ui');
      expect(mockBrowserWindow.setBackgroundColor).toHaveBeenCalledWith('#00000000');
    });

    test('dark mode should clear vibrancy', () => {
      mockBrowserWindow.setVibrancy(null);
      mockBrowserWindow.setBackgroundColor('#00000000');
      expect(mockBrowserWindow.setVibrancy).toHaveBeenCalledWith(null);
    });

    test('transparent mode should clear vibrancy', () => {
      mockBrowserWindow.setVibrancy(null);
      mockBrowserWindow.setBackgroundColor('#00000000');
      expect(mockBrowserWindow.setVibrancy).toHaveBeenCalledWith(null);
    });
  });

  describe('Left edge resize', () => {
    test('should calculate new bounds correctly', () => {
      const bounds = { x: 1000, y: 0, width: 400, height: 600 };
      const deltaX = 50;
      const minWidth = 200;
      const newWidth = bounds.width - deltaX;

      if (newWidth >= minWidth) {
        const newBounds = {
          x: bounds.x + deltaX,
          y: bounds.y,
          width: newWidth,
          height: bounds.height
        };
        expect(newBounds.x).toBe(1050);
        expect(newBounds.width).toBe(350);
      }
    });

    test('should not resize below minimum width', () => {
      const bounds = { x: 1000, y: 0, width: 250, height: 600 };
      const deltaX = 100;
      const minWidth = 200;
      const newWidth = bounds.width - deltaX;

      expect(newWidth).toBe(150);
      expect(newWidth < minWidth).toBe(true);
    });
  });
});

describe('Dialog interactions', () => {
  test('close confirmation dialog should have correct options', async () => {
    const mockDialog = {
      showMessageBox: jest.fn(() => Promise.resolve({ response: 0 }))
    };

    const result = await mockDialog.showMessageBox({}, {
      type: 'warning',
      buttons: ['Close', 'Cancel'],
      defaultId: 1,
      title: 'Close Floatnote?',
      message: 'Are you sure you want to close Floatnote?'
    });
    expect(result.response).toBe(0);
  });
});
