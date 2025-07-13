/**
 * 库存领域数据工厂
 * 负责生成产品和库存相关的测试数据
 */

import { BaseDomainFactory, FactoryOptions } from './BaseDomainFactory';
import { MasterDataFactory } from './MasterDataFactory';
import { Product, ProductStatus, InventoryStock, InventoryTransaction, TransactionType } from '../../types/entities';

export interface ProductOptions extends FactoryOptions {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  unitId?: string;
  brand?: string;
  model?: string;
  barcode?: string;
  purchasePrice?: number;
  salePrice?: number;
  minStock?: number;
  maxStock?: number;
  status?: ProductStatus;
  isActive?: boolean;
}

export interface ProductWithStockOptions extends ProductOptions {
  warehouseId?: string;
  quantity?: number;
  reservedQuantity?: number;
}

export interface InventoryStockOptions extends FactoryOptions {
  productId?: string;
  warehouseId?: string;
  quantity?: number;
  reservedQuantity?: number;
  lastTransactionAt?: Date;
}

export interface InventoryTransactionOptions extends FactoryOptions {
  productId?: string;
  warehouseId?: string;
  type?: TransactionType;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  operator?: string;
  remark?: string;
  relatedId?: string;
  relatedType?: string;
}

export class InventoryDomainFactory extends BaseDomainFactory {

