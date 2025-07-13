/**
 * MasterDataService 测试
 * 使用新的数据工厂进行基础数据管理测试
 */

import { MasterDataService } from '../MasterDataService';
import { MasterDataFactory } from '../../../__tests__/fixtures/MasterDataFactory';
import { UnitType } from '../../../types/entities';

// Mock dependencies
jest.mock('../../core/database');
jest.mock('../../../utils/secureLogger');

// Mock electronAPI
const mockElectronAPI = {
  dbGet: jest.fn(),
  dbRun: jest.fn(),
  dbAll: jest.fn(),
};

// Setup global mocks
beforeAll(() => {
  if (typeof window === 'undefined') {
    (global as any).window = {};
  }

  // 只在electronAPI不存在时才定义
  if (!window.electronAPI) {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true,
      configurable: true
    });
  } else {
    // 如果已存在，则更新其方法
    Object.assign(window.electronAPI, mockElectronAPI);
  }
});

describe('MasterDataService - 基础数据管理', () => {
  let service: MasterDataService;
  let mockDb: any;

  beforeEach(async () => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();

    // Setup mock database
    mockDb = {
      getCategory: jest.fn().mockResolvedValue({ success: true, data: null }),
      createCategory: jest.fn().mockResolvedValue({ success: true }),
      updateCategory: jest.fn().mockResolvedValue({ success: true }),
      deleteCategory: jest.fn().mockResolvedValue({ success: true }),
      getCategories: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getUnit: jest.fn().mockResolvedValue({ success: true, data: null }),
      createUnit: jest.fn().mockResolvedValue({ success: true }),
      updateUnit: jest.fn().mockResolvedValue({ success: true }),
      deleteUnit: jest.fn().mockResolvedValue({ success: true }),
      getUnits: jest.fn().mockResolvedValue({ success: true, data: [] }),
      getWarehouse: jest.fn().mockResolvedValue({ success: true, data: null }),
      createWarehouse: jest.fn().mockResolvedValue({ success: true }),
      updateWarehouse: jest.fn().mockResolvedValue({ success: true }),
      deleteWarehouse: jest.fn().mockResolvedValue({ success: true }),
      getWarehouses: jest.fn().mockResolvedValue({ success: true, data: [] }),
      query: jest.fn(),
      run: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Create service instance
    service = new MasterDataService();
    // Mock database injection
    (service as any).db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
    MasterDataFactory.clearAllData();
  });

  describe('分类管理', () => {
    it('应该成功创建分类', async () => {
      const categoryData = MasterDataFactory.createCategory({
        name: '电子产品',
        description: '电子设备和数码产品'
      });

      mockDb.getCategory.mockResolvedValue({ success: true, data: null }); // 分类不存在
      mockDb.createCategory.mockResolvedValue({ success: true, data: categoryData });

      const result = await service.createCategory({
        name: categoryData.name,
        description: categoryData.description,
        level: categoryData.level,
        sortOrder: categoryData.sortOrder,
        isActive: categoryData.isActive
      });

      expect(result.success).toBe(true);
      expect(mockDb.createCategory).toHaveBeenCalledWith(
        expect.objectContaining({
          name: categoryData.name,
          description: categoryData.description,
          level: categoryData.level,
          sortOrder: categoryData.sortOrder,
          isActive: categoryData.isActive
        })
      );
    });

    it('应该获取所有分类', async () => {
      const categories = MasterDataFactory.createStandardCategories();
      
      mockDb.getCategories.mockResolvedValue({ success: true, data: categories });

      const result = await service.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].name).toBe('电子产品');
      expect(mockDb.getCategories).toHaveBeenCalled();
    });

    it('应该成功更新分类', async () => {
      const category = MasterDataFactory.createCategory();
      const updatedData = {
        ...category,
        name: '更新后的分类名称',
        description: '更新后的描述'
      };

      mockDb.getCategory.mockResolvedValue({ success: true, data: category });
      mockDb.updateCategory.mockResolvedValue({ success: true, data: updatedData });

      const result = await service.updateCategory(category.id, {
        name: updatedData.name,
        description: updatedData.description
      });

      expect(result.success).toBe(true);
      expect(mockDb.updateCategory).toHaveBeenCalledWith(
        category.id,
        expect.objectContaining({
          name: updatedData.name,
          description: updatedData.description
        })
      );
    });

    it('应该成功删除分类', async () => {
      const category = MasterDataFactory.createCategory();

      mockDb.getCategory.mockResolvedValue({ success: true, data: category });
      mockDb.deleteCategory.mockResolvedValue({ success: true });

      const result = await service.deleteCategory(category.id);

      expect(result.success).toBe(true);
      expect(mockDb.deleteCategory).toHaveBeenCalledWith(category.id);
    });

    it('应该处理删除不存在的分类', async () => {
      const nonExistentId = 'non-existent-id';

      mockDb.getCategory.mockResolvedValue({ success: true, data: null });

      const result = await service.deleteCategory(nonExistentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Category not found');
      expect(mockDb.deleteCategory).not.toHaveBeenCalled();
    });
  });

  describe('单位管理', () => {
    it('应该成功创建单位', async () => {
      const unitData = MasterDataFactory.createUnit({
        name: '公斤',
        symbol: 'kg',
        type: UnitType.WEIGHT,
        precision: 2
      });

      mockDb.getUnit.mockResolvedValue({ success: true, data: null }); // 单位不存在
      mockDb.createUnit.mockResolvedValue({ success: true, data: unitData });

      const result = await service.createUnit({
        name: unitData.name,
        symbol: unitData.symbol,
        type: unitData.type,
        precision: unitData.precision,
        isActive: unitData.isActive
      });

      expect(result.success).toBe(true);
      expect(mockDb.createUnit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: unitData.name,
          symbol: unitData.symbol,
          type: unitData.type,
          precision: unitData.precision
        })
      );
    });

    it('应该获取所有单位', async () => {
      const units = MasterDataFactory.createStandardUnits();
      
      mockDb.getUnits.mockResolvedValue({ success: true, data: units });

      const result = await service.getUnits();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(6);
      expect(result.data.find(u => u.name === '台')).toBeTruthy();
      expect(result.data.find(u => u.name === '公斤')).toBeTruthy();
      expect(mockDb.getUnits).toHaveBeenCalled();
    });

    it('应该根据类型筛选单位', async () => {
      const units = MasterDataFactory.createStandardUnits();
      const quantityUnits = units.filter(u => u.type === UnitType.QUANTITY);
      
      mockDb.getUnits.mockResolvedValue({ success: true, data: quantityUnits });

      const result = await service.getUnitsByType(UnitType.QUANTITY);

      expect(result.success).toBe(true);
      expect(result.data.every(u => u.type === UnitType.QUANTITY)).toBe(true);
      expect(mockDb.getUnits).toHaveBeenCalledWith(
        expect.objectContaining({ type: UnitType.QUANTITY })
      );
    });

    it('应该处理重复的单位符号', async () => {
      const existingUnit = MasterDataFactory.createUnit({ symbol: 'kg' });
      const duplicateUnit = MasterDataFactory.createUnit({ symbol: 'kg' });

      mockDb.getUnit.mockResolvedValue({ success: true, data: existingUnit });

      const result = await service.createUnit({
        name: duplicateUnit.name,
        symbol: duplicateUnit.symbol,
        type: duplicateUnit.type,
        precision: duplicateUnit.precision,
        isActive: duplicateUnit.isActive
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Symbol already exists');
      expect(mockDb.createUnit).not.toHaveBeenCalled();
    });
  });

  describe('仓库管理', () => {
    it('应该成功创建仓库', async () => {
      const warehouseData = MasterDataFactory.createWarehouse({
        code: 'WH001',
        name: '主仓库',
        location: '北京市朝阳区',
        isDefault: true
      });

      mockDb.getWarehouse.mockResolvedValue({ success: true, data: null }); // 仓库不存在
      mockDb.createWarehouse.mockResolvedValue({ success: true, data: warehouseData });

      const result = await service.createWarehouse({
        code: warehouseData.code,
        name: warehouseData.name,
        location: warehouseData.location,
        isDefault: warehouseData.isDefault,
        isActive: warehouseData.isActive
      });

      expect(result.success).toBe(true);
      expect(mockDb.createWarehouse).toHaveBeenCalledWith(
        expect.objectContaining({
          code: warehouseData.code,
          name: warehouseData.name,
          location: warehouseData.location,
          isDefault: warehouseData.isDefault
        })
      );
    });

    it('应该获取所有仓库', async () => {
      const warehouses = MasterDataFactory.createStandardWarehouses();
      
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: warehouses });

      const result = await service.getWarehouses();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data.find(w => w.isDefault)).toBeTruthy();
      expect(mockDb.getWarehouses).toHaveBeenCalled();
    });

    it('应该获取默认仓库', async () => {
      const warehouses = MasterDataFactory.createStandardWarehouses();
      const defaultWarehouse = warehouses.find(w => w.isDefault);
      
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: warehouses });

      const result = await service.getDefaultWarehouse();

      expect(result.success).toBe(true);
      expect(result.data.isDefault).toBe(true);
      expect(result.data.id).toBe(defaultWarehouse?.id);
    });

    it('应该处理重复的仓库编码', async () => {
      const existingWarehouse = MasterDataFactory.createWarehouse({ code: 'WH001' });
      const duplicateWarehouse = MasterDataFactory.createWarehouse({ code: 'WH001' });

      mockDb.getWarehouse.mockResolvedValue({ success: true, data: existingWarehouse });

      const result = await service.createWarehouse({
        code: duplicateWarehouse.code,
        name: duplicateWarehouse.name,
        location: duplicateWarehouse.location,
        isDefault: false,
        isActive: true
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Warehouse code already exists');
      expect(mockDb.createWarehouse).not.toHaveBeenCalled();
    });

    it('应该获取仓库统计信息', async () => {
      const warehouse = MasterDataFactory.createWarehouse();
      const mockStats = {
        totalProducts: 150,
        totalValue: 500000,
        totalQuantity: 2500,
        lastUpdated: new Date()
      };

      mockDb.getWarehouseStats = jest.fn().mockResolvedValue({ 
        success: true, 
        data: mockStats 
      });

      const result = await service.getWarehouseStats(warehouse.id);

      expect(result.success).toBe(true);
      expect(result.data.totalProducts).toBe(150);
      expect(result.data.totalValue).toBe(500000);
      expect(mockDb.getWarehouseStats).toHaveBeenCalledWith(warehouse.id);
    });
  });

  describe('批量操作', () => {
    it('应该批量创建基础数据', async () => {
      const masterDataSet = MasterDataFactory.createMasterDataSet();

      // Mock各种创建操作
      mockDb.createCategory.mockResolvedValue({ success: true });
      mockDb.createUnit.mockResolvedValue({ success: true });
      mockDb.createWarehouse.mockResolvedValue({ success: true });
      mockDb.getCategory.mockResolvedValue({ success: true, data: null });
      mockDb.getUnit.mockResolvedValue({ success: true, data: null });
      mockDb.getWarehouse.mockResolvedValue({ success: true, data: null });

      const result = await service.initializeMasterData(masterDataSet);

      expect(result.success).toBe(true);
      expect(mockDb.createCategory).toHaveBeenCalledTimes(5);
      expect(mockDb.createUnit).toHaveBeenCalledTimes(6);
      expect(mockDb.createWarehouse).toHaveBeenCalledTimes(3);
    });

    it('应该验证基础数据的完整性', async () => {
      const masterDataSet = MasterDataFactory.createMasterDataSet();

      // 验证数据结构
      expect(masterDataSet.categories).toHaveLength(5);
      expect(masterDataSet.units).toHaveLength(6);
      expect(masterDataSet.warehouses).toHaveLength(3);

      // 验证分类数据
      const electronicsCategory = masterDataSet.categories.find(c => c.name === '电子产品');
      expect(electronicsCategory).toBeTruthy();
      expect(electronicsCategory?.isActive).toBe(true);

      // 验证单位数据
      const quantityUnits = masterDataSet.units.filter(u => u.type === UnitType.QUANTITY);
      expect(quantityUnits.length).toBeGreaterThan(0);

      // 验证仓库数据
      const defaultWarehouse = masterDataSet.warehouses.find(w => w.isDefault);
      expect(defaultWarehouse).toBeTruthy();
      expect(defaultWarehouse?.code).toBe('WH001');
    });
  });

  describe('数据工厂统计', () => {
    it('应该正确统计缓存的数据', async () => {
      // 创建一些测试数据
      MasterDataFactory.createStandardCategories();
      MasterDataFactory.createStandardUnits();
      MasterDataFactory.createStandardWarehouses();

      const stats = MasterDataFactory.getDataStats();

      expect(stats.totalCachedTypes).toBe(3);
      expect(stats.cachedTypes.categories).toBe(5);
      expect(stats.cachedTypes.units).toBe(6);
      expect(stats.cachedTypes.warehouses).toBe(3);
    });

    it('应该正确清理特定类型的数据', async () => {
      // 创建测试数据
      MasterDataFactory.createStandardCategories();
      MasterDataFactory.createStandardUnits();

      // 清理分类数据
      MasterDataFactory.clearDataByType('categories');

      const stats = MasterDataFactory.getDataStats();
      expect(stats.cachedTypes.categories).toBe(undefined);
      expect(stats.cachedTypes.units).toBe(6); // 单位数据应该还在
    });
  });
});