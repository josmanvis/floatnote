/**
 * Preload Bridge Contract Verification Tests
 *
 * Verifies that the preload bridge (src/preload.js) exposes all APIs
 * that renderer.js depends on, with correct IPC channel mappings and
 * argument forwarding.
 *
 * This is a bidirectional contract test:
 * - Fails if renderer calls something preload doesn't expose
 * - Fails if preload exposes something renderer never calls (unless whitelisted)
 * - Fails if IPC channels in preload don't match handlers in main.js
 */

const path = require('path');

// Mock electron before requiring preload
jest.mock('electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
    invoke: jest.fn(() => Promise.resolve({ success: true }))
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  },
  clipboard: {
    availableFormats: jest.fn(() => []),
    readImage: jest.fn(() => ({
      isEmpty: jest.fn(() => true),
      toDataURL: jest.fn(() => ''),
      getSize: jest.fn(() => ({ width: 0, height: 0 }))
    })),
    readText: jest.fn(() => '')
  },
  nativeImage: {
    createFromDataURL: jest.fn(() => ({
      setTemplateImage: jest.fn()
    }))
  }
}));

const { contextBridge, ipcRenderer, clipboard } = require('electron');

// Require the actual preload script - this triggers exposeInMainWorld
require('../../src/preload.js');

// Capture registration facts before any beforeEach clears mocks
const registrationNamespace = contextBridge.exposeInMainWorld.mock.calls[0][0];
const exposedAPI = contextBridge.exposeInMainWorld.mock.calls[0][1];

