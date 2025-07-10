/**
 * 月度结余服务
 * 处理月度结余的生成、查询、统计和分析
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MonthlyBalance,
  MonthlyBalanceStatus,
  MonthlyBalanceSummary,
  MonthlyBalanceGenerateParams,
  MonthlyBalanceQueryParams,
  MonthlyBalanceStatistics,
  MonthlyBalanceComparison,
  MonthlyBalanceOperationResult,
  MonthlyBalanceGenerateResult
} from '../../types/monthlyBalance';
import { InventoryBatch, BatchStatus } from '../../types/fifo';
import { Product, Category, Unit, Warehouse } from '../../types/entities';
import fifoInventoryService from './fifoInventoryService';
import productService from './productService';
import { getGlobalServices } from '../container/containerConfig';
import { unitService } from './index';
import { warehouseService } from './warehouseService';
import { logger } from '../../utils/logger';
import { ConcurrencyManager } from '../../utils/concurrency';

/**
 * 月度结余服务类
 */
export class MonthlyBalanceService {
  private balances = new Map<string, MonthlyBalance>();
  private balancesByPeriod = new Map<string, Set<string>>(); // "YYYY-MM" -> balanceIds
  private balancesByProduct = new Map<string, Set<string>>(); // productId -> balanceIds
  private balancesByWarehouse = new Map<string, Set<string>>(); // warehouseId -> balanceIds
  private initialized = false;

