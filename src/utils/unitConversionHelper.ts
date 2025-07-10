import { unitConversionService } from '../services/business';

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
      const conversion = await unitConversionService.findByProductId(productId);
      
      if (!conversion || !('isActive' in conversion) || !conversion.isActive) {
        // 没有转换规则，直接显示基础单位
        const baseUnitName = await this.getUnitName(conversion && 'baseUnitId' in conversion ? conversion.baseUnitId : 'unit-001');
        return `${baseQuantity}${baseUnitName}`;
      }

      const formatted = await unitConversionService.getFormattedQuantity(productId, baseQuantity);
      if (!formatted) {
        const baseUnitName = await this.getUnitName(conversion.baseUnitId);
        return `${baseQuantity}${baseUnitName}`;
      }

      // 根据偏好和数量大小决定显示方式
      if (preferPackage && formatted.packageQuantity > 0) {
        return formatted.formatted;
      } else if (baseQuantity < conversion.conversionRate) {
        // 数量小于一个包装单位时，显示基础单位
        return `${baseQuantity}${formatted.baseUnitName}`;
      } else {
        return formatted.formatted;
      }
    } catch (error) {
      console.error('获取智能数量显示失败:', error);
      return `${baseQuantity}个`;
    }
  }

  /**
   * 获取双单位显示（同时显示包装单位和基础单位）
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 包含两种单位的显示对象
   */
  static async getDualUnitDisplay(productId: string, baseQuantity: number): Promise<{
    baseDisplay: string;
    packageDisplay: string | null;
    hasConversion: boolean;
  }> {
    try {
      const conversion = await unitConversionService.findByProductId(productId);
      
      if (!conversion || !('isActive' in conversion) || !conversion.isActive) {
        const baseUnitName = await this.getUnitName(conversion && 'baseUnitId' in conversion ? conversion.baseUnitId : 'unit-001');
        return {
          baseDisplay: `${baseQuantity}${baseUnitName}`,
          packageDisplay: null,
          hasConversion: false
        };
      }

      const baseUnitName = await this.getUnitName(conversion.baseUnitId);
      const packageUnitName = await this.getUnitName(conversion.packageUnitId);
      
      const packageQuantityResult = await unitConversionService.convertToPackageUnit(productId, baseQuantity);
      const packageQuantity = packageQuantityResult && typeof packageQuantityResult.quantity === 'number' ? packageQuantityResult.quantity : 0;
      
      return {
        baseDisplay: `${baseQuantity}${baseUnitName}`,
        packageDisplay: packageQuantity > 0 ? `${packageQuantity.toFixed(1)}${packageUnitName}` : null,
        hasConversion: true
      };
    } catch (error) {
      console.error('获取双单位显示失败:', error);
      return {
        baseDisplay: `${baseQuantity}个`,
        packageDisplay: null,
        hasConversion: false
      };
    }
  }

  /**
   * 检查商品是否有单位转换规则
   * @param productId 商品ID
   * @returns 是否有转换规则
   */
  static async hasConversionRule(productId: string): Promise<boolean> {
    try {
      const conversion = await unitConversionService.findByProductId(productId);
      return conversion !== null && ('isActive' in conversion) && conversion.isActive;
    } catch (error) {
      console.error('检查转换规则失败:', error);
      return false;
    }
  }

  /**
   * 获取转换规则信息
   * @param productId 商品ID
   * @returns 转换规则信息
   */
  static async getConversionInfo(productId: string): Promise<{
    hasRule: boolean;
    baseUnitName: string;
    packageUnitName: string;
    conversionRate: number;
    description: string;
  } | null> {
    try {
      const conversion = await unitConversionService.findByProductId(productId);
      
      if (!conversion || !('isActive' in conversion) || !conversion.isActive) {
        return null;
      }

      const baseUnitName = await this.getUnitName((conversion as any).baseUnitId || 'unit-001');
      const packageUnitName = await this.getUnitName((conversion as any).packageUnitId || 'unit-004');
      const conversionRate = (conversion as any).conversionRate || 1;
      const description = (conversion as any).description;

      return {
        hasRule: true,
        baseUnitName,
        packageUnitName,
        conversionRate,
        description: description || `1${packageUnitName} = ${conversionRate}${baseUnitName}`
      };
    } catch (error) {
      console.error('获取转换规则信息失败:', error);
      return null;
    }
  }

  /**
   * 计算建议的显示单位
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 建议的显示单位类型
   */
  static async getSuggestedDisplayUnit(productId: string, baseQuantity: number): Promise<'base' | 'package' | 'mixed'> {
    try {
      const conversion = await unitConversionService.findByProductId(productId);
      
      if (!conversion || !('isActive' in conversion) || !conversion.isActive) {
        return 'base';
      }

      const conversionRate = (conversion as any).conversionRate || 1;
      const packageQuantity = Math.floor(baseQuantity / conversionRate);
      const remainder = baseQuantity % conversionRate;

      if (packageQuantity === 0) {
        return 'base'; // 不足一个包装单位，显示基础单位
      } else if (remainder === 0) {
        return 'package'; // 正好整包装，显示包装单位
      } else {
        return 'mixed'; // 有余数，显示混合单位
      }
    } catch (error) {
      console.error('计算建议显示单位失败:', error);
      return 'base';
    }
  }

  /**
   * 获取单位名称（简化实现）
   * @param unitId 单位ID
   * @returns 单位名称
   */
  private static async getUnitName(unitId: string): Promise<string> {
    // 简化实现，实际应该从 unitService 获取
    const unitNames: Record<string, string> = {
      'unit-001': '个',
      'unit-002': '台',
      'unit-003': '双',
      'unit-004': '包',
      'unit-005': '箱',
      'unit-006': '件',
      'unit-007': '盒',
      'unit-008': '瓶',
      'unit-009': '袋',
      'unit-010': '套'
    };
    return unitNames[unitId] || '个';
  }

  /**
   * 格式化数量显示，支持自定义格式
   * @param packageQuantity 包装单位数量
   * @param remainderQuantity 余数数量
   * @param packageUnitName 包装单位名称
   * @param baseUnitName 基础单位名称
   * @param format 格式类型
   * @returns 格式化的字符串
   */
  static formatQuantity(
    packageQuantity: number,
    remainderQuantity: number,
    packageUnitName: string,
    baseUnitName: string,
    format: 'compact' | 'full' | 'separate' = 'compact'
  ): string {
    switch (format) {
      case 'compact':
        // 紧凑格式：10箱5个
        let result = '';
        if (packageQuantity > 0) result += `${packageQuantity}${packageUnitName}`;
        if (remainderQuantity > 0) result += `${remainderQuantity}${baseUnitName}`;
        return result || `0${baseUnitName}`;
        
      case 'full':
        // 完整格式：10箱 + 5个
        if (packageQuantity > 0 && remainderQuantity > 0) {
          return `${packageQuantity}${packageUnitName} + ${remainderQuantity}${baseUnitName}`;
        } else if (packageQuantity > 0) {
          return `${packageQuantity}${packageUnitName}`;
        } else {
          return `${remainderQuantity}${baseUnitName}`;
        }
        
      case 'separate':
        // 分离格式：返回数组形式的字符串
        const parts = [];
        if (packageQuantity > 0) parts.push(`${packageQuantity}${packageUnitName}`);
        if (remainderQuantity > 0) parts.push(`${remainderQuantity}${baseUnitName}`);
        return parts.join(' ');
        
      default:
        return `${packageQuantity}${packageUnitName}${remainderQuantity}${baseUnitName}`;
    }
  }
}

// 导出便捷的静态方法
export const unitConversionHelper = UnitConversionHelper;
