// 核心业务服务层 - 统一入口和服务管理
// 使用依赖注入容器解决循环依赖问题

import { serviceContainer } from './ServiceContainer';
import './ServiceRegistry'; // 自动注册所有服务

// 直接服务导入（用于类型定义和向后兼容）
import categoryService from './categoryService';
import unitService from './unitService';
import { warehouseService } from './warehouseService';
import supplierService from './supplierService';
import customerService from './customerService';
import userService from './userService';
import inventoryStockService from './inventoryStockService';
import productService from './productService';
import purchaseOrderService from './purchaseOrderService';
import purchaseReceiptService from './purchaseReceiptService';
import salesOrderService from './salesOrderService';
import salesDeliveryService from './salesDeliveryService';
import inventoryCardService from './inventoryCardService';
import { unitConversionService } from './unitConversionService';
import { calendarDataService, CalendarDataService } from './calendarDataService';
import dailyConsumptionService from './dailyConsumptionService';
import fifoInventoryService from './fifoInventoryService';
import monthlyBalanceService from './monthlyBalanceService';
import globalConversionService from './globalConversionService';
import productConversionService from './productConversionService';
import accountsPayableService from './accountsPayableService';
import accountsReceivableService from './accountsReceivableService';
import permissionService from './permissionService';

// 导出所有服务实例（向后兼容）
export {
  categoryService,
  unitService,
  warehouseService,
  supplierService,
  customerService,
  userService,
  inventoryStockService,
  productService,
  purchaseOrderService,
  purchaseReceiptService,
  salesOrderService,
  salesDeliveryService,
  inventoryCardService,
  unitConversionService,
  calendarDataService,
  CalendarDataService,
  dailyConsumptionService,
  fifoInventoryService,
  monthlyBalanceService,
  globalConversionService,
  productConversionService,
  accountsPayableService,
  accountsReceivableService,
  permissionService
};

// 导出新的依赖注入容器
export { serviceContainer } from './ServiceContainer';
export { validateServiceDependencies, getServiceDependencyGraph } from './ServiceRegistry';



