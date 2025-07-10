const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// 数据库路径
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-management', 'inventory.db');

console.log('修复数据库:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n=== 开始修复数据库 ===');
  
  // 1. 添加分类数据
  console.log('1. 添加商品分类数据...');
  
  const categories = [
    { id: 'cat-001', name: '电子产品', description: '电子设备和配件', parent_id: null },
    { id: 'cat-002', name: '办公用品', description: '办公室日常用品', parent_id: null },
    { id: 'cat-003', name: '食品饮料', description: '食品和饮料类商品', parent_id: null },
    { id: 'cat-004', name: '服装鞋帽', description: '服装、鞋子、帽子等', parent_id: null },
    { id: 'cat-005', name: '家居用品', description: '家庭日用品', parent_id: null },
    { id: 'cat-006', name: '手机数码', description: '手机和数码产品', parent_id: 'cat-001' },
    { id: 'cat-007', name: '电脑配件', description: '电脑及其配件', parent_id: 'cat-001' },
    { id: 'cat-008', name: '文具用品', description: '笔、纸张等文具', parent_id: 'cat-002' },
    { id: 'cat-009', name: '办公设备', description: '打印机、复印机等', parent_id: 'cat-002' },
    { id: 'cat-010', name: '零食小食', description: '各类零食', parent_id: 'cat-003' }
  ];
  
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, description, parent_id, created_at, updated_at) 
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  let categoryCount = 0;
  for (const cat of categories) {
    const result = insertCategory.run(cat.id, cat.name, cat.description, cat.parent_id);
    if (result.changes > 0) categoryCount++;
  }
  
  console.log(`   添加了 ${categoryCount} 个分类`);
  
  // 2. 添加供应商数据
  console.log('2. 添加供应商数据...');
  
  const suppliers = [
    { id: 'sup-001', code: 'SUP001', name: '华为技术有限公司', contact_person: '张经理', phone: '010-12345678', email: 'zhang@huawei.com', address: '深圳市龙岗区华为基地' },
    { id: 'sup-002', code: 'SUP002', name: '小米科技有限公司', contact_person: '李经理', phone: '010-87654321', email: 'li@xiaomi.com', address: '北京市海淀区小米科技园' },
    { id: 'sup-003', code: 'SUP003', name: '得力集团有限公司', contact_person: '王经理', phone: '0574-12345678', email: 'wang@deli.com', address: '宁波市鄞州区得力工业园' },
    { id: 'sup-004', code: 'SUP004', name: '联想集团有限公司', contact_person: '赵经理', phone: '010-11223344', email: 'zhao@lenovo.com', address: '北京市海淀区联想大厦' },
    { id: 'sup-005', code: 'SUP005', name: '三只松鼠股份有限公司', contact_person: '钱经理', phone: '0553-55667788', email: 'qian@3songshu.com', address: '安徽省芜湖市三只松鼠总部' },
    { id: 'sup-006', code: 'SUP006', name: '宜家家居有限公司', contact_person: '孙经理', phone: '021-99887766', email: 'sun@ikea.com', address: '上海市徐汇区宜家中国总部' },
    { id: 'sup-007', code: 'SUP007', name: '苹果电子产品商贸有限公司', contact_person: '周经理', phone: '021-44556677', email: 'zhou@apple.com', address: '上海市浦东新区苹果大厦' },
    { id: 'sup-008', code: 'SUP008', name: '戴尔科技集团', contact_person: '吴经理', phone: '010-33445566', email: 'wu@dell.com', address: '北京市朝阳区戴尔中国总部' }
  ];
  
  const insertSupplier = db.prepare(`
    INSERT OR IGNORE INTO suppliers (id, code, name, contact_person, phone, email, address, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  
  let supplierCount = 0;
  for (const sup of suppliers) {
    const result = insertSupplier.run(sup.id, sup.code, sup.name, sup.contact_person, sup.phone, sup.email, sup.address);
    if (result.changes > 0) supplierCount++;
  }
  
  console.log(`   添加了 ${supplierCount} 个供应商`);
  
  // 3. 检查并修复单位数据
  console.log('3. 检查单位数据...');
  const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get().count;
  
  if (unitCount === 0) {
    console.log('   单位表为空，重新导入单位数据...');
    
    // 重新导入基础单位数据
    const basicUnits = [
      { id: 'unit-001', name: '个', symbol: 'pcs', type: 'quantity', precision: 0, description: '个数单位，用于计数商品' },
      { id: 'unit-002', name: '件', symbol: 'piece', type: 'quantity', precision: 0, description: '件数单位，用于计数商品' },
      { id: 'unit-003', name: '套', symbol: 'set', type: 'quantity', precision: 0, description: '套装单位，用于成套商品' },
      { id: 'unit-004', name: '包', symbol: 'pack', type: 'quantity', precision: 0, description: '包装单位，用于包装商品' },
      { id: 'unit-005', name: '箱', symbol: 'box', type: 'quantity', precision: 0, description: '箱装单位，用于大包装商品' },
      { id: 'unit-006', name: '盒', symbol: 'case', type: 'quantity', precision: 0, description: '盒装单位，用于盒装商品' },
      { id: 'unit-011', name: '克', symbol: 'g', type: 'weight', precision: 2, description: '克重量单位，用于轻量商品' },
      { id: 'unit-012', name: '千克', symbol: 'kg', type: 'weight', precision: 2, description: '千克重量单位，用于重量商品' },
      { id: 'unit-015', name: '厘米', symbol: 'cm', type: 'length', precision: 2, description: '厘米长度单位，用于小尺寸测量' },
      { id: 'unit-016', name: '米', symbol: 'm', type: 'length', precision: 2, description: '米长度单位，用于长度测量' },
      { id: 'unit-020', name: '毫升', symbol: 'ml', type: 'volume', precision: 2, description: '毫升体积单位，用于液体商品' },
      { id: 'unit-021', name: '升', symbol: 'l', type: 'volume', precision: 2, description: '升体积单位，用于液体商品' }
    ];
    
    const insertUnit = db.prepare(`
      INSERT OR IGNORE INTO units (id, name, symbol, type, precision, description, is_active, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `);
    
    let unitInsertCount = 0;
    for (const unit of basicUnits) {
      const result = insertUnit.run(unit.id, unit.name, unit.symbol, unit.type, unit.precision, unit.description);
      if (result.changes > 0) unitInsertCount++;
    }
    
    console.log(`   添加了 ${unitInsertCount} 个基础单位`);
  } else {
    console.log(`   单位数据正常，共有 ${unitCount} 个单位`);
  }
  
  // 4. 添加一些示例商品数据到inventory_items表
  console.log('4. 添加示例商品数据...');
  
  const sampleProducts = [
    {
      id: 'item-001',
      name: 'iPhone 15 Pro',
      description: '苹果iPhone 15 Pro 256GB 深空黑色',
      sku: 'IPHONE15PRO256',
      category: 'cat-006',
      supplier: 'sup-007',
      stockQuantity: 50,
      unitPrice: 8999.00,
      reorderLevel: 10,
      maxStock: 200
    },
    {
      id: 'item-002', 
      name: '小米13 Ultra',
      description: '小米13 Ultra 512GB 陶瓷黑',
      sku: 'MI13ULTRA512',
      category: 'cat-006',
      supplier: 'sup-002',
      stockQuantity: 30,
      unitPrice: 5999.00,
      reorderLevel: 5,
      maxStock: 100
    },
    {
      id: 'item-003',
      name: '得力文具套装',
      description: '得力学生文具套装 包含笔、橡皮、尺子等',
      sku: 'DELI_SET_001',
      category: 'cat-008',
      supplier: 'sup-003',
      stockQuantity: 100,
      unitPrice: 29.90,
      reorderLevel: 20,
      maxStock: 500
    },
    {
      id: 'item-004',
      name: 'ThinkPad X1 Carbon',
      description: 'ThinkPad X1 Carbon 14英寸商务笔记本',
      sku: 'THINKPAD_X1C',
      category: 'cat-007',
      supplier: 'sup-004',
      stockQuantity: 15,
      unitPrice: 12999.00,
      reorderLevel: 3,
      maxStock: 50
    },
    {
      id: 'item-005',
      name: '三只松鼠坚果礼盒',
      description: '三只松鼠混合坚果礼盒装 1kg',
      sku: 'SQUIRREL_NUTS_1KG',
      category: 'cat-010',
      supplier: 'sup-005',
      stockQuantity: 80,
      unitPrice: 168.00,
      reorderLevel: 15,
      maxStock: 300
    }
  ];
  
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO inventory_items (
      id, name, description, sku, category, supplier,
      stock_quantity, reserved_quantity, unit_price, total_value,
      status, location, reorder_level, max_stock,
      last_updated, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'in-stock', '', ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `);
  
  let productCount = 0;
  for (const product of sampleProducts) {
    const totalValue = product.stockQuantity * product.unitPrice;
    const result = insertProduct.run(
      product.id, product.name, product.description, product.sku, 
      product.category, product.supplier, product.stockQuantity, 
      product.unitPrice, totalValue, product.reorderLevel, product.maxStock
    );
    if (result.changes > 0) productCount++;
  }
  
  console.log(`   添加了 ${productCount} 个示例商品`);
  
  // 5. 验证修复结果
  console.log('\n=== 修复结果验证 ===');
  
  const finalCategoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const finalSupplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
  const finalUnitCount = db.prepare('SELECT COUNT(*) as count FROM units').get().count;
  const finalProductCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count;
  
  console.log(`分类数量: ${finalCategoryCount}`);
  console.log(`供应商数量: ${finalSupplierCount}`);
  console.log(`单位数量: ${finalUnitCount}`);
  console.log(`商品数量: ${finalProductCount}`);
  
  db.close();
  console.log('\n数据库修复完成！');
  
} catch (error) {
  console.error('数据库修复失败:', error.message);
  console.error(error.stack);
}
