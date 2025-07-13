/**
 * 基础数据工厂
 * 负责生成分类、单位、仓库等基础数据
 */

import { BaseDomainFactory, FactoryOptions } from './BaseDomainFactory';
import { Category, Unit, UnitType, Warehouse } from '../../types/entities';

export interface CategoryOptions extends FactoryOptions {
  name?: string;
  description?: string;
  level?: number;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string;
}

export interface UnitOptions extends FactoryOptions {
  name?: string;
  symbol?: string;
  type?: UnitType;
  precision?: number;
  isActive?: boolean;
}

export interface WarehouseOptions extends FactoryOptions {
  code?: string;
  name?: string;
  location?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export class MasterDataFactory extends BaseDomainFactory {
  
  /**
   * 创建分类
   */
  static createCategory(options: CategoryOptions = {}): Category {
    const seq = this.getNextSequence();
    const id = this.generateId('cat');
    
    const defaults: Category = {
      id,
      name: this.generateChineseName('category', seq),
      description: `测试分类描述_${seq}`,
      level: 1,
      sortOrder: seq,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const category = this.mergeOptions(defaults, options);
    
    // 记录依赖关系
    const dependencies: string[] = [];
    if (options.parentId) {
      dependencies.push(options.parentId);
    }
    
    this.recordDependency(id, 'category', category, dependencies);
    this.cacheData('categories', category);
    
    return category;
  }

  /**
   * 创建单位
   */
  static createUnit(options: UnitOptions = {}): Unit {
    const seq = this.getNextSequence();
    const id = this.generateId('unit');
    
    const defaults: Unit = {
      id,
      name: this.generateChineseName('unit', seq),
      symbol: `U${seq}`,
      type: UnitType.QUANTITY,
      precision: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const unit = this.mergeOptions(defaults, options);
    
    this.recordDependency(id, 'unit', unit, []);
    this.cacheData('units', unit);
    
    return unit;
  }

  /**
   * 创建仓库
   */
  static createWarehouse(options: WarehouseOptions = {}): Warehouse {
    const seq = this.getNextSequence();
    const id = this.generateId('wh');
    
    const defaults: Warehouse = {
      id,
      code: `WH${seq.toString().padStart(3, '0')}`,
      name: this.generateChineseName('warehouse', seq),
      location: `测试地址_${seq}`,
      isDefault: seq === 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const warehouse = this.mergeOptions(defaults, options);
    
    this.recordDependency(id, 'warehouse', warehouse, []);
    this.cacheData('warehouses', warehouse);
    
    return warehouse;
  }

  /**
   * 创建标准分类集合
   */
  static createStandardCategories(): Category[] {
    return [
      this.createCategory({ 
        name: '电子产品', 
        description: '电子设备和数码产品',
        sortOrder: 1
      }),
      this.createCategory({ 
        name: '办公用品', 
        description: '办公设备和文具用品',
        sortOrder: 2
      }),
      this.createCategory({ 
        name: '食品饮料', 
        description: '食品和饮料类产品',
        sortOrder: 3
      }),
      this.createCategory({ 
        name: '服装鞋帽', 
        description: '服装和配饰类产品',
        sortOrder: 4
      }),
      this.createCategory({ 
        name: '家居用品', 
        description: '家庭生活用品',
        sortOrder: 5
      })
    ];
  }

  /**
   * 创建标准单位集合
   */
  static createStandardUnits(): Unit[] {
    return [
      this.createUnit({ 
        name: '台', 
        symbol: 'pcs', 
        type: UnitType.QUANTITY,
        precision: 0
      }),
      this.createUnit({ 
        name: '套', 
        symbol: 'set', 
        type: UnitType.QUANTITY,
        precision: 0
      }),
      this.createUnit({ 
        name: '箱', 
        symbol: 'box', 
        type: UnitType.QUANTITY,
        precision: 0
      }),
      this.createUnit({ 
        name: '公斤', 
        symbol: 'kg', 
        type: UnitType.WEIGHT,
        precision: 2
      }),
      this.createUnit({ 
        name: '升', 
        symbol: 'L', 
        type: UnitType.VOLUME,
        precision: 2
      }),
      this.createUnit({ 
        name: '米', 
        symbol: 'm', 
        type: UnitType.LENGTH,
        precision: 2
      })
    ];
  }

  /**
   * 创建标准仓库集合
   */
  static createStandardWarehouses(): Warehouse[] {
    return [
      this.createWarehouse({ 
        code: 'WH001',
        name: '主仓库', 
        location: '北京市朝阳区',
        isDefault: true
      }),
      this.createWarehouse({ 
        code: 'WH002',
        name: '分仓库A', 
        location: '北京市海淀区',
        isDefault: false
      }),
      this.createWarehouse({ 
        code: 'WH003',
        name: '分仓库B', 
        location: '上海市浦东新区',
        isDefault: false
      })
    ];
  }

  /**
   * 创建完整的基础数据集
   */
  static createMasterDataSet(): {
    categories: Category[];
    units: Unit[];
    warehouses: Warehouse[];
  } {
    const categories = this.createStandardCategories();
    const units = this.createStandardUnits();
    const warehouses = this.createStandardWarehouses();

    return {
      categories,
      units,
      warehouses
    };
  }

  /**
   * 获取默认分类
   */
  static getDefaultCategory(): Category {
    const cached = this.getFirstCachedData('categories');
    if (cached) {
      return cached;
    }
    return this.createCategory({ 
      name: '默认分类',
      description: '系统默认分类',
      isDefault: true
    });
  }

  /**
   * 获取默认单位
   */
  static getDefaultUnit(): Unit {
    const cached = this.getFirstCachedData('units');
    if (cached) {
      return cached;
    }
    return this.createUnit({ 
      name: '台',
      symbol: 'pcs',
      type: UnitType.QUANTITY,
      precision: 0
    });
  }

  /**
   * 获取默认仓库
   */
  static getDefaultWarehouse(): Warehouse {
    const cached = this.getFirstCachedData('warehouses');
    if (cached) {
      return cached;
    }
    return this.createWarehouse({ 
      code: 'WH001',
      name: '主仓库',
      location: '默认位置',
      isDefault: true
    });
  }

  /**
   * 随机选择分类
   */
  static getRandomCategory(): Category {
    const categories = this.getCachedData('categories');
    if (categories.length === 0) {
      return this.getDefaultCategory();
    }
    return this.randomChoice(categories);
  }

  /**
   * 随机选择单位
   */
  static getRandomUnit(): Unit {
    const units = this.getCachedData('units');
    if (units.length === 0) {
      return this.getDefaultUnit();
    }
    return this.randomChoice(units);
  }

  /**
   * 随机选择仓库
   */
  static getRandomWarehouse(): Warehouse {
    const warehouses = this.getCachedData('warehouses');
    if (warehouses.length === 0) {
      return this.getDefaultWarehouse();
    }
    return this.randomChoice(warehouses);
  }
}