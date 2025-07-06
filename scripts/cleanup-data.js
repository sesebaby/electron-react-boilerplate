#!/usr/bin/env node

// 数据清理执行脚本 (JavaScript版本)
// 使用方法: node scripts/cleanup-data.js

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 数据库路径 - 使用Electron的userData路径
function getElectronUserDataPath() {
  // 在Windows上，Electron的userData路径通常是：
  // C:\Users\{username}\AppData\Roaming\{app-name}
  const appName = 'inventory-management'; // 根据package.json中的name

  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', appName);
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    return path.join(os.homedir(), '.config', appName);
  }
}

// 尝试多个可能的数据库路径
const POSSIBLE_DB_PATHS = [
  path.join(getElectronUserDataPath(), 'inventory.db'),
  path.join(process.cwd(), 'data', 'inventory.db'),
  path.join(process.cwd(), 'inventory.db')
];

// 查找实际存在的数据库文件
function findDatabasePath() {
  for (const dbPath of POSSIBLE_DB_PATHS) {
    if (fs.existsSync(dbPath)) {
      console.log(`找到数据库文件: ${dbPath}`);
      return dbPath;
    }
  }

  // 如果没有找到，使用第一个路径并创建
  const defaultPath = POSSIBLE_DB_PATHS[0];
  console.log(`未找到现有数据库，将使用默认路径: ${defaultPath}`);
  return defaultPath;
}

const DB_PATH = findDatabasePath();

// 需要清理的业务数据表（按依赖关系排序）
const BUSINESS_TABLES = [
  'receipts',                    // 收款记录
  'payments',                    // 付款记录
  'purchase_receipt_items',      // 采购收货明细
  'purchase_order_items',        // 采购订单明细
  'sales_delivery_items',        // 销售出库明细（如果存在）
  'sales_order_items',           // 销售订单明细
  'inventory_transactions',      // 库存流水表
  'inventory_stocks',            // 库存主表
  'sales_deliveries',            // 销售出库表（如果存在）
  'sales_orders',                // 销售订单表
  'purchase_receipts',           // 采购收货表
  'purchase_orders',             // 采购订单表
  'accounts_receivable',         // 应收账款表
  'accounts_payable',            // 应付账款表
  'operation_logs'               // 操作日志表
];

// 需要保留的配置数据表
const CONFIG_TABLES = [
  'users',                       // 用户表
  'system_configs',              // 系统配置表
  'units',                       // 计量单位表
  'categories',                  // 商品分类表
  'warehouses',                  // 仓库表
  'products',                    // 商品表
  'suppliers',                   // 供应商表
  'customers',                   // 客户表
  'migrations'                   // 迁移记录表
];

/**
 * 检查表是否存在
 */
function tableExists(db, tableName) {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName);
    return !!result;
  } catch (error) {
    console.warn(`检查表 ${tableName} 是否存在时出错:`, error.message);
    return false;
  }
}

/**
 * 获取表中的记录数
 */
function getTableRowCount(db, tableName) {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
    return result?.count || 0;
  } catch (error) {
    console.warn(`获取表 ${tableName} 记录数时出错:`, error.message);
    return 0;
  }
}

/**
 * 清理单个表
 */
