/**
 * 服务代理机制
 * 
 * 用于处理循环依赖问题，提供：
 * - 延迟服务初始化
 * - 透明代理访问
 * - 循环依赖解决
 * - 代理生命周期管理
 */

import { ServiceToken, ServiceProxyConfig, IServiceContainer } from './types';

/**
 * 代理状态枚举
 */
export enum ProxyState {
  /** 未初始化 */
  Uninitialized = 'uninitialized',
  /** 正在初始化 */
  Initializing = 'initializing',
  /** 已初始化 */
  Initialized = 'initialized',
  /** 初始化失败 */
  Failed = 'failed'
}

/**
 * 代理元数据
 */
interface ProxyMetadata {
  targetToken: ServiceToken;
  state: ProxyState;
  target: any;
  error?: Error;
  accessCount: number;
  createdAt: Date;
  initializedAt?: Date;
}

/**
 * 服务代理工厂
 */
export class ServiceProxyFactory {
  private readonly container: IServiceContainer;
  private readonly proxies = new Map<ServiceToken, any>();
  private readonly metadata = new Map<ServiceToken, ProxyMetadata>();

  constructor(container: IServiceContainer) {
    this.container = container;
  }

  /**
   * 创建服务代理
   */
  createProxy<T>(config: ServiceProxyConfig): T {
    const { targetToken, methods = [], properties = [], lazyTarget = true } = config;

    if (this.proxies.has(targetToken)) {
      return this.proxies.get(targetToken);
    }

    const metadata: ProxyMetadata = {
      targetToken,
      state: ProxyState.Uninitialized,
      target: null,
      accessCount: 0,
      createdAt: new Date()
    };

    this.metadata.set(targetToken, metadata);

    const proxy = new Proxy({} as object, {
      get: (target, prop, receiver) => {
        return this.handleGet(targetToken, prop, receiver, metadata);
      },
      
      set: (target, prop, value, receiver) => {
        return this.handleSet(targetToken, prop, value, receiver, metadata);
      },
      
      has: (target, prop) => {
        return this.handleHas(targetToken, prop, metadata);
      },
      
      ownKeys: (target) => {
        return this.handleOwnKeys(targetToken, metadata);
      },
      
      getOwnPropertyDescriptor: (target, prop) => {
        return this.handleGetOwnPropertyDescriptor(targetToken, prop, metadata);
      },
      
      apply: (target, thisArg, argArray) => {
        return this.handleApply(targetToken, thisArg, argArray, metadata);
      }
    });

    this.proxies.set(targetToken, proxy);

    // 如果不是延迟初始化，立即初始化目标服务
    if (!lazyTarget) {
      this.initializeTarget(targetToken, metadata);
    }

    return proxy as T;
  }

  /**
   * 处理属性访问
   */
  private handleGet(
    targetToken: ServiceToken,
    prop: string | symbol,
    receiver: any,
    metadata: ProxyMetadata
  ): any {
    metadata.accessCount++;

    // 特殊属性处理
    if (prop === Symbol.toStringTag) {
      return `ServiceProxy(${String(targetToken)})`;
    }

    if (prop === 'constructor') {
      this.ensureTargetInitialized(targetToken, metadata);
      return metadata.target?.constructor;
    }

    if (typeof prop === 'string' && prop.startsWith('__proxy_')) {
      return this.handleProxyInternalProperty(prop, metadata);
    }

    // 确保目标服务已初始化
    this.ensureTargetInitialized(targetToken, metadata);

    if (metadata.state === ProxyState.Failed) {
      throw new Error(`Service ${String(targetToken)} initialization failed: ${metadata.error?.message}`);
    }

    const target = metadata.target;
    if (!target) {
      throw new Error(`Service ${String(targetToken)} is not available`);
    }

    const value = target[prop];

    // 如果是方法，绑定正确的this上下文
    if (typeof value === 'function') {
      return value.bind(target);
    }

    return value;
  }

  /**
   * 处理属性设置
   */
  private handleSet(
    targetToken: ServiceToken,
    prop: string | symbol,
    value: any,
    receiver: any,
    metadata: ProxyMetadata
  ): boolean {
    this.ensureTargetInitialized(targetToken, metadata);

    if (metadata.state === ProxyState.Failed) {
      throw new Error(`Service ${String(targetToken)} initialization failed`);
    }

    const target = metadata.target;
    if (!target) {
      return false;
    }

    target[prop] = value;
    return true;
  }

  /**
   * 处理属性存在性检查
   */
  private handleHas(
    targetToken: ServiceToken,
    prop: string | symbol,
    metadata: ProxyMetadata
  ): boolean {
    if (typeof prop === 'string' && prop.startsWith('__proxy_')) {
      return true;
    }

    this.ensureTargetInitialized(targetToken, metadata);

    const target = metadata.target;
    if (!target) {
      return false;
    }

    return prop in target;
  }

