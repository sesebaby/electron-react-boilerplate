import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 库存管理核心业务流程E2E测试
 * 覆盖商品管理、库存操作、数据一致性等关键功能
 */
test.describe('库存管理核心流程', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    // 启动应用
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    
    // 等待应用加载
    await TestHelpers.waitForAppLoad(page);
    
    // 登录
    await TestHelpers.login(page);
    
    // 初始化数据隔离
    isolationManager = new DataIsolationManager(page, `inventory_test_${Date.now()}`);
    await isolationManager.startIsolationSession();
  });

  test.afterEach(async () => {
    // 清理数据隔离
    if (isolationManager) {
      await isolationManager.endIsolationSession();
    }
    
    // 关闭应用
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('完整的商品管理流程', async () => {
    // 1. 导航到商品管理页面
    await TestHelpers.navigateToPage(page, 'products');
    await expect(page.locator('[data-testid="products-page"]')).toBeVisible();

    // 2. 创建新商品
    const productData = TestDataFactory.createProduct({
      name: '测试商品_E2E',
      sku: `SKU_E2E_${Date.now()}`,
      purchasePrice: 100,
      salePrice: 150
    });

    await page.click('[data-testid="add-product-button"]');
    await expect(page.locator('[data-testid="product-form-modal"]')).toBeVisible();

    // 填写商品信息
    await TestHelpers.fillForm(page, {
      'product-name': productData.name,
      'product-sku': productData.sku,
      'product-description': productData.description,
      'purchase-price': productData.purchasePrice.toString(),
      'sale-price': productData.salePrice.toString(),
      'min-stock': productData.minStock.toString(),
      'max-stock': productData.maxStock.toString()
    });

    // 选择分类和单位
    await TestHelpers.selectOption(page, 'category', 'default-category');
    await TestHelpers.selectOption(page, 'unit', 'default-unit');

    // 保存商品
    await page.click('[data-testid="save-product-button"]');
    await TestHelpers.waitForSuccessMessage(page, '商品创建成功');

    // 3. 验证商品已创建
    await expect(page.locator(`text=${productData.name}`)).toBeVisible();
    
    // 记录创建的数据用于清理
    const productId = await page.evaluate(() => {
      // 从页面获取最新创建的商品ID
      const rows = document.querySelectorAll('[data-testid="product-row"]');
      return rows[rows.length - 1]?.getAttribute('data-product-id');
    });
    
    if (productId) {
      isolationManager.recordCreatedData('products', productId);
    }

    console.log('✅ 商品创建流程测试通过');
  });

  test('库存入库操作流程', async () => {
    // 1. 先创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '入库测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 导航到入库页面
    await TestHelpers.navigateToPage(page, 'stock-in');
    await expect(page.locator('[data-testid="stock-in-page"]')).toBeVisible();

    // 3. 执行入库操作
    await page.click('[data-testid="add-stock-in-button"]');
    await expect(page.locator('[data-testid="stock-in-form"]')).toBeVisible();

    // 选择商品
    await TestHelpers.selectOption(page, 'product', productData.id);
    
    // 填写入库信息
    await TestHelpers.fillForm(page, {
      'quantity': '50',
      'unit-price': '100',
      'remark': '测试入库操作'
    });

    // 提交入库
    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page, '入库成功');

    // 4. 验证库存数量更新
    await TestHelpers.navigateToPage(page, 'inventory');
    
    // 搜索刚入库的商品
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证库存数量
    const stockQuantity = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(stockQuantity).toBe('50');

    console.log('✅ 库存入库流程测试通过');
  });

  test('库存出库操作流程', async () => {
    // 1. 创建商品并设置初始库存
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '出库测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 先入库一些数量
    await TestHelpers.navigateToPage(page, 'stock-in');
    await page.click('[data-testid="add-stock-in-button"]');
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'quantity': '100',
      'unit-price': '100'
    });
    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page);

    // 2. 执行出库操作
    await TestHelpers.navigateToPage(page, 'stock-out');
    await page.click('[data-testid="add-stock-out-button"]');
    
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'quantity': '30',
      'unit-price': '150',
      'remark': '测试出库操作'
    });

    await page.click('[data-testid="submit-stock-out-button"]');
    await TestHelpers.waitForSuccessMessage(page, '出库成功');

    // 3. 验证库存数量更新
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const stockQuantity = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(stockQuantity).toBe('70'); // 100 - 30 = 70

    console.log('✅ 库存出库流程测试通过');
  });

  test('库存调整操作流程', async () => {
    // 1. 创建商品并设置初始库存
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '调整测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await TestHelpers.navigateToPage(page, 'stock-in');
    await page.click('[data-testid="add-stock-in-button"]');
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, { 'quantity': '80', 'unit-price': '100' });
    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page);

    // 2. 执行库存调整
    await TestHelpers.navigateToPage(page, 'stock-adjust');
    await page.click('[data-testid="add-stock-adjust-button"]');
    
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'adjust-quantity': '5',
      'adjust-type': 'increase',
      'remark': '盘点调整'
    });

    await page.click('[data-testid="submit-stock-adjust-button"]');
    await TestHelpers.waitForSuccessMessage(page, '库存调整成功');

    // 3. 验证调整结果
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const stockQuantity = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(stockQuantity).toBe('85'); // 80 + 5 = 85

    console.log('✅ 库存调整流程测试通过');
  });

  test('库存不足警告机制', async () => {
    // 1. 创建低库存商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ 
        name: '低库存测试商品',
        minStock: 20,
        maxStock: 100
      }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 设置低于最小库存的数量
    await TestHelpers.navigateToPage(page, 'stock-in');
    await page.click('[data-testid="add-stock-in-button"]');
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, { 'quantity': '15', 'unit-price': '100' });
    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page);

    // 3. 检查库存警告
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证低库存警告显示
    await expect(page.locator('[data-testid="low-stock-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-status"]')).toContainText('库存不足');

    console.log('✅ 库存不足警告机制测试通过');
  });

  test('数据一致性验证', async () => {
    // 1. 创建商品并执行多次库存操作
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '一致性测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 执行一系列库存操作
    const operations = [
      { type: 'in', quantity: 100 },
      { type: 'out', quantity: 30 },
      { type: 'adjust', quantity: 5, adjustType: 'increase' },
      { type: 'out', quantity: 20 }
    ];

    let expectedStock = 0;
    
    for (const op of operations) {
      if (op.type === 'in') {
        await TestHelpers.navigateToPage(page, 'stock-in');
        await page.click('[data-testid="add-stock-in-button"]');
        await TestHelpers.selectOption(page, 'product', productData.id);
        await TestHelpers.fillForm(page, { 'quantity': op.quantity.toString(), 'unit-price': '100' });
        await page.click('[data-testid="submit-stock-in-button"]');
        expectedStock += op.quantity;
      } else if (op.type === 'out') {
        await TestHelpers.navigateToPage(page, 'stock-out');
        await page.click('[data-testid="add-stock-out-button"]');
        await TestHelpers.selectOption(page, 'product', productData.id);
        await TestHelpers.fillForm(page, { 'quantity': op.quantity.toString(), 'unit-price': '150' });
        await page.click('[data-testid="submit-stock-out-button"]');
        expectedStock -= op.quantity;
      } else if (op.type === 'adjust') {
        await TestHelpers.navigateToPage(page, 'stock-adjust');
        await page.click('[data-testid="add-stock-adjust-button"]');
        await TestHelpers.selectOption(page, 'product', productData.id);
        await TestHelpers.fillForm(page, { 
          'adjust-quantity': op.quantity.toString(),
          'adjust-type': op.adjustType || 'increase'
        });
        await page.click('[data-testid="submit-stock-adjust-button"]');
        expectedStock += op.adjustType === 'increase' ? op.quantity : -op.quantity;
      }
      
      await TestHelpers.waitForSuccessMessage(page);
    }

    // 3. 验证最终库存数量
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const actualStock = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(actualStock).toBe(expectedStock.toString());

    // 4. 验证交易记录完整性
    await TestHelpers.navigateToPage(page, 'transaction-records');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const transactionRows = await page.locator('[data-testid="transaction-row"]').count();
    expect(transactionRows).toBe(operations.length);

    console.log('✅ 数据一致性验证测试通过');
  });
});
