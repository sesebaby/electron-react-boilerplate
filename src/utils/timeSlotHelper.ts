/**
 * 时间段处理工具
 */

import { TimeSlot, TimeSlotConfig, TimeSlotResult } from '../types/consumption';

/**
 * 默认时间段配置
 */
export const DEFAULT_TIME_SLOT_CONFIG: TimeSlotConfig = {
  morning: { start: '06:00', end: '12:00' },
  afternoon: { start: '12:00', end: '18:00' },
  evening: { start: '18:00', end: '06:00' }
};

/**
 * 时间段处理工具类
 */
export class TimeSlotHelper {
  
  /**
   * 根据时间戳判断时间段
   * @param timestamp 时间戳
   * @param config 时间段配置（可选）
   * @returns 时间段结果
   */
  static getTimeSlot(timestamp: Date, config: TimeSlotConfig = DEFAULT_TIME_SLOT_CONFIG): TimeSlotResult {
    const hour = timestamp.getHours();
    const minute = timestamp.getMinutes();
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    // 解析配置中的时间
    const morningStart = this.parseTime(config.morning.start);
    const morningEnd = this.parseTime(config.morning.end);
    const afternoonStart = this.parseTime(config.afternoon.start);
    const afternoonEnd = this.parseTime(config.afternoon.end);
    const eveningStart = this.parseTime(config.evening.start);
    const eveningEnd = this.parseTime(config.evening.end);
    
    const currentMinutes = hour * 60 + minute;
    
    // 判断时间段
    let timeSlot: TimeSlot;
    
    if (currentMinutes >= morningStart && currentMinutes < morningEnd) {
      timeSlot = TimeSlot.MORNING;
    } else if (currentMinutes >= afternoonStart && currentMinutes < afternoonEnd) {
      timeSlot = TimeSlot.AFTERNOON;
    } else {
      // 晚上时间段可能跨越午夜，需要特殊处理
      timeSlot = TimeSlot.EVENING;
    }
    
    return {
      timeSlot,
      hour,
      isValidTime: true
    };
  }
  
  /**
   * 解析时间字符串为分钟数
   * @param timeString 时间字符串 (HH:MM)
   * @returns 分钟数
   */
  private static parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  /**
   * 获取时间段的显示名称
   * @param timeSlot 时间段
   * @returns 显示名称
   */
  static getTimeSlotDisplayName(timeSlot: TimeSlot): string {
    switch (timeSlot) {
      case TimeSlot.MORNING:
        return '早';
      case TimeSlot.AFTERNOON:
        return '中';
      case TimeSlot.EVENING:
        return '晚';
      default:
        return '未知';
    }
  }
  
  /**
   * 获取时间段的详细描述
   * @param timeSlot 时间段
   * @param config 时间段配置
   * @returns 详细描述
   */
  static getTimeSlotDescription(timeSlot: TimeSlot, config: TimeSlotConfig = DEFAULT_TIME_SLOT_CONFIG): string {
    switch (timeSlot) {
      case TimeSlot.MORNING:
        return `早 (${config.morning.start}-${config.morning.end})`;
      case TimeSlot.AFTERNOON:
        return `中 (${config.afternoon.start}-${config.afternoon.end})`;
      case TimeSlot.EVENING:
        return `晚 (${config.evening.start}-${config.evening.end})`;
      default:
        return '未知时间段';
    }
  }
  
  /**
   * 验证时间段配置
   * @param config 时间段配置
   * @returns 验证结果
   */
  static validateTimeSlotConfig(config: TimeSlotConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // 验证时间格式
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(config.morning.start)) {
        errors.push('早上开始时间格式无效');
      }
      if (!timeRegex.test(config.morning.end)) {
        errors.push('早上结束时间格式无效');
      }
      if (!timeRegex.test(config.afternoon.start)) {
        errors.push('下午开始时间格式无效');
      }
      if (!timeRegex.test(config.afternoon.end)) {
        errors.push('下午结束时间格式无效');
      }
      if (!timeRegex.test(config.evening.start)) {
        errors.push('晚上开始时间格式无效');
      }
      if (!timeRegex.test(config.evening.end)) {
        errors.push('晚上结束时间格式无效');
      }
      
      // 验证时间逻辑
      const morningStart = this.parseTime(config.morning.start);
      const morningEnd = this.parseTime(config.morning.end);
      const afternoonStart = this.parseTime(config.afternoon.start);
      const afternoonEnd = this.parseTime(config.afternoon.end);
      const eveningStart = this.parseTime(config.evening.start);
      const eveningEnd = this.parseTime(config.evening.end);
      
      if (morningStart >= morningEnd) {
        errors.push('早上开始时间必须早于结束时间');
      }
      if (afternoonStart >= afternoonEnd) {
        errors.push('下午开始时间必须早于结束时间');
      }
      
      // 检查时间段是否重叠
      if (morningEnd > afternoonStart) {
        errors.push('早上和下午时间段重叠');
      }
      if (afternoonEnd > eveningStart) {
        errors.push('下午和晚上时间段重叠');
      }
      
    } catch (error) {
      errors.push('时间段配置解析失败');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 获取所有时间段
   * @returns 时间段数组
   */
  static getAllTimeSlots(): TimeSlot[] {
    return [TimeSlot.MORNING, TimeSlot.AFTERNOON, TimeSlot.EVENING];
  }
  
  /**
   * 格式化日期为字符串
   * @param date 日期
   * @returns 格式化的日期字符串 (YYYY-MM-DD)
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * 解析日期字符串
   * @param dateString 日期字符串 (YYYY-MM-DD)
   * @returns 日期对象
   */
  static parseDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00.000Z');
  }
  
  /**
   * 获取日期范围内的所有日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 日期字符串数组
   */
  static getDateRange(startDate: Date, endDate: Date): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
  
  /**
   * 检查日期是否在范围内
   * @param date 要检查的日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 是否在范围内
   */
  static isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
    return date >= startDate && date <= endDate;
  }
  
  /**
   * 获取时间段的颜色主题
   * @param timeSlot 时间段
   * @returns 颜色类名
   */
  static getTimeSlotColorTheme(timeSlot: TimeSlot): string {
    switch (timeSlot) {
      case TimeSlot.MORNING:
        return 'text-yellow-300 bg-yellow-500/20'; // 早晨 - 黄色
      case TimeSlot.AFTERNOON:
        return 'text-blue-300 bg-blue-500/20';     // 下午 - 蓝色
      case TimeSlot.EVENING:
        return 'text-purple-300 bg-purple-500/20'; // 晚上 - 紫色
      default:
        return 'text-gray-300 bg-gray-500/20';
    }
  }
  
  /**
   * 获取当前时间段
   * @param config 时间段配置
   * @returns 当前时间段
   */
  static getCurrentTimeSlot(config: TimeSlotConfig = DEFAULT_TIME_SLOT_CONFIG): TimeSlotResult {
    return this.getTimeSlot(new Date(), config);
  }
  
  /**
   * 计算两个日期之间的天数
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 天数
   */
  static getDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

/**
 * 导出默认实例
 */
export default TimeSlotHelper;
