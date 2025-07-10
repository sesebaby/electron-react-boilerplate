/**
 * 报表服务 - 报表和数据分析
 * 整合: InventoryCardService, CalendarDataService, DailyConsumptionService, GlobalConversionService
 */

import { DatabaseManager } from './database';
import { ServiceResult, PaginatedResult, PaginationParams, BaseFilter } from './types';
import {
  Product,
  Category,
  Warehouse,
  InventoryStock,
  InventoryTransaction,
  PurchaseOrder,
  SalesOrder,
  TransactionType
} from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';

// 报表相关类型定义
export interface ReportFilter extends BaseFilter {
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
  supplierId?: string;
  customerId?: string;
  reportType?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// 库存卡片数据
export interface WarehouseCardData {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  description: string;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  products: ProductStockInfo[];
}

export interface ProductStockInfo {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastUpdated: Date;
  category: string;
}

// 日历数据
export interface WeeklyCalendarData {
  weekStart: Date;
  weekEnd: Date;
  days: DailyBusinessSummary[];
  weeklyTotals: {
    purchases: number;
    sales: number;
    netChange: number;
  };
}

export interface DailyBusinessSummary {
  date: Date;
  dayOfWeek: string;
  purchases: {
    count: number;
    totalValue: number;
  };
  sales: {
    count: number;
    totalValue: number;
  };
  movements: {
    inbound: number;
    outbound: number;
  };
  alerts: {
    lowStock: number;
    expired: number;
  };
}

// 消耗数据
export interface ConsumptionData {
  categories: CategoryConsumption[];
  totalConsumption: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalItems: number;
    totalValue: number;
    avgDailyConsumption: number;
  };
}

export interface CategoryConsumption {
  categoryId: string;
  categoryName: string;
  products: ProductConsumption[];
  totalConsumption: number;
  totalValue: number;
}

export interface ProductConsumption {
  productId: string;
  productName: string;
  sku: string;
  dailyConsumption: number;
  totalConsumption: number;
  unitPrice: number;
  totalValue: number;
  unit: string;
}

// 报表统计
export interface ReportStatistics {
  inventoryValue: number;
  totalProducts: number;
  totalCategories: number;
  totalWarehouses: number;
  lowStockItems: number;
  outOfStockItems: number;
  monthlyPurchases: number;
  monthlySales: number;
  profitMargin: number;
  turnoverRate: number;
}

/**
 * 报表服务实现
 */
export class ReportService {
  private initialized = false;
  private database: any = null;

