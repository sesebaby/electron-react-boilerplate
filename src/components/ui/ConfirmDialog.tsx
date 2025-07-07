import React from 'react';
import { GlassButton } from './FormControls';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: '⚠️',
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
          icon: '⚠️',
          iconClassName: 'alert-icon-warning',
          confirmVariant: 'primary' as const
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="popup-overlay flex items-center justify-center p-4 z-[9999]">
      <div className="glass-card max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95 duration-200">
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

        {/* 按钮组 */}
        <div className="flex gap-3 justify-end">
          <GlassButton
            variant="secondary"
            onClick={onCancel}
            className="px-6 py-2"
          >
            {cancelText}
          </GlassButton>
          <GlassButton
            variant={styles.confirmVariant}
            onClick={onConfirm}
            className="px-6 py-2"
          >
            {confirmText}
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
