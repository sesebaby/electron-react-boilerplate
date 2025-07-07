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
          iconBg: 'bg-red-500/20',
          iconText: 'text-red-300',
          confirmVariant: 'danger' as const
        };
      case 'warning':
        return {
          icon: '⚠️',
          iconBg: 'bg-yellow-500/20',
          iconText: 'text-yellow-300',
          confirmVariant: 'primary' as const
        };
      case 'info':
        return {
          icon: 'ℹ️',
          iconBg: 'bg-blue-500/20',
          iconText: 'text-blue-300',
          confirmVariant: 'primary' as const
        };
      default:
        return {
          icon: '⚠️',
          iconBg: 'bg-yellow-500/20',
          iconText: 'text-yellow-300',
          confirmVariant: 'primary' as const
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
      <div className="glass-card max-w-md w-full p-6 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* 图标和标题 */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <span className="text-2xl">{styles.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {title}
            </h3>
          </div>
        </div>

        {/* 消息内容 */}
        <div className="mb-6">
          <p className="text-white/80 leading-relaxed">
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
