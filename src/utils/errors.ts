// 自定义错误类型系统

// 基础应用错误类
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    isOperational = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    // 维护正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // 获取错误的JSON表示
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack
    };
  }
}

// 验证错误
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, context);
  }
}

// 资源未找到错误
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, context?: Record<string, any>) {
    const message = identifier 
      ? `${resource} '${identifier}' 未找到`
      : `${resource} 未找到`;
    super(message, 'NOT_FOUND_ERROR', 404, true, { resource, identifier, ...context });
  }
}

// 权限错误
export class PermissionError extends AppError {
  constructor(action: string, resource?: string, context?: Record<string, any>) {
    const message = resource 
      ? `无权限执行 ${action} 操作于 ${resource}`
      : `无权限执行 ${action} 操作`;
    super(message, 'PERMISSION_ERROR', 403, true, { action, resource, ...context });
  }
}

// 业务逻辑错误
export class BusinessError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'BUSINESS_ERROR', 422, true, context);
  }
}

// 数据库错误
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, true, { operation, ...context });
  }
}

// 网络错误
export class NetworkError extends AppError {
  constructor(message: string, url?: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 503, true, { url, ...context });
  }
}

// 配置错误
export class ConfigurationError extends AppError {
  constructor(message: string, configKey?: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, false, { configKey, ...context });
  }
}

// 并发错误
export class ConcurrencyError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONCURRENCY_ERROR', 409, true, context);
  }
}

// 速率限制错误
export class RateLimitError extends AppError {
  constructor(message = '请求频率过高，请稍后重试', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT_ERROR', 429, true, context);
  }
}

// 超时错误
export class TimeoutError extends AppError {
  constructor(message = '操作超时', operation?: string, context?: Record<string, any>) {
    super(message, 'TIMEOUT_ERROR', 408, true, { operation, ...context });
  }
}

// 错误工具函数
export const ErrorUtils = {
  // 检查是否为应用错误
  isAppError(error: any): error is AppError {
    return error instanceof AppError;
  },

  // 检查是否为可操作错误
  isOperationalError(error: any): boolean {
    return this.isAppError(error) && error.isOperational;
  },

  // 将未知错误转换为AppError
  normalizeError(error: unknown, fallbackMessage = '未知错误'): AppError {
    if (this.isAppError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new BusinessError(
        error.message || fallbackMessage,
        { originalError: error.name }
      );
    }

    return new BusinessError(
      typeof error === 'string' ? error : fallbackMessage,
      { originalError: typeof error }
    );
  },

  // 错误重试逻辑
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果是最后一次尝试或不可重试错误，直接抛出
        if (attempt === maxRetries || 
            (this.isAppError(error) && error.code === 'PERMISSION_ERROR')) {
          throw lastError;
        }
        
        // 等待重试
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    throw lastError!;
  },

  // 错误回退处理
  async withFallback<T, F>(
    operation: () => Promise<T>,
    fallback: () => Promise<F> | F
  ): Promise<T | F> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Operation failed, using fallback:', error);
      return await fallback();
    }
  }
};

// 错误代码常量
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CONCURRENCY_ERROR: 'CONCURRENCY_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// 错误严重级别
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export type ErrorSeverity = typeof ERROR_SEVERITY[keyof typeof ERROR_SEVERITY];