  constructor() {
    console.log('Monthly Balance Service initialized');
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 初始化服务状态
      console.log('Initializing Monthly Balance Service...');
      
      // 这里可以从数据库加载历史数据
      await this.loadHistoricalData();
      
      this.initialized = true;
      logger.info('Monthly Balance Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Monthly Balance Service', error);
      throw error;
    }
  }

  // =============== 月度结余生成 ===============

  /**
   * 生成月度结余
   */
  async generateMonthlyBalance(
    params: MonthlyBalanceGenerateParams
  ): Promise<MonthlyBalanceOperationResult<MonthlyBalanceGenerateResult>> {
    const lockKey = `monthly-balance-generate-${params.year}-${params.month}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      const startTime = Date.now();
      
      try {
        // 输入验证
        if (params.year < 2020 || params.year > 2030) {
          return {
            success: false,
            error: {
              code: 'INVALID_YEAR',
              message: '年份必须在2020-2030范围内'
            }
          };
        }

        if (params.month < 1 || params.month > 12) {
          return {
            success: false,
            error: {
              code: 'INVALID_MONTH',
              message: '月份必须在1-12范围内'
            }
          };
        }

        // 计算结余日期（月末）
        const balanceDate = new Date(params.year, params.month, 0); // 当月最后一天
        const periodKey = `${params.year}-${params.month.toString().padStart(2, '0')}`;

        // 检查是否已生成过该月的结余
        const existingBalances = this.balancesByPeriod.get(periodKey) || new Set();
        if (existingBalances.size > 0) {
          return {
            success: false,
            error: {
              code: 'BALANCE_ALREADY_EXISTS',
              message: `${params.year}年${params.month}月的结余已经生成过了`
            }
          };
        }

        // 获取所有批次数据
        const allBatches = await fifoInventoryService.queryBatches({
          includeExpired: params.includeExpired,
          dateRange: {
            startDate: new Date(2020, 0, 1), // 从2020年开始
            endDate: balanceDate
          }
        });

        // 过滤出在结余日期仍有库存的批次
        const validBatches = allBatches.filter(batch => {
          // 批次必须在结余日期之前入库
          if (batch.inboundDate > balanceDate) {
            return false;
          }
          
          // 如果不包含零库存，则过滤掉剩余数量为0的批次
          if (!params.includeZeroStock && batch.remainingQuantity <= 0) {
            return false;
          }
          
          // 如果不包含过期批次，则过滤掉已过期的批次
          if (!params.includeExpired && batch.expiryDate && batch.expiryDate < balanceDate) {
            return false;
          }
          
          return true;
        });

        // 应用过滤条件
        const filteredBatches = await this.applyFilters(validBatches, params);
        
        // 获取相关的产品、仓库、分类、单位信息
        const productIds = [...new Set(filteredBatches.map(b => b.productId))];
        const warehouseIds = [...new Set(filteredBatches.map(b => b.warehouseId))];
        
        const [products, warehouses, categories, units] = await Promise.all([
          this.getProductsByIds(productIds),
          this.getWarehousesByIds(warehouseIds),
          this.getAllCategories(),
          this.getAllUnits()
        ]);

        // 创建映射表
        const productMap = new Map(products.map(p => [p.id, p]));
        const warehouseMap = new Map(warehouses.map(w => [w.id, w]));
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        const unitMap = new Map(units.map(u => [u.id, u]));

        // 生成月度结余记录
        const generatedBalances: MonthlyBalance[] = [];
        const errors: string[] = [];

        for (const batch of filteredBatches) {
          try {
            const product = productMap.get(batch.productId);
            const warehouse = warehouseMap.get(batch.warehouseId);
            
            if (!product || !warehouse) {
              errors.push(`批次 ${batch.batchNo} 的产品或仓库信息不存在`);
              continue;
            }

            const category = categoryMap.get(product.categoryId);
            const unit = unitMap.get(product.unitId);

            if (!category || !unit) {
              errors.push(`产品 ${product.name} 的分类或单位信息不存在`);
              continue;
            }

            // 计算批次年龄
            const batchAge = Math.floor((balanceDate.getTime() - batch.inboundDate.getTime()) / (1000 * 60 * 60 * 24));

            // 创建月度结余记录
            const balance: MonthlyBalance = {
              id: uuidv4(),
              balanceDate,
              year: params.year,
              month: params.month,
              productId: product.id,
              productName: product.name,
              productSku: product.sku,
              categoryId: category.id,
              categoryName: category.name,
              warehouseId: warehouse.id,
              warehouseName: warehouse.name,
              unitId: unit.id,
              unitName: unit.name,
              unitSymbol: unit.symbol,
              batchId: batch.id,
              batchNo: batch.batchNo,
              inboundDate: batch.inboundDate,
              supplierBatchNo: batch.supplierBatchNo,
              remainingQuantity: batch.remainingQuantity,
              unitCost: batch.unitCost,
              totalValue: batch.remainingQuantity * batch.unitCost,
              expiryDate: batch.expiryDate,
              batchAge,
              status: this.calculateBalanceStatus(batch, balanceDate),
              generatedBy: params.operator,
              generatedAt: new Date(),
              isAutoGenerated: true,
              remark: params.remark,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            generatedBalances.push(balance);

            // 保存到内存
            this.balances.set(balance.id, balance);
            
            // 更新索引
            this.addToPeriodIndex(periodKey, balance.id);
            this.addToProductIndex(balance.productId, balance.id);
            this.addToWarehouseIndex(balance.warehouseId, balance.id);

          } catch (error) {
            errors.push(`处理批次 ${batch.batchNo} 时出错: ${error instanceof Error ? error.message : '未知错误'}`);
          }
        }

        // 生成汇总信息
        const summary = await this.generateSummary(params.year, params.month, generatedBalances);
        
        const processingTime = Date.now() - startTime;
        
        const result: MonthlyBalanceGenerateResult = {
          success: true,
          generatedRecords: generatedBalances.length,
          totalValue: summary.totals.totalValue,
          batchCount: summary.totals.batchCount,
          productCount: summary.totals.productCount,
          warehouseCount: summary.warehouseSummary.length,
          processingTime,
          errors: errors.length > 0 ? errors : undefined,
          summary
        };

        logger.info('Monthly balance generated successfully', {
          year: params.year,
          month: params.month,
          generatedRecords: generatedBalances.length,
          totalValue: summary.totals.totalValue,
          processingTime
        });

        return {
          success: true,
          data: result
        };

      } catch (error) {
        logger.error('Failed to generate monthly balance', error);
        return {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: '月度结余生成失败',
            details: error
          }
        };
      }
    });
  }

  // =============== 月度结余查询 ===============

  /**
   * 查询月度结余
   */
  async queryMonthlyBalance(
    params: MonthlyBalanceQueryParams
  ): Promise<MonthlyBalanceOperationResult<MonthlyBalance[]>> {
    try {
      let balances = Array.from(this.balances.values());

      // 应用筛选条件
      if (params.year) {
        balances = balances.filter(b => b.year === params.year);
      }

      if (params.month) {
        balances = balances.filter(b => b.month === params.month);
      }

      if (params.startDate) {
        balances = balances.filter(b => b.balanceDate >= params.startDate!);
      }

      if (params.endDate) {
        balances = balances.filter(b => b.balanceDate <= params.endDate!);
      }

      if (params.productId) {
        balances = balances.filter(b => b.productId === params.productId);
      }

      if (params.warehouseId) {
        balances = balances.filter(b => b.warehouseId === params.warehouseId);
      }

      if (params.categoryId) {
        balances = balances.filter(b => b.categoryId === params.categoryId);
      }

      if (params.status) {
        balances = balances.filter(b => b.status === params.status);
      }

      if (!params.includeExpired) {
        balances = balances.filter(b => b.status !== MonthlyBalanceStatus.EXPIRED);
      }

      if (params.minValue !== undefined) {
        balances = balances.filter(b => b.totalValue >= params.minValue!);
      }

      if (params.maxValue !== undefined) {
        balances = balances.filter(b => b.totalValue <= params.maxValue!);
      }

      if (params.batchNoPattern) {
        const pattern = new RegExp(params.batchNoPattern, 'i');
        balances = balances.filter(b => pattern.test(b.batchNo));
      }

      // 排序
      if (params.sortBy) {
        balances.sort((a, b) => {
          let aValue: any, bValue: any;
          
          switch (params.sortBy) {
            case 'balanceDate':
              aValue = a.balanceDate.getTime();
              bValue = b.balanceDate.getTime();
              break;
            case 'productName':
              aValue = a.productName;
              bValue = b.productName;
              break;
            case 'totalValue':
              aValue = a.totalValue;
              bValue = b.totalValue;
              break;
            case 'batchAge':
              aValue = a.batchAge;
              bValue = b.batchAge;
              break;
            case 'inboundDate':
              aValue = a.inboundDate.getTime();
              bValue = b.inboundDate.getTime();
              break;
            default:
              return 0;
          }

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return params.sortOrder === 'desc' ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
          }

          const result = aValue - bValue;
          return params.sortOrder === 'desc' ? -result : result;
        });
      }

      // 分页
      if (params.page && params.pageSize) {
        const start = (params.page - 1) * params.pageSize;
        const end = start + params.pageSize;
        balances = balances.slice(start, end);
      }

      return {
        success: true,
        data: balances
      };

    } catch (error) {
      logger.error('Failed to query monthly balance', error);
      return {
        success: false,
        error: {
          code: 'QUERY_FAILED',
          message: '月度结余查询失败',
          details: error
        }
      };
    }
  }

  // =============== 月度结余统计 ===============

  /**
   * 获取月度结余统计信息
   */
  async getMonthlyBalanceStatistics(
    year: number,
    month: number
  ): Promise<MonthlyBalanceOperationResult<MonthlyBalanceStatistics>> {
    try {
      const periodKey = `${year}-${month.toString().padStart(2, '0')}`;
      const balanceIds = this.balancesByPeriod.get(periodKey) || new Set();
      
      if (balanceIds.size === 0) {
        return {
          success: false,
          error: {
            code: 'NO_DATA',
            message: `${year}年${month}月的结余数据不存在`
          }
        };
      }

      const balances = Array.from(balanceIds).map(id => this.balances.get(id)!);
      const balanceDate = new Date(year, month, 0);

      // 基础统计
      const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
      const productIds = new Set(balances.map(b => b.productId));
      const batchIds = new Set(balances.map(b => b.batchId));
      const avgBatchValue = balances.length > 0 ? totalValue / balances.length : 0;

      // 年龄分析
      const ageAnalysis = this.calculateAgeAnalysis(balances);

      // 价值分析
      const valueAnalysis = this.calculateValueAnalysis(balances);

      // 过期分析
      const expiryAnalysis = this.calculateExpiryAnalysis(balances, balanceDate);

      // 周转分析
      const turnoverAnalysis = this.calculateTurnoverAnalysis(balances);

      const statistics: MonthlyBalanceStatistics = {
        period: {
          year,
          month,
          balanceDate
        },
        basic: {
          totalRecords: balances.length,
          totalProducts: productIds.size,
          totalBatches: batchIds.size,
          totalValue,
          avgBatchValue
        },
        ageAnalysis,
        valueAnalysis,
        expiryAnalysis,
        turnoverAnalysis
      };

      return {
        success: true,
        data: statistics
      };

    } catch (error) {
      logger.error('Failed to get monthly balance statistics', error);
      return {
        success: false,
        error: {
          code: 'STATISTICS_FAILED',
          message: '月度结余统计失败',
          details: error
        }
      };
    }
  }

  // =============== 工具方法 ===============

  /**
   * 应用过滤条件
   */
  private async applyFilters(
    batches: InventoryBatch[],
    params: MonthlyBalanceGenerateParams
  ): Promise<InventoryBatch[]> {
    let filteredBatches = batches;

    if (params.warehouseIds && params.warehouseIds.length > 0) {
      filteredBatches = filteredBatches.filter(b => params.warehouseIds!.includes(b.warehouseId));
    }

    if (params.productIds && params.productIds.length > 0) {
      filteredBatches = filteredBatches.filter(b => params.productIds!.includes(b.productId));
    }

    if (params.categoryIds && params.categoryIds.length > 0) {
      const products = await this.getProductsByIds([...new Set(filteredBatches.map(b => b.productId))]);
      const productIdsInCategories = products
        .filter(p => params.categoryIds!.includes(p.categoryId))
        .map(p => p.id);
      filteredBatches = filteredBatches.filter(b => productIdsInCategories.includes(b.productId));
    }

    return filteredBatches;
  }

  /**
   * 计算结余状态
   */
  private calculateBalanceStatus(batch: InventoryBatch, balanceDate: Date): MonthlyBalanceStatus {
    if (batch.expiryDate && batch.expiryDate < balanceDate) {
      return MonthlyBalanceStatus.EXPIRED;
    }
    
    if (batch.status === BatchStatus.DEPLETED) {
      return MonthlyBalanceStatus.ARCHIVED;
    }
    
    return MonthlyBalanceStatus.ACTIVE;
  }

  /**
   * 生成汇总信息
   */
  private async generateSummary(
    year: number,
    month: number,
    balances: MonthlyBalance[]
  ): Promise<MonthlyBalanceSummary> {
    const balanceDate = new Date(year, month, 0);

    // 按产品汇总
    const productSummaryMap = new Map<string, any>();
    balances.forEach(balance => {
      if (!productSummaryMap.has(balance.productId)) {
        productSummaryMap.set(balance.productId, {
          productId: balance.productId,
          productName: balance.productName,
          productSku: balance.productSku,
          categoryName: balance.categoryName,
          unitName: balance.unitName,
          unitSymbol: balance.unitSymbol,
          totalQuantity: 0,
          totalValue: 0,
          batchCount: 0,
          totalCost: 0,
          inboundDates: []
        });
      }

      const summary = productSummaryMap.get(balance.productId);
      summary.totalQuantity += balance.remainingQuantity;
      summary.totalValue += balance.totalValue;
      summary.batchCount += 1;
      summary.totalCost += balance.totalValue;
      summary.inboundDates.push(balance.inboundDate);
    });

    const productSummary = Array.from(productSummaryMap.values()).map(p => ({
      ...p,
      avgUnitCost: p.totalQuantity > 0 ? p.totalValue / p.totalQuantity : 0,
      oldestBatchDate: new Date(Math.min(...p.inboundDates.map((d: Date) => d.getTime()))),
      newestBatchDate: new Date(Math.max(...p.inboundDates.map((d: Date) => d.getTime()))),
      avgBatchAge: p.inboundDates.length > 0 ? 
        p.inboundDates.reduce((sum: number, date: Date) => sum + (balanceDate.getTime() - date.getTime()), 0) / 
        (p.inboundDates.length * 1000 * 60 * 60 * 24) : 0,
      expiredBatchCount: balances.filter(b => b.productId === p.productId && b.status === MonthlyBalanceStatus.EXPIRED).length,
      expiredQuantity: balances.filter(b => b.productId === p.productId && b.status === MonthlyBalanceStatus.EXPIRED)
        .reduce((sum, b) => sum + b.remainingQuantity, 0),
      expiredValue: balances.filter(b => b.productId === p.productId && b.status === MonthlyBalanceStatus.EXPIRED)
        .reduce((sum, b) => sum + b.totalValue, 0)
    }));

    // 按仓库汇总
    const warehouseSummaryMap = new Map<string, any>();
    balances.forEach(balance => {
      if (!warehouseSummaryMap.has(balance.warehouseId)) {
        warehouseSummaryMap.set(balance.warehouseId, {
          warehouseId: balance.warehouseId,
          warehouseName: balance.warehouseName,
          totalValue: 0,
          productIds: new Set(),
          batchCount: 0,
          inboundDates: []
        });
      }

      const summary = warehouseSummaryMap.get(balance.warehouseId);
      summary.totalValue += balance.totalValue;
      summary.productIds.add(balance.productId);
      summary.batchCount += 1;
      summary.inboundDates.push(balance.inboundDate);
    });

    const warehouseSummary = Array.from(warehouseSummaryMap.values()).map(w => ({
      warehouseId: w.warehouseId,
      warehouseName: w.warehouseName,
      totalValue: w.totalValue,
      productCount: w.productIds.size,
      batchCount: w.batchCount,
      avgBatchAge: w.inboundDates.length > 0 ? 
        w.inboundDates.reduce((sum: number, date: Date) => sum + (balanceDate.getTime() - date.getTime()), 0) / 
        (w.inboundDates.length * 1000 * 60 * 60 * 24) : 0
    }));

    // 按分类汇总
    const categorySummaryMap = new Map<string, any>();
    balances.forEach(balance => {
      if (!categorySummaryMap.has(balance.categoryId)) {
        categorySummaryMap.set(balance.categoryId, {
          categoryId: balance.categoryId,
          categoryName: balance.categoryName,
          totalValue: 0,
          productIds: new Set(),
          batchCount: 0
        });
      }

      const summary = categorySummaryMap.get(balance.categoryId);
      summary.totalValue += balance.totalValue;
      summary.productIds.add(balance.productId);
      summary.batchCount += 1;
    });

    const categorySummary = Array.from(categorySummaryMap.values()).map(c => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      totalValue: c.totalValue,
      productCount: c.productIds.size,
      batchCount: c.batchCount
    }));

    // 总计
    const totals = {
      totalValue: balances.reduce((sum, b) => sum + b.totalValue, 0),
      totalQuantity: balances.reduce((sum, b) => sum + b.remainingQuantity, 0),
      productCount: new Set(balances.map(b => b.productId)).size,
      batchCount: balances.length,
      expiredBatchCount: balances.filter(b => b.status === MonthlyBalanceStatus.EXPIRED).length,
      expiredValue: balances.filter(b => b.status === MonthlyBalanceStatus.EXPIRED)
        .reduce((sum, b) => sum + b.totalValue, 0)
    };

    return {
      year,
      month,
      balanceDate,
      productSummary,
      warehouseSummary,
      categorySummary,
      totals
    };
  }

  /**
   * 计算年龄分析
   */
  private calculateAgeAnalysis(balances: MonthlyBalance[]): MonthlyBalanceStatistics['ageAnalysis'] {
    const ranges = [
      { range: '0-30天', min: 0, max: 30 },
      { range: '31-60天', min: 31, max: 60 },
      { range: '61-90天', min: 61, max: 90 },
      { range: '91-180天', min: 91, max: 180 },
      { range: '181-365天', min: 181, max: 365 },
      { range: '365天以上', min: 365, max: Infinity }
    ];

    const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
    const rangeStats = ranges.map(range => {
      const rangeBalances = balances.filter(b => b.batchAge >= range.min && b.batchAge <= range.max);
      const totalQuantity = rangeBalances.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const rangeTotalValue = rangeBalances.reduce((sum, b) => sum + b.totalValue, 0);
      
      return {
        range: range.range,
        batchCount: rangeBalances.length,
        totalQuantity,
        totalValue: rangeTotalValue,
        percentage: totalValue > 0 ? (rangeTotalValue / totalValue) * 100 : 0
      };
    });

    const avgAge = balances.length > 0 ? 
      balances.reduce((sum, b) => sum + b.batchAge, 0) / balances.length : 0;

    const oldestBalance = balances.reduce((oldest, current) => 
      current.batchAge > oldest.batchAge ? current : oldest, balances[0]);

    return {
      ranges: rangeStats,
      avgAge,
      oldestBatch: oldestBalance ? {
        batchId: oldestBalance.batchId,
        batchNo: oldestBalance.batchNo,
        age: oldestBalance.batchAge,
        productName: oldestBalance.productName,
        quantity: oldestBalance.remainingQuantity,
        value: oldestBalance.totalValue
      } : null
    };
  }

  /**
   * 计算价值分析
   */
  private calculateValueAnalysis(balances: MonthlyBalance[]): MonthlyBalanceStatistics['valueAnalysis'] {
    const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);

    // 按产品统计
    const productValueMap = new Map<string, { balance: MonthlyBalance; totalValue: number; batchCount: number }>();
    balances.forEach(balance => {
      if (!productValueMap.has(balance.productId)) {
        productValueMap.set(balance.productId, {
          balance,
          totalValue: 0,
          batchCount: 0
        });
      }
      const stat = productValueMap.get(balance.productId)!;
      stat.totalValue += balance.totalValue;
      stat.batchCount += 1;
    });

    const topProducts = Array.from(productValueMap.values())
      .map(p => ({
        productId: p.balance.productId,
        productName: p.balance.productName,
        totalValue: p.totalValue,
        batchCount: p.batchCount,
        percentage: totalValue > 0 ? (p.totalValue / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // 按仓库统计
    const warehouseValueMap = new Map<string, { balance: MonthlyBalance; totalValue: number; batchCount: number }>();
    balances.forEach(balance => {
      if (!warehouseValueMap.has(balance.warehouseId)) {
        warehouseValueMap.set(balance.warehouseId, {
          balance,
          totalValue: 0,
          batchCount: 0
        });
      }
      const stat = warehouseValueMap.get(balance.warehouseId)!;
      stat.totalValue += balance.totalValue;
      stat.batchCount += 1;
    });

    const topWarehouses = Array.from(warehouseValueMap.values())
      .map(w => ({
        warehouseId: w.balance.warehouseId,
        warehouseName: w.balance.warehouseName,
        totalValue: w.totalValue,
        batchCount: w.batchCount,
        percentage: totalValue > 0 ? (w.totalValue / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    // 按分类统计
    const categoryValueMap = new Map<string, { balance: MonthlyBalance; totalValue: number; batchCount: number }>();
    balances.forEach(balance => {
      if (!categoryValueMap.has(balance.categoryId)) {
        categoryValueMap.set(balance.categoryId, {
          balance,
          totalValue: 0,
          batchCount: 0
        });
      }
      const stat = categoryValueMap.get(balance.categoryId)!;
      stat.totalValue += balance.totalValue;
      stat.batchCount += 1;
    });

    const topCategories = Array.from(categoryValueMap.values())
      .map(c => ({
        categoryId: c.balance.categoryId,
        categoryName: c.balance.categoryName,
        totalValue: c.totalValue,
        batchCount: c.batchCount,
        percentage: totalValue > 0 ? (c.totalValue / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);

    return {
      topProducts,
      topWarehouses,
      topCategories
    };
  }

  /**
   * 计算过期分析
   */
  private calculateExpiryAnalysis(balances: MonthlyBalance[], balanceDate: Date): MonthlyBalanceStatistics['expiryAnalysis'] {
    const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
    
    const expiredBalances = balances.filter(b => b.status === MonthlyBalanceStatus.EXPIRED);
    const expiredValue = expiredBalances.reduce((sum, b) => sum + b.totalValue, 0);

    // 即将过期（30天内）
    const soonToExpireDate = new Date(balanceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const soonToExpireBalances = balances.filter(b => 
      b.expiryDate && b.expiryDate <= soonToExpireDate && b.status === MonthlyBalanceStatus.ACTIVE
    );
    const soonToExpireValue = soonToExpireBalances.reduce((sum, b) => sum + b.totalValue, 0);

    return {
      expiredBatches: expiredBalances.length,
      expiredValue,
      expiredPercentage: totalValue > 0 ? (expiredValue / totalValue) * 100 : 0,
      soonToExpire: {
        batchCount: soonToExpireBalances.length,
        totalValue: soonToExpireValue,
        percentage: totalValue > 0 ? (soonToExpireValue / totalValue) * 100 : 0
      }
    };
  }

  /**
   * 计算周转分析
   */
  private calculateTurnoverAnalysis(balances: MonthlyBalance[]): MonthlyBalanceStatistics['turnoverAnalysis'] {
    const totalValue = balances.reduce((sum, b) => sum + b.totalValue, 0);
    
    // 滞销品（批次年龄>90天）
    const slowMovingBalances = balances.filter(b => b.batchAge > 90);
    const slowMovingValue = slowMovingBalances.reduce((sum, b) => sum + b.totalValue, 0);

    // 死库存（批次年龄>365天）
    const deadStockBalances = balances.filter(b => b.batchAge > 365);
    const deadStockValue = deadStockBalances.reduce((sum, b) => sum + b.totalValue, 0);

    return {
      slowMoving: {
        batchCount: slowMovingBalances.length,
        totalValue: slowMovingValue,
        percentage: totalValue > 0 ? (slowMovingValue / totalValue) * 100 : 0
      },
      deadStock: {
        batchCount: deadStockBalances.length,
        totalValue: deadStockValue,
        percentage: totalValue > 0 ? (deadStockValue / totalValue) * 100 : 0
      }
    };
  }

  /**
   * 获取产品信息
   */
  private async getProductsByIds(productIds: string[]): Promise<Product[]> {
    const products: Product[] = [];
    for (const productId of productIds) {
      const product = await productService.findById(productId);
      if (product) {
        products.push(product);
      }
    }
    return products;
  }

  /**
   * 获取仓库信息
   */
  private async getWarehousesByIds(warehouseIds: string[]): Promise<Warehouse[]> {
    const warehouses: Warehouse[] = [];
    for (const warehouseId of warehouseIds) {
      const warehouse = await warehouseService.findById(warehouseId);
      if (warehouse) {
        warehouses.push(warehouse);
      }
    }
    return warehouses;
  }

  /**
   * 获取所有分类
   */
  private async getAllCategories(): Promise<Category[]> {
    const services = await getGlobalServices();
    return await services.categoryService.findAll();
  }

  /**
   * 获取所有单位
   */
  private async getAllUnits(): Promise<Unit[]> {
    return await unitService.findAll();
  }

  /**
   * 加载历史数据
   */
  private async loadHistoricalData(): Promise<void> {
    // 这里可以从数据库或其他持久化存储加载历史数据
    // 目前为空实现
    console.log('Loading historical monthly balance data...');
  }

  /**
   * 添加到周期索引
   */
  private addToPeriodIndex(periodKey: string, balanceId: string): void {
    if (!this.balancesByPeriod.has(periodKey)) {
      this.balancesByPeriod.set(periodKey, new Set());
    }
    this.balancesByPeriod.get(periodKey)!.add(balanceId);
  }

  /**
   * 添加到产品索引
   */
  private addToProductIndex(productId: string, balanceId: string): void {
    if (!this.balancesByProduct.has(productId)) {
      this.balancesByProduct.set(productId, new Set());
    }
    this.balancesByProduct.get(productId)!.add(balanceId);
  }

  /**
   * 添加到仓库索引
   */
  private addToWarehouseIndex(warehouseId: string, balanceId: string): void {
    if (!this.balancesByWarehouse.has(warehouseId)) {
      this.balancesByWarehouse.set(warehouseId, new Set());
    }
    this.balancesByWarehouse.get(warehouseId)!.add(balanceId);
  }

  /**
   * 获取服务统计信息
   */
  async getServiceStats(): Promise<{
    totalBalances: number;
    totalPeriods: number;
    totalProducts: number;
    totalWarehouses: number;
    totalValue: number;
    initialized: boolean;
  }> {
    const totalValue = Array.from(this.balances.values())
      .reduce((sum, b) => sum + b.totalValue, 0);

    return {
      totalBalances: this.balances.size,
      totalPeriods: this.balancesByPeriod.size,
      totalProducts: this.balancesByProduct.size,
      totalWarehouses: this.balancesByWarehouse.size,
      totalValue,
      initialized: this.initialized
    };
  }
}

// 创建并导出服务实例
const monthlyBalanceService = new MonthlyBalanceService();
export default monthlyBalanceService;