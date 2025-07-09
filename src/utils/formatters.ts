// 共享的格式化工具，避免重复创建

// 货币格式化器（单例）
const _currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
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
export const _formatCurrency = (value: number): string => {
  return _currencyFormatter.format(value);
};

export const _formatNumber = (value: number): string => {
  return _numberFormatter.format(value);
};

export const _formatPercent = (value: number): string => {
  return _percentFormatter.format(value / 100);
};

export const _formatDate = (date: Date | string): string => {
  const _dateObj = typeof date === 'string' ? new Date(date) : date;
  return _dateFormatter.format(_dateObj);
};

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