// 服务管理器 - 使用依赖注入容器
export class BusinessServiceManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Business services already initialized');
      return;
    }

    console.log('Initializing business services using dependency injection...');

    try {
      // 使用依赖注入容器进行分层初始化
      await serviceContainer.initializeAllServices();
      
      this.initialized = true;
      console.log('All business services initialized successfully using DI container');
      
      // 输出服务状态
      const status = serviceContainer.getServiceStatus();
      console.log(`服务状态: ${status.initialized}/${status.registered} 个服务已初始化`);
    } catch (error) {
      console.error('Failed to initialize business services:', error);
      throw error;
    }
  }

  async getSystemStatus(): Promise<{
    initialized: boolean;
    services: Array<{
      name: string;
      status: 'active' | 'error' | 'initializing';
      details?: any;
    }>;
    dependencyInfo: {
      circularDependencies: string[][];
      validationErrors: string[];
    };
  }> {
    const services = [];
    const containerStatus = serviceContainer.getServiceStatus();
    const validation = await import('./ServiceRegistry').then(m => m.validateServiceDependencies());

    try {
      // 使用依赖注入容器获取服务状态
      for (const serviceInfo of containerStatus.services) {
        let details = null;
        let status: 'active' | 'error' | 'initializing' = serviceInfo.status === 'initialized' ? 'active' : serviceInfo.status;

        try {
          if (serviceInfo.status === 'initialized') {
            // 尝试获取服务的统计信息
            const service = await serviceContainer.resolve(serviceInfo.name);
            if (service) {
              // 尝试调用各种统计方法
              if (typeof service.getCategoryStats === 'function') {
                details = await service.getCategoryStats();
              } else if (typeof service.getUnitStats === 'function') {
                details = await service.getUnitStats();
              } else if (typeof service.getWarehouseStats === 'function') {
                details = await service.getWarehouseStats();
              } else if (typeof service.getProductStats === 'function') {
                details = await service.getProductStats();
              } else if (typeof service.getSupplierStats === 'function') {
                details = await service.getSupplierStats();
              } else if (typeof service.getCustomerStats === 'function') {
                details = await service.getCustomerStats();
              } else if (typeof service.getInventorySummary === 'function') {
                details = await service.getInventorySummary();
              } else if (typeof service.getUserStats === 'function') {
                details = await service.getUserStats();
              } else {
                details = { message: '服务已初始化' };
              }
            }
          }
        } catch (error) {
          status = 'error';
          details = { error: error instanceof Error ? error.message : '未知错误' };
        }

        services.push({
          name: serviceInfo.name,
          status,
          details
        });
      }
    } catch (error) {
      services.push({
        name: 'SystemError',
        status: 'error' as const,
        details: { error: error instanceof Error ? error.message : '系统错误' }
      });
    }

    return {
      initialized: this.initialized,
      services,
      dependencyInfo: {
        circularDependencies: validation.circularDependencies,
        validationErrors: validation.errors
      }
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
    // 使用依赖注入容器获取服务实例
    const [
      categoryService,
      unitService,
      warehouseService,
      supplierService,
      customerService,
      productService,
      inventoryStockService,
      purchaseOrderService,
      purchaseReceiptService,
      salesOrderService,
      salesDeliveryService
    ] = await Promise.all([
      serviceContainer.resolve('categoryService'),
      serviceContainer.resolve('unitService'),
      serviceContainer.resolve('warehouseService'),
      serviceContainer.resolve('supplierService'),
      serviceContainer.resolve('customerService'),
      serviceContainer.resolve('productService'),
      serviceContainer.resolve('inventoryStockService'),
      serviceContainer.resolve('purchaseOrderService'),
      serviceContainer.resolve('purchaseReceiptService'),
      serviceContainer.resolve('salesOrderService'),
      serviceContainer.resolve('salesDeliveryService')
    ]);

    // 获取所有服务的统计数据
    const [
      categoryStats,
      unitStats,
      warehouseStats,
      supplierStats,
      customerStats,
      productStats,
      inventoryStats,
      purchaseOrderStats,
      purchaseReceiptStats,
      salesOrderStats,
      salesDeliveryStats
    ] = await Promise.all([
      categoryService.getCategoryStats(),
      unitService.getUnitStats(),
      warehouseService.getWarehouseStats(),
      supplierService.getSupplierStats(),
      customerService.getCustomerStats(),
      productService.getProductStats(),
      inventoryStockService.getInventoryStats(),
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
      stockItems: inventoryStats.totalStocks,
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
      // 首先检查依赖关系
      const dependencyValidation = await import('./ServiceRegistry').then(m => m.validateServiceDependencies());
      issues.push(...dependencyValidation.errors);
      warnings.push(...dependencyValidation.warnings);

      // 检查基础数据完整性
      const categoryService = await serviceContainer.resolve('categoryService');
      const unitService = await serviceContainer.resolve('unitService');
      const warehouseService = await serviceContainer.resolve('warehouseService');

      const [
        categories,
        units,
        warehouses
      ] = await Promise.all([
        categoryService.findAll(),
        unitService.findAll(),
        warehouseService.findAll()
      ]);

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

      // 检查产品和库存数据完整性（使用依赖注入容器）
      try {
        const productService = await serviceContainer.resolve('productService');
        const inventoryStockService = await serviceContainer.resolve('inventoryStockService');
        
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
        warnings.push(`产品和库存数据完整性检查跳过: ${error instanceof Error ? error.message : '服务未初始化'}`);
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

  // Reset all service initialization states
  reset(): void {
    this.initialized = false;
    
    // Reset the dependency injection container
    serviceContainer.reset();
    
    // Reset individual services that have reset methods
    if (warehouseService.reset) {
      warehouseService.reset();
    }
    
    // Add reset calls for other services as needed
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}

// 创建并导出服务管理器实例
export const businessServiceManager = new BusinessServiceManager();

// 默认导出管理器，方便使用
export default businessServiceManager;