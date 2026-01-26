/**
 * IPC Handler Integration Tests
 *
 * These tests require the actual src/main.js module and verify that the IPC handlers
 * produce correct side effects and return values. Mocks capture the registered handlers
 * so they can be invoked directly without launching an Electron window.
 */

// In-memory file store (reset in beforeEach)
let mockFileStore = {};

// Handler capture maps
const mockHandlers = {};
const mockListeners = {};

// Mock BrowserWindow instance
const mockBrowserWindow = {
  close: jest.fn(),
  hide: jest.fn(),
  show: jest.fn(),
  focus: jest.fn(),
  setAlwaysOnTop: jest.fn(),
  setBounds: jest.fn(),
  getBounds: jest.fn(() => ({ x: 100, y: 0, width: 800, height: 600 })),
  setVisibleOnAllWorkspaces: jest.fn(),
  setVibrancy: jest.fn(),
  setBackgroundColor: jest.fn(),
  loadFile: jest.fn(),
  on: jest.fn(),
  isDestroyed: jest.fn(() => false),
  isMinimized: jest.fn(() => false),
  isVisible: jest.fn(() => true),
  destroy: jest.fn(),
  restore: jest.fn(),
  webContents: { send: jest.fn() },
};

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn((p) => p in mockFileStore),
  readFileSync: jest.fn((p, encoding) => {
    if (p in mockFileStore) {
      return mockFileStore[p];
    }
    const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
    err.code = 'ENOENT';
    throw err;
  }),
  writeFileSync: jest.fn((p, content) => {
    mockFileStore[p] = content;
  }),
  mkdirSync: jest.fn(),
}));

// Mock electron module with handler capture
jest.mock('electron', () => {
  const BrowserWindow = jest.fn(() => mockBrowserWindow);
  BrowserWindow.fromWebContents = jest.fn(() => mockBrowserWindow);
  BrowserWindow.getAllWindows = jest.fn(() => []);

  return {
    app: {
      getPath: jest.fn((name) => {
        if (name === 'userData') return '/mock/userData';
        if (name === 'home') return '/mock/home';
        return '/mock/path';
      }),
      requestSingleInstanceLock: jest.fn(() => true),
      whenReady: jest.fn(() => Promise.resolve()),
      on: jest.fn(),
      quit: jest.fn(),
      exit: jest.fn(),
      dock: { setIcon: jest.fn() },
    },
    BrowserWindow,
    ipcMain: {
      handle: jest.fn((channel, fn) => {
        mockHandlers[channel] = fn;
      }),
      on: jest.fn((channel, fn) => {
        mockListeners[channel] = fn;
      }),
    },
    screen: {
      getCursorScreenPoint: jest.fn(() => ({ x: 500, y: 500 })),
      getDisplayNearestPoint: jest.fn(() => ({
        workAreaSize: { width: 1920, height: 1080 },
        workArea: { x: 0, y: 0 },
      })),
    },
    globalShortcut: {
      register: jest.fn(),
      unregisterAll: jest.fn(),
    },
    dialog: {
      showSaveDialog: jest.fn(() =>
        Promise.resolve({ canceled: false, filePath: '/test/export.png' })
      ),
      showMessageBox: jest.fn(() => Promise.resolve({ response: 0 })),
    },
    shell: {
      openPath: jest.fn(() => Promise.resolve('')),
    },
    Tray: jest.fn(() => ({
      setToolTip: jest.fn(),
      on: jest.fn(),
      popUpContextMenu: jest.fn(),
    })),
    Menu: {
      buildFromTemplate: jest.fn(() => ({})),
    },
    nativeImage: {
      createFromDataURL: jest.fn(() => ({
        setTemplateImage: jest.fn(),
      })),
    },
  };
});

// Suppress main.js startup logs
jest.spyOn(console, 'log').mockImplementation(() => {});

// Require main.js to register all handlers
require('../../src/main.js');

const mockEvent = { sender: { id: 1 } };

