const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const Database = require('better-sqlite3');
const { setupDatabaseHandlers } = require('./database');

let db = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,        // Disable node integration for security
      contextIsolation: true,        // Enable context isolation for security
      enableRemoteModule: false,     // Disable remote module for security
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,                // Keep false for IPC communication
      webSecurity: true              // Keep web security enabled
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

    // 在开发环境中自动打开开发者工具
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow.webContents.openDevTools({
        mode: 'bottom'
      });
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // 捕获渲染进程中的错误
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Console [${level}]: ${message} (${sourceId}:${line})`);
  });

  // 捕获未处理的异常
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', { killed });
  });

  // 捕获渲染进程错误
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
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

// Directory operations for logging service
ipcMain.handle('mkdir', async (event, dirPath, options = { recursive: true }) => {
  try {
    await fs.mkdir(dirPath, options);
    return { success: true };
  } catch (error) {
    console.error('Mkdir error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stat', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      success: true,
      data: {
        size: stats.size,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        mtime: stats.mtime
      }
    };
  } catch (error) {
    console.error('Stat error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('readdir', async (event, dirPath) => {
  try {
    const files = await fs.readdir(dirPath);
    return { success: true, data: files };
  } catch (error) {
    console.error('Readdir error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rename', async (event, oldPath, newPath) => {
  try {
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    console.error('Rename error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('unlink', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('Unlink error:', error);
    return { success: false, error: error.message };
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
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        location TEXT,
        address TEXT,
        manager TEXT,
        phone TEXT,
        type TEXT CHECK(type IN ('main', 'branch', 'temporary')) DEFAULT 'branch',
        capacity INTEGER DEFAULT 0,
        is_default BOOLEAN NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
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
        is_active BOOLEAN NOT NULL DEFAULT 1,
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
        is_active BOOLEAN NOT NULL DEFAULT 1,
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

      -- 全局转换规则表
      CREATE TABLE IF NOT EXISTS global_conversion_rules (
        id TEXT PRIMARY KEY,
        from_unit_id TEXT NOT NULL,
        to_unit_id TEXT NOT NULL,
        factor REAL NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_unit_id) REFERENCES units(id),
        FOREIGN KEY (to_unit_id) REFERENCES units(id)
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

      -- 库存物品表
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
      CREATE INDEX IF NOT EXISTS idx_transactions_item ON inventory_transactions(item_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);
    `;
    
    db.exec(schema);
    console.log('Database schema initialized');
    
    // 检查数据库是否为空，如果是则导入mock数据
    await importMockDataIfEmpty();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Database initialization failed:', error);
    return Promise.reject(error);
  }
}

// 导入mock数据（如果数据库为空）
async function importMockDataIfEmpty() {
  try {
    // 检查关键表是否都有数据
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get();
    const unitCount = db.prepare('SELECT COUNT(*) as count FROM units').get();
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    const supplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
    
    // 只有所有关键表都有数据才跳过导入
    if (itemCount.count > 0 && unitCount.count > 0 && categoryCount.count > 0 && supplierCount.count > 0) {
      console.log(`Database already has data (items: ${itemCount.count}, units: ${unitCount.count}, categories: ${categoryCount.count}, suppliers: ${supplierCount.count}), skipping mock data import`);
      return;
    }
    
    console.log(`Database missing data (items: ${itemCount.count}, units: ${unitCount.count}, categories: ${categoryCount.count}, suppliers: ${supplierCount.count}), importing mock data...`);
    
    // 读取mock-data.sql文件
    const mockDataPath = path.join(__dirname, '../mock-data.sql');
    
    if (!await fs.access(mockDataPath).then(() => true).catch(() => false)) {
      console.log('Mock data file not found, skipping import');
      return;
    }
    
    const mockDataSql = await fs.readFile(mockDataPath, 'utf8');
    
    // 执行SQL脚本
    db.exec(mockDataSql);
    
    // 验证导入结果
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get();
    console.log(`Mock data import completed: ${finalCount.count} items imported`);
    
    // 显示统计信息
    const tables = ['categories', 'suppliers', 'units', 'inventory_items', 'inventory_transactions'];
    console.log('Import statistics:');
    for (const table of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        console.log(`  ${table}: ${count.count} records`);
      } catch (error) {
        console.log(`  ${table}: query failed - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Failed to import mock data:', error);
    // 不抛出错误，让应用继续启动
  }
}

// Database IPC handlers
// 清理已存在的处理器，避免重复注册
ipcMain.removeHandler('db-initialize');
ipcMain.removeHandler('db-get-all-items');
ipcMain.removeHandler('db-reimport-units');

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

// 重复的处理器已移除 - 现在由模块化的处理器管理
// db-get-all-items 和 db-reimport-units 现在在 inventoryHandlers.js 和 unitHandlers.js 中处理