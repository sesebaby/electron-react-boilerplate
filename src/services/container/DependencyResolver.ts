/**
 * 依赖解析器
 * 
 * 负责分析和解析服务依赖关系，包括：
 * - 依赖图构建
 * - 循环依赖检测
 * - 初始化顺序计算
 * - 依赖注入策略
 */

import {
  ServiceToken,
  ServiceDescriptor,
  DependencyDescriptor,
  ServiceLayer,
  CircularDependency,
  MissingDependency
} from './types';

/**
 * 依赖图节点
 */
interface DependencyNode {
  token: ServiceToken;
  descriptor: ServiceDescriptor;
  dependencies: ServiceToken[];
  dependents: ServiceToken[];
  layer: ServiceLayer;
  visited: boolean;
  inStack: boolean;
}

/**
 * 解析结果
 */
export interface ResolutionResult {
  /** 初始化顺序 */
  initializationOrder: ServiceToken[];
  /** 循环依赖 */
  circularDependencies: CircularDependency[];
  /** 缺失依赖 */
  missingDependencies: MissingDependency[];
  /** 依赖层级 */
  dependencyLevels: Map<ServiceToken, number>;
}

/**
 * 依赖解析策略
 */
export enum ResolutionStrategy {
  /** 严格模式 - 不允许任何循环依赖 */
  Strict = 'strict',
  /** 宽松模式 - 允许通过代理解决的循环依赖 */
  Lenient = 'lenient',
  /** 自动模式 - 自动选择最佳策略 */
  Auto = 'auto'
}

/**
 * 依赖解析器配置
 */
export interface ResolverConfig {
  /** 解析策略 */
  strategy: ResolutionStrategy;
  /** 最大依赖深度 */
  maxDepth: number;
  /** 是否允许可选依赖缺失 */
  allowMissingOptionalDependencies: boolean;
  /** 是否自动推断服务层级 */
  autoInferLayers: boolean;
}

/**
 * 依赖解析器实现
 */
export class DependencyResolver {
  private readonly config: ResolverConfig;
  private dependencyGraph = new Map<ServiceToken, DependencyNode>();

  constructor(config: Partial<ResolverConfig> = {}) {
    this.config = {
      strategy: ResolutionStrategy.Auto,
      maxDepth: 10,
      allowMissingOptionalDependencies: true,
      autoInferLayers: true,
      ...config
    };
  }

  /**
   * 解析服务依赖关系
   */
  resolve(services: Map<ServiceToken, ServiceDescriptor>): ResolutionResult {
    // 构建依赖图
    this.buildDependencyGraph(services);

    // 检测循环依赖
    const circularDependencies = this.detectCircularDependencies();

    // 检查缺失依赖
    const missingDependencies = this.findMissingDependencies();

    // 计算初始化顺序
    const initializationOrder = this.calculateInitializationOrder();

    // 计算依赖层级
    const dependencyLevels = this.calculateDependencyLevels();

    return {
      initializationOrder,
      circularDependencies,
      missingDependencies,
      dependencyLevels
    };
  }

  /**
   * 构建依赖图
   */
  private buildDependencyGraph(services: Map<ServiceToken, ServiceDescriptor>): void {
    this.dependencyGraph.clear();

    // 创建节点
    for (const [token, descriptor] of services) {
      const node: DependencyNode = {
        token,
        descriptor,
        dependencies: descriptor.dependencies.map(d => d.token),
        dependents: [],
        layer: descriptor.layer,
        visited: false,
        inStack: false
      };
      this.dependencyGraph.set(token, node);
    }

    // 建立依赖关系
    for (const node of this.dependencyGraph.values()) {
      for (const depToken of node.dependencies) {
        const depNode = this.dependencyGraph.get(depToken);
        if (depNode) {
          depNode.dependents.push(node.token);
        }
      }
    }

    // 自动推断层级
    if (this.config.autoInferLayers) {
      this.inferServiceLayers();
    }
  }

  /**
   * 自动推断服务层级
   */
  private inferServiceLayers(): void {
    const visited = new Set<ServiceToken>();
    
    for (const node of this.dependencyGraph.values()) {
      if (!visited.has(node.token)) {
        this.inferNodeLayer(node, visited, 0);
      }
    }
  }

