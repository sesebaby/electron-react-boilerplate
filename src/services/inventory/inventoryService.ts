import { InventoryItem, InventorySummary } from '../../types/inventory';
import MemoryDatabase from '../database/memoryDatabase';
import { validateInventoryItem, InventoryItemInput } from '../../schemas/validation';
import { ValidationError } from '../../utils/errors';

export class InventoryService {
  private db = MemoryDatabase;

  async initialize(): Promise<void> {
    try {
      await this.db.initialize();
      console.log('Inventory service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize inventory service:', error);
      throw error;
    }
  }

  async getAllItems(): Promise<InventoryItem[]> {
    return this.db.getAllItems();
  }

  async getItemById(id: string): Promise<InventoryItem | null> {
    return this.db.getItemById(id);
  }

  async getItemBySku(sku: string): Promise<InventoryItem | null> {
    return this.db.getItemBySku(sku);
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    // 数据验证
    const validation = validateInventoryItem({
      ...item,
      totalValue: (item.stockQuantity || 0) * item.unitPrice
    });

    if (!validation.success) {
      throw new ValidationError(`库存项目数据验证失败: ${validation.errors?.join(', ')}`, {
        errors: validation.errors,
        data: item
      });
    }

    // 检查SKU是否已存在
    const existingItem = await this.db.getItemBySku(item.sku);
    if (existingItem) {
      throw new ValidationError(`SKU "${item.sku}" 已存在`, { sku: item.sku });
    }

    // 计算总价值
    const itemWithCalculatedValue = {
      ...item,
      totalValue: (item.stockQuantity || 0) * item.unitPrice
    };

    return this.db.createItem(itemWithCalculatedValue);
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const currentItem = await this.db.getItemById(id);
    if (!currentItem) {
      throw new ValidationError(`库存项目不存在: ${id}`, { id });
    }

    // 如果更新了库存数量或单价，重新计算总价值
    if (updates.stockQuantity !== undefined || updates.unitPrice !== undefined) {
      const stockQuantity = updates.stockQuantity ?? (currentItem.stockQuantity || 0);
      const unitPrice = updates.unitPrice ?? currentItem.unitPrice;
      updates.totalValue = stockQuantity * unitPrice;
    }

    // 合并更新数据
    const updatedItem = {
      ...currentItem,
      ...updates,
      lastUpdated: new Date()
    };

    // 验证更新后的完整数据
    const validation = validateInventoryItem(updatedItem);
    if (!validation.success) {
      throw new ValidationError(`库存项目数据验证失败: ${validation.errors?.join(', ')}`, {
        errors: validation.errors,
        data: updates
      });
    }

    // 如果更新了SKU，检查是否已存在
    if (updates.sku && updates.sku !== currentItem.sku) {
      const existingItem = await this.db.getItemBySku(updates.sku);
      if (existingItem && existingItem.id !== id) {
        throw new ValidationError(`SKU "${updates.sku}" 已存在`, { sku: updates.sku });
      }
    }

    return this.db.updateItem(id, updates);
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.db.deleteItem(id);
  }

  async searchItems(searchTerm: string): Promise<InventoryItem[]> {
    if (!searchTerm.trim()) {
      return this.getAllItems();
    }
    return this.db.searchItems(searchTerm.trim());
  }

  async getItemsByCategory(category: string): Promise<InventoryItem[]> {
    return this.db.getItemsByCategory(category);
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return this.db.getLowStockItems();
  }

  async getCategories(): Promise<string[]> {
    return this.db.getCategories();
  }

  async getSuppliers(): Promise<string[]> {
    return this.db.getSuppliers();
  }

  async updateStock(id: string, quantity: number, type: 'in' | 'out' | 'adjust'): Promise<InventoryItem> {
    const item = await this.db.getItemById(id);
    if (!item) {
      throw new Error(`商品不存在: ${id}`);
    }

    let newQuantity: number;
    const currentStock = item.stockQuantity || 0;
    switch (type) {
      case 'in':
        newQuantity = currentStock + Math.abs(quantity);
        break;
      case 'out':
        newQuantity = currentStock - Math.abs(quantity);
        if (newQuantity < 0) {
          throw new Error('库存不足，无法出库');
        }
        break;
      case 'adjust':
        newQuantity = quantity;
        if (newQuantity < 0) {
          throw new Error('调整后的库存数量不能为负数');
        }
        break;
    }

    // 更新库存状态
    let status = item.status;
    if (newQuantity <= 0) {
      status = 'out-of-stock' as const;
    } else if (newQuantity <= item.reorderLevel) {
      status = 'low-stock' as const;
    } else {
      status = 'in-stock' as const;
    }

    return this.updateItem(id, {
      stockQuantity: newQuantity,
      status
    });
  }

  async calculateSummary(): Promise<InventorySummary> {
    const allItems = await this.getAllItems();
    
    const summary: InventorySummary = {
      totalItems: allItems.length,
      totalValue: allItems.reduce((sum, item) => sum + (item.totalValue || 0), 0),
      lowStockItems: allItems.filter(item => (item.stockQuantity || 0) <= item.reorderLevel).length,
      outOfStockItems: allItems.filter(item => (item.stockQuantity || 0) <= 0).length,
      categories: [...new Set(allItems.map(item => item.category))]
    };

    return summary;
  }

  async getItemsByStatus(status: InventoryItem['status']): Promise<InventoryItem[]> {
    const allItems = await this.getAllItems();
    return allItems.filter(item => item.status === status);
  }

  async bulkUpdateItems(updates: Array<{ id: string; updates: Partial<InventoryItem> }>): Promise<InventoryItem[]> {
    const results: InventoryItem[] = [];
    
    for (const { id, updates: itemUpdates } of updates) {
      try {
        const updated = await this.updateItem(id, itemUpdates);
        results.push(updated);
      } catch (error) {
        console.error(`Failed to update item ${id}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  async bulkCreateItems(items: Array<Omit<InventoryItem, 'id' | 'lastUpdated'>>): Promise<InventoryItem[]> {
    const results: InventoryItem[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < items.length; i++) {
      try {
        const created = await this.createItem(items[i]);
        results.push(created);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        errors.push(`第 ${i + 1} 行: ${errorMsg}`);
      }
    }
    
    if (errors.length > 0 && results.length === 0) {
      throw new Error(`批量创建失败:\n${errors.join('\n')}`);
    }
    
    if (errors.length > 0) {
      console.warn(`部分创建失败:\n${errors.join('\n')}`);
    }
    
    return results;
  }

  async close(): Promise<void> {
    // No need to close in renderer process
    console.log('Inventory service closed');
  }
}

export default new InventoryService();