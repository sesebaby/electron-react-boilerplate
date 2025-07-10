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

    // 使用与main.js相同的嵌入式schema，确保一致性
    const schema = `
      -- 用户表
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        avatar TEXT,
        role TEXT NOT NULL CHECK(role IN ('admin', 'purchaser', 'salesperson', 'warehouse', 'finance')),
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'locked')) DEFAULT 'active',
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 仓库表
      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        manager TEXT,
        phone TEXT,
        is_default BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 客户表
      CREATE TABLE IF NOT EXISTS customers (
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
      );

      -- 分类表
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        parent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      -- 供应商表
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 计量单位表
      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('weight', 'length', 'volume', 'quantity', 'area', 'time')),
        precision INTEGER NOT NULL DEFAULT 2 CHECK(precision >= 0 AND precision <= 6),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- 全局换算规则表
      CREATE TABLE IF NOT EXISTS global_conversion_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        from_unit_id TEXT NOT NULL,
        to_unit_id TEXT NOT NULL,
        conversion_rate REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_unit_id) REFERENCES units(id),
        FOREIGN KEY (to_unit_id) REFERENCES units(id)
      );

      -- 库存交易记录表
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjustment')),
        quantity INTEGER NOT NULL,
        unit_price REAL,
        total_amount REAL,
        reference_number TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
      );

      -- 库存物品表
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        supplier TEXT,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0,
        total_value REAL NOT NULL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('in-stock', 'low-stock', 'out-of-stock', 'discontinued')) DEFAULT 'in-stock',
        location TEXT,
        reorder_level INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
      CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
      CREATE INDEX IF NOT EXISTS idx_customers_level ON customers(level);
      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
      CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);
      CREATE INDEX IF NOT EXISTS idx_units_type ON units(type);
      CREATE INDEX IF NOT EXISTS idx_global_conversion_from_unit ON global_conversion_rules(from_unit_id);
      CREATE INDEX IF NOT EXISTS idx_global_conversion_to_unit ON global_conversion_rules(to_unit_id);
      CREATE INDEX IF NOT EXISTS idx_global_conversion_category ON global_conversion_rules(category);
      CREATE INDEX IF NOT EXISTS idx_transactions_item ON inventory_transactions(item_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);
    `;

    // 执行架构 - 添加错误处理
    try {
      db.exec(schema);
      console.log('Database schema rebuilt successfully using embedded schema');
    } catch (dbError) {
      console.error('Database schema execution error:', dbError);
      throw new Error(`Database schema execution failed: ${dbError.message}`);
    }

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

    // 读取模拟数据文件 - 添加路径检查和错误处理
    const mockDataPath = path.join(__dirname, '../../mock-data.sql');
    console.log('Mock data path:', mockDataPath);
    console.log('Mock data path exists:', fs.existsSync(mockDataPath));
    
    if (!fs.existsSync(mockDataPath)) {
      // 尝试备用路径
      const alternativePath = path.join(__dirname, '../../../mock-data.sql');
      console.log('Alternative mock data path:', alternativePath);
      console.log('Alternative mock data path exists:', fs.existsSync(alternativePath));
      
      if (fs.existsSync(alternativePath)) {
        const mockData = fs.readFileSync(alternativePath, 'utf-8');
        
        try {
          db.exec(mockData);
        } catch (dbError) {
          console.error('Mock data execution error (alternative path):', dbError);
          throw new Error(`Mock data execution failed: ${dbError.message}`);
        }
        
        // 获取导入后的统计信息
        const stats = {};
        const tables = ['categories', 'suppliers', 'units', 'global_conversion_rules', 'inventory_items', 'inventory_transactions', 'warehouses'];
        
        for (const table of tables) {
          const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
          stats[table] = result.count;
        }
        
        return successResult({
          message: 'Mock data imported successfully (alternative path)',
          timestamp: new Date().toISOString(),
          stats
        });
      }
      
      throw new Error(`Mock data file not found at ${mockDataPath} or ${alternativePath}`);
    }

    const mockData = fs.readFileSync(mockDataPath, 'utf-8');

    // 执行模拟数据 - 添加错误处理
    try {
      db.exec(mockData);
    } catch (dbError) {
      console.error('Mock data execution error:', dbError);
      throw new Error(`Mock data execution failed: ${dbError.message}`);
    }

    // 获取导入后的统计信息
    const stats = {};
    const tables = ['categories', 'suppliers', 'units', 'global_conversion_rules', 'inventory_items', 'inventory_transactions', 'warehouses'];
    
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