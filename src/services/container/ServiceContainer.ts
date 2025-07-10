/**
 * 服务容器核心实现
 * 
 * 提供完整的依赖注入容器功能，包括：
 * - 服务注册和解析
 * - 生命周期管理
 * - 循环依赖检测和处理
 * - 分层初始化
 * - 性能监控和健康检查
 */

import {
  IServiceContainer,
  ServiceToken,
  ServiceFactory,
  ServiceScope,
  ServiceLayer,
  ServiceLifecycle,
  ServiceDescriptor,
  ServiceInstance,
  ServiceRegistrationOptions,
  DependencyDescriptor,
  DependencyValidationResult,
  ServiceHealthReport,
  CircularDependency,
  MissingDependency,
  ServiceStatistics,
  ServiceIssue,
  PerformanceMetrics,
  ContainerEvent,
  ContainerEventType,
  ContainerEventListener,
  Lazy
} from './types';

/**
 * 延迟加载实现
 */
class LazyService<T> implements Lazy<T> {
  private _value: T | null = null;
  private _initialized = false;
  private _promise: Promise<T> | null = null;

  constructor(
    private container: ServiceContainer,
    private token: ServiceToken<T>
  ) {}

  getValue(): T | Promise<T> {
    if (this._initialized) {
      return this._value!;
    }

    // 检查是否为异步服务
    const descriptor = this.container.getDescriptor(this.token);
    if (descriptor?.async) {
      if (!this._promise) {
        this._promise = this.container.resolveAsync(this.token).then(value => {
          this._value = value;
          this._initialized = true;
          return value;
        });
      }
      return this._promise;
    } else {
      this._value = this.container.resolve(this.token);
      this._initialized = true;
      return this._value;
    }
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  reset(): void {
    this._value = null;
    this._initialized = false;
    this._promise = null;
  }
}

/**
 * 服务容器主类
 */
export class ServiceContainer implements IServiceContainer {
  private readonly services = new Map<ServiceToken, ServiceDescriptor>();
  private readonly instances = new Map<ServiceToken, ServiceInstance>();
  private readonly resolutionStack: ServiceToken[] = [];
  private readonly eventListeners = new Map<ContainerEventType, ContainerEventListener[]>();
  private readonly performanceMetrics = new Map<ServiceToken, number>();
  
  private _isInitialized = false;
  private _isDisposed = false;

  // ==================== 服务注册 ====================

  register<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options: ServiceRegistrationOptions = {}
  ): void {
    this.validateNotDisposed();
    
    if (this.services.has(token)) {
      throw new Error(`Service ${String(token)} is already registered`);
    }

    const descriptor: ServiceDescriptor<T> = {
      token,
      factory,
      scope: options.scope ?? ServiceScope.Singleton,
      layer: options.layer ?? ServiceLayer.Business,
      dependencies: options.dependencies ?? [],
      async: options.async ?? false,
      metadata: options.metadata
    };

    this.services.set(token, descriptor);
    this.emitEvent(ContainerEventType.ServiceRegistered, token, { descriptor });
  }

