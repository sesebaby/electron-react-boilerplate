# E2E 测试使用指南

## 📋 概述

本目录包含进销存管理系统的端到端（E2E）测试，使用 Playwright 测试框架对 Electron 应用进行完整的用户流程测试。

## 🚀 快速开始

### 安装依赖
```bash
# 安装项目依赖
npm install

# 安装 Playwright 浏览器
npx playwright install
```

### 运行测试

```bash
# 运行所有 E2E 测试
npm run test:e2e

# 使用 UI 模式运行测试（推荐）
npm run test:e2e:ui

# 运行特定模块的测试
npm run test:e2e:auth        # 认证功能测试
npm run test:e2e:inventory   # 库存管理测试

# 调试模式运行测试
npm run test:e2e:debug

# 有头模式运行测试（显示浏览器窗口）
npm run test:e2e:headed
```

## 📁 目录结构

```
e2e/
├── auth/                   # 用户认证测试
│   └── login.spec.ts      # 登录功能测试
├── inventory/             # 库存管理测试
│   └── product-management.spec.ts  # 商品管理测试
├── purchase/              # 采购管理测试
├── sales/                 # 销售管理测试
├── financial/             # 财务管理测试
├── reports/               # 报表功能测试
├── system/                # 系统管理测试
├── fixtures/              # 测试数据和配置
│   └── test-data.ts       # 测试数据工厂
├── utils/                 # 测试工具类
│   └── test-helpers.ts    # 测试辅助函数
├── global-setup.ts        # 全局测试设置
├── global-teardown.ts     # 全局测试清理
└── README.md              # 本文档
```

## 🧪 测试分类

### P0 级别 - 核心功能（必须100%通过）
- ✅ 用户认证流程
- ✅ 商品生命周期管理
- 🔄 库存核心操作
- 🔄 采购业务流程
- 🔄 销售业务流程

### P1 级别 - 重要功能
- ⏳ 财务管理
- ⏳ 报表分析
- ⏳ 系统管理

### P2 级别 - 辅助功能
- ⏳ 界面交互
- ⏳ 错误处理
- ⏳ 性能测试

**图例**：✅ 已完成 | 🔄 进行中 | ⏳ 待开发

## 🔧 配置说明

### 测试配置文件
- `playwright.config.ts` - Playwright 主要配置
- `global-setup.ts` - 测试前的全局设置
- `global-teardown.ts` - 测试后的全局清理

### 环境变量
```bash
# 可选环境变量
ELECTRON_PATH=/path/to/electron       # 自定义 Electron 路径
CLEANUP_TEST_DATA=true               # 测试后清理数据（默认开启）
PARALLEL_WORKERS=2                   # 并行测试进程数
```

## 📊 测试报告

测试完成后，会在以下位置生成报告：
- `test-results/` - 测试结果文件
- `test-results/html-report/` - HTML 测试报告
- `test-results/screenshots/` - 失败截图
- `test-results/videos/` - 测试录像

## 🐛 调试指南

### 调试单个测试
```bash
# 使用调试模式
npx playwright test auth/login.spec.ts --debug

# 查看测试执行过程
npx playwright test auth/login.spec.ts --headed

# 生成测试代码
npx playwright codegen
```

### 常见问题

#### 1. Electron 应用启动失败
**问题**：测试报错 "Electron application failed to launch"
**解决**：
- 确保已运行 `npm run build` 构建应用
- 检查 `public/main.js` 文件是否存在
- 验证 Electron 依赖是否正确安装

#### 2. 测试超时
**问题**：测试在等待元素时超时
**解决**：
- 检查 data-testid 属性是否正确添加
- 增加等待超时时间
- 确保应用完全加载后再执行测试

#### 3. 数据库相关错误
**问题**：测试中出现数据库操作错误
**解决**：
- 确保测试数据库路径正确
- 检查数据库权限
- 清理旧的测试数据

## 📝 编写测试指南

### 基本测试结构
```typescript
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { TestDataFactory } from '../fixtures/test-data';

test.describe('功能模块名称', () => {
  let electronApp: any;
  let page: any;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
  });

  test.afterEach(async () => {
    await TestDataManager.cleanupTestData(page);
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('具体测试场景', async () => {
    // Given: 准备测试数据
    const testData = TestDataFactory.createProduct();
    
    // When: 执行操作
    await TestHelpers.navigateToPage(page, 'inventory');
    // ... 执行具体操作
    
    // Then: 验证结果
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
  });
});
```

### 最佳实践

1. **使用 data-testid 属性**
   ```typescript
   // 好的做法
   await page.click('[data-testid="save-button"]');
   
   // 避免使用文本选择器（可能因为国际化而改变）
   await page.click('text=保存');
   ```

2. **测试隔离**
   - 每个测试用例都应该独立运行
   - 使用 `beforeEach` 和 `afterEach` 确保测试环境clean
   - 清理测试创建的数据

3. **等待策略**
   ```typescript
   // 等待元素出现
   await expect(page.locator('[data-testid="element"]')).toBeVisible();
   
   // 等待网络请求完成
   await page.waitForLoadState('networkidle');
   
   // 等待自定义条件
   await page.waitForFunction(() => window.appReady === true);
   ```

4. **错误处理**
   ```typescript
   // 验证错误状态
   await TestHelpers.waitForErrorMessage(page, '期望的错误信息');
   
   // 调试截图
   await TestHelpers.takeDebugScreenshot(page, 'error-state');
   ```

## 🔄 持续集成

### GitHub Actions 配置示例
```yaml
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
        run: npx playwright install --with-deps
      - name: Build application
        run: npm run build
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

## 📞 支持

如果遇到问题或需要帮助：
1. 查看测试日志和错误信息
2. 参考 [Playwright 官方文档](https://playwright.dev/)
3. 检查项目的 GitHub Issues
4. 联系开发团队

---

**注意**：E2E 测试比单元测试运行时间更长，建议在开发过程中先运行相关的单个测试文件，完整测试套件在 CI/CD 环境中运行。