import { SalesDelivery, SalesDeliveryItem, DeliveryStatus } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';
import salesOrderService from './salesOrderService';
import customerService from './customerService';
import warehouseService from './warehouseService';
import productService from './productService';
import inventoryStockService from './inventoryStockService';

export class SalesDeliveryService {
  private deliveries: Map<string, SalesDelivery> = new Map();
  private deliveryItems: Map<string, SalesDeliveryItem> = new Map();
  private deliveryNoIndex: Map<string, string> = new Map(); // DeliveryNo -> ID mapping
  private deliveryItemsByDelivery: Map<string, string[]> = new Map(); // DeliveryID -> ItemIDs

  async initialize(): Promise<void> {
    console.log('Sales delivery service initialized');
    
    // 创建默认销售出库单用于演示
    if (this.deliveries.size === 0) {
      await this.createDefaultDeliveries();
    }
  }

  private async createDefaultDeliveries(): Promise<void> {
    try {
      const orders = await salesOrderService.findAll();
      const warehouses = await warehouseService.findAll();
      
      if (orders.length === 0 || warehouses.length === 0) {
        console.log('No orders or warehouses found, skipping default deliveries creation');
        return;
      }

      // 找到已确认的订单
      const confirmedOrders = orders.filter(order => 
        order.status === 'confirmed' && order.items && order.items.length > 0
      );

      if (confirmedOrders.length === 0) {
        console.log('No confirmed orders found, skipping default deliveries creation');
        return;
      }

      const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
      
      const defaultDeliveries = [
        {
          orderId: confirmedOrders[0].id,
          customerId: confirmedOrders[0].customerId,
          warehouseId: defaultWarehouse.id,
          deliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
          status: DeliveryStatus.COMPLETED,
          deliveryPerson: '配送员张三',
          remark: '示例出库单A - 部分出库',
          partialDelivery: true
        }
      ];

      for (const deliveryData of defaultDeliveries) {
        try {
          const { partialDelivery, ...deliveryInfo } = deliveryData;
          const delivery = await this.create(deliveryInfo);
          
          // 添加出库项目（部分出库）
          const order = await salesOrderService.findById(deliveryData.orderId);
          if (order && order.items) {
            for (const orderItem of order.items) {
              const deliveryQuantity = partialDelivery ? Math.floor(orderItem.quantity * 0.5) : orderItem.quantity;
              if (deliveryQuantity > 0) {
                await this.addDeliveryItem(delivery.id, {
                  productId: orderItem.productId,
                  orderItemId: orderItem.id,
                  quantity: deliveryQuantity,
                  unitPrice: orderItem.unitPrice
                });
              }
            }
          }
        } catch (error) {
          console.warn('Failed to create default sales delivery:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to create default sales deliveries:', error);
    }
  }

  async findAll(): Promise<SalesDelivery[]> {
    const deliveries = Array.from(this.deliveries.values());
    
    // 加载关联数据
    for (const delivery of deliveries) {
      await this.loadDeliveryRelations(delivery);
    }
    
    return deliveries;
  }

  async findById(id: string): Promise<SalesDelivery | null> {
    const delivery = this.deliveries.get(id);
    if (!delivery) return null;
    
    await this.loadDeliveryRelations(delivery);
    return delivery;
  }

  async findByDeliveryNo(deliveryNo: string): Promise<SalesDelivery | null> {
    const id = this.deliveryNoIndex.get(deliveryNo);
    return id ? this.findById(id) : null;
  }

  async findByOrder(orderId: string): Promise<SalesDelivery[]> {
    const deliveries = Array.from(this.deliveries.values()).filter(
      delivery => delivery.orderId === orderId
    );
    
    for (const delivery of deliveries) {
      await this.loadDeliveryRelations(delivery);
    }
    
    return deliveries;
  }

  async findByCustomer(customerId: string): Promise<SalesDelivery[]> {
    const deliveries = Array.from(this.deliveries.values()).filter(
      delivery => delivery.customerId === customerId
    );
    
    for (const delivery of deliveries) {
      await this.loadDeliveryRelations(delivery);
    }
    
    return deliveries;
  }

  async findByWarehouse(warehouseId: string): Promise<SalesDelivery[]> {
    const deliveries = Array.from(this.deliveries.values()).filter(
      delivery => delivery.warehouseId === warehouseId
    );
    
    for (const delivery of deliveries) {
      await this.loadDeliveryRelations(delivery);
    }
    
    return deliveries;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<SalesDelivery[]> {
    const deliveries = Array.from(this.deliveries.values()).filter(
      delivery => delivery.deliveryDate >= startDate && delivery.deliveryDate <= endDate
    );
    
    for (const delivery of deliveries) {
      await this.loadDeliveryRelations(delivery);
    }
    
    return deliveries;
  }

  async create(data: Omit<SalesDelivery, 'id' | 'deliveryNo' | 'totalQuantity' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Promise<SalesDelivery> {
    // 验证销售订单是否存在
    const order = await salesOrderService.findById(data.orderId);
    if (!order) {
      throw new Error(`销售订单不存在: ${data.orderId}`);
    }

    // 验证客户是否存在
    const customer = await customerService.findById(data.customerId);
    if (!customer) {
      throw new Error(`客户不存在: ${data.customerId}`);
    }

    // 验证仓库是否存在
    const warehouse = await warehouseService.findById(data.warehouseId);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${data.warehouseId}`);
    }

    // 生成出库单号
    const deliveryNo = await this.generateDeliveryNo();

    const delivery: SalesDelivery = {
      ...data,
      id: uuidv4(),
      deliveryNo,
      totalQuantity: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.deliveries.set(delivery.id, delivery);
    this.deliveryNoIndex.set(delivery.deliveryNo, delivery.id);
    this.deliveryItemsByDelivery.set(delivery.id, []);

    return delivery;
  }

  async update(id: string, data: Partial<Omit<SalesDelivery, 'id' | 'deliveryNo' | 'createdAt' | 'updatedAt'>>): Promise<SalesDelivery> {
    const existingDelivery = this.deliveries.get(id);
    if (!existingDelivery) {
      throw new Error(`销售出库单不存在: ${id}`);
    }

    const updatedDelivery: SalesDelivery = {
      ...existingDelivery,
      ...data,
      updatedAt: new Date()
    };

    this.deliveries.set(id, updatedDelivery);
    return updatedDelivery;
  }

  async delete(id: string): Promise<boolean> {
    const delivery = this.deliveries.get(id);
    if (!delivery) {
      return false;
    }

    // 删除出库项目
    const itemIds = this.deliveryItemsByDelivery.get(id) || [];
    for (const itemId of itemIds) {
      this.deliveryItems.delete(itemId);
    }

    this.deliveries.delete(id);
    this.deliveryNoIndex.delete(delivery.deliveryNo);
    this.deliveryItemsByDelivery.delete(id);
    return true;
  }

  async updateStatus(id: string, status: DeliveryStatus): Promise<SalesDelivery> {
    const delivery = await this.update(id, { status });
    
    // 如果状态变更为已完成，更新库存和订单状态
    if (status === DeliveryStatus.COMPLETED) {
      await this.updateInventoryOnComplete(id);
    }
    
    return delivery;
  }

  // =============== 出库项目管理 ===============

  async addDeliveryItem(deliveryId: string, data: Omit<SalesDeliveryItem, 'id' | 'deliveryId' | 'amount' | 'createdAt' | 'updatedAt'>): Promise<SalesDeliveryItem> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) {
      throw new Error(`销售出库单不存在: ${deliveryId}`);
    }

    // 验证产品是否存在
    const product = await productService.findById(data.productId);
    if (!product) {
      throw new Error(`产品不存在: ${data.productId}`);
    }

    // 计算金额
    const amount = data.quantity * data.unitPrice;

    const deliveryItem: SalesDeliveryItem = {
      ...data,
      id: uuidv4(),
      deliveryId,
      amount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.deliveryItems.set(deliveryItem.id, deliveryItem);
    
    const deliveryItemIds = this.deliveryItemsByDelivery.get(deliveryId) || [];
    deliveryItemIds.push(deliveryItem.id);
    this.deliveryItemsByDelivery.set(deliveryId, deliveryItemIds);

    // 重新计算出库单总额
    await this.recalculateDeliveryTotals(deliveryId);

    return deliveryItem;
  }

  async updateDeliveryItem(itemId: string, data: Partial<Omit<SalesDeliveryItem, 'id' | 'deliveryId' | 'createdAt' | 'updatedAt'>>): Promise<SalesDeliveryItem> {
    const existingItem = this.deliveryItems.get(itemId);
    if (!existingItem) {
      throw new Error(`出库项目不存在: ${itemId}`);
    }

    // 重新计算金额
    const quantity = data.quantity !== undefined ? data.quantity : existingItem.quantity;
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : existingItem.unitPrice;
    const amount = quantity * unitPrice;

    const updatedItem: SalesDeliveryItem = {
      ...existingItem,
      ...data,
      amount,
      updatedAt: new Date()
    };

    this.deliveryItems.set(itemId, updatedItem);

    // 重新计算出库单总额
    await this.recalculateDeliveryTotals(existingItem.deliveryId);

    return updatedItem;
  }

  async removeDeliveryItem(itemId: string): Promise<boolean> {
    const item = this.deliveryItems.get(itemId);
    if (!item) {
      return false;
    }

    const deliveryId = item.deliveryId;
    this.deliveryItems.delete(itemId);

    const deliveryItemIds = this.deliveryItemsByDelivery.get(deliveryId) || [];
    const updatedItemIds = deliveryItemIds.filter(id => id !== itemId);
    this.deliveryItemsByDelivery.set(deliveryId, updatedItemIds);

    // 重新计算出库单总额
    await this.recalculateDeliveryTotals(deliveryId);

    return true;
  }

  async getDeliveryItems(deliveryId: string): Promise<SalesDeliveryItem[]> {
    const itemIds = this.deliveryItemsByDelivery.get(deliveryId) || [];
    const items = itemIds.map(id => this.deliveryItems.get(id)!).filter(Boolean);
    
    // 加载关联数据
    for (const item of items) {
      await this.loadDeliveryItemRelations(item);
    }
    
    return items;
  }

  // =============== 库存更新 ===============

  private async updateInventoryOnComplete(deliveryId: string): Promise<void> {
    const delivery = await this.findById(deliveryId);
    if (!delivery || !delivery.items) return;

    for (const item of delivery.items) {
      try {
        await inventoryStockService.stockOut({
          productId: item.productId,
          warehouseId: delivery.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          referenceId: deliveryId,
          remark: `销售出库 - ${delivery.deliveryNo}`,
          operator: delivery.deliveryPerson
        });
      } catch (error) {
        console.error(`Failed to update inventory for item ${item.id}:`, error);
      }
    }

    // 更新销售订单项目的已配送数量
    for (const item of delivery.items) {
      if (item.orderItemId) {
        try {
          // 从订单中获取订单项目信息
          const order = await salesOrderService.findById(delivery.orderId);
          if (order && order.items) {
            const orderItem = order.items.find(oi => oi.id === item.orderItemId);
            if (orderItem) {
              const newDeliveredQuantity = orderItem.deliveredQuantity + item.quantity;
              await salesOrderService.updateOrderItem(item.orderItemId, {
                deliveredQuantity: newDeliveredQuantity
              });
            }
          }
        } catch (error) {
          console.error(`Failed to update order item ${item.orderItemId}:`, error);
        }
      }
    }
  }

  // =============== 私有方法 ===============

  private async loadDeliveryRelations(delivery: SalesDelivery): Promise<void> {
    // 加载关联数据
    delivery.order = await salesOrderService.findById(delivery.orderId) || undefined;
    delivery.customer = await customerService.findById(delivery.customerId) || undefined;
    delivery.warehouse = await warehouseService.findById(delivery.warehouseId) || undefined;
    delivery.items = await this.getDeliveryItems(delivery.id);
  }

  private async loadDeliveryItemRelations(item: SalesDeliveryItem): Promise<void> {
    // 加载产品信息
    item.product = await productService.findById(item.productId) || undefined;
  }

  private async recalculateDeliveryTotals(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    const items = await this.getDeliveryItems(deliveryId);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    await this.update(deliveryId, {
      totalQuantity,
      totalAmount
    });
  }

  private async generateDeliveryNo(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = String(this.deliveries.size + 1).padStart(4, '0');
    return `SD${dateStr}${sequence}`;
  }

  // =============== 统计和报表方法 ===============

  async getDeliveryStats(): Promise<{
    total: number;
    byStatus: Record<DeliveryStatus, number>;
    totalQuantity: number;
    totalValue: number;
    averageDeliveryValue: number;
  }> {
    const deliveries = await this.findAll();
    const byStatus: Record<DeliveryStatus, number> = {
      [DeliveryStatus.DRAFT]: 0,
      [DeliveryStatus.CONFIRMED]: 0,
      [DeliveryStatus.SHIPPED]: 0,
      [DeliveryStatus.COMPLETED]: 0,
      [DeliveryStatus.CANCELLED]: 0
    };

    let totalQuantity = 0;
    let totalValue = 0;

    deliveries.forEach(delivery => {
      byStatus[delivery.status]++;
      totalQuantity += delivery.totalQuantity;
      totalValue += delivery.totalAmount;
    });

    return {
      total: deliveries.length,
      byStatus,
      totalQuantity,
      totalValue,
      averageDeliveryValue: deliveries.length > 0 ? totalValue / deliveries.length : 0
    };
  }

  async getDeliveriesByMonth(year: number): Promise<Array<{
    month: number;
    deliveryCount: number;
    totalQuantity: number;
    totalValue: number;
  }>> {
    const deliveries = await this.findAll();
    const monthlyStats = new Array(12).fill(null).map((_, index) => ({
      month: index + 1,
      deliveryCount: 0,
      totalQuantity: 0,
      totalValue: 0
    }));

    deliveries.forEach(delivery => {
      const deliveryYear = delivery.deliveryDate.getFullYear();
      if (deliveryYear === year) {
        const month = delivery.deliveryDate.getMonth();
        monthlyStats[month].deliveryCount++;
        monthlyStats[month].totalQuantity += delivery.totalQuantity;
        monthlyStats[month].totalValue += delivery.totalAmount;
      }
    });

    return monthlyStats;
  }

  async search(searchTerm: string): Promise<SalesDelivery[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    const deliveries = await this.findAll();
    
    return deliveries.filter(delivery =>
      delivery.deliveryNo.toLowerCase().includes(term) ||
      delivery.customer?.name.toLowerCase().includes(term) ||
      delivery.warehouse?.name.toLowerCase().includes(term) ||
      delivery.deliveryPerson.toLowerCase().includes(term) ||
      (delivery.remark && delivery.remark.toLowerCase().includes(term))
    );
  }

  async getPendingDeliveriesForOrder(orderId: string): Promise<{
    orderItems: any[];
    canDeliver: boolean;
  }> {
    const order = await salesOrderService.findById(orderId);
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

export default new SalesDeliveryService();