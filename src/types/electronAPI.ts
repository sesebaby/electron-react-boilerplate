/**
 * Electron API 类型定义
 * 提供安全的 IPC 通信类型定义
 */

// =============== 基础类型 ===============

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  warnings?: string[];
  summary?: {
    totalRecords: number;
    processedRecords: number;
    errorRecords: number;
    processingTime: number;
  };
}

export interface FileOperationResult {
  success: boolean;
  path?: string;
  size?: number;
  error?: string;
}

export interface AppPathName {
  name: 'userData' | 'temp' | 'appData' | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | 'home';
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections' | 'showHiddenFiles' | 'createDirectory' | 'promptToCreate'>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  properties?: Array<'showHiddenFiles' | 'createDirectory' | 'showOverwriteConfirmation'>;
}

export interface OpenDialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogResult {
  canceled: boolean;
  filePath?: string;
}

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
  ctime: Date;
}

// =============== 数据库操作类型 ===============

// 实体相关操作
export interface CreateItemRequest {
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  unitId: string;
  brand?: string;
  model?: string;
  barcode?: string;
  minStock?: number;
  maxStock?: number;
  status: string;
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

// 统计信息类型
export interface EntityStats {
  total: number;
  active?: number;
  inactive?: number;
  lastUpdated?: Date;
}

export interface InventoryStats extends EntityStats {
  totalStocks: number;
  totalTransactions: number;
  lowStockCount: number;
  totalValue: number;
}

export interface OrderStats extends EntityStats {
  totalValue: number;
  pendingCount: number;
  completedCount: number;
}

// =============== Electron API 接口定义 ===============

export interface ElectronAPI {
  // =============文件操作=============
  showOpenDialog(options?: OpenDialogOptions): Promise<OpenDialogResult>;
  showSaveDialog(options?: SaveDialogOptions): Promise<SaveDialogResult>;
  readFile(filePath: string): Promise<DatabaseResult<string>>;
  writeFile(filePath: string, content: string): Promise<FileOperationResult>;
  
  // =============系统操作=============
  getAppPath(name?: AppPathName['name']): Promise<{ path: string }>;
  mkdir(dirPath: string): Promise<FileOperationResult>;
  stat(filePath: string): Promise<DatabaseResult<FileStats>>;
  
  // =============数据库 - 基础操作=============
  
  // 分类管理
  dbGetAllCategories(): Promise<DatabaseResult<any[]>>;
  dbCreateCategory(category: any): Promise<DatabaseResult<any>>;
  dbUpdateCategory(id: string, category: any): Promise<DatabaseResult<any>>;
  dbDeleteCategory(id: string): Promise<DatabaseResult<boolean>>;
  dbGetCategoryById(id: string): Promise<DatabaseResult<any>>;
  dbGetCategoryStats(): Promise<DatabaseResult<EntityStats>>;
  
  // 单位管理
  dbGetAllUnits(): Promise<DatabaseResult<any[]>>;
  dbCreateUnit(unit: any): Promise<DatabaseResult<any>>;
  dbUpdateUnit(id: string, unit: any): Promise<DatabaseResult<any>>;
  dbDeleteUnit(id: string): Promise<DatabaseResult<boolean>>;
  dbGetUnitById(id: string): Promise<DatabaseResult<any>>;
  dbGetUnitStats(): Promise<DatabaseResult<EntityStats>>;
  
  // 仓库管理
  dbGetAllWarehouses(): Promise<DatabaseResult<any[]>>;
  dbCreateWarehouse(warehouse: any): Promise<DatabaseResult<any>>;
  dbUpdateWarehouse(id: string, warehouse: any): Promise<DatabaseResult<any>>;
  dbDeleteWarehouse(id: string): Promise<DatabaseResult<boolean>>;
  dbGetWarehouseById(id: string): Promise<DatabaseResult<any>>;
  dbGetWarehouseStats(): Promise<DatabaseResult<EntityStats>>;
  dbGetDefaultWarehouse(): Promise<DatabaseResult<any>>;
  
  // 供应商管理
  dbGetAllSuppliers(): Promise<DatabaseResult<any[]>>;
  dbCreateSupplier(supplier: any): Promise<DatabaseResult<any>>;
  dbUpdateSupplier(id: string, supplier: any): Promise<DatabaseResult<any>>;
  dbDeleteSupplier(id: string): Promise<DatabaseResult<boolean>>;
  dbGetSupplierById(id: string): Promise<DatabaseResult<any>>;
  dbGetSupplierStats(): Promise<DatabaseResult<EntityStats>>;
  
