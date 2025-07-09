/**
 * 数据变化追踪器
 * 用于分析和验证业务操作中的数据变化
 */

import { IDatabaseSnapshot } from './databaseSnapshot';

export interface DataChangeRecord {
  operationId: string;
  operation: string;
  timestamp: Date;
  beforeSnapshot: IDatabaseSnapshot;
  afterSnapshot: IDatabaseSnapshot;
  changes: Map<string, TableChangeRecord>;
  integrity: DataIntegrityReport;
}

export interface TableChangeRecord {
  tableName: string;
  rowsAdded: number;
  rowsUpdated: number;
  rowsDeleted: number;
  addedRows: any[];
  updatedRows: any[];
  deletedRows: any[];
  businessRuleViolations: any[];
  dataConsistencyIssues: any[];
}

export interface DataIntegrityReport {
  passed: boolean;
  violations: IntegrityViolation[];
  warnings: IntegrityWarning[];
  summary: {
    totalViolations: number;
    criticalViolations: number;
    tablesConcerned: string[];
    overallScore: number;
  };
}

export interface IntegrityViolation {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  table: string;
  record: any;
  description: string;
  businessRule: string;
  suggestedFix: string;
}

export interface IntegrityWarning {
  type: string;
  table: string;
  description: string;
  recommendation: string;
}

export class DataChangeTracker {
  private businessRules: Map<string, any[]> = new Map();
  private integrityConstraints: Map<string, any[]> = new Map();
  
  constructor() {
    this.initializeBusinessRules();
    this.initializeIntegrityConstraints();
  }

  /**
   * 追踪业务操作的数据变化
   */
  async trackOperation(
    operation: string,
    beforeSnapshot: IDatabaseSnapshot,
    afterSnapshot: IDatabaseSnapshot
  ): Promise<DataChangeRecord> {
    const _operationId = `${operation}_${Date.now()}`;
    
    console.log(`[DataChangeTracker] 追踪操作: ${operation} (${operationId})`);
    
    const _changes = await this.analyzeChanges(beforeSnapshot, afterSnapshot);
    const _integrity = await this.verifyDataIntegrity(beforeSnapshot, afterSnapshot, changes);
    
    const changeRecord: DataChangeRecord = {
      operationId,
      operation,
      timestamp: new Date(),
      beforeSnapshot,
      afterSnapshot,
      changes,
      integrity
    };
    
    await this.saveChangeRecord(changeRecord);
    
    return changeRecord;
  }

  /**
   * 分析数据变化
   */
  public async analyzeChanges(
    beforeSnapshot: IDatabaseSnapshot,
    afterSnapshot: IDatabaseSnapshot
  ): Promise<Map<string, TableChangeRecord>> {
    const _changes = new Map<string, TableChangeRecord>();
    
    // 获取所有跟踪的表
    const _trackedTables = Array.from(beforeSnapshot.tables.keys());
    
    for (const tableName of trackedTables) {
      const _beforeTable = beforeSnapshot.tables.get(tableName);
      const _afterTable = afterSnapshot.tables.get(tableName);
      
      if (!beforeTable || !afterTable) {
        continue;
      }
      
      const _tableChange = await this.analyzeTableChange(tableName, beforeTable, afterTable);
      if (tableChange.rowsAdded > 0 || tableChange.rowsUpdated > 0 || tableChange.rowsDeleted > 0) {
        changes.set(tableName, tableChange);
      }
    }
    
    return changes;
  }

