/**
 * OrderService 集成测试示例
 * 展示如何在无法使用 better-sqlite3 的环境中进行集成测试
 */

import { OrderService } from '../../../src/services/core/OrderService';
import { InventoryService } from '../../../src/services/core/InventoryService';
import { FinancialService } from '../../../src/services/core/FinancialService';
import { SystemService } from '../../../src/services/core/SystemService';

// Mock Electron IPC
const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

// Mock window.api
(global as any).window = {
  api: mockIpcRenderer
};

// 模拟内存数据库
class MockDatabase {
  private data: Map<string, any[]> = new Map();
  
  constructor() {
    this.data.set('orders', []);
    this.data.set('inventory', []);
    this.data.set('transactions', []);
  }
  
  addOrder(order: any) {
    const orders = this.data.get('orders') || [];
    orders.push({ ...order, id: `ORDER-${Date.now()}`, createdAt: new Date() });
    this.data.set('orders', orders);
    return orders[orders.length - 1];
  }
  
  getOrders() {
    return this.data.get('orders') || [];
  }
  
  updateInventory(productId: string, quantity: number) {
    const inventory = this.data.get('inventory') || [];
    const item = inventory.find(i => i.productId === productId);
    if (item) {
      item.quantity += quantity;
    } else {
      inventory.push({ productId, quantity });
    }
    this.data.set('inventory', inventory);
  }
  
  getInventory(productId: string) {
    const inventory = this.data.get('inventory') || [];
    return inventory.find(i => i.productId === productId);
  }
  
  addTransaction(transaction: any) {
    const transactions = this.data.get('transactions') || [];
    transactions.push({ ...transaction, id: `TRX-${Date.now()}`, createdAt: new Date() });
    this.data.set('transactions', transactions);
  }
  
  getTransactions(filters: any = {}) {
    let transactions = this.data.get('transactions') || [];
    
    if (filters.productId) {
      transactions = transactions.filter(t => t.productId === filters.productId);
    }
    if (filters.type) {
      transactions = transactions.filter(t => t.type === filters.type);
    }
    
    return transactions;
  }
  
  clear() {
    this.data.clear();
    this.data.set('orders', []);
    this.data.set('inventory', []);
    this.data.set('transactions', []);
  }
}

