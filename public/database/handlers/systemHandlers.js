/**
 * 系统管理处理器
 * 负责系统初始化、数据库管理和系统状态相关操作
 */

const { 
  successResult, 
  errorResult, 
  checkDatabaseInitialized,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields
} = require('../utils/dbUtils');

const { wrapIpcHandler } = require('../utils/errorHandler');

/**
 * 设置系统管理相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupSystemHandlers(ipcMain, db) {
  
  // 获取系统状态
  ipcMain.handle('db-get-system-status', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');

    // 获取数据库文件大小
    const dbPath = db.name;
    const stats = fs.statSync(dbPath);
    const databaseSize = stats.size;

    // 获取表数量
    const tableCount = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).get().count;

    // 获取总记录数
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    let recordCount = 0;
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get().count;
        recordCount += count;
      } catch (error) {
        // 跳过无法统计的表
      }
    }

    // 获取最后备份日期
    let lastBackup;
    try {
      const backup = db.prepare(`
        SELECT timestamp FROM backups ORDER BY timestamp DESC LIMIT 1
      `).get();
      if (backup) {
        lastBackup = new Date(backup.timestamp);
      }
    } catch (error) {
      // 没有备份表或没有备份
    }

    const version = '1.0.0';

    return successResult({
      databaseSize,
      tableCount,
      recordCount,
      lastBackup,
      version,
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage()
    });
  }, 'get-system-status'));

  // 验证数据库完整性
  ipcMain.handle('db-validate-integrity', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const issues = [];
    const recommendations = [];

    // 检查数据库完整性
    try {
      const result = db.prepare('PRAGMA integrity_check').get();
      if (result.integrity_check !== 'ok') {
        issues.push('Database integrity check failed');
        recommendations.push('Consider restoring from a backup');
      }
    } catch (error) {
      issues.push('Unable to perform integrity check');
    }

    // 检查必需表
    const requiredTables = [
      'inventory_items', 'categories', 'suppliers', 'warehouses',
      'units', 'inventory_transactions', 'users'
    ];

    const existingTables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all().map(t => t.name);

    for (const table of requiredTables) {
      if (!existingTables.includes(table)) {
        issues.push(`Missing required table: ${table}`);
        recommendations.push('Run system initialization to recreate missing tables');
      }
    }

    // 检查关键数据
    try {
      const warehouseCount = db.prepare('SELECT COUNT(*) as count FROM warehouses').get().count;
      if (warehouseCount === 0) {
        issues.push('No warehouses found');
        recommendations.push('Create at least one warehouse');
      } else {
        const defaultWarehouse = db.prepare('SELECT COUNT(*) as count FROM warehouses WHERE is_default = 1').get().count;
        if (defaultWarehouse === 0) {
          issues.push('No default warehouse set');
          recommendations.push('Set a default warehouse');
        }
      }
    } catch (error) {
      issues.push('Unable to check warehouse data');
    }

    // 检查单位数据
    try {
      const unitCount = db.prepare('SELECT COUNT(*) as count FROM units WHERE is_active = 1').get().count;
      if (unitCount === 0) {
        issues.push('No active units found');
        recommendations.push('Import unit data or activate existing units');
      }
    } catch (error) {
      issues.push('Unable to check unit data');
    }

    // 检查孤立记录
    try {
      const orphanedTransactions = db.prepare(`
        SELECT COUNT(*) as count FROM inventory_transactions
        WHERE item_id NOT IN (SELECT id FROM inventory_items)
      `).get().count;

      if (orphanedTransactions > 0) {
        issues.push(`Found ${orphanedTransactions} orphaned transaction records`);
        recommendations.push('Clean up orphaned transaction records');
      }
    } catch (error) {
      // 表可能不存在
    }

    return successResult({
      isValid: issues.length === 0,
      issues,
      recommendations,
      checkTime: new Date().toISOString()
    });
  }, 'validate-integrity'));

  // 清理数据库
  ipcMain.handle('db-clear-database', wrapIpcHandler(async (event, { preserveUsers, preserveSettings }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    // 获取所有表
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();

    // 要保留的表
    const preserveTables = [];
    if (preserveUsers) {
      preserveTables.push('users', 'user_sessions');
    }
    if (preserveSettings) {
      preserveTables.push('system_settings', 'backups');
    }

    // 使用事务清理表
    const transaction = db.transaction(() => {
      for (const table of tables) {
        if (!preserveTables.includes(table.name)) {
          try {
            db.prepare(`DELETE FROM ${table.name}`).run();
          } catch (error) {
            console.warn(`Failed to clear table ${table.name}:`, error.message);
          }
        }
      }
    });

    transaction();

    return successResult({
      clearedTables: tables.filter(t => !preserveTables.includes(t.name)).map(t => t.name),
      preservedTables: preserveTables
    });
  }, 'clear-database'));

  // 重建数据库架构
  ipcMain.handle('db-rebuild-schema', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');
    const path = require('path');

    // 读取架构文件
    const schemaPath = path.join(__dirname, '../../src/data/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found');
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // 执行架构
    db.exec(schema);

    return successResult({
      message: 'Database schema rebuilt successfully',
      timestamp: new Date().toISOString()
    });
  }, 'rebuild-schema'));

  // 导入模拟数据
  ipcMain.handle('db-import-mock-data', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');
    const path = require('path');

    // 读取模拟数据文件
    const mockDataPath = path.join(__dirname, '../../mock-data.sql');
    if (!fs.existsSync(mockDataPath)) {
      throw new Error('Mock data file not found');
    }

    const mockData = fs.readFileSync(mockDataPath, 'utf-8');

    // 执行模拟数据
    db.exec(mockData);

    // 获取导入后的统计信息
    const stats = {};
    const tables = ['categories', 'suppliers', 'units', 'inventory_items', 'inventory_transactions', 'warehouses'];
    
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
        stats[table] = count;
      } catch (error) {
        stats[table] = 0;
      }
    }

    return successResult({
      message: 'Mock data imported successfully',
      stats,
      timestamp: new Date().toISOString()
    });
  }, 'import-mock-data'));

  // 优化数据库
  ipcMain.handle('db-optimize', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const optimizationSteps = [];

    // 分析数据库
    try {
      db.exec('ANALYZE');
      optimizationSteps.push('Database analyzed');
    } catch (error) {
      optimizationSteps.push(`Analysis failed: ${error.message}`);
    }

    // 清理未使用的页面
    try {
      const result = db.prepare('PRAGMA vacuum').run();
      optimizationSteps.push('Database vacuumed');
    } catch (error) {
      optimizationSteps.push(`Vacuum failed: ${error.message}`);
    }

    // 重建索引
    try {
      db.exec('REINDEX');
      optimizationSteps.push('Indexes rebuilt');
    } catch (error) {
      optimizationSteps.push(`Reindex failed: ${error.message}`);
    }

    // 获取优化后的统计信息
    const fs = require('fs');
    const dbPath = db.name;
    const stats = fs.statSync(dbPath);
    
    return successResult({
      message: 'Database optimization completed',
      steps: optimizationSteps,
      newSize: stats.size,
      timestamp: new Date().toISOString()
    });
  }, 'optimize-database'));

  // 获取数据库信息
  ipcMain.handle('db-get-database-info', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    // 获取数据库版本和配置
    const version = db.prepare('PRAGMA user_version').get();
    const pageSize = db.prepare('PRAGMA page_size').get();
    const cacheSize = db.prepare('PRAGMA cache_size').get();
    const journalMode = db.prepare('PRAGMA journal_mode').get();
    const synchronous = db.prepare('PRAGMA synchronous').get();

    // 获取表信息
    const tables = db.prepare(`
      SELECT 
        name,
        type,
        sql
      FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    // 获取索引信息
    const indexes = db.prepare(`
      SELECT 
        name,
        tbl_name,
        sql
      FROM sqlite_master
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      ORDER BY tbl_name, name
    `).all();

    return successResult({
      version: version.user_version,
      pageSize: pageSize.page_size,
      cacheSize: cacheSize.cache_size,
      journalMode: journalMode.journal_mode,
      synchronous: synchronous.synchronous,
      tables: tables.map(t => ({
        name: t.name,
        type: t.type,
        hasData: true // 可以添加数据检查
      })),
      indexes: indexes.map(i => ({
        name: i.name,
        table: i.tbl_name
      })),
      totalTables: tables.length,
      totalIndexes: indexes.length
    });
  }, 'get-database-info'));

  // 执行自定义SQL查询（开发模式）
  ipcMain.handle('db-execute-query', wrapIpcHandler(async (event, { query, params = [] }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields({ query }, ['query']);

    // 安全检查：只允许SELECT查询
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }

    try {
      const stmt = db.prepare(query);
      const result = stmt.all(...params);
      
      return successResult({
        rows: result,
        count: result.length,
        query: query
      });
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }, 'execute-query'));

  // 获取表结构
  ipcMain.handle('db-get-table-schema', wrapIpcHandler(async (event, { tableName }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields({ tableName }, ['tableName']);

    // 获取表结构
    const schema = db.prepare(`PRAGMA table_info(${tableName})`).all();
    
    if (schema.length === 0) {
      throw new Error(`Table ${tableName} not found`);
    }

    // 获取表的索引
    const indexes = db.prepare(`PRAGMA index_list(${tableName})`).all();
    
    // 获取表的外键
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();

    return successResult({
      tableName,
      columns: schema.map(col => ({
        name: col.name,
        type: col.type,
        notNull: Boolean(col.notnull),
        defaultValue: col.dflt_value,
        isPrimaryKey: Boolean(col.pk)
      })),
      indexes: indexes.map(idx => ({
        name: idx.name,
        unique: Boolean(idx.unique),
        partial: Boolean(idx.partial)
      })),
      foreignKeys: foreignKeys.map(fk => ({
        column: fk.from,
        referencedTable: fk.table,
        referencedColumn: fk.to
      }))
    });
  }, 'get-table-schema'));

  console.log('System handlers registered successfully');
}

module.exports = {
  setupSystemHandlers
};