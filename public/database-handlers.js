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
    'db-search-units'
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
}

module.exports = { setupDatabaseHandlers };