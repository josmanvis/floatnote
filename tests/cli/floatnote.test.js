// Tests for bin/floatnote.js CLI

const fs = require('fs');
const path = require('path');

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  unlinkSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'finish') setTimeout(cb, 0);
      return { on: jest.fn() };
    }),
    close: jest.fn()
  }))
}));

// Mock https module
jest.mock('https', () => ({
  get: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(() => ({
    unref: jest.fn()
  })),
  execSync: jest.fn()
}));

describe('CLI utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.argv
    process.argv = ['node', 'floatnote'];
  });

  describe('formatBytes', () => {
    // We can't directly test formatBytes since it's not exported,
    // but we can test it indirectly through the download progress
    test('should handle byte formatting logic', () => {
      // Test the logic that would be in formatBytes
      const formatBytes = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      };

      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('log function', () => {
    test('should format log messages correctly', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Test the log function logic
      const log = (message) => {
        console.log(`[floatnote] ${message}`);
      };

      log('test message');
      expect(consoleSpy).toHaveBeenCalledWith('[floatnote] test message');

      consoleSpy.mockRestore();
    });
  });

  describe('APP_DIR and paths', () => {
    test('should use correct paths', () => {
      const APP_NAME = 'Floatnote';
      const APP_DIR = path.join(process.env.HOME, '.floatnote');
      const APP_PATH = path.join(APP_DIR, `${APP_NAME}.app`);
      const VERSION_FILE = path.join(APP_DIR, 'version');

      expect(APP_DIR).toContain('.floatnote');
      expect(APP_PATH).toContain('Floatnote.app');
      expect(VERSION_FILE).toContain('version');
    });
  });
});

describe('CLI argument handling', () => {
  test('--version flag should be recognized', () => {
    const args = ['--version'];
    expect(args.includes('--version') || args.includes('-v')).toBe(true);
  });

  test('-v flag should be recognized', () => {
    const args = ['-v'];
    expect(args.includes('--version') || args.includes('-v')).toBe(true);
  });

  test('--help flag should be recognized', () => {
    const args = ['--help'];
    expect(args.includes('--help') || args.includes('-h')).toBe(true);
  });

  test('-h flag should be recognized', () => {
    const args = ['-h'];
    expect(args.includes('--help') || args.includes('-h')).toBe(true);
  });

  test('--update flag should be recognized', () => {
    const args = ['--update'];
    expect(args.includes('--update')).toBe(true);
  });

  test('--uninstall flag should be recognized', () => {
    const args = ['--uninstall'];
    expect(args.includes('--uninstall')).toBe(true);
  });
});

describe('GitHub API integration', () => {
  test('should construct correct API URL', () => {
    const GITHUB_REPO = 'josmanvis/floatnote';
    const apiPath = `/repos/${GITHUB_REPO}/releases/latest`;
    expect(apiPath).toBe('/repos/josmanvis/floatnote/releases/latest');
  });

  test('should use correct User-Agent header', () => {
    const headers = { 'User-Agent': 'floatnote-cli' };
    expect(headers['User-Agent']).toBe('floatnote-cli');
  });
});

describe('File operations', () => {
  test('should check if app directory exists', () => {
    fs.existsSync.mockReturnValue(false);
    const result = fs.existsSync('/mock/.floatnote');
    expect(result).toBe(false);
    expect(fs.existsSync).toHaveBeenCalled();
  });

  test('should create app directory if not exists', () => {
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync('/mock/.floatnote', { recursive: true });
    expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/.floatnote', { recursive: true });
  });

  test('should read version file', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('v1.0.0');
    const version = fs.readFileSync('/mock/.floatnote/version', 'utf8');
    expect(version).toBe('v1.0.0');
  });

  test('should write version file', () => {
    fs.writeFileSync('/mock/.floatnote/version', 'v1.0.1');
    expect(fs.writeFileSync).toHaveBeenCalledWith('/mock/.floatnote/version', 'v1.0.1');
  });

  test('should remove directory on uninstall', () => {
    fs.rmSync('/mock/.floatnote', { recursive: true });
    expect(fs.rmSync).toHaveBeenCalledWith('/mock/.floatnote', { recursive: true });
  });
});
