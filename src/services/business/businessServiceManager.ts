/**
 * 业务服务管理器
 * 
 * 集成依赖注入系统的业务服务管理器
 */

import { ServiceContainer } from '../container/ServiceContainer';
import { createInitializedContainer, getGlobalServices } from '../container/containerConfig';
import { SERVICE_TOKENS } from '../interfaces';
import { logger } from '../../utils/secureLogger';

/**
 * 系统状态接口
 */
export interface SystemStatus {
  /** 系统是否已初始化 */
  initialized: boolean;
  /** 服务状态 */
  services: {
    total: number;
    initialized: number;
    failed: number;
    healthy: number;
  };
  /** 数据库状态 */
  database: {
    connected: boolean;
    version?: string;
    lastBackup?: Date;
  };
  /** 系统信息 */
  system: {
    version: string;
    uptime: number;
    memoryUsage: number;
  };
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 业务数据汇总接口
 */
export interface BusinessSummary {
  /** 分类统计 */
  categories: {
    total: number;
    active: number;
    rootCategories: number;
  };
  /** 产品统计 */
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
  };
  /** 库存统计 */
  inventory: {
    totalValue: number;
    totalQuantity: number;
    warehouseCount: number;
  };
  /** 财务统计 */
  financial: {
    accountsPayable: {
      total: number;
      overdue: number;
      amount: number;
    };
    accountsReceivable: {
      total: number;
      overdue: number;
      amount: number;
    };
  };
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 数据完整性验证结果
 */
export interface IntegrityResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 发现的问题 */
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    service: string;
    message: string;
    details?: any;
  }>;
  /** 修复建议 */
  recommendations: string[];
  /** 验证时间 */
  validatedAt: Date;
}

/**
 * 业务服务管理器
 * 
 * 使用依赖注入容器管理所有业务服务
 */
export class BusinessServiceManager {
  private container?: ServiceContainer;
  private initialized = false;
  private initializationStartTime?: Date;

  // ==================== 生命周期管理 ====================

  /**
   * 初始化业务服务管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Business services already initialized');
      return;
    }

    this.initializationStartTime = new Date();
    console.log('开始初始化业务服务管理器...');

    try {
      // 创建并初始化服务容器
      this.container = await createInitializedContainer();
      
      // 验证所有服务的健康状态
      const health = this.container.getServiceHealth();
      if (health.overall !== 'healthy') {
        console.warn('Some services are not healthy:', health.issues);
      }

      this.initialized = true;
      const initTime = Date.now() - this.initializationStartTime.getTime();
      
      console.log(`业务服务管理器初始化完成，耗时: ${initTime}ms`);
      logger.info('BusinessServiceManager initialized successfully', {
        initializationTime: initTime,
        serviceCount: health.statistics.totalServices,
        healthyServices: health.statistics.initializedServices
      });

    } catch (error) {
      logger.error('Failed to initialize BusinessServiceManager', error);
      throw new Error(`业务服务管理器初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 重置业务服务管理器
   */
  reset(): void {
    if (this.container) {
      // 容器会自动处理服务的清理
      this.container = undefined;
    }
    this.initialized = false;
    this.initializationStartTime = undefined;
    console.log('Business service manager reset');
  }

  /**
   * 销毁业务服务管理器
   */
  async dispose(): Promise<void> {
    if (this.container) {
      await this.container.dispose();
      this.container = undefined;
    }
    this.initialized = false;
    console.log('Business service manager disposed');
  }

  // ==================== 服务访问 ====================

  /**
   * 获取服务容器
   */
  getContainer(): ServiceContainer {
    if (!this.container) {
      throw new Error('Business service manager not initialized');
    }
    return this.container;
  }

  /**
   * 获取服务访问器
   */
  async getServices() {
    if (!this.initialized) {
      throw new Error('Business service manager not initialized');
    }
    return await getGlobalServices();
  }

  /**
   * 解析特定服务
   */
  resolveService<T>(token: any): T {
    if (!this.container) {
      throw new Error('Business service manager not initialized');
    }
    return this.container.resolve<T>(token);
  }

  // ==================== 系统状态 ====================

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<SystemStatus> {
    if (!this.container) {
      return {
        initialized: false,
        services: { total: 0, initialized: 0, failed: 0, healthy: 0 },
        database: { connected: false },
        system: {
          version: '1.0.0',
          uptime: 0,
          memoryUsage: 0
        },
        lastUpdated: new Date()
      };
    }

    const health = this.container.getServiceHealth();
    const uptime = this.initializationStartTime 
      ? Date.now() - this.initializationStartTime.getTime()
      : 0;

    return {
      initialized: this.initialized,
      services: {
        total: health.statistics.totalServices,
        initialized: health.statistics.initializedServices,
        failed: health.statistics.failedServices,
        healthy: health.statistics.totalServices - health.statistics.failedServices
      },
      database: {
        connected: true, // 这里可以添加实际的数据库连接检查
        version: '1.0.0'
      },
      system: {
        version: '2.0.0',
        uptime,
        memoryUsage: process.memoryUsage?.()?.heapUsed || 0
      },
      lastUpdated: new Date()
    };
  }

