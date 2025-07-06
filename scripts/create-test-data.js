#!/usr/bin/env node

// 创建测试数据脚本
// 为进销存系统数据流程测试创建基础数据

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// 获取数据库路径
function getElectronUserDataPath() {
  const appName = 'inventory-management';
  
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', appName);
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    return path.join(os.homedir(), '.config', appName);
  }
}

const POSSIBLE_DB_PATHS = [
  path.join(getElectronUserDataPath(), 'inventory.db'),
  path.join(process.cwd(), 'data', 'inventory.db'),
  path.join(process.cwd(), 'inventory.db')
];

function findDatabasePath() {
  for (const dbPath of POSSIBLE_DB_PATHS) {
    if (fs.existsSync(dbPath)) {
      console.log(`找到数据库文件: ${dbPath}`);
      return dbPath;
    }
  }
  
  // 如果没有找到，创建新的数据库
  const defaultPath = POSSIBLE_DB_PATHS[1]; // 使用项目目录下的data文件夹
  const dbDir = path.dirname(defaultPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log(`创建新数据库: ${defaultPath}`);
  return defaultPath;
}

const DB_PATH = findDatabasePath();

// 测试数据定义
const TEST_DATA = {
  // 计量单位
  units: [
    { id: uuidv4(), name: '个', symbol: 'pcs', precision: 0 },
    { id: uuidv4(), name: '台', symbol: 'unit', precision: 0 },
    { id: uuidv4(), name: '公斤', symbol: 'kg', precision: 2 },
    { id: uuidv4(), name: '米', symbol: 'm', precision: 2 }
  ],

  // 商品分类
  categories: [
    { id: uuidv4(), name: '电子产品', code: 'ELEC', level: 1, sort_order: 1, is_active: 1 },
    { id: uuidv4(), name: '办公用品', code: 'OFFICE', level: 1, sort_order: 2, is_active: 1 },
    { id: uuidv4(), name: '日用品', code: 'DAILY', level: 1, sort_order: 3, is_active: 1 }
  ],

  // 仓库
  warehouses: [
    { 
      id: uuidv4(), 
      code: 'WH001', 
      name: '总仓库', 
      address: '北京市朝阳区科技园区1号', 
      manager: '张三', 
      phone: '13800138001', 
      is_default: 1 
    },
    { 
      id: uuidv4(), 
      code: 'WH002', 
      name: '分仓库A', 
      address: '上海市浦东新区张江高科技园区', 
      manager: '李四', 
      phone: '13800138002', 
      is_default: 0 
    }
  ],

  // 供应商
  suppliers: [
    {
      id: uuidv4(),
      code: 'SUP001',
      name: '苹果科技供应商',
      contact_person: '王经理',
      phone: '13800138003',
      email: 'wang@apple-supplier.com',
      address: '深圳市南山区科技园',
      payment_terms: '30天付款',
      credit_limit: 1000000,
      rating: 'A',
      status: 'active'
    },
    {
      id: uuidv4(),
      code: 'SUP002',
      name: '办公用品供应商',
      contact_person: '刘经理',
      phone: '13800138004',
      email: 'liu@office-supplier.com',
      address: '广州市天河区珠江新城',
      payment_terms: '15天付款',
      credit_limit: 500000,
      rating: 'B',
      status: 'active'
    }
  ],

  // 客户
  customers: [
    {
      id: uuidv4(),
      code: 'CUS001',
      name: 'ABC科技有限公司',
      contact_person: '陈总',
      phone: '13800138005',
      email: 'chen@abc-tech.com',
      address: '深圳市南山区高新技术产业园',
      customer_type: 'company',
      credit_limit: 200000,
      payment_terms: '30天付款',
      discount_rate: 0.1,
      level: 'VIP',
      status: 'active'
    },
    {
      id: uuidv4(),
      code: 'CUS002',
      name: 'XYZ贸易公司',
      contact_person: '赵经理',
      phone: '13800138006',
      email: 'zhao@xyz-trade.com',
      address: '广州市天河区珠江新城商务区',
      customer_type: 'company',
      credit_limit: 100000,
      payment_terms: '15天付款',
      discount_rate: 0.05,
      level: 'Gold',
      status: 'active'
    }
  ]
};

// 商品数据（需要引用分类和单位ID）
function generateProducts(categoryIds, unitIds) {
  return [
    {
      id: uuidv4(),
      sku: 'IP15PRO-256-BLK',
      name: 'iPhone 15 Pro 256GB 深空黑色',
      description: '苹果最新旗舰手机，256GB存储容量',
      category_id: categoryIds[0], // 电子产品
      unit_id: unitIds[1], // 台
      brand: 'Apple',
      model: 'iPhone 15 Pro',
      barcode: '1234567890123',
      purchase_price: 8000,
      sale_price: 9999,
      min_stock: 5,
      max_stock: 100,
      status: 'active'
    },
    {
      id: uuidv4(),
      sku: 'MBA2024-512-SLV',
      name: 'MacBook Air M3 512GB 银色',
      description: '苹果笔记本电脑，M3芯片，512GB SSD',
      category_id: categoryIds[0], // 电子产品
      unit_id: unitIds[1], // 台
      brand: 'Apple',
      model: 'MacBook Air M3',
      barcode: '1234567890124',
      purchase_price: 9000,
      sale_price: 11999,
      min_stock: 3,
      max_stock: 50,
      status: 'active'
    },
    {
      id: uuidv4(),
      sku: 'MOUSE-WL-001',
      name: '无线蓝牙鼠标',
      description: '人体工学设计，2.4G无线连接',
      category_id: categoryIds[1], // 办公用品
      unit_id: unitIds[0], // 个
      brand: 'Generic',
      model: 'WL-001',
      barcode: '1234567890125',
      purchase_price: 50,
      sale_price: 89,
      min_stock: 20,
      max_stock: 200,
      status: 'active'
    },
    {
      id: uuidv4(),
      sku: 'KEYBOARD-MEC-001',
      name: '机械键盘',
      description: '青轴机械键盘，RGB背光',
      category_id: categoryIds[1], // 办公用品
      unit_id: unitIds[0], // 个
      brand: 'Generic',
      model: 'MEC-001',
      barcode: '1234567890126',
      purchase_price: 200,
      sale_price: 299,
      min_stock: 10,
      max_stock: 100,
      status: 'active'
    }
  ];
}

// 创建基础数据表结构
function createBasicTables(db) {
  console.log('创建基础数据表结构...');
  
  // 这里应该运行数据库迁移，但为了简化，我们直接创建必要的表
  const tables = [
    `CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      precision INTEGER NOT NULL DEFAULT 2,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      manager TEXT,
      phone TEXT,
      is_default BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      payment_terms TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      rating TEXT NOT NULL CHECK(rating IN ('A', 'B', 'C', 'D')) DEFAULT 'C',
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      customer_type TEXT NOT NULL CHECK(customer_type IN ('individual', 'company')) DEFAULT 'individual',
      credit_limit REAL NOT NULL DEFAULT 0,
      payment_terms TEXT,
      discount_rate REAL NOT NULL DEFAULT 0,
      level TEXT NOT NULL CHECK(level IN ('VIP', 'Gold', 'Silver', 'Bronze')) DEFAULT 'Bronze',
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT NOT NULL,
      unit_id TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      barcode TEXT,
      purchase_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      max_stock REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
      images TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
    )`
  ];
  
  for (const sql of tables) {
    try {
      db.exec(sql);
    } catch (error) {
      console.warn('创建表时出现警告:', error.message);
    }
  }
}

// 插入测试数据
function insertTestData(db) {
  console.log('插入测试数据...');
  
  try {
    db.exec('BEGIN TRANSACTION');
    
    // 插入计量单位
    const insertUnit = db.prepare(`
      INSERT OR REPLACE INTO units (id, name, symbol, precision) 
      VALUES (?, ?, ?, ?)
    `);
    
    for (const unit of TEST_DATA.units) {
      insertUnit.run(unit.id, unit.name, unit.symbol, unit.precision);
    }
    console.log(`✅ 插入 ${TEST_DATA.units.length} 个计量单位`);
    
    // 插入商品分类
    const insertCategory = db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, code, level, sort_order, is_active) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    for (const category of TEST_DATA.categories) {
      insertCategory.run(category.id, category.name, category.code, category.level, category.sort_order, category.is_active);
    }
    console.log(`✅ 插入 ${TEST_DATA.categories.length} 个商品分类`);
    
    // 插入仓库
    const insertWarehouse = db.prepare(`
      INSERT OR REPLACE INTO warehouses (id, code, name, address, manager, phone, is_default) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const warehouse of TEST_DATA.warehouses) {
      insertWarehouse.run(warehouse.id, warehouse.code, warehouse.name, warehouse.address, warehouse.manager, warehouse.phone, warehouse.is_default);
    }
    console.log(`✅ 插入 ${TEST_DATA.warehouses.length} 个仓库`);
    
    // 插入供应商
    const insertSupplier = db.prepare(`
      INSERT OR REPLACE INTO suppliers (id, code, name, contact_person, phone, email, address, payment_terms, credit_limit, rating, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const supplier of TEST_DATA.suppliers) {
      insertSupplier.run(supplier.id, supplier.code, supplier.name, supplier.contact_person, supplier.phone, supplier.email, supplier.address, supplier.payment_terms, supplier.credit_limit, supplier.rating, supplier.status);
    }
    console.log(`✅ 插入 ${TEST_DATA.suppliers.length} 个供应商`);
    
    // 插入客户
    const insertCustomer = db.prepare(`
      INSERT OR REPLACE INTO customers (id, code, name, contact_person, phone, email, address, customer_type, credit_limit, payment_terms, discount_rate, level, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const customer of TEST_DATA.customers) {
      insertCustomer.run(customer.id, customer.code, customer.name, customer.contact_person, customer.phone, customer.email, customer.address, customer.customer_type, customer.credit_limit, customer.payment_terms, customer.discount_rate, customer.level, customer.status);
    }
    console.log(`✅ 插入 ${TEST_DATA.customers.length} 个客户`);
    
    // 生成并插入商品
    const categoryIds = TEST_DATA.categories.map(c => c.id);
    const unitIds = TEST_DATA.units.map(u => u.id);
    const products = generateProducts(categoryIds, unitIds);
    
    const insertProduct = db.prepare(`
      INSERT OR REPLACE INTO products (id, sku, name, description, category_id, unit_id, brand, model, barcode, purchase_price, sale_price, min_stock, max_stock, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const product of products) {
      insertProduct.run(product.id, product.sku, product.name, product.description, product.category_id, product.unit_id, product.brand, product.model, product.barcode, product.purchase_price, product.sale_price, product.min_stock, product.max_stock, product.status);
    }
    console.log(`✅ 插入 ${products.length} 个商品`);
    
    db.exec('COMMIT');
    console.log('✅ 所有测试数据插入成功');
    
    return {
      units: TEST_DATA.units,
      categories: TEST_DATA.categories,
      warehouses: TEST_DATA.warehouses,
      suppliers: TEST_DATA.suppliers,
      customers: TEST_DATA.customers,
      products: products
    };
    
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// 生成测试数据报告
function generateReport(testData) {
  const report = [
    '📊 测试数据创建报告',
    '='.repeat(50),
    '',
    `创建时间: ${new Date().toLocaleString()}`,
    `数据库路径: ${DB_PATH}`,
    '',
    '基础数据统计:',
    `  📏 计量单位: ${testData.units.length} 个`,
    `  📂 商品分类: ${testData.categories.length} 个`,
    `  🏪 仓库: ${testData.warehouses.length} 个`,
    `  🏭 供应商: ${testData.suppliers.length} 个`,
    `  👥 客户: ${testData.customers.length} 个`,
    `  📦 商品: ${testData.products.length} 个`,
    '',
    '测试数据详情:',
    '',
    '计量单位:',
    ...testData.units.map(u => `  - ${u.name} (${u.symbol})`),
    '',
    '商品分类:',
    ...testData.categories.map(c => `  - ${c.name} (${c.code})`),
    '',
    '仓库:',
    ...testData.warehouses.map(w => `  - ${w.name} (${w.code}) - ${w.manager}`),
    '',
    '供应商:',
    ...testData.suppliers.map(s => `  - ${s.name} (${s.code}) - ${s.contact_person}`),
    '',
    '客户:',
    ...testData.customers.map(c => `  - ${c.name} (${c.code}) - ${c.contact_person}`),
    '',
    '商品:',
    ...testData.products.map(p => `  - ${p.name} (${p.sku}) - ¥${p.sale_price}`),
    '',
    '下一步:',
    '  1. 启动应用程序验证数据',
    '  2. 执行采购入库测试流程',
    '  3. 执行销售出库测试流程',
    '  4. 验证财务集成功能'
  ];
  
  return report.join('\n');
}

// 主函数
async function main() {
  console.log('🚀 开始创建测试数据...');
  console.log('');
  
  let db;
  try {
    // 连接数据库
    db = new sqlite3(DB_PATH);
    console.log(`✅ 数据库连接成功: ${DB_PATH}`);
    
    // 创建基础表结构
    createBasicTables(db);
    
    // 插入测试数据
    const testData = insertTestData(db);
    
    // 生成报告
    const report = generateReport(testData);
    console.log('');
    console.log(report);
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'test-data-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 测试数据报告已保存到: ${reportPath}`);
    
    console.log('');
    console.log('🎉 测试数据创建成功完成！');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 创建测试数据失败:', error);
    process.exit(1);
  } finally {
    if (db) {
      db.close();
    }
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { main };
