/**
 * 轻量级产品服务
 * 替代InventoryService中的产品管理功能
 * 遵循单一职责原则，无复杂缓存，直接数据库查询
 */

import { Product, ProductStatus } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';

// 简化的服务结果类型
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 产品过滤器
export interface ProductFilter {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  hasStock?: boolean;
  limit?: number;
  offset?: number;
}

// 创建产品请求
export interface CreateProductRequest {
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  costPrice?: number;
  salePrice?: number;
  barcode?: string;
  status?: ProductStatus;
  minStock?: number;
  maxStock?: number;
}

/**
 * 产品服务类
 * 职责：商品基础信息管理
 * 特点：轻量级、无缓存、直接数据库查询
 */
export class ProductService {
  /**
   * 获取产品列表
   */
  async getProducts(filter?: ProductFilter): Promise<ServiceResult<Product[]>> {
    try {
      // 直接查询数据库，无缓存
      const products = await window.electronAPI.dbGetAllProducts();
      let filtered = products;

      // 简单过滤逻辑
      if (filter?.categoryId) {
        filtered = filtered.filter(p => p.categoryId === filter.categoryId);
      }
      
      if (filter?.status) {
        filtered = filtered.filter(p => p.status === filter.status);
      }
      
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase();
        filtered = filtered.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          (p.description && p.description.toLowerCase().includes(searchLower))
        );
      }

      // 分页处理
      if (filter?.limit) {
        const offset = filter.offset || 0;
        filtered = filtered.slice(offset, offset + filter.limit);
      }

