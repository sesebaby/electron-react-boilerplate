/**
 * 基础数据服务
 * 管理分类、单位、仓库等基础数据
 * 提供简单的CRUD操作和数据验证
 */

import { Category, Unit, Warehouse } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';
import { DomainServiceResult } from './InventoryDomainService';

// 创建请求类型
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
}

export interface CreateUnitRequest {
  name: string;
  symbol: string;
  type: string;
  precision?: number;
  description?: string;
  isActive?: boolean;
}

export interface CreateWarehouseRequest {
  code: string;
  name: string;
  address?: string;
  location?: string;
  manager?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

// 更新请求类型
export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;
export type UpdateUnitRequest = Partial<CreateUnitRequest>;
export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;

/**
 * 基础数据服务
 * 职责：分类、单位、仓库等基础数据的管理
 */
export class MasterDataService {
  
  // ==================== 分类管理 ====================
  
  /**
   * 获取所有分类
   * @param buildTree 是否构建树形结构，默认为false返回平坦列表
   */
  async getCategories(buildTree: boolean = false): Promise<DomainServiceResult<Category[]>> {
    try {
      const categories = await window.electronAPI.dbGetAllCategories();
      
      if (buildTree) {
        const categoryTree = this.buildCategoryTree(categories);
        return { success: true, data: categoryTree };
      }
      
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      };
    }
  }

  /**
   * 获取分类树形结构
   */
  async getCategoryTree(): Promise<DomainServiceResult<Category[]>> {
    return this.getCategories(true);
  }

  /**
   * 获取单个分类
   */
  async getCategory(id: string): Promise<DomainServiceResult<Category>> {
    try {
      if (!id) {
        return { success: false, error: '分类ID不能为空' };
      }

      const categoryResult = await window.electronAPI.dbGet(
        'SELECT * FROM categories WHERE id = ?', [id]
      );
      if (!categoryResult.success || !categoryResult.data) {
        return { success: false, error: '分类不存在' };
      }

      return { success: true, data: categoryResult.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      };
    }
  }

