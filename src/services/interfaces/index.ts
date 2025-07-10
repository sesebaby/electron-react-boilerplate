/**
 * 服务接口统一导出
 * 
 * 导出所有业务服务接口定义
 */

// 基础服务接口
export * from './IBusinessService';

// 核心业务服务接口
export * from './ICategoryService';
export * from './IUnitService';
export * from './IWarehouseService';

// 业务服务接口
export * from './IProductService';
export * from './IInventoryService';
export * from './IOrderService';

// 复合服务接口
export * from './IFinancialService';
export * from './IReportService';

// 服务令牌定义
// 使用Symbol确保唯一性，避免字符串冲突
export const SERVICE_TOKENS = {
  // 基础服务
  CategoryService: Symbol('CategoryService'),
  UnitService: Symbol('UnitService'),
  WarehouseService: Symbol('WarehouseService'),
  SupplierService: Symbol('SupplierService'),
  CustomerService: Symbol('CustomerService'),
  UserService: Symbol('UserService'),
  
  // 业务服务
  ProductService: Symbol('ProductService'),
  InventoryService: Symbol('InventoryService'),
  InventoryStockService: Symbol('InventoryStockService'),
  PurchaseOrderService: Symbol('PurchaseOrderService'),
  PurchaseReceiptService: Symbol('PurchaseReceiptService'),
  SalesOrderService: Symbol('SalesOrderService'),
  SalesDeliveryService: Symbol('SalesDeliveryService'),
  
  // 复合服务
  InventoryCardService: Symbol('InventoryCardService'),
  UnitConversionService: Symbol('UnitConversionService'),
  CalendarDataService: Symbol('CalendarDataService'),
  DailyConsumptionService: Symbol('DailyConsumptionService'),
  FifoInventoryService: Symbol('FifoInventoryService'),
  MonthlyBalanceService: Symbol('MonthlyBalanceService'),
  GlobalConversionService: Symbol('GlobalConversionService'),
  ProductConversionService: Symbol('ProductConversionService'),
  AccountsPayableService: Symbol('AccountsPayableService'),
  AccountsReceivableService: Symbol('AccountsReceivableService'),
  PermissionService: Symbol('PermissionService'),
  
  // 系统服务
  EventService: Symbol('EventService'),
  CacheService: Symbol('CacheService'),
  LoggingService: Symbol('LoggingService'),
  ConfigService: Symbol('ConfigService'),
  DatabaseService: Symbol('DatabaseService'),
  
  // 应用服务
  DashboardService: Symbol('DashboardService'),
  ReportService: Symbol('ReportService'),
  BackupService: Symbol('BackupService'),
  SystemInitializationService: Symbol('SystemInitializationService')
} as const;

// 服务令牌类型
export type ServiceToken = typeof SERVICE_TOKENS[keyof typeof SERVICE_TOKENS];

// 服务接口映射类型
export interface ServiceInterfaceMap {
  [SERVICE_TOKENS.CategoryService]: import('./ICategoryService').ICategoryService;
  [SERVICE_TOKENS.UnitService]: import('./IUnitService').IUnitService;
  [SERVICE_TOKENS.WarehouseService]: import('./IWarehouseService').IWarehouseService;
  [SERVICE_TOKENS.ProductService]: import('./IProductService').IProductService;
  [SERVICE_TOKENS.InventoryService]: import('./IInventoryService').IInventoryService;
  [SERVICE_TOKENS.InventoryStockService]: import('./IInventoryService').IInventoryService;
  [SERVICE_TOKENS.PurchaseOrderService]: import('./IOrderService').IPurchaseOrderService;
  [SERVICE_TOKENS.SalesOrderService]: import('./IOrderService').ISalesOrderService;
  [SERVICE_TOKENS.AccountsPayableService]: import('./IFinancialService').IAccountsPayableService;
  [SERVICE_TOKENS.AccountsReceivableService]: import('./IFinancialService').IAccountsReceivableService;
  [SERVICE_TOKENS.ReportService]: import('./IReportService').IReportService;
}

// 便利类型定义
export type CategoryServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.CategoryService];
export type UnitServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.UnitService];
export type WarehouseServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.WarehouseService];
export type ProductServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.ProductService];
export type InventoryServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.InventoryStockService];
export type PurchaseOrderServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.PurchaseOrderService];
export type SalesOrderServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.SalesOrderService];
export type AccountsPayableServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.AccountsPayableService];
export type AccountsReceivableServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.AccountsReceivableService];
export type ReportServiceType = ServiceInterfaceMap[typeof SERVICE_TOKENS.ReportService];

