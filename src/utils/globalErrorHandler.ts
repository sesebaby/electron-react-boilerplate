/**
 * 全局错误处理器
 * 负责捕获和处理未被错误边界捕获的错误
 */

import { logger } from './logger';
import { LogLevel } from './logger';

export interface GlobalErrorConfig {
  enableWindowErrorHandler: boolean;
  enableUnhandledRejectionHandler: boolean;
  enableConsoleErrorCapture: boolean;
  maxErrorsPerSession: number;
  errorReportingThreshold: number; // 分钟
}

export interface ErrorReport {
  type: 'javascript' | 'promise' | 'console' | 'network';
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: Date;
  sessionId?: string;
  userId?: string | null;
  errorCount: number;
}

class GlobalErrorHandler {
  private config: GlobalErrorConfig;
  private errorCounts: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();
  private sessionId: string;
  private userId: string | null = null;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;

  constructor(config?: Partial<GlobalErrorConfig>) {
    this.config = {
      enableWindowErrorHandler: true,
      enableUnhandledRejectionHandler: true,
      enableConsoleErrorCapture: true,
      maxErrorsPerSession: 100,
      errorReportingThreshold: 5, // 5分钟内相同错误不重复报告
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    
    this.initialize();
  }

  /**
   * 生成会话ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化全局错误处理
   */
  private initialize(): void {
    if (this.config.enableWindowErrorHandler) {
      this.setupWindowErrorHandler();
    }

    if (this.config.enableUnhandledRejectionHandler) {
      this.setupUnhandledRejectionHandler();
    }

    if (this.config.enableConsoleErrorCapture) {
      this.setupConsoleErrorCapture();
    }

    // 监听资源加载错误
    this.setupResourceErrorHandler();
  }

  /**
   * 设置window.onerror处理器
   */
  private setupWindowErrorHandler(): void {
    window.onerror = (message, source, line, column, error) => {
      const errorReport: ErrorReport = {
        type: 'javascript',
        message: String(message),
        source,
        line,
        column,
        stack: error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        sessionId: this.sessionId,
        userId: this.userId,
        errorCount: 0
      };

      this.handleError(errorReport);
      return false; // 不阻止默认错误处理
    };
  }

  /**
   * 设置未处理的Promise拒绝处理器
   */
  private setupUnhandledRejectionHandler(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const errorReport: ErrorReport = {
        type: 'promise',
        message: this.extractPromiseRejectionMessage(event.reason),
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        sessionId: this.sessionId,
        userId: this.userId,
        errorCount: 0
      };

      this.handleError(errorReport);
      // 不阻止默认处理，让Promise rejection继续传播
    });
  }

  /**
   * 设置控制台错误捕获
   */
  private setupConsoleErrorCapture(): void {
    // 重写console.error
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      const errorReport: ErrorReport = {
        type: 'console',
        message: `Console Error: ${message}`,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date(),
        sessionId: this.sessionId,
        userId: this.userId,
        errorCount: 0
      };

      // 检查是否是Error对象
      const errorArg = args.find(arg => arg instanceof Error);
      if (errorArg) {
        errorReport.stack = errorArg.stack;
      }

      this.handleError(errorReport);
      
      // 调用原始console.error
      this.originalConsoleError.apply(console, args);
    };

    // 重写console.warn（可选）
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      // 记录警告到日志（级别较低）
      logger.warn(`Console Warning: ${message}`, {
        url: window.location.href,
        sessionId: this.sessionId,
        userId: this.userId
      });
      
      // 调用原始console.warn
      this.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * 设置资源加载错误处理器
   */
  private setupResourceErrorHandler(): void {
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        // 资源加载错误
        const target = event.target as HTMLElement;
        const errorReport: ErrorReport = {
          type: 'network',
          message: `Resource failed to load: ${target.tagName}`,
          source: (target as any).src || (target as any).href,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date(),
          sessionId: this.sessionId,
          userId: this.userId,
          errorCount: 0
        };

        this.handleError(errorReport);
      }
    }, true); // 使用捕获阶段
  }

  /**
   * 提取Promise拒绝消息
   */
  private extractPromiseRejectionMessage(reason: any): string {
    if (reason instanceof Error) {
      return reason.message;
    }
    
    if (typeof reason === 'string') {
      return reason;
    }
    
    if (typeof reason === 'object' && reason !== null) {
      try {
        return JSON.stringify(reason);
      } catch {
        return '[Object object]';
      }
    }
    
    return String(reason);
  }

  /**
   * 处理错误报告
   */
  private handleError(errorReport: ErrorReport): void {
    const errorKey = this.generateErrorKey(errorReport);
    const now = Date.now();
    
    // 检查错误频率限制
    const lastTime = this.lastErrorTime.get(errorKey) || 0;
    const timeDiff = now - lastTime;
    
    if (timeDiff < this.config.errorReportingThreshold * 60 * 1000) {
      // 在阈值时间内，不重复报告相同错误
      return;
    }

    // 更新错误计数
    const currentCount = this.errorCounts.get(errorKey) || 0;
    const newCount = currentCount + 1;
    
    if (newCount > this.config.maxErrorsPerSession) {
      // 超过会话最大错误数，停止报告
      return;
    }

    this.errorCounts.set(errorKey, newCount);
    this.lastErrorTime.set(errorKey, now);
    errorReport.errorCount = newCount;

    // 记录到日志系统
    this.logError(errorReport);

    // 在开发环境中提供额外的调试信息
    if (process.env.NODE_ENV === 'development') {
      this.logDevelopmentInfo(errorReport);
    }
  }

  /**
   * 生成错误唯一键
   */
  private generateErrorKey(errorReport: ErrorReport): string {
    const parts = [
      errorReport.type,
      errorReport.message,
      errorReport.source || '',
      errorReport.line || '',
      errorReport.column || ''
    ];
    
    return parts.join('|').replace(/\s+/g, ' ').trim();
  }

  /**
   * 记录错误到日志系统
   */
  private logError(errorReport: ErrorReport): void {
    const logData = {
      ...errorReport,
      context: 'GlobalErrorHandler'
    };

    switch (errorReport.type) {
      case 'javascript':
      case 'promise':
        logger.error(`${errorReport.type.toUpperCase()} Error: ${errorReport.message}`, logData);
        break;
      
      case 'console':
        logger.warn(`Console captured: ${errorReport.message}`, logData);
        break;
      
      case 'network':
        logger.warn(`Resource loading failed: ${errorReport.message}`, logData);
        break;
      
      default:
        logger.error(`Unknown error type: ${errorReport.message}`, logData);
    }
  }

  /**
   * 开发环境调试信息
   */
  private logDevelopmentInfo(errorReport: ErrorReport): void {
    const group = `🚨 Global Error [${errorReport.type}]`;
    
    console.group(group);
    console.error('Error Report:', errorReport);
    
    if (errorReport.stack) {
      console.error('Stack Trace:', errorReport.stack);
    }
    
    console.log('Error Count:', errorReport.errorCount);
    console.log('Session ID:', this.sessionId);
    console.log('Current URL:', window.location.href);
    console.groupEnd();
  }

  /**
   * 设置当前用户ID
   */
  public setUserId(userId: string | null): void {
    this.userId = userId;
    logger.info('Global error handler user ID updated', { 
      userId,
      sessionId: this.sessionId 
    });
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<GlobalErrorConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Global error handler config updated', { 
      config: this.config,
      sessionId: this.sessionId 
    });
  }

  /**
   * 手动报告错误
   */
  public reportError(error: Error, context?: string): void {
    const errorReport: ErrorReport = {
      type: 'javascript',
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId,
      errorCount: 0
    };

    if (context) {
      errorReport.message = `[${context}] ${errorReport.message}`;
    }

    this.handleError(errorReport);
  }

  /**
   * 获取错误统计
   */
  public getErrorStats(): {
    sessionId: string;
    totalErrors: number;
    errorsByType: Record<string, number>;
    recentErrors: string[];
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    const errorsByType: Record<string, number> = {};
    const recentErrors: string[] = [];
    
    for (const [key, count] of this.errorCounts.entries()) {
      const [type] = key.split('|');
      errorsByType[type] = (errorsByType[type] || 0) + count;
      
      if (recentErrors.length < 10) {
        recentErrors.push(key);
      }
    }

    return {
      sessionId: this.sessionId,
      totalErrors,
      errorsByType,
      recentErrors
    };
  }

  /**
   * 清理错误统计
   */
  public clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrorTime.clear();
    logger.info('Global error handler stats cleared', { 
      sessionId: this.sessionId 
    });
  }

  /**
   * 销毁处理器
   */
  public destroy(): void {
    // 恢复原始的console方法
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;
    
    // 移除事件监听器
    window.onerror = null;
    
    // 清理统计数据
    this.clearErrorStats();
    
    logger.info('Global error handler destroyed', { 
      sessionId: this.sessionId 
    });
  }
}

// 创建默认实例
export const globalErrorHandler = new GlobalErrorHandler();

// 自动设置用户ID（如果有认证上下文）
if (typeof window !== 'undefined') {
  // 这里可以集成到用户认证系统
  globalErrorHandler.setUserId(null); // 暂时设为null
}

export default GlobalErrorHandler;