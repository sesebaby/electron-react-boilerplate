const { v4: uuidv4 } = require('uuid');

// Database handlers for better-sqlite3
function setupDatabaseHandlers(ipcMain, db) {
  // 清理已存在的处理器，避免重复注册
  const handlersToRemove = [
    'db-get-item-by-id',
    'db-get-item-by-sku',
    'db-create-item',           // 添加缺失的处理器
    'db-add-item',
    'db-update-item',
    'db-delete-item',
    // 'db-get-all-items',      // 移除，因为此处理器在 main.js 中单独管理
    'db-search-items',
    'db-get-categories',
    'db-get-suppliers',
    'db-get-all-categories',   // 添加缺失的处理器
    'db-get-all-suppliers',    // 添加缺失的处理器
    'db-get-all-transactions', // 添加缺失的处理器
    'db-get-low-stock-items',
    'db-get-out-of-stock-items',
    'db-get-items-by-category',
    'db-get-items-by-supplier',
    'db-update-stock',
    'db-add-transaction',
    'db-get-transactions',
    'db-get-transactions-by-item',
    // Warehouse handlers
    'db-get-all-warehouses',
    'db-get-warehouse-by-id',
    'db-get-warehouse-by-code',
    'db-create-warehouse',
    'db-update-warehouse',
    'db-delete-warehouse',
    'db-search-warehouses',
    'db-get-default-warehouse',
    // Unit handlers
    'db-get-all-units',
    'db-get-unit-by-id',
    'db-get-unit-by-symbol',
    'db-create-unit',
    'db-update-unit',
    'db-delete-unit',
    'db-search-units',
    // Global conversion rules handlers
    'db-get-all-conversion-rules',
    'db-get-conversion-rule-by-id',
    'db-create-conversion-rule',
    'db-update-conversion-rule',
    'db-delete-conversion-rule',
    'db-search-conversion-rules',
    // Product conversion settings handlers
    'db-get-all-product-conversions',
    'db-get-product-conversion-by-id',
    'db-get-product-conversion-by-product',
    'db-create-product-conversion',
    'db-update-product-conversion',
    'db-delete-product-conversion',
    // System initialization handlers
    'db-backup',
    'db-get-backup-list',
    'db-delete-backup',
    'db-restore',
    'db-validate-backup',
    'db-clear-database',
    'db-rebuild-schema',
    'db-import-mock-data',
    'db-get-system-status',
    'db-validate-integrity'
  ];

  handlersToRemove.forEach(handler => {
    try {
      ipcMain.removeHandler(handler);
    } catch (error) {
      // 忽略移除不存在处理器的错误
      console.log(`Handler ${handler} was not registered, skipping removal`);
    }
  });

  // 检查处理器是否已经注册
  try {
    // 尝试检查是否已经有处理器注册
    const hasHandlers = ipcMain.listenerCount && ipcMain.listenerCount('db-get-item-by-id') > 0;
    if (hasHandlers) {
      console.log('Database handlers already registered, skipping setup');
      return;
    }
  } catch (error) {
    console.log('Unable to check existing handlers, proceeding with registration');
  }

  ipcMain.handle('db-get-item-by-id', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE id = ?
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(id);
      
      if (row) {
        const item = {
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        };
        return { success: true, data: item };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-item-by-sku', async (event, sku) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE sku = ?
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(sku);
      
      if (row) {
        const item = {
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        };
        return { success: true, data: item };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-create-item', async (event, item) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const query = `
        INSERT INTO inventory_items (
          id, name, description, sku, category, supplier,
          stock_quantity, reserved_quantity, unit_price, total_value,
          status, location, reorder_level, max_stock, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(query);
      stmt.run(
        id, item.name, item.description || '', item.sku, item.category, item.supplier || '',
        item.stockQuantity, item.reservedQuantity || 0, item.unitPrice, item.totalValue,
        item.status || 'in-stock', item.location || '', item.reorderLevel || 0, item.maxStock || 0, now
      );
      
      // Get the created item
      const getQuery = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const createdItem = {
        ...row,
        lastUpdated: new Date(row.lastUpdated)
      };
      
      return { success: true, data: createdItem };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-update-item', async (event, id, updates) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const updateFields = [];
      const params = [];
      
      const fieldMap = {
        name: 'name',
        description: 'description',
        sku: 'sku',
        category: 'category',
        supplier: 'supplier',
        stockQuantity: 'stock_quantity',
        reservedQuantity: 'reserved_quantity',
        unitPrice: 'unit_price',
        totalValue: 'total_value',
        status: 'status',
        location: 'location',
        reorderLevel: 'reorder_level',
        maxStock: 'max_stock'
      };
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key in fieldMap && value !== undefined) {
          updateFields.push(`${fieldMap[key]} = ?`);
          params.push(value);
        }
      });
      
      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }
      
      updateFields.push('last_updated = ?');
      params.push(new Date().toISOString());
      params.push(id);
      
      const query = `UPDATE inventory_items SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      
      if (result.changes === 0) {
        return { success: false, error: 'Item not found' };
      }
      
      // Get the updated item
      const getQuery = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const updatedItem = {
        ...row,
        lastUpdated: new Date(row.lastUpdated)
      };
      
      return { success: true, data: updatedItem };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-delete-item', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const stmt = db.prepare('DELETE FROM inventory_items WHERE id = ?');
      const result = stmt.run(id);
      
      return { success: result.changes > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-search-items', async (event, searchTerm) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
        ORDER BY name ASC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const stmt = db.prepare(query);
      const rows = stmt.all(searchPattern, searchPattern, searchPattern);
      
      const items = rows.map(row => ({
        ...row,
        lastUpdated: new Date(row.lastUpdated)
      }));
      
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-items-by-category', async (event, category) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE category = ?
        ORDER BY name ASC
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all(category);
      
      const items = rows.map(row => ({
        ...row,
        lastUpdated: new Date(row.lastUpdated)
      }));
      
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-low-stock-items', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, description, sku, category, supplier,
          stock_quantity as stockQuantity,
          reserved_quantity as reservedQuantity,
          unit_price as unitPrice,
          total_value as totalValue,
          last_updated as lastUpdated,
          status, location,
          reorder_level as reorderLevel,
          max_stock as maxStock
        FROM inventory_items 
        WHERE stock_quantity <= reorder_level
        ORDER BY stock_quantity ASC
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all();
      
      const items = rows.map(row => ({
        ...row,
        lastUpdated: new Date(row.lastUpdated)
      }));
      
      return { success: true, data: items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-categories', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const stmt = db.prepare('SELECT DISTINCT category FROM inventory_items ORDER BY category');
      const rows = stmt.all();
      const categories = rows.map(row => row.category);
      
      return { success: true, data: categories };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-get-suppliers', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const stmt = db.prepare('SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL AND supplier != "" ORDER BY supplier');
      const rows = stmt.all();
      const suppliers = rows.map(row => row.supplier);
      
      return { success: true, data: suppliers };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get all categories from categories table
  ipcMain.handle('db-get-all-categories', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const stmt = db.prepare('SELECT * FROM categories ORDER BY name');
      const rows = stmt.all();
      
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get all suppliers from suppliers table
  ipcMain.handle('db-get-all-suppliers', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const stmt = db.prepare('SELECT * FROM suppliers ORDER BY name');
      const rows = stmt.all();
      
      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Add inventory transaction
  ipcMain.handle('db-add-transaction', async (event, transaction) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const query = `
        INSERT INTO inventory_transactions (
          id, item_id, transaction_type, quantity, unit_price, total_value,
          reason, reference_no, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const stmt = db.prepare(query);
      const now = new Date().toISOString();
      
      stmt.run(
        transaction.id,
        transaction.item_id || transaction.productId, // 兼容不同的字段名
        transaction.transaction_type || transaction.transactionType,
        transaction.quantity,
        transaction.unit_price || transaction.unitPrice,
        transaction.total_value || transaction.totalAmount,
        transaction.reason || transaction.remark,
        transaction.reference_no || transaction.transactionNo,
        transaction.created_at || now,
        transaction.created_by || transaction.operator
      );

      return { success: true, data: transaction };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get all inventory transactions
  ipcMain.handle('db-get-all-transactions', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const stmt = db.prepare('SELECT * FROM inventory_transactions ORDER BY created_at DESC');
      const rows = stmt.all();

      return { success: true, data: rows };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // db-get-all-items 处理器已在 main.js 中注册，此处移除重复定义

  // ========== WAREHOUSE HANDLERS ==========

  // Get all warehouses
  ipcMain.handle('db-get-all-warehouses', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        ORDER BY name ASC
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all();
      
      const warehouses = rows.map(row => ({
        ...row,
        isDefault: Boolean(row.isDefault),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
      
      return { success: true, data: warehouses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get warehouse by ID
  ipcMain.handle('db-get-warehouse-by-id', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE id = ?
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(id);
      
      if (row) {
        const warehouse = {
          ...row,
          isDefault: Boolean(row.isDefault),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
        return { success: true, data: warehouse };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get warehouse by code
  ipcMain.handle('db-get-warehouse-by-code', async (event, code) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE code = ?
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(code);
      
      if (row) {
        const warehouse = {
          ...row,
          isDefault: Boolean(row.isDefault),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
        return { success: true, data: warehouse };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get default warehouse
  ipcMain.handle('db-get-default-warehouse', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE is_default = 1
        LIMIT 1
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get();
      
      if (row) {
        const warehouse = {
          ...row,
          isDefault: Boolean(row.isDefault),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
        return { success: true, data: warehouse };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create warehouse
  ipcMain.handle('db-create-warehouse', async (event, warehouse) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
      // If this warehouse is set as default, clear other default warehouses first
      if (warehouse.isDefault) {
        const clearDefaultStmt = db.prepare('UPDATE warehouses SET is_default = 0 WHERE is_default = 1');
        clearDefaultStmt.run();
      }
      
      const query = `
        INSERT INTO warehouses (
          id, code, name, address, manager, phone, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        now, 
        now
      );
      
      // Get the created warehouse
      const getQuery = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const createdWarehouse = {
        ...row,
        isDefault: Boolean(row.isDefault),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
      
      return { success: true, data: createdWarehouse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update warehouse
  ipcMain.handle('db-update-warehouse', async (event, id, updates) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      // If this warehouse is being set as default, clear other default warehouses first
      if (updates.isDefault === true) {
        const clearDefaultStmt = db.prepare('UPDATE warehouses SET is_default = 0 WHERE is_default = 1 AND id != ?');
        clearDefaultStmt.run(id);
      }
      
      const updateFields = [];
      const params = [];
      
      const fieldMap = {
        code: 'code',
        name: 'name',
        address: 'address',
        manager: 'manager',
        phone: 'phone',
        isDefault: 'is_default'
      };
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key in fieldMap && value !== undefined) {
          updateFields.push(`${fieldMap[key]} = ?`);
          // Convert boolean isDefault to integer for SQLite
          params.push(key === 'isDefault' ? (value ? 1 : 0) : value);
        }
      });
      
      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }
      
      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      
      const query = `UPDATE warehouses SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      
      if (result.changes === 0) {
        return { success: false, error: 'Warehouse not found' };
      }
      
      // Get the updated warehouse
      const getQuery = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const updatedWarehouse = {
        ...row,
        isDefault: Boolean(row.isDefault),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
      
      return { success: true, data: updatedWarehouse };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete warehouse
  ipcMain.handle('db-delete-warehouse', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      // Check if this is a default warehouse
      const checkQuery = 'SELECT is_default FROM warehouses WHERE id = ?';
      const checkStmt = db.prepare(checkQuery);
      const warehouse = checkStmt.get(id);
      
      if (!warehouse) {
        return { success: false, error: 'Warehouse not found' };
      }
      
      if (warehouse.is_default) {
        return { success: false, error: 'Cannot delete default warehouse' };
      }
      
      const stmt = db.prepare('DELETE FROM warehouses WHERE id = ?');
      const result = stmt.run(id);
      
      return { success: result.changes > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Search warehouses
  ipcMain.handle('db-search-warehouses', async (event, searchTerm) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, code, name, address, manager, phone,
          is_default as isDefault,
          created_at as createdAt,
          updated_at as updatedAt
        FROM warehouses 
        WHERE name LIKE ? OR code LIKE ? OR address LIKE ? OR manager LIKE ?
        ORDER BY name ASC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const stmt = db.prepare(query);
      const rows = stmt.all(searchPattern, searchPattern, searchPattern, searchPattern);
      
      const warehouses = rows.map(row => ({
        ...row,
        isDefault: Boolean(row.isDefault),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
      
      return { success: true, data: warehouses };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========== UNIT HANDLERS ==========

  // Get all units
  ipcMain.handle('db-get-all-units', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE is_active = 1
        ORDER BY type, name ASC
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all();
      
      const units = rows.map(row => ({
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
      
      return { success: true, data: units };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get unit by ID
  ipcMain.handle('db-get-unit-by-id', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE id = ?
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(id);
      
      if (row) {
        const unit = {
          ...row,
          isActive: Boolean(row.isActive),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
        return { success: true, data: unit };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get unit by symbol
  ipcMain.handle('db-get-unit-by-symbol', async (event, symbol) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE symbol = ? AND is_active = 1
      `;
      
      const stmt = db.prepare(query);
      const row = stmt.get(symbol);
      
      if (row) {
        const unit = {
          ...row,
          isActive: Boolean(row.isActive),
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        };
        return { success: true, data: unit };
      } else {
        return { success: true, data: null };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create unit
  ipcMain.handle('db-create-unit', async (event, unit) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const id = uuidv4();
      const now = new Date().toISOString();
      
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
      
      // Get the created unit
      const getQuery = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const createdUnit = {
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
      
      return { success: true, data: createdUnit };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update unit
  ipcMain.handle('db-update-unit', async (event, id, updates) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const updateFields = [];
      const params = [];
      
      const fieldMap = {
        name: 'name',
        symbol: 'symbol',
        type: 'type',
        precision: 'precision',
        description: 'description',
        isActive: 'is_active'
      };
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key in fieldMap && value !== undefined) {
          updateFields.push(`${fieldMap[key]} = ?`);
          // Convert boolean isActive to integer for SQLite
          params.push(key === 'isActive' ? (value ? 1 : 0) : value);
        }
      });
      
      if (updateFields.length === 0) {
        return { success: false, error: 'No valid fields to update' };
      }
      
      updateFields.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(id);
      
      const query = `UPDATE units SET ${updateFields.join(', ')} WHERE id = ?`;
      const stmt = db.prepare(query);
      const result = stmt.run(...params);
      
      if (result.changes === 0) {
        return { success: false, error: 'Unit not found' };
      }
      
      // Get the updated unit
      const getQuery = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE id = ?
      `;
      
      const getStmt = db.prepare(getQuery);
      const row = getStmt.get(id);
      
      const updatedUnit = {
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };
      
      return { success: true, data: updatedUnit };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete unit
  ipcMain.handle('db-delete-unit', async (event, id) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      // TODO: Check if unit is used by any products before deletion
      
      const stmt = db.prepare('DELETE FROM units WHERE id = ?');
      const result = stmt.run(id);
      
      return { success: result.changes > 0 };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Search units
  ipcMain.handle('db-search-units', async (event, searchTerm) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }
      
      const query = `
        SELECT 
          id, name, symbol, type, precision, description,
          is_active as isActive,
          created_at as createdAt,
          updated_at as updatedAt
        FROM units 
        WHERE (name LIKE ? OR symbol LIKE ? OR description LIKE ?) AND is_active = 1
        ORDER BY type, name ASC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const stmt = db.prepare(query);
      const rows = stmt.all(searchPattern, searchPattern, searchPattern);
      
      const units = rows.map(row => ({
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
      
      return { success: true, data: units };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========== SYSTEM INITIALIZATION HANDLERS ==========

  // Database backup
  ipcMain.handle('db-backup', async (event, { filename, description }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');

      // Create backup directory if it doesn't exist
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupPath = path.join(backupDir, filename);
      const currentDbPath = db.name;

      // Copy database file
      fs.copyFileSync(currentDbPath, backupPath);

      // Get file size
      const stats = fs.statSync(backupPath);

      // Save backup info to database
      const backupInfo = {
        id: filename.replace('.db', ''),
        filename,
        filepath: backupPath,
        timestamp: new Date().toISOString(),
        size: stats.size,
        description: description || 'Manual backup'
      };

      // Create backups table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          filepath TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          size INTEGER NOT NULL,
          description TEXT
        )
      `);

      const stmt = db.prepare(`
        INSERT OR REPLACE INTO backups (id, filename, filepath, timestamp, size, description)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(backupInfo.id, backupInfo.filename, backupInfo.filepath,
               backupInfo.timestamp, backupInfo.size, backupInfo.description);

      return {
        success: true,
        filepath: backupPath,
        size: stats.size
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get backup list
  ipcMain.handle('db-get-backup-list', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      // Create backups table if it doesn't exist
      db.exec(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          filepath TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          size INTEGER NOT NULL,
          description TEXT
        )
      `);

      const stmt = db.prepare(`
        SELECT * FROM backups ORDER BY timestamp DESC
      `);

      const rows = stmt.all();

      const backups = rows.map(row => ({
        ...row,
        timestamp: new Date(row.timestamp)
      }));

      return { success: true, data: backups };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete backup
  ipcMain.handle('db-delete-backup', async (event, { backupId }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');

      // Get backup info
      const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
      const backup = stmt.get(backupId);

      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }

      // Delete file
      if (fs.existsSync(backup.filepath)) {
        fs.unlinkSync(backup.filepath);
      }

      // Delete from database
      const deleteStmt = db.prepare('DELETE FROM backups WHERE id = ?');
      deleteStmt.run(backupId);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Restore backup
  ipcMain.handle('db-restore', async (event, { backupId }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');

      // Get backup info
      const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
      const backup = stmt.get(backupId);

      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }

      if (!fs.existsSync(backup.filepath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // Close current database
      db.close();

      // Replace current database with backup
      const currentDbPath = db.name;
      fs.copyFileSync(backup.filepath, currentDbPath);

      // Reopen database
      const Database = require('better-sqlite3');
      db = new Database(currentDbPath);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate backup
  ipcMain.handle('db-validate-backup', async (event, { backupId }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');
      const Database = require('better-sqlite3');

      // Get backup info
      const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
      const backup = stmt.get(backupId);

      if (!backup) {
        return { success: false, error: 'Backup not found' };
      }

      if (!fs.existsSync(backup.filepath)) {
        return { success: false, error: 'Backup file not found' };
      }

      // Try to open backup database
      let testDb;
      try {
        testDb = new Database(backup.filepath, { readonly: true });

        // Test basic query
        testDb.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();

        testDb.close();
        return { success: true, valid: true };
      } catch (error) {
        if (testDb) testDb.close();
        return { success: true, valid: false, error: error.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Clear database
  ipcMain.handle('db-clear-database', async (event, { preserveUsers, preserveSettings }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      // Get list of all tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      // Tables to preserve
      const preserveTables = [];
      if (preserveUsers) {
        preserveTables.push('users', 'user_sessions');
      }
      if (preserveSettings) {
        preserveTables.push('system_settings', 'backups');
      }

      // Clear tables (except preserved ones)
      for (const table of tables) {
        if (!preserveTables.includes(table.name)) {
          db.prepare(`DELETE FROM ${table.name}`).run();
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Rebuild schema
  ipcMain.handle('db-rebuild-schema', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');
      const path = require('path');

      // Read schema file
      const schemaPath = path.join(__dirname, '..', 'src', 'data', 'schema.sql');
      if (!fs.existsSync(schemaPath)) {
        return { success: false, error: 'Schema file not found' };
      }

      const schema = fs.readFileSync(schemaPath, 'utf-8');

      // Execute schema
      db.exec(schema);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Import mock data
  ipcMain.handle('db-import-mock-data', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');
      const path = require('path');

      // Read mock data file
      const mockDataPath = path.join(__dirname, '..', 'mock-data.sql');
      if (!fs.existsSync(mockDataPath)) {
        return { success: false, error: 'Mock data file not found' };
      }

      const mockData = fs.readFileSync(mockDataPath, 'utf-8');

      // Execute mock data
      db.exec(mockData);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get system status
  ipcMain.handle('db-get-system-status', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fs = require('fs');

      // Get database file size
      const dbPath = db.name;
      const stats = fs.statSync(dbPath);
      const databaseSize = stats.size;

      // Get table count
      const tableCount = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).get().count;

      // Get total record count
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
          // Skip tables that can't be counted
        }
      }

      // Get last backup date
      let lastBackup;
      try {
        const backup = db.prepare(`
          SELECT timestamp FROM backups ORDER BY timestamp DESC LIMIT 1
        `).get();
        if (backup) {
          lastBackup = new Date(backup.timestamp);
        }
      } catch (error) {
        // No backups table or no backups
      }

      // Get version
      const version = '1.0.0'; // You can get this from package.json or config

      return {
        success: true,
        data: {
          databaseSize,
          tableCount,
          recordCount,
          lastBackup,
          version
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Validate integrity
  ipcMain.handle('db-validate-integrity', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const issues = [];
      const recommendations = [];

      // Check database integrity
      try {
        const result = db.prepare('PRAGMA integrity_check').get();
        if (result.integrity_check !== 'ok') {
          issues.push('Database integrity check failed');
          recommendations.push('Consider restoring from a backup');
        }
      } catch (error) {
        issues.push('Unable to perform integrity check');
      }

      // Check for required tables
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

      // Check for orphaned records
      try {
        const orphanedItems = db.prepare(`
          SELECT COUNT(*) as count FROM inventory_items
          WHERE category_id NOT IN (SELECT id FROM categories)
        `).get().count;

        if (orphanedItems > 0) {
          issues.push(`Found ${orphanedItems} inventory items with invalid categories`);
          recommendations.push('Clean up orphaned records or restore category data');
        }
      } catch (error) {
        // Skip if tables don't exist
      }

      return {
        success: true,
        data: {
          isValid: issues.length === 0,
          issues,
          recommendations
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========== GLOBAL CONVERSION RULES HANDLERS ==========

  // Get all global conversion rules
  ipcMain.handle('db-get-all-conversion-rules', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const query = `
        SELECT
          id, name, from_unit_id as fromUnitId, to_unit_id as toUnitId,
          conversion_rate as conversionRate, category, description,
          is_active as isActive,
          created_at as createdAt, updated_at as updatedAt
        FROM global_conversion_rules
        ORDER BY category, name ASC
      `;

      const stmt = db.prepare(query);
      const rows = stmt.all();

      const rules = rows.map(row => ({
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));

      return { success: true, data: rules };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get conversion rule by ID
  ipcMain.handle('db-get-conversion-rule-by-id', async (event, { id }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const query = `
        SELECT
          id, name, from_unit_id as fromUnitId, to_unit_id as toUnitId,
          conversion_rate as conversionRate, category, description,
          is_active as isActive,
          created_at as createdAt, updated_at as updatedAt
        FROM global_conversion_rules
        WHERE id = ?
      `;

      const stmt = db.prepare(query);
      const row = stmt.get(id);

      if (!row) {
        return { success: false, error: 'Conversion rule not found' };
      }

      const rule = {
        ...row,
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };

      return { success: true, data: rule };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create conversion rule
  ipcMain.handle('db-create-conversion-rule', async (event, ruleData) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const { name, fromUnitId, toUnitId, conversionRate, category, description, isActive = true } = ruleData;
      const id = require('uuid').v4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO global_conversion_rules
        (id, name, from_unit_id, to_unit_id, conversion_rate, category, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, name, fromUnitId, toUnitId, conversionRate, category, description, isActive ? 1 : 0, now, now);

      return { success: true, data: { id, ...ruleData, createdAt: now, updatedAt: now } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update conversion rule
  ipcMain.handle('db-update-conversion-rule', async (event, { id, updates }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fields = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        if (key === 'fromUnitId') {
          fields.push('from_unit_id = ?');
          values.push(updates[key]);
        } else if (key === 'toUnitId') {
          fields.push('to_unit_id = ?');
          values.push(updates[key]);
        } else if (key === 'conversionRate') {
          fields.push('conversion_rate = ?');
          values.push(updates[key]);
        } else if (key === 'isActive') {
          fields.push('is_active = ?');
          values.push(updates[key] ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const stmt = db.prepare(`
        UPDATE global_conversion_rules
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = stmt.run(...values);

      if (result.changes === 0) {
        return { success: false, error: 'Conversion rule not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete conversion rule
  ipcMain.handle('db-delete-conversion-rule', async (event, { id }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const stmt = db.prepare('DELETE FROM global_conversion_rules WHERE id = ?');
      const result = stmt.run(id);

      if (result.changes === 0) {
        return { success: false, error: 'Conversion rule not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ========== PRODUCT CONVERSION SETTINGS HANDLERS ==========

  // Get all product conversion settings
  ipcMain.handle('db-get-all-product-conversions', async () => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const query = `
        SELECT
          id, product_id as productId, enable_conversion as enableConversion,
          conversion_type as conversionType, global_rule_id as globalRuleId,
          custom_from_unit_id as customFromUnitId, custom_to_unit_id as customToUnitId,
          custom_conversion_rate as customConversionRate, custom_description as customDescription,
          is_active as isActive,
          created_at as createdAt, updated_at as updatedAt
        FROM product_conversion_settings
        ORDER BY product_id ASC
      `;

      const stmt = db.prepare(query);
      const rows = stmt.all();

      const settings = rows.map(row => ({
        ...row,
        enableConversion: Boolean(row.enableConversion),
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));

      return { success: true, data: settings };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get product conversion by product ID
  ipcMain.handle('db-get-product-conversion-by-product', async (event, { productId }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const query = `
        SELECT
          id, product_id as productId, enable_conversion as enableConversion,
          conversion_type as conversionType, global_rule_id as globalRuleId,
          custom_from_unit_id as customFromUnitId, custom_to_unit_id as customToUnitId,
          custom_conversion_rate as customConversionRate, custom_description as customDescription,
          is_active as isActive,
          created_at as createdAt, updated_at as updatedAt
        FROM product_conversion_settings
        WHERE product_id = ?
      `;

      const stmt = db.prepare(query);
      const row = stmt.get(productId);

      if (!row) {
        return { success: true, data: null };
      }

      const setting = {
        ...row,
        enableConversion: Boolean(row.enableConversion),
        isActive: Boolean(row.isActive),
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      };

      return { success: true, data: setting };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create product conversion setting
  ipcMain.handle('db-create-product-conversion', async (event, settingData) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const {
        productId, enableConversion, conversionType, globalRuleId,
        customFromUnitId, customToUnitId, customConversionRate, customDescription,
        isActive = true
      } = settingData;

      const id = require('uuid').v4();
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO product_conversion_settings
        (id, product_id, enable_conversion, conversion_type, global_rule_id,
         custom_from_unit_id, custom_to_unit_id, custom_conversion_rate, custom_description,
         is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id, productId, enableConversion ? 1 : 0, conversionType, globalRuleId,
        customFromUnitId, customToUnitId, customConversionRate, customDescription,
        isActive ? 1 : 0, now, now
      );

      return { success: true, data: { id, ...settingData, createdAt: now, updatedAt: now } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Update product conversion setting
  ipcMain.handle('db-update-product-conversion', async (event, { id, updates }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const fields = [];
      const values = [];

      Object.keys(updates).forEach(key => {
        if (key === 'productId') {
          fields.push('product_id = ?');
          values.push(updates[key]);
        } else if (key === 'enableConversion') {
          fields.push('enable_conversion = ?');
          values.push(updates[key] ? 1 : 0);
        } else if (key === 'conversionType') {
          fields.push('conversion_type = ?');
          values.push(updates[key]);
        } else if (key === 'globalRuleId') {
          fields.push('global_rule_id = ?');
          values.push(updates[key]);
        } else if (key === 'customFromUnitId') {
          fields.push('custom_from_unit_id = ?');
          values.push(updates[key]);
        } else if (key === 'customToUnitId') {
          fields.push('custom_to_unit_id = ?');
          values.push(updates[key]);
        } else if (key === 'customConversionRate') {
          fields.push('custom_conversion_rate = ?');
          values.push(updates[key]);
        } else if (key === 'customDescription') {
          fields.push('custom_description = ?');
          values.push(updates[key]);
        } else if (key === 'isActive') {
          fields.push('is_active = ?');
          values.push(updates[key] ? 1 : 0);
        }
      });

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const stmt = db.prepare(`
        UPDATE product_conversion_settings
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      const result = stmt.run(...values);

      if (result.changes === 0) {
        return { success: false, error: 'Product conversion setting not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Delete product conversion setting
  ipcMain.handle('db-delete-product-conversion', async (event, { id }) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const stmt = db.prepare('DELETE FROM product_conversion_settings WHERE id = ?');
      const result = stmt.run(id);

      if (result.changes === 0) {
        return { success: false, error: 'Product conversion setting not found' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupDatabaseHandlers };