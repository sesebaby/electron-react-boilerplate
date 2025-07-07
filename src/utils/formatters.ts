// 共享的格式化工具，避免重复创建

// 货币格式化器（单例）
const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

// 数字格式化器（单例）
const numberFormatter = new Intl.NumberFormat('zh-CN');

// 百分比格式化器（单例）
const percentFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

// 日期格式化器（单例）
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric'
});

// 导出格式化函数
export const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value);
};

export const formatNumber = (value: number): string => {
  return numberFormatter.format(value);
};

export const formatPercent = (value: number): string => {
  return percentFormatter.format(value / 100);
};

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateFormatter.format(dateObj);
};

// 颜色工具（缓存）
const BAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-purple-500 to-purple-600',
  'from-yellow-500 to-yellow-600',
  'from-red-500 to-red-600',
  'from-indigo-500 to-indigo-600',
  'from-pink-500 to-pink-600',
  'from-cyan-500 to-cyan-600'
] as const;

export const getBarColor = (index: number): string => {
  return BAR_COLORS[index % BAR_COLORS.length];
};

// 数学计算工具
export const calculatePercentage = (value: number, maxValue: number): number => {
  return maxValue > 0 ? (value / maxValue) * 100 : 0;
};

export const findMaxValue = (data: Array<{ value: number }>): number => {
  return Math.max(...data.map(item => item.value));
};

// 防抖工具
export const debounce = <T extends (...args: any[]) => any>(
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
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};