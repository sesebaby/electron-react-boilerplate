import React from 'react';
import { UseFormRegisterReturn } from 'react-hook-form';

// Security utility functions
const sanitizeText = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>\"']/g, '');
};

const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';
  return html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  register?: UseFormRegisterReturn;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  register?: UseFormRegisterReturn;
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
  value,
  required = false,
  register,
  ...props 
}) => {
  // Sanitize potentially dangerous props
  const sanitizedProps = { ...props };
  delete sanitizedProps.dangerouslySetInnerHTML;
  
  // If register is provided, use it instead of manual value handling
  const inputProps = register ? {
    ...sanitizedProps,
    ...register
  } : {
    ...sanitizedProps,
    value: typeof value === 'string' ? sanitizeText(value) : value
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium flex items-center gap-1" style={{ color: 'var(--form-label-color)' }}>
          {sanitizeText(label)}
          {required && <span style={{ color: 'var(--form-required-color)' }}>*</span>}
        </label>
      )}
      <input
        {...inputProps}
        className={`glass-input w-full px-4 py-3 rounded-lg ${sanitizeText(className)}`}
        style={error ? {
          border: 'var(--form-error-border)',
          boxShadow: 'var(--form-error-ring)'
        } : {}}
      />
      {error && (
        <p className="text-sm" style={{ color: 'var(--form-error-color)' }}>{sanitizeText(error)}</p>
      )}
    </div>
  );
};

export const GlassSelect: React.FC<SelectProps> = ({ 
  label, 
  error, 
  children, 
  className = '', 
  required = false,
  register,
  ...props 
}) => {
  // Sanitize potentially dangerous props
  const sanitizedProps = { ...props };
  delete sanitizedProps.dangerouslySetInnerHTML;
  
  // If register is provided, use it
  const selectProps = register ? {
    ...sanitizedProps,
    ...register
  } : sanitizedProps;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium flex items-center gap-1" style={{ color: 'var(--form-label-color)' }}>
          {sanitizeText(label)}
          {required && <span style={{ color: 'var(--form-required-color)' }}>*</span>}
        </label>
      )}
      <select
        {...selectProps}
        className={`glass-input glass-select w-full px-4 py-3 rounded-lg ${sanitizeText(className)}`}
        style={error ? {
          border: 'var(--form-error-border)',
          boxShadow: 'var(--form-error-ring)'
        } : {}}
      >
        {children}
      </select>
      {error && (
        <p className="text-sm" style={{ color: 'var(--form-error-color)' }}>{sanitizeText(error)}</p>
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
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'glass-button';
      case 'success':
        return 'glass-button';
      case 'danger':
        return 'glass-button';
      default:
        return 'glass-button';
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${baseClasses} ${getVariantClasses()} ${className} ${
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:transform hover:-translate-y-0.5'
      }`}
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
      className={`glass-card p-6 rounded-2xl backdrop-blur-lg shadow-2xl ${sanitizeText(className)}`}
      style={{
        background: 'var(--card-background)',
        border: 'var(--glass-border)'
      }}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {sanitizeText(title)}
        </h3>
      )}
      {children}
    </div>
  );
};