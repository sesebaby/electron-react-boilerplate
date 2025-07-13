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
  unit_price: 'salePrice',        // 修正：unit_price 对应销售价格
  total_value: 'totalValue',
  last_updated: 'lastUpdated',
  reorder_level: 'minStock',       // 修正：reorder_level 对应最小库存
  max_stock: 'maxStock',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  category: 'categoryId',          // 映射 category 到 categoryId
  supplier: 'supplierId',          // 新增：supplier 到 supplierId
  location: 'location',            // 新增：location 字段
  status: 'status',                // 新增：status 字段
  unit_id: 'unitId',               // 新增：unit_id 字段
  brand: 'brand',                  // 新增：brand 字段
  model: 'model',                  // 新增：model 字段
  barcode: 'barcode',              // 新增：barcode 字段
  purchase_price: 'purchasePrice', // 新增：purchase_price 字段
  is_active: 'isActive',           // 新增：is_active 字段
  images: 'images'                 // 新增：images 字段
};

/**
 * 库存物品查询基础SQL
 */
const INVENTORY_BASE_QUERY = `
  SELECT 
    id, name, description, sku, 
    category as categoryId,           -- 修正：映射为 categoryId
    supplier as supplierId,           -- 修正：映射为 supplierId
    unit_id as unitId,                -- 新增：unit_id 字段
    brand, model, barcode,            -- 新增：品牌、型号、条码字段
    stock_quantity as stockQuantity,
    reserved_quantity as reservedQuantity,
    unit_price as salePrice,          -- 修正：映射为 salePrice
    purchase_price as purchasePrice,  -- 新增：采购价格
    total_value as totalValue,
    last_updated as lastUpdated,
    status, location,
    reorder_level as minStock,        -- 修正：映射为 minStock
    max_stock as maxStock,
    is_active as isActive,            -- 新增：是否启用
    images,                           -- 新增：图片字段
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
    
    // 字段映射：前端发送的是 categoryId，数据库需要的是 category
    if (item.categoryId && !item.category) {
      item.category = item.categoryId;
    }
    
    validateRequiredFields(item, ['name', 'sku', 'category']);
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const query = `
      INSERT INTO inventory_items (
        id, name, description, sku, category, supplier, unit_id,
        brand, model, barcode,
        stock_quantity, reserved_quantity, unit_price, purchase_price, total_value,
        status, location, reorder_level, max_stock, 
        is_active, images,
        last_updated, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = db.prepare(query);
    stmt.run(
      id, 
      item.name, 
      item.description || '', 
      item.sku, 
      item.category || item.categoryId,              // 支持两种字段名
      item.supplier || item.supplierId || '',        // 支持两种字段名
      item.unitId || '',                              // 单位ID
      item.brand || '',                               // 品牌
      item.model || '',                               // 型号
      item.barcode || '',                             // 条码
      item.stockQuantity || 0, 
      item.reservedQuantity || 0, 
      item.unitPrice || item.salePrice || 0,         // 支持两种字段名
      item.purchasePrice || 0,                        // 采购价格
      item.totalValue || 0,
      item.status || 'in-stock', 
      item.location || '', 
      item.reorderLevel || item.minStock || 0,       // 支持两种字段名
      item.maxStock || 0, 
      item.isActive !== undefined ? item.isActive : true,  // 是否启用，默认true
      JSON.stringify(item.images || []),              // 图片数组转JSON
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
    
    // 字段映射：前端发送的是 categoryId，数据库需要的是 category
    if (updates.categoryId && !updates.category) {
      updates.category = updates.categoryId;
      delete updates.categoryId; // 删除categoryId避免buildUpdateQuery处理未知字段
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

    const stmt = db.prepare('SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category != \'\' ORDER BY category');
    const rows = stmt.all();
    const categories = rows.map(row => row.category);

    return successResult(categories);
  }, 'get-categories'));

  // 获取所有分类（从categories表）
  ipcMain.handle('db-get-all-categories', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const stmt = db.prepare(`
      SELECT 
        id, name, description, parent_id as parentId,
        level, sort_order as sortOrder, is_active as isActive,
        created_at as createdAt, updated_at as updatedAt
      FROM categories 
      ORDER BY sort_order, name
    `);
    const rows = stmt.all();
    
    // 转换布尔值
    const categories = rows.map(row => ({
      ...row,
      isActive: row.isActive === 1
    }));

    return successResult(categories);
  }, 'get-all-categories'));

  // 获取供应商列表
  ipcMain.handle('db-get-suppliers', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const stmt = db.prepare('SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL AND supplier != \'\' ORDER BY supplier');
    const rows = stmt.all();
    const suppliers = rows.map(row => row.supplier);

    return successResult(suppliers);
  }, 'get-suppliers'));

  // 获取所有供应商（别名，与 db-get-suppliers 相同）
  ipcMain.handle('db-get-all-suppliers', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const stmt = db.prepare('SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL AND supplier != \'\' ORDER BY supplier');
    const rows = stmt.all();
    const suppliers = rows.map(row => row.supplier);

    return successResult(suppliers);
  }, 'get-all-suppliers'));

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

  // ===== Category CRUD Operations =====
  
  // Create category
  ipcMain.handle('db-create-category', wrapIpcHandler(async (event, category) => {
    console.log('=== CREATE CATEGORY DEBUG ===');
    console.log('Received category data:', JSON.stringify(category, null, 2));
    
    if (!checkDatabaseInitialized(db)) {
      console.error('Database not initialized');
      return errorResult('Database not initialized');
    }
    
    try {
      validateRequiredFields(category, ['name']);
      console.log('Validation passed for category:', category.name);
      
      const id = generateId();
      const now = getCurrentTimestamp();
      
      console.log('Generated ID:', id);
      console.log('Timestamp:', now);
      
      const stmt = db.prepare(`
        INSERT INTO categories (id, name, description, parent_id, level, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertParams = [
        id,
        category.name,
        category.description || '',
        category.parentId || null,
        category.level || 1,
        category.sortOrder || 1,
        category.isActive !== undefined ? (category.isActive ? 1 : 0) : 1,
        now,
        now
      ];
      
      console.log('Insert parameters:', insertParams);
      
      const result = stmt.run(...insertParams);
      console.log('Database insert result:', result);
      
      const newCategory = {
        id,
        name: category.name,
        description: category.description || '',
        parentId: category.parentId || null,
        level: category.level || 1,
        sortOrder: category.sortOrder || 1,
        isActive: category.isActive !== undefined ? category.isActive : true,
        createdAt: now,
        updatedAt: now
      };
      
      console.log('Created category object:', JSON.stringify(newCategory, null, 2));
      console.log('=== END CREATE CATEGORY DEBUG ===');
      
      return successResult(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      console.log('=== END CREATE CATEGORY DEBUG (ERROR) ===');
      throw error;
    }
  }, 'create-category'));

  // Update category
  ipcMain.handle('db-update-category', wrapIpcHandler(async (event, id, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const fields = [];
    const params = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }
    
    if (updates.description !== undefined) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    
    if (updates.parentId !== undefined) {
      fields.push('parent_id = ?');
      params.push(updates.parentId || null);
    }
    
    if (updates.level !== undefined) {
      fields.push('level = ?');
      params.push(updates.level);
    }
    
    if (updates.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      params.push(updates.sortOrder);
    }
    
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      params.push(updates.isActive ? 1 : 0);
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push('updated_at = ?');
    params.push(getCurrentTimestamp());
    params.push(id);
    
    const stmt = db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Category not found');
    }
    
    const getStmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    const category = getStmt.get(id);
    
    return successResult({
      id: category.id,
      name: category.name,
      description: category.description,
      parentId: category.parent_id,
      level: category.level,
      sortOrder: category.sort_order,
      isActive: category.is_active === 1,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    });
  }, 'update-category'));

  // Delete category
  ipcMain.handle('db-delete-category', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(id);
    
    return successResult(result.changes > 0);
  }, 'delete-category'));

  // ===== Supplier CRUD Operations =====
  
  // Create supplier
  ipcMain.handle('db-create-supplier', wrapIpcHandler(async (event, supplier) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(supplier, ['name']);
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const stmt = db.prepare(`
      INSERT INTO suppliers (id, name, contact_person, phone, email, address, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      supplier.name, 
      supplier.contactPerson || '', 
      supplier.phone || '', 
      supplier.email || '', 
      supplier.address || '', 
      now, 
      now
    );
    
    const newSupplier = {
      id,
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      createdAt: now,
      updatedAt: now
    };
    
    return successResult(newSupplier);
  }, 'create-supplier'));

  // Update supplier
  ipcMain.handle('db-update-supplier', wrapIpcHandler(async (event, id, updates) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const fields = [];
    const params = [];
    
    const fieldMap = {
      name: 'name',
      contactPerson: 'contact_person',
      phone: 'phone',
      email: 'email',
      address: 'address'
    };
    
    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        fields.push(`${dbField} = ?`);
        params.push(updates[key]);
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push('updated_at = ?');
    params.push(getCurrentTimestamp());
    params.push(id);
    
    const stmt = db.prepare(`UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Supplier not found');
    }
    
    const getStmt = db.prepare('SELECT * FROM suppliers WHERE id = ?');
    const supplier = getStmt.get(id);
    
    return successResult({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contact_person,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      createdAt: supplier.created_at,
      updatedAt: supplier.updated_at
    });
  }, 'update-supplier'));

  // Delete supplier
  ipcMain.handle('db-delete-supplier', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const stmt = db.prepare('DELETE FROM suppliers WHERE id = ?');
    const result = stmt.run(id);
    
    return successResult(result.changes > 0);
  }, 'delete-supplier'));

  console.log('Inventory handlers registered successfully');
}

module.exports = {
  setupInventoryHandlers
};