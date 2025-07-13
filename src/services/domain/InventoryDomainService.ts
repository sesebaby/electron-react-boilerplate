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

// 转换函数：ProductWithStock -> Product
export function convertProductWithStockToProduct(productWithStock: ProductWithStock): Product {
  return {
    id: productWithStock.id,
    name: productWithStock.name,
    sku: productWithStock.sku,
    description: productWithStock.description || '',
    categoryId: productWithStock.categoryId || '',
    unitId: productWithStock.unitId,
    purchasePrice: productWithStock.costPrice || productWithStock.salePrice || 0,
    salePrice: productWithStock.salePrice,
    status: ProductStatus.ACTIVE, // 默认为活跃状态
    minStock: productWithStock.minStock,
    maxStock: productWithStock.maxStock,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * 库存领域服务
 * 职责：产品和库存的一体化管理，保证业务一致性
 */
export class InventoryDomainService {
  private masterDataService?: any; // 延迟初始化，避免循环依赖

  private getMasterDataService() {
    if (!this.masterDataService) {
      // 延迟导入避免循环依赖
      const { MasterDataService } = require('./MasterDataService');
      this.masterDataService = new MasterDataService();
    }
    return this.masterDataService;
  }
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
        whereClause += ' AND p.category_id = ?';
        params.push(filter.categoryId);
      }

      if (filter?.status) {
        whereClause += ' AND p.status = ?';
        params.push(filter.status);
      }

      if (filter?.warehouseId) {
        whereClause += ' AND s.warehouse_id = ?';
        params.push(filter.warehouseId);
      }

      // 按照重构计划修复：使用正确的products表和字段映射
      const query = `
        SELECT
          p.id, p.name, p.sku, p.description,
          p.category_id as categoryId,
          p.purchase_price as costPrice,
          p.sale_price as salePrice,
          p.status,
          p.min_stock as minStock,
          p.max_stock as maxStock,
          COALESCE(s.current_stock, 0) as currentStock,
          COALESCE(s.available_stock, 0) as availableStock,
          COALESCE(s.reserved_stock, 0) as reservedStock,
          COALESCE(s.warehouse_id, 'default') as warehouseId,
          COALESCE(w.name, '默认仓库') as warehouseName,
          COALESCE(s.total_value, 0) as totalValue,
          p.brand,
          p.model,
          p.barcode,
          p.unit_id as unitId,
          p.updated_at as lastUpdated
        FROM products p
        LEFT JOIN inventory_stocks s ON p.id = s.product_id
        LEFT JOIN warehouses w ON s.warehouse_id = w.id
        ${whereClause}
        ORDER BY p.name
      `;

      const result = await window.electronAPI.dbAll(query, params);
      const products = result.success ? result.data : [];
      
      // 转换为领域对象
      const productsWithStock: ProductWithStock[] = products.map((row: any) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        description: row.description || '',
        categoryId: row.categoryId || '',
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

      // 按照重构计划修复：从正确的表结构获取库存信息
      const stockResult = await window.electronAPI.dbGet(
        `SELECT
          s.product_id as productId,
          s.current_stock as currentStock,
          s.available_stock as availableStock,
          s.reserved_stock as reservedStock,
          s.min_stock as minStock,
          s.max_stock as maxStock,
          s.unit_price as unitPrice,
          s.total_value as totalValue,
          s.warehouse_id as warehouseId
        FROM inventory_stocks s WHERE s.product_id = ? AND s.warehouse_id = ?`,
        [productId, warehouseId || 'default']
      );
      const stock = stockResult.success ? stockResult.data : null;
      
      if (!stock) {
        // 如果没有库存记录，创建默认记录
        const defaultStock: InventoryStock = {
          id: uuidv4(),
          productId,
          warehouseId: warehouseId || 'default',
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
        
        await window.electronAPI.dbRun(
          `INSERT INTO inventory_stocks (
            id, productId, warehouseId, currentStock, availableStock, reservedStock,
            minStock, maxStock, avgCost, unitCost, unitPrice, totalValue, version,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            defaultStock.id, defaultStock.productId, defaultStock.warehouseId,
            defaultStock.currentStock, defaultStock.availableStock, defaultStock.reservedStock,
            defaultStock.minStock, defaultStock.maxStock, defaultStock.avgCost,
            defaultStock.unitCost, defaultStock.unitPrice, defaultStock.totalValue,
            defaultStock.version, defaultStock.createdAt.toISOString(), defaultStock.updatedAt.toISOString()
          ]
        );
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
      // 开始事务（暂时跳过，后续需要实现）

      try {
        // 1. 验证产品存在
        const productResult = await window.electronAPI.dbGet(
          'SELECT * FROM products WHERE id = ?', [request.productId]
        );
        if (!productResult.success || !productResult.data) {
          throw new Error('产品不存在');
        }

        // 2. 验证仓库存在
        const warehouseResult = await window.electronAPI.dbGet(
          'SELECT * FROM warehouses WHERE id = ?', [request.warehouseId]
        );
        if (!warehouseResult.success || !warehouseResult.data) {
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

        await window.electronAPI.dbRun(
          `UPDATE inventory_stocks SET
            currentStock = ?, availableStock = ?, unitPrice = ?, totalValue = ?, updatedAt = ?
           WHERE productId = ? AND warehouseId = ?`,
          [
            updatedStock.currentStock, updatedStock.availableStock,
            updatedStock.unitPrice, updatedStock.totalValue, updatedStock.updatedAt?.toISOString(),
            request.productId, request.warehouseId
          ]
        );

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

        await window.electronAPI.dbAddTransaction(transaction);

        // 提交事务
        await window.electronAPI.dbCommit();

        return { success: true, data: transaction };
      } catch (error) {
        // 回滚事务
        await window.electronAPI.dbRollback();
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
      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM products WHERE sku = ?', [productData.sku]
      );
      if (existingResult.success && existingResult.data) {
        return { success: false, error: `SKU "${productData.sku}" 已存在` };
      }

      const product: Product = {
        ...productData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 按照重构计划：使用标准的产品创建API
      await window.electronAPI.dbCreateProduct(product);
      return { success: true, data: product };
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
      const existingResult = await window.electronAPI.dbGet(
        'SELECT * FROM products WHERE id = ?', [id]
      );
      if (!existingResult.success || !existingResult.data) {
        return { success: false, error: '产品不存在' };
      }
      const existingProduct = existingResult.data;

      // SKU唯一性检查
      if (updates.sku && updates.sku !== existingProduct.sku) {
        const duplicateResult = await window.electronAPI.dbGet(
          'SELECT * FROM products WHERE sku = ?', [updates.sku]
        );
        if (duplicateResult.success && duplicateResult.data && duplicateResult.data.id !== id) {
          return { success: false, error: `SKU "${updates.sku}" 已存在` };
        }
      }

      const updatedProduct = {
        ...existingProduct,
        ...updates,
        updatedAt: new Date()
      };

      // 按照重构计划：使用标准的产品更新API
      await window.electronAPI.dbUpdateProduct(id, updatedProduct);
      return { success: true, data: updatedProduct };
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
      const productResult = await window.electronAPI.dbGet(
        'SELECT * FROM products WHERE id = ?', [id]
      );
      if (!productResult.success || !productResult.data) {
        return { success: false, error: '产品不存在' };
      }

      // 检查是否有库存
      const stockResult = await window.electronAPI.dbGet(
        'SELECT current_stock FROM inventory_stocks WHERE product_id = ? AND current_stock > 0', [id]
      );
      const hasStock = stockResult.success && stockResult.data && stockResult.data.current_stock > 0;
      if (hasStock) {
        return { success: false, error: '商品有库存，无法删除' };
      }

      // 按照重构计划：使用标准的产品删除API
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
   * 向后兼容方法：支持原有组件调用
   */
  async getProducts(filter?: any): Promise<DomainServiceResult<{ items: ProductWithStock[] }>> {
    const result = await this.getProductsWithStock(filter);
    if (result.success) {
      return { success: true, data: { items: result.data! } };
    }
    return { success: false, error: result.error || '获取产品失败' };
  }

  async getProduct(id: string): Promise<DomainServiceResult<Product>> {
    try {
      const productResult = await window.electronAPI.dbGet(
        'SELECT * FROM products WHERE id = ?', [id]
      );
      if (!productResult.success || !productResult.data) {
        return { success: false, error: '产品不存在' };
      }
      return { success: true, data: productResult.data };
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

  /**
   * 搜索产品
   */
  async searchProducts(query: string): Promise<DomainServiceResult<ProductWithStock[]>> {
    return this.getProductsWithStock({ search: query });
  }

  /**
   * 查找所有产品（向后兼容）
   */
  async findAllProducts(): Promise<DomainServiceResult<ProductWithStock[]>> {
    return this.getProductsWithStock();
  }

  /**
   * 批量库存入库
   */
  async batchStockIn(operations: StockOperationRequest[]): Promise<DomainServiceResult<InventoryTransaction[]>> {
    try {
      // 开始事务（暂时跳过）
      const results: InventoryTransaction[] = [];

      for (const operation of operations) {
        const result = await this.stockIn(operation);
        if (!result.success) {
          // 回滚事务（暂时跳过）
          return { success: false, error: result.error };
        }
        results.push(result.data!);
      }

      // 提交事务（暂时跳过）
      return { success: true, data: results };
    } catch (error) {
      // 回滚事务（暂时跳过）
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量入库失败'
      };
    }
  }

  /**
   * 批量库存调整
   */
  async batchStockAdjust(operations: StockOperationRequest[]): Promise<DomainServiceResult<InventoryTransaction[]>> {
    try {
      // 开始事务（暂时跳过）
      const results: InventoryTransaction[] = [];

      for (const operation of operations) {
        const result = await this.adjustStock(operation);
        if (!result.success) {
          // 回滚事务（暂时跳过）
          return { success: false, error: result.error };
        }
        results.push(result.data!);
      }

      // 提交事务（暂时跳过）
      return { success: true, data: results };
    } catch (error) {
      // 回滚事务（暂时跳过）
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量调整失败'
      };
    }
  }

  /**
   * 获取交易历史
   */
  async getTransactionHistory(filter?: any): Promise<DomainServiceResult<InventoryTransaction[]>> {
    try {
      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filter?.productId) {
        whereClause += ' AND productId = ?';
        params.push(filter.productId);
      }

      if (filter?.warehouseId) {
        whereClause += ' AND warehouseId = ?';
        params.push(filter.warehouseId);
      }

      if (filter?.type) {
        whereClause += ' AND type = ?';
        params.push(filter.type);
      }

      const query = `
        SELECT * FROM inventory_transactions
        ${whereClause}
        ORDER BY createdAt DESC
        LIMIT 1000
      `;

      const result = await window.electronAPI.dbAll(query, params);
      const transactions = result.success ? result.data || [] : [];

      return { success: true, data: transactions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取交易历史失败'
      };
    }
  }

  /**
   * 产品转换相关方法
   */
  async updateProductConversion(productId: string, conversionData: any): Promise<DomainServiceResult<any>> {
    try {
      // 这里应该实现产品转换逻辑
      // 暂时返回成功，后续需要完善
      return { success: true, data: conversionData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新产品转换失败'
      };
    }
  }

  async deleteProductConversion(productId: string, conversionId: string): Promise<DomainServiceResult<boolean>> {
    try {
      // 这里应该实现删除产品转换逻辑
      // 暂时返回成功，后续需要完善
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除产品转换失败'
      };
    }
  }

  /**
   * 全局转换规则
   */
  async findAllGlobalConversionRules(): Promise<DomainServiceResult<any[]>> {
    try {
      // 这里应该实现获取全局转换规则的逻辑
      // 暂时返回空数组，后续需要完善
      return { success: true, data: [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取全局转换规则失败'
      };
    }
  }

  /**
   * 向后兼容方法：委托给MasterDataService
   */
  async findAllWarehouses(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getWarehouses();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仓库失败'
      };
    }
  }

  async findAllCategories(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getCategories();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      };
    }
  }

  async getUnits(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getUnits();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取单位失败'
      };
    }
  }

  async findAllUnits(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getUnits();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取单位失败'
      };
    }
  }

  async getCategories(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getCategories();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类失败'
      };
    }
  }

  async getWarehouses(): Promise<DomainServiceResult<any[]>> {
    try {
      const masterDataService = this.getMasterDataService();
      return await masterDataService.getWarehouses();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仓库失败'
      };
    }
  }
}
