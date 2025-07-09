// 共享的格式化工具，避免重复创建

// 货币格式化器（单例）
const _currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// 数字格式化器（单例）
const _numberFormatter = new Intl.NumberFormat('zh-CN');

// 百分比格式化器（单例）
const _percentFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

// 日期格式化器（单例）
const _dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric'
});

// 导出格式化函数
export const formatCurrency = (value: number | string | null | undefined, currency?: string): string => {
  const numValue = value == null ? 0 : (typeof value === 'string' ? (isNaN(Number(value)) ? 0 : Number(value)) : value);
  if (currency && currency !== 'CNY') {
    const formatter = new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(numValue);
  }
  return _currencyFormatter.format(numValue);
};

export const formatNumber = (value: number | string | null | undefined, decimals?: number): string => {
  const numValue = value == null ? 0 : (typeof value === 'string' ? (isNaN(Number(value)) ? 0 : Number(value)) : value);
  if (decimals !== undefined) {
    const formatter = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatter.format(numValue);
  }
  return _numberFormatter.format(numValue);
};

export const formatPercent = (value: number | string | null | undefined): string => {
  const numValue = value == null ? 0 : (typeof value === 'string' ? (isNaN(Number(value)) ? 0 : Number(value)) : value);
  return _percentFormatter.format(numValue / 100);
};

export const formatPercentage = (value: number | string | null | undefined, decimals?: number): string => {
  const numValue = value == null ? 0 : (typeof value === 'string' ? (isNaN(Number(value)) ? 0 : Number(value)) : value);
  if (decimals !== undefined) {
    const formatter = new Intl.NumberFormat('zh-CN', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return formatter.format(numValue);
  }
  return _percentFormatter.format(numValue);
};

export const formatDate = (date: Date | string | null | undefined, format?: string): string => {
  if (date == null) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '无效日期';
  
  if (format === 'YYYY-MM-DD') {
    return dateObj.toISOString().split('T')[0];
  }
  if (format === 'MM/DD/YYYY') {
    return `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
  }
  
  return _dateFormatter.format(dateObj);
};

// 保持旧导出以兼容性
export const _formatCurrency = formatCurrency;
export const _formatNumber = formatNumber;
export const _formatPercent = formatPercent;
export const _formatDate = formatDate;

// 颜色工具（缓存）
const _BAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
  'from-yellow-500 to-yellow-600',
  'from-red-500 to-red-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600'
] as const;

export const _getBarColor = (index: number): string => {
  return _BAR_COLORS[index % _BAR_COLORS.length];
};

// 数学计算工具
export const _calculatePercentage = (value: number, maxValue: number): number => {
  return maxValue > 0 ? (value / maxValue) * 100 : 0;
};

export const _findMaxValue = (data: Array<{ value: number }>): number => {
  return Math.max(...data.map(item => item.value));
};

// 防抖工具
export const _debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// 节流工具
export const _throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let _lastCall = 0;
  return (...args: Parameters<T>) => {
    const _now = Date.now();
    if (_now - _lastCall >= delay) {
      _lastCall = _now;
      func(...args);
    }
  };
};

// Re-export without underscores for backward compatibility
export const formatCurrency = _formatCurrency;
export const formatDate = _formatDate;
export const formatNumber = _formatNumber;
export const formatPercent = _formatPercent;
export const findMaxValue = _findMaxValue;
export const getBarColor = _getBarColor;
export const calculatePercentage = _calculatePercentage;
export const debounce = _debounce;
export const throttle = _throttle;