  /**
   * 处理属性枚举
   */
  private handleOwnKeys(
    targetToken: ServiceToken,
    metadata: ProxyMetadata
  ): (string | symbol)[] {
    this.ensureTargetInitialized(targetToken, metadata);

    const target = metadata.target;
    if (!target) {
      return [];
    }

    return Reflect.ownKeys(target);
  }

  /**
   * 处理属性描述符获取
   */
  private handleGetOwnPropertyDescriptor(
    targetToken: ServiceToken,
    prop: string | symbol,
    metadata: ProxyMetadata
  ): PropertyDescriptor | undefined {
    this.ensureTargetInitialized(targetToken, metadata);

    const target = metadata.target;
    if (!target) {
      return undefined;
    }

    return Reflect.getOwnPropertyDescriptor(target, prop);
  }

  /**
   * 处理函数调用
   */
  private handleApply(
    targetToken: ServiceToken,
    thisArg: any,
    argArray: any[],
    metadata: ProxyMetadata
  ): any {
    this.ensureTargetInitialized(targetToken, metadata);

    const target = metadata.target;
    if (!target || typeof target !== 'function') {
      throw new Error(`Service ${String(targetToken)} is not callable`);
    }

    return target.apply(thisArg, argArray);
  }

  /**
   * 处理代理内部属性
   */
  private handleProxyInternalProperty(prop: string, metadata: ProxyMetadata): any {
    switch (prop) {
      case '__proxy_state':
        return metadata.state;
      case '__proxy_target_token':
        return metadata.targetToken;
      case '__proxy_access_count':
        return metadata.accessCount;
      case '__proxy_created_at':
        return metadata.createdAt;
      case '__proxy_initialized_at':
        return metadata.initializedAt;
      case '__proxy_error':
        return metadata.error;
      default:
        return undefined;
    }
  }

  /**
   * 确保目标服务已初始化
   */
  private ensureTargetInitialized(targetToken: ServiceToken, metadata: ProxyMetadata): void {
    if (metadata.state === ProxyState.Uninitialized) {
      this.initializeTarget(targetToken, metadata);
    }
  }

  /**
   * 初始化目标服务
   */
  private initializeTarget(targetToken: ServiceToken, metadata: ProxyMetadata): void {
    if (metadata.state !== ProxyState.Uninitialized) {
      return;
    }

    metadata.state = ProxyState.Initializing;

    try {
      // 尝试解析目标服务
      const target = this.container.resolve(targetToken);
      metadata.target = target;
      metadata.state = ProxyState.Initialized;
      metadata.initializedAt = new Date();
    } catch (error) {
      metadata.error = error as Error;
      metadata.state = ProxyState.Failed;
      console.error(`Failed to initialize proxy target ${String(targetToken)}:`, error);
    }
  }

  /**
   * 获取代理状态
   */
  getProxyState(targetToken: ServiceToken): ProxyState | null {
    const metadata = this.metadata.get(targetToken);
    return metadata ? metadata.state : null;
  }

  /**
   * 获取代理元数据
   */
  getProxyMetadata(targetToken: ServiceToken): ProxyMetadata | null {
    return this.metadata.get(targetToken) || null;
  }

  /**
   * 获取所有代理的统计信息
   */
  getProxyStatistics(): {
    totalProxies: number;
    initializedProxies: number;
    failedProxies: number;
    totalAccessCount: number;
    averageAccessCount: number;
  } {
    const totalProxies = this.metadata.size;
    let initializedProxies = 0;
    let failedProxies = 0;
    let totalAccessCount = 0;

    for (const metadata of this.metadata.values()) {
      if (metadata.state === ProxyState.Initialized) {
        initializedProxies++;
      } else if (metadata.state === ProxyState.Failed) {
        failedProxies++;
      }
      totalAccessCount += metadata.accessCount;
    }

    return {
      totalProxies,
      initializedProxies,
      failedProxies,
      totalAccessCount,
      averageAccessCount: totalProxies > 0 ? totalAccessCount / totalProxies : 0
    };
  }

  /**
   * 重置代理状态
   */
  resetProxy(targetToken: ServiceToken): void {
    const metadata = this.metadata.get(targetToken);
    if (metadata) {
      metadata.state = ProxyState.Uninitialized;
      metadata.target = null;
      metadata.error = undefined;
      metadata.accessCount = 0;
      metadata.initializedAt = undefined;
    }
  }

  /**
   * 销毁代理
   */
  destroyProxy(targetToken: ServiceToken): void {
    this.proxies.delete(targetToken);
    this.metadata.delete(targetToken);
  }

  /**
   * 销毁所有代理
   */
  destroyAllProxies(): void {
    this.proxies.clear();
    this.metadata.clear();
  }
}
