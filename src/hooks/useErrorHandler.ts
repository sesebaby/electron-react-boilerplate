import { useCallback, useState } from 'react';
import { AppError, ErrorUtils } from '../utils/errors';
import { logger } from '../utils/secureLogger';

export interface ErrorState {
  error: Error | null;
  isLoading: boolean;
  hasError: boolean;
  errorId: string | null;
}

export interface UseErrorHandlerOptions {
  onError?: (error: Error) => void;
  autoReset?: boolean;
  autoResetDelay?: number;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    hasError: false,
    errorId: null
  });

  const {
    onError,
    autoReset = true,
    autoResetDelay = 5000
  } = options;

  // 处理错误
  const handleError = useCallback((error: unknown) => {
    const normalizedError = ErrorUtils.normalizeError(error);
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 记录错误
    logger.error('Error handled by useErrorHandler', {
      error: normalizedError.toJSON(),
      errorId,
      timestamp: new Date().toISOString()
    });

    // 更新状态
    setErrorState({
      error: normalizedError,
      isLoading: false,
      hasError: true,
      errorId
    });

    // 调用外部错误处理函数
    if (onError) {
      onError(normalizedError);
    }

    // 自动重置
    if (autoReset) {
      setTimeout(() => {
        setErrorState(prev => ({ ...prev, hasError: false, error: null, errorId: null }));
      }, autoResetDelay);
    }
  }, [onError, autoReset, autoResetDelay]);

  // 清除错误状态
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      hasError: false,
      errorId: null
    });
  }, []);

  // 设置加载状态
  const setLoading = useCallback((loading: boolean) => {
    setErrorState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  // 包装异步操作
  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingMessage?: string
  ): Promise<T | null> => {
    try {
      setLoading(true);
      clearError();
      
      const result = await operation();
      setLoading(false);
      return result;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [handleError, clearError, setLoading]);

  // 包装同步操作
  const executeSync = useCallback(<T>(
    operation: () => T
  ): T | null => {
    try {
      clearError();
      return operation();
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [handleError, clearError]);

  // 重试操作
  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> => {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        setLoading(true);
        const result = await operation();
        setLoading(false);
        clearError();
        return result;
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          handleError(error);
          return null;
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
    
    return null;
  }, [handleError, clearError, setLoading]);

  return {
    ...errorState,
    handleError,
    clearError,
    setLoading,
    executeAsync,
    executeSync,
    retry
  };
};

// 全局错误处理Hook
export const useGlobalErrorHandler = () => {
  const errorHandler = useErrorHandler({
    autoReset: false, // 全局错误不自动重置
    onError: (error) => {
      // 可以在这里添加全局错误处理逻辑
      // 比如显示全局通知、发送错误报告等
      if (process.env.NODE_ENV === 'production') {
        // 发送到错误监控服务
      }
    }
  });

  return errorHandler;
};

export default useErrorHandler;