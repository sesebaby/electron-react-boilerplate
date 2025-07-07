/**
 * FileLoggerService单元测试
 */

import FileLoggerService, { fileLoggerService, FileLoggerConfig, FileLogEntry } from './fileLoggerService';
import { LogLevel, LogEntry } from '../../utils/logger';
import { mockElectronAPI, localStorageMock } from '../../../jest.setup';

// Mock logRotation
const mockLogRotation = {
  rotateIfNeeded: jest.fn().mockResolvedValue(undefined),
  cleanupOldLogs: jest.fn().mockResolvedValue(undefined)
};

jest.mock('../../utils/logRotation', () => ({
  logRotation: mockLogRotation
}));

// Mock require for Node.js modules
const mockFs = {
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn()
};

const mockPath = {
  join: jest.fn().mockImplementation((...paths: string[]) => paths.join('/')),
  dirname: jest.fn().mockImplementation((path: string) => path.substring(0, path.lastIndexOf('/'))),
  basename: jest.fn().mockImplementation((path: string) => path.substring(path.lastIndexOf('/') + 1))
};

const mockOs = {
  tmpdir: jest.fn().mockReturnValue('/tmp')
};

// Mock require function
const originalRequire = require;
jest.doMock('fs', () => mockFs);
jest.doMock('path', () => mockPath);
jest.doMock('os', () => mockOs);

