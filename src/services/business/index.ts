/**
 * 业务服务层 - 统一入口
 *
 * 使用简化的服务管理器替换复杂的依赖注入系统
 */

// 使用简化的服务管理器
import { simpleServiceManager, getServices } from '../SimpleServiceManager';
import { getGlobalServices } from '../globalServices';

// 导出简化的服务管理器
export { simpleServiceManager as businessServiceManager };

// 导出服务访问器
export const getBusinessServices = getServices;

// 导出服务类（用于类型定义）
export { CategoryService } from './categoryService';
export { ProductService } from './productService';
export { UnitService } from './unitService';
export { WarehouseService } from './warehouseService';
export { SupplierService } from './supplierService';
export { CustomerService } from './customerService';
export { InventoryStockService } from './inventoryStockService';
export { PurchaseOrderService } from './purchaseOrderService';
export { SalesOrderService } from './salesOrderService';
export { UserService } from './userService';

/**
 * 初始化业务服务
 * 
 * 使用简化的服务管理器进行初始化
 */
export async function initializeBusinessServices(): Promise<void> {
  console.log('Initializing business services with simplified service manager...');
  await simpleServiceManager.initialize();
  console.log('Business services initialized successfully');
}

/**
 * 获取系统状态
 */
export async function getSystemStatus() {
  return simpleServiceManager.getStatus();
}

/**
 * 重置所有业务服务
 */
export function resetBusinessServices(): void {
  simpleServiceManager.reset();
}

/**
 * 简化的服务访问器
 * 提供同步访问已初始化的服务
 */
export const services = {
  get categoryService() {
    return simpleServiceManager.getService('categoryService');
  },
  
  get unitService() {
    return simpleServiceManager.getService('unitService');
  },
  
  get warehouseService() {
    return simpleServiceManager.getService('warehouseService');
  },
  
  get productService() {
    return simpleServiceManager.getService('productService');
  },
  
  get supplierService() {
    return simpleServiceManager.getService('supplierService');
  },
  
  get customerService() {
    return simpleServiceManager.getService('customerService');
  },
  
  get inventoryStockService() {
    return simpleServiceManager.getService('inventoryStockService');
  },
  
  get purchaseOrderService() {
    return simpleServiceManager.getService('purchaseOrderService');
  },
  
  get salesOrderService() {
    return simpleServiceManager.getService('salesOrderService');
  },
  
  get userService() {
    return simpleServiceManager.getService('userService');
  }
};

// 默认导出简化的服务管理器
export default simpleServiceManager;
