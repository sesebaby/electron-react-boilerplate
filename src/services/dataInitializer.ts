/**
 * 数据初始化器
 * 
 * 使用新的依赖注入系统进行数据初始化
 */

import { businessServiceManager } from './business/businessServiceManager';
import { getGlobalServices } from './container/containerConfig';

/**
 * 数据初始化进度回调
 */
export interface DataInitializationProgress {
  stage: 'container' | 'services' | 'data' | 'validation' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  details?: any;
}

/**
 * 数据初始化选项
 */
export interface DataInitializationOptions {
  /** 是否跳过服务初始化 */
  skipServiceInitialization?: boolean;
  /** 是否跳过数据验证 */
  skipDataValidation?: boolean;
  /** 是否强制重新初始化 */
  forceReinitialize?: boolean;
  /** 初始化超时时间（毫秒） */
  timeout?: number;
}

/**
 * 数据初始化器
 */
export class DataInitializer {
  private static instance: DataInitializer;
  private initialized = false;
  private initializationStartTime?: Date;

  static getInstance(): DataInitializer {
    if (!DataInitializer.instance) {
      DataInitializer.instance = new DataInitializer();
    }
    return DataInitializer.instance;
  }

  /**
   * 初始化数据
   */
  async initializeData(
    options: DataInitializationOptions = {},
    onProgress?: (progress: DataInitializationProgress) => void
  ): Promise<void> {
    if (this.initialized && !options.forceReinitialize) {
      console.log('Data already initialized');
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '数据已初始化'
      });
      return;
    }

    this.initializationStartTime = new Date();
    const timeout = options.timeout || 60000; // 默认60秒超时

    try {
      console.log('Starting data initialization with dependency injection...');
      
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('数据初始化超时')), timeout);
      });

      const initPromise = this.performInitialization(options, onProgress);
      
      await Promise.race([initPromise, timeoutPromise]);

      this.initialized = true;
      const initTime = Date.now() - this.initializationStartTime.getTime();
      
      console.log(`Data initialization completed successfully in ${initTime}ms`);
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `数据初始化完成，耗时: ${initTime}ms`
      });

    } catch (error) {
      console.error('Failed to initialize data:', error);
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '数据初始化失败',
        error: error instanceof Error ? error.message : '未知错误'
      });
      throw error;
    }
  }

  /**
   * 执行初始化过程
   */
  private async performInitialization(
    options: DataInitializationOptions,
    onProgress?: (progress: DataInitializationProgress) => void
  ): Promise<void> {
    // 第一步：初始化服务容器
    onProgress?.({
      stage: 'container',
      progress: 10,
      message: '正在初始化服务容器...'
    });

    if (!businessServiceManager.isInitialized || options.forceReinitialize) {
      if (options.forceReinitialize) {
        businessServiceManager.reset();
      }
      await businessServiceManager.initialize();
    }

    onProgress?.({
      stage: 'container',
      progress: 30,
      message: '服务容器初始化完成'
    });

    // 第二步：初始化业务服务
    if (!options.skipServiceInitialization) {
      onProgress?.({
        stage: 'services',
        progress: 40,
        message: '正在初始化业务服务...'
      });

      const services = await getGlobalServices();
      
      // 验证关键服务是否可用
      const criticalServices = [
        { name: 'CategoryService', service: services.categoryService },
        { name: 'UnitService', service: services.unitService },
        { name: 'WarehouseService', service: services.warehouseService },
        { name: 'ProductService', service: services.productService }
      ];

      for (const { name, service } of criticalServices) {
        if (!service) {
          throw new Error(`关键服务不可用: ${name}`);
        }
        
        // 测试服务是否正常工作
        try {
          if (service && typeof (service as any).findAll === 'function') {
            await (service as any).findAll();
          }
        } catch (error) {
          console.warn(`Service ${name} test failed:`, error);
          // 不抛出错误，只记录警告
        }
      }

      onProgress?.({
        stage: 'services',
        progress: 60,
        message: '业务服务初始化完成'
      });
    }

    // 第三步：数据加载和验证
    onProgress?.({
      stage: 'data',
      progress: 70,
      message: '正在加载和验证数据...'
    });

    // 数据现在从数据库加载（通过 mock-data.sql）
    console.log('Data is loaded from database (mock-data.sql)');
    
    // 验证数据完整性
    if (!options.skipDataValidation) {
      onProgress?.({
        stage: 'validation',
        progress: 80,
        message: '正在验证数据完整性...'
      });

      const integrityResult = await businessServiceManager.validateSystemIntegrity();
      if (!integrityResult.isValid) {
        const errorIssues = integrityResult.issues.filter(issue => issue.type === 'error');
        if (errorIssues.length > 0) {
          console.warn('Data integrity issues found:', errorIssues);
          // 不抛出错误，只记录警告
        }
      }

      onProgress?.({
        stage: 'validation',
        progress: 90,
        message: '数据验证完成'
      });
    }
  }

  /**
   * 重置数据初始化状态
   */
  reset(): void {
    this.initialized = false;
    this.initializationStartTime = undefined;
    businessServiceManager.reset();
    console.log('Data initializer reset');
  }

  /**
   * 获取初始化状态
   */
  get isInitialized(): boolean {
    return this.initialized && businessServiceManager.isInitialized;
  }

  /**
   * 获取初始化时间
   */
  get initializationTime(): Date | undefined {
    return this.initializationStartTime;
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    if (!this.initialized) {
      return {
        initialized: false,
        message: '数据初始化器未初始化'
      };
    }

    return businessServiceManager.getSystemStatus();
  }

  /**
   * 获取业务数据汇总
   */
  async getBusinessSummary() {
    if (!this.initialized) {
      throw new Error('数据初始化器未初始化');
    }

    return businessServiceManager.getBusinessSummary();
  }

  /**
   * 验证数据完整性
   */
  async validateDataIntegrity() {
    if (!this.initialized) {
      throw new Error('数据初始化器未初始化');
    }

    return businessServiceManager.validateSystemIntegrity();
  }

  /**
   * 获取服务健康状态
   */
  getServiceHealth() {
    if (!this.initialized) {
      return {
        isHealthy: false,
        message: '数据初始化器未初始化',
        services: {}
      };
    }

    const container = businessServiceManager.getContainer();
    return container.getServiceHealth();
  }

  /**
   * 强制重新初始化
   */
  async forceReinitialize(
    onProgress?: (progress: DataInitializationProgress) => void
  ): Promise<void> {
    console.log('Force reinitializing data...');
    this.reset();
    await this.initializeData({ forceReinitialize: true }, onProgress);
  }

  /**
   * 检查初始化准备状态
   */
  async checkInitializationReadiness(): Promise<{
    isReady: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 检查服务容器是否可以初始化
      if (!businessServiceManager.isInitialized) {
        try {
          await businessServiceManager.initialize();
        } catch (error) {
          issues.push(`服务容器初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
      }

      if (businessServiceManager.isInitialized) {
        // 检查服务健康状态
        const health = businessServiceManager.getContainer().getServiceHealth();
        if (health.overall !== 'healthy') {
          issues.push(`服务容器状态异常: ${health.overall}`);
        }

        if (health.statistics.failedServices > 0) {
          issues.push(`${health.statistics.failedServices} 个服务初始化失败`);
        }

        // 检查循环依赖
        const validation = businessServiceManager.getContainer().validateDependencies();
        if (!validation.isValid) {
          const errorDeps = validation.circularDependencies.filter(cd => cd.severity === 'error');
          if (errorDeps.length > 0) {
            issues.push(`存在 ${errorDeps.length} 个严重的循环依赖问题`);
          }
        }
      }

    } catch (error) {
      issues.push(`准备状态检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    if (issues.length === 0) {
      recommendations.push('系统已准备好进行数据初始化');
    } else {
      recommendations.push('请先解决发现的问题再进行初始化');
      recommendations.push('可以尝试重启应用程序或清理缓存');
    }

    return {
      isReady: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 获取初始化统计信息
   */
  getInitializationStatistics() {
    if (!this.initialized) {
      return null;
    }

    const serviceStats = businessServiceManager.getServiceStatistics();
    const performanceMetrics = businessServiceManager.getPerformanceMetrics();
    
    return {
      initializationTime: this.initializationStartTime,
      serviceStatistics: serviceStats,
      performanceMetrics: performanceMetrics,
      systemStatus: {
        initialized: this.initialized,
        serviceManagerInitialized: businessServiceManager.isInitialized
      }
    };
  }
}

// 创建并导出单例实例
export const dataInitializer = DataInitializer.getInstance();

// 默认导出
export default dataInitializer;
