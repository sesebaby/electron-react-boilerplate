import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';

/**
 * 表单验证UI测试套件
 * 覆盖各种表单验证场景、错误提示、用户体验等
 */
test.describe('表单验证UI测试', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `form_validation_test_${Date.now()}`);
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

  test('商品表单必填字段验证', async () => {
    // 1. 导航到商品管理页面
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');
    await expect(page.locator('[data-testid="product-form-modal"]')).toBeVisible();

    // 2. 测试空表单提交
    await page.click('[data-testid="save-product-button"]');

    // 验证必填字段错误提示
    await expect(page.locator('[data-testid="error-product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-product-name"]')).toContainText('商品名称不能为空');
    
    await expect(page.locator('[data-testid="error-product-sku"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-product-sku"]')).toContainText('SKU不能为空');

    // 3. 逐个填写字段，验证错误消失
    await page.fill('[data-testid="product-name-input"]', '测试商品');
    await page.blur('[data-testid="product-name-input"]');
    await expect(page.locator('[data-testid="error-product-name"]')).not.toBeVisible();

    await page.fill('[data-testid="product-sku-input"]', 'TEST_SKU_001');
    await page.blur('[data-testid="product-sku-input"]');
    await expect(page.locator('[data-testid="error-product-sku"]')).not.toBeVisible();

    // 4. 验证保存按钮状态变化
    await expect(page.locator('[data-testid="save-product-button"]')).not.toBeDisabled();

    console.log('✅ 商品表单必填字段验证测试通过');
  });

  test('数字字段格式验证', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 测试价格字段的数字验证
    await page.fill('[data-testid="purchase-price-input"]', 'abc');
    await page.blur('[data-testid="purchase-price-input"]');
    
    await expect(page.locator('[data-testid="error-purchase-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-purchase-price"]')).toContainText('请输入有效的数字');

    // 2. 测试负数验证
    await page.fill('[data-testid="purchase-price-input"]', '-10');
    await page.blur('[data-testid="purchase-price-input"]');
    
    await expect(page.locator('[data-testid="error-purchase-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-purchase-price"]')).toContainText('价格不能为负数');

    // 3. 测试小数位数限制
    await page.fill('[data-testid="purchase-price-input"]', '100.999');
    await page.blur('[data-testid="purchase-price-input"]');
    
    await expect(page.locator('[data-testid="error-purchase-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-purchase-price"]')).toContainText('最多保留2位小数');

    // 4. 测试有效数字
    await page.fill('[data-testid="purchase-price-input"]', '100.50');
    await page.blur('[data-testid="purchase-price-input"]');
    
    await expect(page.locator('[data-testid="error-purchase-price"]')).not.toBeVisible();

    // 5. 测试库存数量的整数验证
    await page.fill('[data-testid="min-stock-input"]', '10.5');
    await page.blur('[data-testid="min-stock-input"]');
    
    await expect(page.locator('[data-testid="error-min-stock"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-min-stock"]')).toContainText('库存数量必须为整数');

    console.log('✅ 数字字段格式验证测试通过');
  });

  test('SKU唯一性验证', async () => {
    // 1. 先创建一个商品
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');
    
    await TestHelpers.fillForm(page, {
      'product-name': '第一个商品',
      'product-sku': 'UNIQUE_SKU_TEST',
      'purchase-price': '100',
      'sale-price': '150'
    });
    
    await page.click('[data-testid="save-product-button"]');
    await TestHelpers.waitForSuccessMessage(page, '商品创建成功');

    // 2. 尝试创建具有相同SKU的商品
    await page.click('[data-testid="add-product-button"]');
    
    await TestHelpers.fillForm(page, {
      'product-name': '第二个商品',
      'product-sku': 'UNIQUE_SKU_TEST', // 相同的SKU
      'purchase-price': '120',
      'sale-price': '180'
    });

    // 3. 验证SKU唯一性检查
    await page.blur('[data-testid="product-sku-input"]');
    
    // 等待异步验证完成
    await page.waitForTimeout(1000);
    
    await expect(page.locator('[data-testid="error-product-sku"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-product-sku"]')).toContainText('SKU已存在');

    // 4. 验证保存按钮被禁用
    await expect(page.locator('[data-testid="save-product-button"]')).toBeDisabled();

    // 5. 修改为唯一的SKU
    await page.fill('[data-testid="product-sku-input"]', 'UNIQUE_SKU_TEST_2');
    await page.blur('[data-testid="product-sku-input"]');
    
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="error-product-sku"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="save-product-button"]')).not.toBeDisabled();

    console.log('✅ SKU唯一性验证测试通过');
  });

  test('价格逻辑验证', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 测试销售价低于采购价的警告
    await TestHelpers.fillForm(page, {
      'product-name': '价格测试商品',
      'product-sku': 'PRICE_TEST_SKU',
      'purchase-price': '150',
      'sale-price': '100' // 销售价低于采购价
    });

    await page.blur('[data-testid="sale-price-input"]');
    
    await expect(page.locator('[data-testid="warning-sale-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="warning-sale-price"]')).toContainText('销售价低于采购价');

    // 2. 验证警告不阻止保存（只是警告）
    await expect(page.locator('[data-testid="save-product-button"]')).not.toBeDisabled();

    // 3. 测试合理的价格设置
    await page.fill('[data-testid="sale-price-input"]', '200');
    await page.blur('[data-testid="sale-price-input"]');
    
    await expect(page.locator('[data-testid="warning-sale-price"]')).not.toBeVisible();

    // 4. 测试库存阈值逻辑
    await TestHelpers.fillForm(page, {
      'min-stock': '50',
      'max-stock': '30' // 最大库存小于最小库存
    });

    await page.blur('[data-testid="max-stock-input"]');
    
    await expect(page.locator('[data-testid="error-max-stock"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-max-stock"]')).toContainText('最大库存不能小于最小库存');

    console.log('✅ 价格逻辑验证测试通过');
  });

  test('实时表单验证和用户体验', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 测试输入时的实时验证
    await page.fill('[data-testid="product-name-input"]', 'a'); // 太短
    
    // 验证实时错误提示
    await expect(page.locator('[data-testid="error-product-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-product-name"]')).toContainText('商品名称至少需要2个字符');

    // 2. 测试输入改进时错误消失
    await page.fill('[data-testid="product-name-input"]', '有效的商品名称');
    await expect(page.locator('[data-testid="error-product-name"]')).not.toBeVisible();

    // 3. 测试字段高亮显示
    await page.fill('[data-testid="product-sku-input"]', '');
    await page.blur('[data-testid="product-sku-input"]');
    
    // 验证错误字段有特殊样式
    await expect(page.locator('[data-testid="product-sku-input"]')).toHaveClass(/error/);

    // 4. 测试成功状态指示
    await page.fill('[data-testid="product-sku-input"]', 'VALID_SKU');
    await page.blur('[data-testid="product-sku-input"]');
    
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="product-sku-input"]')).toHaveClass(/success/);

    // 5. 测试表单整体状态
    await TestHelpers.fillForm(page, {
      'purchase-price': '100',
      'sale-price': '150'
    });

    // 验证表单完整性指示器
    await expect(page.locator('[data-testid="form-progress"]')).toContainText('100%');
    await expect(page.locator('[data-testid="form-status"]')).toContainText('表单填写完整');

    console.log('✅ 实时表单验证和用户体验测试通过');
  });

  test('表单重置和取消操作', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 填写部分表单数据
    await TestHelpers.fillForm(page, {
      'product-name': '测试商品',
      'product-sku': 'TEST_SKU',
      'purchase-price': '100'
    });

    // 2. 测试重置按钮
    await page.click('[data-testid="reset-form-button"]');
    
    // 验证表单被清空
    await expect(page.locator('[data-testid="product-name-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="product-sku-input"]')).toHaveValue('');
    await expect(page.locator('[data-testid="purchase-price-input"]')).toHaveValue('');

    // 验证错误状态被清除
    await expect(page.locator('[data-testid="error-product-name"]')).not.toBeVisible();

    // 3. 重新填写数据
    await TestHelpers.fillForm(page, {
      'product-name': '另一个测试商品',
      'product-sku': 'ANOTHER_SKU'
    });

    // 4. 测试取消操作
    await page.click('[data-testid="cancel-button"]');
    
    // 验证确认对话框
    await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toBeVisible();
    await expect(page.locator('[data-testid="unsaved-changes-dialog"]')).toContainText('未保存的更改将丢失');

    // 5. 确认取消
    await page.click('[data-testid="confirm-cancel-button"]');
    
    // 验证模态框关闭
    await expect(page.locator('[data-testid="product-form-modal"]')).not.toBeVisible();

    console.log('✅ 表单重置和取消操作测试通过');
  });

  test('复杂表单联动验证', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 测试分类选择联动
    await page.selectOption('[data-testid="category-select"]', 'electronics');
    
    // 验证子分类选项更新
    await expect(page.locator('[data-testid="subcategory-select"]')).toBeEnabled();
    
    const subcategoryOptions = await page.locator('[data-testid="subcategory-select"] option').count();
    expect(subcategoryOptions).toBeGreaterThan(1); // 应该有子分类选项

    // 2. 测试单位选择联动
    await page.selectOption('[data-testid="unit-select"]', 'weight-unit');
    
    // 验证重量相关字段显示
    await expect(page.locator('[data-testid="weight-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="weight-unit-label"]')).toBeVisible();

    // 3. 测试供应商选择联动
    await page.selectOption('[data-testid="supplier-select"]', 'supplier-1');
    
    // 验证供应商相关信息自动填充
    const supplierContact = await page.locator('[data-testid="supplier-contact"]').textContent();
    expect(supplierContact).toBeTruthy();

    // 4. 测试条件字段显示/隐藏
    await page.check('[data-testid="enable-batch-tracking"]');
    
    // 验证批次相关字段显示
    await expect(page.locator('[data-testid="batch-fields"]')).toBeVisible();
    await expect(page.locator('[data-testid="batch-number-input"]')).toBeVisible();

    await page.uncheck('[data-testid="enable-batch-tracking"]');
    
    // 验证批次字段隐藏
    await expect(page.locator('[data-testid="batch-fields"]')).not.toBeVisible();

    console.log('✅ 复杂表单联动验证测试通过');
  });

  test('表单性能和响应性', async () => {
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    // 1. 测试大量数据输入的性能
    const longText = 'A'.repeat(1000); // 1000个字符
    
    const startTime = Date.now();
    await page.fill('[data-testid="product-description-input"]', longText);
    const inputTime = Date.now() - startTime;
    
    expect(inputTime).toBeLessThan(1000); // 输入应在1秒内完成

    // 2. 测试快速连续输入
    const rapidInputs = ['a', 'ab', 'abc', 'abcd', 'abcde'];
    
    for (const input of rapidInputs) {
      await page.fill('[data-testid="product-name-input"]', input);
      await page.waitForTimeout(50); // 50ms间隔
    }
    
    // 验证最终值正确
    await expect(page.locator('[data-testid="product-name-input"]')).toHaveValue('abcde');

    // 3. 测试表单验证的防抖效果
    await page.fill('[data-testid="product-sku-input"]', 'INVALID');
    
    // 立即再次输入，验证不会触发多次验证
    await page.fill('[data-testid="product-sku-input"]', 'VALID_SKU');
    
    // 等待防抖时间
    await page.waitForTimeout(1000);
    
    // 验证只有最后的验证结果
    await expect(page.locator('[data-testid="sku-validation-indicator"]')).toContainText('验证通过');

    console.log('✅ 表单性能和响应性测试通过');
  });
});
