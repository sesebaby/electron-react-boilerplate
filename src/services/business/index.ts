// 核心业务服务层 - 统一入口和服务管理

import productService from './productService';
import categoryService from './categoryService';
import unitService from './unitService';
import warehouseService from './warehouseService';
import inventoryStockService from './inventoryStockService';
import supplierService from './supplierService';
import customerService from './customerService';
import purchaseOrderService from './purchaseOrderService';
import purchaseReceiptService from './purchaseReceiptService';
import salesOrderService from './salesOrderService';
import salesDeliveryService from './salesDeliveryService';
import accountsPayableService from './accountsPayableService';
import accountsReceivableService from './accountsReceivableService';
import userService from './userService';

// 导出所有服务实例
export {
  productService,
  categoryService,
  unitService,
  warehouseService,
  inventoryStockService,
  supplierService,
  customerService,
  purchaseOrderService,
  purchaseReceiptService,
  salesOrderService,
  salesDeliveryService,
  accountsPayableService,
  accountsReceivableService,
  userService
};

// 服务管理器
export class BusinessServiceManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Business services already initialized');
      return;
    }

    console.log('Initializing business services...');

    try {
      // 按依赖顺序初始化服务
      // 1. 基础数据服务（无依赖）
      await Promise.all([
        categoryService.initialize(),
        unitService.initialize(),
        warehouseService.initialize(),
        supplierService.initialize(),
        customerService.initialize(),
        userService.initialize()
      ]);

      // 2. 产品服务（依赖分类和单位）
      await productService.initialize();

      // 3. 库存服务（依赖产品和仓库）
      await inventoryStockService.initialize();

      // 4. 采购订单服务（依赖产品和供应商）
      await purchaseOrderService.initialize();

      // 5. 采购收货服务（依赖采购订单和库存）
      await purchaseReceiptService.initialize();

      // 6. 销售订单服务（依赖产品和客户）
      await salesOrderService.initialize();

      // 7. 销售出库服务（依赖销售订单和库存）
      await salesDeliveryService.initialize();

      // 8. 财务服务（依赖采购和销售数据）
      await Promise.all([
        accountsPayableService.initialize(),
        accountsReceivableService.initialize()
      ]);

      this.initialized = true;
      console.log('All business services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize business services:', error);
      throw error;
    }
  }

  async getSystemStatus(): Promise<{
    initialized: boolean;
    services: Array<{
      name: string;
      status: 'active' | 'error';
      details?: any;
    }>;
  }> {
    const services = [];

    try {
      // 检查各个服务的状态
      const categoryStats = await categoryService.getCategoryStats();
      services.push({
        name: 'CategoryService',
        status: 'active' as const,
        details: categoryStats
      });

      const unitStats = await unitService.getUnitStats();
      services.push({
        name: 'UnitService',
        status: 'active' as const,
        details: unitStats
      });

      const warehouseStats = await warehouseService.getWarehouseStats();
      services.push({
        name: 'WarehouseService',
        status: 'active' as const,
        details: warehouseStats
      });

      const productStats = await productService.getProductStats();
      services.push({
        name: 'ProductService',
        status: 'active' as const,
        details: productStats
      });

      const supplierStats = await supplierService.getSupplierStats();
      services.push({
        name: 'SupplierService',
        status: 'active' as const,
        details: supplierStats
      });

      const customerStats = await customerService.getCustomerStats();
      services.push({
        name: 'CustomerService',
        status: 'active' as const,
        details: customerStats
      });

      const inventoryStats = await inventoryStockService.getInventorySummary();
      services.push({
        name: 'InventoryStockService',
        status: 'active' as const,
        details: inventoryStats
      });

      const purchaseOrderStats = await purchaseOrderService.getOrderStats();
      services.push({
        name: 'PurchaseOrderService',
        status: 'active' as const,
        details: purchaseOrderStats
      });

      const purchaseReceiptStats = await purchaseReceiptService.getReceiptStats();
      services.push({
        name: 'PurchaseReceiptService',
        status: 'active' as const,
        details: purchaseReceiptStats
      });

      const salesOrderStats = await salesOrderService.getOrderStats();
      services.push({
        name: 'SalesOrderService',
        status: 'active' as const,
        details: salesOrderStats
      });

      const salesDeliveryStats = await salesDeliveryService.getDeliveryStats();
      services.push({
        name: 'SalesDeliveryService',
        status: 'active' as const,
        details: salesDeliveryStats
      });

      const accountsPayableStats = await accountsPayableService.getPayableStats();
      services.push({
        name: 'AccountsPayableService',
        status: 'active' as const,
        details: accountsPayableStats
      });

      const accountsReceivableStats = await accountsReceivableService.getReceivableStats();
      services.push({
        name: 'AccountsReceivableService',
        status: 'active' as const,
        details: accountsReceivableStats
      });

      const userStats = await userService.getUserStats();
      services.push({
        name: 'UserService',
        status: 'active' as const,
        details: userStats
      });

    } catch (error) {
      services.push({
        name: 'Unknown',
        status: 'error' as const,
        details: { error: error instanceof Error ? error.message : '未知错误' }
      });
    }

    return {
      initialized: this.initialized,
      services
    };
  }

  async getBusinessSummary(): Promise<{
    categories: number;
    units: number;
    warehouses: number;
    products: number;
    suppliers: number;
    customers: number;
    stockItems: number;
    transactions: number;
    lowStockItems: number;
    totalInventoryValue: number;
    purchaseOrders: number;
    totalPurchaseValue: number;
    purchaseReceipts: number;
    totalReceiptValue: number;
    salesOrders: number;
    totalSalesValue: number;
    salesDeliveries: number;
    totalDeliveryValue: number;
  }> {
    const [
      categoryStats,
      unitStats,
      warehouseStats,
      productStats,
      supplierStats,
      customerStats,
      inventoryStats,
      purchaseOrderStats,
      purchaseReceiptStats,
      salesOrderStats,
      salesDeliveryStats
    ] = await Promise.all([
      categoryService.getCategoryStats(),
      unitService.getUnitStats(),
      warehouseService.getWarehouseStats(),
      productService.getProductStats(),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      inventoryStockService.getInventorySummary(),
      purchaseOrderService.getOrderStats(),
      purchaseReceiptService.getReceiptStats(),
      salesOrderService.getOrderStats(),
      salesDeliveryService.getDeliveryStats()
    ]);

    return {
      categories: categoryStats.total,
      units: unitStats.total,
      warehouses: warehouseStats.total,
      products: productStats.total,
      suppliers: supplierStats.total,
      customers: customerStats.total,
      stockItems: inventoryStats.totalProducts,
      transactions: inventoryStats.totalTransactions,
      lowStockItems: inventoryStats.lowStockCount,
      totalInventoryValue: inventoryStats.totalValue,
      purchaseOrders: purchaseOrderStats.total,
      totalPurchaseValue: purchaseOrderStats.totalValue,
      purchaseReceipts: purchaseReceiptStats.total,
      totalReceiptValue: purchaseReceiptStats.totalValue,
      salesOrders: salesOrderStats.total,
      totalSalesValue: salesOrderStats.totalValue,
      salesDeliveries: salesDeliveryStats.total,
      totalDeliveryValue: salesDeliveryStats.totalValue
    };
  }

  async validateSystemIntegrity(): Promise<{
    valid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查基础数据完整性
      const categories = await categoryService.findAll();
      const units = await unitService.findAll();
      const warehouses = await warehouseService.findAll();

      if (categories.length === 0) {
        warnings.push('系统中没有商品分类数据');
      }

      if (units.length === 0) {
        warnings.push('系统中没有计量单位数据');
      }

      if (warehouses.length === 0) {
        issues.push('系统中没有仓库数据，无法进行库存管理');
      }

      const defaultWarehouse = await warehouseService.findDefault();
      if (!defaultWarehouse) {
        issues.push('系统中没有设置默认仓库');
      }

      // 检查产品数据完整性
      const products = await productService.findAll();
      for (const product of products) {
        const category = await categoryService.findById(product.categoryId);
        if (!category) {
          issues.push(`产品 ${product.name} 关联的分类不存在: ${product.categoryId}`);
        }

        const unit = await unitService.findById(product.unitId);
        if (!unit) {
          issues.push(`产品 ${product.name} 关联的单位不存在: ${product.unitId}`);
        }
      }

      // 检查库存数据完整性
      const stocks = await inventoryStockService.findAllStocks();
      for (const stock of stocks) {
        const product = await productService.findById(stock.productId);
        if (!product) {
          issues.push(`库存记录关联的产品不存在: ${stock.productId}`);
        }

        const warehouse = await warehouseService.findById(stock.warehouseId);
        if (!warehouse) {
          issues.push(`库存记录关联的仓库不存在: ${stock.warehouseId}`);
        }

        // 检查库存数量逻辑
        if (stock.currentStock !== stock.availableStock + stock.reservedStock) {
          issues.push(`库存记录数量逻辑错误: 产品 ${stock.productId} 在仓库 ${stock.warehouseId}`);
        }
      }

    } catch (error) {
      issues.push(`系统完整性检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings
    };
  }

  async resetAllData(): Promise<void> {
    console.warn('Resetting all business data...');
    
    // 这里应该清空所有服务的数据
    // 在实际实现中，这个操作需要非常谨慎
    // 目前只是记录操作，不实际执行
    console.warn('Data reset operation logged but not executed for safety');
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// 创建并导出服务管理器实例
export const businessServiceManager = new BusinessServiceManager();

// 默认导出管理器，方便使用
export default businessServiceManager;