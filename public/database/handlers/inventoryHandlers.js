/**
 * 库存物品管理处理器
 * 负责库存物品的 CRUD 操作和相关业务逻辑
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
 * 库存物品字段映射表
 */
const INVENTORY_FIELD_MAP = {
  stock_quantity: 'stockQuantity',
  reserved_quantity: 'reservedQuantity', 
  unit_price: 'unitPrice',
  total_value: 'totalValue',
  last_updated: 'lastUpdated',
  reorder_level: 'reorderLevel',
  max_stock: 'maxStock',
  created_at: 'createdAt',
  updated_at: 'updatedAt'
};

/**
 * 库存物品查询基础SQL
 */
const INVENTORY_BASE_QUERY = `
  SELECT 
    id, name, description, sku, category, supplier,
    stock_quantity as stockQuantity,
    reserved_quantity as reservedQuantity,
    unit_price as unitPrice,
    total_value as totalValue,
    last_updated as lastUpdated,
    status, location,
    reorder_level as reorderLevel,
    max_stock as maxStock,
    created_at as createdAt,
    updated_at as updatedAt
  FROM inventory_items
`;

/**
 * 设置库存物品相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupInventoryHandlers(ipcMain, db) {
  
  // 获取所有库存物品
  ipcMain.handle('db-get-all-items', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${INVENTORY_BASE_QUERY} ORDER BY name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const items = transformRows(rows, INVENTORY_FIELD_MAP);
    return successResult(items);
  }, 'get-all-items'));

  // 根据ID获取库存物品
  ipcMain.handle('db-get-item-by-id', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${INVENTORY_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      return successResult(null);
    }
    
    const item = transformRow(row, INVENTORY_FIELD_MAP);
    return successResult(item);
  }, 'get-item-by-id'));

  // 根据SKU获取库存物品
  ipcMain.handle('db-get-item-by-sku', wrapIpcHandler(async (event, sku) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ sku }, ['sku']);
    
    const query = `${INVENTORY_BASE_QUERY} WHERE sku = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(sku);
    
    if (!row) {
      return successResult(null);
    }
    
    const item = transformRow(row, INVENTORY_FIELD_MAP);
    return successResult(item);
  }, 'get-item-by-sku'));

  // 创建库存物品
  ipcMain.handle('db-create-item', wrapIpcHandler(async (event, item) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(item, ['name', 'sku', 'category']);
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const query = `
      INSERT INTO inventory_items (
        id, name, description, sku, category, supplier,
        stock_quantity, reserved_quantity, unit_price, total_value,
        status, location, reorder_level, max_stock, 
        last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = db.prepare(query);
    stmt.run(
      id, 
      item.name, 
      item.description || '', 
      item.sku, 
      item.category, 
      item.supplier || '',
      item.stockQuantity || 0, 
      item.reservedQuantity || 0, 
      item.unitPrice || 0, 
      item.totalValue || 0,
      item.status || 'in-stock', 
      item.location || '', 
      item.reorderLevel || 0, 
      item.maxStock || 0, 
      now, now, now
    );
    
    // 获取创建的物品
    const getQuery = `${INVENTORY_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdItem = transformRow(row, INVENTORY_FIELD_MAP);
    return successResult(createdItem);
  }, 'create-item'));

  // 更新库存物品
  ipcMain.handle('db-update-item', wrapIpcHandler(async (event, id, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    const { query, params } = buildUpdateQuery('inventory_items', updates, INVENTORY_FIELD_MAP);
    params.push(id); // 添加WHERE条件的参数
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Item not found');
    }
    
    // 获取更新后的物品
    const getQuery = `${INVENTORY_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const updatedItem = transformRow(row, INVENTORY_FIELD_MAP);
    return successResult(updatedItem);
  }, 'update-item'));

  // 删除库存物品
  ipcMain.handle('db-delete-item', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const stmt = db.prepare('DELETE FROM inventory_items WHERE id = ?');
    const result = stmt.run(id);
    
    return successResult(result.changes > 0);
  }, 'delete-item'));

  // 搜索库存物品
  ipcMain.handle('db-search-items', wrapIpcHandler(async (event, searchTerm) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return successResult([]);
    }
    
    const query = `
      ${INVENTORY_BASE_QUERY} 
      WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
      ORDER BY name ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(query);
    const rows = stmt.all(searchPattern, searchPattern, searchPattern);
    
    const items = transformRows(rows, INVENTORY_FIELD_MAP);
    return successResult(items);
  }, 'search-items'));

  // 根据分类获取库存物品
  ipcMain.handle('db-get-items-by-category', wrapIpcHandler(async (event, category) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ category }, ['category']);
    
    const query = `${INVENTORY_BASE_QUERY} WHERE category = ? ORDER BY name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all(category);
    
    const items = transformRows(rows, INVENTORY_FIELD_MAP);
    return successResult(items);
  }, 'get-items-by-category'));

  // 获取低库存物品
  ipcMain.handle('db-get-low-stock-items', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `
      ${INVENTORY_BASE_QUERY} 
      WHERE stock_quantity <= reorder_level AND reorder_level > 0
      ORDER BY stock_quantity ASC
    `;
    
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const items = transformRows(rows, INVENTORY_FIELD_MAP);
    return successResult(items);
  }, 'get-low-stock-items'));

  // 获取库存分类列表
  ipcMain.handle('db-get-categories', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const stmt = db.prepare('SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category != "" ORDER BY category');
    const rows = stmt.all();
    const categories = rows.map(row => row.category);
    
    return successResult(categories);
  }, 'get-categories'));

  // 获取供应商列表
  ipcMain.handle('db-get-suppliers', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const stmt = db.prepare('SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL AND supplier != "" ORDER BY supplier');
    const rows = stmt.all();
    const suppliers = rows.map(row => row.supplier);
    
    return successResult(suppliers);
  }, 'get-suppliers'));

  // 批量更新库存数量
  ipcMain.handle('db-batch-update-stock', wrapIpcHandler(async (event, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Invalid updates array');
    }
    
    const updateStmt = db.prepare(`
      UPDATE inventory_items 
      SET stock_quantity = ?, total_value = ?, last_updated = ?
      WHERE id = ?
    `);
    
    const now = getCurrentTimestamp();
    const transaction = db.transaction(() => {
      for (const update of updates) {
        validateRequiredFields(update, ['id', 'stockQuantity']);
        const totalValue = (update.stockQuantity || 0) * (update.unitPrice || 0);
        updateStmt.run(update.stockQuantity, totalValue, now, update.id);
      }
    });
    
    transaction();
    return successResult(true);
  }, 'batch-update-stock'));

  // 获取库存统计信息
  ipcMain.handle('db-get-inventory-stats', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalItems,
        SUM(stock_quantity) as totalStock,
        SUM(total_value) as totalValue,
        COUNT(CASE WHEN stock_quantity <= reorder_level AND reorder_level > 0 THEN 1 END) as lowStockItems,
        COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as outOfStockItems,
        COUNT(DISTINCT category) as totalCategories,
        COUNT(DISTINCT supplier) as totalSuppliers
      FROM inventory_items
    `;
    
    const stmt = db.prepare(statsQuery);
    const stats = stmt.get();
    
    return successResult({
      totalItems: stats.totalItems || 0,
      totalStock: stats.totalStock || 0,
      totalValue: stats.totalValue || 0,
      lowStockItems: stats.lowStockItems || 0,
      outOfStockItems: stats.outOfStockItems || 0,
      totalCategories: stats.totalCategories || 0,
      totalSuppliers: stats.totalSuppliers || 0
    });
  }, 'get-inventory-stats'));

  console.log('Inventory handlers registered successfully');
}

module.exports = {
  setupInventoryHandlers
};