/**
 * 库存服务 - 整合产品和库存管理
 * 整合原有的 ProductService, InventoryStockService, CategoryService, UnitService, WarehouseService
 */

import { 
  Product, 
  ProductStatus, 
  Category, 
  Unit, 
  Warehouse, 
  InventoryItem,
  InventoryStock,
  InventoryTransaction,
  TransactionType 
} from '../../types/entities';
import { 
  ServiceResult, 
  PaginatedResult, 
  PaginationParams, 
  BatchOperationResult, 
  BaseFilter,
  ServiceStatistics
} from './types';
import { DatabaseManager } from './database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/secureLogger';
import { ValidationError, BusinessError } from '../../utils/errors';

// 库存服务专用过滤器
export interface InventoryFilter extends BaseFilter {
  categoryId?: string;
  unitId?: string;
  warehouseId?: string;
  productId?: string;
  sku?: string;
  status?: ProductStatus;
  hasStock?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
  priceFrom?: number;
  priceTo?: number;
}

// 库存统计信息
export interface InventoryStatistics extends ServiceStatistics {
  totalProducts: number;
  activeProducts: number;
  totalCategories: number;
  totalUnits: number;
  totalWarehouses: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  countByStatus: Record<ProductStatus, number>;
  countByCategory: Record<string, number>;
  averagePrice: number;
}

/**
 * 库存服务实现
 */
export class InventoryService {
  private initialized = false;
  private database: any = null;

  // 内存缓存
  private products: Map<string, Product> = new Map();
  private categories: Map<string, Category> = new Map();
  private units: Map<string, Unit> = new Map();
  private warehouses: Map<string, Warehouse> = new Map();
  private inventoryStocks: Map<string, InventoryStock> = new Map();
  private transactions: Map<string, InventoryTransaction> = new Map();

