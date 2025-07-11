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
        level INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
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

      -- 库存物品表（必须在 inventory_transactions 之前创建）
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

    // 执行架构 - 添加错误处理和详细日志
    try {
      console.log('开始执行数据库架构创建...');

      // 首先删除所有现有表（除了系统表）
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      console.log(`发现 ${tables.length} 个现有表，准备删除...`);

      // 禁用外键约束以便删除表
      db.exec('PRAGMA foreign_keys = OFF');

      // 删除所有现有表
      for (const table of tables) {
        try {
          db.exec(`DROP TABLE IF EXISTS ${table.name}`);
          console.log(`已删除表: ${table.name}`);
        } catch (error) {
          console.warn(`删除表 ${table.name} 失败:`, error.message);
        }
      }

      // 分离表创建语句和索引创建语句
      // 使用更智能的方式分离SQL语句
      const statements = [];
      let currentStatement = '';
      let inCreateTable = false;
      
      const lines = schema.split('\n');
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // 跳过空行和注释
        if (trimmedLine.length === 0 || trimmedLine.startsWith('--')) {
          continue;
        }
        
        // 检查是否开始一个新的CREATE TABLE语句
        if (trimmedLine.toUpperCase().includes('CREATE TABLE')) {
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
          }
          currentStatement = trimmedLine;
          inCreateTable = true;
          continue;
        }
        
        // 检查是否开始一个新的CREATE INDEX语句
        if (trimmedLine.toUpperCase().includes('CREATE INDEX')) {
          if (currentStatement.trim()) {
            statements.push(currentStatement.trim());
          }
          currentStatement = trimmedLine;
          inCreateTable = false;
          continue;
        }
        
        // 如果在CREATE TABLE内部，检查是否结束
        if (inCreateTable && trimmedLine.endsWith(');')) {
          currentStatement += ' ' + trimmedLine;
          statements.push(currentStatement.trim());
          currentStatement = '';
          inCreateTable = false;
          continue;
        }
        
        // 如果是CREATE INDEX且以分号结束
        if (!inCreateTable && trimmedLine.endsWith(';')) {
          currentStatement += ' ' + trimmedLine;
          statements.push(currentStatement.trim());
          currentStatement = '';
          continue;
        }
        
        // 继续拼接当前语句
        currentStatement += ' ' + trimmedLine;
      }
      
      // 处理最后一个语句
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }

      const tableStatements = statements.filter(stmt =>
        stmt.toUpperCase().includes('CREATE TABLE')
      );

      const indexStatements = statements.filter(stmt =>
        stmt.toUpperCase().includes('CREATE INDEX')
      );

      console.log(`准备执行 ${tableStatements.length} 个表创建语句和 ${indexStatements.length} 个索引创建语句`);
      console.log('表创建语句:', tableStatements.map(s => s.substring(0, 50) + '...'));
      console.log('索引创建语句:', indexStatements.map(s => s.substring(0, 50) + '...'));

      // 先创建所有表
      for (let i = 0; i < tableStatements.length; i++) {
        const statement = tableStatements[i];
        try {
          console.log(`正在创建表 ${i + 1}/${tableStatements.length}...`);
          db.exec(statement);
          const tableName = statement.match(/CREATE TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i)?.[1];
          console.log(`✓ 表 ${tableName} 创建成功`);

          // 验证表是否真的创建成功
          const tableExists = db.prepare(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name=?
          `).get(tableName);

          if (!tableExists) {
            throw new Error(`表 ${tableName} 创建后验证失败`);
          }
        } catch (stmtError) {
          console.error(`创建表时出错:`, statement.substring(0, 100) + '...');
          console.error('错误详情:', stmtError.message);
          throw stmtError;
        }
      }

      // 再创建所有索引
      console.log(`\n开始创建索引...`);
      for (let i = 0; i < indexStatements.length; i++) {
        const statement = indexStatements[i];
        try {
          console.log(`正在创建索引 ${i + 1}/${indexStatements.length}...`);

          // 检查索引依赖的表是否存在
          const tableMatch = statement.match(/ON\s+(\w+)\s*\(/);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const tableExists = db.prepare(`
              SELECT name FROM sqlite_master
              WHERE type='table' AND name=?
            `).get(tableName);

            if (!tableExists) {
              throw new Error(`索引依赖的表 ${tableName} 不存在`);
            }
          }

          db.exec(statement);
          const indexName = statement.match(/CREATE INDEX(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i)?.[1];
          console.log(`✓ 索引 ${indexName} 创建成功`);
        } catch (stmtError) {
          console.error(`创建索引时出错:`, statement.substring(0, 100) + '...');
          console.error('错误详情:', stmtError.message);
          throw stmtError;
        }
      }

      // 重新启用外键约束
      db.exec('PRAGMA foreign_keys = ON');

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

  // 导入内置初始数据
  ipcMain.handle('db-import-builtin-data', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    try {
      console.log('开始导入内置初始数据...');

      // 导入单位数据
      await importUnitsData(db);
      console.log('单位数据导入完成');

      // 导入分类数据
      await importCategoriesData(db);
      console.log('分类数据导入完成');

      // 导入供应商数据
      await importSuppliersData(db);
      console.log('供应商数据导入完成');

      // 导入仓库数据
      await importWarehousesData(db);
      console.log('仓库数据导入完成');

      // 导入全局转换规则数据
      await importGlobalConversionRulesData(db);
      console.log('全局转换规则数据导入完成');

      // 获取导入后的统计信息
      const stats = {};
      const tables = ['categories', 'suppliers', 'units', 'global_conversion_rules', 'warehouses'];

      for (const table of tables) {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
          stats[table] = count;
        } catch (error) {
          stats[table] = 0;
        }
      }

      return successResult({
        message: 'Builtin data imported successfully',
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error importing builtin data:', error);
      return errorResult(`Failed to import builtin data: ${error.message}`);
    }
  }, 'import-builtin-data'));

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

  // 添加用户和客户相关的处理器
  addUserAndCustomerHandlers(ipcMain, db);

  console.log('System handlers registered successfully');
}

// 内置数据导入函数

/**
 * 导入单位数据
 */
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
  console.log(`导入了 ${units.length} 个单位数据`);
}

/**
 * 导入分类数据
 */
async function importCategoriesData(db) {
  const categories = [
    { id: 'cat-001', name: '电子产品', description: '电子设备和配件', parentId: null, isActive: true },
    { id: 'cat-002', name: '手机', description: '智能手机和配件', parentId: 'cat-001', isActive: true },
    { id: 'cat-003', name: '电脑', description: '台式机和笔记本电脑', parentId: 'cat-001', isActive: true },
    { id: 'cat-004', name: '家用电器', description: '家庭电器设备', parentId: null, isActive: true },
    { id: 'cat-005', name: '厨房电器', description: '厨房用电器', parentId: 'cat-004', isActive: true },
    { id: 'cat-006', name: '清洁电器', description: '清洁用电器', parentId: 'cat-004', isActive: true },
    { id: 'cat-007', name: '服装鞋帽', description: '服装和鞋帽类商品', parentId: null, isActive: true },
    { id: 'cat-008', name: '男装', description: '男性服装', parentId: 'cat-007', isActive: true },
    { id: 'cat-009', name: '女装', description: '女性服装', parentId: 'cat-007', isActive: true },
    { id: 'cat-010', name: '食品饮料', description: '食品和饮料类商品', parentId: null, isActive: true }
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
  console.log(`导入了 ${categories.length} 个分类数据`);
}

/**
 * 导入供应商数据
 */
async function importSuppliersData(db) {
  const suppliers = [
    { id: 'sup-001', name: '华为技术有限公司', contactPerson: '张经理', phone: '010-12345678', email: 'zhang@huawei.com', address: '深圳市龙岗区', isActive: true },
    { id: 'sup-002', name: '小米科技有限公司', contactPerson: '李经理', phone: '010-87654321', email: 'li@xiaomi.com', address: '北京市海淀区', isActive: true },
    { id: 'sup-003', name: '美的集团股份有限公司', contactPerson: '王经理', phone: '0757-12345678', email: 'wang@midea.com', address: '佛山市顺德区', isActive: true },
    { id: 'sup-004', name: '海尔智家股份有限公司', contactPerson: '赵经理', phone: '0532-87654321', email: 'zhao@haier.com', address: '青岛市崂山区', isActive: true },
    { id: 'sup-005', name: '格力电器股份有限公司', contactPerson: '刘经理', phone: '0756-12345678', email: 'liu@gree.com', address: '珠海市香洲区', isActive: true }
  ];

  const stmt = db.prepare(`
    INSERT INTO suppliers (id, name, contact_person, phone, email, address, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((suppliers) => {
    for (const supplier of suppliers) {
      stmt.run(supplier.id, supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address);
    }
  });

  insertMany(suppliers);
  console.log(`导入了 ${suppliers.length} 个供应商数据`);
}

/**
 * 导入仓库数据
 */
async function importWarehousesData(db) {
  const warehouses = [
    { id: 'wh-001', code: 'WH001', name: '主仓库', address: '北京市朝阳区工业园区A座', manager: '张经理', phone: '010-12345678', isDefault: true },
    { id: 'wh-002', code: 'WH002', name: '分仓库A', address: '上海市浦东新区物流园B区', manager: '李经理', phone: '021-87654321', isDefault: false },
    { id: 'wh-003', code: 'WH003', name: '分仓库B', address: '广州市天河区仓储中心C栋', manager: '王经理', phone: '020-11223344', isDefault: false },
    { id: 'wh-004', code: 'WH004', name: '临时仓库', address: '深圳市南山区临时存储点', manager: '赵经理', phone: '0755-88776655', isDefault: false }
  ];

  const stmt = db.prepare(`
    INSERT INTO warehouses (id, code, name, address, manager, phone, is_default, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((warehouses) => {
    for (const warehouse of warehouses) {
      stmt.run(warehouse.id, warehouse.code, warehouse.name, warehouse.address, warehouse.manager, warehouse.phone, warehouse.isDefault ? 1 : 0);
    }
  });

  insertMany(warehouses);
  console.log(`导入了 ${warehouses.length} 个仓库数据`);
}

/**
 * 导入全局转换规则数据
 */
async function importGlobalConversionRulesData(db) {
  const conversionRules = [
    // 数量转换
    { id: 'rule-001', name: '打到个转换', fromUnitId: 'unit-011', toUnitId: 'unit-001', conversionRate: 12, category: 'quantity', description: '1打=12个' },
    { id: 'rule-002', name: '对到个转换', fromUnitId: 'unit-012', toUnitId: 'unit-001', conversionRate: 2, category: 'quantity', description: '1对=2个' },
    { id: 'rule-003', name: '箱到个转换', fromUnitId: 'unit-005', toUnitId: 'unit-001', conversionRate: 24, category: 'quantity', description: '1箱=24个' },
    { id: 'rule-004', name: '包到个转换', fromUnitId: 'unit-004', toUnitId: 'unit-001', conversionRate: 12, category: 'quantity', description: '1包=12个' },

    // 重量转换
    { id: 'rule-005', name: '千克到克转换', fromUnitId: 'unit-014', toUnitId: 'unit-013', conversionRate: 1000, category: 'weight', description: '1千克=1000克' },
    { id: 'rule-006', name: '吨到千克转换', fromUnitId: 'unit-015', toUnitId: 'unit-014', conversionRate: 1000, category: 'weight', description: '1吨=1000千克' },
    { id: 'rule-007', name: '磅到克转换', fromUnitId: 'unit-016', toUnitId: 'unit-013', conversionRate: 453.592, category: 'weight', description: '1磅=453.592克' },
    { id: 'rule-008', name: '斤到克转换', fromUnitId: 'unit-018', toUnitId: 'unit-013', conversionRate: 500, category: 'weight', description: '1斤=500克' },
    { id: 'rule-009', name: '两到克转换', fromUnitId: 'unit-017', toUnitId: 'unit-013', conversionRate: 50, category: 'weight', description: '1两=50克' },

    // 长度转换
    { id: 'rule-010', name: '米到厘米转换', fromUnitId: 'unit-020', toUnitId: 'unit-019', conversionRate: 100, category: 'length', description: '1米=100厘米' },
    { id: 'rule-011', name: '厘米到毫米转换', fromUnitId: 'unit-019', toUnitId: 'unit-021', conversionRate: 10, category: 'length', description: '1厘米=10毫米' },
    { id: 'rule-012', name: '分米到厘米转换', fromUnitId: 'unit-024', toUnitId: 'unit-019', conversionRate: 10, category: 'length', description: '1分米=10厘米' },
    { id: 'rule-013', name: '公里到米转换', fromUnitId: 'unit-025', toUnitId: 'unit-020', conversionRate: 1000, category: 'length', description: '1公里=1000米' },
    { id: 'rule-014', name: '英寸到厘米转换', fromUnitId: 'unit-022', toUnitId: 'unit-019', conversionRate: 2.54, category: 'length', description: '1英寸=2.54厘米' },
    { id: 'rule-015', name: '英尺到英寸转换', fromUnitId: 'unit-023', toUnitId: 'unit-022', conversionRate: 12, category: 'length', description: '1英尺=12英寸' },
    { id: 'rule-016', name: '码到英尺转换', fromUnitId: 'unit-026', toUnitId: 'unit-023', conversionRate: 3, category: 'length', description: '1码=3英尺' },

    // 体积转换
    { id: 'rule-017', name: '升到毫升转换', fromUnitId: 'unit-028', toUnitId: 'unit-027', conversionRate: 1000, category: 'volume', description: '1升=1000毫升' },
    { id: 'rule-018', name: '立方厘米到毫升转换', fromUnitId: 'unit-029', toUnitId: 'unit-027', conversionRate: 1, category: 'volume', description: '1立方厘米=1毫升' },
    { id: 'rule-019', name: '立方米到升转换', fromUnitId: 'unit-030', toUnitId: 'unit-028', conversionRate: 1000, category: 'volume', description: '1立方米=1000升' },
    { id: 'rule-020', name: '加仑到升转换', fromUnitId: 'unit-031', toUnitId: 'unit-028', conversionRate: 3.78541, category: 'volume', description: '1加仑=3.78541升' },

    // 面积转换
    { id: 'rule-021', name: '平方米到平方厘米转换', fromUnitId: 'unit-033', toUnitId: 'unit-032', conversionRate: 10000, category: 'area', description: '1平方米=10000平方厘米' },
    { id: 'rule-022', name: '平方英寸到平方厘米转换', fromUnitId: 'unit-034', toUnitId: 'unit-032', conversionRate: 6.4516, category: 'area', description: '1平方英寸=6.4516平方厘米' },
    { id: 'rule-023', name: '平方英尺到平方英寸转换', fromUnitId: 'unit-035', toUnitId: 'unit-034', conversionRate: 144, category: 'area', description: '1平方英尺=144平方英寸' },

    // 时间转换
    { id: 'rule-024', name: '分钟到秒转换', fromUnitId: 'unit-037', toUnitId: 'unit-036', conversionRate: 60, category: 'time', description: '1分钟=60秒' },
    { id: 'rule-025', name: '小时到分钟转换', fromUnitId: 'unit-038', toUnitId: 'unit-037', conversionRate: 60, category: 'time', description: '1小时=60分钟' },
    { id: 'rule-026', name: '天到小时转换', fromUnitId: 'unit-039', toUnitId: 'unit-038', conversionRate: 24, category: 'time', description: '1天=24小时' },
    { id: 'rule-027', name: '月到天转换', fromUnitId: 'unit-040', toUnitId: 'unit-039', conversionRate: 30, category: 'time', description: '1月=30天' },
    { id: 'rule-028', name: '年到月转换', fromUnitId: 'unit-041', toUnitId: 'unit-040', conversionRate: 12, category: 'time', description: '1年=12月' }
  ];

  const stmt = db.prepare(`
    INSERT INTO global_conversion_rules (id, name, from_unit_id, to_unit_id, conversion_rate, category, description, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  const insertMany = db.transaction((rules) => {
    for (const rule of rules) {
      stmt.run(rule.id, rule.name, rule.fromUnitId, rule.toUnitId, rule.conversionRate, rule.category, rule.description);
    }
  });

  insertMany(conversionRules);
  console.log(`导入了 ${conversionRules.length} 个转换规则数据`);
}

// 添加用户和客户相关的处理器
function addUserAndCustomerHandlers(ipcMain, db) {
  // 获取所有用户
  ipcMain.handle('db-get-all-users', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const query = `
      SELECT
        id, username, nickname, email, phone, avatar, role, status,
        last_login_at as lastLoginAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM users
      ORDER BY created_at DESC
    `;
    const stmt = db.prepare(query);
    const rows = stmt.all();

    const users = rows.map(row => ({
      ...row,
      lastLoginAt: row.lastLoginAt ? new Date(row.lastLoginAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    return successResult(users);
  }, 'get-all-users'));

  // 获取所有客户
  ipcMain.handle('db-get-all-customers', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const query = `
      SELECT
        id, code, name, contact_person as contactPerson, phone, email, address,
        customer_type as customerType, credit_limit as creditLimit,
        payment_terms as paymentTerms, discount_rate as discountRate,
        level, status,
        created_at as createdAt,
        updated_at as updatedAt
      FROM customers
      ORDER BY name ASC
    `;
    const stmt = db.prepare(query);
    const rows = stmt.all();

    const customers = rows.map(row => ({
      ...row,
      creditLimit: parseFloat(row.creditLimit) || 0,
      discountRate: parseFloat(row.discountRate) || 0,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt)
    }));

    return successResult(customers);
  }, 'get-all-customers'));

  // 创建用户
  ipcMain.handle('db-create-user', wrapIpcHandler(async (event, userData) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields(userData, ['username', 'nickname', 'role', 'password']);

    const id = generateId();
    const timestamp = getCurrentTimestamp();

    const stmt = db.prepare(`
      INSERT INTO users (
        id, username, password, nickname, email, phone, avatar, role, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userData.username,
      userData.password, // 应该已经加密
      userData.nickname,
      userData.email || null,
      userData.phone || null,
      userData.avatar || null,
      userData.role,
      userData.status || 'active',
      timestamp,
      timestamp
    );

    return successResult({ id, ...userData, createdAt: timestamp, updatedAt: timestamp });
  }, 'create-user'));

  // 财务相关的占位符处理器（返回空数组，避免错误）
  ipcMain.handle('db-get-accounts-receivable', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    // 暂时返回空数组，避免服务初始化失败
    return successResult([]);
  }, 'get-accounts-receivable'));

  ipcMain.handle('db-get-accounts-payable', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    // 暂时返回空数组，避免服务初始化失败
    return successResult([]);
  }, 'get-accounts-payable'));

  ipcMain.handle('db-get-payment-records', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    // 暂时返回空数组，避免服务初始化失败
    return successResult([]);
  }, 'get-payment-records'));

  // 库存相关的占位符处理器
  ipcMain.handle('db-get-all-inventory-stocks', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    // 暂时返回空数组，避免服务初始化失败
    return successResult([]);
  }, 'get-all-inventory-stocks'));
}

module.exports = {
  setupSystemHandlers
};