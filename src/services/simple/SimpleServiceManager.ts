/**
 * 简化的服务管理器
 * 替代复杂的ServiceManager，使用直接实例化，无复杂依赖注入
 * 符合"单机版小型进销存，不要过度工程化"的原则
 */

import { ProductService } from './ProductService';
// 其他服务将在后续阶段实现
// import { CategoryService } from './CategoryService';
// import { UnitService } from './UnitService';
// import { WarehouseService } from './WarehouseService';
// import { StockService } from './StockService';
// import { TransactionService } from './TransactionService';

/**
 * 简化的服务管理器
 * 特点：
 * 1. 无复杂依赖注入
 * 2. 直接实例化服务
 * 3. 简单的单例模式
 * 4. 易于理解和维护
 */
export class SimpleServiceManager {
  private static instance: SimpleServiceManager | null = null;
  
  // 服务实例
  private _productService: ProductService;
  // private _categoryService: CategoryService;
  // private _unitService: UnitService;
  // private _warehouseService: WarehouseService;
  // private _stockService: StockService;
  // private _transactionService: TransactionService;

  private constructor() {
    // 直接实例化服务，无复杂初始化流程
    this._productService = new ProductService();
    // this._categoryService = new CategoryService();
    // this._unitService = new UnitService();
    // this._warehouseService = new WarehouseService();
    // this._stockService = new StockService();
    // this._transactionService = new TransactionService();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SimpleServiceManager {
    if (!this.instance) {
      this.instance = new SimpleServiceManager();
    }
    return this.instance;
  }

  /**
   * 重置实例（主要用于测试）
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * 获取产品服务
   */
  getProductService(): ProductService {
    return this._productService;
  }

  /**
   * 获取分类服务（待实现）
   */
  // getCategoryService(): CategoryService {
  //   return this._categoryService;
  // }

  /**
   * 获取单位服务（待实现）
   */
  // getUnitService(): UnitService {
  //   return this._unitService;
  // }

  /**
   * 获取仓库服务（待实现）
   */
  // getWarehouseService(): WarehouseService {
  //   return this._warehouseService;
  // }

  /**
   * 获取库存服务（待实现）
   */
  // getStockService(): StockService {
  //   return this._stockService;
  // }

  /**
   * 获取交易服务（待实现）
   */
  // getTransactionService(): TransactionService {
  //   return this._transactionService;
  // }

  /**
   * 获取所有服务的健康状态
   */
  async getHealthStatus(): Promise<{
    productService: boolean;
    // categoryService: boolean;
    // unitService: boolean;
    // warehouseService: boolean;
    // stockService: boolean;
    // transactionService: boolean;
  }> {
    try {
      // 简单的健康检查：尝试调用每个服务的基础方法
      const productHealth = await this.checkServiceHealth(() => 
        this._productService.getProducts({ limit: 1 })
      );

      return {
        productService: productHealth,
        // categoryService: await this.checkServiceHealth(() => this._categoryService.getCategories()),
        // unitService: await this.checkServiceHealth(() => this._unitService.getUnits()),
        // warehouseService: await this.checkServiceHealth(() => this._warehouseService.getWarehouses()),
        // stockService: await this.checkServiceHealth(() => this._stockService.getStocks({ limit: 1 })),
        // transactionService: await this.checkServiceHealth(() => this._transactionService.getTransactions({ limit: 1 }))
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        productService: false,
        // categoryService: false,
        // unitService: false,
        // warehouseService: false,
        // stockService: false,
        // transactionService: false
      };
    }
  }

  /**
   * 检查单个服务的健康状态
   */
  private async checkServiceHealth(serviceCall: () => Promise<any>): Promise<boolean> {
    try {
      const result = await serviceCall();
      return result.success === true;
    } catch (error) {
      console.error('Service health check failed:', error);
      return false;
    }
  }

  /**
   * 获取服务统计信息
   */
  async getServiceStatistics(): Promise<{
    totalServices: number;
    healthyServices: number;
    serviceDetails: Record<string, boolean>;
  }> {
    const healthStatus = await this.getHealthStatus();
    const serviceDetails = healthStatus;
    const healthyServices = Object.values(serviceDetails).filter(Boolean).length;
    const totalServices = Object.keys(serviceDetails).length;

    return {
      totalServices,
      healthyServices,
      serviceDetails
    };
  }
}

/**
 * 导出单例实例，方便直接使用
 */
export const simpleServiceManager = SimpleServiceManager.getInstance();

/**
 * 向后兼容的适配器
 * 为了平滑迁移现有代码，提供与原ServiceManager相同的接口
 */
export class ServiceManagerAdapter {
  private simpleManager: SimpleServiceManager;

  constructor() {
    this.simpleManager = SimpleServiceManager.getInstance();
  }

  /**
   * 初始化方法（兼容原接口，实际上新架构不需要复杂初始化）
   */
  async initialize(): Promise<void> {
    // 新架构不需要复杂初始化，直接返回
    return Promise.resolve();
  }

  /**
   * 获取库存服务（兼容原接口）
   * 目前返回ProductService，后续会返回完整的库存服务聚合
   */
  getInventoryService(): ProductService {
    return this.simpleManager.getProductService();
  }

  /**
   * 获取产品服务
   */
  getProductService(): ProductService {
    return this.simpleManager.getProductService();
  }

  // 其他服务的兼容方法将在后续实现
  // getOrderService() { ... }
  // getFinancialService() { ... }
  // getSystemService() { ... }
  // getReportService() { ... }
}

/**
 * 导出兼容的服务管理器实例
 * 用于替换原有的serviceManager导入
 */
export const serviceManager = new ServiceManagerAdapter();

// 默认导出简化的服务管理器
export default simpleServiceManager;
