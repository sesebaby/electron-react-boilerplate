import React from 'react';
import { GlassButton } from './FormControls';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  onConfirm,
  variant = 'info'
}) => {
  if (!isOpen) return null;

  const _getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          icon: '✅',
          iconClassName: 'alert-icon-success',
          confirmVariant: 'success' as const
        };
      case 'error':
        return {
          icon: '❌',
          iconClassName: 'alert-icon-error',
          confirmVariant: 'danger' as const
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconClassName: 'alert-icon-warning',
          confirmVariant: 'primary' as const
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconClassName: 'alert-icon-info',
          confirmVariant: 'primary' as const
        };
      default:
        return {
          icon: 'ℹ️',
          iconClassName: 'alert-icon-info',
          confirmVariant: 'primary' as const
        };
    }
  };

  const _styles = getVariantStyles();

  return (
    <div className="popup-overlay flex items-center justify-center p-2 sm:p-4 z-[9999]">
      <div className="glass-card max-w-md w-full p-4 sm:p-6 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* 图标和标题 */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full ${styles.iconClassName} flex items-center justify-center`}>
            <span className="text-2xl">{styles.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--popup-text-primary)' }}>
              {title}
            </h3>
          </div>
        </div>

        {/* 消息内容 */}
        <div className="mb-6">
          <p className="leading-relaxed" style={{ color: 'var(--popup-text-secondary)' }}>
            {message}
          </p>
        </div>

        {/* 确定按钮 */}
        <div className="flex justify-end">
          <GlassButton
            variant={styles.confirmVariant}
            onClick={onConfirm}
            className="px-6 sm:px-8 py-2 min-h-[44px] touch-manipulation glass-button-primary"
            style={{
              background: 'var(--accent-color)',
              borderColor: 'var(--accent-color)',
              color: 'var(--text-primary)'
            }}
          >
            {confirmText}
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
