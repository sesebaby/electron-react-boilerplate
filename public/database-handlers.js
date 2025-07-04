const { v4: uuidv4 } = require('uuid');

// Database handlers for better-sqlite3
function setupDatabaseHandlers(ipcMain, db) {
  
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
}

module.exports = { setupDatabaseHandlers };