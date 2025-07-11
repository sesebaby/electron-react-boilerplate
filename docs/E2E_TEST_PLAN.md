# 进销存管理系统 E2E 测试计划

## 📋 概述

本文档详细描述了进销存管理系统的端到端（E2E）测试策略、测试用例和实施计划。测试目标是确保系统在生产环境中的可靠性和用户体验质量。

## 🎯 测试目标

### 主要目标
- **减少生产环境Bug**：通过全面的E2E测试覆盖，确保用户关键路径无误
- **提升用户体验**：验证完整的用户交互流程，确保界面响应和业务逻辑正确
- **保证数据一致性**：验证业务操作对数据库的影响，确保数据完整性
- **验证集成功能**：测试前端、后端、数据库的完整集成

### 验收标准
- 关键业务流程测试通过率 ≥ 98%
- 测试覆盖率达到核心功能的 100%
- 平均测试执行时间 ≤ 30分钟
- 测试稳定性 ≥ 95%（连续5次运行通过率）

## 🏗️ 测试架构

### 技术栈选择
- **测试框架**：Playwright（已选定）
- **应用类型**：Electron桌面应用
- **语言**：TypeScript
- **数据库**：SQLite（测试环境使用独立数据库）

### 测试环境
```
应用启动模式：测试模式（--test-mode）
数据库：独立测试数据库（test-db/inventory.db）
端口：不依赖网络端口（Electron应用）
并发：支持并行测试执行
```

## 📊 测试范围与优先级

### 🔴 P0级别（核心业务流程）
必须100%通过，发布阻塞级别

#### 1. 用户认证流程
- **测试用例**：`auth/login.spec.ts`
- **覆盖场景**：
  - 有效凭据登录
  - 无效凭据登录
  - 记住密码功能
  - 会话超时处理
  - 登出功能

#### 2. 商品生命周期管理
- **测试用例**：`inventory/product-lifecycle.spec.ts`
- **覆盖场景**：
  - 分类创建 → 单位创建 → 仓库创建 → 商品创建 → 库存初始化
  - 商品信息编辑
  - 商品状态变更
  - 商品删除（包含数据一致性验证）

#### 3. 库存核心操作
- **测试用例**：`inventory/stock-operations.spec.ts`
- **覆盖场景**：
  - 入库操作（采购入库、调拨入库）
  - 出库操作（销售出库、调拨出库）
  - 库存调整（盘点、损耗）
  - 库存不足告警

#### 4. 采购业务流程
- **测试用例**：`purchase/purchase-flow.spec.ts`
- **覆盖场景**：
  - 供应商管理 → 采购订单 → 收货入库 → 应付账款
  - 采购订单状态变更
  - 部分收货处理

#### 5. 销售业务流程
- **测试用例**：`sales/sales-flow.spec.ts`
- **覆盖场景**：
  - 客户管理 → 销售订单 → 销售出库 → 应收账款
  - 销售订单状态变更
  - 库存检查机制

### 🟡 P1级别（重要功能）
影响用户体验，但不阻塞发布

#### 6. 财务管理
- **测试用例**：`financial/financial-management.spec.ts`
- **覆盖场景**：
  - 应收账款管理
  - 应付账款管理
  - 收支记录
  - FIFO成本计算

#### 7. 报表分析
- **测试用例**：`reports/reports.spec.ts`
- **覆盖场景**：
  - 库存报表生成
  - 消耗统计分析
  - 销售报表
  - 数据导出功能

#### 8. 系统管理
- **测试用例**：`system/system-management.spec.ts`
- **覆盖场景**：
  - 用户管理
  - 权限管理
  - 系统设置
  - 数据备份

### 🟢 P2级别（辅助功能）
提升用户体验的功能

#### 9. 界面交互
- **测试用例**：`ui/interface-interactions.spec.ts`
- **覆盖场景**：
  - 搜索过滤功能
  - 分页导航
  - 排序功能
  - 响应式布局

#### 10. 错误处理
- **测试用例**：`error-handling/error-scenarios.spec.ts`
- **覆盖场景**：
  - 表单验证错误
  - 网络异常处理
  - 数据库连接错误
  - 用户操作错误提示

## 🧪 测试用例设计

### 测试用例模板
```typescript
// 测试用例标准结构
describe('功能模块名称', () => {
  test.beforeEach(async ({ page }) => {
    // 测试前置条件
    await TestHelpers.launchElectronApp();
    await TestHelpers.login(page);
  });

  test('具体测试场景', async ({ page }) => {
    // Given: 准备测试数据
    const testData = TestDataFactory.createProduct();
    
    // When: 执行业务操作
    await TestHelpers.navigateToPage(page, 'inventory');
    await page.fill('[data-testid="product-name"]', testData.name);
    await page.click('[data-testid="save-button"]');
    
    // Then: 验证预期结果
    await TestHelpers.waitForSuccessMessage(page, '商品创建成功');
    await expect(page.locator('[data-testid="product-list"]')).toContainText(testData.name);
  });

  test.afterEach(async ({ page }) => {
    // 测试后清理
    await TestDataManager.cleanupTestData(page);
  });
});
```

### 关键测试场景