  /**
   * 获取业务数据汇总
   */
  async getBusinessSummary(): Promise<BusinessSummary> {
    if (!this.initialized || !this.container) {
      throw new Error('Business service manager not initialized');
    }

    try {
      const services = await this.getServices();

      // 获取各服务的统计数据
      const [
        categoryStats,
        productStats,
        // inventoryStats,
        // payableStats,
        // receivableStats
      ] = await Promise.all([
        (services.categoryService as any).getStatistics(),
        (services.productService as any).getStatistics(),
        // services.inventoryStockService.getStatistics(),
        // services.accountsPayableService.getStatistics(),
        // services.accountsReceivableService.getStatistics()
      ]);

      return {
        categories: {
          total: categoryStats.totalCount,
          active: categoryStats.activeCount,
          rootCategories: categoryStats.rootCategoryCount
        },
        products: {
          total: productStats.totalCount,
          active: productStats.activeCount,
          lowStock: productStats.lowStockCount,
          outOfStock: productStats.outOfStockCount
        },
        inventory: {
          totalValue: 0, // inventoryStats.totalInventoryValue,
          totalQuantity: 0, // inventoryStats.totalQuantity,
          warehouseCount: 0 // inventoryStats.warehouseCount
        },
        financial: {
          accountsPayable: {
            total: 0, // payableStats.totalCount,
            overdue: 0, // payableStats.overdueCount,
            amount: 0 // payableStats.totalAmount
          },
          accountsReceivable: {
            total: 0, // receivableStats.totalCount,
            overdue: 0, // receivableStats.overdueCount,
            amount: 0 // receivableStats.totalAmount
          }
        },
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('Failed to get business summary', error);
      throw new Error(`获取业务数据汇总失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 验证系统数据完整性
   */
  async validateSystemIntegrity(): Promise<IntegrityResult> {
    if (!this.initialized || !this.container) {
      return {
        isValid: false,
        issues: [{
          type: 'error',
          service: 'BusinessServiceManager',
          message: '业务服务管理器未初始化'
        }],
        recommendations: ['请先初始化业务服务管理器'],
        validatedAt: new Date()
      };
    }

    const issues: IntegrityResult['issues'] = [];
    const recommendations: string[] = [];

    try {
      // 1. 检查服务容器健康状态
      const health = this.container.getServiceHealth();
      
      if (health.overall !== 'healthy') {
        issues.push({
          type: 'warning',
          service: 'ServiceContainer',
          message: `服务容器状态: ${health.overall}`,
          details: health.issues
        });
      }

      if (health.statistics.failedServices > 0) {
        issues.push({
          type: 'error',
          service: 'ServiceContainer',
          message: `${health.statistics.failedServices} 个服务初始化失败`
        });
        recommendations.push('检查失败服务的依赖关系和配置');
      }

      // 2. 检查依赖关系
      const validation = this.container.validateDependencies();
      if (!validation.isValid) {
        for (const circular of validation.circularDependencies) {
          if (circular.severity === 'error') {
            issues.push({
              type: 'error',
              service: 'DependencyResolver',
              message: `循环依赖: ${circular.chain.map(String).join(' -> ')}`,
              details: circular
            });
          }
        }

        for (const missing of validation.missingDependencies) {
          issues.push({
            type: 'error',
            service: 'DependencyResolver',
            message: `缺失依赖: ${String(missing.service)} -> ${String(missing.dependency)}`
          });
        }
      }

      // 3. 检查各个业务服务的健康状态
      const services = await this.getServices();
      
      const serviceChecks = [
        { name: 'CategoryService', service: services.categoryService },
        { name: 'ProductService', service: services.productService },
        { name: 'UnitService', service: services.unitService },
        { name: 'WarehouseService', service: services.warehouseService }
      ];

      for (const { name, service } of serviceChecks) {
        if (service && typeof service === 'object' && 'getHealthStatus' in service && typeof (service as any).getHealthStatus === 'function') {
          try {
            const serviceHealth = (service as any).getHealthStatus();
            if (serviceHealth && !serviceHealth.isHealthy) {
              issues.push({
                type: 'warning',
                service: name,
                message: serviceHealth.message || '服务状态异常',
                details: serviceHealth.details
              });
            }
          } catch (error) {
            issues.push({
              type: 'error',
              service: name,
              message: `服务健康检查失败: ${error instanceof Error ? error.message : '未知错误'}`
            });
          }
        }
      }

      // 4. 生成建议
      if (issues.length === 0) {
        recommendations.push('系统运行正常，无需特殊操作');
      } else {
        recommendations.push('建议检查系统日志以获取更多详细信息');
        if (issues.some(i => i.type === 'error')) {
          recommendations.push('发现严重错误，建议重启系统或重新初始化');
        }
      }

      return {
        isValid: issues.filter(i => i.type === 'error').length === 0,
        issues,
        recommendations,
        validatedAt: new Date()
      };

    } catch (error) {
      logger.error('System integrity validation failed', error);
      return {
        isValid: false,
        issues: [{
          type: 'error',
          service: 'ValidationProcess',
          message: `验证过程失败: ${error instanceof Error ? error.message : '未知错误'}`
        }],
        recommendations: ['请检查系统日志并重试验证'],
        validatedAt: new Date()
      };
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 获取初始化状态
   */
  get isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取初始化时间
   */
  get initializationTime(): Date | undefined {
    return this.initializationStartTime;
  }

  /**
   * 获取服务统计信息
   */
  getServiceStatistics() {
    if (!this.container) {
      return null;
    }
    return this.container.getServiceHealth().statistics;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    if (!this.container) {
      return null;
    }
    return this.container.getServiceHealth().performance;
  }
}

// 创建并导出服务管理器实例
export const businessServiceManager = new BusinessServiceManager();

// 默认导出管理器，方便使用
export default businessServiceManager;
