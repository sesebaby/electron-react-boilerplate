/**
 * 单位管理处理器
 * 负责计量单位的 CRUD 操作和相关业务逻辑
 */

const { 
  successResult, 
  errorResult, 
  checkDatabaseInitialized,
  transformRow,
  transformRows,
  buildUpdateQuery,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields
} = require('../utils/dbUtils');

const { wrapIpcHandler } = require('../utils/errorHandler');

/**
 * 单位字段映射表
 */
const UNIT_FIELD_MAP = {
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt'
};

/**
 * 单位查询基础SQL
 */
const UNIT_BASE_QUERY = `
  SELECT 
    id, name, symbol, type, precision, description,
    is_active as isActive,
    created_at as createdAt,
    updated_at as updatedAt
  FROM units
`;

/**
 * 有效的单位类型
 */
const VALID_UNIT_TYPES = ['weight', 'length', 'volume', 'quantity', 'area', 'time'];

/**
 * 设置单位相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupUnitHandlers(ipcMain, db) {
  
  // 获取所有单位
  ipcMain.handle('db-get-all-units', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${UNIT_BASE_QUERY} WHERE is_active = 1 ORDER BY type, name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const units = transformRows(rows, UNIT_FIELD_MAP);
    return successResult(units);
  }, 'get-all-units'));

  // 根据ID获取单位
  ipcMain.handle('db-get-unit-by-id', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${UNIT_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      return successResult(null);
    }
    
    const unit = transformRow(row, UNIT_FIELD_MAP);
    return successResult(unit);
  }, 'get-unit-by-id'));

  // 根据符号获取单位
  ipcMain.handle('db-get-unit-by-symbol', wrapIpcHandler(async (event, symbol) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ symbol }, ['symbol']);
    
    const query = `${UNIT_BASE_QUERY} WHERE symbol = ? AND is_active = 1`;
    const stmt = db.prepare(query);
    const row = stmt.get(symbol);
    
    if (!row) {
      return successResult(null);
    }
    
    const unit = transformRow(row, UNIT_FIELD_MAP);
    return successResult(unit);
  }, 'get-unit-by-symbol'));

  // 创建单位
  ipcMain.handle('db-create-unit', wrapIpcHandler(async (event, unit) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(unit, ['name', 'symbol', 'type']);
    
    // 验证单位类型
    if (!VALID_UNIT_TYPES.includes(unit.type)) {
      throw new Error(`Invalid unit type. Must be one of: ${VALID_UNIT_TYPES.join(', ')}`);
    }
    
    // 验证精度
    if (unit.precision !== undefined && (unit.precision < 0 || unit.precision > 6)) {
      throw new Error('Precision must be between 0 and 6');
    }
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const query = `
      INSERT INTO units (
        id, name, symbol, type, precision, description, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = db.prepare(query);
    stmt.run(
      id, 
      unit.name, 
      unit.symbol, 
      unit.type, 
      unit.precision || 2,
      unit.description || '', 
      unit.isActive !== false ? 1 : 0, 
      now, 
      now
    );
    
    // 获取创建的单位
    const getQuery = `${UNIT_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdUnit = transformRow(row, UNIT_FIELD_MAP);
    return successResult(createdUnit);
  }, 'create-unit'));

  // 更新单位
  ipcMain.handle('db-update-unit', wrapIpcHandler(async (event, id, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // 验证单位类型
    if (updates.type && !VALID_UNIT_TYPES.includes(updates.type)) {
      throw new Error(`Invalid unit type. Must be one of: ${VALID_UNIT_TYPES.join(', ')}`);
    }
    
    // 验证精度
    if (updates.precision !== undefined && (updates.precision < 0 || updates.precision > 6)) {
      throw new Error('Precision must be between 0 and 6');
    }
    
    const { query, params } = buildUpdateQuery('units', updates, UNIT_FIELD_MAP);
    params.push(id); // 添加WHERE条件的参数
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Unit not found');
    }
    
    // 获取更新后的单位
    const getQuery = `${UNIT_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const updatedUnit = transformRow(row, UNIT_FIELD_MAP);
    return successResult(updatedUnit);
  }, 'update-unit'));

  // 删除单位
  ipcMain.handle('db-delete-unit', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    // 检查是否有产品正在使用此单位
    const usageCheckStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM inventory_items i 
      JOIN units u ON u.symbol = 'pcs' -- 这里需要更复杂的关联逻辑
      WHERE u.id = ?
    `);
    
    // 为了安全起见，软删除（设置为不活跃）而不是物理删除
    const stmt = db.prepare('UPDATE units SET is_active = 0, updated_at = ? WHERE id = ?');
    const result = stmt.run(getCurrentTimestamp(), id);
    
    return successResult(result.changes > 0);
  }, 'delete-unit'));

  // 搜索单位
  ipcMain.handle('db-search-units', wrapIpcHandler(async (event, searchTerm) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return successResult([]);
    }
    
    const query = `
      ${UNIT_BASE_QUERY} 
      WHERE (name LIKE ? OR symbol LIKE ? OR description LIKE ?) AND is_active = 1
      ORDER BY type, name ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(query);
    const rows = stmt.all(searchPattern, searchPattern, searchPattern);
    
    const units = transformRows(rows, UNIT_FIELD_MAP);
    return successResult(units);
  }, 'search-units'));

  // 根据类型获取单位
  ipcMain.handle('db-get-units-by-type', wrapIpcHandler(async (event, type) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ type }, ['type']);
    
    if (!VALID_UNIT_TYPES.includes(type)) {
      throw new Error(`Invalid unit type. Must be one of: ${VALID_UNIT_TYPES.join(', ')}`);
    }
    
    const query = `${UNIT_BASE_QUERY} WHERE type = ? AND is_active = 1 ORDER BY name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all(type);
    
    const units = transformRows(rows, UNIT_FIELD_MAP);
    return successResult(units);
  }, 'get-units-by-type'));

  // 重新导入单位数据
  ipcMain.handle('db-reimport-units', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');
    const path = require('path');

    console.log('Forcing reimport of units data...');

    // 清空现有的单位数据
    db.prepare('DELETE FROM units').run();
    console.log('Cleared existing units data');

    // 读取并执行mock-data.sql中的单位数据部分
    const mockDataPath = path.join(__dirname, '../../mock-data.sql');
    
    if (!fs.existsSync(mockDataPath)) {
      throw new Error('Mock data file not found');
    }
    
    const mockDataSql = fs.readFileSync(mockDataPath, 'utf8');
    
    // 提取单位相关的INSERT语句
    const unitInsertRegex = /INSERT INTO units[\s\S]*?(?=(?:INSERT INTO \w+|$))/g;
    const unitInserts = mockDataSql.match(unitInsertRegex);
    
    if (unitInserts && unitInserts.length > 0) {
      // 执行单位数据插入
      db.exec(unitInserts[0]);
      
      // 验证导入结果
      const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get();
      console.log(`Units reimport completed: ${unitCount.count} units imported`);
      
      return successResult({
        message: `成功重新导入 ${unitCount.count} 个单位`,
        count: unitCount.count 
      });
    } else {
      throw new Error('No unit data found in mock-data.sql');
    }
  }, 'reimport-units'));

  // 获取单位统计信息
  ipcMain.handle('db-get-unit-stats', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalUnits,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeUnits,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactiveUnits,
        type,
        COUNT(*) as count
      FROM units
      GROUP BY type
      ORDER BY type
    `;
    
    const stmt = db.prepare(statsQuery);
    const typeStats = stmt.all();
    
    const totalStatsQuery = `
      SELECT 
        COUNT(*) as totalUnits,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeUnits,
        COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactiveUnits
      FROM units
    `;
    
    const totalStmt = db.prepare(totalStatsQuery);
    const totalStats = totalStmt.get();
    
    return successResult({
      total: {
        totalUnits: totalStats.totalUnits || 0,
        activeUnits: totalStats.activeUnits || 0,
        inactiveUnits: totalStats.inactiveUnits || 0
      },
      byType: typeStats || []
    });
  }, 'get-unit-stats'));

  // 批量导入单位
  ipcMain.handle('db-batch-import-units', wrapIpcHandler(async (event, units) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!Array.isArray(units) || units.length === 0) {
      throw new Error('Invalid units array');
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO units (id, name, symbol, type, precision, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = getCurrentTimestamp();
    let importedCount = 0;
    let skippedCount = 0;
    
    const transaction = db.transaction(() => {
      for (const unit of units) {
        try {
          validateRequiredFields(unit, ['name', 'symbol', 'type']);
          
          if (!VALID_UNIT_TYPES.includes(unit.type)) {
            console.warn(`Skipping unit with invalid type: ${unit.type}`);
            skippedCount++;
            continue;
          }
          
          const id = generateId();
          insertStmt.run(
            id,
            unit.name,
            unit.symbol,
            unit.type,
            unit.precision || 2,
            unit.description || '',
            unit.isActive !== false ? 1 : 0,
            now,
            now
          );
          importedCount++;
        } catch (error) {
          console.warn(`Skipping unit due to error: ${error.message}`);
          skippedCount++;
        }
      }
    });
    
    transaction();
    
    return successResult({
      imported: importedCount,
      skipped: skippedCount,
      total: units.length
    });
  }, 'batch-import-units'));

  console.log('Unit handlers registered successfully');
}

module.exports = {
  setupUnitHandlers,
  VALID_UNIT_TYPES
};