  /**
   * 分析单个表的变化
   */
  private async analyzeTableChange(
    tableName: string,
    beforeTable: any,
    afterTable: any
  ): Promise<TableChangeRecord> {
    const tableChange: TableChangeRecord = {
      tableName,
      rowsAdded: 0,
      rowsUpdated: 0,
      rowsDeleted: 0,
      addedRows: [],
      updatedRows: [],
      deletedRows: [],
      businessRuleViolations: [],
      dataConsistencyIssues: []
    };
    
    // 创建数据映射以便比较
    const _beforeMap = new Map(beforeTable.data.map((row: any) => [row.id, row]));
    const _afterMap = new Map(afterTable.data.map((row: any) => [row.id, row]));
    
    // 查找新增的行
    afterMap.forEach((row, id) => {
      if (!beforeMap.has(id)) {
        tableChange.addedRows.push(row);
        tableChange.rowsAdded++;
        
        // 检查新增行的业务规则
        const _violations = this.checkBusinessRules(tableName, row, 'insert');
        tableChange.businessRuleViolations.push(...violations);
      }
    });
    
    // 查找删除的行
    beforeMap.forEach((row, id) => {
      if (!afterMap.has(id)) {
        tableChange.deletedRows.push(row);
        tableChange.rowsDeleted++;
        
        // 检查删除行的业务规则
        const _violations = this.checkBusinessRules(tableName, row, 'delete');
        tableChange.businessRuleViolations.push(...violations);
      }
    });
    
    // 查找更新的行
    beforeMap.forEach((beforeRow, id) => {
      const _afterRow = afterMap.get(id);
      if (afterRow && JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) {
        tableChange.updatedRows.push({
          id,
          before: beforeRow,
          after: afterRow,
          changes: this.getRowChanges(beforeRow, afterRow)
        });
        tableChange.rowsUpdated++;
        
        // 检查更新行的业务规则
        const _violations = this.checkBusinessRules(tableName, afterRow, 'update', beforeRow);
        tableChange.businessRuleViolations.push(...violations);
      }
    });
    
    // 检查数据一致性
    tableChange.dataConsistencyIssues = await this.checkDataConsistency(tableName, afterTable.data);
    
    return tableChange;
  }

  /**
   * 获取行级别的变化详情
   */
  private getRowChanges(beforeRow: any, afterRow: any): any[] {
    const changes: {field: string, before: any, after: any, changeType: string}[] = [];
    const _allKeys = new Set([...Object.keys(beforeRow), ...Object.keys(afterRow)]);
    
    for (const key of allKeys) {
      const _beforeValue = beforeRow[key];
      const _afterValue = afterRow[key];
      
      if (beforeValue !== afterValue) {
        changes.push({
          field: key,
          before: beforeValue,
          after: afterValue,
          changeType: this.getChangeType(beforeValue, afterValue)
        });
      }
    }
    
    return changes;
  }

  /**
   * 获取变化类型
   */
  private getChangeType(beforeValue: any, afterValue: any): string {
    if (beforeValue === null || beforeValue === undefined) {
      return 'added';
    }
    if (afterValue === null || afterValue === undefined) {
      return 'removed';
    }
    return 'modified';
  }

  /**
   * 验证数据完整性
   */
  async verifyDataIntegrity(
    beforeSnapshot: IDatabaseSnapshot,
    afterSnapshot: IDatabaseSnapshot,
    changes: Map<string, TableChangeRecord>
  ): Promise<DataIntegrityReport> {
    const violations: IntegrityViolation[] = [];
    const warnings: IntegrityWarning[] = [];
    
    // 检查每个表的数据完整性
    for (const [tableName, tableChange] of changes.entries()) {
      const _tableViolations = await this.checkTableIntegrity(tableName, tableChange);
      violations.push(...tableViolations);
      
      // 检查跨表数据一致性
      const _crossTableViolations = await this.checkCrossTableIntegrity(tableName, tableChange, afterSnapshot);
      violations.push(...crossTableViolations);
    }
    
    // 检查业务逻辑一致性
    const _businessLogicViolations = await this.checkBusinessLogicIntegrity(changes, afterSnapshot);
    violations.push(...businessLogicViolations);
    
    const report: DataIntegrityReport = {
      passed: violations.filter(v => v.severity === 'Critical' || v.severity === 'High').length === 0,
      violations,
      warnings,
      summary: {
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'Critical').length,
        tablesConcerned: Array.from(new Set(violations.map(v => v.table))),
        overallScore: this.calculateIntegrityScore(violations)
      }
    };
    
