/**
 * 中央化Mock数据管理
 * 确保所有测试使用一致的、反映真实后端响应的Mock数据
 */

import { IInventoryItem } from '@/types';
import { FIELD_MAPPING_CONTRACT } from '../contract/api-contract.test';

/**
 * 模拟数据库响应（snake_case格式）
 */
export interface DatabaseInventoryItem {
  id: number;
  name: string;
  description?: string;
  sku: string;
  stock_quantity: number;
  reserved_quantity: number;
  unit_price: number;
  total_value: number;
  last_updated: string;
  reorder_level: number;
  max_stock: number;
  created_at: string;
  updated_at: string;
  category?: number;
  supplier?: number;
  location?: string;
  status: string;
  unit_id?: number;
  brand?: string;
  model?: string;
  barcode?: string;
  purchase_price: number;
  is_active: boolean;
  images?: string;
}

/**
 * 将数据库格式转换为前端格式
 */
export function transformDatabaseToFrontend(dbItem: DatabaseInventoryItem): IInventoryItem {
  const transformed: any = {};
  
  for (const [key, value] of Object.entries(dbItem)) {
    const mappedKey = FIELD_MAPPING_CONTRACT[key] || key;
    transformed[mappedKey] = value;
  }
  
  // 确保必需字段存在
  return {
    id: transformed.id,
    name: transformed.name,
    description: transformed.description || '',
    sku: transformed.sku,
    stockQuantity: transformed.stockQuantity || 0,
    reservedQuantity: transformed.reservedQuantity || 0,
    availableQuantity: (transformed.stockQuantity || 0) - (transformed.reservedQuantity || 0),
    salePrice: transformed.salePrice || 0,
    purchasePrice: transformed.purchasePrice || 0,
    totalValue: transformed.totalValue || 0,
    lastUpdated: transformed.lastUpdated || new Date().toISOString(),
    minStock: transformed.minStock || 0,
    maxStock: transformed.maxStock || 0,
    categoryId: transformed.categoryId,
    supplierId: transformed.supplierId,
    location: transformed.location || '',
    status: transformed.status || 'active',
    unitId: transformed.unitId,
    brand: transformed.brand || '',
    model: transformed.model || '',
    barcode: transformed.barcode || '',
    isActive: transformed.isActive !== false,
    images: transformed.images ? JSON.parse(transformed.images) : [],
    createdAt: transformed.createdAt || new Date().toISOString(),
    updatedAt: transformed.updatedAt || new Date().toISOString()
  } as IInventoryItem;
}

/**
 * 中央Mock数据库响应
 */
export const MOCK_DB_ITEMS: DatabaseInventoryItem[] = [
  {
    id: 1,
    name: '无线鼠标',
    description: '高精度光学无线鼠标，2.4GHz连接',
    sku: 'MOUSE-001',
    stock_quantity: 150,
    reserved_quantity: 20,
    unit_price: 99.99,
    total_value: 14998.50,
    last_updated: '2024-01-15T10:30:00Z',
    reorder_level: 30,
    max_stock: 300,
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    category: 1,
    supplier: 1,
    location: 'A-01-01',
    status: 'active',
    unit_id: 1,
    brand: '罗技',
    model: 'M705',
    barcode: '1234567890123',
    purchase_price: 65.00,
    is_active: true,
    images: '["https://example.com/mouse1.jpg", "https://example.com/mouse2.jpg"]'
  },
  {
    id: 2,
    name: '机械键盘',
    description: 'RGB背光机械键盘，青轴',
    sku: 'KB-002',
    stock_quantity: 85,
    reserved_quantity: 10,
    unit_price: 299.99,
    total_value: 25499.15,
    last_updated: '2024-01-14T15:20:00Z',
    reorder_level: 20,
    max_stock: 200,
    created_at: '2024-01-02T09:00:00Z',
    updated_at: '2024-01-14T15:20:00Z',
    category: 1,
    supplier: 2,
    location: 'A-02-01',
    status: 'active',
    unit_id: 1,
    brand: '樱桃',
    model: 'MX8.0',
    barcode: '1234567890124',
    purchase_price: 180.00,
    is_active: true,
    images: '["https://example.com/kb1.jpg"]'
  },
  {
    id: 3,
    name: 'USB-C数据线',
    description: '高速USB-C充电数据线，支持快充',
    sku: 'CABLE-003',
    stock_quantity: 500,
    reserved_quantity: 50,
    unit_price: 29.99,
    total_value: 14995.00,
    last_updated: '2024-01-13T12:00:00Z',
    reorder_level: 100,
    max_stock: 1000,
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-13T12:00:00Z',
    category: 2,
    supplier: 3,
    location: 'B-01-05',
    status: 'active',
    unit_id: 1,
    brand: '绿联',
    model: 'UC-100',
    barcode: '1234567890125',
    purchase_price: 15.00,
    is_active: true,
    images: '[]'
  }
];

/**
 * 获取前端格式的Mock数据
 */
export function getMockInventoryItems(): IInventoryItem[] {
  return MOCK_DB_ITEMS.map(transformDatabaseToFrontend);
}

/**
 * 根据ID获取Mock数据
 */
export function getMockInventoryItemById(id: number): IInventoryItem | null {
  const dbItem = MOCK_DB_ITEMS.find(item => item.id === id);
  return dbItem ? transformDatabaseToFrontend(dbItem) : null;
}

/**
 * 根据SKU获取Mock数据
 */
export function getMockInventoryItemBySku(sku: string): IInventoryItem | null {
  const dbItem = MOCK_DB_ITEMS.find(item => item.sku === sku);
  return dbItem ? transformDatabaseToFrontend(dbItem) : null;
}

/**
 * 搜索Mock数据
 */
export function searchMockInventoryItems(searchTerm: string): IInventoryItem[] {
  const term = searchTerm.toLowerCase();
  const filtered = MOCK_DB_ITEMS.filter(item => 
    item.name.toLowerCase().includes(term) ||
    item.sku.toLowerCase().includes(term) ||
    item.description?.toLowerCase().includes(term) ||
    item.brand?.toLowerCase().includes(term) ||
    item.model?.toLowerCase().includes(term)
  );
  return filtered.map(transformDatabaseToFrontend);
}

/**
 * 获取低库存Mock数据
 */
export function getMockLowStockItems(): IInventoryItem[] {
  const lowStock = MOCK_DB_ITEMS.filter(item => 
    item.stock_quantity <= item.reorder_level
  );
  return lowStock.map(transformDatabaseToFrontend);
}

/**
 * Mock分类数据
 */
export const MOCK_CATEGORIES = [
  { id: 1, name: '电脑配件', description: '键盘、鼠标等电脑外设' },
  { id: 2, name: '数据线材', description: '各类数据线和转接头' },
  { id: 3, name: '存储设备', description: 'U盘、移动硬盘等' }
];

/**
 * Mock供应商数据
 */
export const MOCK_SUPPLIERS = [
  { id: 1, name: '罗技科技', contact: '张经理', phone: '13800138001' },
  { id: 2, name: '樱桃电子', contact: '李经理', phone: '13800138002' },
  { id: 3, name: '绿联数码', contact: '王经理', phone: '13800138003' }
];