  // 客户管理
  dbGetAllCustomers(): Promise<DatabaseResult<any[]>>;
  dbCreateCustomer(customer: any): Promise<DatabaseResult<any>>;
  dbUpdateCustomer(id: string, customer: any): Promise<DatabaseResult<any>>;
  dbDeleteCustomer(id: string): Promise<DatabaseResult<boolean>>;
  dbGetCustomerById(id: string): Promise<DatabaseResult<any>>;
  dbGetCustomerStats(): Promise<DatabaseResult<EntityStats>>;
  
  // 用户管理
  dbGetAllUsers(): Promise<DatabaseResult<any[]>>;
  dbCreateUser(user: any): Promise<DatabaseResult<any>>;
  dbUpdateUser(id: string, user: any): Promise<DatabaseResult<any>>;
  dbDeleteUser(id: string): Promise<DatabaseResult<boolean>>;
  dbGetUserById(id: string): Promise<DatabaseResult<any>>;
  dbGetUserStats(): Promise<DatabaseResult<EntityStats>>;
  
  // =============数据库 - 库存管理=============
  
  // 产品管理
  dbGetAllProducts(): Promise<DatabaseResult<any[]>>;
  dbCreateProduct(product: CreateItemRequest): Promise<DatabaseResult<any>>;
  dbUpdateProduct(id: string, product: UpdateItemRequest): Promise<DatabaseResult<any>>;
  dbDeleteProduct(id: string): Promise<DatabaseResult<boolean>>;
  dbGetProductById(id: string): Promise<DatabaseResult<any>>;
  dbGetProductStats(): Promise<DatabaseResult<EntityStats>>;
  dbGetProductsByCategory(categoryId: string): Promise<DatabaseResult<any[]>>;
  
  // 库存管理
  dbGetAllInventoryItems(): Promise<DatabaseResult<any[]>>;
  dbGetInventoryByProduct(productId: string): Promise<DatabaseResult<any[]>>;
  dbGetInventoryByWarehouse(warehouseId: string): Promise<DatabaseResult<any[]>>;
  dbUpdateInventoryStock(productId: string, warehouseId: string, quantity: number): Promise<DatabaseResult<any>>;
  dbGetInventoryStats(): Promise<DatabaseResult<InventoryStats>>;
  dbGetLowStockItems(): Promise<DatabaseResult<any[]>>;
  
  // 库存交易
  dbCreateInventoryTransaction(transaction: any): Promise<DatabaseResult<any>>;
  dbGetInventoryTransactions(params?: QueryParams): Promise<DatabaseResult<any[]>>;
  dbGetTransactionsByProduct(productId: string): Promise<DatabaseResult<any[]>>;
  
  // =============数据库 - 业务流程=============
  
  // 采购订单
  dbGetAllPurchaseOrders(): Promise<DatabaseResult<any[]>>;
  dbCreatePurchaseOrder(order: any): Promise<DatabaseResult<any>>;
  dbUpdatePurchaseOrder(id: string, order: any): Promise<DatabaseResult<any>>;
  dbDeletePurchaseOrder(id: string): Promise<DatabaseResult<boolean>>;
  dbGetPurchaseOrderById(id: string): Promise<DatabaseResult<any>>;
  dbGetPurchaseOrderStats(): Promise<DatabaseResult<OrderStats>>;
  
  // 采购收货
  dbGetAllPurchaseReceipts(): Promise<DatabaseResult<any[]>>;
  dbCreatePurchaseReceipt(receipt: any): Promise<DatabaseResult<any>>;
  dbUpdatePurchaseReceipt(id: string, receipt: any): Promise<DatabaseResult<any>>;
  dbDeletePurchaseReceipt(id: string): Promise<DatabaseResult<boolean>>;
  dbGetPurchaseReceiptById(id: string): Promise<DatabaseResult<any>>;
  dbGetPurchaseReceiptStats(): Promise<DatabaseResult<OrderStats>>;
  
  // 销售订单
  dbGetAllSalesOrders(): Promise<DatabaseResult<any[]>>;
  dbCreateSalesOrder(order: any): Promise<DatabaseResult<any>>;
  dbUpdateSalesOrder(id: string, order: any): Promise<DatabaseResult<any>>;
  dbDeleteSalesOrder(id: string): Promise<DatabaseResult<boolean>>;
  dbGetSalesOrderById(id: string): Promise<DatabaseResult<any>>;
  dbGetSalesOrderStats(): Promise<DatabaseResult<OrderStats>>;
  
  // 销售出库
  dbGetAllSalesDeliveries(): Promise<DatabaseResult<any[]>>;
  dbCreateSalesDelivery(delivery: any): Promise<DatabaseResult<any>>;
  dbUpdateSalesDelivery(id: string, delivery: any): Promise<DatabaseResult<any>>;
  dbDeleteSalesDelivery(id: string): Promise<DatabaseResult<boolean>>;
  dbGetSalesDeliveryById(id: string): Promise<DatabaseResult<any>>;
  dbGetSalesDeliveryStats(): Promise<DatabaseResult<OrderStats>>;
  
