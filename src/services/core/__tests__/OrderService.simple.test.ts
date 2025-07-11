/**
 * OrderService 简化测试
 * 基础功能验证
 */

import { OrderService } from '../OrderService';
import { DatabaseManager } from '../database';
import { PurchaseOrderStatus } from '../../../types/entities';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('OrderService - 基础功能测试', () => {
  let orderService: OrderService;
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
    orderService = new OrderService();
    
    // Mock initialization
    mockDb.query.mockReturnValue([]);
    await orderService.initialize();
  });

  it('应该正确初始化服务', () => {
    expect(orderService).toBeDefined();
    expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
  });

  it('应该能够创建采购订单', async () => {
    const orderData = {
      supplierId: 'supplier-1',
      expectedDate: new Date(),
      items: [
        {
          productId: 'product-1',
          quantity: 10,
          unitPrice: 100
        }
      ],
      creator: 'test-user'
    };

    // Mock supplier exists
    mockDb.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT * FROM suppliers')) {
        return [{ id: 'supplier-1', name: 'Test Supplier' }];
      }
      if (sql.includes('SELECT * FROM products')) {
        return [{ id: 'product-1', name: 'Test Product' }];
      }
      if (sql.includes('INSERT')) {
        return { lastInsertRowid: 1 };
      }
      return [];
    });

    const result = await orderService.createPurchaseOrder(orderData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('应该能够获取采购订单列表', async () => {
    const mockOrders = [
      {
        id: '1',
        orderNo: 'PO-001',
        supplierId: 'supplier-1',
        status: PurchaseOrderStatus.DRAFT,
        finalAmount: 1000
      }
    ];

    mockDb.query.mockReturnValue(mockOrders);

    const result = await orderService.getPurchaseOrders();
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('应该能够更新订单状态', async () => {
    mockDb.query.mockReturnValue({ changes: 1 });

    const result = await orderService.updateStatus('order-1', PurchaseOrderStatus.CONFIRMED);
    
    expect(result.success).toBe(true);
  });

  it('应该处理数据库错误', async () => {
    mockDb.query.mockImplementation(() => {
      throw new Error('Database connection failed');
    });

    const result = await orderService.getPurchaseOrders();
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});