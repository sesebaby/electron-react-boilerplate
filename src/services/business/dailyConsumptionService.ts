/**
 * 逐日消耗数据服务
 */

import { 
  DailyConsumptionViewConfig,
  ConsumptionTableData,
  CategoryRowData,
  ProductRowData,
  TimeSlotData,
  ConsumptionSlotData,
  ConsumptionFilter,
  ConsumptionQueryParams,
  ConsumptionQueryResult,
  TimeSlot,
  DisplayMode
} from '../../types/consumption';
import { InventoryTransaction, TransactionType, Category, Product } from '../../types/entities';
import {
  inventoryStockService,
  categoryService,
  productService,
  unitConversionService,
  unitService
} from './index';
import TimeSlotHelper from '../../utils/timeSlotHelper';
import ConsumptionCalculator from '../../utils/consumptionCalculator';

/**
 * 逐日消耗数据服务类
 */
export class DailyConsumptionService {
  private cache = new Map<string, ConsumptionTableData>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  constructor() {
    console.log('Daily consumption service initialized');
  }

  // =============== 主要API方法 ===============

  /**
   * 获取逐日消耗数据
   * @param config 视图配置
   * @returns 消耗表格数据
   */
  async getConsumptionData(config: DailyConsumptionViewConfig): Promise<ConsumptionTableData> {
    const _cacheKey = this.generateCacheKey(config);
    
    // 检查缓存
    if (this.isCacheValid(cacheKey)) {
      const _cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        console.log('返回缓存的消耗数据');
        return cachedData;
      }
    }

    console.log('开始获取逐日消耗数据...', config);
    const _startTime = Date.now();

