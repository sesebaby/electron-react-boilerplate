# 关键数据节点计算逻辑详解

## 概述

本文档详细分析进销存系统中每个关键数据节点的输入、输出、计算规则和业务逻辑，为数据流程测试提供精确的验证标准。

## 节点1: 采购订单金额计算

### 输入参数
- `quantity`: 采购数量
- `unit_price`: 单价
- `discount_rate`: 折扣率 (0-1之间的小数)
- `tax_rate`: 税率 (可选)

### 计算公式
```javascript
// 订单项目金额计算
item_amount = quantity * unit_price * (1 - discount_rate)

// 订单总金额计算
total_amount = SUM(item_amount for all items)
discount_amount = SUM(quantity * unit_price * discount_rate for all items)
tax_amount = total_amount * tax_rate  // 如果有税率
final_amount = total_amount - discount_amount + tax_amount
```

### 验证规则
```javascript
// 基本验证
assert(quantity > 0, "数量必须大于0")
assert(unit_price >= 0, "单价不能为负数")
assert(discount_rate >= 0 && discount_rate <= 1, "折扣率必须在0-1之间")

// 金额验证
assert(item_amount === quantity * unit_price * (1 - discount_rate), "项目金额计算错误")
assert(final_amount === total_amount - discount_amount + tax_amount, "最终金额计算错误")
```

### 测试用例
```javascript
// 测试用例1: 无折扣无税
input: { quantity: 100, unit_price: 50.00, discount_rate: 0, tax_rate: 0 }
expected: { item_amount: 5000.00, total_amount: 5000.00, final_amount: 5000.00 }

// 测试用例2: 有折扣有税
input: { quantity: 100, unit_price: 50.00, discount_rate: 0.1, tax_rate: 0.13 }
expected: { 
    item_amount: 4500.00, 
    discount_amount: 500.00,
    tax_amount: 650.00,  // 5000 * 0.13
    final_amount: 5150.00  // 5000 - 500 + 650
}
```

## 节点2: 库存入库计算

### 输入参数
- `current_stock`: 当前库存数量
- `reserved_stock`: 预留库存数量
- `incoming_quantity`: 入库数量
- `incoming_unit_price`: 入库单价
- `current_avg_cost`: 当前平均成本

### 计算公式
```javascript
// 库存数量更新
new_current_stock = current_stock + incoming_quantity
new_available_stock = new_current_stock - reserved_stock

// 加权平均成本计算
if (current_stock === 0) {
    new_avg_cost = incoming_unit_price
} else {
    total_value_before = current_stock * current_avg_cost
    incoming_value = incoming_quantity * incoming_unit_price
    total_quantity_after = current_stock + incoming_quantity
    new_avg_cost = (total_value_before + incoming_value) / total_quantity_after
}

// 库存总价值
total_value = new_current_stock * new_avg_cost
```

### 验证规则
```javascript
assert(incoming_quantity > 0, "入库数量必须大于0")
assert(incoming_unit_price >= 0, "入库单价不能为负数")
assert(new_current_stock === current_stock + incoming_quantity, "库存数量计算错误")
assert(new_available_stock === new_current_stock - reserved_stock, "可用库存计算错误")

// 平均成本验证（允许小数精度误差）
const expected_avg_cost = (current_stock * current_avg_cost + incoming_quantity * incoming_unit_price) 
                         / (current_stock + incoming_quantity)
assert(Math.abs(new_avg_cost - expected_avg_cost) < 0.01, "平均成本计算错误")
```

### 测试用例
```javascript
// 测试用例1: 首次入库
input: { 
    current_stock: 0, reserved_stock: 0, 
    incoming_quantity: 100, incoming_unit_price: 50.00 
}
expected: { 
    new_current_stock: 100, new_available_stock: 100, 
    new_avg_cost: 50.00, total_value: 5000.00 
}

// 测试用例2: 追加入库（不同价格）
input: { 
    current_stock: 100, current_avg_cost: 50.00, reserved_stock: 10,
    incoming_quantity: 50, incoming_unit_price: 60.00 
}
expected: { 
    new_current_stock: 150, new_available_stock: 140,  // 150 - 10
    new_avg_cost: 53.33,  // (100*50 + 50*60) / 150 = 8000/150
    total_value: 8000.00
}
```

## 节点3: 销售库存预留

### 输入参数
- `current_stock`: 当前库存数量
- `reserved_stock`: 当前预留库存
- `order_quantity`: 订单数量

### 计算公式
```javascript
// 可用库存检查
available_stock = current_stock - reserved_stock
if (available_stock < order_quantity) {
    throw new Error(`库存不足: 可用${available_stock}, 需要${order_quantity}`)
}

// 预留库存更新
new_reserved_stock = reserved_stock + order_quantity
new_available_stock = current_stock - new_reserved_stock
```

### 验证规则
```javascript
assert(order_quantity > 0, "订单数量必须大于0")
assert(available_stock >= order_quantity, "库存不足，无法预留")
assert(new_reserved_stock === reserved_stock + order_quantity, "预留库存计算错误")
assert(new_available_stock === current_stock - new_reserved_stock, "可用库存计算错误")
```

