/**
 * 库存领域服务
 * 整合产品管理和库存管理的核心业务逻辑
 * 替代原InventoryService的核心功能，遵循领域驱动设计
 */

import { Product, ProductStatus, InventoryStock, InventoryTransaction, TransactionType } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';

// 领域服务结果类型
export interface DomainServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// 产品与库存组合类型
export interface ProductWithStock {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  costPrice: number;
  salePrice: number;
  status: ProductStatus;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  warehouseId: string;
  warehouseName?: string;
  isLowStock: boolean;
  isOutOfStock: boolean;
  totalValue: number;
}

// 库存操作请求类型
export interface StockOperationRequest {
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice?: number;
  referenceType?: string;
  referenceId?: string;
  remark?: string;
  operator: string;
}

// 产品过滤器
export interface ProductFilter {
  search?: string;
  categoryId?: string;
  status?: ProductStatus;
  hasStock?: boolean;
  lowStock?: boolean;
  warehouseId?: string;
  limit?: number;
  offset?: number;
}

/**
 * 库存领域服务
 * 职责：产品和库存的一体化管理，保证业务一致性
 */
export class InventoryDomainService {
  /**
   * 获取产品及其库存信息
   */
  async getProductsWithStock(filter?: ProductFilter): Promise<DomainServiceResult<ProductWithStock[]>> {
    try {
      // 构建查询条件
      let whereClause = 'WHERE p.status != "deleted"';
      const params: any[] = [];

      if (filter?.search) {
        whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
        params.push(`%${filter.search}%`, `%${filter.search}%`);
      }

      if (filter?.categoryId) {
        whereClause += ' AND p.categoryId = ?';
        params.push(filter.categoryId);
      }

      if (filter?.status) {
        whereClause += ' AND p.status = ?';
        params.push(filter.status);
      }

      if (filter?.warehouseId) {
        whereClause += ' AND s.warehouseId = ?';
        params.push(filter.warehouseId);
      }

      // 单次查询获取产品和库存信息
      const query = `
        SELECT 
          p.id, p.name, p.sku, p.description, p.categoryId, p.unitId,
          p.costPrice, p.salePrice, p.status, p.minStock, p.maxStock,
          COALESCE(s.currentStock, 0) as currentStock,
          COALESCE(s.availableStock, 0) as availableStock,
          COALESCE(s.reservedStock, 0) as reservedStock,
          COALESCE(s.warehouseId, 'default') as warehouseId,
          w.name as warehouseName,
          (COALESCE(s.currentStock, 0) * p.salePrice) as totalValue
        FROM products p
        LEFT JOIN inventory_stocks s ON p.id = s.productId
        LEFT JOIN warehouses w ON s.warehouseId = w.id
        ${whereClause}
        ORDER BY p.name
      `;

      const products = await window.electronAPI.dbQuery(query, params);
      
      // 转换为领域对象
      const productsWithStock: ProductWithStock[] = products.map(row => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        description: row.description,
        categoryId: row.categoryId,
        unitId: row.unitId,
        costPrice: row.costPrice || 0,
        salePrice: row.salePrice || 0,
        status: row.status,
        currentStock: row.currentStock,
        availableStock: row.availableStock,
        reservedStock: row.reservedStock,
        minStock: row.minStock || 0,
        maxStock: row.maxStock || 1000,
        warehouseId: row.warehouseId,
        warehouseName: row.warehouseName || '默认仓库',
        isLowStock: row.currentStock <= (row.minStock || 0),
        isOutOfStock: row.currentStock === 0,
        totalValue: row.totalValue || 0
      }));

      // 应用过滤条件
      let filtered = productsWithStock;
      
      if (filter?.hasStock) {
        filtered = filtered.filter(p => p.currentStock > 0);
      }
      