    try {
      // 1. 获取库存事务数据
      const _transactions = await this.getInventoryTransactions(config);
      console.log(`获取到 ${transactions.length} 条库存事务记录`);

      // 2. 构建分类层级结构
      const _categories = await this.buildCategoryHierarchy(transactions, config);
      console.log(`构建了 ${categories.length} 个分类层级`);

      // 3. 生成日期列
      const _dateColumns = TimeSlotHelper.getDateRange(
        config.dateRange.startDate,
        config.dateRange.endDate
      );

      // 4. 计算汇总数据
      const _totals = ConsumptionCalculator.calculateTotals(categories, dateColumns);

      // 5. 构建结果
      const result: ConsumptionTableData = {
        categories,
        dateColumns,
        config,
        totals,
        lastUpdated: new Date()
      };

      // 6. 缓存结果
      this.cache.set(cacheKey, result);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      const _endTime = Date.now();
      console.log(`消耗数据获取完成，耗时: ${endTime - startTime}ms`);

      return result;
    } catch (error) {
      console.error('获取消耗数据失败:', error);
      throw new Error(`获取消耗数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 查询库存事务数据
   * @param config 视图配置
   * @returns 库存事务数组
   */
  private async getInventoryTransactions(config: DailyConsumptionViewConfig): Promise<InventoryTransaction[]> {
    try {
      // 获取所有库存事务
      const _allTransactions = await inventoryStockService.findAllTransactions();
      
      // 筛选出库事务
      const _outTransactions = allTransactions.filter(t => t.transactionType === TransactionType.OUT);
      
      // 按日期范围筛选
      const _filteredTransactions = outTransactions.filter(t => {
        const _transactionDate = new Date(t.createdAt);
        return TimeSlotHelper.isDateInRange(
          transactionDate,
          config.dateRange.startDate,
          config.dateRange.endDate
        );
      });

      // 应用其他筛选条件
      const _result = filteredTransactions;

      if (config.categoryFilter && config.categoryFilter.length > 0) {
        const _products = await productService.findAll();
        const _filteredProductIds = products
          .filter(p => config.categoryFilter!.includes(p.categoryId))
          .map(p => p.id);
        
        result = result.filter(t => filteredProductIds.includes(t.productId));
      }

      return result;
    } catch (error) {
      console.error('查询库存事务失败:', error);
      throw error;
    }
  }

  /**
   * 构建分类层级结构
   * @param transactions 库存事务数组
   * @param config 视图配置
   * @returns 分类行数据数组
   */
  private async buildCategoryHierarchy(
    transactions: InventoryTransaction[], 
    config: DailyConsumptionViewConfig
  ): Promise<CategoryRowData[]> {
    try {
      // 获取所有分类和产品
      const [allCategories, allProducts] = await Promise.all([
        categoryService.findAll(),
        productService.findAll()
      ]);

      // 构建分类映射
      const _categoryMap = new Map<string, Category>();
      allCategories.forEach(cat => categoryMap.set(cat.id, cat));

      const _productMap = new Map<string, Product>();
      allProducts.forEach(prod => productMap.set(prod.id, prod));

      // 按产品分组事务
      const _transactionsByProduct = new Map<string, InventoryTransaction[]>();
      transactions.forEach(t => {
        if (!transactionsByProduct.has(t.productId)) {
          transactionsByProduct.set(t.productId, []);
        }
        transactionsByProduct.get(t.productId)!.push(t);
      });

      // 按分类分组产品
      const _productsByCategory = new Map<string, Product[]>();
      allProducts.forEach(product => {
        if (!productsByCategory.has(product.categoryId)) {
          productsByCategory.set(product.categoryId, []);
        }
        productsByCategory.get(product.categoryId)!.push(product);
      });

      // 生成日期列
      const _dateColumns = TimeSlotHelper.getDateRange(
        config.dateRange.startDate,
        config.dateRange.endDate
      );

      // 构建分类行数据
      const categoryRows: CategoryRowData[] = [];

      // 获取根分类
      const _rootCategories = allCategories.filter(cat => !cat.parentId);

      for (const category of rootCategories) {
        const _categoryRow = await this.buildCategoryRow(
          category,
          productsByCategory,
          transactionsByProduct,
          categoryMap,
          productMap,
          dateColumns,
          config
        );
        
        if (categoryRow) {
          categoryRows.push(categoryRow);
        }
      }

      return categoryRows;
    } catch (error) {
      console.error('构建分类层级失败:', error);
      throw error;
    }
  }

  /**
   * 构建单个分类行数据
   */
  private async buildCategoryRow(
    category: Category,
    productsByCategory: Map<string, Product[]>,
    transactionsByProduct: Map<string, InventoryTransaction[]>,
    categoryMap: Map<string, Category>,
    productMap: Map<string, Product>,
    dateColumns: string[],
    config: DailyConsumptionViewConfig
  ): Promise<CategoryRowData | null> {
    try {
      // 获取该分类下的产品
      const _products = productsByCategory.get(category.id) || [];
      
      // 构建产品行数据
      const productRows: ProductRowData[] = [];
      for (const product of products) {
        const _productRow = await this.buildProductRow(
          product,
          transactionsByProduct.get(product.id) || [],
          dateColumns,
          config
        );
        productRows.push(productRow);
      }

      // 获取子分类
      const _childCategories = Array.from(categoryMap.values())
        .filter(cat => cat.parentId === category.id);

      const children: CategoryRowData[] = [];
      for (const childCategory of childCategories) {
        const _childRow = await this.buildCategoryRow(
          childCategory,
          productsByCategory,
          transactionsByProduct,
          categoryMap,
          productMap,
          dateColumns,
          config
        );
        if (childRow) {
          children.push(childRow);
        }
      }

      // 构建分类数据映射
      const _categoryData = new Map<string, TimeSlotData>();
      for (const date of dateColumns) {
        const _timeSlotData = this.aggregateTimeSlotDataForCategory(
          productRows,
          children,
          date
        );
        categoryData.set(date, timeSlotData);
      }

      // 计算行总计
      const allSlotData: ConsumptionSlotData[] = [];
      categoryData.forEach(timeSlotData => {
        allSlotData.push(timeSlotData.dailyTotal);
      });
      children.forEach(child => allSlotData.push(child.rowTotal));
      
      const _rowTotal = ConsumptionCalculator.mergeConsumptionData(allSlotData);

      return {
        categoryId: category.id,
        categoryName: category.name,
        level: category.level,
        parentId: category.parentId,
        isExpanded: true,
        hasChildren: children.length > 0,
        children,
        products: productRows,
        data: categoryData,
        rowTotal,
        sortOrder: category.sortOrder
      };
    } catch (error) {
      console.error(`构建分类行失败 (${category.name}):`, error);
      return null;
    }
  }

  /**
   * 构建产品行数据
   */
  private async buildProductRow(
    product: Product,
    transactions: InventoryTransaction[],
    dateColumns: string[],
    config: DailyConsumptionViewConfig
  ): Promise<ProductRowData> {
    // 按日期和时间段分组事务
    const _productData = new Map<string, TimeSlotData>();
    
    for (const date of dateColumns) {
      const _dateTransactions = transactions.filter(t => {
        const _transactionDate = TimeSlotHelper.formatDate(new Date(t.createdAt));
        return transactionDate === date;
      });

      const _timeSlotData = await this.buildTimeSlotDataFromTransactions(
        dateTransactions,
        product.id,
        config
      );
      
      productData.set(date, timeSlotData);
    }

    // 计算行总计
    const allSlotData: ConsumptionSlotData[] = [];
    productData.forEach(timeSlotData => {
      allSlotData.push(timeSlotData.dailyTotal);
    });
    
    const _rowTotal = ConsumptionCalculator.mergeConsumptionData(allSlotData);

    // 检查单位转换
    const _unitConversion = await unitConversionService.findByProductId(product.id);

    // 获取基础单位信息
    const _baseUnit = await unitService.findById(product.unitId);

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      categoryId: product.categoryId,
      data: productData,
      rowTotal,
      hasUnitConversion: !!unitConversion,
      baseUnit: baseUnit?.symbol || '个',
      convertedUnit: unitConversion?.packageUnitId,
      conversionRate: unitConversion?.conversionRate
    };
  }

  /**
   * 从事务构建时间段数据
   */
  private async buildTimeSlotDataFromTransactions(
    transactions: InventoryTransaction[],
    productId: string,
    config: DailyConsumptionViewConfig
  ): Promise<TimeSlotData> {
    // 按时间段分组事务
    const morningTransactions: InventoryTransaction[] = [];
    const afternoonTransactions: InventoryTransaction[] = [];
    const eveningTransactions: InventoryTransaction[] = [];

    transactions.forEach(t => {
      const _timeSlotResult = TimeSlotHelper.getTimeSlot(new Date(t.createdAt), config.timeSlotConfig);
      
      switch (timeSlotResult.timeSlot) {
        case TimeSlot.MORNING:
          morningTransactions.push(t);
          break;
        case TimeSlot.AFTERNOON:
          afternoonTransactions.push(t);
          break;
        case TimeSlot.EVENING:
          eveningTransactions.push(t);
          break;
      }
    });

    // 计算各时间段的消耗数据
    const _morning = await this.calculateSlotConsumption(morningTransactions, productId);
    const _afternoon = await this.calculateSlotConsumption(afternoonTransactions, productId);
    const _evening = await this.calculateSlotConsumption(eveningTransactions, productId);

    const timeSlotData: TimeSlotData = {
      morning,
      afternoon,
      evening,
      dailyTotal: ConsumptionCalculator.createEmptyConsumptionData()
    };

    return ConsumptionCalculator.calculateTimeSlotTotals(timeSlotData);
  }

  /**
   * 计算时间段消耗数据
   */
  private async calculateSlotConsumption(
    transactions: InventoryTransaction[],
    productId: string
  ): Promise<ConsumptionSlotData> {
    const _baseData = ConsumptionCalculator.calculateConsumptionFromTransactions(transactions);
    return await ConsumptionCalculator.applyUnitConversion(productId, baseData);
  }

  /**
   * 聚合分类的时间段数据
   */
  private aggregateTimeSlotDataForCategory(
    productRows: ProductRowData[],
    childCategories: CategoryRowData[],
    date: string
  ): TimeSlotData {
    const allMorningData: ConsumptionSlotData[] = [];
    const allAfternoonData: ConsumptionSlotData[] = [];
    const allEveningData: ConsumptionSlotData[] = [];

    // 收集产品数据
    productRows.forEach(product => {
      const _timeSlotData = product.data.get(date);
      if (timeSlotData) {
        allMorningData.push(timeSlotData.morning);
        allAfternoonData.push(timeSlotData.afternoon);
        allEveningData.push(timeSlotData.evening);
      }
    });

    // 收集子分类数据
    childCategories.forEach(child => {
      const _timeSlotData = child.data.get(date);
      if (timeSlotData) {
        allMorningData.push(timeSlotData.morning);
        allAfternoonData.push(timeSlotData.afternoon);
        allEveningData.push(timeSlotData.evening);
      }
    });

    const timeSlotData: TimeSlotData = {
      morning: ConsumptionCalculator.mergeConsumptionData(allMorningData),
      afternoon: ConsumptionCalculator.mergeConsumptionData(allAfternoonData),
      evening: ConsumptionCalculator.mergeConsumptionData(allEveningData),
      dailyTotal: ConsumptionCalculator.createEmptyConsumptionData()
    };

    return ConsumptionCalculator.calculateTimeSlotTotals(timeSlotData);
  }

  // =============== 缓存管理 ===============

  /**
   * 生成缓存键
   */
  private generateCacheKey(config: DailyConsumptionViewConfig): string {
    return JSON.stringify({
      startDate: config.dateRange.startDate.toISOString(),
      endDate: config.dateRange.endDate.toISOString(),
      displayMode: config.displayMode,
      categoryFilter: config.categoryFilter?.sort(),
      productFilter: config.productFilter?.sort(),
      warehouseFilter: config.warehouseFilter?.sort()
    });
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(cacheKey: string): boolean {
    const _expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('消耗数据缓存已清除');
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const _now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now >= expiry) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}

// 创建并导出服务实例
const _dailyConsumptionService = new DailyConsumptionService();
export default dailyConsumptionService;
