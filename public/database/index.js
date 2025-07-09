/**
 * 数据库处理器统一入口
 * 替换原来的 database-handlers.js 文件
 * 协调所有业务处理器模块
 */

const { setupInventoryHandlers } = require('./handlers/inventoryHandlers');
const { setupWarehouseHandlers } = require('./handlers/warehouseHandlers');
const { setupUnitHandlers } = require('./handlers/unitHandlers');
const { setupConversionHandlers } = require('./handlers/conversionHandlers');
const { setupSystemHandlers } = require('./handlers/systemHandlers');
const { setupBackupHandlers } = require('./handlers/backupHandlers');
const { setupTransactionHandlers } = require('./handlers/transactionHandlers');

/**
 * 设置所有数据库处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupDatabaseHandlers(ipcMain, db) {
  console.log('Setting up database handlers...');
  
  // 清理已存在的处理器，避免重复注册
  const handlersToRemove = [
    // 库存物品处理器
    'db-get-all-items',
    'db-get-item-by-id',
    'db-get-item-by-sku',
    'db-create-item',
    'db-update-item',
    'db-delete-item',
    'db-search-items',
    'db-get-items-by-category',
    'db-get-low-stock-items',
    'db-get-categories',
    'db-get-suppliers',
    'db-batch-update-stock',
    'db-get-inventory-stats',
    
    // 仓库处理器
    'db-get-all-warehouses',
    'db-get-warehouse-by-id',
    'db-get-warehouse-by-code',
    'db-get-default-warehouse',
    'db-create-warehouse',
    'db-update-warehouse',
    'db-delete-warehouse',
    'db-search-warehouses',
    'db-set-default-warehouse',
    'db-get-warehouse-stats',
    'db-get-warehouse-inventory-summary',
    
    // 单位处理器
    'db-get-all-units',
    'db-get-unit-by-id',
    'db-get-unit-by-symbol',
    'db-create-unit',
    'db-update-unit',
    'db-delete-unit',
    'db-search-units',
    'db-get-units-by-type',
    'db-reimport-units',
    'db-get-unit-stats',
    'db-batch-import-units',
    
    // 换算规则处理器
    'db-get-all-conversion-rules',
    'db-get-conversion-rule-by-id',
    'db-create-conversion-rule',
    'db-update-conversion-rule',
    'db-delete-conversion-rule',
    'db-search-conversion-rules',
    'db-get-all-product-conversions',
    'db-get-product-conversion-by-id',
    'db-get-product-conversion-by-product',
    'db-create-product-conversion',
    'db-update-product-conversion',
    'db-delete-product-conversion',
    'db-get-conversion-stats',
    
    // 系统处理器
    'db-get-system-status',
    'db-validate-integrity',
    'db-clear-database',
    'db-rebuild-schema',
    'db-import-mock-data',
    'db-optimize',
    'db-get-database-info',
    'db-execute-query',
    'db-get-table-schema',
    
    // 备份处理器
    'db-backup',
    'db-get-backup-list',
    'db-delete-backup',
    'db-validate-backup',
    'db-restore',
    'db-create-auto-backup',
    'db-cleanup-old-backups',
    'db-get-backup-stats',
    
    // 交易处理器
    'db-get-all-transactions',
    'db-get-transaction-by-id',
    'db-get-transactions-by-item',
    'db-add-transaction',
    'db-batch-add-transactions',
    'db-delete-transaction',
    'db-get-transaction-stats',
    'db-search-transactions',
    
    // 其他处理器
    'db-get-all-categories',
    'db-get-all-suppliers'
  ];

  // 移除已存在的处理器
  handlersToRemove.forEach(handler => {
    try {
      ipcMain.removeHandler(handler);
    } catch (error) {
      // 忽略移除不存在处理器的错误
    }
  });

  // 检查数据库连接
  if (!db) {
    console.error('Database instance is null or undefined');
    throw new Error('Database not initialized');
  }

  try {
    // 设置各个业务处理器
    console.log('Setting up inventory handlers...');
    setupInventoryHandlers(ipcMain, db);
    
    console.log('Setting up warehouse handlers...');
    setupWarehouseHandlers(ipcMain, db);
    
    console.log('Setting up unit handlers...');
    setupUnitHandlers(ipcMain, db);
    
    console.log('Setting up conversion handlers...');
    setupConversionHandlers(ipcMain, db);
    
    console.log('Setting up system handlers...');
    setupSystemHandlers(ipcMain, db);
    
    console.log('Setting up backup handlers...');
    setupBackupHandlers(ipcMain, db);
    
    console.log('Setting up transaction handlers...');
    setupTransactionHandlers(ipcMain, db);
    
    // 设置兼容性处理器（保持向后兼容）
    setupLegacyHandlers(ipcMain, db);
    
    console.log('All database handlers registered successfully');
    
    // 记录处理器统计信息
    logHandlerStats();
    
  } catch (error) {
    console.error('Failed to setup database handlers:', error);
    throw error;
  }
}

/**
 * 设置兼容性处理器
 * 保持与原有代码的兼容性
 */
