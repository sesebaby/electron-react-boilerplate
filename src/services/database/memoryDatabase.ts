import { InventoryItem } from '../../types/inventory';
import { v4 as uuidv4 } from 'uuid';

// Temporary in-memory database for development
export class MemoryDatabase {
  private items: InventoryItem[] = [];

  async initialize(): Promise<void> {
    console.log('Memory database initialized');
    
    // Add some sample data for testing
    if (this.items.length === 0) {
      this.items = [
        {
          id: uuidv4(),
          name: '示例商品1',
          description: '这是一个示例商品',
          sku: 'DEMO001',
          category: '电子产品',
          supplier: '示例供应商',
          stockQuantity: 100,
          reservedQuantity: 0,
          unitPrice: 50.0,
          totalValue: 5000.0,
          lastUpdated: new Date(),
          status: 'in-stock',
          location: 'A1货架',
          reorderLevel: 10,
          maxStock: 500
        },
        {
          id: uuidv4(),
          name: '示例商品2',
          description: '另一个示例商品',
          sku: 'DEMO002',
          category: '办公用品',
          supplier: '另一个供应商',
          stockQuantity: 5,
          reservedQuantity: 2,
          unitPrice: 25.0,
          totalValue: 125.0,
          lastUpdated: new Date(),
          status: 'low-stock',
          location: 'B2货架',
          reorderLevel: 10,
          maxStock: 200
        }
      ];
    }
  }

  async getAllItems(): Promise<InventoryItem[]> {
    return [...this.items];
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    return this.items.find(item => item.id === id) || null;
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.items.find(item => item.sku === sku) || null;
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    // Check if SKU already exists
    if (this.items.some(existing => existing.sku === item.sku)) {
      throw new Error(`SKU "${item.sku}" already exists`);
    }

    const newItem: InventoryItem = {
      ...item,
      id: uuidv4(),
      lastUpdated: new Date()
    };

    this.items.push(newItem);
    return newItem;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      throw new Error(`Item with id ${id} not found`);
    }

    // Check SKU uniqueness if updating SKU
    if (updates.sku && updates.sku !== this.items[index].sku) {
      if (this.items.some(item => item.sku === updates.sku && item.id !== id)) {
        throw new Error(`SKU "${updates.sku}" already exists`);
      }
    }

    const updatedItem: InventoryItem = {
      ...this.items[index],
      ...updates,
      lastUpdated: new Date()
    };

    this.items[index] = updatedItem;
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) {
      return false;
    }

    this.items.splice(index, 1);
    return true;
  }

  async searchItems(searchTerm: string): Promise<InventoryItem[]> {
    const term = searchTerm.toLowerCase();
    return this.items.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  }

  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    return this.items.filter(item => item.category === category);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.items.filter(item => item.stockQuantity <= item.reorderLevel);
  }

  async getCategories(): Promise<string[]> {
    const categories = [...new Set(this.items.map(item => item.category))];
    return categories.sort();
  }

  async getSuppliers(): Promise<string[]> {
    const suppliers = [...new Set(this.items.map(item => item.supplier).filter(Boolean))];
    return suppliers.sort();
  }
}

export default new MemoryDatabase();