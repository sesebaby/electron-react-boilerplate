/**
 * Electron 数据库代理
 * 通过 IPC 与主进程通信来执行数据库操作
 */

declare global {
  interface Window {
    electronAPI: {
      // 数据库操作
      dbInitialize: () => Promise<any>;
      dbGetAllItems: () => Promise<any>;
      dbGetItemById: (id: string) => Promise<any>;
      dbGetItemBySku: (sku: string) => Promise<any>;
      dbCreateItem: (item: any) => Promise<any>;
      dbUpdateItem: (id: string, updates: any) => Promise<any>;
      dbDeleteItem: (id: string) => Promise<any>;
      dbSearchItems: (params: any) => Promise<any>;
      dbGetCategories: () => Promise<any>;
      dbCreateCategory: (category: any) => Promise<any>;
      dbUpdateCategory: (id: string, updates: any) => Promise<any>;
      dbDeleteCategory: (id: string) => Promise<any>;
      dbGetSuppliers: () => Promise<any>;
      dbCreateSupplier: (supplier: any) => Promise<any>;
      dbUpdateSupplier: (id: string, updates: any) => Promise<any>;
      dbDeleteSupplier: (id: string) => Promise<any>;
      dbGetWarehouses: () => Promise<any>;
      dbCreateWarehouse: (warehouse: any) => Promise<any>;
      dbUpdateWarehouse: (id: string, updates: any) => Promise<any>;
      dbDeleteWarehouse: (id: string) => Promise<any>;
      dbGetUsers: () => Promise<any>;
      dbCreateUser: (user: any) => Promise<any>;
      dbUpdateUser: (id: string, updates: any) => Promise<any>;
      dbDeleteUser: (id: string) => Promise<any>;
      dbGetUnits: () => Promise<any>;
      dbCreateUnit: (unit: any) => Promise<any>;
      dbUpdateUnit: (id: string, updates: any) => Promise<any>;
      dbDeleteUnit: (id: string) => Promise<any>;
      // 通用查询
      dbQuery: (sql: string, params?: any[]) => Promise<any>;
      dbRun: (sql: string, params?: any[]) => Promise<any>;
      dbGet: (sql: string, params?: any[]) => Promise<any>;
      dbAll: (sql: string, params?: any[]) => Promise<any>;
      // 事务
      dbBeginTransaction: () => Promise<any>;
      dbCommit: () => Promise<any>;
      dbRollback: () => Promise<any>;
      
      // 系统操作
      dbClearDatabase: (options?: any) => Promise<any>;
      dbRebuildSchema: () => Promise<any>;
      dbReimportUnits: () => Promise<any>;
      dbImportSampleData: () => Promise<any>;
      dbImportBuiltinData: () => Promise<any>;
      dbCheckHealth: () => Promise<any>;
      dbValidateIntegrity: () => Promise<any>;
      dbBackup: (path?: string) => Promise<any>;
      dbRestore: (path: string) => Promise<any>;
      dbValidateBackup: (path: string) => Promise<any>;
      dbOptimize: () => Promise<any>;
      dbGetSystemStatus: () => Promise<any>;
      dbGetBackupList: () => Promise<any>;
      dbDeleteBackup: (backupId: string) => Promise<any>;
      
      // 文件操作
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, data: any) => Promise<any>;
      checkFileExists: (filePath: string) => Promise<any>;
      mkdir: (dirPath: string, options?: any) => Promise<any>;
      stat: (filePath: string) => Promise<any>;
      readdir: (dirPath: string) => Promise<any>;
      rename: (oldPath: string, newPath: string) => Promise<any>;
      unlink: (filePath: string) => Promise<any>;
      getAppPath: (name: string) => Promise<any>;
      
      // 文件对话框
      showOpenDialog: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
    };
  }
}

export class ElectronDatabase {
  private static instance: ElectronDatabase;

  private constructor() {}

  static getInstance(): ElectronDatabase {
    if (!ElectronDatabase.instance) {
      ElectronDatabase.instance = new ElectronDatabase();
    }
    return ElectronDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available. Make sure preload script is loaded.');
    }
    return window.electronAPI.dbInitialize();
  }

  // 通用查询方法
  async query(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbQuery(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbRun(sql, params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbGet(sql, params);
  }

  async all(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbAll(sql, params);
  }

  // 事务支持
  async beginTransaction(): Promise<any> {
    return window.electronAPI.dbBeginTransaction();
  }

  async commit(): Promise<any> {
    return window.electronAPI.dbCommit();
  }

  async rollback(): Promise<any> {
    return window.electronAPI.dbRollback();
  }

  // 库存项目
  async getAllItems(): Promise<any> {
    return window.electronAPI.dbGetAllItems();
  }

  async getItemById(id: string): Promise<any> {
    return window.electronAPI.dbGetItemById(id);
  }

  async getItemBySku(sku: string): Promise<any> {
    return window.electronAPI.dbGetItemBySku(sku);
  }

  async createItem(item: any): Promise<any> {
    return window.electronAPI.dbCreateItem(item);
  }

  async updateItem(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateItem(id, updates);
  }

  async deleteItem(id: string): Promise<any> {
    return window.electronAPI.dbDeleteItem(id);
  }

  async searchItems(params: any): Promise<any> {
    return window.electronAPI.dbSearchItems(params);
  }

  // 分类
  async getCategories(): Promise<any> {
    return window.electronAPI.dbGetCategories();
  }

  async createCategory(category: any): Promise<any> {
    return window.electronAPI.dbCreateCategory(category);
  }

  async updateCategory(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateCategory(id, updates);
  }

  async deleteCategory(id: string): Promise<any> {
    return window.electronAPI.dbDeleteCategory(id);
  }

  // 供应商
  async getSuppliers(): Promise<any> {
    return window.electronAPI.dbGetSuppliers();
  }

  async createSupplier(supplier: any): Promise<any> {
    return window.electronAPI.dbCreateSupplier(supplier);
  }

  async updateSupplier(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateSupplier(id, updates);
  }

  async deleteSupplier(id: string): Promise<any> {
    return window.electronAPI.dbDeleteSupplier(id);
  }

  // 仓库
  async getWarehouses(): Promise<any> {
    return window.electronAPI.dbGetWarehouses();
  }

  async createWarehouse(warehouse: any): Promise<any> {
    return window.electronAPI.dbCreateWarehouse(warehouse);
  }

  async updateWarehouse(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateWarehouse(id, updates);
  }

  async deleteWarehouse(id: string): Promise<any> {
    return window.electronAPI.dbDeleteWarehouse(id);
  }

  // 用户
  async getUsers(): Promise<any> {
    return window.electronAPI.dbGetUsers();
  }

  async createUser(user: any): Promise<any> {
    return window.electronAPI.dbCreateUser(user);
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateUser(id, updates);
  }

  async deleteUser(id: string): Promise<any> {
    return window.electronAPI.dbDeleteUser(id);
  }

  // 单位
  async getUnits(): Promise<any> {
    return window.electronAPI.dbGetUnits();
  }

  async createUnit(unit: any): Promise<any> {
    return window.electronAPI.dbCreateUnit(unit);
  }

  async updateUnit(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateUnit(id, updates);
  }

  async deleteUnit(id: string): Promise<any> {
    return window.electronAPI.dbDeleteUnit(id);
  }
}

export default ElectronDatabase.getInstance();