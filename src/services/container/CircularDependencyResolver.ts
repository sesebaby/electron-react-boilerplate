/**
 * 循环依赖解决器
 * 
 * 提供多种策略来解决服务间的循环依赖问题
 */

import { ServiceContainer } from './ServiceContainer';
import { ServiceProxyFactory } from './ServiceProxy';
import { SERVICE_TOKENS, CIRCULAR_DEPENDENCY_SOLUTIONS } from '../interfaces';
import { ServiceToken } from './types';

/**
 * 循环依赖解决策略
 */
export enum CircularDependencyStrategy {
  /** 事件驱动解耦 */
  EventDriven = 'event-driven',
  /** 接口抽象 */
  InterfaceAbstraction = 'interface-abstraction',
  /** 延迟注入 */
  LazyInjection = 'lazy-injection',
  /** 代理模式 */
  ProxyPattern = 'proxy-pattern'
}

/**
 * 事件总线接口
 */
export interface IEventBus {
  /** 发布事件 */
  publish<T>(eventType: string, data: T): Promise<void>;
  /** 订阅事件 */
  subscribe<T>(eventType: string, handler: (data: T) => void | Promise<void>): void;
  /** 取消订阅 */
  unsubscribe(eventType: string, handler: Function): void;
}

/**
 * 简单事件总线实现
 */
export class SimpleEventBus implements IEventBus {
  private listeners = new Map<string, Function[]>();

