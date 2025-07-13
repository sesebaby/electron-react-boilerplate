/**
 * 领域服务管理器
 * 简化的服务管理，无复杂依赖注入
 * 遵循"单机版小型进销存，不要过度工程化"原则
 */

import { InventoryDomainService } from './InventoryDomainService';
import { MasterDataService } from './MasterDataService';
import { ReportService } from './ReportService';

/**
 * 领域服务管理器
 * 特点：
 * 1. 无复杂依赖注入
 * 2. 直接实例化服务
 * 3. 简单的单例模式
 * 4. 易于理解和维护
 */
export class DomainServiceManager {
  private static instance: DomainServiceManager | null = null;
  
  // 服务实例
  private _inventoryDomainService: InventoryDomainService;
  private _masterDataService: MasterDataService;
  private _reportService: ReportService;

  private constructor() {
    // 直接实例化服务，无复杂初始化流程
    this._inventoryDomainService = new InventoryDomainService();
    this._masterDataService = new MasterDataService();
    this._reportService = new ReportService();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): DomainServiceManager {
    if (!this.instance) {
      this.instance = new DomainServiceManager();
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
   * 获取库存领域服务
   */
  getInventoryDomainService(): InventoryDomainService {
    return this._inventoryDomainService;
  }

  /**
   * 获取基础数据服务
   */
  getMasterDataService(): MasterDataService {
    return this._masterDataService;
  }

  /**
   * 获取报表服务
   */
  getReportService(): ReportService {
    return this._reportService;
  }

  /**
   * 获取所有服务的健康状态
   */
  async getHealthStatus(): Promise<{
    inventoryDomainService: boolean;
    masterDataService: boolean;
    reportService: boolean;
  }> {
    try {
      // 简单的健康检查：尝试调用每个服务的基础方法
      const inventoryHealth = await this.checkServiceHealth(() => 
        this._inventoryDomainService.getProductsWithStock({ limit: 1 })
      );

      const masterDataHealth = await this.checkServiceHealth(() => 
        this._masterDataService.getCategories()
      );

      const reportHealth = await this.checkServiceHealth(() => 
        this._reportService.getInventoryStatistics()
      );

      return {
        inventoryDomainService: inventoryHealth,
        masterDataService: masterDataHealth,
        reportService: reportHealth
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        inventoryDomainService: false,
        masterDataService: false,
        reportService: false
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
 * 向后兼容的适配器
 * 为了平滑迁移现有代码，提供与原ServiceManager相同的接口
 */
export class ServiceManagerAdapter {
  private domainManager: DomainServiceManager;

  constructor() {
    this.domainManager = DomainServiceManager.getInstance();
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
   * 返回库存领域服务，提供完整的库存管理功能
   */
  getInventoryService(): InventoryDomainService {
    return this.domainManager.getInventoryDomainService();
  }

  /**
   * 获取库存领域服务
   */
  getInventoryDomainService(): InventoryDomainService {
    return this.domainManager.getInventoryDomainService();
  }

  /**
   * 获取基础数据服务
   */
  getMasterDataService(): MasterDataService {
    return this.domainManager.getMasterDataService();
  }

  /**
   * 获取报表服务
   */
  getReportService(): ReportService {
    return this.domainManager.getReportService();
  }

  /**
   * 检查服务管理器是否已初始化（兼容原接口）
   */
  isInitialized(): boolean {
    return true; // 新架构总是已初始化
  }

  /**
   * 清理资源（兼容原接口）
   */
  async dispose(): Promise<void> {
    // 新架构无需复杂清理，直接返回
    return Promise.resolve();
  }

  // 其他服务的兼容方法将在后续实现
  // getOrderService() { ... }
  // getFinancialService() { ... }
  // getSystemService() { ... }
}

/**
 * 导出领域服务管理器实例，方便直接使用
 */
export const domainServiceManager = DomainServiceManager.getInstance();

/**
 * 导出兼容的服务管理器实例
 * 用于替换原有的serviceManager导入
 */
export const serviceManager = new ServiceManagerAdapter();

// 默认导出领域服务管理器
export default domainServiceManager;
