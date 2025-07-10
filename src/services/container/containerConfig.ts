/**
 * 服务容器配置
 * 
 * 配置所有服务的依赖注入注册
 */

import { ServiceContainer } from './ServiceContainer';
import { ServiceScope, ServiceLayer } from './types';
import { SERVICE_TOKENS } from '../interfaces';
import { CircularDependencyResolver } from './CircularDependencyResolver';

// 导入服务实现
import { CategoryService } from '../business/categoryService';
import { ProductService } from '../business/productService';
import { InventoryStockService } from '../business/inventoryStockService';
import { AccountsPayableService } from '../business/accountsPayableService';
import { AccountsReceivableService } from '../business/accountsReceivableService';

/**
 * 配置服务容器
 */
export function configureContainer(): ServiceContainer {
  const container = new ServiceContainer();

  // ==================== 基础服务注册 ====================

  // 分类服务
  container.registerSingleton(
    SERVICE_TOKENS.CategoryService,
    () => new CategoryService(),
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'CategoryService',
        description: '分类管理服务',
        version: '1.0.0'
      }
    }
  );

  // 单位服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.UnitService,
    async () => {
      const { default: unitService } = await import('../business/unitService');
      return unitService;
    },
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'UnitService',
        description: '计量单位管理服务',
        version: '1.0.0'
      }
    }
  );

  // 仓库服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.WarehouseService,
    async () => {
      const { warehouseService } = await import('../business/warehouseService');
      return warehouseService;
    },
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'WarehouseService',
        description: '仓库管理服务',
        version: '1.0.0'
      }
    }
  );

  // 供应商服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.SupplierService,
    async () => {
      const { default: supplierService } = await import('../business/supplierService');
      return supplierService;
    },
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'SupplierService',
        description: '供应商管理服务',
        version: '1.0.0'
      }
    }
  );

  // 客户服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.CustomerService,
    async () => {
      const { default: customerService } = await import('../business/customerService');
      return customerService;
    },
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'CustomerService',
        description: '客户管理服务',
        version: '1.0.0'
      }
    }
  );

  // 用户服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.UserService,
    async () => {
      const { default: userService } = await import('../business/userService');
      return userService;
    },
    {
      layer: ServiceLayer.Foundation,
      dependencies: [],
      async: true,
      metadata: {
        name: 'UserService',
        description: '用户管理服务',
        version: '1.0.0'
      }
    }
  );

  // ==================== 业务服务注册 ====================

  // 产品服务（使用重构后的实现）
  container.registerSingleton(
    SERVICE_TOKENS.ProductService,
    async (c) => {
      const productService = new ProductService();

      // 注入依赖
      const categoryService = await c.resolveAsync(SERVICE_TOKENS.CategoryService);
      const unitService = await c.resolveAsync(SERVICE_TOKENS.UnitService);

      productService.setCategoryService(categoryService as any);
      productService.setUnitService(unitService as any);

      // 注入权限检查器（解决循环依赖）
      try {
        const permissionChecker = c.tryResolve('PermissionChecker' as any);
        // 检查是否是有效的权限检查器
        if (permissionChecker && 
            typeof permissionChecker === 'object' && 
            typeof (permissionChecker as any).hasPermission === 'function') {
          productService.setPermissionChecker(permissionChecker as any);
        } else {
          // 提供默认权限检查器实现
          const defaultPermissionChecker = {
            hasPermission: async (userId: string, permission: string) => true,
            hasAnyPermission: async (userId: string, permissions: string[]) => true,
            hasAllPermissions: async (userId: string, permissions: string[]) => true
          };
          productService.setPermissionChecker(defaultPermissionChecker);
        }
      } catch (error) {
        // 权限检查器不可用，使用默认实现
        console.log('Permission checker not available for ProductService, using default');
        const defaultPermissionChecker = {
          hasPermission: async (userId: string, permission: string) => true,
          hasAnyPermission: async (userId: string, permissions: string[]) => true,
          hasAllPermissions: async (userId: string, permissions: string[]) => true
        };
        productService.setPermissionChecker(defaultPermissionChecker);
      }

      return productService;
    },
    {
      layer: ServiceLayer.Business,
      dependencies: [
        { token: SERVICE_TOKENS.CategoryService, optional: false },
        { token: SERVICE_TOKENS.UnitService, optional: false },
        { token: SERVICE_TOKENS.UserService, optional: true }
      ],
      async: true,
      metadata: {
        name: 'ProductService',
        description: '产品管理服务',
        version: '2.0.0'
      }
    }
  );

  // 库存服务（使用重构后的实现）
  container.registerSingleton(
    SERVICE_TOKENS.InventoryStockService,
    async (c) => {
      const inventoryService = new InventoryStockService();

      // 注入依赖（解决循环依赖）
      try {
        const productService = await c.resolveAsync(SERVICE_TOKENS.ProductService);
        inventoryService.setProductService(productService as any);
      } catch (error) {
        console.log('ProductService not available for InventoryService');
      }

      try {
        const warehouseService = c.tryResolve(SERVICE_TOKENS.WarehouseService);
        if (warehouseService) {
          inventoryService.setWarehouseService(warehouseService as any);
        }
      } catch (error) {
        console.log('WarehouseService not available for InventoryService');
      }

      return inventoryService;
    },
    {
      layer: ServiceLayer.Business,
      dependencies: [
        { token: SERVICE_TOKENS.ProductService, optional: true },
        { token: SERVICE_TOKENS.WarehouseService, optional: true }
      ],
      async: true,
      metadata: {
        name: 'InventoryService',
        description: '库存管理服务',
        version: '2.0.0'
      }
    }
  );

  // ==================== 复合服务注册 ====================

  // 应付账款服务（使用重构后的实现）
  container.registerSingleton(
    SERVICE_TOKENS.AccountsPayableService,
    async (c) => {
      const accountsPayableService = new AccountsPayableService();

      // 注入依赖
      try {
        // const purchaseOrderService = c.tryResolve(SERVICE_TOKENS.PurchaseOrderService);
        // if (purchaseOrderService) {
        //   accountsPayableService.setPurchaseOrderService(purchaseOrderService);
        // }
      } catch (error) {
        console.log('PurchaseOrderService not available for AccountsPayableService');
      }

      return accountsPayableService;
    },
    {
      layer: ServiceLayer.Composite,
      dependencies: [
        { token: SERVICE_TOKENS.PurchaseOrderService, optional: true }
      ],
      async: true,
      metadata: {
        name: 'AccountsPayableService',
        description: '应付账款管理服务',
        version: '2.0.0'
      }
    }
  );

  // 应收账款服务（使用重构后的实现）
  container.registerSingleton(
    SERVICE_TOKENS.AccountsReceivableService,
    async (c) => {
      const accountsReceivableService = new AccountsReceivableService();

      // 注入依赖
      try {
        // const salesOrderService = c.tryResolve(SERVICE_TOKENS.SalesOrderService);
        // if (salesOrderService) {
        //   accountsReceivableService.setSalesOrderService(salesOrderService);
        // }
      } catch (error) {
        console.log('SalesOrderService not available for AccountsReceivableService');
      }

      return accountsReceivableService;
    },
    {
      layer: ServiceLayer.Composite,
      dependencies: [
        { token: SERVICE_TOKENS.SalesOrderService, optional: true }
      ],
      async: true,
      metadata: {
        name: 'AccountsReceivableService',
        description: '应收账款管理服务',
        version: '2.0.0'
      }
    }
  );

  // 权限服务（暂时使用现有实现）
  container.registerSingleton(
    SERVICE_TOKENS.PermissionService,
    async () => {
      const { default: permissionService } = await import('../business/permissionService');
      return permissionService;
    },
    {
      layer: ServiceLayer.Composite,
      dependencies: [
        { token: SERVICE_TOKENS.UserService, optional: false }
      ],
      async: true,
      metadata: {
        name: 'PermissionService',
        description: '权限管理服务',
        version: '1.0.0'
      }
    }
  );

  return container;
}

