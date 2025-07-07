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

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          icon: '✅',
          iconBg: 'bg-green-500/20',
          iconText: 'text-green-300',
          confirmVariant: 'success' as const
        };
      case 'error':
        return {
          icon: '❌',
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
          icon: 'ℹ️',
          iconBg: 'bg-blue-500/20',
          iconText: 'text-blue-300',
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

        {/* 确定按钮 */}
        <div className="flex justify-end">
          <GlassButton
            variant={styles.confirmVariant}
            onClick={onConfirm}
            className="px-8 py-2"
          >
            {confirmText}
          </GlassButton>
        </div>
      </div>
    </div>
  );
};

export default AlertDialog;
