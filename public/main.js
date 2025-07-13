const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
// const Database = require('better-sqlite3');
const SmartDatabase = require('./database/smart-database');
const { setupDatabaseHandlers } = require('./database');

let db = null;

function createWindow() {
  // 检测测试模式
  const isTestMode = process.argv.includes('--test-mode') || process.env.TEST_MODE === 'true';
  
  // 测试模式下的窗口配置
  const windowConfig = {
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
    show: !isTestMode  // 测试模式下不自动显示窗口
  };

  // 测试模式下的额外配置
  if (isTestMode) {
    console.log('🧪 Running in test mode');
    windowConfig.webPreferences.webSecurity = false; // 测试模式下放宽安全限制
    windowConfig.webPreferences.allowRunningInsecureContent = true;
  }

  const mainWindow = new BrowserWindow(windowConfig);

  // Always load the built file for now
  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('Loading file:', indexPath);
  
  mainWindow.loadFile(indexPath).catch(err => {
    console.error('Failed to load file:', err);
  });

  mainWindow.once('ready-to-show', () => {
    // 测试模式下不自动显示窗口，但会触发ready-to-show事件
    if (!isTestMode) {
      mainWindow.show();
    }
    console.log('Window ready:', isTestMode ? '(test mode - hidden)' : 'shown successfully');

    // 在开发环境中自动打开开发者工具
    if ((process.env.NODE_ENV === 'development' || !app.isPackaged) && !isTestMode) {
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
    // 过滤掉一些常见的非关键错误信息，避免日志噪音
    if (message.includes('DevTools') || message.includes('Extension')) {
      return;
    }
    console.log(`Console [${level}]: ${message} (${sourceId}:${line})`);
  });

  // 捕获未处理的异常
  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', { killed });
    // 尝试重新创建窗口
    if (!killed) {
      setTimeout(() => {
        try {
          createWindow();
        } catch (error) {
          console.error('Failed to recreate window after crash:', error);
        }
      }, 1000);
    }
  });

  // 捕获渲染进程错误
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
    // 如果是异常退出，尝试重新加载
    if (details.reason !== 'clean-exit') {
      setTimeout(() => {
        try {
          if (!mainWindow.isDestroyed()) {
            mainWindow.reload();
          }
        } catch (error) {
          console.error('Failed to reload after render process gone:', error);
        }
      }, 1000);
    }
  });

  // 添加IPC通信错误处理
  mainWindow.webContents.on('ipc-message-sync', (event, channel, ...args) => {
    // 监控同步IPC消息，记录可能的问题
    if (channel.startsWith('db-')) {
      console.log(`Sync IPC: ${channel}`);
    }
  });

  // 处理窗口关闭前的清理
  mainWindow.on('close', (event) => {
    try {
      // 清理资源，避免EPIPE错误
      if (db && typeof db.close === 'function') {
        db.close();
      }
    } catch (error) {
      console.error('Error during window close cleanup:', error);
    }
  });
}

app.whenReady().then(async () => {
  console.log('App ready, creating window...');

  // 立即初始化数据库和注册处理器
  try {
    await initializeDatabase();
    setupDatabaseHandlers(ipcMain, db);
    console.log('Database and handlers initialized on app startup');
  } catch (error) {
    console.error('Failed to initialize database on startup:', error);
  }

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

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 记录错误但不退出应用，除非是严重错误
  if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
    console.log('Handled EPIPE/ECONNRESET error, continuing...');
    return;
  }
  // 对于其他严重错误，优雅退出
  console.error('Critical error, shutting down...');
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 记录但不退出，让应用继续运行
});

// 处理SIGPIPE信号（在某些系统上可能有用）
process.on('SIGPIPE', () => {
  console.log('Received SIGPIPE, ignoring...');
});

