// Jest setup for logging system tests
import '@testing-library/jest-dom';

// Mock global objects
const mockElectronAPI = {
  writeFile: jest.fn().mockResolvedValue({ success: true }),
  mkdir: jest.fn().mockResolvedValue({ success: true }),
  stat: jest.fn().mockResolvedValue({ success: true, data: { size: 1024, mtime: new Date(), birthtime: new Date() } }),
  readdir: jest.fn().mockResolvedValue({ success: true, data: ['test.log'] }),
  rename: jest.fn().mockResolvedValue({ success: true }),
  unlink: jest.fn().mockResolvedValue({ success: true })
};

// Mock window.electronAPI for Electron environment tests
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock console methods to avoid noise during tests
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error
};

// Suppress console output during tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Restore console for specific tests if needed
export { originalConsole };
export { mockElectronAPI };
export { localStorageMock };

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
});