  registerSingleton<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options: Omit<ServiceRegistrationOptions, 'scope'> = {}
  ): void {
    this.register(token, factory, { ...options, scope: ServiceScope.Singleton });
  }

  registerTransient<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options: Omit<ServiceRegistrationOptions, 'scope'> = {}
  ): void {
    this.register(token, factory, { ...options, scope: ServiceScope.Transient });
  }

  // ==================== 服务解析 ====================

  resolve<T>(token: ServiceToken<T>): T {
    this.validateNotDisposed();
    
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service ${String(token)} is not registered`);
    }

    // 检查循环依赖
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token];
      throw new Error(`Circular dependency detected: ${cycle.map(String).join(' -> ')}`);
    }

    // 对于单例，检查是否已有实例
    if (descriptor.scope === ServiceScope.Singleton) {
      const existingInstance = this.instances.get(token);
      if (existingInstance) {
        existingInstance.lastAccessedAt = new Date();
        existingInstance.accessCount++;
        return existingInstance.instance;
      }
    }

    // 创建新实例
    this.resolutionStack.push(token);
    try {
      const startTime = Date.now();
      const instance = this.createInstance(descriptor);
      const endTime = Date.now();
      
      this.performanceMetrics.set(token, endTime - startTime);
      
      // 缓存单例实例
      if (descriptor.scope === ServiceScope.Singleton) {
        const serviceInstance: ServiceInstance<T> = {
          instance,
          descriptor,
          lifecycle: ServiceLifecycle.Initialized,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 1
        };
        this.instances.set(token, serviceInstance);
      }

      this.emitEvent(ContainerEventType.ServiceResolved, token, { instance });
      return instance;
    } catch (error) {
      this.emitEvent(ContainerEventType.ServiceFailed, token, undefined, error as Error);
      throw error;
    } finally {
      this.resolutionStack.pop();
    }
  }

  async resolveAsync<T>(token: ServiceToken<T>): Promise<T> {
    this.validateNotDisposed();
    
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service ${String(token)} is not registered`);
    }

    // 检查循环依赖
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token];
      throw new Error(`Circular dependency detected: ${cycle.map(String).join(' -> ')}`);
    }

    // 对于单例，检查是否已有实例
    if (descriptor.scope === ServiceScope.Singleton) {
      const existingInstance = this.instances.get(token);
      if (existingInstance) {
        existingInstance.lastAccessedAt = new Date();
        existingInstance.accessCount++;
        return existingInstance.instance;
      }
    }

    // 创建新实例
    this.resolutionStack.push(token);
    try {
      const startTime = Date.now();
      const instance = await this.createInstanceAsync(descriptor);
      const endTime = Date.now();
      
      this.performanceMetrics.set(token, endTime - startTime);
      
      // 缓存单例实例
      if (descriptor.scope === ServiceScope.Singleton) {
        const serviceInstance: ServiceInstance<T> = {
          instance,
          descriptor,
          lifecycle: ServiceLifecycle.Initialized,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 1
        };
        this.instances.set(token, serviceInstance);
      }

      this.emitEvent(ContainerEventType.ServiceResolved, token, { instance });
      return instance;
    } catch (error) {
      this.emitEvent(ContainerEventType.ServiceFailed, token, undefined, error as Error);
      throw error;
    } finally {
      this.resolutionStack.pop();
    }
  }

  tryResolve<T>(token: ServiceToken<T>): T | null {
    try {
      return this.resolve(token);
    } catch {
      return null;
    }
  }

  lazy<T>(token: ServiceToken<T>): Lazy<T> {
    return new LazyService(this, token);
  }

  // ==================== 服务管理 ====================

  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.services.has(token);
  }

  getServiceInfo<T>(token: ServiceToken<T>): ServiceInstance<T> | null {
    return this.instances.get(token) as ServiceInstance<T> || null;
  }

  getAllServices(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  getDescriptor<T>(token: ServiceToken<T>): ServiceDescriptor<T> | null {
    return this.services.get(token) as ServiceDescriptor<T> || null;
  }

  // ==================== 生命周期管理 ====================

  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    try {
      // 按层级初始化服务
      for (let layer = ServiceLayer.Foundation; layer <= ServiceLayer.Application; layer++) {
        await this.initializeLayer(layer);
      }

      this._isInitialized = true;
      this.emitEvent(ContainerEventType.ContainerInitialized);
    } catch (error) {
      throw new Error(`Container initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async initializeLayer(layer: ServiceLayer): Promise<void> {
    const layerServices = Array.from(this.services.entries())
      .filter(([, descriptor]) => descriptor.layer === layer);

    const initPromises = layerServices.map(async ([token, descriptor]) => {
      try {
        if (descriptor.async) {
          await this.resolveAsync(token);
        } else {
          this.resolve(token);
        }
      } catch (error) {
        console.error(`Failed to initialize service ${String(token)}:`, error);
        throw error;
      }
    });

    await Promise.all(initPromises);
  }

  async dispose(): Promise<void> {
    if (this._isDisposed) {
      return;
    }

    // 销毁所有服务实例
    for (const [token, instance] of this.instances) {
      try {
        if (instance.instance && typeof instance.instance === 'object' && 'dispose' in instance.instance) {
          await (instance.instance as any).dispose();
        }
        instance.lifecycle = ServiceLifecycle.Disposed;
        this.emitEvent(ContainerEventType.ServiceDisposed, token);
      } catch (error) {
        console.error(`Error disposing service ${String(token)}:`, error);
      }
    }

    this.instances.clear();
    this.services.clear();
    this.performanceMetrics.clear();
    this.eventListeners.clear();
    
    this._isDisposed = true;
    this.emitEvent(ContainerEventType.ContainerDisposed);
  }

  reset(): void {
    this.instances.clear();
    this.performanceMetrics.clear();
    this._isInitialized = false;
  }

  // ==================== 私有辅助方法 ====================

  private createInstance<T>(descriptor: ServiceDescriptor<T>): T {
    const result = descriptor.factory(this);
    if (result instanceof Promise) {
      throw new Error(`Async factory used in sync resolution for service ${String(descriptor.token)}`);
    }
    return result;
  }

  private async createInstanceAsync<T>(descriptor: ServiceDescriptor<T>): Promise<T> {
    return await descriptor.factory(this);
  }

  private validateNotDisposed(): void {
    if (this._isDisposed) {
      throw new Error('Container has been disposed');
    }
  }

  private emitEvent(
    type: ContainerEventType,
    serviceToken?: ServiceToken,
    data?: any,
    error?: Error
  ): void {
    const event: ContainerEvent = {
      type,
      serviceToken,
      timestamp: new Date(),
      data,
      error
    };

    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  // ==================== 事件系统 ====================

  addEventListener(type: ContainerEventType, listener: ContainerEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
  }

  removeEventListener(type: ContainerEventType, listener: ContainerEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    }
  }

  // ==================== 依赖验证 ====================

  validateDependencies(): DependencyValidationResult {
    const circularDependencies: CircularDependency[] = [];
    const missingDependencies: MissingDependency[] = [];
    const warnings: string[] = [];

    // 检查循环依赖
    for (const [token, descriptor] of this.services) {
      const visited = new Set<ServiceToken>();
      const path: ServiceToken[] = [];

      if (this.hasCircularDependency(token, visited, path)) {
        circularDependencies.push({
          chain: [...path, token],
          severity: 'error',
          suggestion: 'Consider using lazy injection or breaking the dependency chain'
        });
      }
    }

    // 检查缺失依赖
    for (const [token, descriptor] of this.services) {
      for (const dep of descriptor.dependencies) {
        if (!this.services.has(dep.token)) {
          missingDependencies.push({
            service: token,
            dependency: dep.token,
            optional: dep.optional ?? false
          });
        }
      }
    }

    // 生成警告
    if (this.services.size > 50) {
      warnings.push('Large number of services registered. Consider modularization.');
    }

    const layerCounts = this.getServiceCountsByLayer();
    if (layerCounts[ServiceLayer.Foundation] === 0) {
      warnings.push('No foundation layer services found. Consider adding base services.');
    }

    return {
      isValid: circularDependencies.length === 0 &&
               missingDependencies.filter(d => !d.optional).length === 0,
      circularDependencies,
      missingDependencies,
      warnings
    };
  }

  private hasCircularDependency(
    token: ServiceToken,
    visited: Set<ServiceToken>,
    path: ServiceToken[]
  ): boolean {
    if (path.includes(token)) {
      return true;
    }

    if (visited.has(token)) {
      return false;
    }

    visited.add(token);
    path.push(token);

    const descriptor = this.services.get(token);
    if (descriptor) {
      for (const dep of descriptor.dependencies) {
        if (this.hasCircularDependency(dep.token, visited, path)) {
          return true;
        }
      }
    }

    path.pop();
    return false;
  }

  // ==================== 健康检查 ====================

  getServiceHealth(): ServiceHealthReport {
    const statistics = this.getServiceStatistics();
    const issues = this.getServiceIssues();
    const performance = this.getPerformanceMetrics();

    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (issues.some(i => i.type === 'error')) {
      overall = 'critical';
    } else if (issues.some(i => i.type === 'warning')) {
      overall = 'warning';
    }

    return {
      overall,
      statistics,
      issues,
      performance
    };
  }

  private getServiceStatistics(): ServiceStatistics {
    const totalServices = this.services.size;
    const initializedServices = this.instances.size;
    const failedServices = Array.from(this.instances.values())
      .filter(i => i.lifecycle === ServiceLifecycle.Failed).length;

    const servicesByLayer = this.getServiceCountsByLayer();
    const servicesByScope = this.getServiceCountsByScope();

    return {
      totalServices,
      initializedServices,
      failedServices,
      servicesByLayer,
      servicesByScope
    };
  }

  private getServiceCountsByLayer(): Record<ServiceLayer, number> {
    const counts = {
      [ServiceLayer.Foundation]: 0,
      [ServiceLayer.Business]: 0,
      [ServiceLayer.Composite]: 0,
      [ServiceLayer.Application]: 0
    };

    for (const descriptor of this.services.values()) {
      counts[descriptor.layer]++;
    }

    return counts;
  }

  private getServiceCountsByScope(): Record<ServiceScope, number> {
    const counts = {
      [ServiceScope.Singleton]: 0,
      [ServiceScope.Transient]: 0,
      [ServiceScope.Scoped]: 0
    };

    for (const descriptor of this.services.values()) {
      counts[descriptor.scope]++;
    }

    return counts;
  }

  private getServiceIssues(): ServiceIssue[] {
    const issues: ServiceIssue[] = [];

    // 检查失败的服务
    for (const [token, instance] of this.instances) {
      if (instance.lifecycle === ServiceLifecycle.Failed) {
        issues.push({
          type: 'error',
          service: token,
          message: 'Service initialization failed',
          details: instance.error,
          suggestion: 'Check service dependencies and factory function'
        });
      }
    }

    // 检查性能问题
    const avgInitTime = this.getAverageInitializationTime();
    for (const [token, time] of this.performanceMetrics) {
      if (time > avgInitTime * 3) {
        issues.push({
          type: 'warning',
          service: token,
          message: `Slow initialization time: ${time}ms`,
          suggestion: 'Consider optimizing service factory or using lazy initialization'
        });
      }
    }

    return issues;
  }

  private getPerformanceMetrics(): PerformanceMetrics {
    const times = Array.from(this.performanceMetrics.values());
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const avgTime = times.length > 0 ? totalTime / times.length : 0;

    let slowestService = { token: '' as ServiceToken, time: 0 };
    for (const [token, time] of this.performanceMetrics) {
      if (time > slowestService.time) {
        slowestService = { token, time };
      }
    }

    return {
      totalInitializationTime: totalTime,
      averageInitializationTime: avgTime,
      slowestService,
      memoryUsage: {
        serviceInstances: this.instances.size * 1024, // 估算值
        containerMetadata: this.services.size * 512   // 估算值
      }
    };
  }

  private getAverageInitializationTime(): number {
    const times = Array.from(this.performanceMetrics.values());
    return times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
  }

  // ==================== 调试和诊断 ====================

  getDependencyGraph(): Map<ServiceToken, ServiceToken[]> {
    const graph = new Map<ServiceToken, ServiceToken[]>();

    for (const [token, descriptor] of this.services) {
      graph.set(token, descriptor.dependencies.map(d => d.token));
    }

    return graph;
  }

  getInitializationOrder(): ServiceToken[] {
    const order: ServiceToken[] = [];
    const layers = [
      ServiceLayer.Foundation,
      ServiceLayer.Business,
      ServiceLayer.Composite,
      ServiceLayer.Application
    ];

    for (const layer of layers) {
      const layerServices = Array.from(this.services.entries())
        .filter(([, descriptor]) => descriptor.layer === layer)
        .map(([token]) => token);
      order.push(...layerServices);
    }

    return order;
  }
}
