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