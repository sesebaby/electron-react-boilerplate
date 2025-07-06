# 进销存系统数据流程分析

## 概述

本文档详细分析进销存系统的完整数据流程，从采购到销售的全链路数据流向，识别所有关键节点和业务逻辑。

## 系统架构概览

### 核心实体关系
```
基础数据层:
├── 用户 (users)
├── 系统配置 (system_configs)
├── 计量单位 (units)
├── 商品分类 (categories)
├── 仓库 (warehouses)
├── 商品 (products)
├── 供应商 (suppliers)
└── 客户 (customers)

业务数据层:
├── 库存管理
│   ├── 库存主表 (inventory_stocks)
│   └── 库存流水 (inventory_transactions)
├── 采购管理
│   ├── 采购订单 (purchase_orders)
│   ├── 采购订单明细 (purchase_order_items)
│   ├── 采购收货 (purchase_receipts)
│   └── 采购收货明细 (purchase_receipt_items)
├── 销售管理
│   ├── 销售订单 (sales_orders)
│   ├── 销售订单明细 (sales_order_items)
│   ├── 销售出库 (sales_deliveries) [缺失]
│   └── 销售出库明细 (sales_delivery_items) [缺失]
└── 财务管理
    ├── 应付账款 (accounts_payable)
    ├── 付款记录 (payments)
    ├── 应收账款 (accounts_receivable)
    └── 收款记录 (receipts)
```

## 完整业务流程链路

### 1. 采购入库流程

#### 1.1 采购订单创建
**触发点**: 用户创建采购订单
**涉及表**: `purchase_orders`, `purchase_order_items`
**关键字段**:
- 订单编号 (order_no) - 自动生成
- 供应商ID (supplier_id)
- 订单状态 (status): draft → confirmed → partial → completed
- 金额计算: total_amount, discount_amount, tax_amount, final_amount

**业务逻辑**:
```javascript
// 订单金额计算
final_amount = total_amount - discount_amount + tax_amount

// 订单项目金额计算
item_amount = quantity * unit_price * (1 - discount_rate)
```

#### 1.2 采购收货确认
**触发点**: 用户确认收货
**涉及表**: `purchase_receipts`, `purchase_receipt_items`
**数据流向**:
1. 创建收货单记录
2. 更新采购订单项目的 `received_quantity`
3. 更新采购订单状态 (partial/completed)
4. **自动触发库存入库**

#### 1.3 库存自动入库
**触发点**: 采购收货确认
**涉及表**: `inventory_stocks`, `inventory_transactions`
**关键计算**:
```javascript
// 库存更新
current_stock += received_quantity
available_stock = current_stock - reserved_stock

// 平均成本计算 (加权平均)
new_avg_cost = (old_avg_cost * old_quantity + new_unit_price * new_quantity) 
               / (old_quantity + new_quantity)
```

#### 1.4 应付账款生成
**触发点**: 采购订单状态变为 completed
**涉及表**: `accounts_payable`
**业务逻辑**:
- 自动生成应付账款记录
- 金额 = 采购订单的 final_amount
- 到期日期 = 账单日期 + 付款条件天数

### 2. 销售出库流程

#### 2.1 销售订单创建
**触发点**: 用户创建销售订单
**涉及表**: `sales_orders`, `sales_order_items`
**关键验证**:
- 库存可用性检查
- 客户信用额度检查
- **自动库存预留**

#### 2.2 库存预留机制
**触发点**: 销售订单确认
**涉及表**: `inventory_stocks`
**关键计算**:
```javascript
// 库存预留
reserved_stock += order_quantity
available_stock = current_stock - reserved_stock

// 验证库存充足
if (available_stock < 0) {
    throw new Error('库存不足');
}
```

#### 2.3 销售出库确认 [问题发现]
**问题**: 数据库中缺少销售出库表 (`sales_deliveries`, `sales_delivery_items`)
**当前实现**: 直接在销售订单中记录 `shipped_quantity`
**应有流程**:
1. 创建销售出库单
2. 确认出库数量
3. **自动扣减库存**
4. 释放预留库存

#### 2.4 库存自动扣减
**触发点**: 销售出库确认
**涉及表**: `inventory_stocks`, `inventory_transactions`
**关键计算**:
```javascript
// 库存扣减
current_stock -= shipped_quantity
reserved_stock -= shipped_quantity
available_stock = current_stock - reserved_stock

// 记录出库流水
transaction_type = 'out'
quantity = -shipped_quantity  // 负数表示出库
```