  /**
   * 创建产品
   */
  static createProduct(options: ProductOptions = {}): Product {
    const seq = this.getNextSequence();
    const id = this.generateId('prod');
    const timestamp = this.getTimestamp();
    
    // 获取关联的基础数据
    const category = options.categoryId ? 
      this.getDependency(options.categoryId)?.data : 
      MasterDataFactory.getDefaultCategory();
    const unit = options.unitId ? 
      this.getDependency(options.unitId)?.data : 
      MasterDataFactory.getDefaultUnit();

    const defaults: Product = {
      id,
      name: this.generateChineseName('product', seq),
      sku: `SKU${timestamp}${seq.toString().padStart(3, '0')}`,
      description: `测试产品描述_${seq}`,
      categoryId: category.id,
      unitId: unit.id,
      brand: `测试品牌_${seq}`,
      model: `型号${seq}`,
      barcode: `123456789${seq.toString().padStart(3, '0')}`,
      purchasePrice: this.randomFloat(50, 1000),
      salePrice: this.randomFloat(100, 1500),
      minStock: this.randomInt(5, 20),
      maxStock: this.randomInt(50, 200),
      status: ProductStatus.ACTIVE,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const product = this.mergeOptions(defaults, options);
    
    // 确保销售价不低于采购价
    if (product.salePrice < product.purchasePrice) {
      product.salePrice = product.purchasePrice * 1.2;
    }

    const dependencies = [category.id, unit.id];
    this.recordDependency(id, 'product', product, dependencies);
    this.cacheData('products', product);
    
    return product;
  }

  /**
   * 创建带库存的产品
   */
  static createProductWithStock(options: ProductWithStockOptions = {}): {
    product: Product;
    stock: InventoryStock;
  } {
    // 先创建产品
    const { warehouseId, quantity, reservedQuantity, ...productOptions } = options;
    const product = this.createProduct(productOptions);

    // 获取仓库
    const warehouse = warehouseId ? 
      this.getDependency(warehouseId)?.data : 
      MasterDataFactory.getDefaultWarehouse();

    // 创建库存
    const stock = this.createInventoryStock({
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: quantity || this.randomInt(20, 100),
      reservedQuantity: reservedQuantity || 0
    });

    return { product, stock };
  }

  /**
   * 创建库存记录
   */
  static createInventoryStock(options: InventoryStockOptions = {}): InventoryStock {
    const id = this.generateId('stock');
    
    const defaults: InventoryStock = {
      id,
      productId: options.productId || '',
      warehouseId: options.warehouseId || '',
      quantity: this.randomInt(10, 100),
      reservedQuantity: 0,
      lastTransactionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const stock = this.mergeOptions(defaults, options);
    
    // 验证依赖关系
    const dependencies = [stock.productId, stock.warehouseId];
    if (!this.validateDependencies(dependencies)) {
      throw new Error(`Invalid dependencies for inventory stock: ${dependencies.join(', ')}`);
    }

    this.recordDependency(id, 'inventoryStock', stock, dependencies);
    this.cacheData('inventoryStocks', stock);
    
    return stock;
  }

  /**
   * 创建库存事务
   */
  static createInventoryTransaction(options: InventoryTransactionOptions = {}): InventoryTransaction {
    const id = this.generateId('trans');
    
    const defaults: InventoryTransaction = {
      id,
      productId: options.productId || '',
      warehouseId: options.warehouseId || '',
      type: TransactionType.STOCK_IN,
      quantity: this.randomInt(1, 50),
      unitPrice: this.randomFloat(10, 500),
      totalAmount: 0, // 将在后面计算
      operator: 'test_user',
      remark: `测试库存事务_${this.getNextSequence()}`,
      createdAt: new Date()
    };

    const transaction = this.mergeOptions(defaults, options);
    
    // 计算总金额
    if (transaction.totalAmount === 0) {
      transaction.totalAmount = transaction.quantity * transaction.unitPrice;
    }

    const dependencies = [transaction.productId, transaction.warehouseId];
    this.recordDependency(id, 'inventoryTransaction', transaction, dependencies);
    this.cacheData('inventoryTransactions', transaction);
    
    return transaction;
  }

  /**
   * 创建标准产品集合
   */
  static createStandardProducts(count: number = 5): Product[] {
    // 确保基础数据存在
    if (this.getCachedData('categories').length === 0) {
      MasterDataFactory.createStandardCategories();
    }
    if (this.getCachedData('units').length === 0) {
      MasterDataFactory.createStandardUnits();
    }

    const products: Product[] = [];
    const productTemplates = [
      { name: '笔记本电脑', brand: 'Dell', model: 'Latitude 5520', price: 5000 },
      { name: '无线鼠标', brand: '罗技', model: 'MX Master 3', price: 500 },
      { name: 'A4打印纸', brand: '得力', model: '7400', price: 25 },
      { name: '圆珠笔', brand: '晨光', model: 'BP-1001', price: 2 },
      { name: '文件夹', brand: '齐心', model: 'A1005', price: 8 }
    ];

    for (let i = 0; i < Math.min(count, productTemplates.length); i++) {
      const template = productTemplates[i];
      const category = MasterDataFactory.getRandomCategory();
      const unit = MasterDataFactory.getRandomUnit();
      
      products.push(this.createProduct({
        name: template.name,
        brand: template.brand,
        model: template.model,
        purchasePrice: template.price,
        salePrice: template.price * 1.3,
        categoryId: category.id,
        unitId: unit.id
      }));
    }

    return products;
  }

  /**
   * 创建产品目录（包含库存）
   */
  static createProductCatalog(productCount: number = 5): {
    products: Product[];
    stocks: InventoryStock[];
  } {
    // 确保仓库存在
    if (this.getCachedData('warehouses').length === 0) {
      MasterDataFactory.createStandardWarehouses();
    }

    const products = this.createStandardProducts(productCount);
    const stocks: InventoryStock[] = [];
    const warehouses = this.getCachedData('warehouses');

    // 为每个产品在每个仓库创建库存
    products.forEach(product => {
      warehouses.forEach(warehouse => {
        stocks.push(this.createInventoryStock({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: this.randomInt(10, 100),
          reservedQuantity: this.randomInt(0, 10)
        }));
      });
    });

    return { products, stocks };
  }

  /**
   * 创建库存事务历史
   */
  static createTransactionHistory(
    productId: string, 
    warehouseId: string, 
    transactionCount: number = 10
  ): InventoryTransaction[] {
    const transactions: InventoryTransaction[] = [];
    const transactionTypes = [
      TransactionType.STOCK_IN,
      TransactionType.STOCK_OUT,
      TransactionType.STOCK_ADJUST
    ];

    for (let i = 0; i < transactionCount; i++) {
      const type = this.randomChoice(transactionTypes);
      const quantity = this.randomInt(1, 20);
      const unitPrice = this.randomFloat(10, 200);

      transactions.push(this.createInventoryTransaction({
        productId,
        warehouseId,
        type,
        quantity,
        unitPrice,
        operator: `user_${this.randomInt(1, 5)}`,
        remark: `${type}操作_${i + 1}`
      }));
    }

    return transactions;
  }

  /**
   * 获取随机产品
   */
  static getRandomProduct(): Product {
    const products = this.getCachedData('products');
    if (products.length === 0) {
      return this.createProduct();
    }
    return this.randomChoice(products);
  }

  /**
   * 根据分类获取产品
   */
  static getProductsByCategory(categoryId: string): Product[] {
    return this.getCachedData('products').filter(
      (product: Product) => product.categoryId === categoryId
    );
  }

  /**
   * 获取低库存产品模拟数据
   */
  static createLowStockScenario(): {
    products: Product[];
    stocks: InventoryStock[];
  } {
    const products = this.createStandardProducts(3);
    const warehouse = MasterDataFactory.getDefaultWarehouse();
    const stocks: InventoryStock[] = [];

    products.forEach(product => {
      stocks.push(this.createInventoryStock({
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: this.randomInt(1, product.minStock - 1), // 低于最小库存
        reservedQuantity: 0
      }));
    });

    return { products, stocks };
  }
}