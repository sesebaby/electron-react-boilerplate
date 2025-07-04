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
        <label className="block text-sm font-medium text-white/90">
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
        <label className="block text-sm font-medium text-white/90">
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
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl',
    secondary: '',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl',
    danger: 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:shadow-xl'
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:-translate-y-0.5'
      }`}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    <div className={`glass-card p-6 rounded-2xl ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-white/90 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
};