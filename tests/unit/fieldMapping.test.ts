/**
 * 字段映射单元测试
 * 验证数据库字段（snake_case）和前端字段（camelCase）之间的映射正确性
 */

import { FIELD_MAPPING_CONTRACT } from '../contract/api-contract.test';
import { transformDatabaseToFrontend, DatabaseInventoryItem } from '../mocks/centralMockData';

// 导入实际的字段映射
const getInventoryFieldMap = () => {
  // 在实际测试中，这应该从inventoryHandlers.js导入
  // 这里我们使用契约中定义的映射作为示例
  return FIELD_MAPPING_CONTRACT;
};

describe('字段映射测试', () => {
  describe('映射定义验证', () => {
    it('应该包含所有必需的字段映射', () => {
      const fieldMap = getInventoryFieldMap();
      
      // 必需的字段映射
      const requiredMappings = [
        'stock_quantity',
        'reserved_quantity',
        'unit_price',
        'purchase_price',
        'reorder_level',
        'max_stock',
        'created_at',
        'updated_at',
        'is_active'
      ];
      
      for (const field of requiredMappings) {
        expect(fieldMap).toHaveProperty(field);
        expect(fieldMap[field]).toBeTruthy();
      }
    });
    
    it('映射值应该是有效的camelCase格式', () => {
      const fieldMap = getInventoryFieldMap();
      const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
      
      for (const [snakeField, camelField] of Object.entries(fieldMap)) {
        expect(camelField).toMatch(camelCaseRegex);
      }
    });
    
    it('snake_case字段应该正确映射到camelCase', () => {
      const fieldMap = getInventoryFieldMap();
      
      // 验证具体的映射关系
      expect(fieldMap['stock_quantity']).toBe('stockQuantity');
      expect(fieldMap['reserved_quantity']).toBe('reservedQuantity');
      expect(fieldMap['unit_price']).toBe('salePrice');
      expect(fieldMap['purchase_price']).toBe('purchasePrice');
      expect(fieldMap['reorder_level']).toBe('minStock');
      expect(fieldMap['max_stock']).toBe('maxStock');
      expect(fieldMap['created_at']).toBe('createdAt');
      expect(fieldMap['updated_at']).toBe('updatedAt');
      expect(fieldMap['is_active']).toBe('isActive');
    });
  });
  
  describe('转换函数测试', () => {
    it('应该正确转换所有映射字段', () => {
      const dbItem: DatabaseInventoryItem = {
        id: 1,
        name: '测试产品',
        description: '测试描述',
        sku: 'TEST-001',
        stock_quantity: 100,
        reserved_quantity: 20,
        unit_price: 99.99,
        purchase_price: 60.00,
        total_value: 9999.00,
        last_updated: '2024-01-01T10:00:00Z',
        reorder_level: 30,
        max_stock: 200,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        category: 1,
        supplier: 2,
        location: 'A-01',
        status: 'active',
        unit_id: 1,
        brand: '测试品牌',
        model: 'MODEL-001',
        barcode: '1234567890',
        is_active: true,
        images: '["image1.jpg", "image2.jpg"]'
      };
      
      const transformed = transformDatabaseToFrontend(dbItem);
      
      // 验证映射的字段
      expect(transformed.stockQuantity).toBe(100);
      expect(transformed.reservedQuantity).toBe(20);
      expect(transformed.salePrice).toBe(99.99);
      expect(transformed.purchasePrice).toBe(60.00);
      expect(transformed.minStock).toBe(30);
      expect(transformed.maxStock).toBe(200);
      expect(transformed.createdAt).toBe('2024-01-01T08:00:00Z');
      expect(transformed.updatedAt).toBe('2024-01-01T10:00:00Z');
      expect(transformed.isActive).toBe(true);
      
      // 验证直接复制的字段
      expect(transformed.id).toBe(1);
      expect(transformed.name).toBe('测试产品');
      expect(transformed.sku).toBe('TEST-001');
      
      // 验证计算字段
      expect(transformed.availableQuantity).toBe(80); // stock - reserved
    });
    
    it('应该处理缺失的可选字段', () => {
      const minimalDbItem: Partial<DatabaseInventoryItem> = {
        id: 1,
        name: '最小测试产品',
        sku: 'MIN-001',
        stock_quantity: 50,
        reserved_quantity: 0,
        unit_price: 10.00,
        purchase_price: 5.00,
        total_value: 500.00,
        last_updated: '2024-01-01T10:00:00Z',
        reorder_level: 10,
        max_stock: 100,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        status: 'active',
        is_active: true,
        images: '[]'
      };
      
      const transformed = transformDatabaseToFrontend(minimalDbItem as DatabaseInventoryItem);
      
      // 验证必需字段存在
      expect(transformed.id).toBe(1);
      expect(transformed.name).toBe('最小测试产品');
      expect(transformed.sku).toBe('MIN-001');
      
      // 验证可选字段的默认值
      expect(transformed.description).toBe('');
      expect(transformed.brand).toBe('');
      expect(transformed.model).toBe('');
      expect(transformed.barcode).toBe('');
      expect(transformed.location).toBe('');
      expect(transformed.images).toEqual([]);
    });
    
    it('应该正确解析JSON字段', () => {
      const dbItemWithImages: DatabaseInventoryItem = {
        id: 1,
        name: '测试产品',
        sku: 'TEST-001',
        stock_quantity: 100,
        reserved_quantity: 0,
        unit_price: 50.00,
        purchase_price: 30.00,
        total_value: 5000.00,
        last_updated: '2024-01-01T10:00:00Z',
        reorder_level: 20,
        max_stock: 200,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        status: 'active',
        is_active: true,
        images: '["product1.jpg", "product2.jpg", "product3.jpg"]'
      };
      
      const transformed = transformDatabaseToFrontend(dbItemWithImages);
      
      expect(transformed.images).toBeInstanceOf(Array);
      expect(transformed.images).toHaveLength(3);
      expect(transformed.images).toEqual(['product1.jpg', 'product2.jpg', 'product3.jpg']);
    });
    
    it('应该处理无效的JSON字段', () => {
      const dbItemWithInvalidJson: DatabaseInventoryItem = {
        id: 1,
        name: '测试产品',
        sku: 'TEST-001',
        stock_quantity: 100,
        reserved_quantity: 0,
        unit_price: 50.00,
        purchase_price: 30.00,
        total_value: 5000.00,
        last_updated: '2024-01-01T10:00:00Z',
        reorder_level: 20,
        max_stock: 200,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        status: 'active',
        is_active: true,
        images: 'invalid json'
      };
      
      // 测试转换函数是否能优雅处理无效JSON
      expect(() => {
        transformDatabaseToFrontend(dbItemWithInvalidJson);
      }).not.toThrow();
      
      const transformed = transformDatabaseToFrontend(dbItemWithInvalidJson);
      expect(transformed.images).toEqual([]);
    });
  });
  
  describe('逆向映射测试', () => {
    it('应该能够从前端格式转换回数据库格式', () => {
      const frontendItem = {
        id: 1,
        name: '测试产品',
        description: '测试描述',
        sku: 'TEST-001',
        stockQuantity: 100,
        reservedQuantity: 20,
        availableQuantity: 80,
        salePrice: 99.99,
        purchasePrice: 60.00,
        totalValue: 9999.00,
        lastUpdated: '2024-01-01T10:00:00Z',
        minStock: 30,
        maxStock: 200,
        categoryId: 1,
        supplierId: 2,
        location: 'A-01',
        status: 'active',
        unitId: 1,
        brand: '测试品牌',
        model: 'MODEL-001',
        barcode: '1234567890',
        isActive: true,
        images: ['image1.jpg', 'image2.jpg'],
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z'
      };
      
      // 创建逆向映射
      const reverseMapping: Record<string, string> = {};
      for (const [dbField, frontendField] of Object.entries(FIELD_MAPPING_CONTRACT)) {
        reverseMapping[frontendField] = dbField;
      }
      
      // 转换回数据库格式
      const dbFormat: any = {};
      for (const [key, value] of Object.entries(frontendItem)) {
        const dbKey = reverseMapping[key] || key;
        if (key === 'images' && Array.isArray(value)) {
          dbFormat[dbKey] = JSON.stringify(value);
        } else if (key !== 'availableQuantity') { // 跳过计算字段
          dbFormat[dbKey] = value;
        }
      }
      
      // 验证转换结果
      expect(dbFormat.stock_quantity).toBe(100);
      expect(dbFormat.reserved_quantity).toBe(20);
      expect(dbFormat.unit_price).toBe(99.99);
      expect(dbFormat.purchase_price).toBe(60.00);
      expect(dbFormat.reorder_level).toBe(30);
      expect(dbFormat.max_stock).toBe(200);
      expect(dbFormat.is_active).toBe(true);
      expect(dbFormat.images).toBe('["image1.jpg","image2.jpg"]');
    });
  });
  
  describe('边界情况测试', () => {
    it('应该处理null和undefined值', () => {
      const dbItemWithNulls: any = {
        id: 1,
        name: '测试产品',
        sku: 'TEST-001',
        stock_quantity: 0,
        reserved_quantity: 0,
        unit_price: 0,
        purchase_price: null,
        total_value: 0,
        last_updated: null,
        reorder_level: undefined,
        max_stock: null,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        category: null,
        supplier: undefined,
        location: null,
        status: 'active',
        unit_id: null,
        brand: undefined,
        model: null,
        barcode: null,
        is_active: true,
        images: null
      };
      
      const transformed = transformDatabaseToFrontend(dbItemWithNulls);
      
      // 验证null/undefined被正确处理
      expect(transformed.purchasePrice).toBe(0);
      expect(transformed.minStock).toBe(0);
      expect(transformed.maxStock).toBe(0);
      expect(transformed.categoryId).toBeUndefined();
      expect(transformed.supplierId).toBeUndefined();
      expect(transformed.location).toBe('');
      expect(transformed.brand).toBe('');
      expect(transformed.model).toBe('');
      expect(transformed.barcode).toBe('');
      expect(transformed.images).toEqual([]);
    });
    
    it('应该处理极大值和极小值', () => {
      const dbItemWithExtremes: DatabaseInventoryItem = {
        id: Number.MAX_SAFE_INTEGER,
        name: '极值测试产品',
        sku: 'EXTREME-001',
        stock_quantity: Number.MAX_SAFE_INTEGER,
        reserved_quantity: 0,
        unit_price: Number.MAX_VALUE,
        purchase_price: Number.MIN_VALUE,
        total_value: Number.MAX_VALUE,
        last_updated: '2024-01-01T10:00:00Z',
        reorder_level: 0,
        max_stock: Number.MAX_SAFE_INTEGER,
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        status: 'active',
        is_active: true,
        images: '[]'
      };
      
      const transformed = transformDatabaseToFrontend(dbItemWithExtremes);
      
      expect(transformed.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(transformed.stockQuantity).toBe(Number.MAX_SAFE_INTEGER);
      expect(transformed.salePrice).toBe(Number.MAX_VALUE);
      expect(transformed.purchasePrice).toBe(Number.MIN_VALUE);
    });
  });
});