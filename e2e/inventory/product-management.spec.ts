import { test, expect } from '@playwright/test';
import { TestHelpers, TestDataManager } from '../utils/test-helpers';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 商品管理E2E测试
 * 覆盖商品的增删改查和生命周期管理
 */
test.describe('商品管理功能', () => {
  let electronApp: any;
  let page: any;

  test.beforeEach(async () => {
    // 启动应用并登录
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
    // 清理测试数据
    await TestDataManager.cleanupTestData(page);
    
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('应该显示商品管理页面', async () => {
    // 验证页面标题和基本元素
    await expect(page.locator('text=商品管理')).toBeVisible();
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 验证搜索和筛选区域
    await expect(page.locator('text=搜索和筛选')).toBeVisible();
    await expect(page.locator('placeholder=搜索商品名称、SKU或品牌...')).toBeVisible();
    
    // 验证商品列表
    await expect(page.locator('text=商品列表')).toBeVisible();
    
    console.log('✅ 商品管理页面显示测试通过');
  });

  test('应该能够创建新商品', async () => {
    const productData = TestDataFactory.createProduct();
    
    // 点击新增商品按钮
    await page.click('text=新增商品');
    
    // 等待表单弹出
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 填写商品基本信息
    await TestHelpers.fillForm(page, {
      'name': productData.name,
      'sku': productData.sku,
      'description': productData.description || '',
      'brand': productData.brand || '',
      'model': productData.model || '',
      'barcode': productData.barcode || ''
    });
    
    // 填写价格信息
    await page.fill('[name="purchasePrice"]', productData.purchasePrice.toString());
    await page.fill('[name="salePrice"]', productData.salePrice.toString());
    
    // 填写库存信息
    await page.fill('[name="minStock"]', productData.minStock.toString());
    await page.fill('[name="maxStock"]', productData.maxStock.toString());
    
    // 选择分类和单位（假设已有默认选项）
    if (productData.categoryId) {
      await TestHelpers.selectOption(page, 'categoryId', productData.categoryId);
    }
    if (productData.unitId) {
      await TestHelpers.selectOption(page, 'unitId', productData.unitId);
    }
    
    // 提交表单
    await page.click('text=创建商品');
    
    // 等待成功提示
    await TestHelpers.waitForSuccessMessage(page, '创建成功');
    
    // 验证商品出现在列表中
    await expect(page.locator(`text=${productData.name}`)).toBeVisible();
    await expect(page.locator(`text=${productData.sku}`)).toBeVisible();
    
    // 记录创建的数据用于清理
    TestDataManager.recordCreatedData(productData.sku);
    
    console.log('✅ 创建新商品测试通过');
  });

  test('应该验证必填字段', async () => {
    // 点击新增商品按钮
    await page.click('text=新增商品');
    
    // 等待表单弹出
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 不填写任何信息直接提交
    await page.click('text=创建商品');
    
    // 应该显示验证错误
    await expect(page.locator('text=商品名称不能为空')).toBeVisible();
    await expect(page.locator('text=SKU编码不能为空')).toBeVisible();
    await expect(page.locator('text=请选择商品分类')).toBeVisible();
    await expect(page.locator('text=请选择计量单位')).toBeVisible();
    
    console.log('✅ 必填字段验证测试通过');
  });

  test('应该验证价格逻辑', async () => {
    const productData = TestDataFactory.createProduct({
      purchasePrice: 200,
      salePrice: 150 // 销售价低于采购价
    });
    
    // 打开新增表单
    await page.click('text=新增商品');
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 填写基本信息
    await page.fill('[name="name"]', productData.name);
    await page.fill('[name="sku"]', productData.sku);
    
    // 填写无效的价格（销售价低于采购价）
    await page.fill('[name="purchasePrice"]', productData.purchasePrice.toString());
    await page.fill('[name="salePrice"]', productData.salePrice.toString());
    
    // 尝试提交
    await page.click('text=创建商品');
    
    // 应该显示价格验证错误
    await expect(page.locator('text=销售价不能低于采购价')).toBeVisible();
    
    console.log('✅ 价格逻辑验证测试通过');
  });

  test('应该验证库存范围逻辑', async () => {
    const productData = TestDataFactory.createProduct({
      minStock: 100,
      maxStock: 50 // 最大库存小于最小库存
    });
    
    // 打开新增表单
    await page.click('text=新增商品');
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 填写基本信息
    await page.fill('[name="name"]', productData.name);
    await page.fill('[name="sku"]', productData.sku);
    await page.fill('[name="purchasePrice"]', productData.purchasePrice.toString());
    await page.fill('[name="salePrice"]', productData.salePrice.toString());
    
    // 填写无效的库存范围
    await page.fill('[name="minStock"]', productData.minStock.toString());
    await page.fill('[name="maxStock"]', productData.maxStock.toString());
    
    // 尝试提交
    await page.click('text=创建商品');
    
    // 应该显示库存验证错误
    await expect(page.locator('text=最大库存不能低于最小库存')).toBeVisible();
    
    console.log('✅ 库存范围验证测试通过');
  });

  test('应该支持SKU自动生成', async () => {
    // 打开新增表单
    await page.click('text=新增商品');
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    // 点击SKU自动生成按钮
    const generateButton = page.locator('[title="自动生成SKU"]');
    await expect(generateButton).toBeVisible();
    await generateButton.click();
    
    // 验证SKU字段被填充
    const skuInput = page.locator('[name="sku"]');
    const skuValue = await skuInput.inputValue();
    
    expect(skuValue).toBeTruthy();
    expect(skuValue).toMatch(/^SKU\d+/); // 应该以SKU开头
    
    console.log('✅ SKU自动生成测试通过');
  });

  test('应该能够编辑现有商品', async () => {
    // 先创建一个商品
    const originalProduct = TestDataFactory.createProduct();
    await createTestProduct(page, originalProduct);
    
    // 找到并点击编辑按钮
    const productRow = page.locator(`text=${originalProduct.name}`).locator('..').locator('..');
    await productRow.locator('text=编辑').click();
    
    // 等待编辑表单出现
    await expect(page.locator('text=编辑商品')).toBeVisible();
    
    // 验证表单已填充现有数据
    await expect(page.locator(`[name="name"][value="${originalProduct.name}"]`)).toBeVisible();
    await expect(page.locator(`[name="sku"][value="${originalProduct.sku}"]`)).toBeVisible();
    
    // 修改商品名称
    const newName = `${originalProduct.name}_已编辑`;
    await page.fill('[name="name"]', newName);
    
    // 提交更改
    await page.click('text=更新商品');
    
    // 等待成功提示
    await TestHelpers.waitForSuccessMessage(page, '更新成功');
    
    // 验证更改已保存
    await expect(page.locator(`text=${newName}`)).toBeVisible();
    await expect(page.locator(`text=${originalProduct.name}`)).not.toBeVisible();
    
    console.log('✅ 编辑商品测试通过');
  });

  test('应该能够删除商品', async () => {
    // 先创建一个商品
    const productData = TestDataFactory.createProduct();
    await createTestProduct(page, productData);
    
    // 找到并点击删除按钮
    const productRow = page.locator(`text=${productData.name}`).locator('..').locator('..');
    await productRow.locator('text=删除').click();
    
    // 等待确认对话框
    await expect(page.locator('text=删除商品')).toBeVisible();
    await expect(page.locator('text=确定要删除这个商品吗？')).toBeVisible();
    
    // 确认删除
    await page.click('text=删除');
    
    // 等待成功提示
    await TestHelpers.waitForSuccessMessage(page, '删除成功');
    
    // 验证商品已从列表中移除
    await expect(page.locator(`text=${productData.name}`)).not.toBeVisible();
    
    console.log('✅ 删除商品测试通过');
  });

  test('应该支持搜索功能', async () => {
    // 创建几个测试商品
    const products = [
      TestDataFactory.createProduct({ name: '苹果手机', brand: 'Apple' }),
      TestDataFactory.createProduct({ name: '华为手机', brand: 'Huawei' }),
      TestDataFactory.createProduct({ name: '笔记本电脑', brand: 'Dell' })
    ];
    
    for (const product of products) {
      await createTestProduct(page, product);
    }
    
    // 搜索"苹果"
    const searchInput = page.locator('placeholder=搜索商品名称、SKU或品牌...');
    await searchInput.fill('苹果');
    
    // 等待搜索结果
    await page.waitForTimeout(500); // 等待搜索防抖
    
    // 验证搜索结果
    await expect(page.locator('text=苹果手机')).toBeVisible();
    await expect(page.locator('text=华为手机')).not.toBeVisible();
    await expect(page.locator('text=笔记本电脑')).not.toBeVisible();
    
    // 清空搜索
    await searchInput.clear();
    await page.waitForTimeout(500);
    
    // 验证所有商品重新显示
    await expect(page.locator('text=苹果手机')).toBeVisible();
    await expect(page.locator('text=华为手机')).toBeVisible();
    await expect(page.locator('text=笔记本电脑')).toBeVisible();
    
    console.log('✅ 搜索功能测试通过');
  });

  test('应该支持状态筛选', async () => {
    // 创建不同状态的商品
    const activeProduct = TestDataFactory.createProduct({ 
      name: '活跃商品',
      status: 'ACTIVE' 
    });
    const inactiveProduct = TestDataFactory.createProduct({ 
      name: '停用商品',
      status: 'INACTIVE' 
    });
    
    await createTestProduct(page, activeProduct);
    await createTestProduct(page, inactiveProduct);
    
    // 筛选停用商品
    await TestHelpers.selectOption(page, 'status', 'INACTIVE');
    
    // 等待筛选结果
    await page.waitForTimeout(500);
    
    // 验证筛选结果
    await expect(page.locator('text=停用商品')).toBeVisible();
    await expect(page.locator('text=活跃商品')).not.toBeVisible();
    
    // 重置筛选
    await TestHelpers.selectOption(page, 'status', '');
    await page.waitForTimeout(500);
    
    // 验证所有商品重新显示
    await expect(page.locator('text=停用商品')).toBeVisible();
    await expect(page.locator('text=活跃商品')).toBeVisible();
    
    console.log('✅ 状态筛选测试通过');
  });

  test('应该防止重复SKU', async () => {
    const sku = 'DUPLICATE_SKU_TEST';
    
    // 创建第一个商品
    const product1 = TestDataFactory.createProduct({ sku });
    await createTestProduct(page, product1);
    
    // 尝试创建具有相同SKU的第二个商品
    await page.click('text=新增商品');
    await expect(page.locator('text=新增商品')).toBeVisible();
    
    const product2 = TestDataFactory.createProduct({ sku });
    await TestHelpers.fillForm(page, {
      'name': product2.name,
      'sku': product2.sku
    });
    
    await page.fill('[name="purchasePrice"]', product2.purchasePrice.toString());
    await page.fill('[name="salePrice"]', product2.salePrice.toString());
    
    // 尝试提交
    await page.click('text=创建商品');
    
    // 应该显示SKU重复错误
    await TestHelpers.waitForErrorMessage(page, 'SKU');
    
    console.log('✅ 重复SKU防护测试通过');
  });
});

/**
 * 辅助函数：创建测试商品
 */
async function createTestProduct(page: any, productData: any) {
  await page.click('text=新增商品');
  await expect(page.locator('text=新增商品')).toBeVisible();
  
  // 填写必要字段
  await page.fill('[name="name"]', productData.name);
  await page.fill('[name="sku"]', productData.sku);
  await page.fill('[name="purchasePrice"]', productData.purchasePrice.toString());
  await page.fill('[name="salePrice"]', productData.salePrice.toString());
  
  if (productData.description) {
    await page.fill('[name="description"]', productData.description);
  }
  if (productData.brand) {
    await page.fill('[name="brand"]', productData.brand);
  }
  
  // 提交表单
  await page.click('text=创建商品');
  
  // 等待成功
  await TestHelpers.waitForSuccessMessage(page);
  
  // 记录用于清理
  TestDataManager.recordCreatedData(productData.sku);
}