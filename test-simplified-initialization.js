/**
 * 测试简化的系统初始化流程
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

console.log('=== 测试简化的系统初始化流程 ===\n');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'public', 'preload.js')
    }
  });

  win.webContents.openDevTools();
  
  win.webContents.on('did-finish-load', () => {
    testInitializationFlow();
  });
  
  win.loadFile('test-simplified-initialization.html');
}

async function testInitializationFlow() {
  console.log('开始测试简化的系统初始化流程...\n');
  
  try {
    // 1. 测试数据库清理
    console.log('1. 测试数据库清理...');
    const clearResult = await testDatabaseClear();
    console.log('数据库清理结果:', clearResult.success ? '成功' : '失败');
    
    // 2. 测试数据库结构重建
    console.log('\n2. 测试数据库结构重建...');
    const rebuildResult = await testSchemaRebuild();
    console.log('数据库结构重建结果:', rebuildResult.success ? '成功' : '失败');
    
    // 3. 测试内置数据导入
    console.log('\n3. 测试内置数据导入...');
    const importResult = await testBuiltinDataImport();
    console.log('内置数据导入结果:', importResult.success ? '成功' : '失败');
    
    if (importResult.success && importResult.data && importResult.data.stats) {
      console.log('导入统计信息:');
      Object.entries(importResult.data.stats).forEach(([table, count]) => {
        console.log(`  ${table}: ${count} 条记录`);
      });
    }
    
    // 4. 验证数据完整性
    console.log('\n4. 验证数据完整性...');
    await verifyDataIntegrity();
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
  
  // 延迟退出
  setTimeout(() => {
    app.quit();
  }, 5000);
}

async function testDatabaseClear() {
  try {
    // 模拟IPC调用
    return new Promise((resolve) => {
      ipcMain.emit('db-clear-database', { reply: resolve }, { preserveUsers: false, preserveSettings: false });
    });
  } catch (error) {
    console.error('数据库清理测试失败:', error);
    return { success: false, error: error.message };
  }
}

async function testSchemaRebuild() {
  try {
    return new Promise((resolve) => {
      ipcMain.emit('db-rebuild-schema', { reply: resolve });
    });
  } catch (error) {
    console.error('数据库结构重建测试失败:', error);
    return { success: false, error: error.message };
  }
}

async function testBuiltinDataImport() {
  try {
    return new Promise((resolve) => {
      ipcMain.emit('db-import-builtin-data', { reply: resolve });
    });
  } catch (error) {
    console.error('内置数据导入测试失败:', error);
    return { success: false, error: error.message };
  }
}

async function verifyDataIntegrity() {
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'data', 'inventory.db');
  
  try {
    const db = new Database(dbPath);
    
    // 检查关键表的数据
    const tables = ['units', 'categories', 'suppliers', 'warehouses', 'global_conversion_rules'];
    
    console.log('数据完整性验证结果:');
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`  ${table}: ${count.count} 条记录`);
        
        // 特别验证单位数据
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
          
          // 验证是否有41个单位
          if (count.count === 41) {
            console.log('    ✅ 单位数据完整 (41个单位)');
          } else {
            console.log(`    ⚠️ 单位数据不完整 (期望41个，实际${count.count}个)`);
          }
        }
        
        // 验证转换规则
        if (table === 'global_conversion_rules') {
          if (count.count >= 24) {
            console.log('    ✅ 转换规则数据完整');
          } else {
            console.log(`    ⚠️ 转换规则数据不完整 (期望至少24个，实际${count.count}个)`);
          }
        }
        
      } catch (error) {
        console.log(`  ${table}: 查询失败 - ${error.message}`);
      }
    }
    
    db.close();
    
  } catch (error) {
    console.error('数据完整性验证失败:', error);
  }
}

// 设置IPC处理器（模拟）
function setupMockIpcHandlers() {
  // 这里需要加载实际的数据库处理器
  const { setupSystemHandlers } = require('./public/database/handlers/systemHandlers');
  const Database = require('better-sqlite3');
  const dbPath = path.join(__dirname, 'data', 'inventory.db');
  
  try {
    const db = new Database(dbPath);
    setupSystemHandlers(ipcMain, db);
    console.log('IPC处理器设置完成');
  } catch (error) {
    console.error('IPC处理器设置失败:', error);
  }
}

app.whenReady().then(() => {
  setupMockIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