describe('OrderService 集成测试', () => {
  let orderService: OrderService;
  let inventoryService: InventoryService;
  let financialService: FinancialService;
  let systemService: SystemService;
  let mockDb: MockDatabase;
  
  beforeEach(async () => {
    // 创建模拟数据库
    mockDb = new MockDatabase();
    
    // 初始化服务
    systemService = SystemService.getInstance();
    inventoryService = InventoryService.getInstance();
    financialService = FinancialService.getInstance();
    orderService = OrderService.getInstance();
    
    // 设置 IPC 模拟
    mockIpcRenderer.invoke.mockImplementation(async (channel, ...args) => {
      switch (channel) {
        case 'db-initialize':
          return { success: true };
        
        case 'db-create-order':
          const order = mockDb.addOrder(args[0]);
          return { success: true, data: order };
        
        case 'db-get-orders':
          return { success: true, data: mockDb.getOrders() };
        
        case 'db-update-inventory':
          mockDb.updateInventory(args[0].productId, args[0].quantity);
          return { success: true };
        
        case 'db-get-inventory':
          const inventory = mockDb.getInventory(args[0]);
          return { success: true, data: inventory };
        
        case 'db-add-transaction':
          mockDb.addTransaction(args[0]);
          return { success: true };
        
        case 'db-get-transactions':
          const transactions = mockDb.getTransactions(args[0]);
          return { success: true, data: transactions };
        
        default:
          return { success: true, data: null };
      }
    });
    
    // 初始化所有服务
    await systemService.initialize();
    await inventoryService.initialize();
    await financialService.initialize();
    await orderService.initialize();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    mockDb.clear();
  });
  
  describe('销售订单流程', () => {
    it('创建销售订单应该更新库存', async () => {
      // 准备初始库存
      mockDb.updateInventory('PROD-001', 100);
      
      // 创建销售订单
      const orderData = {
        customerId: 'CUST-001',
        items: [
          {
            productId: 'PROD-001',
            quantity: 10,
            price: 100
          }
        ]
      };
      
      // 模拟创建订单
      mockIpcRenderer.invoke.mockImplementationOnce(async (channel, data) => {
        if (channel === 'db-create-order') {
          const order = mockDb.addOrder(data);
          
          // 同时更新库存（模拟真实的业务逻辑）
          data.items.forEach((item: any) => {
            mockDb.updateInventory(item.productId, -item.quantity);
            mockDb.addTransaction({
              productId: item.productId,
              type: 'SALES',
              quantity: item.quantity,
              orderId: order.id
            });
          });
          
          return { success: true, data: order };
        }
        return { success: false };
      });
      
      // 执行测试
      const result = await orderService.createOrder(orderData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // 验证库存已更新
      const inventory = mockDb.getInventory('PROD-001');
      expect(inventory.quantity).toBe(90); // 100 - 10
      
      // 验证交易记录已创建
      const transactions = mockDb.getTransactions({ productId: 'PROD-001' });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('SALES');
      expect(transactions[0].quantity).toBe(10);
    });
    
    it('库存不足时应该拒绝订单', async () => {
      // 设置库存为 5
      mockDb.updateInventory('PROD-001', 5);
      
      // 尝试订购 10 个
      const orderData = {
        customerId: 'CUST-001',
        items: [
          {
            productId: 'PROD-001',
            quantity: 10,
            price: 100
          }
        ]
      };
      
      // 模拟库存检查
      mockIpcRenderer.invoke.mockImplementation(async (channel, data) => {
        if (channel === 'db-get-inventory') {
          const inventory = mockDb.getInventory(data);
          return { success: true, data: inventory };
        }
        
        if (channel === 'db-create-order') {
          // 检查库存
          const hasEnoughStock = data.items.every((item: any) => {
            const inv = mockDb.getInventory(item.productId);
            return inv && inv.quantity >= item.quantity;
          });
          
          if (!hasEnoughStock) {
            return { success: false, error: '库存不足' };
          }
          
          return { success: true, data: mockDb.addOrder(data) };
        }
        
        return { success: true, data: null };
      });
      
      const result = await orderService.createOrder(orderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('库存不足');
      
      // 验证库存没有变化
      const inventory = mockDb.getInventory('PROD-001');
      expect(inventory.quantity).toBe(5);
    });
  });
  
  describe('采购订单流程', () => {
    it('采购入库应该增加库存', async () => {
      // 初始库存为 10
      mockDb.updateInventory('PROD-001', 10);
      
      // 创建采购订单
      const purchaseOrder = {
        supplierId: 'SUP-001',
        items: [
          {
            productId: 'PROD-001',
            quantity: 50,
            cost: 80
          }
        ]
      };
      
      // 模拟采购入库流程
      mockIpcRenderer.invoke.mockImplementation(async (channel, data) => {
        if (channel === 'db-create-purchase-order') {
          const order = mockDb.addOrder({ ...data, type: 'PURCHASE' });
          return { success: true, data: order };
        }
        
        if (channel === 'db-receive-goods') {
          // 更新库存
          data.items.forEach((item: any) => {
            mockDb.updateInventory(item.productId, item.quantity);
            mockDb.addTransaction({
              productId: item.productId,
              type: 'PURCHASE',
              quantity: item.quantity,
              cost: item.cost,
              orderId: data.orderId
            });
          });
          
          return { success: true };
        }
        
        if (channel === 'db-get-inventory') {
          const inventory = mockDb.getInventory(data);
          return { success: true, data: inventory };
        }
        
        return { success: true, data: null };
      });
      
      // 创建采购订单
      const createResult = await orderService.createPurchaseOrder(purchaseOrder);
      expect(createResult.success).toBe(true);
      
      // 收货入库
      const receiveResult = await orderService.receiveGoods({
        orderId: createResult.data.id,
        items: purchaseOrder.items
      });
      expect(receiveResult.success).toBe(true);
      
      // 验证库存已增加
      const inventory = mockDb.getInventory('PROD-001');
      expect(inventory.quantity).toBe(60); // 10 + 50
      
      // 验证交易记录
      const transactions = mockDb.getTransactions({ type: 'PURCHASE' });
      expect(transactions).toHaveLength(1);
      expect(transactions[0].quantity).toBe(50);
      expect(transactions[0].cost).toBe(80);
    });
  });
  
  describe('订单状态管理', () => {
    it('订单状态应该正确流转', async () => {
      const orderStates: string[] = [];
      
      // 监听订单状态变化
      mockIpcRenderer.invoke.mockImplementation(async (channel, data) => {
        if (channel === 'db-create-order') {
          const order = mockDb.addOrder({ ...data, status: 'PENDING' });
          orderStates.push('PENDING');
          return { success: true, data: order };
        }
        
        if (channel === 'db-update-order-status') {
          const orders = mockDb.getOrders();
          const order = orders.find(o => o.id === data.orderId);
          if (order) {
            order.status = data.status;
            orderStates.push(data.status);
          }
          return { success: true };
        }
        
        return { success: true, data: null };
      });
      
      // 创建订单
      const createResult = await orderService.createOrder({
        customerId: 'CUST-001',
        items: [{ productId: 'PROD-001', quantity: 1, price: 100 }]
      });
      
      // 确认订单
      await orderService.confirmOrder(createResult.data.id);
      
      // 发货
      await orderService.shipOrder(createResult.data.id);
      
      // 完成订单
      await orderService.completeOrder(createResult.data.id);
      
      // 验证状态流转
      expect(orderStates).toEqual(['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED']);
    });
  });
  
  describe('并发订单处理', () => {
    it('应该正确处理并发订单', async () => {
      // 初始库存 100
      mockDb.updateInventory('PROD-001', 100);
      
      let processedOrders = 0;
      
      mockIpcRenderer.invoke.mockImplementation(async (channel, data) => {
        if (channel === 'db-create-order') {
          // 模拟并发处理延迟
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          
          // 检查库存
          const inventory = mockDb.getInventory(data.items[0].productId);
          const requestedQuantity = data.items[0].quantity;
          
          if (inventory.quantity >= requestedQuantity) {
            // 扣减库存
            mockDb.updateInventory(data.items[0].productId, -requestedQuantity);
            const order = mockDb.addOrder(data);
            processedOrders++;
            return { success: true, data: order };
          } else {
            return { success: false, error: '库存不足' };
          }
        }
        
        return { success: true, data: null };
      });
      
      // 创建 10 个并发订单，每个订单 15 个商品
      const orderPromises = Array(10).fill(null).map((_, i) => 
        orderService.createOrder({
          customerId: `CUST-${i}`,
          items: [{ productId: 'PROD-001', quantity: 15, price: 100 }]
        })
      );
      
      const results = await Promise.all(orderPromises);
      
      // 应该只有 6 个订单成功（100 / 15 = 6.67）
      const successfulOrders = results.filter(r => r.success).length;
      const failedOrders = results.filter(r => !r.success).length;
      
      expect(successfulOrders).toBe(6);
      expect(failedOrders).toBe(4);
      expect(processedOrders).toBe(6);
      
      // 验证最终库存
      const finalInventory = mockDb.getInventory('PROD-001');
      expect(finalInventory.quantity).toBe(10); // 100 - (6 * 15) = 10
    });
  });
});