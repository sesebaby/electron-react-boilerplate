/**
 * 简化的服务管理器
 * 
 * 替换复杂的依赖注入系统，提供简单直接的服务管理功能
 * 根据系统启动数据加载架构分析报告的建议实现
 */

import { ElectronDatabase } from './database/electronDatabase';
import { UnitService } from './business/unitService';
import { CategoryService } from './business/categoryService';
import { WarehouseService } from './business/warehouseService';
import { ProductService } from './business/productService';
import { SupplierService } from './business/supplierService';
import { CustomerService } from './business/customerService';
import { InventoryStockService } from './business/inventoryStockService';
import { PurchaseOrderService } from './business/purchaseOrderService';
import { SalesOrderService } from './business/salesOrderService';
import { UserService } from './business/userService';

/**
 * 服务实例接口
 */
export interface ServiceInstances {
  database: ElectronDatabase;
  unitService: UnitService;
  categoryService: CategoryService;
  warehouseService: WarehouseService;
  productService: ProductService;
  supplierService: SupplierService;
  customerService: CustomerService;
  inventoryStockService: InventoryStockService;
  purchaseOrderService: PurchaseOrderService;
  salesOrderService: SalesOrderService;
  userService: UserService;
}

/**
 * 初始化状态
 */
export interface InitializationStatus {
  isInitialized: boolean;
  initializationTime?: number;
  error?: string;
  servicesCount: number;
}

/**
 * 简化的服务管理器
 * 
 * 提供单例模式的服务管理，替换复杂的依赖注入容器
 */
export class SimpleServiceManager {
  private static instance: SimpleServiceManager;
  private services: Partial<ServiceInstances> = {};
  private _isInitialized = false;
  private _initializationTime = 0;
  private _error: string | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): SimpleServiceManager {
    if (!SimpleServiceManager.instance) {
      SimpleServiceManager.instance = new SimpleServiceManager();
    }
    return SimpleServiceManager.instance;
  }

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      console.log('Services already initialized');
      return;
    }

    const startTime = Date.now();
    console.log('开始初始化简化服务管理器...');

    try {
      // 1. 初始化数据库
      await this.initializeDatabase();
      
      // 2. 按依赖顺序初始化服务
      await this.initializeServices();
      
      // 3. 加载数据
      await this.loadServiceData();

      this._isInitialized = true;
      this._initializationTime = Date.now() - startTime;
      
      console.log(`简化服务管理器初始化完成，耗时: ${this._initializationTime}ms`);
      console.log(`已初始化 ${Object.keys(this.services).length} 个服务`);

    } catch (error) {
      this._error = error instanceof Error ? error.message : '未知错误';
      console.error('简化服务管理器初始化失败:', error);
      throw new Error(`服务初始化失败: ${this._error}`);
    }
  }

  /**
   * 初始化数据库
   */
  private async initializeDatabase(): Promise<void> {
    console.log('正在初始化数据库...');
    
    if (window.electronAPI) {
      const database = new ElectronDatabase();
      await database.initialize();
      this.services.database = database;
      console.log('数据库初始化完成');
    } else {
      console.warn('Electron API 不可用，跳过数据库初始化');
    }
  }

  /**
   * 按依赖顺序初始化服务
   */
  private async initializeServices(): Promise<void> {
    console.log('正在初始化业务服务...');
    
    const database = this.services.database;
    if (!database) {
      throw new Error('数据库未初始化');
    }

    // 基础服务（无依赖）
    this.services.unitService = new UnitService();
    this.services.categoryService = new CategoryService();
    this.services.warehouseService = new WarehouseService();
    this.services.supplierService = new SupplierService();
    this.services.customerService = new CustomerService();
    this.services.userService = new UserService();

    // 注入数据库依赖
    this.injectDatabaseDependency(this.services.unitService, database);
    this.injectDatabaseDependency(this.services.categoryService, database);
    this.injectDatabaseDependency(this.services.warehouseService, database);
    this.injectDatabaseDependency(this.services.supplierService, database);
    this.injectDatabaseDependency(this.services.customerService, database);
    this.injectDatabaseDependency(this.services.userService, database);

    // 依赖其他服务的服务
    this.services.productService = new ProductService();
    this.injectDatabaseDependency(this.services.productService, database);

    this.services.inventoryStockService = new InventoryStockService();
    this.injectDatabaseDependency(this.services.inventoryStockService, database);

    this.services.purchaseOrderService = new PurchaseOrderService();
    this.injectDatabaseDependency(this.services.purchaseOrderService, database);

    this.services.salesOrderService = new SalesOrderService();
    this.injectDatabaseDependency(this.services.salesOrderService, database);

    console.log('业务服务初始化完成');
  }

  /**
   * 注入数据库依赖（简单的依赖注入）
   */
  private injectDatabaseDependency(service: any, database: ElectronDatabase): void {
    if (service && typeof service.setDatabase === 'function') {
      service.setDatabase(database);
    } else if (service) {
      // 直接设置 database 属性
      (service as any).database = database;
    }
  }

  /**
   * 加载服务数据
   */
  private async loadServiceData(): Promise<void> {
    console.log('正在加载服务数据...');
    
    const servicesToInitialize = [
      this.services.unitService,
      this.services.categoryService,
      this.services.warehouseService,
      this.services.supplierService,
      this.services.customerService,
      this.services.userService,
      this.services.productService
    ];

    for (const service of servicesToInitialize) {
      if (service && typeof service.initialize === 'function') {
        try {
          await service.initialize();
        } catch (error) {
          console.warn(`服务初始化失败:`, error);
          // 继续初始化其他服务，不中断整个流程
        }
      }
    }

    console.log('服务数据加载完成');
  }

  /**
   * 获取服务实例
   */
  getService<K extends keyof ServiceInstances>(serviceName: K): ServiceInstances[K] | undefined {
    return this.services[serviceName];
  }

  /**
   * 获取所有服务
   */
  getAllServices(): Partial<ServiceInstances> {
    return { ...this.services };
  }

  /**
   * 获取初始化状态
   */
  getStatus(): InitializationStatus {
    return {
      isInitialized: this._isInitialized,
      initializationTime: this._initializationTime,
      error: this._error || undefined,
      servicesCount: Object.keys(this.services).length
    };
  }

  /**
   * 重置服务管理器（用于测试）
   */
  reset(): void {
    this.services = {};
    this._isInitialized = false;
    this._initializationTime = 0;
    this._error = null;
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }
}

// 导出单例实例
export const simpleServiceManager = SimpleServiceManager.getInstance();

// 全局服务访问器（兼容现有代码）
export const getServices = (): Partial<ServiceInstances> => {
  return simpleServiceManager.getAllServices();
};