  // =============数据库 - 财务管理=============
  
  // 应付账款
  dbGetAllAccountsPayable(): Promise<DatabaseResult<any[]>>;
  dbCreateAccountPayable(payable: any): Promise<DatabaseResult<any>>;
  dbUpdateAccountPayable(id: string, payable: any): Promise<DatabaseResult<any>>;
  dbDeleteAccountPayable(id: string): Promise<DatabaseResult<boolean>>;
  dbGetAccountPayableById(id: string): Promise<DatabaseResult<any>>;
  dbGetAccountsPayableStats(): Promise<DatabaseResult<EntityStats>>;
  
  // 应收账款
  dbGetAllAccountsReceivable(): Promise<DatabaseResult<any[]>>;
  dbCreateAccountReceivable(receivable: any): Promise<DatabaseResult<any>>;
  dbUpdateAccountReceivable(id: string, receivable: any): Promise<DatabaseResult<any>>;
  dbDeleteAccountReceivable(id: string): Promise<DatabaseResult<boolean>>;
  dbGetAccountReceivableById(id: string): Promise<DatabaseResult<any>>;
  dbGetAccountsReceivableStats(): Promise<DatabaseResult<EntityStats>>;
  
  // =============数据库 - 系统管理=============
  
  // 系统配置
  dbGetSystemConfig(): Promise<DatabaseResult<any>>;
  dbUpdateSystemConfig(config: any): Promise<DatabaseResult<any>>;
  dbGetSystemStats(): Promise<DatabaseResult<any>>;
  
  // 备份恢复
  dbBackupData(filePath: string): Promise<DatabaseResult<any>>;
  dbRestoreData(filePath: string): Promise<DatabaseResult<any>>;
  dbGetBackupList(): Promise<DatabaseResult<any[]>>;
  
  // 数据初始化
  dbInitializeDatabase(): Promise<DatabaseResult<boolean>>;
  dbCheckDatabaseIntegrity(): Promise<DatabaseResult<any>>;
  dbCleanupDatabase(): Promise<DatabaseResult<any>>;
  
  // =============数据库 - 单位换算=============
  
  // 全局换算规则
  dbGetAllGlobalConversions(): Promise<DatabaseResult<any[]>>;
  dbCreateGlobalConversion(conversion: any): Promise<DatabaseResult<any>>;
  dbUpdateGlobalConversion(id: string, conversion: any): Promise<DatabaseResult<any>>;
  dbDeleteGlobalConversion(id: string): Promise<DatabaseResult<boolean>>;
  
  // 产品换算规则
  dbGetAllProductConversions(): Promise<DatabaseResult<any[]>>;
  dbCreateProductConversion(conversion: any): Promise<DatabaseResult<any>>;
  dbUpdateProductConversion(id: string, conversion: any): Promise<DatabaseResult<any>>;
  dbDeleteProductConversion(id: string): Promise<DatabaseResult<boolean>>;
  dbGetProductConversionByProductId(productId: string): Promise<DatabaseResult<any>>;
  
  // =============数据库 - 月度结余=============
  
  // 月度结余
  dbGetAllMonthlyBalances(): Promise<DatabaseResult<any[]>>;
  dbCreateMonthlyBalance(balance: any): Promise<DatabaseResult<any>>;
  dbUpdateMonthlyBalance(id: string, balance: any): Promise<DatabaseResult<any>>;
  dbDeleteMonthlyBalance(id: string): Promise<DatabaseResult<boolean>>;
  dbGetMonthlyBalanceById(id: string): Promise<DatabaseResult<any>>;
  dbGetMonthlyBalanceStats(): Promise<DatabaseResult<EntityStats>>;
  dbGenerateMonthlyBalance(params: any): Promise<DatabaseResult<any>>;
  
  // =============权限管理=============
  
  // 权限和角色
  dbGetAllPermissions(): Promise<DatabaseResult<any[]>>;
  dbCreatePermission(permission: any): Promise<DatabaseResult<any>>;
  dbUpdatePermission(id: string, permission: any): Promise<DatabaseResult<any>>;
  dbDeletePermission(id: string): Promise<DatabaseResult<boolean>>;
  dbGetUserPermissions(userId: string): Promise<DatabaseResult<any[]>>;
  dbSetUserPermissions(userId: string, permissions: string[]): Promise<DatabaseResult<boolean>>;
}

// =============== 全局类型声明 ===============

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export default ElectronAPI;