/**
 * Mock数据提供者
 * 为不同测试场景提供一致的Mock数据
 */

import { 
  getMockInventoryItems,
  getMockInventoryItemById,
  getMockInventoryItemBySku,
  searchMockInventoryItems,
  getMockLowStockItems,
  MOCK_CATEGORIES,
  MOCK_SUPPLIERS,
  DatabaseInventoryItem,
  MOCK_DB_ITEMS
} from './centralMockData';

/**
 * Mock数据提供者类
 * 统一管理所有测试的Mock数据
 */
export class MockDataProvider {
  private static instance: MockDataProvider;
  
  private constructor() {}
  
  static getInstance(): MockDataProvider {
    if (!MockDataProvider.instance) {
      MockDataProvider.instance = new MockDataProvider();
    }
    return MockDataProvider.instance;
  }
  
  /**
   * 获取所有库存项目
   */
  getAllItems() {
    return getMockInventoryItems();
  }
  
  /**
   * 获取原始数据库格式数据（用于后端测试）
   */
  getRawDatabaseItems(): DatabaseInventoryItem[] {
    return [...MOCK_DB_ITEMS];
  }
  
  /**
   * 根据ID获取项目
   */
  getItemById(id: number) {
    return getMockInventoryItemById(id);
  }
  
  /**
   * 根据SKU获取项目
   */
  getItemBySku(sku: string) {
    return getMockInventoryItemBySku(sku);
  }
  
  /**
   * 搜索项目
   */
  searchItems(searchTerm: string) {
    return searchMockInventoryItems(searchTerm);
  }
  
  /**
   * 获取低库存项目
   */
  getLowStockItems() {
    return getMockLowStockItems();
  }
  
  /**
   * 获取分类
   */
  getCategories() {
    return [...MOCK_CATEGORIES];
  }
  
  /**
   * 获取供应商
   */
  getSuppliers() {
    return [...MOCK_SUPPLIERS];
  }
  
  /**
   * 创建测试场景数据
   */
  createScenarioData(scenario: 'normal' | 'low-stock' | 'empty' | 'large') {
    switch (scenario) {
      case 'normal':
        return this.getAllItems();
      
      case 'low-stock':
        return this.getLowStockItems();
      
      case 'empty':
        return [];
      
      case 'large':
        // 创建大量数据用于性能测试
        const items = [];
        for (let i = 0; i < 1000; i++) {
          items.push({
            ...this.getAllItems()[0],
            id: i + 1,
            sku: `TEST-${String(i + 1).padStart(4, '0')}`,
            name: `测试商品 ${i + 1}`
          });
        }
        return items;
      
      default:
        return this.getAllItems();
    }
  }
  
  /**
   * 创建无效数据（用于错误测试）
   */
  createInvalidData() {
    return {
      missingRequired: {
        // 缺少必需字段
        description: '测试商品',
        stockQuantity: 100
      },
      invalidTypes: {
        // 类型错误
        id: 'invalid-id',
        name: 123,
        sku: null,
        stockQuantity: '100'
      },
      negativeValues: {
        // 负值
        id: 1,
        name: '测试商品',
        sku: 'TEST-001',
        stockQuantity: -10,
        salePrice: -99.99
      }
    };
  }
  
  /**
   * 重置Mock数据（用于测试隔离）
   */
  reset() {
    // 如果需要，可以在这里重置任何状态
    // 当前实现是无状态的，所以不需要重置
  }
}

// 导出单例实例
export const mockDataProvider = MockDataProvider.getInstance();