import { InventoryItem } from '../../types/inventory';
import { Unit } from '../../types/entities';

// Electron renderer process database service
// Uses IPC to communicate with main process for database operations

export class ElectronDatabase {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (!window.electronAPI?.dbInitialize) {
      throw new Error('Electron API not available');
    }
    
    const result = await window.electronAPI.dbInitialize();
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize database');
    }
    
    this.isInitialized = true;
  }

  private checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
  }

  async getAllItems(): Promise<InventoryItem[]> {
    this.checkInitialized();
    const result = await window.electronAPI.dbGetAllItems();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get items');
    }
    return result.data || [];
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    this.checkInitialized();
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

  async addTransaction(transaction: any): Promise<any> {
    this.checkInitialized();
    const result = await window.electronAPI.dbAddTransaction(transaction);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add transaction');
    }
    return result.data;
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

  // Get all categories from categories table
  async getAllCategories(): Promise<any[]> {
    this.checkInitialized();
    const result = await window.electronAPI.dbGetAllCategories();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all categories');
    }
    return result.data || [];
  }

  // Get all suppliers from suppliers table
  async getAllSuppliers(): Promise<any[]> {
    this.checkInitialized();
    const result = await window.electronAPI.dbGetAllSuppliers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all suppliers');
    }
    return result.data || [];
  }

  // Get all inventory transactions
  async getAllTransactions(): Promise<any[]> {
    this.checkInitialized();
    const result = await window.electronAPI.dbGetAllTransactions();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all transactions');
    }
    return result.data || [];
  }

  // ========== UNIT METHODS ==========

  // Get all units
  async getAllUnits(): Promise<Unit[]> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbGetAllUnits();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all units');
    }
    return result.data || [];
  }

  // Get unit by ID
  async getUnitById(id: string): Promise<Unit | null> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbGetUnitById(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get unit');
    }
    return result.data || null;
  }

  // Get unit by symbol
  async getUnitBySymbol(symbol: string): Promise<Unit | null> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbGetUnitBySymbol(symbol);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get unit by symbol');
    }
    return result.data || null;
  }

  // Create unit
  async createUnit(unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbCreateUnit(unit);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create unit');
    }
    if (!result.data) {
      throw new Error('No data returned from create operation');
    }
    return result.data;
  }

  // Update unit
  async updateUnit(id: string, updates: Partial<Unit>): Promise<Unit> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbUpdateUnit(id, updates);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update unit');
    }
    if (!result.data) {
      throw new Error('No data returned from update operation');
    }
    return result.data;
  }

  // Delete unit
  async deleteUnit(id: string): Promise<boolean> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbDeleteUnit(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete unit');
    }
    return true;
  }

  // Search units
  async searchUnits(searchTerm: string): Promise<Unit[]> {
    this.checkInitialized();
    const result = await (window.electronAPI as any).dbSearchUnits(searchTerm);
    if (!result.success) {
      throw new Error(result.error || 'Failed to search units');
    }
    return result.data || [];
  }
}

export default new ElectronDatabase();