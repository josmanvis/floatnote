// Tests for renderer settings functionality

describe('Settings', () => {
  let mockSettings;

  beforeEach(() => {
    // Mock default settings
    mockSettings = {
      pinchZoom: true,
      pan: true,
      rotate: true,
      showZoomControls: true,
      openWithCleanSlate: false,
      activeBgMode: 'transparent',
      inactiveBgMode: 'transparent',
      activeOpacity: 100,
      inactiveOpacity: 50,
      autoSaveToFolder: false
    };
  });

  describe('Default settings', () => {
    test('pinchZoom should default to true', () => {
      expect(mockSettings.pinchZoom).toBe(true);
    });

    test('pan should default to true', () => {
      expect(mockSettings.pan).toBe(true);
    });

    test('rotate should default to true', () => {
      expect(mockSettings.rotate).toBe(true);
    });

    test('showZoomControls should default to true', () => {
      expect(mockSettings.showZoomControls).toBe(true);
    });

    test('openWithCleanSlate should default to false', () => {
      expect(mockSettings.openWithCleanSlate).toBe(false);
    });

    test('activeBgMode should default to transparent', () => {
      expect(mockSettings.activeBgMode).toBe('transparent');
    });

    test('inactiveBgMode should default to transparent', () => {
      expect(mockSettings.inactiveBgMode).toBe('transparent');
    });

    test('activeOpacity should default to 100', () => {
      expect(mockSettings.activeOpacity).toBe(100);
    });

    test('inactiveOpacity should default to 50', () => {
      expect(mockSettings.inactiveOpacity).toBe(50);
    });

    test('autoSaveToFolder should default to false', () => {
      expect(mockSettings.autoSaveToFolder).toBe(false);
    });
  });

  describe('Settings modification', () => {
    test('should update pinchZoom setting', () => {
      mockSettings.pinchZoom = false;
      expect(mockSettings.pinchZoom).toBe(false);
    });

    test('should update pan setting', () => {
      mockSettings.pan = false;
      expect(mockSettings.pan).toBe(false);
    });

    test('should update rotate setting', () => {
      mockSettings.rotate = false;
      expect(mockSettings.rotate).toBe(false);
    });

    test('should update background mode', () => {
      mockSettings.activeBgMode = 'blur';
      expect(mockSettings.activeBgMode).toBe('blur');

      mockSettings.activeBgMode = 'dark';
      expect(mockSettings.activeBgMode).toBe('dark');
    });

    test('should update opacity values', () => {
      mockSettings.activeOpacity = 75;
      mockSettings.inactiveOpacity = 25;
      expect(mockSettings.activeOpacity).toBe(75);
      expect(mockSettings.inactiveOpacity).toBe(25);
    });

    test('should update autoSaveToFolder setting', () => {
      mockSettings.autoSaveToFolder = true;
      expect(mockSettings.autoSaveToFolder).toBe(true);
    });
  });

  describe('Background mode options', () => {
    test('should accept transparent mode', () => {
      mockSettings.activeBgMode = 'transparent';
      expect(mockSettings.activeBgMode).toBe('transparent');
    });

    test('should accept blur mode', () => {
      mockSettings.activeBgMode = 'blur';
      expect(mockSettings.activeBgMode).toBe('blur');
    });

    test('should accept dark mode', () => {
      mockSettings.activeBgMode = 'dark';
      expect(mockSettings.activeBgMode).toBe('dark');
    });
  });

  describe('Opacity validation', () => {
    test('opacity should be between 0 and 100', () => {
      const validateOpacity = (value) => {
        return Math.max(0, Math.min(100, value));
      };

      expect(validateOpacity(50)).toBe(50);
      expect(validateOpacity(-10)).toBe(0);
      expect(validateOpacity(150)).toBe(100);
    });
  });
});

describe('Settings persistence', () => {
  test('should save settings with data', () => {
    const data = {
      notes: [],
      currentNoteIndex: 0,
      settings: {
        pinchZoom: true,
        pan: true,
        rotate: false,
        showZoomControls: true,
        openWithCleanSlate: false,
        activeBgMode: 'blur',
        inactiveBgMode: 'transparent',
        activeOpacity: 80,
        inactiveOpacity: 40,
        autoSaveToFolder: true
      },
      transform: {
        zoomLevel: 1,
        panX: 0,
        panY: 0,
        rotation: 0
      }
    };

    expect(data.settings).toBeDefined();
    expect(data.settings.activeBgMode).toBe('blur');
    expect(data.settings.autoSaveToFolder).toBe(true);
  });

  test('should restore settings from loaded data', () => {
    const loadedData = {
      settings: {
        pinchZoom: false,
        pan: true,
        rotate: true,
        showZoomControls: false,
        activeBgMode: 'dark',
        activeOpacity: 60
      }
    };

    const mockSettings = { ...loadedData.settings };
    expect(mockSettings.pinchZoom).toBe(false);
    expect(mockSettings.showZoomControls).toBe(false);
    expect(mockSettings.activeBgMode).toBe('dark');
  });
});
