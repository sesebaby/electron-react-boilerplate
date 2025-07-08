import { InventoryItem } from './inventory';

export interface ElectronAPI {
  // File dialog operations
  showOpenDialog: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options?: any) => Promise<{ canceled: boolean; filePath?: string }>;
  
  // File I/O operations
  readFile: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
  writeFile: (filePath: string, data: ArrayBuffer | string) => Promise<{ success: boolean; error?: string }>;
  checkFileExists: (filePath: string) => Promise<{ exists: boolean }>;
  
  // Directory operations
  mkdir: (dirPath: string, options?: { recursive?: boolean }) => Promise<{ success: boolean; error?: string }>;
  readdir: (dirPath: string) => Promise<{ success: boolean; data?: string[]; error?: string }>;
  stat: (filePath: string) => Promise<{ success: boolean; data?: { size: number; mtime: Date; birthtime?: Date }; error?: string }>;
  rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  unlink: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  
  // System paths
  getAppPath: (name?: string) => Promise<{ path: string }>;
  
  // Database operations
  dbInitialize: () => Promise<{ success: boolean; error?: string }>;
  dbGetAllItems: () => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>;
  dbGetItemById: (id: string) => Promise<{ success: boolean; data?: InventoryItem; error?: string }>;
  dbGetItemBySku: (sku: string) => Promise<{ success: boolean; data?: InventoryItem; error?: string }>;
  dbCreateItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<{ success: boolean; data?: InventoryItem; error?: string }>;
  dbUpdateItem: (id: string, updates: Partial<InventoryItem>) => Promise<{ success: boolean; data?: InventoryItem; error?: string }>;
  dbDeleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  dbSearchItems: (searchTerm: string) => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>;
  dbGetItemsByCategory: (category: string) => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>;
  dbGetLowStockItems: () => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>;
  dbGetCategories: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  dbGetSuppliers: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
  dbGetAllCategories: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  dbGetAllSuppliers: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  dbGetAllTransactions: () => Promise<{ success: boolean; data?: any[]; error?: string }>;

  // Unit operations
  dbReimportUnits: () => Promise<{ success: boolean; message?: string; error?: string }>;

  // Warehouse operations
  dbGetAllWarehouses: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
  dbGetWarehouseById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  dbGetWarehouseByCode: (code: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  dbGetDefaultWarehouse: () => Promise<{ success: boolean; data?: any; error?: string }>;
  dbCreateWarehouse: (warehouse: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  dbUpdateWarehouse: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  dbDeleteWarehouse: (id: string) => Promise<{ success: boolean; error?: string }>;
  dbSearchWarehouses: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;

  // Platform info
  platform: string;
  
  // Version info
  versions: {
    node: string;
    electron: string;
    chrome: string;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};