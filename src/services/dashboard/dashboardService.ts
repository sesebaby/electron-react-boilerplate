import { businessServiceManager } from '../business';
import { 
  productService,
  categoryService,
  unitService,
  warehouseService,
  inventoryStockService,
  supplierService,
  customerService
} from '../business';

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

  async initialize(): Promise<void> {
    console.log('Dashboard service initialized');
  }

  // =============== 概览数据 ===============

  async getOverview(): Promise<DashboardOverview> {
    const [
      productStats,
      supplierStats, 
      customerStats,
      warehouseStats,
      inventoryStats
    ] = await Promise.all([
      productService.getProductStats(),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      warehouseService.getWarehouseStats(),
      inventoryStockService.getInventorySummary()
    ]);

    const lowStockItems = await inventoryStockService.findLowStockItems();
    const outOfStockItems = await inventoryStockService.findOutOfStockItems();

    return {
      totalProducts: productStats.total,
      totalSuppliers: supplierStats.total,
      totalCustomers: customerStats.total,
      totalWarehouses: warehouseStats.total,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      totalInventoryValue: inventoryStats.totalValue,
      recentTransactions: inventoryStats.totalTransactions
    };
  }

  async getQuickStats(): Promise<QuickStats> {
    const [
      productStats,
      inventoryStats,
      supplierStats,
      customerStats,
      lowStockItems,
      vipCustomers,
      topSuppliers
    ] = await Promise.all([
      productService.getProductStats(),
      inventoryStockService.getInventorySummary(),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      inventoryStockService.findLowStockItems(),
      customerService.findVIPCustomers(),
      supplierService.getTopSuppliersByCredit(5)
    ]);

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
        stockTurnover: 0 // TODO: 计算库存周转率
      },
      businessStats: {
        suppliers: supplierStats.total,
        customers: customerStats.total,
        vipCustomers: vipCustomers.length,
        topSuppliers: topSuppliers.length
      }
    };
  }

  // =============== 图表数据 ===============

  async getChartData(): Promise<DashboardChartData> {
    const [
      categories,
      stocks,
      topProductsByValue,
      supplierStats,
      customerStats
    ] = await Promise.all([
      categoryService.findAll(),
      inventoryStockService.findAllStocks(),
      inventoryStockService.getTopProductsByValue(10),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats()
    ]);

    // 按分类统计库存
    const inventoryByCategory = await this.getInventoryByCategory();

    // 库存流水趋势（近7天）
    const stockMovement = await this.getStockMovementTrend(7);

    // 热销产品
    const topProducts = topProductsByValue.map(item => ({
      product: item.product?.name || '未知产品',
      value: item.totalValue,
      quantity: item.stock.currentStock
    }));

    // 供应商评级分布
    const supplierDistribution = Object.entries(supplierStats.byRating).map(([rating, count]) => ({
      rating,
      count,
      percentage: supplierStats.total > 0 ? (count / supplierStats.total) * 100 : 0
    }));

    // 客户等级分布
    const customerLevels = Object.entries(customerStats.byLevel).map(([level, count]) => ({
      level,
      count,
      totalValue: 0 // TODO: 计算各等级客户的总消费额
    }));

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
    const categories = await categoryService.findAll();
    const stocks = await inventoryStockService.findAllStocks();

    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const categoryStats = new Map<string, { value: number; count: number }>();

    for (const stock of stocks) {
      const product = await productService.findById(stock.productId);
      if (product) {
        const categoryName = categoryMap.get(product.categoryId) || '未分类';
        const existing = categoryStats.get(categoryName) || { value: 0, count: 0 };
        
        categoryStats.set(categoryName, {
          value: existing.value + (stock.currentStock * stock.avgCost),
          count: existing.count + 1
        });
      }
    }

    return Array.from(categoryStats.entries()).map(([category, stats]) => ({
      category,
      value: stats.value,
      count: stats.count
    }));
  }

  private async getStockMovementTrend(days: number): Promise<Array<{
    date: string;
    stockIn: number;
    stockOut: number;
    adjustment: number;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const transactions = await inventoryStockService.findTransactionsByDateRange(startDate, endDate);
    
    const movementMap = new Map<string, { stockIn: number; stockOut: number; adjustment: number }>();

    // 初始化日期
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      movementMap.set(dateStr, { stockIn: 0, stockOut: 0, adjustment: 0 });
    }

    // 统计每日流水
    transactions.forEach(transaction => {
      const dateStr = transaction.createdAt.toISOString().split('T')[0];
      const existing = movementMap.get(dateStr);
      
      if (existing) {
        switch (transaction.transactionType) {
          case 'in':
            existing.stockIn += transaction.quantity;
            break;
          case 'out':
            existing.stockOut += Math.abs(transaction.quantity);
            break;
          case 'adjust':
            existing.adjustment += Math.abs(transaction.quantity);
            break;
        }
      }
    });

    return Array.from(movementMap.entries()).map(([date, movement]) => ({
      date,
      ...movement
    }));
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
    
    // 检查基础数据
    const lowStockItems = await inventoryStockService.findLowStockItems();
    const outOfStockItems = await inventoryStockService.findOutOfStockItems();
    
    if (lowStockItems.length > 0) {
      recommendations.push(`有 ${lowStockItems.length} 个商品库存偏低，建议及时补货`);
    }
    
    if (outOfStockItems.length > 0) {
      recommendations.push(`有 ${outOfStockItems.length} 个商品已缺货，需要紧急补货`);
    }

    // 检查数据完整性
    const products = await productService.findAll();
    const productsWithoutCategory = [];
    for (const product of products) {
      const category = await categoryService.findById(product.categoryId);
      if (!category) {
        productsWithoutCategory.push(product.name);
      }
    }

    if (productsWithoutCategory.length > 0) {
      validation.warnings.push(`有 ${productsWithoutCategory.length} 个商品的分类数据异常`);
    }

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (validation.issues.length > 0) {
      status = 'error';
    } else if (validation.warnings.length > 0 || recommendations.length > 0) {
      status = 'warning';
    }

    return {
      status,
      issues: validation.issues,
      warnings: validation.warnings,
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
    const lowStockItems = await inventoryStockService.findLowStockItems();
    const outOfStockItems = await inventoryStockService.findOutOfStockItems();
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
      { name: '添加商品', description: '快速添加新商品', icon: 'plus', route: '/products/add' },
      { name: '库存入库', description: '商品入库操作', icon: 'import', route: '/inventory/in' },
      { name: '库存出库', description: '商品出库操作', icon: 'export', route: '/inventory/out' },
      { name: '创建采购单', description: '新建采购订单', icon: 'shopping-cart', route: '/purchase/orders/add' },
      { name: '创建销售单', description: '新建销售订单', icon: 'dollar-sign', route: '/sales/orders/add' },
      { name: '查看报表', description: '查看统计报表', icon: 'bar-chart', route: '/reports' }
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
}

export default new DashboardService();