/**
 * 创建并初始化服务容器
 */
export async function createInitializedContainer(): Promise<ServiceContainer> {
  const container = configureContainer();

  // 创建循环依赖解决器
  const circularDependencyResolver = new CircularDependencyResolver(container);

  // 解决循环依赖
  await circularDependencyResolver.resolveAllCircularDependencies();

  // 验证依赖关系
  const validation = container.validateDependencies();
  if (!validation.isValid) {
    console.warn('Container validation warnings:', validation.warnings);

    const criticalErrors = validation.circularDependencies
      .filter(cd => cd.severity === 'error');

    if (criticalErrors.length > 0) {
      // 尝试验证循环依赖解决方案
      const resolutionValidation = await circularDependencyResolver.validateResolution();
      if (!resolutionValidation.isResolved) {
        console.error('Circular dependency resolution failed:', resolutionValidation.issues);
        throw new Error(`Critical dependency errors found:\n${
          criticalErrors.map(cd => `Circular dependency: ${cd.chain.map(String).join(' -> ')}`).join('\n')
        }`);
      } else {
        console.log('Circular dependencies resolved successfully');
      }
    }
  }

  // 初始化容器
  await container.initialize();

  // 获取健康状态
  const health = container.getServiceHealth();
  console.log('Container health:', health.overall);

  if (health.issues.length > 0) {
    console.warn('Container issues:', health.issues);
  }

  // 输出循环依赖解决统计
  const resolutionStats = circularDependencyResolver.getResolutionStatistics();
  console.log('Circular dependency resolution stats:', resolutionStats);

  return container;
}