function clearTable(db, tableName) {
  try {
    const exists = tableExists(db, tableName);
    if (!exists) {
      console.log(`表 ${tableName} 不存在，跳过清理`);
      return { success: true };
    }

    const beforeCount = getTableRowCount(db, tableName);
    console.log(`清理表 ${tableName}，清理前记录数: ${beforeCount}`);

    if (beforeCount === 0) {
      console.log(`表 ${tableName} 已经为空，跳过清理`);
      return { success: true };
    }

    // 删除表中所有数据
    db.prepare(`DELETE FROM ${tableName}`).run();
    
    // 重置自增ID（如果有的话）
    try {
      db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(tableName);
    } catch (e) {
      // 忽略错误，可能没有自增字段
    }

    const afterCount = getTableRowCount(db, tableName);
    console.log(`表 ${tableName} 清理完成，清理后记录数: ${afterCount}`);

    return { success: true };
  } catch (error) {
    const errorMsg = `清理表 ${tableName} 失败: ${error.message}`;
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * 执行完整的数据清理
 */
function cleanupAllBusinessData() {
  const result = {
    success: true,
    message: '',
    clearedTables: [],
    preservedTables: [],
    errors: []
  };

  console.log('🧹 开始清理业务数据...');
  console.log(`计划清理 ${BUSINESS_TABLES.length} 个业务数据表`);
  console.log(`保留 ${CONFIG_TABLES.length} 个配置数据表`);

  let db;
  try {
    // 确保数据库目录存在
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 连接数据库
    db = new sqlite3(DB_PATH);
    console.log(`✅ 数据库连接成功: ${DB_PATH}`);

    // 开始事务
    db.exec('BEGIN TRANSACTION');

    // 临时禁用外键约束
    db.exec('PRAGMA foreign_keys = OFF');

    // 清理业务数据表
    for (const tableName of BUSINESS_TABLES) {
      const clearResult = clearTable(db, tableName);
      
      if (clearResult.success) {
        result.clearedTables.push(tableName);
      } else {
        result.errors.push(clearResult.error || `清理表 ${tableName} 失败`);
        result.success = false;
      }
    }

    // 重新启用外键约束
    db.exec('PRAGMA foreign_keys = ON');

    if (result.success) {
      // 提交事务
      db.exec('COMMIT');
      result.message = `成功清理 ${result.clearedTables.length} 个业务数据表`;
      console.log('✅ 数据清理完成');
    } else {
      // 回滚事务
      db.exec('ROLLBACK');
      result.message = `数据清理失败，已回滚。错误数: ${result.errors.length}`;
      console.error('❌ 数据清理失败，已回滚');
    }

    // 记录保留的表
    for (const tableName of CONFIG_TABLES) {
      const exists = tableExists(db, tableName);
      if (exists) {
        result.preservedTables.push(tableName);
      }
    }

  } catch (error) {
    // 确保回滚事务
    if (db) {
      try {
        db.exec('ROLLBACK');
      } catch (rollbackError) {
        console.error('回滚事务失败:', rollbackError.message);
      }
    }

    const errorMsg = `数据清理过程中发生严重错误: ${error.message}`;
    result.success = false;
    result.message = errorMsg;
    result.errors.push(errorMsg);
    console.error('💥 数据清理过程中发生严重错误:', error);
  } finally {
    if (db) {
      db.close();
    }
  }

  return result;
}

/**
 * 验证清理结果
 */
function validateCleanupResult() {
  const details = [];
  let businessTablesEmpty = true;
  let configTablesPreserved = true;

  console.log('🔍 验证清理结果...');

  let db;
  try {
    db = new sqlite3(DB_PATH);

    // 检查业务数据表是否为空
    for (const tableName of BUSINESS_TABLES) {
      const exists = tableExists(db, tableName);
      if (exists) {
        const rowCount = getTableRowCount(db, tableName);
        details.push({ tableName, rowCount, expected: 'empty' });
        
        if (rowCount > 0) {
          businessTablesEmpty = false;
          console.warn(`⚠️  业务数据表 ${tableName} 仍有 ${rowCount} 条记录`);
        } else {
          console.log(`✅ 业务数据表 ${tableName} 已清空`);
        }
      }
    }

    // 检查配置数据表是否保留
    for (const tableName of CONFIG_TABLES) {
      const exists = tableExists(db, tableName);
      if (exists) {
        const rowCount = getTableRowCount(db, tableName);
        details.push({ tableName, rowCount, expected: 'preserved' });
        console.log(`📋 配置数据表 ${tableName} 保留 ${rowCount} 条记录`);
      } else {
        configTablesPreserved = false;
        console.warn(`⚠️  配置数据表 ${tableName} 不存在`);
      }
    }

  } catch (error) {
    console.error('验证过程中发生错误:', error.message);
  } finally {
    if (db) {
      db.close();
    }
  }

  return {
    businessTablesEmpty,
    configTablesPreserved,
    details
  };
}

/**
 * 生成清理报告
 */
function generateCleanupReport(result, validation) {
  const report = [
    '📊 数据清理报告',
    '='.repeat(50),
    '',
    `清理状态: ${result.success ? '✅ 成功' : '❌ 失败'}`,
    `清理消息: ${result.message}`,
    '',
    `已清理的业务数据表 (${result.clearedTables.length}):`,
    ...result.clearedTables.map(table => `  - ${table}`),
    '',
    `保留的配置数据表 (${result.preservedTables.length}):`,
    ...result.preservedTables.map(table => `  - ${table}`),
    ''
  ];

  if (result.errors.length > 0) {
    report.push(`错误信息 (${result.errors.length}):`);
    report.push(...result.errors.map(error => `  - ${error}`));
    report.push('');
  }

  report.push('验证结果:');
  report.push(`  业务数据表已清空: ${validation.businessTablesEmpty ? '✅' : '❌'}`);
  report.push(`  配置数据表已保留: ${validation.configTablesPreserved ? '✅' : '❌'}`);
  report.push('');

  report.push('详细统计:');
  validation.details.forEach(detail => {
    const status = detail.expected === 'empty' 
      ? (detail.rowCount === 0 ? '✅' : '❌')
      : (detail.rowCount > 0 ? '✅' : '⚠️');
    report.push(`  ${status} ${detail.tableName}: ${detail.rowCount} 条记录 (期望: ${detail.expected})`);
  });

  return report.join('\n');
}

// 主函数
async function main() {
  console.log('🚀 启动数据清理脚本...');
  console.log('⚠️  警告: 此操作将清除所有业务数据，但保留基础配置数据');
  console.log('');

  try {
    // 执行数据清理
    const cleanupResult = cleanupAllBusinessData();
    
    // 验证清理结果
    console.log('');
    const validationResult = validateCleanupResult();
    
    // 生成并显示报告
    console.log('');
    const report = generateCleanupReport(cleanupResult, validationResult);
    console.log(report);
    
    // 保存报告到文件
    const reportPath = path.join(process.cwd(), 'data-cleanup-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 清理报告已保存到: ${reportPath}`);
    
    // 根据结果设置退出码
    if (cleanupResult.success && validationResult.businessTablesEmpty) {
      console.log('');
      console.log('🎉 数据清理成功完成！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 数据清理未完全成功，请检查报告');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 数据清理脚本执行失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { main };