  private inferNodeLayer(node: DependencyNode, visited: Set<ServiceToken>, depth: number): number {
    if (visited.has(node.token)) {
      return node.layer;
    }

    if (depth > this.config.maxDepth) {
      throw new Error(`Maximum dependency depth exceeded for service ${String(node.token)}`);
    }

    visited.add(node.token);

    let maxDepLayer = ServiceLayer.Foundation;
    for (const depToken of node.dependencies) {
      const depNode = this.dependencyGraph.get(depToken);
      if (depNode) {
        const depLayer = this.inferNodeLayer(depNode, visited, depth + 1);
        maxDepLayer = Math.max(maxDepLayer, depLayer);
      }
    }

    // 当前节点的层级应该比其依赖的最高层级高一级
    node.layer = Math.min(maxDepLayer + 1, ServiceLayer.Application);
    node.descriptor.layer = node.layer;

    return node.layer;
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependencies(): CircularDependency[] {
    const circularDependencies: CircularDependency[] = [];
    const visited = new Set<ServiceToken>();
    const stack: ServiceToken[] = [];

    for (const node of this.dependencyGraph.values()) {
      if (!visited.has(node.token)) {
        this.dfsCircularDetection(node, visited, stack, circularDependencies);
      }
    }

    return circularDependencies;
  }

  private dfsCircularDetection(
    node: DependencyNode,
    visited: Set<ServiceToken>,
    stack: ServiceToken[],
    circularDependencies: CircularDependency[]
  ): void {
    visited.add(node.token);
    stack.push(node.token);
    node.inStack = true;

    for (const depToken of node.dependencies) {
      const depNode = this.dependencyGraph.get(depToken);
      if (!depNode) continue;

      if (depNode.inStack) {
        // 找到循环依赖
        const cycleStart = stack.indexOf(depToken);
        const cycle = stack.slice(cycleStart).concat(depToken);
        
        circularDependencies.push({
          chain: cycle,
          severity: this.config.strategy === ResolutionStrategy.Strict ? 'error' : 'warning',
          suggestion: this.getSuggestionForCircularDependency(cycle)
        });
      } else if (!visited.has(depToken)) {
        this.dfsCircularDetection(depNode, visited, stack, circularDependencies);
      }
    }

    stack.pop();
    node.inStack = false;
  }

  private getSuggestionForCircularDependency(cycle: ServiceToken[]): string {
    if (cycle.length === 2) {
      return 'Consider using lazy injection or breaking the direct dependency';
    } else if (cycle.length <= 4) {
      return 'Consider introducing an interface or using event-driven communication';
    } else {
      return 'Complex circular dependency detected. Consider architectural refactoring';
    }
  }

  /**
   * 查找缺失依赖
   */
  private findMissingDependencies(): MissingDependency[] {
    const missingDependencies: MissingDependency[] = [];

    for (const node of this.dependencyGraph.values()) {
      for (const dependency of node.descriptor.dependencies) {
        if (!this.dependencyGraph.has(dependency.token)) {
          if (!dependency.optional || !this.config.allowMissingOptionalDependencies) {
            missingDependencies.push({
              service: node.token,
              dependency: dependency.token,
              optional: dependency.optional ?? false
            });
          }
        }
      }
    }

    return missingDependencies;
  }

  /**
   * 计算初始化顺序
   */
  private calculateInitializationOrder(): ServiceToken[] {
    const order: ServiceToken[] = [];
    const visited = new Set<ServiceToken>();
    const temp = new Set<ServiceToken>();

    // 按层级分组
    const servicesByLayer = new Map<ServiceLayer, ServiceToken[]>();
    for (const node of this.dependencyGraph.values()) {
      if (!servicesByLayer.has(node.layer)) {
        servicesByLayer.set(node.layer, []);
      }
      servicesByLayer.get(node.layer)!.push(node.token);
    }

    // 按层级顺序处理
    const layers = [
      ServiceLayer.Foundation,
      ServiceLayer.Business,
      ServiceLayer.Composite,
      ServiceLayer.Application
    ];

    for (const layer of layers) {
      const layerServices = servicesByLayer.get(layer) || [];
      
      // 在每个层级内进行拓扑排序
      for (const token of layerServices) {
        if (!visited.has(token)) {
          this.topologicalSort(token, visited, temp, order);
        }
      }
    }

    return order;
  }

  private topologicalSort(
    token: ServiceToken,
    visited: Set<ServiceToken>,
    temp: Set<ServiceToken>,
    order: ServiceToken[]
  ): void {
    if (temp.has(token)) {
      // 检测到循环依赖，跳过
      return;
    }

    if (visited.has(token)) {
      return;
    }

    temp.add(token);
    const node = this.dependencyGraph.get(token);
    
    if (node) {
      for (const depToken of node.dependencies) {
        if (this.dependencyGraph.has(depToken)) {
          this.topologicalSort(depToken, visited, temp, order);
        }
      }
    }

    temp.delete(token);
    visited.add(token);
    order.push(token);
  }

  /**
   * 计算依赖层级
   */
  private calculateDependencyLevels(): Map<ServiceToken, number> {
    const levels = new Map<ServiceToken, number>();
    const visited = new Set<ServiceToken>();

    for (const node of this.dependencyGraph.values()) {
      if (!visited.has(node.token)) {
        this.calculateNodeLevel(node, levels, visited);
      }
    }

    return levels;
  }

  private calculateNodeLevel(
    node: DependencyNode,
    levels: Map<ServiceToken, number>,
    visited: Set<ServiceToken>
  ): number {
    if (levels.has(node.token)) {
      return levels.get(node.token)!;
    }

    if (visited.has(node.token)) {
      // 循环依赖，返回默认层级
      return 0;
    }

    visited.add(node.token);

    let maxDepLevel = -1;
    for (const depToken of node.dependencies) {
      const depNode = this.dependencyGraph.get(depToken);
      if (depNode) {
        const depLevel = this.calculateNodeLevel(depNode, levels, visited);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }
    }

    const level = maxDepLevel + 1;
    levels.set(node.token, level);
    return level;
  }

  /**
   * 获取依赖图的统计信息
   */
  getGraphStatistics(): {
    totalNodes: number;
    totalEdges: number;
    averageDependencies: number;
    maxDependencies: number;
    layerDistribution: Record<ServiceLayer, number>;
  } {
    const totalNodes = this.dependencyGraph.size;
    let totalEdges = 0;
    let maxDependencies = 0;
    const layerDistribution = {
      [ServiceLayer.Foundation]: 0,
      [ServiceLayer.Business]: 0,
      [ServiceLayer.Composite]: 0,
      [ServiceLayer.Application]: 0
    };

    for (const node of this.dependencyGraph.values()) {
      totalEdges += node.dependencies.length;
      maxDependencies = Math.max(maxDependencies, node.dependencies.length);
      layerDistribution[node.layer]++;
    }

    return {
      totalNodes,
      totalEdges,
      averageDependencies: totalNodes > 0 ? totalEdges / totalNodes : 0,
      maxDependencies,
      layerDistribution
    };
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.dependencyGraph.clear();
  }
}