  /**
   * 创建分类
   */
  async createCategory(data: CreateCategoryRequest): Promise<DomainServiceResult<Category>> {
    try {
      // 验证必填字段
      if (!data.name?.trim()) {
        return { success: false, error: '分类名称不能为空' };
      }

      // 检查名称唯一性
      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM categories WHERE name = ?', [data.name.trim()]
      );
      if (existingResult.success && existingResult.data) {
        return { success: false, error: `分类名称 "${data.name}" 已存在` };
      }

      // 计算正确的层级
      let level = 1; // 根分类默认为1级
      if (data.parentId) {
        const parentResult = await window.electronAPI.dbGet(
          'SELECT * FROM categories WHERE id = ?', [data.parentId]
        );
        if (!parentResult.success || !parentResult.data) {
          return { success: false, error: '父分类不存在' };
        }
        level = parentResult.data.level + 1;
        
        // 检查层级限制
        if (level > 5) {
          return { success: false, error: '分类层级不能超过5级' };
        }
      }

      // 计算同级分类的下一个排序号
      const maxSortOrderResult = await window.electronAPI.dbGet(
        'SELECT MAX(sort_order) as maxSort FROM categories WHERE parent_id IS ? OR parent_id = ?', 
        [data.parentId || null, data.parentId || null]
      );
      const nextSortOrder = (maxSortOrderResult.success && maxSortOrderResult.data?.maxSort !== null) 
        ? maxSortOrderResult.data.maxSort + 1 
        : 0;

      const category: Category = {
        id: uuidv4(),
        name: data.name.trim(),
        description: data.description?.trim() || '',
        parentId: data.parentId || undefined,
        level,
        sortOrder: nextSortOrder,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await window.electronAPI.dbCreateCategory(category);
      return { success: true, data: category };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建分类失败'
      };
    }
  }

  /**
   * 更新分类
   */
  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<DomainServiceResult<Category>> {
    try {
      if (!id) {
        return { success: false, error: '分类ID不能为空' };
      }

      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM categories WHERE id = ?', [id]
      );
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: '分类不存在' };
      }
      const existingCategory = existingResult.data;

      // 检查名称唯一性（如果更新了名称）
      if (data.name && data.name !== existingCategory.name) {
        const duplicateResult = await window.electronAPI.dbGet(
          'SELECT * FROM categories WHERE name = ?', [data.name]
        );
        if (duplicateResult.success && duplicateResult.data && duplicateResult.data.id !== id) {
          return { success: false, error: `分类名称 "${data.name}" 已存在` };
        }
      }

      // 处理父分类变更时的层级重计算
      let updatedLevel = existingCategory.level;
      if (data.parentId !== undefined && data.parentId !== existingCategory.parentId) {
        // 检查是否会造成循环引用
        if (data.parentId === id) {
          return { success: false, error: '不能将分类设为自己的子分类' };
        }
        
        // 检查是否会造成循环引用（父分类不能是当前分类的子分类）
        if (data.parentId) {
          const checkCircularResult = await this.checkCircularReference(id, data.parentId);
          if (!checkCircularResult.success) {
            return checkCircularResult;
          }
        }

        // 重新计算层级
        if (data.parentId) {
          const parentResult = await window.electronAPI.dbGet(
            'SELECT * FROM categories WHERE id = ?', [data.parentId]
          );
          if (!parentResult.success || !parentResult.data) {
            return { success: false, error: '父分类不存在' };
          }
          updatedLevel = parentResult.data.level + 1;
          
          // 检查层级限制
          if (updatedLevel > 5) {
            return { success: false, error: '分类层级不能超过5级' };
          }
        } else {
          updatedLevel = 1; // 根分类
        }
      }

      // 处理父分类变更时的排序重计算
      let updatedSortOrder = data.sortOrder !== undefined ? data.sortOrder : existingCategory.sortOrder;
      if (data.parentId !== undefined && data.parentId !== existingCategory.parentId) {
        // 父分类变更了，需要重新计算同级排序
        const maxSortOrderResult = await window.electronAPI.dbGet(
          'SELECT MAX(sort_order) as maxSort FROM categories WHERE parent_id IS ? OR parent_id = ?', 
          [data.parentId || null, data.parentId || null]
        );
        updatedSortOrder = (maxSortOrderResult.success && maxSortOrderResult.data?.maxSort !== null) 
          ? maxSortOrderResult.data.maxSort + 1 
          : 0;
      }

      const updatedCategory = {
        ...existingCategory,
        ...data,
        level: updatedLevel,
        sortOrder: updatedSortOrder,
        updatedAt: new Date()
      };

      await window.electronAPI.dbUpdateCategory(id, updatedCategory);
      return { success: true, data: updatedCategory };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新分类失败'
      };
    }
  }

  /**
   * 删除分类
   */
  async deleteCategory(id: string): Promise<DomainServiceResult<boolean>> {
    try {
      if (!id) {
        return { success: false, error: '分类ID不能为空' };
      }

      const categoryResult = await window.electronAPI.dbGet(
        'SELECT * FROM categories WHERE id = ?', [id]
      );
      if (!categoryResult.success || !categoryResult.data) {
        return { success: false, error: '分类不存在' };
      }

      // 获取要删除的分类信息，用于后续重整排序
      const categoryToDeleteResult = await window.electronAPI.dbGet(
        'SELECT * FROM categories WHERE id = ?', [id]
      );
      if (!categoryToDeleteResult.success || !categoryToDeleteResult.data) {
        return { success: false, error: '要删除的分类不存在' };
      }
      const categoryToDelete = categoryToDeleteResult.data;

      // 检查是否有产品使用此分类
      const productCountResult = await window.electronAPI.dbGet(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]
      );
      const productCount = productCountResult.success ? productCountResult.data?.count || 0 : 0;
      if (productCount > 0) {
        return { success: false, error: `该分类下有 ${productCount} 个产品，无法删除` };
      }

      // 检查是否有子分类
      const childCategoriesResult = await window.electronAPI.dbAll(
        'SELECT * FROM categories WHERE parent_id = ?', [id]
      );
      const childCategories = childCategoriesResult.success ? childCategoriesResult.data || [] : [];
      if (childCategories.length > 0) {
        return { success: false, error: `该分类下有 ${childCategories.length} 个子分类，无法删除` };
      }

      // 删除分类
      await window.electronAPI.dbDeleteCategory(id);

      // 重整同级分类的排序号
      await this.reorderSiblingCategories(categoryToDelete.parent_id);
      
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除分类失败'
      };
    }
  }

  /**
   * 检查分类使用情况
   */
  async checkCategoryUsage(id: string): Promise<DomainServiceResult<{ productCount: number; childCategories: string[] }>> {
    try {
      if (!id) {
        return { success: false, error: '分类ID不能为空' };
      }

      const productCountResult = await window.electronAPI.dbGet(
        'SELECT COUNT(*) as count FROM products WHERE categoryId = ?', [id]
      );
      const productCount = productCountResult.success ? productCountResult.data?.count || 0 : 0;

      const childCategoriesResult = await window.electronAPI.dbAll(
        'SELECT id FROM categories WHERE parentId = ?', [id]
      );
      const childCategories = childCategoriesResult.success ?
        (childCategoriesResult.data || []).map((cat: any) => cat.id) : [];

      return {
        success: true,
        data: {
          productCount,
          childCategories: childCategories.map((cat: any) => cat.name)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查分类使用情况失败'
      };
    }
  }

  /**
   * 构建分类树形结构
   * 将平坦的分类列表转换为树形结构
   */
  private buildCategoryTree(categories: Category[]): Category[] {
    // 创建分类映射表，便于快速查找
    const categoryMap = new Map<string, Category>();
    const rootCategories: Category[] = [];

    // 初始化所有分类，确保children属性存在
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // 构建树形结构
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!;
      
      if (category.parentId) {
        // 有父分类，添加到父分类的children中
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children!.push(categoryWithChildren);
        } else {
          // 父分类不存在，作为根分类处理
          rootCategories.push(categoryWithChildren);
        }
      } else {
        // 无父分类，是根分类
        rootCategories.push(categoryWithChildren);
      }
    });

    // 对每个层级的分类按 sortOrder 排序
    const sortCategories = (cats: Category[]): Category[] => {
      cats.sort((a, b) => a.sortOrder - b.sortOrder);
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          cat.children = sortCategories(cat.children);
        }
      });
      return cats;
    };

    return sortCategories(rootCategories);
  }

  /**
   * 重整同级分类的排序号
   * 删除分类后调用，确保排序号连续无间隙
   */
  private async reorderSiblingCategories(parentId: string | null): Promise<void> {
    try {
      // 获取同级分类，按排序号排序
      const siblingsResult = await window.electronAPI.dbAll(
        'SELECT id, sort_order FROM categories WHERE parent_id IS ? OR parent_id = ? ORDER BY sort_order ASC', 
        [parentId || null, parentId || null]
      );
      
      if (!siblingsResult.success || !siblingsResult.data) {
        return;
      }
      
      const siblings = siblingsResult.data;
      
      // 重新分配排序号（从0开始）
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling.sort_order !== i) {
          // 更新排序号
          await window.electronAPI.dbUpdateCategory(sibling.id, { sort_order: i });
        }
      }
    } catch (error) {
      console.error('重整分类排序失败:', error);
      // 这里不抛出错误，因为这是一个优化操作，不应该影响主要的删除流程
    }
  }

  /**
   * 检查循环引用
   * 确保新的父分类不是当前分类的子分类
   */
  private async checkCircularReference(categoryId: string, newParentId: string): Promise<DomainServiceResult<boolean>> {
    try {
      // 递归检查所有子分类
      const childCategoriesResult = await window.electronAPI.dbAll(
        'SELECT id FROM categories WHERE parent_id = ?', [categoryId]
      );
      
      if (!childCategoriesResult.success) {
        return { success: false, error: '查询子分类失败' };
      }
      
      const childCategories = childCategoriesResult.data || [];
      
      // 检查新父分类是否在子分类中
      for (const child of childCategories) {
        if (child.id === newParentId) {
          return { success: false, error: '不能将分类设为其子分类的父分类，这会造成循环引用' };
        }
        
        // 递归检查子分类的子分类
        const checkResult = await this.checkCircularReference(child.id, newParentId);
        if (!checkResult.success) {
          return checkResult;
        }
      }
      
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查循环引用失败'
      };
    }
  }

  // ==================== 单位管理 ====================

  /**
   * 获取所有单位
   */
  async getUnits(): Promise<DomainServiceResult<Unit[]>> {
    try {
      const units = await window.electronAPI.dbGetAllUnits();
      return { success: true, data: units };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取单位失败'
      };
    }
  }

  /**
   * 创建单位
   */
  async createUnit(data: CreateUnitRequest): Promise<DomainServiceResult<Unit>> {
    try {
      // 验证必填字段
      if (!data.name?.trim()) {
        return { success: false, error: '单位名称不能为空' };
      }
      if (!data.symbol?.trim()) {
        return { success: false, error: '单位符号不能为空' };
      }

      // 检查名称和符号唯一性
      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM units WHERE name = ? OR symbol = ?', [data.name.trim(), data.symbol.trim()]
      );
      if (existingResult.success && existingResult.data) {
        return { success: false, error: '单位名称或符号已存在' };
      }

      const unit: Unit = {
        id: uuidv4(),
        name: data.name.trim(),
        symbol: data.symbol.trim(),
        type: data.type as any,
        precision: data.precision || 2,
        description: data.description?.trim() || '',
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await window.electronAPI.dbCreateUnit(unit);
      return { success: true, data: unit };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建单位失败'
      };
    }
  }

  /**
   * 更新单位
   */
  async updateUnit(id: string, data: UpdateUnitRequest): Promise<DomainServiceResult<Unit>> {
    try {
      if (!id) {
        return { success: false, error: '单位ID不能为空' };
      }

      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM units WHERE id = ?', [id]
      );
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: '单位不存在' };
      }
      const existingUnit = existingResult.data;

      const updatedUnit = {
        ...existingUnit,
        ...data,
        updatedAt: new Date()
      };

      await window.electronAPI.dbUpdateUnit(id, updatedUnit);
      return { success: true, data: updatedUnit };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新单位失败'
      };
    }
  }

  /**
   * 删除单位
   */
  async deleteUnit(id: string): Promise<DomainServiceResult<boolean>> {
    try {
      if (!id) {
        return { success: false, error: '单位ID不能为空' };
      }

      const unitResult = await window.electronAPI.dbGet(
        'SELECT * FROM units WHERE id = ?', [id]
      );
      if (!unitResult.success || !unitResult.data) {
        return { success: false, error: '单位不存在' };
      }

      // 检查是否有产品使用此单位
      const productCountResult = await window.electronAPI.dbGet(
        'SELECT COUNT(*) as count FROM products WHERE unitId = ?', [id]
      );
      const productCount = productCountResult.success ? productCountResult.data?.count || 0 : 0;
      if (productCount > 0) {
        return { success: false, error: `该单位被 ${productCount} 个产品使用，无法删除` };
      }

      await window.electronAPI.dbDeleteUnit(id);
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除单位失败'
      };
    }
  }

  // ==================== 仓库管理 ====================

  /**
   * 获取所有仓库
   */
  async getWarehouses(): Promise<DomainServiceResult<Warehouse[]>> {
    try {
      const result = await window.electronAPI.dbGetAllWarehouses();
      if (result && result.success) {
        return { success: true, data: result.data || [] };
      } else {
        return { success: false, error: result?.error || '获取仓库失败' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仓库失败'
      };
    }
  }

  /**
   * 创建仓库
   */
  async createWarehouse(data: CreateWarehouseRequest): Promise<DomainServiceResult<Warehouse>> {
    try {
      // 验证必填字段
      if (!data.code?.trim()) {
        return { success: false, error: '仓库编码不能为空' };
      }
      if (!data.name?.trim()) {
        return { success: false, error: '仓库名称不能为空' };
      }

      // 检查编码唯一性
      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM warehouses WHERE code = ?', [data.code.trim()]
      );
      if (existingResult.success && existingResult.data) {
        return { success: false, error: `仓库编码 "${data.code}" 已存在` };
      }

      const warehouse: Warehouse = {
        id: uuidv4(),
        code: data.code.trim(),
        name: data.name.trim(),
        address: data.address?.trim() || '',
        location: data.location?.trim() || '',
        manager: data.manager?.trim() || '',
        isDefault: data.isDefault || false,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await window.electronAPI.dbCreateWarehouse(warehouse);
      return { success: true, data: warehouse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建仓库失败'
      };
    }
  }

  /**
   * 设置默认仓库
   */
  async setDefaultWarehouse(id: string): Promise<DomainServiceResult<boolean>> {
    try {
      if (!id) {
        return { success: false, error: '仓库ID不能为空' };
      }

      // 使用专门的设置默认仓库处理器
      const result = await window.electronAPI.dbSetDefaultWarehouse(id);

      if (result.success) {
        return { success: true, data: true };
      } else {
        return { success: false, error: result.error || '设置默认仓库失败' };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置默认仓库失败'
      };
    }
  }

  /**
   * 更新仓库
   */
  async updateWarehouse(id: string, data: UpdateWarehouseRequest): Promise<DomainServiceResult<Warehouse>> {
    try {
      if (!id) {
        return { success: false, error: '仓库ID不能为空' };
      }

      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM warehouses WHERE id = ?', [id]
      );
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: '仓库不存在' };
      }
      const existingWarehouse = existingResult.data;

      // 只传递需要更新的字段，避免传递Date对象等不兼容的类型
      const updateFields = {
        ...data,
        // 不包含created_at, updated_at等Date字段，让数据库处理器自动设置
      };

      await window.electronAPI.dbUpdateWarehouse(id, updateFields);

      // 构建返回的完整对象
      const updatedWarehouse = {
        ...existingWarehouse,
        ...data,
        updatedAt: new Date()
      };
      return { success: true, data: updatedWarehouse };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新仓库失败'
      };
    }
  }

  /**
   * 删除仓库
   */
  async deleteWarehouse(id: string): Promise<DomainServiceResult<boolean>> {
    try {
      if (!id) {
        return { success: false, error: '仓库ID不能为空' };
      }

      const warehouseResult = await window.electronAPI.dbGet(
        'SELECT * FROM warehouses WHERE id = ?', [id]
      );
      if (!warehouseResult.success || !warehouseResult.data) {
        return { success: false, error: '仓库不存在' };
      }

      // 检查是否有库存在此仓库
      const stockCountResult = await window.electronAPI.dbGet(
        'SELECT COUNT(*) as count FROM inventory_stocks WHERE warehouseId = ? AND currentStock > 0', [id]
      );
      const stockCount = stockCountResult.success ? stockCountResult.data?.count || 0 : 0;
      if (stockCount > 0) {
        return { success: false, error: `该仓库有 ${stockCount} 个产品有库存，无法删除` };
      }

      await window.electronAPI.dbDeleteWarehouse(id);
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除仓库失败'
      };
    }
  }

  /**
   * 转换规则管理
   */
  async getConversionRules(): Promise<DomainServiceResult<any[]>> {
    try {
      // 这里应该实现获取转换规则的逻辑
      // 暂时返回空数组，后续需要完善
      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取转换规则失败'
      };
    }
  }

  /**
   * 向后兼容方法
   */
  async findAllCategories(): Promise<DomainServiceResult<Category[]>> {
    return this.getCategories();
  }

  async findAllUnits(): Promise<DomainServiceResult<Unit[]>> {
    return this.getUnits();
  }

  async findAllWarehouses(): Promise<DomainServiceResult<Warehouse[]>> {
    return this.getWarehouses();
  }
}
