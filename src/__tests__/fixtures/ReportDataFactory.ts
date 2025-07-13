/**
 * 报表数据工厂
 * 负责生成统计和报表相关的测试数据
 */

import { BaseDomainFactory, FactoryOptions } from './BaseDomainFactory';
import { InventoryDomainFactory } from './InventoryDomainFactory';
import { MasterDataFactory } from './MasterDataFactory';
import { InventoryTransaction, TransactionType } from '../../types/entities';

export interface InventoryStatistics {
  totalProducts: number;
  totalValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalTransactions: number;
  warehouseStats: WarehouseStatistics[];
  categoryStats: CategoryStatistics[];
}

export interface WarehouseStatistics {
  warehouseId: string;
  warehouseName: string;
  totalProducts: number;
  totalValue: number;
  totalQuantity: number;
}

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  totalProducts: number;
  totalValue: number;
  averagePrice: number;
}

export interface MonthlyReport {
  year: number;
  month: number;
  totalStockIn: number;
  totalStockOut: number;
  totalAdjustment: number;
  netChange: number;
  inventoryValue: number;
  transactionCount: number;
  topProducts: ProductSummary[];
}

export interface ProductSummary {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalValue: number;
  transactionCount: number;
}

export interface MovementSummary {
  date: string;
  stockIn: number;
  stockOut: number;
  adjustment: number;
  netChange: number;
  runningTotal: number;
}

export class ReportDataFactory extends BaseDomainFactory {

  /**
   * 生成库存统计数据
   */
  static createInventoryStatistics(): InventoryStatistics {
    // 确保有基础数据
    const { products, stocks } = this.ensureProductsAndStocks();
    const warehouses = this.ensureWarehouses();
    const categories = this.ensureCategories();
    
    // 计算总体统计
    const totalValue = stocks.reduce((sum, stock) => {
      const product = products.find(p => p.id === stock.productId);
      return sum + (product ? product.purchasePrice * stock.quantity : 0);
    }, 0);

    const lowStockProducts = products.filter(product => {
      const productStocks = stocks.filter(s => s.productId === product.id);
      const totalQuantity = productStocks.reduce((sum, s) => sum + s.quantity, 0);
      return totalQuantity < product.minStock;
    }).length;

    const outOfStockProducts = products.filter(product => {
      const productStocks = stocks.filter(s => s.productId === product.id);
      const totalQuantity = productStocks.reduce((sum, s) => sum + s.quantity, 0);
      return totalQuantity === 0;
    }).length;

    // 计算仓库统计
    const warehouseStats: WarehouseStatistics[] = warehouses.map(warehouse => {
      const warehouseStocks = stocks.filter(s => s.warehouseId === warehouse.id);
      const totalQuantity = warehouseStocks.reduce((sum, s) => sum + s.quantity, 0);
      const totalValue = warehouseStocks.reduce((sum, stock) => {
        const product = products.find(p => p.id === stock.productId);
        return sum + (product ? product.purchasePrice * stock.quantity : 0);
      }, 0);

      return {
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        totalProducts: warehouseStocks.length,
        totalValue,
        totalQuantity
      };
    });

    // 计算分类统计
    const categoryStats: CategoryStatistics[] = categories.map(category => {
      const categoryProducts = products.filter(p => p.categoryId === category.id);
      const totalValue = categoryProducts.reduce((sum, product) => {
        const productStocks = stocks.filter(s => s.productId === product.id);
        const quantity = productStocks.reduce((qSum, s) => qSum + s.quantity, 0);
        return sum + (product.purchasePrice * quantity);
      }, 0);

      const averagePrice = categoryProducts.length > 0 ? 
        categoryProducts.reduce((sum, p) => sum + p.purchasePrice, 0) / categoryProducts.length : 0;

      return {
        categoryId: category.id,
        categoryName: category.name,
        totalProducts: categoryProducts.length,
        totalValue,
        averagePrice
      };
    });

    return {
      totalProducts: products.length,
      totalValue,
      lowStockProducts,
      outOfStockProducts,
      totalTransactions: this.getCachedData('inventoryTransactions').length,
      warehouseStats,
      categoryStats
    };
  }

  /**
   * 生成月度报表
   */
  static createMonthlyReport(year: number = 2024, month: number = 1): MonthlyReport {
    // 生成该月的交易记录
    const transactions = this.createMonthlyTransactions(year, month, 50);
    
    const totalStockIn = transactions
      .filter(t => t.type === TransactionType.STOCK_IN)
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalStockOut = transactions
      .filter(t => t.type === TransactionType.STOCK_OUT)
      .reduce((sum, t) => sum + t.quantity, 0);

    const totalAdjustment = transactions
      .filter(t => t.type === TransactionType.STOCK_ADJUST)
      .reduce((sum, t) => sum + Math.abs(t.quantity), 0);

    const netChange = totalStockIn - totalStockOut;
    
    const inventoryValue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

    // 计算热销产品
    const productTransactions = new Map<string, { quantity: number; value: number; count: number }>();
    transactions.forEach(transaction => {
      const existing = productTransactions.get(transaction.productId) || { quantity: 0, value: 0, count: 0 };
      existing.quantity += Math.abs(transaction.quantity);
      existing.value += transaction.totalAmount;
      existing.count += 1;
      productTransactions.set(transaction.productId, existing);
    });

    const products = this.getCachedData('products');
    const topProducts: ProductSummary[] = Array.from(productTransactions.entries())
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([productId, stats]) => {
        const product = products.find(p => p.id === productId);
        return {
          productId,
          productName: product?.name || `产品_${productId}`,
          totalQuantity: stats.quantity,
          totalValue: stats.value,
          transactionCount: stats.count
        };
      });

