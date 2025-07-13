/**
 * 报表统计服务
 * 提供各种统计信息、报表数据和预警信息
 * 专注于数据聚合和分析
 */

import { ProductStatus } from '../../types/entities';
import { DomainServiceResult } from './InventoryDomainService';

// 统计信息类型
export interface InventoryStatistics {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalUnits: number;
  totalWarehouses: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  countByStatus: Record<ProductStatus, number>;
  countByCategory: Record<string, number>;
  averagePrice: number;
  lastUpdated: Date;
}

// 仪表板数据类型
export interface DashboardData {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
  recentTransactions: Array<{
    id: string;
    productName: string;
    type: string;
    quantity: number;
    date: Date;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    totalValue: number;
    currentStock: number;
  }>;
  alerts: Array<{
    type: 'low_stock' | 'out_of_stock' | 'overstock';
    message: string;
    productId: string;
    productName: string;
  }>;
}

// 库存报表数据类型
export interface StockReportData {
  products: Array<{
    id: string;
    name: string;
    sku: string;
    categoryName: string;
    currentStock: number;
    minStock: number;
    maxStock: number;
    unitPrice: number;
    totalValue: number;
    status: string;
  }>;
  summary: {
    totalItems: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  };
}

// 库存变动报表数据类型
export interface MovementReportData {
  transactions: Array<{
    id: string;
    date: Date;
    productName: string;
    type: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    warehouseName: string;
    operator: string;
  }>;
  summary: {
    totalTransactions: number;
    totalInbound: number;
    totalOutbound: number;
    totalValue: number;
  };
}

// 库存预警类型
export interface StockAlert {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock';
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: Date;
}

// 报表过滤器
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  warehouseId?: string;
  productId?: string;
  transactionType?: string;
}

/**
 * 报表统计服务
 * 职责：统计信息计算、报表数据生成、预警信息
 */
export class ReportService {
  
