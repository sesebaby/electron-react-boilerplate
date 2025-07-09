import React, { useEffect, useState } from 'react';

interface ToastProps {
  isOpen: boolean;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  isOpen,
  message,
  variant = 'info',
  duration = 3000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      const _timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // 等待动画完成
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const _getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          icon: '✅',
          className: 'toast-success'
        };
      case 'error':
        return {
          icon: '❌',
          className: 'toast-error'
        };
      case 'warning':
        return {
          icon: '⚠️',
          className: 'toast-warning'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          className: 'toast-info'
        };
      default:
        return {
          icon: 'ℹ️',
          className: 'toast-info'
        };
    }
  };

  if (!isOpen) return null;

  const _styles = getVariantStyles();

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div 
        className={`
          glass-card p-4 min-w-80 max-w-md backdrop-blur-lg
          ${styles.className}
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <span className="text-xl">{styles.icon}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--popup-text-primary)' }}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 transition-colors glass-button-close"
            style={{ color: 'var(--popup-text-secondary)' }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
