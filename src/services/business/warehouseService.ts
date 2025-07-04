import { Warehouse } from '../../types/entities';
import { WarehouseSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export class WarehouseService {
  private warehouses: Map<string, Warehouse> = new Map();
  private codeIndex: Map<string, string> = new Map(); // Code -> ID mapping

  async initialize(): Promise<void> {
    console.log('Warehouse service initialized');
    
    // 创建默认仓库
    if (this.warehouses.size === 0) {
      await this.createDefaultWarehouses();
    }
  }

  private async createDefaultWarehouses(): Promise<void> {
    const defaultWarehouses = [
      {
        code: 'WH001',
        name: '主仓库',
        address: '总部仓储中心',
        manager: '仓库管理员',
        phone: '021-12345678',
        isDefault: true
      },
      {
        code: 'WH002',
        name: '备用仓库',
        address: '备用仓储点',
        manager: '副仓管',
        phone: '021-87654321',
        isDefault: false
      }
    ];

    for (const warehouseData of defaultWarehouses) {
      try {
        await this.create(warehouseData);
      } catch (error) {
        console.warn('Failed to create default warehouse:', error);
      }
    }
  }

  async findAll(): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values());
  }

  async findById(id: string): Promise<Warehouse | null> {
    return this.warehouses.get(id) || null;
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const id = this.codeIndex.get(code);
    return id ? this.warehouses.get(id) || null : null;
  }

  async findDefault(): Promise<Warehouse | null> {
    const warehouses = Array.from(this.warehouses.values());
    return warehouses.find(warehouse => warehouse.isDefault) || null;
  }

  async search(searchTerm: string): Promise<Warehouse[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.warehouses.values()).filter(warehouse =>
      warehouse.name.toLowerCase().includes(term) ||
      warehouse.code.toLowerCase().includes(term) ||
      warehouse.address?.toLowerCase().includes(term) ||
      warehouse.manager?.toLowerCase().includes(term)
    );
  }

  async create(data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warehouse> {
    // 检查编码唯一性
    if (this.codeIndex.has(data.code)) {
      throw new Error(`仓库编码已存在: ${data.code}`);
    }

    // 如果设置为默认仓库，需要取消其他仓库的默认状态
    if (data.isDefault) {
      await this.clearDefaultStatus();
    }

    const warehouse: Warehouse = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(WarehouseSchema, warehouse);
    if (!validation.success) {
      throw new Error(`仓库数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.warehouses.set(warehouse.id, warehouse);
    this.codeIndex.set(warehouse.code, warehouse.id);

    return warehouse;
  }

  async update(id: string, data: Partial<Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Warehouse> {
    const existingWarehouse = this.warehouses.get(id);
    if (!existingWarehouse) {
      throw new Error(`仓库不存在: ${id}`);
    }

    // 检查编码唯一性（如果更新了编码）
    if (data.code && data.code !== existingWarehouse.code) {
      if (this.codeIndex.has(data.code)) {
        throw new Error(`仓库编码已存在: ${data.code}`);
      }
    }

    // 如果设置为默认仓库，需要取消其他仓库的默认状态
    if (data.isDefault === true) {
      await this.clearDefaultStatus(id);
    }

    const updatedWarehouse: Warehouse = {
      ...existingWarehouse,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(WarehouseSchema, updatedWarehouse);
    if (!validation.success) {
      throw new Error(`仓库数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新编码索引
    if (data.code && data.code !== existingWarehouse.code) {
      this.codeIndex.delete(existingWarehouse.code);
      this.codeIndex.set(data.code, id);
    }

    this.warehouses.set(id, updatedWarehouse);
    return updatedWarehouse;
  }

  async delete(id: string): Promise<boolean> {
    const warehouse = this.warehouses.get(id);
    if (!warehouse) {
      return false;
    }

    // 不允许删除默认仓库
    if (warehouse.isDefault) {
      throw new Error('不能删除默认仓库');
    }

    // 检查是否有关联的库存记录
    // TODO: 实现库存关联检查
    // 这里需要与InventoryService配合检查

    this.warehouses.delete(id);
    this.codeIndex.delete(warehouse.code);
    return true;
  }

  private async clearDefaultStatus(excludeId?: string): Promise<void> {
    for (const [id, warehouse] of this.warehouses) {
      if (id !== excludeId && warehouse.isDefault) {
        const updated = { ...warehouse, isDefault: false, updatedAt: new Date() };
        this.warehouses.set(id, updated);
      }
    }
  }

  async setDefault(id: string): Promise<Warehouse> {
    const warehouse = await this.findById(id);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${id}`);
    }

    return this.update(id, { isDefault: true });
  }

  async validateCode(code: string, excludeId?: string): Promise<boolean> {
    const existingId = this.codeIndex.get(code);
    return !existingId || existingId === excludeId;
  }

  async getActiveWarehouses(): Promise<Warehouse[]> {
    // 所有仓库都被认为是活跃的，除非有其他状态字段
    return this.findAll();
  }

  async bulkCreate(warehouses: Array<Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    created: Warehouse[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const created: Warehouse[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < warehouses.length; i++) {
      try {
        const warehouse = await this.create(warehouses[i]);
        created.push(warehouse);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { created, errors };
  }

  async getWarehouseStats(): Promise<{
    total: number;
    hasDefault: boolean;
    withManager: number;
    withPhone: number;
    withAddress: number;
  }> {
    const warehouses = await this.findAll();
    
    return {
      total: warehouses.length,
      hasDefault: warehouses.some(w => w.isDefault),
      withManager: warehouses.filter(w => w.manager).length,
      withPhone: warehouses.filter(w => w.phone).length,
      withAddress: warehouses.filter(w => w.address).length
    };
  }

  async getWarehouseCapacityInfo(warehouseId: string): Promise<{
    warehouse: Warehouse;
    totalProducts: number;
    totalValue: number;
    // 这些数据需要与库存服务配合获取
  } | null> {
    const warehouse = await this.findById(warehouseId);
    if (!warehouse) {
      return null;
    }

    // TODO: 实现与库存服务的集成
    // 目前返回基础信息
    return {
      warehouse,
      totalProducts: 0,
      totalValue: 0
    };
  }

  async transferWarehouseManager(fromWarehouseId: string, toWarehouseId: string): Promise<{
    from: Warehouse;
    to: Warehouse;
  }> {
    const fromWarehouse = await this.findById(fromWarehouseId);
    const toWarehouse = await this.findById(toWarehouseId);

    if (!fromWarehouse || !toWarehouse) {
      throw new Error('仓库不存在');
    }

    const fromManager = fromWarehouse.manager;
    const toManager = toWarehouse.manager;

    const updatedFrom = await this.update(fromWarehouseId, { manager: toManager });
    const updatedTo = await this.update(toWarehouseId, { manager: fromManager });

    return {
      from: updatedFrom,
      to: updatedTo
    };
  }

  async getWarehousesByManager(manager: string): Promise<Warehouse[]> {
    return Array.from(this.warehouses.values()).filter(
      warehouse => warehouse.manager === manager
    );
  }

  async ensureDefaultWarehouse(): Promise<Warehouse> {
    const defaultWarehouse = await this.findDefault();
    if (defaultWarehouse) {
      return defaultWarehouse;
    }

    // 如果没有默认仓库，将第一个仓库设为默认
    const warehouses = await this.findAll();
    if (warehouses.length > 0) {
      return this.setDefault(warehouses[0].id);
    }

    // 如果没有任何仓库，创建一个默认仓库
    return this.create({
      code: 'DEFAULT',
      name: '默认仓库',
      isDefault: true
    });
  }
}

export default new WarehouseService();