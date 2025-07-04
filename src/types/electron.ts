import { InventoryItem } from './inventory';

export interface ElectronAPI {
  // File dialog operations
  showOpenDialog: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  showSaveDialog: (options?: any) => Promise<{ canceled: boolean; filePath?: string }>;
  
  // File I/O operations
  readFile: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
  writeFile: (filePath: string, data: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
  checkFileExists: (filePath: string) => Promise<{ exists: boolean }>;
  
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