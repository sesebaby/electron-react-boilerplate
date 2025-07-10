/**
 * 产品服务接口
 */

import { Product, ProductStatus } from '../../types/entities';
import { 
  IBusinessService, 
  PaginatedResult, 
  PaginationParams, 
  BaseFilter, 
  ServiceResult,
  ServiceStatistics,
  BatchOperationResult,
  IPermissionChecker,
  ServiceHealthStatus
} from './IBusinessService';

// Re-export types needed by productService
export type { ServiceResult, BatchOperationResult, IPermissionChecker, ServiceHealthStatus, PaginatedResult };

/**
 * 产品查询过滤器
 */
export interface ProductFilter extends BaseFilter {
  /** 产品状态 */
  status?: ProductStatus;
  /** 分类ID */
  categoryId?: string;
  /** 单位ID */
  unitId?: string;
  /** SKU */
  sku?: string;
  /** 价格范围 */
  priceFrom?: number;
  priceTo?: number;
  /** 是否有库存 */
  hasStock?: boolean;
  /** 库存预警 */
  lowStock?: boolean;
}

/**
 * 产品统计信息
 */
export interface ProductStatistics extends ServiceStatistics {
  /** 各状态产品数量 */
  countByStatus: Record<ProductStatus, number>;
  /** 各分类产品数量 */
  countByCategory: Record<string, number>;
  /** 平均价格 */
  averagePrice: number;
  /** 总库存价值 */
  totalInventoryValue: number;
  /** 低库存产品数 */
  lowStockCount: number;
  /** 缺货产品数 */
  outOfStockCount: number;
}

/**
 * 产品库存信息
 */
export interface ProductInventoryInfo {
  /** 产品ID */
  productId: string;
  /** 总库存 */
  totalStock: number;
  /** 可用库存 */
  availableStock: number;
  /** 预留库存 */
  reservedStock: number;
  /** 安全库存 */
  safetyStock: number;
  /** 是否低库存 */
  isLowStock: boolean;
  /** 是否缺货 */
  isOutOfStock: boolean;
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 产品价格历史
 */
export interface ProductPriceHistory {
  /** 产品ID */
  productId: string;
  /** 价格 */
  price: number;
  /** 成本价 */
  costPrice?: number;
  /** 生效日期 */
  effectiveDate: Date;
  /** 创建者 */
  createdBy?: string;
  /** 备注 */
  notes?: string;
}

/**
 * 产品服务接口
 */
export interface IProductService extends IBusinessService {
  // ==================== 依赖注入 ====================
  
  /**
   * 设置权限检查器（用于解决循环依赖）
   */
  setPermissionChecker(permissionChecker: IPermissionChecker): void;

  // ==================== 基础CRUD操作 ====================

  /**
   * 创建产品
   */
  create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Product>;

  /**
   * 根据ID获取产品
   */
  findById(id: string): Promise<Product | null>;

  /**
   * 根据SKU获取产品
   */
  findBySku(sku: string): Promise<Product | null>;

  /**
   * 根据条码获取产品
   */
  findByBarcode(barcode: string): Promise<Product | null>;

  /**
   * 获取所有产品
   */
  findAll(): Promise<Product[]>;

  /**
   * 分页查询产品
   */
  findPaginated(params: PaginationParams, filter?: ProductFilter): Promise<PaginatedResult<Product>>;

  /**
   * 更新产品
   */
  update(id: string, data: Partial<Product>, currentUserId?: string): Promise<Product>;

  /**
   * 删除产品
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量删除产品
   */
  deleteBatch(ids: string[], currentUserId?: string): Promise<BatchOperationResult<string>>;

  // ==================== 分类和单位查询 ====================

  /**
   * 根据分类获取产品列表
   */
  findByCategory(categoryId: string): Promise<Product[]>;

  /**
   * 根据单位获取产品列表
   */
  findByUnit(unitId: string): Promise<Product[]>;

  /**
   * 获取分类下的产品数量
   */
  getCountByCategory(categoryId: string): Promise<number>;

  /**
   * 获取单位下的产品数量
   */
  getCountByUnit(unitId: string): Promise<number>;

  // ==================== 状态管理 ====================

