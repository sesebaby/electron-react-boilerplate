import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 数据库CRUD操作测试套件
 * 覆盖创建、读取、更新、删除等基本数据库操作
 */
test.describe('数据库CRUD操作', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `crud_test_${Date.now()}`);
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

  test('商品CRUD操作完整流程', async () => {
    // 1. CREATE - 创建商品
    const productData = TestDataFactory.createProduct({
      name: 'CRUD测试商品',
      sku: `CRUD_SKU_${Date.now()}`,
      purchasePrice: 100,
      salePrice: 150
    });

    const productId = await DatabaseHelpers.createTestProduct(page, productData);
    expect(productId).toBeTruthy();
    isolationManager.recordCreatedData('products', productId);

    // 2. READ - 读取商品
    const createdProduct = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    expect(createdProduct.length).toBe(1);
    expect(createdProduct[0].name).toBe(productData.name);
    expect(createdProduct[0].sku).toBe(productData.sku);
    expect(parseFloat(createdProduct[0].purchase_price)).toBe(productData.purchasePrice);

    // 3. UPDATE - 更新商品
    const updatedData = {
      name: 'CRUD测试商品_已更新',
      purchasePrice: 120,
      salePrice: 180
    };

    const updateResult = await page.evaluate(async ({ id, data }) => {
      // @ts-ignore
      return await window.electronAPI?.dbUpdateItem?.(id, data);
    }, { id: productId, data: updatedData });

    expect(updateResult.success).toBe(true);

    // 验证更新结果
    const updatedProduct = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    expect(updatedProduct[0].name).toBe(updatedData.name);
    expect(parseFloat(updatedProduct[0].purchase_price)).toBe(updatedData.purchasePrice);

    // 4. DELETE - 删除商品
    await DatabaseHelpers.deleteTestData(page, 'products', productId);

    // 验证删除结果
    const deletedProduct = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    expect(deletedProduct.length).toBe(0);

    console.log('✅ 商品CRUD操作完整流程测试通过');
  });

  test('分类CRUD操作和层级关系', async () => {
    // 1. 创建父分类
    const parentCategoryData = TestDataFactory.createCategory({
      name: '父分类_CRUD',
      level: 1,
      parentId: null
    });

    const parentId = await DatabaseHelpers.createTestCategory(page, parentCategoryData);
    isolationManager.recordCreatedData('categories', parentId);

    // 2. 创建子分类
    const childCategoryData = TestDataFactory.createCategory({
      name: '子分类_CRUD',
      level: 2,
      parentId: parentId
    });

    const childId = await DatabaseHelpers.createTestCategory(page, childCategoryData);
    isolationManager.recordCreatedData('categories', childId);

    // 3. 验证层级关系
    const hierarchyQuery = await DatabaseHelpers.executeRawQuery(
      page,
      `SELECT c1.name as parent_name, c2.name as child_name 
       FROM categories c1 
       LEFT JOIN categories c2 ON c1.id = c2.parent_id 
       WHERE c1.id = ?`,
      [parentId]
    );

    expect(hierarchyQuery.length).toBe(1);
    expect(hierarchyQuery[0].parent_name).toBe(parentCategoryData.name);
    expect(hierarchyQuery[0].child_name).toBe(childCategoryData.name);

    // 4. 更新分类排序
    const updateResult = await page.evaluate(async ({ id, sortOrder }) => {
      // @ts-ignore
      return await window.electronAPI?.dbUpdateCategory?.(id, { sortOrder });
    }, { id: childId, sortOrder: 10 });

    expect(updateResult.success).toBe(true);

    // 5. 验证级联删除保护
    const deleteParentResult = await page.evaluate(async (id) => {
      // @ts-ignore
      return await window.electronAPI?.dbDeleteCategory?.(id);
    }, parentId);

    // 应该失败，因为有子分类
    expect(deleteParentResult.success).toBe(false);
    expect(deleteParentResult.error).toContain('子分类');

    console.log('✅ 分类CRUD操作和层级关系测试通过');
  });

  test('供应商CRUD操作和关联验证', async () => {
    // 1. 创建供应商
    const supplierData = TestDataFactory.createSupplier({
      name: 'CRUD测试供应商',
      code: `SUP_CRUD_${Date.now()}`,
      contact: '张三',
      phone: '13800138000'
    });

    const supplierId = await DatabaseHelpers.createTestSupplier(page, supplierData);
    isolationManager.recordCreatedData('suppliers', supplierId);

    // 2. 创建关联商品
    const productData = TestDataFactory.createProduct({
      name: '供应商关联商品',
      supplierId: supplierId
    });

    const productId = await DatabaseHelpers.createTestProduct(page, productData);
    isolationManager.recordCreatedData('products', productId);

    // 3. 验证关联关系
    const relationQuery = await DatabaseHelpers.executeRawQuery(
      page,
      `SELECT p.name as product_name, s.name as supplier_name 
       FROM products p 
       JOIN suppliers s ON p.supplier_id = s.id 
       WHERE s.id = ?`,
      [supplierId]
    );

    expect(relationQuery.length).toBe(1);
    expect(relationQuery[0].supplier_name).toBe(supplierData.name);

    // 4. 测试供应商信息更新
    const updatedSupplierData = {
      contact: '李四',
      phone: '13900139000',
      email: 'lisi@test.com'
    };

    const updateResult = await page.evaluate(async ({ id, data }) => {
      // @ts-ignore
      return await window.electronAPI?.dbUpdateSupplier?.(id, data);
    }, { id: supplierId, data: updatedSupplierData });

    expect(updateResult.success).toBe(true);

    // 验证更新
    const updatedSupplier = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM suppliers WHERE id = ?',
      [supplierId]
    );

    expect(updatedSupplier[0].contact).toBe(updatedSupplierData.contact);
    expect(updatedSupplier[0].email).toBe(updatedSupplierData.email);

    console.log('✅ 供应商CRUD操作和关联验证测试通过');
  });

  test('仓库CRUD操作和默认仓库管理', async () => {
    // 1. 创建第一个仓库（设为默认）
    const warehouse1Data = TestDataFactory.createWarehouse({
      name: '主仓库_CRUD',
      code: 'WH_MAIN_CRUD',
      isDefault: true
    });

    const warehouse1Id = await DatabaseHelpers.createTestWarehouse(page, warehouse1Data);
    isolationManager.recordCreatedData('warehouses', warehouse1Id);

    // 2. 创建第二个仓库
    const warehouse2Data = TestDataFactory.createWarehouse({
      name: '分仓库_CRUD',
      code: 'WH_SUB_CRUD',
      isDefault: false
    });

    const warehouse2Id = await DatabaseHelpers.createTestWarehouse(page, warehouse2Data);
    isolationManager.recordCreatedData('warehouses', warehouse2Id);

    // 3. 验证默认仓库唯一性
    const defaultWarehouses = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM warehouses WHERE is_default = 1'
    );

    expect(defaultWarehouses.length).toBe(1);
    expect(defaultWarehouses[0].id).toBe(warehouse1Id);

    // 4. 更改默认仓库
    const changeDefaultResult = await page.evaluate(async ({ oldId, newId }) => {
      // @ts-ignore
      return await window.electronAPI?.dbChangeDefaultWarehouse?.(oldId, newId);
    }, { oldId: warehouse1Id, newId: warehouse2Id });

    expect(changeDefaultResult.success).toBe(true);

    // 验证默认仓库已更改
    const newDefaultWarehouses = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM warehouses WHERE is_default = 1'
    );

    expect(newDefaultWarehouses.length).toBe(1);
    expect(newDefaultWarehouses[0].id).toBe(warehouse2Id);

    // 5. 测试仓库状态管理
    const deactivateResult = await page.evaluate(async (id) => {
      // @ts-ignore
      return await window.electronAPI?.dbUpdateWarehouse?.(id, { isActive: false });
    }, warehouse1Id);

    expect(deactivateResult.success).toBe(true);

    const inactiveWarehouse = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM warehouses WHERE id = ?',
      [warehouse1Id]
    );

    expect(inactiveWarehouse[0].is_active).toBe(0);

    console.log('✅ 仓库CRUD操作和默认仓库管理测试通过');
  });

  test('批量CRUD操作性能测试', async () => {
    const startTime = Date.now();
    const batchSize = 100;
    const createdIds: string[] = [];

    // 1. 批量创建
    const createPromises = [];
    for (let i = 1; i <= batchSize; i++) {
      const productData = TestDataFactory.createProduct({
        name: `批量测试商品_${i}`,
        sku: `BATCH_SKU_${i.toString().padStart(3, '0')}`
      });

      createPromises.push(
        DatabaseHelpers.createTestProduct(page, productData)
          .then(id => {
            createdIds.push(id);
            isolationManager.recordCreatedData('products', id);
            return id;
          })
      );
    }

    await Promise.all(createPromises);
    const createTime = Date.now() - startTime;

    expect(createdIds.length).toBe(batchSize);
    console.log(`批量创建${batchSize}条记录耗时: ${createTime}ms`);

    // 2. 批量读取
    const readStartTime = Date.now();
    const readResults = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE sku LIKE ?',
      ['BATCH_SKU_%']
    );
    const readTime = Date.now() - readStartTime;

    expect(readResults.length).toBe(batchSize);
    console.log(`批量读取${batchSize}条记录耗时: ${readTime}ms`);

    // 3. 批量更新
    const updateStartTime = Date.now();
    const updatePromises = createdIds.map(id => 
      page.evaluate(async ({ id, data }) => {
        // @ts-ignore
        return await window.electronAPI?.dbUpdateItem?.(id, data);
      }, { 
        id, 
        data: { description: '批量更新描述' } 
      })
    );

    await Promise.all(updatePromises);
    const updateTime = Date.now() - updateStartTime;

    console.log(`批量更新${batchSize}条记录耗时: ${updateTime}ms`);

    // 4. 验证性能指标
    expect(createTime).toBeLessThan(10000); // 创建应在10秒内完成
    expect(readTime).toBeLessThan(1000);    // 读取应在1秒内完成
    expect(updateTime).toBeLessThan(15000); // 更新应在15秒内完成

    console.log('✅ 批量CRUD操作性能测试通过');
  });

  test('数据完整性约束验证', async () => {
    // 1. 测试唯一约束
    const productData1 = TestDataFactory.createProduct({
      sku: 'UNIQUE_SKU_TEST'
    });

    const productId1 = await DatabaseHelpers.createTestProduct(page, productData1);
    isolationManager.recordCreatedData('products', productId1);

    // 尝试创建重复SKU的商品
    const productData2 = TestDataFactory.createProduct({
      sku: 'UNIQUE_SKU_TEST' // 相同的SKU
    });

    const duplicateResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateItem?.(data);
    }, productData2);

    expect(duplicateResult.success).toBe(false);
    expect(duplicateResult.error).toContain('SKU');

    // 2. 测试外键约束
    const invalidProductData = TestDataFactory.createProduct({
      categoryId: 'non-existent-category-id'
    });

    const foreignKeyResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateItem?.(data);
    }, invalidProductData);

    expect(foreignKeyResult.success).toBe(false);
    expect(foreignKeyResult.error).toContain('分类');

    // 3. 测试非空约束
    const invalidProductData2 = {
      sku: 'VALID_SKU',
      // 缺少必需的name字段
      purchasePrice: 100
    };

    const nullConstraintResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateItem?.(data);
    }, invalidProductData2);

    expect(nullConstraintResult.success).toBe(false);
    expect(nullConstraintResult.error).toContain('名称');

    console.log('✅ 数据完整性约束验证测试通过');
  });

  test('软删除和数据恢复', async () => {
    // 1. 创建测试商品
    const productData = TestDataFactory.createProduct({
      name: '软删除测试商品'
    });

    const productId = await DatabaseHelpers.createTestProduct(page, productData);
    isolationManager.recordCreatedData('products', productId);

    // 2. 执行软删除
    const softDeleteResult = await page.evaluate(async (id) => {
      // @ts-ignore
      return await window.electronAPI?.dbSoftDeleteItem?.(id);
    }, productId);

    expect(softDeleteResult.success).toBe(true);

    // 3. 验证软删除状态
    const deletedProduct = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    expect(deletedProduct[0].deleted_at).toBeTruthy();
    expect(deletedProduct[0].is_active).toBe(0);

    // 4. 验证软删除的商品不在正常查询中显示
    const activeProducts = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE is_active = 1 AND id = ?',
      [productId]
    );

    expect(activeProducts.length).toBe(0);

    // 5. 恢复软删除的商品
    const restoreResult = await page.evaluate(async (id) => {
      // @ts-ignore
      return await window.electronAPI?.dbRestoreItem?.(id);
    }, productId);

    expect(restoreResult.success).toBe(true);

    // 6. 验证恢复结果
    const restoredProduct = await DatabaseHelpers.executeRawQuery(
      page,
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    expect(restoredProduct[0].deleted_at).toBeNull();
    expect(restoredProduct[0].is_active).toBe(1);

    console.log('✅ 软删除和数据恢复测试通过');
  });
});