describe('Preload Bridge Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API registration', () => {
    test('exposeInMainWorld was called with "glassboard" as namespace', () => {
      expect(registrationNamespace).toBe('glassboard');
    });

    test('exposed API is a non-null object', () => {
      expect(exposedAPI).toBeDefined();
      expect(typeof exposedAPI).toBe('object');
      expect(exposedAPI).not.toBeNull();
    });
  });

  describe('API completeness - bidirectional contract verification', () => {
    const realFs = jest.requireActual('fs');
    const rendererSource = realFs.readFileSync(
      path.join(__dirname, '../../src/renderer.js'),
      'utf-8'
    );

    // Extract all window.glassboard.* method calls from renderer.js
    const methodRegex = /window\.glassboard\.(\w+)/g;
    const rendererMethods = new Set();
    let match;
    while ((match = methodRegex.exec(rendererSource)) !== null) {
      rendererMethods.add(match[1]);
    }

    // Known intentionally-exposed utility methods not currently called by renderer.
    // These are valid API surface that may be used by future features or external consumers.
    const knownExtras = new Set(['readClipboardImage', 'readClipboardText']);

    test('renderer.js calls at least one glassboard method', () => {
      expect(rendererMethods.size).toBeGreaterThan(0);
    });

    test('all methods renderer.js calls exist on the exposed API', () => {
      const missing = [];
      for (const method of rendererMethods) {
        if (typeof exposedAPI[method] !== 'function') {
          missing.push(method);
        }
      }
      expect(missing).toEqual([]);
    });

    test('no unexpected extra methods exposed beyond renderer usage and known extras', () => {
      const exposedKeys = new Set(Object.keys(exposedAPI));
      const unexpected = [];
      for (const key of exposedKeys) {
        if (!rendererMethods.has(key) && !knownExtras.has(key)) {
          unexpected.push(key);
        }
      }
      expect(unexpected).toEqual([]);
    });

    test('known extra methods are actually exposed', () => {
      for (const method of knownExtras) {
        expect(typeof exposedAPI[method]).toBe('function');
      }
    });
  });

  describe('IPC channel cross-verification - preload channels match main.js', () => {
    const realFs = jest.requireActual('fs');
    const mainSource = realFs.readFileSync(
      path.join(__dirname, '../../src/main.js'),
      'utf-8'
    );
    const preloadSource = realFs.readFileSync(
      path.join(__dirname, '../../src/preload.js'),
      'utf-8'
    );

    // Extract channels from main.js: ipcMain.handle('channel') and ipcMain.on('channel')
    const mainHandleRegex = /ipcMain\.handle\(['"]([^'"]+)['"]/g;
    const mainOnRegex = /ipcMain\.on\(['"]([^'"]+)['"]/g;
    const mainChannels = new Set();
    let m;
    while ((m = mainHandleRegex.exec(mainSource)) !== null) {
      mainChannels.add(m[1]);
    }
    while ((m = mainOnRegex.exec(mainSource)) !== null) {
      mainChannels.add(m[1]);
    }

    // Extract channels from preload.js: ipcRenderer.send('channel') and ipcRenderer.invoke('channel')
    const preloadSendRegex = /ipcRenderer\.send\(['"]([^'"]+)['"]/g;
    const preloadInvokeRegex = /ipcRenderer\.invoke\(['"]([^'"]+)['"]/g;
    const preloadChannels = new Set();
    while ((m = preloadSendRegex.exec(preloadSource)) !== null) {
      preloadChannels.add(m[1]);
    }
    while ((m = preloadInvokeRegex.exec(preloadSource)) !== null) {
      preloadChannels.add(m[1]);
    }

    test('main.js registers at least one IPC handler', () => {
      expect(mainChannels.size).toBeGreaterThan(0);
    });

    test('preload.js uses at least one IPC channel', () => {
      expect(preloadChannels.size).toBeGreaterThan(0);
    });

    test('every channel preload sends/invokes has a handler in main.js', () => {
      const unhandled = [];
      for (const channel of preloadChannels) {
        if (!mainChannels.has(channel)) {
          unhandled.push(channel);
        }
      }
      expect(unhandled).toEqual([]);
    });

    test('every handler in main.js is used by preload', () => {
      const unused = [];
      for (const channel of mainChannels) {
        if (!preloadChannels.has(channel)) {
          unused.push(channel);
        }
      }
      expect(unused).toEqual([]);
    });
  });

  describe('send-type methods - fire and forget', () => {
    test('closeWindow() calls ipcRenderer.send("close-window") with no extra args', () => {
      exposedAPI.closeWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith('close-window');
      expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    });

    test('hideWindow() calls ipcRenderer.send("hide-window") with no extra args', () => {
      exposedAPI.hideWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith('hide-window');
      expect(ipcRenderer.send).toHaveBeenCalledTimes(1);
    });

    test('setPinned(true) calls ipcRenderer.send("set-pinned", true)', () => {
      exposedAPI.setPinned(true);
      expect(ipcRenderer.send).toHaveBeenCalledWith('set-pinned', true);
    });

    test('setPinned(false) calls ipcRenderer.send("set-pinned", false)', () => {
      exposedAPI.setPinned(false);
      expect(ipcRenderer.send).toHaveBeenCalledWith('set-pinned', false);
    });

    test('setWindowSize("sm") calls ipcRenderer.send("set-window-size", "sm")', () => {
      exposedAPI.setWindowSize('sm');
      expect(ipcRenderer.send).toHaveBeenCalledWith('set-window-size', 'sm');
    });

    test('setWindowSize("lg") calls ipcRenderer.send("set-window-size", "lg")', () => {
      exposedAPI.setWindowSize('lg');
      expect(ipcRenderer.send).toHaveBeenCalledWith('set-window-size', 'lg');
    });

    test('resizeWindowLeft(50) calls ipcRenderer.send("resize-window-left", 50)', () => {
      exposedAPI.resizeWindowLeft(50);
      expect(ipcRenderer.send).toHaveBeenCalledWith('resize-window-left', 50);
    });

    test('openFile("/path/to/file") calls ipcRenderer.send("open-file", "/path/to/file")', () => {
      exposedAPI.openFile('/path/to/file');
      expect(ipcRenderer.send).toHaveBeenCalledWith('open-file', '/path/to/file');
    });
  });

  describe('invoke-type methods - request/response', () => {
    test('saveData({notes: []}) calls ipcRenderer.invoke("save-data", {notes: []})', () => {
      exposedAPI.saveData({ notes: [] });
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('save-data', { notes: [] });
    });

    test('loadData() calls ipcRenderer.invoke("load-data") with no extra args', () => {
      exposedAPI.loadData();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('load-data');
    });

    test('exportToFloatnote({id: "1"}) calls ipcRenderer.invoke("export-to-floatnote", {id: "1"})', () => {
      exposedAPI.exportToFloatnote({ id: '1' });
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('export-to-floatnote', { id: '1' });
    });

    test('openFloatnoteFolder() calls ipcRenderer.invoke("open-floatnote-folder")', () => {
      exposedAPI.openFloatnoteFolder();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('open-floatnote-folder');
    });

    test('exportPNG("data:image/png;base64,abc") calls ipcRenderer.invoke("export-png", ...)', () => {
      exposedAPI.exportPNG('data:image/png;base64,abc');
      expect(ipcRenderer.invoke).toHaveBeenCalledWith('export-png', 'data:image/png;base64,abc');
    });

    test('all invoke methods return the Promise from ipcRenderer.invoke', async () => {
      const saveResult = exposedAPI.saveData({ test: true });
      expect(saveResult).toBeInstanceOf(Promise);
      await expect(saveResult).resolves.toEqual({ success: true });

      const loadResult = exposedAPI.loadData();
      expect(loadResult).toBeInstanceOf(Promise);
      await expect(loadResult).resolves.toEqual({ success: true });

      const exportResult = exposedAPI.exportToFloatnote({ id: '1' });
      expect(exportResult).toBeInstanceOf(Promise);
      await expect(exportResult).resolves.toEqual({ success: true });

      const folderResult = exposedAPI.openFloatnoteFolder();
      expect(folderResult).toBeInstanceOf(Promise);
      await expect(folderResult).resolves.toEqual({ success: true });

      const pngResult = exposedAPI.exportPNG('data:image/png;base64,abc');
      expect(pngResult).toBeInstanceOf(Promise);
      await expect(pngResult).resolves.toEqual({ success: true });
    });
  });

  describe('listener methods - event subscriptions', () => {
    test('onFocusChange(cb) registers ipcRenderer.on("window-focus", ...)', () => {
      const cb = jest.fn();
      exposedAPI.onFocusChange(cb);
      expect(ipcRenderer.on).toHaveBeenCalledWith('window-focus', expect.any(Function));
    });

    test('onFocusChange callback receives the focused boolean when triggered', () => {
      const cb = jest.fn();
      exposedAPI.onFocusChange(cb);

      // Get the registered handler and invoke it
      const registeredHandler = ipcRenderer.on.mock.calls.find(
        call => call[0] === 'window-focus'
      )[1];
      registeredHandler({}, true);
      expect(cb).toHaveBeenCalledWith(true);

      cb.mockClear();
      registeredHandler({}, false);
      expect(cb).toHaveBeenCalledWith(false);
    });

    test('onWindowToggledOpen(cb) registers ipcRenderer.on("window-toggled-open", ...)', () => {
      const cb = jest.fn();
      exposedAPI.onWindowToggledOpen(cb);
      expect(ipcRenderer.on).toHaveBeenCalledWith('window-toggled-open', expect.any(Function));
    });

    test('onWindowToggledOpen callback fires when triggered', () => {
      const cb = jest.fn();
      exposedAPI.onWindowToggledOpen(cb);

      const registeredHandler = ipcRenderer.on.mock.calls.find(
        call => call[0] === 'window-toggled-open'
      )[1];
      registeredHandler({});
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('clipboard methods - local access', () => {
    test('getClipboardContent() returns null when clipboard is empty', () => {
      clipboard.availableFormats.mockReturnValue([]);
      const result = exposedAPI.getClipboardContent();
      expect(result).toBeNull();
    });

    test('getClipboardContent() returns {type:"image", ...} when image available', () => {
      clipboard.availableFormats.mockReturnValue(['image/png']);
      clipboard.readImage.mockReturnValue({
        isEmpty: jest.fn(() => false),
        toDataURL: jest.fn(() => 'data:image/png;base64,abc123'),
        getSize: jest.fn(() => ({ width: 200, height: 100 }))
      });

      const result = exposedAPI.getClipboardContent();
      expect(result).toEqual({
        type: 'image',
        dataUrl: 'data:image/png;base64,abc123',
        width: 200,
        height: 100
      });
    });

    test('getClipboardContent() returns {type:"text", content} when text available', () => {
      clipboard.availableFormats.mockReturnValue(['text/plain']);
      clipboard.readText.mockReturnValue('hello world');

      const result = exposedAPI.getClipboardContent();
      expect(result).toEqual({
        type: 'text',
        content: 'hello world'
      });
    });

    test('getClipboardContent() returns null for empty text', () => {
      clipboard.availableFormats.mockReturnValue(['text/plain']);
      clipboard.readText.mockReturnValue('   ');

      const result = exposedAPI.getClipboardContent();
      expect(result).toBeNull();
    });

    test('readClipboardImage() returns dataUrl when image exists', () => {
      clipboard.readImage.mockReturnValue({
        isEmpty: jest.fn(() => false),
        toDataURL: jest.fn(() => 'data:image/png;base64,xyz')
      });

      const result = exposedAPI.readClipboardImage();
      expect(result).toBe('data:image/png;base64,xyz');
    });

    test('readClipboardImage() returns null when clipboard is empty', () => {
      clipboard.readImage.mockReturnValue({
        isEmpty: jest.fn(() => true),
        toDataURL: jest.fn(() => '')
      });

      const result = exposedAPI.readClipboardImage();
      expect(result).toBeNull();
    });

    test('readClipboardText() returns clipboard text', () => {
      clipboard.readText.mockReturnValue('test text');
      const result = exposedAPI.readClipboardText();
      expect(result).toBe('test text');
    });
  });
});
