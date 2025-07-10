/**
 * 服务容器依赖注入系统 - 核心类型定义
 * 
 * 提供完整的类型安全的依赖注入容器实现
 * 支持循环依赖检测、分层初始化、生命周期管理等高级特性
 */

// ==================== 基础类型定义 ====================

/**
 * 服务标识符类型
 * 支持字符串和Symbol作为服务标识
 */
export type ServiceToken<T = any> = string | symbol | (new (...args: any[]) => T);

/**
 * 服务作用域枚举
 * 定义服务实例的生命周期管理策略
 */
export enum ServiceScope {
  /** 单例模式 - 整个应用生命周期内只创建一个实例 */
  Singleton = 'singleton',
  /** 瞬态模式 - 每次请求都创建新实例 */
  Transient = 'transient',
  /** 作用域模式 - 在特定作用域内共享实例 */
  Scoped = 'scoped'
}

/**
 * 服务生命周期状态
 */
export enum ServiceLifecycle {
  /** 未注册 */
  NotRegistered = 'not_registered',
  /** 已注册但未初始化 */
  Registered = 'registered',
  /** 正在初始化 */
  Initializing = 'initializing',
  /** 已初始化 */
  Initialized = 'initialized',
  /** 初始化失败 */
  Failed = 'failed',
  /** 已销毁 */
  Disposed = 'disposed'
}

/**
 * 服务初始化层级
 * 用于分层初始化，解决复杂依赖关系
 */
export enum ServiceLayer {
  /** 基础服务层 - 无依赖或最少依赖的服务 */
  Foundation = 1,
  /** 业务服务层 - 依赖基础服务的业务逻辑服务 */
  Business = 2,
  /** 复合服务层 - 依赖多个业务服务的复杂服务 */
  Composite = 3,
  /** 应用服务层 - 最高层的应用级服务 */
  Application = 4
}

// ==================== 工厂函数类型 ====================

/**
 * 服务工厂函数类型
 * 用于创建服务实例
 */
export type ServiceFactory<T> = (container: IServiceContainer) => T | Promise<T>;

/**
 * 异步服务工厂函数类型
 */
export type AsyncServiceFactory<T> = (container: IServiceContainer) => Promise<T>;

/**
 * 服务构造函数类型
 */
export type ServiceConstructor<T> = new (...args: any[]) => T;

// ==================== 依赖注入相关类型 ====================

/**
 * 依赖描述符
 * 描述服务的依赖关系
 */
export interface DependencyDescriptor {
  /** 依赖的服务标识 */
  token: ServiceToken;
  /** 是否为可选依赖 */
  optional?: boolean;
  /** 是否为延迟依赖 */
  lazy?: boolean;
}

/**
 * 服务注册描述符
 * 完整描述一个服务的注册信息
 */
export interface ServiceDescriptor<T = any> {
  /** 服务标识 */
  token: ServiceToken<T>;
  /** 服务工厂函数 */
  factory: ServiceFactory<T>;
  /** 服务作用域 */
  scope: ServiceScope;
  /** 服务层级 */
  layer: ServiceLayer;
  /** 依赖列表 */
  dependencies: DependencyDescriptor[];
  /** 是否需要异步初始化 */
  async: boolean;
  /** 服务元数据 */
  metadata?: ServiceMetadata;
}

/**
 * 服务元数据
 */
export interface ServiceMetadata {
  /** 服务名称 */
  name?: string;
  /** 服务描述 */
  description?: string;
  /** 服务版本 */
  version?: string;
  /** 服务标签 */
  tags?: string[];
  /** 自定义属性 */
  [key: string]: any;
}

// ==================== 服务实例管理 ====================

/**
 * 服务实例信息
 */
export interface ServiceInstance<T = any> {
  /** 服务实例 */
  instance: T;
  /** 服务描述符 */
  descriptor: ServiceDescriptor<T>;
  /** 当前生命周期状态 */
  lifecycle: ServiceLifecycle;
  /** 创建时间 */
  createdAt: Date;
  /** 最后访问时间 */
  lastAccessedAt: Date;
  /** 访问次数 */
  accessCount: number;
  /** 初始化错误（如果有） */
  error?: Error;
}

// ==================== 延迟加载和代理 ====================

/**
 * 延迟加载包装器
 * 用于延迟初始化服务
 */
export interface Lazy<T> {
  /** 获取服务实例 */
  getValue(): T | Promise<T>;
  /** 是否已初始化 */
  isInitialized(): boolean;
  /** 重置延迟加载状态 */
  reset(): void;
}

/**
 * 服务代理配置
 * 用于处理循环依赖
 */
export interface ServiceProxyConfig {
  /** 目标服务标识 */
  targetToken: ServiceToken;
  /** 代理方法列表 */
  methods?: string[];
  /** 代理属性列表 */
  properties?: string[];
  /** 是否延迟初始化目标服务 */
  lazyTarget?: boolean;
}

// ==================== 容器接口定义 ====================

/**
 * 服务容器核心接口
 */
