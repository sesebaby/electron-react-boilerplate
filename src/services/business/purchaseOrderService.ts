import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, OrderItemStatus } from '../../types/entities';
import { PurchaseOrderSchema, PurchaseOrderItemSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import supplierService from './supplierService';
import productService from './productService';

export class PurchaseOrderService {
  private orders: Map<string, PurchaseOrder> = new Map();
  private orderItems: Map<string, PurchaseOrderItem> = new Map();
  private orderNoIndex: Map<string, string> = new Map(); // OrderNo -> ID mapping
  private orderItemsByOrder: Map<string, string[]> = new Map(); // OrderID -> ItemIDs

  async initialize(): Promise<void> {
    console.log('Purchase order service initialized');
    
    // 创建默认采购订单用于演示
    if (this.orders.size === 0) {
      await this.createDefaultOrders();
    }
  }

  private async createDefaultOrders(): Promise<void> {
    try {
      const suppliers = await supplierService.findAll();
      const products = await productService.findAll();
      
      if (suppliers.length === 0 || products.length === 0) {
        console.log('No suppliers or products found, skipping default orders creation');
        return;
      }

      const defaultOrders = [
        {
          supplierId: suppliers[0].id,
          orderDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
          expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
          status: PurchaseOrderStatus.CONFIRMED,
          discountAmount: 0,
          taxAmount: 0,
          remark: '示例采购订单A',
          creator: '系统管理员',
          items: [
            {
              productId: products[0]?.id,
              quantity: 100,
              unitPrice: 50.00,
              discountRate: 0,
              receivedQuantity: 60
            },
            {
              productId: products[1]?.id,
              quantity: 50,
              unitPrice: 120.00,
              discountRate: 0.05,
              receivedQuantity: 0
            }
          ]
        },
        {
          supplierId: suppliers[1]?.id || suppliers[0].id,
          orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
          expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
          status: PurchaseOrderStatus.DRAFT,
          discountAmount: 100,
          taxAmount: 0,
          remark: '示例采购订单B',
          creator: '采购员',
          items: [
            {
              productId: products[2]?.id || products[0].id,
              quantity: 200,
              unitPrice: 25.00,
              discountRate: 0,
              receivedQuantity: 0
            }
          ]
        }
      ];

      for (const orderData of defaultOrders) {
        try {
          const { items, ...orderInfo } = orderData;
          const order = await this.create(orderInfo);
          
          // 添加订单项目
          for (const itemData of items) {
            if (itemData.productId) {
              await this.addOrderItem(order.id, itemData);
            }
          }
        } catch (error) {
          console.warn('Failed to create default purchase order:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to create default purchase orders:', error);
    }
  }

  async findAll(): Promise<PurchaseOrder[]> {
    const orders = Array.from(this.orders.values());
    
    // 加载关联数据
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    
    await this.loadOrderRelations(order);
    return order;
  }

  async findByOrderNo(orderNo: string): Promise<PurchaseOrder | null> {
    const id = this.orderNoIndex.get(orderNo);
    return id ? this.findById(id) : null;
  }

  async findBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.supplierId === supplierId
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findByStatus(status: PurchaseOrderStatus): Promise<PurchaseOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.status === status
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<PurchaseOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.orderDate >= startDate && order.orderDate <= endDate
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async create(data: Omit<PurchaseOrder, 'id' | 'orderNo' | 'totalAmount' | 'finalAmount' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrder> {
    // 验证供应商是否存在
    const supplier = await supplierService.findById(data.supplierId);
    if (!supplier) {
      throw new Error(`供应商不存在: ${data.supplierId}`);
    }

    // 生成订单号
    const orderNo = await this.generateOrderNo();

    const order: PurchaseOrder = {
      ...data,
      id: uuidv4(),
      orderNo,
      totalAmount: 0,
      finalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(PurchaseOrderSchema, order);
    if (!validation.success) {
      throw new Error(`采购订单数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orders.set(order.id, order);
    this.orderNoIndex.set(order.orderNo, order.id);
    this.orderItemsByOrder.set(order.id, []);

    return order;
  }

  async update(id: string, data: Partial<Omit<PurchaseOrder, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>>): Promise<PurchaseOrder> {
    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`采购订单不存在: ${id}`);
    }

    const updatedOrder: PurchaseOrder = {
      ...existingOrder,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(PurchaseOrderSchema, updatedOrder);
    if (!validation.success) {
      throw new Error(`采购订单数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async delete(id: string): Promise<boolean> {
    const order = this.orders.get(id);
    if (!order) {
      return false;
    }

    // 删除订单项目
    const itemIds = this.orderItemsByOrder.get(id) || [];
    for (const itemId of itemIds) {
      this.orderItems.delete(itemId);
    }

    this.orders.delete(id);
    this.orderNoIndex.delete(order.orderNo);
    this.orderItemsByOrder.delete(id);
    return true;
  }

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder> {
    return this.update(id, { status });
  }

  // =============== 订单项目管理 ===============

  async addOrderItem(orderId: string, data: Omit<PurchaseOrderItem, 'id' | 'orderId' | 'amount' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PurchaseOrderItem> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`采购订单不存在: ${orderId}`);
    }

    // 验证产品是否存在
    const product = await productService.findById(data.productId);
    if (!product) {
      throw new Error(`产品不存在: ${data.productId}`);
    }

    // 计算金额
    const amount = data.quantity * data.unitPrice * (1 - data.discountRate);
    
    // 确定项目状态
    let status = OrderItemStatus.PENDING;
    if (data.receivedQuantity > 0) {
      status = data.receivedQuantity >= data.quantity 
        ? OrderItemStatus.COMPLETED 
        : OrderItemStatus.PARTIAL;
    }

    const orderItem: PurchaseOrderItem = {
      ...data,
      id: uuidv4(),
      orderId,
      amount,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(PurchaseOrderItemSchema, orderItem);
    if (!validation.success) {
      throw new Error(`订单项目数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orderItems.set(orderItem.id, orderItem);
    
    const orderItemIds = this.orderItemsByOrder.get(orderId) || [];
    orderItemIds.push(orderItem.id);
    this.orderItemsByOrder.set(orderId, orderItemIds);

    // 重新计算订单总额
    await this.recalculateOrderTotals(orderId);

    return orderItem;
  }

  async updateOrderItem(itemId: string, data: Partial<Omit<PurchaseOrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>): Promise<PurchaseOrderItem> {
    const existingItem = this.orderItems.get(itemId);
    if (!existingItem) {
      throw new Error(`订单项目不存在: ${itemId}`);
    }

    // 重新计算金额和状态
    const quantity = data.quantity !== undefined ? data.quantity : existingItem.quantity;
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : existingItem.unitPrice;
    const discountRate = data.discountRate !== undefined ? data.discountRate : existingItem.discountRate;
    const receivedQuantity = data.receivedQuantity !== undefined ? data.receivedQuantity : existingItem.receivedQuantity;
    
    const amount = quantity * unitPrice * (1 - discountRate);
    
    let status = OrderItemStatus.PENDING;
    if (receivedQuantity > 0) {
      status = receivedQuantity >= quantity 
        ? OrderItemStatus.COMPLETED 
        : OrderItemStatus.PARTIAL;
    }

    const updatedItem: PurchaseOrderItem = {
      ...existingItem,
      ...data,
      amount,
      status,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(PurchaseOrderItemSchema, updatedItem);
    if (!validation.success) {
      throw new Error(`订单项目数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orderItems.set(itemId, updatedItem);

    // 重新计算订单总额
    await this.recalculateOrderTotals(existingItem.orderId);

    return updatedItem;
  }

  async removeOrderItem(itemId: string): Promise<boolean> {
    const item = this.orderItems.get(itemId);
    if (!item) {
      return false;
    }

    const orderId = item.orderId;
    this.orderItems.delete(itemId);

    const orderItemIds = this.orderItemsByOrder.get(orderId) || [];
    const updatedItemIds = orderItemIds.filter(id => id !== itemId);
    this.orderItemsByOrder.set(orderId, updatedItemIds);

    // 重新计算订单总额
    await this.recalculateOrderTotals(orderId);

    return true;
  }

  async getOrderItems(orderId: string): Promise<PurchaseOrderItem[]> {
    const itemIds = this.orderItemsByOrder.get(orderId) || [];
    const items = itemIds.map(id => this.orderItems.get(id)!).filter(Boolean);
    
    // 加载关联数据
    for (const item of items) {
      await this.loadOrderItemRelations(item);
    }
    
    return items;
  }

  // =============== 私有方法 ===============

  private async loadOrderRelations(order: PurchaseOrder): Promise<void> {
    // 加载供应商信息
    order.supplier = await supplierService.findById(order.supplierId) || undefined;
    
    // 加载订单项目
    order.items = await this.getOrderItems(order.id);
  }

  private async loadOrderItemRelations(item: PurchaseOrderItem): Promise<void> {
    // 加载产品信息
    item.product = await productService.findById(item.productId) || undefined;
  }

  private async recalculateOrderTotals(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    const items = await this.getOrderItems(orderId);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const finalAmount = totalAmount - order.discountAmount + order.taxAmount;

    await this.update(orderId, {
      totalAmount,
      finalAmount
    });
  }

  private async generateOrderNo(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = String(this.orders.size + 1).padStart(4, '0');
    return `PO${dateStr}${sequence}`;
  }

  // =============== 统计和报表方法 ===============

  async getOrderStats(): Promise<{
    total: number;
    byStatus: Record<PurchaseOrderStatus, number>;
    totalValue: number;
    averageOrderValue: number;
    pendingOrders: number;
    overdueOrders: number;
  }> {
    const orders = await this.findAll();
    const byStatus: Record<PurchaseOrderStatus, number> = {
      [PurchaseOrderStatus.DRAFT]: 0,
      [PurchaseOrderStatus.CONFIRMED]: 0,
      [PurchaseOrderStatus.PARTIAL]: 0,
      [PurchaseOrderStatus.COMPLETED]: 0,
      [PurchaseOrderStatus.CANCELLED]: 0
    };

    let totalValue = 0;
    let pendingOrders = 0;
    let overdueOrders = 0;
    const now = new Date();

    orders.forEach(order => {
      byStatus[order.status]++;
      totalValue += order.finalAmount;
      
      if (order.status === PurchaseOrderStatus.CONFIRMED || order.status === PurchaseOrderStatus.PARTIAL) {
        pendingOrders++;
        if (order.expectedDate && order.expectedDate < now) {
          overdueOrders++;
        }
      }
    });

    return {
      total: orders.length,
      byStatus,
      totalValue,
      averageOrderValue: orders.length > 0 ? totalValue / orders.length : 0,
      pendingOrders,
      overdueOrders
    };
  }

  async getTopSuppliersByOrderValue(limit: number = 10): Promise<Array<{
    supplier: any;
    orderCount: number;
    totalValue: number;
    averageOrderValue: number;
  }>> {
    const orders = await this.findAll();
    const supplierStats = new Map<string, {
      supplier: any;
      orderCount: number;
      totalValue: number;
    }>();

    orders.forEach(order => {
      if (order.supplier) {
        const existing = supplierStats.get(order.supplierId) || {
          supplier: order.supplier,
          orderCount: 0,
          totalValue: 0
        };
        
        existing.orderCount++;
        existing.totalValue += order.finalAmount;
        supplierStats.set(order.supplierId, existing);
      }
    });

    return Array.from(supplierStats.values())
      .map(stat => ({
        ...stat,
        averageOrderValue: stat.orderCount > 0 ? stat.totalValue / stat.orderCount : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  async getOrdersByMonth(year: number): Promise<Array<{
    month: number;
    orderCount: number;
    totalValue: number;
  }>> {
    const orders = await this.findAll();
    const monthlyStats = new Array(12).fill(null).map((_, index) => ({
      month: index + 1,
      orderCount: 0,
      totalValue: 0
    }));

    orders.forEach(order => {
      const orderYear = order.orderDate.getFullYear();
      if (orderYear === year) {
        const month = order.orderDate.getMonth();
        monthlyStats[month].orderCount++;
        monthlyStats[month].totalValue += order.finalAmount;
      }
    });

    return monthlyStats;
  }

  async search(searchTerm: string): Promise<PurchaseOrder[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    const orders = await this.findAll();
    
    return orders.filter(order =>
      order.orderNo.toLowerCase().includes(term) ||
      order.supplier?.name.toLowerCase().includes(term) ||
      order.supplier?.code.toLowerCase().includes(term) ||
      order.creator.toLowerCase().includes(term) ||
      (order.remark && order.remark.toLowerCase().includes(term))
    );
  }
}

export default new PurchaseOrderService();