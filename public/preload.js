const { contextBridge, ipcRenderer } = require('electron');

// Expose file operations to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialog operations
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // File I/O operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),

  // Directory operations for logging service
  mkdir: (dirPath, options) => ipcRenderer.invoke('mkdir', dirPath, options),
  stat: (filePath) => ipcRenderer.invoke('stat', filePath),
  readdir: (dirPath) => ipcRenderer.invoke('readdir', dirPath),
  rename: (oldPath, newPath) => ipcRenderer.invoke('rename', oldPath, newPath),
  unlink: (filePath) => ipcRenderer.invoke('unlink', filePath),
  
  // System paths
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),
  
  // Database operations
  dbInitialize: () => ipcRenderer.invoke('db-initialize'),
  dbGetAllItems: () => ipcRenderer.invoke('db-get-all-items'),
  dbGetItemById: (id) => ipcRenderer.invoke('db-get-item-by-id', id),
  dbGetItemBySku: (sku) => ipcRenderer.invoke('db-get-item-by-sku', sku),
  dbCreateItem: (item) => ipcRenderer.invoke('db-create-item', item),
  dbUpdateItem: (id, updates) => ipcRenderer.invoke('db-update-item', id, updates),
  dbDeleteItem: (id) => ipcRenderer.invoke('db-delete-item', id),
  dbSearchItems: (searchTerm) => ipcRenderer.invoke('db-search-items', searchTerm),
  dbGetItemsByCategory: (category) => ipcRenderer.invoke('db-get-items-by-category', category),
  dbGetLowStockItems: () => ipcRenderer.invoke('db-get-low-stock-items'),
  dbGetCategories: () => ipcRenderer.invoke('db-get-categories'),
  dbGetSuppliers: () => ipcRenderer.invoke('db-get-suppliers'),
  dbGetAllCategories: () => ipcRenderer.invoke('db-get-all-categories'),
  dbGetAllSuppliers: () => ipcRenderer.invoke('db-get-all-suppliers'),
  dbCreateCategory: (category) => ipcRenderer.invoke('db-create-category', category),
  dbUpdateCategory: (id, updates) => ipcRenderer.invoke('db-update-category', id, updates),
  dbDeleteCategory: (id) => ipcRenderer.invoke('db-delete-category', id),
  dbCreateSupplier: (supplier) => ipcRenderer.invoke('db-create-supplier', supplier),
  dbUpdateSupplier: (id, updates) => ipcRenderer.invoke('db-update-supplier', id, updates),
  dbDeleteSupplier: (id) => ipcRenderer.invoke('db-delete-supplier', id),
  dbGetAllTransactions: () => ipcRenderer.invoke('db-get-all-transactions'),
  dbAddTransaction: (transaction) => ipcRenderer.invoke('db-add-transaction', transaction),
  
  // Warehouse operations
  dbGetWarehouses: () => ipcRenderer.invoke('db-get-warehouses'),
  dbGetAllWarehouses: () => ipcRenderer.invoke('db-get-all-warehouses'),
  dbGetWarehouseById: (id) => ipcRenderer.invoke('db-get-warehouse-by-id', id),
  dbGetWarehouseByCode: (code) => ipcRenderer.invoke('db-get-warehouse-by-code', code),
  dbGetDefaultWarehouse: () => ipcRenderer.invoke('db-get-default-warehouse'),
  dbCreateWarehouse: (warehouse) => ipcRenderer.invoke('db-create-warehouse', warehouse),
  dbUpdateWarehouse: (id, updates) => ipcRenderer.invoke('db-update-warehouse', id, updates),
  dbDeleteWarehouse: (id) => ipcRenderer.invoke('db-delete-warehouse', id),
  dbSetDefaultWarehouse: (id) => ipcRenderer.invoke('db-set-default-warehouse', id),
  dbGetWarehouseStats: () => ipcRenderer.invoke('db-get-warehouse-stats'),
  dbSearchWarehouses: (searchTerm) => ipcRenderer.invoke('db-search-warehouses', searchTerm),
  
  // Unit operations
  dbGetUnits: () => ipcRenderer.invoke('db-get-units'),
  dbGetAllUnits: () => ipcRenderer.invoke('db-get-all-units'),
  dbGetUnitById: (id) => ipcRenderer.invoke('db-get-unit-by-id', id),
  dbGetUnitBySymbol: (symbol) => ipcRenderer.invoke('db-get-unit-by-symbol', symbol),
  dbCreateUnit: (unit) => ipcRenderer.invoke('db-create-unit', unit),
  dbUpdateUnit: (id, updates) => ipcRenderer.invoke('db-update-unit', id, updates),
  dbDeleteUnit: (id) => ipcRenderer.invoke('db-delete-unit', id),
  dbSearchUnits: (searchTerm) => ipcRenderer.invoke('db-search-units', searchTerm),
  dbReimportUnits: () => ipcRenderer.invoke('db-reimport-units'),

  // Global conversion rules operations
  dbGetAllConversionRules: () => ipcRenderer.invoke('db-get-all-conversion-rules'),
  dbGetConversionRuleById: (options) => ipcRenderer.invoke('db-get-conversion-rule-by-id', options),
  dbCreateConversionRule: (ruleData) => ipcRenderer.invoke('db-create-conversion-rule', ruleData),
  dbUpdateConversionRule: (options) => ipcRenderer.invoke('db-update-conversion-rule', options),
  dbDeleteConversionRule: (options) => ipcRenderer.invoke('db-delete-conversion-rule', options),
  dbSearchConversionRules: (searchTerm) => ipcRenderer.invoke('db-search-conversion-rules', searchTerm),

  // Product conversion settings operations
  dbGetAllProductConversions: () => ipcRenderer.invoke('db-get-all-product-conversions'),
  dbGetProductConversionById: (options) => ipcRenderer.invoke('db-get-product-conversion-by-id', options),
  dbGetProductConversionByProduct: (options) => ipcRenderer.invoke('db-get-product-conversion-by-product', options),
  dbCreateProductConversion: (settingData) => ipcRenderer.invoke('db-create-product-conversion', settingData),
  dbUpdateProductConversion: (options) => ipcRenderer.invoke('db-update-product-conversion', options),
  dbDeleteProductConversion: (options) => ipcRenderer.invoke('db-delete-product-conversion', options),

  // User operations
  dbGetUsers: () => ipcRenderer.invoke('db-get-users'),
  dbGetAllUsers: () => ipcRenderer.invoke('db-get-all-users'),
  dbCreateUser: (user) => ipcRenderer.invoke('db-create-user', user),
  dbUpdateUser: (id, updates) => ipcRenderer.invoke('db-update-user', id, updates),
  dbDeleteUser: (id) => ipcRenderer.invoke('db-delete-user', id),
  dbAuthenticateUser: (username, password) => ipcRenderer.invoke('db-authenticate-user', username, password),

  // Customer operations
  dbGetAllCustomers: () => ipcRenderer.invoke('db-get-all-customers'),
  dbGetCustomerById: (id) => ipcRenderer.invoke('db-get-customer-by-id', id),
  dbCreateCustomer: (customer) => ipcRenderer.invoke('db-create-customer', customer),
  dbUpdateCustomer: (id, updates) => ipcRenderer.invoke('db-update-customer', id, updates),
  dbDeleteCustomer: (id) => ipcRenderer.invoke('db-delete-customer', id),
  dbSearchCustomers: (searchTerm) => ipcRenderer.invoke('db-search-customers', searchTerm),

  // Financial operations
  dbGetAccountsReceivable: () => ipcRenderer.invoke('db-get-accounts-receivable'),
  dbGetAccountsPayable: () => ipcRenderer.invoke('db-get-accounts-payable'),
  dbGetPaymentRecords: () => ipcRenderer.invoke('db-get-payment-records'),

  // Inventory stock operations
  dbGetAllInventoryStocks: () => ipcRenderer.invoke('db-get-all-inventory-stocks'),

  // 底层数据库操作（注意：后续应该移除这些直接访问方法）
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  dbGet: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
  dbAll: (sql, params) => ipcRenderer.invoke('db-all', sql, params),
  
  // 事务操作
  dbBeginTransaction: () => ipcRenderer.invoke('db-begin-transaction'),
  dbCommit: () => ipcRenderer.invoke('db-commit'),
  dbRollback: () => ipcRenderer.invoke('db-rollback'),
  
  // System initialization and backup operations
  dbBackup: (options) => ipcRenderer.invoke('db-backup', options),
  dbGetBackupList: () => ipcRenderer.invoke('db-get-backup-list'),
  dbDeleteBackup: (options) => ipcRenderer.invoke('db-delete-backup', options),
  dbRestore: (options) => ipcRenderer.invoke('db-restore', options),
  dbValidateBackup: (options) => ipcRenderer.invoke('db-validate-backup', options),
  dbClearDatabase: (options) => ipcRenderer.invoke('db-clear-database', options),
  dbRebuildSchema: () => ipcRenderer.invoke('db-rebuild-schema'),
  dbImportBuiltinData: () => ipcRenderer.invoke('db-import-builtin-data'),
  dbGetSystemStatus: () => ipcRenderer.invoke('db-get-system-status'),
  dbValidateIntegrity: () => ipcRenderer.invoke('db-validate-integrity'),

  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }
});

console.log('Preload script loaded successfully');