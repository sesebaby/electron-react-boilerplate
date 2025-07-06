import { Product, ProductStatus } from '../../types/entities';
import { ProductSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import { InventoryService } from '../inventory/inventoryService';
import userService from './userService';
import { logger } from '../../utils/secureLogger';
import { ConcurrencyManager } from '../../utils/concurrency';
import { ValidationError, BusinessError } from '../../utils/errors';

export class ProductService {
  private products: Map<string, Product> = new Map();
  private skuIndex: Map<string, string> = new Map(); // SKU -> ID mapping
  private inventoryService: InventoryService;

  constructor() {
    this.inventoryService = new InventoryService();
  }

  async initialize(): Promise<void> {
    await this.inventoryService.initialize();
    console.log('Product service initialized');
  }

  async findAll(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    const id = this.skuIndex.get(sku);
    return id ? this.products.get(id) || null : null;
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      product => product.categoryId === categoryId
    );
  }

  async findByStatus(status: ProductStatus): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      product => product.status === status
    );
  }

  async search(searchTerm: string): Promise<Product[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.products.values()).filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      product.description?.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term) ||
      product.model?.toLowerCase().includes(term)
    );
  }

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Product> {
    // 使用SKU作为并发锁的键，防止重复SKU的并发创建
    return ConcurrencyManager.withMutex(`product-create-${data.sku}`, async () => {
      // 权限检查
      if (currentUserId) {
        const hasPermission = await userService.hasPermission(currentUserId, 'products.write');
        if (!hasPermission) {
          logger.security('Unauthorized product creation attempt', { userId: currentUserId, sku: data.sku });
          throw new ValidationError('无权限创建产品', { userId: currentUserId, sku: data.sku });
        }
      }

      // 验证输入数据
      const validation = validateEntity(ProductSchema, {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (!validation.success) {
        throw new ValidationError(`产品数据验证失败: ${validation.errors?.join(', ')}`, { 
          errors: validation.errors,
          data: data 
        });
      }

      // 二次检查SKU唯一性（在锁内进行，确保原子性）
      if (this.skuIndex.has(data.sku)) {
        throw new BusinessError(`SKU "${data.sku}" 已存在`, { sku: data.sku });
      }

      // 业务规则验证
      await this.validateBusinessRules(data);

      const product: Product = {
        ...data,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 原子性操作：同时更新两个Map
      this.products.set(product.id, product);
      this.skuIndex.set(product.sku, product.id);

      logger.info('Product created successfully', { 
        productId: product.id, 
        sku: product.sku,
        userId: currentUserId 
      });

      return product;
    });
  }

  async update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>, currentUserId?: string): Promise<Product> {
    // 使用产品ID和新SKU作为并发锁的键，防止重复SKU的并发更新
    const lockKey = data.sku ? `product-update-${id}-${data.sku}` : `product-update-${id}`;
    
    return ConcurrencyManager.withMutex(lockKey, async () => {
      // 权限检查
      if (currentUserId) {
        const hasPermission = await userService.hasPermission(currentUserId, 'products.write');
        if (!hasPermission) {
          logger.security('Unauthorized product update attempt', { userId: currentUserId, productId: id });
          throw new ValidationError('无权限修改产品', { userId: currentUserId, productId: id });
        }
      }

      const existingProduct = this.products.get(id);
      if (!existingProduct) {
        throw new BusinessError(`产品不存在: ${id}`, { productId: id });
      }

      // 二次检查SKU唯一性（在锁内进行，确保原子性）
      if (data.sku && data.sku !== existingProduct.sku) {
        if (this.skuIndex.has(data.sku)) {
          throw new BusinessError(`SKU "${data.sku}" 已存在`, { sku: data.sku, existingSku: existingProduct.sku });
        }
      }

      const updatedProduct: Product = {
        ...existingProduct,
        ...data,
        updatedAt: new Date()
      };

      // 验证更新后的数据
      const validation = validateEntity(ProductSchema, updatedProduct);
      if (!validation.success) {
        throw new ValidationError(`产品数据验证失败: ${validation.errors?.join(', ')}`, {
          errors: validation.errors,
          data: data
        });
      }

      // 业务规则验证
      await this.validateBusinessRules(updatedProduct);

      // 原子性操作：更新SKU索引和产品数据
      if (data.sku && data.sku !== existingProduct.sku) {
        this.skuIndex.delete(existingProduct.sku);
        this.skuIndex.set(data.sku, id);
      }

      this.products.set(id, updatedProduct);

      logger.info('Product updated successfully', { 
        productId: id, 
        oldSku: existingProduct.sku,
        newSku: data.sku || existingProduct.sku,
        userId: currentUserId 
      });

      return updatedProduct;
    });
  }

  async delete(id: string, currentUserId?: string): Promise<boolean> {
    return ConcurrencyManager.withMutex(`product-delete-${id}`, async () => {
      // 权限检查
      if (currentUserId) {
        const hasPermission = await userService.hasPermission(currentUserId, 'products.write');
        if (!hasPermission) {
          logger.security('Unauthorized product deletion attempt', { userId: currentUserId, productId: id });
          throw new ValidationError('无权限删除产品', { userId: currentUserId, productId: id });
        }
      }

      const product = this.products.get(id);
      if (!product) {
        return false;
      }

      // 原子性操作：同时删除产品和SKU索引
      this.products.delete(id);
      this.skuIndex.delete(product.sku);

      logger.info('Product deleted successfully', { 
        productId: id, 
        sku: product.sku,
        userId: currentUserId 
      });

      return true;
    });
  }

  async bulkCreate(products: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>, currentUserId?: string): Promise<{
    created: Product[];
    errors: Array<{ index: number; error: string }>;
  }> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'products.write');
      if (!hasPermission) {
        logger.security('Unauthorized bulk product creation attempt', { userId: currentUserId });
        throw new Error('无权限批量创建产品');
      }
    }

    const created: Product[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < products.length; i++) {
      try {
        const product = await this.create(products[i], currentUserId);
        created.push(product);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { created, errors };
  }

  async getLowStockProducts(): Promise<Product[]> {
    try {
      // 获取库存不足的商品
      const lowStockItems = await this.inventoryService.getLowStockItems();
      
      // 根据SKU匹配产品信息
      const lowStockProducts: Product[] = [];
      for (const item of lowStockItems) {
        const productId = this.skuIndex.get(item.sku);
        if (productId) {
          const product = this.products.get(productId);
          if (product && product.status === ProductStatus.ACTIVE) {
            lowStockProducts.push(product);
          }
        }
      }
      
      // 如果没有找到SKU匹配的产品，检查是否有产品的minStock设置需要预警
      if (lowStockProducts.length === 0) {
        const allProducts = Array.from(this.products.values());
        for (const product of allProducts) {
          if (product.status === ProductStatus.ACTIVE && product.minStock && product.minStock > 0) {
            // 通过SKU查询对应的库存信息
            const stockItem = lowStockItems.find(item => item.sku === product.sku);
            if (stockItem && stockItem.stockQuantity <= product.minStock) {
              lowStockProducts.push(product);
            }
          }
        }
      }
      
      logger.info('Low stock products retrieved', { 
        count: lowStockProducts.length,
        products: lowStockProducts.map(p => ({ id: p.id, sku: p.sku, name: p.name }))
      });
      
      return lowStockProducts;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      logger.error('Failed to get low stock products', { error: errorMsg });
      throw new BusinessError(`获取低库存产品失败: ${errorMsg}`, { originalError: error });
    }
  }

  async getActiveProducts(): Promise<Product[]> {
    return this.findByStatus(ProductStatus.ACTIVE);
  }

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    return this.update(id, { status });
  }

  async validateSku(sku: string, excludeId?: string): Promise<boolean> {
    const existingId = this.skuIndex.get(sku);
    return !existingId || existingId === excludeId;
  }

  // 业务规则验证
  private async validateBusinessRules(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    // SKU格式验证
    if (!/^[A-Z0-9-_]{3,50}$/.test(data.sku)) {
      throw new ValidationError('SKU格式不正确，只能包含大写字母、数字、连字符和下划线，长度3-50字符', { sku: data.sku });
    }

    // 价格验证
    if (data.purchasePrice <= 0) {
      throw new ValidationError('采购价格必须大于0', { purchasePrice: data.purchasePrice });
    }

    if (data.salePrice <= 0) {
      throw new ValidationError('销售价格必须大于0', { salePrice: data.salePrice });
    }

    // 销售价不能低于采购价（保证最小利润）
    if (data.salePrice < data.purchasePrice) {
      throw new BusinessError('销售价不能低于采购价', { 
        salePrice: data.salePrice, 
        purchasePrice: data.purchasePrice
      });
    }

    // 验证分类是否存在（如果提供了分类ID）
    if (data.categoryId) {
      try {
        // TODO: 当分类服务可用时启用此验证
        // const category = await categoryService.findById(data.categoryId);
        // if (!category) {
        //   throw new ValidationError('指定的产品分类不存在', { categoryId: data.categoryId });
        // }
      } catch (error) {
        // 暂时跳过分类验证
      }
    }

    // 库存警戒值验证
    if (data.minStock && data.minStock < 0) {
      throw new ValidationError('最小库存不能为负数', { minStock: data.minStock });
    }

    if (data.maxStock && data.maxStock < 0) {
      throw new ValidationError('最大库存不能为负数', { maxStock: data.maxStock });
    }

    if (data.minStock && data.maxStock && data.minStock >= data.maxStock) {
      throw new BusinessError('最小库存必须小于最大库存', { 
        minStock: data.minStock, 
        maxStock: data.maxStock 
      });
    }


    // 状态验证
    if (data.status && !Object.values(ProductStatus).includes(data.status)) {
      throw new ValidationError('无效的产品状态', { status: data.status });
    }
  }

  async getProductStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    discontinued: number;
  }> {
    const products = await this.findAll();
    
    return {
      total: products.length,
      active: products.filter(p => p.status === ProductStatus.ACTIVE).length,
      inactive: products.filter(p => p.status === ProductStatus.INACTIVE).length,
      discontinued: products.filter(p => p.status === ProductStatus.DISCONTINUED).length
    };
  }
}

export default new ProductService();