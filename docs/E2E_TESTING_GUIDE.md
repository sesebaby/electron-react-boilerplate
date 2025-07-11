# 进销存管理系统 E2E 测试框架完整指南

## 📋 概述

本文档提供了为进销存管理系统构建的全面端到端测试框架的完整使用指南。该框架专为 Electron 桌面应用设计，覆盖了从用户界面到数据库的完整测试场景。

## 🏗️ 架构概览

### 技术栈
- **测试框架**: Playwright (专为 Electron 优化)
- **断言库**: Playwright 内置 expect
- **数据管理**: 自定义数据隔离和清理系统
- **报告**: HTML、JSON、Markdown 多格式报告
- **CI/CD**: GitHub Actions 自动化流程

### 目录结构
```
e2e/
├── auth/                    # 用户认证测试
├── inventory/               # 库存管理测试
├── system/                  # 系统功能测试
├── database/                # 数据库操作测试
├── ui/                      # UI交互测试
├── integration/             # 跨模块集成测试
├── performance/             # 性能测试
├── utils/                   # 测试工具类
├── fixtures/                # 测试数据工厂
├── mocks/                   # Mock服务
└── reporters/               # 自定义报告器
```

## 🚀 快速开始

### 1. 环境准备
```bash
# 安装依赖
npm install

# 安装 Playwright 浏览器
npx playwright install --with-deps

# 构建应用
npm run build
```

### 2. 运行测试
```bash
# 运行所有 E2E 测试
npm run test:e2e

# 运行特定模块测试
npm run test:e2e:auth          # 认证测试
npm run test:e2e:inventory     # 库存测试
npm run test:e2e:system        # 系统测试
npm run test:e2e:database      # 数据库测试
npm run test:e2e:ui            # UI测试
npm run test:e2e:integration   # 集成测试

# 运行性能测试
npm run test:performance

# 带界面运行测试
npm run test:e2e:ui

# 调试模式
npm run test:e2e:debug
```

### 3. 查看报告
```bash
# 查看 Playwright 报告
npm run test:report

# 生成自定义报告
node scripts/generate-test-report.js
```

## 📊 测试覆盖范围

### 1. 用户认证测试 (`e2e/auth/`)
- ✅ 用户登录/登出流程
- ✅ 会话管理和超时
- ✅ 权限验证
- ✅ 密码错误处理
- ✅ 记住登录状态

### 2. 库存管理测试 (`e2e/inventory/`)
- ✅ 商品CRUD操作
- ✅ 库存入库/出库流程
- ✅ 库存调整操作
- ✅ 库存不足警告
- ✅ 数据一致性验证

### 3. 系统功能测试 (`e2e/system/`)
- ✅ 系统初始化流程
- ✅ 数据库清理和重建
- ✅ 内置数据导入
- ✅ 数据导入导出功能
- ✅ 错误处理机制

### 4. 数据库操作测试 (`e2e/database/`)
- ✅ CRUD操作完整性
- ✅ 事务处理和回滚
- ✅ 并发操作控制
- ✅ 数据完整性约束
- ✅ 软删除和恢复

### 5. UI交互测试 (`e2e/ui/`)
- ✅ 表单验证和错误提示
- ✅ 分页和搜索功能
- ✅ 排序和筛选
- ✅ 响应式布局
- ✅ 用户体验优化

### 6. 集成测试 (`e2e/integration/`)
- ✅ 端到端数据流验证
- ✅ 模块间通信测试
- ✅ IPC通信验证
- ✅ 事件系统测试
- ✅ 缓存和同步机制

### 7. 性能测试 (`e2e/performance/`)
- ✅ 应用启动性能
- ✅ 大数据量处理
- ✅ 搜索和查询性能
- ✅ 内存使用监控
- ✅ 并发操作性能

## 🛠️ 核心工具类

### 1. TestHelpers (`e2e/utils/test-helpers.ts`)
```typescript
// 应用启动
await TestHelpers.launchElectronApp();

// 用户登录
await TestHelpers.login(page);

// 页面导航
await TestHelpers.navigateToPage(page, 'products');

// 表单填写
await TestHelpers.fillForm(page, {
  'product-name': '测试商品',
  'product-sku': 'TEST_SKU'
});

// 等待加载完成
await TestHelpers.waitForLoadingComplete(page);
```

### 2. DatabaseHelpers (`e2e/utils/database-helpers.ts`)
```typescript
// 数据库初始化
await DatabaseHelpers.initializeTestDatabase(page);

// 执行SQL查询
const results = await DatabaseHelpers.executeRawQuery(
  page, 
  'SELECT * FROM products WHERE sku = ?', 
  ['TEST_SKU']
);

// 创建测试数据
const productId = await DatabaseHelpers.createTestProduct(page, productData);
```

