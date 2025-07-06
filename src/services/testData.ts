// 测试数据生成器
import { 
  businessServiceManager,
  categoryService,
  unitService,
  warehouseService,
  productService,
  inventoryStockService,
  supplierService,
  customerService
} from './business';
import { ProductStatus, SupplierStatus, CustomerLevel, CustomerType, CustomerStatus, SupplierRating } from '../types/entities';

export class TestDataGenerator {
  static async initializeTestData(): Promise<void> {
    try {
      console.log('开始初始化测试数据...');
      
      // 初始化业务服务
      await businessServiceManager.initialize();
      
      // 创建测试分类（检查是否已存在）
      const categories = [
        { name: '电子产品', description: '电子设备和配件', code: 'ELEC', level: 1, sortOrder: 1, isActive: true },
        { name: '办公用品', description: '办公室用品和设备', code: 'OFFICE', level: 1, sortOrder: 2, isActive: true },
        { name: '日用品', description: '日常生活用品', code: 'DAILY', level: 1, sortOrder: 3, isActive: true },
        { name: '图书', description: '各类书籍和资料', code: 'BOOK', level: 1, sortOrder: 4, isActive: true }
      ];

      for (const cat of categories) {
        try {
          // 检查分类是否已存在
          const existingCategories = await categoryService.findByParentId(undefined);
          const exists = existingCategories.some(existing => existing.name === cat.name);

          if (!exists) {
            await categoryService.create(cat);
            console.log(`创建分类: ${cat.name}`);
          } else {
            console.log(`分类已存在，跳过: ${cat.name}`);
          }
        } catch (error) {
          console.warn(`创建分类失败: ${cat.name}`, error);
        }
      }
      
      // 创建测试单位（检查是否已存在）
      const units = [
        { name: '件', symbol: 'pcs', description: '计件单位', precision: 0 },
        { name: '台', symbol: 'set', description: '设备单位', precision: 0 },
        { name: '盒', symbol: 'box', description: '盒装单位', precision: 0 },
        { name: '本', symbol: 'book', description: '图书单位', precision: 0 }
      ];

      for (const unit of units) {
        try {
          // 检查单位是否已存在
          const existingUnits = await unitService.findAll();
          const exists = existingUnits.some(existing => existing.name === unit.name || existing.symbol === unit.symbol);

          if (!exists) {
            await unitService.create(unit);
            console.log(`创建单位: ${unit.name}`);
          } else {
            console.log(`单位已存在，跳过: ${unit.name}`);
          }
        } catch (error) {
          console.warn(`创建单位失败: ${unit.name}`, error);
        }
      }
      
      // 创建测试仓库（检查是否已存在）
      const warehouses = [
        {
          name: '总仓库',
          code: 'WH001',
          address: '北京市朝阳区XX路XX号',
          manager: '张三',
          phone: '13800138001',  // 使用有效的手机号码格式
          isDefault: true
        },
        {
          name: '分仓库A',
          code: 'WH002',
          address: '上海市浦东新区XX路XX号',
          manager: '李四',
          phone: '13800138002',  // 使用有效的手机号码格式
          isDefault: false
        }
      ];

      for (const wh of warehouses) {
        try {
          // 检查仓库是否已存在
          const existingWarehouses = await warehouseService.findAll();
          const exists = existingWarehouses.some(existing => existing.code === wh.code || existing.name === wh.name);

          if (!exists) {
            await warehouseService.create(wh);
            console.log(`创建仓库: ${wh.name}`);
          } else {
            console.log(`仓库已存在，跳过: ${wh.name}`);
          }
        } catch (error) {
          console.warn(`创建仓库失败: ${wh.name}`, error);
        }
      }
      
      // 获取创建的数据ID
      const allCategories = await categoryService.findAll();
      const allUnits = await unitService.findAll();
      const allWarehouses = await warehouseService.findAll();
      
      // 创建测试商品
      const products = [
        {
          name: 'iPhone 15 Pro',
          code: 'IP15PRO',
          sku: 'IP15PRO-256-BLK',
          categoryId: allCategories[0].id,
          unitId: allUnits[1].id,
          description: '苹果最新旗舰手机',
          specification: '256GB 深空黑色',
          purchasePrice: 8000,
          salePrice: 9999,
          minStock: 5,
          maxStock: 50,
          status: ProductStatus.ACTIVE
        },
        {
          name: 'MacBook Air M2',
          code: 'MBA2023',
          sku: 'MBA2023-512-SLV',
          categoryId: allCategories[0].id,
          unitId: allUnits[1].id,
          description: '苹果笔记本电脑',
          specification: '13寸 512GB SSD',
          purchasePrice: 9000,
          salePrice: 11999,
          minStock: 3,
          maxStock: 20,
          status: ProductStatus.ACTIVE
        },
        {
          name: '办公椅',
          code: 'CHAIR001',
          sku: 'CHAIR001-BLK-L',
          categoryId: allCategories[1].id,
          unitId: allUnits[0].id,
          description: '人体工学办公椅',
          specification: '黑色真皮',
          purchasePrice: 800,
          salePrice: 1200,
          minStock: 10,
          maxStock: 100,
          status: ProductStatus.ACTIVE
        },
        {
          name: 'A4复印纸',
          code: 'PAPER001',
          sku: 'PAPER001-A4-500',
          categoryId: allCategories[1].id,
          unitId: allUnits[2].id,
          description: '高品质复印纸',
          specification: '500张/包',
          purchasePrice: 25,
          salePrice: 35,
          minStock: 50,
          maxStock: 500,
          status: ProductStatus.ACTIVE
        },
        {
          name: '无线鼠标',
          code: 'MOUSE001',
          sku: 'MOUSE001-24G-BLK',  // 修复SKU格式，移除点号
          categoryId: allCategories[0].id,
          unitId: allUnits[0].id,
          description: '无线蓝牙鼠标',
          specification: '2.4G无线',
          purchasePrice: 50,
          salePrice: 89,
          minStock: 20,
          maxStock: 200,
          status: ProductStatus.ACTIVE
        }
      ];
      
      for (const product of products) {
        await productService.create(product);
      }
      
      // 获取创建的商品
      const allProducts = await productService.findAll();
      const mainWarehouse = allWarehouses.find((w: any) => w.isDefault);
      
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
          
          await inventoryStockService.createOrUpdateStock(stockData);
        }
      }
      
