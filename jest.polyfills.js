/**
 * Jest polyfills for browser APIs not available in test environment
 */

// TextEncoder/TextDecoder polyfill
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// RequestAnimationFrame polyfill
global.requestAnimationFrame = (cb) => {
  return setTimeout(cb, 0);
};

global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// MatchMedia polyfill
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Intersection Observer polyfill
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// Resize Observer polyfill
global.ResizeObserver = class ResizeObserver {
  constructor() {}

  observe() {
    return null;
  }

  disconnect() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// Performance polyfill
if (!global.performance) {
  global.performance = {};
}

if (!global.performance.now) {
  global.performance.now = () => Date.now();
}

if (!global.performance.mark) {
  global.performance.mark = () => {};
}

if (!global.performance.measure) {
  global.performance.measure = () => {};
}

// Web API polyfills
global.fetch = require('jest-fetch-mock');

// Canvas polyfill
HTMLCanvasElement.prototype.getContext = jest.fn();

// File API polyfills
global.File = class File {
  constructor(bits, name, options = {}) {
    this.bits = bits;
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
    this.type = options.type || '';
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0);
  }
};

global.FileReader = class FileReader {
  constructor() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.onloadstart = null;
    this.onloadend = null;
    this.onprogress = null;
  }

  readAsText(file) {
    setTimeout(() => {
      this.result = 'mock file content';
      this.readyState = 2;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  readAsDataURL(file) {
    setTimeout(() => {
      this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ=';
      this.readyState = 2;
      if (this.onload) this.onload({ target: this });
    }, 0);
  }

  abort() {
    this.readyState = 2;
    if (this.onabort) this.onabort({ target: this });
  }
};

// Blob polyfill
global.Blob = class Blob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
  }

  text() {
    return Promise.resolve(this.parts.join(''));
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }

  stream() {
    return {
      getReader() {
        return {
          read() {
            return Promise.resolve({ done: true, value: undefined });
          }
        };
      }
    };
  }
};

// URL polyfill
if (!global.URL) {
  global.URL = class URL {
    constructor(url, base) {
      this.href = url;
      this.origin = 'http://localhost';
      this.protocol = 'http:';
      this.host = 'localhost';
      this.hostname = 'localhost';
      this.port = '';
      this.pathname = '/';
      this.search = '';
      this.hash = '';
    }

    static createObjectURL() {
      return 'mock-object-url';
    }

    static revokeObjectURL() {}
  };
}

// CSS polyfills
if (!global.CSS) {
  global.CSS = {
    supports: jest.fn().mockReturnValue(true)
  };
}

// Clipboard API polyfill
if (!global.navigator) {
  global.navigator = {};
}

global.navigator.clipboard = {
  writeText: jest.fn().mockResolvedValue(undefined),
  readText: jest.fn().mockResolvedValue(''),
  write: jest.fn().mockResolvedValue(undefined),
  read: jest.fn().mockResolvedValue([])
};

// Geolocation API polyfill
global.navigator.geolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn()
};

// Notification API polyfill
global.Notification = class Notification {
  constructor(title, options) {
    this.title = title;
    this.body = options?.body || '';
    this.icon = options?.icon || '';
    this.onclick = null;
    this.onshow = null;
    this.onerror = null;
    this.onclose = null;
  }

  static requestPermission() {
    return Promise.resolve('granted');
  }

  close() {}
};

// Battery API polyfill
global.navigator.getBattery = jest.fn().mockResolvedValue({
  charging: true,
  chargingTime: 0,
  dischargingTime: Infinity,
  level: 1.0,
  onchargingchange: null,
  onchargingtimechange: null,
  ondischargingtimechange: null,
  onlevelchange: null
});

// Web Workers polyfill
global.Worker = class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(msg) {
    if (this.onmessage) {
      setTimeout(() => this.onmessage({ data: msg }), 0);
    }
  }

  terminate() {}
};

// Service Worker polyfill
global.navigator.serviceWorker = {
  register: jest.fn().mockResolvedValue({
    scope: '/',
    active: null,
    installing: null,
    waiting: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }),
  ready: Promise.resolve({
    scope: '/',
    active: {
      postMessage: jest.fn()
    }
  }),
  controller: null,
  getRegistrations: jest.fn().mockResolvedValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

console.log('Jest polyfills loaded successfully');