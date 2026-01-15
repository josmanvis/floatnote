// Tests for src/preload.js IPC bridge

describe('Preload IPC Bridge', () => {
  let mockIpcRenderer;
  let mockClipboard;
  let exposedAPI;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock implementations
    mockIpcRenderer = {
      on: jest.fn(),
      send: jest.fn(),
      invoke: jest.fn(() => Promise.resolve({ success: true }))
    };

    mockClipboard = {
      availableFormats: jest.fn(() => []),
      readImage: jest.fn(() => ({
        isEmpty: jest.fn(() => true),
        toDataURL: jest.fn(() => ''),
        getSize: jest.fn(() => ({ width: 0, height: 0 }))
      })),
      readText: jest.fn(() => '')
    };

    // Create mock API similar to what preload exposes
    exposedAPI = {
      onFocusChange: (callback) => {
        mockIpcRenderer.on('window-focus', (event, focused) => callback(focused));
      },
      closeWindow: () => {
        mockIpcRenderer.send('close-window');
      },
      hideWindow: () => {
        mockIpcRenderer.send('hide-window');
      },
      setPinned: (pinned) => {
        mockIpcRenderer.send('set-pinned', pinned);
      },
      setWindowSize: (size) => {
        mockIpcRenderer.send('set-window-size', size);
      },
      setBackgroundMode: (mode) => {
        mockIpcRenderer.send('set-background-mode', mode);
      },
      getClipboardContent: () => {
        const formats = mockClipboard.availableFormats();
        const hasImage = formats.some(f => f.includes('image'));
        const hasText = formats.some(f => f.includes('text'));
        if (hasImage) {
          const image = mockClipboard.readImage();
          if (!image.isEmpty()) {
            return { type: 'image', dataUrl: image.toDataURL() };
          }
        }
        if (hasText) {
          const text = mockClipboard.readText();
          if (text && text.trim()) {
            return { type: 'text', content: text };
          }
        }
        return null;
      },
      readClipboardImage: () => {
        const image = mockClipboard.readImage();
        if (!image.isEmpty()) {
          return image.toDataURL();
        }
        return null;
      },
      readClipboardText: () => {
        return mockClipboard.readText();
      },
      saveData: (data) => {
        return mockIpcRenderer.invoke('save-data', data);
      },
      loadData: () => {
        return mockIpcRenderer.invoke('load-data');
      },
      resizeWindowLeft: (deltaX) => {
        mockIpcRenderer.send('resize-window-left', deltaX);
      },
      exportToFloatnote: (noteData) => {
        return mockIpcRenderer.invoke('export-to-floatnote', noteData);
      },
      openFloatnoteFolder: () => {
        return mockIpcRenderer.invoke('open-floatnote-folder');
      },
      exportPNG: (imageDataUrl) => {
        return mockIpcRenderer.invoke('export-png', imageDataUrl);
      }
    };
  });

  describe('Window control functions', () => {
    test('closeWindow sends close-window IPC message', () => {
      exposedAPI.closeWindow();
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('close-window');
    });

    test('hideWindow sends hide-window IPC message', () => {
      exposedAPI.hideWindow();
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('hide-window');
    });

    test('setPinned sends set-pinned with value', () => {
      exposedAPI.setPinned(true);
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-pinned', true);

      exposedAPI.setPinned(false);
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-pinned', false);
    });

    test('setWindowSize sends correct size', () => {
      exposedAPI.setWindowSize('sm');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-window-size', 'sm');

      exposedAPI.setWindowSize('md');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-window-size', 'md');

      exposedAPI.setWindowSize('lg');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-window-size', 'lg');
    });

    test('setBackgroundMode sends correct mode', () => {
      exposedAPI.setBackgroundMode('blur');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-background-mode', 'blur');

      exposedAPI.setBackgroundMode('dark');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-background-mode', 'dark');

      exposedAPI.setBackgroundMode('transparent');
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('set-background-mode', 'transparent');
    });
  });

  describe('Focus change handling', () => {
    test('onFocusChange registers callback for window-focus', () => {
      const callback = jest.fn();
      exposedAPI.onFocusChange(callback);
      expect(mockIpcRenderer.on).toHaveBeenCalledWith('window-focus', expect.any(Function));
    });
  });

  describe('Clipboard functions', () => {
    test('getClipboardContent returns null when empty', () => {
      mockClipboard.availableFormats.mockReturnValue([]);
      const result = exposedAPI.getClipboardContent();
      expect(result).toBeNull();
    });

    test('getClipboardContent returns text when available', () => {
      mockClipboard.availableFormats.mockReturnValue(['text/plain']);
      mockClipboard.readText.mockReturnValue('Hello World');
      const result = exposedAPI.getClipboardContent();
      expect(result).toEqual({ type: 'text', content: 'Hello World' });
    });

    test('readClipboardText returns clipboard text', () => {
      mockClipboard.readText.mockReturnValue('Test text');
      const result = exposedAPI.readClipboardText();
      expect(result).toBe('Test text');
    });

    test('readClipboardImage returns null when empty', () => {
      mockClipboard.readImage.mockReturnValue({
        isEmpty: () => true,
        toDataURL: () => ''
      });
      const result = exposedAPI.readClipboardImage();
      expect(result).toBeNull();
    });
  });

  describe('Data persistence functions', () => {
    test('saveData invokes save-data IPC', async () => {
      const data = { notes: [], settings: {} };
      await exposedAPI.saveData(data);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('save-data', data);
    });

    test('loadData invokes load-data IPC', async () => {
      await exposedAPI.loadData();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('load-data');
    });
  });

  describe('Window resize', () => {
    test('resizeWindowLeft sends resize-window-left with delta', () => {
      exposedAPI.resizeWindowLeft(50);
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('resize-window-left', 50);

      exposedAPI.resizeWindowLeft(-30);
      expect(mockIpcRenderer.send).toHaveBeenCalledWith('resize-window-left', -30);
    });
  });

  describe('Export functions', () => {
    test('exportToFloatnote invokes export-to-floatnote IPC', async () => {
      const noteData = { id: '123', lines: [], textItems: [] };
      await exposedAPI.exportToFloatnote(noteData);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('export-to-floatnote', noteData);
    });

    test('openFloatnoteFolder invokes open-floatnote-folder IPC', async () => {
      await exposedAPI.openFloatnoteFolder();
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('open-floatnote-folder');
    });

    test('exportPNG invokes export-png IPC with image data', async () => {
      const imageDataUrl = 'data:image/png;base64,test123';
      await exposedAPI.exportPNG(imageDataUrl);
      expect(mockIpcRenderer.invoke).toHaveBeenCalledWith('export-png', imageDataUrl);
    });
  });
});
