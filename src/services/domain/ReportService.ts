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
      const [products, categories, units, warehouses, stocks] = await Promise.all([
        window.electronAPI.dbGetAllProducts(),
        window.electronAPI.dbGetAllCategories(),
        window.electronAPI.dbGetAllUnits(),
        window.electronAPI.dbGetAllWarehouses(),
        window.electronAPI.dbGetAllStocks()
      ]);

      // 计算统计信息
      const activeProducts = products.filter(p => p.status === ProductStatus.ACTIVE);
      const totalInventoryValue = stocks.reduce((sum, stock) => sum + (stock.totalValue || 0), 0);
      const lowStockCount = stocks.filter(stock => stock.currentStock <= stock.minStock).length;
      const outOfStockCount = stocks.filter(stock => stock.currentStock === 0).length;

      // 按状态统计产品数量
      const countByStatus: Record<ProductStatus, number> = {
        [ProductStatus.ACTIVE]: 0,
        [ProductStatus.INACTIVE]: 0,
        [ProductStatus.DISCONTINUED]: 0
      };

      products.forEach(product => {
        if (countByStatus[product.status] !== undefined) {
          countByStatus[product.status]++;
        }
      });

      // 按分类统计产品数量
      const countByCategory: Record<string, number> = {};
      categories.forEach(category => {
        countByCategory[category.name] = products.filter(p => p.categoryId === category.id).length;
      });

      // 计算平均价格
      const totalPrice = products.reduce((sum, product) => sum + (product.salePrice || 0), 0);
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
      const recentTransactions = await window.electronAPI.dbGetRecentTransactions(10);
      
      // 获取库存价值最高的产品
      const topProducts = await window.electronAPI.dbGetTopValueProducts(5);

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
        recentTransactions: recentTransactions.map(tx => ({
          id: tx.id,
          productName: tx.productName || '未知产品',
          type: tx.type,
          quantity: tx.quantity,
          date: tx.createdAt
        })),
        topProducts: topProducts.map(product => ({
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

      const products = await window.electronAPI.dbQuery(query, params);

      // 计算汇总信息
      const totalValue = products.reduce((sum, p) => sum + (p.totalValue || 0), 0);
      const lowStockItems = products.filter(p => p.currentStock <= p.minStock).length;
      const outOfStockItems = products.filter(p => p.currentStock === 0).length;

      const reportData: StockReportData = {
        products: products.map(p => ({
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

      const transactions = await window.electronAPI.dbQuery(query, params);

      // 计算汇总信息
      const totalInbound = transactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
      
      const totalOutbound = transactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
      
      const totalValue = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

      const reportData: MovementReportData = {
        transactions: transactions.map(t => ({
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

      const alertItems = await window.electronAPI.dbQuery(query);

      const alerts: StockAlert[] = alertItems.map(item => {
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