// 应用退出前的清理
app.on('before-quit', (event) => {
  console.log('App is about to quit, cleaning up...');
  try {
    // 清理数据库连接
    if (db && typeof db.close === 'function') {
      db.close();
      console.log('Database connection closed');
    }
  } catch (error) {
    console.error('Error during app cleanup:', error);
  }
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
    // 检查是否是EPIPE相关错误
    if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
      console.log('File read interrupted by pipe error, retrying...');
      // 简单重试机制
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const retryData = await fs.readFile(filePath);
        return { success: true, data: retryData.buffer };
      } catch (retryError) {
        return { success: false, error: retryError.message };
      }
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    await fs.writeFile(filePath, Buffer.from(data));
    return { success: true };
  } catch (error) {
    console.error('Write file error:', error);
    // 检查是否是EPIPE相关错误
    if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
      console.log('File write interrupted by pipe error, retrying...');
      // 简单重试机制
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        await fs.writeFile(filePath, Buffer.from(data));
        return { success: true };
      } catch (retryError) {
        return { success: false, error: retryError.message };
      }
    }
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
    // Log environment info for debugging
    console.log('Environment info:', {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron
    });
    
    const dbPath = path.join(app.getPath('userData'), 'inventory.db');
    console.log('Database path:', dbPath);
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    await fs.mkdir(dbDir, { recursive: true });
    
    // 使用智能数据库适配器
    const smartDb = new SmartDatabase();
    db = await smartDb.initialize(dbPath);
    
    // 显示数据库信息
    const dbInfo = smartDb.getInfo();
    console.log('Database initialized:', dbInfo);

    // 生产环境安全检查
    if (app.isPackaged && dbInfo.type === 'mock') {
      console.error('🚨 CRITICAL: Production environment is using mock database!');
      dialog.showErrorBox(
        '严重错误：数据库连接失败',
        '生产环境无法连接到数据库，应用将退出以防止数据丢失。\n\n请检查数据库文件和权限设置。'
      );
      app.quit();
      return;
    }

    // 在开发模式下显示警告
    if (dbInfo.type === 'mock' && !app.isPackaged) {
      dialog.showMessageBox({
        type: 'warning',
        title: '数据库警告',
        message: '应用正在使用模拟数据库',
        detail: '由于原生数据库模块加载失败，当前使用的是内存模拟数据库。\n\n数据将不会被保存！',
        buttons: ['我知道了']
      });
    }

    // 验证数据库完整性
    if (dbInfo.type === 'sqlite3') {
      try {
        // 测试数据库写入能力
        const testStmt = db.prepare('CREATE TABLE IF NOT EXISTS _health_check (id INTEGER PRIMARY KEY, timestamp TEXT)');
        testStmt.run();

        const insertStmt = db.prepare('INSERT OR REPLACE INTO _health_check (id, timestamp) VALUES (1, ?)');
        insertStmt.run(new Date().toISOString());

        const selectStmt = db.prepare('SELECT timestamp FROM _health_check WHERE id = 1');
        const result = selectStmt.get();

        if (!result) {
          throw new Error('Database write test failed');
        }

        console.log('✅ Database health check passed');
      } catch (error) {
        console.error('🚨 Database health check failed:', error);
        if (app.isPackaged) {
          dialog.showErrorBox(
            '数据库健康检查失败',
            '数据库无法正常读写，应用将退出。\n\n错误信息：' + error.message
          );
          app.quit();
          return;
        }
      }
    }
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
        level INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
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

    // 执行数据库迁移
    await runDatabaseMigrations();

    // 检查数据库是否为空，如果是则导入mock数据
    await importMockDataIfEmpty();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Database initialization failed:', error);
    return Promise.reject(error);
  }
}