  constructor() {}

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.database = await DatabaseManager.getInstance();
      this.initialized = true;
      console.log('ReportService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ReportService:', error);
      throw error;
    }
  }

  // ==================== 库存卡片报表 ====================

  /**
   * 获取仓库卡片数据
   */
  async getWarehouseCardData(warehouseId?: string): Promise<ServiceResult<WarehouseCardData[]>> {
    try {
      const warehouses = warehouseId 
        ? [await this.database.getWarehouse(warehouseId)]
        : await this.database.getAllWarehouses();

      const cardData: WarehouseCardData[] = [];

      for (const warehouse of warehouses) {
        if (!warehouse) continue;

        // 获取该仓库的所有库存
        const stocks = await this.database.getInventoryStocksByWarehouse(warehouse.id);
        const products: ProductStockInfo[] = [];
        let totalValue = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (const stock of stocks) {
          const product = await this.database.getProduct(stock.productId);
          const category = await this.database.getCategory(product.categoryId);
          
          if (product) {
            const isLowStock = stock.currentStock <= stock.minStock;
            const isOutOfStock = stock.currentStock === 0;
            const stockValue = stock.currentStock * (stock.unitPrice || product.salePrice || 0);
            
            products.push({
              productId: product.id,
              productName: product.name,
              sku: product.sku || '',
              currentStock: stock.currentStock,
              minStock: stock.minStock,
              maxStock: stock.maxStock,
              unit: product.unit || '个',
              unitPrice: stock.unitPrice || product.salePrice || 0,
              totalValue: stockValue,
              isLowStock,
              isOutOfStock,
              lastUpdated: stock.lastUpdated,
              category: category?.name || '未分类'
            });

            totalValue += stockValue;
            if (isLowStock) lowStockCount++;
            if (isOutOfStock) outOfStockCount++;
          }
        }

        cardData.push({
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse.code || warehouse.id,
          description: warehouse.description || '',
          totalProducts: products.length,
          totalValue,
          lowStockCount,
          outOfStockCount,
          products
        });
      }

      return { success: true, data: cardData };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取仓库卡片数据失败' };
    }
  }

  // ==================== 日历报表 ====================

  /**
   * 获取周数据
   */
  async getWeeklyData(weekStart: Date): Promise<ServiceResult<WeeklyCalendarData>> {
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const days: DailyBusinessSummary[] = [];
      const weeklyTotals = { purchases: 0, sales: 0, netChange: 0 };

      // 生成7天的数据
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);
        
        const dailyData = await this.getDailyData(currentDate);
        days.push(dailyData);

        // 累计周汇总
        weeklyTotals.purchases += dailyData.purchases.totalValue;
        weeklyTotals.sales += dailyData.sales.totalValue;
        weeklyTotals.netChange += (dailyData.movements.inbound - dailyData.movements.outbound);
      }

      return {
        success: true,
        data: {
          weekStart,
          weekEnd,
          days,
          weeklyTotals
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取周数据失败' };
    }
  }

  /**
   * 获取日数据
   */
  private async getDailyData(date: Date): Promise<DailyBusinessSummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // 获取当日采购订单
    const purchaseOrders = await this.database.getPurchaseOrdersByDateRange(startOfDay, endOfDay);
    const purchases = {
      count: purchaseOrders.length,
      totalValue: purchaseOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
    };

    // 获取当日销售订单
    const salesOrders = await this.database.getSalesOrdersByDateRange(startOfDay, endOfDay);
    const sales = {
      count: salesOrders.length,
      totalValue: salesOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
    };

    // 获取当日库存变动
    const transactions = await this.database.getInventoryTransactionsByDateRange(startOfDay, endOfDay);
    let inbound = 0;
    let outbound = 0;
    
    transactions.forEach((tx: InventoryTransaction) => {
      if (tx.type === TransactionType.IN) {
        inbound += tx.quantity;
      } else if (tx.type === TransactionType.OUT) {
        outbound += tx.quantity;
      }
    });

    // 获取预警信息
    const lowStockItems = await this.database.getLowStockItems();
    const expiredItems = await this.database.getExpiredItems(date);

    return {
      date,
      dayOfWeek: date.toLocaleDateString('zh-CN', { weekday: 'long' }),
      purchases,
      sales,
      movements: { inbound, outbound },
      alerts: {
        lowStock: lowStockItems.length,
        expired: expiredItems.length
      }
    };
  }

  // ==================== 消耗数据报表 ====================

  /**
   * 获取消耗数据
   */
  async getConsumptionData(startDate: Date, endDate: Date, categoryId?: string): Promise<ServiceResult<ConsumptionData>> {
    try {
      // 获取指定时间范围内的出库交易
      const transactions = await this.database.getInventoryTransactionsByDateRange(startDate, endDate);
      const outboundTransactions = transactions.filter((tx: InventoryTransaction) => 
        tx.type === TransactionType.OUT
      );

      // 按分类分组数据
      const categoryMap = new Map<string, CategoryConsumption>();
      let totalConsumption = 0;
      let totalValue = 0;

      for (const tx of outboundTransactions) {
        const product = await this.database.getProduct(tx.productId);
        if (!product) continue;

        // 如果指定了分类ID，过滤数据
        if (categoryId && product.categoryId !== categoryId) continue;

        const category = await this.database.getCategory(product.categoryId);
        const categoryName = category?.name || '未分类';
        const categoryKey = product.categoryId || 'uncategorized';

        if (!categoryMap.has(categoryKey)) {
          categoryMap.set(categoryKey, {
            categoryId: categoryKey,
            categoryName,
            products: [],
            totalConsumption: 0,
            totalValue: 0
          });
        }

        const categoryData = categoryMap.get(categoryKey)!;
        let productData = categoryData.products.find(p => p.productId === product.id);
        
        if (!productData) {
          productData = {
            productId: product.id,
            productName: product.name,
            sku: product.sku || '',
            dailyConsumption: 0,
            totalConsumption: 0,
            unitPrice: product.salePrice || 0,
            totalValue: 0,
            unit: product.unit || '个'
          };
          categoryData.products.push(productData);
        }

        const txValue = tx.quantity * (tx.unitCost || product.salePrice || 0);
        productData.totalConsumption += tx.quantity;
        productData.totalValue += txValue;
        categoryData.totalConsumption += tx.quantity;
        categoryData.totalValue += txValue;
        totalConsumption += tx.quantity;
        totalValue += txValue;
      }

      // 计算日均消耗
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const avgDailyConsumption = days > 0 ? totalConsumption / days : 0;

      // 计算每个产品的日均消耗
      for (const category of categoryMap.values()) {
        for (const product of category.products) {
          product.dailyConsumption = days > 0 ? product.totalConsumption / days : 0;
        }
      }

      return {
        success: true,
        data: {
          categories: Array.from(categoryMap.values()),
          totalConsumption,
          timeRange: { start: startDate, end: endDate },
          summary: {
            totalItems: outboundTransactions.length,
            totalValue,
            avgDailyConsumption
          }
        }
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取消耗数据失败' };
    }
  }

  // ==================== 统计报表 ====================

  /**
   * 获取报表统计数据
   */
  async getReportStatistics(): Promise<ServiceResult<ReportStatistics>> {
    try {
      // 获取基础数据
      const [products, categories, warehouses, stocks, transactions] = await Promise.all([
        this.database.getAllProducts(),
        this.database.getAllCategories(),
        this.database.getAllWarehouses(),
        this.database.getAllInventoryStocks(),
        this.database.getInventoryTransactions()
      ]);

      // 计算库存价值
      const inventoryValue = stocks.reduce((sum: number, stock: InventoryStock) => 
        sum + (stock.currentStock * (stock.unitPrice || 0)), 0
      );

      // 计算预警项目
      const lowStockItems = stocks.filter((stock: InventoryStock) => 
        stock.currentStock <= stock.minStock
      ).length;
      
      const outOfStockItems = stocks.filter((stock: InventoryStock) => 
        stock.currentStock === 0
      ).length;

      // 计算月度采购和销售（简化计算，实际应该从订单表获取）
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthlyInbound = transactions
        .filter((tx: InventoryTransaction) => 
          tx.type === TransactionType.IN && 
          new Date(tx.createdAt) >= monthStart
        )
        .reduce((sum: number, tx: InventoryTransaction) => sum + (tx.totalCost || 0), 0);

      const monthlyOutbound = transactions
        .filter((tx: InventoryTransaction) => 
          tx.type === TransactionType.OUT && 
          new Date(tx.createdAt) >= monthStart
        )
        .reduce((sum: number, tx: InventoryTransaction) => sum + (tx.totalCost || 0), 0);

      // 计算利润率（简化计算）
      const profitMargin = monthlyInbound > 0 ? 
        ((monthlyOutbound - monthlyInbound) / monthlyOutbound) * 100 : 0;

      // 计算周转率（简化计算）
      const turnoverRate = inventoryValue > 0 ? 
        (monthlyOutbound / inventoryValue) * 12 : 0; // 年化周转率

      const stats: ReportStatistics = {
        inventoryValue,
        totalProducts: products.length,
        totalCategories: categories.length,
        totalWarehouses: warehouses.length,
        lowStockItems,
        outOfStockItems,
        monthlyPurchases: monthlyInbound,
        monthlySales: monthlyOutbound,
        profitMargin,
        turnoverRate
      };

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '获取统计数据失败' };
    }
  }

  // ==================== 通用报表方法 ====================

  /**
   * 导出报表数据
   */
  async exportReport(reportType: string, filter?: ReportFilter): Promise<ServiceResult<any>> {
    try {
      let data: any;
      
      switch (reportType) {
        case 'inventory_card':
          const cardResult = await this.getWarehouseCardData(filter?.warehouseId);
          data = cardResult.data;
          break;
          
        case 'consumption':
          if (!filter?.dateRange) {
            return { success: false, error: '消耗报表需要指定日期范围' };
          }
          const consumptionResult = await this.getConsumptionData(
            filter.dateRange.start,
            filter.dateRange.end,
            filter.categoryId
          );
          data = consumptionResult.data;
          break;
          
        case 'statistics':
          const statsResult = await this.getReportStatistics();
          data = statsResult.data;
          break;
          
        default:
          return { success: false, error: '不支持的报表类型' };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : '导出报表失败' };
    }
  }
}