#### 2.5 应收账款生成
**触发点**: 销售订单状态变为 shipped 或 completed
**涉及表**: `accounts_receivable`
**业务逻辑**:
- 自动生成应收账款记录
- 金额 = 销售订单的 final_amount
- 到期日期 = 账单日期 + 付款条件天数

### 3. 财务结算流程

#### 3.1 应付账款付款
**触发点**: 用户记录付款
**涉及表**: `payments`, `accounts_payable`
**状态更新**:
```javascript
// 更新应付账款
paid_amount += payment_amount
balance_amount = total_amount - paid_amount

// 状态判断
if (balance_amount === 0) status = 'paid'
else if (paid_amount > 0) status = 'partial'
else if (due_date < current_date) status = 'overdue'
```

#### 3.2 应收账款收款
**触发点**: 用户记录收款
**涉及表**: `receipts`, `accounts_receivable`
**状态更新**: 类似应付账款逻辑

## 关键数据节点分析

### 节点1: 采购收货 → 库存入库
**输入**: 收货数量、单价
**输出**: 更新库存数量、平均成本
**计算公式**: 加权平均成本法
**验证点**: 库存数量增加、成本计算正确

### 节点2: 销售订单 → 库存预留
**输入**: 销售数量
**输出**: 预留库存增加、可用库存减少
**验证点**: 可用库存 = 当前库存 - 预留库存

### 节点3: 销售出库 → 库存扣减
**输入**: 出库数量
**输出**: 当前库存减少、预留库存释放
**验证点**: 库存总量平衡

### 节点4: 订单完成 → 财务集成
**输入**: 订单金额
**输出**: 应收/应付账款记录
**验证点**: 财务金额与订单金额一致

## 数据一致性检查点

### 库存一致性
```sql
-- 验证库存总量 = 入库总量 - 出库总量
SELECT 
    product_id,
    warehouse_id,
    current_stock,
    (SELECT SUM(quantity) FROM inventory_transactions 
     WHERE product_id = s.product_id AND warehouse_id = s.warehouse_id 
     AND transaction_type = 'in') as total_in,
    (SELECT SUM(ABS(quantity)) FROM inventory_transactions 
     WHERE product_id = s.product_id AND warehouse_id = s.warehouse_id 
     AND transaction_type = 'out') as total_out
FROM inventory_stocks s;
```

### 财务一致性
```sql
-- 验证应付账款总额 = 已付金额 + 余额
SELECT 
    id,
    total_amount,
    paid_amount,
    balance_amount,
    (paid_amount + balance_amount) as calculated_total
FROM accounts_payable
WHERE total_amount != (paid_amount + balance_amount);
```

### 订单状态一致性
```sql
-- 验证采购订单状态与收货数量的一致性
SELECT 
    po.id,
    po.status,
    SUM(poi.quantity) as ordered_quantity,
    SUM(poi.received_quantity) as received_quantity
FROM purchase_orders po
JOIN purchase_order_items poi ON po.id = poi.order_id
GROUP BY po.id
HAVING (
    (po.status = 'completed' AND SUM(poi.quantity) != SUM(poi.received_quantity)) OR
    (po.status = 'partial' AND SUM(poi.received_quantity) = 0) OR
    (po.status = 'draft' AND SUM(poi.received_quantity) > 0)
);
```

## 发现的问题

### 1. 缺失销售出库表
**问题**: 数据库迁移中缺少 `sales_deliveries` 和 `sales_delivery_items` 表
**影响**: 销售出库流程不完整，无法准确跟踪出库记录
**解决方案**: 添加销售出库表的数据库迁移

### 2. 库存并发控制
**问题**: 需要确保库存操作的原子性
**现状**: 代码中使用了 `ConcurrencyManager.withMutex`
**验证点**: 并发操作时库存数据的一致性

### 3. 财务自动集成
**问题**: 需要验证财务记录的自动生成逻辑
**验证点**: 订单状态变更时应收应付账款的正确生成

## 技术实现细节

### 并发控制机制
```typescript
// 库存操作使用互斥锁确保原子性
const lockKey = `stock-operation-${productId}-${warehouseId}`;
return ConcurrencyManager.withMutex(lockKey, async () => {
    // 原子性库存操作
    return this.processStockTransaction(params);
});
```

