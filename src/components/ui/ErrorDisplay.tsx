import React from 'react';
import { AppError, ErrorUtils } from '../../utils/errors';

export interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  onClear?: () => void;
  className?: string;
  variant?: 'inline' | 'card' | 'modal' | 'toast';
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onClear,
  className = '',
  variant = 'card',
  size = 'md',
  showDetails = false
}) => {
  if (!error) return null;

  const isAppError = ErrorUtils.isAppError(error);
  
  // 获取错误严重级别
  const getSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    if (isAppError) {
      const appError = error as AppError;
      switch (appError.code) {
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
    return 'high';
  };

  const severity = getSeverity(error);

  // 样式配置 - 使用CSS变量
  const severityColors = {
    low: {
      bg: '',
      border: '',
      text: '',
      icon: '📝',
      bgColor: 'var(--info-color, oklch(0.7 0.15 230))',
      borderColor: 'var(--info-color, oklch(0.7 0.15 230))',
      textColor: 'var(--info-color, oklch(0.7 0.15 230))'
    },
    medium: {
      bg: '',
      border: '',
      text: '',
      icon: '⚠️',
      bgColor: 'var(--warning-color, oklch(0.8 0.15 85))',
      borderColor: 'var(--warning-color, oklch(0.8 0.15 85))',
      textColor: 'var(--warning-color, oklch(0.8 0.15 85))'
    },
    high: {
      bg: '',
      border: '',
      text: '',
      icon: '😨',
      bgColor: 'var(--warning-color, oklch(0.8 0.15 85))',
      borderColor: 'var(--warning-color, oklch(0.8 0.15 85))',
      textColor: 'var(--warning-color, oklch(0.8 0.15 85))'
    },
    critical: {
      bg: '',
      border: '',
      text: '',
      icon: '🛑',
      bgColor: 'var(--error-color, oklch(0.63 0.24 25))',
      borderColor: 'var(--error-color, oklch(0.63 0.24 25))',
      textColor: 'var(--error-color, oklch(0.63 0.24 25))'
    }
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4',
    lg: 'p-6 text-lg'
  };

  const colors = severityColors[severity];

  // 内联样式
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${colors.text} ${className}`}>
        <span>{colors.icon}</span>
        <span className="text-sm">{error.message}</span>
        {onClear && (
          <button
            onClick={onClear}
            className="ml-auto text-white/60 hover:text-white/80 text-xs"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  // Toast样式
  if (variant === 'toast') {
    return (
      <div
        className={`
          fixed top-4 right-4 z-50 max-w-sm glass-card border
          ${sizeClasses[size]} ${className}
          animate-slide-in-right
        `}
        style={{
          backgroundColor: `${colors.bgColor}20`,
          borderColor: `${colors.borderColor}40`
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg">{colors.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium" style={{ color: colors.textColor }}>
              {severity === 'critical' ? '系统错误' :
               severity === 'high' ? '操作失败' :
               severity === 'medium' ? '发生错误' : '提示'}
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{error.message}</p>
          </div>
          <div className="flex gap-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors touch-manipulation"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="重试"
              >
                🔄
              </button>
            )}
            {onClear && (
              <button
                onClick={onClear}
                className="text-xs p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded transition-colors touch-manipulation"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="关闭"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 模态框样式
  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className={`
          max-w-md w-full glass-card
          ${colors.bg} ${colors.border} border
          ${sizeClasses[size]} ${className}
        `}>
          <div className="text-center">
            <div className="text-4xl mb-4">{colors.icon}</div>
            <h3 className={`text-xl font-semibold ${colors.text} mb-2`}>
              {severity === 'critical' ? '系统错误' : 
               severity === 'high' ? '操作失败' :
               severity === 'medium' ? '发生错误' : '提示'}
            </h3>
            <p className="text-white/80 mb-6">{error.message}</p>
            
            {showDetails && isAppError && (
              <details className="text-left text-xs text-white/60 mb-4">
                <summary className="cursor-pointer hover:text-white/80">查看详情</summary>
                <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto max-h-32">
                  {JSON.stringify((error as AppError).context, null, 2)}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                >
                  重试
                </button>
              )}
              {onClear && (
                <button
                  onClick={onClear}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium border border-white/20"
                >
                  关闭
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 卡片样式（默认）
  return (
    <div
      className={`
        glass-card border
        ${sizeClasses[size]} ${className}
      `}
      style={{
        backgroundColor: `${colors.bgColor}20`,
        borderColor: `${colors.borderColor}40`
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{colors.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold mb-1" style={{ color: colors.textColor }}>
            {severity === 'critical' ? '系统错误' :
             severity === 'high' ? '操作失败' :
             severity === 'medium' ? '发生错误' : '提示'}
          </h4>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error.message}</p>
          
          {showDetails && isAppError && (
            <details className="text-xs text-white/60 mt-3">
              <summary className="cursor-pointer hover:text-white/80">查看详情</summary>
              <pre className="mt-2 p-2 bg-black/20 rounded overflow-auto max-h-32">
                {JSON.stringify((error as AppError).context, null, 2)}
              </pre>
            </details>
          )}
        </div>
        
        <div className="flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-white/60 hover:text-white/80 p-1"
              title="重试"
            >
              🔄
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="text-white/60 hover:text-white/80 p-1"
              title="关闭"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;