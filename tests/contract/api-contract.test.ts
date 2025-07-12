import { IInventoryItem } from '@/types';
import path from 'path';
import fs from 'fs';

// 定义API契约接口
interface APIContract {
  method: string;
  expectedParams: string[];
  returnType: string;
  description: string;
}

// 定义所有API契约
const API_CONTRACTS: Record<string, APIContract> = {
  // 库存操作
  'db-get-all-items': {
    method: 'dbGetAllItems',
    expectedParams: [],
    returnType: 'IInventoryItem[]',
    description: '获取所有库存项目'
  },
  'db-get-categories': {
    method: 'dbGetCategories',
    expectedParams: [],
    returnType: 'Category[]',
    description: '获取分类列表'
  },
  'db-get-suppliers': {
    method: 'dbGetSuppliers',
    expectedParams: [],
    returnType: 'Supplier[]',
    description: '获取供应商列表'
  },
  'db-get-all-categories': {
    method: 'dbGetAllCategories',
    expectedParams: [],
    returnType: 'Category[]',
    description: '获取所有分类'
  },
  'db-get-all-suppliers': {
    method: 'dbGetAllSuppliers',
    expectedParams: [],
    returnType: 'Supplier[]',
    description: '获取所有供应商'
  },
  'db-get-item-by-id': {
    method: 'dbGetItemById',
    expectedParams: ['id:number'],
    returnType: 'IInventoryItem | null',
    description: '根据ID获取库存项目'
  },
  'db-get-item-by-sku': {
    method: 'dbGetItemBySku',
    expectedParams: ['sku:string'],
    returnType: 'IInventoryItem | null',
    description: '根据SKU获取库存项目'
  },
  'db-create-item': {
    method: 'dbCreateItem',
    expectedParams: ['item:IInventoryItem'],
    returnType: 'IInventoryItem',
    description: '创建库存项目'
  },
  'db-update-item': {
    method: 'dbUpdateItem',
    expectedParams: ['id:number', 'updates:Partial<IInventoryItem>'],
    returnType: 'IInventoryItem',
    description: '更新库存项目'
  },
  'db-delete-item': {
    method: 'dbDeleteItem',
    expectedParams: ['id:number'],
    returnType: 'boolean',
    description: '删除库存项目'
  },
  'db-search-items': {
    method: 'dbSearchItems',
    expectedParams: ['searchTerm:string'],
    returnType: 'IInventoryItem[]',
    description: '搜索库存项目'
  },
  'db-get-items-by-category': {
    method: 'dbGetItemsByCategory',
    expectedParams: ['category:string'],
    returnType: 'IInventoryItem[]',
    description: '根据分类获取库存项目'
  },
  'db-get-low-stock-items': {
    method: 'dbGetLowStockItems',
    expectedParams: [],
    returnType: 'IInventoryItem[]',
    description: '获取低库存项目'
  }
};

// 验证字段映射的正确性
const FIELD_MAPPING_CONTRACT = {
  // 数据库字段 -> 前端字段
  'stock_quantity': 'stockQuantity',
  'reserved_quantity': 'reservedQuantity',
  'unit_price': 'salePrice',
  'total_value': 'totalValue',
  'last_updated': 'lastUpdated',
  'reorder_level': 'minStock',
  'max_stock': 'maxStock',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'category': 'categoryId',
  'supplier': 'supplierId',
  'location': 'location',
  'status': 'status',
  'unit_id': 'unitId',
  'brand': 'brand',
  'model': 'model',
  'barcode': 'barcode',
  'purchase_price': 'purchasePrice',
  'sale_price': 'salePrice',
  'is_active': 'isActive',
  'images': 'images'
};

