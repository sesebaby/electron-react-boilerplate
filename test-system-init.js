/**
 * 测试系统初始化功能
 * 验证数据库schema重建和内置数据导入是否正常工作
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 导入系统处理器
const { ipcMain } = require('electron');

// 模拟 IPC 环境
const mockIpcMain = {
  handlers: new Map(),
  handle(channel, handler) {
    this.handlers.set(channel, handler);
  },
  async invoke(channel, ...args) {
    const handler = this.handlers.get(channel);
    if (handler) {
      return await handler({ sender: {} }, ...args);
    }
    throw new Error(`No handler for channel: ${channel}`);
  }
};

// 替换全局 ipcMain
global.ipcMain = mockIpcMain;

async function testSystemInitialization() {
  console.log('🧪 开始测试系统初始化功能...\n');

  try {
    // 创建测试数据库
    const testDbPath = path.join(__dirname, 'test-inventory.db');
    
    // 删除现有测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('✓ 删除现有测试数据库');
    }

    // 创建新的测试数据库
    const db = new Database(testDbPath);
    console.log('✓ 创建测试数据库:', testDbPath);

    // 加载系统处理器
    require('./public/database/handlers/systemHandlers.js');
    console.log('✓ 加载系统处理器');

    // 测试数据库schema重建
    console.log('\n📋 测试数据库schema重建...');
    const rebuildResult = await mockIpcMain.invoke('db-rebuild-schema');
    
    if (rebuildResult.success) {
      console.log('✅ Schema重建成功');
      console.log('   消息:', rebuildResult.data.message);
    } else {
      console.log('❌ Schema重建失败');
      console.log('   错误:', rebuildResult.error);
      return;
    }

    // 测试内置数据导入
    console.log('\n📦 测试内置数据导入...');
    const importResult = await mockIpcMain.invoke('db-import-builtin-data');
    
    if (importResult.success) {
      console.log('✅ 内置数据导入成功');
      console.log('   统计信息:', importResult.data.stats);
    } else {
      console.log('❌ 内置数据导入失败');
      console.log('   错误:', importResult.error);
      return;
    }

    // 验证数据
    console.log('\n🔍 验证导入的数据...');
    
    // 检查单位数据
    const units = db.prepare('SELECT COUNT(*) as count FROM units').get();
    console.log(`✓ 单位数据: ${units.count} 条记录`);
    
    if (units.count >= 40) {
      console.log('✅ 单位数据导入正常 (预期41个单位)');
    } else {
      console.log('⚠️  单位数据可能不完整');
    }

    // 检查分类数据
    const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    console.log(`✓ 分类数据: ${categories.count} 条记录`);

    // 检查供应商数据
    const suppliers = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    console.log(`✓ 供应商数据: ${suppliers.count} 条记录`);

    // 检查仓库数据
    const warehouses = db.prepare('SELECT COUNT(*) as count FROM warehouses').get();
    console.log(`✓ 仓库数据: ${warehouses.count} 条记录`);

    // 检查转换规则数据
    const rules = db.prepare('SELECT COUNT(*) as count FROM global_conversion_rules').get();
    console.log(`✓ 转换规则数据: ${rules.count} 条记录`);

    // 显示一些示例单位数据
    console.log('\n📋 示例单位数据:');
    const sampleUnits = db.prepare('SELECT name, symbol, type FROM units LIMIT 10').all();
    sampleUnits.forEach(unit => {
      console.log(`   ${unit.name} (${unit.symbol}) - ${unit.type}`);
    });

    console.log('\n🎉 系统初始化测试完成！');
    console.log('✅ 所有功能正常工作');

    // 清理
    db.close();
    fs.unlinkSync(testDbPath);
    console.log('✓ 清理测试数据库');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
testSystemInitialization();
