/**
 * 直接测试内置数据导入功能
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== 测试内置数据导入功能 ===\n');

async function testBuiltinDataImport() {
  const dbPath = path.join(__dirname, 'data', 'inventory.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('❌ 数据库文件不存在:', dbPath);
    return;
  }
  
  try {
    const db = new Database(dbPath);
    console.log('✅ 数据库连接成功');
    
    // 1. 清空相关表
    console.log('\n1. 清空相关表...');
    const tables = ['units', 'categories', 'suppliers', 'warehouses', 'global_conversion_rules'];
    
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`  ✅ 清空表 ${table}`);
      } catch (error) {
        console.log(`  ⚠️ 清空表 ${table} 失败: ${error.message}`);
      }
    }
    
    // 2. 导入单位数据
    console.log('\n2. 导入单位数据...');
    await importUnitsData(db);
    
    // 3. 导入分类数据
    console.log('\n3. 导入分类数据...');
    await importCategoriesData(db);
    
    // 4. 导入供应商数据
    console.log('\n4. 导入供应商数据...');
    await importSuppliersData(db);
    
    // 5. 导入仓库数据
    console.log('\n5. 导入仓库数据...');
    await importWarehousesData(db);
    
    // 6. 导入转换规则数据
    console.log('\n6. 导入转换规则数据...');
    await importGlobalConversionRulesData(db);
    
    // 7. 验证导入结果
    console.log('\n7. 验证导入结果...');
    await verifyImportResults(db);
    
    db.close();
    console.log('\n✅ 测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 导入函数（从systemHandlers.js复制）
async function importUnitsData(db) {
  const units = [
    // 数量单位
    { id: 'unit-001', name: '个', symbol: '个', type: 'quantity', precision: 0, description: '基本计数单位', isActive: true },
    { id: 'unit-002', name: '件', symbol: '件', type: 'quantity', precision: 0, description: '商品件数', isActive: true },
    { id: 'unit-003', name: '套', symbol: '套', type: 'quantity', precision: 0, description: '成套商品', isActive: true },
    { id: 'unit-004', name: '包', symbol: '包', type: 'quantity', precision: 0, description: '包装单位', isActive: true },
    { id: 'unit-005', name: '箱', symbol: '箱', type: 'quantity', precision: 0, description: '箱装单位', isActive: true },
    { id: 'unit-006', name: '盒', symbol: '盒', type: 'quantity', precision: 0, description: '盒装单位', isActive: true },
    { id: 'unit-007', name: '瓶', symbol: '瓶', type: 'quantity', precision: 0, description: '瓶装单位', isActive: true },
    { id: 'unit-008', name: '罐', symbol: '罐', type: 'quantity', precision: 0, description: '罐装单位', isActive: true },
    { id: 'unit-009', name: '袋', symbol: '袋', type: 'quantity', precision: 0, description: '袋装单位', isActive: true },
    { id: 'unit-010', name: '支', symbol: '支', type: 'quantity', precision: 0, description: '支装单位', isActive: true },
    { id: 'unit-011', name: '打', symbol: '打', type: 'quantity', precision: 0, description: '12个为一打', isActive: true },
    { id: 'unit-012', name: '对', symbol: '对', type: 'quantity', precision: 0, description: '成对商品', isActive: true },
    
    // 重量单位
    { id: 'unit-013', name: '克', symbol: 'g', type: 'weight', precision: 2, description: '基本重量单位', isActive: true },
    { id: 'unit-014', name: '千克', symbol: 'kg', type: 'weight', precision: 3, description: '公斤', isActive: true },
    { id: 'unit-015', name: '吨', symbol: 't', type: 'weight', precision: 3, description: '公吨', isActive: true },
    { id: 'unit-016', name: '磅', symbol: 'lb', type: 'weight', precision: 2, description: '英制重量单位', isActive: true },
    { id: 'unit-017', name: '两', symbol: '两', type: 'weight', precision: 2, description: '中式重量单位', isActive: true },
    { id: 'unit-018', name: '斤', symbol: '斤', type: 'weight', precision: 2, description: '中式重量单位', isActive: true },
    
    // 长度单位
    { id: 'unit-019', name: '厘米', symbol: 'cm', type: 'length', precision: 2, description: '基本长度单位', isActive: true },
    { id: 'unit-020', name: '米', symbol: 'm', type: 'length', precision: 3, description: '标准长度单位', isActive: true },
    { id: 'unit-021', name: '毫米', symbol: 'mm', type: 'length', precision: 1, description: '精密长度单位', isActive: true },
    { id: 'unit-022', name: '英寸', symbol: 'in', type: 'length', precision: 2, description: '英制长度单位', isActive: true },
    { id: 'unit-023', name: '英尺', symbol: 'ft', type: 'length', precision: 2, description: '英制长度单位', isActive: true },
    { id: 'unit-024', name: '分米', symbol: 'dm', type: 'length', precision: 2, description: '十分之一米', isActive: true },
    { id: 'unit-025', name: '公里', symbol: 'km', type: 'length', precision: 3, description: '千米', isActive: true },
    { id: 'unit-026', name: '码', symbol: 'yd', type: 'length', precision: 2, description: '英制长度单位', isActive: true },
    
    // 体积单位
    { id: 'unit-027', name: '毫升', symbol: 'ml', type: 'volume', precision: 2, description: '基本体积单位', isActive: true },
    { id: 'unit-028', name: '升', symbol: 'L', type: 'volume', precision: 3, description: '标准体积单位', isActive: true },
    { id: 'unit-029', name: '立方厘米', symbol: 'cm³', type: 'volume', precision: 2, description: '立方体积单位', isActive: true },
    { id: 'unit-030', name: '立方米', symbol: 'm³', type: 'volume', precision: 3, description: '大体积单位', isActive: true },
    { id: 'unit-031', name: '加仑', symbol: 'gal', type: 'volume', precision: 2, description: '英制体积单位', isActive: true },
    
    // 面积单位
    { id: 'unit-032', name: '平方厘米', symbol: 'cm²', type: 'area', precision: 2, description: '基本面积单位', isActive: true },
    { id: 'unit-033', name: '平方米', symbol: 'm²', type: 'area', precision: 3, description: '标准面积单位', isActive: true },
    { id: 'unit-034', name: '平方英寸', symbol: 'in²', type: 'area', precision: 2, description: '英制面积单位', isActive: true },
    { id: 'unit-035', name: '平方英尺', symbol: 'ft²', type: 'area', precision: 2, description: '英制面积单位', isActive: true },
    
    // 时间单位
    { id: 'unit-036', name: '秒', symbol: 's', type: 'time', precision: 0, description: '基本时间单位', isActive: true },
    { id: 'unit-037', name: '分钟', symbol: 'min', type: 'time', precision: 0, description: '60秒', isActive: true },
    { id: 'unit-038', name: '小时', symbol: 'h', type: 'time', precision: 0, description: '60分钟', isActive: true },
    { id: 'unit-039', name: '天', symbol: 'd', type: 'time', precision: 0, description: '24小时', isActive: true },
    { id: 'unit-040', name: '月', symbol: 'month', type: 'time', precision: 0, description: '约30天', isActive: true },
    { id: 'unit-041', name: '年', symbol: 'year', type: 'time', precision: 0, description: '12个月', isActive: true }
  ];

  const stmt = db.prepare(`
    INSERT INTO units (id, name, symbol, type, precision, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((units) => {
    for (const unit of units) {
      stmt.run(unit.id, unit.name, unit.symbol, unit.type, unit.precision, unit.description, unit.isActive ? 1 : 0);
    }
  });

  insertMany(units);
  console.log(`  ✅ 导入了 ${units.length} 个单位数据`);
}

async function importCategoriesData(db) {
  const categories = [
    { id: 'cat-001', name: '电子产品', description: '电子设备和配件', parentId: null, isActive: true },
    { id: 'cat-002', name: '手机', description: '智能手机和配件', parentId: 'cat-001', isActive: true },
    { id: 'cat-003', name: '电脑', description: '台式机和笔记本电脑', parentId: 'cat-001', isActive: true },
    { id: 'cat-004', name: '家用电器', description: '家庭电器设备', parentId: null, isActive: true },
    { id: 'cat-005', name: '厨房电器', description: '厨房用电器', parentId: 'cat-004', isActive: true }
  ];

  const stmt = db.prepare(`
    INSERT INTO categories (id, name, description, parent_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((categories) => {
    for (const category of categories) {
      stmt.run(category.id, category.name, category.description, category.parentId, category.isActive ? 1 : 0);
    }
  });

  insertMany(categories);
  console.log(`  ✅ 导入了 ${categories.length} 个分类数据`);
}

async function importSuppliersData(db) {
  const suppliers = [
    { id: 'sup-001', name: '华为技术有限公司', contactPerson: '张经理', phone: '010-12345678', email: 'zhang@huawei.com', address: '深圳市龙岗区', isActive: true },
    { id: 'sup-002', name: '小米科技有限公司', contactPerson: '李经理', phone: '010-87654321', email: 'li@xiaomi.com', address: '北京市海淀区', isActive: true }
  ];

  const stmt = db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, phone, email, address, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((suppliers) => {
    for (const supplier of suppliers) {
      stmt.run(supplier.id, supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address, supplier.isActive ? 1 : 0);
    }
  });

  insertMany(suppliers);
  console.log(`  ✅ 导入了 ${suppliers.length} 个供应商数据`);
}

async function importWarehousesData(db) {
  const warehouses = [
    { id: 'wh-001', name: '主仓库', location: '北京市朝阳区工业园区A座', type: 'main', capacity: 10000, isActive: true },
    { id: 'wh-002', name: '分仓库A', location: '上海市浦东新区物流园B区', type: 'branch', capacity: 5000, isActive: true }
  ];

  const stmt = db.prepare(`
    INSERT INTO warehouses (id, name, location, type, capacity, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((warehouses) => {
    for (const warehouse of warehouses) {
      stmt.run(warehouse.id, warehouse.name, warehouse.location, warehouse.type, warehouse.capacity, warehouse.isActive ? 1 : 0);
    }
  });

  insertMany(warehouses);
  console.log(`  ✅ 导入了 ${warehouses.length} 个仓库数据`);
}

async function importGlobalConversionRulesData(db) {
  const conversionRules = [
    { id: 'rule-001', fromUnitId: 'unit-011', toUnitId: 'unit-001', factor: 12, description: '1打=12个' },
    { id: 'rule-002', fromUnitId: 'unit-014', toUnitId: 'unit-013', factor: 1000, description: '1千克=1000克' },
    { id: 'rule-003', fromUnitId: 'unit-020', toUnitId: 'unit-019', factor: 100, description: '1米=100厘米' },
    { id: 'rule-004', fromUnitId: 'unit-028', toUnitId: 'unit-027', factor: 1000, description: '1升=1000毫升' }
  ];

  const stmt = db.prepare(`
    INSERT INTO global_conversion_rules (id, from_unit_id, to_unit_id, factor, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((rules) => {
    for (const rule of rules) {
      stmt.run(rule.id, rule.fromUnitId, rule.toUnitId, rule.factor, rule.description);
    }
  });

  insertMany(conversionRules);
  console.log(`  ✅ 导入了 ${conversionRules.length} 个转换规则数据`);
}

async function verifyImportResults(db) {
  const tables = ['units', 'categories', 'suppliers', 'warehouses', 'global_conversion_rules'];
  
  console.log('导入结果验证:');
  for (const table of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  ${table}: ${count.count} 条记录`);
      
      if (table === 'units') {
        const unitTypes = db.prepare(`
          SELECT type, COUNT(*) as count 
          FROM units 
          GROUP BY type 
          ORDER BY type
        `).all();
        
        console.log('    单位类型分布:');
        unitTypes.forEach(({ type, count }) => {
          console.log(`      ${type}: ${count} 个`);
        });
      }
    } catch (error) {
      console.log(`  ${table}: 查询失败 - ${error.message}`);
    }
  }
}

// 运行测试
testBuiltinDataImport();
