# 数据流程验证检查点和测试标准

## 概述

本文档定义了进销存系统数据流程测试中每个关键节点的验证标准、检查点和测试方法，确保数据一致性和业务逻辑正确性。

## 验证检查点分类

### 1. 数据完整性检查点
- **目的**: 确保数据的完整性和准确性
- **检查时机**: 每次数据操作后
- **检查方法**: 数据库约束验证、业务规则验证

### 2. 业务逻辑检查点
- **目的**: 验证业务流程的正确执行
- **检查时机**: 业务操作的关键节点
- **检查方法**: 状态验证、计算结果验证

### 3. 数据一致性检查点
- **目的**: 确保相关数据之间的一致性
- **检查时机**: 业务流程完成后
- **检查方法**: 跨表数据对比、汇总数据验证

## 详细验证标准

### 检查点1: 采购订单创建验证

#### 前置条件验证
```javascript
// 供应商存在性验证
assert(supplier.exists, "供应商不存在")
assert(supplier.status === 'active', "供应商状态不活跃")

// 商品存在性验证
for (item of orderItems) {
    assert(product.exists, "商品不存在")
    assert(product.status === 'active', "商品状态不活跃")
}
```

#### 数据完整性验证
```javascript
// 必填字段验证
assert(order.orderNo !== null && order.orderNo !== '', "订单号不能为空")
assert(order.supplierId !== null, "供应商ID不能为空")
assert(order.orderDate !== null, "订单日期不能为空")

// 数据格式验证
assert(order.orderNo.match(/^PO\d{8}$/), "订单号格式错误")
assert(order.orderDate <= new Date(), "订单日期不能是未来日期")
```

#### 金额计算验证
```javascript
// 订单项目金额验证
for (item of orderItems) {
    const expectedAmount = item.quantity * item.unitPrice * (1 - item.discountRate)
    assert(Math.abs(item.amount - expectedAmount) < 0.01, "订单项目金额计算错误")
}

// 订单总金额验证
const expectedTotal = orderItems.reduce((sum, item) => sum + item.amount, 0)
const expectedFinal = expectedTotal - order.discountAmount + order.taxAmount
assert(Math.abs(order.totalAmount - expectedTotal) < 0.01, "订单总金额计算错误")
assert(Math.abs(order.finalAmount - expectedFinal) < 0.01, "订单最终金额计算错误")
```

### 检查点2: 采购收货验证

#### 收货数量验证
```javascript
// 收货数量不能超过订单数量
for (receiptItem of receiptItems) {
    const orderItem = getOrderItem(receiptItem.orderItemId)
    const totalReceived = orderItem.receivedQuantity + receiptItem.quantity
    assert(totalReceived <= orderItem.quantity, "收货数量超过订单数量")
}

// 收货数量必须大于0
assert(receiptItem.quantity > 0, "收货数量必须大于0")
```

#### 订单状态更新验证
```javascript
// 验证订单状态更新逻辑
const totalOrdered = orderItems.reduce((sum, item) => sum + item.quantity, 0)
const totalReceived = orderItems.reduce((sum, item) => sum + item.receivedQuantity, 0)

if (totalReceived === 0) {
    assert(order.status === 'confirmed', "订单状态应为confirmed")
} else if (totalReceived < totalOrdered) {
    assert(order.status === 'partial', "订单状态应为partial")
} else if (totalReceived === totalOrdered) {
    assert(order.status === 'completed', "订单状态应为completed")
}
```

### 检查点3: 库存入库验证

#### 库存数量计算验证
```javascript
// 记录操作前的库存状态
const stockBefore = getCurrentStock(productId, warehouseId)

// 执行入库操作
await inventoryService.stockIn({
    productId, warehouseId, quantity, unitPrice, operator
})

// 验证操作后的库存状态
const stockAfter = getCurrentStock(productId, warehouseId)

// 库存数量验证
assert(stockAfter.currentStock === stockBefore.currentStock + quantity, 
       "当前库存数量计算错误")
assert(stockAfter.availableStock === stockAfter.currentStock - stockAfter.reservedStock,
       "可用库存计算错误")
```

