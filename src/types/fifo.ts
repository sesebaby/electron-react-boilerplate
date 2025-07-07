/**
 * FIFO (先进先出) 库存管理相关类型定义
 */

import { BaseEntity } from './entities';

// =============== 库存批次管理 ===============

/**
 * 库存批次记录
 * 用于实现FIFO（先进先出）库存管理
 */
export interface InventoryBatch extends BaseEntity {
  batchNo: string;              // 批次号
  productId: string;            // 产品ID
  warehouseId: string;          // 仓库ID
  originalQuantity: number;     // 原始入库数量
  remainingQuantity: number;    // 剩余数量
  unitCost: number;             // 单位成本
  totalCost: number;            // 总成本
  inboundDate: Date;            // 入库日期
  expiryDate?: Date;            // 过期日期（如果适用）
  supplierBatchNo?: string;     // 供应商批次号
  referenceType?: string;       // 关联类型（采购单、调拨单等）
  referenceId?: string;         // 关联ID
  status: BatchStatus;          // 批次状态
  remark?: string;              // 备注
}

/**
 * 批次状态枚举
 */
export enum BatchStatus {
  ACTIVE = 'active',           // 活跃（有剩余库存）
  DEPLETED = 'depleted',       // 已耗尽
  EXPIRED = 'expired',         // 已过期
  LOCKED = 'locked'            // 已锁定（不可用）
}

/**
 * 批次消耗记录
 * 记录每次出库时从哪些批次消耗了多少数量
 */
export interface BatchConsumption extends BaseEntity {
  batchId: string;              // 批次ID
  transactionId: string;        // 库存事务ID
  consumedQuantity: number;     // 消耗数量
  unitCost: number;             // 消耗时的单位成本
  totalCost: number;            // 消耗的总成本
  consumptionDate: Date;        // 消耗日期
}

// =============== FIFO 计算结果 ===============

/**
 * FIFO出库计算结果
 */
export interface FifoOutboundResult {
  canFulfill: boolean;          // 是否可以满足出库需求
  totalCost: number;            // 总成本
  avgUnitCost: number;          // 平均单位成本
  batchAllocations: BatchAllocation[]; // 批次分配详情
  insufficientQuantity?: number; // 不足的数量（如果无法完全满足）
}

/**
 * 批次分配详情
 */
export interface BatchAllocation {
  batchId: string;              // 批次ID
  batchNo: string;              // 批次号
  allocatedQuantity: number;    // 分配数量
  unitCost: number;             // 单位成本
  totalCost: number;            // 总成本
  inboundDate: Date;            // 入库日期
  remainingAfterAllocation: number; // 分配后剩余数量
}

// =============== FIFO 服务接口 ===============

/**
 * FIFO库存操作参数
 */
export interface FifoStockInParams {
  productId: string;
  warehouseId: string;
  quantity: number;
  unitCost: number;
  batchNo?: string;             // 可选的批次号，如果不提供则自动生成
  supplierBatchNo?: string;     // 供应商批次号
  expiryDate?: Date;            // 过期日期
  referenceType?: string;
  referenceId?: string;
  remark?: string;
  operator: string;
}

/**
 * FIFO出库操作参数
 */
export interface FifoStockOutParams {
  productId: string;
  warehouseId: string;
  quantity: number;
  referenceType?: string;
  referenceId?: string;
  remark?: string;
  operator: string;
  allowPartialFulfillment?: boolean; // 是否允许部分满足
}

/**
 * 批次查询参数
 */
export interface BatchQueryParams {
  productId?: string;
  warehouseId?: string;
  status?: BatchStatus;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeExpired?: boolean;
  sortBy?: 'inboundDate' | 'expiryDate' | 'remainingQuantity';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 批次统计信息
 */
export interface BatchStatistics {
  totalBatches: number;         // 总批次数
  activeBatches: number;        // 活跃批次数
  depletedBatches: number;      // 已耗尽批次数
  expiredBatches: number;       // 已过期批次数
  totalValue: number;           // 总价值
  oldestBatchDate: Date | null; // 最早批次日期
  newestBatchDate: Date | null; // 最新批次日期
  avgBatchAge: number;          // 平均批次年龄（天）
}

// =============== FIFO 配置 ===============

/**
 * FIFO配置选项
 */
export interface FifoConfig {
  enableFifo: boolean;          // 是否启用FIFO
  autoGenerateBatchNo: boolean; // 是否自动生成批次号
  batchNoPrefix: string;        // 批次号前缀
  enableExpiryTracking: boolean; // 是否启用过期跟踪
  expiryWarningDays: number;    // 过期预警天数
  enableBatchMerging: boolean;  // 是否启用批次合并（相同成本的批次）
  maxBatchAge: number;          // 最大批次年龄（天）
  cleanupDepletedBatches: boolean; // 是否清理已耗尽的批次
}

// =============== 验证和错误处理 ===============

/**
 * FIFO操作错误类型
 */
export enum FifoErrorType {
  INSUFFICIENT_STOCK = 'insufficient_stock',
  BATCH_NOT_FOUND = 'batch_not_found',
  BATCH_EXPIRED = 'batch_expired',
  BATCH_LOCKED = 'batch_locked',
  INVALID_QUANTITY = 'invalid_quantity',
  INVALID_COST = 'invalid_cost',
  CONFIGURATION_ERROR = 'configuration_error'
}

/**
 * FIFO操作错误
 */
export interface FifoError {
  type: FifoErrorType;
  message: string;
  details?: any;
  batchId?: string;
  productId?: string;
  warehouseId?: string;
}

/**
 * FIFO操作结果
 */
export interface FifoOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: FifoError;
  warnings?: string[];
}

// =============== 报表和分析 ===============

/**
 * 库存周转分析
 */
export interface InventoryTurnoverAnalysis {
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  avgInventoryValue: number;    // 平均库存价值
  totalCostOfGoodsSold: number; // 销售成本总额
  turnoverRatio: number;        // 周转率
  avgDaysInInventory: number;   // 平均库存天数
  oldestBatchAge: number;       // 最老批次年龄
  slowMovingBatches: number;    // 滞销批次数量
}

/**
 * 批次年龄分析
 */
export interface BatchAgeAnalysis {
  ageRanges: {
    range: string;              // 年龄范围（如 "0-30天"）
    batchCount: number;         // 批次数量
    totalQuantity: number;      // 总数量
    totalValue: number;         // 总价值
    percentage: number;         // 占比
  }[];
  avgAge: number;               // 平均年龄
  oldestBatch: {
    batchId: string;
    batchNo: string;
    age: number;
    quantity: number;
    value: number;
  } | null;
}

// =============== 导出类型 ===============
// 注意：所有类型都已在上面定义，这里不需要重复导出
