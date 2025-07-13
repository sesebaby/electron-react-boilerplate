/**
 * 简化的服务管理器
 * 替代复杂的DI容器，使用简单的单例模式
 */

import { InventoryService } from './InventoryService';
import { OrderService } from './OrderService';
import { FinancialService } from './FinancialService';
import { SystemService } from './SystemService';
import { ReportService } from './ReportService';
import { DatabaseManager } from './database';

/**
 * 服务管理器
 * 负责服务的创建和生命周期管理
 */
export class ServiceManager {
  private static instance: ServiceManager | null = null;
  private services: Map<string, any> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!this.instance) {
      this.instance = new ServiceManager();
    }
    return this.instance;
  }

  /**
   * 初始化所有服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 确保数据库已初始化
      await DatabaseManager.getInstance();

      // 初始化核心服务
      const inventoryService = new InventoryService();
      const orderService = new OrderService();
      const financialService = new FinancialService();
      const systemService = new SystemService();
      const reportService = new ReportService();

      // 注册服务
      this.services.set('inventory', inventoryService);
      this.services.set('order', orderService);
      this.services.set('financial', financialService);
      this.services.set('system', systemService);
      this.services.set('report', reportService);

      // 初始化服务
      await Promise.all([
        inventoryService.initialize(),
        orderService.initialize(),
        financialService.initialize(),
        systemService.initialize(),
        reportService.initialize()
      ]);

      this.initialized = true;
    } catch (error) {
      console.error('服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务实例
   */
  getService<T>(serviceName: string): T {
    if (!this.initialized) {
      throw new Error('服务管理器未初始化，请先调用 initialize()');
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`服务 '${serviceName}' 未找到`);
    }

    return service as T;
  }

  /**
   * 获取库存服务
   */
  getInventoryService(): InventoryService {
    return this.getService<InventoryService>('inventory');
  }

  /**
   * 获取订单服务
   */
  getOrderService(): OrderService {
    return this.getService<OrderService>('order');
  }

  /**
   * 获取财务服务
   */
  getFinancialService(): FinancialService {
    return this.getService<FinancialService>('financial');
  }

  /**
   * 获取系统服务
   */
  getSystemService(): SystemService {
    return this.getService<SystemService>('system');
  }

  /**
   * 获取报表服务
   */
  getReportService(): ReportService {
    return this.getService<ReportService>('report');
  }

  /**
   * 检查服务管理器是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      // 关闭数据库连接
      await DatabaseManager.close();
      
      // 清理服务
      this.services.clear();
      this.initialized = false;
    } catch (error) {
      console.error('服务清理失败:', error);
      throw error;
    }
  }
}

// 全局服务管理器实例
export const serviceManager = ServiceManager.getInstance();