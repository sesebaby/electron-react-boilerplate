import { v4 as uuidv4 } from 'uuid';
import { ProductConversionSetting } from '../../types/entities';
import globalConversionService from './globalConversionService';

export class ProductConversionService {
  private settings = new Map<string, ProductConversionSetting>();
  private productIndex = new Map<string, string>(); // productId -> settingId

  async initialize(): Promise<void> {
    console.log('ProductConversionService initialized');
  }

  // =============== 基础CRUD操作 ===============

  async create(data: Omit<ProductConversionSetting, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductConversionSetting> {
    // 验证数据
    if (!data.productId) {
      throw new Error('商品ID不能为空');
    }

    // 检查商品是否已有换算设置
    if (this.productIndex.has(data.productId)) {
      throw new Error('该商品已存在换算设置');
    }

    // 如果启用换算，验证换算规则
    if (data.enableConversion) {
      if (data.conversionType === 'global' && !data.globalRuleId) {
        throw new Error('使用全局换算时必须选择全局规则');
      }
      if (data.conversionType === 'custom' && !data.customRule) {
        throw new Error('使用自定义换算时必须设置自定义规则');
      }
      if (data.conversionType === 'custom' && data.customRule) {
        if (data.customRule.conversionRate <= 0) {
          throw new Error('换算比率必须大于0');
        }
        if (data.customRule.fromUnitId === data.customRule.toUnitId) {
          throw new Error('源单位和目标单位不能相同');
        }
      }
    }

    const setting: ProductConversionSetting = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.settings.set(setting.id, setting);
    this.productIndex.set(data.productId, setting.id);
    return setting;
  }

  async findById(id: string): Promise<ProductConversionSetting | null> {
    return this.settings.get(id) || null;
  }

  async findByProductId(productId: string): Promise<ProductConversionSetting | null> {
    const _settingId = this.productIndex.get(productId);
    if (!settingId) return null;
    return this.settings.get(settingId) || null;
  }

  async findAll(activeOnly: boolean = true): Promise<ProductConversionSetting[]> {
    const _allSettings = Array.from(this.settings.values());
    return activeOnly ? allSettings.filter(setting => setting.isActive) : allSettings;
  }

  async update(id: string, data: Partial<Omit<ProductConversionSetting, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProductConversionSetting> {
    const _existingSetting = this.settings.get(id);
    if (!existingSetting) {
      throw new Error('换算设置不存在');
    }

    // 验证更新数据
    if (data.enableConversion !== undefined && data.enableConversion) {
      const _conversionType = data.conversionType || existingSetting.conversionType;
      const _globalRuleId = data.globalRuleId || existingSetting.globalRuleId;
      const _customRule = data.customRule || existingSetting.customRule;

      if (conversionType === 'global' && !globalRuleId) {
        throw new Error('使用全局换算时必须选择全局规则');
      }
      if (conversionType === 'custom' && !customRule) {
        throw new Error('使用自定义换算时必须设置自定义规则');
      }
      if (conversionType === 'custom' && customRule) {
        if (customRule.conversionRate <= 0) {
          throw new Error('换算比率必须大于0');
        }
        if (customRule.fromUnitId === customRule.toUnitId) {
          throw new Error('源单位和目标单位不能相同');
        }
      }
    }

    const updatedSetting: ProductConversionSetting = {
      ...existingSetting,
      ...data,
      updatedAt: new Date()
    };

    this.settings.set(id, updatedSetting);
    return updatedSetting;
  }

  async updateByProductId(productId: string, data: Partial<Omit<ProductConversionSetting, 'id' | 'productId' | 'createdAt' | 'updatedAt'>>): Promise<ProductConversionSetting> {
    const _setting = await this.findByProductId(productId);
    if (!setting) {
      throw new Error('商品换算设置不存在');
    }
    return this.update(setting.id, data);
  }

  async delete(id: string): Promise<boolean> {
    const _setting = this.settings.get(id);
    if (!setting) return false;

    this.productIndex.delete(setting.productId);
    return this.settings.delete(id);
  }

  async deleteByProductId(productId: string): Promise<boolean> {
    const _settingId = this.productIndex.get(productId);
    if (!settingId) return false;
    return this.delete(settingId);
  }

  // =============== 换算操作 ===============

  async convertProductQuantity(
    productId: string, 
    quantity: number, 
    fromUnitId: string, 
    toUnitId: string
  ): Promise<{
    convertedQuantity: number | null;
    conversionRule: string | null;
  }> {
    if (fromUnitId === toUnitId) {
      return {
        convertedQuantity: quantity,
        conversionRule: '相同单位，无需换算'
      };
    }

    const _setting = await this.findByProductId(productId);
    if (!setting || !setting.enableConversion || !setting.isActive) {
      return {
        convertedQuantity: null,
        conversionRule: null
      };
    }

    let convertedQuantity: number | null = null;
    let conversionRule: string | null = null;

    if (setting.conversionType === 'global' && setting.globalRuleId) {
      // 使用全局换算规则
      const _globalRule = await globalConversionService.findById(setting.globalRuleId);
      if (globalRule && globalRule.fromUnitId === fromUnitId && globalRule.toUnitId === toUnitId) {
        convertedQuantity = quantity * globalRule.conversionRate;
        conversionRule = globalRule.description;
      }
    } else if (setting.conversionType === 'custom' && setting.customRule) {
      // 使用自定义换算规则
      const { customRule } = setting;
      if (customRule.fromUnitId === fromUnitId && customRule.toUnitId === toUnitId) {
        convertedQuantity = quantity * customRule.conversionRate;
        conversionRule = customRule.description;
      }
    }

    return {
      convertedQuantity,
      conversionRule
    };
  }

  async getProductConversionInfo(productId: string): Promise<{
    hasConversion: boolean;
    conversionType?: 'global' | 'custom';
    conversionRule?: string;
    fromUnit?: string;
    toUnit?: string;
  }> {
    const _setting = await this.findByProductId(productId);
    if (!setting || !setting.enableConversion || !setting.isActive) {
      return { hasConversion: false };
    }

    const _conversionRule = '';
    const _fromUnit = '';
    const _toUnit = '';

    if (setting.conversionType === 'global' && setting.globalRuleId) {
      const _globalRule = await globalConversionService.findById(setting.globalRuleId);
      if (globalRule) {
        conversionRule = globalRule.description;
        fromUnit = globalRule.fromUnitId;
        toUnit = globalRule.toUnitId;
      }
    } else if (setting.conversionType === 'custom' && setting.customRule) {
      const { customRule } = setting;
      conversionRule = customRule.description;
      fromUnit = customRule.fromUnitId;
      toUnit = customRule.toUnitId;
    }

    return {
      hasConversion: true,
      conversionType: setting.conversionType,
      conversionRule,
      fromUnit,
      toUnit
    };
  }

  // =============== 统计信息 ===============

  async getStats(): Promise<{
    total: number;
    enabled: number;
    globalType: number;
    customType: number;
  }> {
    const _allSettings = Array.from(this.settings.values());
    const _activeSettings = allSettings.filter(setting => setting.isActive);
    const _enabledSettings = activeSettings.filter(setting => setting.enableConversion);

    return {
      total: allSettings.length,
      enabled: enabledSettings.length,
      globalType: enabledSettings.filter(s => s.conversionType === 'global').length,
      customType: enabledSettings.filter(s => s.conversionType === 'custom').length
    };
  }

  // =============== 批量操作 ===============

  async bulkUpdateProductSettings(updates: Array<{
    productId: string;
    data: Partial<Omit<ProductConversionSetting, 'id' | 'productId' | 'createdAt' | 'updatedAt'>>;
  }>): Promise<void> {
    const _updatePromises = updates.map(({ productId, data }) => 
      this.updateByProductId(productId, data)
    );
    await Promise.all(updatePromises);
  }

  // =============== 验证操作 ===============

  async validateGlobalRule(globalRuleId: string): Promise<boolean> {
    const _rule = await globalConversionService.findById(globalRuleId);
    return !!(rule && rule.isActive);
  }
}

// 创建并导出服务实例
const _productConversionService = new ProductConversionService();
export default productConversionService;