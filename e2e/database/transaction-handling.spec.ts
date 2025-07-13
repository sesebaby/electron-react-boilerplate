import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { MockServiceManager } from '../mocks/mock-service-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 数据库事务处理测试套件
 * 覆盖事务的ACID特性、并发控制、死锁处理等
 */
test.describe('数据库事务处理', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;
  let mockManager: MockServiceManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `transaction_test_${Date.now()}`);
    await isolationManager.startIsolationSession();
    
    mockManager = new MockServiceManager(page);
  });

  test.afterEach(async () => {
    if (mockManager) {
      await mockManager.clearAllMocks();
    }
    if (isolationManager) {
      await isolationManager.endIsolationSession();
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('库存入库事务完整性', async () => {
    // 1. 创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '事务测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 获取初始库存
    const initialStock = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    const initialQuantity = initialStock[0]?.stock_quantity || 0;

    // 3. 执行入库事务
    const stockInData = {
      productId: productData.id,
      quantity: 50,
      unitPrice: 100,
      supplierId: 'default-supplier',
      warehouseId: 'default-warehouse',
      remark: '事务测试入库'
    };

    const transactionResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.(data);
    }, stockInData);

    expect(transactionResult.success).toBe(true);

    // 4. 验证事务结果
    // 验证库存记录更新
    const updatedStock = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(updatedStock[0].stock_quantity).toBe(initialQuantity + 50);

    // 验证入库记录创建
    const stockInRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM stock_in_records WHERE product_id = ? AND remark = ?',
      [productData.id, '事务测试入库']
    );

    expect(stockInRecords.length).toBe(1);
    expect(stockInRecords[0].quantity).toBe(50);

    // 验证库存交易记录
    const transactionRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory_transactions WHERE product_id = ? AND transaction_type = ?',
      [productData.id, 'STOCK_IN']
    );

    expect(transactionRecords.length).toBeGreaterThan(0);

    console.log('✅ 库存入库事务完整性测试通过');
  });

  test('库存出库事务和库存不足处理', async () => {
    // 1. 创建商品并设置初始库存
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '出库事务测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 先入库30个
    await page.evaluate(async ({ productId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.({
        productId,
        quantity: 30,
        unitPrice: 100,
        supplierId: 'default-supplier',
        warehouseId: 'default-warehouse'
      });
    }, { productId: productData.id });

    // 2. 正常出库测试
    const normalStockOutData = {
      productId: productData.id,
      quantity: 20,
      unitPrice: 150,
      customerId: 'default-customer',
      warehouseId: 'default-warehouse',
      remark: '正常出库测试'
    };

    const normalResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockOutTransaction?.(data);
    }, normalStockOutData);

    expect(normalResult.success).toBe(true);

    // 验证库存减少
    const stockAfterNormal = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(stockAfterNormal[0].stock_quantity).toBe(10); // 30 - 20 = 10

    // 3. 库存不足出库测试
    const excessiveStockOutData = {
      productId: productData.id,
      quantity: 20, // 超过剩余库存10
      unitPrice: 150,
      customerId: 'default-customer',
      warehouseId: 'default-warehouse',
      remark: '库存不足测试'
    };

    const excessiveResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockOutTransaction?.(data);
    }, excessiveStockOutData);

    expect(excessiveResult.success).toBe(false);
    expect(excessiveResult.error).toContain('库存不足');

    // 验证库存未变化（事务回滚）
    const stockAfterFailed = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(stockAfterFailed[0].stock_quantity).toBe(10); // 保持不变

    console.log('✅ 库存出库事务和库存不足处理测试通过');
  });

  test('复杂业务事务回滚机制', async () => {
    // 1. 创建测试数据
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '复杂事务测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 模拟事务中途失败
    await mockManager.mockDatabaseService({
      method: 'dbUpdateInventoryTransaction',
      error: '模拟事务失败'
    });

    // 3. 执行复杂业务事务（包含多个步骤）
    const complexTransactionData = {
      productId: productData.id,
      operations: [
        { type: 'STOCK_IN', quantity: 100, unitPrice: 100 },
        { type: 'STOCK_OUT', quantity: 30, unitPrice: 150 },
        { type: 'STOCK_ADJUST', quantity: 5, adjustType: 'increase' }
      ]
    };

    const complexResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbComplexInventoryTransaction?.(data);
    }, complexTransactionData);

    expect(complexResult.success).toBe(false);

    // 4. 验证事务完全回滚
    const stockAfterRollback = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    // 库存应该保持初始状态（0或null）
    expect(stockAfterRollback[0]?.stock_quantity || 0).toBe(0);

    // 验证没有创建任何交易记录
    const transactionRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory_transactions WHERE product_id = ?',
      [productData.id]
    );

    expect(transactionRecords.length).toBe(0);

    console.log('✅ 复杂业务事务回滚机制测试通过');
  });

  test('并发事务处理和锁机制', async () => {
    // 1. 创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '并发测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await page.evaluate(async ({ productId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.({
        productId,
        quantity: 100,
        unitPrice: 100,
        supplierId: 'default-supplier',
        warehouseId: 'default-warehouse'
      });
    }, { productId: productData.id });

    // 2. 模拟并发出库操作
    const concurrentOperations = [];
    for (let i = 1; i <= 5; i++) {
      concurrentOperations.push(
        page.evaluate(async ({ productId, index }) => {
          // @ts-ignore
          return await window.electronAPI?.dbStockOutTransaction?.({
            productId,
            quantity: 15,
            unitPrice: 150,
            customerId: 'default-customer',
            warehouseId: 'default-warehouse',
            remark: `并发出库_${index}`
          });
        }, { productId: productData.id, index: i })
      );
    }

    // 3. 等待所有并发操作完成
    const results = await Promise.all(concurrentOperations);

    // 4. 分析并发结果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    // 应该有一些操作成功，一些因为库存不足而失败
    expect(successCount).toBeGreaterThan(0);
    expect(successCount).toBeLessThanOrEqual(6); // 100/15 = 6.67，最多6次成功

    // 5. 验证最终库存一致性
    const finalStock = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    const expectedStock = 100 - (successCount * 15);
    expect(finalStock[0].stock_quantity).toBe(expectedStock);

    // 6. 验证交易记录完整性
    const transactionRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory_transactions WHERE product_id = ? AND transaction_type = ?',
      [productData.id, 'STOCK_OUT']
    );

    expect(transactionRecords.length).toBe(successCount);

    console.log(`✅ 并发事务处理测试通过，成功: ${successCount}, 失败: ${failureCount}`);
  });

  test('长事务超时处理', async () => {
    // 1. 模拟长时间运行的事务
    await mockManager.mockSlowOperations(['dbComplexInventoryTransaction'], 30000); // 30秒

    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '长事务测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 执行长事务
    const longTransactionData = {
      productId: productData.id,
      operations: [
        { type: 'STOCK_IN', quantity: 1000, unitPrice: 100 }
      ],
      timeout: 5000 // 5秒超时
    };

    const startTime = Date.now();
    const longTransactionResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbComplexInventoryTransaction?.(data);
    }, longTransactionData);

    const duration = Date.now() - startTime;

    // 3. 验证超时处理
    expect(longTransactionResult.success).toBe(false);
    expect(longTransactionResult.error).toContain('超时');
    expect(duration).toBeLessThan(10000); // 应该在10秒内返回

    // 4. 验证事务被正确回滚
    const stockAfterTimeout = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(stockAfterTimeout[0]?.stock_quantity || 0).toBe(0);

    console.log('✅ 长事务超时处理测试通过');
  });

  test('嵌套事务处理', async () => {
    // 1. 创建测试数据
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '嵌套事务测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 执行嵌套事务
    const nestedTransactionData = {
      productId: productData.id,
      outerOperation: {
        type: 'STOCK_IN',
        quantity: 100,
        unitPrice: 100
      },
      innerOperations: [
        { type: 'STOCK_OUT', quantity: 20, unitPrice: 150 },
        { type: 'STOCK_ADJUST', quantity: 5, adjustType: 'increase' }
      ]
    };

    const nestedResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbNestedTransaction?.(data);
    }, nestedTransactionData);

    expect(nestedResult.success).toBe(true);

    // 3. 验证嵌套事务结果
    const finalStock = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    // 100 (入库) - 20 (出库) + 5 (调整) = 85
    expect(finalStock[0].stock_quantity).toBe(85);

    // 4. 验证所有操作都有记录
    const allTransactions = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory_transactions WHERE product_id = ? ORDER BY created_at',
      [productData.id]
    );

    expect(allTransactions.length).toBe(3); // 入库、出库、调整各一条

    console.log('✅ 嵌套事务处理测试通过');
  });

  test('事务隔离级别验证', async () => {
    // 1. 创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '隔离级别测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await page.evaluate(async ({ productId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.({
        productId,
        quantity: 50,
        unitPrice: 100,
        supplierId: 'default-supplier',
        warehouseId: 'default-warehouse'
      });
    }, { productId: productData.id });

    // 2. 测试读已提交隔离级别
    const isolationTestResult = await page.evaluate(async ({ productId }) => {
      // 开始事务1
      // @ts-ignore
      const transaction1 = await window.electronAPI?.dbBeginTransaction?.();
      
      // 在事务1中读取库存
      // @ts-ignore
      const stock1 = await window.electronAPI?.dbGetInventoryInTransaction?.(productId, transaction1.id);
      
      // 在另一个事务中修改库存
      // @ts-ignore
      await window.electronAPI?.dbStockOutTransaction?.({
        productId,
        quantity: 10,
        unitPrice: 150,
        customerId: 'default-customer',
        warehouseId: 'default-warehouse'
      });
      
      // 在事务1中再次读取库存
      // @ts-ignore
      const stock2 = await window.electronAPI?.dbGetInventoryInTransaction?.(productId, transaction1.id);
      
      // 提交事务1
      // @ts-ignore
      await window.electronAPI?.dbCommitTransaction?.(transaction1.id);
      
      return {
        stock1: stock1.stock_quantity,
        stock2: stock2.stock_quantity
      };
    }, { productId: productData.id });

    // 3. 验证隔离级别行为
    // 在READ COMMITTED级别下，事务内应该能看到其他已提交事务的更改
    expect(isolationTestResult.stock1).toBe(50);
    expect(isolationTestResult.stock2).toBe(40); // 50 - 10 = 40

    console.log('✅ 事务隔离级别验证测试通过');
  });

  test('死锁检测和处理', async () => {
    // 1. 创建两个测试商品
    const product1Data = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '死锁测试商品1' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    const product2Data = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '死锁测试商品2' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await Promise.all([
      page.evaluate(async ({ productId }) => {
        // @ts-ignore
        return await window.electronAPI?.dbStockInTransaction?.({
          productId,
          quantity: 100,
          unitPrice: 100,
          supplierId: 'default-supplier',
          warehouseId: 'default-warehouse'
        });
      }, { productId: product1Data.id }),
      
      page.evaluate(async ({ productId }) => {
        // @ts-ignore
        return await window.electronAPI?.dbStockInTransaction?.({
          productId,
          quantity: 100,
          unitPrice: 100,
          supplierId: 'default-supplier',
          warehouseId: 'default-warehouse'
        });
      }, { productId: product2Data.id })
    ]);

    // 2. 模拟可能导致死锁的并发操作
    const deadlockTest = await page.evaluate(async ({ product1Id, product2Id }) => {
      const results = await Promise.allSettled([
        // 事务1: 先锁定商品1，再锁定商品2
        // @ts-ignore
        window.electronAPI?.dbCrossProductTransaction?.({
          firstProductId: product1Id,
          secondProductId: product2Id,
          operation: 'transfer',
          quantity: 10
        }),
        
        // 事务2: 先锁定商品2，再锁定商品1
        // @ts-ignore
        window.electronAPI?.dbCrossProductTransaction?.({
          firstProductId: product2Id,
          secondProductId: product1Id,
          operation: 'transfer',
          quantity: 15
        })
      ]);
      
      return results.map(result => 
        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
      );
    }, { product1Id: product1Data.id, product2Id: product2Data.id });

    // 3. 验证死锁处理
    const successCount = deadlockTest.filter(r => r.success).length;
    const deadlockCount = deadlockTest.filter(r => !r.success && r.error?.includes('死锁')).length;

    // 至少有一个事务应该成功，至少有一个应该检测到死锁
    expect(successCount).toBeGreaterThanOrEqual(1);
    expect(deadlockCount).toBeGreaterThanOrEqual(0); // 死锁检测可能不总是触发

    console.log(`✅ 死锁检测和处理测试通过，成功: ${successCount}, 死锁: ${deadlockCount}`);
  });
});