      if (filter?.lowStock) {
        filtered = filtered.filter(p => p.isLowStock);
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
        error: error instanceof Error ? error.message : '获取产品库存信息失败'
      };
    }
  }

  /**
   * 获取单个产品的库存信息
   */
  async getProductStock(productId: string, warehouseId?: string): Promise<DomainServiceResult<InventoryStock>> {
    try {
      if (!productId) {
        return { success: false, error: '产品ID不能为空' };
      }

      const warehouse = warehouseId || 'default';
      const stock = await window.electronAPI.dbGetStock(productId, warehouse);
      
      if (!stock) {
        // 如果没有库存记录，创建默认记录
        const defaultStock: InventoryStock = {
          id: uuidv4(),
          productId,
          warehouseId: warehouse,
          currentStock: 0,
          availableStock: 0,
          reservedStock: 0,
          minStock: 0,
          maxStock: 1000,
          avgCost: 0,
          unitCost: 0,
          unitPrice: 0,
          totalValue: 0,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await window.electronAPI.dbCreateStock(defaultStock);
        return { success: true, data: defaultStock };
      }

      return { success: true, data: stock };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存信息失败'
      };
    }
  }

  /**
   * 库存入库操作
   */
  async stockIn(request: StockOperationRequest): Promise<DomainServiceResult<InventoryTransaction>> {
    return this.executeStockOperation(request, TransactionType.IN);
  }

  /**
   * 库存出库操作
   */
  async stockOut(request: StockOperationRequest): Promise<DomainServiceResult<InventoryTransaction>> {
    return this.executeStockOperation(request, TransactionType.OUT);
  }

  /**
   * 库存调整操作
   */
  async adjustStock(request: StockOperationRequest): Promise<DomainServiceResult<InventoryTransaction>> {
    return this.executeStockOperation(request, TransactionType.ADJUST);
  }

  /**
   * 执行库存操作（事务性）
   */
  private async executeStockOperation(
    request: StockOperationRequest, 
    type: TransactionType
  ): Promise<DomainServiceResult<InventoryTransaction>> {
    try {
      // 开始事务
      await window.electronAPI.dbBeginTransaction();

      try {
        // 1. 验证产品存在
        const product = await window.electronAPI.dbGetProduct(request.productId);
        if (!product) {
          throw new Error('产品不存在');
        }

        // 2. 验证仓库存在
        const warehouse = await window.electronAPI.dbGetWarehouse(request.warehouseId);
        if (!warehouse) {
          throw new Error('仓库不存在');
        }

        // 3. 获取当前库存
        const currentStock = await this.getProductStock(request.productId, request.warehouseId);
        if (!currentStock.success) {
          throw new Error('获取库存信息失败');
        }

        // 4. 计算新库存数量
        let newQuantity = currentStock.data!.currentStock;
        if (type === TransactionType.IN) {
          newQuantity += request.quantity;
        } else if (type === TransactionType.OUT) {
          if (newQuantity < request.quantity) {
            throw new Error('库存不足');
          }
          newQuantity -= request.quantity;
        } else if (type === TransactionType.ADJUST) {
          newQuantity = request.quantity;
        }

        // 5. 更新库存
        const updatedStock: Partial<InventoryStock> = {
          currentStock: newQuantity,
          availableStock: newQuantity,
          unitPrice: request.unitPrice || currentStock.data!.unitPrice,
          totalValue: newQuantity * (request.unitPrice || currentStock.data!.unitPrice),
          updatedAt: new Date()
        };

        await window.electronAPI.dbUpdateStock(request.productId, request.warehouseId, updatedStock);

        // 6. 创建交易记录
        const transaction: InventoryTransaction = {
          id: uuidv4(),
          transactionNo: `TXN-${Date.now()}`,
          productId: request.productId,
          warehouseId: request.warehouseId,
          type: type,
          transactionType: type,
          quantity: type === TransactionType.OUT ? -request.quantity : request.quantity,
          unitPrice: request.unitPrice || 0,
          unitCost: request.unitPrice || 0,
          totalAmount: (request.unitPrice || 0) * request.quantity,
          totalCost: (request.unitPrice || 0) * request.quantity,
          referenceType: request.referenceType,
          referenceId: request.referenceId,
          remark: request.remark,
          notes: request.remark,
          operator: request.operator,
          createdBy: request.operator,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await window.electronAPI.dbCreateTransaction(transaction);

        // 提交事务
        await window.electronAPI.dbCommitTransaction();

        return { success: true, data: transaction };
      } catch (error) {
        // 回滚事务
        await window.electronAPI.dbRollbackTransaction();
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '库存操作失败'
      };
    }
  }

  /**
   * 获取低库存商品
   */
  async getLowStockItems(): Promise<DomainServiceResult<ProductWithStock[]>> {
    return this.getProductsWithStock({ lowStock: true });
  }

  /**
   * 获取缺货商品
   */
  async getOutOfStockItems(): Promise<DomainServiceResult<ProductWithStock[]>> {
    try {
      const result = await this.getProductsWithStock();
      if (!result.success) {
        return result;
      }

      const outOfStockItems = result.data!.filter(item => item.isOutOfStock);
      return { success: true, data: outOfStockItems };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取缺货商品失败'
      };
    }
  }

  /**
   * 创建产品
   */
  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<DomainServiceResult<Product>> {
    try {
      // 验证必填字段
      if (!productData.name?.trim()) {
        return { success: false, error: '商品名称不能为空' };
      }
      if (!productData.sku?.trim()) {
        return { success: false, error: 'SKU不能为空' };
      }

      // 检查SKU唯一性
      const existingProduct = await window.electronAPI.dbGetProductBySKU(productData.sku);
      if (existingProduct) {
        return { success: false, error: `SKU "${productData.sku}" 已存在` };
      }

      const product: Product = {
        ...productData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

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
  async updateProduct(id: string, updates: Partial<Product>): Promise<DomainServiceResult<Product>> {
    try {
      const existingProduct = await window.electronAPI.dbGetProduct(id);
      if (!existingProduct) {
        return { success: false, error: '产品不存在' };
      }

      // SKU唯一性检查
      if (updates.sku && updates.sku !== existingProduct.sku) {
        const duplicateProduct = await window.electronAPI.dbGetProductBySKU(updates.sku);
        if (duplicateProduct && duplicateProduct.id !== id) {
          return { success: false, error: `SKU "${updates.sku}" 已存在` };
        }
      }

      const updatedProduct = {
        ...existingProduct,
        ...updates,
        updatedAt: new Date()
      };

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
  async deleteProduct(id: string): Promise<DomainServiceResult<boolean>> {
    try {
      const product = await window.electronAPI.dbGetProduct(id);
      if (!product) {
        return { success: false, error: '产品不存在' };
      }

      // 检查是否有库存
      const hasStock = await window.electronAPI.dbCheckProductHasStock(id);
      if (hasStock) {
        return { success: false, error: '商品有库存，无法删除' };
      }

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
   * 执行库存操作（事务性）
   */
  private async executeStockOperation(
    request: StockOperationRequest,
    type: TransactionType
  ): Promise<DomainServiceResult<InventoryTransaction>> {
    try {
      // 开始事务
      await window.electronAPI.dbBeginTransaction();

      try {
        // 1. 验证产品存在
        const product = await window.electronAPI.dbGetProduct(request.productId);
        if (!product) {
          throw new Error('产品不存在');
        }

        // 2. 验证仓库存在
        const warehouse = await window.electronAPI.dbGetWarehouse(request.warehouseId);
        if (!warehouse) {
          throw new Error('仓库不存在');
        }

        // 3. 获取当前库存
        const currentStock = await this.getProductStock(request.productId, request.warehouseId);
        if (!currentStock.success) {
          throw new Error('获取库存信息失败');
        }

        // 4. 计算新库存数量
        let newQuantity = currentStock.data!.currentStock;
        if (type === TransactionType.IN) {
          newQuantity += request.quantity;
        } else if (type === TransactionType.OUT) {
          if (newQuantity < request.quantity) {
            throw new Error('库存不足');
          }
          newQuantity -= request.quantity;
        } else if (type === TransactionType.ADJUST) {
          newQuantity = request.quantity;
        }

        // 5. 更新库存
        const updatedStock: Partial<InventoryStock> = {
          currentStock: newQuantity,
          availableStock: newQuantity,
          unitPrice: request.unitPrice || currentStock.data!.unitPrice,
          totalValue: newQuantity * (request.unitPrice || currentStock.data!.unitPrice),
          updatedAt: new Date()
        };

        await window.electronAPI.dbUpdateStock(request.productId, request.warehouseId, updatedStock);

        // 6. 创建交易记录
        const transaction: InventoryTransaction = {
          id: uuidv4(),
          transactionNo: `TXN-${Date.now()}`,
          productId: request.productId,
          warehouseId: request.warehouseId,
          type: type,
          transactionType: type,
          quantity: type === TransactionType.OUT ? -request.quantity : request.quantity,
          unitPrice: request.unitPrice || 0,
          unitCost: request.unitPrice || 0,
          totalAmount: (request.unitPrice || 0) * request.quantity,
          totalCost: (request.unitPrice || 0) * request.quantity,
          referenceType: request.referenceType,
          referenceId: request.referenceId,
          remark: request.remark,
          notes: request.remark,
          operator: request.operator,
          createdBy: request.operator,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await window.electronAPI.dbCreateTransaction(transaction);

        // 提交事务
        await window.electronAPI.dbCommitTransaction();

        return { success: true, data: transaction };
      } catch (error) {
        // 回滚事务
        await window.electronAPI.dbRollbackTransaction();
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '库存操作失败'
      };
    }
  }

  /**
   * 向后兼容方法：支持原有组件调用
   */
  async getProducts(filter?: any): Promise<DomainServiceResult<{ items: ProductWithStock[] }>> {
    const result = await this.getProductsWithStock(filter);
    if (result.success) {
      return { success: true, data: { items: result.data! } };
    }
    return result;
  }

  async getProduct(id: string): Promise<DomainServiceResult<Product>> {
    try {
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

  async updateStock(productId: string, warehouseId: string, quantity: number, type: string, remark?: string): Promise<DomainServiceResult<any>> {
    const request: StockOperationRequest = {
      productId,
      warehouseId,
      quantity,
      remark,
      operator: 'system'
    };

    if (type === 'IN') {
      return this.stockIn(request);
    } else if (type === 'OUT') {
      return this.stockOut(request);
    } else if (type === 'ADJUST') {
      return this.adjustStock(request);
    } else {
      return { success: false, error: '不支持的操作类型' };
    }
  }
}
