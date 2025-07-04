const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');
const { setupDatabaseHandlers } = require('./database-handlers');

let db = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    show: false
  });

  // Always load the built file for now
  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('Loading file:', indexPath);
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load file:', err);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Window shown successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

app.whenReady().then(() => {
  console.log('App ready, creating window...');
  createWindow();
}).catch(err => {
  console.error('App failed to start:', err);
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('App activated');
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('ready', () => {
  console.log('Electron app is ready');
});

// IPC handlers for file operations
ipcMain.handle('show-open-dialog', async (event, options = {}) => {
  try {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ['openFile'],
      filters: [
        { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      ...options
    });
    return result;
  } catch (error) {
    console.error('Open dialog error:', error);
    return { canceled: true, filePaths: [] };
  }
});

ipcMain.handle('show-save-dialog', async (event, options = {}) => {
  try {
    const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      defaultPath: 'inventory-export.xlsx',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Save dialog error:', error);
    return { canceled: true, filePath: '' };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath);
    return { success: true, data: data.buffer };
  } catch (error) {
    console.error('Read file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (error) {
    console.error('Write file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    await fs.access(filePath);
    return { exists: true };
  } catch (error) {
    return { exists: false };
  }
});

ipcMain.handle('get-app-path', async (event, name = 'userData') => {
  try {
    return { path: app.getPath(name) };
  } catch (error) {
    console.error('Get app path error:', error);
    return { path: process.cwd() };
  }
});

// Database initialization
async function initializeDatabase() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'inventory.db');
    console.log('Database path:', dbPath);
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    
    db = new Database(dbPath);
    console.log('Connected to SQLite database');
    
    // Create tables
    const schema = `
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
      
      CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
    `;
    
    db.exec(schema);
    console.log('Database schema initialized');
    
    return Promise.resolve();
  } catch (error) {
    console.error('Database initialization failed:', error);
    return Promise.reject(error);
  }
}

// Database IPC handlers
ipcMain.handle('db-initialize', async () => {
  try {
    await initializeDatabase();
    // Setup all database handlers
    setupDatabaseHandlers(ipcMain, db);
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-get-all-items', async () => {
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
      ORDER BY name ASC
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

ipcMain.handle('db-get-item-by-id', async (event, id) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    db.get(query, [id], (err, row) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (row) {
        const item = {
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        };
        resolve({ success: true, data: item });
      } else {
        resolve({ success: true, data: null });
      }
    });
  });
});

ipcMain.handle('db-get-item-by-sku', async (event, sku) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    db.get(query, [sku], (err, row) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (row) {
        const item = {
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        };
        resolve({ success: true, data: item });
      } else {
        resolve({ success: true, data: null });
      }
    });
  });
});

ipcMain.handle('db-create-item', async (event, item) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    const params = [
      id, item.name, item.description || '', item.sku, item.category, item.supplier || '',
      item.stockQuantity, item.reservedQuantity || 0, item.unitPrice, item.totalValue,
      item.status || 'in-stock', item.location || '', item.reorderLevel || 0, item.maxStock || 0, now
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
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
        
        db.get(getQuery, [id], (err, row) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            const createdItem = {
              ...row,
              lastUpdated: new Date(row.lastUpdated)
            };
            resolve({ success: true, data: createdItem });
          }
        });
      }
    });
  });
});

ipcMain.handle('db-update-item', async (event, id, updates) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
      resolve({ success: false, error: 'No valid fields to update' });
      return;
    }
    
    updateFields.push('last_updated = ?');
    params.push(new Date().toISOString());
    params.push(id);
    
    const query = `UPDATE inventory_items SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else if (this.changes === 0) {
        resolve({ success: false, error: 'Item not found' });
      } else {
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
        
        db.get(getQuery, [id], (err, row) => {
          if (err) {
            resolve({ success: false, error: err.message });
          } else {
            const updatedItem = {
              ...row,
              lastUpdated: new Date(row.lastUpdated)
            };
            resolve({ success: true, data: updatedItem });
          }
        });
      }
    });
  });
});

ipcMain.handle('db-delete-item', async (event, id) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
    }
    
    const query = 'DELETE FROM inventory_items WHERE id = ?';
    
    db.run(query, [id], function(err) {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        resolve({ success: this.changes > 0 });
      }
    });
  });
});

ipcMain.handle('db-search-items', async (event, searchTerm) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    db.all(query, [searchPattern, searchPattern, searchPattern], (err, rows) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        const items = rows.map(row => ({
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        }));
        resolve({ success: true, data: items });
      }
    });
  });
});

ipcMain.handle('db-get-items-by-category', async (event, category) => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    db.all(query, [category], (err, rows) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        const items = rows.map(row => ({
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        }));
        resolve({ success: true, data: items });
      }
    });
  });
});

ipcMain.handle('db-get-low-stock-items', async () => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
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
    
    db.all(query, [], (err, rows) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        const items = rows.map(row => ({
          ...row,
          lastUpdated: new Date(row.lastUpdated)
        }));
        resolve({ success: true, data: items });
      }
    });
  });
});

ipcMain.handle('db-get-categories', async () => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
    }
    
    const query = 'SELECT DISTINCT category FROM inventory_items ORDER BY category';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        const categories = rows.map(row => row.category);
        resolve({ success: true, data: categories });
      }
    });
  });
});

ipcMain.handle('db-get-suppliers', async () => {
  return new Promise((resolve) => {
    if (!db) {
      resolve({ success: false, error: 'Database not initialized' });
      return;
    }
    
    const query = 'SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL AND supplier != "" ORDER BY supplier';
    
    db.all(query, [], (err, rows) => {
      if (err) {
        resolve({ success: false, error: err.message });
      } else {
        const suppliers = rows.map(row => row.supplier);
        resolve({ success: true, data: suppliers });
      }
    });
  });
});