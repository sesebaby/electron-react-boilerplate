/**
 * 错误处理工具类
 */

export interface ErrorDetails {
  name: string;
  message: string;
  code: string;
  statusCode?: number;
  context?: Record<string, unknown>;
  stack?: string;
}

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode?: number, context?: Record<string, unknown>) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    
    // 确保错误栈信息正确
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, context);
    this.name = 'DatabaseError';
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 503, context);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

export class BusinessError extends ApplicationError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_ERROR', 422, context);
    this.name = 'BusinessError';
  }
}

/**
 * 错误处理工具类
 */
export class ErrorUtils {
  /**
   * 将错误转换为标准化的错误详情
   */
  static toErrorDetails(error: unknown): ErrorDetails {
    if (error instanceof ApplicationError) {
      return {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        context: error.context,
        stack: error.stack
      };
    }
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        code: 'UNKNOWN_ERROR',
        stack: error.stack
      };
    }
    
    return {
      name: 'UnknownError',
      message: String(error),
      code: 'UNKNOWN_ERROR'
    };
  }

  /**
   * 检查错误是否为应用程序错误
   */
  static isApplicationError(error: unknown): error is ApplicationError {
    return error instanceof ApplicationError;
  }

  /**
   * 检查错误是否为特定类型
   */
  static isErrorType(error: unknown, ErrorType: new (...args: any[]) => Error): boolean {
    return error instanceof ErrorType;
  }

  /**
   * 创建错误对象
   */
  static createError(message: string, code: string, statusCode?: number, context?: Record<string, unknown>): ApplicationError {
    return new ApplicationError(message, code, statusCode, context);
  }

  /**
   * 格式化错误信息用于日志记录
   */
  static formatErrorForLog(error: unknown): string {
    const details = this.toErrorDetails(error);
    return `[${details.code}] ${details.name}: ${details.message}`;
  }

  /**
   * 格式化错误信息用于用户显示
   */
  static formatErrorForUser(error: unknown): string {
    const details = this.toErrorDetails(error);
    
    // 根据错误类型返回用户友好的消息
    switch (details.code) {
      case 'VALIDATION_ERROR':
        return `数据验证失败: ${details.message}`;
      case 'NOT_FOUND':
        return `未找到请求的资源: ${details.message}`;
      case 'DATABASE_ERROR':
        return '数据库操作失败，请稍后重试';
      case 'NETWORK_ERROR':
        return '网络连接失败，请检查网络状态';
      case 'AUTHENTICATION_ERROR':
        return '身份验证失败，请重新登录';
      case 'AUTHORIZATION_ERROR':
        return '权限不足，无法执行此操作';
      default:
        return '系统错误，请联系管理员';
    }
  }

  /**
   * 处理Promise错误
   */
  static handlePromiseError(error: unknown): never {
    if (this.isApplicationError(error)) {
      throw error;
    }
    
    if (error instanceof Error) {
      throw new ApplicationError(error.message, 'PROMISE_ERROR', 500, {
        originalError: error.name,
        stack: error.stack
      });
    }
    
    throw new ApplicationError(String(error), 'PROMISE_ERROR', 500);
  }

  /**
   * 安全地执行可能抛出错误的函数
   */
  static async safeExecute<T>(
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      console.error('Safe execution failed:', this.formatErrorForLog(error));
      return fallback ?? null;
    }
  }

  /**
   * 重试机制
   */
  static async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i === retries) break;
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw lastError;
  }
}

// 导出单例实例
export const _ErrorUtils = ErrorUtils;

// 导出默认实例
export default ErrorUtils;