import { PurchaseReceipt, PurchaseReceiptItem, ReceiptStatus } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';
import purchaseOrderService from './purchaseOrderService';
import supplierService from './supplierService';
import warehouseService from './warehouseService';
import productService from './productService';
import inventoryStockService from './inventoryStockService';

export class PurchaseReceiptService {
  private receipts: Map<string, PurchaseReceipt> = new Map();
  private receiptItems: Map<string, PurchaseReceiptItem> = new Map();
  private receiptNoIndex: Map<string, string> = new Map(); // ReceiptNo -> ID mapping
  private receiptItemsByReceipt: Map<string, string[]> = new Map(); // ReceiptID -> ItemIDs

  async initialize(): Promise<void> {
    console.log('Purchase receipt service initialized');
    
    // 创建默认采购收货单用于演示
    if (this.receipts.size === 0) {
      await this.createDefaultReceipts();
    }
  }

  private async createDefaultReceipts(): Promise<void> {
    try {
      const orders = await purchaseOrderService.findAll();
      const warehouses = await warehouseService.findAll();
      
      if (orders.length === 0 || warehouses.length === 0) {
        console.log('No orders or warehouses found, skipping default receipts creation');
        return;
      }

      // 找到已确认的订单
      const confirmedOrders = orders.filter(order => 
        order.status === 'confirmed' && order.items && order.items.length > 0
      );

      if (confirmedOrders.length === 0) {
        console.log('No confirmed orders found, skipping default receipts creation');
        return;
      }

      const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
      
      const defaultReceipts = [
        {
          orderId: confirmedOrders[0].id,
          supplierId: confirmedOrders[0].supplierId,
          warehouseId: defaultWarehouse.id,
          receiptDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
          status: ReceiptStatus.CONFIRMED,
          receiver: '仓库管理员',
          remark: '示例收货单A - 部分收货',
          partialReceipt: true
        }
      ];

      for (const receiptData of defaultReceipts) {
        try {
          const { partialReceipt, ...receiptInfo } = receiptData;
          const receipt = await this.create(receiptInfo);
          
          // 添加收货项目（部分收货）
          const order = await purchaseOrderService.findById(receiptData.orderId);
          if (order && order.items) {
            for (const orderItem of order.items) {
              const receiptQuantity = partialReceipt ? Math.floor(orderItem.quantity * 0.6) : orderItem.quantity;
              if (receiptQuantity > 0) {
                await this.addReceiptItem(receipt.id, {
                  productId: orderItem.productId,
                  orderItemId: orderItem.id,
                  quantity: receiptQuantity,
                  unitPrice: orderItem.unitPrice
                });
              }
            }
          }
        } catch (error) {
          console.warn('Failed to create default purchase receipt:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to create default purchase receipts:', error);
    }
  }

  async findAll(): Promise<PurchaseReceipt[]> {
    const receipts = Array.from(this.receipts.values());
    
    // 加载关联数据
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findById(id: string): Promise<PurchaseReceipt | null> {
    const receipt = this.receipts.get(id);
    if (!receipt) return null;
    
    await this.loadReceiptRelations(receipt);
    return receipt;
  }

  async findByReceiptNo(receiptNo: string): Promise<PurchaseReceipt | null> {
    const id = this.receiptNoIndex.get(receiptNo);
    return id ? this.findById(id) : null;
  }

  async findByOrder(orderId: string): Promise<PurchaseReceipt[]> {
    const receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.orderId === orderId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findBySupplier(supplierId: string): Promise<PurchaseReceipt[]> {
    const receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.supplierId === supplierId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findByWarehouse(warehouseId: string): Promise<PurchaseReceipt[]> {
    const receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.warehouseId === warehouseId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<PurchaseReceipt[]> {
    const receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.receiptDate >= startDate && receipt.receiptDate <= endDate
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async create(data: Omit<PurchaseReceipt, 'id' | 'receiptNo' | 'totalQuantity' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Promise<PurchaseReceipt> {
    // 验证采购订单是否存在
    const order = await purchaseOrderService.findById(data.orderId);
    if (!order) {
      throw new Error(`采购订单不存在: ${data.orderId}`);
    }

    // 验证供应商是否存在
    const supplier = await supplierService.findById(data.supplierId);
    if (!supplier) {
      throw new Error(`供应商不存在: ${data.supplierId}`);
    }

    // 验证仓库是否存在
    const warehouse = await warehouseService.findById(data.warehouseId);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${data.warehouseId}`);
    }

    // 生成收货单号
    const receiptNo = await this.generateReceiptNo();

    const receipt: PurchaseReceipt = {
      ...data,
      id: uuidv4(),
      receiptNo,
      totalQuantity: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.receipts.set(receipt.id, receipt);
    this.receiptNoIndex.set(receipt.receiptNo, receipt.id);
    this.receiptItemsByReceipt.set(receipt.id, []);

    return receipt;
  }

  async update(id: string, data: Partial<Omit<PurchaseReceipt, 'id' | 'receiptNo' | 'createdAt' | 'updatedAt'>>): Promise<PurchaseReceipt> {
    const existingReceipt = this.receipts.get(id);
    if (!existingReceipt) {
      throw new Error(`采购收货单不存在: ${id}`);
    }

    const updatedReceipt: PurchaseReceipt = {
      ...existingReceipt,
      ...data,
      updatedAt: new Date()
    };

    this.receipts.set(id, updatedReceipt);
    return updatedReceipt;
  }

  async delete(id: string): Promise<boolean> {
    const receipt = this.receipts.get(id);
    if (!receipt) {
      return false;
    }

    // 删除收货项目
    const itemIds = this.receiptItemsByReceipt.get(id) || [];
    for (const itemId of itemIds) {
      this.receiptItems.delete(itemId);
    }

    this.receipts.delete(id);
    this.receiptNoIndex.delete(receipt.receiptNo);
    this.receiptItemsByReceipt.delete(id);
    return true;
  }

  async updateStatus(id: string, status: ReceiptStatus): Promise<PurchaseReceipt> {
    const receipt = await this.update(id, { status });
    
    // 如果状态变更为已确认，更新库存
    if (status === ReceiptStatus.CONFIRMED) {
      await this.updateInventoryOnConfirm(id);
    }
    
    return receipt;
  }

  // =============== 收货项目管理 ===============

  async addReceiptItem(receiptId: string, data: Omit<PurchaseReceiptItem, 'id' | 'receiptId' | 'amount' | 'createdAt' | 'updatedAt'>): Promise<PurchaseReceiptItem> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error(`采购收货单不存在: ${receiptId}`);
    }

    // 验证产品是否存在
    const product = await productService.findById(data.productId);
    if (!product) {
      throw new Error(`产品不存在: ${data.productId}`);
    }

    // 计算金额
    const amount = data.quantity * data.unitPrice;

    const receiptItem: PurchaseReceiptItem = {
      ...data,
      id: uuidv4(),
      receiptId,
      amount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.receiptItems.set(receiptItem.id, receiptItem);
    
    const receiptItemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    receiptItemIds.push(receiptItem.id);
    this.receiptItemsByReceipt.set(receiptId, receiptItemIds);

    // 重新计算收货单总额
    await this.recalculateReceiptTotals(receiptId);

    return receiptItem;
  }

  async updateReceiptItem(itemId: string, data: Partial<Omit<PurchaseReceiptItem, 'id' | 'receiptId' | 'createdAt' | 'updatedAt'>>): Promise<PurchaseReceiptItem> {
    const existingItem = this.receiptItems.get(itemId);
    if (!existingItem) {
      throw new Error(`收货项目不存在: ${itemId}`);
    }

    // 重新计算金额
    const quantity = data.quantity !== undefined ? data.quantity : existingItem.quantity;
    const unitPrice = data.unitPrice !== undefined ? data.unitPrice : existingItem.unitPrice;
    const amount = quantity * unitPrice;

    const updatedItem: PurchaseReceiptItem = {
      ...existingItem,
      ...data,
      amount,
      updatedAt: new Date()
    };

    this.receiptItems.set(itemId, updatedItem);

    // 重新计算收货单总额
    await this.recalculateReceiptTotals(existingItem.receiptId);

    return updatedItem;
  }

  async removeReceiptItem(itemId: string): Promise<boolean> {
    const item = this.receiptItems.get(itemId);
    if (!item) {
      return false;
    }

    const receiptId = item.receiptId;
    this.receiptItems.delete(itemId);

    const receiptItemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    const updatedItemIds = receiptItemIds.filter(id => id !== itemId);
    this.receiptItemsByReceipt.set(receiptId, updatedItemIds);

    // 重新计算收货单总额
    await this.recalculateReceiptTotals(receiptId);

    return true;
  }

  async getReceiptItems(receiptId: string): Promise<PurchaseReceiptItem[]> {
    const itemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    const items = itemIds.map(id => this.receiptItems.get(id)!).filter(Boolean);
    
    // 加载关联数据
    for (const item of items) {
      await this.loadReceiptItemRelations(item);
    }
    
    return items;
  }

  // =============== 库存更新 ===============

  private async updateInventoryOnConfirm(receiptId: string): Promise<void> {
    const receipt = await this.findById(receiptId);
    if (!receipt || !receipt.items) return;

    for (const item of receipt.items) {
      try {
        await inventoryStockService.stockIn({
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          referenceId: receiptId,
          remark: `采购收货 - ${receipt.receiptNo}`,
          operator: receipt.receiver
        });
      } catch (error) {
        console.error(`Failed to update inventory for item ${item.id}:`, error);
      }
    }

    // 更新采购订单项目的已收货数量
    for (const item of receipt.items) {
      if (item.orderItemId) {
        try {
          // 从订单中获取订单项目信息
          const order = await purchaseOrderService.findById(receipt.orderId);
          if (order && order.items) {
            const orderItem = order.items.find(oi => oi.id === item.orderItemId);
            if (orderItem) {
              const newReceivedQuantity = orderItem.receivedQuantity + item.quantity;
              await purchaseOrderService.updateOrderItem(item.orderItemId, {
                receivedQuantity: newReceivedQuantity
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

  private async loadReceiptRelations(receipt: PurchaseReceipt): Promise<void> {
    // 加载关联数据
    receipt.order = await purchaseOrderService.findById(receipt.orderId) || undefined;
    receipt.supplier = await supplierService.findById(receipt.supplierId) || undefined;
    receipt.warehouse = await warehouseService.findById(receipt.warehouseId) || undefined;
    receipt.items = await this.getReceiptItems(receipt.id);
  }

  private async loadReceiptItemRelations(item: PurchaseReceiptItem): Promise<void> {
    // 加载产品信息
    item.product = await productService.findById(item.productId) || undefined;
    
    // 加载订单项目信息
    if (item.orderItemId) {
      // 这里需要从订单服务获取订单项目信息
      // 暂时简化处理
    }
  }

  private async recalculateReceiptTotals(receiptId: string): Promise<void> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) return;

    const items = await this.getReceiptItems(receiptId);
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    await this.update(receiptId, {
      totalQuantity,
      totalAmount
    });
  }

  private async generateReceiptNo(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const sequence = String(this.receipts.size + 1).padStart(4, '0');
    return `PR${dateStr}${sequence}`;
  }

  // =============== 统计和报表方法 ===============

  async getReceiptStats(): Promise<{
    total: number;
    byStatus: Record<ReceiptStatus, number>;
    totalQuantity: number;
    totalValue: number;
    averageReceiptValue: number;
  }> {
    const receipts = await this.findAll();
    const byStatus: Record<ReceiptStatus, number> = {
      [ReceiptStatus.DRAFT]: 0,
      [ReceiptStatus.CONFIRMED]: 0
    };

    let totalQuantity = 0;
    let totalValue = 0;

    receipts.forEach(receipt => {
      byStatus[receipt.status]++;
      totalQuantity += receipt.totalQuantity;
      totalValue += receipt.totalAmount;
    });

    return {
      total: receipts.length,
      byStatus,
      totalQuantity,
      totalValue,
      averageReceiptValue: receipts.length > 0 ? totalValue / receipts.length : 0
    };
  }

  async getReceiptsByMonth(year: number): Promise<Array<{
    month: number;
    receiptCount: number;
    totalQuantity: number;
    totalValue: number;
  }>> {
    const receipts = await this.findAll();
    const monthlyStats = new Array(12).fill(null).map((_, index) => ({
      month: index + 1,
      receiptCount: 0,
      totalQuantity: 0,
      totalValue: 0
    }));

    receipts.forEach(receipt => {
      const receiptYear = receipt.receiptDate.getFullYear();
      if (receiptYear === year) {
        const month = receipt.receiptDate.getMonth();
        monthlyStats[month].receiptCount++;
        monthlyStats[month].totalQuantity += receipt.totalQuantity;
        monthlyStats[month].totalValue += receipt.totalAmount;
      }
    });

    return monthlyStats;
  }

  async search(searchTerm: string): Promise<PurchaseReceipt[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    const receipts = await this.findAll();
    
    return receipts.filter(receipt =>
      receipt.receiptNo.toLowerCase().includes(term) ||
      receipt.supplier?.name.toLowerCase().includes(term) ||
      receipt.warehouse?.name.toLowerCase().includes(term) ||
      receipt.receiver.toLowerCase().includes(term) ||
      (receipt.remark && receipt.remark.toLowerCase().includes(term))
    );
  }

  async getPendingReceiptsForOrder(orderId: string): Promise<{
    orderItems: any[];
    canReceive: boolean;
  }> {
    const order = await purchaseOrderService.findById(orderId);
    if (!order || !order.items) {
      return { orderItems: [], canReceive: false };
    }

    const orderItems = order.items.map(item => ({
      ...item,
      pendingQuantity: item.quantity - item.receivedQuantity,
      canReceive: item.quantity > item.receivedQuantity
    }));

    const canReceive = orderItems.some(item => item.canReceive);

    return { orderItems, canReceive };
  }
}

export default new PurchaseReceiptService();