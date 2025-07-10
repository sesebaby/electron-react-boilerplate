/**
 * 服务容器依赖注入系统 - 统一入口
 *
 * 导出所有容器相关的类型、类和工具函数
 */

import 'reflect-metadata';

// 核心类型定义
export * from './types';

// 服务容器核心实现
export { ServiceContainer } from './ServiceContainer';

// 依赖解析器
export { 
  DependencyResolver, 
  ResolutionStrategy,
  type ResolutionResult,
  type ResolverConfig 
} from './DependencyResolver';

// 服务代理机制
export { 
  ServiceProxyFactory, 
  ProxyState 
} from './ServiceProxy';

// 便利函数和工具
import { ServiceContainer } from './ServiceContainer';
import { DependencyResolver, ResolutionStrategy } from './DependencyResolver';
import { ServiceProxyFactory } from './ServiceProxy';
import { 
  ServiceScope, 
  ServiceLayer, 
  ServiceToken, 
  ServiceFactory,
  ServiceRegistrationOptions,
  IServiceContainer 
} from './types';

/**
 * 创建默认配置的服务容器
 */
export function createContainer(): ServiceContainer {
  return new ServiceContainer();
}

/**
 * 创建带有依赖解析器的服务容器
 */
export function createContainerWithResolver(
  resolverConfig?: Partial<import('./DependencyResolver').ResolverConfig>
): { container: ServiceContainer; resolver: DependencyResolver } {
  const container = new ServiceContainer();
  const resolver = new DependencyResolver(resolverConfig);
  
  return { container, resolver };
}

/**
 * 服务注册装饰器工厂
 */
export function Service(options: {
  token?: ServiceToken;
  scope?: ServiceScope;
  layer?: ServiceLayer;
} = {}) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    const token = options.token || constructor.name;
    const scope = options.scope || ServiceScope.Singleton;
    const layer = options.layer || ServiceLayer.Business;

    // 将装饰器信息附加到构造函数
    (constructor as any).__serviceMetadata = {
      token,
      scope,
      layer,
      constructor
    };

    return constructor;
  };
}

/**
 * 依赖注入装饰器
 */
export function Inject(token: ServiceToken) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const existingTokens = Reflect.getMetadata('design:paramtypes', target) || [];
    const injectionTokens = Reflect.getMetadata('injection:tokens', target) || [];
    
    injectionTokens[parameterIndex] = token;
    Reflect.defineMetadata('injection:tokens', injectionTokens, target);
  };
}

/**
 * 可选依赖注入装饰器
 */
export function Optional(token: ServiceToken) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const optionalTokens = Reflect.getMetadata('injection:optional', target) || [];
    optionalTokens[parameterIndex] = token;
    Reflect.defineMetadata('injection:optional', optionalTokens, target);
  };
}

/**
 * 延迟依赖注入装饰器
 */
export function Lazy(token: ServiceToken) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const lazyTokens = Reflect.getMetadata('injection:lazy', target) || [];
    lazyTokens[parameterIndex] = token;
    Reflect.defineMetadata('injection:lazy', lazyTokens, target);
  };
}

/**
 * 自动注册服务到容器
 */
export function autoRegisterServices(
  container: ServiceContainer,
  services: (new (...args: any[]) => any)[]
): void {
  for (const serviceClass of services) {
    const metadata = (serviceClass as any).__serviceMetadata;
    if (metadata) {
      const { token, scope, layer } = metadata;
      
      container.register(
        token,
        (c) => {
          // 获取构造函数参数类型
          const paramTypes = Reflect.getMetadata('design:paramtypes', serviceClass) || [];
          const injectionTokens = Reflect.getMetadata('injection:tokens', serviceClass) || [];
          const optionalTokens = Reflect.getMetadata('injection:optional', serviceClass) || [];
          const lazyTokens = Reflect.getMetadata('injection:lazy', serviceClass) || [];
          
          // 解析依赖
          const args = paramTypes.map((type: any, index: number) => {
            const injectionToken = injectionTokens[index] || type;
            const isOptional = optionalTokens.includes(injectionToken);
            const isLazy = lazyTokens.includes(injectionToken);
            
            if (isLazy) {
              return c.lazy(injectionToken);
            } else if (isOptional) {
              return c.tryResolve(injectionToken);
            } else {
              return c.resolve(injectionToken);
            }
          });
          
          return new serviceClass(...args);
        },
        { scope, layer }
      );
    }
  }
}

/**
 * 服务容器构建器
 */
export class ContainerBuilder {
  private readonly container = new ServiceContainer();
  private readonly resolver = new DependencyResolver();
  private readonly proxyFactory = new ServiceProxyFactory(this.container);

  /**
   * 注册单例服务
   */
  singleton<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options?: Omit<ServiceRegistrationOptions, 'scope'>
  ): ContainerBuilder {
    this.container.registerSingleton(token, factory, options);
    return this;
  }

  /**
   * 注册瞬态服务
   */
  transient<T>(
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    options?: Omit<ServiceRegistrationOptions, 'scope'>
  ): ContainerBuilder {
    this.container.registerTransient(token, factory, options);
    return this;
  }

  /**
   * 注册服务类
   */
  registerClass<T>(
    token: ServiceToken<T>,
    serviceClass: new (...args: any[]) => T,
    options?: ServiceRegistrationOptions
  ): ContainerBuilder {
    this.container.register(
      token,
      (container) => {
        // 这里可以添加自动依赖注入逻辑
        return new serviceClass();
      },
      options
    );
    return this;
  }

  /**
   * 注册代理服务（用于解决循环依赖）
   */
  proxy<T>(
    token: ServiceToken<T>,
    targetToken: ServiceToken<T>,
    options?: ServiceRegistrationOptions
  ): ContainerBuilder {
    const proxy = this.proxyFactory.createProxy<T>({
      targetToken,
      lazyTarget: true
    });

    this.container.register(
      token,
      () => proxy,
      { scope: ServiceScope.Singleton, ...options }
    );

    return this;
  }

  /**
   * 批量注册服务
   */
  registerServices(services: (new (...args: any[]) => any)[]): ContainerBuilder {
    autoRegisterServices(this.container, services);
    return this;
  }

  /**
   * 构建并返回容器
   */
  build(): {
    container: ServiceContainer;
    resolver: DependencyResolver;
    proxyFactory: ServiceProxyFactory;
  } {
    return {
      container: this.container,
      resolver: this.resolver,
      proxyFactory: this.proxyFactory
    };
  }

  /**
   * 构建、验证并初始化容器
   */
  async buildAndInitialize(): Promise<{
    container: ServiceContainer;
    resolver: DependencyResolver;
    proxyFactory: ServiceProxyFactory;
  }> {
    const result = this.build();
    
    // 验证依赖关系
    const validation = result.container.validateDependencies();
    if (!validation.isValid) {
      const errors = validation.circularDependencies
        .filter(cd => cd.severity === 'error')
        .map(cd => `Circular dependency: ${cd.chain.map(String).join(' -> ')}`);
      
      if (errors.length > 0) {
        throw new Error(`Container validation failed:\n${errors.join('\n')}`);
      }
    }

    // 初始化容器
    await result.container.initialize();

    return result;
  }
}

/**
 * 创建容器构建器
 */
export function createContainerBuilder(): ContainerBuilder {
  return new ContainerBuilder();
}

// 默认导出主要类
export default ServiceContainer;
