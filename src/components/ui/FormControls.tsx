import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  loading?: boolean;
}

export const GlassInput: React.FC<InputProps> = ({ 
  label, 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        className={`glass-input w-full px-4 py-3 rounded-lg ${className}`}
      />
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

export const GlassSelect: React.FC<SelectProps> = ({ 
  label, 
  error, 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </label>
      )}
      <select
        {...props}
        className={`glass-input glass-select w-full px-4 py-3 rounded-lg ${className}`}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
};

export const GlassButton: React.FC<ButtonProps> = ({ 
  variant = 'secondary',
  loading = false,
  children,
  className = '',
  disabled,
  ...props 
}) => {
  const baseClasses = 'glass-button px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2';
  
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--popup-background)',
          color: 'var(--popup-text-primary)',
          border: 'var(--popup-border)',
          backdropFilter: 'var(--popup-blur)'
        };
      case 'success':
        return {
          background: 'linear-gradient(to right, #10b981, #059669)',
          color: 'white'
        };
      case 'danger':
        return {
          background: 'linear-gradient(to right, #ef4444, #dc2626)',
          color: 'white'
        };
      default:
        return {
          background: 'var(--card-background)',
          color: 'var(--text-primary)',
          border: 'var(--glass-border)',
          backdropFilter: 'blur(10px)'
        };
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClasses} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:-translate-y-0.5'
      }`}
      style={getButtonStyle()}
    >
      {loading && (
        <div className="w-4 h-4 border-2 opacity-30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export const GlassCard: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = ({ children, className = '', title }) => {
  return (
    <div 
      className={`glass-card p-6 rounded-2xl ${className}`}
      style={{
        background: 'var(--card-background)',
        border: 'var(--glass-border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: 'var(--glass-shadow)'
      }}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};