#### 平均成本计算验证
```javascript
// 加权平均成本计算验证
const expectedAvgCost = stockBefore.currentStock === 0 
    ? unitPrice
    : (stockBefore.currentStock * stockBefore.avgCost + quantity * unitPrice) 
      / (stockBefore.currentStock + quantity)

assert(Math.abs(stockAfter.avgCost - expectedAvgCost) < 0.01, 
       "平均成本计算错误")
```

#### 库存流水记录验证
```javascript
// 验证库存流水记录
const transaction = getLatestTransaction(productId, warehouseId)
assert(transaction.transactionType === 'in', "流水类型错误")
assert(transaction.quantity === quantity, "流水数量错误")
assert(transaction.unitPrice === unitPrice, "流水单价错误")
assert(transaction.referenceType === 'purchase_receipt', "流水参考类型错误")
```

### 检查点4: 销售订单创建验证

#### 库存可用性验证
```javascript
// 检查每个订单项目的库存可用性
for (orderItem of orderItems) {
    const stock = getCurrentStock(orderItem.productId, defaultWarehouseId)
    assert(stock.availableStock >= orderItem.quantity, 
           `商品 ${orderItem.productId} 库存不足`)
}
```

#### 库存预留验证
```javascript
// 记录预留前的库存状态
const stockBefore = getCurrentStock(productId, warehouseId)

// 执行库存预留
await inventoryService.reserveStock(productId, warehouseId, quantity)

// 验证预留后的库存状态
const stockAfter = getCurrentStock(productId, warehouseId)

assert(stockAfter.reservedStock === stockBefore.reservedStock + quantity,
       "预留库存数量错误")
assert(stockAfter.availableStock === stockBefore.availableStock - quantity,
       "可用库存数量错误")
assert(stockAfter.currentStock === stockBefore.currentStock,
       "当前库存不应变化")
```

### 检查点5: 销售出库验证

#### 出库数量验证
```javascript
// 出库数量不能超过预留数量
const stock = getCurrentStock(productId, warehouseId)
assert(quantity <= stock.reservedStock, "出库数量超过预留数量")

// 出库数量不能超过当前库存
assert(quantity <= stock.currentStock, "出库数量超过当前库存")
```

#### 库存扣减验证
```javascript
// 记录出库前的库存状态
const stockBefore = getCurrentStock(productId, warehouseId)

// 执行出库操作
await inventoryService.stockOut({
    productId, warehouseId, quantity, unitPrice, operator
})

// 验证出库后的库存状态
const stockAfter = getCurrentStock(productId, warehouseId)

assert(stockAfter.currentStock === stockBefore.currentStock - quantity,
       "当前库存扣减错误")
assert(stockAfter.reservedStock === stockBefore.reservedStock - quantity,
       "预留库存释放错误")
assert(stockAfter.availableStock === stockAfter.currentStock - stockAfter.reservedStock,
       "可用库存计算错误")
```

### 检查点6: 财务集成验证

#### 应付账款生成验证
```javascript
// 验证应付账款自动生成
const order = getPurchaseOrder(orderId)
if (order.status === 'completed') {
    const payable = getAccountsPayableByOrderId(orderId)
    assert(payable !== null, "应付账款未生成")
    assert(payable.totalAmount === order.finalAmount, "应付账款金额错误")
    assert(payable.balanceAmount === payable.totalAmount, "应付账款余额错误")
    assert(payable.status === 'unpaid', "应付账款状态错误")
}
```

