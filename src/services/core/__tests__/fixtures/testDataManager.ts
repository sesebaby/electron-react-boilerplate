/**
 * 测试数据管理器
 * 提供场景化测试数据集和数据库快照机制
 */

import { 
  Product, 
  Category, 
  Unit, 
  Warehouse, 
  Supplier, 
  Customer,
  PurchaseOrder,
  SalesOrder,
  InventoryTransaction,
  ProductStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  TransactionType
} from '../../../../types/entities';

export class TestDataManager {
  private static instance: TestDataManager;
  private snapshots: Map<string, any> = new Map();

  static getInstance(): TestDataManager {
    if (!TestDataManager.instance) {
      TestDataManager.instance = new TestDataManager();
    }
    return TestDataManager.instance;
  }

  /**
   * 创建数据库快照
   */
  async createSnapshot(name: string, data: any): Promise<void> {
    this.snapshots.set(name, JSON.parse(JSON.stringify(data)));
  }

  /**
   * 恢复数据库快照
   */
  async restoreSnapshot(name: string): Promise<any> {
    const snapshot = this.snapshots.get(name);
    if (!snapshot) {
      throw new Error(`快照 ${name} 不存在`);
    }
    return JSON.parse(JSON.stringify(snapshot));
  }

  /**
   * 清理所有快照
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }

  /**
   * 生成基础产品数据
   */
  createProductData(): {
    category: Category;
    unit: Unit;
    warehouse: Warehouse;
    product: Product;
  } {
    const category: Category = {
      id: 'cat-test-1',
      name: '测试分类',
      description: '测试用产品分类',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const unit: Unit = {
      id: 'unit-test-1',
      name: '件',
      symbol: 'pcs',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const warehouse: Warehouse = {
      id: 'wh-test-1',
      name: '测试仓库',
      location: '测试地址',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const product: Product = {
      id: 'prod-test-1',
      name: '测试商品',
      sku: 'TEST-001',
      description: '测试用商品',
      categoryId: category.id,
      unitId: unit.id,
      status: ProductStatus.ACTIVE,
      purchasePrice: 100.00,
      salePrice: 150.00,
      minStock: 10,
      maxStock: 1000,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    return { category, unit, warehouse, product };
  }

  /**
   * 生成供应商和客户数据
   */
  createPartnerData(): {
    supplier: Supplier;
    customer: Customer;
  } {
    const supplier: Supplier = {
      id: 'sup-test-1',
      name: '测试供应商',
      contactPerson: '张三',
      phone: '13800138000',
      email: 'zhangsan@test.com',
      address: '测试供应商地址',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    const customer: Customer = {
      id: 'cust-test-1',
      name: '测试客户',
      contactPerson: '李四',
      phone: '13900139000',
      email: 'lisi@test.com',
      address: '测试客户地址',
      creditLimit: 100000.00,
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };

    return { supplier, customer };
  }

  /**
   * 生成采购订单数据
   */
  createPurchaseOrderData(supplierId: string, productId: string): PurchaseOrder {
    return {
      id: 'po-test-1',
      orderNo: 'PO-TEST-001',
      supplierId,
      status: PurchaseOrderStatus.DRAFT,
      paymentStatus: 'UNPAID' as any,
      orderDate: new Date('2024-01-15'),
      expectedDate: new Date('2024-01-25'),
      totalAmount: 5000.00,
      items: [{
        id: 'poi-test-1',
        purchaseOrderId: 'po-test-1',
        productId,
        quantity: 50,
        unitPrice: 100.00,
        totalPrice: 5000.00,
        receivedQuantity: 0,
        status: OrderItemStatus.PENDING
      }],
      creator: 'user-test',
      isActive: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    };
  }

  /**
   * 生成销售订单数据
   */
  createSalesOrderData(customerId: string, productId: string): SalesOrder {
    return {
      id: 'so-test-1',
      orderNo: 'SO-TEST-001',
      customerId,
      status: SalesOrderStatus.DRAFT,
      paymentStatus: 'UNPAID' as any,
      orderDate: new Date('2024-01-20'),
      deliveryDate: new Date('2024-01-30'),
      totalAmount: 7500.00,
      items: [{
        id: 'soi-test-1',
        salesOrderId: 'so-test-1',
        productId,
        quantity: 50,
        unitPrice: 150.00,
        totalPrice: 7500.00,
        deliveredQuantity: 0,
        status: OrderItemStatus.PENDING
      }],
      creator: 'user-sales',
      isActive: true,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20')
    };
  }

  /**
   * 生成库存交易数据（FIFO测试用）
   */
  createInventoryTransactions(productId: string, warehouseId: string): InventoryTransaction[] {
    return [
      {
        id: 'trans-test-1',
        productId,
        warehouseId,
        type: TransactionType.IN,
        quantity: 100,
        unitCost: 95.00,
        totalCost: 9500.00,
        remainingQuantity: 80, // 已出库20
        transactionDate: new Date('2024-01-01'),
        reason: '期初库存',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'trans-test-2',
        productId,
        warehouseId,
        type: TransactionType.IN,
        quantity: 200,
        unitCost: 100.00,
        totalCost: 20000.00,
        remainingQuantity: 200, // 未出库
        transactionDate: new Date('2024-01-10'),
        reason: '采购入库',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-10')
      },
      {
        id: 'trans-test-3',
        productId,
        warehouseId,
        type: TransactionType.IN,
        quantity: 150,
        unitCost: 105.00,
        totalCost: 15750.00,
        remainingQuantity: 150, // 未出库
        transactionDate: new Date('2024-01-15'),
        reason: '采购入库',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 'trans-test-4',
        productId,
        warehouseId,
        type: TransactionType.OUT,
        quantity: 20,
        unitCost: 95.00,
        totalCost: 1900.00,
        remainingQuantity: 0,
        transactionDate: new Date('2024-01-05'),
        reason: '销售出库',
        createdAt: new Date('2024-01-05'),
        updatedAt: new Date('2024-01-05')
      }
    ];
  }

  /**
   * 生成完整业务场景数据集
   */
  createCompleteBusinessScenario(): {
    products: ReturnType<typeof this.createProductData>;
    partners: ReturnType<typeof this.createPartnerData>;
    purchaseOrder: PurchaseOrder;
    salesOrder: SalesOrder;
    transactions: InventoryTransaction[];
  } {
    const products = this.createProductData();
    const partners = this.createPartnerData();
    const purchaseOrder = this.createPurchaseOrderData(partners.supplier.id, products.product.id);
    const salesOrder = this.createSalesOrderData(partners.customer.id, products.product.id);
    const transactions = this.createInventoryTransactions(products.product.id, products.warehouse.id);

    return {
      products,
      partners,
      purchaseOrder,
      salesOrder,
      transactions
    };
  }

  /**
   * 生成边界测试数据
   */
  createBoundaryTestData(): {
    largeQuantityProduct: Product;
    smallQuantityProduct: Product;
    highPriceProduct: Product;
    lowPriceProduct: Product;
    zeroStockProduct: Product;
  } {
    const baseProduct = this.createProductData().product;

    return {
      largeQuantityProduct: {
        ...baseProduct,
        id: 'prod-large-qty',
        sku: 'LARGE-QTY-001',
        name: '大数量商品',
        minStock: 10000,
        maxStock: 999999
      },
      smallQuantityProduct: {
        ...baseProduct,
        id: 'prod-small-qty',
        sku: 'SMALL-QTY-001',
        name: '小数量商品',
        minStock: 1,
        maxStock: 10
      },
      highPriceProduct: {
        ...baseProduct,
        id: 'prod-high-price',
        sku: 'HIGH-PRICE-001',
        name: '高价商品',
        purchasePrice: 999999.99,
        salePrice: 1099999.99
      },
      lowPriceProduct: {
        ...baseProduct,
        id: 'prod-low-price',
        sku: 'LOW-PRICE-001',
        name: '低价商品',
        purchasePrice: 0.01,
        salePrice: 0.02
      },
      zeroStockProduct: {
        ...baseProduct,
        id: 'prod-zero-stock',
        sku: 'ZERO-STOCK-001',
        name: '零库存商品',
        minStock: 0,
        maxStock: 0
      }
    };
  }

  /**
   * 生成错误场景测试数据
   */
  createErrorScenarioData(): {
    duplicateSkuProduct: Product;
    invalidCategoryProduct: Product;
    inactiveSupplier: Supplier;
    exceededCreditCustomer: Customer;
  } {
    const baseData = this.createCompleteBusinessScenario();

    return {
      duplicateSkuProduct: {
        ...baseData.products.product,
        id: 'prod-duplicate',
        sku: baseData.products.product.sku, // 重复SKU
        name: '重复SKU商品'
      },
      invalidCategoryProduct: {
        ...baseData.products.product,
        id: 'prod-invalid-cat',
        sku: 'INVALID-CAT-001',
        categoryId: 'non-existent-category'
      },
      inactiveSupplier: {
        ...baseData.partners.supplier,
        id: 'sup-inactive',
        name: '停用供应商',
        isActive: false
      },
      exceededCreditCustomer: {
        ...baseData.partners.customer,
        id: 'cust-exceeded',
        name: '超额客户',
        creditLimit: 1000.00 // 很低的信用额度
      }
    };
  }

  /**
   * 重置测试环境
   */
  async resetTestEnvironment(): Promise<void> {
    // 清理所有快照
    this.clearSnapshots();
    
    // 这里可以添加数据库重置逻辑
    // 在实际实现中，应该调用数据库清理方法
    console.log('测试环境已重置');
  }

  /**
   * 验证数据一致性
   */
  validateDataConsistency(data: any): boolean {
    // 验证必需字段
    if (!data.id || !data.createdAt || !data.updatedAt) {
      return false;
    }

    // 验证时间戳
    if (data.createdAt > data.updatedAt) {
      return false;
    }

    // 验证状态
    if (data.hasOwnProperty('isActive') && typeof data.isActive !== 'boolean') {
      return false;
    }

    return true;
  }

  /**
   * 生成随机测试数据
   */
  generateRandomData(type: 'product' | 'supplier' | 'customer', count: number = 1): any[] {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date();
      const suffix = `${Date.now()}-${i}`;
      
      switch (type) {
        case 'product':
          results.push({
            id: `prod-random-${suffix}`,
            name: `随机商品-${suffix}`,
            sku: `RANDOM-${suffix}`,
            description: `随机生成的测试商品-${suffix}`,
            categoryId: 'cat-test-1',
            unitId: 'unit-test-1',
            status: ProductStatus.ACTIVE,
            purchasePrice: Math.round((Math.random() * 1000 + 10) * 100) / 100,
            salePrice: Math.round((Math.random() * 1500 + 20) * 100) / 100,
            minStock: Math.floor(Math.random() * 50 + 1),
            maxStock: Math.floor(Math.random() * 1000 + 100),
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          break;
          
        case 'supplier':
          results.push({
            id: `sup-random-${suffix}`,
            name: `随机供应商-${suffix}`,
            contactPerson: `联系人-${suffix}`,
            phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            email: `supplier${suffix}@test.com`,
            address: `随机地址-${suffix}`,
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          break;
          
        case 'customer':
          results.push({
            id: `cust-random-${suffix}`,
            name: `随机客户-${suffix}`,
            contactPerson: `联系人-${suffix}`,
            phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
            email: `customer${suffix}@test.com`,
            address: `随机地址-${suffix}`,
            creditLimit: Math.round((Math.random() * 100000 + 10000) * 100) / 100,
            isActive: true,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          break;
      }
    }
    
    return results;
  }
}