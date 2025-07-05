import { SalesOrder, SalesOrderItem, SalesOrderStatus, PaymentStatus, OrderItemStatus } from '../../types/entities';
import { SalesOrderSchema, SalesOrderItemSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import customerService from './customerService';
import productService from './productService';
import { logger } from '../../utils/secureLogger';
import userService from './userService';

export class SalesOrderService {
  private orders: Map<string, SalesOrder> = new Map();
  private orderItems: Map<string, SalesOrderItem> = new Map();
  private orderNoIndex: Map<string, string> = new Map(); // OrderNo -> ID mapping
  private orderItemsByOrder: Map<string, string[]> = new Map(); // OrderID -> ItemIDs

  async initialize(): Promise<void> {
    logger.info('Sales order service initialized');
    
    // 创建默认销售订单用于演示
    if (this.orders.size === 0) {
      await this.createDefaultOrders();
    }
  }

  private async createDefaultOrders(): Promise<void> {
    try {
      const customers = await customerService.findAll();
      const products = await productService.findAll();
      
      if (customers.length === 0 || products.length === 0) {
        console.log('No customers or products found, skipping default sales orders creation');
        return;
      }

      const defaultOrders = [
        {
          customerId: customers[0].id,
          orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
          deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2天后
          status: SalesOrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PARTIAL,
          discountAmount: 50,
          taxAmount: 0,
          remark: '示例销售订单A',
          creator: '销售员',
          items: [
            {
              productId: products[0]?.id,
              quantity: 20,
              unitPrice: 55.00,
              discountRate: 0,
              deliveredQuantity: 10
            },
            {
              productId: products[1]?.id,
              quantity: 15,
              unitPrice: 125.00,
              discountRate: 0.03,
              deliveredQuantity: 0
            }
          ]
        },
        {
          customerId: customers[1]?.id || customers[0].id,
          orderDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
          deliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
          status: SalesOrderStatus.DRAFT,
          paymentStatus: PaymentStatus.UNPAID,
          discountAmount: 0,
          taxAmount: 80,
          remark: '示例销售订单B',
          creator: '销售主管',
          items: [
            {
              productId: products[2]?.id || products[0].id,
              quantity: 50,
              unitPrice: 28.00,
              discountRate: 0,
              deliveredQuantity: 0
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
          console.warn('Failed to create default sales order:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to create default sales orders:', error);
    }
  }

  async findAll(): Promise<SalesOrder[]> {
    const orders = Array.from(this.orders.values());
    
    // 加载关联数据
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findById(id: string): Promise<SalesOrder | null> {
    const order = this.orders.get(id);
    if (!order) return null;
    
    await this.loadOrderRelations(order);
    return order;
  }

  async findByOrderNo(orderNo: string): Promise<SalesOrder | null> {
    const id = this.orderNoIndex.get(orderNo);
    return id ? this.findById(id) : null;
  }

  async findByCustomer(customerId: string): Promise<SalesOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.customerId === customerId
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findByStatus(status: SalesOrderStatus): Promise<SalesOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.status === status
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<SalesOrder[]> {
    const orders = Array.from(this.orders.values()).filter(
      order => order.orderDate >= startDate && order.orderDate <= endDate
    );
    
    for (const order of orders) {
      await this.loadOrderRelations(order);
    }
    
    return orders;
  }

  async create(data: Omit<SalesOrder, 'id' | 'orderNo' | 'totalAmount' | 'finalAmount' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<SalesOrder> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized sales order creation attempt', { userId: currentUserId });
        throw new Error('无权限创建销售订单');
      }
    }

    // 验证客户是否存在
    const customer = await customerService.findById(data.customerId);
    if (!customer) {
      throw new Error(`客户不存在: ${data.customerId}`);
    }

    // 生成订单号
    const orderNo = await this.generateOrderNo();

    const order: SalesOrder = {
      ...data,
      id: uuidv4(),
      orderNo,
      totalAmount: 0,
      finalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(SalesOrderSchema, order);
    if (!validation.success) {
      throw new Error(`销售订单数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orders.set(order.id, order);
    this.orderNoIndex.set(order.orderNo, order.id);
    this.orderItemsByOrder.set(order.id, []);

    return order;
  }

  async update(id: string, data: Partial<Omit<SalesOrder, 'id' | 'orderNo' | 'createdAt' | 'updatedAt'>>, currentUserId?: string): Promise<SalesOrder> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized sales order update attempt', { userId: currentUserId, orderId: id });
        throw new Error('无权限修改销售订单');
      }
    }

    const existingOrder = this.orders.get(id);
    if (!existingOrder) {
      throw new Error(`销售订单不存在: ${id}`);
    }

    const updatedOrder: SalesOrder = {
      ...existingOrder,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(SalesOrderSchema, updatedOrder);
    if (!validation.success) {
      throw new Error(`销售订单数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async delete(id: string, currentUserId?: string): Promise<boolean> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized sales order deletion attempt', { userId: currentUserId, orderId: id });
        throw new Error('无权限删除销售订单');
      }
    }

    const order = this.orders.get(id);
    if (!order) {
      logger.warn('Delete failed: Sales order not found', { orderId: id, userId: currentUserId });
      return false;
    }

    // 业务逻辑验证 - 检查订单是否可以删除
    await this.validateOrderDeletion(order, currentUserId);

    // 删除订单项目
    const itemIds = this.orderItemsByOrder.get(id) || [];
    for (const itemId of itemIds) {
      this.orderItems.delete(itemId);
    }

    this.orders.delete(id);
    this.orderNoIndex.delete(order.orderNo);
    this.orderItemsByOrder.delete(id);
    
    logger.audit('delete', 'sales_order', { 
      orderId: id, 
      orderNo: order.orderNo,
      status: order.status,
      totalAmount: order.finalAmount,
      userId: currentUserId 
    });
    
    return true;
  }

  // 验证订单是否可以删除
  private async validateOrderDeletion(order: SalesOrder, currentUserId?: string): Promise<void> {
    // 不能删除已确认及以后状态的订单
    const undeletableStatuses = [
      SalesOrderStatus.CONFIRMED,
      SalesOrderStatus.SHIPPED,
      SalesOrderStatus.COMPLETED
    ];

    if (undeletableStatuses.includes(order.status)) {
      logger.security('Attempted to delete confirmed/completed order', {
        orderId: order.id,
        orderNo: order.orderNo,
        status: order.status,
        userId: currentUserId
      });
      throw new Error(
        `无法删除${this.getStatusDisplayName(order.status)}状态的订单。` +
        `只有草稿状态的订单才能被删除。`
      );
    }

    // 检查支付状态 - 已付款的订单不能删除
    if (order.paymentStatus === PaymentStatus.PAID) {
      logger.security('Attempted to delete paid order', {
        orderId: order.id,
        orderNo: order.orderNo,
        paymentStatus: order.paymentStatus,
        userId: currentUserId
      });
      throw new Error('无法删除已付款的订单。请先处理退款或联系财务部门。');
    }

    // 部分付款的订单需要特殊权限才能删除
    if (order.paymentStatus === PaymentStatus.PARTIAL) {
      logger.security('Attempted to delete partially paid order', {
        orderId: order.id,
        orderNo: order.orderNo,
        paymentStatus: order.paymentStatus,
        userId: currentUserId
      });
      throw new Error('无法删除部分付款的订单。请先处理退款或联系管理员。');
    }
  }

  async updateStatus(id: string, status: SalesOrderStatus, currentUserId?: string): Promise<SalesOrder> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`销售订单不存在: ${id}`);
    }

    // 状态机验证 - 检查状态转换是否合法
    await this.validateStatusTransition(order, status, currentUserId);

    const updatedOrder = await this.update(id, { status });
    
    logger.audit('status_change', 'sales_order', {
      orderId: id,
      orderNo: order.orderNo,
      fromStatus: order.status,
      toStatus: status,
      userId: currentUserId
    });

    return updatedOrder;
  }

  // 状态机验证 - 定义允许的状态转换
  private async validateStatusTransition(
    order: SalesOrder, 
    newStatus: SalesOrderStatus, 
    currentUserId?: string
  ): Promise<void> {
    const currentStatus = order.status;
    
    // 如果状态没有变化，直接返回
    if (currentStatus === newStatus) {
      return;
    }

    // 定义状态转换规则
    const allowedTransitions: Record<SalesOrderStatus, SalesOrderStatus[]> = {
      [SalesOrderStatus.DRAFT]: [
        SalesOrderStatus.CONFIRMED,
        SalesOrderStatus.CANCELLED
      ],
      [SalesOrderStatus.CONFIRMED]: [
        SalesOrderStatus.SHIPPED,
        SalesOrderStatus.CANCELLED,
        SalesOrderStatus.DRAFT // 允许回退到草稿（管理员权限）
      ],
      [SalesOrderStatus.SHIPPED]: [
        SalesOrderStatus.COMPLETED,
        SalesOrderStatus.CANCELLED // 特殊情况下可以取消
      ],
      [SalesOrderStatus.COMPLETED]: [
        // 已完成的订单一般不允许状态变更
        // 除非有特殊的管理员权限
      ],
      [SalesOrderStatus.CANCELLED]: [
        SalesOrderStatus.DRAFT // 取消的订单可以重新激活为草稿
      ]
    };

    const allowedStatuses = allowedTransitions[currentStatus] || [];
    
    if (!allowedStatuses.includes(newStatus)) {
      logger.security('Invalid status transition attempted', {
        orderId: order.id,
        orderNo: order.orderNo,
        fromStatus: currentStatus,
        toStatus: newStatus,
        userId: currentUserId
      });
      
      throw new Error(
        `不允许的状态转换：无法将订单从"${this.getStatusDisplayName(currentStatus)}"` +
        `变更为"${this.getStatusDisplayName(newStatus)}"。` +
        `请按照正确的业务流程进行操作。`
      );
    }

    // 额外的业务规则验证
    await this.validateBusinessRules(order, newStatus, currentUserId);
  }

  // 业务规则验证
  private async validateBusinessRules(
    order: SalesOrder,
    newStatus: SalesOrderStatus,
    currentUserId?: string
  ): Promise<void> {
    // 规则1: 确认订单时必须有订单项目
    if (newStatus === SalesOrderStatus.CONFIRMED) {
      const orderItems = this.orderItemsByOrder.get(order.id) || [];
      if (orderItems.length === 0) {
        throw new Error('无法确认订单：订单必须包含至少一个商品。');
      }
    }

    // 规则2: 发货时检查库存
    if (newStatus === SalesOrderStatus.SHIPPED) {
      // 这里应该检查库存是否足够
      // 目前作为占位符
    }

    // 规则3: 完成订单时检查支付状态
    if (newStatus === SalesOrderStatus.COMPLETED) {
      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new Error('无法完成订单：订单必须已完成付款。');
      }
    }

    // 规则4: 某些状态变更需要特殊权限
    const restrictedTransitions = [
      { from: SalesOrderStatus.COMPLETED, to: SalesOrderStatus.DRAFT },
      { from: SalesOrderStatus.CONFIRMED, to: SalesOrderStatus.DRAFT }
    ];

    const isRestrictedTransition = restrictedTransitions.some(
      t => t.from === order.status && t.to === newStatus
    );

    if (isRestrictedTransition) {
      // 这里应该检查用户权限
      logger.security('Restricted status transition attempted', {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: newStatus,
        userId: currentUserId
      });
      throw new Error('此状态变更需要管理员权限。请联系系统管理员。');
    }
  }

  // 获取状态显示名称
  private getStatusDisplayName(status: SalesOrderStatus): string {
    const statusNames: Record<SalesOrderStatus, string> = {
      [SalesOrderStatus.DRAFT]: '草稿',
      [SalesOrderStatus.CONFIRMED]: '已确认',
      [SalesOrderStatus.SHIPPED]: '已发货',
      [SalesOrderStatus.COMPLETED]: '已完成',
      [SalesOrderStatus.CANCELLED]: '已取消'
    };
    return statusNames[status] || status;
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<SalesOrder> {
    return this.update(id, { paymentStatus });
  }

  // =============== 订单项目管理 ===============

  async addOrderItem(orderId: string, data: Omit<SalesOrderItem, 'id' | 'orderId' | 'amount' | 'status' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<SalesOrderItem> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized order item addition attempt', { userId: currentUserId, orderId });
        throw new Error('无权限添加订单项目');
      }
    }

    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`销售订单不存在: ${orderId}`);
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
    if (data.deliveredQuantity > 0) {
      status = data.deliveredQuantity >= data.quantity 
        ? OrderItemStatus.COMPLETED 
        : OrderItemStatus.PARTIAL;
    }

    const orderItem: SalesOrderItem = {
      ...data,
      id: uuidv4(),
      orderId,
      amount,
      status,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(SalesOrderItemSchema, orderItem);
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

  async updateOrderItem(itemId: string, data: Partial<Omit<SalesOrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>>, currentUserId?: string): Promise<SalesOrderItem> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized order item update attempt', { userId: currentUserId, itemId });
        throw new Error('无权限修改订单项目');
      }
    }

    const existingItem = this.orderItems.get(itemId);
    if (!existingItem) {
      throw new Error(`订单项目不存在: ${itemId}`);
    }

    // 重新计算金额和状态
    const quantity = data.quantity !== undefined ? data.quantity : existingItem.quantity;
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : existingItem.unitPrice;
    const discountRate = data.discountRate !== undefined ? data.discountRate : existingItem.discountRate;
    const deliveredQuantity = data.deliveredQuantity !== undefined ? data.deliveredQuantity : existingItem.deliveredQuantity;
    
    const amount = quantity * unitPrice * (1 - discountRate);
    
    let status = OrderItemStatus.PENDING;
    if (deliveredQuantity > 0) {
      status = deliveredQuantity >= quantity 
        ? OrderItemStatus.COMPLETED 
        : OrderItemStatus.PARTIAL;
    }

    const updatedItem: SalesOrderItem = {
      ...existingItem,
      ...data,
      amount,
      status,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(SalesOrderItemSchema, updatedItem);
    if (!validation.success) {
      throw new Error(`订单项目数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.orderItems.set(itemId, updatedItem);

    // 重新计算订单总额
    await this.recalculateOrderTotals(existingItem.orderId);

    return updatedItem;
  }

  async removeOrderItem(itemId: string, currentUserId?: string): Promise<boolean> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'sales-orders.write');
      if (!hasPermission) {
        logger.security('Unauthorized order item removal attempt', { userId: currentUserId, itemId });
        throw new Error('无权限删除订单项目');
      }
    }

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

  async getOrderItems(orderId: string): Promise<SalesOrderItem[]> {
    const itemIds = this.orderItemsByOrder.get(orderId) || [];
    const items = itemIds.map(id => this.orderItems.get(id)!).filter(Boolean);
    
    // 加载关联数据
    for (const item of items) {
      await this.loadOrderItemRelations(item);
    }
    
    return items;
  }

  // =============== 私有方法 ===============

  private async loadOrderRelations(order: SalesOrder): Promise<void> {
    // 加载客户信息
    order.customer = await customerService.findById(order.customerId) || undefined;
    
    // 加载订单项目
    order.items = await this.getOrderItems(order.id);
  }

  private async loadOrderItemRelations(item: SalesOrderItem): Promise<void> {
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
    return `SO${dateStr}${sequence}`;
  }

  // =============== 统计和报表方法 ===============

  async getOrderStats(): Promise<{
    total: number;
    byStatus: Record<SalesOrderStatus, number>;
    byPaymentStatus: Record<PaymentStatus, number>;
    totalValue: number;
    averageOrderValue: number;
    pendingOrders: number;
    overdueOrders: number;
  }> {
    const orders = await this.findAll();
    const byStatus: Record<SalesOrderStatus, number> = {
      [SalesOrderStatus.DRAFT]: 0,
      [SalesOrderStatus.CONFIRMED]: 0,
      [SalesOrderStatus.SHIPPED]: 0,
      [SalesOrderStatus.COMPLETED]: 0,
      [SalesOrderStatus.CANCELLED]: 0
    };

    const byPaymentStatus: Record<PaymentStatus, number> = {
      [PaymentStatus.UNPAID]: 0,
      [PaymentStatus.PARTIAL]: 0,
      [PaymentStatus.PAID]: 0
    };

    let totalValue = 0;
    let pendingOrders = 0;
    let overdueOrders = 0;
    const now = new Date();

    orders.forEach(order => {
      byStatus[order.status]++;
      byPaymentStatus[order.paymentStatus]++;
      totalValue += order.finalAmount;
      
      if (order.status === SalesOrderStatus.CONFIRMED || order.status === SalesOrderStatus.SHIPPED) {
        pendingOrders++;
        if (order.deliveryDate && order.deliveryDate < now) {
          overdueOrders++;
        }
      }
    });

    return {
      total: orders.length,
      byStatus,
      byPaymentStatus,
      totalValue,
      averageOrderValue: orders.length > 0 ? totalValue / orders.length : 0,
      pendingOrders,
      overdueOrders
    };
  }

  async getTopCustomersByOrderValue(limit: number = 10): Promise<Array<{
    customer: any;
    orderCount: number;
    totalValue: number;
    averageOrderValue: number;
  }>> {
    const orders = await this.findAll();
    const customerStats = new Map<string, {
      customer: any;
      orderCount: number;
      totalValue: number;
    }>();

    orders.forEach(order => {
      if (order.customer) {
        const existing = customerStats.get(order.customerId) || {
          customer: order.customer,
          orderCount: 0,
          totalValue: 0
        };
        
        existing.orderCount++;
        existing.totalValue += order.finalAmount;
        customerStats.set(order.customerId, existing);
      }
    });

    return Array.from(customerStats.values())
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

  async search(searchTerm: string): Promise<SalesOrder[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    const orders = await this.findAll();
    
    return orders.filter(order =>
      order.orderNo.toLowerCase().includes(term) ||
      order.customer?.name.toLowerCase().includes(term) ||
      order.customer?.code.toLowerCase().includes(term) ||
      order.creator.toLowerCase().includes(term) ||
      (order.remark && order.remark.toLowerCase().includes(term))
    );
  }

  async getPendingDeliveriesForOrder(orderId: string): Promise<{
    orderItems: any[];
    canDeliver: boolean;
  }> {
    const order = await this.findById(orderId);
    if (!order || !order.items) {
      return { orderItems: [], canDeliver: false };
    }

    const orderItems = order.items.map(item => ({
      ...item,
      pendingQuantity: item.quantity - item.deliveredQuantity,
      canDeliver: item.quantity > item.deliveredQuantity
    }));

    const canDeliver = orderItems.some(item => item.canDeliver);

    return { orderItems, canDeliver };
  }
}

export default new SalesOrderService();