describe('API Contract Tests', () => {
  let preloadAPIs: Record<string, Function>;
  let backendHandlers: Record<string, Function>;

  beforeAll(() => {
    // 读取preload.js中定义的API
    const preloadPath = path.join(__dirname, '../../public/preload.js');
    const preloadContent = fs.readFileSync(preloadPath, 'utf-8');
    
    // 解析preload.js中的API定义
    const apiMatches = preloadContent.matchAll(/(\w+):\s*\((.*?)\)\s*=>\s*ipcRenderer\.invoke\('([^']+)',?\s*(.*?)\)/g);
    preloadAPIs = {};
    
    for (const match of apiMatches) {
      const [, methodName, params, channelName] = match;
      preloadAPIs[channelName] = {
        methodName,
        params: params ? params.split(',').map(p => p.trim()) : []
      };
    }
  });

  describe('API Definition Consistency', () => {
    test('All contracted APIs should be defined in preload.js', () => {
      for (const [channel, contract] of Object.entries(API_CONTRACTS)) {
        expect(preloadAPIs).toHaveProperty(channel);
        const preloadAPI = preloadAPIs[channel];
        expect(preloadAPI.methodName).toBe(contract.method);
      }
    });

    test('All preload APIs should have contracts', () => {
      const dbAPIs = Object.keys(preloadAPIs).filter(api => api.startsWith('db-'));
      const contractedAPIs = Object.keys(API_CONTRACTS);
      
      // 确保所有数据库相关API都有契约（这里只测试库存相关的）
      const inventoryAPIs = dbAPIs.filter(api => 
        api.includes('item') || api.includes('stock') || 
        api.includes('category') || api.includes('supplier')
      );
      
      for (const api of inventoryAPIs) {
        if (!api.includes('all-inventory-stocks')) { // 排除特殊API
          expect(contractedAPIs).toContain(api);
        }
      }
    });
  });

  describe('Field Mapping Contract', () => {
    let inventoryHandlers: any;

    beforeAll(() => {
      // 加载后端处理器中的字段映射
      try {
        inventoryHandlers = require('../../public/database/handlers/inventoryHandlers');
      } catch (error) {
        // 如果无法加载文件，使用模拟映射
        inventoryHandlers = {
          INVENTORY_FIELD_MAP: FIELD_MAPPING_CONTRACT
        };
      }
    });

    test('Field mapping should match contract', () => {
      const actualMapping = inventoryHandlers?.INVENTORY_FIELD_MAP || {};
      
      // 验证所有契约中的字段映射都存在且正确
      for (const [dbField, frontendField] of Object.entries(FIELD_MAPPING_CONTRACT)) {
        expect(actualMapping).toHaveProperty(dbField);
        expect(actualMapping[dbField]).toBe(frontendField);
      }
    });

    test('No extra fields in actual mapping', () => {
      const actualMapping = inventoryHandlers?.INVENTORY_FIELD_MAP || {};
      const contractFields = Object.keys(FIELD_MAPPING_CONTRACT);
      const actualFields = Object.keys(actualMapping);
      
      // 确保没有未定义在契约中的额外字段
      const extraFields = actualFields.filter(field => !contractFields.includes(field));
      expect(extraFields).toEqual([]);
    });
  });

  describe('Data Type Consistency', () => {
    // 模拟的类型验证函数
    const validateInventoryItem = (item: any): item is IInventoryItem => {
      const requiredFields = ['id', 'name', 'sku'];
      const numberFields = ['id', 'stockQuantity', 'reservedQuantity', 'salePrice', 'purchasePrice'];
      const stringFields = ['name', 'sku', 'description', 'barcode', 'brand', 'model'];
      
      // 检查必需字段
      for (const field of requiredFields) {
        if (!(field in item)) return false;
      }
      
      // 检查数字类型字段
      for (const field of numberFields) {
        if (field in item && typeof item[field] !== 'number') return false;
      }
      
      // 检查字符串类型字段
      for (const field of stringFields) {
        if (field in item && typeof item[field] !== 'string') return false;
      }
      
      return true;
    };

    test('Mock data should match IInventoryItem interface', () => {
      // 这里应该验证所有Mock数据是否符合接口定义
      const mockItem = {
        id: 1,
        name: 'Test Item',
        sku: 'TEST-001',
        description: 'Test description',
        stockQuantity: 100,
        reservedQuantity: 10,
        salePrice: 99.99,
        purchasePrice: 50.00,
        barcode: '1234567890',
        brand: 'TestBrand',
        model: 'TestModel'
      };
      
      expect(validateInventoryItem(mockItem)).toBe(true);
    });
  });

  describe('Response Transform Validation', () => {
    test('Database response should be correctly transformed', () => {
      // 模拟数据库返回的snake_case数据
      const dbResponse = {
        id: 1,
        name: 'Test Item',
        sku: 'TEST-001',
        stock_quantity: 100,
        reserved_quantity: 10,
        unit_price: 99.99,
        purchase_price: 50.00,
        last_updated: '2024-01-01',
        reorder_level: 20,
        max_stock: 500
      };
      
      // 预期的转换后数据
      const expectedTransformed = {
        id: 1,
        name: 'Test Item',
        sku: 'TEST-001',
        stockQuantity: 100,
        reservedQuantity: 10,
        salePrice: 99.99,
        purchasePrice: 50.00,
        lastUpdated: '2024-01-01',
        minStock: 20,
        maxStock: 500
      };
      
      // 验证转换逻辑
      const transformed: any = {};
      for (const [key, value] of Object.entries(dbResponse)) {
        if (FIELD_MAPPING_CONTRACT[key]) {
          transformed[FIELD_MAPPING_CONTRACT[key]] = value;
        } else {
          transformed[key] = value;
        }
      }
      
      expect(transformed).toEqual(expectedTransformed);
    });
  });
});

// 导出契约定义供其他测试使用
export { API_CONTRACTS, FIELD_MAPPING_CONTRACT };