// 执行数据库迁移
async function runDatabaseMigrations() {
  try {
    console.log('Running database migrations...');

    // 检查 warehouses 表字段
    const warehouseTableInfo = db.prepare("PRAGMA table_info(warehouses)").all();
    const warehouseColumns = warehouseTableInfo.map(col => col.name);

    // 添加缺失的 is_active 字段
    if (!warehouseColumns.includes('is_active')) {
      console.log('Adding is_active field to warehouses table...');
      db.exec('ALTER TABLE warehouses ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1');
      console.log('is_active field added successfully');
    } else {
      console.log('warehouses table already has is_active field');
    }

    // 添加缺失的 location 字段
    if (!warehouseColumns.includes('location')) {
      console.log('Adding location field to warehouses table...');
      db.exec('ALTER TABLE warehouses ADD COLUMN location TEXT');
      console.log('location field added to warehouses table successfully');
    }

    // 检查 categories 表字段
    const categoryTableInfo = db.prepare("PRAGMA table_info(categories)").all();
    const categoryColumns = categoryTableInfo.map(col => col.name);

    // 添加缺失的 is_active 字段
    if (!categoryColumns.includes('is_active')) {
      console.log('Adding is_active field to categories table...');
      db.exec('ALTER TABLE categories ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1');
      console.log('is_active field added to categories table successfully');
    }

    // 添加缺失的 level 字段
    if (!categoryColumns.includes('level')) {
      console.log('Adding level field to categories table...');
      db.exec('ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1');
      console.log('level field added successfully');
    }

    // 添加缺失的 sort_order 字段
    if (!categoryColumns.includes('sort_order')) {
      console.log('Adding sort_order field to categories table...');
      db.exec('ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0');
      console.log('sort_order field added successfully');
    }
    
    // 检查 suppliers 表是否有 is_active 字段
    const supplierTableInfo = db.prepare("PRAGMA table_info(suppliers)").all();
    const supplierHasIsActive = supplierTableInfo.some(column => column.name === 'is_active');
    
    if (!supplierHasIsActive) {
      console.log('Adding is_active field to suppliers table...');
      db.exec('ALTER TABLE suppliers ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1');
      console.log('is_active field added to suppliers table successfully');
    }

    // 检查 inventory_items 表字段
    const inventoryTableInfo = db.prepare("PRAGMA table_info(inventory_items)").all();
    const inventoryColumns = inventoryTableInfo.map(col => col.name);
    
    // 添加缺失的 unit_id 字段
    if (!inventoryColumns.includes('unit_id')) {
      console.log('Adding unit_id field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN unit_id TEXT');
      console.log('unit_id field added successfully');
    }
    
    // 添加缺失的 brand 字段
    if (!inventoryColumns.includes('brand')) {
      console.log('Adding brand field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN brand TEXT');
      console.log('brand field added successfully');
    }
    
    // 添加缺失的 model 字段
    if (!inventoryColumns.includes('model')) {
      console.log('Adding model field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN model TEXT');
      console.log('model field added successfully');
    }
    
    // 添加缺失的 barcode 字段
    if (!inventoryColumns.includes('barcode')) {
      console.log('Adding barcode field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN barcode TEXT');
      console.log('barcode field added successfully');
    }
    
    // 添加缺失的 purchase_price 字段
    if (!inventoryColumns.includes('purchase_price')) {
      console.log('Adding purchase_price field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN purchase_price REAL DEFAULT 0');
      console.log('purchase_price field added successfully');
    }
    
    // 添加缺失的 is_active 字段
    if (!inventoryColumns.includes('is_active')) {
      console.log('Adding is_active field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1');
      console.log('is_active field added successfully');
    }
    
    // 添加缺失的 images 字段（使用TEXT存储JSON字符串）
    if (!inventoryColumns.includes('images')) {
      console.log('Adding images field to inventory_items table...');
      db.exec('ALTER TABLE inventory_items ADD COLUMN images TEXT');
      console.log('images field added successfully');
    }

    console.log('Database migrations completed');
  } catch (error) {
    console.error('Database migration failed:', error);
    // 不抛出错误，让应用继续运行
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

    // 首先确保有默认管理员用户
    await createDefaultAdminUser();

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

// 创建默认管理员用户
async function createDefaultAdminUser() {
  try {
    // 检查是否已有admin用户
    const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    if (adminUser) {
      console.log('Admin user already exists, checking password format...');

      // 如果密码是加密的（bcrypt格式），更新为明文
      if (adminUser.password && adminUser.password.startsWith('$2b$')) {
        console.log('Updating admin password to plain text for development...');
        db.prepare('UPDATE users SET password = ? WHERE username = ?').run('123456', 'admin');
        console.log('Admin password updated to plain text: admin/123456');
      } else {
        console.log('Admin user password is already in plain text format');
      }
      return;
    }

    console.log('Creating default admin user...');
    const adminId = generateId();
    const timestamp = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (
        id, username, password, nickname, email, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      adminId,
      'admin',
      '123456', // 默认密码，使用明文以便认证
      '系统管理员',
      'admin@system.com',
      'admin',
      'active',
      timestamp,
      timestamp
    );

    console.log('Default admin user created: admin/123456');
  } catch (error) {
    console.error('Failed to create default admin user:', error);
  }
}

// Database IPC handlers
// 清理已存在的处理器，避免重复注册
ipcMain.removeHandler('db-initialize');
ipcMain.removeHandler('db-get-all-items');
ipcMain.removeHandler('db-reimport-units');

ipcMain.handle('db-initialize', async () => {
  try {
    // 数据库已在应用启动时初始化，这里只需要确认状态
    if (!db) {
      await initializeDatabase();
      setupDatabaseHandlers(ipcMain, db);
    }
    return { success: true };
  } catch (error) {
    console.error('Database initialization failed:', error);
    return { success: false, error: error.message };
  }
});

// 重复的处理器已移除 - 现在由模块化的处理器管理
// db-get-all-items 和 db-reimport-units 现在在 inventoryHandlers.js 和 unitHandlers.js 中处理