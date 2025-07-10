/**
 * 分类服务接口
 */

import { Category, CategoryStatus } from '../../types/entities';
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
 * 分类查询过滤器
 */
export interface CategoryFilter extends BaseFilter {
  /** 分类状态 */
  status?: CategoryStatus;
  /** 父分类ID */
  parentId?: string;
  /** 是否包含子分类 */
  includeChildren?: boolean;
  /** 分类层级 */
  level?: number;
}

/**
 * 分类树节点
 */
export interface CategoryTreeNode {
  /** 分类信息 */
  category: Category;
  /** 子分类列表 */
  children: CategoryTreeNode[];
  /** 层级深度 */
  depth: number;
  /** 是否展开 */
  expanded?: boolean;
}

/**
 * 分类统计信息
 */
export interface CategoryStatistics extends ServiceStatistics {
  /** 根分类数量 */
  rootCategoryCount: number;
  /** 最大层级深度 */
  maxDepth: number;
  /** 各层级分类数量 */
  countByLevel: Record<number, number>;
  /** 各状态分类数量 */
  countByStatus: Record<CategoryStatus, number>;
}

/**
 * 分类服务接口
 */
export interface ICategoryService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建分类
   */
  create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Category>;

  /**
   * 根据ID获取分类
   */
  findById(id: string): Promise<Category | null>;

  /**
   * 根据编码获取分类
   */
  findByCode(code: string): Promise<Category | null>;

  /**
   * 获取所有分类
   */
  findAll(): Promise<Category[]>;

  /**
   * 分页查询分类
   */
  findPaginated(params: PaginationParams, filter?: CategoryFilter): Promise<PaginatedResult<Category>>;

  /**
   * 更新分类
   */
  update(id: string, data: Partial<Category>, currentUserId?: string): Promise<Category>;

  /**
   * 删除分类
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量删除分类
   */
  deleteBatch(ids: string[], currentUserId?: string): Promise<BatchOperationResult<string>>;

  // ==================== 层级结构操作 ====================

  /**
   * 获取根分类列表
   */
  findRootCategories(): Promise<Category[]>;

  /**
   * 获取指定分类的子分类
   */
  findChildren(parentId: string): Promise<Category[]>;

  /**
   * 获取指定分类的所有后代分类
   */
  findDescendants(parentId: string): Promise<Category[]>;

  /**
   * 获取指定分类的祖先分类路径
   */
  findAncestors(categoryId: string): Promise<Category[]>;

  /**
   * 获取分类树结构
   */
  getCategoryTree(rootId?: string): Promise<CategoryTreeNode[]>;

  /**
   * 移动分类到新的父分类下
   */
  moveCategory(categoryId: string, newParentId: string | null, currentUserId?: string): Promise<void>;

  /**
   * 获取分类的完整路径
   */
  getCategoryPath(categoryId: string): Promise<string>;

  /**
   * 检查分类是否为另一个分类的祖先
   */
  isAncestor(ancestorId: string, descendantId: string): Promise<boolean>;

  // ==================== 状态管理 ====================

  /**
   * 启用分类
   */
  enable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 禁用分类
   */
  disable(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量更新分类状态
   */
  updateStatusBatch(ids: string[], status: CategoryStatus, currentUserId?: string): Promise<BatchOperationResult<string>>;

  /**
   * 根据状态查询分类
   */
  findByStatus(status: CategoryStatus): Promise<Category[]>;

  // ==================== 查询和搜索 ====================

  /**
   * 搜索分类
   */
  search(keyword: string, filter?: CategoryFilter): Promise<Category[]>;

  /**
   * 根据名称模糊查询分类
   */
  findByNameLike(name: string): Promise<Category[]>;

  /**
   * 检查分类编码是否存在
   */
  existsByCode(code: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查分类名称是否存在（在同一父分类下）
   */
  existsByName(name: string, parentId?: string, excludeId?: string): Promise<boolean>;

  // ==================== 统计和分析 ====================

  /**
   * 获取分类统计信息
   */
  getStatistics(): Promise<CategoryStatistics>;

  /**
   * 获取分类使用情况统计
   */
  getUsageStatistics(categoryId: string): Promise<{
    productCount: number;
    activeProductCount: number;
    totalInventoryValue: number;
    lastUsed: Date | null;
  }>;

  /**
   * 获取热门分类排行
   */
  getPopularCategories(limit?: number): Promise<Array<{
    category: Category;
    productCount: number;
    inventoryValue: number;
  }>>;

  // ==================== 数据验证 ====================

  /**
   * 验证分类数据
   */
  validateCategory(data: Partial<Category>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 检查分类是否可以删除
   */
  canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    relatedEntities?: {
      products: number;
      subCategories: number;
    };
  }>;

  /**
   * 检查分类层级深度是否合法
   */
  validateDepth(parentId: string | null): Promise<{
    isValid: boolean;
    currentDepth: number;
    maxAllowedDepth: number;
  }>;

  // ==================== 导入导出 ====================

  /**
   * 导出分类数据
   */
  exportCategories(filter?: CategoryFilter): Promise<ServiceResult<Category[]>>;

  /**
   * 导入分类数据
   */
  importCategories(categories: Partial<Category>[]): Promise<BatchOperationResult<Category>>;

  /**
   * 导出分类树结构
   */
  exportCategoryTree(): Promise<ServiceResult<CategoryTreeNode[]>>;

  // ==================== 缓存管理 ====================

  /**
   * 刷新分类缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 清空分类缓存
   */
  clearCache(): Promise<void>;

  /**
   * 预热分类缓存
   */
  warmupCache(): Promise<void>;
}
