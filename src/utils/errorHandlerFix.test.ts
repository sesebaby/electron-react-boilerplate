/**
 * 测试错误处理器修复是否有效
 * 验证循环调用问题是否已解决
 */

import { globalErrorHandler } from './globalErrorHandler';
import { logger } from './logger';

describe('错误处理器循环调用修复测试', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;
  let errorCallCount = 0;

  beforeEach(() => {
    // 保存原始console方法
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    errorCallCount = 0;

    // 监控console.error调用次数
    console.error = (...args: any[]) => {
      errorCallCount++;
      originalConsoleError.apply(console, args);
    };
  });

  afterEach(() => {
    // 恢复原始console方法
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    
    // 清理错误处理器状态
    globalErrorHandler.clearErrorStats();
  });

  test('应该防止console.error循环调用', () => {
    // 模拟一个会触发错误处理的场景
    const testError = new Error('测试错误');
    
    // 触发错误
    console.error('测试错误消息', testError);
    
    // 等待一小段时间让异步处理完成
    return new Promise(resolve => {
      setTimeout(() => {
        // 验证console.error没有被无限调用
        expect(errorCallCount).toBeLessThan(10); // 应该远少于无限循环的情况
        resolve(void 0);
      }, 100);
    });
  });

  test('应该防止logger文件写入失败时的循环调用', async () => {
    // 模拟文件写入失败
    const mockFileLoggerService = {
      writeLog: jest.fn().mockRejectedValue(new Error('文件写入失败')),
      writeLogBatch: jest.fn().mockRejectedValue(new Error('批量写入失败')),
      flush: jest.fn().mockResolvedValue(undefined)
    };

    // 替换logger的文件服务
    (logger as any).fileLoggerService = mockFileLoggerService;
    (logger as any).config.enableFileLogging = true;

    // 记录一条日志，这应该触发文件写入失败
    logger.error('测试日志消息');

    // 等待异步处理完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证没有发生循环调用
    expect(errorCallCount).toBeLessThan(5);
    expect(mockFileLoggerService.writeLog).toHaveBeenCalled();
  });

  test('应该正确处理JSON序列化循环引用', () => {
    // 创建循环引用对象
    const circularObj: any = { name: '测试对象' };
    circularObj.self = circularObj;

    // 这应该不会导致无限循环
    console.error('循环引用测试', circularObj);

    // 等待处理完成
    return new Promise(resolve => {
      setTimeout(() => {
        expect(errorCallCount).toBeLessThan(5);
        resolve(void 0);
      }, 100);
    });
  });

  test('应该在错误处理过程中出现异常时使用原始console', () => {
    // 模拟一个会在错误处理过程中抛出异常的情况
    const problematicObject = {
      toString: () => {
        throw new Error('toString方法异常');
      }
    };

    // 这应该被安全处理
    console.error('问题对象测试', problematicObject);

    return new Promise(resolve => {
      setTimeout(() => {
        // 应该没有导致崩溃或无限循环
        expect(errorCallCount).toBeGreaterThan(0);
        expect(errorCallCount).toBeLessThan(10);
        resolve(void 0);
      }, 100);
    });
  });
});