// 服务层级定义
export const SERVICE_LAYERS = {
  // Layer 1: 基础服务（无依赖或最少依赖）
  FOUNDATION: [
    SERVICE_TOKENS.CategoryService,
    SERVICE_TOKENS.UnitService,
    SERVICE_TOKENS.WarehouseService,
    SERVICE_TOKENS.SupplierService,
    SERVICE_TOKENS.CustomerService,
    SERVICE_TOKENS.UserService,
    SERVICE_TOKENS.EventService,
    SERVICE_TOKENS.CacheService,
    SERVICE_TOKENS.LoggingService,
    SERVICE_TOKENS.ConfigService,
    SERVICE_TOKENS.DatabaseService
  ],
  
  // Layer 2: 业务服务（依赖基础服务）
  BUSINESS: [
    SERVICE_TOKENS.ProductService,
    SERVICE_TOKENS.InventoryStockService,
    SERVICE_TOKENS.PurchaseOrderService,
    SERVICE_TOKENS.SalesOrderService,
    SERVICE_TOKENS.PermissionService
  ],
  
  // Layer 3: 复合服务（依赖业务服务）
  COMPOSITE: [
    SERVICE_TOKENS.PurchaseReceiptService,
    SERVICE_TOKENS.SalesDeliveryService,
    SERVICE_TOKENS.InventoryCardService,
    SERVICE_TOKENS.UnitConversionService,
    SERVICE_TOKENS.CalendarDataService,
    SERVICE_TOKENS.DailyConsumptionService,
    SERVICE_TOKENS.FifoInventoryService,
    SERVICE_TOKENS.MonthlyBalanceService,
    SERVICE_TOKENS.GlobalConversionService,
    SERVICE_TOKENS.ProductConversionService,
    SERVICE_TOKENS.AccountsPayableService,
    SERVICE_TOKENS.AccountsReceivableService
  ],
  
  // Layer 4: 应用服务（最高层）
  APPLICATION: [
    SERVICE_TOKENS.DashboardService,
    SERVICE_TOKENS.ReportService,
    SERVICE_TOKENS.BackupService,
    SERVICE_TOKENS.SystemInitializationService
  ]
} as const;

// 服务依赖关系定义
export const SERVICE_DEPENDENCIES = {
  [SERVICE_TOKENS.ProductService]: [
    SERVICE_TOKENS.CategoryService,
    SERVICE_TOKENS.UnitService,
    SERVICE_TOKENS.UserService // 用于权限检查
  ],
  
  [SERVICE_TOKENS.InventoryStockService]: [
    SERVICE_TOKENS.ProductService,
    SERVICE_TOKENS.WarehouseService
  ],
  
  [SERVICE_TOKENS.PurchaseOrderService]: [
    SERVICE_TOKENS.ProductService,
    SERVICE_TOKENS.SupplierService,
    SERVICE_TOKENS.UserService
  ],
  
  [SERVICE_TOKENS.SalesOrderService]: [
    SERVICE_TOKENS.ProductService,
    SERVICE_TOKENS.CustomerService,
    SERVICE_TOKENS.UserService
  ],
  
  [SERVICE_TOKENS.PurchaseReceiptService]: [
    SERVICE_TOKENS.PurchaseOrderService,
    SERVICE_TOKENS.InventoryStockService
  ],
  
  [SERVICE_TOKENS.SalesDeliveryService]: [
    SERVICE_TOKENS.SalesOrderService,
    SERVICE_TOKENS.InventoryStockService
  ],
  
  [SERVICE_TOKENS.AccountsPayableService]: [
    SERVICE_TOKENS.PurchaseOrderService,
    SERVICE_TOKENS.SupplierService
  ],
  
  [SERVICE_TOKENS.AccountsReceivableService]: [
    SERVICE_TOKENS.SalesOrderService,
    SERVICE_TOKENS.CustomerService
  ],
  
  [SERVICE_TOKENS.DashboardService]: [
    SERVICE_TOKENS.InventoryStockService,
    SERVICE_TOKENS.PurchaseOrderService,
    SERVICE_TOKENS.SalesOrderService
  ]
} as const;

