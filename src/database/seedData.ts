import { v4 as uuidv4 } from 'uuid';
import { Category, Product, Warehouse, Unit, InventoryStock, InventoryTransaction, ProductStatus, Supplier, SupplierStatus, SupplierRating } from '../types/entities';

// 单位数据
export const seedUnits: Unit[] = [
  {
    id: 'unit-001',
    name: '个',
    symbol: '个',
    precision: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'unit-002',
    name: '箱',
    symbol: '箱',
    precision: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'unit-003',
    name: '千克',
    symbol: 'kg',
    precision: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'unit-004',
    name: '米',
    symbol: 'm',
    precision: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 分类数据（暂时只使用一级分类进行测试）
export const seedCategories: Category[] = [
  {
    id: 'cat-001',
    name: '电子产品',
    parentId: undefined,
    level: 1,
    sortOrder: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'cat-004',
    name: '家居用品',
    parentId: undefined,
    level: 1,
    sortOrder: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 仓库数据
export const seedWarehouses: Warehouse[] = [
  {
    id: 'wh-001',
    code: 'WH001',
    name: '主仓库',
    address: '北京市朝阳区科技园区1号',
    manager: '张三',
    phone: '13800138001',
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wh-002',
    code: 'WH002',
    name: '分仓库A',
    address: '北京市海淀区中关村大街100号',
    manager: '李四',
    phone: '13800138002',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'wh-003',
    code: 'WH003',
    name: '分仓库B',
    address: '上海市浦东新区张江高科技园区',
    manager: '王五',
    phone: '13800138003',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 商品数据
export const seedProducts: Product[] = [
  {
    id: 'prod-001',
    sku: 'IP14-128-BLK',
    name: 'iPhone 14 128GB 黑色',
    description: 'Apple iPhone 14 智能手机，128GB存储，黑色',
    categoryId: 'cat-001',
    unitId: 'unit-001',
    brand: 'Apple',
    model: 'iPhone 14',
    barcode: '1234567890123',
    purchasePrice: 5500.00,
    salePrice: 6999.00,
    minStock: 10,
    maxStock: 100,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-002',
    sku: 'SM-S23-256-WHT',
    name: 'Samsung Galaxy S23 256GB 白色',
    description: 'Samsung Galaxy S23 智能手机，256GB存储，白色',
    categoryId: 'cat-001',
    unitId: 'unit-001',
    brand: 'Samsung',
    model: 'Galaxy S23',
    barcode: '1234567890124',
    purchasePrice: 4800.00,
    salePrice: 5999.00,
    minStock: 8,
    maxStock: 80,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-003',
    sku: 'LOGI-MX3-BLK',
    name: 'Logitech MX Master 3 无线鼠标',
    description: 'Logitech MX Master 3 高精度无线鼠标，黑色',
    categoryId: 'cat-001',
    unitId: 'unit-001',
    brand: 'Logitech',
    model: 'MX Master 3',
    barcode: '1234567890125',
    purchasePrice: 450.00,
    salePrice: 699.00,
    minStock: 20,
    maxStock: 200,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-004',
    sku: 'DELL-KB216-BLK',
    name: 'Dell KB216 有线键盘',
    description: 'Dell KB216 标准有线键盘，黑色',
    categoryId: 'cat-001',
    unitId: 'unit-001',
    brand: 'Dell',
    model: 'KB216',
    barcode: '1234567890126',
    purchasePrice: 80.00,
    salePrice: 129.00,
    minStock: 50,
    maxStock: 500,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'prod-005',
    sku: 'COOK-PAN-30CM',
    name: '不锈钢平底锅 30cm',
    description: '304不锈钢平底锅，30cm直径，适合家庭使用',
    categoryId: 'cat-004',
    unitId: 'unit-001',
    brand: '厨之宝',
    model: 'CZB-30',
    barcode: '1234567890127',
    purchasePrice: 120.00,
    salePrice: 199.00,
    minStock: 15,
    maxStock: 150,
    status: ProductStatus.ACTIVE,
    images: [],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 库存数据
export const seedInventoryStocks: InventoryStock[] = [
  {
    id: 'stock-001',
    productId: 'prod-001',
    warehouseId: 'wh-001',
    currentStock: 45,
    availableStock: 40,
    reservedStock: 5,
    minStock: 10,
    maxStock: 100,
    avgCost: 5500.00,
    unitPrice: 5500.00,
    lastInDate: new Date('2024-12-20'),
    lastOutDate: new Date('2024-12-25'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stock-002',
    productId: 'prod-001',
    warehouseId: 'wh-002',
    currentStock: 25,
    availableStock: 25,
    reservedStock: 0,
    minStock: 10,
    maxStock: 100,
    avgCost: 5500.00,
    unitPrice: 5500.00,
    lastInDate: new Date('2024-12-18'),
    lastOutDate: new Date('2024-12-22'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stock-003',
    productId: 'prod-002',
    warehouseId: 'wh-001',
    currentStock: 32,
    availableStock: 30,
    reservedStock: 2,
    minStock: 8,
    maxStock: 80,
    avgCost: 4800.00,
    unitPrice: 4800.00,
    lastInDate: new Date('2024-12-19'),
    lastOutDate: new Date('2024-12-24'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stock-004',
    productId: 'prod-003',
    warehouseId: 'wh-001',
    currentStock: 85,
    availableStock: 80,
    reservedStock: 5,
    minStock: 20,
    maxStock: 200,
    avgCost: 450.00,
    unitPrice: 450.00,
    lastInDate: new Date('2024-12-21'),
    lastOutDate: new Date('2024-12-26'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stock-005',
    productId: 'prod-004',
    warehouseId: 'wh-001',
    currentStock: 150,
    availableStock: 145,
    reservedStock: 5,
    minStock: 50,
    maxStock: 500,
    avgCost: 80.00,
    unitPrice: 80.00,
    lastInDate: new Date('2024-12-15'),
    lastOutDate: new Date('2024-12-23'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'stock-006',
    productId: 'prod-005',
    warehouseId: 'wh-001',
    currentStock: 8,
    availableStock: 8,
    reservedStock: 0,
    minStock: 15,
    maxStock: 150,
    avgCost: 120.00,
    unitPrice: 120.00,
    lastInDate: new Date('2024-12-10'),
    lastOutDate: new Date('2024-12-20'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 供应商数据
export const seedSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    code: 'SUP001',
    name: '苹果科技有限公司',
    contactPerson: '张经理',
    phone: '400-666-8888',
    email: 'zhang@apple-tech.com',
    address: '北京市朝阳区科技园区苹果大厦',
    paymentTerms: '月结30天',
    creditLimit: 1000000.00,
    rating: SupplierRating.A,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-002',
    code: 'SUP002',
    name: '三星电子贸易公司',
    contactPerson: '李总监',
    phone: '400-888-6666',
    email: 'li@samsung-trade.com',
    address: '上海市浦东新区张江高科技园区三星中心',
    paymentTerms: '现金',
    creditLimit: 800000.00,
    rating: SupplierRating.A,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-003',
    code: 'SUP003',
    name: '罗技科技设备公司',
    contactPerson: '王主管',
    phone: '021-12345678',
    email: 'wang@logitech-equip.com',
    address: '深圳市南山区科技园罗技大厦',
    paymentTerms: '月结15天',
    creditLimit: 500000.00,
    rating: SupplierRating.B,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-004',
    code: 'SUP004',
    name: '戴尔计算机配件商行',
    contactPerson: '赵老板',
    phone: '010-87654321',
    email: 'zhao@dell-parts.com',
    address: '北京市海淀区中关村大街戴尔专卖店',
    paymentTerms: '货到付款',
    creditLimit: 300000.00,
    rating: SupplierRating.B,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-005',
    code: 'SUP005',
    name: '厨具世界批发中心',
    contactPerson: '刘经理',
    phone: '0755-98765432',
    email: 'liu@kitchen-world.com',
    address: '广州市天河区厨具批发市场A区',
    paymentTerms: '月结45天',
    creditLimit: 200000.00,
    rating: SupplierRating.C,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'sup-006',
    code: 'SUP006',
    name: '华为技术设备供应商',
    contactPerson: '陈总',
    phone: '0755-12345678',
    email: 'chen@huawei-supply.com',
    address: '深圳市龙岗区华为基地',
    paymentTerms: '月结60天',
    creditLimit: 1500000.00,
    rating: SupplierRating.A,
    status: SupplierStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];
