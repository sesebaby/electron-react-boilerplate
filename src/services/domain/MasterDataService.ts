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
   */
  async getCategories(): Promise<DomainServiceResult<Category[]>> {
    try {
      const categories = await window.electronAPI.dbGetAllCategories();
      return { success: true, data: categories };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      };
    }
  }

  /**
   * 获取单个分类
   */
  async getCategory(id: string): Promise<DomainServiceResult<Category>> {
    try {
      if (!id) {
        return { success: false, error: '分类ID不能为空' };
      }

      const category = await window.electronAPI.dbGetCategory(id);
      if (!category) {
        return { success: false, error: '分类不存在' };
      }

      return { success: true, data: category };
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
      const existingCategory = await window.electronAPI.dbGetCategoryByName(data.name.trim());
      if (existingCategory) {
        return { success: false, error: `分类名称 "${data.name}" 已存在` };
      }

      const category: Category = {
        id: uuidv4(),
        name: data.name.trim(),
        description: data.description?.trim() || '',
        parentId: data.parentId || null,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await window.electronAPI.dbCreateCategory(category);
      return { success: true, data: result };
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

      const existingCategory = await window.electronAPI.dbGetCategory(id);
      if (!existingCategory) {
        return { success: false, error: '分类不存在' };
      }

      // 检查名称唯一性（如果更新了名称）
      if (data.name && data.name !== existingCategory.name) {
        const duplicateCategory = await window.electronAPI.dbGetCategoryByName(data.name);
        if (duplicateCategory && duplicateCategory.id !== id) {
          return { success: false, error: `分类名称 "${data.name}" 已存在` };
        }
      }

      const updatedCategory = {
        ...existingCategory,
        ...data,
        updatedAt: new Date()
      };

      const result = await window.electronAPI.dbUpdateCategory(id, updatedCategory);
      return { success: true, data: result };
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

      const category = await window.electronAPI.dbGetCategory(id);
      if (!category) {
        return { success: false, error: '分类不存在' };
      }

      // 检查是否有产品使用此分类
      const productCount = await window.electronAPI.dbGetProductCountByCategory(id);
      if (productCount > 0) {
        return { success: false, error: `该分类下有 ${productCount} 个产品，无法删除` };
      }

      // 检查是否有子分类
      const childCategories = await window.electronAPI.dbGetChildCategories(id);
      if (childCategories.length > 0) {
        return { success: false, error: `该分类下有 ${childCategories.length} 个子分类，无法删除` };
      }

      await window.electronAPI.dbDeleteCategory(id);
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

      const productCount = await window.electronAPI.dbGetProductCountByCategory(id);
      const childCategories = await window.electronAPI.dbGetChildCategories(id);

      return {
        success: true,
        data: {
          productCount,
          childCategories: childCategories.map(cat => cat.name)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '检查分类使用情况失败'
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
      const existingUnit = await window.electronAPI.dbGetUnitByNameOrSymbol(data.name.trim(), data.symbol.trim());
      if (existingUnit) {
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

      const result = await window.electronAPI.dbCreateUnit(unit);
      return { success: true, data: result };
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

      const existingUnit = await window.electronAPI.dbGetUnit(id);
      if (!existingUnit) {
        return { success: false, error: '单位不存在' };
      }

      const updatedUnit = {
        ...existingUnit,
        ...data,
        updatedAt: new Date()
      };

      const result = await window.electronAPI.dbUpdateUnit(id, updatedUnit);
      return { success: true, data: result };
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

      const unit = await window.electronAPI.dbGetUnit(id);
      if (!unit) {
        return { success: false, error: '单位不存在' };
      }

      // 检查是否有产品使用此单位
      const productCount = await window.electronAPI.dbGetProductCountByUnit(id);
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
      const warehouses = await window.electronAPI.dbGetAllWarehouses();
      return { success: true, data: warehouses };
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
      const existingWarehouse = await window.electronAPI.dbGetWarehouseByCode(data.code.trim());
      if (existingWarehouse) {
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

      const result = await window.electronAPI.dbCreateWarehouse(warehouse);
      return { success: true, data: result };
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

      const warehouse = await window.electronAPI.dbGetWarehouse(id);
      if (!warehouse) {
        return { success: false, error: '仓库不存在' };
      }

      await window.electronAPI.dbSetDefaultWarehouse(id);
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置默认仓库失败'
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
