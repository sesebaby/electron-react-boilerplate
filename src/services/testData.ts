// 测试数据生成器
import { businessServiceManager } from './business';

export class TestDataGenerator {
  static async initializeTestData(): Promise<void> {
    try {
      console.log('开始初始化测试数据...');
      
      // 初始化业务服务
      await businessServiceManager.initialize();
      
      // 创建测试分类
      const categories = [
        { name: '电子产品', description: '电子设备和配件', code: 'ELEC' },
        { name: '办公用品', description: '办公室用品和设备', code: 'OFFICE' },
        { name: '日用品', description: '日常生活用品', code: 'DAILY' },
        { name: '图书', description: '各类书籍和资料', code: 'BOOK' }
      ];
      
      for (const cat of categories) {
        await businessServiceManager.categoryService.create(cat);
      }
      
      // 创建测试单位
      const units = [
        { name: '件', symbol: 'pcs', description: '计件单位' },
        { name: '台', symbol: 'set', description: '设备单位' },
        { name: '盒', symbol: 'box', description: '盒装单位' },
        { name: '本', symbol: 'book', description: '图书单位' }
      ];
      
      for (const unit of units) {
        await businessServiceManager.unitService.create(unit);
      }
      
      // 创建测试仓库
      const warehouses = [
        {
          name: '总仓库',
          code: 'WH001',
          address: '北京市朝阳区XX路XX号',
          manager: '张三',
          phone: '010-12345678',
          isDefault: true
        },
        {
          name: '分仓库A',
          code: 'WH002', 
          address: '上海市浦东新区XX路XX号',
          manager: '李四',
          phone: '021-87654321',
          isDefault: false
        }
      ];
      
      for (const wh of warehouses) {
        await businessServiceManager.warehouseService.create(wh);
      }
      
      // 获取创建的数据ID
      const allCategories = await businessServiceManager.categoryService.findAll();
      const allUnits = await businessServiceManager.unitService.findAll();
      const allWarehouses = await businessServiceManager.warehouseService.findAll();
      
      // 创建测试商品
      const products = [
        {
          name: 'iPhone 15 Pro',
          code: 'IP15PRO',
          categoryId: allCategories[0].id,
          unitId: allUnits[1].id,
          description: '苹果最新旗舰手机',
          specification: '256GB 深空黑色',
          purchasePrice: 8000,
          salePrice: 9999,
          status: 'active' as const
        },
        {
          name: 'MacBook Air M2',
          code: 'MBA2023',
          categoryId: allCategories[0].id,
          unitId: allUnits[1].id,
          description: '苹果笔记本电脑',
          specification: '13寸 512GB SSD',
          purchasePrice: 9000,
          salePrice: 11999,
          status: 'active' as const
        },
        {
          name: '办公椅',
          code: 'CHAIR001',
          categoryId: allCategories[1].id,
          unitId: allUnits[0].id,
          description: '人体工学办公椅',
          specification: '黑色真皮',
          purchasePrice: 800,
          salePrice: 1200,
          status: 'active' as const
        },
        {
          name: 'A4复印纸',
          code: 'PAPER001',
          categoryId: allCategories[1].id,
          unitId: allUnits[2].id,
          description: '高品质复印纸',
          specification: '500张/包',
          purchasePrice: 25,
          salePrice: 35,
          status: 'active' as const
        },
        {
          name: '无线鼠标',
          code: 'MOUSE001',
          categoryId: allCategories[0].id,
          unitId: allUnits[0].id,
          description: '无线蓝牙鼠标',
          specification: '2.4G无线',
          purchasePrice: 50,
          salePrice: 89,
          status: 'active' as const
        }
      ];
      
      for (const product of products) {
        await businessServiceManager.productService.create(product);
      }
      
      // 获取创建的商品
      const allProducts = await businessServiceManager.productService.findAll();
      const mainWarehouse = allWarehouses.find(w => w.isDefault);
      
      if (mainWarehouse) {
        // 创建库存数据
        for (const product of allProducts) {
          const stockData = {
            productId: product.id,
            warehouseId: mainWarehouse.id,
            currentStock: Math.floor(Math.random() * 100) + 10, // 10-110之间随机库存
            availableStock: 0, // 将在服务中计算
            reservedStock: Math.floor(Math.random() * 5), // 0-5之间随机预留
            minStock: 10,
            maxStock: 200,
            avgCost: product.purchasePrice,
            unitPrice: product.salePrice,
            lastMovementDate: new Date()
          };
          stockData.availableStock = stockData.currentStock - stockData.reservedStock;
          
          await businessServiceManager.inventoryStockService.createOrUpdateStock(stockData);
        }
      }
      
      // 创建测试供应商
      const suppliers = [
        {
          name: '苹果授权经销商',
          code: 'SUP001',
          contactPerson: '王经理',
          phone: '400-666-8888',
          email: 'wang@apple-dealer.com',
          address: '北京市海淀区中关村大街XX号',
          rating: 'A' as const,
          status: 'active' as const
        },
        {
          name: '办公用品批发商',
          code: 'SUP002',
          contactPerson: '刘总',
          phone: '010-88888888',
          email: 'liu@office-supply.com',
          address: '上海市静安区南京西路XX号',
          rating: 'B' as const,
          status: 'active' as const
        }
      ];
      
      for (const supplier of suppliers) {
        await businessServiceManager.supplierService.create(supplier);
      }
      
      // 创建测试客户
      const customers = [
        {
          name: 'ABC科技有限公司',
          code: 'CUS001',
          contactPerson: '陈总',
          phone: '021-99999999',
          email: 'chen@abc-tech.com',
          address: '深圳市南山区科技园XX号',
          level: 'VIP' as const,
          creditLimit: 100000,
          status: 'active' as const
        },
        {
          name: 'XYZ贸易公司',
          code: 'CUS002',
          contactPerson: '赵经理',
          phone: '0755-77777777',
          email: 'zhao@xyz-trade.com',
          address: '广州市天河区珠江新城XX号',
          level: 'REGULAR' as const,
          creditLimit: 50000,
          status: 'active' as const
        }
      ];
      
      for (const customer of customers) {
        await businessServiceManager.customerService.create(customer);
      }
      
      console.log('测试数据初始化完成！');
      console.log(`创建了 ${allCategories.length} 个分类`);
      console.log(`创建了 ${allUnits.length} 个单位`);
      console.log(`创建了 ${allWarehouses.length} 个仓库`);
      console.log(`创建了 ${allProducts.length} 个商品`);
      console.log(`创建了 ${suppliers.length} 个供应商`);
      console.log(`创建了 ${customers.length} 个客户`);
      
    } catch (error) {
      console.error('初始化测试数据失败:', error);
    }
  }
}

export default TestDataGenerator;