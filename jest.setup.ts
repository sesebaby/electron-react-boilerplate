// Jest setup for comprehensive testing environment
import '@testing-library/jest-dom';
import type { ElectronAPI, DatabaseResult } from './src/types/electronAPI';

// Enhanced mock for ElectronAPI with proper types
const createMockDatabaseResult = <T>(data: T): DatabaseResult<T> => ({
  success: true,
  data,
  summary: {
    totalRecords: Array.isArray(data) ? data.length : 1,
    processedRecords: Array.isArray(data) ? data.length : 1,
    errorRecords: 0,
    processingTime: 10
  }
});

const mockElectronAPI: ElectronAPI = {
  // File operations
  showOpenDialog: jest.fn().mockResolvedValue({ canceled: false, filePaths: ['test.txt'] }),
  showSaveDialog: jest.fn().mockResolvedValue({ canceled: false, filePath: 'test.txt' }),
  readFile: jest.fn().mockResolvedValue(createMockDatabaseResult('test content')),
  writeFile: jest.fn().mockResolvedValue({ success: true, path: 'test.txt', size: 100 }),
  
  // System operations
  getAppPath: jest.fn().mockResolvedValue({ path: '/app/test' }),
  mkdir: jest.fn().mockResolvedValue({ success: true, path: '/app/test' }),
  stat: jest.fn().mockResolvedValue(createMockDatabaseResult({
    isFile: true,
    isDirectory: false,
    size: 1024,
    mtime: new Date(),
    ctime: new Date()
  })),
  
  // Database - Categories
  dbGetAllCategories: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Test Category', description: 'Test Description', isActive: true }
  ])),
  dbCreateCategory: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Category' })),
  dbUpdateCategory: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Category' })),
  dbDeleteCategory: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetCategoryById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Category' })),
  dbGetCategoryStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 10, active: 8, inactive: 2 })),
  
  // Database - Units
  dbGetAllUnits: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Piece', symbol: 'pcs', isActive: true }
  ])),
  dbCreateUnit: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Piece' })),
  dbUpdateUnit: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Unit' })),
  dbDeleteUnit: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetUnitById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Piece' })),
  dbGetUnitStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 5, active: 5, inactive: 0 })),
  
  // Database - Warehouses
  dbGetAllWarehouses: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Main Warehouse', location: 'Building A', isActive: true, isDefault: true }
  ])),
  dbCreateWarehouse: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Warehouse' })),
  dbUpdateWarehouse: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Warehouse' })),
  dbDeleteWarehouse: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetWarehouseById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Warehouse' })),
  dbGetWarehouseStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 3, active: 3, inactive: 0 })),
  dbGetDefaultWarehouse: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Default Warehouse', isDefault: true })),
  
  // Database - Suppliers
  dbGetAllSuppliers: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Test Supplier', contactInfo: 'test@supplier.com', isActive: true }
  ])),
  dbCreateSupplier: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Supplier' })),
  dbUpdateSupplier: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Supplier' })),
  dbDeleteSupplier: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetSupplierById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Supplier' })),
  dbGetSupplierStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 15, active: 12, inactive: 3 })),
  
  // Database - Customers
  dbGetAllCustomers: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Test Customer', contactInfo: 'test@customer.com', isActive: true }
  ])),
  dbCreateCustomer: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Customer' })),
  dbUpdateCustomer: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Customer' })),
  dbDeleteCustomer: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetCustomerById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Customer' })),
  dbGetCustomerStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 25, active: 20, inactive: 5 })),
  
  // Database - Users
  dbGetAllUsers: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', username: 'testuser', email: 'test@user.com', isActive: true }
  ])),
  dbCreateUser: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', username: 'testuser' })),
  dbUpdateUser: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', username: 'updated-user' })),
  dbDeleteUser: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetUserById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', username: 'testuser' })),
  dbGetUserStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 5, active: 4, inactive: 1 })),
  
  // Database - Products
  dbGetAllProducts: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Test Product', sku: 'TEST001', categoryId: '1', unitId: '1', isActive: true }
  ])),
  dbCreateProduct: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Product' })),
  dbUpdateProduct: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Updated Product' })),
  dbDeleteProduct: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetProductById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', name: 'Test Product' })),
  dbGetProductStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 100, active: 85, inactive: 15 })),
  dbGetProductsByCategory: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', name: 'Product 1', categoryId: '1' }
  ])),
  
  // Database - Inventory
  dbGetAllInventoryItems: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', productId: '1', warehouseId: '1', currentStock: 100, availableStock: 90, reservedStock: 10 }
  ])),
  dbGetInventoryByProduct: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { warehouseId: '1', currentStock: 100 }
  ])),
  dbGetInventoryByWarehouse: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { productId: '1', currentStock: 100 }
  ])),
  dbUpdateInventoryStock: jest.fn().mockResolvedValue(createMockDatabaseResult({ success: true })),
  dbGetInventoryStats: jest.fn().mockResolvedValue(createMockDatabaseResult({
    totalStocks: 1000,
    totalTransactions: 500,
    lowStockCount: 10,
    totalValue: 50000,
    total: 100
  })),
  dbGetLowStockItems: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { productId: '1', currentStock: 5, minStock: 10 }
  ])),
  
  // Database - Transactions
  dbCreateInventoryTransaction: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', type: 'inbound' })),
  dbGetInventoryTransactions: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', type: 'inbound', quantity: 50, date: new Date() }
  ])),
  dbGetTransactionsByProduct: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { id: '1', type: 'inbound', quantity: 50 }
  ])),
  
  // Mock all other database operations with generic responses
  dbGetAllPurchaseOrders: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreatePurchaseOrder: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdatePurchaseOrder: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeletePurchaseOrder: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetPurchaseOrderById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetPurchaseOrderStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0, totalValue: 0, pendingCount: 0, completedCount: 0 })),
  
  dbGetAllPurchaseReceipts: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreatePurchaseReceipt: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdatePurchaseReceipt: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeletePurchaseReceipt: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetPurchaseReceiptById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetPurchaseReceiptStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0, totalValue: 0, pendingCount: 0, completedCount: 0 })),
  
  dbGetAllSalesOrders: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateSalesOrder: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateSalesOrder: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteSalesOrder: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetSalesOrderById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetSalesOrderStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0, totalValue: 0, pendingCount: 0, completedCount: 0 })),
  
  dbGetAllSalesDeliveries: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateSalesDelivery: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateSalesDelivery: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteSalesDelivery: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetSalesDeliveryById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetSalesDeliveryStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0, totalValue: 0, pendingCount: 0, completedCount: 0 })),
  
  dbGetAllAccountsPayable: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateAccountPayable: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateAccountPayable: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteAccountPayable: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetAccountPayableById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetAccountsPayableStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0 })),
  
  dbGetAllAccountsReceivable: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateAccountReceivable: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateAccountReceivable: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteAccountReceivable: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetAccountReceivableById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetAccountsReceivableStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0 })),
  
  dbGetSystemConfig: jest.fn().mockResolvedValue(createMockDatabaseResult({ theme: 'light', language: 'zh-CN' })),
  dbUpdateSystemConfig: jest.fn().mockResolvedValue(createMockDatabaseResult({ success: true })),
  dbGetSystemStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ version: '1.0.0', uptime: 3600 })),
  
  dbBackupData: jest.fn().mockResolvedValue(createMockDatabaseResult({ filePath: '/backup/test.sql', size: 1024 })),
  dbRestoreData: jest.fn().mockResolvedValue(createMockDatabaseResult({ success: true })),
  dbGetBackupList: jest.fn().mockResolvedValue(createMockDatabaseResult([
    { name: 'backup_2024_01_01.sql', size: 1024, date: new Date() }
  ])),
  
  dbInitializeDatabase: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbCheckDatabaseIntegrity: jest.fn().mockResolvedValue(createMockDatabaseResult({ valid: true, issues: [] })),
  dbCleanupDatabase: jest.fn().mockResolvedValue(createMockDatabaseResult({ success: true })),
  
  dbGetAllGlobalConversions: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateGlobalConversion: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateGlobalConversion: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteGlobalConversion: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  
  dbGetAllProductConversions: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateProductConversion: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateProductConversion: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteProductConversion: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetProductConversionByProductId: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1', productId: '1' })),
  
  dbGetAllMonthlyBalances: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreateMonthlyBalance: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdateMonthlyBalance: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeleteMonthlyBalance: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetMonthlyBalanceById: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbGetMonthlyBalanceStats: jest.fn().mockResolvedValue(createMockDatabaseResult({ total: 0 })),
  dbGenerateMonthlyBalance: jest.fn().mockResolvedValue(createMockDatabaseResult({ success: true })),
  
  dbGetAllPermissions: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbCreatePermission: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbUpdatePermission: jest.fn().mockResolvedValue(createMockDatabaseResult({ id: '1' })),
  dbDeletePermission: jest.fn().mockResolvedValue(createMockDatabaseResult(true)),
  dbGetUserPermissions: jest.fn().mockResolvedValue(createMockDatabaseResult([])),
  dbSetUserPermissions: jest.fn().mockResolvedValue(createMockDatabaseResult(true))
};

// Mock window.electronAPI for Electron environment tests
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock URL for testing
const mockURL = {
  createObjectURL: jest.fn(() => 'mock-object-url'),
  revokeObjectURL: jest.fn()
};
Object.defineProperty(window, 'URL', {
  value: mockURL,
  writable: true,
  configurable: true
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  writable: true,
  configurable: true
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  value: MockIntersectionObserver,
  writable: true,
  configurable: true
});

// Mock console methods to avoid noise during tests
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  log: console.log
};

// Suppress console output during tests unless VERBOSE_TESTS is set
if (!process.env.VERBOSE_TESTS) {
  console.debug = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  // Keep error for debugging test failures
  // console.error = jest.fn();
}

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-1234-5678-9012'),
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  },
  writable: true,
  configurable: true
});

// Export mocks for use in specific tests
export { originalConsole };
export { mockElectronAPI };
export { localStorageMock };
export { createMockDatabaseResult };

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  // Reset specific mock implementations if needed
});

// Global error handling for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});