/**
 * 统一错误处理模块
 * 提供标准化的错误处理和日志记录功能
 */

/**
 * 错误类型枚举
 */
const ErrorTypes = {
  DATABASE_NOT_INITIALIZED: 'DATABASE_NOT_INITIALIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR', 
  NOT_FOUND: 'NOT_FOUND',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  OPERATION_FAILED: 'OPERATION_FAILED',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

/**
 * 数据库错误处理器
 */
class DatabaseErrorHandler {
  constructor() {
    this.errorMap = new Map([
      ['SQLITE_CONSTRAINT_UNIQUE', ErrorTypes.CONSTRAINT_VIOLATION],
      ['SQLITE_CONSTRAINT_FOREIGN_KEY', ErrorTypes.CONSTRAINT_VIOLATION],
      ['SQLITE_CONSTRAINT_CHECK', ErrorTypes.VALIDATION_ERROR],
      ['SQLITE_CONSTRAINT_NOT_NULL', ErrorTypes.VALIDATION_ERROR]
    ]);
  }

  /**
   * 处理数据库操作错误
   * @param {Error} error - 原始错误
   * @param {string} operation - 操作名称
   * @param {Object} context - 错误上下文
   * @returns {Object} 标准化错误结果
   */
  handleError(error, operation, context = {}) {
    const errorInfo = this.analyzeError(error);
    const standardizedError = this.createStandardError(errorInfo, operation, context);
    
    // 记录错误日志
    this.logError(standardizedError, error);
    
    return {
      success: false,
      error: standardizedError.message,
      errorType: standardizedError.type,
      errorCode: standardizedError.code
    };
  }

  /**
   * 分析错误类型
   * @param {Error} error - 原始错误
   * @returns {Object} 错误分析结果
   */
  analyzeError(error) {
    if (!error) {
      return { type: ErrorTypes.SYSTEM_ERROR, code: 'UNKNOWN_ERROR' };
    }

    // SQLite约束错误
    if (error.code && this.errorMap.has(error.code)) {
      return {
        type: this.errorMap.get(error.code),
        code: error.code,
        details: error.message
      };
    }

    // 自定义验证错误
    if (error.message && error.message.includes('Missing required fields')) {
      return {
        type: ErrorTypes.VALIDATION_ERROR,
        code: 'MISSING_REQUIRED_FIELDS',
        details: error.message
      };
    }

    // 数据库未初始化
    if (error.message && error.message.includes('Database not initialized')) {
      return {
        type: ErrorTypes.DATABASE_NOT_INITIALIZED,
        code: 'DB_NOT_INITIALIZED',
        details: error.message
      };
    }

    // 记录未找到
    if (error.message && (error.message.includes('not found') || error.message.includes('No changes'))) {
      return {
        type: ErrorTypes.NOT_FOUND,
        code: 'RECORD_NOT_FOUND',
        details: error.message
      };
    }

    // 默认系统错误
    return {
      type: ErrorTypes.SYSTEM_ERROR,
      code: 'OPERATION_FAILED',
      details: error.message || 'Unknown error occurred'
    };
  }

  /**
   * 创建标准化错误对象
   * @param {Object} errorInfo - 错误信息
   * @param {string} operation - 操作名称
   * @param {Object} context - 错误上下文
   * @returns {Object} 标准化错误
   */
  createStandardError(errorInfo, operation, context) {
    const timestamp = new Date().toISOString();
    
    const standardError = {
      type: errorInfo.type,
      code: errorInfo.code,
      operation,
      message: this.generateUserFriendlyMessage(errorInfo, operation),
      details: errorInfo.details,
      context,
      timestamp
    };

    return standardError;
  }

  /**
   * 生成用户友好的错误消息
   * @param {Object} errorInfo - 错误信息
   * @param {string} operation - 操作名称
   * @returns {string} 用户友好的错误消息
   */
  generateUserFriendlyMessage(errorInfo, operation) {
    const operationMap = {
      'create': '创建',
      'update': '更新', 
      'delete': '删除',
      'get': '获取',
      'search': '搜索'
    };

    const operationChinese = operationMap[operation] || operation;

    switch (errorInfo.type) {
      case ErrorTypes.DATABASE_NOT_INITIALIZED:
        return '数据库未初始化，请重启应用程序';
        
      case ErrorTypes.VALIDATION_ERROR:
        if (errorInfo.details.includes('Missing required fields')) {
          return `${operationChinese}失败：缺少必需字段`;
        }
        return `${operationChinese}失败：数据验证错误`;
        
      case ErrorTypes.NOT_FOUND:
        return `${operationChinese}失败：记录不存在`;
        
      case ErrorTypes.CONSTRAINT_VIOLATION:
        if (errorInfo.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return `${operationChinese}失败：数据重复，该记录已存在`;
        }
        if (errorInfo.code === 'SQLITE_CONSTRAINT_FOREIGN_KEY') {
          return `${operationChinese}失败：关联数据不存在`;
        }
        return `${operationChinese}失败：数据约束冲突`;
        
      case ErrorTypes.OPERATION_FAILED:
        return `${operationChinese}操作失败，请稍后重试`;
        
      default:
        return `${operationChinese}失败：系统错误`;
    }
  }

  /**
   * 记录错误日志
   * @param {Object} standardizedError - 标准化错误
   * @param {Error} originalError - 原始错误
   */
  logError(standardizedError, originalError) {
    const logEntry = {
      level: 'ERROR',
      timestamp: standardizedError.timestamp,
      operation: standardizedError.operation,
      errorType: standardizedError.type,
      errorCode: standardizedError.code,
      message: standardizedError.message,
      details: standardizedError.details,
      context: standardizedError.context,
      stack: originalError?.stack
    };

    // 输出到控制台（生产环境可以替换为专业日志工具）
    console.error('Database Error:', JSON.stringify(logEntry, null, 2));
  }
}

/**
 * 全局错误处理器实例
 */
const errorHandler = new DatabaseErrorHandler();

/**
 * 包装数据库操作的错误处理
 * @param {Function} operation - 数据库操作函数
 * @param {string} operationName - 操作名称
 * @param {Object} context - 操作上下文
 * @returns {Function} 包装后的操作函数
 */
function withErrorHandling(operation, operationName, context = {}) {
  return async (...args) => {
    try {
      return await operation(...args);
    } catch (error) {
      return errorHandler.handleError(error, operationName, context);
    }
  };
}

/**
 * IPC处理器错误包装
 * @param {Function} handler - IPC处理器函数
 * @param {string} handlerName - 处理器名称
 * @returns {Function} 包装后的处理器
 */
function wrapIpcHandler(handler, handlerName) {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      return errorHandler.handleError(error, handlerName, { args });
    }
  };
}

module.exports = {
  ErrorTypes,
  DatabaseErrorHandler,
  errorHandler,
  withErrorHandling,
  wrapIpcHandler
};