### 3. DataIsolationManager (`e2e/utils/data-isolation-manager.ts`)
```typescript
// 开始数据隔离会话
const isolationManager = new DataIsolationManager(page, 'test_session_id');
await isolationManager.startIsolationSession();

// 创建隔离的测试数据
const productData = await isolationManager.createIsolatedTestData(
  'products',
  () => TestDataFactory.createProduct({ name: '测试商品' }),
  async (data) => await DatabaseHelpers.createTestProduct(page, data)
);

// 结束会话并清理数据
await isolationManager.endIsolationSession();
```

### 4. MockServiceManager (`e2e/mocks/mock-service-manager.ts`)
```typescript
const mockManager = new MockServiceManager(page);

// 模拟数据库服务错误
await mockManager.mockDatabaseService({
  method: 'dbGetProduct',
  error: '数据库连接失败'
});

// 模拟慢速操作
await mockManager.mockSlowOperations(['dbQuery'], 2000);

// 清除所有Mock
await mockManager.clearAllMocks();
```

## 📈 测试报告和监控

### 1. 自动化报告生成
```bash
# 生成完整测试报告
node scripts/generate-test-report.js
```

生成的报告包括：
- **HTML报告**: 可视化测试结果和统计
- **JSON报告**: 机器可读的详细数据
- **Markdown报告**: 适合文档和通知的格式

### 2. 测试监控
```bash
# 运行测试监控
node scripts/test-monitor.js
```

监控功能：
- 📊 测试结果分析
- 📈 历史趋势对比
- 🔔 自动通知（Webhook/邮件）
- ⚠️ 阈值告警

### 3. CI/CD 集成

GitHub Actions 工作流 (`.github/workflows/e2e-tests.yml`) 提供：
- 🔄 多平台测试 (Windows/macOS/Linux)
- 🔄 多Node版本测试
- 📊 自动报告上传
- 🔔 测试结果通知
- 🏗️ 自动构建和打包

## 🎯 最佳实践

### 1. 测试编写规范
```typescript
test.describe('功能模块名称', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;

  test.beforeEach(async () => {
    // 启动应用和初始化
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    // 数据隔离
    isolationManager = new DataIsolationManager(page, `test_${Date.now()}`);
    await isolationManager.startIsolationSession();
  });

  test.afterEach(async () => {
    // 清理资源
    if (isolationManager) {
      await isolationManager.endIsolationSession();
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('具体测试用例', async () => {
    // 测试实现
  });
});
```

### 2. 数据管理策略
- ✅ 使用数据隔离确保测试独立性
- ✅ 每个测试创建自己的测试数据
- ✅ 测试结束后自动清理数据
- ✅ 使用工厂模式生成测试数据

### 3. 错误处理
- ✅ 为每个关键操作添加超时设置
- ✅ 使用适当的等待策略
- ✅ 提供详细的错误信息
- ✅ 在失败时保存截图和日志

### 4. 性能优化
- ✅ 合理设置并发数量
- ✅ 使用数据隔离避免冲突
- ✅ 优化测试数据大小
- ✅ 监控测试执行时间

## 🔧 配置和定制

### 1. Playwright 配置 (`playwright.config.ts`)
- 针对 Electron 应用优化
- 支持多项目配置
- 自定义报告器
- 性能测试项目

### 2. 测试监控配置 (`test-monitor.config.json`)
```json
{
  "notifications": {
    "enabled": true,
    "webhook": "https://your-webhook-url",
    "email": {
      "enabled": false,
      "recipients": []
    }
  },
  "thresholds": {
    "passRate": 95,
    "duration": 300000,
    "coverage": 80
  }
}
```

## 🚨 故障排除

### 常见问题和解决方案

1. **应用启动失败**
   ```bash
   # 检查依赖
   npm run rebuild
   
   # 清理缓存
   rm -rf node_modules/.cache
   ```

2. **数据库连接问题**
   ```bash
   # 重置测试数据库
   npm run reset-db
   ```

3. **测试超时**
   - 增加 `playwright.config.ts` 中的超时设置
   - 检查系统资源使用情况

4. **数据隔离失败**
   - 确保每个测试使用唯一的测试ID
   - 检查数据清理逻辑

## 📚 扩展和维护

### 添加新测试
1. 在相应目录创建 `.spec.ts` 文件
2. 使用标准的测试模板
3. 添加到 CI/CD 流程
4. 更新文档

### 维护测试数据
1. 定期清理历史测试数据
2. 更新测试数据工厂
3. 验证数据隔离效果

### 性能监控
1. 定期运行性能测试
2. 监控测试执行趋势
3. 优化慢速测试用例

---

## 📞 支持和反馈

如有问题或建议，请：
1. 查看测试日志和报告
2. 检查相关文档
3. 提交 Issue 或 PR

**测试框架版本**: 1.0.0  
**最后更新**: 2025-01-11  
**维护者**: E2E测试团队
