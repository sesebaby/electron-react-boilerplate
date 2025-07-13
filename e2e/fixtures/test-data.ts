/**
 * E2E测试数据工厂
 * 提供各种测试场景所需的数据
 */

export interface TestUser {
  username: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface TestProduct {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  unitId: string;
  brand?: string;
  model?: string;
  barcode?: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  maxStock: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
}

export interface TestCategory {
  name: string;
  description: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

export interface TestSupplier {
  name: string;
  code: string;
  contact: string;
  phone: string;
  address?: string;
  email?: string;
}

export interface TestCustomer {
  name: string;
  code: string;
  contact: string;
  phone: string;
  address?: string;
  email?: string;
}

export interface TestWarehouse {
  code: string;
  name: string;
  location: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface TestUnit {
  name: string;
  symbol: string;
  type: 'QUANTITY' | 'WEIGHT' | 'VOLUME' | 'LENGTH';
  precision: number;
  isActive: boolean;
}

/**
 * 增强的测试数据工厂类
 */
export class TestDataFactory {
  private static sequence = 1;
  private static createdData: Map<string, any[]> = new Map();

  /**
   * 获取下一个序列号
   */
  private static getNextSequence(): number {
    return this.sequence++;
  }

  /**
   * 生成时间戳字符串
   */
  private static getTimestamp(): string {
    return Date.now().toString();
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return `test_${this.getTimestamp()}_${this.getNextSequence()}`;
  }

  /**
   * 记录创建的数据
   */
  private static recordCreatedData(type: string, data: any): void {
    if (!this.createdData.has(type)) {
      this.createdData.set(type, []);
    }
    this.createdData.get(type)!.push(data);
  }

  /**
   * 获取已创建的数据
   */
  static getCreatedData(type?: string): any {
    if (type) {
      return this.createdData.get(type) || [];
    }
    return Object.fromEntries(this.createdData);
  }

  /**
   * 清理所有创建的数据记录
   */
  static clearCreatedData(): void {
    this.createdData.clear();
  }
  
  /**
   * 创建测试用户
   */
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const user = {
      username: 'admin',
      password: '123456',
      role: 'ADMIN' as const,
      ...overrides
    };
    this.recordCreatedData('users', user);
    return user;
  }
  
  /**
   * 创建测试分类
   */
  static createCategory(overrides: Partial<TestCategory> = {}): TestCategory {
    const seq = this.getNextSequence();
    const category = {
      name: `测试分类_${seq}`,
      description: `测试分类描述_${seq}`,
      level: 1,
      sortOrder: seq,
      isActive: true,
      ...overrides
    };
    this.recordCreatedData('categories', category);
    return category;
  }
  
  /**
   * 创建测试单位
   */
  static createUnit(overrides: Partial<TestUnit> = {}): TestUnit {
    const seq = this.getNextSequence();
    return {
      name: `测试单位_${seq}`,
      symbol: `TU${seq}`,
      type: 'QUANTITY',
      precision: 0,
      isActive: true,
      ...overrides
    };
  }
  
  /**
   * 创建测试仓库
   */
  static createWarehouse(overrides: Partial<TestWarehouse> = {}): TestWarehouse {
    const seq = this.getNextSequence();
    return {
      code: `WH${seq.toString().padStart(3, '0')}`,
      name: `测试仓库_${seq}`,
      location: `测试地址_${seq}`,
      isDefault: seq === 1,
      isActive: true,
      ...overrides
    };
  }
  
  /**
   * 创建测试商品
   */
  static createProduct(overrides: Partial<TestProduct> = {}): TestProduct {
    const seq = this.getNextSequence();
    const timestamp = this.getTimestamp();
    return {
      name: `测试商品_${seq}`,
      sku: `SKU${timestamp}${seq.toString().padStart(3, '0')}`,
      description: `测试商品描述_${seq}`,
      categoryId: 'default-category',
      unitId: 'default-unit',
      brand: `测试品牌_${seq}`,
      model: `型号${seq}`,
      barcode: `123456789${seq.toString().padStart(3, '0')}`,
      purchasePrice: 100 + seq * 10,
      salePrice: 150 + seq * 15,
      minStock: 10,
      maxStock: 100,
      status: 'ACTIVE',
      ...overrides
    };
  }
  
  /**
   * 创建测试供应商
   */
  static createSupplier(overrides: Partial<TestSupplier> = {}): TestSupplier {
    const seq = this.getNextSequence();
    return {
      name: `测试供应商_${seq}`,
      code: `SUP${seq.toString().padStart(3, '0')}`,
      contact: `联系人_${seq}`,
      phone: `1380013800${seq}`,
      address: `测试地址_${seq}`,
      email: `supplier${seq}@test.com`,
      ...overrides
    };
  }
  
