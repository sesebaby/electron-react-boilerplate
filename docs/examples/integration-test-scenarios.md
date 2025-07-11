# 集成测试场景示例

## 1. 数据库集成测试

### 测试真实的 SQL 执行
```typescript
it('复杂查询应该返回正确结果', async () => {
  // 准备测试数据
  await db.exec(`
    INSERT INTO products (id, name, price) VALUES 
    ('1', '产品A', 100),
    ('2', '产品B', 200);
    
    INSERT INTO inventory_stocks VALUES 
    ('1', 'WH1', 50),
    ('2', 'WH1', 30);
  `);
  
  // 测试复杂的 JOIN 查询
  const result = await inventoryService.getProductsWithStock();
  
  expect(result).toEqual([
    { name: '产品A', price: 100, totalStock: 50 },
    { name: '产品B', price: 200, totalStock: 30 }
  ]);
});
```

### 测试数据库约束
```typescript
it('应该强制执行唯一性约束', async () => {
  await productService.create({ sku: 'ABC123' });
  
  // 尝试创建重复的 SKU
  await expect(
    productService.create({ sku: 'ABC123' })
  ).rejects.toThrow('UNIQUE constraint failed');
});
```

## 2. 文件系统集成测试

```typescript
it('导出报表应该创建正确的文件', async () => {
  const exportPath = './test-exports';
  
  // 准备数据
  await createTestData();
  
  // 执行导出
  await reportService.exportMonthlyReport(exportPath);
  
  // 验证文件
  expect(fs.existsSync(`${exportPath}/monthly-report.xlsx`)).toBe(true);
  expect(fs.existsSync(`${exportPath}/monthly-report.pdf`)).toBe(true);
  
  // 验证文件内容
  const excel = xlsx.readFile(`${exportPath}/monthly-report.xlsx`);
  expect(excel.Sheets['Summary']).toBeDefined();
});
```

## 3. 外部 API 集成测试

```typescript
it('支付网关集成', async () => {
  // 使用测试环境的真实 API
  const payment = await paymentService.processPayment({
    amount: 100,
    method: 'alipay',
    orderId: 'TEST-001'
  });
  
  expect(payment.status).toBe('success');
  expect(payment.transactionId).toBeDefined();
  
  // 验证回调
  const callback = await waitForCallback(payment.transactionId);
  expect(callback.status).toBe('completed');
});
```

## 4. 消息队列集成测试

```typescript
it('订单创建应该发送通知', async () => {
  const messages = [];
  
  // 监听消息队列
  messageQueue.on('order.created', (msg) => {
    messages.push(msg);
  });
  
  // 创建订单
  await orderService.create({
    customerId: 'CUST-001',
    items: [{ productId: 'PROD-001', quantity: 1 }]
  });
  
  // 等待异步消息
  await sleep(100);
  
  expect(messages).toHaveLength(1);
  expect(messages[0].type).toBe('order.created');
});
```

## 5. 缓存集成测试

```typescript
it('缓存应该正确工作', async () => {
  // 第一次查询 - 从数据库
  const start1 = Date.now();
  const result1 = await productService.getPopularProducts();
  const time1 = Date.now() - start1;
  
  // 第二次查询 - 从缓存
  const start2 = Date.now();
  const result2 = await productService.getPopularProducts();
  const time2 = Date.now() - start2;
  
  expect(result1).toEqual(result2);
  expect(time2).toBeLessThan(time1 / 10); // 缓存应该快 10 倍以上
  
  // 更新数据
  await productService.updateProduct('PROD-001', { price: 999 });
  
  // 验证缓存失效
  const result3 = await productService.getPopularProducts();
  expect(result3).not.toEqual(result1);
});
```

## 6. 权限系统集成测试

```typescript
it('权限检查应该正确工作', async () => {
  // 创建不同角色的用户
  const admin = await createUser({ role: 'admin' });
  const user = await createUser({ role: 'user' });
  
  // 管理员可以删除
  await orderService.delete('ORDER-001', { user: admin });
  
  // 普通用户不能删除
  await expect(
    orderService.delete('ORDER-002', { user })
  ).rejects.toThrow('Permission denied');
});
```

## 集成测试 vs 单元测试 vs E2E 测试

| 特性 | 单元测试 | 集成测试 | E2E 测试 |
|------|----------|----------|----------|
| 测试范围 | 单个函数/类 | 多个组件 | 完整应用 |
| 依赖处理 | Mock 所有 | 使用真实依赖 | 完全真实 |
| 运行速度 | 毫秒级 | 秒级 | 分钟级 |
| 环境要求 | 无 | 测试数据库等 | 完整环境 |
| 维护成本 | 低 | 中 | 高 |
| 发现问题 | 逻辑错误 | 集成错误 | 用户体验问题 |

## 什么时候写集成测试？

1. **关键业务流程** - 如订单创建、支付流程
2. **跨服务交互** - 如库存服务与订单服务的配合
3. **数据一致性** - 如事务处理、并发控制
4. **外部集成** - 如支付网关、短信服务
5. **性能关键路径** - 如批量导入、报表生成