  /**
   * 启用产品
   */
  enable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 禁用产品
   */
  disable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 停产产品
   */
  discontinue(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 批量更新产品状态
   */
  updateStatusBatch(ids: string[], status: ProductStatus, currentUserId?: string): Promise<BatchOperationResult<string>>;

  /**
   * 根据状态查询产品
   */
  findByStatus(status: ProductStatus): Promise<Product[]>;

  // ==================== 库存相关 ====================

  /**
   * 获取产品库存信息
   */
  getInventoryInfo(productId: string): Promise<ProductInventoryInfo>;

  /**
   * 批量获取产品库存信息
   */
  getInventoryInfoBatch(productIds: string[]): Promise<ProductInventoryInfo[]>;

  /**
   * 获取低库存产品
   */
  getLowStockProducts(): Promise<Product[]>;

  /**
   * 获取缺货产品
   */
  getOutOfStockProducts(): Promise<Product[]>;

  /**
   * 更新产品安全库存
   */
  updateSafetyStock(productId: string, safetyStock: number, currentUserId?: string): Promise<void>;

  // ==================== 价格管理 ====================

  /**
   * 更新产品价格
   */
  updatePrice(productId: string, price: number, costPrice?: number, currentUserId?: string): Promise<void>;

  /**
   * 批量更新产品价格
   */
  updatePriceBatch(updates: Array<{
    productId: string;
    price: number;
    costPrice?: number;
  }>, currentUserId?: string): Promise<BatchOperationResult<string>>;

  /**
   * 获取产品价格历史
   */
  getPriceHistory(productId: string): Promise<ProductPriceHistory[]>;

  /**
   * 根据价格范围查询产品
   */
  findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]>;

  // ==================== 搜索和查询 ====================

  /**
   * 搜索产品
   */
  search(keyword: string, filter?: ProductFilter): Promise<Product[]>;

  /**
   * 根据名称模糊查询产品
   */
  findByNameLike(name: string): Promise<Product[]>;

  /**
   * 检查SKU是否存在
   */
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查条码是否存在
   */
  existsByBarcode(barcode: string, excludeId?: string): Promise<boolean>;

  /**
   * 获取热门产品
   */
  getPopularProducts(limit?: number): Promise<Array<{
    product: Product;
    salesCount: number;
    revenue: number;
  }>>;

  // ==================== 验证和检查 ====================

  /**
   * 验证产品数据
   */
  validateProduct(data: Partial<Product>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 检查产品是否可以删除
   */
  canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    relatedEntities?: {
      inventoryRecords: number;
      orderItems: number;
      transactions: number;
    };
  }>;

  /**
   * 验证SKU格式
   */
  validateSku(sku: string): Promise<{
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  }>;

  // ==================== 统计和分析 ====================

  /**
   * 获取产品统计信息
   */
  getStatistics(): Promise<ProductStatistics>;

  /**
   * 获取产品销售统计
   */
  getSalesStatistics(productId: string, startDate: Date, endDate: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    averagePrice: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      quantity: number;
      revenue: number;
    }>;
  }>;

  /**
   * 获取产品库存周转率
   */
  getInventoryTurnover(productId: string, period: 'month' | 'quarter' | 'year'): Promise<{
    turnoverRate: number;
    averageInventory: number;
    costOfGoodsSold: number;
    period: string;
  }>;

  // ==================== 数据管理 ====================

  /**
   * 导出产品数据
   */
  exportProducts(filter?: ProductFilter): Promise<ServiceResult<Product[]>>;

  /**
   * 导入产品数据
   */
  importProducts(products: Partial<Product>[]): Promise<BatchOperationResult<Product>>;

  /**
   * 同步产品库存数据
   */
  syncInventoryData(productId?: string): Promise<ServiceResult<void>>;

  /**
   * 重建产品索引
   */
  rebuildIndex(): Promise<void>;

  // ==================== 缓存管理 ====================

  /**
   * 刷新产品缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 清空产品缓存
   */
  clearCache(): Promise<void>;

  /**
   * 预热产品缓存
   */
  warmupCache(): Promise<void>;

  /**
   * 刷新产品库存缓存
   */
  refreshInventoryCache(productId?: string): Promise<void>;
}