  /**
   * 创建测试客户
   */
  static createCustomer(overrides: Partial<TestCustomer> = {}): TestCustomer {
    const seq = this.getNextSequence();
    return {
      name: `测试客户_${seq}`,
      code: `CUS${seq.toString().padStart(3, '0')}`,
      contact: `客户联系人_${seq}`,
      phone: `1390013900${seq}`,
      address: `客户地址_${seq}`,
      email: `customer${seq}@test.com`,
      ...overrides
    };
  }
  
  /**
   * 创建完整的测试数据集
   */
  static createFullTestDataSet() {
    return {
      users: {
        admin: this.createUser(),
        operator: this.createUser({ 
          username: 'operator', 
          password: '123456', 
          role: 'OPERATOR' as const 
        })
      },
      categories: [
        this.createCategory({ name: '电子产品', description: '电子设备分类' }),
        this.createCategory({ name: '办公用品', description: '办公设备和文具' }),
        this.createCategory({ name: '食品饮料', description: '食品和饮料分类' })
      ],
      units: [
        this.createUnit({ name: '台', symbol: 'pcs', type: 'QUANTITY' as const }),
        this.createUnit({ name: '箱', symbol: 'box', type: 'QUANTITY' as const }),
        this.createUnit({ name: '公斤', symbol: 'kg', type: 'WEIGHT' as const }),
        this.createUnit({ name: '升', symbol: 'L', type: 'VOLUME' as const })
      ],
      warehouses: [
        this.createWarehouse({ name: '主仓库', location: '北京市朝阳区', isDefault: true }),
        this.createWarehouse({ name: '分仓库', location: '北京市海淀区', isDefault: false })
      ],
      products: [
        this.createProduct({ 
          name: '笔记本电脑', 
          brand: 'Dell', 
          model: 'Latitude 5520',
          purchasePrice: 5000,
          salePrice: 6500
        }),
        this.createProduct({ 
          name: '无线鼠标', 
          brand: '罗技', 
          model: 'MX Master 3',
          purchasePrice: 500,
          salePrice: 650
        }),
        this.createProduct({ 
          name: 'A4打印纸', 
          brand: '得力', 
          model: '7400',
          purchasePrice: 25,
          salePrice: 35
        })
      ],
      suppliers: [
        this.createSupplier({ 
          name: '北京科技供应商', 
          contact: '张经理',
          phone: '13800138001'
        }),
        this.createSupplier({ 
          name: '上海办公用品供应商', 
          contact: '李经理',
          phone: '13800138002'
        })
      ],
      customers: [
        this.createCustomer({ 
          name: '某某科技公司', 
          contact: '王总',
          phone: '13900139001'
        }),
        this.createCustomer({ 
          name: '某某贸易公司', 
          contact: '刘总',
          phone: '13900139002'
        })
      ]
    };
  }
  
  /**
   * 重置序列号（用于测试隔离）
   */
  static resetSequence(): void {
    this.sequence = 1;
  }
}

/**
 * 测试场景数据
 */
export const TestScenarios = {
  // 登录场景
  validLogin: {
    username: 'admin',
    password: '123456'
  },
  
  invalidLogin: {
    username: 'invalid',
    password: 'wrong'
  },
  
  // 业务流程场景
  completeBusinessFlow: {
    category: TestDataFactory.createCategory({ name: '测试完整流程分类' }),
    unit: TestDataFactory.createUnit({ name: '个', symbol: 'pcs' }),
    warehouse: TestDataFactory.createWarehouse({ name: '测试仓库' }),
    supplier: TestDataFactory.createSupplier({ name: '测试供应商' }),
    customer: TestDataFactory.createCustomer({ name: '测试客户' }),
    product: TestDataFactory.createProduct({ 
      name: '测试商品完整流程',
      purchasePrice: 100,
      salePrice: 150,
      minStock: 10,
      maxStock: 100
    })
  },
  
  // 库存操作场景
  stockOperations: {
    stockIn: {
      quantity: 50,
      unitPrice: 100,
      remark: '测试入库操作'
    },
    stockOut: {
      quantity: 20,
      unitPrice: 150,
      remark: '测试出库操作'
    },
    stockAdjust: {
      quantity: 5,
      remark: '测试库存调整'
    }
  },
  
  // 错误处理场景
  errorScenarios: {
    duplicateSKU: {
      product1: TestDataFactory.createProduct({ sku: 'DUPLICATE_SKU' }),
      product2: TestDataFactory.createProduct({ sku: 'DUPLICATE_SKU' })
    },
    insufficientStock: {
      currentStock: 10,
      requestQuantity: 50
    },
    invalidPricing: {
      purchasePrice: 200,
      salePrice: 150 // 销售价低于采购价
    }
  }
};