      return { success: true, data: filtered };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '获取产品失败' 
      };
    }
  }

  /**
   * 获取单个产品
   */
  async getProduct(id: string): Promise<ServiceResult<Product>> {
    try {
      if (!id) {
        return { success: false, error: '产品ID不能为空' };
      }

      const product = await window.electronAPI.dbGetProduct(id);
      if (!product) {
        return { success: false, error: '产品不存在' };
      }
      
      return { success: true, data: product };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '获取产品失败' 
      };
    }
  }

  /**
   * 创建产品
   */
  async createProduct(data: CreateProductRequest): Promise<ServiceResult<Product>> {
    try {
      // 基础验证
      if (!data.name?.trim()) {
        return { success: false, error: '商品名称不能为空' };
      }
      
      if (!data.sku?.trim()) {
        return { success: false, error: 'SKU不能为空' };
      }

      // SKU唯一性检查
      const existingProduct = await window.electronAPI.dbGetProductBySKU(data.sku);
      if (existingProduct) {
        return { success: false, error: `SKU "${data.sku}" 已存在` };
      }

      // 条形码唯一性检查（如果提供）
      if (data.barcode) {
        const existingByBarcode = await window.electronAPI.dbGetProductByBarcode(data.barcode);
        if (existingByBarcode) {
          return { success: false, error: `条形码 "${data.barcode}" 已存在` };
        }
      }

      // 构建产品对象
      const product: Product = {
        id: uuidv4(),
        name: data.name.trim(),
        sku: data.sku.trim(),
        description: data.description?.trim() || '',
        categoryId: data.categoryId || '',
        unitId: data.unitId || '',
        costPrice: data.costPrice || 0,
        salePrice: data.salePrice || 0,
        barcode: data.barcode?.trim() || '',
        status: data.status || ProductStatus.ACTIVE,
        minStock: data.minStock || 0,
        maxStock: data.maxStock || 1000,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 保存到数据库
      const result = await window.electronAPI.dbCreateProduct(product);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '创建产品失败' 
      };
    }
  }

  /**
   * 更新产品
   */
  async updateProduct(id: string, data: Partial<Product>): Promise<ServiceResult<Product>> {
    try {
      if (!id) {
        return { success: false, error: '产品ID不能为空' };
      }

      // 检查产品是否存在
      const existingProduct = await window.electronAPI.dbGetProduct(id);
      if (!existingProduct) {
        return { success: false, error: '产品不存在' };
      }

      // SKU唯一性检查（如果更新了SKU）
      if (data.sku && data.sku !== existingProduct.sku) {
        const duplicateProduct = await window.electronAPI.dbGetProductBySKU(data.sku);
        if (duplicateProduct && duplicateProduct.id !== id) {
          return { success: false, error: `SKU "${data.sku}" 已存在` };
        }
      }

      // 条形码唯一性检查（如果更新了条形码）
      if (data.barcode && data.barcode !== existingProduct.barcode) {
        const duplicateByBarcode = await window.electronAPI.dbGetProductByBarcode(data.barcode);
        if (duplicateByBarcode && duplicateByBarcode.id !== id) {
          return { success: false, error: `条形码 "${data.barcode}" 已存在` };
        }
      }

      // 构建更新数据
      const updatedProduct = {
        ...existingProduct,
        ...data,
        updatedAt: new Date()
      };

      // 更新数据库
      const result = await window.electronAPI.dbUpdateProduct(id, updatedProduct);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '更新产品失败' 
      };
    }
  }

  /**
   * 删除产品
   */
  async deleteProduct(id: string): Promise<ServiceResult<boolean>> {
    try {
      if (!id) {
        return { success: false, error: '产品ID不能为空' };
      }

      // 检查产品是否存在
      const product = await window.electronAPI.dbGetProduct(id);
      if (!product) {
        return { success: false, error: '产品不存在' };
      }

      // 检查是否有库存（防止删除有库存的产品）
      const hasStock = await window.electronAPI.dbCheckProductHasStock(id);
      if (hasStock) {
        return { success: false, error: '商品有库存，无法删除' };
      }

      // 检查是否有关联的订单（可选检查）
      const hasOrders = await window.electronAPI.dbCheckProductHasOrders(id);
      if (hasOrders) {
        return { success: false, error: '商品有关联订单，无法删除' };
      }

      // 删除产品
      await window.electronAPI.dbDeleteProduct(id);
      return { success: true, data: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '删除产品失败' 
      };
    }
  }

  /**
   * 搜索产品
   */
  async searchProducts(searchTerm: string): Promise<ServiceResult<Product[]>> {
    if (!searchTerm?.trim()) {
      return this.getProducts();
    }
    
    return this.getProducts({ search: searchTerm.trim() });
  }

  /**
   * 验证SKU唯一性
   */
  async validateSKU(sku: string, excludeId?: string): Promise<ServiceResult<boolean>> {
    try {
      if (!sku?.trim()) {
        return { success: false, error: 'SKU不能为空' };
      }

      const existingProduct = await window.electronAPI.dbGetProductBySKU(sku.trim());
      const isValid = !existingProduct || (excludeId && existingProduct.id === excludeId);
      
      return { success: true, data: isValid };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SKU验证失败' 
      };
    }
  }

  /**
   * 验证条形码唯一性
   */
  async validateBarcode(barcode: string, excludeId?: string): Promise<ServiceResult<boolean>> {
    try {
      if (!barcode?.trim()) {
        return { success: true, data: true }; // 条形码可以为空
      }

      const existingProduct = await window.electronAPI.dbGetProductByBarcode(barcode.trim());
      const isValid = !existingProduct || (excludeId && existingProduct.id === excludeId);
      
      return { success: true, data: isValid };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '条形码验证失败' 
      };
    }
  }

  /**
   * 获取产品统计信息
   */
  async getProductStatistics(): Promise<ServiceResult<{
    totalCount: number;
    activeCount: number;
    inactiveCount: number;
    categoryCount: Record<string, number>;
  }>> {
    try {
      const products = await window.electronAPI.dbGetAllProducts();
      
      const stats = {
        totalCount: products.length,
        activeCount: products.filter(p => p.status === ProductStatus.ACTIVE).length,
        inactiveCount: products.filter(p => p.status === ProductStatus.INACTIVE).length,
        categoryCount: products.reduce((acc, product) => {
          const categoryId = product.categoryId || 'uncategorized';
          acc[categoryId] = (acc[categoryId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      return { success: true, data: stats };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '获取统计信息失败' 
      };
    }
  }
}

// 导出单例实例
export const productService = new ProductService();
