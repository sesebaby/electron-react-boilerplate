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