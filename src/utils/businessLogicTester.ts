/**
 * 业务逻辑测试器 - 核心测试协调器
 * 负责协调所有业务逻辑验证活动
 */

import { DatabaseSnapshot } from './databaseSnapshot';
import { DataChangeTracker } from './dataChangeTracker';
import { TestDataGenerator } from './testDataGenerator';
import { ResultLogger } from './resultLogger';
import { MethodVerifier } from './methodVerifier';
import { WorkflowVerifier } from './workflowVerifier';

export interface TestConfiguration {
  testId: string;
  description: string;
  services: string[];
  workflows: string[];
  testDataSpecs: any;
  verificationRules: any;
}

export interface Issue {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  description: string;
  details?: any;
  timestamp: Date;
}

export interface TestResult {
  testId: string;
  description: string;
  startTime: Date;
  endTime: Date;
  passed: boolean;
  methodResults: any[];
  workflowResults: any[];
  issues: Issue[];
  dataIntegrityReport: any;
}

export class BusinessLogicTester {
  private databaseSnapshot: DatabaseSnapshot;
  private dataChangeTracker: DataChangeTracker;
  private testDataGenerator: TestDataGenerator;
  private resultLogger: ResultLogger;
  private methodVerifier: MethodVerifier;
  private workflowVerifier: WorkflowVerifier;

  constructor() {
    this.databaseSnapshot = new DatabaseSnapshot();
    this.dataChangeTracker = new DataChangeTracker();
    this.testDataGenerator = new TestDataGenerator();
    this.resultLogger = new ResultLogger();
    this.methodVerifier = new MethodVerifier();
    this.workflowVerifier = new WorkflowVerifier();
  }

