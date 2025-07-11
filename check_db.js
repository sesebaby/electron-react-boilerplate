const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

try {
  const dbPath = path.join(os.homedir(), '.config', 'inventory-management', 'inventory.db');
  console.log('数据库路径:', dbPath);
  
  const db = new Database(dbPath);
  
  // 检查表是否存在
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log('数据库中的表:', tables);
  
  // 检查用户表
  if (tables.some(t => t.name === 'users')) {
    console.log('\n用户表存在，查询用户记录:');
    const users = db.prepare('SELECT id, username, nickname, role, status FROM users').all();
    console.log('用户记录:', users);
    
    // 检查特定用户
    const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    console.log('\nadmin用户详情:', adminUser);
  } else {
    console.log('用户表不存在');
  }
  
  db.close();
} catch (error) {
  console.error('检查数据库失败:', error.message);
}