/**
 * 增强的日志工具
 * 支持控制台输出、文件存储和内存缓存
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  maxLogs: number;
  enableFileLogging: boolean;
  enableConsoleOutput: boolean;
  autoFlushInterval: number; // 秒
}

/**
 * 增强的日志记录器
 */
export class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private fileLoggerService: any = null;
  private autoFlushTimer: NodeJS.Timeout | null = null;
  // 保存原始的console方法，避免与其他模块的console重写产生冲突
  private originalConsole: {
    debug: typeof console.debug;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
  };

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      maxLogs: 1000,
      enableFileLogging: true,
      enableConsoleOutput: true,
      autoFlushInterval: 30, // 30秒
      ...config
    };

    // 在初始化时保存原始的console方法
    this.originalConsole = {
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console)
    };

    this.initializeFileLogging();
    this.startAutoFlush();
  }

  /**
   * 初始化文件日志功能
   */
  private async initializeFileLogging(): Promise<void> {
    if (!this.config.enableFileLogging) {
      return;
    }

    try {
      // 动态导入文件日志服务
      const { fileLoggerService } = await import('../services/logging/fileLoggerService');
      this.fileLoggerService = fileLoggerService;
    } catch (error) {
      console.warn('日志记录器: 无法加载文件日志服务，仅使用控制台输出', error);
      this.config.enableFileLogging = false;
    }
  }

  /**
   * 开始自动刷新定时器
   */
  private startAutoFlush(): void {
    if (this.config.autoFlushInterval > 0) {
      this.autoFlushTimer = setInterval(() => {
        this.flushToFile().catch(console.error);
      }, this.config.autoFlushInterval * 1000);
    }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 重新初始化如果需要
    if (config.enableFileLogging !== undefined) {
      this.initializeFileLogging();
    }
    
    // 重新启动自动刷新
    if (config.autoFlushInterval !== undefined) {
      if (this.autoFlushTimer) {
        clearInterval(this.autoFlushTimer);
      }
      this.startAutoFlush();
    }
  }

  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level >= this.config.level) {
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        data,
        source
      };

      // 添加到内存缓存
      this.logs.push(entry);
      
      // 保持日志数量在限制内
      if (this.logs.length > this.config.maxLogs) {
        this.logs.shift();
      }

      // 输出到控制台
      if (this.config.enableConsoleOutput) {
        this.outputToConsole(entry);
      }

      // 写入文件（异步）
      if (this.config.enableFileLogging && this.fileLoggerService) {
        this.fileLoggerService.writeLog(entry).catch((error: any) => {
          // 使用原始console.error避免与全局错误处理器形成循环调用
          this.originalConsole.error('文件日志写入失败:', error);
        });
      }
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}]`;

    // 使用原始的console方法，避免与其他模块的console重写产生循环调用
    switch (entry.level) {
      case LogLevel.DEBUG:
        this.originalConsole.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        this.originalConsole.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        this.originalConsole.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        this.originalConsole.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  /**
   * Debug级别日志
   */
  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * Info级别日志
   */
  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Warning级别日志
   */
  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Error级别日志
   */
  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  /**
   * 批量记录日志
   */
  logBatch(entries: Omit<LogEntry, 'timestamp'>[]): void {
    const logEntries: LogEntry[] = entries.map(entry => ({
      ...entry,
      timestamp: new Date()
    }));

    // 过滤日志级别
    const filteredEntries = logEntries.filter(entry => entry.level >= this.config.level);

    // 添加到内存缓存
    this.logs.push(...filteredEntries);

    // 保持日志数量在限制内
    while (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // 输出到控制台
    if (this.config.enableConsoleOutput) {
      filteredEntries.forEach(entry => this.outputToConsole(entry));
    }

    // 批量写入文件
    if (this.config.enableFileLogging && this.fileLoggerService && filteredEntries.length > 0) {
      this.fileLoggerService.writeLogBatch(filteredEntries).catch((error: any) => {
        // 使用原始console.error避免与全局错误处理器形成循环调用
        this.originalConsole.error('批量文件日志写入失败:', error);
      });
    }
  }

  /**
   * 获取日志列表
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  /**
   * 清空内存日志
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * 获取日志数量
   */
  getLogCount(): number {
    return this.logs.length;
  }

  /**
   * 手动刷新到文件
   */
  async flushToFile(): Promise<void> {
    if (this.fileLoggerService) {
      try {
        await this.fileLoggerService.flush();
      } catch (error) {
        this.originalConsole.error('手动刷新日志失败:', error);
      }
    }
  }

  /**
   * 获取日志统计信息
   */
  getStats(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    memoryUsage: number;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const logsByLevel: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0
    };

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      logsByLevel[levelName] = (logsByLevel[levelName] || 0) + 1;
    });

    const sortedLogs = [...this.logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      totalLogs: this.logs.length,
      logsByLevel,
      memoryUsage: JSON.stringify(this.logs).length, // 近似内存使用量
      oldestLog: sortedLogs[0]?.timestamp,
      newestLog: sortedLogs[sortedLogs.length - 1]?.timestamp
    };
  }

  /**
   * 启用/禁用文件日志
   */
  async setFileLogging(enabled: boolean): Promise<void> {
    this.config.enableFileLogging = enabled;
    if (enabled) {
      await this.initializeFileLogging();
    } else {
      if (this.fileLoggerService) {
        await this.fileLoggerService.flush();
        this.fileLoggerService = null;
      }
    }
  }

  /**
   * 启用/禁用控制台输出
   */
  setConsoleOutput(enabled: boolean): void {
    this.config.enableConsoleOutput = enabled;
  }

  /**
   * 获取配置信息
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * 销毁日志记录器
   */
  async destroy(): Promise<void> {
    // 停止自动刷新
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
    }

    // 最后一次刷新
    await this.flushToFile();

    // 清理文件日志服务
    if (this.fileLoggerService && this.fileLoggerService.destroy) {
      this.fileLoggerService.destroy();
    }

    // 清空内存日志
    this.logs = [];
  }
}

// 创建并导出默认日志实例
export const logger = new Logger();

// 进程退出时清理
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    logger.destroy().catch(console.error);
  });

  process.on('SIGINT', () => {
    logger.destroy().then(() => process.exit(0)).catch(() => process.exit(1));
  });

  process.on('SIGTERM', () => {
    logger.destroy().then(() => process.exit(0)).catch(() => process.exit(1));
  });
}

export default logger;