    return report;
  }

  /**
   * 检查表数据完整性
   */
  private async checkTableIntegrity(tableName: string, tableChange: TableChangeRecord): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查约束条件
    const _constraints = this.integrityConstraints.get(tableName) || [];
    
    for (const constraint of constraints) {
      // 检查新增行
      for (const row of tableChange.addedRows) {
        const _violation = this.checkConstraint(tableName, row, constraint);
        if (violation) {
          violations.push(violation);
        }
      }
      
      // 检查更新行
      for (const update of tableChange.updatedRows) {
        const _violation = this.checkConstraint(tableName, update.after, constraint);
        if (violation) {
          violations.push(violation);
        }
      }
    }
    
    return violations;
  }

  /**
   * 检查跨表数据一致性
   */
  private async checkCrossTableIntegrity(
    tableName: string,
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 根据表名检查相关的跨表一致性
    switch (tableName) {
      case 'inventory_stocks':
        violations.push(...await this.checkInventoryStockIntegrity(tableChange, snapshot));
        break;
      case 'fifo_queue':
        violations.push(...await this.checkFifoQueueIntegrity(tableChange, snapshot));
        break;
      case 'accounts_payable':
        violations.push(...await this.checkAccountsPayableIntegrity(tableChange, snapshot));
        break;
      case 'accounts_receivable':
        violations.push(...await this.checkAccountsReceivableIntegrity(tableChange, snapshot));
        break;
      case 'purchase_orders':
        violations.push(...await this.checkPurchaseOrderIntegrity(tableChange, snapshot));
        break;
      case 'sales_orders':
        violations.push(...await this.checkSalesOrderIntegrity(tableChange, snapshot));
        break;
    }
    
    return violations;
  }

  /**
   * 检查库存数据完整性
   */
  private async checkInventoryStockIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查库存数量不能为负数
    for (const row of [...tableChange.addedRows, ...tableChange.updatedRows.map(u => u.after)]) {
      if (row.stock_quantity < 0) {
        violations.push({
          type: 'Negative Stock',
          severity: 'Critical',
          table: 'inventory_stocks',
          record: row,
          description: `产品 ${row.product_id} 的库存数量为负数: ${row.stock_quantity}`,
          businessRule: '库存数量不能为负数',
          suggestedFix: '检查库存出库逻辑，确保不允许超出库存的操作'
        });
      }
      
      // 检查可用库存计算
      const _availableStock = row.stock_quantity - row.reserved_quantity;
      if (availableStock < 0) {
        violations.push({
          type: 'Invalid Available Stock',
          severity: 'High',
          table: 'inventory_stocks',
          record: row,
          description: `产品 ${row.product_id} 的可用库存为负数: ${availableStock}`,
          businessRule: '可用库存 = 库存数量 - 预留数量，不能为负数',
          suggestedFix: '检查库存预留逻辑，确保预留数量不超过库存数量'
        });
      }
    }
    
    return violations;
  }

  /**
   * 检查FIFO队列完整性
   */
  private async checkFifoQueueIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    if (!tableChange) return violations;

    const _allProductIds = new Set(tableChange.addedRows.map(r => r.product_id));

    for (const productId of allProductIds) {
      const _stock = snapshot.tables.get('inventory_stocks')?.data.find(s => s.product_id === productId);
      if (!stock) continue;

      // FIFO队列的总数量应等于关联库存的总数量
      const _totalFifoQuantity = snapshot.tables.get('fifo_queue')?.data
        .filter((row: any) => row.product_id === productId)
        .reduce((sum: number, row: any) => sum + row.quantity, 0) || 0;
      
      if (stock.stock_quantity !== totalFifoQuantity) {
        violations.push({
          type: 'Data Inconsistency',
          severity: 'Critical',
          table: 'fifo_queue',
          record: { product_id: productId, fifo_total: totalFifoQuantity, inventory_stock: stock.stock_quantity },
          description: `产品 ${productId} 的FIFO队列总数量 (${totalFifoQuantity}) 与库存数量 (${stock.stock_quantity}) 不匹配`,
          businessRule: 'FIFO队列总数量应等于库存数量',
          suggestedFix: '检查FIFO队列更新逻辑，确保与库存数量保持一致'
        });
      }
    }
    
    return violations;
  }

  /**
   * 检查应付账款完整性
   */
  private async checkAccountsPayableIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查应付账款余额
    for (const row of [...tableChange.addedRows, ...tableChange.updatedRows.map(u => u.after)]) {
      if (row.paid_amount > row.total_amount) {
        violations.push({
          type: 'Overpayment',
          severity: 'High',
          table: 'accounts_payable',
          record: row,
          description: `应付账款 ${row.id} 的已付金额 (${row.paid_amount}) 超过总金额 (${row.total_amount})`,
          businessRule: '已付金额不能超过总金额',
          suggestedFix: '检查付款处理逻辑，确保付款金额不超过应付金额'
        });
      }
    }
    
    return violations;
  }

  /**
   * 检查应收账款完整性
   */
  private async checkAccountsReceivableIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查应收账款余额
    for (const row of [...tableChange.addedRows, ...tableChange.updatedRows.map(u => u.after)]) {
      if (row.received_amount > row.total_amount) {
        violations.push({
          type: 'Over-receipt',
          severity: 'High',
          table: 'accounts_receivable',
          record: row,
          description: `应收账款 ${row.id} 的已收金额 (${row.received_amount}) 超过总金额 (${row.total_amount})`,
          businessRule: '已收金额不能超过总金额',
          suggestedFix: '检查收款处理逻辑，确保收款金额不超过应收金额'
        });
      }
    }
    
    return violations;
  }

  /**
   * 检查采购订单完整性
   */
  private async checkPurchaseOrderIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    if (!tableChange) return violations;

    for (const order of tableChange.addedRows) {
      // 检查子项金额是否等于主订单金额
      if (order.id && snapshot.tables.has('purchase_order_items')) {
        const _orderItemsTable = snapshot.tables.get('purchase_order_items');
        if (orderItemsTable) {
          const _orderItems = orderItemsTable.data;
          const _itemsTotal = orderItems
            .filter((item: any) => item.purchase_order_id === order.id)
            .reduce((sum: number, item: any) => sum + item.total_price, 0);

          if (order.total_amount !== itemsTotal) {
            violations.push({
              type: 'Data Inconsistency',
              severity: 'Critical',
              table: 'purchase_orders',
              record: order,
              description: `采购订单 ${order.id} 的总金额 (${order.total_amount}) 与子项总金额 (${itemsTotal}) 不匹配`,
              businessRule: '采购订单总金额应等于子项总金额',
              suggestedFix: '检查采购订单与子项金额的一致性'
            });
          }
        }
      }
    }

    for (const update of tableChange.updatedRows) {
      const _statusChange = update.changes.find((c: any) => c.field === 'status');
      if (statusChange) {
        const _isValidTransition = this.isValidStatusTransition(
          'purchase_order',
          statusChange.before,
          statusChange.after
        );
        
        if (!isValidTransition) {
          violations.push({
            type: 'Invalid Status Transition',
            severity: 'Medium',
            table: 'purchase_orders',
            record: update.after,
            description: `采购订单 ${update.id} 的状态变化无效: ${statusChange.before} -> ${statusChange.after}`,
            businessRule: '订单状态变化必须遵循预定义的状态流转规则',
            suggestedFix: '检查订单状态更新逻辑，确保状态变化符合业务规则'
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * 检查销售订单完整性
   */
  private async checkSalesOrderIntegrity(
    tableChange: TableChangeRecord,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    if (!tableChange) return violations;

    for (const order of tableChange.addedRows) {
      // 检查子项金额是否等于主订单金额
      if (order.id && snapshot.tables.has('sales_order_items')) {
        const _orderItemsTable = snapshot.tables.get('sales_order_items');
        if (orderItemsTable) {
          const _orderItems = orderItemsTable.data;
          const _itemsTotal = orderItems
            .filter((item: any) => item.sales_order_id === order.id)
            .reduce((sum: number, item: any) => sum + item.total_price, 0);
          
          if (order.total_amount !== itemsTotal) {
            violations.push({
              type: 'Data Inconsistency',
              severity: 'Critical',
              table: 'sales_orders',
              record: order,
              description: `销售订单 ${order.id} 的总金额 (${order.total_amount}) 与子项总金额 (${itemsTotal}) 不匹配`,
              businessRule: '销售订单总金额应等于子项总金额',
              suggestedFix: '检查销售订单与子项金额的一致性'
            });
          }
        }
      }
    }

    for (const update of tableChange.updatedRows) {
      const _statusChange = update.changes.find((c: any) => c.field === 'status');
      if (statusChange) {
        const _isValidTransition = this.isValidStatusTransition(
          'sales_order',
          statusChange.before,
          statusChange.after
        );
        
        if (!isValidTransition) {
          violations.push({
            type: 'Invalid Status Transition',
            severity: 'Medium',
            table: 'sales_orders',
            record: update.after,
            description: `销售订单 ${update.id} 的状态变化无效: ${statusChange.before} -> ${statusChange.after}`,
            businessRule: '订单状态变化必须遵循预定义的状态流转规则',
            suggestedFix: '检查订单状态更新逻辑，确保状态变化符合业务规则'
          });
        }
      }
    }
    
    return violations;
  }

  /**
   * 检查业务逻辑完整性
   */
  private async checkBusinessLogicIntegrity(
    changes: Map<string, TableChangeRecord>,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查复杂的业务逻辑一致性
    violations.push(...await this.checkInventoryBusinessLogic(changes, snapshot));
    violations.push(...await this.checkFinancialBusinessLogic(changes, snapshot));
    violations.push(...await this.checkOrderBusinessLogic(changes, snapshot));
    
    return violations;
  }

  /**
   * 检查库存业务逻辑
   */
  private async checkInventoryBusinessLogic(
    changes: Map<string, TableChangeRecord>,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查库存移动是否与FIFO队列一致
    const _stockMovements = changes.get('stock_movements');
    const _fifoQueue = changes.get('fifo_queue');
    
    if (stockMovements && fifoQueue) {
      // 这里可以添加复杂的库存业务逻辑检查
      // 例如：检查出库操作是否正确更新了FIFO队列
    }
    
    return violations;
  }

  /**
   * 检查财务业务逻辑
   */
  private async checkFinancialBusinessLogic(
    changes: Map<string, TableChangeRecord>,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查财务数据的平衡性
    const _apChanges = changes.get('accounts_payable');
    const _arChanges = changes.get('accounts_receivable');
    
    if (apChanges || arChanges) {
      // 这里可以添加复杂的财务业务逻辑检查
      // 例如：检查应付应收是否与相关订单金额一致
    }
    
    return violations;
  }

  /**
   * 检查订单业务逻辑
   */
  private async checkOrderBusinessLogic(
    changes: Map<string, TableChangeRecord>,
    snapshot: IDatabaseSnapshot
  ): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    // 检查订单与库存的关联性
    const _purchaseOrders = changes.get('purchase_orders');
    const _salesOrders = changes.get('sales_orders');
    
    if (purchaseOrders || salesOrders) {
      // 这里可以添加复杂的订单业务逻辑检查
      // 例如：检查订单状态变化是否与库存变化一致
    }
    
    if (changes.has('purchase_order')) {
      const _purchaseOrderChanges = changes.get('purchase_order');
      if (purchaseOrderChanges) {
        purchaseOrderChanges.updatedRows.forEach((c: any) => {
          if (!this.isValidStatusTransition('purchase_order', c.before.status, c.after.status)) {
            violations.push({
              type: 'Invalid Status Transition',
              severity: 'Medium',
              table: 'purchase_orders',
              record: c.after,
              description: `采购订单 ${c.after.id} 的状态变化无效: ${c.before.status} -> ${c.after.status}`,
              businessRule: '订单状态变化必须遵循预定义的状态流转规则',
              suggestedFix: '检查订单状态更新逻辑，确保状态变化符合业务规则'
            });
          }
        });
      }
    }

    if (changes.has('sales_order')) {
      const _salesOrderChanges = changes.get('sales_order');
      if (salesOrderChanges) {
        salesOrderChanges.updatedRows.forEach((c: any) => {
          if (!this.isValidStatusTransition('sales_order', c.before.status, c.after.status)) {
            violations.push({
              type: 'Invalid Status Transition',
              severity: 'Medium',
              table: 'sales_orders',
              record: c.after,
              description: `销售订单 ${c.after.id} 的状态变化无效: ${c.before.status} -> ${c.after.status}`,
              businessRule: '订单状态变化必须遵循预定义的状态流转规则',
              suggestedFix: '检查订单状态更新逻辑，确保状态变化符合业务规则'
            });
          }
        });
      }
    }
    
    return violations;
  }

  /**
   * 检查业务规则
   */
  private checkBusinessRules(tableName: string, row: any, operation: string, beforeRow?: any): any[] {
    const _violations = [];
    const _rules = this.businessRules.get(tableName) || [];
    
    for (const rule of rules) {
      const _violation = this.checkRule(tableName, row, rule, operation, beforeRow);
      if (violation) {
        violations.push(violation);
      }
    }
    
    return violations;
  }

  /**
   * 检查单个规则
   */
  private checkRule(tableName: string, row: any, rule: any, operation: string, beforeRow?: any): any {
    // 这里实现具体的业务规则检查逻辑
    // 根据规则类型和操作类型进行检查
    return null;
  }

  /**
   * 检查约束条件
   */
  private checkConstraint(tableName: string, row: any, constraint: any): IntegrityViolation | null {
    // 这里实现具体的约束检查逻辑
    return null;
  }

  /**
   * 检查数据一致性
   */
  private async checkDataConsistency(tableName: string, data: any[]): Promise<any[]> {
    const issues: {type: string, description: string, details: any}[] = [];
    switch (tableName) {
      case 'inventory_stocks':
        // 检查总价值是否等于单价*数量
        // ... existing code ...
        break;
    }
    return issues;
  }

  /**
   * 检查状态转换是否有效
   */
  private isValidStatusTransition(entityType: string, fromStatus: string, toStatus: string): boolean {
    const VALID_STATUS_TRANSITIONS: {
      purchase_order: { [key: string]: string[] };
      sales_order: { [key: string]: string[] };
    } = {
      purchase_order: {
        draft: ['pending', 'cancelled'],
        pending: ['approved', 'cancelled'],
        approved: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      },
      sales_order: {
        draft: ['pending', 'cancelled'],
        pending: ['approved', 'cancelled'],
        approved: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      }
    };

    if (fromStatus === toStatus) return true;

    const _transitions = VALID_STATUS_TRANSITIONS[entityType as keyof typeof VALID_STATUS_TRANSITIONS];
    if (transitions && transitions[fromStatus as keyof typeof transitions]) {
      return transitions[fromStatus as keyof typeof transitions].includes(toStatus);
    }

    return false;
  }

  /**
   * 计算完整性分数
   */
  private calculateIntegrityScore(violations: IntegrityViolation[]): number {
    const _weights = {
      'Critical': 10,
      'High': 5,
      'Medium': 2,
      'Low': 1
    };
    
    const _totalScore = violations.reduce((sum, violation) => {
      return sum + weights[violation.severity];
    }, 0);
    
    // 返回0-100的分数，100表示完美
    return Math.max(0, 100 - totalScore);
  }

  /**
   * 初始化业务规则
   */
  private initializeBusinessRules(): void {
    // 库存相关规则
    this.businessRules.set('inventory_stocks', [
      { type: 'non_negative_stock', description: '库存数量不能为负数' },
      { type: 'valid_reserved_quantity', description: '预留数量不能超过库存数量' }
    ]);
    
    // 财务相关规则
    this.businessRules.set('accounts_payable', [
      { type: 'payment_not_exceed_total', description: '付款金额不能超过总金额' }
    ]);
    
    this.businessRules.set('accounts_receivable', [
      { type: 'receipt_not_exceed_total', description: '收款金额不能超过总金额' }
    ]);
  }

  /**
   * 初始化完整性约束
   */
  private initializeIntegrityConstraints(): void {
    // 库存约束
    this.integrityConstraints.set('inventory_stocks', [
      { type: 'primary_key', field: 'id' },
      { type: 'foreign_key', field: 'product_id', reference: 'products.id' },
      { type: 'non_null', field: 'stock_quantity' }
    ]);
    
    // 订单约束
    this.integrityConstraints.set('purchase_orders', [
      { type: 'primary_key', field: 'id' },
      { type: 'foreign_key', field: 'supplier_id', reference: 'suppliers.id' },
      { type: 'non_null', field: 'order_date' }
    ]);
  }

  /**
   * 保存变化记录
   */
  private async saveChangeRecord(changeRecord: DataChangeRecord): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const changeDir = path.join(process.cwd(), 'tests', 'changes');
      await fs.mkdir(changeDir, { recursive: true });
      
      const changeFile = path.join(changeDir, `${changeRecord.operationId}.json`);
      
      // 创建可序列化的变化记录
      const serializableRecord = {
        ...changeRecord,
        changes: Array.from(changeRecord.changes.entries()).map(([key, value]) => ({ key, value }))
      };
      
      await fs.writeFile(changeFile, JSON.stringify(serializableRecord, null, 2));
      console.log(`[DataChangeTracker] 变化记录已保存: ${changeFile}`);
    } catch (error) {
      console.error(`[DataChangeTracker] 保存变化记录失败:`, error);
    }
  }
}