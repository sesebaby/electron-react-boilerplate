# 业务逻辑验证计划

## 执行摘要

本文档制定了对库存管理系统进行全面业务逻辑验证的详细计划。验证范围涵盖所有核心业务功能，从方法级别到端到端工作流程，确保业务逻辑的正确性和数据一致性。

## 验证目标

1. **方法级别验证** - 测试每个业务服务方法的正确性
2. **数据流追踪** - 实时监控业务操作中的数据变化
3. **端到端工作流验证** - 完整业务流程的正确性验证
4. **问题识别和记录** - 系统性发现并记录所有问题
5. **修复建议** - 提供具体的修复方案和优先级

## 业务逻辑验证范围

### 1. 库存管理模块

#### 1.1 核心服务验证
- **inventoryService** (`src/services/inventory/inventoryService.ts`)
  - `getInventoryItems()` - 库存项目查询逻辑
  - `updateInventoryItem()` - 库存更新业务规则
  - `calculateAvailableStock()` - 可用库存计算
  - `validateStockOperation()` - 库存操作验证

- **fifoInventoryService** (`src/services/business/fifoInventoryService.ts`)
  - `calculateFifoConsumption()` - FIFO消耗计算
  - `updateFifoQueue()` - FIFO队列更新
  - `getStockCostBasis()` - 成本基础计算
  - `processStockMovement()` - 库存移动处理

#### 1.2 测试场景
```
场景1: 基本库存操作
- 初始数据: 创建5个产品，每个产品3个批次
- 操作: 执行入库、出库、调整操作
- 验证: FIFO计算、库存数量、成本计算
- 跟踪: inventory_stocks, fifo_queue, stock_movements表

场景2: 多仓库库存分配
- 初始数据: 3个仓库，10个产品
- 操作: 跨仓库转移、分配操作
- 验证: 库存分配逻辑、仓库间平衡
- 跟踪: warehouse_stocks, stock_transfers表
```

### 2. 采购管理模块

#### 2.1 核心服务验证
- **purchaseOrderService** (`src/services/business/purchaseOrderService.ts`)
  - `createPurchaseOrder()` - 采购订单创建逻辑
  - `updateOrderStatus()` - 订单状态更新
  - `calculateOrderTotal()` - 订单总额计算
  - `validateOrderItems()` - 订单项目验证

- **purchaseReceiptService** (`src/services/business/purchaseReceiptService.ts`)
  - `createReceipt()` - 收货单创建
  - `processReceiptItems()` - 收货项目处理
  - `updateInventoryFromReceipt()` - 收货后库存更新
  - `createAccountsPayable()` - 应付账款创建

#### 2.2 测试场景
```
场景1: 完整采购流程
- 初始数据: 10个供应商，50个产品
- 操作: 创建采购订单 → 收货 → 库存入库 → 应付账款
- 验证: 每个步骤的数据变化和业务规则
- 跟踪: purchase_orders, receipts, inventory_stocks, accounts_payable表

场景2: 异常处理
- 初始数据: 正常采购订单
- 操作: 超量收货、部分收货、取消订单
- 验证: 异常情况处理逻辑
- 跟踪: 状态变化和数据一致性
```

### 3. 销售管理模块

#### 3.1 核心服务验证
- **salesOrderService** (`src/services/business/salesOrderService.ts`)
  - `createSalesOrder()` - 销售订单创建
  - `reserveStock()` - 库存预留逻辑
  - `calculateOrderTotal()` - 订单总额计算
  - `validateStockAvailability()` - 库存可用性验证

- **salesDeliveryService** (`src/services/business/salesDeliveryService.ts`)
  - `createDelivery()` - 发货单创建
  - `processDeliveryItems()` - 发货项目处理
  - `updateInventoryFromDelivery()` - 发货后库存更新
  - `createAccountsReceivable()` - 应收账款创建

#### 3.2 测试场景
```
场景1: 完整销售流程
- 初始数据: 20个客户，充足库存
- 操作: 创建销售订单 → 库存预留 → 发货 → 应收账款
- 验证: 每个步骤的数据变化和业务规则
- 跟踪: sales_orders, deliveries, inventory_stocks, accounts_receivable表

场景2: 库存不足处理
- 初始数据: 库存不足的产品
- 操作: 创建超出库存的销售订单
- 验证: 库存不足时的处理逻辑
- 跟踪: 预留机制和错误处理
```

### 4. 财务管理模块

#### 4.1 核心服务验证
- **accountsPayableService** (`src/services/business/accountsPayableService.ts`)
  - `createPayable()` - 应付账款创建
  - `processPayment()` - 付款处理
  - `calculateBalance()` - 余额计算
  - `updatePayableStatus()` - 应付状态更新

- **accountsReceivableService** (`src/services/business/accountsReceivableService.ts`)
  - `createReceivable()` - 应收账款创建
  - `processReceipt()` - 收款处理
  - `calculateBalance()` - 余额计算
  - `updateReceivableStatus()` - 应收状态更新

