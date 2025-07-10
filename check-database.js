const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

// 数据库路径
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'inventory-management', 'inventory.db');

console.log('检查数据库:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('\n=== 数据库表结构 ===');
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('表数量:', tables.length);
  tables.forEach(table => console.log('- ' + table.name));
  
  console.log('\n=== 数据统计 ===');
  
  // 检查仓库数据
  try {
    const warehouseCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get();
    console.log('仓库数量:', warehouseCount.count);
    
    if (warehouseCount.count > 0) {
      const warehouses = db.prepare('SELECT id, code, name, is_default FROM warehouses LIMIT 5').all();
      console.log('仓库列表:');
      warehouses.forEach(w => console.log(`  - ${w.code}: ${w.name} (默认: ${w.is_default})`));
    }
  } catch (err) {
    console.log('仓库表查询失败:', err.message);
  }
  
  // 检查商品数据
  try {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    console.log('商品数量:', productCount.count);
    
    if (productCount.count > 0) {
      const products = db.prepare('SELECT id, sku, name, status FROM products LIMIT 5').all();
      console.log('商品列表:');
      products.forEach(p => console.log(`  - ${p.sku}: ${p.name} (状态: ${p.status})`));
    }
  } catch (err) {
    console.log('商品表查询失败:', err.message);
  }
  
  // 检查库存物品数据
  try {
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get();
    console.log('库存物品数量:', itemCount.count);
    
    if (itemCount.count > 0) {
      const items = db.prepare('SELECT id, sku, name, status FROM inventory_items LIMIT 5').all();
      console.log('库存物品列表:');
      items.forEach(i => console.log(`  - ${i.sku}: ${i.name} (状态: ${i.status})`));
    }
  } catch (err) {
    console.log('库存物品表查询失败:', err.message);
  }
  
  // 检查分类数据
  try {
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    console.log('分类数量:', categoryCount.count);
  } catch (err) {
    console.log('分类表查询失败:', err.message);
  }
  
  // 检查单位数据
  try {
    const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get();
    console.log('单位数量:', unitCount.count);
  } catch (err) {
    console.log('单位表查询失败:', err.message);
  }
  
  // 检查用户数据
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('用户数量:', userCount.count);
  } catch (err) {
    console.log('用户表查询失败:', err.message);
  }
  
  console.log('\n=== 检查基础数据详情 ===');

  // 检查分类详情
  try {
    const categories = db.prepare('SELECT * FROM categories LIMIT 5').all();
    if (categories.length > 0) {
      console.log('分类详情:');
      categories.forEach(c => console.log(`  - ${c.id}: ${c.name}`));
    } else {
      console.log('分类表为空');
    }
  } catch (err) {
    console.log('查询分类详情失败:', err.message);
  }

  // 检查单位详情
  try {
    const units = db.prepare('SELECT * FROM units LIMIT 5').all();
    if (units.length > 0) {
      console.log('单位详情:');
      units.forEach(u => console.log(`  - ${u.symbol}: ${u.name} (类型: ${u.type})`));
    } else {
      console.log('单位表为空');
    }
  } catch (err) {
    console.log('查询单位详情失败:', err.message);
  }

  // 检查供应商详情
  try {
    const suppliers = db.prepare('SELECT * FROM suppliers LIMIT 5').all();
    if (suppliers.length > 0) {
      console.log('供应商详情:');
      suppliers.forEach(s => console.log(`  - ${s.code}: ${s.name}`));
    } else {
      console.log('供应商表为空');
    }
  } catch (err) {
    console.log('查询供应商详情失败:', err.message);
  }

  console.log('\n=== 最近的数据库操作 ===');

  // 检查最近创建的记录
  try {
    const recentWarehouses = db.prepare(`
      SELECT code, name, created_at
      FROM warehouses
      ORDER BY created_at DESC
      LIMIT 3
    `).all();

    if (recentWarehouses.length > 0) {
      console.log('最近创建的仓库:');
      recentWarehouses.forEach(w => console.log(`  - ${w.code}: ${w.name} (${w.created_at})`));
    }
  } catch (err) {
    console.log('查询最近仓库失败:', err.message);
  }

  try {
    const recentItems = db.prepare(`
      SELECT sku, name, created_at
      FROM inventory_items
      ORDER BY created_at DESC
      LIMIT 3
    `).all();

    if (recentItems.length > 0) {
      console.log('最近创建的库存物品:');
      recentItems.forEach(i => console.log(`  - ${i.sku}: ${i.name} (${i.created_at})`));
    }
  } catch (err) {
    console.log('查询最近库存物品失败:', err.message);
  }
  
  db.close();
  console.log('\n数据库检查完成');
  
} catch (error) {
  console.error('数据库检查失败:', error.message);
}