/**
 * 获取服务实例的便利函数
 */
export function createServiceAccessor(container: ServiceContainer) {
  return {
    // 基础服务
    get categoryService() {
      return container.resolve(SERVICE_TOKENS.CategoryService);
    },
    
    get unitService() {
      return container.resolve(SERVICE_TOKENS.UnitService);
    },
    
    get warehouseService() {
      return container.resolve(SERVICE_TOKENS.WarehouseService);
    },
    
    get supplierService() {
      return container.resolve(SERVICE_TOKENS.SupplierService);
    },
    
    get customerService() {
      return container.resolve(SERVICE_TOKENS.CustomerService);
    },
    
    get userService() {
      return container.resolve(SERVICE_TOKENS.UserService);
    },
    
    // 业务服务
    get productService() {
      return container.resolve(SERVICE_TOKENS.ProductService);
    },

    get inventoryService() {
      return container.resolve(SERVICE_TOKENS.InventoryStockService);
    },
    
    get inventoryStockService() {
      return container.resolve(SERVICE_TOKENS.InventoryStockService);
    },
    
    // 复合服务
    get accountsPayableService() {
      return container.resolve(SERVICE_TOKENS.AccountsPayableService);
    },

    get accountsReceivableService() {
      return container.resolve(SERVICE_TOKENS.AccountsReceivableService);
    },

    get permissionService() {
      return container.resolve(SERVICE_TOKENS.PermissionService);
    },
    
    // 异步获取服务
    async getCategoryServiceAsync() {
      return await container.resolveAsync(SERVICE_TOKENS.CategoryService);
    },
    
    async getProductServiceAsync() {
      return await container.resolveAsync(SERVICE_TOKENS.ProductService);
    }
  };
}

/**
 * 服务容器单例
 */
let containerInstance: ServiceContainer | null = null;

/**
 * 获取全局服务容器实例
 */
export async function getGlobalContainer(): Promise<ServiceContainer> {
  if (!containerInstance) {
    containerInstance = await createInitializedContainer();
  }
  return containerInstance;
}

/**
 * 重置全局服务容器
 */
export async function resetGlobalContainer(): Promise<void> {
  if (containerInstance) {
    await containerInstance.dispose();
    containerInstance = null;
  }
}

/**
 * 获取全局服务访问器
 */
export async function getGlobalServices() {
  const container = await getGlobalContainer();
  return createServiceAccessor(container);
}
