/**
 * 服务容器 - 依赖注入容器
 * 用于解决循环依赖问题，实现服务的分层初始化
 */

export interface ServiceFactory<T = any> {
  (): T;
}

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton?: boolean;
  dependencies?: string[];
  layer?: number; // 初始化层级
}

export class ServiceContainer {
  private services = new Map<string, ServiceDefinition>();
  private instances = new Map<string, any>();
  private initializedServices = new Set<string>();
  private initializationPromises = new Map<string, Promise<any>>();

  /**
   * 注册服务
   */
  register<T>(token: string, definition: ServiceDefinition<T>): void {
    this.services.set(token, definition);
  }

  /**
   * 注册单例服务
   */
  registerSingleton<T>(token: string, factory: ServiceFactory<T>, dependencies: string[] = [], layer: number = 0): void {
    this.register(token, {
      factory,
      singleton: true,
      dependencies,
      layer
    });
  }

  /**
   * 解析服务
   */
  async resolve<T>(token: string): Promise<T> {
    // 如果是单例且已经实例化，直接返回
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    // 如果正在初始化，等待完成
    if (this.initializationPromises.has(token)) {
      return await this.initializationPromises.get(token);
    }

    const definition = this.services.get(token);
    if (!definition) {
      throw new Error(`Service '${token}' not found`);
    }

    // 创建初始化Promise
    const initPromise = this.createInstance(token, definition);
    this.initializationPromises.set(token, initPromise);

    try {
      const instance = await initPromise;
      
      // 如果是单例，缓存实例
      if (definition.singleton !== false) {
        this.instances.set(token, instance);
      }
      
      this.initializedServices.add(token);
      return instance;
    } finally {
      this.initializationPromises.delete(token);
    }
  }

  /**
   * 创建服务实例
   */
  private async createInstance<T>(token: string, definition: ServiceDefinition<T>): Promise<T> {
    // 首先解析所有依赖
    const dependencies = definition.dependencies || [];
    const resolvedDependencies = await Promise.all(
      dependencies.map(dep => this.resolve(dep))
    );

    // 创建实例
    const instance = definition.factory();

    // 如果实例有initialize方法，调用它
    if (instance && typeof instance.initialize === 'function') {
      await instance.initialize();
    }

    return instance;
  }

  /**
   * 分层初始化所有服务
   */
  async initializeAllServices(): Promise<void> {
    const servicesByLayer = new Map<number, string[]>();
    
    // 按层级分组服务
    for (const [token, definition] of this.services) {
      const layer = definition.layer || 0;
      if (!servicesByLayer.has(layer)) {
        servicesByLayer.set(layer, []);
      }
      servicesByLayer.get(layer)!.push(token);
    }

    // 按层级顺序初始化
    const layers = Array.from(servicesByLayer.keys()).sort((a, b) => a - b);
    
    for (const layer of layers) {
      console.log(`正在初始化第 ${layer} 层服务...`);
      const layerServices = servicesByLayer.get(layer)!;
      
      // 并行初始化同层级的服务
      await Promise.all(
        layerServices.map(token => this.resolve(token))
      );
      
      console.log(`第 ${layer} 层服务初始化完成`);
    }
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): {
    registered: number;
    initialized: number;
    services: Array<{
      name: string;
      layer: number;
      status: 'registered' | 'initialized' | 'initializing';
      dependencies: string[];
    }>;
  } {
    const services: Array<{
      name: string;
      layer: number;
      status: 'registered' | 'initialized' | 'initializing';
      dependencies: string[];
    }> = [];

    for (const [token, definition] of this.services) {
      services.push({
        name: token,
        layer: definition.layer || 0,
        status: this.initializedServices.has(token) 
          ? 'initialized' 
          : this.initializationPromises.has(token) 
            ? 'initializing' 
            : 'registered',
        dependencies: definition.dependencies || []
      });
    }

    return {
      registered: this.services.size,
      initialized: this.initializedServices.size,
      services: services.sort((a, b) => a.layer - b.layer)
    };
  }

  /**
   * 检查循环依赖
   */
  checkCircularDependencies(): { hasCircular: boolean; cycles: string[][] } {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (token: string, path: string[]): void => {
      if (recursionStack.has(token)) {
        // 找到循环依赖
        const cycleStart = path.indexOf(token);
        cycles.push([...path.slice(cycleStart), token]);
        return;
      }

      if (visited.has(token)) {
        return;
      }

      visited.add(token);
      recursionStack.add(token);

      const definition = this.services.get(token);
      if (definition && definition.dependencies) {
        for (const dep of definition.dependencies) {
          dfs(dep, [...path, token]);
        }
      }

      recursionStack.delete(token);
    };

    for (const token of this.services.keys()) {
      if (!visited.has(token)) {
        dfs(token, []);
      }
    }

    return {
      hasCircular: cycles.length > 0,
      cycles
    };
  }

  /**
   * 清理所有服务
   */
  clear(): void {
    this.services.clear();
    this.instances.clear();
    this.initializedServices.clear();
    this.initializationPromises.clear();
  }

  /**
   * 重置服务容器
   */
  reset(): void {
    this.instances.clear();
    this.initializedServices.clear();
    this.initializationPromises.clear();
  }
}

// 创建全局服务容器实例
export const serviceContainer = new ServiceContainer();

// 服务注册辅助函数
export function registerService<T>(
  token: string,
  factory: ServiceFactory<T>,
  dependencies: string[] = [],
  layer: number = 0
): void {
  serviceContainer.registerSingleton(token, factory, dependencies, layer);
}

export default serviceContainer;