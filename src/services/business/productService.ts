/**
 * 产品服务实现
 * 
 * 支持依赖注入的产品服务实现
 */

import {
  Product,
  ProductStatus,
  InventoryItem
} from '../../types/entities';
import { ProductSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import electronDatabase from '../database/electronDatabase';
import { PaginatedResult, PaginationParams, BatchOperationResult } from '../interfaces/IBusinessService';
// 使用从接口导入的类型
type ProductInventoryInfo = {
  productId: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  safetyStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastUpdated: Date;
};
import { IBusinessService } from '../interfaces/IBusinessService';
import { ICategoryService } from '../interfaces/ICategoryService';
import { IUnitService } from '../interfaces/IUnitService';
import { notificationHelper } from '../../utils/notificationHelper';
import { logger } from '../../utils/secureLogger';
import { ConcurrencyManager } from '../../utils/concurrency';
import { ValidationError, BusinessError } from '../../utils/errors';

// 简单类型定义
// 简化类型定义
interface ProductFilter {
  categoryId?: string;
  status?: ProductStatus;
  name?: string;
  sku?: string;
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
}

interface ProductStatistics {
  totalCount: number;
  activeCount: number;
  countByStatus: Record<ProductStatus, number>;
  countByCategory: Record<string, number>;
  averagePrice: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayAdded: number;
  weekAdded: number;
  monthAdded: number;
  lastUpdated: Date;
}

interface IPermissionChecker {
  hasPermission(userId: string, permission: string): Promise<boolean>;
  hasAnyPermission(userId: string, permissions: string[]): Promise<boolean>;
  hasAllPermissions(userId: string, permissions: string[]): Promise<boolean>;
}

interface ServiceHealthStatus {
  isHealthy: boolean;
  message: string;
  lastChecked: Date;
  details?: any;
}

interface ProductPriceHistoryLocal {
  productId: string;
  priceType: 'purchase' | 'sale';
  price: number;
  effectiveDate: Date;
  operator: string;
  reason?: string;
}

// 类型定义已从IBusinessService导入

/**
 * 产品服务实现类
 */
export class ProductService implements IBusinessService {
  private products: Map<string, Product> = new Map();
  private skuIndex: Map<string, string> = new Map(); // SKU -> ID mapping
  private barcodeIndex: Map<string, string> = new Map(); // Barcode -> ID mapping
  private categoryIndex: Map<string, string[]> = new Map(); // CategoryId -> ProductIds
  private initialized = false;

  // 依赖注入的服务
  private categoryService?: ICategoryService;
  private unitService?: IUnitService;
  private permissionChecker?: IPermissionChecker;

  // ==================== 依赖注入 ====================

  /**
   * 注入分类服务
   */
  setCategoryService(categoryService: ICategoryService): void {
    this.categoryService = categoryService;
  }

  /**
   * 注入单位服务
   */
  setUnitService(unitService: IUnitService): void {
    this.unitService = unitService;
  }

  /**
   * 注入权限检查器
   */
  setPermissionChecker(permissionChecker: IPermissionChecker): void {
    this.permissionChecker = permissionChecker;
  }

  // ==================== 生命周期管理 ====================

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('ProductService already initialized');
      return;
    }

    console.log('Initializing ProductService...');
    
    try {
      // 从数据库加载产品数据
      const dbItems = await electronDatabase.getAllItems();
      console.log(`Loaded ${dbItems.length} products from database`);
      
      // 转换并缓存数据
      for (const dbItem of dbItems) {
        const product: Product = {
          id: dbItem.id,
          name: dbItem.name,
          description: dbItem.description || '',
          sku: dbItem.sku,
          categoryId: dbItem.category || 'default',
          unitId: 'default', // 默认单位，因为数据库没有单位字段
          brand: (dbItem as any).brand || '',
          model: (dbItem as any).model || '',
          barcode: '',
          purchasePrice: dbItem.unitPrice || 0,
          salePrice: dbItem.unitPrice || 0,
          minStock: dbItem.reorderLevel || 0,
          maxStock: dbItem.maxStock || 0,
          status: this.mapLegacyStatusToProductStatus(dbItem.status || 'in-stock'),
          createdAt: new Date(dbItem.lastUpdated || Date.now()),
          updatedAt: new Date(dbItem.lastUpdated || Date.now())
        };
        
        this.addToCache(product);
      }

      this.initialized = true;
      console.log('ProductService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize ProductService:', error);
      throw error;
    }
  }

  /**
   * 映射旧状态到新状态
   */
  private mapLegacyStatusToProductStatus(legacyStatus: string): ProductStatus {
    switch (legacyStatus.toLowerCase()) {
      case 'in-stock':
      case 'low-stock':
        return ProductStatus.ACTIVE;
      case 'out-of-stock':
        return ProductStatus.INACTIVE;
      case 'discontinued':
        return ProductStatus.DISCONTINUED;
      default:
        return ProductStatus.ACTIVE;
    }
  }

  /**
   * 添加到缓存
   */
  private addToCache(product: Product): void {
    this.products.set(product.id, product);
    this.skuIndex.set(product.sku, product.id);
    
    if (product.barcode) {
      this.barcodeIndex.set(product.barcode, product.id);
    }

    // 更新分类索引
    if (!this.categoryIndex.has(product.categoryId)) {
      this.categoryIndex.set(product.categoryId, []);
    }
    this.categoryIndex.get(product.categoryId)!.push(product.id);
  }

  /**
   * 从缓存移除
   */
  private removeFromCache(product: Product): void {
    this.products.delete(product.id);
    this.skuIndex.delete(product.sku);
    
    if (product.barcode) {
      this.barcodeIndex.delete(product.barcode);
    }

    // 更新分类索引
    const categoryProducts = this.categoryIndex.get(product.categoryId);
    if (categoryProducts) {
      const index = categoryProducts.indexOf(product.id);
      if (index > -1) {
        categoryProducts.splice(index, 1);
      }
      if (categoryProducts.length === 0) {
        this.categoryIndex.delete(product.categoryId);
      }
    }
  }

  // ==================== 基础CRUD操作 ====================

  /**
   * 创建产品
   */
  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return ConcurrencyManager.withMutex(`product-create-${data.sku}`, async () => {
      // 权限检查
      if (this.permissionChecker) {
        const hasPermission = await this.permissionChecker.hasPermission('current-user', 'products.create');
        if (!hasPermission) {
          throw new ValidationError('无权限创建产品');
        }
      }

      // 验证SKU唯一性
      if (this.skuIndex.has(data.sku)) {
        throw new BusinessError(`SKU "${data.sku}" 已存在`);
      }

      // 验证条码唯一性
      if (data.barcode && this.barcodeIndex.has(data.barcode)) {
        throw new BusinessError(`条码 "${data.barcode}" 已存在`);
      }

      // 验证分类存在性
      if (this.categoryService && data.categoryId !== 'default') {
        const category = await this.categoryService.findById(data.categoryId);
        if (!category) {
          throw new ValidationError(`分类不存在: ${data.categoryId}`);
        }
      }

      // 验证单位存在性
      if (this.unitService && data.unitId !== 'default') {
        const unit = await this.unitService.findById(data.unitId);
        if (!unit) {
          throw new ValidationError(`单位不存在: ${data.unitId}`);
        }
      }

      const product: Product = {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 验证数据
      const validation = validateEntity(ProductSchema, product);
      if (!validation.success) {
        throw new ValidationError(`产品数据验证失败: ${validation.errors?.join(', ')}`);
      }

      try {
        // 保存到数据库 - 映射到InventoryItem格式
        const result = await electronDatabase.createItem({
          name: product.name,
          description: product.description || '',
          sku: product.sku,
          category: product.categoryId,
          supplier: '',
          stockQuantity: 0,
          reservedQuantity: 0,
          unitPrice: product.salePrice,
          totalValue: 0,
          // lastUpdated: product.updatedAt, // InventoryItem没有lastUpdated字段
          status: product.status === ProductStatus.ACTIVE ? 'in-stock' :
                  product.status === ProductStatus.INACTIVE ? 'out-of-stock' : 'discontinued',
          location: '',
          reorderLevel: product.minStock,
          maxStock: product.maxStock
        });

        if (!result) {
          throw new Error('创建产品失败');
        }

        // 添加到缓存
        this.addToCache(product);

        // 发送通知
        notificationHelper.showSuccess(`产品创建成功: ${product.name}`, 'success');
        logger.info('Product created successfully', { productId: product.id, sku: product.sku });

        return product;
      } catch (error) {
        logger.error('Failed to create product', { error, productData: data });
        throw new BusinessError(`创建产品失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    });
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const id = this.skuIndex.get(sku);
    return id ? this.products.get(id) || null : null;
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      throw new Error(`产品不存在: ${id}`);
    }

    // 权限检查
    if (this.permissionChecker) {
      const hasPermission = await this.permissionChecker.hasPermission('current-user', 'products.update');
      if (!hasPermission) {
        throw new ValidationError('无权限更新产品');
      }
    }

    const updatedProduct: Product = {
      ...existingProduct,
      ...data,
      updatedAt: new Date()
    };

    try {
      // 更新数据库 - 映射到InventoryItem格式
      const result = await electronDatabase.updateItem(id, {
        name: updatedProduct.name,
        description: updatedProduct.description,
        sku: updatedProduct.sku,
        category: updatedProduct.categoryId,
        unitPrice: updatedProduct.salePrice,
        status: updatedProduct.status === ProductStatus.ACTIVE ? 'in-stock' :
                updatedProduct.status === ProductStatus.INACTIVE ? 'out-of-stock' : 'discontinued',
        reorderLevel: updatedProduct.minStock,
        maxStock: updatedProduct.maxStock,
        lastUpdated: updatedProduct.updatedAt
      });

      if (!result) {
        throw new Error('更新产品失败');
      }

      // 更新缓存
      this.removeFromCache(existingProduct);
      this.addToCache(updatedProduct);

      return updatedProduct;
    } catch (error) {
      throw new BusinessError(`更新产品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  async delete(id: string): Promise<void> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`产品不存在: ${id}`);
    }

    // 权限检查
    if (this.permissionChecker) {
      const hasPermission = await this.permissionChecker.hasPermission('current-user', 'products.delete');
      if (!hasPermission) {
        throw new ValidationError('无权限删除产品');
      }
    }

    try {
      // 从数据库删除
      const result = await electronDatabase.deleteItem(id);
      if (!result) {
        throw new Error('删除产品失败');
      }

      // 从缓存删除
      this.removeFromCache(product);

      console.log(`Product deleted: ${product.name} (${id})`);
    } catch (error) {
      throw new BusinessError(`删除产品失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // ==================== 高级查询方法 ====================

  async findWithPagination(params: PaginationParams, filter?: ProductFilter): Promise<PaginatedResult<Product>> {
    let products = Array.from(this.products.values());

    // 应用过滤器
    if (filter) {
      if (filter.status) {
        products = products.filter(p => p.status === filter.status);
      }
      if (filter.categoryId) {
        products = products.filter(p => p.categoryId === filter.categoryId);
      }
      if (filter.keyword) {
        const term = filter.keyword.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(term) ||
          p.sku.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }
    }

    // 分页
    const total = products.length;
    const offset = (params.page - 1) * params.pageSize;
    const paginatedProducts = products.slice(offset, offset + params.pageSize);

    return {
      data: paginatedProducts,
      items: paginatedProducts,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
      hasNext: params.page < Math.ceil(total / params.pageSize),
      hasPrevious: params.page > 1
    };
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.categoryId === categoryId);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const id = this.barcodeIndex.get(barcode);
    return id ? this.products.get(id) || null : null;
  }



  async getPriceHistory(productId: string): Promise<ProductPriceHistoryLocal[]> {
    // 价格历史记录需要单独的表来存储，暂时返回空数组
    return [];
  }

  async batchUpdate(updates: Array<{ id: string; data: Partial<Product> }>): Promise<BatchOperationResult<Product>> {
    const results: BatchOperationResult<Product> = {
      total: updates.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const update of updates) {
      try {
        const updatedProduct = await this.update(update.id, update.data);
        results.successful++;
        results.successfulItems.push(updatedProduct);
      } catch (error) {
        results.failed++;
        const existingProduct = this.products.get(update.id);
        results.failedItems.push({
          item: existingProduct || { id: update.id } as Product,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  // ==================== 缺失的接口方法实现 ====================

  // Pagination and batch operations
  async findPaginated(params: any, filter?: ProductFilter): Promise<any> {
    const products = Array.from(this.products.values());
    const filtered = this.applyFilter(products, filter);
    const { page = 1, pageSize = 10 } = params;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
      hasNext: end < filtered.length,
      hasPrevious: page > 1
    };
  }

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
        results.failedItems.push({ item: id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }

  async findByUnit(unitId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.unitId === unitId);
  }

  async getCountByCategory(categoryId: string): Promise<number> {
    return Array.from(this.products.values()).filter(p => p.categoryId === categoryId).length;
  }

  async getCountByUnit(unitId: string): Promise<number> {
    return Array.from(this.products.values()).filter(p => p.unitId === unitId).length;
  }

  // Status management
  async enable(id: string, currentUserId?: string): Promise<void> {
    await this.update(id, { status: ProductStatus.ACTIVE });
  }

  async disable(id: string, currentUserId?: string): Promise<void> {
    await this.update(id, { status: ProductStatus.INACTIVE });
  }

  async discontinue(id: string, reason: string, currentUserId?: string): Promise<void> {
    await this.update(id, { status: ProductStatus.DISCONTINUED });
  }

  async updateStatusBatch(ids: string[], status: ProductStatus, currentUserId?: string): Promise<BatchOperationResult<string>> {
    const results: BatchOperationResult<string> = { total: ids.length, successful: 0, failed: 0, successfulItems: [], failedItems: [] };
    for (const id of ids) {
      try {
        await this.update(id, { status });
        results.successful++;
        results.successfulItems.push(id);
      } catch (error) {
        results.failed++;
        results.failedItems.push({ item: id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.status === status);
  }

  // Inventory related (placeholder implementations)
  async getInventoryInfoBatch(productIds: string[]): Promise<any[]> {
    return productIds.map(id => ({ productId: id, totalStock: 0, availableStock: 0, reservedStock: 0, safetyStock: 0, isLowStock: false, isOutOfStock: true, lastUpdated: new Date() }));
  }

  async getLowStockProducts(): Promise<Product[]> {
    return [];
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    return [];
  }

  async updateSafetyStock(productId: string, safetyStock: number, currentUserId?: string): Promise<void> {
    // Placeholder implementation
  }

  // Price management
  async updatePrice(productId: string, price: number, costPrice?: number, currentUserId?: string): Promise<void> {
    const updates: any = { salePrice: price };
    if (costPrice !== undefined) updates.costPrice = costPrice;
    await this.update(productId, updates);
  }

  async updatePriceBatch(updates: Array<{ productId: string; price: number; costPrice?: number; }>, currentUserId?: string): Promise<BatchOperationResult<string>> {
    const results: BatchOperationResult<string> = { total: updates.length, successful: 0, failed: 0, successfulItems: [], failedItems: [] };
    for (const update of updates) {
      try {
        await this.updatePrice(update.productId, update.price, update.costPrice, currentUserId);
        results.successful++;
        results.successfulItems.push(update.productId);
      } catch (error) {
        results.failed++;
        results.failedItems.push({ item: update.productId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }


  async findByPriceRange(minPrice: number, maxPrice: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.salePrice >= minPrice && p.salePrice <= maxPrice);
  }

  // Search and query
  async findByNameLike(name: string): Promise<Product[]> {
    const lowerName = name.toLowerCase();
    return Array.from(this.products.values()).filter(p => p.name.toLowerCase().includes(lowerName));
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const existing = this.skuIndex.get(sku);
    return existing !== undefined && existing !== excludeId;
  }

  async existsByBarcode(barcode: string, excludeId?: string): Promise<boolean> {
    const existing = this.barcodeIndex.get(barcode);
    return existing !== undefined && existing !== excludeId;
  }

  async getPopularProducts(limit: number = 10): Promise<Array<{ product: Product; salesCount: number; revenue: number; }>> {
    return [];
  }

  // Validation
  async validateProduct(data: Partial<Product>): Promise<{ isValid: boolean; errors: string[]; warnings: string[]; }> {
    return { isValid: true, errors: [], warnings: [] };
  }

  async canDelete(id: string): Promise<{ canDelete: boolean; reason?: string; relatedEntities?: any; }> {
    return { canDelete: true };
  }

  async validateSku(sku: string): Promise<{ isValid: boolean; errors: string[]; suggestions: string[]; }> {
    return { isValid: true, errors: [], suggestions: [] };
  }

  // Sales statistics
  async getSalesStatistics(productId: string, startDate: Date, endDate: Date): Promise<any> {
    return { totalSales: 0, totalRevenue: 0, averagePrice: 0, topCustomers: [] };
  }

  async getInventoryTurnover(productId: string, period: 'month' | 'quarter' | 'year'): Promise<any> {
    return { turnoverRate: 0, averageInventory: 0, costOfGoodsSold: 0, period };
  }

  // Data management
  async exportProducts(filter?: ProductFilter): Promise<any> {
    const products = Array.from(this.products.values());
    const filtered = this.applyFilter(products, filter);
    return { success: true, data: filtered };
  }

  // Helper method for applying filters
  private applyFilter(products: Product[], filter?: ProductFilter): Product[] {
    if (!filter) return products;
    
    let filtered = products;
    
    if (filter.status) {
      filtered = filtered.filter(p => p.status === filter.status);
    }
    if (filter.categoryId) {
      filtered = filtered.filter(p => p.categoryId === filter.categoryId);
    }
    if (filter.name) {
      const term = filter.name.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(term));
    }
    if (filter.sku) {
      filtered = filtered.filter(p => p.sku.toLowerCase().includes(filter.sku!.toLowerCase()));
    }
    
    return filtered;
  }

  async importProducts(products: Partial<Product>[]): Promise<BatchOperationResult<Product>> {
    const results: BatchOperationResult<Product> = { total: products.length, successful: 0, failed: 0, successfulItems: [], failedItems: [] };
    for (const productData of products) {
      try {
        const product = await this.create(productData as any);
        results.successful++;
        results.successfulItems.push(product);
      } catch (error) {
        results.failed++;
        results.failedItems.push({ item: productData as any, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    return results;
  }

  async syncInventoryData(productId?: string): Promise<any> {
    return { success: true };
  }

  async rebuildIndex(): Promise<void> {
    this.skuIndex.clear();
    this.barcodeIndex.clear();
    this.categoryIndex.clear();
    
    for (const [id, product] of this.products) {
      this.skuIndex.set(product.sku, id);
      if (product.barcode) this.barcodeIndex.set(product.barcode, id);
      
      if (!this.categoryIndex.has(product.categoryId)) {
        this.categoryIndex.set(product.categoryId, []);
      }
      this.categoryIndex.get(product.categoryId)!.push(id);
    }
  }

  // Cache management
  async refreshCache(): Promise<void> {
    // Placeholder
  }

  async clearCache(): Promise<void> {
    // Placeholder
  }

  async warmupCache(): Promise<void> {
    // Placeholder
  }

  async refreshInventoryCache(productId?: string): Promise<void> {
    // Placeholder
  }


  // ==================== 统计和健康检查 ====================

  async getStatistics(): Promise<ProductStatistics> {
    const products = Array.from(this.products.values());

    const countByStatus: Record<ProductStatus, number> = {
      [ProductStatus.ACTIVE]: products.filter(p => p.status === ProductStatus.ACTIVE).length,
      [ProductStatus.INACTIVE]: products.filter(p => p.status === ProductStatus.INACTIVE).length,
      [ProductStatus.DISCONTINUED]: products.filter(p => p.status === ProductStatus.DISCONTINUED).length
    };

    const countByCategory: Record<string, number> = {};
    products.forEach(p => {
      countByCategory[p.categoryId] = (countByCategory[p.categoryId] || 0) + 1;
    });

    return {
      totalCount: products.length,
      activeCount: countByStatus[ProductStatus.ACTIVE],
      countByStatus,
      countByCategory,
      averagePrice: products.reduce((sum, p) => sum + p.salePrice, 0) / products.length || 0,
      totalInventoryValue: 0, // 需要库存服务支持
      lowStockCount: 0, // 需要库存服务支持
      outOfStockCount: 0, // 需要库存服务支持
      todayAdded: 0, // 今日新增产品数
      weekAdded: 0, // 本周新增产品数
      monthAdded: 0, // 本月新增产品数
      lastUpdated: new Date()
    };
  }

  getHealthStatus(): ServiceHealthStatus {
    return {
      isHealthy: this.initialized && this.products.size >= 0,
      message: this.initialized ? '产品服务运行正常' : '产品服务未初始化',
      lastChecked: new Date(),
      details: {
        initialized: this.initialized,
        productCount: this.products.size,
        skuIndexSize: this.skuIndex.size,
        categoryIndexSize: this.categoryIndex.size
      }
    };
  }

  reset(): void {
    this.products.clear();
    this.skuIndex.clear();
    this.barcodeIndex.clear();
    this.categoryIndex.clear();
    this.initialized = false;
    console.log('ProductService reset');
  }
}

// 创建并导出服务实例
export const productService = new ProductService();

// 默认导出
export default productService;