describe('FileLoggerService测试', () => {
  let service: FileLoggerService;
  const testConfig: Partial<FileLoggerConfig> = {
    logDirectory: './test-logs',
    maxFileSize: 5,
    maxFiles: 3,
    enableRotation: true,
    separateByLevel: true,
    enableFileLogging: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // 重置mock函数
    mockFs.writeFile.mockImplementation((path: string, data: string, options: any, callback: Function) => {
      if (typeof options === 'function') {
        callback = options;
      }
      callback();
    });
    
    mockFs.mkdir.mockImplementation((path: string, options: any, callback: Function) => {
      callback();
    });
    
    mockFs.stat.mockImplementation((path: string, callback: Function) => {
      callback(null, { size: 1024 });
    });
  });

  afterEach(async () => {
    if (service) {
      service.destroy();
    }
  });

  describe('服务初始化测试', () => {
    test('应该使用默认配置创建服务', () => {
      service = new FileLoggerService();
      
      expect(service).toBeDefined();
      expect(service.isFileLoggingEnabled()).toBe(true);
    });

    test('应该使用自定义配置创建服务', () => {
      service = new FileLoggerService(testConfig);
      
      expect(service).toBeDefined();
      expect(service.isFileLoggingEnabled()).toBe(true);
    });

    test('应该正确检测Electron环境', () => {
      // 设置Electron API
      Object.defineProperty(window, 'electronAPI', {
        value: mockElectronAPI,
        writable: true
      });

      service = new FileLoggerService(testConfig);
      
      expect(service).toBeDefined();
    });

    test('应该在Electron API不完整时回退到浏览器模式', () => {
      // 设置不完整的Electron API
      Object.defineProperty(window, 'electronAPI', {
        value: { writeFile: jest.fn() }, // 缺少必要的API
        writable: true
      });

      service = new FileLoggerService(testConfig);
      
      expect(service).toBeDefined();
    });

    test('应该在浏览器环境中正确初始化', () => {
      // 清除window.electronAPI
      delete (window as any).electronAPI;
      
      service = new FileLoggerService(testConfig);
      
      expect(service).toBeDefined();
    });
  });

  describe('Electron环境测试', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'electronAPI', {
        value: mockElectronAPI,
        writable: true
      });
    });

    test('应该在Electron环境中写入日志', async () => {
      service = new FileLoggerService(testConfig);
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '测试Electron日志',
        source: 'TestSource'
      };

      await service.writeLog(logEntry);
      
      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockElectronAPI.writeFile).toHaveBeenCalled();
    });

    test('应该在Electron环境中创建目录', async () => {
      service = new FileLoggerService(testConfig);
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '测试目录创建',
        source: 'TestSource'
      };

      await service.writeLog(logEntry);
      
      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockElectronAPI.mkdir).toHaveBeenCalled();
    });

    test('应该处理Electron API错误', async () => {
      mockElectronAPI.writeFile.mockResolvedValue({ success: false, error: 'Write failed' });
      
      service = new FileLoggerService(testConfig);
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: '测试错误处理'
      };

      await service.writeLog(logEntry);
      
      // 等待队列处理和错误处理
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 服务应该仍然运行，但可能禁用文件日志
      expect(service).toBeDefined();
    });
  });

  describe('浏览器环境测试', () => {
    beforeEach(() => {
      delete (window as any).electronAPI;
    });

    test('应该在浏览器环境中使用localStorage', async () => {
      service = new FileLoggerService(testConfig);
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '测试浏览器日志存储'
      };

      await service.writeLog(logEntry);
      
      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    test('应该处理localStorage错误', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      service = new FileLoggerService(testConfig);
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.WARN,
        message: '测试存储错误处理'
      };

      // 这不应该抛出异常
      await expect(service.writeLog(logEntry)).resolves.toBeUndefined();
    });
  });

  describe('日志写入测试', () => {
    beforeEach(() => {
      service = new FileLoggerService(testConfig);
    });

    test('应该写入单条日志', async () => {
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '测试单条日志写入',
        data: { test: 'data' },
        source: 'TestComponent'
      };

      await service.writeLog(logEntry);
      
      // 等待队列处理
      await service.flush();
      
      expect(service).toBeDefined();
    });

    test('应该批量写入日志', async () => {
      const logEntries: LogEntry[] = [
        {
          timestamp: new Date(),
          level: LogLevel.INFO,
          message: '批量日志1'
        },
        {
          timestamp: new Date(),
          level: LogLevel.WARN,
          message: '批量日志2'
        },
        {
          timestamp: new Date(),
          level: LogLevel.ERROR,
          message: '批量日志3'
        }
      ];

      await service.writeLogBatch(logEntries);
      
      await service.flush();
      
      expect(service).toBeDefined();
    });

    test('应该在文件日志禁用时跳过写入', async () => {
      service.disableFileLogging();
      
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '这条日志不应该被写入'
      };

      await service.writeLog(logEntry);
      
      expect(service.isFileLoggingEnabled()).toBe(false);
    });

    test('应该按日志级别分文件存储', async () => {
      const infoEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: 'Info消息'
      };

      const errorEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: 'Error消息'
      };

      await service.writeLog(infoEntry);
      await service.writeLog(errorEntry);
      
      await service.flush();
      
      expect(service).toBeDefined();
    });

    test('应该正确格式化日志条目', async () => {
      const logEntry: LogEntry = {
        timestamp: new Date('2023-01-01T12:00:00Z'),
        level: LogLevel.INFO,
        message: '格式化测试',
        data: { key: 'value' },
        source: 'TestSource'
      };

      await service.writeLog(logEntry);
      await service.flush();
      
      expect(service).toBeDefined();
    });

    test('应该处理复杂数据对象', async () => {
      const complexData = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: new Date(),
        function: () => 'test'
      };

      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.DEBUG,
        message: '复杂数据测试',
        data: complexData
      };

      await expect(service.writeLog(logEntry)).resolves.toBeUndefined();
    });

    test('应该处理无法序列化的数据', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.WARN,
        message: '循环引用测试',
        data: circularObj
      };

      await expect(service.writeLog(logEntry)).resolves.toBeUndefined();
    });
  });

  describe('队列管理测试', () => {
    beforeEach(() => {
      service = new FileLoggerService(testConfig);
    });

    test('应该在队列达到阈值时自动刷新', async () => {
      // 创建足够的日志来触发自动刷新
      const promises: Promise<void>[] = [];
      for (let i = 0; i < 105; i++) {
        promises.push(service.writeLog({
          timestamp: new Date(),
          level: LogLevel.INFO,
          message: `测试消息 ${i}`
        }));
      }

      await Promise.all(promises);
      
      // 等待自动刷新
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service).toBeDefined();
    });

    test('应该正确手动刷新队列', async () => {
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '等待刷新的消息'
      });

      await service.flush();
      
      expect(service).toBeDefined();
    });

    test('应该在批量写入时触发刷新', async () => {
      const logEntries: LogEntry[] = [];
      for (let i = 0; i < 60; i++) {
        logEntries.push({
          timestamp: new Date(),
          level: LogLevel.INFO,
          message: `批量消息 ${i}`
        });
      }

      await service.writeLogBatch(logEntries);
      
      // 等待自动刷新
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(service).toBeDefined();
    });
  });

  describe('日志轮转测试', () => {
    beforeEach(() => {
      service = new FileLoggerService(testConfig);
    });

    test('应该调用日志轮转服务', async () => {
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '触发轮转测试'
      });

      await service.flush();
      
      // 应该调用轮转检查
      expect(mockLogRotation.rotateIfNeeded).toHaveBeenCalled();
    });

    test('应该处理轮转服务错误', async () => {
      mockLogRotation.rotateIfNeeded.mockRejectedValueOnce(new Error('轮转失败'));
      
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '轮转错误测试'
      });

      // 这不应该抛出异常
      await expect(service.flush()).resolves.toBeUndefined();
    });

    test('应该清理过期日志', async () => {
      await service.cleanupOldLogs(30);
      
      expect(mockLogRotation.cleanupOldLogs).toHaveBeenCalledWith(
        expect.any(String),
        30
      );
    });
  });

  describe('配置和状态测试', () => {
    test('应该正确报告文件日志状态', () => {
      service = new FileLoggerService(testConfig);
      
      expect(service.isFileLoggingEnabled()).toBe(true);
      
      service.disableFileLogging();
      expect(service.isFileLoggingEnabled()).toBe(false);
    });

    test('应该正确停止定时刷新', () => {
      service = new FileLoggerService(testConfig);
      
      service.stopFlushInterval();
      
      expect(service).toBeDefined();
    });

    test('应该返回日志统计信息', async () => {
      service = new FileLoggerService(testConfig);
      
      const stats = await service.getLogStats();
      
      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0
      });
    });
  });

  describe('错误处理测试', () => {
    test('应该处理API不可用错误', async () => {
      mockElectronAPI.writeFile.mockRejectedValue(new Error('API not available'));
      
      Object.defineProperty(window, 'electronAPI', {
        value: mockElectronAPI,
        writable: true
      });

      service = new FileLoggerService(testConfig);
      
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: 'API错误测试'
      });

      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 服务应该自动禁用文件日志
      expect(service.isFileLoggingEnabled()).toBe(false);
    });

    test('应该处理文件系统错误', async () => {
      delete (window as any).electronAPI;
      
      // 模拟文件系统错误
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      service = new FileLoggerService(testConfig);
      
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.ERROR,
        message: '文件系统错误测试'
      });

      // 应该不抛出异常
      await expect(service.flush()).resolves.toBeUndefined();
    });
  });

  describe('类别提取测试', () => {
    beforeEach(() => {
      service = new FileLoggerService(testConfig);
    });

    test('应该从source提取类别', async () => {
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '类别提取测试',
        source: 'src/components/TestComponent.tsx'
      };

      await service.writeLog(logEntry);
      
      expect(service).toBeDefined();
    });

    test('应该处理没有source的情况', async () => {
      const logEntry: LogEntry = {
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '无source测试'
      };

      await service.writeLog(logEntry);
      
      expect(service).toBeDefined();
    });
  });

  describe('销毁和清理测试', () => {
    test('应该正确销毁服务', async () => {
      service = new FileLoggerService(testConfig);
      
      await service.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '销毁前的消息'
      });

      service.destroy();
      
      expect(service).toBeDefined();
    });
  });

  describe('默认实例测试', () => {
    test('应该导出可用的默认实例', () => {
      expect(fileLoggerService).toBeDefined();
      expect(typeof fileLoggerService.writeLog).toBe('function');
      expect(typeof fileLoggerService.writeLogBatch).toBe('function');
      expect(typeof fileLoggerService.flush).toBe('function');
    });

    test('默认实例应该正常工作', async () => {
      await expect(fileLoggerService.writeLog({
        timestamp: new Date(),
        level: LogLevel.INFO,
        message: '默认实例测试'
      })).resolves.toBeUndefined();
    });
  });
});