#### 场景1：完整业务流程测试
```typescript
test('完整业务流程：从商品创建到销售完成', async ({ page }) => {
  // 1. 创建基础数据
  const category = await createCategory(page, TestDataFactory.createCategory());
  const unit = await createUnit(page, TestDataFactory.createUnit());
  const warehouse = await createWarehouse(page, TestDataFactory.createWarehouse());
  
  // 2. 创建商品
  const product = await createProduct(page, TestDataFactory.createProduct({
    categoryId: category.id,
    unitId: unit.id
  }));
  
  // 3. 初始化库存
  await stockIn(page, {
    productId: product.id,
    warehouseId: warehouse.id,
    quantity: 100,
    unitPrice: product.purchasePrice
  });
  
  // 4. 创建客户和销售订单
  const customer = await createCustomer(page, TestDataFactory.createCustomer());
  const salesOrder = await createSalesOrder(page, {
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 30, price: product.salePrice }]
  });
  
  // 5. 验证库存变化
  await verifyStock(page, product.id, warehouse.id, 70); // 100 - 30 = 70
  
  // 6. 验证应收账款
  await verifyReceivable(page, customer.id, 30 * product.salePrice);
});
```

#### 场景2：并发操作测试
```typescript
test('并发库存操作测试', async ({ page }) => {
  const product = await setupTestProduct(page);
  
  // 模拟多个用户同时操作库存
  const operations = [
    stockOut(page, { productId: product.id, quantity: 10 }),
    stockOut(page, { productId: product.id, quantity: 15 }),
    stockOut(page, { productId: product.id, quantity: 20 })
  ];
  
  const results = await Promise.allSettled(operations);
  
  // 验证并发安全性
  const successCount = results.filter(r => r.status === 'fulfilled').length;
  expect(successCount).toBeLessThanOrEqual(2); // 库存不足时应拒绝部分操作
});
```

#### 场景3：错误恢复测试
```typescript
test('数据库异常恢复测试', async ({ page }) => {
  // 模拟数据库连接异常
  await simulateDatabaseError(page);
  
  // 尝试执行业务操作
  const result = await attemptCreateProduct(page, TestDataFactory.createProduct());
  
  // 验证错误处理
  await expect(page.locator('[data-testid="error-message"]')).toContainText('数据库连接异常');
  
  // 恢复数据库连接
  await restoreDatabaseConnection(page);
  
  // 验证功能恢复
  const retryResult = await attemptCreateProduct(page, TestDataFactory.createProduct());
  expect(retryResult.success).toBe(true);
});
```

## 🗂️ 测试数据管理

### 数据隔离策略
- 每个测试用例使用独立的测试数据库
- 测试前自动重置数据库状态
- 测试后清理创建的测试数据

### 测试数据生成
```typescript
// 使用工厂模式生成测试数据
const testData = TestDataFactory.createFullTestDataSet();

// 支持数据变体生成
const products = TestDataFactory.createMultipleProducts(10, {
  category: 'electronics',
  priceRange: { min: 100, max: 1000 }
});
```

## 🔧 测试环境配置

### 环境变量
```bash
# .env.test
NODE_ENV=test
ELECTRON_PATH=/path/to/electron
TEST_DB_PATH=./test-db/inventory.db
CLEANUP_TEST_DATA=true
PARALLEL_WORKERS=2
```

### CI/CD集成
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

## 📈 测试执行计划

### 阶段性实施
1. **第一阶段（P0级别）**：实现核心业务流程测试
2. **第二阶段（P1级别）**：完善重要功能测试
3. **第三阶段（P2级别）**：添加辅助功能和性能测试

### 执行频率
- **每次提交**：运行P0级别测试（≤10分钟）
- **每日构建**：运行完整测试套件（≤30分钟）
- **发布前**：运行全量测试+手工验证

### 维护策略
- 每月评估测试用例有效性
- 定期更新测试数据和场景
- 持续优化测试执行性能

## 🚀 实施步骤

### Phase 1: 基础设施搭建 ✅
- [x] Playwright配置
- [x] 测试工具类开发
- [x] 测试数据工厂
- [x] 全局设置和清理

### Phase 2: 核心功能测试（P0）
- [ ] 用户认证流程测试
- [ ] 商品生命周期测试
- [ ] 库存操作测试
- [ ] 采购流程测试
- [ ] 销售流程测试

### Phase 3: 重要功能测试（P1）
- [ ] 财务管理测试
- [ ] 报表功能测试
- [ ] 系统管理测试

### Phase 4: 完善和优化（P2）
- [ ] 界面交互测试
- [ ] 错误处理测试
- [ ] 性能测试
- [ ] 可访问性测试

## 📊 成功指标

### 测试覆盖率指标
- **功能覆盖率**: 核心功能 100%，次要功能 80%
- **用户路径覆盖率**: 主要用户流程 100%
- **错误场景覆盖率**: 常见错误场景 90%

### 质量指标
- **Bug检出率**: E2E测试检出生产Bug ≥ 70%
- **回归防护**: 防止已修复Bug再次出现 ≥ 95%
- **性能基准**: 关键操作响应时间 ≤ 3秒

### 效率指标
- **测试执行时间**: 完整测试套件 ≤ 30分钟
- **测试维护成本**: 每月维护时间 ≤ 4小时
- **开发反馈速度**: 提交后测试结果反馈 ≤ 15分钟

---

*本测试计划将根据项目进展和实际需求进行持续更新和优化。*