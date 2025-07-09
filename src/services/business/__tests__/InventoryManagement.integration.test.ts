/**
 * 库存管理集成测试
 * 测试从商品创建到库存更新的完整流程
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import categoryService from '../categoryService';
import unitService from '../unitService';
import productService from '../productService';
import { warehouseService } from '../warehouseService';
import inventoryStockService from '../inventoryStockService';
import { mockElectronAPI, createMockDatabaseResult } from '../../../../jest.setup';

// Mock React component for testing
const TestInventoryComponent = () => {
  return (
    <div>
      <h1>Inventory Management Test</h1>
      <button data-testid="create-category">Create Category</button>
      <button data-testid="create-unit">Create Unit</button>
      <button data-testid="create-warehouse">Create Warehouse</button>
      <button data-testid="create-product">Create Product</button>
      <button data-testid="update-stock">Update Stock</button>
    </div>
  );
};

describe('Inventory Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('完整的商品入库流程', () => {
    test('should complete full product inbound workflow', async () => {
      // 1. 创建分类
      const category = await categoryService.create({
        name: '测试分类',
        description: '用于测试的商品分类',
        parentId: null,
        isActive: true
      });

      expect(mockElectronAPI.dbCreateCategory).toHaveBeenCalledWith({
        name: '测试分类',
        description: '用于测试的商品分类',
        parentId: null,
        isActive: true
      });

      // 2. 创建单位
      const unit = await unitService.create({
        name: '件',
        symbol: 'pcs',
        description: '计件单位',
        isActive: true
      });

      expect(mockElectronAPI.dbCreateUnit).toHaveBeenCalledWith({
        name: '件',
        symbol: 'pcs',
        description: '计件单位',
        isActive: true
      });

      // 3. 创建仓库
      const warehouse = await warehouseService.create({
        name: '主仓库',
        location: 'A区1号',
        description: '主要存储仓库',
        isActive: true,
        isDefault: true
      });

      expect(mockElectronAPI.dbCreateWarehouse).toHaveBeenCalledWith({
        name: '主仓库',
        location: 'A区1号',
        description: '主要存储仓库',
        isActive: true,
        isDefault: true
      });

      // 4. 创建产品
      const product = await productService.create({
        name: '测试产品',
        sku: 'TEST001',
        description: '用于测试的产品',
        categoryId: '1', // mock返回的ID
        unitId: '1',
        brand: '测试品牌',
        model: 'V1.0',
        minStock: 10,
        maxStock: 100,
        status: 'active'
      });

      expect(mockElectronAPI.dbCreateProduct).toHaveBeenCalledWith({
        name: '测试产品',
        sku: 'TEST001',
        description: '用于测试的产品',
        categoryId: '1',
        unitId: '1',
        brand: '测试品牌',
        model: 'V1.0',
        minStock: 10,
        maxStock: 100,
        status: 'active'
      });

      // 5. 更新库存
      const stockUpdate = await inventoryStockService.updateStock('1', '1', 50, {
        type: 'inbound',
        reason: '初始入库',
        operator: 'test-user',
        batchNo: 'BATCH001',
        supplierBatchNo: 'SUP001'
      });

      expect(mockElectronAPI.dbUpdateInventoryStock).toHaveBeenCalledWith('1', '1', 50);
      expect(mockElectronAPI.dbCreateInventoryTransaction).toHaveBeenCalled();

      // 验证整个流程的数据一致性
      expect(category.success).toBe(true);
      expect(unit.success).toBe(true);
      expect(warehouse.success).toBe(true);
      expect(product.success).toBe(true);
      expect(stockUpdate.success).toBe(true);
    });

    test('should handle errors gracefully in workflow', async () => {
      // 模拟数据库错误
      mockElectronAPI.dbCreateCategory.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'DB_ERROR',
          message: '数据库连接失败'
        }
      });

      const result = await categoryService.create({
        name: '错误测试分类',
        description: '用于测试错误处理',
        parentId: null,
        isActive: true
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('数据库连接失败');
    });
  });

  describe('库存数据完整性验证', () => {
    test('should validate inventory data consistency', async () => {
      // 获取库存统计
      const stats = await inventoryStockService.getInventoryStats();
      
      expect(mockElectronAPI.dbGetInventoryStats).toHaveBeenCalled();
      expect(stats.data).toEqual({
        totalStocks: 1000,
        totalTransactions: 500,
        lowStockCount: 10,
        totalValue: 50000,
        total: 100
      });
    });

    test('should identify low stock items', async () => {
      const lowStockItems = await inventoryStockService.getLowStockItems();
      
      expect(mockElectronAPI.dbGetLowStockItems).toHaveBeenCalled();
      expect(lowStockItems.data).toEqual([
        { productId: '1', currentStock: 5, minStock: 10 }
      ]);
    });
  });

  describe('业务服务间协作测试', () => {
    test('should coordinate between multiple services', async () => {
      // 测试多个服务之间的协作
      const categories = await categoryService.findAll();
      const units = await unitService.findAll();
      const warehouses = await warehouseService.findAll();
      const products = await productService.findAll();

      expect(mockElectronAPI.dbGetAllCategories).toHaveBeenCalled();
      expect(mockElectronAPI.dbGetAllUnits).toHaveBeenCalled();
      expect(mockElectronAPI.dbGetAllWarehouses).toHaveBeenCalled();
      expect(mockElectronAPI.dbGetAllProducts).toHaveBeenCalled();

      // 验证返回的数据结构
      expect(Array.isArray(categories.data)).toBe(true);
      expect(Array.isArray(units.data)).toBe(true);
      expect(Array.isArray(warehouses.data)).toBe(true);
      expect(Array.isArray(products.data)).toBe(true);
    });
  });

  describe('并发操作测试', () => {
    test('should handle concurrent inventory updates', async () => {
      // 并发更新库存
      const promises = [
        inventoryStockService.updateStock('1', '1', 10, { type: 'inbound', reason: '并发测试1', operator: 'user1' }),
        inventoryStockService.updateStock('1', '1', 15, { type: 'inbound', reason: '并发测试2', operator: 'user2' }),
        inventoryStockService.updateStock('1', '1', 20, { type: 'inbound', reason: '并发测试3', operator: 'user3' })
      ];

      const results = await Promise.all(promises);

      // 验证所有操作都成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证数据库调用次数
      expect(mockElectronAPI.dbUpdateInventoryStock).toHaveBeenCalledTimes(3);
      expect(mockElectronAPI.dbCreateInventoryTransaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('性能测试', () => {
    test('should handle large data sets efficiently', async () => {
      const startTime = performance.now();

      // 模拟大量数据查询
      const categories = await categoryService.findAll();
      const products = await productService.findAll();
      const inventory = await inventoryStockService.findAllStocks();

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // 验证执行时间在合理范围内（100ms内）
      expect(executionTime).toBeLessThan(100);

      // 验证数据返回
      expect(categories.success).toBe(true);
      expect(products.success).toBe(true);
      expect(inventory.success).toBe(true);
    });
  });

  describe('用户界面集成测试', () => {
    test('should render inventory management component', async () => {
      render(<TestInventoryComponent />);

      // 验证组件渲染
      expect(screen.getByText('Inventory Management Test')).toBeInTheDocument();
      expect(screen.getByTestId('create-category')).toBeInTheDocument();
      expect(screen.getByTestId('create-unit')).toBeInTheDocument();
      expect(screen.getByTestId('create-warehouse')).toBeInTheDocument();
      expect(screen.getByTestId('create-product')).toBeInTheDocument();
      expect(screen.getByTestId('update-stock')).toBeInTheDocument();
    });

    test('should handle user interactions', async () => {
      const user = userEvent.setup();
      render(<TestInventoryComponent />);

      // 模拟用户点击
      const createCategoryButton = screen.getByTestId('create-category');
      await user.click(createCategoryButton);

      // 验证按钮可以点击（在实际应用中会触发相应的处理函数）
      expect(createCategoryButton).toBeInTheDocument();
    });
  });

  describe('错误恢复测试', () => {
    test('should recover from network failures', async () => {
      // 模拟网络错误
      mockElectronAPI.dbGetAllCategories
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(createMockDatabaseResult([
          { id: '1', name: 'Recovery Category' }
        ]));

      // 第一次调用失败
      await expect(categoryService.findAll()).rejects.toThrow('Network timeout');

      // 第二次调用成功（模拟重试机制）
      const result = await categoryService.findAll();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        { id: '1', name: 'Recovery Category' }
      ]);
    });
  });
});

describe('Service Dependency Integration', () => {
  test('should work with dependency injection container', async () => {
    // 这里可以测试服务依赖注入是否正常工作
    // 由于我们已经实现了ServiceContainer，可以验证服务的正确注册和解析
    
    expect(categoryService).toBeDefined();
    expect(unitService).toBeDefined();
    expect(productService).toBeDefined();
    expect(warehouseService).toBeDefined();
    expect(inventoryStockService).toBeDefined();

    // 验证服务的基本功能
    const categoryStats = await categoryService.getCategoryStats();
    expect(categoryStats).toBeDefined();
    
    const unitStats = await unitService.getUnitStats();
    expect(unitStats).toBeDefined();
  });
});