#### 4.2 测试场景
```
场景1: 财务流程完整性
- 初始数据: 采购和销售交易
- 操作: 应付应收创建 → 付款收款 → 余额更新
- 验证: 财务数据准确性和一致性
- 跟踪: accounts_payable, accounts_receivable, payments, receipts表

场景2: 财务对账
- 初始数据: 多笔交易记录
- 操作: 对账处理和余额核对
- 验证: 对账逻辑和数据准确性
- 跟踪: 财务报表数据一致性
```

### 5. 仓库管理模块

#### 5.1 核心服务验证
- **warehouseService** (`src/services/business/warehouseService.ts`)
  - `createWarehouse()` - 仓库创建
  - `updateWarehouseInfo()` - 仓库信息更新
  - `getWarehouseStock()` - 仓库库存查询
  - `transferStock()` - 库存转移

#### 5.2 测试场景
```
场景1: 多仓库管理
- 初始数据: 5个仓库，100个产品
- 操作: 仓库间转移、库存分配
- 验证: 多仓库库存准确性
- 跟踪: warehouses, warehouse_stocks, stock_transfers表
```

### 6. 系统管理模块

#### 6.1 核心服务验证
- **userService** (`src/services/business/userService.ts`)
- **permissionService** (`src/services/business/permissionService.ts`)
- **unitService** (`src/services/business/unitService.ts`)
- **unitConversionService** (`src/services/business/unitConversionService.ts`)

## 验证方法论

### 1. 数据追踪策略

#### 1.1 数据库状态快照
```javascript
// 数据库状态快照工具
class DatabaseSnapshot {
  async captureSnapshot(testId, operation) {
    // 捕获所有相关表的状态
    const snapshot = {
      inventory_stocks: await this.getTableData('inventory_stocks'),
      fifo_queue: await this.getTableData('fifo_queue'),
      purchase_orders: await this.getTableData('purchase_orders'),
      sales_orders: await this.getTableData('sales_orders'),
      accounts_payable: await this.getTableData('accounts_payable'),
      accounts_receivable: await this.getTableData('accounts_receivable'),
      timestamp: new Date().toISOString(),
      testId,
      operation
    };
    return snapshot;
  }
}
```

#### 1.2 数据变化追踪
```javascript
// 数据变化追踪器
class DataChangeTracker {
  async trackOperation(operation, beforeSnapshot, afterSnapshot) {
    const changes = this.compareSnapshots(beforeSnapshot, afterSnapshot);
    return {
      operation,
      changes,
      affectedTables: this.getAffectedTables(changes),
      dataIntegrityCheck: this.verifyDataIntegrity(changes)
    };
  }
}
```

### 2. 测试数据生成

#### 2.1 测试数据规范
```javascript
const testDataSpecs = {
  products: {
    count: 100,
    categories: ['电子产品', '办公用品', '工业材料'],
    priceRange: [10, 1000],
    stockLevels: [0, 500]
  },
  suppliers: {
    count: 20,
    regions: ['北京', '上海', '广州', '深圳'],
    paymentTerms: [30, 60, 90]
  },
  customers: {
    count: 50,
    types: ['个人', '企业', '政府'],
    creditLimits: [10000, 100000]
  },
  warehouses: {
    count: 5,
    locations: ['总仓', '分仓A', '分仓B', '分仓C', '分仓D'],
    capacity: [1000, 5000]
  }
};
```

#### 2.2 测试数据生成器
```javascript
class TestDataGenerator {
  async generateTestData() {
    // 生成主数据
    const products = await this.generateProducts(testDataSpecs.products);
    const suppliers = await this.generateSuppliers(testDataSpecs.suppliers);
    const customers = await this.generateCustomers(testDataSpecs.customers);
    const warehouses = await this.generateWarehouses(testDataSpecs.warehouses);
    
    // 生成交易数据
    const purchaseOrders = await this.generatePurchaseOrders(products, suppliers);
    const salesOrders = await this.generateSalesOrders(products, customers);
    
    return {
      products, suppliers, customers, warehouses,
      purchaseOrders, salesOrders
    };
  }
}
```

### 3. 验证程序

#### 3.1 方法级验证
```javascript
class MethodVerifier {
  async verifyMethod(service, method, testCases) {
    const results = [];
    
    for (const testCase of testCases) {
      const beforeSnapshot = await this.captureSnapshot(testCase.id, `before_${method}`);
      
      try {
        const result = await service[method](...testCase.params);
        const afterSnapshot = await this.captureSnapshot(testCase.id, `after_${method}`);
        
        const verification = {
          testCase: testCase.id,
          method,
          result,
          dataChanges: this.compareSnapshots(beforeSnapshot, afterSnapshot),
          businessRuleChecks: this.verifyBusinessRules(testCase, result),
          passed: true
        };
        
        results.push(verification);
      } catch (error) {
        results.push({
          testCase: testCase.id,
          method,
          error: error.message,
          passed: false
        });
      }
    }
    
    return results;
  }
}
```