#### 应收账款生成验证
```javascript
// 验证应收账款自动生成
const order = getSalesOrder(orderId)
if (order.status === 'shipped' || order.status === 'completed') {
    const receivable = getAccountsReceivableByOrderId(orderId)
    assert(receivable !== null, "应收账款未生成")
    assert(receivable.totalAmount === order.finalAmount, "应收账款金额错误")
    assert(receivable.balanceAmount === receivable.totalAmount, "应收账款余额错误")
    assert(receivable.status === 'unpaid', "应收账款状态错误")
}
```

## 数据一致性检查标准

### 库存一致性检查
```sql
-- 检查库存总量是否等于入库总量减去出库总量
SELECT 
    s.product_id,
    s.warehouse_id,
    s.current_stock,
    COALESCE(inbound.total_in, 0) as total_in,
    COALESCE(outbound.total_out, 0) as total_out,
    (COALESCE(inbound.total_in, 0) - COALESCE(outbound.total_out, 0)) as calculated_stock,
    (s.current_stock - (COALESCE(inbound.total_in, 0) - COALESCE(outbound.total_out, 0))) as difference
FROM inventory_stocks s
LEFT JOIN (
    SELECT product_id, warehouse_id, SUM(quantity) as total_in
    FROM inventory_transactions 
    WHERE transaction_type = 'in'
    GROUP BY product_id, warehouse_id
) inbound ON s.product_id = inbound.product_id AND s.warehouse_id = inbound.warehouse_id
LEFT JOIN (
    SELECT product_id, warehouse_id, SUM(ABS(quantity)) as total_out
    FROM inventory_transactions 
    WHERE transaction_type = 'out'
    GROUP BY product_id, warehouse_id
) outbound ON s.product_id = outbound.product_id AND s.warehouse_id = outbound.warehouse_id
WHERE ABS(s.current_stock - (COALESCE(inbound.total_in, 0) - COALESCE(outbound.total_out, 0))) > 0.01;
```

### 财务一致性检查
```sql
-- 检查应付账款余额是否等于总额减去已付金额
SELECT 
    id,
    bill_no,
    total_amount,
    paid_amount,
    balance_amount,
    (total_amount - paid_amount) as calculated_balance,
    (balance_amount - (total_amount - paid_amount)) as difference
FROM accounts_payable
WHERE ABS(balance_amount - (total_amount - paid_amount)) > 0.01;

-- 检查应收账款余额是否等于总额减去已收金额
SELECT 
    id,
    bill_no,
    total_amount,
    received_amount,
    balance_amount,
    (total_amount - received_amount) as calculated_balance,
    (balance_amount - (total_amount - received_amount)) as difference
FROM accounts_receivable
WHERE ABS(balance_amount - (total_amount - received_amount)) > 0.01;
```

### 订单状态一致性检查
```sql
-- 检查采购订单状态与收货数量的一致性
SELECT 
    po.id,
    po.order_no,
    po.status,
    SUM(poi.quantity) as total_ordered,
    SUM(poi.received_quantity) as total_received,
    CASE 
        WHEN SUM(poi.received_quantity) = 0 THEN 'confirmed'
        WHEN SUM(poi.received_quantity) < SUM(poi.quantity) THEN 'partial'
        WHEN SUM(poi.received_quantity) = SUM(poi.quantity) THEN 'completed'
    END as expected_status
FROM purchase_orders po
JOIN purchase_order_items poi ON po.id = poi.order_id
WHERE po.status NOT IN ('draft', 'cancelled')
GROUP BY po.id, po.order_no, po.status
HAVING po.status != expected_status;
```

## 性能验证标准

### 响应时间标准
- **库存查询**: < 50ms
- **库存更新**: < 100ms
- **订单创建**: < 200ms
- **复杂报表查询**: < 2s

### 并发性能标准
- **同时库存操作**: 支持100个并发操作
- **数据一致性**: 并发操作后数据100%一致
- **死锁率**: < 0.1%

### 数据准确性标准
- **计算精度**: 金额计算误差 < 0.01元
- **数据一致性**: 一致性检查100%通过
- **业务规则**: 业务规则验证100%通过
