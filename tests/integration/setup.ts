/**
 * 集成测试设置文件
 * 在集成测试执行前运行，配置测试环境
 */

import '@testing-library/jest-dom';

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = 'true';

// 配置全局测试超时
jest.setTimeout(30000);

// 模拟console方法以减少测试输出噪音
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // 在测试中静默某些预期的警告和错误
  console.error = jest.fn((message) => {
    if (
      typeof message === 'string' &&
      (message.includes('Warning: ReactDOM.render is deprecated') ||
       message.includes('Warning: componentWillMount has been renamed'))
    ) {
      return;
    }
    originalConsoleError(message);
  });

  console.warn = jest.fn((message) => {
    if (
      typeof message === 'string' &&
      message.includes('deprecated')
    ) {
      return;
    }
    originalConsoleWarn(message);
  });
});

afterAll(() => {
  // 恢复原始console方法
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// 全局测试清理
afterEach(() => {
  // 清理任何测试状态
  jest.clearAllMocks();
});

// 模拟Electron IPC
global.electronAPI = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

// 模拟window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: global.electronAPI,
  writable: true,
});

console.log('✅ 集成测试环境设置完成');