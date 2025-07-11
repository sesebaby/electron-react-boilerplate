/**
 * OrderService 场景驱动测试
 * 测试场景：采购和销售订单完整流程
 */

import { OrderService } from '../OrderService';
import { DatabaseManager } from '../database';
import { 
  PurchaseOrder, 
  PurchaseOrderStatus, 
  SalesOrder, 
  SalesOrderStatus,
  PaymentStatus,
  Supplier,
  Customer
} from '../../../types/entities';
import { ValidationError, BusinessError } from '../../../utils/errors';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('OrderService - 采购和销售订单完整流程', () => {
  let orderService: OrderService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      createPurchaseOrder: jest.fn(),
      updatePurchaseOrder: jest.fn(),
      getPurchaseOrder: jest.fn(),
      createSalesOrder: jest.fn(),
      updateSalesOrder: jest.fn(),
      getSalesOrder: jest.fn(),
      createSupplier: jest.fn(),
      createCustomer: jest.fn(),
      getSupplier: jest.fn(),
      getCustomer: jest.fn(),
      createPurchaseReceipt: jest.fn(),
      createSalesDelivery: jest.fn(),
      updateInventoryStock: jest.fn(),
      createInventoryTransaction: jest.fn(),
      query: jest.fn(),
      run: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
    orderService = new OrderService();
  });

  describe('场景1：采购订单完整流程', () => {
    it('应该完成从供应商创建到收货入库的完整采购流程', async () => {
      // 准备测试数据
      const supplier: Supplier = {
        id: 'sup-1',
        name: '北京科技公司',
        contactPerson: '张三',
        phone: '13800138000',
        email: 'zhangsan@company.com',
        address: '北京市朝阳区',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const purchaseOrder: PurchaseOrder = {
        id: 'po-1',
        orderNo: 'PO-2024-001',
        supplierId: 'sup-1',
        status: PurchaseOrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        orderDate: new Date(),
        expectedDate: new Date(),
        totalAmount: 10000,
        items: [{
          id: 'poi-1',
          purchaseOrderId: 'po-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 1000,
          totalPrice: 10000,
          receivedQuantity: 0,
          status: 'PENDING'
        }],
        creator: 'user-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock数据库响应
      mockDb.createSupplier.mockResolvedValue({ success: true, data: supplier });
      mockDb.getSupplier.mockResolvedValue({ success: true, data: supplier });
      mockDb.createPurchaseOrder.mockResolvedValue({ success: true, data: purchaseOrder });
      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: purchaseOrder });
      mockDb.updatePurchaseOrder.mockResolvedValue({ success: true });
      mockDb.createPurchaseReceipt.mockResolvedValue({ success: true });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });
      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.commit.mockResolvedValue({ success: true });

      // 1. 创建供应商
      const supplierResult = await orderService.createSupplier({
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address
      });
      expect(supplierResult.success).toBe(true);
      expect(mockDb.createSupplier).toHaveBeenCalledWith(expect.objectContaining({
        name: supplier.name,
        contactPerson: supplier.contactPerson
      }));

      // 2. 创建采购订单
      const orderResult = await orderService.createPurchaseOrder({
        supplierId: supplier.id,
        expectedDate: purchaseOrder.expectedDate,
        items: purchaseOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        creator: purchaseOrder.creator
      });
      expect(orderResult.success).toBe(true);
      expect(mockDb.createPurchaseOrder).toHaveBeenCalled();

      // 3. 审批订单
      const approveResult = await orderService.updatePurchaseOrderStatus(
        purchaseOrder.id,
        PurchaseOrderStatus.APPROVED,
        'user-manager'
      );
      expect(approveResult.success).toBe(true);
      expect(mockDb.updatePurchaseOrder).toHaveBeenCalledWith(
        purchaseOrder.id,
        expect.objectContaining({
          status: PurchaseOrderStatus.APPROVED
        })
      );

      // 4. 收货入库
      const receiptResult = await orderService.createPurchaseReceipt({
        purchaseOrderId: purchaseOrder.id,
        warehouseId: 'wh-1',
        items: [{
          purchaseOrderItemId: 'poi-1',
          receivedQuantity: 10,
          unitPrice: 1000
        }],
        receiver: 'user-warehouse'
      });
      expect(receiptResult.success).toBe(true);
      expect(mockDb.createPurchaseReceipt).toHaveBeenCalled();
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalled();
    });

    it('应该在供应商不存在时抛出ValidationError', async () => {
      mockDb.getSupplier.mockResolvedValue({ success: true, data: null });

      await expect(orderService.createPurchaseOrder({
        supplierId: 'non-exist-supplier',
        expectedDate: new Date(),
        items: [{
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 1000
        }],
        creator: 'user-1'
      })).rejects.toThrow(ValidationError);

      expect(mockDb.createPurchaseOrder).not.toHaveBeenCalled();
    });

    it('应该在超量收货时抛出BusinessError', async () => {
      const purchaseOrder: PurchaseOrder = {
        id: 'po-1',
        orderNo: 'PO-2024-001',
        supplierId: 'sup-1',
        status: PurchaseOrderStatus.APPROVED,
        paymentStatus: PaymentStatus.UNPAID,
        orderDate: new Date(),
        expectedDate: new Date(),
        totalAmount: 10000,
        items: [{
          id: 'poi-1',
          purchaseOrderId: 'po-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 1000,
          totalPrice: 10000,
          receivedQuantity: 5, // 已收货5个
          status: 'PARTIAL'
        }],
        creator: 'user-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: purchaseOrder });

      // 尝试收货10个（超过剩余数量5个）
      await expect(orderService.createPurchaseReceipt({
        purchaseOrderId: 'po-1',
        warehouseId: 'wh-1',
        items: [{
          purchaseOrderItemId: 'poi-1',
          receivedQuantity: 10, // 超量收货
          unitPrice: 1000
        }],
        receiver: 'user-warehouse'
      })).rejects.toThrow(BusinessError);

      expect(mockDb.createPurchaseReceipt).not.toHaveBeenCalled();
    });
  });

  describe('场景2：销售订单完整流程', () => {
    it('应该完成从客户创建到发货出库的完整销售流程', async () => {
      // 准备测试数据
      const customer: Customer = {
        id: 'cust-1',
        name: '上海贸易公司',
        contactPerson: '李四',
        phone: '13900139000',
        email: 'lisi@trade.com',
        address: '上海市浦东新区',
        creditLimit: 100000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const salesOrder: SalesOrder = {
        id: 'so-1',
        orderNo: 'SO-2024-001',
        customerId: 'cust-1',
        status: SalesOrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        orderDate: new Date(),
        deliveryDate: new Date(),
        totalAmount: 12000,
        items: [{
          id: 'soi-1',
          salesOrderId: 'so-1',
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 1200,
          totalPrice: 12000,
          deliveredQuantity: 0,
          status: 'PENDING'
        }],
        creator: 'user-sales',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock数据库响应
      mockDb.createCustomer.mockResolvedValue({ success: true, data: customer });
      mockDb.getCustomer.mockResolvedValue({ success: true, data: customer });
      mockDb.createSalesOrder.mockResolvedValue({ success: true, data: salesOrder });
      mockDb.getSalesOrder.mockResolvedValue({ success: true, data: salesOrder });
      mockDb.updateSalesOrder.mockResolvedValue({ success: true });
      mockDb.createSalesDelivery.mockResolvedValue({ success: true });
      mockDb.updateInventoryStock.mockResolvedValue({ success: true });
      mockDb.createInventoryTransaction.mockResolvedValue({ success: true });
      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.commit.mockResolvedValue({ success: true });

      // 1. 创建客户
      const customerResult = await orderService.createCustomer({
        name: customer.name,
        contactPerson: customer.contactPerson,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        creditLimit: customer.creditLimit
      });
      expect(customerResult.success).toBe(true);

      // 2. 创建销售订单
      const orderResult = await orderService.createSalesOrder({
        customerId: customer.id,
        deliveryDate: salesOrder.deliveryDate,
        items: salesOrder.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        creator: salesOrder.creator
      });
      expect(orderResult.success).toBe(true);

      // 3. 确认订单
      const confirmResult = await orderService.updateSalesOrderStatus(
        salesOrder.id,
        SalesOrderStatus.CONFIRMED,
        'user-manager'
      );
      expect(confirmResult.success).toBe(true);

      // 4. 发货出库
      const deliveryResult = await orderService.createSalesDelivery({
        salesOrderId: salesOrder.id,
        warehouseId: 'wh-1',
        items: [{
          salesOrderItemId: 'soi-1',
          deliveredQuantity: 10
        }],
        deliverer: 'user-warehouse'
      });
      expect(deliveryResult.success).toBe(true);
      expect(mockDb.createSalesDelivery).toHaveBeenCalled();
      expect(mockDb.updateInventoryStock).toHaveBeenCalled();
      expect(mockDb.createInventoryTransaction).toHaveBeenCalled();
    });

    it('应该在超过客户信用额度时抛出BusinessError', async () => {
      const customer: Customer = {
        id: 'cust-1',
        name: '小型贸易公司',
        contactPerson: '王五',
        phone: '13700137000',
        email: 'wangwu@small.com',
        address: '深圳市南山区',
        creditLimit: 10000, // 信用额度较低
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.getCustomer.mockResolvedValue({ success: true, data: customer });
      mockDb.query.mockResolvedValue({ 
        success: true, 
        data: [{ outstanding_amount: 8000 }] // 已有欠款8000
      });

      // 尝试创建超过信用额度的订单
      await expect(orderService.createSalesOrder({
        customerId: customer.id,
        deliveryDate: new Date(),
        items: [{
          productId: 'prod-1',
          quantity: 10,
          unitPrice: 500 // 总额5000，加上欠款8000超过信用额度10000
        }],
        creator: 'user-sales'
      })).rejects.toThrow(BusinessError);

      expect(mockDb.createSalesOrder).not.toHaveBeenCalled();
    });
  });

  describe('场景3：订单状态流转', () => {
    it('应该正确处理采购订单状态从待审批到完成的完整流转', async () => {
      const orderId = 'po-1';
      const mockOrder = {
        id: orderId,
        status: PurchaseOrderStatus.PENDING,
        items: [{ id: 'poi-1', quantity: 10, receivedQuantity: 0 }]
      };

      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: mockOrder });
      mockDb.updatePurchaseOrder.mockResolvedValue({ success: true });

      // 状态流转：PENDING → APPROVED → RECEIVING → COMPLETED
      const transitions = [
        { status: PurchaseOrderStatus.APPROVED, operator: 'manager' },
        { status: PurchaseOrderStatus.RECEIVING, operator: 'warehouse' },
        { status: PurchaseOrderStatus.COMPLETED, operator: 'system' }
      ];

      for (const transition of transitions) {
        const result = await orderService.updatePurchaseOrderStatus(
          orderId,
          transition.status,
          transition.operator
        );
        expect(result.success).toBe(true);
        expect(mockDb.updatePurchaseOrder).toHaveBeenCalledWith(
          orderId,
          expect.objectContaining({
            status: transition.status,
            updatedBy: transition.operator
          })
        );
      }
    });

    it('应该阻止无效的状态转换', async () => {
      const orderId = 'po-1';
      const mockOrder = {
        id: orderId,
        status: PurchaseOrderStatus.COMPLETED, // 已完成的订单
        items: []
      };

      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: mockOrder });

      // 尝试将已完成的订单改为待审批
      await expect(orderService.updatePurchaseOrderStatus(
        orderId,
        PurchaseOrderStatus.PENDING,
        'user'
      )).rejects.toThrow(BusinessError);

      expect(mockDb.updatePurchaseOrder).not.toHaveBeenCalled();
    });
  });

  describe('场景4：订单取消和退货处理', () => {
    it('应该正确处理订单取消流程', async () => {
      const orderId = 'po-1';
      const mockOrder = {
        id: orderId,
        status: PurchaseOrderStatus.APPROVED,
        items: [{ id: 'poi-1', quantity: 10, receivedQuantity: 0 }]
      };

      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: mockOrder });
      mockDb.updatePurchaseOrder.mockResolvedValue({ success: true });

      const result = await orderService.cancelPurchaseOrder(orderId, '供应商原因取消', 'user-manager');
      
      expect(result.success).toBe(true);
      expect(mockDb.updatePurchaseOrder).toHaveBeenCalledWith(
        orderId,
        expect.objectContaining({
          status: PurchaseOrderStatus.CANCELLED,
          cancelReason: '供应商原因取消',
          cancelledBy: 'user-manager'
        })
      );
    });

    it('应该阻止已开始收货的订单取消', async () => {
      const orderId = 'po-1';
      const mockOrder = {
        id: orderId,
        status: PurchaseOrderStatus.RECEIVING,
        items: [{ id: 'poi-1', quantity: 10, receivedQuantity: 5 }] // 已部分收货
      };

      mockDb.getPurchaseOrder.mockResolvedValue({ success: true, data: mockOrder });

      await expect(orderService.cancelPurchaseOrder(
        orderId, 
        '测试取消', 
        'user'
      )).rejects.toThrow(BusinessError);

      expect(mockDb.updatePurchaseOrder).not.toHaveBeenCalled();
    });
  });

  describe('场景5：并发订单处理', () => {
    it('应该正确处理并发的订单状态更新', async () => {
      const orderId = 'po-1';
      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.commit.mockResolvedValue({ success: true });
      mockDb.getPurchaseOrder.mockResolvedValue({
        success: true,
        data: { id: orderId, status: PurchaseOrderStatus.PENDING }
      });
      mockDb.updatePurchaseOrder.mockResolvedValue({ success: true });

      // 模拟并发状态更新
      const operations = [
        orderService.updatePurchaseOrderStatus(orderId, PurchaseOrderStatus.APPROVED, 'user1'),
        orderService.addPurchaseOrderNote(orderId, '备注1', 'user2')
      ];

      const results = await Promise.all(operations);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commit).toHaveBeenCalled();
    });
  });
});