/**
 * FIFO (先进先出) 库存管理服务
 */

import { v4 as uuidv4 } from 'uuid';
import {
  InventoryBatch,
  BatchConsumption,
  FifoOutboundResult,
  BatchAllocation,
  FifoStockInParams,
  FifoStockOutParams,
  BatchQueryParams,
  BatchStatistics,
  FifoConfig,
  FifoOperationResult,
  BatchStatus,
  FifoErrorType
} from '../../types/fifo';
import { InventoryTransaction, TransactionType } from '../../types/entities';
import { ConcurrencyManager } from '../../utils/concurrency';
import { logger } from '../../utils/secureLogger';

/**
 * FIFO库存管理服务类
 */
export class FifoInventoryService {
  private batches = new Map<string, InventoryBatch>();
  private batchConsumptions = new Map<string, BatchConsumption>();
  private batchesByProduct = new Map<string, Set<string>>(); // productId -> batchIds
  private batchesByWarehouse = new Map<string, Set<string>>(); // warehouseId -> batchIds
  
  // 默认FIFO配置
  private config: FifoConfig = {
    enableFifo: true,
    autoGenerateBatchNo: true,
    batchNoPrefix: 'BATCH',
    enableExpiryTracking: true,
    expiryWarningDays: 30,
    enableBatchMerging: false,
    maxBatchAge: 365,
    cleanupDepletedBatches: false
  };

  constructor() {
    console.log('FIFO Inventory Service initialized');
  }

  // =============== 配置管理 ===============

  /**
   * 更新FIFO配置
   */
  updateConfig(newConfig: Partial<FifoConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('FIFO configuration updated', newConfig);
  }

  /**
   * 获取当前配置
   */
  getConfig(): FifoConfig {
    return { ...this.config };
  }

  // =============== 批次管理 ===============

