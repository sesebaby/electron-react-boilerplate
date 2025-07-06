import {
  warehouseService,
  categoryService,
  productService,
  inventoryStockService,
  unitService
} from '../services/business';
import { ProductStatus } from '../types/entities';

/**
 * 测试数据初始化器
 */
export class TestDataInitializer {
  
  /**
   * 初始化库存卡片视图测试数据
   */
  async initializeInventoryCardTestData(): Promise<void> {
    try {
      console.log('开始初始化库存卡片视图测试数据...');

      // 1. 创建仓库
      const warehouses = [
        {
          name: '主仓库',
          code: 'WH001',
          address: '北京市朝阳区 - 主要存储仓库，存放常用商品',
          manager: '张三',
          isDefault: true
        },
        {
          name: '备用仓库',
          code: 'WH002',
          address: '北京市海淀区 - 备用存储仓库，存放季节性商品',
          manager: '李四',
          isDefault: false
        },
        {
          name: '冷链仓库',
          code: 'WH003',
          address: '北京市丰台区 - 冷链存储仓库，存放生鲜商品',
          manager: '王五',
          isDefault: false
        }
      ];

      const createdWarehouses = [];
      for (const warehouse of warehouses) {
        try {
          const existing = await warehouseService.findByCode(warehouse.code);
          if (!existing) {
            const created = await warehouseService.create(warehouse);
            createdWarehouses.push(created);
            console.log(`创建仓库: ${warehouse.name}`);
          } else {
            createdWarehouses.push(existing);
            console.log(`仓库已存在: ${warehouse.name}`);
          }
        } catch (error) {
          console.error(`创建仓库失败: ${warehouse.name}`, error);
        }
      }

      // 2. 创建商品分类
      const categories = [
        { name: '电子产品', description: '手机、电脑、数码设备等', level: 1, sortOrder: 1, isActive: true },
        { name: '服装鞋帽', description: '男装、女装、童装、鞋类等', level: 1, sortOrder: 2, isActive: true },
        { name: '食品饮料', description: '零食、饮料、生鲜食品等', level: 1, sortOrder: 3, isActive: true },
        { name: '家居用品', description: '家具、装饰品、日用品等', level: 1, sortOrder: 4, isActive: true },
        { name: '图书文具', description: '图书、文具、办公用品等', level: 1, sortOrder: 5, isActive: true }
      ];

      const createdCategories = [];
      for (const category of categories) {
        try {
          const existing = await categoryService.findAll();
          const existingCategory = existing.find(c => c.name === category.name);
          if (!existingCategory) {
            const created = await categoryService.create(category);
            createdCategories.push(created);
            console.log(`创建分类: ${category.name}`);
          } else {
            createdCategories.push(existingCategory);
            console.log(`分类已存在: ${category.name}`);
          }
        } catch (error) {
          console.error(`创建分类失败: ${category.name}`, error);
        }
      }

      // 3. 创建计量单位
      const units = [
        { name: '台', symbol: '台', precision: 0 },
        { name: '件', symbol: '件', precision: 0 },
        { name: '双', symbol: '双', precision: 0 },
        { name: '瓶', symbol: '瓶', precision: 0 },
        { name: '包', symbol: '包', precision: 0 },
        { name: '块', symbol: '块', precision: 0 },
        { name: '把', symbol: '把', precision: 0 },
        { name: '个', symbol: '个', precision: 0 },
        { name: '本', symbol: '本', precision: 0 },
        { name: '支', symbol: '支', precision: 0 }
      ];

      const createdUnits = [];
      for (const unit of units) {
        try {
          const existing = await unitService.findAll();
          const existingUnit = existing.find(u => u.name === unit.name);
          if (!existingUnit) {
            const created = await unitService.create(unit);
            createdUnits.push(created);
            console.log(`创建单位: ${unit.name}`);
          } else {
            createdUnits.push(existingUnit);
            console.log(`单位已存在: ${unit.name}`);
          }
        } catch (error) {
          console.error(`创建单位失败: ${unit.name}`, error);
        }
      }

      // 4. 创建商品
      const products = [
        // 电子产品
        { name: 'iPhone 15 Pro', sku: 'IP15P001', categoryName: '电子产品', unitName: '台', purchasePrice: 7999, salePrice: 8999, minStock: 10, maxStock: 100 },
        { name: 'MacBook Pro 16"', sku: 'MBP16001', categoryName: '电子产品', unitName: '台', purchasePrice: 17999, salePrice: 19999, minStock: 5, maxStock: 50 },
        { name: '小米13 Ultra', sku: 'MI13U001', categoryName: '电子产品', unitName: '台', purchasePrice: 5299, salePrice: 5999, minStock: 15, maxStock: 80 },

        // 服装鞋帽
        { name: '男士休闲T恤', sku: 'MT001', categoryName: '服装鞋帽', unitName: '件', purchasePrice: 149, salePrice: 199, minStock: 50, maxStock: 500 },
        { name: '女士连衣裙', sku: 'WD001', categoryName: '服装鞋帽', unitName: '件', purchasePrice: 299, salePrice: 399, minStock: 30, maxStock: 300 },
        { name: '运动鞋', sku: 'SS001', categoryName: '服装鞋帽', unitName: '双', purchasePrice: 449, salePrice: 599, minStock: 20, maxStock: 200 },

        // 食品饮料
        { name: '矿泉水', sku: 'MW001', categoryName: '食品饮料', unitName: '瓶', purchasePrice: 1.5, salePrice: 2, minStock: 1000, maxStock: 5000 },
        { name: '薯片', sku: 'PC001', categoryName: '食品饮料', unitName: '包', purchasePrice: 6, salePrice: 8, minStock: 200, maxStock: 1000 },
        { name: '巧克力', sku: 'CH001', categoryName: '食品饮料', unitName: '块', purchasePrice: 12, salePrice: 15, minStock: 100, maxStock: 800 },

        // 家居用品
        { name: '办公椅', sku: 'OC001', categoryName: '家居用品', unitName: '把', purchasePrice: 699, salePrice: 899, minStock: 10, maxStock: 100 },
        { name: '台灯', sku: 'TL001', categoryName: '家居用品', unitName: '个', purchasePrice: 229, salePrice: 299, minStock: 20, maxStock: 150 },

        // 图书文具
        { name: '笔记本', sku: 'NB001', categoryName: '图书文具', unitName: '本', purchasePrice: 18, salePrice: 25, minStock: 100, maxStock: 1000 },
        { name: '圆珠笔', sku: 'BP001', categoryName: '图书文具', unitName: '支', purchasePrice: 2, salePrice: 3, minStock: 500, maxStock: 2000 }
      ];

      const createdProducts = [];
      for (const product of products) {
        try {
          const existing = await productService.findAll();
          const existingProduct = existing.find(p => p.sku === product.sku);
          if (!existingProduct) {
            // 查找分类和单位ID
            const category = createdCategories.find(c => c.name === product.categoryName);
            const unit = createdUnits.find(u => u.name === product.unitName);

            if (!category || !unit) {
              console.warn(`跳过商品 ${product.name}: 分类或单位不存在`);
              continue;
            }

            const productData = {
              name: product.name,
              sku: product.sku,
              categoryId: category.id,
              unitId: unit.id,
              purchasePrice: product.purchasePrice,
              salePrice: product.salePrice,
              minStock: product.minStock,
              maxStock: product.maxStock,
              status: ProductStatus.ACTIVE,
              isActive: true
            };

            const created = await productService.create(productData);
            createdProducts.push(created);
            console.log(`创建商品: ${product.name}`);
          } else {
            createdProducts.push(existingProduct);
            console.log(`商品已存在: ${product.name}`);
          }
        } catch (error) {
          console.error(`创建商品失败: ${product.name}`, error);
        }
      }

      // 5. 创建库存记录
      const stockData = [
        // 主仓库库存
        { warehouseId: createdWarehouses[0]?.id, productSku: 'IP15P001', currentStock: 25 },
        { warehouseId: createdWarehouses[0]?.id, productSku: 'MBP16001', currentStock: 8 },
        { warehouseId: createdWarehouses[0]?.id, productSku: 'MI13U001', currentStock: 5 }, // 低库存
        { warehouseId: createdWarehouses[0]?.id, productSku: 'MT001', currentStock: 120 },
        { warehouseId: createdWarehouses[0]?.id, productSku: 'WD001', currentStock: 80 },
        { warehouseId: createdWarehouses[0]?.id, productSku: 'MW001', currentStock: 2500 },

        // 备用仓库库存
        { warehouseId: createdWarehouses[1]?.id, productSku: 'SS001', currentStock: 45 },
        { warehouseId: createdWarehouses[1]?.id, productSku: 'PC001', currentStock: 0 }, // 缺货
        { warehouseId: createdWarehouses[1]?.id, productSku: 'CH001', currentStock: 150 },
        { warehouseId: createdWarehouses[1]?.id, productSku: 'OC001', currentStock: 25 },
        { warehouseId: createdWarehouses[1]?.id, productSku: 'TL001', currentStock: 60 },

        // 冷链仓库库存
        { warehouseId: createdWarehouses[2]?.id, productSku: 'NB001', currentStock: 300 },
        { warehouseId: createdWarehouses[2]?.id, productSku: 'BP001', currentStock: 800 },
        { warehouseId: createdWarehouses[2]?.id, productSku: 'MW001', currentStock: 1200 },
        { warehouseId: createdWarehouses[2]?.id, productSku: 'CH001', currentStock: 50 } // 低库存
      ];

      for (const stock of stockData) {
        if (!stock.warehouseId) continue;

        try {
          const product = createdProducts.find(p => p.sku === stock.productSku);
          if (!product) continue;

          const existing = await inventoryStockService.findStocksByWarehouse(stock.warehouseId);
          const existingStock = existing.find(s => s.productId === product.id);

          if (!existingStock) {
            await inventoryStockService.createOrUpdateStock({
              productId: product.id,
              warehouseId: stock.warehouseId,
              currentStock: stock.currentStock,
              availableStock: stock.currentStock,
              reservedStock: 0,
              minStock: product.minStock,
              maxStock: product.maxStock,
              avgCost: product.purchasePrice,
              unitPrice: product.salePrice
            });
            console.log(`创建库存记录: ${product.name} - ${stock.currentStock}`);
          } else {
            console.log(`库存记录已存在: ${product.name}`);
          }
        } catch (error) {
          console.error(`创建库存记录失败: ${stock.productSku}`, error);
        }
      }

      console.log('库存卡片视图测试数据初始化完成！');
    } catch (error) {
      console.error('初始化测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 清理测试数据
   */
  async cleanupTestData(): Promise<void> {
    try {
      console.log('开始清理测试数据...');
      // 这里可以实现清理逻辑
      console.log('测试数据清理完成！');
    } catch (error) {
      console.error('清理测试数据失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const testDataInitializer = new TestDataInitializer();
