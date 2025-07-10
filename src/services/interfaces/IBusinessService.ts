/**
 * 业务服务基础接口
 * 
 * 定义所有业务服务的通用接口和生命周期方法
 */

/**
 * 业务服务基础接口
 * 所有业务服务都应该实现此接口
 */
export interface IBusinessService {
  /**
   * 服务初始化
   * 在服务容器启动时调用
   */
  initialize(): Promise<void>;

  /**
   * 服务销毁
   * 在服务容器关闭时调用
   */
  dispose?(): Promise<void>;

  /**
   * 服务重置
   * 重置服务状态到初始状态
   */
  reset?(): void;

  /**
   * 获取服务健康状态
   */
  getHealthStatus?(): ServiceHealthStatus;
}

/**
 * 服务健康状态
 */
export interface ServiceHealthStatus {
  /** 服务是否健康 */
  isHealthy: boolean;
  /** 状态消息 */
  message?: string;
  /** 最后检查时间 */
  lastChecked: Date;
  /** 详细信息 */
  details?: Record<string, any>;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  /** 页码（从1开始） */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 排序字段 */
  sortBy?: string;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[];
  /** 数据列表（兼容字段） */
  data?: T[];
  /** 总记录数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrevious: boolean;
}

/**
 * 查询过滤器基础接口
 */
export interface BaseFilter {
  /** 搜索关键词 */
  keyword?: string;
  /** 状态过滤 */
  status?: string;
  /** 创建时间范围 */
  createdFrom?: Date;
  createdTo?: Date;
  /** 更新时间范围 */
  updatedFrom?: Date;
  updatedTo?: Date;
}

/**
 * 服务操作结果
 */
export interface ServiceResult<T = any> {
  /** 操作是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: T;
  /** 成功消息 */
  message?: string;
  /** 错误消息 */
  error?: string;
  /** 错误代码 */
  errorCode?: string;
  /** 详细错误信息 */
  details?: any;
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult<T = any> {
  /** 总操作数 */
  total: number;
  /** 成功数 */
  successful: number;
  /** 失败数 */
  failed: number;
  /** 成功的项目 */
  successfulItems: T[];
  /** 失败的项目及错误信息 */
  failedItems: Array<{
    item: T;
    error: string;
  }>;
}

/**
 * 审计信息接口
 */
export interface AuditInfo {
  /** 创建者ID */
  createdBy?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后修改者ID */
  updatedBy?: string;
  /** 最后修改时间 */
  updatedAt: Date;
}

/**
 * 可审计的实体接口
 */
export interface IAuditable extends AuditInfo {
  /** 实体ID */
  id: string;
}

/**
 * 服务统计信息
 */
export interface ServiceStatistics {
  /** 总记录数 */
  totalCount: number;
  /** 活跃记录数 */
  activeCount: number;
  /** 今日新增数 */
  todayAdded: number;
  /** 本周新增数 */
  weekAdded: number;
  /** 本月新增数 */
  monthAdded: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 导入导出接口
 */
export interface IImportExportService<T> {
  /**
   * 导出数据
   */
  exportData(filter?: BaseFilter): Promise<ServiceResult<T[]>>;

  /**
   * 导入数据
   */
  importData(data: T[]): Promise<BatchOperationResult<T>>;

  /**
   * 验证导入数据
   */
  validateImportData(data: any[]): Promise<ServiceResult<T[]>>;
}

/**
 * 缓存服务接口
 */
export interface ICacheService {
  /**
   * 获取缓存值
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * 设置缓存值
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * 删除缓存值
   */
  delete(key: string): Promise<void>;

  /**
   * 清空缓存
   */
  clear(): Promise<void>;

  /**
   * 检查缓存是否存在
   */
  exists(key: string): Promise<boolean>;
}

/**
 * 事件服务接口
 */
export interface IEventService {
  /**
   * 发布事件
   */
  publish<T>(eventType: string, data: T): Promise<void>;

  /**
   * 订阅事件
   */
  subscribe<T>(eventType: string, handler: (data: T) => void | Promise<void>): void;

  /**
   * 取消订阅
   */
  unsubscribe(eventType: string, handler: Function): void;
}

/**
 * 权限检查接口
 */
export interface IPermissionChecker {
  /**
   * 检查用户是否有指定权限
   */
  hasPermission(userId: string, permission: string): Promise<boolean>;

  /**
   * 检查用户是否有任一权限
   */
  hasAnyPermission(userId: string, permissions: string[]): Promise<boolean>;

  /**
   * 检查用户是否有所有权限
   */
  hasAllPermissions(userId: string, permissions: string[]): Promise<boolean>;
}

/**
 * 数据验证接口
 */
export interface IDataValidator<T> {
  /**
   * 验证单个实体
   */
  validate(entity: T): Promise<ValidationResult>;

  /**
   * 批量验证实体
   */
  validateBatch(entities: T[]): Promise<ValidationResult[]>;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: ValidationError[];
  /** 警告信息列表 */
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段名 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误代码 */
  code?: string;
  /** 当前值 */
  value?: any;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 字段名 */
  field: string;
  /** 警告消息 */
  message: string;
  /** 警告代码 */
  code?: string;
  /** 当前值 */
  value?: any;
}
