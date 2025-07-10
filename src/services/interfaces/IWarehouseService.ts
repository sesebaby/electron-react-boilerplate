/**
 * 仓库服务接口
 */

import { Warehouse, WarehouseStatus, WarehouseType } from '../../types/entities';
import { 
  IBusinessService, 
  PaginatedResult, 
  PaginationParams, 
  BaseFilter, 
  ServiceResult,
  ServiceStatistics,
  BatchOperationResult
} from './IBusinessService';

/**
 * 仓库查询过滤器
 */
export interface WarehouseFilter extends BaseFilter {
  /** 仓库状态 */
  status?: WarehouseStatus;
  /** 仓库类型 */
  type?: WarehouseType;
  /** 是否为默认仓库 */
  isDefault?: boolean;
  /** 地区 */
  region?: string;
  /** 城市 */
  city?: string;
}

/**
 * 仓库容量信息
 */
export interface WarehouseCapacity {
  /** 总容量 */
  totalCapacity: number;
  /** 已使用容量 */
  usedCapacity: number;
  /** 可用容量 */
  availableCapacity: number;
  /** 容量使用率 */
  utilizationRate: number;
  /** 容量单位 */
  capacityUnit: string;
}

/**
 * 仓库库存概览
 */
export interface WarehouseInventoryOverview {
  /** 商品种类数 */
  productVarietyCount: number;
  /** 总库存数量 */
  totalQuantity: number;
  /** 总库存价值 */
  totalValue: number;
  /** 低库存商品数 */
  lowStockCount: number;
  /** 缺货商品数 */
  outOfStockCount: number;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 仓库统计信息
 */
export interface WarehouseStatistics extends ServiceStatistics {
  /** 各状态仓库数量 */
  countByStatus: Record<WarehouseStatus, number>;
  /** 各类型仓库数量 */
  countByType: Record<WarehouseType, number>;
  /** 总容量 */
  totalCapacity: number;
  /** 平均容量使用率 */
  averageUtilizationRate: number;
}

/**
 * 仓库位置信息
 */
export interface WarehouseLocation {
  /** 地址 */
  address: string;
  /** 城市 */
  city: string;
  /** 省份/州 */
  province: string;
  /** 国家 */
  country: string;
  /** 邮政编码 */
  postalCode?: string;
  /** 经度 */
  longitude?: number;
  /** 纬度 */
  latitude?: number;
}

/**
 * 仓库服务接口
 */
export interface IWarehouseService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建仓库
   */
  create(data: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Warehouse>;

  /**
   * 根据ID获取仓库
   */
  findById(id: string): Promise<Warehouse | null>;

  /**
   * 根据编码获取仓库
   */
  findByCode(code: string): Promise<Warehouse | null>;

  /**
   * 根据名称获取仓库
   */
  findByName(name: string): Promise<Warehouse | null>;

  /**
   * 获取所有仓库
   */
  findAll(): Promise<Warehouse[]>;

  /**
   * 分页查询仓库
   */
  findPaginated(params: PaginationParams, filter?: WarehouseFilter): Promise<PaginatedResult<Warehouse>>;

  /**
   * 更新仓库
   */
  update(id: string, data: Partial<Warehouse>, currentUserId?: string): Promise<Warehouse>;

  /**
   * 删除仓库
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量删除仓库
   */
  deleteBatch(ids: string[], currentUserId?: string): Promise<BatchOperationResult<string>>;

  // ==================== 状态管理 ====================

  /**
   * 启用仓库
   */
  enable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 禁用仓库
   */
  disable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 暂停仓库操作
   */
  suspend(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 恢复仓库操作
   */
  resume(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量更新仓库状态
   */
  updateStatusBatch(ids: string[], status: WarehouseStatus, currentUserId?: string): Promise<BatchOperationResult<string>>;

  /**
   * 根据状态查询仓库
   */
  findByStatus(status: WarehouseStatus): Promise<Warehouse[]>;

  // ==================== 默认仓库管理 ====================

  /**
   * 获取默认仓库
   */
  getDefaultWarehouse(): Promise<Warehouse | null>;

  /**
   * 设置默认仓库
   */
  setDefaultWarehouse(id: string, currentUserId?: string): Promise<void>;

  /**
   * 取消默认仓库
   */
  unsetDefaultWarehouse(currentUserId?: string): Promise<void>;

  /**
   * 确保存在默认仓库
   */
  ensureDefaultWarehouse(): Promise<Warehouse>;

  // ==================== 类型和分类查询 ====================

  /**
   * 根据类型获取仓库列表
   */
  findByType(type: WarehouseType): Promise<Warehouse[]>;

  /**
   * 获取所有仓库类型
   */
  getAllTypes(): Promise<WarehouseType[]>;

  /**
   * 根据地区获取仓库列表
   */
  findByRegion(region: string): Promise<Warehouse[]>;

  /**
   * 根据城市获取仓库列表
   */
  findByCity(city: string): Promise<Warehouse[]>;

  // ==================== 容量管理 ====================

  /**
   * 获取仓库容量信息
   */
  getCapacityInfo(id: string): Promise<WarehouseCapacity>;

  /**
   * 更新仓库容量
   */
  updateCapacity(id: string, capacity: number, currentUserId?: string): Promise<void>;

  /**
   * 检查仓库容量是否充足
   */
  checkCapacity(id: string, requiredCapacity: number): Promise<{
    sufficient: boolean;
    availableCapacity: number;
    requiredCapacity: number;
    shortfall?: number;
  }>;

  /**
   * 获取容量使用率排行
   */
  getCapacityUtilizationRanking(): Promise<Array<{
    warehouse: Warehouse;
    utilizationRate: number;
    capacity: WarehouseCapacity;
  }>>;

  // ==================== 库存概览 ====================

  /**
   * 获取仓库库存概览
   */
  getInventoryOverview(id: string): Promise<WarehouseInventoryOverview>;

  /**
   * 获取所有仓库库存概览
   */
  getAllInventoryOverviews(): Promise<Array<{
    warehouse: Warehouse;
    overview: WarehouseInventoryOverview;
  }>>;

  /**
   * 获取仓库商品列表
   */
  getWarehouseProducts(id: string): Promise<Array<{
    productId: string;
    productName: string;
    quantity: number;
    value: number;
    lastUpdated: Date;
  }>>;

  // ==================== 验证和检查 ====================

  /**
   * 验证仓库数据
   */
  validateWarehouse(data: Partial<Warehouse>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 检查仓库编码是否唯一
   */
  isCodeUnique(code: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查仓库名称是否唯一
   */
  isNameUnique(name: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查仓库是否可以删除
   */
  canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    relatedEntities?: {
      inventoryItems: number;
      pendingTransactions: number;
    };
  }>;

  /**
   * 验证仓库位置信息
   */
  validateLocation(location: WarehouseLocation): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }>;

  // ==================== 搜索和查询 ====================

  /**
   * 搜索仓库
   */
  search(keyword: string, filter?: WarehouseFilter): Promise<Warehouse[]>;

  /**
   * 根据名称或编码模糊查询
   */
  findByNameOrCodeLike(query: string): Promise<Warehouse[]>;

  /**
   * 获取活跃仓库列表
   */
  getActiveWarehouses(): Promise<Warehouse[]>;

  /**
   * 获取可用仓库列表（状态为活跃且有容量）
   */
  getAvailableWarehouses(): Promise<Warehouse[]>;

  /**
   * 根据距离查找最近的仓库
   */
  findNearestWarehouses(longitude: number, latitude: number, limit?: number): Promise<Array<{
    warehouse: Warehouse;
    distance: number;
  }>>;

  // ==================== 统计和分析 ====================

  /**
   * 获取仓库统计信息
   */
  getStatistics(): Promise<WarehouseStatistics>;

  /**
   * 获取仓库使用情况统计
   */
  getUsageStatistics(id: string): Promise<{
    transactionCount: number;
    inventoryTurnover: number;
    averageStockLevel: number;
    lastActivity: Date | null;
  }>;

  /**
   * 获取仓库性能指标
   */
  getPerformanceMetrics(id: string, startDate: Date, endDate: Date): Promise<{
    inboundTransactions: number;
    outboundTransactions: number;
    inventoryAccuracy: number;
    orderFulfillmentRate: number;
  }>;

  // ==================== 数据管理 ====================

  /**
   * 导出仓库数据
   */
  exportWarehouses(filter?: WarehouseFilter): Promise<ServiceResult<Warehouse[]>>;

  /**
   * 导入仓库数据
   */
  importWarehouses(warehouses: Partial<Warehouse>[]): Promise<BatchOperationResult<Warehouse>>;

  /**
   * 同步仓库库存数据
   */
  syncInventoryData(id: string): Promise<ServiceResult<void>>;

  // ==================== 缓存管理 ====================

  /**
   * 刷新仓库缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 清空仓库缓存
   */
  clearCache(): Promise<void>;

  /**
   * 预热仓库缓存
   */
  warmupCache(): Promise<void>;

  /**
   * 强制重新初始化
   */
  forceReinitialize(): Promise<void>;
}
