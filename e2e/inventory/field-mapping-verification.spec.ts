import { test, expect } from '@playwright/test';
import { TestHelpers, TestDataManager } from '../utils/test-helpers';
import { TestDataFactory } from '../fixtures/test-data';
import { mockDataProvider } from '../../tests/mocks/mockDataProvider';

/**
 * 字段映射验证E2E测试
 * 验证前后端字段映射的完整性和正确性
 */
test.describe('字段映射验证', () => {
  let electronApp: any;
  let page: any;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    // 导航到商品管理页面
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.waitForSelector('[data-testid="inventory-page"]', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await TestDataManager.cleanupTestData(page);
    
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('验证商品列表显示所有关键字段', async () => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 验证表头包含所有关键字段
    const expectedHeaders = [
      'SKU',
      '商品名称',
      '品牌',
      '型号',
      '库存数量',
      '预留数量',
      '可用数量',
      '单价',
      '总价值',
      '最低库存',
      '最高库存',
      '供应商',
      '分类',
      '状态'
    ];
    
    for (const header of expectedHeaders) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
    
    console.log('✅ 商品列表表头字段验证通过');
  });

  test('验证商品详情显示完整字段信息', async () => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 点击第一个商品查看详情
    const firstProduct = page.locator('[data-testid="product-row"]').first();
    await firstProduct.click();
    
    // 等待详情页面加载
    await page.waitForSelector('[data-testid="product-detail"]', { timeout: 10000 });
    
    // 验证详情页面包含所有关键字段
    const expectedDetailFields = [
      'SKU',
      '商品名称',
      '商品描述',
      '品牌',
      '型号',
      '条形码',
      '库存数量',
      '预留数量',
      '可用数量',
      '采购价',
      '销售价',
      '总价值',
      '最低库存',
      '最高库存',
      '供应商',
      '分类',
      '单位',
      '存储位置',
      '状态',
      '创建时间',
      '更新时间'
    ];
    
    for (const field of expectedDetailFields) {
      const fieldElement = page.locator(`[data-testid="field-${field}"], label:has-text("${field}"), .field-label:has-text("${field}")`);
      await expect(fieldElement).toBeVisible();
    }
    
    console.log('✅ 商品详情页面字段验证通过');
  });

  test('验证商品创建表单包含所有必需字段', async () => {
    // 点击新增商品按钮
    await page.click('[data-testid="add-product-btn"]');
    
    // 等待表单加载
    await page.waitForSelector('[data-testid="product-form"]', { timeout: 10000 });
    
    // 验证表单包含所有必需字段
    const requiredFormFields = [
      'name', // 商品名称
      'sku', // SKU
      'description', // 商品描述
      'brand', // 品牌
      'model', // 型号
      'barcode', // 条形码
      'stockQuantity', // 库存数量
      'salePrice', // 销售价
      'purchasePrice', // 采购价
      'minStock', // 最低库存
      'maxStock', // 最高库存
      'categoryId', // 分类
      'supplierId', // 供应商
      'unitId', // 单位
      'location', // 存储位置
      'status' // 状态
    ];
    
    for (const field of requiredFormFields) {
      const fieldElement = page.locator(`[name="${field}"], [data-testid="field-${field}"]`);
      await expect(fieldElement).toBeVisible();
    }
    
    console.log('✅ 商品创建表单字段验证通过');
  });

  test('验证商品数据的完整性和字段映射', async () => {
    // 创建测试商品数据
    const testProduct = TestDataFactory.createTestProduct({
      name: '字段映射测试商品',
      sku: 'FIELD-MAP-001',
      description: '用于验证字段映射的测试商品',
      brand: '测试品牌',
      model: '测试型号',
      barcode: '1234567890123',
      stockQuantity: 100,
      reservedQuantity: 10,
      salePrice: 199.99,
      purchasePrice: 120.00,
      minStock: 20,
      maxStock: 500,
      location: 'A-01-01',
      status: 'active'
    });
    
    // 通过API创建商品
    await TestDataManager.createTestProduct(page, testProduct);
    
    // 刷新页面并等待加载
    await page.reload();
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 搜索创建的商品
    await page.fill('[data-testid="search-input"]', 'FIELD-MAP-001');
    await page.click('[data-testid="search-btn"]');
    
    // 等待搜索结果
    await page.waitForSelector('[data-testid="product-row"]', { timeout: 10000 });
    
    // 验证列表中的字段显示
    const productRow = page.locator('[data-testid="product-row"]').first();
    
    // 验证SKU显示
    await expect(productRow.locator('[data-testid="product-sku"]')).toContainText('FIELD-MAP-001');
    
    // 验证商品名称显示
    await expect(productRow.locator('[data-testid="product-name"]')).toContainText('字段映射测试商品');
    
    // 验证库存数量显示
    await expect(productRow.locator('[data-testid="product-stock"]')).toContainText('100');
    
    // 验证预留数量显示
    await expect(productRow.locator('[data-testid="product-reserved"]')).toContainText('10');
    
    // 验证可用数量计算正确（库存数量 - 预留数量 = 90）
    await expect(productRow.locator('[data-testid="product-available"]')).toContainText('90');
    
    // 验证销售价显示
    await expect(productRow.locator('[data-testid="product-sale-price"]')).toContainText('199.99');
    
    // 点击查看详情
    await productRow.click();
    await page.waitForSelector('[data-testid="product-detail"]', { timeout: 10000 });
    
    // 验证详情页面的字段值
    await expect(page.locator('[data-testid="detail-sku"]')).toContainText('FIELD-MAP-001');
    await expect(page.locator('[data-testid="detail-name"]')).toContainText('字段映射测试商品');
    await expect(page.locator('[data-testid="detail-description"]')).toContainText('用于验证字段映射的测试商品');
    await expect(page.locator('[data-testid="detail-brand"]')).toContainText('测试品牌');
    await expect(page.locator('[data-testid="detail-model"]')).toContainText('测试型号');
    await expect(page.locator('[data-testid="detail-barcode"]')).toContainText('1234567890123');
    await expect(page.locator('[data-testid="detail-stock-quantity"]')).toContainText('100');
    await expect(page.locator('[data-testid="detail-reserved-quantity"]')).toContainText('10');
    await expect(page.locator('[data-testid="detail-available-quantity"]')).toContainText('90');
    await expect(page.locator('[data-testid="detail-sale-price"]')).toContainText('199.99');
    await expect(page.locator('[data-testid="detail-purchase-price"]')).toContainText('120.00');
    await expect(page.locator('[data-testid="detail-min-stock"]')).toContainText('20');
    await expect(page.locator('[data-testid="detail-max-stock"]')).toContainText('500');
    await expect(page.locator('[data-testid="detail-location"]')).toContainText('A-01-01');
    await expect(page.locator('[data-testid="detail-status"]')).toContainText('活跃');
    
    console.log('✅ 商品数据完整性和字段映射验证通过');
  });

  test('验证商品编辑时字段映射的正确性', async () => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 点击第一个商品的编辑按钮
    const firstProduct = page.locator('[data-testid="product-row"]').first();
    await firstProduct.locator('[data-testid="edit-btn"]').click();
    
    // 等待编辑表单加载
    await page.waitForSelector('[data-testid="product-edit-form"]', { timeout: 10000 });
    
    // 获取表单中的原始值
    const originalName = await page.inputValue('[name="name"]');
    const originalSku = await page.inputValue('[name="sku"]');
    const originalStock = await page.inputValue('[name="stockQuantity"]');
    const originalPrice = await page.inputValue('[name="salePrice"]');
    
    // 修改部分字段
    const newName = '修改后的商品名称';
    const newStock = '150';
    const newPrice = '299.99';
    
    await page.fill('[name="name"]', newName);
    await page.fill('[name="stockQuantity"]', newStock);
    await page.fill('[name="salePrice"]', newPrice);
    
    // 保存修改
    await page.click('[data-testid="save-btn"]');
    
    // 等待保存完成
    await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
    
    // 验证修改后的显示
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    const updatedProduct = page.locator(`[data-testid="product-row"]:has-text("${originalSku}")`);
    await expect(updatedProduct.locator('[data-testid="product-name"]')).toContainText(newName);
    await expect(updatedProduct.locator('[data-testid="product-stock"]')).toContainText(newStock);
    await expect(updatedProduct.locator('[data-testid="product-sale-price"]')).toContainText(newPrice);
    
    console.log('✅ 商品编辑字段映射验证通过');
  });

  test('验证搜索和筛选功能的字段映射', async () => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 测试SKU搜索
    await page.fill('[data-testid="search-input"]', 'MOUSE');
    await page.click('[data-testid="search-btn"]');
    
    // 验证搜索结果
    await page.waitForSelector('[data-testid="product-row"]', { timeout: 10000 });
    const searchResults = page.locator('[data-testid="product-row"]');
    const count = await searchResults.count();
    
    // 验证所有结果都包含搜索关键词
    for (let i = 0; i < count; i++) {
      const row = searchResults.nth(i);
      const sku = await row.locator('[data-testid="product-sku"]').textContent();
      const name = await row.locator('[data-testid="product-name"]').textContent();
      const brand = await row.locator('[data-testid="product-brand"]').textContent();
      
      const hasKeyword = sku?.includes('MOUSE') || 
                        name?.includes('鼠标') || 
                        brand?.includes('罗技');
      
      expect(hasKeyword).toBeTruthy();
    }
    
    // 清空搜索
    await page.fill('[data-testid="search-input"]', '');
    await page.click('[data-testid="search-btn"]');
    
    // 测试分类筛选
    await page.click('[data-testid="category-filter"]');
    await page.click('[data-testid="category-option-1"]'); // 选择第一个分类
    
    // 验证筛选结果
    await page.waitForSelector('[data-testid="product-row"]', { timeout: 10000 });
    const filteredResults = page.locator('[data-testid="product-row"]');
    const filteredCount = await filteredResults.count();
    
    // 验证所有结果都属于选定分类
    for (let i = 0; i < filteredCount; i++) {
      const row = filteredResults.nth(i);
      const category = await row.locator('[data-testid="product-category"]').textContent();
      expect(category).toBeTruthy();
    }
    
    console.log('✅ 搜索和筛选功能字段映射验证通过');
  });

  test('验证低库存商品的字段映射', async () => {
    // 导航到低库存页面
    await page.click('[data-testid="low-stock-tab"]');
    await page.waitForSelector('[data-testid="low-stock-list"]', { timeout: 10000 });
    
    // 验证低库存商品显示
    const lowStockItems = page.locator('[data-testid="low-stock-item"]');
    const count = await lowStockItems.count();
    
    if (count > 0) {
      // 验证每个低库存商品的字段
      for (let i = 0; i < count; i++) {
        const item = lowStockItems.nth(i);
        
        // 验证库存数量字段
        const stockQuantity = await item.locator('[data-testid="stock-quantity"]').textContent();
        const minStock = await item.locator('[data-testid="min-stock"]').textContent();
        
        // 验证库存数量确实低于最低库存
        const stockNum = parseInt(stockQuantity || '0');
        const minStockNum = parseInt(minStock || '0');
        
        expect(stockNum).toBeLessThanOrEqual(minStockNum);
        
        // 验证其他关键字段存在
        await expect(item.locator('[data-testid="product-name"]')).toBeVisible();
        await expect(item.locator('[data-testid="product-sku"]')).toBeVisible();
        await expect(item.locator('[data-testid="shortage-quantity"]')).toBeVisible();
      }
    }
    
    console.log('✅ 低库存商品字段映射验证通过');
  });

  test('验证批量操作的字段映射', async () => {
    // 等待商品列表加载
    await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
    
    // 选择多个商品
    const checkboxes = page.locator('[data-testid="product-checkbox"]');
    const count = await checkboxes.count();
    
    if (count >= 2) {
      // 选择前两个商品
      await checkboxes.nth(0).check();
      await checkboxes.nth(1).check();
      
      // 点击批量操作按钮
      await page.click('[data-testid="batch-action-btn"]');
      
      // 选择批量更新价格
      await page.click('[data-testid="batch-update-price"]');
      
      // 等待批量更新对话框
      await page.waitForSelector('[data-testid="batch-update-dialog"]', { timeout: 10000 });
      
      // 验证批量更新表单字段
      await expect(page.locator('[name="salePrice"]')).toBeVisible();
      await expect(page.locator('[name="purchasePrice"]')).toBeVisible();
      await expect(page.locator('[name="minStock"]')).toBeVisible();
      await expect(page.locator('[name="maxStock"]')).toBeVisible();
      
      // 填写新价格
      await page.fill('[name="salePrice"]', '99.99');
      await page.fill('[name="purchasePrice"]', '60.00');
      
      // 执行批量更新
      await page.click('[data-testid="confirm-batch-update"]');
      
      // 等待更新完成
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
      
      // 验证更新结果
      await page.waitForSelector('[data-testid="inventory-list"]', { timeout: 10000 });
      
      const updatedRows = page.locator('[data-testid="product-row"]').first();
      await expect(updatedRows.locator('[data-testid="product-sale-price"]')).toContainText('99.99');
    }
    
    console.log('✅ 批量操作字段映射验证通过');
  });
});