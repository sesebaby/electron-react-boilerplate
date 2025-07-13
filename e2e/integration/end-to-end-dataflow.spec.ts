import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 端到端数据流集成测试
 * 验证前端UI操作 -> IPC通信 -> 后端处理 -> 数据库操作的完整流程
 */
test.describe('端到端数据流集成测试', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `integration_test_${Date.now()}`);
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

  test('完整的商品管理数据流', async () => {
    // 1. 前端创建商品 -> 后端处理 -> 数据库存储
    await TestHelpers.navigateToPage(page, 'products');
    await page.click('[data-testid="add-product-button"]');

    const productData = {
      name: '集成测试商品',
      sku: `INTEGRATION_SKU_${Date.now()}`,
      description: '这是一个集成测试商品',
      purchasePrice: '100.50',
      salePrice: '150.75',
      minStock: '10',
      maxStock: '100'
    };

    // 填写表单
    await TestHelpers.fillForm(page, {
      'product-name': productData.name,
      'product-sku': productData.sku,
      'product-description': productData.description,
      'purchase-price': productData.purchasePrice,
      'sale-price': productData.salePrice,
      'min-stock': productData.minStock,
      'max-stock': productData.maxStock
    });

    // 选择分类和单位
    await TestHelpers.selectOption(page, 'category', 'default-category');
    await TestHelpers.selectOption(page, 'unit', 'default-unit');

    // 提交表单
    await page.click('[data-testid="save-product-button"]');
    await TestHelpers.waitForSuccessMessage(page, '商品创建成功');

    // 2. 验证前端显示更新
    await expect(page.locator(`text=${productData.name}`)).toBeVisible();

    // 3. 验证数据库中的数据
    const dbProducts = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE sku = ?',
      [productData.sku]
    );

    expect(dbProducts.length).toBe(1);
    const dbProduct = dbProducts[0];
    expect(dbProduct.name).toBe(productData.name);
    expect(dbProduct.sku).toBe(productData.sku);
    expect(parseFloat(dbProduct.purchase_price)).toBe(parseFloat(productData.purchasePrice));
    expect(parseFloat(dbProduct.sale_price)).toBe(parseFloat(productData.salePrice));

    // 记录创建的数据用于清理
    isolationManager.recordCreatedData('products', dbProduct.id);

    // 4. 测试数据更新流程
    await page.click(`[data-testid="edit-product-${dbProduct.id}"]`);
    await expect(page.locator('[data-testid="product-form-modal"]')).toBeVisible();

    const updatedData = {
      name: '集成测试商品_已更新',
      purchasePrice: '120.00'
    };

    await page.fill('[data-testid="product-name-input"]', updatedData.name);
    await page.fill('[data-testid="purchase-price-input"]', updatedData.purchasePrice);
    await page.click('[data-testid="save-product-button"]');
    await TestHelpers.waitForSuccessMessage(page, '商品更新成功');

    // 5. 验证更新后的数据
    const updatedDbProducts = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [dbProduct.id]
    );

    expect(updatedDbProducts[0].name).toBe(updatedData.name);
    expect(parseFloat(updatedDbProducts[0].purchase_price)).toBe(parseFloat(updatedData.purchasePrice));

    console.log('✅ 完整的商品管理数据流测试通过');
  });

  test('库存操作的完整数据流', async () => {
    // 1. 先创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '库存流程测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 前端入库操作 -> 后端处理 -> 数据库更新
    await TestHelpers.navigateToPage(page, 'stock-in');
    await page.click('[data-testid="add-stock-in-button"]');

    const stockInData = {
      quantity: '50',
      unitPrice: '100.00',
      remark: '集成测试入库'
    };

    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.selectOption(page, 'supplier', 'default-supplier');
    await TestHelpers.selectOption(page, 'warehouse', 'default-warehouse');

    await TestHelpers.fillForm(page, {
      'quantity': stockInData.quantity,
      'unit-price': stockInData.unitPrice,
      'remark': stockInData.remark
    });

    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page, '入库成功');

    // 3. 验证库存记录
    const inventoryRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(inventoryRecords.length).toBe(1);
    expect(inventoryRecords[0].stock_quantity).toBe(parseInt(stockInData.quantity));

    // 4. 验证入库记录
    const stockInRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM stock_in_records WHERE product_id = ? AND remark = ?',
      [productData.id, stockInData.remark]
    );

    expect(stockInRecords.length).toBe(1);
    expect(stockInRecords[0].quantity).toBe(parseInt(stockInData.quantity));
    expect(parseFloat(stockInRecords[0].unit_price)).toBe(parseFloat(stockInData.unitPrice));

    // 5. 验证交易记录
    const transactionRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory_transactions WHERE product_id = ? AND transaction_type = ?',
      [productData.id, 'STOCK_IN']
    );

    expect(transactionRecords.length).toBe(1);
    expect(transactionRecords[0].quantity_change).toBe(parseInt(stockInData.quantity));

    // 6. 前端出库操作测试
    await TestHelpers.navigateToPage(page, 'stock-out');
    await page.click('[data-testid="add-stock-out-button"]');

    const stockOutData = {
      quantity: '20',
      unitPrice: '150.00',
      remark: '集成测试出库'
    };

    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.selectOption(page, 'customer', 'default-customer');
    await TestHelpers.selectOption(page, 'warehouse', 'default-warehouse');

    await TestHelpers.fillForm(page, {
      'quantity': stockOutData.quantity,
      'unit-price': stockOutData.unitPrice,
      'remark': stockOutData.remark
    });

    await page.click('[data-testid="submit-stock-out-button"]');
    await TestHelpers.waitForSuccessMessage(page, '出库成功');

    // 7. 验证库存更新
    const updatedInventory = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    const expectedStock = parseInt(stockInData.quantity) - parseInt(stockOutData.quantity);
    expect(updatedInventory[0].stock_quantity).toBe(expectedStock);

    console.log('✅ 库存操作的完整数据流测试通过');
  });

  test('用户权限和数据访问控制', async () => {
    // 1. 创建测试用户和数据
    const userData = await isolationManager.createIsolatedTestData(
      'users',
      () => TestDataFactory.createUser({
        username: 'test_user_integration',
        role: 'OPERATOR' // 操作员权限
      }),
      async (data) => {
        const result = await page.evaluate(async (userData) => {
          // @ts-ignore
          return await window.electronAPI?.dbCreateUser?.(userData);
        }, data);
        return result.data.id;
      }
    );

    // 2. 切换到测试用户
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="switch-user"]');
    
    await TestHelpers.fillForm(page, {
      'username': userData.data.username,
      'password': '123456'
    });
    
    await page.click('[data-testid="login-button"]');
    await TestHelpers.waitForSuccessMessage(page, '登录成功');

    // 3. 验证权限控制 - 操作员不能访问系统管理
    await TestHelpers.navigateToPage(page, 'system');
    
    // 应该显示权限不足的提示
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('权限不足');

    // 4. 验证可以访问允许的功能
    await TestHelpers.navigateToPage(page, 'products');
    await expect(page.locator('[data-testid="products-page"]')).toBeVisible();

    // 5. 验证数据访问控制
    const accessibleData = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbGetUserAccessibleData?.();
    });

    expect(accessibleData.success).toBe(true);
    expect(accessibleData.data.canAccessSystemSettings).toBe(false);
    expect(accessibleData.data.canAccessProducts).toBe(true);

    console.log('✅ 用户权限和数据访问控制测试通过');
  });

  test('错误处理和数据一致性', async () => {
    // 1. 创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '错误处理测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 设置初始库存
    await page.evaluate(async ({ productId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbStockInTransaction?.({
        productId,
        quantity: 10,
        unitPrice: 100,
        supplierId: 'default-supplier',
        warehouseId: 'default-warehouse'
      });
    }, { productId: productData.id });

    // 2. 测试库存不足的错误处理
    await TestHelpers.navigateToPage(page, 'stock-out');
    await page.click('[data-testid="add-stock-out-button"]');

    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'quantity': '20', // 超过库存数量
      'unit-price': '150'
    });

    await page.click('[data-testid="submit-stock-out-button"]');
    
    // 验证错误提示
    await TestHelpers.waitForErrorMessage(page, '库存不足');

    // 3. 验证数据库状态未被破坏
    const inventoryAfterError = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory WHERE product_id = ?',
      [productData.id]
    );

    expect(inventoryAfterError[0].stock_quantity).toBe(10); // 库存应该保持不变

    // 4. 测试网络错误的处理
    await page.evaluate(() => {
      // 模拟网络错误
      // @ts-ignore
      window.__simulateNetworkError = true;
    });

    await page.click('[data-testid="submit-stock-out-button"]');
    await TestHelpers.waitForErrorMessage(page, '网络错误');

    // 清除模拟错误
    await page.evaluate(() => {
      // @ts-ignore
      delete window.__simulateNetworkError;
    });

    // 5. 测试数据验证错误
    await TestHelpers.fillForm(page, {
      'quantity': 'abc', // 无效数量
      'unit-price': '150'
    });

    await page.click('[data-testid="submit-stock-out-button"]');
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

    console.log('✅ 错误处理和数据一致性测试通过');
  });

  test('实时数据同步和更新', async () => {
    // 1. 创建测试商品
    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({ name: '实时同步测试商品' }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 在一个页面进行库存操作
    await TestHelpers.navigateToPage(page, 'stock-in');
    await page.click('[data-testid="add-stock-in-button"]');

    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'quantity': '30',
      'unit-price': '100'
    });

    await page.click('[data-testid="submit-stock-in-button"]');
    await TestHelpers.waitForSuccessMessage(page, '入库成功');

    // 3. 切换到库存查看页面，验证数据实时更新
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="search-input"]', productData.data.name);
    await page.press('[data-testid="search-input"]', 'Enter');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证库存数量显示正确
    const stockQuantity = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(stockQuantity).toBe('30');

    // 4. 测试多窗口数据同步（模拟）
    const syncTestResult = await page.evaluate(async ({ productId }) => {
      // 模拟另一个窗口的操作
      // @ts-ignore
      const result = await window.electronAPI?.dbStockOutTransaction?.({
        productId,
        quantity: 10,
        unitPrice: 150,
        customerId: 'default-customer',
        warehouseId: 'default-warehouse'
      });

      // 触发数据同步事件
      // @ts-ignore
      window.electronAPI?.triggerDataSync?.('inventory', productId);
      
      return result;
    }, { productId: productData.id });

    expect(syncTestResult.success).toBe(true);

    // 等待数据同步
    await page.waitForTimeout(1000);

    // 刷新页面数据
    await page.click('[data-testid="refresh-button"]');
    await TestHelpers.waitForLoadingComplete(page);

    // 验证库存数量已更新
    const updatedStockQuantity = await page.locator('[data-testid="stock-quantity"]').first().textContent();
    expect(updatedStockQuantity).toBe('20'); // 30 - 10 = 20

    console.log('✅ 实时数据同步和更新测试通过');
  });

  test('复杂业务流程的端到端测试', async () => {
    // 1. 创建完整的业务数据链
    const supplierData = await isolationManager.createIsolatedTestData(
      'suppliers',
      () => TestDataFactory.createSupplier({ name: '集成测试供应商' }),
      async (data) => await DatabaseHelpers.createTestSupplier(page, data)
    );

    const categoryData = await isolationManager.createIsolatedTestData(
      'categories',
      () => TestDataFactory.createCategory({ name: '集成测试分类' }),
      async (data) => await DatabaseHelpers.createTestCategory(page, data)
    );

    const productData = await isolationManager.createIsolatedTestData(
      'products',
      () => TestDataFactory.createProduct({
        name: '复杂流程测试商品',
        supplierId: supplierData.id,
        categoryId: categoryData.id
      }),
      async (data) => await DatabaseHelpers.createTestProduct(page, data)
    );

    // 2. 执行完整的采购流程
    await TestHelpers.navigateToPage(page, 'purchase-orders');
    await page.click('[data-testid="create-purchase-order-button"]');

    // 填写采购订单
    await TestHelpers.selectOption(page, 'supplier', supplierData.id);
    await page.click('[data-testid="add-product-to-order"]');
    await TestHelpers.selectOption(page, 'product', productData.id);
    await TestHelpers.fillForm(page, {
      'order-quantity': '100',
      'unit-price': '95.00'
    });

    await page.click('[data-testid="save-purchase-order"]');
    await TestHelpers.waitForSuccessMessage(page, '采购订单创建成功');

    // 3. 验证采购订单数据
    const purchaseOrders = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM purchase_orders WHERE supplier_id = ?',
      [supplierData.id]
    );

    expect(purchaseOrders.length).toBe(1);
    const orderId = purchaseOrders[0].id;

    // 4. 执行入库流程（基于采购订单）
    await page.click(`[data-testid="receive-order-${orderId}"]`);
    await TestHelpers.fillForm(page, {
      'received-quantity': '100',
      'actual-price': '95.00'
    });

    await page.click('[data-testid="confirm-receive"]');
    await TestHelpers.waitForSuccessMessage(page, '入库完成');

    // 5. 验证完整的数据链
    // 验证库存更新
    const inventory = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM inventory WHERE product_id = ?',
      [productData.id]
    );
    expect(inventory[0].stock_quantity).toBe(100);

    // 验证采购订单状态
    const updatedOrder = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM purchase_orders WHERE id = ?',
      [orderId]
    );
    expect(updatedOrder[0].status).toBe('RECEIVED');

    // 验证财务记录
    const payableRecords = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM accounts_payable WHERE purchase_order_id = ?',
      [orderId]
    );
    expect(payableRecords.length).toBe(1);
    expect(parseFloat(payableRecords[0].amount)).toBe(9500.00); // 100 * 95

    console.log('✅ 复杂业务流程的端到端测试通过');
  });
});
