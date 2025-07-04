import { Unit } from '../../types/entities';
import { UnitSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export class UnitService {
  private units: Map<string, Unit> = new Map();
  private symbolIndex: Map<string, string> = new Map(); // Symbol -> ID mapping
  private nameIndex: Map<string, string> = new Map(); // Name -> ID mapping

  async initialize(): Promise<void> {
    console.log('Unit service initialized');
    
    // 创建默认计量单位
    if (this.units.size === 0) {
      await this.createDefaultUnits();
    }
  }

  private async createDefaultUnits(): Promise<void> {
    const defaultUnits = [
      { name: '个', symbol: 'pcs', precision: 0 },
      { name: '千克', symbol: 'kg', precision: 2 },
      { name: '克', symbol: 'g', precision: 2 },
      { name: '升', symbol: 'L', precision: 2 },
      { name: '毫升', symbol: 'ml', precision: 0 },
      { name: '米', symbol: 'm', precision: 2 },
      { name: '厘米', symbol: 'cm', precision: 1 },
      { name: '平方米', symbol: 'm²', precision: 2 },
      { name: '立方米', symbol: 'm³', precision: 2 },
      { name: '箱', symbol: 'box', precision: 0 },
      { name: '包', symbol: 'pack', precision: 0 },
      { name: '袋', symbol: 'bag', precision: 0 },
      { name: '瓶', symbol: 'bottle', precision: 0 },
      { name: '套', symbol: 'set', precision: 0 },
      { name: '组', symbol: 'group', precision: 0 }
    ];

    for (const unitData of defaultUnits) {
      try {
        await this.create(unitData);
      } catch (error) {
        console.warn('Failed to create default unit:', error);
      }
    }
  }

  async findAll(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }

  async findById(id: string): Promise<Unit | null> {
    return this.units.get(id) || null;
  }

  async findBySymbol(symbol: string): Promise<Unit | null> {
    const id = this.symbolIndex.get(symbol);
    return id ? this.units.get(id) || null : null;
  }

  async findByName(name: string): Promise<Unit | null> {
    const id = this.nameIndex.get(name);
    return id ? this.units.get(id) || null : null;
  }

  async search(searchTerm: string): Promise<Unit[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.units.values()).filter(unit =>
      unit.name.toLowerCase().includes(term) ||
      unit.symbol.toLowerCase().includes(term)
    );
  }

  async create(data: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> {
    // 检查名称和符号的唯一性
    if (this.nameIndex.has(data.name)) {
      throw new Error(`单位名称已存在: ${data.name}`);
    }

    if (this.symbolIndex.has(data.symbol)) {
      throw new Error(`单位符号已存在: ${data.symbol}`);
    }

    const unit: Unit = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(UnitSchema, unit);
    if (!validation.success) {
      throw new Error(`单位数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.units.set(unit.id, unit);
    this.nameIndex.set(unit.name, unit.id);
    this.symbolIndex.set(unit.symbol, unit.id);

    return unit;
  }

  async update(id: string, data: Partial<Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Unit> {
    const existingUnit = this.units.get(id);
    if (!existingUnit) {
      throw new Error(`单位不存在: ${id}`);
    }

    // 检查名称唯一性（如果更新了名称）
    if (data.name && data.name !== existingUnit.name) {
      if (this.nameIndex.has(data.name)) {
        throw new Error(`单位名称已存在: ${data.name}`);
      }
    }

    // 检查符号唯一性（如果更新了符号）
    if (data.symbol && data.symbol !== existingUnit.symbol) {
      if (this.symbolIndex.has(data.symbol)) {
        throw new Error(`单位符号已存在: ${data.symbol}`);
      }
    }

    const updatedUnit: Unit = {
      ...existingUnit,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(UnitSchema, updatedUnit);
    if (!validation.success) {
      throw new Error(`单位数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新索引
    if (data.name && data.name !== existingUnit.name) {
      this.nameIndex.delete(existingUnit.name);
      this.nameIndex.set(data.name, id);
    }

    if (data.symbol && data.symbol !== existingUnit.symbol) {
      this.symbolIndex.delete(existingUnit.symbol);
      this.symbolIndex.set(data.symbol, id);
    }

    this.units.set(id, updatedUnit);
    return updatedUnit;
  }

  async delete(id: string): Promise<boolean> {
    const unit = this.units.get(id);
    if (!unit) {
      return false;
    }

    // 检查是否有关联的产品
    // TODO: 实现产品关联检查
    // 这里需要与ProductService配合检查

    this.units.delete(id);
    this.nameIndex.delete(unit.name);
    this.symbolIndex.delete(unit.symbol);
    return true;
  }

  async validateName(name: string, excludeId?: string): Promise<boolean> {
    const existingId = this.nameIndex.get(name);
    return !existingId || existingId === excludeId;
  }

  async validateSymbol(symbol: string, excludeId?: string): Promise<boolean> {
    const existingId = this.symbolIndex.get(symbol);
    return !existingId || existingId === excludeId;
  }

  async getCommonUnits(): Promise<Unit[]> {
    // 返回常用的计量单位
    const commonSymbols = ['pcs', 'kg', 'g', 'L', 'ml', 'm', 'cm', 'box', 'pack'];
    const commonUnits: Unit[] = [];

    for (const symbol of commonSymbols) {
      const unit = await this.findBySymbol(symbol);
      if (unit) {
        commonUnits.push(unit);
      }
    }

    return commonUnits;
  }

  async getUnitsByPrecision(precision: number): Promise<Unit[]> {
    return Array.from(this.units.values()).filter(
      unit => unit.precision === precision
    );
  }

  async bulkCreate(units: Array<Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    created: Unit[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const created: Unit[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < units.length; i++) {
      try {
        const unit = await this.create(units[i]);
        created.push(unit);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { created, errors };
  }

  async getUnitStats(): Promise<{
    total: number;
    byPrecision: Record<number, number>;
    commonUnits: number;
  }> {
    const units = await this.findAll();
    const byPrecision: Record<number, number> = {};

    units.forEach(unit => {
      byPrecision[unit.precision] = (byPrecision[unit.precision] || 0) + 1;
    });

    const commonUnits = await this.getCommonUnits();

    return {
      total: units.length,
      byPrecision,
      commonUnits: commonUnits.length
    };
  }

  async formatQuantity(quantity: number, unitId: string): Promise<string> {
    const unit = await this.findById(unitId);
    if (!unit) {
      return quantity.toString();
    }

    const formattedQuantity = quantity.toFixed(unit.precision);
    return `${formattedQuantity} ${unit.symbol}`;
  }

  async parseQuantity(quantityString: string): Promise<{ quantity: number; unitId?: string } | null> {
    const match = quantityString.trim().match(/^([\d.]+)\s*(.*)$/);
    if (!match) return null;

    const quantity = parseFloat(match[1]);
    if (isNaN(quantity)) return null;

    const symbolOrName = match[2].trim();
    if (!symbolOrName) {
      return { quantity };
    }

    // 先尝试按符号查找，再按名称查找
    let unit = await this.findBySymbol(symbolOrName);
    if (!unit) {
      unit = await this.findByName(symbolOrName);
    }

    return {
      quantity,
      unitId: unit?.id
    };
  }
}

export default new UnitService();