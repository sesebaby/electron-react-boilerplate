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

    // Mock supplier exists - 这是关键的修复
    mockDb.getSupplier = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'supplier-1', name: 'Test Supplier', isActive: true }
    });

    // Mock product exists
    mockDb.getProduct = jest.fn().mockResolvedValue({
      success: true,
      data: { id: 'product-1', name: 'Test Product', isActive: true }
    });

    // Mock database operations
    mockDb.createPurchaseOrder = jest.fn().mockResolvedValue({ success: true });
    mockDb.createPurchaseOrderItem = jest.fn().mockResolvedValue({ success: true });
    mockDb.insertPurchaseOrderItem = jest.fn().mockResolvedValue({ success: true });
    mockDb.updatePurchaseOrder = jest.fn().mockResolvedValue({ success: true });

    const result = await orderService.createPurchaseOrder(orderData);

    // Debug the result
    if (!result.success) {
      console.log('Order creation failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(mockDb.getSupplier).toHaveBeenCalledWith('supplier-1');
  });

  it('应该能够获取采购订单列表', async () => {
    // Mock database query to return proper structure
    mockDb.query = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: '1',
          orderNo: 'PO-001',
          supplierId: 'supplier-1',
          status: PurchaseOrderStatus.DRAFT,
          finalAmount: 1000
        }
      ]
    });

    const result = await orderService.getPurchaseOrders();

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.items).toBeDefined();
    expect(Array.isArray(result.data.items)).toBe(true);
  });

  it('应该能够更新订单状态', async () => {
    // First create an order to update
    const orderId = 'order-1';
    const mockOrder = {
      id: orderId,
      orderNo: 'PO-001',
      supplierId: 'supplier-1',
      status: PurchaseOrderStatus.DRAFT,
      finalAmount: 1000
    };

    // Add order to service memory
    (orderService as any).purchaseOrders.set(orderId, mockOrder);

    // Mock database update
    mockDb.updatePurchaseOrder = jest.fn().mockResolvedValue({ success: true });

    const result = await orderService.updatePurchaseOrderStatus(orderId, PurchaseOrderStatus.CONFIRMED, 'test-user');

    expect(result.success).toBe(true);
  });

  it('应该处理数据库错误', async () => {
    // Mock database to throw error
    mockDb.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    const result = await orderService.getPurchaseOrders();

    expect(result.success).toBe(true); // OrderService handles errors gracefully and returns empty results
    expect(result.data).toBeDefined();
  });
});