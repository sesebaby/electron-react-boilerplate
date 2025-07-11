# 集成测试指南

## 什么是集成测试？

集成测试是介于单元测试和端到端测试之间的测试层级，主要测试多个组件协同工作的情况。

## 集成测试 vs 单元测试 vs E2E测试

| 特性 | 单元测试 | 集成测试 | E2E测试 |
|------|----------|----------|---------|
| **测试范围** | 单个函数/类 | 多个组件/模块 | 完整应用流程 |
| **依赖处理** | 全部Mock | 部分真实依赖 | 完全真实环境 |
| **运行速度** | 毫秒级 | 秒级 | 分钟级 |
| **维护成本** | 低 | 中 | 高 |
| **发现问题** | 逻辑错误 | 集成错误 | 用户体验问题 |

## 项目中的集成测试结构

```
tests/
├── integration/
│   ├── setup.ts                    # 全局测试设置
│   ├── services/                   # 服务层集成测试
│   │   └── FinancialService.integration.test.ts
│   └── database/                   # 数据库集成测试
│       └── inventory.integration.test.ts
└── unit/                          # 单元测试
```

## 运行集成测试

```bash
# 运行所有集成测试
npm run test:integration

# 运行特定的集成测试
npm run test:integration -- FinancialService

# 运行所有测试（单元测试 + 集成测试）
npm run test:all
```

## 集成测试最佳实践

### 1. 使用真实的测试数据库

```typescript
// 创建临时测试数据库
const testDbPath = path.join(__dirname, 'test.db');
const db = new Database(testDbPath);

// 测试后清理
afterEach(() => {
  db.close();
  fs.unlinkSync(testDbPath);
});
```

### 2. 测试真实的业务流程

```typescript
it('完整的采购入库流程', async () => {
  // 1. 创建采购订单
  const order = await orderService.createPurchaseOrder(...);
  
  // 2. 确认订单
  await orderService.confirmOrder(order.id);
  
  // 3. 收货入库
  await orderService.receiveGoods(...);
  
  // 4. 验证库存更新
  const stock = await inventoryService.getStock(...);
  expect(stock.quantity).toBe(expectedQuantity);
  
  // 5. 验证财务记录
  const payables = await financialService.getPayables(...);
  expect(payables.amount).toBe(expectedAmount);
});
```

### 3. 测试数据一致性

```typescript
it('事务回滚测试', async () => {
  const transaction = db.transaction(() => {
    // 执行多个数据库操作
    createOrder();
    updateStock();
    createFinancialRecord();
    
    // 模拟错误
    throw new Error('Transaction failed');
  });
  
  expect(() => transaction()).toThrow();
  
  // 验证数据没有被部分更新
  expect(getOrderCount()).toBe(0);
  expect(getStockLevel()).toBe(initialStock);
});
```

### 4. 测试并发和竞态条件

```typescript
it('并发库存更新', async () => {
  // 创建多个并发操作
  const operations = Array(10).fill(null).map(() => 
    inventoryService.updateStock(productId, -10)
  );
  
  await Promise.all(operations);
  
  // 验证最终状态正确
  const finalStock = await inventoryService.getStock(productId);
  expect(finalStock).toBe(initialStock - 100);
});
```

## 常见的集成测试场景

### 1. 数据库操作
- SQL查询正确性
- 事务处理
- 数据约束验证
- 索引性能

### 2. 服务间交互
- API调用
- 数据同步
- 错误传播
- 超时处理

### 3. 文件系统操作
- 文件读写
- 目录操作
- 权限检查
- 并发访问

### 4. 外部服务集成
- 支付网关
- 邮件服务
- 短信服务
- 第三方API

## 集成测试的价值

1. **发现接口不匹配**：单元测试中的Mock可能与实际接口不符
2. **验证数据流**：确保数据在组件间正确传递和转换
3. **测试真实场景**：更接近实际使用情况
4. **性能问题**：发现查询效率、事务死锁等问题
5. **配置问题**：验证环境配置的正确性

## 调试集成测试

1. **查看测试日志**
```bash
# 启用详细日志
DEBUG=* npm run test:integration
```

2. **使用测试数据库工具**
```bash
# 查看测试数据库内容
sqlite3 test.db "SELECT * FROM inventory_items;"
```

3. **断点调试**
```typescript
// 在测试中添加断点
debugger;
// 或使用 VS Code 的调试功能
```

## 持续集成(CI)中的集成测试

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run test:integration
```

## 总结

集成测试是确保应用质量的重要环节。它填补了单元测试和E2E测试之间的空白，帮助我们：

- ✅ 发现组件间的集成问题
- ✅ 验证真实的业务流程
- ✅ 测试数据一致性和事务
- ✅ 提高代码的可靠性

记住：**好的测试策略应该包含所有三个层级的测试**，形成完整的测试金字塔。