/**
 * InventoryDomainService 测试
 * 使用新的数据工厂进行测试
 */

import { InventoryDomainService } from '../InventoryDomainService';
import { MasterDataFactory } from '../../../__tests__/fixtures/MasterDataFactory';
import { InventoryDomainFactory } from '../../../__tests__/fixtures/InventoryDomainFactory';
import { ScenarioTemplates } from '../../../__tests__/fixtures/ScenarioTemplates';

// Mock dependencies
jest.mock('../../core/database');
jest.mock('../../../utils/secureLogger');

describe('InventoryDomainService - 使用新数据工厂', () => {
  let service: InventoryDomainService;
  let mockDb: any;

  beforeEach(async () => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();

    // Setup mock database
    mockDb = {
      getProduct: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      deleteProduct: jest.fn(),
      getProducts: jest.fn().mockResolvedValue([]),
      getInventoryStock: jest.fn(),
      getInventoryStocks: jest.fn().mockResolvedValue([]),
      updateInventoryStock: jest.fn(),
      createInventoryStock: jest.fn(),
      upsertInventoryStock: jest.fn(),
      insertInventoryTransaction: jest.fn(),
      createInventoryTransaction: jest.fn(),
      getInventoryTransactions: jest.fn().mockResolvedValue([]),
      query: jest.fn(),
      run: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Create service instance (assuming similar interface to InventoryService)
    service = new InventoryDomainService();
    // Mock database injection
    (service as any).db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
    MasterDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();
  });

  describe('产品管理功能', () => {
    it('应该成功创建产品', async () => {
      // 使用新数据工厂准备测试数据
      const category = MasterDataFactory.createCategory();
      const unit = MasterDataFactory.createUnit();
      const productData = InventoryDomainFactory.createProduct({
        categoryId: category.id,
        unitId: unit.id
      });

      // Mock database response
      mockDb.getProduct.mockResolvedValue({ success: true, data: null }); // SKU不存在
      mockDb.createProduct.mockResolvedValue({ success: true, data: productData });

      // 执行测试
      const result = await service.createProduct({
        name: productData.name,
        sku: productData.sku,
        description: productData.description,
        categoryId: productData.categoryId,
        unitId: productData.unitId,
        purchasePrice: productData.purchasePrice,
        salePrice: productData.salePrice,
        minStock: productData.minStock,
        maxStock: productData.maxStock
      });

      // 验证结果
      expect(result.success).toBe(true);
      expect(mockDb.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: productData.name,
          sku: productData.sku,
          categoryId: productData.categoryId,
          unitId: productData.unitId
        })
      );
    });

    it('应该正确处理重复SKU错误', async () => {
      const existingProduct = InventoryDomainFactory.createProduct();
      const duplicateProduct = InventoryDomainFactory.createProduct({
        sku: existingProduct.sku
      });

      mockDb.getProduct.mockResolvedValue({ success: true, data: existingProduct });

      const result = await service.createProduct({
        name: duplicateProduct.name,
        sku: duplicateProduct.sku,
        description: duplicateProduct.description,
        categoryId: duplicateProduct.categoryId,
        unitId: duplicateProduct.unitId,
        purchasePrice: duplicateProduct.purchasePrice,
        salePrice: duplicateProduct.salePrice,
        minStock: duplicateProduct.minStock,
        maxStock: duplicateProduct.maxStock
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SKU already exists');
    });

    it('应该获取带库存信息的产品列表', async () => {
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(3);
      
      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });

      const result = await service.getProductsWithStock();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(mockDb.getProducts).toHaveBeenCalled();
      expect(mockDb.getInventoryStocks).toHaveBeenCalled();
    });
  });

  describe('库存操作功能', () => {
    it('应该成功执行入库操作', async () => {
      const { product, stock } = InventoryDomainFactory.createProductWithStock();
      const warehouse = MasterDataFactory.getDefaultWarehouse();

      mockDb.getProduct.mockResolvedValue({ success: true, data: product });
      mockDb.getInventoryStock.mockResolvedValue({ success: true, data: stock });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      const stockInData = {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 50,
        operator: 'test_user',
        remark: '测试入库'
      };

      const result = await service.stockIn(stockInData);

      expect(result.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 50,
          type: 'STOCK_IN'
        })
      );
    });

    it('应该成功执行出库操作', async () => {
      const { product, stock } = InventoryDomainFactory.createProductWithStock({
        quantity: 100 // 确保有足够库存
      });
      const warehouse = MasterDataFactory.getDefaultWarehouse();

      mockDb.getProduct.mockResolvedValue({ success: true, data: product });
      mockDb.getInventoryStock.mockResolvedValue({ success: true, data: stock });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      const stockOutData = {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 30,
        operator: 'test_user',
        remark: '测试出库'
      };

      const result = await service.stockOut(stockOutData);

      expect(result.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 30,
          type: 'STOCK_OUT'
        })
      );
    });

    it('应该处理库存不足的出库请求', async () => {
      const { product, stock } = InventoryDomainFactory.createProductWithStock({
        quantity: 10 // 库存较少
      });
      const warehouse = MasterDataFactory.getDefaultWarehouse();

      mockDb.getProduct.mockResolvedValue({ success: true, data: product });
      mockDb.getInventoryStock.mockResolvedValue({ success: true, data: stock });

      const stockOutData = {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 50, // 超过可用库存
        operator: 'test_user',
        remark: '测试出库'
      };

      const result = await service.stockOut(stockOutData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
      expect(mockDb.updateInventoryStock).not.toHaveBeenCalled();
    });

    it('应该成功执行库存调整', async () => {
      const { product, stock } = InventoryDomainFactory.createProductWithStock();
      const warehouse = MasterDataFactory.getDefaultWarehouse();

      mockDb.getProduct.mockResolvedValue({ success: true, data: product });
      mockDb.getInventoryStock.mockResolvedValue({ success: true, data: stock });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      const adjustData = {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: 5, // 正数表示增加
        operator: 'test_user',
        remark: '盘点调整'
      };

      const result = await service.adjustStock(adjustData);

      expect(result.success).toBe(true);
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 5,
          type: 'STOCK_ADJUST'
        })
      );
    });
  });

  describe('业务场景测试', () => {
    it('应该成功处理新产品上架场景', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('新产品上架流程');
      const { product, category, unit, warehouse, initialStock } = scenarioData.data;

      // Mock所有相关的数据库操作
      mockDb.getProduct.mockResolvedValue({ success: true, data: null });
      mockDb.createProduct.mockResolvedValue({ success: true, data: product });
      mockDb.createInventoryStock.mockResolvedValue({ success: true, data: initialStock });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });

      // 执行产品创建
      const createResult = await service.createProduct({
        name: product.name,
        sku: product.sku,
        description: product.description,
        categoryId: category.id,
        unitId: unit.id,
        purchasePrice: product.purchasePrice,
        salePrice: product.salePrice,
        minStock: product.minStock,
        maxStock: product.maxStock
      });

      // 执行初始入库
      const stockInResult = await service.stockIn({
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: initialStock.quantity,
        operator: 'admin',
        remark: '新产品首次入库'
      });

      expect(createResult.success).toBe(true);
      expect(stockInResult.success).toBe(true);
      
      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });

    it('应该正确处理销售高峰期场景', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('销售高峰期场景');
      const { products, salesTransactions, outOfStockProducts } = scenarioData.data;

      // Mock数据库返回
      mockDb.getProducts.mockResolvedValue({ success: true, data: products });

      // 验证场景数据的合理性
      expect(products.length).toBeGreaterThan(0);
      expect(salesTransactions.length).toBeGreaterThan(0);
      expect(scenarioData.data.summary.totalSales).toBe(salesTransactions.length);
      expect(scenarioData.data.summary.totalRevenue).toBeGreaterThan(0);

      // 模拟获取产品列表
      const result = await service.getProductsWithStock();
      expect(mockDb.getProducts).toHaveBeenCalled();

      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });
  });

  describe('事务历史查询', () => {
    it('应该获取产品的事务历史', async () => {
      const product = InventoryDomainFactory.createProduct();
      const warehouse = MasterDataFactory.getDefaultWarehouse();
      const transactions = InventoryDomainFactory.createTransactionHistory(
        product.id,
        warehouse.id,
        10
      );

      mockDb.getInventoryTransactions.mockResolvedValue({
        success: true,
        data: transactions
      });

      const result = await service.getTransactionHistory({
        productId: product.id,
        warehouseId: warehouse.id,
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10);
      expect(mockDb.getInventoryTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: product.id,
          warehouseId: warehouse.id
        })
      );
    });
  });
});