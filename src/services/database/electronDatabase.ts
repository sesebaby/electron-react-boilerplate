import { InventoryItem } from '../../types/inventory';

// Electron renderer process database service
// Uses IPC to communicate with main process for database operations

export class ElectronDatabase {
  async initialize(): Promise<void> {
    if (!window.electronAPI?.dbInitialize) {
      throw new Error('Electron API not available');
    }
    
    const result = await window.electronAPI.dbInitialize();
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize database');
    }
  }

  async getAllItems(): Promise<InventoryItem[]> {
    const result = await window.electronAPI.dbGetAllItems();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get items');
    }
    return result.data || [];
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    const result = await window.electronAPI.dbGetItemById(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get item');
    }
    return result.data || null;
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    const result = await window.electronAPI.dbGetItemBySku(sku);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get item by SKU');
    }
    return result.data || null;
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const result = await window.electronAPI.dbCreateItem(item);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create item');
    }
    if (!result.data) {
      throw new Error('No data returned from create operation');
    }
    return result.data;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const result = await window.electronAPI.dbUpdateItem(id, updates);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update item');
    }
    if (!result.data) {
      throw new Error('No data returned from update operation');
    }
    return result.data;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await window.electronAPI.dbDeleteItem(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete item');
    }
    return true;
  }

  async searchItems(searchTerm: string): Promise<InventoryItem[]> {
    const result = await window.electronAPI.dbSearchItems(searchTerm);
    if (!result.success) {
      throw new Error(result.error || 'Failed to search items');
    }
    return result.data || [];
  }

  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    const result = await window.electronAPI.dbGetItemsByCategory(category);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get items by category');
    }
    return result.data || [];
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const result = await window.electronAPI.dbGetLowStockItems();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get low stock items');
    }
    return result.data || [];
  }

  async getCategories(): Promise<string[]> {
    const result = await window.electronAPI.dbGetCategories();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get categories');
    }
    return result.data || [];
  }

  async getSuppliers(): Promise<string[]> {
    const result = await window.electronAPI.dbGetSuppliers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get suppliers');
    }
    return result.data || [];
  }
}

export default new ElectronDatabase();