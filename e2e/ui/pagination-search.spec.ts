import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 分页和搜索功能UI测试套件
 * 覆盖数据列表的分页、搜索、排序、筛选等功能
 */
test.describe('分页和搜索功能测试', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `pagination_search_test_${Date.now()}`);
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

  test('基本分页功能', async () => {
    // 1. 创建足够的测试数据以触发分页
    const testProducts = [];
    for (let i = 1; i <= 25; i++) {
      const productData = await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `分页测试商品_${i.toString().padStart(2, '0')}`,
          sku: `PAGE_SKU_${i.toString().padStart(2, '0')}`
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
      testProducts.push(productData);
    }

    // 2. 导航到商品列表页面
    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 3. 验证分页控件显示
    await expect(page.locator('[data-testid="pagination-container"]')).toBeVisible();
    
    // 验证总记录数显示
    const totalRecords = await page.locator('[data-testid="total-records"]').textContent();
    expect(parseInt(totalRecords || '0')).toBeGreaterThanOrEqual(25);

    // 4. 验证第一页数据
    const firstPageRows = await page.locator('[data-testid="product-row"]').count();
    expect(firstPageRows).toBeLessThanOrEqual(20); // 假设每页20条

    // 验证页码显示
    await expect(page.locator('[data-testid="current-page"]')).toContainText('1');

    // 5. 测试下一页功能
    await page.click('[data-testid="next-page-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证页码更新
    await expect(page.locator('[data-testid="current-page"]')).toContainText('2');

    // 验证数据更新
    const secondPageRows = await page.locator('[data-testid="product-row"]').count();
    expect(secondPageRows).toBeGreaterThan(0);

    // 6. 测试上一页功能
    await page.click('[data-testid="prev-page-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    await expect(page.locator('[data-testid="current-page"]')).toContainText('1');

    // 7. 测试直接跳转页面
    await page.fill('[data-testid="page-input"]', '2');
    await page.press('[data-testid="page-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    await expect(page.locator('[data-testid="current-page"]')).toContainText('2');

    console.log('✅ 基本分页功能测试通过');
  });

  test('搜索功能完整测试', async () => {
    // 1. 创建具有不同特征的测试数据
    const testData = [
      { name: '苹果手机', sku: 'APPLE_PHONE_001', category: '电子产品' },
      { name: '苹果电脑', sku: 'APPLE_COMPUTER_001', category: '电子产品' },
      { name: '香蕉', sku: 'BANANA_001', category: '食品' },
      { name: '橙子', sku: 'ORANGE_001', category: '食品' },
      { name: '笔记本', sku: 'NOTEBOOK_001', category: '办公用品' }
    ];

    for (const data of testData) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct(data),
        async (productData) => await DatabaseHelpers.createTestProduct(page, productData)
      );
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 2. 测试基本文本搜索
    await page.fill('[data-testid="search-input"]', '苹果');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证搜索结果
    const searchResults = await page.locator('[data-testid="product-row"]').count();
    expect(searchResults).toBe(2); // 苹果手机和苹果电脑

    // 验证搜索结果内容
    await expect(page.locator('[data-testid="product-row"]').first()).toContainText('苹果');

    // 3. 测试SKU搜索
    await page.fill('[data-testid="search-input"]', 'BANANA_001');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const skuResults = await page.locator('[data-testid="product-row"]').count();
    expect(skuResults).toBe(1);
    await expect(page.locator('[data-testid="product-row"]').first()).toContainText('香蕉');

    // 4. 测试空搜索（显示所有结果）
    await page.fill('[data-testid="search-input"]', '');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    const allResults = await page.locator('[data-testid="product-row"]').count();
    expect(allResults).toBeGreaterThanOrEqual(5);

    // 5. 测试无结果搜索
    await page.fill('[data-testid="search-input"]', '不存在的商品');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    await expect(page.locator('[data-testid="no-results-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results-message"]')).toContainText('未找到匹配的商品');

    console.log('✅ 搜索功能完整测试通过');
  });

  test('高级筛选功能', async () => {
    // 1. 创建不同分类和价格的测试数据
    const categories = ['电子产品', '办公用品', '食品'];
    const testProducts = [];

    for (let i = 0; i < categories.length; i++) {
      const categoryData = await isolationManager.createIsolatedTestData(
        'categories',
        () => TestDataFactory.createCategory({ name: categories[i] }),
        async (data) => await DatabaseHelpers.createTestCategory(page, data)
      );

      for (let j = 1; j <= 3; j++) {
        const productData = await isolationManager.createIsolatedTestData(
          'products',
          () => TestDataFactory.createProduct({
            name: `${categories[i]}_商品_${j}`,
            categoryId: categoryData.id,
            purchasePrice: 100 + i * 50 + j * 10,
            salePrice: 150 + i * 75 + j * 15
          }),
          async (data) => await DatabaseHelpers.createTestProduct(page, data)
        );
        testProducts.push(productData);
      }
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 2. 测试分类筛选
    await page.click('[data-testid="filter-button"]');
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();

    await page.selectOption('[data-testid="category-filter"]', categories[0]);
    await page.click('[data-testid="apply-filter-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    const categoryResults = await page.locator('[data-testid="product-row"]').count();
    expect(categoryResults).toBe(3); // 该分类下的3个商品

    // 3. 测试价格范围筛选
    await page.click('[data-testid="filter-button"]');
    await page.fill('[data-testid="price-min-filter"]', '150');
    await page.fill('[data-testid="price-max-filter"]', '200');
    await page.click('[data-testid="apply-filter-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证价格筛选结果
    const priceFilteredRows = await page.locator('[data-testid="product-row"]');
    const rowCount = await priceFilteredRows.count();
    
    for (let i = 0; i < rowCount; i++) {
      const priceText = await priceFilteredRows.nth(i).locator('[data-testid="sale-price"]').textContent();
      const price = parseFloat(priceText?.replace(/[^\d.]/g, '') || '0');
      expect(price).toBeGreaterThanOrEqual(150);
      expect(price).toBeLessThanOrEqual(200);
    }

    // 4. 测试清除筛选
    await page.click('[data-testid="clear-filter-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    const clearedResults = await page.locator('[data-testid="product-row"]').count();
    expect(clearedResults).toBeGreaterThanOrEqual(9); // 所有商品

    console.log('✅ 高级筛选功能测试通过');
  });

  test('排序功能测试', async () => {
    // 1. 创建具有不同属性的测试数据
    const sortTestData = [
      { name: 'A商品', sku: 'SKU_003', purchasePrice: 300, salePrice: 450 },
      { name: 'B商品', sku: 'SKU_001', purchasePrice: 100, salePrice: 150 },
      { name: 'C商品', sku: 'SKU_002', purchasePrice: 200, salePrice: 300 }
    ];

    for (const data of sortTestData) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct(data),
        async (productData) => await DatabaseHelpers.createTestProduct(page, productData)
      );
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 2. 测试按名称排序
    await page.click('[data-testid="sort-name-header"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证升序排序
    const nameAscRows = await page.locator('[data-testid="product-name"]').allTextContents();
    const sortedNamesAsc = [...nameAscRows].sort();
    expect(nameAscRows).toEqual(sortedNamesAsc);

    // 3. 测试降序排序
    await page.click('[data-testid="sort-name-header"]');
    await TestHelpers.waitForLoadingComplete(page);

    const nameDescRows = await page.locator('[data-testid="product-name"]').allTextContents();
    const sortedNamesDesc = [...nameDescRows].sort().reverse();
    expect(nameDescRows).toEqual(sortedNamesDesc);

    // 4. 测试按价格排序
    await page.click('[data-testid="sort-price-header"]');
    await TestHelpers.waitForLoadingComplete(page);

    const priceRows = await page.locator('[data-testid="sale-price"]').allTextContents();
    const prices = priceRows.map(p => parseFloat(p.replace(/[^\d.]/g, '')));
    const sortedPrices = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sortedPrices);

    // 5. 测试多列排序
    await page.click('[data-testid="advanced-sort-button"]');
    await expect(page.locator('[data-testid="sort-config-panel"]')).toBeVisible();

    // 配置多列排序：先按分类，再按价格
    await page.selectOption('[data-testid="primary-sort-field"]', 'category');
    await page.selectOption('[data-testid="primary-sort-order"]', 'asc');
    await page.selectOption('[data-testid="secondary-sort-field"]', 'salePrice');
    await page.selectOption('[data-testid="secondary-sort-order"]', 'desc');

    await page.click('[data-testid="apply-sort-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证多列排序结果
    await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('分类↑ 价格↓');

    console.log('✅ 排序功能测试通过');
  });

  test('分页与搜索筛选的组合使用', async () => {
    // 1. 创建大量测试数据
    for (let i = 1; i <= 50; i++) {
      const category = i <= 25 ? '电子产品' : '办公用品';
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `${category}_商品_${i.toString().padStart(2, '0')}`,
          sku: `COMBO_SKU_${i.toString().padStart(2, '0')}`,
          category: category
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 2. 应用搜索条件
    await page.fill('[data-testid="search-input"]', '电子产品');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证搜索结果分页
    const searchResultsTotal = await page.locator('[data-testid="total-records"]').textContent();
    expect(parseInt(searchResultsTotal || '0')).toBe(25);

    // 3. 在搜索结果中测试分页
    if (parseInt(searchResultsTotal || '0') > 20) {
      await expect(page.locator('[data-testid="next-page-button"]')).toBeEnabled();
      
      await page.click('[data-testid="next-page-button"]');
      await TestHelpers.waitForLoadingComplete(page);
      
      // 验证第二页仍然是搜索结果
      const secondPageRows = await page.locator('[data-testid="product-row"]');
      const rowCount = await secondPageRows.count();
      
      for (let i = 0; i < rowCount; i++) {
        const rowText = await secondPageRows.nth(i).textContent();
        expect(rowText).toContain('电子产品');
      }
    }

    // 4. 在搜索基础上添加筛选
    await page.click('[data-testid="filter-button"]');
    await page.fill('[data-testid="price-min-filter"]', '100');
    await page.click('[data-testid="apply-filter-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证组合筛选结果
    const combinedResults = await page.locator('[data-testid="total-records"]').textContent();
    expect(parseInt(combinedResults || '0')).toBeLessThanOrEqual(25);

    // 5. 清除搜索，保留筛选
    await page.fill('[data-testid="search-input"]', '');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证筛选仍然有效
    const filterOnlyResults = await page.locator('[data-testid="total-records"]').textContent();
    expect(parseInt(filterOnlyResults || '0')).toBeGreaterThan(parseInt(combinedResults || '0'));

    console.log('✅ 分页与搜索筛选组合使用测试通过');
  });

  test('搜索性能和用户体验', async () => {
    // 1. 创建大量数据测试搜索性能
    for (let i = 1; i <= 100; i++) {
      await isolationManager.createIsolatedTestData(
        'products',
        () => TestDataFactory.createProduct({
          name: `性能测试商品_${i.toString().padStart(3, '0')}`,
          sku: `PERF_SKU_${i.toString().padStart(3, '0')}`
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
    }

    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 2. 测试搜索响应时间
    const startTime = Date.now();
    await page.fill('[data-testid="search-input"]', '性能测试');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);
    const searchTime = Date.now() - startTime;

    expect(searchTime).toBeLessThan(3000); // 搜索应在3秒内完成

    // 3. 测试搜索加载状态
    await page.fill('[data-testid="search-input"]', '另一个搜索');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // 验证加载指示器显示
    await expect(page.locator('[data-testid="search-loading"]')).toBeVisible();
    
    await TestHelpers.waitForLoadingComplete(page);
    await expect(page.locator('[data-testid="search-loading"]')).not.toBeVisible();

    // 4. 测试搜索防抖
    await page.fill('[data-testid="search-input"]', 'a');
    await page.fill('[data-testid="search-input"]', 'ab');
    await page.fill('[data-testid="search-input"]', 'abc');
    
    // 等待防抖时间
    await page.waitForTimeout(1000);
    
    // 验证只执行了最后一次搜索
    const searchHistory = await page.evaluate(() => {
      // @ts-ignore
      return window.__searchHistory?.length || 0;
    });
    
    expect(searchHistory).toBeLessThanOrEqual(2); // 防抖应该减少搜索次数

    // 5. 测试搜索结果高亮
    await page.fill('[data-testid="search-input"]', '性能');
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证搜索关键词高亮显示
    await expect(page.locator('[data-testid="highlight-text"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="highlight-text"]').first()).toContainText('性能');

    console.log('✅ 搜索性能和用户体验测试通过');
  });
});
