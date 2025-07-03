export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  supplier: string;
  stockQuantity: number;
  reservedQuantity: number;
  unitPrice: number;
  totalValue: number;
  lastUpdated: Date;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'discontinued';
  location: string;
  reorderLevel: number;
  maxStock: number;
}

export interface InventorySummary {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  categories: string[];
}