// 循环依赖解决方案配置
export const CIRCULAR_DEPENDENCY_SOLUTIONS = {
  // 客户服务 ↔ 销售订单服务
  [SERVICE_TOKENS.CustomerService]: {
    circularWith: [SERVICE_TOKENS.SalesOrderService],
    solution: 'event-driven', // 使用事件驱动解耦
    proxyMethods: ['findByCustomer', 'getCustomerOrders']
  },

  // 供应商服务 ↔ 采购订单服务
  [SERVICE_TOKENS.SupplierService]: {
    circularWith: [SERVICE_TOKENS.PurchaseOrderService],
    solution: 'event-driven',
    proxyMethods: ['findBySupplier', 'getSupplierOrders']
  },

  // 产品服务的权限检查依赖
  [SERVICE_TOKENS.ProductService]: {
    circularWith: [SERVICE_TOKENS.UserService],
    solution: 'interface-abstraction', // 通过接口抽象
    abstractInterface: 'IPermissionChecker'
  },

  // 库存服务间的循环依赖
  [SERVICE_TOKENS.InventoryStockService]: {
    circularWith: [SERVICE_TOKENS.ProductService, SERVICE_TOKENS.WarehouseService],
    solution: 'optional-injection', // 使用可选依赖注入
    proxyMethods: ['getProductInfo', 'getWarehouseInfo']
  },

  // 财务服务与订单服务的依赖
  [SERVICE_TOKENS.AccountsPayableService]: {
    circularWith: [SERVICE_TOKENS.PurchaseOrderService],
    solution: 'optional-injection', // 使用可选依赖注入
    proxyMethods: ['createFromPurchaseOrder']
  },

  [SERVICE_TOKENS.AccountsReceivableService]: {
    circularWith: [SERVICE_TOKENS.SalesOrderService],
    solution: 'optional-injection', // 使用可选依赖注入
    proxyMethods: ['createFromSalesOrder']
  }
} as const;

// 服务注册配置
export interface ServiceRegistrationConfig {
  token: ServiceToken;
  layer: keyof typeof SERVICE_LAYERS;
  dependencies?: ServiceToken[];
  circularDependencySolution?: keyof typeof CIRCULAR_DEPENDENCY_SOLUTIONS;
  async?: boolean;
  scope?: 'singleton' | 'transient' | 'scoped';
}

// 预定义的服务注册配置
export const SERVICE_CONFIGS: ServiceRegistrationConfig[] = [
  // 基础服务
  {
    token: SERVICE_TOKENS.CategoryService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.UnitService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.WarehouseService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.SupplierService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.CustomerService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.UserService,
    layer: 'FOUNDATION',
    scope: 'singleton'
  },
  
  // 业务服务
  {
    token: SERVICE_TOKENS.ProductService,
    layer: 'BUSINESS',
    dependencies: [
      SERVICE_TOKENS.CategoryService,
      SERVICE_TOKENS.UnitService,
      SERVICE_TOKENS.UserService
    ],
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.InventoryStockService,
    layer: 'BUSINESS',
    dependencies: [
      SERVICE_TOKENS.ProductService,
      SERVICE_TOKENS.WarehouseService
    ],
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.PurchaseOrderService,
    layer: 'BUSINESS',
    dependencies: [
      SERVICE_TOKENS.ProductService,
      SERVICE_TOKENS.SupplierService,
      SERVICE_TOKENS.UserService
    ],
    scope: 'singleton'
  },
  {
    token: SERVICE_TOKENS.SalesOrderService,
    layer: 'BUSINESS',
    dependencies: [
      SERVICE_TOKENS.ProductService,
      SERVICE_TOKENS.CustomerService,
      SERVICE_TOKENS.UserService
    ],
    scope: 'singleton'
  }
];

// 工具函数
export function getServiceLayer(token: ServiceToken): keyof typeof SERVICE_LAYERS | null {
  for (const [layer, tokens] of Object.entries(SERVICE_LAYERS)) {
    if (tokens.includes(token as any)) {
      return layer as keyof typeof SERVICE_LAYERS;
    }
  }
  return null;
}

export function getServiceDependencies(token: ServiceToken): ServiceToken[] {
  return [...(SERVICE_DEPENDENCIES[token as keyof typeof SERVICE_DEPENDENCIES] || [])];
}

export function hasCircularDependency(token: ServiceToken): boolean {
  return token in CIRCULAR_DEPENDENCY_SOLUTIONS;
}

export function getCircularDependencySolution(token: ServiceToken) {
  return CIRCULAR_DEPENDENCY_SOLUTIONS[token as keyof typeof CIRCULAR_DEPENDENCY_SOLUTIONS];
}
