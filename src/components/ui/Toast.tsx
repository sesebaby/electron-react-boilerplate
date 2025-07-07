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
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // 等待动画完成
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          icon: '✅',
          bg: 'bg-green-500/20',
          border: 'border-green-400/30',
          text: 'text-green-300'
        };
      case 'error':
        return {
          icon: '❌',
          bg: 'bg-red-500/20',
          border: 'border-red-400/30',
          text: 'text-red-300'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-400/30',
          text: 'text-yellow-300'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/30',
          text: 'text-blue-300'
        };
      default:
        return {
          icon: 'ℹ️',
          bg: 'bg-blue-500/20',
          border: 'border-blue-400/30',
          text: 'text-blue-300'
        };
    }
  };

  if (!isOpen) return null;

  const styles = getVariantStyles();

  return (
    <div className="fixed top-4 right-4 z-[9999]">
      <div 
        className={`
          glass-card p-4 min-w-80 max-w-md backdrop-blur-lg border
          ${styles.bg} ${styles.border}
          transform transition-all duration-300 ease-in-out
          ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <span className="text-xl">{styles.icon}</span>
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${styles.text}`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="flex-shrink-0 text-white/60 hover:text-white/80 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
