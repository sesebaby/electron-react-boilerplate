/**
 * 服务注册表 - 配置所有业务服务的依赖关系
 * 解决循环依赖问题，实现分层初始化
 */

import { serviceContainer, registerService } from './ServiceContainer';

// 服务工厂函数
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
import { calendarDataService } from './calendarDataService';
import dailyConsumptionService from './dailyConsumptionService';
import fifoInventoryService from './fifoInventoryService';
import monthlyBalanceService from './monthlyBalanceService';
import globalConversionService from './globalConversionService';
import productConversionService from './productConversionService';
import accountsPayableService from './accountsPayableService';
import accountsReceivableService from './accountsReceivableService';
import permissionService from './permissionService';

/**
 * 服务层级定义
 */
export const SERVICE_LAYERS = {
  // 第0层：基础服务（无依赖）
  FOUNDATION: 0,
  // 第1层：核心业务服务（依赖基础服务）
  CORE_BUSINESS: 1,
  // 第2层：业务流程服务（依赖核心业务）
  BUSINESS_PROCESS: 2,
  // 第3层：财务和分析服务（依赖业务流程）
  FINANCIAL_ANALYTICS: 3,
  // 第4层：高级功能服务（依赖财务分析）
  ADVANCED_FEATURES: 4
};

/**
 * 注册所有业务服务
 */
export function registerAllServices(): void {
  // 第0层：基础服务
  registerService(
    'categoryService',
    () => categoryService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'unitService',
    () => unitService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'warehouseService',
    () => warehouseService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'supplierService',
    () => supplierService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'customerService',
    () => customerService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'userService',
    () => userService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  registerService(
    'permissionService',
    () => permissionService,
    [],
    SERVICE_LAYERS.FOUNDATION
  );

  // 第1层：核心业务服务
  registerService(
    'productService',
    () => productService,
    ['categoryService', 'unitService'],
    SERVICE_LAYERS.CORE_BUSINESS
  );

  registerService(
    'inventoryStockService',
    () => inventoryStockService,
    ['productService', 'warehouseService'],
    SERVICE_LAYERS.CORE_BUSINESS
  );

  registerService(
    'unitConversionService',
    () => unitConversionService,
    ['unitService'],
    SERVICE_LAYERS.CORE_BUSINESS
  );

  registerService(
    'globalConversionService',
    () => globalConversionService,
    ['unitService'],
    SERVICE_LAYERS.CORE_BUSINESS
  );

  registerService(
    'productConversionService',
    () => productConversionService,
    ['productService', 'unitService'],
    SERVICE_LAYERS.CORE_BUSINESS
  );

  // 第2层：业务流程服务
  registerService(
    'purchaseOrderService',
    () => purchaseOrderService,
    ['productService', 'supplierService', 'warehouseService'],
    SERVICE_LAYERS.BUSINESS_PROCESS
  );

  registerService(
    'purchaseReceiptService',
    () => purchaseReceiptService,
    ['purchaseOrderService', 'inventoryStockService'],
    SERVICE_LAYERS.BUSINESS_PROCESS
  );

  registerService(
    'salesOrderService',
    () => salesOrderService,
    ['productService', 'customerService', 'warehouseService'],
    SERVICE_LAYERS.BUSINESS_PROCESS
  );

  registerService(
    'salesDeliveryService',
    () => salesDeliveryService,
    ['salesOrderService', 'inventoryStockService'],
    SERVICE_LAYERS.BUSINESS_PROCESS
  );

  registerService(
    'inventoryCardService',
    () => inventoryCardService,
    ['inventoryStockService', 'productService'],
    SERVICE_LAYERS.BUSINESS_PROCESS
  );

  // 第3层：财务和分析服务
  registerService(
    'accountsPayableService',
    () => accountsPayableService,
    ['purchaseOrderService', 'purchaseReceiptService', 'supplierService'],
    SERVICE_LAYERS.FINANCIAL_ANALYTICS
  );

  registerService(
    'accountsReceivableService',
    () => accountsReceivableService,
    ['salesOrderService', 'salesDeliveryService', 'customerService'],
    SERVICE_LAYERS.FINANCIAL_ANALYTICS
  );

  registerService(
    'calendarDataService',
    () => calendarDataService,
    ['inventoryStockService'],
    SERVICE_LAYERS.FINANCIAL_ANALYTICS
  );

  registerService(
    'dailyConsumptionService',
    () => dailyConsumptionService,
    ['inventoryStockService', 'productService'],
    SERVICE_LAYERS.FINANCIAL_ANALYTICS
  );

  // 第4层：高级功能服务
  registerService(
    'fifoInventoryService',
    () => fifoInventoryService,
    ['inventoryStockService', 'purchaseReceiptService', 'salesDeliveryService'],
    SERVICE_LAYERS.ADVANCED_FEATURES
  );

  registerService(
    'monthlyBalanceService',
    () => monthlyBalanceService,
    ['inventoryStockService', 'fifoInventoryService'],
    SERVICE_LAYERS.ADVANCED_FEATURES
  );

  console.log('所有业务服务已注册到服务容器');
}

/**
 * 获取服务依赖关系图
 */
export function getServiceDependencyGraph(): {
  layers: Array<{
    layer: number;
    services: string[];
  }>;
  dependencies: Array<{
    service: string;
    dependsOn: string[];
  }>;
} {
  const status = serviceContainer.getServiceStatus();
  
  const layers = Object.values(SERVICE_LAYERS).map(layer => ({
    layer,
    services: status.services
      .filter(s => s.layer === layer)
      .map(s => s.name)
  }));

  const dependencies = status.services.map(service => ({
    service: service.name,
    dependsOn: service.dependencies
  }));

  return {
    layers,
    dependencies
  };
}

/**
 * 验证服务依赖关系
 */
export function validateServiceDependencies(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies: string[][];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查循环依赖
  const circularCheck = serviceContainer.checkCircularDependencies();
  
  if (circularCheck.hasCircular) {
    errors.push('检测到循环依赖');
    circularCheck.cycles.forEach(cycle => {
      errors.push(`循环依赖: ${cycle.join(' -> ')}`);
    });
  }

  // 检查依赖是否都已注册
  const status = serviceContainer.getServiceStatus();
  const registeredServices = new Set(status.services.map(s => s.name));

  for (const service of status.services) {
    for (const dep of service.dependencies) {
      if (!registeredServices.has(dep)) {
        errors.push(`服务 ${service.name} 依赖的服务 ${dep} 未注册`);
      }
    }
  }

  // 检查层级合理性
  for (const service of status.services) {
    for (const dep of service.dependencies) {
      const depService = status.services.find(s => s.name === dep);
      if (depService && depService.layer >= service.layer) {
        warnings.push(`服务 ${service.name} (层级 ${service.layer}) 依赖的服务 ${dep} (层级 ${depService.layer}) 可能存在层级问题`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    circularDependencies: circularCheck.cycles
  };
}

// 自动注册所有服务
registerAllServices();

export default serviceContainer;