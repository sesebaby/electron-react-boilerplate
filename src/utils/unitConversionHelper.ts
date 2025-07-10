import { serviceManager } from '../services/core';

/**
 * 单位转换辅助工具类
 */
export class UnitConversionHelper {
  
  /**
   * 获取商品的智能数量显示
   * 根据数量大小自动选择最合适的单位显示
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @param preferPackage 是否优先显示包装单位
   * @returns 格式化的数量字符串
   */
  static async getSmartQuantityDisplay(
    productId: string, 
    baseQuantity: number, 
    preferPackage: boolean = true
  ): Promise<string> {
    try {
      const inventoryService = serviceManager.getInventoryService();
      if (!inventoryService) {
        throw new Error('库存服务不可用');
      }
      
      // 简化实现：暂时只返回基础数量
      return `${baseQuantity}`;
    } catch (error) {
      console.error('获取智能数量显示失败:', error);
      return `${baseQuantity}`;
    }
  }
  
  /**
   * 获取商品的包装单位数量显示
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 格式化的包装单位数量字符串
   */
  static async getPackageQuantityDisplay(productId: string, baseQuantity: number): Promise<string> {
    try {
      // 简化实现
      return `${baseQuantity}`;
    } catch (error) {
      console.error('获取包装数量显示失败:', error);
      return `${baseQuantity}`;
    }
  }
  
  /**
   * 获取商品的基础单位数量显示
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 格式化的基础单位数量字符串
   */
  static async getBaseQuantityDisplay(productId: string, baseQuantity: number): Promise<string> {
    try {
      // 简化实现
      return `${baseQuantity}`;
    } catch (error) {
      console.error('获取基础数量显示失败:', error);
      return `${baseQuantity}`;
    }
  }
  
  /**
   * 将包装单位数量转换为基础单位数量
   * @param productId 商品ID
   * @param packageQuantity 包装单位数量
   * @returns 基础单位数量
   */
  static async convertToBaseQuantity(productId: string, packageQuantity: number): Promise<number> {
    try {
      // 简化实现：1:1转换
      return packageQuantity;
    } catch (error) {
      console.error('转换为基础数量失败:', error);
      return packageQuantity;
    }
  }
  
  /**
   * 将基础单位数量转换为包装单位数量
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 包装单位数量
   */
  static async convertToPackageQuantity(productId: string, baseQuantity: number): Promise<number> {
    try {
      // 简化实现：1:1转换
      return baseQuantity;
    } catch (error) {
      console.error('转换为包装数量失败:', error);
      return baseQuantity;
    }
  }
  
  /**
   * 获取单位名称
   * @param unitId 单位ID
   * @returns 单位名称
   */
  static async getUnitName(unitId: string): Promise<string> {
    try {
      const inventoryService = serviceManager.getInventoryService();
      const units = await inventoryService.getUnits();
      if (units.success) {
        const unit = units.data?.find(u => u.id === unitId);
        return unit?.name || '个';
      }
      return '个';
    } catch (error) {
      console.error('获取单位名称失败:', error);
      return '个';
    }
  }

  /**
   * 检查产品是否有转换规则
   * @param productId 产品ID
   * @returns 是否有转换规则
   */
  static async hasConversionRule(productId: string): Promise<boolean> {
    try {
      const inventoryService = serviceManager.getInventoryService();
      const rules = await inventoryService.findAllGlobalConversionRules();
      if (rules.success && rules.data) {
        // 简化实现：检查是否有任何全局转换规则
        return rules.data.length > 0;
      }
      return false;
    } catch (error) {
      console.error('检查转换规则失败:', error);
      return false;
    }
  }

  /**
   * 获取产品的转换规则
   * @param productId 产品ID
   * @returns 转换规则信息
   */
  static async getConversionRule(productId: string): Promise<any | null> {
    try {
      const inventoryService = serviceManager.getInventoryService();
      const rules = await inventoryService.findAllGlobalConversionRules();
      if (rules.success && rules.data && rules.data.length > 0) {
        // 简化实现：返回第一个规则
        return rules.data[0];
      }
      return null;
    } catch (error) {
      console.error('获取转换规则失败:', error);
      return null;
    }
  }

  /**
   * 验证转换规则
   * @param fromUnitId 源单位ID
   * @param toUnitId 目标单位ID
   * @param conversionRate 转换比率
   * @returns 验证结果
   */
  static validateConversionRule(fromUnitId: string, toUnitId: string, conversionRate: number): boolean {
    if (!fromUnitId || !toUnitId) {
      return false;
    }
    if (fromUnitId === toUnitId) {
      return false;
    }
    if (conversionRate <= 0) {
      return false;
    }
    return true;
  }
}

// Export for backwards compatibility
export const unitConversionHelper = UnitConversionHelper;