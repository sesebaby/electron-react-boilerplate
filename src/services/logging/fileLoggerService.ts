/**
 * 文件日志服务
 * 负责将日志写入文件系统，支持日志轮转和不同级别分文件存储
 */

import { LogLevel, LogEntry } from '../../utils/logger';
import { logRotation } from '../../utils/logRotation';

export interface FileLoggerConfig {
  logDirectory: string;
  maxFileSize: number; // MB
  maxFiles: number;
  enableRotation: boolean;
  separateByLevel: boolean;
  dateFormat: string;
  enableCompression: boolean;
  enableFileLogging: boolean;
}

export interface FileLogEntry extends LogEntry {
  logFile?: string;
  category?: string;
}

class FileLoggerService {
  private config: FileLoggerConfig;
  private isElectron: boolean;
  private fs: any;
  private path: any;
  private os: any;
  private writeQueue: FileLogEntry[] = [];
  private isProcessing: boolean = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<FileLoggerConfig>) {
    this.config = {
      logDirectory: this.getDefaultLogDirectory(),
      maxFileSize: 10, // 10MB
      maxFiles: 5,
      enableRotation: true,
      separateByLevel: true,
      dateFormat: 'YYYY-MM-DD',
      enableCompression: false,
      enableFileLogging: true,
      ...config
    };

    this.isElectron = this.checkElectronEnvironment();
    this.initializeFileSystem();
    this.startFlushInterval();
  }

  /**
   * 检查是否运行在Electron环境
   */
  private checkElectronEnvironment(): boolean {
    if (typeof window === 'undefined' || typeof window.electronAPI === 'undefined') {
      return false;
    }

    // 检查文件日志服务需要的具体API是否可用
    const requiredAPIs = ['writeFile', 'mkdir', 'stat'];
    return requiredAPIs.every(api => typeof (window.electronAPI as any)[api] === 'function');
  }

  /**
   * 初始化文件系统模块
   */
  private initializeFileSystem(): void {
    if (this.isElectron) {
      // 在Electron渲染进程中，通过IPC调用主进程
      try {
        this.initializeElectronFileSystem();
        console.log('文件日志服务: Electron文件系统初始化成功');
      } catch (error) {
        console.warn('文件日志服务: Electron文件系统初始化失败，使用降级方案', error);
        this.initializeBrowserFallback();
        this.config.enableFileLogging = false; // 禁用文件日志
      }
    } else if (typeof require !== 'undefined') {
      // Node.js环境
      try {
        this.fs = require('fs');
        this.path = require('path');
        this.os = require('os');
        console.log('文件日志服务: Node.js文件系统初始化成功');
      } catch (error) {
        console.warn('文件日志服务: 无法加载Node.js模块，将使用降级方案');
        this.initializeBrowserFallback();
        this.config.enableFileLogging = false; // 禁用文件日志
      }
    } else {
      // 浏览器环境降级方案
      console.log('文件日志服务: 使用浏览器降级方案 (localStorage)');
      this.initializeBrowserFallback();
    }
  }

  /**
   * 初始化Electron文件系统
   */
  private initializeElectronFileSystem(): void {
    // 验证所有需要的API是否可用
    if (!window.electronAPI ||
        !window.electronAPI.writeFile ||
        !window.electronAPI.mkdir ||
        !window.electronAPI.stat) {
      throw new Error('Required Electron APIs not available');
    }

    // 通过IPC与主进程通信
    this.fs = {
      writeFile: (path: string, data: string, optionsOrCallback: any, callback?: (err?: any) => void) => {
        // 处理参数重载：writeFile(path, data, callback) 或 writeFile(path, data, options, callback)
        let actualCallback: (err?: any) => void;
        if (typeof optionsOrCallback === 'function') {
          actualCallback = optionsOrCallback;
        } else if (typeof callback === 'function') {
          actualCallback = callback;
        } else {
          throw new Error('Callback function is required');
        }

        window.electronAPI.writeFile(path, data)
          .then((result: { success: boolean; error?: string }) => {
            if (result.success) {
              actualCallback();
            } else {
              actualCallback(new Error(result.error || 'Write failed'));
            }
          })
          .catch(actualCallback);
      },
      mkdir: (path: string, options: any, callback: (err?: any) => void) => {
        window.electronAPI.mkdir(path, options)
          .then((result: { success: boolean; error?: string }) => {
            if (result.success) {
              callback();
            } else {
              callback(new Error(result.error || 'Mkdir failed'));
            }
          })
          .catch(callback);
      },
      stat: (path: string, callback: (err?: any, stats?: any) => void) => {
        window.electronAPI.stat(path)
          .then((result: { success: boolean; data?: any; error?: string }) => {
            if (result.success) {
              callback(null, result.data);
            } else {
              callback(new Error(result.error || 'Stat failed'));
            }
          })
          .catch(callback);
      }
    };

    this.path = {
      join: (...paths: string[]) => paths.join('/'),
      dirname: (path: string) => path.substring(0, path.lastIndexOf('/')),
      basename: (path: string) => path.substring(path.lastIndexOf('/') + 1)
    };
  }

  /**
   * 初始化浏览器降级方案
   */
  private initializeBrowserFallback(): void {
    // 在浏览器环境中使用localStorage作为降级方案
    this.fs = {
      writeFile: (path: string, data: string, optionsOrCallback: any, callback?: (err?: any) => void) => {
        // 处理参数重载：writeFile(path, data, callback) 或 writeFile(path, data, options, callback)
        let actualCallback: (err?: any) => void;
        if (typeof optionsOrCallback === 'function') {
          actualCallback = optionsOrCallback;
        } else if (typeof callback === 'function') {
          actualCallback = callback;
        } else {
          throw new Error('Callback function is required');
        }

        try {
          const key = `log_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const existingData = localStorage.getItem(key) || '';
          localStorage.setItem(key, existingData + data);
          actualCallback();
        } catch (error) {
          actualCallback(error);
        }
      },
      mkdir: (path: string, options: any, callback: (err?: any) => void) => {
        // 在localStorage中，不需要创建目录
        callback();
      },
      stat: (path: string, callback: (err?: any, stats?: any) => void) => {
        const key = `log_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const data = localStorage.getItem(key);
        if (data) {
          callback(null, { size: data.length });
        } else {
          callback(new Error('File not found'));
        }
      }
    };

    this.path = {
      join: (...paths: string[]) => paths.join('/'),
      dirname: (path: string) => path.substring(0, path.lastIndexOf('/')),
      basename: (path: string) => path.substring(path.lastIndexOf('/') + 1)
    };
  }

  /**
   * 获取默认日志目录
   */
  private getDefaultLogDirectory(): string {
    if (this.isElectron) {
      return './logs';
    } else if (typeof require !== 'undefined') {
      try {
        const os = require('os');
        const path = require('path');
        return path.join(os.tmpdir(), 'inventory-app-logs');
      } catch {
        return './logs';
      }
    } else {
      return 'browser-logs';
    }
  }

  /**
   * 开始定时刷新队列
   */
  private startFlushInterval(): void {
    // 只有在文件日志启用时才启动定时器
    if (this.config.enableFileLogging) {
      this.flushInterval = setInterval(() => {
        this.flushQueue();
      }, 5000); // 每5秒刷新一次
    }
  }

  /**
   * 停止定时刷新
   */
  public stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * 写入日志
   */
  public async writeLog(entry: LogEntry): Promise<void> {
    // 如果文件日志被禁用，直接返回
    if (!this.config.enableFileLogging) {
      return;
    }

    const fileLogEntry: FileLogEntry = {
      ...entry,
      category: this.getCategoryFromSource(entry.source)
    };

    // 添加到队列
    this.writeQueue.push(fileLogEntry);

    // 如果队列太长，立即处理
    if (this.writeQueue.length > 100) {
      this.flushQueue();
    }
  }

  /**
   * 批量写入日志
   */
  public async writeLogBatch(entries: LogEntry[]): Promise<void> {
    // 如果文件日志被禁用，直接返回
    if (!this.config.enableFileLogging) {
      return;
    }

    const fileLogEntries: FileLogEntry[] = entries.map(entry => ({
      ...entry,
      category: this.getCategoryFromSource(entry.source)
    }));

    this.writeQueue.push(...fileLogEntries);

    // 立即处理大批量数据
    if (this.writeQueue.length > 50) {
      this.flushQueue();
    }
  }

  /**
   * 刷新队列到文件
   */
  private async flushQueue(): Promise<void> {
    if (this.isProcessing || this.writeQueue.length === 0 || !this.config.enableFileLogging) {
      return;
    }

    this.isProcessing = true;
    const entries = [...this.writeQueue];
    this.writeQueue = [];

    try {
      // 按日志级别和日期分组
      const groupedEntries = this.groupLogEntries(entries);
      
      // 确保日志目录存在
      await this.ensureLogDirectory();

      // 写入各个文件
      for (const [fileKey, logEntries] of Object.entries(groupedEntries)) {
        await this.writeToFile(fileKey, logEntries);
      }

      // 检查是否需要轮转
      if (this.config.enableRotation) {
        await this.rotateLogsIfNeeded();
      }

    } catch (error) {
      // 如果文件日志被禁用，不输出错误信息
      if (this.config.enableFileLogging) {
        console.error('文件日志服务: 刷新队列失败', error);
        // 将失败的日志重新加入队列
        this.writeQueue.unshift(...entries);
      }
      // 如果是API不可用错误，禁用文件日志功能
      if (error instanceof Error && error.message && error.message.includes('API not available')) {
        this.config.enableFileLogging = false;
        console.warn('文件日志服务: 检测到API不可用，已禁用文件日志功能');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 分组日志条目
   */
  private groupLogEntries(entries: FileLogEntry[]): Record<string, FileLogEntry[]> {
    const groups: Record<string, FileLogEntry[]> = {};

    entries.forEach(entry => {
      const date = this.formatDate(entry.timestamp);
      let fileKey: string;

      if (this.config.separateByLevel) {
        const levelName = LogLevel[entry.level].toLowerCase();
        fileKey = `${date}-${levelName}`;
      } else {
        fileKey = date;
      }

      if (entry.category) {
        fileKey = `${fileKey}-${entry.category}`;
      }

      if (!groups[fileKey]) {
        groups[fileKey] = [];
      }

      groups[fileKey].push(entry);
    });

    return groups;
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDirectory(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fs.mkdir(this.config.logDirectory, { recursive: true }, (err: any) => {
        if (err && err.code !== 'EEXIST') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 写入文件
   */
  private async writeToFile(fileKey: string, entries: FileLogEntry[]): Promise<void> {
    const fileName = `${fileKey}.log`;
    const filePath = this.path.join(this.config.logDirectory, fileName);

    const logContent = entries.map(entry => this.formatLogEntry(entry)).join('\n') + '\n';

    return new Promise((resolve, reject) => {
      this.fs.writeFile(filePath, logContent, { flag: 'a' }, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(entry: FileLogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const source = entry.source ? `[${entry.source}]` : '';
    const category = entry.category ? `[${entry.category}]` : '';
    
    let formatted = `${timestamp} ${level} ${source}${category} ${entry.message}`;
    
    if (entry.data) {
      try {
        const dataStr = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);
        formatted += ` | ${dataStr}`;
      } catch (error) {
        formatted += ` | [无法序列化数据]`;
      }
    }

    return formatted;
  }

  /**
   * 从source提取category
   */
  private getCategoryFromSource(source?: string): string | undefined {
    if (!source) return undefined;

    // 从文件路径或类名中提取category
    const parts = source.split(/[/\\.]/).filter(Boolean);
    if (parts.length > 0) {
      return parts[parts.length - 1];
    }

    return undefined;
  }

  /**
   * 检查是否需要轮转日志
   */
  private async rotateLogsIfNeeded(): Promise<void> {
    try {
      await logRotation.rotateIfNeeded(this.config.logDirectory, {
        maxFileSize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        enableCompression: this.config.enableCompression
      });
    } catch (error) {
      console.error('文件日志服务: 日志轮转失败', error);
    }
  }

  /**
   * 手动刷新所有缓存的日志
   */
  public async flush(): Promise<void> {
    await this.flushQueue();
  }

  /**
   * 获取日志统计信息
   */
  public async getLogStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestLog?: Date;
    newestLog?: Date;
  }> {
    // 这里可以实现日志统计逻辑
    return {
      totalFiles: 0,
      totalSize: 0
    };
  }

  /**
   * 清理过期日志
   */
  public async cleanupOldLogs(maxAgeInDays: number): Promise<void> {
    if (!this.config.enableFileLogging) {
      return;
    }

    try {
      await logRotation.cleanupOldLogs(this.config.logDirectory, maxAgeInDays);
    } catch (error) {
      console.error('文件日志服务: 清理过期日志失败', error);
    }
  }

  /**
   * 禁用文件日志功能
   */
  public disableFileLogging(): void {
    this.config.enableFileLogging = false;
    this.stopFlushInterval();
    this.writeQueue = []; // 清空队列
    console.log('文件日志服务: 文件日志功能已禁用');
  }

  /**
   * 获取文件日志状态
   */
  public isFileLoggingEnabled(): boolean {
    return this.config.enableFileLogging;
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.stopFlushInterval();
    if (this.config.enableFileLogging) {
      this.flush().catch(console.error);
    }
  }
}

// 创建默认实例
export const fileLoggerService = new FileLoggerService();
export default FileLoggerService;