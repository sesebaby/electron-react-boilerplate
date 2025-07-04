import { Product, ProductStatus } from '../../types/entities';
import { ProductSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export class ProductService {
  private products: Map<string, Product> = new Map();
  private skuIndex: Map<string, string> = new Map(); // SKU -> ID mapping

  async initialize(): Promise<void> {
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

  async create(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    // 验证输入数据
    const validation = validateEntity(ProductSchema, {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    if (!validation.success) {
      throw new Error(`产品数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查SKU唯一性
    if (this.skuIndex.has(data.sku)) {
      throw new Error(`SKU "${data.sku}" 已存在`);
    }

    const product: Product = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.products.set(product.id, product);
    this.skuIndex.set(product.sku, product.id);

    return product;
  }

  async update(id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Product> {
    const existingProduct = this.products.get(id);
    if (!existingProduct) {
      throw new Error(`产品不存在: ${id}`);
    }

    // 检查SKU唯一性（如果更新了SKU）
    if (data.sku && data.sku !== existingProduct.sku) {
      if (this.skuIndex.has(data.sku)) {
        throw new Error(`SKU "${data.sku}" 已存在`);
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
      throw new Error(`产品数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新SKU索引
    if (data.sku && data.sku !== existingProduct.sku) {
      this.skuIndex.delete(existingProduct.sku);
      this.skuIndex.set(data.sku, id);
    }

    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async delete(id: string): Promise<boolean> {
    const product = this.products.get(id);
    if (!product) {
      return false;
    }

    this.products.delete(id);
    this.skuIndex.delete(product.sku);
    return true;
  }

  async bulkCreate(products: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    created: Product[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const created: Product[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < products.length; i++) {
      try {
        const product = await this.create(products[i]);
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
    // 需要结合库存信息，这里先返回空数组
    // 实际实现需要与InventoryService配合
    return [];
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