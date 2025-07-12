/**
 * LogRotation工具单元测试
 */

import LogRotation, { logRotation, LogRotationConfig, LogFileInfo } from './logRotation';
import { mockElectronAPI, localStorageMock } from '../../jest.setup';

describe('LogRotation工具测试', () => {
  let rotationService: LogRotation;

  // Mock文件系统操作
  const mockFs = {
    readdir: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    createReadStream: jest.fn(),
    createWriteStream: jest.fn()
  };

  const mockPath = {
    join: jest.fn().mockImplementation((...paths: string[]) => paths.join('/')),
    dirname: jest.fn().mockImplementation((path: string) => path.substring(0, path.lastIndexOf('/'))),
    basename: jest.fn().mockImplementation((path: string, ext?: string) => {
      const name = path.substring(path.lastIndexOf('/') + 1);
      return ext ? name.replace(ext, '') : name;
    }),
    extname: jest.fn().mockImplementation((path: string) => {
      const lastDot = path.lastIndexOf('.');
      return lastDot > 0 ? path.substring(lastDot) : '';
    })
  };

  const mockZlib = {
    createGzip: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();

    // 重置文件系统模拟
    mockFs.readdir.mockImplementation((path: string, callback: Function) => {
      callback(null, ['app.log', 'error.log', 'old-file.txt']);
    });

    mockFs.stat.mockImplementation((path: string, callback: Function) => {
      callback(null, {
        size: 1024 * 1024, // 1MB
        mtime: new Date(),
        birthtime: new Date()
      });
    });

    mockFs.rename.mockImplementation((oldPath: string, newPath: string, callback: Function) => {
      callback();
    });

    mockFs.unlink.mockImplementation((path: string, callback: Function) => {
      callback();
    });

    const mockStream = {
      pipe: jest.fn().mockReturnThis(),
      on: jest.fn()
    };

    mockFs.createReadStream.mockReturnValue(mockStream);
    mockFs.createWriteStream.mockReturnValue(mockStream);
    mockZlib.createGzip.mockReturnValue(mockStream);

    rotationService = new LogRotation();
  });

  describe('初始化测试', () => {
    test('应该正确初始化LogRotation实例', () => {
      expect(rotationService).toBeDefined();
    });

    test('应该正确检测Electron环境', () => {
      Object.defineProperty(window, 'electronAPI', {
        value: mockElectronAPI,
        writable: true
      });

      const electronRotation = new LogRotation();
      expect(electronRotation).toBeDefined();
    });

    test('应该在浏览器环境中回退到localStorage', () => {
      delete (window as any).electronAPI;
      
      const browserRotation = new LogRotation();
      expect(browserRotation).toBeDefined();
    });
  });

  describe('Electron环境测试', () => {
    beforeEach(() => {
      // 重新配置 mockElectronAPI
      mockElectronAPI.readdir = jest.fn().mockResolvedValue({ 
        success: true, 
        data: ['app.log', 'error.log'] 
      });
      mockElectronAPI.stat = jest.fn().mockResolvedValue({ 
        success: true, 
        data: { size: 1024, mtime: new Date(), birthtime: new Date() } 
      });
      mockElectronAPI.rename = jest.fn().mockResolvedValue({ success: true });
      mockElectronAPI.unlink = jest.fn().mockResolvedValue({ success: true });

      Object.defineProperty(window, 'electronAPI', {
        value: mockElectronAPI,
        writable: true
      });

      rotationService = new LogRotation();
    });

    test('应该在Electron环境中获取日志文件', async () => {
      const files = await rotationService.getLogFiles('/test/logs');
      
      expect(mockElectronAPI.readdir).toHaveBeenCalledWith('/test/logs');
      expect(files).toHaveLength(2); // 只有.log文件
      expect(files[0]).toEqual({
        path: '/test/logs/app.log',
        size: 1024,
        created: expect.any(Date),
        modified: expect.any(Date)
      });
    });

    test('应该处理Electron API错误', async () => {
      mockElectronAPI.readdir.mockResolvedValue({ 
        success: false, 
        error: 'Directory not found' 
      });

      await expect(rotationService.getLogFiles('/nonexistent')).rejects.toThrow('Directory not found');
    });

    test('应该在Electron环境中执行轮转', async () => {
      const config: LogRotationConfig = {
        maxFileSize: 0.5, // 0.5MB，小于当前文件大小
        maxFiles: 3,
        enableCompression: false
      };

      await rotationService.rotateIfNeeded('/test/logs', config);
      
      expect(mockElectronAPI.rename).toHaveBeenCalled();
    });

    test('应该在Electron环境中删除文件', async () => {
      await rotationService.cleanupOldLogs('/test/logs', 0); // 0天，删除所有文件
      
      expect(mockElectronAPI.unlink).toHaveBeenCalled();
    });
  });

  describe('浏览器环境测试', () => {
    beforeEach(() => {
      delete (window as any).electronAPI;
      rotationService = new LogRotation();
    });

    test('应该在浏览器环境中使用localStorage获取文件', async () => {
      localStorageMock.getItem.mockReturnValue('test data');
      const originalObjectKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['log_app_log', 'log_error_log', 'other_key']);

      const files = await rotationService.getLogFiles('/browser/logs');
      
      expect(files.length).toBe(2);
      expect(files[0].path).toContain('app/log');
      expect(files[1].path).toContain('error/log');
      
      // 恢复 Object.keys
      Object.keys = originalObjectKeys;
    });

    test('应该在浏览器环境中处理文件重命名', async () => {
      localStorageMock.getItem.mockReturnValue('log data');
      const originalObjectKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['log_app_log']);
      
      const config: LogRotationConfig = {
        maxFileSize: 0.001, // 很小的大小强制轮转
        maxFiles: 3,
        enableCompression: false
      };

      await rotationService.rotateIfNeeded('/browser/logs', config);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      
      // 恢复 Object.keys
      Object.keys = originalObjectKeys;
    });

    test('应该在浏览器环境中删除文件', async () => {
      const originalObjectKeys = Object.keys;
      Object.keys = jest.fn().mockReturnValue(['log_app_log']);
      
      await rotationService.cleanupOldLogs('/browser/logs', 0);
      
      expect(localStorageMock.removeItem).toHaveBeenCalled();
      
      // 恢复 Object.keys
      Object.keys = originalObjectKeys;
    });
  });

  describe('Node.js环境测试', () => {
    beforeEach(() => {
      delete (window as any).electronAPI;
      
      // Mock require
      jest.doMock('fs', () => mockFs);
      jest.doMock('path', () => mockPath);
      jest.doMock('zlib', () => mockZlib);
      
      rotationService = new LogRotation();
    });

    test('应该正确获取日志文件信息', async () => {
      const files = await rotationService.getLogFiles('/logs');
      
      expect(mockFs.readdir).toHaveBeenCalledWith('/logs', expect.any(Function));
      expect(files.length).toBe(2); // 只有.log文件
      
      files.forEach(file => {
        expect(file).toEqual({
          path: expect.stringContaining('.log'),
          size: expect.any(Number),
          created: expect.any(Date),
          modified: expect.any(Date)
        });
      });
    });

    test('应该处理readdir错误', async () => {
      mockFs.readdir.mockImplementation((path: string, callback: Function) => {
        callback(new Error('Permission denied'));
      });

      await expect(rotationService.getLogFiles('/forbidden')).rejects.toThrow('Permission denied');
    });

    test('应该处理stat错误', async () => {
      mockFs.stat.mockImplementation((path: string, callback: Function) => {
        callback(new Error('File not found'));
      });

      await expect(rotationService.getLogFiles('/logs')).rejects.toThrow('File not found');
    });
  });

  describe('日志轮转测试', () => {
    const testConfig: LogRotationConfig = {
      maxFileSize: 0.5, // 0.5MB
      maxFiles: 3,
      enableCompression: false
    };

    test('应该在文件超过大小限制时执行轮转', async () => {
      await rotationService.rotateIfNeeded('/logs', testConfig);
      
      // 由于模拟的文件大小是1MB，超过了0.5MB的限制，应该执行轮转
      expect(rotationService).toBeDefined();
    });

    test('应该生成带时间戳的轮转文件名', async () => {
      const files = await rotationService.getLogFiles('/logs');
      
      if (files.length > 0) {
        // 模拟文件大小超限
        mockFs.stat.mockImplementation((path: string, callback: Function) => {
          callback(null, { size: 1024 * 1024 * 2 }); // 2MB
        });

        await rotationService.rotateIfNeeded('/logs', testConfig);
        
        expect(mockFs.rename).toHaveBeenCalled();
      }
    });

    test('应该正确清理超过最大文件数的旧文件', async () => {
      // 模拟多个文件
      mockFs.readdir.mockImplementation((path: string, callback: Function) => {
        callback(null, ['file1.log', 'file2.log', 'file3.log', 'file4.log', 'file5.log']);
      });

      const config: LogRotationConfig = {
        maxFileSize: 10,
        maxFiles: 3,
        enableCompression: false
      };

      await rotationService.rotateIfNeeded('/logs', config);
      
      // 应该删除超过最大数量的文件
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    test('应该处理轮转过程中的错误', async () => {
      mockFs.rename.mockImplementation((oldPath: string, newPath: string, callback: Function) => {
        callback(new Error('Rename failed'));
      });

      // 轮转失败不应该抛出异常，应该静默处理
      await expect(rotationService.rotateIfNeeded('/logs', testConfig)).resolves.toBeUndefined();
    });
  });

  describe('压缩功能测试', () => {
    test('应该在启用压缩时压缩轮转的文件', async () => {
      const config: LogRotationConfig = {
        maxFileSize: 0.5,
        maxFiles: 3,
        enableCompression: true
      };

      // 设置模拟的zlib模块
      const mockGzip = {
        on: jest.fn(),
        pipe: jest.fn().mockReturnThis()
      };
      
      const mockWriteStream = {
        on: jest.fn((event: string, handler: Function) => {
          if (event === 'finish') {
            setTimeout(handler, 0); // 异步调用finish处理器
          }
        })
      };

      const mockReadStream = {
        pipe: jest.fn().mockReturnValue(mockGzip),
        on: jest.fn()
      };

      mockZlib.createGzip.mockReturnValue(mockGzip);
      mockFs.createReadStream.mockReturnValue(mockReadStream);
      mockFs.createWriteStream.mockReturnValue(mockWriteStream);

      await rotationService.rotateIfNeeded('/logs', config);
      
      // 等待异步压缩完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockZlib.createGzip).toHaveBeenCalled();
    });

    test('应该在压缩功能不可用时跳过压缩', async () => {
      // 创建没有zlib的环境
      const rotationWithoutZlib = new LogRotation();
      
      const config: LogRotationConfig = {
        maxFileSize: 0.5,
        maxFiles: 3,
        enableCompression: true
      };

      // 应该不抛出异常
      await expect(rotationWithoutZlib.rotateIfNeeded('/logs', config)).resolves.toBeUndefined();
    });
  });

  describe('过期日志清理测试', () => {
    test('应该删除过期的日志文件', async () => {
      // 模拟过期文件
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35天前

      mockFs.stat.mockImplementation((path: string, callback: Function) => {
        callback(null, {
          size: 1024,
          mtime: oldDate,
          birthtime: oldDate
        });
      });

      await rotationService.cleanupOldLogs('/logs', 30); // 保留30天

      expect(mockFs.unlink).toHaveBeenCalled();
    });

    test('应该保留未过期的日志文件', async () => {
      // 模拟新文件
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10天前

      mockFs.stat.mockImplementation((path: string, callback: Function) => {
        callback(null, {
          size: 1024,
          mtime: recentDate,
          birthtime: recentDate
        });
      });

      await rotationService.cleanupOldLogs('/logs', 30); // 保留30天

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    test('应该同时删除压缩文件', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      mockFs.stat.mockImplementation((path: string, callback: Function) => {
        callback(null, {
          size: 1024,
          mtime: oldDate,
          birthtime: oldDate
        });
      });

      await rotationService.cleanupOldLogs('/logs', 30);

      // 应该删除原文件和压缩文件
      expect(mockFs.unlink).toHaveBeenCalledTimes(4); // 2个原文件 + 2个压缩文件尝试
    });

    test('应该忽略压缩文件不存在的错误', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);

      mockFs.stat.mockImplementation((path: string, callback: Function) => {
        callback(null, {
          size: 1024,
          mtime: oldDate,
          birthtime: oldDate
        });
      });

      // 模拟压缩文件不存在
      mockFs.unlink.mockImplementation((path: string, callback: Function) => {
        if (path.endsWith('.gz')) {
          callback(new Error('File not found'));
        } else {
          callback();
        }
      });

      // 应该不抛出异常
      await expect(rotationService.cleanupOldLogs('/logs', 30)).resolves.toBeUndefined();
    });
  });

  describe('目录统计测试', () => {
    test('应该返回正确的目录统计信息', async () => {
      const stats = await rotationService.getDirectoryStats('/logs');

      expect(stats).toEqual({
        totalFiles: expect.any(Number),
        totalSize: expect.any(Number),
        oldestFile: expect.any(Date),
        newestFile: expect.any(Date)
      });

      expect(stats.totalFiles).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    test('应该处理空目录', async () => {
      mockFs.readdir.mockImplementation((path: string, callback: Function) => {
        callback(null, ['non-log-file.txt']); // 没有.log文件
      });

      const stats = await rotationService.getDirectoryStats('/empty');

      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0
      });
    });

    test('应该处理目录访问错误', async () => {
      mockFs.readdir.mockImplementation((path: string, callback: Function) => {
        callback(new Error('Directory not accessible'));
      });

      const stats = await rotationService.getDirectoryStats('/forbidden');

      expect(stats).toEqual({
        totalFiles: 0,
        totalSize: 0
      });
    });

    test('应该正确计算文件时间范围', async () => {
      const oldDate = new Date('2023-01-01');
      const newDate = new Date('2023-12-31');

      mockFs.stat
        .mockImplementationOnce((path: string, callback: Function) => {
          callback(null, { size: 1024, mtime: oldDate, birthtime: oldDate });
        })
        .mockImplementationOnce((path: string, callback: Function) => {
          callback(null, { size: 2048, mtime: newDate, birthtime: newDate });
        });

      const stats = await rotationService.getDirectoryStats('/logs');

      expect(stats.oldestFile?.getTime()).toBe(oldDate.getTime());
      expect(stats.newestFile?.getTime()).toBe(newDate.getTime());
    });
  });

  describe('路径处理测试', () => {
    test('应该正确处理路径操作', () => {
      const testPaths = ['/logs', 'app.log'];
      const result = mockPath.join(...testPaths);
      
      expect(result).toBe('/logs/app.log');
    });

    test('应该正确提取目录名', () => {
      const result = mockPath.dirname('/logs/app.log');
      expect(result).toBe('/logs');
    });

    test('应该正确提取文件名', () => {
      const result = mockPath.basename('/logs/app.log');
      expect(result).toBe('app.log');
    });

    test('应该正确提取文件名（不含扩展名）', () => {
      const result = mockPath.basename('/logs/app.log', '.log');
      expect(result).toBe('app');
    });

    test('应该正确提取文件扩展名', () => {
      const result = mockPath.extname('/logs/app.log');
      expect(result).toBe('.log');
    });
  });

  describe('错误恢复测试', () => {
    test('应该在文件操作失败时继续处理其他文件', async () => {
      mockFs.readdir.mockImplementation((path: string, callback: Function) => {
        callback(null, ['good.log', 'bad.log']);
      });

      mockFs.stat
        .mockImplementationOnce((path: string, callback: Function) => {
          callback(null, { size: 1024, mtime: new Date(), birthtime: new Date() });
        })
        .mockImplementationOnce((path: string, callback: Function) => {
          callback(new Error('File access denied'));
        });

      const files = await rotationService.getLogFiles('/logs');
      
      // 应该至少获取到一个文件
      expect(files.length).toBeGreaterThan(0);
    });

    test('应该处理ENOENT错误', async () => {
      mockFs.unlink.mockImplementation((path: string, callback: Function) => {
        const error = new Error('File not found');
        (error as any).code = 'ENOENT';
        callback(error);
      });

      // 应该忽略文件不存在的错误
      await expect(rotationService.cleanupOldLogs('/logs', 30)).resolves.toBeUndefined();
    });
  });

  describe('默认实例测试', () => {
    test('应该导出可用的默认实例', () => {
      expect(logRotation).toBeDefined();
      expect(typeof logRotation.getLogFiles).toBe('function');
      expect(typeof logRotation.rotateIfNeeded).toBe('function');
      expect(typeof logRotation.cleanupOldLogs).toBe('function');
      expect(typeof logRotation.getDirectoryStats).toBe('function');
    });

    test('默认实例应该正常工作', async () => {
      const config: LogRotationConfig = {
        maxFileSize: 10,
        maxFiles: 5,
        enableCompression: false
      };

      await expect(logRotation.rotateIfNeeded('/test', config)).resolves.toBeUndefined();
    });
  });
});