#### 3.2 端到端工作流验证
```javascript
class WorkflowVerifier {
  async verifyPurchaseWorkflow(testData) {
    const workflow = [
      { step: 'create_purchase_order', service: 'purchaseOrderService', method: 'createPurchaseOrder' },
      { step: 'create_receipt', service: 'purchaseReceiptService', method: 'createReceipt' },
      { step: 'update_inventory', service: 'inventoryService', method: 'updateFromReceipt' },
      { step: 'create_payable', service: 'accountsPayableService', method: 'createPayable' }
    ];
    
    const results = [];
    let workflowData = testData;
    
    for (const step of workflow) {
      const stepResult = await this.executeWorkflowStep(step, workflowData);
      results.push(stepResult);
      
      if (!stepResult.passed) {
        break; // 如果某步失败，停止工作流
      }
      
      workflowData = { ...workflowData, ...stepResult.outputData };
    }
    
    return {
      workflow: 'purchase_workflow',
      steps: results,
      completed: results.every(r => r.passed),
      dataIntegrity: this.verifyWorkflowDataIntegrity(results)
    };
  }
}
```

## 问题追踪框架

### 1. 问题分类

#### 1.1 严重性级别
- **Critical** - 导致数据丢失或系统崩溃
- **High** - 影响核心业务功能
- **Medium** - 影响用户体验但不影响核心功能
- **Low** - 轻微问题，不影响业务操作

#### 1.2 问题类型
- **Logic Error** - 业务逻辑错误
- **Data Inconsistency** - 数据不一致
- **Performance Issue** - 性能问题
- **Validation Error** - 验证逻辑错误
- **Integration Issue** - 集成问题

### 2. 问题记录格式

```markdown
## 问题 ID: [AUTO_GENERATED]

### 基本信息
- **发现日期**: 2024-01-XX
- **严重性**: Critical/High/Medium/Low
- **类型**: Logic Error/Data Inconsistency/Performance Issue/Validation Error/Integration Issue
- **状态**: Open/In Progress/Resolved/Closed

### 问题描述
[详细描述问题]

### 重现步骤
1. 步骤1
2. 步骤2
3. 步骤3

### 预期结果
[描述预期的正确结果]

### 实际结果
[描述实际发生的错误结果]

### 影响范围
- **受影响的服务**: 
- **受影响的功能**: 
- **数据影响**: 

### 技术细节
- **文件路径**: 
- **方法名称**: 
- **错误日志**: 
- **数据库状态**: 

### 修复建议
[提供修复建议]

### 相关问题
[链接到相关问题]
```

## 实施时间表

### 第1阶段：准备阶段（1-2天）
- [ ] 创建测试基础设施
- [ ] 开发数据追踪工具
- [ ] 设置测试环境
- [ ] 生成测试数据

### 第2阶段：单元验证（3-4天）
- [ ] 库存管理服务验证
- [ ] 采购管理服务验证
- [ ] 销售管理服务验证
- [ ] 财务管理服务验证
- [ ] 仓库管理服务验证

### 第3阶段：集成验证（2-3天）
- [ ] 端到端工作流验证
- [ ] 跨服务集成验证
- [ ] 数据一致性验证

### 第4阶段：性能验证（1-2天）
- [ ] 大数据量测试
- [ ] 并发操作测试
- [ ] 性能基准测试

### 第5阶段：报告和修复（1-2天）
- [ ] 问题汇总和分析
- [ ] 修复优先级排序
- [ ] 修复计划制定

## 成功标准

### 1. 验证完成标准
- [ ] 所有核心业务方法已验证
- [ ] 所有端到端工作流已验证
- [ ] 所有发现的问题已记录
- [ ] 数据一致性已验证
- [ ] 性能指标已建立

### 2. 质量标准
- [ ] 关键业务逻辑正确率 > 95%
- [ ] 数据一致性检查通过率 > 98%
- [ ] 端到端工作流成功率 > 90%
- [ ] 问题记录完整性 > 95%

### 3. 输出文件
- [ ] 详细验证报告
- [ ] 问题清单和修复建议
- [ ] 测试数据集
- [ ] 验证工具和脚本

## 风险和缓解措施

### 1. 潜在风险
- **数据安全**: 测试可能影响生产数据
- **性能影响**: 大量测试可能影响系统性能
- **时间限制**: 验证时间可能不足
- **复杂性**: 业务逻辑复杂度超出预期

### 2. 缓解措施
- 使用独立的测试环境
- 实施数据备份和恢复机制
- 分阶段执行验证
- 建立回滚机制
- 持续监控系统状态

---

## 后续行动

1. **立即行动**：创建测试基础设施和数据追踪工具
2. **短期目标**：完成单元验证和集成验证
3. **长期目标**：建立持续的业务逻辑验证流程

此验证计划将确保库存管理系统的业务逻辑正确性，并为后续的系统优化和维护提供坚实基础。