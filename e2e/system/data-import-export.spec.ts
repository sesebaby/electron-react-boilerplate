import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { MockServiceManager } from '../mocks/mock-service-manager';
import path from 'path';

/**
 * 数据导入导出E2E测试
 * 覆盖Excel导入导出、数据验证、错误处理等功能
 */
test.describe('数据导入导出流程', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;
  let mockManager: MockServiceManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `import_export_test_${Date.now()}`);
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

  test('商品数据Excel导出功能', async () => {
    // 1. 创建测试商品数据
    const testProducts = [];
    for (let i = 1; i <= 3; i++) {
      const productData = await isolationManager.createIsolatedTestData(
        'products',
        () => ({
          name: `导出测试商品_${i}`,
          sku: `EXPORT_SKU_${i}_${Date.now()}`,
          description: `导出测试商品描述_${i}`,
          purchasePrice: 100 + i * 10,
          salePrice: 150 + i * 15,
          minStock: 10,
          maxStock: 100
        }),
        async (data) => await DatabaseHelpers.createTestProduct(page, data)
      );
      testProducts.push(productData);
    }

    // 2. 导航到商品管理页面
    await TestHelpers.navigateToPage(page, 'products');
    await TestHelpers.waitForLoadingComplete(page);

    // 3. 执行导出操作
    await page.click('[data-testid="export-products-button"]');
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();

    // 选择导出格式
    await page.selectOption('[data-testid="export-format-select"]', 'excel');
    
    // 选择导出字段
    await page.check('[data-testid="export-field-name"]');
    await page.check('[data-testid="export-field-sku"]');
    await page.check('[data-testid="export-field-price"]');

    // 开始导出
    await page.click('[data-testid="start-export-button"]');

    // 4. 验证导出进度
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
    await TestHelpers.waitForSuccessMessage(page, '导出完成');

    // 5. 验证导出文件
    const exportResult = await page.evaluate(() => {
      // @ts-ignore
      return window.__lastExportResult;
    });

    expect(exportResult).toBeTruthy();
    expect(exportResult.filePath).toContain('.xlsx');
    expect(exportResult.recordCount).toBe(testProducts.length);

    console.log('✅ 商品数据Excel导出测试通过');
  });

  test('商品数据Excel导入功能', async () => {
    // 1. 模拟Excel文件选择
    await mockManager.mockFileSystemOperations({
      'showOpenDialog': {
        success: true,
        data: {
          filePaths: [path.join(__dirname, '../fixtures/test-products.xlsx')]
        }
      },
      'readExcelFile': {
        success: true,
        data: [
          {
            '商品名称': '导入测试商品1',
            'SKU': 'IMPORT_SKU_1',
            '描述': '导入测试商品描述1',
            '采购价': 100,
            '销售价': 150,
            '最小库存': 10,
            '最大库存': 100
          },
          {
            '商品名称': '导入测试商品2',
            'SKU': 'IMPORT_SKU_2',
            '描述': '导入测试商品描述2',
            '采购价': 120,
            '销售价': 180,
            '最小库存': 15,
            '最大库存': 120
          }
        ]
      }
    });

    // 2. 导航到商品管理页面
    await TestHelpers.navigateToPage(page, 'products');

    // 3. 执行导入操作
    await page.click('[data-testid="import-products-button"]');
    await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible();

    // 选择文件
    await page.click('[data-testid="select-import-file-button"]');
    
    // 4. 字段映射配置
    await expect(page.locator('[data-testid="field-mapping-panel"]')).toBeVisible();
    
    // 配置字段映射
    await page.selectOption('[data-testid="map-name-field"]', '商品名称');
    await page.selectOption('[data-testid="map-sku-field"]', 'SKU');
    await page.selectOption('[data-testid="map-description-field"]', '描述');
    await page.selectOption('[data-testid="map-purchase-price-field"]', '采购价');
    await page.selectOption('[data-testid="map-sale-price-field"]', '销售价');

    // 5. 数据预览和验证
    await page.click('[data-testid="preview-import-data-button"]');
    await expect(page.locator('[data-testid="import-preview-table"]')).toBeVisible();

    // 验证预览数据
    const previewRows = await page.locator('[data-testid="preview-row"]').count();
    expect(previewRows).toBe(2);

    // 6. 执行导入
    await page.click('[data-testid="start-import-button"]');
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    await TestHelpers.waitForSuccessMessage(page, '导入完成');

    // 7. 验证导入结果
    const importResult = await page.evaluate(() => {
      // @ts-ignore
      return window.__lastImportResult;
    });

    expect(importResult.successCount).toBe(2);
    expect(importResult.errorCount).toBe(0);

    // 验证数据已保存到数据库
    const products = await DatabaseHelpers.executeRawQuery(
      page,
      "SELECT * FROM products WHERE sku LIKE 'IMPORT_SKU_%'"
    );
    expect(products.length).toBe(2);

    console.log('✅ 商品数据Excel导入测试通过');
  });

  test('导入数据验证和错误处理', async () => {
    // 1. 模拟包含错误的Excel数据
    await mockManager.mockFileSystemOperations({
      'showOpenDialog': {
        success: true,
        data: {
          filePaths: [path.join(__dirname, '../fixtures/invalid-products.xlsx')]
        }
      },
      'readExcelFile': {
        success: true,
        data: [
          {
            '商品名称': '', // 空名称 - 应该报错
            'SKU': 'INVALID_SKU_1',
            '采购价': 'abc', // 无效价格 - 应该报错
            '销售价': 150
          },
          {
            '商品名称': '有效商品',
            'SKU': 'VALID_SKU_1',
            '采购价': 100,
            '销售价': 80 // 销售价低于采购价 - 应该警告
          },
          {
            '商品名称': '重复SKU商品',
            'SKU': 'VALID_SKU_1', // 重复SKU - 应该报错
            '采购价': 120,
            '销售价': 180
          }
        ]
      }
    });

    // 2. 执行导入
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="import-products-button"]');
    await page.click('[data-testid="select-import-file-button"]');

    // 配置字段映射
    await page.selectOption('[data-testid="map-name-field"]', '商品名称');
    await page.selectOption('[data-testid="map-sku-field"]', 'SKU');
    await page.selectOption('[data-testid="map-purchase-price-field"]', '采购价');
    await page.selectOption('[data-testid="map-sale-price-field"]', '销售价');

    // 3. 预览数据，验证错误检测
    await page.click('[data-testid="preview-import-data-button"]');
    
    // 验证错误提示
    await expect(page.locator('[data-testid="validation-errors"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-empty-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-invalid-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-duplicate-sku"]')).toBeVisible();
    await expect(page.locator('[data-testid="warning-price-mismatch"]')).toBeVisible();

    // 4. 选择处理方式
    await page.check('[data-testid="skip-invalid-records"]');
    await page.click('[data-testid="start-import-button"]');

    // 5. 验证导入结果
    await TestHelpers.waitForSuccessMessage(page, '导入完成');
    
    const importResult = await page.evaluate(() => {
      // @ts-ignore
      return window.__lastImportResult;
    });

    expect(importResult.successCount).toBe(1); // 只有一条有效记录
    expect(importResult.errorCount).toBe(2); // 两条错误记录
    expect(importResult.warningCount).toBe(1); // 一条警告记录

    console.log('✅ 导入数据验证和错误处理测试通过');
  });

  test('大批量数据导入性能测试', async () => {
    // 1. 模拟大量数据
    const largeDataSet = [];
    for (let i = 1; i <= 1000; i++) {
      largeDataSet.push({
        '商品名称': `批量测试商品_${i}`,
        'SKU': `BULK_SKU_${i.toString().padStart(4, '0')}`,
        '描述': `批量测试商品描述_${i}`,
        '采购价': 100 + (i % 50),
        '销售价': 150 + (i % 75),
        '最小库存': 10,
        '最大库存': 100
      });
    }

    await mockManager.mockFileSystemOperations({
      'showOpenDialog': {
        success: true,
        data: {
          filePaths: [path.join(__dirname, '../fixtures/bulk-products.xlsx')]
        }
      },
      'readExcelFile': {
        success: true,
        data: largeDataSet
      }
    });

    // 2. 执行批量导入
    const startTime = Date.now();
    
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="import-products-button"]');
    await page.click('[data-testid="select-import-file-button"]');

    // 快速配置映射
    await page.selectOption('[data-testid="map-name-field"]', '商品名称');
    await page.selectOption('[data-testid="map-sku-field"]', 'SKU');
    await page.selectOption('[data-testid="map-purchase-price-field"]', '采购价');
    await page.selectOption('[data-testid="map-sale-price-field"]', '销售价');

    // 启用批量处理模式
    await page.check('[data-testid="enable-batch-processing"]');
    await page.fill('[data-testid="batch-size-input"]', '100');

    await page.click('[data-testid="start-import-button"]');

    // 3. 监控导入进度
    await expect(page.locator('[data-testid="import-progress"]')).toBeVisible();
    
    // 验证进度更新
    await page.waitForFunction(() => {
      const progressText = document.querySelector('[data-testid="progress-percentage"]')?.textContent;
      return parseInt(progressText || '0') > 10;
    }, { timeout: 30000 });

    // 等待完成
    await TestHelpers.waitForSuccessMessage(page, '导入完成', 120000); // 2分钟超时
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 4. 验证性能指标
    expect(duration).toBeLessThan(120000); // 应在2分钟内完成

    const importResult = await page.evaluate(() => {
      // @ts-ignore
      return window.__lastImportResult;
    });

    expect(importResult.successCount).toBe(1000);
    expect(importResult.errorCount).toBe(0);

    // 验证数据库中的记录
    const productCount = await DatabaseHelpers.executeRawQuery(
      page,
      "SELECT COUNT(*) as count FROM products WHERE sku LIKE 'BULK_SKU_%'"
    );
    expect(productCount[0].count).toBe(1000);

    console.log(`✅ 大批量数据导入性能测试通过，耗时: ${duration}ms`);
  });

  test('导出数据筛选和自定义', async () => {
    // 1. 创建不同类型的测试数据
    const categories = ['电子产品', '办公用品', '食品饮料'];
    const testProducts = [];

    for (let i = 0; i < categories.length; i++) {
      const categoryData = await isolationManager.createIsolatedTestData(
        'categories',
        () => ({ name: categories[i], description: `${categories[i]}分类` }),
        async (data) => await DatabaseHelpers.createTestCategory(page, data)
      );

      for (let j = 1; j <= 2; j++) {
        const productData = await isolationManager.createIsolatedTestData(
          'products',
          () => ({
            name: `${categories[i]}_商品_${j}`,
            sku: `FILTER_SKU_${i}_${j}`,
            categoryId: categoryData.id,
            purchasePrice: 100 + i * 10 + j,
            salePrice: 150 + i * 15 + j * 5
          }),
          async (data) => await DatabaseHelpers.createTestProduct(page, data)
        );
        testProducts.push(productData);
      }
    }

    // 2. 执行筛选导出
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="export-products-button"]');

    // 设置筛选条件
    await page.selectOption('[data-testid="filter-category"]', categories[0]); // 只导出电子产品
    await page.fill('[data-testid="filter-price-min"]', '100');
    await page.fill('[data-testid="filter-price-max"]', '200');

    // 自定义导出字段
    await page.uncheck('[data-testid="export-field-description"]');
    await page.check('[data-testid="export-field-category"]');
    await page.check('[data-testid="export-field-stock"]');

    await page.click('[data-testid="start-export-button"]');
    await TestHelpers.waitForSuccessMessage(page, '导出完成');

    // 3. 验证导出结果
    const exportResult = await page.evaluate(() => {
      // @ts-ignore
      return window.__lastExportResult;
    });

    expect(exportResult.recordCount).toBe(2); // 只有电子产品的2条记录
    expect(exportResult.fields).toContain('category');
    expect(exportResult.fields).toContain('stock');
    expect(exportResult.fields).not.toContain('description');

    console.log('✅ 导出数据筛选和自定义测试通过');
  });
});
