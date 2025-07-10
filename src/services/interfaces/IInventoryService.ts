/**
 * 库存服务接口
 */

import { InventoryStock, InventoryTransaction, TransactionType } from '../../types/entities';
import {
  IBusinessService,
  PaginatedResult,
  PaginationParams,
  BaseFilter,
  ServiceResult,
  ServiceStatistics,
  ServiceHealthStatus,
  BatchOperationResult
} from './IBusinessService';

// Re-export types for external use
export type {
  PaginatedResult,
  PaginationParams,
  ServiceResult,
  ServiceHealthStatus,
  BatchOperationResult
};

// StockMovement interface is defined below

/**
 * 库存查询过滤器
 */
export interface InventoryFilter extends BaseFilter {
  /** 产品ID */
  productId?: string;
  /** 仓库ID */
  warehouseId?: string;
  /** 是否低库存 */
  lowStock?: boolean;
  /** 是否缺货 */
  outOfStock?: boolean;
  /** 库存数量范围 */
  quantityFrom?: number;
  quantityTo?: number;
}

/**
 * 库存交易查询过滤器
 */
export interface InventoryTransactionFilter extends BaseFilter {
  /** 产品ID */
  productId?: string;
  /** 仓库ID */
  warehouseId?: string;
  /** 交易类型 */
  transactionType?: TransactionType;
  /** 交易日期范围 */
  transactionDateFrom?: Date;
  transactionDateTo?: Date;
  /** 参考单号 */
  referenceNumber?: string;
}

/**
 * 库存统计信息
 */
export interface InventoryStatistics extends ServiceStatistics {
  /** 总库存价值 */
  totalInventoryValue: number;
  /** 总库存价值（兼容字段） */
  totalValue?: number;
  /** 总库存数量 */
  totalQuantity: number;
  /** 总库存记录数（兼容字段） */
  totalStocks: number;
  /** 产品种类数 */
  productVarietyCount: number;
  /** 仓库数量 */
  warehouseCount: number;
  /** 低库存产品数 */
  lowStockCount: number;
  /** 缺货产品数 */
  outOfStockCount: number;
  /** 各交易类型统计 */
  transactionsByType: Record<TransactionType, number>;
}

/**
 * 库存移动记录
 */
export interface StockMovement {
  /** 移动ID */
  id: string;
  /** 产品ID */
  productId: string;
  /** 仓库ID */
  warehouseId: string;
  /** 源仓库ID */
  fromWarehouseId?: string;
  /** 目标仓库ID */
  toWarehouseId?: string;
  /** 交易类型 */
  type: any;
  /** 移动数量 */
  quantity: number;
  /** 单位成本 */
  unitCost: number;
  /** 总成本 */
  totalCost: number;
  /** 总金额 */
  totalAmount: number;
  /** 关联单据ID */
  referenceId?: string;
  /** 关联单据类型 */
  referenceType?: string;
  /** 备注 */
  notes?: string;
  /** 移动原因 */
  reason?: string;
  /** 操作人 */
  operatorId: string;
  /** 创建人 */
  createdBy: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 库存调整记录
 */
export interface InventoryAdjustment {
  /** 调整ID */
  id: string;
  /** 产品ID */
  productId: string;
  /** 仓库ID */
  warehouseId: string;
  /** 调整前数量 */
  beforeQuantity: number;
  /** 调整后数量 */
  afterQuantity: number;
  /** 调整数量 */
  adjustmentQuantity: number;
  /** 调整原因 */
  reason: string;
  /** 调整类型 */
  adjustmentType: 'increase' | 'decrease' | 'correction';
  /** 操作人 */
  operatorId?: string;
  /** 调整时间 */
  adjustmentDate: Date;
  /** 备注 */
  notes?: string;
}

/**
 * 库存预警配置
 */
export interface InventoryAlert {
  /** 产品ID */
  productId: string;
  /** 仓库ID */
  warehouseId?: string;
  /** 最低库存阈值 */
  minStockLevel: number;
  /** 最高库存阈值 */
  maxStockLevel?: number;
  /** 是否启用预警 */
  enabled: boolean;
  /** 预警接收人 */
  recipients?: string[];
}

/**
 * FIFO库存批次
 */
export interface InventoryBatch {
  /** 批次ID */
  batchId: string;
  /** 产品ID */
  productId: string;
  /** 仓库ID */
  warehouseId: string;
  /** 批次数量 */
  quantity: number;
  /** 剩余数量 */
  remainingQuantity: number;
  /** 单位成本 */
  unitCost: number;
  /** 入库日期 */
  receivedDate: Date;
  /** 生产日期 */
  productionDate?: Date;
  /** 过期日期 */
  expiryDate?: Date;
  /** 批次号 */
  batchNumber?: string;
  /** 供应商ID */
  supplierId?: string;
}

/**
 * 库存服务接口
 */
export interface IInventoryService extends IBusinessService {
  // ==================== 库存查询 ====================

