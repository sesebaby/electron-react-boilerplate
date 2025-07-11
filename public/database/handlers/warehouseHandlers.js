/**
 * 仓库管理处理器
 * 负责仓库的 CRUD 操作和相关业务逻辑
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
 * 仓库字段映射表
 */
const WAREHOUSE_FIELD_MAP = {
  is_default: 'isDefault',
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt'
};

/**
 * 仓库查询基础SQL
 */
const WAREHOUSE_BASE_QUERY = `
  SELECT
    id, code, name, address, manager, phone,
    is_default as isDefault,
    is_active as isActive,
    created_at as createdAt,
    updated_at as updatedAt
  FROM warehouses
`;

/**
 * 设置仓库相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupWarehouseHandlers(ipcMain, db) {
  
  // 获取所有仓库
  ipcMain.handle('db-get-all-warehouses', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${WAREHOUSE_BASE_QUERY} ORDER BY name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();

    const warehouses = transformRows(rows, WAREHOUSE_FIELD_MAP);
    return successResult(warehouses);
  }, 'get-all-warehouses'));

  // 根据ID获取仓库
  ipcMain.handle('db-get-warehouse-by-id', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${WAREHOUSE_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      return successResult(null);
    }
    
    const warehouse = transformRow(row, WAREHOUSE_FIELD_MAP);
    return successResult(warehouse);
  }, 'get-warehouse-by-id'));

  // 根据代码获取仓库
  ipcMain.handle('db-get-warehouse-by-code', wrapIpcHandler(async (event, code) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ code }, ['code']);
    
    const query = `${WAREHOUSE_BASE_QUERY} WHERE code = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(code);
    
    if (!row) {
      return successResult(null);
    }
    
    const warehouse = transformRow(row, WAREHOUSE_FIELD_MAP);
    return successResult(warehouse);
  }, 'get-warehouse-by-code'));

  // 获取默认仓库
  ipcMain.handle('db-get-default-warehouse', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${WAREHOUSE_BASE_QUERY} WHERE is_default = 1 LIMIT 1`;
    const stmt = db.prepare(query);
    const row = stmt.get();
    
    if (!row) {
      return successResult(null);
    }
    
    const warehouse = transformRow(row, WAREHOUSE_FIELD_MAP);
    return successResult(warehouse);
  }, 'get-default-warehouse'));

  // 创建仓库
  ipcMain.handle('db-create-warehouse', wrapIpcHandler(async (event, warehouse) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(warehouse, ['code', 'name']);
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    // 如果设置为默认仓库，先清除其他默认仓库
    if (warehouse.isDefault) {
      const clearDefaultStmt = db.prepare('UPDATE warehouses SET is_default = 0 WHERE is_default = 1');
      clearDefaultStmt.run();
    }
    
    const query = `
      INSERT INTO warehouses (
        id, code, name, address, manager, phone, is_default, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stmt = db.prepare(query);
    stmt.run(
      id,
      warehouse.code,
      warehouse.name,
      warehouse.address || '',
      warehouse.manager || '',
      warehouse.phone || '',
      warehouse.isDefault ? 1 : 0,
      warehouse.isActive !== undefined ? (warehouse.isActive ? 1 : 0) : 1, // 默认为激活状态
      now,
      now
    );
    
    // 获取创建的仓库
    const getQuery = `${WAREHOUSE_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdWarehouse = transformRow(row, WAREHOUSE_FIELD_MAP);
    return successResult(createdWarehouse);
  }, 'create-warehouse'));

  // 更新仓库
  ipcMain.handle('db-update-warehouse', wrapIpcHandler(async (event, id, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // 如果设置为默认仓库，先清除其他默认仓库
    if (updates.isDefault === true) {
      const clearDefaultStmt = db.prepare('UPDATE warehouses SET is_default = 0 WHERE is_default = 1 AND id != ?');
      clearDefaultStmt.run(id);
    }
    
    const { query, params } = buildUpdateQuery('warehouses', updates, WAREHOUSE_FIELD_MAP);
    params.push(id); // 添加WHERE条件的参数
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Warehouse not found');
    }
    
    // 获取更新后的仓库
    const getQuery = `${WAREHOUSE_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const updatedWarehouse = transformRow(row, WAREHOUSE_FIELD_MAP);
    return successResult(updatedWarehouse);
  }, 'update-warehouse'));

  // 删除仓库
  ipcMain.handle('db-delete-warehouse', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    // 检查是否为默认仓库
    const checkQuery = 'SELECT is_default FROM warehouses WHERE id = ?';
    const checkStmt = db.prepare(checkQuery);
    const warehouse = checkStmt.get(id);
    
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }
    
    if (warehouse.is_default) {
      throw new Error('Cannot delete default warehouse');
    }
    
    // 检查是否有关联的库存记录
    const inventoryCheckStmt = db.prepare('SELECT COUNT(*) as count FROM inventory_items WHERE location = (SELECT code FROM warehouses WHERE id = ?)');
    const inventoryCheck = inventoryCheckStmt.get(id);
    
    if (inventoryCheck.count > 0) {
      throw new Error('Cannot delete warehouse with existing inventory items');
    }
    
    const stmt = db.prepare('DELETE FROM warehouses WHERE id = ?');
    const result = stmt.run(id);
    
    return successResult(result.changes > 0);
  }, 'delete-warehouse'));

  // 搜索仓库
  ipcMain.handle('db-search-warehouses', wrapIpcHandler(async (event, searchTerm) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return successResult([]);
    }
    
    const query = `
      ${WAREHOUSE_BASE_QUERY} 
      WHERE name LIKE ? OR code LIKE ? OR address LIKE ? OR manager LIKE ?
      ORDER BY name ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(query);
    const rows = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern);
    
    const warehouses = transformRows(rows, WAREHOUSE_FIELD_MAP);
    return successResult(warehouses);
  }, 'search-warehouses'));

  // 设置默认仓库
  ipcMain.handle('db-set-default-warehouse', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    // 使用事务确保原子性
    const transaction = db.transaction(() => {
      // 清除所有默认设置
      const clearStmt = db.prepare('UPDATE warehouses SET is_default = 0');
      clearStmt.run();
      
      // 设置新的默认仓库
      const setStmt = db.prepare('UPDATE warehouses SET is_default = 1 WHERE id = ?');
      const result = setStmt.run(id);
      
      if (result.changes === 0) {
        throw new Error('Warehouse not found');
      }
    });
    
    transaction();
    return successResult(true);
  }, 'set-default-warehouse'));

  // 获取仓库统计信息
  ipcMain.handle('db-get-warehouse-stats', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalWarehouses,
        COUNT(CASE WHEN is_default = 1 THEN 1 END) as defaultWarehouses,
        COUNT(CASE WHEN manager IS NOT NULL AND manager != '' THEN 1 END) as warehousesWithManagers
      FROM warehouses
    `;
    
    const stmt = db.prepare(statsQuery);
    const stats = stmt.get();
    
    // 获取每个仓库的库存物品数量
    const inventoryQuery = `
      SELECT 
        w.code,
        w.name,
        COUNT(i.id) as itemCount,
        SUM(i.stock_quantity) as totalStock
      FROM warehouses w
      LEFT JOIN inventory_items i ON i.location = w.code
      GROUP BY w.id, w.code, w.name
      ORDER BY w.name
    `;
    
    const inventoryStmt = db.prepare(inventoryQuery);
    const warehouseInventory = inventoryStmt.all();
    
    return successResult({
      totalWarehouses: stats.totalWarehouses || 0,
      defaultWarehouses: stats.defaultWarehouses || 0,
      warehousesWithManagers: stats.warehousesWithManagers || 0,
      warehouseInventory: warehouseInventory || []
    });
  }, 'get-warehouse-stats'));

  // 获取仓库库存概况
  ipcMain.handle('db-get-warehouse-inventory-summary', wrapIpcHandler(async (event, warehouseId) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ warehouseId }, ['warehouseId']);
    
    // 获取仓库信息
    const warehouseQuery = `${WAREHOUSE_BASE_QUERY} WHERE id = ?`;
    const warehouseStmt = db.prepare(warehouseQuery);
    const warehouse = warehouseStmt.get(warehouseId);
    
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }
    
    // 获取该仓库的库存统计
    const inventoryQuery = `
      SELECT 
        COUNT(*) as totalItems,
        SUM(stock_quantity) as totalStock,
        SUM(total_value) as totalValue,
        COUNT(CASE WHEN stock_quantity <= reorder_level AND reorder_level > 0 THEN 1 END) as lowStockItems,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as outOfStockItems
      FROM inventory_items
      WHERE location = ?
    `;
    
    const inventoryStmt = db.prepare(inventoryQuery);
    const inventory = inventoryStmt.get(warehouse.code);
    
    const result = {
      warehouse: transformRow(warehouse, WAREHOUSE_FIELD_MAP),
      summary: {
        totalItems: inventory.totalItems || 0,
        totalStock: inventory.totalStock || 0,
        totalValue: inventory.totalValue || 0,
        lowStockItems: inventory.lowStockItems || 0,
        outOfStockItems: inventory.outOfStockItems || 0
      }
    };
    
    return successResult(result);
  }, 'get-warehouse-inventory-summary'));

  console.log('Warehouse handlers registered successfully');
}

module.exports = {
  setupWarehouseHandlers
};