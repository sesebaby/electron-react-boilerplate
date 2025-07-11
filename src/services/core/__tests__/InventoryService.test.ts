/**
 * InventoryService 场景驱动测试
 * 测试场景：商品生命周期管理完整流程
 */

import { InventoryService } from '../InventoryService';
import { DatabaseManager } from '../database';
import { Product, ProductStatus, Category, Unit, Warehouse } from '../../../types/entities';
import { ValidationError, BusinessError } from '../../../utils/errors';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('InventoryService - 商品生命周期管理流程', () => {
  let inventoryService: InventoryService;
  let mockDb: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock database instance
    mockDb = {
      getProduct: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getCategory: jest.fn(),
      createCategory: jest.fn(),
      getUnit: jest.fn(),
      createUnit: jest.fn(),
      getWarehouse: jest.fn(),
      createWarehouse: jest.fn(),
      getInventoryStock: jest.fn(),
      updateInventoryStock: jest.fn(),
      createInventoryTransaction: jest.fn(),
      query: jest.fn(),
      run: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
    inventoryService = new InventoryService();
  });

  describe('场景1：新商品完整创建流程', () => {
    it('应该成功创建商品的完整生命周期：分类→单位→仓库→商品→库存', async () => {
      // 准备测试数据
      const category: Category = {
        id: 'cat-1',
        name: '电子产品',
        description: '电子设备分类',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const unit: Unit = {
        id: 'unit-1',
        name: '台',
        symbol: 'pcs',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const warehouse: Warehouse = {
        id: 'wh-1',
        name: '主仓库',
        location: '北京',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const product: Product = {
        id: 'prod-1',
        name: '笔记本电脑',
        sku: 'NB-001',
        description: '高性能笔记本电脑',
        categoryId: 'cat-1',
        unitId: 'unit-1',
        status: ProductStatus.ACTIVE,
        purchasePrice: 5000,
        salePrice: 6000,
        minStock: 10,
        maxStock: 100,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock数据库响应
      mockDb.createCategory.mockResolvedValue({ success: true, data: category });
      mockDb.createUnit.mockResolvedValue({ success: true, data: unit });
      mockDb.createWarehouse.mockResolvedValue({ success: true, data: warehouse });
      mockDb.createProduct.mockResolvedValue({ success: true, data: product });
      mockDb.getProduct.mockResolvedValue({ success: true, data: null }); // SKU不存在
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      // 执行完整流程
      // 1. 创建分类
      const categoryResult = await inventoryService.createCategory({
        name: category.name,
        description: category.description
      });
      expect(categoryResult.success).toBe(true);
      expect(mockDb.createCategory).toHaveBeenCalledWith(expect.objectContaining({
        name: category.name,
        description: category.description
      }));

      // 2. 创建单位
      const unitResult = await inventoryService.createUnit({
        name: unit.name,
        symbol: unit.symbol
      });
      expect(unitResult.success).toBe(true);
      expect(mockDb.createUnit).toHaveBeenCalledWith(expect.objectContaining({
        name: unit.name,
        symbol: unit.symbol
      }));

      // 3. 创建仓库
      const warehouseResult = await inventoryService.createWarehouse({
        name: warehouse.name,
        location: warehouse.location
      });
      expect(warehouseResult.success).toBe(true);
      expect(mockDb.createWarehouse).toHaveBeenCalledWith(expect.objectContaining({
        name: warehouse.name,
        location: warehouse.location
      }));

      // 4. 创建商品
      const productResult = await inventoryService.createProduct({
        name: product.name,
        sku: product.sku,
        description: product.description,
        categoryId: product.categoryId,
        unitId: product.unitId,
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        minStock: product.minStock,
        maxStock: product.maxStock
      });
      expect(productResult.success).toBe(true);
      expect(mockDb.createProduct).toHaveBeenCalledWith(expect.objectContaining({
        sku: product.sku,
        name: product.name
      }));

      // 5. 初始化库存
      const stockResult = await inventoryService.updateStock({
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 50,
        type: 'IN',
        reason: '初始库存'
      });
      expect(stockResult.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalled();
    });

    it('应该在SKU重复时抛出ValidationError', async () => {
      // Mock重复SKU
      mockDb.getProduct.mockResolvedValue({ 
        success: true, 
        data: { id: 'existing-1', sku: 'NB-001' } 
      });

      const productData = {
        name: '笔记本电脑',
        sku: 'NB-001',
        description: '高性能笔记本电脑',
        categoryId: 'cat-1',
        unitId: 'unit-1',
        purchasePrice: 5000,
        salePrice: 6000
      };

      await expect(inventoryService.createProduct(productData))
        .rejects.toThrow(ValidationError);
      
      expect(mockDb.getProduct).toHaveBeenCalledWith({ sku: 'NB-001' });
      expect(mockDb.createProduct).not.toHaveBeenCalled();
    });
  });

  describe('场景2：库存变动完整流程', () => {
    it('应该正确处理入库→出库→调整的完整库存变动流程', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      // Mock初始库存状态
      mockDb.getInventoryStock.mockResolvedValue({
        success: true,
        data: {
          productId,
          warehouseId,
          quantity: 100,
          reservedQuantity: 0
        }
      });
      
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      // 1. 入库操作
      const inStockResult = await inventoryService.updateStock({
        productId,
        warehouseId,
        quantity: 50,
        type: 'IN',
        reason: '采购入库'
      });
      expect(inStockResult.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          warehouseId,
          quantityChange: 50
        })
      );

      // 2. 出库操作
      const outStockResult = await inventoryService.updateStock({
        productId,
        warehouseId,
        quantity: 30,
        type: 'OUT',
        reason: '销售出库'
      });
      expect(outStockResult.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId,
          warehouseId,
          quantityChange: -30
        })
      );

      // 3. 库存调整
      const adjustResult = await inventoryService.updateStock({
        productId,
        warehouseId,
        quantity: 5,
        type: 'ADJUST',
        reason: '盘点调整'
      });
      expect(adjustResult.success).toBe(true);

      // 验证所有库存变动都记录了事务
      expect(mockDb.createInventoryTransaction).toHaveBeenCalledTimes(3);
    });

    it('应该在库存不足时阻止出库操作', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      // Mock库存不足的情况
      mockDb.getInventoryStock.mockResolvedValue({
        success: true,
        data: {
          productId,
          warehouseId,
          quantity: 10,
          reservedQuantity: 0
        }
      });

      // 尝试出库超过库存数量
      await expect(inventoryService.updateStock({
        productId,
        warehouseId,
        quantity: 50,
        type: 'OUT',
        reason: '销售出库'
      })).rejects.toThrow(BusinessError);

      expect(mockDb.updateInventoryStock).not.toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).not.toHaveBeenCalled();
    });
  });

  describe('场景3：商品状态管理流程', () => {
    it('应该正确处理商品从激活到停用的状态变更', async () => {
      const productId = 'prod-1';
      const mockProduct = {
        id: productId,
        name: '笔记本电脑',
        sku: 'NB-001',
        status: ProductStatus.ACTIVE,
        isActive: true
      };

      mockDb.getProduct.mockResolvedValue({ success: true, data: mockProduct });
      mockDb.updateProduct.mockResolvedValue({ 
        success: true, 
        data: { ...mockProduct, status: ProductStatus.INACTIVE, isActive: false }
      });

      // 停用商品
      const result = await inventoryService.updateProduct(productId, {
        status: ProductStatus.INACTIVE,
        isActive: false
      });

      expect(result.success).toBe(true);
      expect(mockDb.updateProduct).toHaveBeenCalledWith(
        productId,
        expect.objectContaining({
          status: ProductStatus.INACTIVE,
          isActive: false
        })
      );
    });
  });

  describe('场景4：并发操作处理', () => {
    it('应该正确处理并发库存更新操作', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';

      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.commit.mockResolvedValue({ success: true });
      mockDb.getInventoryStock.mockResolvedValue({
        success: true,
        data: { productId, warehouseId, quantity: 100, reservedQuantity: 0 }
      });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      // 模拟并发操作
      const operations = [
        inventoryService.updateStock({
          productId, warehouseId, quantity: 10, type: 'OUT', reason: '操作1'
        }),
        inventoryService.updateStock({
          productId, warehouseId, quantity: 5, type: 'OUT', reason: '操作2'
        })
      ];

      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证事务处理
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commit).toHaveBeenCalled();
    });
  });

  describe('场景5：错误恢复和回滚', () => {
    it('应该在操作失败时正确回滚事务', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';

      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.rollback.mockResolvedValue({ success: true });
      mockDb.getInventoryStock.mockResolvedValue({
        success: true,
        data: { productId, warehouseId, quantity: 100, reservedQuantity: 0 }
      });
      
      // Mock更新失败
      mockDb.updateInventoryStock.mockRejectedValue(new Error('数据库错误'));

      await expect(inventoryService.updateStock({
        productId, warehouseId, quantity: 10, type: 'OUT', reason: '测试操作'
      })).rejects.toThrow();

      // 验证回滚被调用
      expect(mockDb.rollback).toHaveBeenCalled();
    });
  });
});