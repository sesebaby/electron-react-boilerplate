import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { MockServiceManager } from '../mocks/mock-service-manager';

/**
 * 系统初始化E2E测试
 * 覆盖数据库初始化、数据重建、系统重置等关键功能
 */
test.describe('系统初始化流程', () => {
  let electronApp: any;
  let page: any;
  let mockManager: MockServiceManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    mockManager = new MockServiceManager(page);
  });

  test.afterEach(async () => {
    if (mockManager) {
      await mockManager.clearAllMocks();
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('完整的系统初始化流程', async () => {
    // 1. 导航到系统管理页面
    await TestHelpers.navigateToPage(page, 'system');
    await expect(page.locator('[data-testid="system-page"]')).toBeVisible();

    // 2. 点击系统初始化标签
    await page.click('[data-testid="initialization-tab"]');
    await expect(page.locator('[data-testid="initialization-panel"]')).toBeVisible();

    // 3. 配置初始化选项
    await page.check('[data-testid="preserve-users-checkbox"]');
    await page.check('[data-testid="preserve-settings-checkbox"]');

    // 4. 开始系统初始化
    await page.click('[data-testid="start-initialization-button"]');
    
    // 确认对话框
    await expect(page.locator('[data-testid="confirmation-dialog"]')).toBeVisible();
    await page.click('[data-testid="confirm-initialization-button"]');

    // 5. 监控初始化进度
    await expect(page.locator('[data-testid="initialization-progress"]')).toBeVisible();
    
    // 等待各个阶段完成
    await expect(page.locator('[data-testid="stage-clearing"]')).toContainText('完成');
    await expect(page.locator('[data-testid="stage-schema"]')).toContainText('完成');
    await expect(page.locator('[data-testid="stage-data"]')).toContainText('完成');
    await expect(page.locator('[data-testid="stage-services"]')).toContainText('完成');

    // 6. 验证初始化完成
    await expect(page.locator('[data-testid="initialization-success"]')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('[data-testid="initialization-success"]')).toContainText('系统初始化完成');

    // 7. 验证数据库状态
    const dbStats = await DatabaseHelpers.getTableStats(page);
    expect(dbStats.categories).toBeGreaterThan(0);
    expect(dbStats.units).toBeGreaterThan(0);
    expect(dbStats.warehouses).toBeGreaterThan(0);

    console.log('✅ 系统初始化流程测试通过');
  });

  test('数据库清理功能', async () => {
    // 1. 先创建一些测试数据
    const testProduct = await DatabaseHelpers.createTestProduct(page, {
      name: '测试商品_清理',
      sku: `SKU_CLEANUP_${Date.now()}`,
      purchasePrice: 100,
      salePrice: 150
    });

    // 2. 导航到系统管理页面
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');

    // 3. 执行数据库清理
    await page.click('[data-testid="clear-database-button"]');
    
    // 配置清理选项
    await page.check('[data-testid="preserve-users-checkbox"]');
    await page.uncheck('[data-testid="preserve-settings-checkbox"]');
    
    await page.click('[data-testid="confirm-clear-button"]');

    // 4. 等待清理完成
    await TestHelpers.waitForSuccessMessage(page, '数据库清理完成');

    // 5. 验证数据已被清理
    const productExists = await DatabaseHelpers.verifyDataExists(page, 'products', testProduct);
    expect(productExists).toBe(false);

    // 6. 验证用户数据被保留
    const userStats = await DatabaseHelpers.executeRawQuery(page, 'SELECT COUNT(*) as count FROM users');
    expect(userStats[0].count).toBeGreaterThan(0);

    console.log('✅ 数据库清理功能测试通过');
  });

  test('数据库架构重建', async () => {
    // 1. 获取重建前的表结构信息
    const tablesBefore = await DatabaseHelpers.executeRawQuery(
      page,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    // 2. 执行架构重建
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="rebuild-schema-button"]');
    await page.click('[data-testid="confirm-rebuild-button"]');

    // 3. 等待重建完成
    await TestHelpers.waitForSuccessMessage(page, '数据库架构重建完成');

    // 4. 验证表结构
    const tablesAfter = await DatabaseHelpers.executeRawQuery(
      page,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    // 验证关键表存在
    const tableNames = tablesAfter.map((t: any) => t.name);
    const expectedTables = ['users', 'products', 'categories', 'suppliers', 'warehouses', 'units'];
    
    for (const table of expectedTables) {
      expect(tableNames).toContain(table);
    }

    // 5. 验证数据库完整性
    const integrity = await DatabaseHelpers.validateIntegrity(page);
    expect(integrity.isValid).toBe(true);

    console.log('✅ 数据库架构重建测试通过');
  });

  test('内置数据导入', async () => {
    // 1. 先清空数据库
    await DatabaseHelpers.clearDatabase(page, { preserveUsers: true });

    // 2. 执行内置数据导入
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="import-builtin-data-button"]');
    await page.click('[data-testid="confirm-import-button"]');

    // 3. 等待导入完成
    await TestHelpers.waitForSuccessMessage(page, '内置数据导入完成');

    // 4. 验证导入的数据
    const stats = await DatabaseHelpers.getTableStats(page);
    
    // 验证各类基础数据已导入
    expect(stats.categories).toBeGreaterThanOrEqual(3); // 至少3个分类
    expect(stats.units).toBeGreaterThanOrEqual(10); // 至少10个单位
    expect(stats.warehouses).toBeGreaterThanOrEqual(1); // 至少1个仓库
    expect(stats.suppliers).toBeGreaterThanOrEqual(2); // 至少2个供应商

    // 5. 验证数据质量
    const categories = await DatabaseHelpers.executeRawQuery(page, 'SELECT * FROM categories LIMIT 5');
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty('name');
    expect(categories[0]).toHaveProperty('description');

    console.log('✅ 内置数据导入测试通过');
  });

  test('初始化过程中的错误处理', async () => {
    // 1. 模拟数据库错误
    await mockManager.mockDatabaseService({
      method: 'dbClearDatabase',
      error: '模拟数据库连接失败'
    });

    // 2. 尝试执行初始化
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="start-initialization-button"]');
    await page.click('[data-testid="confirm-initialization-button"]');

    // 3. 验证错误处理
    await TestHelpers.waitForErrorMessage(page, '数据库连接失败');
    await expect(page.locator('[data-testid="initialization-error"]')).toBeVisible();

    // 4. 验证系统状态未被破坏
    const integrity = await DatabaseHelpers.validateIntegrity(page);
    expect(integrity.isValid).toBe(true);

    console.log('✅ 初始化错误处理测试通过');
  });

  test('初始化进度监控', async () => {
    // 1. 模拟慢速操作
    await mockManager.mockSlowOperations(['dbClearDatabase', 'dbRebuildSchema'], 2000);

    // 2. 开始初始化
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="start-initialization-button"]');
    await page.click('[data-testid="confirm-initialization-button"]');

    // 3. 监控进度更新
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // 验证进度条从0开始
    const initialProgress = await page.locator('[data-testid="progress-percentage"]').textContent();
    expect(parseInt(initialProgress || '0')).toBeLessThan(10);

    // 等待进度更新
    await page.waitForFunction(() => {
      const progressText = document.querySelector('[data-testid="progress-percentage"]')?.textContent;
      return parseInt(progressText || '0') > 30;
    }, { timeout: 10000 });

    // 4. 验证阶段状态更新
    await expect(page.locator('[data-testid="current-stage"]')).toContainText('正在');

    // 5. 等待完成
    await expect(page.locator('[data-testid="initialization-success"]')).toBeVisible({ timeout: 30000 });

    console.log('✅ 初始化进度监控测试通过');
  });

  test('初始化后的系统验证', async () => {
    // 1. 执行完整初始化
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="start-initialization-button"]');
    await page.click('[data-testid="confirm-initialization-button"]');
    
    await expect(page.locator('[data-testid="initialization-success"]')).toBeVisible({ timeout: 60000 });

    // 2. 验证各个模块功能正常
    const modules = [
      { name: 'inventory', testId: 'inventory-page' },
      { name: 'products', testId: 'products-page' },
      { name: 'categories', testId: 'categories-page' },
      { name: 'suppliers', testId: 'suppliers-page' },
      { name: 'warehouses', testId: 'warehouses-page' }
    ];

    for (const module of modules) {
      await TestHelpers.navigateToPage(page, module.name);
      await expect(page.locator(`[data-testid="${module.testId}"]`)).toBeVisible();
      await TestHelpers.waitForLoadingComplete(page);
    }

    // 3. 验证数据完整性
    const integrity = await DatabaseHelpers.validateIntegrity(page);
    expect(integrity.isValid).toBe(true);
    expect(integrity.issues.length).toBe(0);

    // 4. 验证基础数据可用性
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');
    
    // 验证分类和单位选项可用
    await page.click('[data-testid="category-select"]');
    const categoryOptions = await page.locator('[data-testid^="category-option-"]').count();
    expect(categoryOptions).toBeGreaterThan(0);

    await page.click('[data-testid="unit-select"]');
    const unitOptions = await page.locator('[data-testid^="unit-option-"]').count();
    expect(unitOptions).toBeGreaterThan(0);

    console.log('✅ 初始化后系统验证测试通过');
  });

  test('并发初始化保护', async () => {
    // 1. 开始第一个初始化
    await TestHelpers.navigateToPage(page, 'system');
    await page.click('[data-testid="initialization-tab"]');
    await page.click('[data-testid="start-initialization-button"]');
    await page.click('[data-testid="confirm-initialization-button"]');

    // 2. 验证初始化按钮被禁用
    await expect(page.locator('[data-testid="start-initialization-button"]')).toBeDisabled();

    // 3. 验证警告信息
    await expect(page.locator('[data-testid="initialization-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="initialization-in-progress"]')).toContainText('正在进行');

    // 4. 等待初始化完成
    await expect(page.locator('[data-testid="initialization-success"]')).toBeVisible({ timeout: 60000 });

    // 5. 验证按钮重新启用
    await expect(page.locator('[data-testid="start-initialization-button"]')).toBeEnabled();

    console.log('✅ 并发初始化保护测试通过');
  });
});
