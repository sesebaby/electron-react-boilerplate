import {
  seedUnits,
  seedCategories,
  seedWarehouses,
  seedProducts,
  seedInventoryStocks
} from '../database/seedData';
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

      // 1. 初始化单位数据
      console.log('Initializing units...');
      for (const unit of seedUnits) {
        const existing = await unitService.findById(unit.id);
        if (!existing) {
          await unitService.create(unit);
        }
      }

      // 2. 初始化分类数据（按层级顺序）
      console.log('Initializing categories...');
      // 先创建一级分类（没有父分类的）
      const level1Categories = seedCategories.filter(cat => !cat.parentId);
      for (const category of level1Categories) {
        const existing = await categoryService.findById(category.id);
        if (!existing) {
          await categoryService.create(category);
        }
      }

      // 再创建二级分类（有父分类的）
      const level2Categories = seedCategories.filter(cat => cat.parentId);
      for (const category of level2Categories) {
        const existing = await categoryService.findById(category.id);
        if (!existing) {
          await categoryService.create(category);
        }
      }

      // 3. 初始化仓库数据并记录ID映射
      console.log('Initializing warehouses...');
      const warehouseIdMap = new Map<string, string>(); // 原ID -> 新ID的映射

      for (const warehouse of seedWarehouses) {
        const existing = await warehouseService.findByCode(warehouse.code);
        if (!existing) {
          const { id: originalId, createdAt, updatedAt, ...warehouseData } = warehouse;
          const createdWarehouse = await warehouseService.create(warehouseData);
          warehouseIdMap.set(originalId, createdWarehouse.id);
        } else {
          warehouseIdMap.set(warehouse.id, existing.id);
        }
      }

      // 4. 初始化商品数据并记录ID映射
      console.log('Initializing products...');
      const productIdMap = new Map<string, string>(); // 原ID -> 新ID的映射

      for (const product of seedProducts) {
        const existing = await productService.findBySku(product.sku);
        if (!existing) {
          const { id: originalId, createdAt, updatedAt, ...productData } = product;
          const createdProduct = await productService.create(productData);
          productIdMap.set(originalId, createdProduct.id);
        } else {
          productIdMap.set(product.id, existing.id);
        }
      }

      // 5. 初始化库存数据（使用实际的商品ID和仓库ID）
      console.log('Initializing inventory stocks...');
      for (const stock of seedInventoryStocks) {
        const actualProductId = productIdMap.get(stock.productId);
        const actualWarehouseId = warehouseIdMap.get(stock.warehouseId);

        if (!actualProductId) {
          console.warn(`Skipping stock for unknown product: ${stock.productId}`);
          continue;
        }

        if (!actualWarehouseId) {
          console.warn(`Skipping stock for unknown warehouse: ${stock.warehouseId}`);
          continue;
        }

        const existing = await inventoryStockService.findStockByProductAndWarehouse(actualProductId, actualWarehouseId);
        if (!existing) {
          // 使用实际的商品ID和仓库ID创建库存
          const { id, createdAt, updatedAt, productId, warehouseId, ...stockData } = stock;
          await inventoryStockService.createOrUpdateStock({
            ...stockData,
            productId: actualProductId,
            warehouseId: actualWarehouseId
          });
        }
      }

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
      // 注意：这里需要根据实际的服务实现来调用清空方法
      // 由于当前服务使用内存存储，重启应用即可清空
      
      this.initialized = false;
      console.log('Data reset completed');
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
