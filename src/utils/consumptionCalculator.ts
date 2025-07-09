/**
 * 消耗数据计算工具
 */

import { 
  ConsumptionSlotData, 
  TimeSlotData, 
  CategoryRowData, 
  ProductRowData,
  ConsumptionTotals,
  DisplayMode,
  UnitConversionResult
} from '../types/consumption';
import { InventoryTransaction, TransactionType } from '../types/entities';
import { unitConversionService } from '../services/business';

/**
 * 消耗数据计算工具类
 */
export class ConsumptionCalculator {
  
  /**
   * 创建空的消耗数据
   * @returns 空的消耗数据
   */
  static createEmptyConsumptionData(): ConsumptionSlotData {
    return {
      quantity: 0,
      convertedQuantity: 0,
      amount: 0,
      transactionCount: 0,
      avgUnitPrice: 0
    };
  }
  
  /**
   * 创建空的时间段数据
   * @returns 空的时间段数据
   */
  static createEmptyTimeSlotData(): TimeSlotData {
    return {
      morning: this.createEmptyConsumptionData(),
      afternoon: this.createEmptyConsumptionData(),
      evening: this.createEmptyConsumptionData(),
      dailyTotal: this.createEmptyConsumptionData()
    };
  }
  
  /**
   * 从库存事务计算消耗数据
   * @param transactions 库存事务数组
   * @returns 消耗数据
   */
  static calculateConsumptionFromTransactions(transactions: InventoryTransaction[]): ConsumptionSlotData {
    // 只处理出库事务
    const _outTransactions = transactions.filter(t => t.transactionType === TransactionType.OUT);
    
    if (outTransactions.length === 0) {
      return this.createEmptyConsumptionData();
    }
    
    const _totalQuantity = outTransactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
    const _totalAmount = outTransactions.reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);
    const _avgUnitPrice = totalQuantity > 0 ? totalAmount / totalQuantity : 0;
    
