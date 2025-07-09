import { PurchaseReceipt, PurchaseReceiptItem, ReceiptStatus } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/secureLogger';
import purchaseOrderService from './purchaseOrderService';
import supplierService from './supplierService';
import { warehouseService } from './warehouseService';
import productService from './productService';
import inventoryStockService from './inventoryStockService';

export class PurchaseReceiptService {
  private receipts: Map<string, PurchaseReceipt> = new Map();
  private receiptItems: Map<string, PurchaseReceiptItem> = new Map();
  private receiptNoIndex: Map<string, string> = new Map(); // ReceiptNo -> ID mapping
  private receiptItemsByReceipt: Map<string, string[]> = new Map(); // ReceiptID -> ItemIDs

  async initialize(): Promise<void> {
    console.log('Purchase receipt service initialized');
    // 系统启动时不创建任何默认采购收货单数据
  }



  async findAll(): Promise<PurchaseReceipt[]> {
    const _receipts = Array.from(this.receipts.values());
    
    // 加载关联数据
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findById(id: string): Promise<PurchaseReceipt | null> {
    const _receipt = this.receipts.get(id);
    if (!receipt) return null;
    
    await this.loadReceiptRelations(receipt);
    return receipt;
  }

  async findByReceiptNo(receiptNo: string): Promise<PurchaseReceipt | null> {
    const _id = this.receiptNoIndex.get(receiptNo);
    return id ? this.findById(id) : null;
  }

  async findByOrder(orderId: string): Promise<PurchaseReceipt[]> {
    const _receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.orderId === orderId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findBySupplier(supplierId: string): Promise<PurchaseReceipt[]> {
    const _receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.supplierId === supplierId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findByWarehouse(warehouseId: string): Promise<PurchaseReceipt[]> {
    const _receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.warehouseId === warehouseId
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<PurchaseReceipt[]> {
    const _receipts = Array.from(this.receipts.values()).filter(
      receipt => receipt.receiptDate >= startDate && receipt.receiptDate <= endDate
    );
    
    for (const receipt of receipts) {
      await this.loadReceiptRelations(receipt);
    }
    
    return receipts;
  }

  async create(data: Omit<PurchaseReceipt, 'id' | 'receiptNo' | 'totalQuantity' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Promise<PurchaseReceipt> {
    // 验证采购订单是否存在
    const _order = await purchaseOrderService.findById(data.orderId);
    if (!order) {
      throw new Error(`采购订单不存在: ${data.orderId}`);
    }

    // 验证供应商是否存在
    const _supplier = await supplierService.findById(data.supplierId);
    if (!supplier) {
      throw new Error(`供应商不存在: ${data.supplierId}`);
    }

    // 验证仓库是否存在
    const _warehouse = await warehouseService.findById(data.warehouseId);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${data.warehouseId}`);
    }

    // 生成收货单号
    const _receiptNo = await this.generateReceiptNo();

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
    const _existingReceipt = this.receipts.get(id);
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
    const _receipt = this.receipts.get(id);
    if (!receipt) {
      return false;
    }

    // 删除收货项目
    const _itemIds = this.receiptItemsByReceipt.get(id) || [];
    for (const itemId of itemIds) {
      this.receiptItems.delete(itemId);
    }

    this.receipts.delete(id);
    this.receiptNoIndex.delete(receipt.receiptNo);
    this.receiptItemsByReceipt.delete(id);
    return true;
  }

  async updateStatus(id: string, status: ReceiptStatus): Promise<PurchaseReceipt> {
    const _receipt = await this.update(id, { status });
    
    // 如果状态变更为已确认，更新库存
    if (status === ReceiptStatus.CONFIRMED) {
      await this.updateInventoryOnConfirm(id);
    }
    
    return receipt;
  }

  // =============== 收货项目管理 ===============

  async addReceiptItem(receiptId: string, data: Omit<PurchaseReceiptItem, 'id' | 'receiptId' | 'amount' | 'createdAt' | 'updatedAt'>): Promise<PurchaseReceiptItem> {
    // 增强输入验证
    if (!receiptId || typeof receiptId !== 'string') {
      throw new Error('无效的收货单ID');
    }
    
    if (!data || !data.productId || !data.quantity || !data.unitPrice) {
      throw new Error('收货项目数据不完整');
    }
    
    if (typeof data.quantity !== 'number' || isNaN(data.quantity) || data.quantity <= 0) {
      throw new Error('收货数量必须是大于0的数字');
    }
    
    if (typeof data.unitPrice !== 'number' || isNaN(data.unitPrice) || data.unitPrice < 0) {
      throw new Error('单价必须是非负数字');
    }
    
    const _receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error(`采购收货单不存在: ${receiptId}`);
    }

    // 验证产品是否存在
    const _product = await productService.findById(data.productId);
    if (!product) {
      throw new Error(`产品不存在: ${data.productId}`);
    }

    // 计算金额
    const _amount = data.quantity * data.unitPrice;

    const receiptItem: PurchaseReceiptItem = {
      ...data,
      id: uuidv4(),
      receiptId,
      amount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.receiptItems.set(receiptItem.id, receiptItem);
    
    const _receiptItemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    receiptItemIds.push(receiptItem.id);
    this.receiptItemsByReceipt.set(receiptId, receiptItemIds);

    // 重新计算收货单总额
    await this.recalculateReceiptTotals(receiptId);

    return receiptItem;
  }

  async updateReceiptItem(itemId: string, data: Partial<Omit<PurchaseReceiptItem, 'id' | 'receiptId' | 'createdAt' | 'updatedAt'>>): Promise<PurchaseReceiptItem> {
    const _existingItem = this.receiptItems.get(itemId);
    if (!existingItem) {
      throw new Error(`收货项目不存在: ${itemId}`);
    }

    // 重新计算金额
    const _quantity = data.quantity !== undefined ? data.quantity : existingItem.quantity;
    const _unitPrice = data.unitPrice !== undefined ? data.unitPrice : existingItem.unitPrice;
    const _amount = quantity * unitPrice;

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
    const _item = this.receiptItems.get(itemId);
    if (!item) {
      return false;
    }

    const _receiptId = item.receiptId;
    this.receiptItems.delete(itemId);

    const _receiptItemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    const _updatedItemIds = receiptItemIds.filter(id => id !== itemId);
    this.receiptItemsByReceipt.set(receiptId, updatedItemIds);

    // 重新计算收货单总额
    await this.recalculateReceiptTotals(receiptId);

    return true;
  }

  async getReceiptItems(receiptId: string): Promise<PurchaseReceiptItem[]> {
    const _itemIds = this.receiptItemsByReceipt.get(receiptId) || [];
    const _items = itemIds.map(id => this.receiptItems.get(id)!).filter(Boolean);
    
    // 加载关联数据
    for (const item of items) {
      await this.loadReceiptItemRelations(item);
    }
    
    return items;
  }

  // =============== 库存更新 ===============

  private async updateInventoryOnConfirm(receiptId: string): Promise<void> {
    const _receipt = await this.findById(receiptId);
    if (!receipt || !receipt.items) return;

    const successfulTransactions: Array<{
      itemId: string;
      productId: string;
      warehouseId: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    try {
      // 尝试处理所有项目的库存入库
      for (const item of receipt.items) {
        await inventoryStockService.stockIn({
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          referenceType: 'purchase_receipt',
          referenceId: receiptId,
          remark: `采购收货 - ${receipt.receiptNo}`,
          operator: receipt.receiver
        });

        // 记录成功的入库操作，以备回滚
        successfulTransactions.push({
          itemId: item.id,
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        });

        console.log(`Successfully updated inventory for item ${item.id}, product ${item.productId}, quantity ${item.quantity}`);
      }
    } catch (error) {
      logger.error('Failed to update inventory during receipt confirmation', {
        receiptId,
        receiptNo: receipt.receiptNo,
        error: error instanceof Error ? error.message : '未知错误',
        successfulTransactionsCount: successfulTransactions.length
      });
      
      // 增强的原子性回滚机制
      if (successfulTransactions.length > 0) {
        logger.warn(`Rolling back ${successfulTransactions.length} successful inventory transactions for receipt ${receipt.receiptNo}`);
        
        const rollbackFailures: Array<{
          itemId: string;
          error: string;
        }> = [];
        
        // 逐个回滚，记录失败
        for (const transaction of successfulTransactions) {
          try {
            await inventoryStockService.stockOut({
              productId: transaction.productId,
              warehouseId: transaction.warehouseId,
              quantity: transaction.quantity,
              unitPrice: transaction.unitPrice,
              referenceType: 'purchase_receipt_rollback',
              referenceId: receiptId,
              remark: `采购收货回滚 - ${receipt.receiptNo}`,
              operator: 'system'
            });
            logger.info(`Successfully rolled back inventory for item ${transaction.itemId}`);
          } catch (rollbackError) {
            const _errorMsg = rollbackError instanceof Error ? rollbackError.message : '未知错误';
            rollbackFailures.push({
              itemId: transaction.itemId,
              error: errorMsg
            });
            logger.error(`CRITICAL: Failed to rollback inventory for item ${transaction.itemId}`, {
              itemId: transaction.itemId,
              productId: transaction.productId,
              warehouseId: transaction.warehouseId,
              quantity: transaction.quantity,
              error: errorMsg
            });
          }
        }
        
        // 如果有回滚失败，记录关键信息供人工干预
        if (rollbackFailures.length > 0) {
          logger.error('CRITICAL: Partial rollback failure detected - manual intervention required', {
            receiptId,
            receiptNo: receipt.receiptNo,
            rollbackFailures,
            successfulRollbacks: successfulTransactions.length - rollbackFailures.length,
            severity: 'CRITICAL'
          });
        }
      }
      
      // 抛出原始错误，阻止收货单状态变更
      throw new Error(`库存更新失败，收货单确认中止: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 更新采购订单项目的已收货数量
    for (const item of receipt.items) {
      if (item.orderItemId) {
        try {
          // 从订单中获取订单项目信息
          const _order = await purchaseOrderService.findById(receipt.orderId);
          if (order && order.items) {
            const _orderItem = order.items.find(oi => oi.id === item.orderItemId);
            if (orderItem) {
              const _newReceivedQuantity = orderItem.receivedQuantity + item.quantity;
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
    const _receipt = this.receipts.get(receiptId);
    if (!receipt) return;

    const _items = await this.getReceiptItems(receiptId);
    const _totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const _totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    await this.update(receiptId, {
      totalQuantity,
      totalAmount
    });
  }

  private async generateReceiptNo(): Promise<string> {
    const _now = new Date();
    const _dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const _sequence = String(this.receipts.size + 1).padStart(4, '0');
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
    const _receipts = await this.findAll();
    const byStatus: Record<ReceiptStatus, number> = {
      [ReceiptStatus.DRAFT]: 0,
      [ReceiptStatus.CONFIRMED]: 0
    };

    const _totalQuantity = 0;
    const _totalValue = 0;

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
    const _receipts = await this.findAll();
    const _monthlyStats = new Array(12).fill(null).map((_, index) => ({
      month: index + 1,
      receiptCount: 0,
      totalQuantity: 0,
      totalValue: 0
    }));

    receipts.forEach(receipt => {
      const _receiptYear = receipt.receiptDate.getFullYear();
      if (receiptYear === year) {
        const _month = receipt.receiptDate.getMonth();
        monthlyStats[month].receiptCount++;
        monthlyStats[month].totalQuantity += receipt.totalQuantity;
        monthlyStats[month].totalValue += receipt.totalAmount;
      }
    });

    return monthlyStats;
  }

  async search(searchTerm: string): Promise<PurchaseReceipt[]> {
    const _term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    const _receipts = await this.findAll();
    
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
    const _order = await purchaseOrderService.findById(orderId);
    if (!order || !order.items) {
      return { orderItems: [], canReceive: false };
    }

    const _orderItems = order.items.map(item => ({
      ...item,
      pendingQuantity: item.quantity - item.receivedQuantity,
      canReceive: item.quantity > item.receivedQuantity
    }));

    const _canReceive = orderItems.some(item => item.canReceive);

    return { orderItems, canReceive };
  }
}

export default new PurchaseReceiptService();