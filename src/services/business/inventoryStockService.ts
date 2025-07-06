import { InventoryStock, InventoryTransaction, TransactionType } from '../../types/entities';
import { InventoryStockSchema, InventoryTransactionSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import productService from './productService';
import warehouseService from './warehouseService';
import { ConcurrencyManager } from '../../utils/concurrency';
import { ValidationError, BusinessError } from '../../utils/errors';
import { logger } from '../../utils/secureLogger';

export class InventoryStockService {
  private stocks: Map<string, InventoryStock> = new Map();
  private transactions: Map<string, InventoryTransaction> = new Map();
  private stockIndex: Map<string, string> = new Map(); // "productId:warehouseId" -> stockId

  async initialize(): Promise<void> {
    console.log('Inventory stock service initialized');
  }

  // =============== 库存管理 ===============

  async findAllStocks(): Promise<InventoryStock[]> {
    return Array.from(this.stocks.values());
  }

  async findStockById(id: string): Promise<InventoryStock | null> {
    return this.stocks.get(id) || null;
  }

  async findStockByProductAndWarehouse(productId: string, warehouseId: string): Promise<InventoryStock | null> {
    const key = `${productId}:${warehouseId}`;
    const stockId = this.stockIndex.get(key);
    return stockId ? this.stocks.get(stockId) || null : null;
  }

  async findStocksByProduct(productId: string): Promise<InventoryStock[]> {
    return Array.from(this.stocks.values()).filter(
      stock => stock.productId === productId
    );
  }

  async findStocksByWarehouse(warehouseId: string): Promise<InventoryStock[]> {
    return Array.from(this.stocks.values()).filter(
      stock => stock.warehouseId === warehouseId
    );
  }

  async findLowStockItems(): Promise<InventoryStock[]> {
    const stocks = await this.findAllStocks();
    const lowStocks: InventoryStock[] = [];

    for (const stock of stocks) {
      const product = await productService.findById(stock.productId);
      if (product && stock.currentStock <= product.minStock) {
        lowStocks.push(stock);
      }
    }

    return lowStocks;
  }

  async findOutOfStockItems(): Promise<InventoryStock[]> {
    return Array.from(this.stocks.values()).filter(
      stock => stock.currentStock <= 0
    );
  }

  async createOrUpdateStock(data: Omit<InventoryStock, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryStock> {
    // 验证产品和仓库存在
    const product = await productService.findById(data.productId);
    if (!product) {
      throw new Error(`产品不存在: ${data.productId}`);
    }

    const warehouse = await warehouseService.findById(data.warehouseId);
    if (!warehouse) {
      throw new Error(`仓库不存在: ${data.warehouseId}`);
    }

    // 检查是否已存在库存记录
    const existingStock = await this.findStockByProductAndWarehouse(data.productId, data.warehouseId);
    if (existingStock) {
      return this.updateStock(existingStock.id, data);
    }

    // 创建新库存记录
    const stock: InventoryStock = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(InventoryStockSchema, stock);
    if (!validation.success) {
      throw new Error(`库存数据验证失败: ${validation.errors?.join(', ')}`);
    }

    const key = `${stock.productId}:${stock.warehouseId}`;
    this.stocks.set(stock.id, stock);
    this.stockIndex.set(key, stock.id);

    return stock;
  }

  async updateStock(id: string, data: Partial<Omit<InventoryStock, 'id' | 'createdAt' | 'updatedAt'>>): Promise<InventoryStock> {
    const existingStock = this.stocks.get(id);
    if (!existingStock) {
      throw new Error(`库存记录不存在: ${id}`);
    }

    const updatedStock: InventoryStock = {
      ...existingStock,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(InventoryStockSchema, updatedStock);
    if (!validation.success) {
      throw new Error(`库存数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.stocks.set(id, updatedStock);
    return updatedStock;
  }

  // =============== 库存流水管理 ===============

  async findAllTransactions(): Promise<InventoryTransaction[]> {
    return Array.from(this.transactions.values());
  }

  async findTransactionById(id: string): Promise<InventoryTransaction | null> {
    return this.transactions.get(id) || null;
  }

  async findTransactionsByProduct(productId: string): Promise<InventoryTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.productId === productId
    );
  }

  async findTransactionsByWarehouse(warehouseId: string): Promise<InventoryTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.warehouseId === warehouseId
    );
  }

  async findTransactionsByType(type: TransactionType): Promise<InventoryTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.transactionType === type
    );
  }

  async findTransactionsByDateRange(startDate: Date, endDate: Date): Promise<InventoryTransaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.createdAt >= startDate && transaction.createdAt <= endDate
    );
  }

  // =============== 库存操作 ===============

  async stockIn(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
    referenceType?: string;
    referenceId?: string;
    remark?: string;
    operator: string;
  }): Promise<{ stock: InventoryStock; transaction: InventoryTransaction }> {
    // 输入验证
    if (params.quantity <= 0) {
      throw new ValidationError('入库数量必须大于0', { quantity: params.quantity });
    }

    if (params.unitPrice < 0) {
      throw new ValidationError('单价不能为负数', { unitPrice: params.unitPrice });
    }

    // 使用库存锁，确保并发安全
    const lockKey = `stock-operation-${params.productId}-${params.warehouseId}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      return this.processStockTransaction({
        ...params,
        transactionType: TransactionType.IN
      });
    });
  }

  async stockOut(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
    referenceType?: string;
    referenceId?: string;
    remark?: string;
    operator: string;
  }): Promise<{ stock: InventoryStock; transaction: InventoryTransaction }> {
    // 输入验证
    if (params.quantity <= 0) {
      throw new ValidationError('出库数量必须大于0', { quantity: params.quantity });
    }

    if (params.unitPrice < 0) {
      throw new ValidationError('单价不能为负数', { unitPrice: params.unitPrice });
    }

    // 使用库存锁，确保原子性操作，防止并发竞态条件
    const lockKey = `stock-operation-${params.productId}-${params.warehouseId}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      // 在锁内重新检查库存（防止检查后其他事务修改库存）
      const currentStock = await this.findStockByProductAndWarehouse(params.productId, params.warehouseId);
      
      if (!currentStock) {
        throw new BusinessError('商品在该仓库中无库存记录', { 
          productId: params.productId, 
          warehouseId: params.warehouseId 
        });
      }

      if (currentStock.availableStock < params.quantity) {
        logger.warn('Stock out attempt failed - insufficient stock', {
          productId: params.productId,
          warehouseId: params.warehouseId,
          requestedQuantity: params.quantity,
          availableStock: currentStock.availableStock,
          operator: params.operator
        });
        
        throw new BusinessError('库存不足，无法出库', { 
          requestedQuantity: params.quantity,
          availableStock: currentStock.availableStock,
          productId: params.productId,
          warehouseId: params.warehouseId
        });
      }

      // 原子性库存事务处理
      return this.processStockTransaction({
        ...params,
        transactionType: TransactionType.OUT,
        quantity: -params.quantity // 出库为负数
      });
    });
  }

  async stockAdjust(params: {
    productId: string;
    warehouseId: string;
    newQuantity: number;
    unitPrice: number;
    remark?: string;
    operator: string;
  }): Promise<{ stock: InventoryStock; transaction: InventoryTransaction }> {
    // 增强输入验证
    if (!params.productId || !params.warehouseId || !params.operator) {
      throw new ValidationError('产品ID、仓库ID和操作人不能为空', params);
    }
    
    if (typeof params.newQuantity !== 'number' || isNaN(params.newQuantity)) {
      throw new ValidationError('调整数量必须是有效数字', { newQuantity: params.newQuantity });
    }
    
    if (params.newQuantity < 0) {
      logger.warn('Attempted negative stock adjustment', {
        productId: params.productId,
        warehouseId: params.warehouseId,
        newQuantity: params.newQuantity,
        operator: params.operator
      });
      throw new ValidationError('调整后的库存数量不能为负数', { newQuantity: params.newQuantity });
    }
    
    if (typeof params.unitPrice !== 'number' || isNaN(params.unitPrice) || params.unitPrice < 0) {
      throw new ValidationError('单价必须是非负数字', { unitPrice: params.unitPrice });
    }

    // 获取当前库存
    const currentStock = await this.findStockByProductAndWarehouse(params.productId, params.warehouseId);
    const currentQuantity = currentStock ? currentStock.currentStock : 0;
    const adjustQuantity = params.newQuantity - currentQuantity;

    if (adjustQuantity === 0) {
      throw new Error('调整数量为0，无需调整');
    }

    return this.processStockTransaction({
      productId: params.productId,
      warehouseId: params.warehouseId,
      quantity: adjustQuantity,
      unitPrice: params.unitPrice,
      remark: params.remark,
      operator: params.operator,
      transactionType: TransactionType.ADJUST
    });
  }

  private async processStockTransaction(params: {
    productId: string;
    warehouseId: string;
    quantity: number;
    unitPrice: number;
    transactionType: TransactionType;
    referenceType?: string;
    referenceId?: string;
    remark?: string;
    operator: string;
  }): Promise<{ stock: InventoryStock; transaction: InventoryTransaction }> {
    // 生成流水单号
    const transactionNo = await this.generateTransactionNo(params.transactionType);

    // 创建库存流水记录
    const transaction: InventoryTransaction = {
      id: uuidv4(),
      transactionNo,
      productId: params.productId,
      warehouseId: params.warehouseId,
      transactionType: params.transactionType,
      quantity: params.quantity,
      unitPrice: params.unitPrice,
      totalAmount: params.quantity * params.unitPrice,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      remark: params.remark,
      operator: params.operator,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证流水数据
    const transactionValidation = validateEntity(InventoryTransactionSchema, transaction);
    if (!transactionValidation.success) {
      throw new Error(`库存流水数据验证失败: ${transactionValidation.errors?.join(', ')}`);
    }

    // 获取或创建库存记录
    let stock = await this.findStockByProductAndWarehouse(params.productId, params.warehouseId);
    if (!stock) {
      stock = await this.createOrUpdateStock({
        productId: params.productId,
        warehouseId: params.warehouseId,
        currentStock: 0,
        availableStock: 0,
        reservedStock: 0,
        minStock: 10, // 默认最小库存
        maxStock: 1000, // 默认最大库存
        avgCost: params.unitPrice,
        unitPrice: params.unitPrice
      });
    }

    // 更新库存数量
    const newCurrentStock = stock.currentStock + params.quantity;
    const newAvailableStock = stock.availableStock + params.quantity;

    // 计算新的平均成本（仅对入库操作）
    let newAvgCost = stock.avgCost;
    if (params.transactionType === TransactionType.IN && params.quantity > 0) {
      const totalCost = (stock.currentStock * stock.avgCost) + (params.quantity * params.unitPrice);
      const totalQuantity = stock.currentStock + params.quantity;
      newAvgCost = totalQuantity > 0 ? totalCost / totalQuantity : params.unitPrice;
    }

    // 更新库存记录
    const updatedStock = await this.updateStock(stock.id, {
      currentStock: newCurrentStock,
      availableStock: newAvailableStock,
      avgCost: newAvgCost,
      lastInDate: params.transactionType === TransactionType.IN ? new Date() : stock.lastInDate,
      lastOutDate: params.transactionType === TransactionType.OUT ? new Date() : stock.lastOutDate
    });

    // 保存流水记录
    this.transactions.set(transaction.id, transaction);

    return { stock: updatedStock, transaction };
  }

  private async generateTransactionNo(type: TransactionType): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const typePrefix = {
      [TransactionType.IN]: 'IN',
      [TransactionType.OUT]: 'OUT',
      [TransactionType.ADJUST]: 'ADJ'
    }[type];

    // 简单的序号生成（实际应用中可能需要更复杂的逻辑）
    const sequence = String(this.transactions.size + 1).padStart(4, '0');
    return `${typePrefix}${dateStr}${sequence}`;
  }

  // =============== 库存预留 ===============

  async reserveStock(productId: string, warehouseId: string, quantity: number): Promise<InventoryStock> {
    // 输入验证
    if (quantity <= 0) {
      throw new ValidationError('预留数量必须大于0', { quantity });
    }

    if (!productId || !warehouseId) {
      throw new ValidationError('产品ID和仓库ID不能为空', { productId, warehouseId });
    }

    // 使用库存锁，确保原子性操作
    const lockKey = `stock-reserve-${productId}-${warehouseId}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      const stock = await this.findStockByProductAndWarehouse(productId, warehouseId);
      if (!stock) {
        throw new BusinessError('库存记录不存在', { productId, warehouseId });
      }

      if (stock.availableStock < quantity) {
        throw new BusinessError('可用库存不足，无法预留', { 
          availableStock: stock.availableStock,
          requestedQuantity: quantity,
          productId,
          warehouseId
        });
      }

      logger.info('Stock reserved', {
        productId,
        warehouseId,
        quantity,
        availableStockBefore: stock.availableStock,
        reservedStockBefore: stock.reservedStock
      });

      return this.updateStock(stock.id, {
        availableStock: stock.availableStock - quantity,
        reservedStock: stock.reservedStock + quantity
      });
    });
  }

  async releaseReservedStock(productId: string, warehouseId: string, quantity: number): Promise<InventoryStock> {
    // 输入验证
    if (quantity <= 0) {
      throw new ValidationError('释放数量必须大于0', { quantity });
    }

    if (!productId || !warehouseId) {
      throw new ValidationError('产品ID和仓库ID不能为空', { productId, warehouseId });
    }

    // 使用库存锁，确保原子性操作
    const lockKey = `stock-reserve-${productId}-${warehouseId}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      const stock = await this.findStockByProductAndWarehouse(productId, warehouseId);
      if (!stock) {
        throw new BusinessError('库存记录不存在', { productId, warehouseId });
      }

      if (stock.reservedStock < quantity) {
        throw new BusinessError('预留库存不足，无法释放', { 
          reservedStock: stock.reservedStock,
          requestedQuantity: quantity,
          productId,
          warehouseId
        });
      }

      logger.info('Reserved stock released', {
        productId,
        warehouseId,
        quantity,
        availableStockBefore: stock.availableStock,
        reservedStockBefore: stock.reservedStock
      });

      return this.updateStock(stock.id, {
        availableStock: stock.availableStock + quantity,
        reservedStock: stock.reservedStock - quantity
      });
    });
  }

  // =============== 统计和报表 ===============

  async getInventorySummary(): Promise<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalTransactions: number;
  }> {
    const stocks = await this.findAllStocks();
    const lowStocks = await this.findLowStockItems();
    const outOfStocks = await this.findOutOfStockItems();

    const totalValue = stocks.reduce((sum, stock) => sum + (stock.currentStock * stock.avgCost), 0);

    return {
      totalProducts: stocks.length,
      totalValue,
      lowStockCount: lowStocks.length,
      outOfStockCount: outOfStocks.length,
      totalTransactions: this.transactions.size
    };
  }

  async getStockMovementReport(startDate: Date, endDate: Date): Promise<{
    transactions: InventoryTransaction[];
    summary: {
      totalIn: number;
      totalOut: number;
      totalAdjust: number;
      valueIn: number;
      valueOut: number;
    };
  }> {
    const transactions = await this.findTransactionsByDateRange(startDate, endDate);

    const summary = transactions.reduce((acc, transaction) => {
      switch (transaction.transactionType) {
        case TransactionType.IN:
          acc.totalIn += transaction.quantity;
          acc.valueIn += transaction.totalAmount;
          break;
        case TransactionType.OUT:
          acc.totalOut += Math.abs(transaction.quantity);
          acc.valueOut += Math.abs(transaction.totalAmount);
          break;
        case TransactionType.ADJUST:
          acc.totalAdjust += Math.abs(transaction.quantity);
          break;
      }
      return acc;
    }, {
      totalIn: 0,
      totalOut: 0,
      totalAdjust: 0,
      valueIn: 0,
      valueOut: 0
    });

    return { transactions, summary };
  }

  async getTopProductsByValue(limit: number = 10): Promise<Array<{
    stock: InventoryStock;
    product?: any;
    totalValue: number;
  }>> {
    const stocks = await this.findAllStocks();
    
    const stocksWithValue = await Promise.all(
      stocks.map(async stock => {
        const product = await productService.findById(stock.productId);
        return {
          stock,
          product,
          totalValue: stock.currentStock * stock.avgCost
        };
      })
    );

    return stocksWithValue
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }

  // 获取库存统计数据
  async getInventoryStats() {
    const stocks = await this.findAllStocks();
    const transactions = await this.findAllTransactions();
    const lowStockItems = await this.findLowStockItems();

    const totalValue = stocks.reduce((sum, stock) => sum + (stock.currentStock * stock.avgCost), 0);

    return {
      totalStocks: stocks.length,
      totalTransactions: transactions.length,
      lowStockCount: lowStockItems.length,
      totalValue: totalValue
    };
  }
}

// 创建并导出服务实例
const inventoryStockService = new InventoryStockService();
export default inventoryStockService;