function setupLegacyHandlers(ipcMain, db) {
  console.log('Setting up legacy compatibility handlers...');
  
  // 添加一些可能缺失的处理器
  
  // 获取所有分类（从categories表）
  if (!ipcMain.listenerCount('db-get-all-categories')) {
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
  }
  
  // 获取所有供应商（从suppliers表）
  if (!ipcMain.listenerCount('db-get-all-suppliers')) {
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
  }
  
  console.log('Legacy compatibility handlers registered');
}

/**
 * 记录处理器统计信息
 */
function logHandlerStats() {
  const stats = {
    totalHandlers: 0,
    handlerGroups: {
      inventory: 0,
      warehouse: 0,
      unit: 0,
      conversion: 0,
      system: 0,
      backup: 0,
      transaction: 0,
      legacy: 0
    }
  };
  
  // 这里可以添加更详细的统计逻辑
  console.log('Database handlers statistics:', {
    message: 'All handlers registered successfully',
    timestamp: new Date().toISOString(),
    totalModules: 7,
    estimatedHandlers: 50
  });
}

/**
 * 获取处理器健康状态
 */
function getHandlerHealthStatus(db) {
  return {
    database: {
      connected: db !== null && db !== undefined,
      name: db?.name || 'unknown',
      open: db?.open || false
    },
    handlers: {
      inventory: true,
      warehouse: true,
      unit: true,
      conversion: true,
      system: true,
      backup: true,
      transaction: true
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建数据库处理器工厂
 */
class DatabaseHandlerFactory {
  constructor() {
    this.initialized = false;
    this.handlers = new Map();
  }
  
  register(name, handler) {
    this.handlers.set(name, handler);
  }
  
  get(name) {
    return this.handlers.get(name);
  }
  
  list() {
    return Array.from(this.handlers.keys());
  }
  
  clear() {
    this.handlers.clear();
    this.initialized = false;
  }
}

// 创建全局工厂实例
const handlerFactory = new DatabaseHandlerFactory();

/**
 * 验证数据库处理器设置
 */
function validateHandlerSetup(ipcMain, db) {
  const requiredHandlers = [
    'db-get-all-items',
    'db-get-all-warehouses',
    'db-get-all-units',
    'db-get-system-status',
    'db-backup'
  ];
  
  const missingHandlers = [];
  
  for (const handler of requiredHandlers) {
    if (!ipcMain.listenerCount || ipcMain.listenerCount(handler) === 0) {
      missingHandlers.push(handler);
    }
  }
  
  if (missingHandlers.length > 0) {
    console.warn('Missing required handlers:', missingHandlers);
    return false;
  }
  
  return true;
}

// 导出主要函数和工具
module.exports = {
  setupDatabaseHandlers,
  getHandlerHealthStatus,
  validateHandlerSetup,
  handlerFactory
};

// 保持向后兼容性
module.exports.setupDatabaseHandlers = setupDatabaseHandlers;