  /**
   * 创建新批次（入库）
   */
  async createBatch(params: FifoStockInParams): Promise<FifoOperationResult<InventoryBatch>> {
    try {
      // 输入验证
      if (params.quantity <= 0) {
        return {
          success: false,
          error: {
            type: FifoErrorType.INVALID_QUANTITY,
            message: '入库数量必须大于0',
            details: { quantity: params.quantity }
          }
        };
      }

      if (params.unitCost < 0) {
        return {
          success: false,
          error: {
            type: FifoErrorType.INVALID_COST,
            message: '单位成本不能为负数',
            details: { unitCost: params.unitCost }
          }
        };
      }

      // 生成批次号
      const _batchNo = params.batchNo || this.generateBatchNo();

      // 创建批次记录
      const batch: InventoryBatch = {
        id: uuidv4(),
        batchNo,
        productId: params.productId,
        warehouseId: params.warehouseId,
        originalQuantity: params.quantity,
        remainingQuantity: params.quantity,
        unitCost: params.unitCost,
        totalCost: params.quantity * params.unitCost,
        inboundDate: new Date(),
        expiryDate: params.expiryDate,
        supplierBatchNo: params.supplierBatchNo,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        status: BatchStatus.ACTIVE,
        remark: params.remark,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 保存批次
      this.batches.set(batch.id, batch);
      
      // 更新索引
      this.addToProductIndex(params.productId, batch.id);
      this.addToWarehouseIndex(params.warehouseId, batch.id);

      logger.info('New inventory batch created', {
        batchId: batch.id,
        batchNo: batch.batchNo,
        productId: params.productId,
        warehouseId: params.warehouseId,
        quantity: params.quantity,
        unitCost: params.unitCost
      });

      return {
        success: true,
        data: batch
      };

    } catch (error) {
      logger.error('Failed to create inventory batch', error);
      return {
        success: false,
        error: {
          type: FifoErrorType.CONFIGURATION_ERROR,
          message: '创建批次失败',
          details: error
        }
      };
    }
  }

  /**
   * FIFO出库计算
   */
  async calculateFifoOutbound(params: FifoStockOutParams): Promise<FifoOperationResult<FifoOutboundResult>> {
    try {
      // 获取可用批次（按FIFO顺序）
      const _availableBatches = await this.getAvailableBatches(params.productId, params.warehouseId);
      
      if (availableBatches.length === 0) {
        return {
          success: false,
          error: {
            type: FifoErrorType.INSUFFICIENT_STOCK,
            message: '没有可用的库存批次',
            productId: params.productId,
            warehouseId: params.warehouseId
          }
        };
      }

      // 计算分配
      const allocations: BatchAllocation[] = [];
      const _remainingQuantity = params.quantity;
      const _totalCost = 0;

      for (const batch of availableBatches) {
        if (remainingQuantity <= 0) break;

        const _allocatedQuantity = Math.min(remainingQuantity, batch.remainingQuantity);
        const _allocationCost = allocatedQuantity * batch.unitCost;

        allocations.push({
          batchId: batch.id,
          batchNo: batch.batchNo,
          allocatedQuantity,
          unitCost: batch.unitCost,
          totalCost: allocationCost,
          inboundDate: batch.inboundDate,
          remainingAfterAllocation: batch.remainingQuantity - allocatedQuantity
        });

        totalCost += allocationCost;
        remainingQuantity -= allocatedQuantity;
      }

      const _canFulfill = remainingQuantity <= 0;
      const _avgUnitCost = params.quantity > 0 ? totalCost / (params.quantity - remainingQuantity) : 0;

      const result: FifoOutboundResult = {
        canFulfill,
        totalCost,
        avgUnitCost,
        batchAllocations: allocations,
        insufficientQuantity: remainingQuantity > 0 ? remainingQuantity : undefined
      };

      return {
        success: true,
        data: result
      };

    } catch (error) {
      logger.error('Failed to calculate FIFO outbound', error);
      return {
        success: false,
        error: {
          type: FifoErrorType.CONFIGURATION_ERROR,
          message: 'FIFO出库计算失败',
          details: error
        }
      };
    }
  }

  /**
   * 执行FIFO出库
   */
  async executeFifoOutbound(
    params: FifoStockOutParams,
    transaction: InventoryTransaction
  ): Promise<FifoOperationResult<BatchConsumption[]>> {
    const _lockKey = `fifo-outbound-${params.productId}-${params.warehouseId}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      try {
        // 先计算分配
        const _calculationResult = await this.calculateFifoOutbound(params);
        if (!calculationResult.success || !calculationResult.data) {
          return {
            success: false,
            error: calculationResult.error
          };
        }

        const { canFulfill, batchAllocations } = calculationResult.data;

        // 检查是否可以满足需求
        if (!canFulfill && !params.allowPartialFulfillment) {
          return {
            success: false,
            error: {
              type: FifoErrorType.INSUFFICIENT_STOCK,
              message: '库存不足，无法完全满足出库需求',
              productId: params.productId,
              warehouseId: params.warehouseId,
              details: {
                requestedQuantity: params.quantity,
                insufficientQuantity: calculationResult.data.insufficientQuantity
              }
            }
          };
        }

        // 执行批次消耗
        const consumptions: BatchConsumption[] = [];

        for (const allocation of batchAllocations) {
          // 更新批次剩余数量
          const _batch = this.batches.get(allocation.batchId);
          if (!batch) {
            throw new Error(`批次不存在: ${allocation.batchId}`);
          }

          batch.remainingQuantity = allocation.remainingAfterAllocation;
          batch.updatedAt = new Date();

          // 如果批次已耗尽，更新状态
          if (batch.remainingQuantity <= 0) {
            batch.status = BatchStatus.DEPLETED;
          }

          // 创建消耗记录
          const consumption: BatchConsumption = {
            id: uuidv4(),
            batchId: allocation.batchId,
            transactionId: transaction.id,
            consumedQuantity: allocation.allocatedQuantity,
            unitCost: allocation.unitCost,
            totalCost: allocation.totalCost,
            consumptionDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          };

          this.batchConsumptions.set(consumption.id, consumption);
          consumptions.push(consumption);
        }

        logger.info('FIFO outbound executed successfully', {
          transactionId: transaction.id,
          productId: params.productId,
          warehouseId: params.warehouseId,
          requestedQuantity: params.quantity,
          allocatedBatches: batchAllocations.length,
          totalCost: batchAllocations.reduce((sum, a) => sum + a.totalCost, 0)
        });

        return {
          success: true,
          data: consumptions
        };

      } catch (error) {
        logger.error('Failed to execute FIFO outbound', error);
        return {
          success: false,
          error: {
            type: FifoErrorType.CONFIGURATION_ERROR,
            message: 'FIFO出库执行失败',
            details: error
          }
        };
      }
    });
  }

  // =============== 查询方法 ===============

  /**
   * 获取可用批次（按FIFO顺序）
   */
  private async getAvailableBatches(productId: string, warehouseId: string): Promise<InventoryBatch[]> {
    const _productBatchIds = this.batchesByProduct.get(productId) || new Set();
    const _warehouseBatchIds = this.batchesByWarehouse.get(warehouseId) || new Set();
    
    // 找到同时属于指定产品和仓库的批次
    const _relevantBatchIds = new Set([...productBatchIds].filter(id => warehouseBatchIds.has(id)));
    
    const _batches = Array.from(relevantBatchIds)
      .map(id => this.batches.get(id))
      .filter((batch): batch is InventoryBatch => 
        batch !== undefined && 
        batch.status === BatchStatus.ACTIVE && 
        batch.remainingQuantity > 0
      );

    // 按入库日期排序（FIFO）
    return batches.sort((a, b) => a.inboundDate.getTime() - b.inboundDate.getTime());
  }

  /**
   * 查询批次
   */
  async queryBatches(params: BatchQueryParams): Promise<InventoryBatch[]> {
    const _batches = Array.from(this.batches.values());

    // 应用筛选条件
    if (params.productId) {
      const _productBatchIds = this.batchesByProduct.get(params.productId) || new Set();
      batches = batches.filter(batch => productBatchIds.has(batch.id));
    }

    if (params.warehouseId) {
      const _warehouseBatchIds = this.batchesByWarehouse.get(params.warehouseId) || new Set();
      batches = batches.filter(batch => warehouseBatchIds.has(batch.id));
    }

    if (params.status) {
      batches = batches.filter(batch => batch.status === params.status);
    }

    if (params.dateRange) {
      batches = batches.filter(batch => 
        batch.inboundDate >= params.dateRange!.startDate &&
        batch.inboundDate <= params.dateRange!.endDate
      );
    }

    if (!params.includeExpired) {
      const _now = new Date();
      batches = batches.filter(batch => 
        !batch.expiryDate || batch.expiryDate > now
      );
    }

    // 排序
    if (params.sortBy) {
      batches.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (params.sortBy) {
          case 'inboundDate':
            aValue = a.inboundDate.getTime();
            bValue = b.inboundDate.getTime();
            break;
          case 'expiryDate':
            aValue = a.expiryDate?.getTime() || 0;
            bValue = b.expiryDate?.getTime() || 0;
            break;
          case 'remainingQuantity':
            aValue = a.remainingQuantity;
            bValue = b.remainingQuantity;
            break;
          default:
            return 0;
        }

        const _result = aValue - bValue;
        return params.sortOrder === 'desc' ? -result : result;
      });
    }

    return batches;
  }

  // =============== 工具方法 ===============

  /**
   * 生成批次号
   */
  private generateBatchNo(): string {
    const _timestamp = Date.now();
    const _random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${this.config.batchNoPrefix}-${timestamp}-${random}`;
  }

  /**
   * 添加到产品索引
   */
  private addToProductIndex(productId: string, batchId: string): void {
    if (!this.batchesByProduct.has(productId)) {
      this.batchesByProduct.set(productId, new Set());
    }
    this.batchesByProduct.get(productId)!.add(batchId);
  }

  /**
   * 添加到仓库索引
   */
  private addToWarehouseIndex(warehouseId: string, batchId: string): void {
    if (!this.batchesByWarehouse.has(warehouseId)) {
      this.batchesByWarehouse.set(warehouseId, new Set());
    }
    this.batchesByWarehouse.get(warehouseId)!.add(batchId);
  }

  /**
   * 获取批次统计信息
   */
  async getBatchStatistics(productId?: string, warehouseId?: string): Promise<BatchStatistics> {
    const _batches = await this.queryBatches({ productId, warehouseId });
    
    if (batches.length === 0) {
      return {
        totalBatches: 0,
        activeBatches: 0,
        depletedBatches: 0,
        expiredBatches: 0,
        totalValue: 0,
        oldestBatchDate: null,
        newestBatchDate: null,
        avgBatchAge: 0
      };
    }

    const _now = new Date();
    const _activeBatches = batches.filter(b => b.status === BatchStatus.ACTIVE).length;
    const _depletedBatches = batches.filter(b => b.status === BatchStatus.DEPLETED).length;
    const _expiredBatches = batches.filter(b => b.status === BatchStatus.EXPIRED).length;
    const _totalValue = batches.reduce((sum, b) => sum + (b.remainingQuantity * b.unitCost), 0);
    
    const _dates = batches.map(b => b.inboundDate.getTime()).sort((a, b) => a - b);
    const _oldestBatchDate = dates.length > 0 ? new Date(dates[0]) : null;
    const _newestBatchDate = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;
    
    const _totalAge = batches.reduce((sum, b) => {
      const _age = (now.getTime() - b.inboundDate.getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0);
    const _avgBatchAge = batches.length > 0 ? totalAge / batches.length : 0;

    return {
      totalBatches: batches.length,
      activeBatches,
      depletedBatches,
      expiredBatches,
      totalValue,
      oldestBatchDate,
      newestBatchDate,
      avgBatchAge
    };
  }
}

// 创建并导出服务实例
const _fifoInventoryService = new FifoInventoryService();
export default fifoInventoryService;
