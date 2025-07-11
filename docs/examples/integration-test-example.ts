/**
 * 集成测试示例
 * 特点：使用真实的数据库和文件系统，但不启动完整应用
 */

import Database from 'better-sqlite3';
import { FinancialService } from '../services/FinancialService';
import { OrderService } from '../services/OrderService';
import { InventoryService } from '../services/InventoryService';
import * as fs from 'fs';
import * as path from 'path';

describe('集成测试 - 采购订单完整流程', () => {
  let db: Database.Database;
  let financialService: FinancialService;
  let orderService: OrderService;
  let inventoryService: InventoryService;
  
  beforeEach(() => {
    // 使用真实的数据库（测试数据库）
    const testDbPath = path.join(__dirname, 'test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    db = new Database(testDbPath);
    
    // 创建真实的表结构
    db.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        price REAL
      );
      
      CREATE TABLE purchase_orders (
        id TEXT PRIMARY KEY,
        order_no TEXT UNIQUE,
        supplier_id TEXT,
        total_amount REAL,
        status TEXT
      );
      
      CREATE TABLE inventory_stocks (
        product_id TEXT,
        warehouse_id TEXT,
        quantity INTEGER,
        PRIMARY KEY (product_id, warehouse_id)
      );
    `);
    
    // 使用真实的服务实例
    financialService = new FinancialService(db);
    orderService = new OrderService(db);
    inventoryService = new InventoryService(db);
  });
  
  afterEach(() => {
    db.close();
  });
  
  it('创建采购订单并入库应该更新库存和财务', async () => {
    // 1. 创建产品（真实数据库操作）
    const product = await inventoryService.createProduct({
      id: 'PROD-001',
      name: '笔记本电脑',
      sku: 'NB-001',
      price: 5000
    });
    
    // 2. 创建采购订单（真实数据库操作）
    const order = await orderService.createPurchaseOrder({
      supplierId: 'SUP-001',
      items: [{
        productId: 'PROD-001',
        quantity: 10,
        unitPrice: 4500
      }]
    });
    
    expect(order.totalAmount).toBe(45000);
    
    // 3. 确认订单（触发真实的状态变更）
    await orderService.confirmOrder(order.id);
    
    // 4. 收货入库（真实的库存更新）
    await orderService.receiveGoods({
      orderId: order.id,
      items: [{
        productId: 'PROD-001',
        quantity: 10
      }]
    });
    
    // 5. 验证库存（从真实数据库查询）
    const stock = await inventoryService.getStock('PROD-001', 'DEFAULT');
    expect(stock.quantity).toBe(10);
    
    // 6. 验证应付账款（真实的财务记录）
    const payables = await financialService.getPayablesBySupplier('SUP-001');
    expect(payables[0].amount).toBe(45000);
    
    // 7. 测试事务回滚
    try {
      await db.transaction(() => {
        // 尝试创建重复的订单号
        orderService.createPurchaseOrder({
          orderNo: order.orderNo, // 重复！
          supplierId: 'SUP-002',
          items: []
        });
      })();
      fail('应该抛出错误');
    } catch (error) {
      // 验证数据没有被污染
      const orders = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get();
      expect(orders.count).toBe(1);
    }
  });
  
  it('测试并发操作的数据一致性', async () => {
    // 创建初始库存
    await inventoryService.createStock('PROD-001', 'WH-001', 100);
    
    // 模拟并发出库
    const operations = Array(10).fill(null).map(() => 
      inventoryService.updateStock('PROD-001', 'WH-001', -10)
    );
    
    await Promise.all(operations);
    
    // 验证最终库存
    const finalStock = await inventoryService.getStock('PROD-001', 'WH-001');
    expect(finalStock.quantity).toBe(0); // 应该正好是 0
  });
});

// ✅ 集成测试的优点：
// - 发现真实的数据库问题（如 SQL 语法错误）
// - 测试事务和并发
// - 验证数据持久化
// - 发现组件间的接口问题

// ❌ 集成测试的缺点：
// - 运行较慢（秒级）
// - 需要设置测试环境
// - 可能受环境影响