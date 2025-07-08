import { WarehouseCardData, ProductStockInfo } from '../../types/inventoryCard';
import { warehouseService } from './warehouseService';
import productService from './productService';
import inventoryStockService from './inventoryStockService';
import categoryService from './categoryService';

/**
 * 库存卡片视图数据服务
 */
class InventoryCardService {
  
  /**
   * 获取所有仓库的卡片数据
   */
  async getWarehouseCardData(): Promise<WarehouseCardData[]> {
    try {
      // 暂时返回模拟数据，等数据库有数据后再使用真实数据
      const mockData: WarehouseCardData[] = [
        {
          warehouseId: '1',
          warehouseName: '主仓库',
          warehouseCode: 'WH001',
          description: '主要存储仓库，存放常用商品',
          products: [
            {
              productId: '1',
              productName: 'iPhone 15 Pro',
              sku: 'IP15P001',
              currentStock: 25,
              minStock: 10,
              maxStock: 100,
              unit: '台',
              unitPrice: 8999,
              totalValue: 224975,
              isLowStock: false,
              isOutOfStock: false,
              lastUpdated: new Date(),
              category: '电子产品'
            },
            {
              productId: '2',
              productName: '小米13 Ultra',
              sku: 'MI13U001',
              currentStock: 5,
              minStock: 15,
              maxStock: 80,
              unit: '台',
              unitPrice: 5999,
              totalValue: 29995,
              isLowStock: true,
              isOutOfStock: false,
              lastUpdated: new Date(),
              category: '电子产品'
            }
          ],
          totalProducts: 2,
          lowStockCount: 1,
          outOfStockCount: 0,
          totalValue: 254970
        },
        {
          warehouseId: '2',
          warehouseName: '备用仓库',
          warehouseCode: 'WH002',
          description: '备用存储仓库，存放季节性商品',
          products: [
            {
              productId: '3',
              productName: '薯片',
              sku: 'PC001',
              currentStock: 0,
              minStock: 200,
              maxStock: 1000,
              unit: '包',
              unitPrice: 8,
              totalValue: 0,
              isLowStock: false,
              isOutOfStock: true,
              lastUpdated: new Date(),
              category: '食品饮料'
            },
            {
              productId: '4',
              productName: '运动鞋',
              sku: 'SS001',
              currentStock: 45,
              minStock: 20,
              maxStock: 200,
              unit: '双',
              unitPrice: 599,
              totalValue: 26955,
              isLowStock: false,
              isOutOfStock: false,
              lastUpdated: new Date(),
              category: '服装鞋帽'
            }
          ],
          totalProducts: 2,
          lowStockCount: 0,
          outOfStockCount: 1,
          totalValue: 26955
        }
      ];

      return mockData;
    } catch (error) {
      console.error('获取仓库卡片数据失败:', error);
      throw new Error('获取仓库卡片数据失败');
    }
  }

  /**
   * 获取单个仓库的卡片数据
   */
  async getWarehouseCardById(warehouseId: string): Promise<WarehouseCardData> {
    try {
      // 从模拟数据中查找
      const allData = await this.getWarehouseCardData();
      const warehouseData = allData.find(w => w.warehouseId === warehouseId);

      if (!warehouseData) {
        throw new Error(`仓库不存在: ${warehouseId}`);
      }

      return warehouseData;
    } catch (error: any) {
      console.error(`获取仓库 ${warehouseId} 卡片数据失败:`, error);
      throw new Error(`获取仓库卡片数据失败: ${error?.message || '未知错误'}`);
    }
  }

  /**
   * 获取库存统计信息
   */
  async getInventoryStatistics() {
    try {
      const warehouseData = await this.getWarehouseCardData();

      const statistics = {
        totalWarehouses: warehouseData.length,
        totalProducts: warehouseData.reduce((sum, w) => sum + w.totalProducts, 0),
        totalLowStock: warehouseData.reduce((sum, w) => sum + w.lowStockCount, 0),
        totalOutOfStock: warehouseData.reduce((sum, w) => sum + w.outOfStockCount, 0),
        totalValue: warehouseData.reduce((sum, w) => sum + w.totalValue, 0),
        warehousesWithIssues: warehouseData.filter(w => w.lowStockCount > 0 || w.outOfStockCount > 0).length
      };

      return statistics;
    } catch (error) {
      console.error('获取库存统计信息失败:', error);
      throw new Error('获取库存统计信息失败');
    }
  }

  /**
   * 搜索产品库存信息
   */
  async searchProductStock(keyword: string, warehouseId?: string): Promise<ProductStockInfo[]> {
    try {
      const warehouseData = warehouseId
        ? [await this.getWarehouseCardById(warehouseId)]
        : await this.getWarehouseCardData();

      const allProducts = warehouseData.flatMap(w => w.products);

      if (!keyword.trim()) {
        return allProducts;
      }

      const searchTerm = keyword.toLowerCase();
      return allProducts.filter(product =>
        product.productName.toLowerCase().includes(searchTerm) ||
        product.sku.toLowerCase().includes(searchTerm) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      console.error('搜索产品库存失败:', error);
      throw new Error('搜索产品库存失败');
    }
  }

  /**
   * 获取低库存预警列表
   */
  async getLowStockWarnings(): Promise<ProductStockInfo[]> {
    try {
      const warehouseData = await this.getWarehouseCardData();
      const allProducts = warehouseData.flatMap(w => w.products);

      return allProducts.filter(product => product.isLowStock || product.isOutOfStock);
    } catch (error) {
      console.error('获取低库存预警失败:', error);
      throw new Error('获取低库存预警失败');
    }
  }

  /**
   * 刷新仓库卡片数据缓存
   */
  async refreshWarehouseData(warehouseId?: string): Promise<void> {
    try {
      // 这里可以实现缓存刷新逻辑
      // 目前直接重新获取数据
      console.log('刷新仓库数据:', warehouseId || '全部');
    } catch (error) {
      console.error('刷新仓库数据失败:', error);
      throw new Error('刷新仓库数据失败');
    }
  }
}

// 导出单例实例
const inventoryCardService = new InventoryCardService();
export default inventoryCardService;