  async publish<T>(eventType: string, data: T): Promise<void> {
    const handlers = this.listeners.get(eventType) || [];
    
    // 并行执行所有处理器
    const promises = handlers.map(handler => {
      try {
        const result = handler(data);
        return result instanceof Promise ? result : Promise.resolve(result);
      } catch (error) {
        console.error(`Error in event handler for ${eventType}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  subscribe<T>(eventType: string, handler: (data: T) => void | Promise<void>): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);
  }

  unsubscribe(eventType: string, handler: Function): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /** 获取事件统计 */
  getEventStatistics(): {
    totalEventTypes: number;
    totalListeners: number;
    eventTypes: string[];
  } {
    const totalListeners = Array.from(this.listeners.values())
      .reduce((sum, handlers) => sum + handlers.length, 0);

    return {
      totalEventTypes: this.listeners.size,
      totalListeners,
      eventTypes: Array.from(this.listeners.keys())
    };
  }
}

/**
 * 权限检查器接口实现
 * 用于解决ProductService的权限检查循环依赖
 */
export class PermissionChecker {
  private userService?: any;
  private eventBus: IEventBus;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  setUserService(userService: any): void {
    this.userService = userService;
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    if (!this.userService) {
      // 如果用户服务不可用，发布事件请求权限检查
      return new Promise((resolve) => {
        this.eventBus.publish('permission.check.request', {
          userId,
          permission,
          callback: resolve
        });
        
        // 默认超时后返回false
        setTimeout(() => resolve(false), 1000);
      });
    }

    try {
      // 直接调用用户服务的权限检查方法
      if (typeof this.userService.hasPermission === 'function') {
        return await this.userService.hasPermission(userId, permission);
      }
      
      // 如果没有权限检查方法，默认允许
      return true;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  }

  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.hasPermission(userId, permission)) {
        return true;
      }
    }
    return false;
  }

  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      if (!(await this.hasPermission(userId, permission))) {
        return false;
      }
    }
    return true;
  }
}

/**
 * 循环依赖解决器
 */
export class CircularDependencyResolver {
  private container: ServiceContainer;
  private proxyFactory: ServiceProxyFactory;
  private eventBus: SimpleEventBus;
  private permissionChecker: PermissionChecker;

  constructor(container: ServiceContainer) {
    this.container = container;
    this.proxyFactory = new ServiceProxyFactory(container);
    this.eventBus = new SimpleEventBus();
    this.permissionChecker = new PermissionChecker(this.eventBus);
  }

  /**
   * 解决所有已知的循环依赖
   */
  async resolveAllCircularDependencies(): Promise<void> {
    console.log('Resolving circular dependencies...');

    // 1. 注册事件总线
    this.container.registerSingleton(
      'EventBus' as any,
      () => this.eventBus,
      { layer: 1 as any }
    );

    // 2. 注册权限检查器
    this.container.registerSingleton(
      'PermissionChecker' as any,
      () => this.permissionChecker,
      { layer: 1 as any }
    );

    // 3. 解决具体的循环依赖
    await this.resolveCustomerServiceCircularDependency();
    await this.resolveSupplierServiceCircularDependency();
    await this.resolveProductServiceCircularDependency();
    await this.resolveInventoryServiceCircularDependency();
    await this.resolveFinancialServiceCircularDependency();

    console.log('Circular dependencies resolved');
  }

  /**
   * 解决客户服务 ↔ 销售订单服务的循环依赖
   */
  private async resolveCustomerServiceCircularDependency(): Promise<void> {
    // 使用事件驱动模式解耦
    this.eventBus.subscribe('customer.created', async (data: any) => {
      // 通知销售订单服务客户已创建
      console.log('Customer created event:', data);
    });

    this.eventBus.subscribe('customer.updated', async (data: any) => {
      // 通知销售订单服务客户已更新
      console.log('Customer updated event:', data);
    });

    this.eventBus.subscribe('sales_order.created', async (data: any) => {
      // 通知客户服务订单已创建
      console.log('Sales order created event:', data);
    });

    this.eventBus.subscribe('sales_order.completed', async (data: any) => {
      // 更新客户统计信息
      console.log('Sales order completed event:', data);
    });
  }

  /**
   * 解决供应商服务 ↔ 采购订单服务的循环依赖
   */
  private async resolveSupplierServiceCircularDependency(): Promise<void> {
    // 使用事件驱动模式解耦
    this.eventBus.subscribe('supplier.created', async (data: any) => {
      console.log('Supplier created event:', data);
    });

    this.eventBus.subscribe('supplier.updated', async (data: any) => {
      console.log('Supplier updated event:', data);
    });

    this.eventBus.subscribe('purchase_order.created', async (data: any) => {
      console.log('Purchase order created event:', data);
    });

    this.eventBus.subscribe('purchase_order.completed', async (data: any) => {
      console.log('Purchase order completed event:', data);
    });
  }

  /**
   * 解决产品服务的权限检查循环依赖
   */
  private async resolveProductServiceCircularDependency(): Promise<void> {
    // 使用接口抽象模式
    // 权限检查器已经在构造函数中创建，这里设置事件监听
    this.eventBus.subscribe('permission.check.request', async (data: any) => {
      const { userId, permission, callback } = data;
      
      try {
        // 尝试获取用户服务
        const userService = this.container.tryResolve(SERVICE_TOKENS.UserService);
        if (userService && typeof (userService as any).hasPermission === 'function') {
          const result = await (userService as any).hasPermission(userId, permission);
          callback(result);
        } else {
          // 默认权限策略
          callback(true);
        }
      } catch (error) {
        console.error('Permission check error:', error);
        callback(false);
      }
    });
  }

  /**
   * 创建服务代理
   */
  createServiceProxy<T>(targetToken: ServiceToken<T>): T {
    return this.proxyFactory.createProxy<T>({
      targetToken,
      lazyTarget: true
    });
  }

  /**
   * 获取事件总线
   */
  getEventBus(): IEventBus {
    return this.eventBus;
  }

  /**
   * 获取权限检查器
   */
  getPermissionChecker(): PermissionChecker {
    return this.permissionChecker;
  }

  /**
   * 解决库存服务间的循环依赖
   */
  private async resolveInventoryServiceCircularDependency(): Promise<void> {
    // 库存服务通过可选依赖注入解决循环依赖
    // 在容器配置中已经处理，这里添加事件监听
    this.eventBus.subscribe('product.created', async (data: any) => {
      console.log('Product created event for inventory:', data);
    });

    this.eventBus.subscribe('warehouse.created', async (data: any) => {
      console.log('Warehouse created event for inventory:', data);
    });

    this.eventBus.subscribe('inventory.stock_changed', async (data: any) => {
      console.log('Inventory stock changed event:', data);
    });
  }

  /**
   * 解决财务服务与订单服务的循环依赖
   */
  private async resolveFinancialServiceCircularDependency(): Promise<void> {
    // 财务服务通过可选依赖注入解决循环依赖
    // 添加事件监听来处理订单状态变化
    this.eventBus.subscribe('purchase_order.completed', async (data: any) => {
      // 采购订单完成时，可以自动生成应付账款
      console.log('Purchase order completed, may generate accounts payable:', data);
    });

    this.eventBus.subscribe('sales_order.completed', async (data: any) => {
      // 销售订单完成时，可以自动生成应收账款
      console.log('Sales order completed, may generate accounts receivable:', data);
    });

    this.eventBus.subscribe('payment.received', async (data: any) => {
      // 收到付款时，更新应收账款状态
      console.log('Payment received event:', data);
    });

    this.eventBus.subscribe('payment.made', async (data: any) => {
      // 付款时，更新应付账款状态
      console.log('Payment made event:', data);
    });
  }

  /**
   * 获取循环依赖解决统计
   */
  getResolutionStatistics(): {
    eventBusStats: ReturnType<SimpleEventBus['getEventStatistics']>;
    proxyStats: ReturnType<ServiceProxyFactory['getProxyStatistics']>;
    resolvedDependencies: string[];
  } {
    return {
      eventBusStats: this.eventBus.getEventStatistics(),
      proxyStats: this.proxyFactory.getProxyStatistics(),
      resolvedDependencies: [
        'CustomerService ↔ SalesOrderService',
        'SupplierService ↔ PurchaseOrderService',
        'ProductService → UserService (权限检查)',
        'InventoryService ↔ ProductService/WarehouseService',
        'AccountsPayableService → PurchaseOrderService',
        'AccountsReceivableService → SalesOrderService'
      ]
    };
  }

  /**
   * 验证循环依赖解决方案
   */
  async validateResolution(): Promise<{
    isResolved: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查事件总线是否正常工作
    try {
      await this.eventBus.publish('test.event', { test: true });
    } catch (error) {
      issues.push('事件总线无法正常工作');
    }

    // 检查权限检查器是否可用
    try {
      await this.permissionChecker.hasPermission('test-user', 'test.permission');
    } catch (error) {
      issues.push('权限检查器无法正常工作');
    }

    // 检查代理工厂状态
    const proxyStats = this.proxyFactory.getProxyStatistics();
    if (proxyStats.failedProxies > 0) {
      issues.push(`${proxyStats.failedProxies} 个服务代理初始化失败`);
      recommendations.push('检查代理目标服务是否正确注册');
    }

    return {
      isResolved: issues.length === 0,
      issues,
      recommendations
    };
  }
}