### 测试用例
```javascript
// 测试用例1: 正常预留
input: { current_stock: 100, reserved_stock: 10, order_quantity: 30 }
expected: { new_reserved_stock: 40, new_available_stock: 60 }

// 测试用例2: 库存不足
input: { current_stock: 100, reserved_stock: 10, order_quantity: 100 }
expected: Error("库存不足: 可用90, 需要100")
```

## 节点4: 销售出库扣减

### 输入参数
- `current_stock`: 当前库存数量
- `reserved_stock`: 预留库存数量
- `shipped_quantity`: 出库数量

### 计算公式
```javascript
// 库存扣减
new_current_stock = current_stock - shipped_quantity
new_reserved_stock = reserved_stock - shipped_quantity  // 释放预留
new_available_stock = new_current_stock - new_reserved_stock

// 验证库存不为负
if (new_current_stock < 0) {
    throw new Error(`库存不足: 当前${current_stock}, 出库${shipped_quantity}`)
}
if (new_reserved_stock < 0) {
    throw new Error(`预留库存不足: 当前预留${reserved_stock}, 出库${shipped_quantity}`)
}
```

### 验证规则
```javascript
assert(shipped_quantity > 0, "出库数量必须大于0")
assert(shipped_quantity <= current_stock, "出库数量不能超过当前库存")
assert(shipped_quantity <= reserved_stock, "出库数量不能超过预留库存")
assert(new_current_stock === current_stock - shipped_quantity, "当前库存计算错误")
assert(new_reserved_stock === reserved_stock - shipped_quantity, "预留库存计算错误")
```

### 测试用例
```javascript
// 测试用例1: 正常出库
input: { current_stock: 100, reserved_stock: 40, shipped_quantity: 30 }
expected: { new_current_stock: 70, new_reserved_stock: 10, new_available_stock: 60 }

// 测试用例2: 出库数量超过预留
input: { current_stock: 100, reserved_stock: 40, shipped_quantity: 50 }
expected: Error("预留库存不足: 当前预留40, 出库50")
```

## 节点5: 应收应付账款计算

### 输入参数
- `order_final_amount`: 订单最终金额
- `payment_terms_days`: 付款条件天数
- `bill_date`: 账单日期

### 计算公式
```javascript
// 应收/应付账款创建
total_amount = order_final_amount
received_amount = 0  // 应收账款初始已收金额
paid_amount = 0      // 应付账款初始已付金额
balance_amount = total_amount

// 到期日期计算
due_date = new Date(bill_date.getTime() + payment_terms_days * 24 * 60 * 60 * 1000)

// 状态判断
status = 'unpaid'
```

### 付款/收款计算
```javascript
// 付款/收款处理
function processPayment(payment_amount) {
    if (payment_amount <= 0) {
        throw new Error("付款金额必须大于0")
    }
    if (payment_amount > balance_amount) {
        throw new Error("付款金额不能超过余额")
    }
    
    new_paid_amount = paid_amount + payment_amount
    new_balance_amount = total_amount - new_paid_amount
    
    // 状态更新
    if (new_balance_amount === 0) {
        new_status = 'paid'
    } else if (new_paid_amount > 0) {
        new_status = 'partial'
    } else if (due_date < current_date && new_balance_amount > 0) {
        new_status = 'overdue'
    }
}
```

### 验证规则
```javascript
assert(total_amount > 0, "账款总额必须大于0")
assert(paid_amount + balance_amount === total_amount, "金额平衡验证失败")
assert(payment_amount > 0, "付款金额必须大于0")
assert(payment_amount <= balance_amount, "付款金额不能超过余额")
```

### 测试用例
```javascript
// 测试用例1: 创建应付账款
input: { order_final_amount: 10000, payment_terms_days: 30, bill_date: "2024-01-01" }
expected: { 
    total_amount: 10000, paid_amount: 0, balance_amount: 10000,
    due_date: "2024-01-31", status: "unpaid"
}

// 测试用例2: 部分付款
input: { total_amount: 10000, paid_amount: 0, payment_amount: 6000 }
expected: { 
    new_paid_amount: 6000, new_balance_amount: 4000, new_status: "partial"
}

// 测试用例3: 全额付款
input: { total_amount: 10000, paid_amount: 6000, payment_amount: 4000 }
expected: { 
    new_paid_amount: 10000, new_balance_amount: 0, new_status: "paid"
}
```

## 数据一致性验证公式

### 库存一致性
```sql
-- 验证公式: 当前库存 = 所有入库 - 所有出库
current_stock = SUM(入库数量) - SUM(出库数量)

-- 验证公式: 可用库存 = 当前库存 - 预留库存
available_stock = current_stock - reserved_stock
```

### 财务一致性
```sql
-- 验证公式: 余额 = 总额 - 已付/已收金额
balance_amount = total_amount - paid_amount  -- 应付账款
balance_amount = total_amount - received_amount  -- 应收账款
```

### 订单状态一致性
```sql
-- 采购订单状态验证
IF received_quantity = 0 THEN status IN ('draft', 'confirmed')
IF 0 < received_quantity < ordered_quantity THEN status = 'partial'
IF received_quantity = ordered_quantity THEN status = 'completed'

-- 销售订单状态验证
IF shipped_quantity = 0 THEN status IN ('draft', 'confirmed')
IF 0 < shipped_quantity < ordered_quantity THEN status = 'shipped'
IF shipped_quantity = ordered_quantity THEN status = 'completed'
```