  /**
   * 获取所有库存记录
   */
  findAllStocks(): Promise<InventoryStock[]>;

  /**
   * 根据产品ID获取库存
   */
  findByProduct(productId: string): Promise<InventoryStock[]>;

  /**
   * 根据仓库ID获取库存
   */
  findByWarehouse(warehouseId: string): Promise<InventoryStock[]>;

  /**
   * 获取指定产品在指定仓库的库存
   */
  findByProductAndWarehouse(productId: string, warehouseId: string): Promise<InventoryStock | null>;

  /**
   * 分页查询库存
   */
  findPaginated(params: PaginationParams, filter?: InventoryFilter): Promise<PaginatedResult<InventoryStock>>;

  /**
   * 获取低库存产品
   */
  findLowStockItems(): Promise<InventoryStock[]>;

  /**
   * 获取缺货产品
   */
  findOutOfStockItems(): Promise<InventoryStock[]>;

  // ==================== 库存操作 ====================

  /**
   * 入库操作
   */
  stockIn(
    productId: string,
    warehouseId: string,
    quantity: number,
    unitCost?: number,
    referenceNumber?: string,
    notes?: string,
    operatorId?: string
  ): Promise<InventoryTransaction>;

  /**
   * 出库操作
   */
  stockOut(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceNumber?: string,
    notes?: string,
    operatorId?: string
  ): Promise<InventoryTransaction>;

  /**
   * 库存调整
   */
  adjustStock(
    productId: string,
    warehouseId: string,
    newQuantity: number,
    reason: string,
    operatorId?: string
  ): Promise<InventoryAdjustment>;

  /**
   * 库存转移
   */
  transferStock(
    productId: string,
    fromWarehouseId: string,
    toWarehouseId: string,
    quantity: number,
    referenceNumber?: string,
    operatorId?: string
  ): Promise<{
    outTransaction: InventoryTransaction;
    inTransaction: InventoryTransaction;
  }>;

  /**
   * 批量库存操作
   */
  batchStockOperation(operations: Array<{
    type: 'in' | 'out' | 'adjust' | 'transfer';
    productId: string;
    warehouseId: string;
    quantity: number;
    toWarehouseId?: string; // 仅用于转移
    unitCost?: number;
    reason?: string;
    referenceNumber?: string;
  }>, operatorId?: string): Promise<BatchOperationResult<InventoryTransaction>>;

  // ==================== 库存预留 ====================

  /**
   * 预留库存
   */
  reserveStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceNumber?: string,
    operatorId?: string
  ): Promise<void>;

