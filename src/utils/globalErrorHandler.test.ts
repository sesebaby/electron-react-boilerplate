/**
 * GlobalErrorHandler单元测试
 */

import GlobalErrorHandler, { globalErrorHandler, GlobalErrorConfig, ErrorReport } from './globalErrorHandler';
import { originalConsole } from '../../jest.setup';

// Mock the logger module with a factory function
jest.mock('./logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}));

// Get the mocked logger after the mock is set up
import { logger } from './logger';
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('GlobalErrorHandler测试', () => {
  let handler: GlobalErrorHandler;
  let originalWindowError: any;
  let originalConsoleError: any;
  let originalConsoleWarn: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 保存原始的错误处理器
    originalWindowError = window.onerror;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    // 创建新的处理器实例
    handler = new GlobalErrorHandler({
      enableWindowErrorHandler: true,
      enableUnhandledRejectionHandler: true,
      enableConsoleErrorCapture: true,
      maxErrorsPerSession: 50,
      errorReportingThreshold: 1 // 1分钟，用于测试
    });
  });

  afterEach(() => {
    if (handler) {
      handler.destroy();
    }
    
    // 恢复原始的错误处理器
    window.onerror = originalWindowError;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  describe('初始化测试', () => {
    test('应该正确初始化默认配置', () => {
      const defaultHandler = new GlobalErrorHandler();
      
      expect(defaultHandler).toBeDefined();
      
      const stats = defaultHandler.getErrorStats();
      expect(stats.sessionId).toBeDefined();
      expect(stats.totalErrors).toBe(0);
      
      defaultHandler.destroy();
    });

    test('应该正确初始化自定义配置', () => {
      const config: Partial<GlobalErrorConfig> = {
        enableWindowErrorHandler: false,
        enableUnhandledRejectionHandler: true,
        maxErrorsPerSession: 25
      };
      
      const customHandler = new GlobalErrorHandler(config);
      
      expect(customHandler).toBeDefined();
      
      customHandler.destroy();
    });

    test('应该生成唯一的会话ID', () => {
      const handler1 = new GlobalErrorHandler();
      const handler2 = new GlobalErrorHandler();
      
      const stats1 = handler1.getErrorStats();
      const stats2 = handler2.getErrorStats();
      
      expect(stats1.sessionId).not.toBe(stats2.sessionId);
      
      handler1.destroy();
      handler2.destroy();
    });
  });

  describe('window.onerror处理测试', () => {
    test('应该捕获JavaScript错误', () => {
      const message = '测试JavaScript错误';
      const source = 'test.js';
      const line = 10;
      const column = 5;
      const error = new Error('测试错误对象');

      // 模拟window.onerror调用
      if (window.onerror) {
        window.onerror(message, source, line, column, error);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          type: 'javascript',
          message: message,
          source: source,
          line: line,
          column: column
        })
      );
    });

    test('应该处理没有错误对象的情况', () => {
      const message = '简单错误消息';

      if (window.onerror) {
        window.onerror(message, undefined, undefined, undefined, undefined);
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          type: 'javascript',
          message: message
        })
      );
    });

    test('应该正确返回false以不阻止默认处理', () => {
      const result = window.onerror?.('测试', undefined, undefined, undefined, undefined);
      expect(result).toBe(false);
    });
  });

  describe('Promise rejection处理测试', () => {
    test('应该捕获未处理的Promise拒绝', async () => {
      const reason = new Error('Promise拒绝测试');
      
      // 创建一个未处理的Promise拒绝
      const unhandledRejectionEvent = new CustomEvent('unhandledrejection', {
        detail: reason
      }) as any;
      unhandledRejectionEvent.reason = reason;

      window.dispatchEvent(unhandledRejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PROMISE Error'),
        expect.objectContaining({
          type: 'promise',
          message: 'Promise拒绝测试'
        })
      );
    });

    test('应该处理字符串类型的Promise拒绝', () => {
      const reason = '字符串拒绝原因';
      
      const unhandledRejectionEvent = new CustomEvent('unhandledrejection') as any;
      unhandledRejectionEvent.reason = reason;

      window.dispatchEvent(unhandledRejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PROMISE Error'),
        expect.objectContaining({
          type: 'promise',
          message: reason
        })
      );
    });

    test('应该处理对象类型的Promise拒绝', () => {
      const reason = { code: 'TEST_ERROR', message: '测试对象错误' };
      
      const unhandledRejectionEvent = new CustomEvent('unhandledrejection') as any;
      unhandledRejectionEvent.reason = reason;

      window.dispatchEvent(unhandledRejectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('PROMISE Error'),
        expect.objectContaining({
          type: 'promise',
          message: JSON.stringify(reason)
        })
      );
    });
  });

  describe('控制台错误捕获测试', () => {
    test('应该捕获console.error调用', () => {
      const errorMessage = '测试控制台错误';
      const errorData = { test: 'data' };

      console.error(errorMessage, errorData);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Console captured'),
        expect.objectContaining({
          type: 'console',
          message: expect.stringContaining(errorMessage)
        })
      );

      // 应该也调用原始的console.error
      expect(originalConsoleError).toHaveBeenCalledWith(errorMessage, errorData);
    });

    test('应该处理Error对象作为console.error参数', () => {
      const error = new Error('控制台Error对象');

      console.error('错误发生:', error);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Console captured'),
        expect.objectContaining({
          type: 'console',
          stack: error.stack
        })
      );
    });

    test('应该处理console.warn调用而不创建循环', () => {
      const warnMessage = '测试警告消息';

      console.warn(warnMessage);

      // console.warn应该调用原始方法，但不应该通过logger记录
      expect(originalConsoleWarn).toHaveBeenCalledWith(warnMessage);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    test('应该正确格式化多个参数', () => {
      console.error('错误:', 'message', { key: 'value' }, 123);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Console captured'),
        expect.objectContaining({
          message: expect.stringContaining('错误: message {"key":"value"} 123')
        })
      );
    });
  });

  describe('资源错误处理测试', () => {
    test('应该捕获资源加载错误', () => {
      const img = document.createElement('img');
      img.src = 'non-existent-image.jpg';
      
      const errorEvent = new Event('error', { bubbles: true });
      Object.defineProperty(errorEvent, 'target', {
        value: img,
        writable: false
      });

      window.dispatchEvent(errorEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Resource loading failed'),
        expect.objectContaining({
          type: 'network',
          message: expect.stringContaining('IMG')
        })
      );
    });

    test('应该处理script标签加载错误', () => {
      const script = document.createElement('script');
      script.src = 'non-existent-script.js';
      
      const errorEvent = new Event('error', { bubbles: true });
      Object.defineProperty(errorEvent, 'target', {
        value: script,
        writable: false
      });

      window.dispatchEvent(errorEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Resource loading failed'),
        expect.objectContaining({
          type: 'network',
          message: expect.stringContaining('SCRIPT')
        })
      );
    });
  });

  describe('错误频率限制测试', () => {
    test('应该限制相同错误的报告频率', () => {
      const message = '重复错误消息';

      // 第一次错误应该被记录
      if (window.onerror) {
        window.onerror(message, 'test.js', 1, 1, new Error(message));
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      // 立即重复相同错误不应该被记录
      if (window.onerror) {
        window.onerror(message, 'test.js', 1, 1, new Error(message));
      }

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    test('应该限制会话错误总数', () => {
      const maxErrors = 3;
      const limitedHandler = new GlobalErrorHandler({ maxErrorsPerSession: maxErrors });

      // 生成超过限制的错误
      for (let i = 0; i < maxErrors + 2; i++) {
        if (window.onerror) {
          window.onerror(`错误 ${i}`, 'test.js', i, 1, new Error(`错误 ${i}`));
        }
      }

      // 应该只记录到限制数量
      expect(mockLogger.error).toHaveBeenCalledTimes(maxErrors);

      limitedHandler.destroy();
    });
  });

  describe('用户管理测试', () => {
    test('应该正确设置用户ID', () => {
      const userId = 'test-user-123';
      
      handler.setUserId(userId);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Global error handler user ID updated',
        expect.objectContaining({
          userId: userId
        })
      );
    });

    test('应该处理null用户ID', () => {
      handler.setUserId(null);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Global error handler user ID updated',
        expect.objectContaining({
          userId: null
        })
      );
    });
  });

  describe('配置更新测试', () => {
    test('应该正确更新配置', () => {
      const newConfig: Partial<GlobalErrorConfig> = {
        maxErrorsPerSession: 100,
        errorReportingThreshold: 10
      };

      handler.updateConfig(newConfig);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Global error handler config updated',
        expect.objectContaining({
          config: expect.objectContaining(newConfig)
        })
      );
    });
  });

  describe('手动错误报告测试', () => {
    test('应该支持手动报告错误', () => {
      const error = new Error('手动报告的错误');
      const context = 'TestContext';

      handler.reportError(error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          type: 'javascript',
          message: `[${context}] ${error.message}`,
          stack: error.stack
        })
      );
    });

    test('应该支持无上下文的手动错误报告', () => {
      const error = new Error('无上下文错误');

      handler.reportError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          type: 'javascript',
          message: error.message
        })
      );
    });
  });

  describe('错误统计测试', () => {
    test('应该返回正确的错误统计信息', () => {
      // 生成一些错误
      if (window.onerror) {
        window.onerror('JS错误', 'test.js', 1, 1, new Error('JS错误'));
      }

      console.error('控制台错误');

      const stats = handler.getErrorStats();

      expect(stats).toEqual({
        sessionId: expect.any(String),
        totalErrors: expect.any(Number),
        errorsByType: expect.objectContaining({
          javascript: expect.any(Number),
          console: expect.any(Number)
        }),
        recentErrors: expect.any(Array)
      });

      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.recentErrors.length).toBeGreaterThan(0);
    });

    test('应该正确计算不同类型错误的数量', () => {
      // JavaScript错误
      if (window.onerror) {
        window.onerror('JS错误1', 'test1.js', 1, 1, new Error('JS错误1'));
        window.onerror('JS错误2', 'test2.js', 2, 2, new Error('JS错误2'));
      }

      // 控制台错误
      console.error('控制台错误1');

      // Promise错误
      const rejectionEvent = new CustomEvent('unhandledrejection') as any;
      rejectionEvent.reason = new Error('Promise错误');
      window.dispatchEvent(rejectionEvent);

      const stats = handler.getErrorStats();

      expect(stats.errorsByType.javascript).toBe(2);
      expect(stats.errorsByType.console).toBe(1);
      expect(stats.errorsByType.promise).toBe(1);
    });

    test('应该限制最近错误列表长度', () => {
      // 生成很多错误
      for (let i = 0; i < 15; i++) {
        if (window.onerror) {
          window.onerror(`错误 ${i}`, 'test.js', i, 1, new Error(`错误 ${i}`));
        }
      }

      const stats = handler.getErrorStats();

      // 最近错误列表应该限制在10个以内
      expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('清理和销毁测试', () => {
    test('应该正确清理错误统计', () => {
      // 生成一些错误
      if (window.onerror) {
        window.onerror('测试错误', 'test.js', 1, 1, new Error('测试错误'));
      }

      let stats = handler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);

      handler.clearErrorStats();

      stats = handler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.errorsByType).toEqual({});
      expect(stats.recentErrors).toEqual([]);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Global error handler stats cleared',
        expect.objectContaining({
          sessionId: expect.any(String)
        })
      );
    });

    test('应该正确销毁处理器', () => {
      handler.destroy();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Global error handler destroyed',
        expect.objectContaining({
          sessionId: expect.any(String)
        })
      );

      // 应该恢复原始的console方法
      expect(console.error).toBe(originalConsoleError);
      expect(console.warn).toBe(originalConsoleWarn);
      expect(window.onerror).toBeNull();
    });
  });

  describe('开发环境调试测试', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test('应该在开发环境中提供详细调试信息', () => {
      const spy = jest.spyOn(console, 'group').mockImplementation();
      const endSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      if (window.onerror) {
        window.onerror('开发环境错误', 'test.js', 1, 1, new Error('开发环境错误'));
      }

      expect(spy).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();

      spy.mockRestore();
      endSpy.mockRestore();
      logSpy.mockRestore();
    });
  });

  describe('默认实例测试', () => {
    test('应该导出可用的默认实例', () => {
      expect(globalErrorHandler).toBeDefined();
      expect(typeof globalErrorHandler.reportError).toBe('function');
      expect(typeof globalErrorHandler.getErrorStats).toBe('function');
      expect(typeof globalErrorHandler.setUserId).toBe('function');
    });

    test('默认实例应该正常工作', () => {
      const error = new Error('默认实例测试错误');
      
      expect(() => {
        globalErrorHandler.reportError(error, '默认实例测试');
      }).not.toThrow();

      const stats = globalErrorHandler.getErrorStats();
      expect(stats.sessionId).toBeDefined();
    });
  });

  describe('边界情况测试', () => {
    test('应该处理空消息', () => {
      if (window.onerror) {
        window.onerror('', undefined, undefined, undefined, undefined);
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('应该处理非常长的错误消息', () => {
      const longMessage = 'a'.repeat(10000);

      if (window.onerror) {
        window.onerror(longMessage, 'test.js', 1, 1, new Error(longMessage));
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          message: longMessage
        })
      );
    });

    test('应该处理特殊字符', () => {
      const specialMessage = '测试特殊字符: 中文 😀 \n\t\r\\';

      if (window.onerror) {
        window.onerror(specialMessage, 'test.js', 1, 1, new Error(specialMessage));
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JAVASCRIPT Error'),
        expect.objectContaining({
          message: specialMessage
        })
      );
    });
  });
});