import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorUtils } from '../utils/errors';
import { logger } from '../utils/logger';
import { globalErrorHandler } from '../utils/globalErrorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, onRetry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // 更新状态以便下次渲染显示错误 UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误信息
    this.setState({ errorInfo });

    // 生成错误报告
    const normalizedError = ErrorUtils.normalizeError(error);
    const errorReport = {
      error: normalizedError.toJSON(),
      errorInfo: {
        componentStack: errorInfo.componentStack,
        errorBoundary: this.constructor.name
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: 'current-user-id' // TODO: 从用户上下文获取
    };

    // 记录到日志系统
    logger.error('React Error Boundary caught an error', errorReport, 'ErrorBoundary');

    // 同时通过全局错误处理器报告
    globalErrorHandler.reportError(error, `ErrorBoundary:${this.constructor.name}`);

    // 调用外部错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 如果是生产环境，可以发送错误报告到监控服务
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorReport(errorReport);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private async sendErrorReport(errorReport: any) {
    try {
      // TODO: 发送到错误监控服务
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
      console.info('Error report would be sent in production:', errorReport);
    } catch (reportError) {
      console.error('Failed to send error report:', reportError);
    }
  }

  private handleRetry = () => {
    // 延迟重试，给React时间清理状态
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }, 100);
  };

  private getErrorSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    if (ErrorUtils.isAppError(error)) {
      switch (error.code) {
        case 'PERMISSION_ERROR':
        case 'CONFIGURATION_ERROR':
          return 'critical';
        case 'DATABASE_ERROR':
        case 'NETWORK_ERROR':
          return 'high';
        case 'BUSINESS_ERROR':
        case 'VALIDATION_ERROR':
          return 'medium';
        default:
          return 'low';
      }
    }
    return 'high'; // 未知错误认为高优先级
  }

  private renderDefaultFallback(error: Error, errorInfo: ErrorInfo) {
    const severity = this.getErrorSeverity(error);
    const isAppError = ErrorUtils.isAppError(error);
    
    const severityColors = {
      low: 'error-badge-info',
      medium: 'error-badge-warning', 
      high: 'error-badge-error',
      critical: 'error-badge-critical'
    };

    const severityEmojis = {
      low: '📝',
      medium: '⚠️',
      high: '😨',
      critical: '🛑'
    };

    return (
      <div className="min-h-screen glass-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full glass-card p-8 text-center">
          {/* 错误图标和严重级别 */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${severityColors[severity]} flex items-center justify-center text-4xl`}>
            {severityEmojis[severity]}
          </div>

          {/* 错误标题 */}
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--popup-text-primary)' }}>
            {
              severity === 'critical' ? '系统错误' :
              severity === 'high' ? '操作失败' :
              severity === 'medium' ? '发生错误' : '小问题'
            }
          </h1>

          {/* 错误消息 */}
          <div className="mb-6" style={{ color: 'var(--popup-text-secondary)' }}>
            {isAppError ? (
              <p className="text-sm">{error.message}</p>
            ) : (
              <div>
                <p className="text-sm mb-2">应用出现了意外错误，请稍后重试。</p>
                {process.env.NODE_ENV === 'development' && (
                  <details className="text-left text-xs mt-4" style={{ color: 'var(--popup-text-tertiary)' }}>
                    <summary className="cursor-pointer" style={{ color: 'var(--popup-text-secondary)' }}>查看错误详情</summary>
                    <pre className="mt-2 p-2 rounded overflow-auto max-h-32 glass-code-block">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>

          {/* 错误 ID */}
          {this.state.errorId && (
            <div className="text-xs mb-6" style={{ color: 'var(--popup-text-tertiary)' }}>
              错误 ID: {this.state.errorId}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {this.props.enableRetry !== false && (
              <button
                onClick={this.handleRetry}
                className="px-6 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 glass-button-primary"
              >
                🔄 重试
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-200 glass-button"
            >
              🔄 刷新页面
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 rounded-lg font-medium transition-all duration-200 glass-button"
            >
              🏠 返回首页
            </button>
          </div>

          {/* 帮助信息 */}
          <div className="mt-6 text-xs" style={{ color: 'var(--popup-text-tertiary)' }}>
            <p>如果问题持续存在，请联系系统管理员。</p>
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 使用自定义fallback或默认fallback
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error, 
          this.state.errorInfo!, 
          this.handleRetry
        );
      }
      
      return this.renderDefaultFallback(this.state.error, this.state.errorInfo!);
    }

    return this.props.children;
  }
}

// 简化的错误边界组件，用于小组件
export const SimpleErrorBoundary: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback 
}) => {
  return (
    <ErrorBoundary
      fallback={(error) => (
        fallback || (
          <div className="p-4 rounded-lg error-fallback-simple">
            <p className="text-sm font-medium" style={{ color: 'var(--error-color)' }}>加载失败</p>
            <p className="text-xs mt-1" style={{ color: 'var(--popup-text-tertiary)' }}>{error.message}</p>
          </div>
        )
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// 高阶组件，为组件添加错误边界
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: (error: Error, errorInfo: ErrorInfo, onRetry: () => void) => ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

export default ErrorBoundary;