  /**
   * 获取库存统计信息
   */
  async getInventoryStatistics(): Promise<DomainServiceResult<InventoryStatistics>> {
    try {
      // 获取基础数据
      const [productsResult, categoriesResult, unitsResult, warehousesResult, stocksResult] = await Promise.all([
        window.electronAPI.dbAll('SELECT * FROM products', []),
        window.electronAPI.dbGetAllCategories(),
        window.electronAPI.dbGetAllUnits(),
        window.electronAPI.dbGetAllWarehouses(),
        window.electronAPI.dbGetAllInventoryStocks()
      ]);

      const products = productsResult.success ? productsResult.data || [] : [];
      const categories = categoriesResult.success ? categoriesResult.data || [] : [];
      const units = unitsResult.success ? unitsResult.data || [] : [];
      const warehouses = warehousesResult.success ? warehousesResult.data || [] : [];
      const stocks = stocksResult.success ? stocksResult.data || [] : [];

      // 计算统计信息
      const activeProducts = products.filter((p: any) => p.status === ProductStatus.ACTIVE);
      const totalInventoryValue = stocks.reduce((sum: any, stock: any) => sum + (stock.totalValue || 0), 0);
      const lowStockCount = stocks.filter((stock: any) => stock.currentStock <= stock.minStock).length;
      const outOfStockCount = stocks.filter((stock: any) => stock.currentStock === 0).length;

      // 按状态统计产品数量
      const countByStatus: Record<ProductStatus, number> = {
        [ProductStatus.ACTIVE]: 0,
        [ProductStatus.INACTIVE]: 0,
        [ProductStatus.DISCONTINUED]: 0
      };

      products.forEach((product: any) => {
        if (countByStatus[product.status as ProductStatus] !== undefined) {
          countByStatus[product.status as ProductStatus]++;
        }
      });

      // 按分类统计产品数量
      const countByCategory: Record<string, number> = {};
      categories.forEach((category: any) => {
        countByCategory[category.name] = products.filter((p: any) => p.categoryId === category.id).length;
      });

      // 计算平均价格
      const totalPrice = products.reduce((sum: any, product: any) => sum + (product.salePrice || 0), 0);
      const averagePrice = products.length > 0 ? totalPrice / products.length : 0;

      const statistics: InventoryStatistics = {
        totalProducts: products.length,
        activeProducts: activeProducts.length,
        totalCategories: categories.length,
        totalUnits: units.length,
        totalWarehouses: warehouses.length,
        totalInventoryValue,
        lowStockCount,
        outOfStockCount,
        countByStatus,
        countByCategory,
        averagePrice,
        lastUpdated: new Date()
      };

      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取统计信息失败'
      };
    }
  }

  /**
   * 获取月度报表
   */
  async getMonthlyReport(params: { year: number; month: number }): Promise<DomainServiceResult<any>> {
    try {
      const { year, month } = params;
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // 获取月度库存变动数据
      const transactionsResult = await window.electronAPI.dbAll(
        `SELECT * FROM inventory_transactions
         WHERE createdAt >= ? AND createdAt <= ?
         ORDER BY createdAt DESC`,
        [startDate.toISOString(), endDate.toISOString()]
      );
      const transactions = transactionsResult.success ? transactionsResult.data || [] : [];

      // 计算月度统计
      const monthlyStats = {
        totalInbound: transactions.filter((t: any) => t.type === 'IN').reduce((sum: number, t: any) => sum + t.quantity, 0),
        totalOutbound: transactions.filter((t: any) => t.type === 'OUT').reduce((sum: number, t: any) => sum + t.quantity, 0),
        totalAdjustments: transactions.filter((t: any) => t.type === 'ADJUST').reduce((sum: number, t: any) => sum + t.quantity, 0),
        transactionCount: transactions.length,
        period: { year, month, startDate, endDate }
      };

      return { success: true, data: monthlyStats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取月度报表失败'
      };
    }
  }

  /**
   * 获取库存移动汇总
   */
  async getInventoryMovementSummary(params: any): Promise<DomainServiceResult<any[]>> {
    try {
      const { startDate, endDate } = params;

      // 获取指定时间范围内的库存变动
      const transactionsResult = await window.electronAPI.dbAll(
        `SELECT t.*, p.name as productName, p.sku, c.name as categoryName
         FROM inventory_transactions t
         LEFT JOIN products p ON t.productId = p.id
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE t.createdAt >= ? AND t.createdAt <= ?
         ORDER BY t.createdAt DESC`,
        [startDate, endDate]
      );
      const transactions = transactionsResult.success ? transactionsResult.data || [] : [];

      // 按产品分组汇总
      const summaryMap = new Map();
      transactions.forEach((transaction: any) => {
        const key = transaction.productId;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            productId: transaction.productId,
            productName: transaction.productName,
            sku: transaction.sku,
            categoryName: transaction.categoryName,
            totalIn: 0,
            totalOut: 0,
            totalAdjust: 0,
            netChange: 0
          });
        }

        const summary = summaryMap.get(key);
        if (transaction.type === 'IN') {
          summary.totalIn += transaction.quantity;
        } else if (transaction.type === 'OUT') {
          summary.totalOut += transaction.quantity;
        } else if (transaction.type === 'ADJUST') {
          summary.totalAdjust += transaction.quantity;
        }
        summary.netChange = summary.totalIn - summary.totalOut + summary.totalAdjust;
      });

      const summaryData = Array.from(summaryMap.values());
      return { success: true, data: summaryData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存移动汇总失败'
      };
    }
  }

  /**
   * 获取库存预警
   */
  async getInventoryAlerts(): Promise<DomainServiceResult<any[]>> {
    try {
      // 获取低库存和缺货预警
      const alertsResult = await window.electronAPI.dbAll(
        `SELECT p.id, p.name, p.sku, s.currentStock, s.minStock, s.maxStock,
                c.name as categoryName, w.name as warehouseName,
                CASE
                  WHEN s.currentStock = 0 THEN 'OUT_OF_STOCK'
                  WHEN s.currentStock <= s.minStock THEN 'LOW_STOCK'
                  WHEN s.currentStock >= s.maxStock THEN 'OVERSTOCK'
                  ELSE 'NORMAL'
                END as alertType
         FROM products p
         LEFT JOIN inventory_stocks s ON p.id = s.productId
         LEFT JOIN categories c ON p.categoryId = c.id
         LEFT JOIN warehouses w ON s.warehouseId = w.id
         WHERE s.currentStock <= s.minStock OR s.currentStock >= s.maxStock
         ORDER BY
           CASE
             WHEN s.currentStock = 0 THEN 1
             WHEN s.currentStock <= s.minStock THEN 2
             WHEN s.currentStock >= s.maxStock THEN 3
             ELSE 4
           END, p.name`
      );

      const alerts = alertsResult.success ? alertsResult.data || [] : [];
      return { success: true, data: alerts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存预警失败'
      };
    }
  }



  /**
   * 获取仪表板数据
   */
  async getDashboardData(): Promise<DomainServiceResult<DashboardData>> {
    try {
      // 获取统计信息
      const statsResult = await this.getInventoryStatistics();
      if (!statsResult.success) {
        throw new Error(statsResult.error);
      }

      // 获取最近交易记录
      const recentTransactionsResult = await window.electronAPI.dbAll(
        'SELECT * FROM inventory_transactions ORDER BY createdAt DESC LIMIT ?', [10]
      );
      const recentTransactions = recentTransactionsResult.success ? recentTransactionsResult.data || [] : [];

      // 获取库存价值最高的产品
      const topProductsResult = await window.electronAPI.dbAll(
        `SELECT p.*, s.currentStock, s.totalValue
         FROM products p
         LEFT JOIN inventory_stocks s ON p.id = s.productId
         ORDER BY s.totalValue DESC LIMIT ?`, [5]
      );
      const topProducts = topProductsResult.success ? topProductsResult.data || [] : [];

      // 获取预警信息
      const alertsResult = await this.getStockAlerts();
      const alerts = alertsResult.success ? alertsResult.data! : [];

      const dashboardData: DashboardData = {
        summary: {
          totalProducts: statsResult.data!.totalProducts,
          totalValue: statsResult.data!.totalInventoryValue,
          lowStockItems: statsResult.data!.lowStockCount,
          outOfStockItems: statsResult.data!.outOfStockCount
        },
        recentTransactions: recentTransactions.map((tx: any) => ({
          id: tx.id,
          productName: tx.productName || '未知产品',
          type: tx.type,
          quantity: tx.quantity,
          date: tx.createdAt
        })),
        topProducts: topProducts.map((product: any) => ({
          id: product.id,
          name: product.name,
          totalValue: product.totalValue || 0,
          currentStock: product.currentStock || 0
        })),
        alerts: alerts.slice(0, 5) // 只显示前5个预警
      };

      return { success: true, data: dashboardData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仪表板数据失败'
      };
    }
  }

  /**
   * 获取库存报表数据
   */
  async getStockReport(filter?: ReportFilter): Promise<DomainServiceResult<StockReportData>> {
    try {
      // 构建查询条件
      let whereClause = 'WHERE p.status != "deleted"';
      const params: any[] = [];

      if (filter?.categoryId) {
        whereClause += ' AND p.categoryId = ?';
        params.push(filter.categoryId);
      }

      if (filter?.warehouseId) {
        whereClause += ' AND s.warehouseId = ?';
        params.push(filter.warehouseId);
      }

      // 查询库存报表数据
      const query = `
        SELECT 
          p.id, p.name, p.sku, p.status,
          c.name as categoryName,
          COALESCE(s.currentStock, 0) as currentStock,
          COALESCE(s.minStock, 0) as minStock,
          COALESCE(s.maxStock, 1000) as maxStock,
          COALESCE(s.unitPrice, 0) as unitPrice,
          COALESCE(s.totalValue, 0) as totalValue
        FROM products p
        LEFT JOIN categories c ON p.categoryId = c.id
        LEFT JOIN inventory_stocks s ON p.id = s.productId
        ${whereClause}
        ORDER BY p.name
      `;

      const productsResult = await window.electronAPI.dbAll(query, params);
      const products = productsResult.success ? productsResult.data || [] : [];

      // 计算汇总信息
      const totalValue = products.reduce((sum: any, p: any) => sum + (p.totalValue || 0), 0);
      const lowStockItems = products.filter((p: any) => p.currentStock <= p.minStock).length;
      const outOfStockItems = products.filter((p: any) => p.currentStock === 0).length;

      const reportData: StockReportData = {
        products: products.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          categoryName: p.categoryName || '未分类',
          currentStock: p.currentStock,
          minStock: p.minStock,
          maxStock: p.maxStock,
          unitPrice: p.unitPrice,
          totalValue: p.totalValue,
          status: p.status
        })),
        summary: {
          totalItems: products.length,
          totalValue,
          lowStockItems,
          outOfStockItems
        }
      };

      return { success: true, data: reportData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存报表失败'
      };
    }
  }

  /**
   * 获取库存变动报表
   */
  async getMovementReport(filter?: ReportFilter): Promise<DomainServiceResult<MovementReportData>> {
    try {
      // 构建查询条件
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filter?.startDate) {
        whereClause += ' AND t.createdAt >= ?';
        params.push(filter.startDate);
      }

      if (filter?.endDate) {
        whereClause += ' AND t.createdAt <= ?';
        params.push(filter.endDate);
      }

      if (filter?.transactionType) {
        whereClause += ' AND t.type = ?';
        params.push(filter.transactionType);
      }

      if (filter?.warehouseId) {
        whereClause += ' AND t.warehouseId = ?';
        params.push(filter.warehouseId);
      }

      // 查询交易记录
      const query = `
        SELECT 
          t.id, t.createdAt, t.type, t.quantity, t.unitPrice, t.totalAmount, t.operator,
          p.name as productName,
          w.name as warehouseName
        FROM inventory_transactions t
        LEFT JOIN products p ON t.productId = p.id
        LEFT JOIN warehouses w ON t.warehouseId = w.id
        ${whereClause}
        ORDER BY t.createdAt DESC
      `;

      const transactionsResult = await window.electronAPI.dbAll(query, params);
      const transactions = transactionsResult.success ? transactionsResult.data || [] : [];

      // 计算汇总信息
      const totalInbound = transactions
        .filter((t: any) => t.type === 'in')
        .reduce((sum: any, t: any) => sum + Math.abs(t.quantity), 0);

      const totalOutbound = transactions
        .filter((t: any) => t.type === 'out')
        .reduce((sum: any, t: any) => sum + Math.abs(t.quantity), 0);

      const totalValue = transactions.reduce((sum: any, t: any) => sum + (t.totalAmount || 0), 0);

      const reportData: MovementReportData = {
        transactions: transactions.map((t: any) => ({
          id: t.id,
          date: t.createdAt,
          productName: t.productName || '未知产品',
          type: t.type,
          quantity: t.quantity,
          unitPrice: t.unitPrice,
          totalAmount: t.totalAmount,
          warehouseName: t.warehouseName || '默认仓库',
          operator: t.operator
        })),
        summary: {
          totalTransactions: transactions.length,
          totalInbound,
          totalOutbound,
          totalValue
        }
      };

      return { success: true, data: reportData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取变动报表失败'
      };
    }
  }

  /**
   * 获取库存预警信息
   */
  async getStockAlerts(): Promise<DomainServiceResult<StockAlert[]>> {
    try {
      // 查询需要预警的库存
      const query = `
        SELECT 
          p.id, p.name, p.sku,
          s.currentStock, s.minStock, s.maxStock
        FROM products p
        LEFT JOIN inventory_stocks s ON p.id = s.productId
        WHERE p.status = 'active' 
        AND (
          s.currentStock = 0 
          OR s.currentStock <= s.minStock 
          OR s.currentStock > s.maxStock
        )
        ORDER BY 
          CASE 
            WHEN s.currentStock = 0 THEN 1
            WHEN s.currentStock <= s.minStock THEN 2
            WHEN s.currentStock > s.maxStock THEN 3
            ELSE 4
          END
      `;

      const alertItemsResult = await window.electronAPI.dbAll(query, []);
      const alertItems = alertItemsResult.success ? alertItemsResult.data || [] : [];

      const alerts: StockAlert[] = alertItems.map((item: any) => {
        let type: 'low_stock' | 'out_of_stock' | 'overstock';
        let message: string;
        let severity: 'high' | 'medium' | 'low';

        if (item.currentStock === 0) {
          type = 'out_of_stock';
          message = `商品 ${item.name} 已缺货`;
          severity = 'high';
        } else if (item.currentStock <= item.minStock) {
          type = 'low_stock';
          message = `商品 ${item.name} 库存不足，当前库存 ${item.currentStock}，最小库存 ${item.minStock}`;
          severity = 'medium';
        } else {
          type = 'overstock';
          message = `商品 ${item.name} 库存过多，当前库存 ${item.currentStock}，最大库存 ${item.maxStock}`;
          severity = 'low';
        }

        return {
          id: `alert_${item.id}`,
          type,
          productId: item.id,
          productName: item.name,
          sku: item.sku,
          currentStock: item.currentStock,
          minStock: item.minStock,
          maxStock: item.maxStock,
          message,
          severity,
          createdAt: new Date()
        };
      });

      return { success: true, data: alerts };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存预警失败'
      };
    }
  }

  /**
   * 向后兼容方法
   */
  async getStatistics(): Promise<DomainServiceResult<InventoryStatistics>> {
    return this.getInventoryStatistics();
  }
}