describe('IPC Handler Integration Tests', () => {
  beforeEach(() => {
    mockFileStore = {};
    jest.clearAllMocks();

    // Re-bind the fs mock implementations after clearAllMocks
    const fs = require('fs');
    fs.existsSync.mockImplementation((p) => p in mockFileStore);
    fs.readFileSync.mockImplementation((p) => {
      if (p in mockFileStore) {
        return mockFileStore[p];
      }
      const err = new Error(`ENOENT: no such file or directory, open '${p}'`);
      err.code = 'ENOENT';
      throw err;
    });
    fs.writeFileSync.mockImplementation((p, content) => {
      mockFileStore[p] = content;
    });
    fs.mkdirSync.mockImplementation(() => {});

    // Re-bind BrowserWindow mock
    const { BrowserWindow } = require('electron');
    BrowserWindow.fromWebContents.mockReturnValue(mockBrowserWindow);
    mockBrowserWindow.getBounds.mockReturnValue({ x: 100, y: 0, width: 800, height: 600 });
    mockBrowserWindow.isDestroyed.mockReturnValue(false);
  });

  describe('Data Persistence Handlers', () => {
    describe('save-data', () => {
      it('writes JSON to dataFilePath and returns {success: true}', async () => {
        const testData = { notes: [{ id: 1, content: 'hello' }] };
        const result = await mockHandlers['save-data'](mockEvent, testData);

        expect(result).toEqual({ success: true });
        expect(mockFileStore['/mock/userData/floatnote-data.json']).toBe(
          JSON.stringify(testData, null, 2)
        );
      });

      it('returns {success: false, error} on write failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const fs = require('fs');
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const result = await mockHandlers['save-data'](mockEvent, { data: 'test' });

        expect(result).toEqual({ success: false, error: 'Permission denied' });
        console.error.mockRestore();
      });
    });

    describe('load-data', () => {
      it('reads back what save-data wrote and returns parsed object', async () => {
        const testData = { notes: [{ id: 1, lines: [] }] };
        // Write via save-data first
        await mockHandlers['save-data'](mockEvent, testData);

        const result = await mockHandlers['load-data'](mockEvent);

        expect(result).toEqual({ success: true, data: testData });
      });

      it('returns {success: true, data: null} when no file exists', async () => {
        const result = await mockHandlers['load-data'](mockEvent);

        expect(result).toEqual({ success: true, data: null });
      });

      it('returns {success: false, error} on read failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const fs = require('fs');
        // File exists but readFileSync throws
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Disk error');
        });

        const result = await mockHandlers['load-data'](mockEvent);

        expect(result).toEqual({ success: false, error: 'Disk error' });
        console.error.mockRestore();
      });
    });

    describe('export-to-floatnote', () => {
      it('creates ~/.floatnote dir and writes note-{id}.json', async () => {
        const noteData = { id: 42, lines: ['line1'], textItems: [] };
        const result = await mockHandlers['export-to-floatnote'](mockEvent, noteData);

        expect(result).toEqual({
          success: true,
          path: '/mock/home/.floatnote/note-42.json',
        });

        const written = JSON.parse(mockFileStore['/mock/home/.floatnote/note-42.json']);
        expect(written).toEqual(noteData);
      });

      it('creates folder when it does not exist', async () => {
        const fs = require('fs');
        const noteData = { id: 1, lines: [] };
        await mockHandlers['export-to-floatnote'](mockEvent, noteData);

        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.floatnote', { recursive: true });
      });

      it('returns {success: false, error} on write failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const fs = require('fs');
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Export failed');
        });

        const noteData = { id: 99, lines: [] };
        const result = await mockHandlers['export-to-floatnote'](mockEvent, noteData);

        expect(result).toEqual({ success: false, error: 'Export failed' });
        console.error.mockRestore();
      });
    });

    describe('export-png', () => {
      it('shows save dialog and writes decoded PNG buffer', async () => {
        const { dialog } = require('electron');
        const fs = require('fs');
        const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

        const result = await mockHandlers['export-png'](mockEvent, imageDataUrl);

        expect(result).toEqual({ success: true, path: '/test/export.png' });
        expect(dialog.showSaveDialog).toHaveBeenCalled();

        // Verify decoded buffer was written
        const expectedBuffer = Buffer.from('iVBORw0KGgo=', 'base64');
        expect(fs.writeFileSync).toHaveBeenCalledWith('/test/export.png', expectedBuffer);
      });

      it('temporarily disables always-on-top during dialog', async () => {
        const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
        await mockHandlers['export-png'](mockEvent, imageDataUrl);

        // First call should disable always-on-top
        expect(mockBrowserWindow.setAlwaysOnTop).toHaveBeenCalledWith(false);
        // Second call should re-enable it
        expect(mockBrowserWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating', 1);
      });

      it('returns {success: false, canceled: true} when dialog is canceled', async () => {
        const { dialog } = require('electron');
        dialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: '' });

        const result = await mockHandlers['export-png'](mockEvent, 'data:image/png;base64,abc=');

        expect(result).toEqual({ success: false, canceled: true });
      });

      it('returns {success: false, error} on failure', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        const { dialog } = require('electron');
        dialog.showSaveDialog.mockRejectedValue(new Error('Dialog error'));

        const result = await mockHandlers['export-png'](mockEvent, 'data:image/png;base64,abc=');

        expect(result).toEqual({ success: false, error: 'Dialog error' });
        console.error.mockRestore();
      });
    });

    describe('open-floatnote-folder', () => {
      it('calls shell.openPath on the floatnote folder', async () => {
        const { shell } = require('electron');

        const result = await mockHandlers['open-floatnote-folder'](mockEvent);

        expect(result).toEqual({ success: true });
        expect(shell.openPath).toHaveBeenCalledWith('/mock/home/.floatnote');
      });

      it('creates folder if it does not exist', async () => {
        const fs = require('fs');
        await mockHandlers['open-floatnote-folder'](mockEvent);

        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/home/.floatnote', { recursive: true });
      });
    });
  });

  describe('Window Management Handlers', () => {
    describe('close-window', () => {
      it('triggers window closure via BrowserWindow', () => {
        mockListeners['close-window'](mockEvent);

        expect(mockBrowserWindow.close).toHaveBeenCalled();
      });

      it('does nothing when window is null', () => {
        const { BrowserWindow } = require('electron');
        BrowserWindow.fromWebContents.mockReturnValue(null);

        mockListeners['close-window'](mockEvent);

        expect(mockBrowserWindow.close).not.toHaveBeenCalled();
      });
    });

    describe('hide-window', () => {
      it('triggers window hiding via BrowserWindow', () => {
        mockListeners['hide-window'](mockEvent);

        expect(mockBrowserWindow.hide).toHaveBeenCalled();
      });

      it('does nothing when window is null', () => {
        const { BrowserWindow } = require('electron');
        BrowserWindow.fromWebContents.mockReturnValue(null);

        mockListeners['hide-window'](mockEvent);

        expect(mockBrowserWindow.hide).not.toHaveBeenCalled();
      });
    });

    describe('set-pinned', () => {
      it('keeps window on top when pinned', () => {
        mockListeners['set-pinned'](mockEvent, true);

        expect(mockBrowserWindow.setAlwaysOnTop).toHaveBeenCalledWith(true, 'floating', 1);
      });

      it('removes always-on-top when unpinned', () => {
        mockListeners['set-pinned'](mockEvent, false);

        expect(mockBrowserWindow.setAlwaysOnTop).toHaveBeenCalledWith(false, 'floating', 1);
      });
    });

    describe('set-window-size', () => {
      it('computes correct bounds for "sm" size', () => {
        mockListeners['set-window-size'](mockEvent, 'sm');

        const expectedWidth = Math.round(1920 * 0.33);
        const expectedHeight = Math.round(1080 * 0.5);
        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 0 + 1920 - expectedWidth,
          y: 0 + 1080 - expectedHeight,
          width: expectedWidth,
          height: expectedHeight,
        });
      });

      it('computes correct bounds for "md" size', () => {
        mockListeners['set-window-size'](mockEvent, 'md');

        const expectedWidth = Math.round(1920 * 0.33);
        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 0 + 1920 - expectedWidth,
          y: 0,
          width: expectedWidth,
          height: 1080,
        });
      });

      it('computes correct bounds for "lg" size', () => {
        mockListeners['set-window-size'](mockEvent, 'lg');

        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
        });
      });

      it('does nothing for unknown size', () => {
        mockListeners['set-window-size'](mockEvent, 'xl');

        expect(mockBrowserWindow.setBounds).not.toHaveBeenCalled();
      });

      it('does nothing when window is null', () => {
        const { BrowserWindow } = require('electron');
        BrowserWindow.fromWebContents.mockReturnValue(null);

        mockListeners['set-window-size'](mockEvent, 'md');

        expect(mockBrowserWindow.setBounds).not.toHaveBeenCalled();
      });
    });

    describe('resize-window-left', () => {
      it('adjusts x and width based on deltaX', () => {
        // getBounds returns {x:100, y:0, width:800, height:600}
        mockListeners['resize-window-left'](mockEvent, 50);

        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 150,
          y: 0,
          width: 750,
          height: 600,
        });
      });

      it('enforces 200px minimum width', () => {
        // width=800, deltaX=700 would make newWidth=100 which is < 200
        mockListeners['resize-window-left'](mockEvent, 700);

        expect(mockBrowserWindow.setBounds).not.toHaveBeenCalled();
      });

      it('allows resize when exactly at minimum', () => {
        // width=800, deltaX=600 would make newWidth=200 which equals minWidth
        mockListeners['resize-window-left'](mockEvent, 600);

        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 700,
          y: 0,
          width: 200,
          height: 600,
        });
      });

      it('handles negative deltaX (expanding left)', () => {
        // deltaX=-100 means expanding: newWidth=900, newX=0
        mockListeners['resize-window-left'](mockEvent, -100);

        expect(mockBrowserWindow.setBounds).toHaveBeenCalledWith({
          x: 0,
          y: 0,
          width: 900,
          height: 600,
        });
      });

      it('does nothing when window is null', () => {
        const { BrowserWindow } = require('electron');
        BrowserWindow.fromWebContents.mockReturnValue(null);

        mockListeners['resize-window-left'](mockEvent, 50);

        expect(mockBrowserWindow.setBounds).not.toHaveBeenCalled();
      });
    });

    describe('open-file', () => {
      it('calls shell.openPath when file exists', () => {
        const { shell } = require('electron');
        mockFileStore['/test/file.txt'] = 'content';

        mockListeners['open-file'](mockEvent, '/test/file.txt');

        expect(shell.openPath).toHaveBeenCalledWith('/test/file.txt');
      });

      it('does not call shell.openPath for missing files', () => {
        const { shell } = require('electron');

        mockListeners['open-file'](mockEvent, '/nonexistent/file.txt');

        expect(shell.openPath).not.toHaveBeenCalled();
      });

      it('does not call shell.openPath when filePath is falsy', () => {
        const { shell } = require('electron');

        mockListeners['open-file'](mockEvent, null);

        expect(shell.openPath).not.toHaveBeenCalled();
      });
    });
  });
});