  // 索引
  private skuIndex: Map<string, string> = new Map();
  private barcodeIndex: Map<string, string> = new Map();
  private categoryProductIndex: Map<string, string[]> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.database = await DatabaseManager.getInstance();
      await this.loadData();
      this.initialized = true;
      logger.info('InventoryService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize InventoryService', error);
      throw error;
    }
  }

  private async loadData(): Promise<void> {
    // 加载基础数据
    await Promise.all([
      this.loadCategories(),
      this.loadUnits(),
      this.loadWarehouses(),
      this.loadProducts(),
      this.loadInventoryStocks(),
      this.loadTransactions()
    ]);

    // 构建索引
    this.buildIndexes();
  }

  private async loadCategories(): Promise<void> {
    try {
      const categories = await this.database.getAllCategories();
      this.categories.clear();
      categories.forEach((category: Category) => {
        this.categories.set(category.id, category);
      });
    } catch (error) {
      logger.error('Failed to load categories', error);
      // 如果加载失败，创建默认分类
      const defaultCategory: Category = {
        id: 'default',
        name: '默认分类',
        description: '系统默认分类',
        parentId: '',
        level: 1,
        sortOrder: 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.categories.set('default', defaultCategory);
    }
  }

  private async loadUnits(): Promise<void> {
    try {
      const units = await this.database.getAllUnits();
      this.units.clear();
      units.forEach((unit: Unit) => {
        this.units.set(unit.id, unit);
      });
    } catch (error) {
      logger.error('Failed to load units', error);
      // 如果加载失败，创建默认单位
      const defaultUnit: Unit = {
        id: 'default',
        name: '个',
        symbol: '个',
        type: 'quantity' as any,
        precision: 0,
        description: '默认单位',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.units.set('default', defaultUnit);
    }
  }

  private async loadWarehouses(): Promise<void> {
    try {
      const warehouses = await this.database.getAllWarehouses();
      this.warehouses.clear();
      warehouses.forEach((warehouse: Warehouse) => {
        this.warehouses.set(warehouse.id, warehouse);
      });
    } catch (error) {
      logger.error('Failed to load warehouses', error);
      // 如果加载失败，创建默认仓库
      const defaultWarehouse: Warehouse = {
        id: 'default',
        code: 'DEFAULT',
        name: '默认仓库',
        address: '',
        manager: '',
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.warehouses.set('default', defaultWarehouse);
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      const products = await this.database.getAllProducts();
      this.products.clear();
      products.forEach((product: Product) => {
        this.products.set(product.id, product);
      });
    } catch (error) {
      logger.error('Failed to load products', error);
      // 产品加载失败不创建默认数据
    }
  }

  private async loadInventoryStocks(): Promise<void> {
    try {
      const stocks = await this.database.getAllInventoryStocks();
      this.inventoryStocks.clear();
      stocks.forEach((stock: InventoryStock) => {
        this.inventoryStocks.set(stock.id, stock);
      });
    } catch (error) {
      logger.error('Failed to load inventory stocks', error);
    }
  }

  private async loadTransactions(): Promise<void> {
    try {
      const transactions = await this.database.getInventoryTransactions();
      this.transactions.clear();
      transactions.forEach((transaction: InventoryTransaction) => {
        this.transactions.set(transaction.id, transaction);
      });
    } catch (error) {
      logger.error('Failed to load inventory transactions', error);
    }
  }

  private buildIndexes(): void {
    // 构建SKU和条形码索引
    this.skuIndex.clear();
    this.barcodeIndex.clear();
    this.categoryProductIndex.clear();

    this.products.forEach((product) => {
      if (product.sku) {
        this.skuIndex.set(product.sku, product.id);
      }
      if (product.barcode) {
        this.barcodeIndex.set(product.barcode, product.id);
      }
      
      // 构建分类产品索引
      if (product.categoryId) {
        if (!this.categoryProductIndex.has(product.categoryId)) {
          this.categoryProductIndex.set(product.categoryId, []);
        }
        this.categoryProductIndex.get(product.categoryId)!.push(product.id);
      }
    });
  }

  // ==================== 产品管理 ====================

  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Product>> {
    try {
      // 验证SKU唯一性
      if (productData.sku && this.skuIndex.has(productData.sku)) {
        return {
          success: false,
          error: `SKU "${productData.sku}" 已存在`
        };
      }

      // 验证条形码唯一性
      if (productData.barcode && this.barcodeIndex.has(productData.barcode)) {
        return {
          success: false,
          error: `条形码 "${productData.barcode}" 已存在`
        };
      }

      const product: Product = {
        ...productData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 保存到数据库 - 产品实际上是库存项目
      const result = await this.database.createItem(product);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '创建商品失败'
        };
      }
      
      // 更新内存缓存
      this.products.set(product.id, product);
      
      // 更新索引
      if (product.sku) {
        this.skuIndex.set(product.sku, product.id);
      }
      if (product.barcode) {
        this.barcodeIndex.set(product.barcode, product.id);
      }
      if (product.categoryId) {
        if (!this.categoryProductIndex.has(product.categoryId)) {
          this.categoryProductIndex.set(product.categoryId, []);
        }
        this.categoryProductIndex.get(product.categoryId)!.push(product.id);
      }

      return {
        success: true,
        data: product
      };
    } catch (error) {
      logger.error('Failed to create product', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建产品失败'
      };
    }
  }

  async updateProduct(id: string, updateData: Partial<Product>): Promise<ServiceResult<Product>> {
    try {
      const existingProduct = this.products.get(id);
      if (!existingProduct) {
        return {
          success: false,
          error: '产品不存在'
        };
      }

      // 验证SKU唯一性（如果有更新）
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        if (this.skuIndex.has(updateData.sku)) {
          return {
            success: false,
            error: `SKU "${updateData.sku}" 已存在`
          };
        }
      }

      // 验证条形码唯一性（如果有更新）
      if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
        if (this.barcodeIndex.has(updateData.barcode)) {
          return {
            success: false,
            error: `条形码 "${updateData.barcode}" 已存在`
          };
        }
      }

      const updatedProduct: Product = {
        ...existingProduct,
        ...updateData,
        updatedAt: new Date()
      };

      // 更新数据库
      await this.database.updateProduct(id, updatedProduct);
      
      // 更新内存缓存
      this.products.set(id, updatedProduct);
      
      // 更新索引
      if (existingProduct.sku) {
        this.skuIndex.delete(existingProduct.sku);
      }
      if (updatedProduct.sku) {
        this.skuIndex.set(updatedProduct.sku, id);
      }
      
      if (existingProduct.barcode) {
        this.barcodeIndex.delete(existingProduct.barcode);
      }
      if (updatedProduct.barcode) {
        this.barcodeIndex.set(updatedProduct.barcode, id);
      }

      return {
        success: true,
        data: updatedProduct
      };
    } catch (error) {
      logger.error('Failed to update product', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新产品失败'
      };
    }
  }

  async deleteProduct(id: string): Promise<ServiceResult<boolean>> {
    try {
      const product = this.products.get(id);
      if (!product) {
        return {
          success: false,
          error: '产品不存在'
        };
      }

      // 检查是否有库存
      const hasStock = Array.from(this.inventoryStocks.values()).some(
        stock => stock.productId === id && stock.currentStock > 0
      );
      
      if (hasStock) {
        return {
          success: false,
          error: '产品有库存，无法删除'
        };
      }

      // 删除数据库记录
      await this.database.deleteProduct(id);
      
      // 更新内存缓存
      this.products.delete(id);
      
      // 更新索引
      if (product.sku) {
        this.skuIndex.delete(product.sku);
      }
      if (product.barcode) {
        this.barcodeIndex.delete(product.barcode);
      }
      if (product.categoryId) {
        const categoryProducts = this.categoryProductIndex.get(product.categoryId);
        if (categoryProducts) {
          const index = categoryProducts.indexOf(id);
          if (index > -1) {
            categoryProducts.splice(index, 1);
          }
        }
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Failed to delete product', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除产品失败'
      };
    }
  }

  async getProduct(id: string): Promise<ServiceResult<Product>> {
    try {
      const product = this.products.get(id);
      if (!product) {
        return {
          success: false,
          error: '产品不存在'
        };
      }

      return {
        success: true,
        data: product
      };
    } catch (error) {
      logger.error('Failed to get product', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取产品失败'
      };
    }
  }

  async getProducts(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<Product>>> {
    try {
      // 从数据库重新加载最新的产品数据
      const allProducts = await this.database.getAllProducts();

      // 更新内存中的产品数据
      this.products.clear();
      this.skuIndex.clear();
      this.barcodeIndex.clear();

      if (Array.isArray(allProducts)) {
        allProducts.forEach(product => {
          this.products.set(product.id, product);
          if (product.sku) {
            this.skuIndex.set(product.sku, product.id);
          }
          if (product.barcode) {
            this.barcodeIndex.set(product.barcode, product.id);
          }
        });
      }

      let products = Array.from(this.products.values());

      // 应用过滤器
      if (filter) {
        products = products.filter(product => {
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!product.name.toLowerCase().includes(keyword) &&
                !product.sku?.toLowerCase().includes(keyword) &&
                !product.barcode?.toLowerCase().includes(keyword)) {
              return false;
            }
          }
          
          if (filter.categoryId && product.categoryId !== filter.categoryId) {
            return false;
          }
          
          if (filter.status && product.status !== filter.status) {
            return false;
          }
          
          if (filter.sku && product.sku !== filter.sku) {
            return false;
          }

          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = products.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = products.slice(offset, offset + pageSize);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to get products', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取产品列表失败'
      };
    }
  }

  // ==================== 分类管理 ====================

  async createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Category>> {
    try {
      const category: Category = {
        ...categoryData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 使用数据库的 createCategory 方法
      const result = await this.database.createCategory(category);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '创建分类失败'
        };
      }

      const createdCategory = result.data;
      this.categories.set(createdCategory.id, createdCategory);

      return {
        success: true,
        data: createdCategory
      };
    } catch (error) {
      logger.error('Failed to create category', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建分类失败'
      };
    }
  }

  async getCategories(): Promise<ServiceResult<Category[]>> {
    try {
      // 从数据库重新加载最新的分类数据
      const categories = await this.database.getAllCategories();

      // 更新内存中的分类数据
      this.categories.clear();
      if (Array.isArray(categories)) {
        categories.forEach(category => {
          this.categories.set(category.id, category);
        });
      }

      return {
        success: true,
        data: Array.from(this.categories.values())
      };
    } catch (error) {
      logger.error('Failed to get categories', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取分类列表失败'
      };
    }
  }

  // ==================== 单位管理 ====================

  async createUnit(unitData: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Unit>> {
    try {
      const unit: Unit = {
        ...unitData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 使用数据库的 createUnit 方法
      const result = await this.database.createUnit(unit);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '创建单位失败'
        };
      }

      const createdUnit = result.data;
      this.units.set(createdUnit.id, createdUnit);

      return {
        success: true,
        data: createdUnit
      };
    } catch (error) {
      logger.error('Failed to create unit', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建单位失败'
      };
    }
  }

  async getUnits(): Promise<ServiceResult<Unit[]>> {
    try {
      // 从数据库重新加载最新的单位数据
      const units = await this.database.getAllUnits();

      // 更新内存中的单位数据
      this.units.clear();
      if (Array.isArray(units)) {
        units.forEach(unit => {
          this.units.set(unit.id, unit);
        });
      }

      return {
        success: true,
        data: Array.from(this.units.values())
      };
    } catch (error) {
      logger.error('Failed to get units', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取单位列表失败'
      };
    }
  }

  // ==================== 仓库管理 ====================

  async createWarehouse(warehouseData: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Warehouse>> {
    try {
      // 使用数据库的 createWarehouse 方法而不是不存在的 insertWarehouse
      const result = await this.database.createWarehouse(warehouseData);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '创建仓库失败'
        };
      }

      const warehouse = result.data;
      this.warehouses.set(warehouse.id, warehouse);

      return {
        success: true,
        data: warehouse
      };
    } catch (error) {
      logger.error('Failed to create warehouse', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建仓库失败'
      };
    }
  }

  async getWarehouses(): Promise<ServiceResult<Warehouse[]>> {
    try {
      // 从数据库重新加载最新的仓库数据
      const warehouses = await this.database.getAllWarehouses();

      // 更新内存中的仓库数据
      this.warehouses.clear();
      if (Array.isArray(warehouses)) {
        warehouses.forEach(warehouse => {
          this.warehouses.set(warehouse.id, warehouse);
        });
      }

      return {
        success: true,
        data: Array.from(this.warehouses.values())
      };
    } catch (error) {
      logger.error('Failed to get warehouses', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仓库列表失败'
      };
    }
  }

  // ==================== 库存管理 ====================

  async getInventoryStock(productId: string, warehouseId: string = 'default'): Promise<ServiceResult<InventoryStock>> {
    try {
      const stock = Array.from(this.inventoryStocks.values()).find(
        s => s.productId === productId && s.warehouseId === warehouseId
      );

      if (!stock) {
        return {
          success: false,
          error: '库存记录不存在'
        };
      }

      return {
        success: true,
        data: stock
      };
    } catch (error) {
      logger.error('Failed to get inventory stock', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存失败'
      };
    }
  }

  async updateStock(productId: string, warehouseId: string, quantity: number, type: TransactionType, reason?: string): Promise<ServiceResult<InventoryStock>> {
    try {
      let stock = Array.from(this.inventoryStocks.values()).find(
        s => s.productId === productId && s.warehouseId === warehouseId
      );

      if (!stock) {
        // 创建新的库存记录
        stock = {
          id: uuidv4(),
          productId,
          warehouseId,
          currentStock: 0,
          availableStock: 0,
          reservedStock: 0,
          minStock: 0,
          maxStock: 1000,
          avgCost: 0,
          unitCost: 0,
          unitPrice: 0,
          totalValue: 0,
          lastUpdated: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // 更新库存数量
      const oldStock = stock.currentStock;
      
      if (type === TransactionType.IN) {
        stock.currentStock += quantity;
        stock.availableStock += quantity;
      } else if (type === TransactionType.OUT) {
        if (stock.currentStock < quantity) {
          return {
            success: false,
            error: '库存不足'
          };
        }
        stock.currentStock -= quantity;
        stock.availableStock -= quantity;
      }

      stock.totalValue = stock.currentStock * stock.unitCost;
      stock.lastUpdated = new Date();
      stock.updatedAt = new Date();

      // 创建库存事务记录
      const transaction: InventoryTransaction = {
        id: uuidv4(),
        transactionNo: `TXN-${Date.now()}`,
        productId,
        warehouseId,
        type,
        transactionType: type,
        quantity,
        unitPrice: stock.unitCost,
        unitCost: stock.unitCost,
        totalAmount: quantity * stock.unitCost,
        totalCost: quantity * stock.unitCost,
        remark: reason || '',
        notes: reason || '',
        operator: 'system',
        createdBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 保存到数据库
      await this.database.upsertInventoryStock(stock);
      await this.database.insertInventoryTransaction(transaction);

      // 更新内存缓存
      this.inventoryStocks.set(stock.id, stock);
      this.transactions.set(transaction.id, transaction);

      return {
        success: true,
        data: stock
      };
    } catch (error) {
      logger.error('Failed to update stock', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新库存失败'
      };
    }
  }

  // ==================== 统计信息 ====================

  async getStatistics(): Promise<ServiceResult<InventoryStatistics>> {
    try {
      const stats: InventoryStatistics = {
        totalCount: this.products.size,
        totalProducts: this.products.size,
        activeProducts: Array.from(this.products.values()).filter(p => p.status === ProductStatus.ACTIVE).length,
        totalCategories: this.categories.size,
        totalUnits: this.units.size,
        totalWarehouses: this.warehouses.size,
        totalInventoryValue: Array.from(this.inventoryStocks.values()).reduce((sum, stock) => sum + stock.totalValue, 0),
        lowStockCount: Array.from(this.inventoryStocks.values()).filter(stock => stock.currentStock <= stock.minStock).length,
        outOfStockCount: Array.from(this.inventoryStocks.values()).filter(stock => stock.currentStock === 0).length,
        countByStatus: {} as Record<ProductStatus, number>,
        countByCategory: {} as Record<string, number>,
        averagePrice: 0
      };

      // 统计各状态产品数量
      for (const status of Object.values(ProductStatus)) {
        stats.countByStatus[status] = Array.from(this.products.values()).filter(p => p.status === status).length;
      }

      // 统计各分类产品数量
      for (const [categoryId, productIds] of this.categoryProductIndex) {
        const category = this.categories.get(categoryId);
        if (category) {
          stats.countByCategory[category.name] = productIds.length;
        }
      }

      // 计算平均价格
      const products = Array.from(this.products.values());
      if (products.length > 0) {
        const totalPrice = products.reduce((sum, product) => sum + (product.salePrice || 0), 0);
        stats.averagePrice = totalPrice / products.length;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to get statistics', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取统计信息失败'
      };
    }
  }

  // ==================== 向后兼容的方法别名 ====================

  // 产品相关别名
  async findAllProducts(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<Product>>> {
    return this.getProducts(filter, pagination);
  }

  async findAll(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<Product>>> {
    return this.getProducts(filter, pagination);
  }

  // 分类相关别名
  async findAllCategories(): Promise<ServiceResult<Category[]>> {
    return this.getCategories();
  }

  // 单位相关别名
  async findAllUnits(): Promise<ServiceResult<Unit[]>> {
    return this.getUnits();
  }

  // 仓库相关别名
  async findAllWarehouses(): Promise<ServiceResult<Warehouse[]>> {
    return this.getWarehouses();
  }

  // 库存相关别名
  async findAllInventoryStocks(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<InventoryStock>>> {
    return this.getInventoryStocks(filter, pagination);
  }

  // 交易记录别名
  async findAllTransactions(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<InventoryTransaction>>> {
    return this.getTransactions(filter, pagination);
  }

  // 全局转换规则别名（暂时返回空数组，需要实现具体逻辑）
  async findAllGlobalConversionRules(): Promise<ServiceResult<any[]>> {
    return { success: true, data: [] };
  }

  // 仓库统计别名
  async getWarehouseStats(): Promise<ServiceResult<any>> {
    try {
      // 使用数据库的 getWarehouseStats 方法获取最新统计数据
      const result = await this.database.getWarehouseStats();

      if (!result.success) {
        return {
          success: false,
          error: result.error || '获取仓库统计失败'
        };
      }

      return { success: true, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取仓库统计失败'
      };
    }
  }

  // ==================== 缺失的方法实现 ====================

  async getInventoryStocks(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<InventoryStock>>> {
    try {
      let stocks = Array.from(this.inventoryStocks.values());

      // 应用过滤器
      if (filter) {
        stocks = stocks.filter(stock => {
          if (filter.warehouseId && stock.warehouseId !== filter.warehouseId) {
            return false;
          }
          if (filter.productId && stock.productId !== filter.productId) {
            return false;
          }
          if (filter.lowStock && stock.currentStock > stock.minStock) {
            return false;
          }
          if (filter.outOfStock && stock.currentStock !== 0) {
            return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = stocks.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = stocks.slice(offset, offset + pageSize);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取库存列表失败'
      };
    }
  }

  async getTransactions(filter?: InventoryFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<InventoryTransaction>>> {
    try {
      let transactions = Array.from(this.transactions.values());

      // 应用过滤器
      if (filter) {
        transactions = transactions.filter(tx => {
          if (filter.warehouseId && tx.warehouseId !== filter.warehouseId) {
            return false;
          }
          if (filter.productId && tx.productId !== filter.productId) {
            return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = transactions.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = transactions.slice(offset, offset + pageSize);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取交易记录失败'
      };
    }
  }

  async findTransactionsByDateRange(startDate: Date, endDate: Date): Promise<ServiceResult<InventoryTransaction[]>> {
    try {
      const transactions = Array.from(this.transactions.values()).filter(tx => {
        const txDate = new Date(tx.createdAt);
        return txDate >= startDate && txDate <= endDate;
      });

      return {
        success: true,
        data: transactions
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取日期范围内交易记录失败'
      };
    }
  }

  async updateCategory(id: string, updateData: Partial<Category>): Promise<ServiceResult<Category>> {
    try {
      const existingCategory = this.categories.get(id);
      if (!existingCategory) {
        return {
          success: false,
          error: '分类不存在'
        };
      }

      const updatedCategory: Category = {
        ...existingCategory,
        ...updateData,
        updatedAt: new Date()
      };

      await this.database.updateCategory(id, updatedCategory);
      this.categories.set(id, updatedCategory);

      return {
        success: true,
        data: updatedCategory
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新分类失败'
      };
    }
  }

  async deleteCategory(id: string): Promise<ServiceResult<boolean>> {
    try {
      const category = this.categories.get(id);
      if (!category) {
        return {
          success: false,
          error: '分类不存在'
        };
      }

      // 检查是否有产品使用此分类
      const hasProducts = Array.from(this.products.values()).some(
        product => product.categoryId === id
      );
      
      if (hasProducts) {
        return {
          success: false,
          error: '分类下有产品，无法删除'
        };
      }

      await this.database.deleteCategory(id);
      this.categories.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除分类失败'
      };
    }
  }

  async updateUnit(id: string, updateData: Partial<Unit>): Promise<ServiceResult<Unit>> {
    try {
      const existingUnit = this.units.get(id);
      if (!existingUnit) {
        return {
          success: false,
          error: '单位不存在'
        };
      }

      const updatedUnit: Unit = {
        ...existingUnit,
        ...updateData,
        updatedAt: new Date()
      };

      await this.database.updateUnit(id, updatedUnit);
      this.units.set(id, updatedUnit);

      return {
        success: true,
        data: updatedUnit
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新单位失败'
      };
    }
  }

  async deleteUnit(id: string): Promise<ServiceResult<boolean>> {
    try {
      const unit = this.units.get(id);
      if (!unit) {
        return {
          success: false,
          error: '单位不存在'
        };
      }

      await this.database.deleteUnit(id);
      this.units.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除单位失败'
      };
    }
  }

  async updateWarehouse(id: string, updateData: Partial<Warehouse>): Promise<ServiceResult<Warehouse>> {
    try {
      const existingWarehouse = this.warehouses.get(id);
      if (!existingWarehouse) {
        return {
          success: false,
          error: '仓库不存在'
        };
      }

      // 使用数据库的 updateWarehouse 方法，传递更新数据而不是完整对象
      const result = await this.database.updateWarehouse(id, updateData);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '更新仓库失败'
        };
      }

      const updatedWarehouse = result.data;
      this.warehouses.set(id, updatedWarehouse);

      return {
        success: true,
        data: updatedWarehouse
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新仓库失败'
      };
    }
  }

  async deleteWarehouse(id: string): Promise<ServiceResult<boolean>> {
    try {
      const warehouse = this.warehouses.get(id);
      if (!warehouse) {
        return {
          success: false,
          error: '仓库不存在'
        };
      }

      // 检查是否有库存
      const hasStock = Array.from(this.inventoryStocks.values()).some(
        stock => stock.warehouseId === id && stock.currentStock > 0
      );
      
      if (hasStock) {
        return {
          success: false,
          error: '仓库有库存，无法删除'
        };
      }

      await this.database.deleteWarehouse(id);
      this.warehouses.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除仓库失败'
      };
    }
  }

  async setDefaultWarehouse(id: string): Promise<ServiceResult<boolean>> {
    try {
      const warehouse = this.warehouses.get(id);
      if (!warehouse) {
        return {
          success: false,
          error: '仓库不存在'
        };
      }

      // 使用数据库的 setDefaultWarehouse 方法，它会自动处理唯一性约束
      const result = await this.database.setDefaultWarehouse(id);

      if (!result.success) {
        return {
          success: false,
          error: result.error || '设置默认仓库失败'
        };
      }

      // 更新内存中的仓库状态
      for (const [warehouseId, w] of this.warehouses) {
        if (w.isDefault && warehouseId !== id) {
          this.warehouses.set(warehouseId, { ...w, isDefault: false, updatedAt: new Date() });
        }
      }
      this.warehouses.set(id, { ...warehouse, isDefault: true, updatedAt: new Date() });

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '设置默认仓库失败'
      };
    }
  }

  // CRUD 操作别名
  async create(data: any): Promise<ServiceResult<any>> {
    // 根据数据类型判断创建什么
    if (data.sku || data.name) {
      return this.createProduct(data);
    } else if (data.categoryName) {
      return this.createCategory(data);
    } else if (data.unitName) {
      return this.createUnit(data);
    } else if (data.warehouseName || data.address) {
      return this.createWarehouse(data);
    }
    return { success: false, error: '无法识别的数据类型' };
  }

  async update(id: string, data: any): Promise<ServiceResult<any>> {
    // 根据ID和数据类型判断更新什么
    if (this.products.has(id)) {
      return this.updateProduct(id, data);
    } else if (this.categories.has(id)) {
      return this.updateCategory(id, data);
    } else if (this.units.has(id)) {
      return this.updateUnit(id, data);
    } else if (this.warehouses.has(id)) {
      return this.updateWarehouse(id, data);
    }
    return { success: false, error: '找不到指定的记录' };
  }

  async delete(id: string): Promise<ServiceResult<boolean>> {
    // 根据ID判断删除什么
    if (this.products.has(id)) {
      return this.deleteProduct(id);
    } else if (this.categories.has(id)) {
      return this.deleteCategory(id);
    } else if (this.units.has(id)) {
      return this.deleteUnit(id);
    } else if (this.warehouses.has(id)) {
      return this.deleteWarehouse(id);
    }
    return { success: false, error: '找不到指定的记录' };
  }
}