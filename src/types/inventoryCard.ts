/**
 * 库存卡片视图相关类型定义
 */

export interface WarehouseCardData {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  description?: string;
  products: ProductStockInfo[];
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
}

export interface ProductStockInfo {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  lastUpdated: Date;
  category?: string;
}

export interface InventoryFilterOptions {
  warehouseIds: string[];
  searchKeyword: string;
  stockStatus: 'all' | 'normal' | 'low' | 'out';
  category: string;
  sortBy: 'name' | 'stock' | 'value' | 'updated';
  sortOrder: 'asc' | 'desc';
}

export interface InventoryCardViewState {
  warehouses: WarehouseCardData[];
  filteredWarehouses: WarehouseCardData[];
  filters: InventoryFilterOptions;
  loading: boolean;
  error: string | null;
  selectedWarehouse: string | null;
}

export type StockStatus = 'normal' | 'low' | 'out';

export interface StockStatusConfig {
  normal: {
    color: string;
    bgColor: string;
    icon: string;
    label: string;
  };
  low: {
    color: string;
    bgColor: string;
    icon: string;
    label: string;
  };
  out: {
    color: string;
    bgColor: string;
    icon: string;
    label: string;
  };
}