    return {
      quantity: totalQuantity,
      convertedQuantity: 0, // 将在后续步骤中计算
      amount: totalAmount,
      transactionCount: outTransactions.length,
      avgUnitPrice
    };
  }
  
  /**
   * 应用单位转换
   * @param productId 产品ID
   * @param consumptionData 消耗数据
   * @returns 应用转换后的消耗数据
   */
  static async applyUnitConversion(
    productId: string, 
    consumptionData: ConsumptionSlotData
  ): Promise<ConsumptionSlotData> {
    try {
      const _convertedQuantity = await unitConversionService.convertToPackageUnit(
        productId, 
        consumptionData.quantity
      );
      
      return {
        ...consumptionData,
        convertedQuantity: convertedQuantity || consumptionData.quantity
      };
    } catch (error) {
      console.warn(`单位转换失败 (产品ID: ${productId}):`, error);
      return {
        ...consumptionData,
        convertedQuantity: consumptionData.quantity
      };
    }
  }
  
  /**
   * 计算时间段总计
   * @param timeSlotData 时间段数据
   * @returns 更新后的时间段数据（包含总计）
   */
  static calculateTimeSlotTotals(timeSlotData: TimeSlotData): TimeSlotData {
    const { morning, afternoon, evening } = timeSlotData;
    
    const dailyTotal: ConsumptionSlotData = {
      quantity: morning.quantity + afternoon.quantity + evening.quantity,
      convertedQuantity: (morning.convertedQuantity || 0) + 
                        (afternoon.convertedQuantity || 0) + 
                        (evening.convertedQuantity || 0),
      amount: morning.amount + afternoon.amount + evening.amount,
      transactionCount: morning.transactionCount + afternoon.transactionCount + evening.transactionCount,
      avgUnitPrice: 0 // 将在下面计算
    };
    
    // 计算平均单价
    if (dailyTotal.quantity > 0) {
      dailyTotal.avgUnitPrice = dailyTotal.amount / dailyTotal.quantity;
    }
    
    return {
      ...timeSlotData,
      dailyTotal
    };
  }
  
  /**
   * 合并多个消耗数据
   * @param dataArray 消耗数据数组
   * @returns 合并后的消耗数据
   */
  static mergeConsumptionData(dataArray: ConsumptionSlotData[]): ConsumptionSlotData {
    if (dataArray.length === 0) {
      return this.createEmptyConsumptionData();
    }
    
    const _merged = dataArray.reduce((acc, data) => ({
      quantity: acc.quantity + data.quantity,
      convertedQuantity: (acc.convertedQuantity || 0) + (data.convertedQuantity || 0),
      amount: acc.amount + data.amount,
      transactionCount: acc.transactionCount + data.transactionCount,
      avgUnitPrice: 0 // 将在后面重新计算
    }), this.createEmptyConsumptionData());
    
    // 重新计算平均单价
    if (merged.quantity > 0) {
      merged.avgUnitPrice = merged.amount / merged.quantity;
    }
    
    return merged;
  }
  
  /**
   * 计算分类行总计
   * @param categoryRow 分类行数据
   * @returns 更新后的分类行数据
   */
  static calculateCategoryRowTotals(categoryRow: CategoryRowData): CategoryRowData {
    const allTimeSlotData: ConsumptionSlotData[] = [];
    
    // 收集所有日期的数据
    categoryRow.data.forEach(timeSlotData => {
      allTimeSlotData.push(timeSlotData.morning);
      allTimeSlotData.push(timeSlotData.afternoon);
      allTimeSlotData.push(timeSlotData.evening);
    });
    
    // 收集子分类的数据
    if (categoryRow.children) {
      categoryRow.children.forEach(child => {
        allTimeSlotData.push(child.rowTotal);
      });
    }
    
    // 收集产品数据
    categoryRow.products.forEach(product => {
      allTimeSlotData.push(product.rowTotal);
    });
    
    const _rowTotal = this.mergeConsumptionData(allTimeSlotData);
    
    return {
      ...categoryRow,
      rowTotal
    };
  }
  
  /**
   * 计算产品行总计
   * @param productRow 产品行数据
   * @returns 更新后的产品行数据
   */
  static calculateProductRowTotals(productRow: ProductRowData): ProductRowData {
    const allTimeSlotData: ConsumptionSlotData[] = [];
    
    // 收集所有日期的数据
    productRow.data.forEach(timeSlotData => {
      allTimeSlotData.push(timeSlotData.morning);
      allTimeSlotData.push(timeSlotData.afternoon);
      allTimeSlotData.push(timeSlotData.evening);
    });
    
    const _rowTotal = this.mergeConsumptionData(allTimeSlotData);
    
    return {
      ...productRow,
      rowTotal
    };
  }
  
  /**
   * 计算总计数据
   * @param categories 分类数据数组
   * @param dateColumns 日期列数组
   * @returns 总计数据
   */
  static calculateTotals(categories: CategoryRowData[], dateColumns: string[]): ConsumptionTotals {
    const _categoryTotals = new Map<string, ConsumptionSlotData>();
    const _dateTotals = new Map<string, ConsumptionSlotData>();
    
    // 计算分类总计
    categories.forEach(category => {
      categoryTotals.set(category.categoryId, category.rowTotal);
    });
    
    // 计算日期总计
    dateColumns.forEach(date => {
      const dateData: ConsumptionSlotData[] = [];
      
      categories.forEach(category => {
        const _timeSlotData = category.data.get(date);
        if (timeSlotData) {
          dateData.push(timeSlotData.dailyTotal);
        }
      });
      
      dateTotals.set(date, this.mergeConsumptionData(dateData));
    });
    
    // 计算时间段总计
    const morningData: ConsumptionSlotData[] = [];
    const afternoonData: ConsumptionSlotData[] = [];
    const eveningData: ConsumptionSlotData[] = [];
    
    categories.forEach(category => {
      category.data.forEach(timeSlotData => {
        morningData.push(timeSlotData.morning);
        afternoonData.push(timeSlotData.afternoon);
        eveningData.push(timeSlotData.evening);
      });
    });
    
    const _timeSlotTotals = {
      morning: this.mergeConsumptionData(morningData),
      afternoon: this.mergeConsumptionData(afternoonData),
      evening: this.mergeConsumptionData(eveningData)
    };
    
    // 计算总计
    const _grandTotal = this.mergeConsumptionData([
      timeSlotTotals.morning,
      timeSlotTotals.afternoon,
      timeSlotTotals.evening
    ]);
    
    return {
      categoryTotals,
      dateTotals,
      timeSlotTotals,
      grandTotal
    };
  }
  
  /**
   * 根据显示模式获取显示值
   * @param data 消耗数据
   * @param displayMode 显示模式
   * @returns 显示值
   */
  static getDisplayValue(data: ConsumptionSlotData, displayMode: DisplayMode): number {
    switch (displayMode) {
      case DisplayMode.QUANTITY:
        return data.quantity;
      case DisplayMode.CONVERTED:
        return data.convertedQuantity || data.quantity;
      case DisplayMode.AMOUNT:
        return data.amount;
      default:
        return data.quantity;
    }
  }
  
  /**
   * 格式化显示值
   * @param value 数值
   * @param displayMode 显示模式
   * @returns 格式化的字符串
   */
  static formatDisplayValue(value: number, displayMode: DisplayMode): string {
    switch (displayMode) {
      case DisplayMode.QUANTITY:
      case DisplayMode.CONVERTED:
        return value.toLocaleString();
      case DisplayMode.AMOUNT:
        return `¥${value.toLocaleString()}`;
      default:
        return value.toString();
    }
  }
  
  /**
   * 获取显示模式的单位
   * @param displayMode 显示模式
   * @param baseUnit 基础单位
   * @param convertedUnit 转换单位
   * @returns 单位字符串
   */
  static getDisplayUnit(displayMode: DisplayMode, baseUnit?: string, convertedUnit?: string): string {
    switch (displayMode) {
      case DisplayMode.QUANTITY:
        return baseUnit || '个';
      case DisplayMode.CONVERTED:
        return convertedUnit || baseUnit || '个';
      case DisplayMode.AMOUNT:
        return '元';
      default:
        return '';
    }
  }
  
  /**
   * 验证消耗数据
   * @param data 消耗数据
   * @returns 验证结果
   */
  static validateConsumptionData(data: ConsumptionSlotData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (data.quantity < 0) {
      errors.push('数量不能为负数');
    }
    
    if (data.amount < 0) {
      errors.push('金额不能为负数');
    }
    
    if (data.transactionCount < 0) {
      errors.push('交易次数不能为负数');
    }
    
    if (data.avgUnitPrice && data.avgUnitPrice < 0) {
      errors.push('平均单价不能为负数');
    }
    
    if (data.convertedQuantity && data.convertedQuantity < 0) {
      errors.push('转换数量不能为负数');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 导出默认实例
 */
export default ConsumptionCalculator;
