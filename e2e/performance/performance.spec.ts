import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 性能测试套件
 * 测试应用在各种负载条件下的性能表现
 */
test.describe('性能测试', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp({
      additionalArgs: ['--performance-mode']
    });
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `performance_test_${Date.now()}`);
    await isolationManager.startIsolationSession();
  });

  test.afterEach(async () => {
    if (isolationManager) {
      await isolationManager.endIsolationSession();
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('应用启动性能测试', async () => {
    // 重新启动应用以测试启动时间
    await electronApp.close();
    
    const startTime = Date.now();
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    
    // 等待应用完全加载
    await TestHelpers.waitForAppLoad(page);
    const loadTime = Date.now() - startTime;

    // 验证启动时间在合理范围内
    expect(loadTime).toBeLessThan(10000); // 应在10秒内启动
    
    console.log(`应用启动时间: ${loadTime}ms`);

    // 测试登录性能
    const loginStartTime = Date.now();
    await TestHelpers.login(page);
    const loginTime = Date.now() - loginStartTime;

    expect(loginTime).toBeLessThan(3000); // 登录应在3秒内完成
    console.log(`登录时间: ${loginTime}ms`);
  });

  test('大数据量列表渲染性能', async () => {
    // 创建大量测试数据
    const dataCount = 1000;
    console.log(`创建${dataCount}条测试数据...`);
    
    const createStartTime = Date.now();
    for (let i = 1; i <= dataCount; i++) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `性能测试商品_${i.toString().padStart(4, '0')}`,
          sku: `PERF_SKU_${i.toString().padStart(4, '0')}`
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );

      // 每100条记录输出一次进度
      if (i % 100 === 0) {
        console.log(`已创建 ${i}/${dataCount} 条记录`);
      }
    }
    const createTime = Date.now() - createStartTime;
    console.log(`数据创建耗时: ${createTime}ms`);

    // 测试列表页面加载性能
    const listLoadStartTime = Date.now();
    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);
    const listLoadTime = Date.now() - listLoadStartTime;

    expect(listLoadTime).toBeLessThan(5000); // 列表加载应在5秒内完成
    console.log(`列表加载时间: ${listLoadTime}ms`);

    // 测试分页性能
    const paginationStartTime = Date.now();
    await page.click('[data-testid="next-page-button"]');
    await TestHelpers.waitForLoadingComplete(page);
    const paginationTime = Date.now() - paginationStartTime;

    expect(paginationTime).toBeLessThan(2000); // 分页应在2秒内完成
    console.log(`分页切换时间: ${paginationTime}ms`);
  });

  test('搜索性能测试', async () => {
    // 创建测试数据
    const searchDataCount = 500;
    for (let i = 1; i <= searchDataCount; i++) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `搜索测试商品_${i}`,
          sku: `SEARCH_SKU_${i}`,
          description: `这是第${i}个搜索测试商品的详细描述`
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 测试精确搜索性能
    const exactSearchStartTime = Date.now();
    await page.fill('[data-testid="search-input"]', 'SEARCH_SKU_100');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);
    const exactSearchTime = Date.now() - exactSearchStartTime;

    expect(exactSearchTime).toBeLessThan(1000); // 精确搜索应在1秒内完成
    console.log(`精确搜索时间: ${exactSearchTime}ms`);

    // 测试模糊搜索性能
    const fuzzySearchStartTime = Date.now();
    await page.fill('[data-testid="search-input"]', '搜索测试');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);
    const fuzzySearchTime = Date.now() - fuzzySearchStartTime;

    expect(fuzzySearchTime).toBeLessThan(3000); // 模糊搜索应在3秒内完成
    console.log(`模糊搜索时间: ${fuzzySearchTime}ms`);

    // 测试复杂筛选性能
    const filterStartTime = Date.now();
    await page.click('[data-testid="filter-button"]');
    await page.fill('[data-testid="price-min-filter"]', '100');
    await page.fill('[data-testid="price-max-filter"]', '500');
    await page.click('[data-testid="apply-filter-button"]');
    await TestHelpers.waitForLoadingComplete(page);
    const filterTime = Date.now() - filterStartTime;

    expect(filterTime).toBeLessThan(2000); // 筛选应在2秒内完成
    console.log(`复杂筛选时间: ${filterTime}ms`);
  });

  test('数据库操作性能测试', async () => {
    // 测试批量插入性能
    const batchSize = 100;
    const batchInsertStartTime = Date.now();
    
    const insertPromises = [];
    for (let i = 1; i <= batchSize; i++) {
      const productData = TestDataFactory.createProduct({
        name: `批量插入测试_${i}`,
        sku: `BATCH_INSERT_${i}`
      });
      
      insertPromises.push(
        DatabaseHelpers.createTestProduct(page, productData)
          .then(id => {
            isolationManager.recordCreatedData('products', id);
            return id;
          })
      );
    }

    await Promise.all(insertPromises);
    const batchInsertTime = Date.now() - batchInsertStartTime;
    
    expect(batchInsertTime).toBeLessThan(10000); // 批量插入应在10秒内完成
    console.log(`批量插入${batchSize}条记录耗时: ${batchInsertTime}ms`);
    console.log(`平均每条记录: ${(batchInsertTime / batchSize).toFixed(2)}ms`);

    // 测试批量查询性能
    const batchQueryStartTime = Date.now();
    const queryResults = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE sku LIKE ?',
      ['BATCH_INSERT_%']
    );
    const batchQueryTime = Date.now() - batchQueryStartTime;

    expect(batchQueryTime).toBeLessThan(1000); // 批量查询应在1秒内完成
    expect(queryResults.length).toBe(batchSize);
    console.log(`批量查询${batchSize}条记录耗时: ${batchQueryTime}ms`);

    // 测试复杂查询性能
    const complexQueryStartTime = Date.now();
    const complexResults = await DatabaseHelpers.executeRawQuery(
      page,
      `SELECT p.*, c.name as category_name, s.name as supplier_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       WHERE p.sku LIKE ? 
       ORDER BY p.created_at DESC 
       LIMIT 50`,
      ['BATCH_INSERT_%']
    );
    const complexQueryTime = Date.now() - complexQueryStartTime;

    expect(complexQueryTime).toBeLessThan(2000); // 复杂查询应在2秒内完成
    console.log(`复杂查询耗时: ${complexQueryTime}ms`);
  });

  test('内存使用性能测试', async () => {
    // 获取初始内存使用情况
    const initialMemory = await page.evaluate(() => {
      return {
        used: (performance as any).memory?.usedJSHeapSize || 0,
        total: (performance as any).memory?.totalJSHeapSize || 0,
        limit: (performance as any).memory?.jsHeapSizeLimit || 0
      };
    });

    console.log('初始内存使用:', initialMemory);

    // 执行内存密集型操作
    const memoryIntensiveStartTime = Date.now();
    
    // 创建大量数据
    for (let i = 1; i <= 200; i++) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `内存测试商品_${i}`,
          description: 'A'.repeat(1000) // 1KB描述
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
    }

    // 加载数据到前端
    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    const memoryIntensiveTime = Date.now() - memoryIntensiveStartTime;

    // 获取操作后的内存使用情况
    const finalMemory = await page.evaluate(() => {
      return {
        used: (performance as any).memory?.usedJSHeapSize || 0,
        total: (performance as any).memory?.totalJSHeapSize || 0,
        limit: (performance as any).memory?.jsHeapSizeLimit || 0
      };
    });

    console.log('最终内存使用:', finalMemory);
    console.log('内存增长:', finalMemory.used - initialMemory.used, 'bytes');

    // 验证内存使用在合理范围内
    const memoryIncrease = finalMemory.used - initialMemory.used;
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 内存增长应少于100MB

    console.log(`内存密集型操作耗时: ${memoryIntensiveTime}ms`);
  });

  test('并发操作性能测试', async () => {
    // 创建基础数据
    const baseProduct = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '并发测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await page.evaluate(async ({ productId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.({
        productId,
        quantity: 1000,
        unitPrice: 100,
        supplierId: 'default-supplier',
        warehouseId: 'default-warehouse'
      });
    }, { productId: baseProduct.id });

    // 测试并发库存操作
    const concurrentOperations = 20;
    const concurrentStartTime = Date.now();

    const operations = [];
    for (let i = 1; i <= concurrentOperations; i++) {
      operations.push(
        page.evaluate(async ({ productId, index }) => {
          // @ts-ignore
          return await window.electronAPI?.dbStockOutTransaction?.({
            productId,
            quantity: 10,
            unitPrice: 150,
            customerId: 'default-customer',
            warehouseId: 'default-warehouse',
            remark: `并发测试_${index}`
          });
        }, { productId: baseProduct.id, index: i })
      );
    }

    const results = await Promise.all(operations);
    const concurrentTime = Date.now() - concurrentStartTime;

    // 验证并发操作结果
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBeGreaterThan(0);
    expect(concurrentTime).toBeLessThan(15000); // 并发操作应在15秒内完成

    console.log(`${concurrentOperations}个并发操作耗时: ${concurrentTime}ms`);
    console.log(`成功操作数: ${successCount}/${concurrentOperations}`);
    console.log(`平均每个操作: ${(concurrentTime / concurrentOperations).toFixed(2)}ms`);

    // 验证数据一致性
    const finalStock = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT stock_quantity FROM inventory WHERE product_id = ?',
      [baseProduct.id]
    );

    const expectedStock = 1000 - (successCount * 10);
    expect(finalStock[0].stock_quantity).toBe(expectedStock);
  });
});