### 事务处理
```typescript
// 采购收货的事务处理
async processReceiptConfirmation(receiptId: string) {
    const transaction = await db.beginTransaction();
    try {
        // 1. 更新收货记录
        await this.updateReceiptStatus(receiptId, 'confirmed');

        // 2. 更新采购订单项目
        await this.updateOrderItemReceived(orderItemId, quantity);

        // 3. 自动入库
        await inventoryService.stockIn({...params});

        // 4. 生成应付账款（如果订单完成）
        if (orderCompleted) {
            await accountsPayableService.createFromPurchaseOrder(order);
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

### 数据验证规则
```typescript
// 库存验证
if (params.quantity <= 0) {
    throw new ValidationError('数量必须大于0');
}

if (currentStock.availableStock < requestedQuantity) {
    throw new BusinessError('库存不足', {
        available: currentStock.availableStock,
        requested: requestedQuantity
    });
}

// 金额计算验证
const calculatedAmount = quantity * unitPrice * (1 - discountRate);
if (Math.abs(amount - calculatedAmount) > 0.01) {
    throw new ValidationError('金额计算错误');
}
```

## 测试验证标准

### 1. 库存流程测试
**测试场景A**: 标准采购入库流程
- 创建采购订单: 100台iPhone，单价8000元
- 确认收货: 100台
- 验证库存: current_stock +100, avg_cost 正确计算
- 验证应付账款: 自动生成800,000元应付账款

**测试场景B**: 部分收货流程
- 创建采购订单: 50台MacBook，单价9000元
- 部分收货: 30台
- 验证订单状态: partial
- 补充收货: 20台
- 验证订单状态: completed

### 2. 销售流程测试
**测试场景C**: 标准销售出库流程
- 创建销售订单: 50台iPhone，单价9999元
- 验证库存预留: reserved_stock +50, available_stock -50
- 确认出库: 50台
- 验证库存扣减: current_stock -50, reserved_stock -50
- 验证应收账款: 自动生成499,950元应收账款

**测试场景D**: 库存不足处理
- 尝试销售: 200台iPhone（库存只有100台）
- 验证错误: 抛出"库存不足"异常
- 验证库存: 无变化

### 3. 财务集成测试
**测试场景E**: 应付账款付款
- 记录付款: 400,000元
- 验证状态: partial
- 记录剩余付款: 400,000元
- 验证状态: paid

### 4. 数据一致性测试
**验证点**:
- 库存总量 = 所有入库 - 所有出库
- 可用库存 = 当前库存 - 预留库存
- 应付账款余额 = 总额 - 已付金额
- 应收账款余额 = 总额 - 已收金额

## 性能监控指标

### 关键性能指标 (KPI)
1. **库存操作响应时间**: < 100ms
2. **订单处理吞吐量**: > 1000 orders/hour
3. **数据一致性检查**: 100% 通过率
4. **并发操作成功率**: > 99.9%

### 监控查询
```sql
-- 库存操作性能监控
SELECT
    DATE(created_at) as date,
    COUNT(*) as transaction_count,
    AVG(processing_time) as avg_processing_time
FROM inventory_transactions
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at);

-- 数据一致性监控
SELECT
    'inventory_consistency' as check_type,
    COUNT(*) as inconsistent_records
FROM inventory_stocks s
WHERE s.current_stock != (
    SELECT COALESCE(SUM(CASE
        WHEN t.transaction_type = 'in' THEN t.quantity
        WHEN t.transaction_type = 'out' THEN -t.quantity
        ELSE 0 END), 0)
    FROM inventory_transactions t
    WHERE t.product_id = s.product_id
    AND t.warehouse_id = s.warehouse_id
);
```

## 下一步行动

1. **修复销售出库表缺失问题**
   - 创建数据库迁移脚本
   - 添加 sales_deliveries 和 sales_delivery_items 表

2. **创建测试数据验证完整流程**
   - 实施上述测试场景A-E
   - 记录每个节点的详细数据变化

3. **实施数据一致性检查**
   - 运行一致性验证查询
   - 修复发现的数据不一致问题

4. **验证并发控制机制**
   - 模拟并发库存操作
   - 验证数据完整性

5. **测试财务自动集成功能**
   - 验证应收应付账款自动生成
   - 测试付款收款流程
