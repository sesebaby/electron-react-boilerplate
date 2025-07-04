import { InventoryItem } from '../../types/inventory';
import DatabaseManager from './connection';
import { v4 as uuidv4 } from 'uuid';

export class InventoryDatabase {
  private db = DatabaseManager.getConnection();

  async getAllItems(): Promise<InventoryItem[]> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      ORDER BY name ASC
    `;
    
    const rows = await this.db.all(query);
    return rows.map(this.mapRowToInventoryItem);
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      WHERE id = ?
    `;
    
    const row = await this.db.get(query, [id]);
    return row ? this.mapRowToInventoryItem(row) : null;
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      WHERE sku = ?
    `;
    
    const row = await this.db.get(query, [sku]);
    return row ? this.mapRowToInventoryItem(row) : null;
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const query = `
      INSERT INTO inventory_items (
        id, name, description, sku, category, supplier,
        stock_quantity, reserved_quantity, unit_price, total_value,
        status, location, reorder_level, max_stock, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id, item.name, item.description, item.sku, item.category, item.supplier,
      item.stockQuantity, item.reservedQuantity, item.unitPrice, item.totalValue,
      item.status, item.location, item.reorderLevel, item.maxStock, now
    ];
    
    await this.db.run(query, params);
    
    const newItem = await this.getItemById(id);
    if (!newItem) {
      throw new Error('Failed to create inventory item');
    }
    
    return newItem;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const existingItem = await this.getItemById(id);
    if (!existingItem) {
      throw new Error(`Inventory item with id ${id} not found`);
    }

    const updateFields: string[] = [];
    const params: any[] = [];

    const fieldMap = {
      name: 'name',
      description: 'description',
      sku: 'sku',
      category: 'category',
      supplier: 'supplier',
      stockQuantity: 'stock_quantity',
      reservedQuantity: 'reserved_quantity',
      unitPrice: 'unit_price',
      totalValue: 'total_value',
      status: 'status',
      location: 'location',
      reorderLevel: 'reorder_level',
      maxStock: 'max_stock'
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (key in fieldMap && value !== undefined) {
        updateFields.push(`${fieldMap[key as keyof typeof fieldMap]} = ?`);
        params.push(value);
      }
    });

    if (updateFields.length === 0) {
      return existingItem;
    }

    updateFields.push('last_updated = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const query = `
      UPDATE inventory_items 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await this.db.run(query, params);
    
    const updatedItem = await this.getItemById(id);
    if (!updatedItem) {
      throw new Error('Failed to update inventory item');
    }
    
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    const query = 'DELETE FROM inventory_items WHERE id = ?';
    const result = await this.db.run(query, [id]);
    return result.rowsAffected > 0;
  }

  async searchItems(searchTerm: string): Promise<InventoryItem[]> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      WHERE name LIKE ? OR sku LIKE ? OR description LIKE ?
      ORDER BY name ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const rows = await this.db.all(query, [searchPattern, searchPattern, searchPattern]);
    return rows.map(this.mapRowToInventoryItem);
  }

  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      WHERE category = ?
      ORDER BY name ASC
    `;
    
    const rows = await this.db.all(query, [category]);
    return rows.map(this.mapRowToInventoryItem);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    const query = `
      SELECT 
        id, name, description, sku, category, supplier,
        stock_quantity as stockQuantity,
        reserved_quantity as reservedQuantity,
        unit_price as unitPrice,
        total_value as totalValue,
        last_updated as lastUpdated,
        status, location,
        reorder_level as reorderLevel,
        max_stock as maxStock
      FROM inventory_items 
      WHERE stock_quantity <= reorder_level
      ORDER BY stock_quantity ASC
    `;
    
    const rows = await this.db.all(query);
    return rows.map(this.mapRowToInventoryItem);
  }

  async getCategories(): Promise<string[]> {
    const query = 'SELECT DISTINCT category FROM inventory_items ORDER BY category';
    const rows = await this.db.all(query);
    return rows.map(row => row.category);
  }

  async getSuppliers(): Promise<string[]> {
    const query = 'SELECT DISTINCT supplier FROM inventory_items WHERE supplier IS NOT NULL ORDER BY supplier';
    const rows = await this.db.all(query);
    return rows.map(row => row.supplier);
  }

  private mapRowToInventoryItem(row: any): InventoryItem {
    return {
      id: row.id,
      name: row.name,
      description: row.description || '',
      sku: row.sku,
      category: row.category,
      supplier: row.supplier || '',
      stockQuantity: row.stockQuantity,
      reservedQuantity: row.reservedQuantity,
      unitPrice: row.unitPrice,
      totalValue: row.totalValue,
      lastUpdated: new Date(row.lastUpdated),
      status: row.status,
      location: row.location || '',
      reorderLevel: row.reorderLevel,
      maxStock: row.maxStock
    };
  }
}

export default new InventoryDatabase();