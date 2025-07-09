import { v4 as uuidv4 } from 'uuid';
import { UnitConversion } from '../../types/entities';
import { UnitConversionSchema } from '../../schemas/validation';

export class UnitConversionService {
  private conversions = new Map<string, UnitConversion>();
  private productConversions = new Map<string, string>(); // productId -> conversionId

  constructor() {
    this.initializeTestData();
  }

  // =============== 基础CRUD操作 ===============

  async create(data: Omit<UnitConversion, 'id' | 'createdAt' | 'updatedAt'>): Promise<UnitConversion> {
    const conversion: UnitConversion = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 简单验证数据
    if (!conversion.productId || !conversion.baseUnitId || !conversion.packageUnitId || conversion.conversionRate <= 0) {
      throw new Error('单位转换规则数据验证失败: 必填字段不能为空，转换比率必须大于0');
    }

    // 检查是否已存在该商品的转换规则
    if (this.productConversions.has(data.productId)) {
      throw new Error(`商品 ${data.productId} 已存在转换规则`);
    }

    this.conversions.set(conversion.id, conversion);
    this.productConversions.set(data.productId, conversion.id);

    return conversion;
  }

  async findById(id: string): Promise<UnitConversion | null> {
    return this.conversions.get(id) || null;
  }

  async findByProductId(productId: string): Promise<UnitConversion | null> {
    const _conversionId = this.productConversions.get(productId);
    if (!_conversionId) return null;
    return this.conversions.get(_conversionId) || null;
  }

  async findAll(): Promise<UnitConversion[]> {
    return Array.from(this.conversions.values()).filter(c => c.isActive);
  }

  async update(id: string, data: Partial<Omit<UnitConversion, 'id' | 'createdAt' | 'updatedAt'>>): Promise<UnitConversion> {
    const _existing = this.conversions.get(id);
    if (!_existing) {
      throw new Error(`单位转换规则不存在: ${id}`);
    }

    const updated: UnitConversion = {
      ..._existing,
      ...data,
      updatedAt: new Date()
    };

    // 简单验证数据
    if (updated.conversionRate !== undefined && updated.conversionRate <= 0) {
      throw new Error('单位转换规则数据验证失败: 转换比率必须大于0');
    }

    this.conversions.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const _existing = this.conversions.get(id);
    if (!_existing) {
      throw new Error(`单位转换规则不存在: ${id}`);
    }

    this.conversions.delete(id);
    this.productConversions.delete(_existing.productId);
  }

  // =============== 转换计算方法 ===============

  /**
   * 将基础单位转换为包装单位
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 包装单位数量（可能有小数）
   */
  async convertToPackageUnit(productId: string, baseQuantity: number): Promise<number | null> {
    const _conversion = await this.findByProductId(productId);
    if (!_conversion || !_conversion.isActive) return null;

    return baseQuantity / _conversion.conversionRate;
  }

  /**
   * 将包装单位转换为基础单位
   * @param productId 商品ID
   * @param packageQuantity 包装单位数量
   * @returns 基础单位数量
   */
  async convertToBaseUnit(productId: string, packageQuantity: number): Promise<number | null> {
    const _conversion = await this.findByProductId(productId);
    if (!_conversion || !_conversion.isActive) return null;

    return packageQuantity * _conversion.conversionRate;
  }

  /**
   * 获取格式化的数量显示（包含包装单位和余数）
   * @param productId 商品ID
   * @param baseQuantity 基础单位数量
   * @returns 格式化的显示字符串，如 "10箱5个"
   */
  async getFormattedQuantity(productId: string, baseQuantity: number): Promise<{
    packageQuantity: number;
    remainderQuantity: number;
    packageUnitName: string;
    baseUnitName: string;
    formatted: string;
  } | null> {
    const _conversion = await this.findByProductId(productId);
    if (!_conversion || !_conversion.isActive) return null;

    const _packageQuantity = Math.floor(baseQuantity / _conversion.conversionRate);
    const _remainderQuantity = baseQuantity % _conversion.conversionRate;

    // 这里简化处理，实际应该从 unitService 获取单位名称
    const _packageUnitName = await this.getUnitName(_conversion.packageUnitId);
    const _baseUnitName = await this.getUnitName(_conversion.baseUnitId);

    let _formatted = '';
    if (_packageQuantity > 0) {
      _formatted += `${_packageQuantity}${_packageUnitName}`;
    }
    if (_remainderQuantity > 0) {
      if (_formatted) _formatted += '';
      _formatted += `${_remainderQuantity}${_baseUnitName}`;
    }
    if (!_formatted) {
      _formatted = `0${_baseUnitName}`;
    }

    return {
      packageQuantity: _packageQuantity,
      remainderQuantity: _remainderQuantity,
      packageUnitName: _packageUnitName,
      baseUnitName: _baseUnitName,
      formatted: _formatted
    };
  }

  // =============== 辅助方法 ===============

  private async getUnitName(unitId: string): Promise<string> {
    // 简化实现，实际应该从 unitService 获取
    const unitNames: Record<string, string> = {
      'unit-001': '个',
      'unit-002': '台',
      'unit-003': '双',
      'unit-004': '包',
      'unit-005': '箱',
      'unit-006': '件'
    };
    return unitNames[unitId] || '个';
  }

  // =============== 测试数据初始化 ===============

  private initializeTestData(): void {
    const testConversions = [
      {
        productId: 'product-001', // iPhone 15 Pro
        baseUnitId: 'unit-002',   // 台
        packageUnitId: 'unit-005', // 箱
        conversionRate: 10,       // 1箱 = 10台
        isActive: true,
        description: 'iPhone 15 Pro 包装规格：1箱装10台'
      },
      {
        productId: 'product-002', // 小米13 Ultra
        baseUnitId: 'unit-002',   // 台
        packageUnitId: 'unit-005', // 箱
        conversionRate: 8,        // 1箱 = 8台
        isActive: true,
        description: '小米13 Ultra 包装规格：1箱装8台'
      },
      {
        productId: 'product-003', // 薯片
        baseUnitId: 'unit-001',   // 个
        packageUnitId: 'unit-004', // 包
        conversionRate: 12,       // 1包 = 12个
        isActive: true,
        description: '薯片包装规格：1包装12个'
      },
      {
        productId: 'product-004', // 运动鞋
        baseUnitId: 'unit-003',   // 双
        packageUnitId: 'unit-006', // 件
        conversionRate: 1,        // 1件 = 1双
        isActive: true,
        description: '运动鞋包装规格：1件装1双'
      }
    ];

    testConversions.forEach(data => {
      const conversion: UnitConversion = {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.conversions.set(conversion.id, conversion);
      this.productConversions.set(data.productId, conversion.id);
    });
  }
}

export const _unitConversionService = new UnitConversionService();
// Named export without underscore for compatibility
export const unitConversionService = _unitConversionService;
