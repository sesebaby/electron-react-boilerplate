/**
 * 全局服务访问器
 * 
 * 提供向后兼容的服务访问接口，使用新的核心服务架构
 */

import { serviceManager, OrderService, FinancialService, SystemService, ReportService } from './core';
import { InventoryDomainService } from './domain/InventoryDomainService';

// 向后兼容的服务接口
export interface LegacyServiceInstances {
  // 库存相关服务 -> InventoryService
  productService: any;
  categoryService: any;
  unitService: any;
  warehouseService: any;
  inventoryStockService: any;
  
  // 订单相关服务 -> OrderService
  purchaseOrderService: any;
  salesOrderService: any;
  purchaseReceiptService: any;
  salesDeliveryService: any;
  
  // 财务相关服务 -> FinancialService
  accountsPayableService: any;
  accountsReceivableService: any;
  monthlyBalanceService: any;
  fifoInventoryService: any;
  
  // 系统相关服务 -> SystemService
  userService: any;
  supplierService: any;
  customerService: any;
  permissionService: any;
  
  // 报表相关服务 -> ReportService
  inventoryCardService: any;
  calendarDataService: any;
  dailyConsumptionService: any;
  globalConversionService: any;
}

/**
 * 获取全局服务实例
 * 兼容原有的 getGlobalServices 接口
 */
export async function getGlobalServices(): Promise<Partial<LegacyServiceInstances>> {
  // 确保核心服务管理器已初始化
  await serviceManager.initialize();
  
  // 创建向后兼容的服务映射 - 使用新的领域服务
  const inventoryService = serviceManager.getInventoryService(); // 现在返回InventoryDomainService
  const orderService = serviceManager.getOrderService();
  const financialService = serviceManager.getFinancialService();
  const systemService = serviceManager.getSystemService();
  const reportService = serviceManager.getReportService();
  
  return {
    // 库存相关服务映射
    productService: inventoryService,
    categoryService: inventoryService,
    unitService: inventoryService,
    warehouseService: inventoryService,
    inventoryStockService: inventoryService,
    
    // 订单相关服务映射
    purchaseOrderService: orderService,
    salesOrderService: orderService,
    purchaseReceiptService: orderService,
    salesDeliveryService: orderService,
    
    // 财务相关服务映射
    accountsPayableService: financialService,
    accountsReceivableService: financialService,
    monthlyBalanceService: financialService,
    fifoInventoryService: financialService,
    
    // 系统相关服务映射
    userService: systemService,
    supplierService: systemService,
    customerService: systemService,
    permissionService: systemService,
    
    // 报表相关服务映射
    inventoryCardService: reportService,
    calendarDataService: reportService,
    dailyConsumptionService: reportService,
    globalConversionService: reportService
  };
}

/**
 * 获取特定服务
 */
export async function getService<K extends keyof LegacyServiceInstances>(serviceName: K): Promise<LegacyServiceInstances[K] | undefined> {
  const services = await getGlobalServices();
  return services[serviceName];
}

/**
 * 检查服务是否可用
 */
export async function isServiceAvailable<K extends keyof LegacyServiceInstances>(serviceName: K): Promise<boolean> {
  const service = await getService(serviceName);
  return service !== undefined;
}

/**
 * 获取服务初始化状态
 */
export function getServicesStatus() {
  return {
    isInitialized: true, // 新架构下简化状态管理
    servicesCount: 5     // 5个核心服务
  };
}

// 导出核心服务管理器
export { serviceManager };

// 全局服务访问器（挂载到 window 对象，兼容现有代码）
declare global {
  interface Window {
    services?: Partial<LegacyServiceInstances>;
  }
}

/**
 * 初始化全局服务访问器
 */
export async function initializeGlobalServices(): Promise<void> {
  await serviceManager.initialize();
  
  // 将服务挂载到全局对象，兼容现有代码
  window.services = await getGlobalServices();
}