  /**
   * 释放预留库存
   */
  releaseReservedStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceNumber?: string,
    operatorId?: string
  ): Promise<void>;

  /**
   * 获取预留库存信息
   */
  getReservedStock(productId: string, warehouseId?: string): Promise<Array<{
    warehouseId: string;
    reservedQuantity: number;
    referenceNumber?: string;
    reservedAt: Date;
  }>>;

  // ==================== 交易记录 ====================

  /**
   * 获取库存交易记录
   */
  getTransactions(filter?: InventoryTransactionFilter): Promise<InventoryTransaction[]>;

  /**
   * 分页查询交易记录
   */
  getTransactionsPaginated(
    params: PaginationParams,
    filter?: InventoryTransactionFilter
  ): Promise<PaginatedResult<InventoryTransaction>>;

  /**
   * 根据产品获取交易记录
   */
  getTransactionsByProduct(productId: string, limit?: number): Promise<InventoryTransaction[]>;

  /**
   * 根据仓库获取交易记录
   */
  getTransactionsByWarehouse(warehouseId: string, limit?: number): Promise<InventoryTransaction[]>;

  /**
   * 根据参考单号获取交易记录
   */
  getTransactionsByReference(referenceNumber: string): Promise<InventoryTransaction[]>;

  // ==================== FIFO库存管理 ====================

  /**
   * 获取产品的FIFO批次
   */
  getFifoBatches(productId: string, warehouseId: string): Promise<InventoryBatch[]>;

  /**
   * FIFO出库（先进先出）
   */
  fifoStockOut(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceNumber?: string,
    operatorId?: string
  ): Promise<{
    transactions: InventoryTransaction[];
    usedBatches: Array<{
      batch: InventoryBatch;
      usedQuantity: number;
    }>;
  }>;

  /**
   * 添加FIFO批次
   */
  addFifoBatch(batch: Omit<InventoryBatch, 'batchId'>): Promise<InventoryBatch>;

  /**
   * 获取即将过期的批次
   */
  getExpiringBatches(days: number): Promise<InventoryBatch[]>;

  // ==================== 库存预警 ====================

  /**
   * 设置库存预警
   */
  setInventoryAlert(alert: Omit<InventoryAlert, 'id'>): Promise<InventoryAlert>;

  /**
   * 获取库存预警配置
   */
  getInventoryAlerts(productId?: string): Promise<InventoryAlert[]>;

  /**
   * 检查库存预警
   */
  checkInventoryAlerts(): Promise<Array<{
    alert: InventoryAlert;
    currentStock: number;
    alertType: 'low_stock' | 'high_stock' | 'out_of_stock';
  }>>;

  /**
   * 删除库存预警
   */
  removeInventoryAlert(productId: string, warehouseId?: string): Promise<void>;

  // ==================== 库存盘点 ====================

  /**
   * 创建盘点任务
   */
  createStockCount(
    warehouseId: string,
    productIds?: string[],
    operatorId?: string
  ): Promise<{
    countId: string;
    expectedItems: Array<{
      productId: string;
      expectedQuantity: number;
    }>;
  }>;

  /**
   * 提交盘点结果
   */
  submitStockCount(
    countId: string,
    results: Array<{
      productId: string;
      actualQuantity: number;
    }>,
    operatorId?: string
  ): Promise<{
    adjustments: InventoryAdjustment[];
    discrepancies: Array<{
      productId: string;
      expected: number;
      actual: number;
      difference: number;
    }>;
  }>;

  // ==================== 统计和分析 ====================

  /**
   * 获取库存统计信息
   */
  getStatistics(): Promise<InventoryStatistics>;

  /**
   * 获取库存周转率
   */
  getInventoryTurnover(
    productId?: string,
    warehouseId?: string,
    period?: 'month' | 'quarter' | 'year'
  ): Promise<{
    turnoverRate: number;
    averageInventory: number;
    costOfGoodsSold: number;
  }>;

  /**
   * 获取库存价值分析
   */
  getInventoryValueAnalysis(warehouseId?: string): Promise<{
    totalValue: number;
    topValueProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitCost: number;
      totalValue: number;
    }>;
    valueByCategory: Record<string, number>;
  }>;

  // ==================== 数据验证 ====================

  /**
   * 验证库存数据一致性
   */
  validateInventoryConsistency(): Promise<{
    isConsistent: boolean;
    issues: Array<{
      type: 'negative_stock' | 'missing_product' | 'missing_warehouse' | 'calculation_error';
      productId?: string;
      warehouseId?: string;
      description: string;
      suggestedFix?: string;
    }>;
  }>;

  /**
   * 修复库存数据
   */
  repairInventoryData(
    issues: Array<{
      type: string;
      productId?: string;
      warehouseId?: string;
    }>,
    operatorId?: string
  ): Promise<ServiceResult<void>>;

  // ==================== 数据管理 ====================

  /**
   * 导出库存数据
   */
  exportInventory(filter?: InventoryFilter): Promise<ServiceResult<InventoryStock[]>>;

  /**
   * 导出交易记录
   */
  exportTransactions(filter?: InventoryTransactionFilter): Promise<ServiceResult<InventoryTransaction[]>>;

  /**
   * 重建库存索引
   */
  rebuildInventoryIndex(): Promise<void>;

  /**
   * 清理历史交易记录
   */
  cleanupOldTransactions(olderThanDays: number): Promise<{
    deletedCount: number;
    archivedCount: number;
  }>;
}
