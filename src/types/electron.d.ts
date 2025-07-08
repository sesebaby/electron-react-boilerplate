// TypeScript declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      // File dialog operations
      showOpenDialog: (options?: any) => Promise<any>;
      showSaveDialog: (options?: any) => Promise<any>;
      
      // File I/O operations
      readFile: (filePath: string) => Promise<{ success: boolean; data?: ArrayBuffer; error?: string }>;
      writeFile: (filePath: string, data: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
      checkFileExists: (filePath: string) => Promise<{ exists: boolean }>;

      // Directory operations for logging service
      mkdir: (dirPath: string, options?: any) => Promise<{ success: boolean; error?: string }>;
      stat: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      readdir: (dirPath: string) => Promise<{ success: boolean; data?: string[]; error?: string }>;
      rename: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      unlink: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      
      // System paths
      getAppPath: (name?: string) => Promise<{ path: string }>;
      
      // Database operations
      dbInitialize: () => Promise<{ success: boolean; error?: string }>;
      dbGetAllItems: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetItemById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetItemBySku: (sku: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbCreateItem: (item: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbUpdateItem: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbDeleteItem: (id: string) => Promise<{ success: boolean; error?: string }>;
      dbSearchItems: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetItemsByCategory: (category: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetLowStockItems: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetCategories: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
      dbGetSuppliers: () => Promise<{ success: boolean; data?: string[]; error?: string }>;
      dbGetAllCategories: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetAllSuppliers: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetAllTransactions: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      
      // Warehouse operations
      dbGetAllWarehouses: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetWarehouseById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetWarehouseByCode: (code: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetDefaultWarehouse: () => Promise<{ success: boolean; data?: any; error?: string }>;
      dbCreateWarehouse: (warehouse: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbUpdateWarehouse: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbDeleteWarehouse: (id: string) => Promise<{ success: boolean; error?: string }>;
      dbSearchWarehouses: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      
      // Unit operations
      dbGetAllUnits: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbGetUnitById: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbGetUnitBySymbol: (symbol: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbCreateUnit: (unit: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbUpdateUnit: (id: string, updates: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      dbDeleteUnit: (id: string) => Promise<{ success: boolean; error?: string }>;
      dbSearchUnits: (searchTerm: string) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      dbReimportUnits: () => Promise<{ success: boolean; message?: string; count?: number; error?: string }>;
      
      // Platform info
      platform: string;
      
      // Version info
      versions: {
        node: string;
        electron: string;
        chrome: string;
      };
    };
  }
}

export {};