      // 创建测试供应商（检查是否已存在）
      const suppliers = [
        {
          name: '苹果授权经销商',
          code: 'SUP001',
          contactPerson: '王经理',
          phone: '13800138003',  // 使用有效的手机号码格式
          email: 'wang@apple-dealer.com',
          address: '北京市海淀区中关村大街XX号',
          rating: SupplierRating.A,
          creditLimit: 1000000,
          status: SupplierStatus.ACTIVE
        },
        {
          name: '办公用品批发商',
          code: 'SUP002',
          contactPerson: '刘总',
          phone: '13800138004',  // 使用有效的手机号码格式
          email: 'liu@office-supply.com',
          address: '上海市静安区南京西路XX号',
          rating: SupplierRating.B,
          creditLimit: 500000,
          status: SupplierStatus.ACTIVE
        }
      ];

      for (const supplier of suppliers) {
        try {
          // 检查供应商是否已存在
          const existingSuppliers = await supplierService.findAll();
          const exists = existingSuppliers.some(existing => existing.code === supplier.code || existing.name === supplier.name);

          if (!exists) {
            await supplierService.create(supplier);
            console.log(`创建供应商: ${supplier.name}`);
          } else {
            console.log(`供应商已存在，跳过: ${supplier.name}`);
          }
        } catch (error) {
          console.warn(`创建供应商失败: ${supplier.name}`, error);
        }
      }
      
      // 创建测试客户（检查是否已存在）
      const customers = [
        {
          name: 'ABC科技有限公司',
          code: 'CUS001',
          contactPerson: '陈总',
          phone: '13800138005',  // 使用有效的手机号码格式
          email: 'chen@abc-tech.com',
          address: '深圳市南山区科技园XX号',
          level: CustomerLevel.VIP,
          customerType: CustomerType.COMPANY,
          creditLimit: 100000,
          discountRate: 0.1,
          status: CustomerStatus.ACTIVE
        },
        {
          name: 'XYZ贸易公司',
          code: 'CUS002',
          contactPerson: '赵经理',
          phone: '13800138006',  // 使用有效的手机号码格式
          email: 'zhao@xyz-trade.com',
          address: '广州市天河区珠江新城XX号',
          level: CustomerLevel.BRONZE,
          customerType: CustomerType.COMPANY,
          creditLimit: 50000,
          discountRate: 0.05,
          status: CustomerStatus.ACTIVE
        }
      ];

      for (const customer of customers) {
        try {
          // 检查客户是否已存在
          const existingCustomers = await customerService.findAll();
          const exists = existingCustomers.some(existing => existing.code === customer.code || existing.name === customer.name);

          if (!exists) {
            await customerService.create(customer);
            console.log(`创建客户: ${customer.name}`);
          } else {
            console.log(`客户已存在，跳过: ${customer.name}`);
          }
        } catch (error) {
          console.warn(`创建客户失败: ${customer.name}`, error);
        }
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