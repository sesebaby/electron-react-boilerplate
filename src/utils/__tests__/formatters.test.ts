/**
 * 格式化工具函数单元测试
 */

import { formatCurrency, formatDate, formatNumber, formatPercentage } from '../formatters';

describe('Formatters Unit Tests', () => {
  describe('formatCurrency', () => {
    test('should format positive numbers correctly', () => {
      expect(formatCurrency(1234.56)).toBe('¥1,234.56');
      expect(formatCurrency(0)).toBe('¥0.00');
      expect(formatCurrency(999999.99)).toBe('¥999,999.99');
    });

    test('should format negative numbers correctly', () => {
      expect(formatCurrency(-1234.56)).toBe('-¥1,234.56');
      expect(formatCurrency(-0.01)).toBe('-¥0.01');
    });

    test('should handle edge cases', () => {
      expect(formatCurrency(0.001)).toBe('¥0.00'); // 四舍五入
      expect(formatCurrency(0.999)).toBe('¥1.00'); // 四舍五入
    });

    test('should handle different currencies', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    });
  });

  describe('formatDate', () => {
    test('should format dates correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date)).toMatch(/2024[年\-\/]1[月\-\/]15/); // 支持不同的日期格式
    });

    test('should handle date strings', () => {
      expect(formatDate('2024-01-15')).toMatch(/2024[年\-\/]1[月\-\/]15/);
    });

    test('should handle invalid dates', () => {
      expect(formatDate('invalid-date')).toBe('无效日期');
      expect(formatDate(null as any)).toBe('');
      expect(formatDate(undefined as any)).toBe('');
    });

    test('should support different formats', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('01/15/2024');
    });
  });

  describe('formatNumber', () => {
    test('should format integers correctly', () => {
      expect(formatNumber(1234)).toBe('1,234');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1234)).toBe('-1,234');
    });

    test('should format decimals correctly', () => {
      expect(formatNumber(1234.567, 2)).toBe('1,234.57');
      expect(formatNumber(1234.567, 0)).toBe('1,235');
      expect(formatNumber(1234.567, 3)).toBe('1,234.567');
    });

    test('should handle edge cases', () => {
      expect(formatNumber(0.0001, 4)).toBe('0.0001');
      expect(formatNumber(999999999)).toBe('999,999,999');
    });
  });

  describe('formatPercentage', () => {
    test('should format percentages correctly', () => {
      expect(formatPercentage(0.5)).toBe('50.0%');
      expect(formatPercentage(0.1234)).toBe('12.3%');
      expect(formatPercentage(1)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    test('should handle decimals correctly', () => {
      expect(formatPercentage(0.1234, 0)).toBe('12%');
      expect(formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatPercentage(0.1234, 2)).toBe('12.34%');
    });

    test('should handle edge cases', () => {
      expect(formatPercentage(-0.1)).toBe('-10.0%');
      expect(formatPercentage(2.5)).toBe('250.0%');
    });
  });

  describe('Input validation', () => {
    test('should handle null and undefined inputs', () => {
      expect(formatCurrency(null as any)).toBe('¥0.00');
      expect(formatCurrency(undefined as any)).toBe('¥0.00');
      
      expect(formatNumber(null as any)).toBe('0');
      expect(formatNumber(undefined as any)).toBe('0');
      
      expect(formatPercentage(null as any)).toBe('0.0%');
      expect(formatPercentage(undefined as any)).toBe('0.0%');
    });

    test('should handle string inputs that can be converted to numbers', () => {
      expect(formatCurrency('1234.56' as any)).toBe('¥1,234.56');
      expect(formatNumber('1234' as any)).toBe('1,234');
      expect(formatPercentage('0.5' as any)).toBe('50.0%');
    });

    test('should handle invalid string inputs', () => {
      expect(formatCurrency('invalid' as any)).toBe('¥0.00');
      expect(formatNumber('invalid' as any)).toBe('0');
      expect(formatPercentage('invalid' as any)).toBe('0.0%');
    });
  });

  describe('Performance tests', () => {
    test('should format large numbers efficiently', () => {
      const startTime = performance.now();
      
      // 批量格式化测试
      for (let i = 0; i < 1000; i++) {
        formatCurrency(Math.random() * 1000000);
        formatNumber(Math.random() * 1000000);
        formatPercentage(Math.random());
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // 应该在合理时间内完成（100ms内）
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe('Locale-specific formatting', () => {
    test('should respect locale settings', () => {
      // 这里可以测试不同地区的格式化
      // 如果formatters支持locale参数的话
      const number = 1234567.89;
      
      // 测试中文格式
      expect(formatCurrency(number, 'CNY')).toMatch(/¥.*1.*234.*567/);
      
      // 测试美元格式
      expect(formatCurrency(number, 'USD')).toMatch(/\$.*1.*234.*567/);
    });
  });
});