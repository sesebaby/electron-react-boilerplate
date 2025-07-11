/**
 * InventoryService 简化测试
 * 基础功能验证
 */

import { InventoryService } from '../InventoryService';
import { DatabaseManager } from '../database';
import { Product, ProductStatus } from '../../../types/entities';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('InventoryService - 基础功能测试', () => {
  let inventoryService: InventoryService;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockDb = {
      query: jest.fn(),
      run: jest.fn(),
      prepare: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
    inventoryService = new InventoryService();
    
    // Mock initialization
    mockDb.query.mockReturnValue([]);
    await inventoryService.initialize();
  });

  it('应该正确初始化服务', () => {
    expect(inventoryService).toBeDefined();
    expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
  });

  it('应该能够创建商品分类', async () => {
    const category = {
      name: '电子产品',
      code: 'ELEC',
      description: '电子产品分类'
    };

    mockDb.query.mockReturnValue({ lastInsertRowid: 1 });

    const result = await inventoryService.createCategory(category);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.name).toBe(category.name);
  });

  it('应该能够创建仓库', async () => {
    const warehouse = {
      name: '主仓库',
      code: 'MAIN',
      address: '北京市朝阳区',
      isDefault: true
    };

    mockDb.query.mockReturnValue({ lastInsertRowid: 1 });

    const result = await inventoryService.createWarehouse(warehouse);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.name).toBe(warehouse.name);
  });

  it('应该能够创建商品', async () => {
    const product = {
      name: 'iPhone 15',
      sku: 'IPHONE15-128GB',
      categoryId: 'cat-1',
      unitId: 'unit-1',
      price: 7999.00,
      cost: 6000.00,
      status: ProductStatus.ACTIVE
    };

    mockDb.query.mockReturnValue({ lastInsertRowid: 1 });

    const result = await inventoryService.createProduct(product);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.name).toBe(product.name);
  });

  it('应该能够查询所有商品', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'iPhone 15',
        sku: 'IPHONE15',
        status: ProductStatus.ACTIVE,
        price: 7999,
        cost: 6000
      }
    ];

    mockDb.query.mockReturnValue(mockProducts);

    const result = await inventoryService.getProducts();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('应该处理数据库错误', async () => {
    mockDb.query.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const result = await inventoryService.getProducts();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});