export interface IServiceContainer {
  // 服务注册
  register<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, options?: ServiceRegistrationOptions): void;
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, options?: Omit<ServiceRegistrationOptions, 'scope'>): void;
  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>, options?: Omit<ServiceRegistrationOptions, 'scope'>): void;
  
  // 服务解析
  resolve<T>(token: ServiceToken<T>): T;
  resolveAsync<T>(token: ServiceToken<T>): Promise<T>;
  tryResolve<T>(token: ServiceToken<T>): T | null;
  
  // 延迟解析
  lazy<T>(token: ServiceToken<T>): Lazy<T>;
  
  // 服务管理
  isRegistered<T>(token: ServiceToken<T>): boolean;
  getServiceInfo<T>(token: ServiceToken<T>): ServiceInstance<T> | null;
  getAllServices(): ServiceInstance[];
  
  // 生命周期管理
  initialize(): Promise<void>;
  initializeLayer(layer: ServiceLayer): Promise<void>;
  dispose(): Promise<void>;
  reset(): void;
  
  // 健康检查
  validateDependencies(): DependencyValidationResult;
  getServiceHealth(): ServiceHealthReport;
}

/**
 * 服务注册选项
 */
export interface ServiceRegistrationOptions {
  /** 服务作用域 */
  scope?: ServiceScope;
  /** 服务层级 */
  layer?: ServiceLayer;
  /** 依赖列表 */
  dependencies?: DependencyDescriptor[];
  /** 是否异步初始化 */
  async?: boolean;
  /** 服务元数据 */
  metadata?: ServiceMetadata;
}

// ==================== 验证和健康检查 ====================

/**
 * 依赖验证结果
 */
export interface DependencyValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 循环依赖列表 */
  circularDependencies: CircularDependency[];
  /** 缺失依赖列表 */
  missingDependencies: MissingDependency[];
  /** 警告信息 */
  warnings: string[];
}

/**
 * 循环依赖信息
 */
export interface CircularDependency {
  /** 依赖链 */
  chain: ServiceToken[];
  /** 严重程度 */
  severity: 'warning' | 'error';
  /** 建议解决方案 */
  suggestion?: string;
}

/**
 * 缺失依赖信息
 */
export interface MissingDependency {
  /** 服务标识 */
  service: ServiceToken;
  /** 缺失的依赖 */
  dependency: ServiceToken;
  /** 是否为可选依赖 */
  optional: boolean;
}

/**
 * 服务健康报告
 */
export interface ServiceHealthReport {
  /** 总体健康状态 */
  overall: 'healthy' | 'warning' | 'critical';
  /** 服务统计 */
  statistics: ServiceStatistics;
  /** 问题列表 */
  issues: ServiceIssue[];
  /** 性能指标 */
  performance: PerformanceMetrics;
}

/**
 * 服务统计信息
 */
export interface ServiceStatistics {
  /** 总服务数 */
  totalServices: number;
  /** 已初始化服务数 */
  initializedServices: number;
  /** 失败服务数 */
  failedServices: number;
  /** 按层级分组的服务数 */
  servicesByLayer: Record<ServiceLayer, number>;
  /** 按作用域分组的服务数 */
  servicesByScope: Record<ServiceScope, number>;
}

/**
 * 服务问题
 */
export interface ServiceIssue {
  /** 问题类型 */
  type: 'error' | 'warning' | 'info';
  /** 相关服务 */
  service: ServiceToken;
  /** 问题描述 */
  message: string;
  /** 问题详情 */
  details?: any;
  /** 建议解决方案 */
  suggestion?: string;
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 初始化总时间（毫秒） */
  totalInitializationTime: number;
  /** 平均初始化时间（毫秒） */
  averageInitializationTime: number;
  /** 最慢的服务初始化时间 */
  slowestService: {
    token: ServiceToken;
    time: number;
  };
  /** 内存使用情况 */
  memoryUsage: {
    /** 服务实例占用内存（估算） */
    serviceInstances: number;
    /** 容器元数据占用内存（估算） */
    containerMetadata: number;
  };
}

// ==================== 事件系统 ====================

/**
 * 容器事件类型
 */
export enum ContainerEventType {
  ServiceRegistered = 'service_registered',
  ServiceResolved = 'service_resolved',
  ServiceInitialized = 'service_initialized',
  ServiceFailed = 'service_failed',
  ServiceDisposed = 'service_disposed',
  ContainerInitialized = 'container_initialized',
  ContainerDisposed = 'container_disposed'
}

/**
 * 容器事件
 */
export interface ContainerEvent {
  /** 事件类型 */
  type: ContainerEventType;
  /** 相关服务标识 */
  serviceToken?: ServiceToken;
  /** 事件时间戳 */
  timestamp: Date;
  /** 事件数据 */
  data?: any;
  /** 错误信息（如果有） */
  error?: Error;
}

/**
 * 事件监听器
 */
export type ContainerEventListener = (event: ContainerEvent) => void;

// ==================== 导出所有类型 ====================

export * from './types';
