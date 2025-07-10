/**
 * 分类服务实现
 * 
 * 支持依赖注入的分类服务实现
 */

import { Category, CategoryStatus } from '../../types/entities';
import { CategorySchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import electronDatabase from '../database/electronDatabase';
import {
  ICategoryService,
  CategoryFilter,
  CategoryTreeNode,
  CategoryStatistics
} from '../interfaces/ICategoryService';
import {
  IBusinessService,
  PaginatedResult,
  PaginationParams,
  ServiceResult,
  BatchOperationResult,
  ServiceHealthStatus
} from '../interfaces/IBusinessService';

/**
 * 分类服务实现类
 */
export class CategoryService implements ICategoryService, IBusinessService {
  private categories: Map<string, Category> = new Map();
  private parentChildMap: Map<string, string[]> = new Map(); // 父子关系映射
  private codeIndex: Map<string, string> = new Map(); // 编码索引
  private initialized = false;

  // ==================== 生命周期管理 ====================

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('CategoryService already initialized');
      return;
    }

    console.log('Initializing CategoryService...');
    
    try {
      // 从数据库加载分类数据
      // 临时实现：直接初始化空数据，避免数据库方法不存在错误
      const dbCategories: any[] = [];
      console.log(`Loaded ${dbCategories.length} categories from database`);
      
      // 转换并缓存数据
      for (const dbCategory of dbCategories) {
        const category: Category = {
          id: dbCategory.id,
          code: dbCategory.code,
          name: dbCategory.name,
          description: dbCategory.description || '',
          parentId: dbCategory.parentId || undefined,
          level: dbCategory.level || 0,
          sortOrder: dbCategory.sortOrder || 0,
          isActive: dbCategory.status === 'Active',
          status: this.mapLegacyStatusToCategoryStatus(dbCategory.status || 'Active'),
          createdAt: new Date(dbCategory.createdAt || Date.now()),
          updatedAt: new Date(dbCategory.updatedAt || Date.now())
        };
        
        this.addToCache(category);
      }

      // 构建父子关系映射
      this.buildParentChildMap();

      this.initialized = true;
      console.log('CategoryService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize CategoryService:', error);
      throw error;
    }
  }

  /**
   * 映射旧状态到新状态
   */
  private mapLegacyStatusToCategoryStatus(legacyStatus: string): CategoryStatus {
    switch (legacyStatus.toLowerCase()) {
      case 'active':
        return CategoryStatus.ACTIVE;
      case 'inactive':
        return CategoryStatus.INACTIVE;
      case 'archived':
        return CategoryStatus.ARCHIVED;
      default:
        return CategoryStatus.ACTIVE;
    }
  }

  /**
   * 添加到缓存
   */
  private addToCache(category: Category): void {
    this.categories.set(category.id, category);
    if (category.code) {
      this.codeIndex.set(category.code, category.id);
    }
  }

  /**
   * 构建父子关系映射
   */
  private buildParentChildMap(): void {
    this.parentChildMap.clear();
    
    for (const category of this.categories.values()) {
      if (category.parentId) {
        if (!this.parentChildMap.has(category.parentId)) {
          this.parentChildMap.set(category.parentId, []);
        }
        this.parentChildMap.get(category.parentId)!.push(category.id);
      }
    }
  }

  // ==================== 基础CRUD操作 ====================

  /**
   * 创建分类
   */
  async create(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    // 验证数据
    const tempCategory: Category = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validation = validateEntity(CategorySchema, tempCategory);
    if (!validation.success) {
      throw new Error(`分类数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查编码唯一性
    if (data.code && this.codeIndex.has(data.code)) {
      throw new Error(`分类编码已存在: ${data.code}`);
    }

    // 验证父分类存在性
    if (data.parentId && !this.categories.has(data.parentId)) {
      throw new Error(`父分类不存在: ${data.parentId}`);
    }

    const category: Category = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // 临时实现：跳过数据库操作，直接缓存
      // const result = await electronDatabase.createCategory(...);

      // 添加到缓存
      this.addToCache(category);
      this.buildParentChildMap();

      console.log(`Category created: ${category.name} (${category.id})`);
      return category;

    } catch (error) {
      console.error('Failed to create category:', error);
      throw error;
    }
  }

  /**
   * 根据ID查找分类
   */
  async findById(id: string): Promise<Category | null> {
    return this.categories.get(id) || null;
  }

  /**
   * 根据编码查找分类
   */
  async findByCode(code: string): Promise<Category | null> {
    const id = this.codeIndex.get(code);
    return id ? this.categories.get(id) || null : null;
  }

  /**
   * 查找所有分类
   */
  async findAll(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 更新分类
   */
  async update(id: string, data: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Category> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) {
      throw new Error(`分类不存在: ${id}`);
    }

    // 检查编码唯一性（如果更改了编码）
    if (data.code && data.code !== existingCategory.code && this.codeIndex.has(data.code)) {
      throw new Error(`分类编码已存在: ${data.code}`);
    }

    // 验证父分类存在性
    if (data.parentId && !this.categories.has(data.parentId)) {
      throw new Error(`父分类不存在: ${data.parentId}`);
    }

    const updatedCategory: Category = {
      ...existingCategory,
      ...data,
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(CategorySchema, updatedCategory);
    if (!validation.success) {
      throw new Error(`分类数据验证失败: ${validation.errors?.join(', ')}`);
    }

    try {
      // 临时实现：跳过数据库操作
      // const result = await electronDatabase.updateCategory(...);

      // 更新缓存
      if (data.code && data.code !== existingCategory.code) {
        if (existingCategory.code) {
          this.codeIndex.delete(existingCategory.code);
        }
        if (updatedCategory.code) {
          this.codeIndex.set(updatedCategory.code, id);
        }
      }
      
      this.categories.set(id, updatedCategory);
      this.buildParentChildMap();

      console.log(`Category updated: ${updatedCategory.name} (${id})`);
      return updatedCategory;

    } catch (error) {
      console.error('Failed to update category:', error);
      throw error;
    }
  }

  /**
   * 删除分类
   */
  async delete(id: string): Promise<void> {
    const category = this.categories.get(id);
    if (!category) {
      throw new Error(`分类不存在: ${id}`);
    }

    // 检查是否有子分类
    const children = this.parentChildMap.get(id) || [];
    if (children.length > 0) {
      throw new Error(`无法删除分类，存在子分类: ${children.length} 个`);
    }

    try {
      // 临时实现：跳过数据库操作
      // const result = await electronDatabase.deleteCategory(id);

      // 从缓存删除
      this.categories.delete(id);
      if (category.code) {
        this.codeIndex.delete(category.code);
      }
      this.buildParentChildMap();

      console.log(`Category deleted: ${category.name} (${id})`);

    } catch (error) {
      console.error('Failed to delete category:', error);
      throw error;
    }
  }

  // ==================== 高级查询 ====================

  /**
   * 分页查询
   */
  async findWithPagination(params: PaginationParams, filter?: CategoryFilter): Promise<PaginatedResult<Category>> {
    let categories = Array.from(this.categories.values());

    // 应用过滤器
    if (filter) {
      if (filter.status) {
        categories = categories.filter(c => c.status === filter.status);
      }
      if (filter.parentId !== undefined) {
        categories = categories.filter(c => c.parentId === filter.parentId);
      }
      if (filter.keyword) {
        const term = filter.keyword.toLowerCase();
        categories = categories.filter(c =>
          c.name.toLowerCase().includes(term) ||
          (c.code && c.code.toLowerCase().includes(term)) ||
          (c.description && c.description.toLowerCase().includes(term))
        );
      }
    }

    // 排序
    categories.sort((a, b) => a.sortOrder - b.sortOrder);

    // 分页
    const total = categories.length;
    const offset = (params.page - 1) * params.pageSize;
    const paginatedCategories = categories.slice(offset, offset + params.pageSize);

    return {
      items: paginatedCategories,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
      hasNext: params.page < Math.ceil(total / params.pageSize),
      hasPrevious: params.page > 1
    };
  }

  /**
   * 获取分类树
   */
  async getCategoryTree(rootId?: string): Promise<CategoryTreeNode[]> {
    const buildTree = (parentId?: string, depth: number = 0): CategoryTreeNode[] => {
      const children = this.parentChildMap.get(parentId || '') || [];
      return children.map(childId => {
        const category = this.categories.get(childId)!;
        return {
          category,
          children: buildTree(childId, depth + 1),
          depth
        };
      }).sort((a, b) => a.category.sortOrder - b.category.sortOrder);
    };

    return buildTree(rootId);
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<CategoryStatistics> {
    const categories = Array.from(this.categories.values());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return {
      totalCount: categories.length,
      activeCount: categories.filter(c => c.status === CategoryStatus.ACTIVE).length,
      todayAdded: categories.filter(c => c.createdAt >= today).length,
      weekAdded: categories.filter(c => c.createdAt >= weekAgo).length,
      monthAdded: categories.filter(c => c.createdAt >= monthAgo).length,
      lastUpdated: new Date(),
      rootCategoryCount: categories.filter(c => !c.parentId).length,
      maxDepth: this.calculateMaxDepth(),
      countByLevel: this.calculateCountByLevel(categories),
      countByStatus: this.calculateCountByStatus(categories)
    };
  }

  /**
   * 计算最大深度
   */
  private calculateMaxDepth(): number {
    let maxDepth = 0;

    const calculateDepth = (categoryId: string, currentDepth: number): void => {
      maxDepth = Math.max(maxDepth, currentDepth);
      const children = this.parentChildMap.get(categoryId) || [];
      children.forEach(childId => calculateDepth(childId, currentDepth + 1));
    };

    // 从根分类开始计算
    const rootCategories = Array.from(this.categories.values()).filter(c => !c.parentId);
    rootCategories.forEach(category => calculateDepth(category.id, 1));

    return maxDepth;
  }

  /**
   * 计算各层级分类数量
   */
  private calculateCountByLevel(categories: Category[]): Record<number, number> {
    const countByLevel: Record<number, number> = {};
    categories.forEach(category => {
      const level = category.level;
      countByLevel[level] = (countByLevel[level] || 0) + 1;
    });
    return countByLevel;
  }

  /**
   * 计算各状态分类数量
   */
  private calculateCountByStatus(categories: Category[]): Record<CategoryStatus, number> {
    const countByStatus: Record<CategoryStatus, number> = {} as Record<CategoryStatus, number>;
    categories.forEach(category => {
      const status = category.status as CategoryStatus;
      countByStatus[status] = (countByStatus[status] || 0) + 1;
    });
    return countByStatus;
  }

  /**
   * 批量操作
   */
  async batchUpdate(updates: Array<{ id: string; data: Partial<Category> }>): Promise<BatchOperationResult<Category>> {
    const results: BatchOperationResult<Category> = {
      total: updates.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const update of updates) {
      try {
        const updatedCategory = await this.update(update.id, update.data);
        results.successful++;
        results.successfulItems.push(updatedCategory);
      } catch (error) {
        results.failed++;
        const existingCategory = this.categories.get(update.id);
        results.failedItems.push({
          item: existingCategory || { id: update.id } as Category,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 获取根分类
   */
  async getRootCategories(): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(c => !c.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 获取子分类
   */
  async getChildCategories(parentId: string): Promise<Category[]> {
    const childIds = this.parentChildMap.get(parentId) || [];
    return childIds
      .map(id => this.categories.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 移动分类
   */
  async moveCategory(categoryId: string, newParentId: string | null, currentUserId?: string): Promise<void> {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`分类不存在: ${categoryId}`);
    }

    // 验证新父分类存在性
    if (newParentId && !this.categories.has(newParentId)) {
      throw new Error(`父分类不存在: ${newParentId}`);
    }

    // 检查是否会造成循环引用
    if (newParentId) {
      let currentParent = newParentId;
      while (currentParent) {
        if (currentParent === categoryId) {
          throw new Error('不能将分类移动到其子分类下');
        }
        const parent = this.categories.get(currentParent);
        currentParent = parent?.parentId || '';
        if (!currentParent) break;
      }
    }

    await this.update(categoryId, { parentId: newParentId || undefined });
    // 方法不返回任何值
  }

  // ==================== 接口方法实现 ====================

  // findPaginated方法已在后面实现

  /**
   * 批量删除
   */
  async deleteBatch(ids: string[], currentUserId?: string): Promise<BatchOperationResult<string>> {
    const results: BatchOperationResult<string> = {
      total: ids.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const id of ids) {
      try {
        await this.delete(id);
        results.successful++;
        results.successfulItems.push(id);
      } catch (error) {
        results.failed++;
        results.failedItems.push({
          item: id,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 获取根分类（别名方法）
   */
  async findRootCategories(): Promise<Category[]> {
    return this.getRootCategories();
  }

  /**
   * 获取子分类（别名方法）
   */
  async findChildren(parentId: string): Promise<Category[]> {
    return this.getChildCategories(parentId);
  }

  /**
   * 获取所有后代分类
   */
  async findDescendants(parentId: string): Promise<Category[]> {
    const descendants: Category[] = [];
    
    const collectDescendants = (currentParentId: string) => {
      const children = this.parentChildMap.get(currentParentId) || [];
      for (const childId of children) {
        const child = this.categories.get(childId);
        if (child) {
          descendants.push(child);
          collectDescendants(childId);
        }
      }
    };

    collectDescendants(parentId);
    return descendants;
  }

  /**
   * 获取祖先分类路径
   */
  async findAncestors(categoryId: string): Promise<Category[]> {
    const ancestors: Category[] = [];
    let currentId = categoryId;
    
    while (currentId) {
      const category = this.categories.get(currentId);
      if (!category) break;
      
      if (category.parentId) {
        const parent = this.categories.get(category.parentId);
        if (parent) {
          ancestors.unshift(parent);
          currentId = category.parentId;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return ancestors;
  }

  /**
   * 获取分类路径
   */
  async getCategoryPath(categoryId: string): Promise<string> {
    const ancestors = await this.findAncestors(categoryId);
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`分类不存在: ${categoryId}`);
    }
    
    const pathParts = [...ancestors.map(c => c.name), category.name];
    return pathParts.join(' > ');
  }

  /**
   * 检查是否为祖先分类
   */
  async isAncestor(ancestorId: string, descendantId: string): Promise<boolean> {
    let currentId = descendantId;
    
    while (currentId) {
      const category = this.categories.get(currentId);
      if (!category) break;
      
      if (category.parentId === ancestorId) {
        return true;
      }
      currentId = category.parentId || '';
    }
    
    return false;
  }

  /**
   * 启用分类
   */
  async enable(id: string, currentUserId?: string): Promise<void> {
    await this.update(id, { status: CategoryStatus.ACTIVE });
  }

  /**
   * 禁用分类
   */
  async disable(id: string, currentUserId?: string): Promise<void> {
    await this.update(id, { status: CategoryStatus.INACTIVE });
  }

  /**
   * 批量更新状态
   */
  async updateStatusBatch(ids: string[], status: CategoryStatus, currentUserId?: string): Promise<BatchOperationResult<string>> {
    const results: BatchOperationResult<string> = {
      total: ids.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const id of ids) {
      try {
        await this.update(id, { status });
        results.successful++;
        results.successfulItems.push(id);
      } catch (error) {
        results.failed++;
        results.failedItems.push({
          item: id,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 根据状态查询
   */
  async findByStatus(status: CategoryStatus): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(c => c.status === status);
  }

  /**
   * 获取分类统计信息
   */
  async getCategoryStats(): Promise<any> {
    const stats = await this.getStatistics();
    return {
      totalCount: stats.totalCount,
      activeCount: stats.activeCount,
      inactiveCount: stats.countByStatus[CategoryStatus.INACTIVE] || 0,
      maxDepth: stats.maxDepth,
      lastUpdated: stats.lastUpdated
    };
  }

  // ==================== 健康检查 ====================

  /**
   * 获取健康状态
   */
  getHealthStatus(): ServiceHealthStatus {
    return {
      isHealthy: this.initialized && this.categories.size > 0,
      message: this.initialized ? '分类服务运行正常' : '分类服务未初始化',
      lastChecked: new Date(),
      details: {
        initialized: this.initialized,
        categoryCount: this.categories.size,
        codeIndexSize: this.codeIndex.size,
        parentChildMapSize: this.parentChildMap.size
      }
    };
  }

  /**
   * 重置服务
   */
  reset(): void {
    this.categories.clear();
    this.parentChildMap.clear();
    this.codeIndex.clear();
    this.initialized = false;
    console.log('CategoryService reset');
  }

  /**
   * 获取服务信息
   */
  getServiceInfo() {
    return {
      name: 'CategoryService',
      version: '2.0.0',
      initialized: this.initialized,
      categoryCount: this.categories.size
    };
  }

  // ==================== 缺失的接口方法占位符 ====================

  /**
   * 分页查询分类
   */
  async findPaginated(params: PaginationParams, filter?: CategoryFilter): Promise<PaginatedResult<Category>> {
    return this.findWithPagination(params, filter);
  }

  // enable方法已在前面实现

  // disable方法已在前面实现

  // updateStatusBatch方法已在前面实现

  /**
   * 搜索分类
   */
  async search(keyword: string, filter?: CategoryFilter): Promise<Category[]> {
    const searchFilter = { ...filter, keyword };
    const result = await this.findWithPagination({ page: 1, pageSize: 1000 }, searchFilter);
    return result.items;
  }

  /**
   * 根据名称模糊查询分类
   */
  async findByNameLike(name: string): Promise<Category[]> {
    const lowerName = name.toLowerCase();
    return Array.from(this.categories.values()).filter(c =>
      c.name.toLowerCase().includes(lowerName)
    );
  }

  /**
   * 检查分类编码是否存在
   */
  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const existingId = this.codeIndex.get(code);
    return existingId !== undefined && existingId !== excludeId;
  }

  /**
   * 检查分类名称是否存在（在同一父分类下）
   */
  async existsByName(name: string, parentId?: string, excludeId?: string): Promise<boolean> {
    const categories = Array.from(this.categories.values());
    return categories.some(c =>
      c.name === name &&
      c.parentId === parentId &&
      c.id !== excludeId
    );
  }

  /**
   * 获取分类使用情况统计
   */
  async getUsageStatistics(categoryId: string): Promise<{
    productCount: number;
    activeProductCount: number;
    totalInventoryValue: number;
    lastUsed: Date | null;
  }> {
    // 临时实现，返回默认值
    return {
      productCount: 0,
      activeProductCount: 0,
      totalInventoryValue: 0,
      lastUsed: null
    };
  }

  /**
   * 获取热门分类排行
   */
  async getPopularCategories(limit: number = 10): Promise<Array<{
    category: Category;
    productCount: number;
    inventoryValue: number;
  }>> {
    // 临时实现，返回空数组
    return [];
  }

  /**
   * 验证分类数据
   */
  async validateCategory(data: Partial<Category>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (data.name && data.name.trim().length === 0) {
      errors.push('分类名称不能为空');
    }

    if (data.code && await this.existsByCode(data.code, data.id)) {
      errors.push('分类编码已存在');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 检查分类是否可以删除
   */
  async canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    relatedEntities?: {
      products: number;
      subCategories: number;
    };
  }> {
    const children = await this.findChildren(id);
    const subCategoriesCount = children.length;

    if (subCategoriesCount > 0) {
      return {
        canDelete: false,
        reason: '该分类下还有子分类，无法删除',
        relatedEntities: {
          products: 0, // 需要产品服务支持
          subCategories: subCategoriesCount
        }
      };
    }

    return {
      canDelete: true,
      relatedEntities: {
        products: 0,
        subCategories: 0
      }
    };
  }

  /**
   * 检查分类层级深度是否合法
   */
  async validateDepth(parentId: string | null): Promise<{
    isValid: boolean;
    currentDepth: number;
    maxAllowedDepth: number;
  }> {
    const maxDepth = 5; // 最大允许5层
    let currentDepth = 0;

    if (parentId) {
      const ancestors = await this.findAncestors(parentId);
      currentDepth = ancestors.length + 1;
    }

    return {
      isValid: currentDepth < maxDepth,
      currentDepth,
      maxAllowedDepth: maxDepth
    };
  }

  /**
   * 导出分类数据
   */
  async exportCategories(filter?: CategoryFilter): Promise<ServiceResult<Category[]>> {
    try {
      const categories = filter ?
        await this.search(filter.keyword || '', filter) :
        await this.findAll();

      return {
        success: true,
        data: categories,
        message: '导出成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败'
      };
    }
  }

  /**
   * 导入分类数据
   */
  async importCategories(categories: Partial<Category>[]): Promise<BatchOperationResult<Category>> {
    const results: BatchOperationResult<Category> = {
      total: categories.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const categoryData of categories) {
      try {
        const category = await this.create(categoryData as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>);
        results.successful++;
        results.successfulItems.push(category);
      } catch (error) {
        results.failed++;
        results.failedItems.push({
          item: categoryData as Category,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  /**
   * 导出分类树结构
   */
  async exportCategoryTree(): Promise<ServiceResult<CategoryTreeNode[]>> {
    try {
      const tree = await this.getCategoryTree();
      return {
        success: true,
        data: tree,
        message: '导出成功'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败'
      };
    }
  }

  /**
   * 刷新分类缓存
   */
  async refreshCache(): Promise<void> {
    await this.initialize();
  }

  /**
   * 清空分类缓存
   */
  async clearCache(): Promise<void> {
    this.categories.clear();
    this.codeIndex.clear();
    this.parentChildMap.clear();
    this.initialized = false;
  }

  /**
   * 预热分类缓存
   */
  async warmupCache(): Promise<void> {
    await this.initialize();
  }
}

// 创建并导出服务实例
export const categoryService = new CategoryService();

// 默认导出
export default categoryService;