    return {
      year,
      month,
      totalStockIn,
      totalStockOut,
      totalAdjustment,
      netChange,
      inventoryValue,
      transactionCount: transactions.length,
      topProducts
    };
  }

  /**
   * 生成库存移动汇总
   */
  static createInventoryMovementSummary(days: number = 30): MovementSummary[] {
    const summaries: MovementSummary[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let runningTotal = this.randomInt(1000, 5000); // 初始库存

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      const stockIn = this.randomInt(10, 100);
      const stockOut = this.randomInt(5, 80);
      const adjustment = this.randomInt(-10, 10);
      const netChange = stockIn - stockOut + adjustment;
      
      runningTotal += netChange;

      summaries.push({
        date: date.toISOString().split('T')[0],
        stockIn,
        stockOut,
        adjustment,
        netChange,
        runningTotal
      });
    }

    return summaries;
  }

  /**
   * 生成某月的交易记录
   */
  private static createMonthlyTransactions(
    year: number, 
    month: number, 
    count: number
  ): InventoryTransaction[] {
    const transactions: InventoryTransaction[] = [];
    const { products } = this.ensureProductsAndStocks();
    const warehouses = this.ensureWarehouses();
    
    // 生成该月内的随机日期
    const daysInMonth = new Date(year, month, 0).getDate();
    
    for (let i = 0; i < count; i++) {
      const day = this.randomInt(1, daysInMonth);
      const transactionDate = new Date(year, month - 1, day);
      
      const product = this.randomChoice(products);
      const warehouse = this.randomChoice(warehouses);
      const type = this.randomChoice([
        TransactionType.STOCK_IN,
        TransactionType.STOCK_OUT,
        TransactionType.STOCK_ADJUST
      ]);
      
      const quantity = this.randomInt(1, 50);
      const unitPrice = product.purchasePrice * this.randomFloat(0.8, 1.2);
      
      const transaction = InventoryDomainFactory.createInventoryTransaction({
        productId: product.id,
        warehouseId: warehouse.id,
        type,
        quantity,
        unitPrice,
        operator: `user_${this.randomInt(1, 5)}`,
        remark: `${month}月业务操作_${i + 1}`
      });
      
      // 设置正确的创建时间
      transaction.createdAt = transactionDate;
      
      transactions.push(transaction);
    }

    return transactions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * 确保产品和库存数据存在
   */
  private static ensureProductsAndStocks(): { products: any[]; stocks: any[] } {
    let products = this.getCachedData('products');
    let stocks = this.getCachedData('inventoryStocks');
    
    if (products.length === 0 || stocks.length === 0) {
      const catalog = InventoryDomainFactory.createProductCatalog(5);
      products = catalog.products;
      stocks = catalog.stocks;
    }
    
    return { products, stocks };
  }

  /**
   * 确保仓库数据存在
   */
  private static ensureWarehouses(): any[] {
    let warehouses = this.getCachedData('warehouses');
    if (warehouses.length === 0) {
      warehouses = MasterDataFactory.createStandardWarehouses();
    }
    return warehouses;
  }

  /**
   * 确保分类数据存在
   */
  private static ensureCategories(): any[] {
    let categories = this.getCachedData('categories');
    if (categories.length === 0) {
      categories = MasterDataFactory.createStandardCategories();
    }
    return categories;
  }

  /**
   * 生成完整的统计数据集
   */
  static createStatisticalDataSet(): {
    statistics: InventoryStatistics;
    monthlyReports: MonthlyReport[];
    movementSummary: MovementSummary[];
  } {
    // 生成过去6个月的报表
    const monthlyReports: MonthlyReport[] = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const reportDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      monthlyReports.push(this.createMonthlyReport(
        reportDate.getFullYear(),
        reportDate.getMonth() + 1
      ));
    }

    return {
      statistics: this.createInventoryStatistics(),
      monthlyReports,
      movementSummary: this.createInventoryMovementSummary(30)
    };
  }

  /**
   * 生成预警数据
   */
  static createAlertData(): {
    lowStockAlerts: Array<{ productId: string; productName: string; currentStock: number; minStock: number }>;
    overStockAlerts: Array<{ productId: string; productName: string; currentStock: number; maxStock: number }>;
  } {
    const { products, stocks } = this.ensureProductsAndStocks();
    
    const lowStockAlerts: any[] = [];
    const overStockAlerts: any[] = [];

    products.forEach(product => {
      const productStocks = stocks.filter(s => s.productId === product.id);
      const totalStock = productStocks.reduce((sum, s) => sum + s.quantity, 0);
      
      if (totalStock < product.minStock) {
        lowStockAlerts.push({
          productId: product.id,
          productName: product.name,
          currentStock: totalStock,
          minStock: product.minStock
        });
      }
      
      if (totalStock > product.maxStock) {
        overStockAlerts.push({
          productId: product.id,
          productName: product.name,
          currentStock: totalStock,
          maxStock: product.maxStock
        });
      }
    });

    return { lowStockAlerts, overStockAlerts };
  }
}