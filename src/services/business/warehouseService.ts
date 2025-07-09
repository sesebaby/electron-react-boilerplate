import { Warehouse } from '../../types/entities';
import { WarehouseSchema, validateEntity } from '../../schemas/validation';

// Electron API for database operations
const electronAPI = window.electronAPI;

export class WarehouseService {
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      // 检查是否存在仓库，如果没有则创建默认的"1号库"
      const existingWarehouses = await this.findAll();
      if (existingWarehouses.length === 0) {
        console.log('No warehouses found, creating default warehouse...');
        await this.createDefaultWarehouse();
        console.log('Default warehouse created successfully');
      }
      
      this.initialized = true;
      console.log('WarehouseService: Initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize warehouse service:', error);
      // Reset initialization state on error so we can try again
      this.initialized = false;
      throw error;
    }
  }
  
  // Add method to reset initialization state (useful for system reset)
  reset(): void {
    this.initialized = false;
  }

  private async createDefaultWarehouse(): Promise<void> {
    try {
      const defaultWarehouse = await this.create({
        code: 'WH001',
        name: '1号库',
        address: '默认仓库地址',
        manager: '管理员',
        isDefault: true
      });
      
      console.log('Default warehouse "1号库" created:', defaultWarehouse.id);
    } catch (error) {
      console.error('Failed to create default warehouse:', error);
      throw error;
    }
  }

  async findAll(): Promise<Warehouse[]> {
    try {
      // 确保服务已初始化
      if (!this.initialized) {
        console.log('WarehouseService not initialized, initializing now...');
        await this.initialize();
      }
      
      const result = await electronAPI.dbGetAllWarehouses();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get all warehouses:', error);
      return [];
    }
  }

  async findById(id: string): Promise<Warehouse | null> {
    try {
      const result = await electronAPI.dbGetWarehouseById(id);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get warehouse by id:', error);
      return null;
    }
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    try {
      const result = await electronAPI.dbGetWarehouseByCode(code);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get warehouse by code:', error);
      return null;
    }
  }

  async findDefault(): Promise<Warehouse | null> {
    try {
      const result = await electronAPI.dbGetDefaultWarehouse();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to get default warehouse:', error);
      return null;
    }
  }

  async search(searchTerm: string): Promise<Warehouse[]> {
    const term = searchTerm.trim();
    if (!term) return this.findAll();

    try {
      const result = await electronAPI.dbSearchWarehouses(term);
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to search warehouses:', error);
      return [];
    }
  }

  async create(data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<Warehouse> {
    // 检查编码唯一性
    const existingWarehouse = await this.findByCode(data.code);
    if (existingWarehouse) {
      throw new Error(`仓库编码已存在: ${data.code}`);
    }

    // 创建临时warehouse对象用于验证
    const tempWarehouse: Warehouse = {
      ...data,
      id: 'temp-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(WarehouseSchema, tempWarehouse);
    if (!validation.success) {
      throw new Error(`仓库数据验证失败: ${validation.errors?.join(', ')}`);
    }

    try {
      const result = await electronAPI.dbCreateWarehouse(data);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to create warehouse:', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Warehouse> {
    const existingWarehouse = await this.findById(id);
    if (!existingWarehouse) {
      throw new Error(`仓库不存在: ${id}`);
    }

    // 检查编码唯一性（如果更新了编码）
    if (data.code && data.code !== existingWarehouse.code) {
      const warehouseWithSameCode = await this.findByCode(data.code);
      if (warehouseWithSameCode) {
        throw new Error(`仓库编码已存在: ${data.code}`);
      }
    }

    // 创建完整的warehouse对象用于验证
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

    try {
      const result = await electronAPI.dbUpdateWarehouse(id, data);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to update warehouse:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const warehouse = await this.findById(id);
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

    try {
      const result = await electronAPI.dbDeleteWarehouse(id);
      return result.success;
    } catch (error) {
      console.error('Failed to delete warehouse:', error);
      throw error;
    }
  }

  // Note: clearDefaultStatus is now handled automatically by the database handlers

  async setDefault(id: string): Promise<Warehouse> {
    const warehouse = await this.findById(id);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${id}`);
    }

    return this.update(id, { isDefault: true });
  }

  async validateCode(code: string, excludeId?: string): Promise<boolean> {
    const existingWarehouse = await this.findByCode(code);
    return !existingWarehouse || existingWarehouse.id === excludeId;
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
    active: number;
    hasDefault: boolean;
    withManager: number;
    withAddress: number;
  }> {
    // 确保服务已初始化
    if (!this.initialized) {
      console.log('WarehouseService not initialized, initializing now...');
      await this.initialize();
    }
    
    const warehouses = await this.findAll();
    
    return {
      total: warehouses.length,
      active: warehouses.length, // All warehouses are considered active
      hasDefault: warehouses.some(w => w.isDefault),
      withManager: warehouses.filter(w => w.manager).length,
      withAddress: warehouses.filter(w => w.address).length
    };
  }
}

export const warehouseService = new WarehouseService();