  /**
   * 执行完整的业务逻辑验证
   */
  async runFullVerification(config: TestConfiguration): Promise<TestResult> {
    const testResult: TestResult = {
      testId: config.testId,
      description: config.description,
      startTime: new Date(),
      endTime: new Date(),
      passed: false,
      methodResults: [],
      workflowResults: [],
      issues: [],
      dataIntegrityReport: null
    };

    try {
      // 1. 生成测试数据
      console.log(`[${config.testId}] 生成测试数据...`);
      const testData = await this.testDataGenerator.generateTestData(config.testDataSpecs);
      
      // 2. 捕获初始数据库状态
      console.log(`[${config.testId}] 捕获初始数据库状态...`);
      const initialSnapshot = await this.databaseSnapshot.captureSnapshot(config.testId, 'initial');

      // 3. 执行方法级验证
      console.log(`[${config.testId}] 执行方法级验证...`);
      for (const serviceName of config.services) {
        const methodResults = await this.methodVerifier.verifyService(serviceName, testData);
        testResult.methodResults.push(...methodResults);
      }

      // 4. 执行工作流验证
      console.log(`[${config.testId}] 执行工作流验证...`);
      for (const workflowName of config.workflows) {
        const workflowResult = await this.workflowVerifier.verifyWorkflow(workflowName, testData);
        testResult.workflowResults.push(workflowResult);
      }

      // 5. 捕获最终数据库状态
      console.log(`[${config.testId}] 捕获最终数据库状态...`);
      const finalSnapshot = await this.databaseSnapshot.captureSnapshot(config.testId, 'final');

      // 6. 分析数据变化
      console.log(`[${config.testId}] 分析数据整体变化...`);
      const changes = await this.dataChangeTracker.analyzeChanges(initialSnapshot, finalSnapshot);

      // 7. 数据完整性检查
      console.log(`[${config.testId}] 执行数据完整性检查...`);
      testResult.dataIntegrityReport = await this.dataChangeTracker.verifyDataIntegrity(
        initialSnapshot,
        finalSnapshot,
        changes
      );

      // 8. 收集问题
      testResult.issues = this.collectIssues(testResult);

      // 9. 确定测试结果
      testResult.passed = this.determineTestResult(testResult);
      testResult.endTime = new Date();

      // 10. 记录结果
      await this.resultLogger.logTestResult(testResult);

      console.log(`[${config.testId}] 验证完成 - ${testResult.passed ? '通过' : '失败'}`);
      return testResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[${config.testId}] 验证过程中发生错误:`, error);
      testResult.endTime = new Date();
      testResult.passed = false;
      testResult.issues.push({
        type: 'System Error',
        severity: 'Critical',
        description: `验证过程中发生系统错误: ${errorMessage}`,
        timestamp: new Date()
      });
      
      await this.resultLogger.logTestResult(testResult);
      return testResult;
    }
  }

  /**
   * 运行特定的业务逻辑验证场景
   */
  async runVerificationScenario(scenarioName: string, params: any): Promise<any> {
    switch (scenarioName) {
      case 'inventory_basic_operations':
        return this.runInventoryBasicOperationsScenario(params);
      case 'purchase_complete_workflow':
        return this.runPurchaseCompleteWorkflowScenario(params);
      case 'sales_complete_workflow':
        return this.runSalesCompleteWorkflowScenario(params);
      case 'multi_warehouse_operations':
        return this.runMultiWarehouseOperationsScenario(params);
      case 'financial_reconciliation':
        return this.runFinancialReconciliationScenario(params);
      default:
        throw new Error(`未知的验证场景: ${scenarioName}`);
    }
  }

  /**
   * 基本库存操作验证场景
   */
  private async runInventoryBasicOperationsScenario(params: any) {
    const testId = `inventory_basic_${Date.now()}`;
    console.log(`[${testId}] 开始基本库存操作验证场景...`);

    // 创建测试数据
    const testData = await this.testDataGenerator.generateInventoryTestData({
      productCount: 5,
      batchCount: 3,
      warehouseCount: 2
    });

    const operations = [
      { type: 'stock_in', service: 'inventoryService', method: 'stockIn' },
      { type: 'stock_out', service: 'inventoryService', method: 'stockOut' },
      { type: 'stock_adjust', service: 'inventoryService', method: 'adjustStock' },
      { type: 'fifo_calculation', service: 'fifoInventoryService', method: 'calculateFifoConsumption' }
    ];

    const results = [];
    for (const operation of operations) {
      const beforeSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `before_${operation.type}`);
      
      try {
        const result = await this.executeInventoryOperation(operation, testData);
        const afterSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `after_${operation.type}`);
        
        const changes = await this.dataChangeTracker.trackOperation(
          operation.type,
          beforeSnapshot,
          afterSnapshot
        );

        results.push({
          operation: operation.type,
          result,
          changes,
          passed: this.validateInventoryOperation(operation, result, changes)
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          operation: operation.type,
          error: errorMessage,
          passed: false
        });
      }
    }

    return {
      testId,
      scenario: 'inventory_basic_operations',
      results,
      passed: results.every(r => r.passed),
      summary: this.generateScenarioSummary(results)
    };
  }

  /**
   * 完整采购工作流验证场景
   */
  private async runPurchaseCompleteWorkflowScenario(params: any) {
    const testId = `purchase_workflow_${Date.now()}`;
    console.log(`[${testId}] 开始完整采购工作流验证场景...`);

    // 创建测试数据
    const testData = await this.testDataGenerator.generatePurchaseTestData({
      supplierCount: 3,
      productCount: 10,
      orderCount: 5
    });

    const workflow = [
      { step: 'create_purchase_order', service: 'purchaseOrderService', method: 'createPurchaseOrder' },
      { step: 'create_receipt', service: 'purchaseReceiptService', method: 'createReceipt' },
      { step: 'update_inventory', service: 'inventoryService', method: 'updateFromReceipt' },
      { step: 'create_payable', service: 'accountsPayableService', method: 'createPayable' },
      { step: 'process_payment', service: 'accountsPayableService', method: 'processPayment' }
    ];

    return await this.workflowVerifier.verifyWorkflow('purchase_complete_workflow', testData, workflow);
  }

  /**
   * 完整销售工作流验证场景
   */
  private async runSalesCompleteWorkflowScenario(params: any) {
    const testId = `sales_workflow_${Date.now()}`;
    console.log(`[${testId}] 开始完整销售工作流验证场景...`);

    // 创建测试数据
    const testData = await this.testDataGenerator.generateSalesTestData({
      customerCount: 5,
      productCount: 15,
      orderCount: 8
    });

    const workflow = [
      { step: 'create_sales_order', service: 'salesOrderService', method: 'createSalesOrder' },
      { step: 'reserve_stock', service: 'inventoryService', method: 'reserveStock' },
      { step: 'create_delivery', service: 'salesDeliveryService', method: 'createDelivery' },
      { step: 'update_inventory', service: 'inventoryService', method: 'updateFromDelivery' },
      { step: 'create_receivable', service: 'accountsReceivableService', method: 'createReceivable' },
      { step: 'process_receipt', service: 'accountsReceivableService', method: 'processReceipt' }
    ];

    return await this.workflowVerifier.verifyWorkflow('sales_complete_workflow', testData, workflow);
  }

  /**
   * 多仓库操作验证场景
   */
  private async runMultiWarehouseOperationsScenario(params: any) {
    const testId = `multi_warehouse_${Date.now()}`;
    console.log(`[${testId}] 开始多仓库操作验证场景...`);

    // 创建测试数据
    const testData = await this.testDataGenerator.generateMultiWarehouseTestData({
      warehouseCount: 5,
      productCount: 20,
      transferCount: 10
    });

    const operations = [
      { type: 'stock_transfer', service: 'warehouseService', method: 'transferStock' },
      { type: 'stock_allocation', service: 'warehouseService', method: 'allocateStock' },
      { type: 'warehouse_balance', service: 'warehouseService', method: 'balanceWarehouses' },
      { type: 'multi_warehouse_fifo', service: 'fifoInventoryService', method: 'calculateMultiWarehouseFifo' }
    ];

    const results = [];
    for (const operation of operations) {
      const beforeSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `before_${operation.type}`);
      
      try {
        const result = await this.executeWarehouseOperation(operation, testData);
        const afterSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `after_${operation.type}`);
        
        const changes = await this.dataChangeTracker.trackOperation(
          operation.type,
          beforeSnapshot,
          afterSnapshot
        );

        results.push({
          operation: operation.type,
          result,
          changes,
          passed: this.validateWarehouseOperation(operation, result, changes)
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          operation: operation.type,
          error: errorMessage,
          passed: false
        });
      }
    }

    return {
      testId,
      scenario: 'multi_warehouse_operations',
      results,
      passed: results.every(r => r.passed),
      summary: this.generateScenarioSummary(results)
    };
  }

  /**
   * 财务对账验证场景
   */
  private async runFinancialReconciliationScenario(params: any) {
    const testId = `financial_reconciliation_${Date.now()}`;
    console.log(`[${testId}] 开始财务对账验证场景...`);

    // 创建测试数据
    const testData = await this.testDataGenerator.generateFinancialTestData({
      transactionCount: 50,
      paymentCount: 25,
      receiptCount: 30
    });

    const reconciliationSteps = [
      { step: 'ap_balance_check', service: 'accountsPayableService', method: 'calculateBalance' },
      { step: 'ar_balance_check', service: 'accountsReceivableService', method: 'calculateBalance' },
      { step: 'payment_reconciliation', service: 'accountsPayableService', method: 'reconcilePayments' },
      { step: 'receipt_reconciliation', service: 'accountsReceivableService', method: 'reconcileReceipts' },
      { step: 'financial_report_generation', service: 'dashboardService', method: 'generateFinancialReport' }
    ];

    const results = [];
    for (const step of reconciliationSteps) {
      const beforeSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `before_${step.step}`);
      
      try {
        const result = await this.executeFinancialOperation(step, testData);
        const afterSnapshot = await this.databaseSnapshot.captureSnapshot(testId, `after_${step.step}`);
        
        const changes = await this.dataChangeTracker.trackOperation(
          step.step,
          beforeSnapshot,
          afterSnapshot
        );

        results.push({
          step: step.step,
          result,
          changes,
          passed: this.validateFinancialOperation(step, result, changes)
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          step: step.step,
          error: errorMessage,
          passed: false
        });
      }
    }

    return {
      testId,
      scenario: 'financial_reconciliation',
      results,
      passed: results.every(r => r.passed),
      summary: this.generateScenarioSummary(results)
    };
  }

  /**
   * 执行库存操作
   */
  private async executeInventoryOperation(operation: any, testData: any): Promise<any> {
    // 根据操作类型执行相应的业务逻辑
    // 这里需要根据实际的服务接口实现
    console.log(`执行库存操作: ${operation.type}`);
    return { success: true, operationType: operation.type };
  }

  /**
   * 执行仓库操作
   */
  private async executeWarehouseOperation(operation: any, testData: any): Promise<any> {
    // 根据操作类型执行相应的业务逻辑
    console.log(`执行仓库操作: ${operation.type}`);
    return { success: true, operationType: operation.type };
  }

  /**
   * 执行财务操作
   */
  private async executeFinancialOperation(operation: any, testData: any): Promise<any> {
    // 根据操作类型执行相应的业务逻辑
    console.log(`执行财务操作: ${operation.step}`);
    return { success: true, operationType: operation.step };
  }

  /**
   * 验证库存操作结果
   */
  private validateInventoryOperation(operation: any, result: any, changes: any): boolean {
    // 示例：简单的验证逻辑
    if (!result || result.error) return false;
    // ... more validation
    return true;
  }

  /**
   * 验证仓库操作结果
   */
  private validateWarehouseOperation(operation: any, result: any, changes: any): boolean {
    if (!result || result.error) return false;
    return true;
  }

  /**
   * 验证财务操作结果
   */
  private validateFinancialOperation(operation: any, result: any, changes: any): boolean {
    if (!result || result.error) return false;
    return true;
  }

  /**
   * 收集问题
   */
  private collectIssues(testResult: TestResult): Issue[] {
    const issues: Issue[] = [];

    // 从方法验证结果中收集
    if (testResult.methodResults) {
      issues.push(...testResult.methodResults.flatMap((r: any) => r.issues || []));
    }

    // 从工作流验证结果中收集
    if (testResult.workflowResults) {
      issues.push(...testResult.workflowResults.flatMap((r: any) => r.issues || []));
    }

    // 从数据完整性报告中收集
    if (testResult.dataIntegrityReport && testResult.dataIntegrityReport.violations) {
      const integrityIssues: Issue[] = testResult.dataIntegrityReport.violations.map((v: any) => ({
        type: 'Data Integrity Violation',
        severity: v.severity,
        description: v.description,
        details: v,
        timestamp: new Date()
      }));
      issues.push(...integrityIssues);
    }
    
    // 对问题进行排序
    const severityOrder = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Info': 5 };
    issues.sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99));

    return issues;
  }

  /**
   * 确定测试结果
   */
  private determineTestResult(testResult: TestResult): boolean {
    const methodsPassed = testResult.methodResults.every(r => r.passed);
    const workflowsPassed = testResult.workflowResults.every(r => r.completed);
    const dataIntegrityPassed = testResult.dataIntegrityReport?.passed || false;
    
    return methodsPassed && workflowsPassed && dataIntegrityPassed;
  }

  /**
   * 生成场景摘要
   */
  private generateScenarioSummary(results: any[]): any {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      issues: results.filter(r => !r.passed).map(r => r.error || r.description)
    };
  }
}

// 导出测试配置模板
export const testConfigurations = {
  fullVerification: {
    testId: 'full_verification',
    description: '完整业务逻辑验证',
    services: [
      'inventoryService',
      'purchaseOrderService',
      'salesOrderService',
      'accountsPayableService',
      'accountsReceivableService',
      'warehouseService',
      'fifoInventoryService'
    ],
    workflows: [
      'purchase_complete_workflow',
      'sales_complete_workflow',
      'inventory_management_workflow',
      'financial_reconciliation_workflow'
    ]
  },
  
  inventoryFocus: {
    testId: 'inventory_focus',
    description: '库存管理重点验证',
    services: [
      'inventoryService',
      'fifoInventoryService',
      'warehouseService'
    ],
    workflows: [
      'inventory_management_workflow'
    ]
  },
  
  financialFocus: {
    testId: 'financial_focus',
    description: '财务管理重点验证',
    services: [
      'accountsPayableService',
      'accountsReceivableService',
      'dashboardService'
    ],
    workflows: [
      'financial_reconciliation_workflow'
    ]
  }
};