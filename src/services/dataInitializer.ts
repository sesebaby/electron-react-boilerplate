// Note: Seed data has been replaced with mock-data.sql
import {
  unitService,
  categoryService,
  warehouseService,
  productService,
  inventoryStockService,
  permissionService
} from './business';

export class DataInitializer {
  private static instance: DataInitializer;
  private initialized = false;

  static getInstance(): DataInitializer {
    if (!DataInitializer.instance) {
      DataInitializer.instance = new DataInitializer();
    }
    return DataInitializer.instance;
  }

  async initializeData(): Promise<void> {
    if (this.initialized) {
      console.log('Data already initialized');
      return;
    }

    try {
      console.log('Starting data initialization...');
      
      // 数据现在从数据库加载（通过 mock-data.sql），
      // 不再需要从 seedData 初始化
      console.log('Data is loaded from database (mock-data.sql)');
      
      // 初始化各个服务
      await unitService.initialize();
      await categoryService.initialize();
      await warehouseService.initialize();
      await productService.initialize();
      await inventoryStockService.initialize();
      await permissionService.initialize();

      this.initialized = true;
      console.log('Data initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize data:', error);
      throw error;
    }
  }

  async resetData(): Promise<void> {
    try {
      console.log('Resetting all data...');
      
      // 清空所有数据（按依赖关系倒序）
      // 注意：数据重置现在通过数据库操作完成
      // 可以使用 DataCleanupManager 进行数据清理
      
      this.initialized = false;
      console.log('Data reset completed - please use database reset tools');
    } catch (error) {
      console.error('Failed to reset data:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const dataInitializer = DataInitializer.getInstance();