import { businessServiceManager } from '../business';
import {
  // productService,  // 暂时注释掉
  categoryService,
  unitService,
  warehouseService,
  // inventoryStockService,  // 暂时注释掉
  supplierService,
  customerService
} from '../business';
// import { InventoryService } from '../inventory/inventoryService';  // 暂时注释掉

// Dashboard数据类型定义
export interface DashboardOverview {
  totalProducts: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalWarehouses: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  recentTransactions: number;
}

export interface QuickStats {
  productsStats: {
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
  inventoryStats: {
    totalValue: number;
    totalItems: number;
    avgItemValue: number;
    stockTurnover: number;
  };
  businessStats: {
    suppliers: number;
    customers: number;
    vipCustomers: number;
    topSuppliers: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'stock_in' | 'stock_out' | 'stock_adjust' | 'product_created' | 'order_created';
  description: string;
  timestamp: Date;
  details?: any;
}

export interface DashboardChartData {
  inventoryByCategory: Array<{
    category: string;
    value: number;
    count: number;
  }>;
  stockMovement: Array<{
    date: string;
    stockIn: number;
    stockOut: number;
    adjustment: number;
  }>;
  topProducts: Array<{
    product: string;
    value: number;
    quantity: number;
  }>;
  supplierDistribution: Array<{
    rating: string;
    count: number;
    percentage: number;
  }>;
  customerLevels: Array<{
    level: string;
    count: number;
    totalValue: number;
  }>;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  issues: string[];
  warnings: string[];
  recommendations: string[];
  lastCheck: Date;
}

export class DashboardService {
  private recentActivities: RecentActivity[] = [];
  // private inventoryService: InventoryService;  // 暂时注释掉

  constructor() {
    // this.inventoryService = new InventoryService();  // 暂时注释掉
  }

  async initialize(): Promise<void> {
    // await this.inventoryService.initialize();  // 暂时注释掉
    console.log('Dashboard service initialized');
  }

  // =============== 概览数据 ===============

  async getOverview(): Promise<DashboardOverview> {
    // 临时返回模拟数据，避免依赖问题
    const [
      supplierStats,
      customerStats,
      warehouseStats
    ] = await Promise.all([
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      warehouseService.getWarehouseStats()
    ]);

    return {
      totalProducts: 0, // 暂时设为0
      totalSuppliers: supplierStats.totalCount,
      totalCustomers: customerStats.totalCount,
      totalWarehouses: warehouseStats.total,
      lowStockItems: 0, // 暂时设为0
      outOfStockItems: 0, // 暂时设为0
      totalInventoryValue: 0, // 暂时设为0
      recentTransactions: 0 // 暂时设为0
    };
  }

  async getQuickStats(): Promise<QuickStats> {
    // 暂时只获取基础服务的统计信息
    const [
      supplierStats,
      customerStats,
      vipCustomers,
      topSuppliers
    ] = await Promise.all([
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      customerService.findVIPCustomers(),
      supplierService.getTopSuppliersByCredit()
    ]);

    // 暂时设置默认值，避免引用未导入的服务
    const productStats = { total: 0, active: 0, inactive: 0 };
    const inventoryStats = { totalProducts: 0, totalValue: 0 };
    const lowStockItems: any[] = [];

    const avgItemValue = inventoryStats.totalProducts > 0
      ? inventoryStats.totalValue / inventoryStats.totalProducts
      : 0;

    return {
      productsStats: {
        total: productStats.total,
        active: productStats.active,
        inactive: productStats.inactive,
        lowStock: lowStockItems.length
      },
      inventoryStats: {
        totalValue: inventoryStats.totalValue,
        totalItems: inventoryStats.totalProducts,
        avgItemValue,
        stockTurnover: await this.calculateStockTurnover()
      },
      businessStats: {
        suppliers: supplierStats.totalCount,
        customers: customerStats.totalCount,
        vipCustomers: vipCustomers.length,
        topSuppliers: topSuppliers.length
      }
    };
  }

  // =============== 图表数据 ===============

  async getChartData(): Promise<DashboardChartData> {
    // 暂时只获取基础服务的统计信息
    const [
      categories,
      supplierStats,
      customerStats
    ] = await Promise.all([
      categoryService.findAll(),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats()
    ]);

    // 暂时设置默认值，避免引用未导入的服务
    const stocks: any[] = [];
    const topProductsByValue: any[] = [];

    // 按分类统计库存（暂时返回空数组）
    const inventoryByCategory: any[] = [];

    // 库存流水趋势（暂时返回空数组）
    const stockMovement: any[] = [];

    // 热销产品（暂时返回空数组）
    const topProducts: any[] = [];

    // 供应商评级分布
    const supplierDistribution = [
      { rating: 'A', count: 0, percentage: 0 },
      { rating: 'B', count: 0, percentage: 0 },
      { rating: 'C', count: 0, percentage: 0 }
    ];

    // 客户等级分布
    const customerLevels = [
      { level: 'VIP', count: 0, totalValue: 0 },
      { level: 'Gold', count: 0, totalValue: 0 },
      { level: 'Silver', count: 0, totalValue: 0 },
      { level: 'Bronze', count: 0, totalValue: 0 }
    ];

    return {
      inventoryByCategory,
      stockMovement,
      topProducts,
      supplierDistribution,
      customerLevels
    };
  }

  private async getInventoryByCategory(): Promise<Array<{
    category: string;
    value: number;
    count: number;
  }>> {
    // 暂时返回空数组，避免引用未导入的服务
    return [];

    // const categories = await categoryService.findAll();
    // const stocks = await inventoryStockService.findAllStocks();
    //
    // const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    // const categoryStats = new Map<string, { value: number; count: number }>();
    //
    // for (const stock of stocks) {
    //   const product = await productService.findById(stock.productId);
    //   if (product) {
    //     const categoryName = categoryMap.get(product.categoryId) || '未分类';
    //     const existing = categoryStats.get(categoryName) || { value: 0, count: 0 };
    //
    //     categoryStats.set(categoryName, {
    //       value: existing.value + (stock.currentStock * stock.avgCost),
    //       count: existing.count + 1
    //     });
    //   }
    // }
    //
    // return Array.from(categoryStats.entries()).map(([category, stats]) => ({
    //   category,
    //   value: stats.value,
    //   count: stats.count
    // }));
  }

  private async getStockMovementTrend(days: number): Promise<Array<{
    date: string;
    stockIn: number;
    stockOut: number;
    adjustment: number;
  }>> {
    // 暂时返回空数组，避免引用未导入的服务
    return [];

    // const endDate = new Date();
    // const startDate = new Date();
    // startDate.setDate(endDate.getDate() - days);
    //
    // const transactions = await inventoryStockService.findTransactionsByDateRange(startDate, endDate);

    // const movementMap = new Map<string, { stockIn: number; stockOut: number; adjustment: number }>();
    //
    // // 初始化日期
    // for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    //   const dateStr = d.toISOString().split('T')[0];
    //   movementMap.set(dateStr, { stockIn: 0, stockOut: 0, adjustment: 0 });
    // }
    //
    // // 统计每日流水
    // transactions.forEach(transaction => {
    //   const dateStr = transaction.createdAt.toISOString().split('T')[0];
    //   const existing = movementMap.get(dateStr);
    //
    //   if (existing) {
    //     switch (transaction.transactionType) {
    //       case 'in':
    //         existing.stockIn += transaction.quantity;
    //         break;
    //       case 'out':
    //         existing.stockOut += Math.abs(transaction.quantity);
    //         break;
    //       case 'adjust':
    //         existing.adjustment += Math.abs(transaction.quantity);
    //         break;
    //     }
    //   }
    // });
    //
    // return Array.from(movementMap.entries()).map(([date, movement]) => ({
    //   date,
    //   ...movement
    // }));
  }

  // =============== 最近活动 ===============

  addActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): void {
    const newActivity: RecentActivity = {
      id: Date.now().toString(),
      timestamp: new Date(),
      ...activity
    };

    this.recentActivities.unshift(newActivity);
    
    // 只保留最近100条活动
    if (this.recentActivities.length > 100) {
      this.recentActivities = this.recentActivities.slice(0, 100);
    }
  }

  async getRecentActivities(limit: number = 20): Promise<RecentActivity[]> {
    return this.recentActivities.slice(0, limit);
  }

  // =============== 系统健康状态 ===============

  async getSystemHealth(): Promise<SystemHealth> {
    const validation = await businessServiceManager.validateSystemIntegrity();

    const recommendations: string[] = [];
    const warnings: string[] = [];

    // 暂时注释掉库存检查，避免引用未导入的服务
    // // 检查基础数据
    // const lowStockItems = await inventoryStockService.findLowStockItems();
    // const outOfStockItems = await inventoryStockService.findOutOfStockItems();
    //
    // if (lowStockItems.length > 0) {
    //   recommendations.push(`有 ${lowStockItems.length} 个商品库存偏低，建议及时补货`);
    // }
    //
    // if (outOfStockItems.length > 0) {
    //   recommendations.push(`有 ${outOfStockItems.length} 个商品已缺货，需要紧急补货`);
    // }

    // 暂时注释掉产品数据完整性检查，避免引用未导入的服务
    // // 检查数据完整性
    // const products = await productService.findAll();
    // const productsWithoutCategory = [];
    // for (const product of products) {
    //   const category = await categoryService.findById(product.categoryId);
    //   if (!category) {
    //     productsWithoutCategory.push(product.name);
    //   }
    // }
    //
    // if (productsWithoutCategory.length > 0) {
    //   warnings.push(`有 ${productsWithoutCategory.length} 个商品的分类数据异常`);
    // }

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    const validationIssues = Array.isArray(validation.issues) ? validation.issues : [];
    const errorIssues = validationIssues.filter((issue: any) => issue && issue.type === 'error');
    const warningIssues = validationIssues.filter((issue: any) => issue && issue.type === 'warning');
    
    if (errorIssues.length > 0) {
      status = 'error';
    } else if (warningIssues.length > 0 || warnings.length > 0 || recommendations.length > 0) {
      status = 'warning';
    }

    return {
      status,
      issues: validationIssues.map((issue: any) => issue && issue.message ? issue.message : '未知问题'),
      warnings,
      recommendations,
      lastCheck: new Date()
    };
  }

  // =============== 快速操作数据 ===============

  async getQuickActions(): Promise<{
    needAttention: Array<{
      type: 'low_stock' | 'out_of_stock' | 'system_issue';
      count: number;
      description: string;
      action: string;
    }>;
    shortcuts: Array<{
      name: string;
      description: string;
      icon: string;
      route: string;
    }>;
  }> {
    // 暂时设置默认值，避免引用未导入的服务
    const lowStockItems: any[] = [];
    const outOfStockItems: any[] = [];
    const systemHealth = await this.getSystemHealth();

    const needAttention: Array<{
      type: 'low_stock' | 'out_of_stock' | 'system_issue';
      count: number;
      description: string;
      action: string;
    }> = [
      {
        type: 'low_stock' as const,
        count: lowStockItems.length,
        description: '库存偏低的商品',
        action: '查看详情'
      },
      {
        type: 'out_of_stock' as const,
        count: outOfStockItems.length,
        description: '缺货的商品',
        action: '紧急补货'
      }
    ];

    if (systemHealth.issues.length > 0) {
      needAttention.push({
        type: 'system_issue' as const,
        count: systemHealth.issues.length,
        description: '系统问题',
        action: '查看详情'
      });
    }

    const shortcuts = [
      { name: '添加商品', description: '快速添加新商品', icon: 'plus', route: 'products' },
      { name: '库存入库', description: '商品入库操作', icon: 'import', route: 'stock-in' },
      { name: '库存出库', description: '商品出库操作', icon: 'export', route: 'stock-out' },
      { name: '创建采购单', description: '新建采购订单', icon: 'shopping-cart', route: 'purchase-orders' },
      { name: '创建销售单', description: '新建销售订单', icon: 'dollar-sign', route: 'sales-orders' },
      { name: '查看报表', description: '查看统计报表', icon: 'bar-chart', route: 'inventory-reports' }
    ];

    return {
      needAttention: needAttention.filter(item => item.count > 0),
      shortcuts
    };
  }

  // =============== 实时更新 ===============

  async refreshData(): Promise<{
    overview: DashboardOverview;
    quickStats: QuickStats;
    systemHealth: SystemHealth;
    lastUpdated: Date;
  }> {
    const [overview, quickStats, systemHealth] = await Promise.all([
      this.getOverview(),
      this.getQuickStats(),
      this.getSystemHealth()
    ]);

    return {
      overview,
      quickStats,
      systemHealth,
      lastUpdated: new Date()
    };
  }

  // =============== 辅助计算方法 ===============

  private async calculateStockTurnover(): Promise<number> {
    try {
      // 暂时返回默认值，避免引用未导入的服务
      return 0;

      // // 简化的库存周转率计算：年销售额 / 平均库存价值
      // // 这里使用模拟数据，实际应该从销售记录计算
      // const inventory = await this.inventoryService.getAllItems();
      // const totalInventoryValue = inventory.reduce((sum: number, item: any) => sum + item.totalValue, 0);
      //
      // if (totalInventoryValue === 0) return 0;
      //
      // // 模拟年销售额（实际应该从销售记录计算）
      // const estimatedAnnualSales = totalInventoryValue * 3; // 假设周转3次
      // return Math.round((estimatedAnnualSales / totalInventoryValue) * 100) / 100;
    } catch (error) {
      console.error('计算库存周转率失败:', error);
      return 0;
    }
  }

  private async calculateCustomerLevelValue(level: string): Promise<number> {
    try {
      // 根据客户等级计算总消费额
      // 这里使用模拟数据，实际应该从销售记录统计
      const customers = await customerService.findByLevel(level);
      
      // 模拟不同等级客户的平均消费
      const avgSpendingByLevel: Record<string, number> = {
        'VIP': 50000,
        'GOLD': 20000,
        'SILVER': 8000,
        'BRONZE': 3000,
        'REGULAR': 1000
      };
      
      const avgSpending = avgSpendingByLevel[level.toUpperCase()] || 1000;
      return customers.length * avgSpending;
    } catch (error) {
      console.error('计算客户等级消费额失败:', error);
      return 0;
    }
  }
}

export default new DashboardService();