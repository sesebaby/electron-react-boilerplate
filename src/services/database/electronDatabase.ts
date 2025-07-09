import { InventoryItem } from '../../types/inventory';
import { Unit } from '../../types/entities';
import { ElectronAPI, DatabaseResult } from '../../types/electronAPI';

// Electron renderer process database service
// Uses IPC to communicate with main process for database operations

export class ElectronDatabase {
  private isInitialized = false;

  async initialize(): Promise<void> {
    const electronAPI: ElectronAPI = window.electronAPI;
    if (!electronAPI?.dbInitializeDatabase) {
      throw new Error('Electron API not available');
    }
    
    const result: DatabaseResult<boolean> = await electronAPI.dbInitializeDatabase();
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
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem[]> = await electronAPI.dbGetAllInventoryItems();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get items');
    }
    return result.data || [];
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem> = await electronAPI.dbGetProductById(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get item');
    }
    return result.data || null;
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem> = await electronAPI.dbGetProductById(sku);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get item by SKU');
    }
    return result.data || null;
  }

  async addTransaction(transaction: any): Promise<any> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<any> = await electronAPI.dbCreateInventoryTransaction(transaction);
    if (!result.success) {
      throw new Error(result.error || 'Failed to add transaction');
    }
    return result.data;
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem> = await electronAPI.dbCreateProduct(item);
    if (!result.success) {
      throw new Error(result.error || 'Failed to create item');
    }
    if (!result.data) {
      throw new Error('No data returned from create operation');
    }
    return result.data;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem> = await electronAPI.dbUpdateProduct(id, updates);
    if (!result.success) {
      throw new Error(result.error || 'Failed to update item');
    }
    if (!result.data) {
      throw new Error('No data returned from update operation');
    }
    return result.data;
  }

  async deleteItem(id: string): Promise<boolean> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<boolean> = await electronAPI.dbDeleteProduct(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete item');
    }
    return true;
  }

  async searchItems(searchTerm: string): Promise<InventoryItem[]> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem[]> = await electronAPI.dbGetAllProducts();
    if (!result.success) {
      throw new Error(result.error || 'Failed to search items');
    }
    const items = result.data || [];
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem[]> = await electronAPI.dbGetProductsByCategory(category);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get items by category');
    }
    return result.data || [];
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<InventoryItem[]> = await electronAPI.dbGetLowStockItems();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get low stock items');
    }
    return result.data || [];
  }

  async getCategories(): Promise<string[]> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<string[]> = await electronAPI.dbGetAllCategories();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get categories');
    }
    return (result.data || []).map(cat => cat.name);
  }

  async getSuppliers(): Promise<string[]> {
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<string[]> = await electronAPI.dbGetAllSuppliers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get suppliers');
    }
    return (result.data || []).map(sup => sup.name);
  }

  // Get all categories from categories table
  async getAllCategories(): Promise<any[]> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<any[]> = await electronAPI.dbGetAllCategories();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all categories');
    }
    return result.data || [];
  }

  // Get all suppliers from suppliers table
  async getAllSuppliers(): Promise<any[]> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<any[]> = await electronAPI.dbGetAllSuppliers();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all suppliers');
    }
    return result.data || [];
  }

  // Get all inventory transactions
  async getAllTransactions(): Promise<any[]> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<any[]> = await electronAPI.dbGetInventoryTransactions();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all transactions');
    }
    return result.data || [];
  }

  // ========== UNIT METHODS ==========

  // Get all units
  async getAllUnits(): Promise<Unit[]> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit[]> = await electronAPI.dbGetAllUnits();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get all units');
    }
    return result.data || [];
  }

  // Get unit by ID
  async getUnitById(id: string): Promise<Unit | null> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit> = await electronAPI.dbGetUnitById(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get unit');
    }
    return result.data || null;
  }

  // Get unit by symbol
  async getUnitBySymbol(symbol: string): Promise<Unit | null> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit[]> = await electronAPI.dbGetAllUnits();
    if (!result.success) {
      throw new Error(result.error || 'Failed to get unit by symbol');
    }
    const units = result.data || [];
    return units.find(unit => unit.symbol === symbol) || null;
  }

  // Create unit
  async createUnit(unit: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Unit> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit> = await electronAPI.dbCreateUnit(unit);
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
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit> = await electronAPI.dbUpdateUnit(id, updates);
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
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<boolean> = await electronAPI.dbDeleteUnit(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete unit');
    }
    return true;
  }

  // Search units
  async searchUnits(searchTerm: string): Promise<Unit[]> {
    this.checkInitialized();
    const electronAPI: ElectronAPI = window.electronAPI;
    const result: DatabaseResult<Unit[]> = await electronAPI.dbGetAllUnits();
    if (!result.success) {
      throw new Error(result.error || 'Failed to search units');
    }
    const units = result.data || [];
    return units.filter(unit => 
      unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}

export default new ElectronDatabase();