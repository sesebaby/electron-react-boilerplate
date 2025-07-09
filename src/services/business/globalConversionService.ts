import { v4 as uuidv4 } from 'uuid';
import { GlobalConversionRule, UnitType } from '../../types/entities';

export class GlobalConversionService {
  private rules = new Map<string, GlobalConversionRule>();

  async initialize(): Promise<void> {
    console.log('GlobalConversionService initialized');
    // 不创建默认规则，所有规则由用户手动设置
  }

  // =============== 基础CRUD操作 ===============

  async create(data: Omit<GlobalConversionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<GlobalConversionRule> {
    // 验证数据
    if (!data.name?.trim()) {
      throw new Error('规则名称不能为空');
    }
    if (!data.fromUnitId || !data.toUnitId) {
      throw new Error('源单位和目标单位不能为空');
    }
    if (data.conversionRate <= 0) {
      throw new Error('换算比率必须大于0');
    }
    if (data.fromUnitId === data.toUnitId) {
      throw new Error('源单位和目标单位不能相同');
    }

    // 检查是否已存在相同的换算规则
    const _existingRule = Array.from(this.rules.values()).find(
      rule => rule.fromUnitId === data.fromUnitId && 
              rule.toUnitId === data.toUnitId && 
              rule.isActive
    );
    if (existingRule) {
      throw new Error(`已存在从 ${data.fromUnitId} 到 ${data.toUnitId} 的换算规则`);
    }

    const rule: GlobalConversionRule = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  async findById(id: string): Promise<GlobalConversionRule | null> {
    return this.rules.get(id) || null;
  }

  async findAll(activeOnly: boolean = true): Promise<GlobalConversionRule[]> {
    const _allRules = Array.from(this.rules.values());
    return activeOnly ? allRules.filter(rule => rule.isActive) : allRules;
  }

  async findByCategory(category: UnitType, activeOnly: boolean = true): Promise<GlobalConversionRule[]> {
    const _allRules = await this.findAll(activeOnly);
    return allRules.filter(rule => rule.category === category);
  }

  async findByUnits(fromUnitId: string, toUnitId: string): Promise<GlobalConversionRule | null> {
    return Array.from(this.rules.values()).find(
      rule => rule.fromUnitId === fromUnitId && 
              rule.toUnitId === toUnitId && 
              rule.isActive
    ) || null;
  }

  async update(id: string, data: Partial<Omit<GlobalConversionRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<GlobalConversionRule> {
    const _existingRule = this.rules.get(id);
    if (!existingRule) {
      throw new Error('换算规则不存在');
    }

    // 如果修改单位，检查是否会产生冲突
    if (data.fromUnitId || data.toUnitId) {
      const _fromUnit = data.fromUnitId || existingRule.fromUnitId;
      const _toUnit = data.toUnitId || existingRule.toUnitId;
      
      if (fromUnit === toUnit) {
        throw new Error('源单位和目标单位不能相同');
      }

      const _conflictRule = Array.from(this.rules.values()).find(
        rule => rule.id !== id && 
                rule.fromUnitId === fromUnit && 
                rule.toUnitId === toUnit && 
                rule.isActive
      );
      if (conflictRule) {
        throw new Error(`已存在从 ${fromUnit} 到 ${toUnit} 的换算规则`);
      }
    }

    const updatedRule: GlobalConversionRule = {
      ...existingRule,
      ...data,
      updatedAt: new Date()
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async delete(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }

  async toggleActive(id: string): Promise<GlobalConversionRule> {
    const _rule = this.rules.get(id);
    if (!rule) {
      throw new Error('换算规则不存在');
    }

    return this.update(id, { isActive: !rule.isActive });
  }

  // =============== 换算计算 ===============

  async convert(value: number, fromUnitId: string, toUnitId: string): Promise<number | null> {
    if (fromUnitId === toUnitId) {
      return value;
    }

    const _rule = await this.findByUnits(fromUnitId, toUnitId);
    if (!rule) {
      return null; // 没有找到换算规则
    }

    return value * rule.conversionRate;
  }

  async getConversionDescription(fromUnitId: string, toUnitId: string): Promise<string | null> {
    const _rule = await this.findByUnits(fromUnitId, toUnitId);
    return rule ? rule.description : null;
  }

  // =============== 统计信息 ===============

  async getStats(): Promise<{
    total: number;
    active: number;
    byCategory: Record<UnitType, number>;
  }> {
    const _allRules = Array.from(this.rules.values());
    const _activeRules = allRules.filter(rule => rule.isActive);

    const byCategory: Record<UnitType, number> = {
      [UnitType.WEIGHT]: 0,
      [UnitType.LENGTH]: 0,
      [UnitType.VOLUME]: 0,
      [UnitType.QUANTITY]: 0,
      [UnitType.AREA]: 0,
      [UnitType.TIME]: 0
    };

    activeRules.forEach(rule => {
      byCategory[rule.category]++;
    });

    return {
      total: allRules.length,
      active: activeRules.length,
      byCategory
    };
  }

  // =============== 搜索和筛选 ===============

  async search(searchTerm: string): Promise<GlobalConversionRule[]> {
    const _term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.rules.values()).filter(rule =>
      rule.isActive && (
        rule.name.toLowerCase().includes(term) ||
        rule.description.toLowerCase().includes(term)
      )
    );
  }

  // =============== 批量操作 ===============

  async bulkToggleActive(ids: string[]): Promise<void> {
    const _updates = ids.map(id => this.toggleActive(id));
    await Promise.all(updates);
  }

  async bulkDelete(ids: string[]): Promise<void> {
    ids.forEach(id => this.rules.delete(id));
  }
}

// 创建并导出服务实例
const _globalConversionService = new GlobalConversionService();
export default globalConversionService;