/**
 * 日志工具
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

/**
 * 简单的日志记录器
 */
class Logger {
  private level: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    if (level >= this.level) {
      const entry: LogEntry = {
        timestamp: new Date(),
        level,
        message,
        data,
        source
      };

      this.logs.push(entry);
      
      // 保持日志数量在限制内
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      // 输出到控制台
      this.outputToConsole(entry);
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.data || '');
        break;
    }
  }

  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogCount(): number {
    return this.logs.length;
  }
}

// 创建并导出默认日志实例
export const logger = new Logger();
export default logger;
