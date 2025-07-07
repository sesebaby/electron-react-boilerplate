/**
 * 工作流验证器
 * 用于验证端到端业务工作流的正确性
 */

export interface WorkflowStep {
  step: string;
  service: string;
  method: string;
  params?: any[];
  expectedResult?: any;
  dataValidation?: (result: any, context: any) => boolean;
  errorHandling?: (error: any, context: any) => boolean;
}

export interface WorkflowContext {
  workflowId: string;
  testData: any;
  stepResults: Map<string, any>;
  globalState: any;
}

export interface WorkflowVerificationResult {
  workflow: string;
  workflowId: string;
  completed: boolean;
  steps: WorkflowStepResult[];
  dataIntegrity: any;
  totalExecutionTime: number;
  summary: {
    stepsTotal: number;
    stepsPassed: number;
    stepsFailed: number;
    successRate: number;
  };
}

export interface WorkflowStepResult {
  step: string;
  service: string;
  method: string;
  passed: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  dataChanges?: any;
  validationResults?: any;
}

export class WorkflowVerifier {
  private workflows: Map<string, WorkflowStep[]> = new Map();
  
  constructor() {
    this.initializeWorkflows();
  }

  /**
   * 验证工作流
   */
  async verifyWorkflow(
    workflowName: string,
    testData: any,
    customSteps?: WorkflowStep[]
  ): Promise<WorkflowVerificationResult> {
    const workflowId = `${workflowName}_${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`[WorkflowVerifier] 开始验证工作流: ${workflowName} (${workflowId})`);
    
    const steps = customSteps || this.workflows.get(workflowName);
    if (!steps) {
      throw new Error(`工作流 ${workflowName} 未找到`);
    }

    const context: WorkflowContext = {
      workflowId,
      testData,
      stepResults: new Map(),
      globalState: {}
    };

    const stepResults: WorkflowStepResult[] = [];
    let completed = true;

    // 执行每个步骤
    for (const step of steps) {
      const stepResult = await this.executeWorkflowStep(step, context);
      stepResults.push(stepResult);
      
      // 保存步骤结果到上下文
      context.stepResults.set(step.step, stepResult.result);
      
      // 如果步骤失败，停止工作流（除非有错误处理）
      if (!stepResult.passed) {
        if (step.errorHandling) {
          const shouldContinue = step.errorHandling(stepResult.error, context);
          if (!shouldContinue) {
            completed = false;
            break;
          }
        } else {
          completed = false;
          break;
        }
      }
    }

    const totalExecutionTime = Date.now() - startTime;
    const stepsPassed = stepResults.filter(r => r.passed).length;
    const stepsFailed = stepResults.length - stepsPassed;

    // 验证数据完整性
    const dataIntegrity = await this.verifyWorkflowDataIntegrity(workflowName, context, stepResults);

    const result: WorkflowVerificationResult = {
      workflow: workflowName,
      workflowId,
      completed: completed && dataIntegrity.passed,
      steps: stepResults,
      dataIntegrity,
      totalExecutionTime,
      summary: {
        stepsTotal: stepResults.length,
        stepsPassed,
        stepsFailed,
        successRate: (stepsPassed / stepResults.length) * 100
      }
    };

    console.log(`[WorkflowVerifier] 工作流验证完成: ${workflowName} - ${result.completed ? '成功' : '失败'}`);
    return result;
  }

  /**
   * 执行工作流步骤
   */
  private async executeWorkflowStep(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<WorkflowStepResult> {
    const startTime = Date.now();
    
    console.log(`[WorkflowVerifier] 执行步骤: ${step.step}`);
    
    try {
      // 准备参数（可能依赖于之前步骤的结果）
      const params = this.prepareStepParams(step, context);
      
      // 执行步骤
      const result = await this.executeStep(step.service, step.method, params);
      const executionTime = Date.now() - startTime;
      
      // 验证结果
      let passed = true;
      let validationResults = {};
      
      // 预期结果验证
      if (step.expectedResult !== undefined) {
        passed = this.compareResults(result, step.expectedResult);
      }
      
      // 数据验证
      if (passed && step.dataValidation) {
        passed = step.dataValidation(result, context);
        validationResults = { dataValidation: passed };
      }
      
      // 业务规则验证
      const businessValidation = await this.validateBusinessRules(step, result, context);
      if (!businessValidation.passed) {
        passed = false;
        validationResults = { ...validationResults, businessValidation };
      }

      return {
        step: step.step,
        service: step.service,
        method: step.method,
        passed,
        result,
        executionTime,
        validationResults
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        step: step.step,
        service: step.service,
        method: step.method,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime
      };
    }
  }

  /**
   * 准备步骤参数
   */
  private prepareStepParams(step: WorkflowStep, context: WorkflowContext): any[] {
    if (!step.params) {
      return [];
    }

    return step.params.map(param => {
      // 如果参数是字符串且以$开头，则从上下文中获取值
      if (typeof param === 'string' && param.startsWith('$')) {
        const key = param.substring(1);
        if (key.includes('.')) {
          // 支持嵌套属性访问，如 $previousStep.result.id
          return this.getNestedValue(context, key);
        } else {
          return context.stepResults.get(key) || context.globalState[key];
        }
      }
      return param;
    });
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(context: WorkflowContext, path: string): any {
    const parts = path.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (part === 'stepResults') {
        value = context.stepResults;
      } else if (part === 'globalState') {
        value = context.globalState;
      } else if (part === 'testData') {
        value = context.testData;
      } else if (value instanceof Map) {
        value = value.get(part);
      } else {
        value = value[part];
      }
      
      if (value === undefined) {
        break;
      }
    }
    
    return value;
  }

  /**
   * 执行步骤
   */
  private async executeStep(serviceName: string, methodName: string, params: any[]): Promise<any> {
    // 这里应该根据服务名获取实际的服务实例并调用方法
    // 为了演示，这里使用模拟实现
    
    console.log(`执行 ${serviceName}.${methodName} with params:`, params);
    
    // 模拟不同服务的不同行为
    switch (serviceName) {
      case 'purchaseOrderService':
        if (methodName === 'createPurchaseOrder') {
          return { id: Math.floor(Math.random() * 1000), order_number: `PO${Date.now()}`, success: true };
        }
        break;
        
      case 'purchaseReceiptService':
        if (methodName === 'createReceipt') {
          return { id: Math.floor(Math.random() * 1000), receipt_number: `REC${Date.now()}`, success: true };
        }
        break;
        
      case 'inventoryService':
        if (methodName === 'updateFromReceipt') {
          return { success: true, updatedItems: params[1] || [] };
        }
        if (methodName === 'reserveStock') {
          return { success: true, reservedQuantity: params[1] };
        }
        if (methodName === 'updateFromDelivery') {
          return { success: true, updatedItems: params[1] || [] };
        }
        break;
        
      case 'accountsPayableService':
        if (methodName === 'createPayable') {
          return { id: Math.floor(Math.random() * 1000), total_amount: 1000, success: true };
        }
        if (methodName === 'processPayment') {
          return { success: true, paidAmount: params[1] };
        }
        break;
        
      case 'salesOrderService':
        if (methodName === 'createSalesOrder') {
          return { id: Math.floor(Math.random() * 1000), order_number: `SO${Date.now()}`, success: true };
        }
        break;
        
      case 'salesDeliveryService':
        if (methodName === 'createDelivery') {
          return { id: Math.floor(Math.random() * 1000), delivery_number: `DEL${Date.now()}`, success: true };
        }
        break;
        
      case 'accountsReceivableService':
        if (methodName === 'createReceivable') {
          return { id: Math.floor(Math.random() * 1000), total_amount: 500, success: true };
        }
        if (methodName === 'processReceipt') {
          return { success: true, receivedAmount: params[1] };
        }
        break;
    }
    
    // 默认返回成功结果
    return { success: true };
  }

  /**
   * 比较结果
   */
  private compareResults(actual: any, expected: any): boolean {
    if (typeof expected === 'object' && expected !== null) {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return actual === expected;
  }

  /**
   * 验证业务规则
   */
  private async validateBusinessRules(
    step: WorkflowStep,
    result: any,
    context: WorkflowContext
  ): Promise<any> {
    const violations = [];
    
    // 根据步骤类型验证相应的业务规则
    switch (step.step) {
      case 'create_purchase_order':
        if (!result.id || !result.order_number) {
          violations.push('采购订单必须有ID和订单号');
        }
        break;
        
      case 'create_receipt':
        if (!result.success) {
          violations.push('收货处理必须成功');
        }
        break;
        
      case 'update_inventory':
        if (!result.success) {
          violations.push('库存更新必须成功');
        }
        break;
        
      case 'create_payable':
        if (!result.total_amount || result.total_amount <= 0) {
          violations.push('应付账款金额必须大于0');
        }
        break;
        
      case 'create_sales_order':
        if (!result.id || !result.order_number) {
          violations.push('销售订单必须有ID和订单号');
        }
        break;
        
      case 'reserve_stock':
        if (!result.success) {
          violations.push('库存预留必须成功');
        }
        break;
        
      case 'create_delivery':
        if (!result.success) {
          violations.push('发货处理必须成功');
        }
        break;
        
      case 'create_receivable':
        if (!result.total_amount || result.total_amount <= 0) {
          violations.push('应收账款金额必须大于0');
        }
        break;
    }
    
    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * 验证工作流数据完整性
   */
  private async verifyWorkflowDataIntegrity(
    workflowName: string,
    context: WorkflowContext,
    stepResults: WorkflowStepResult[]
  ): Promise<any> {
    const integrityIssues = [];
    
    // 根据工作流类型验证数据完整性
    switch (workflowName) {
      case 'purchase_complete_workflow':
        integrityIssues.push(...await this.verifyPurchaseWorkflowIntegrity(context, stepResults));
        break;
        
      case 'sales_complete_workflow':
        integrityIssues.push(...await this.verifySalesWorkflowIntegrity(context, stepResults));
        break;
        
      case 'inventory_management_workflow':
        integrityIssues.push(...await this.verifyInventoryWorkflowIntegrity(context, stepResults));
        break;
        
      case 'financial_reconciliation_workflow':
        integrityIssues.push(...await this.verifyFinancialWorkflowIntegrity(context, stepResults));
        break;
    }
    
    return {
      passed: integrityIssues.length === 0,
      issues: integrityIssues,
      summary: {
        totalIssues: integrityIssues.length,
        criticalIssues: integrityIssues.filter(i => i.severity === 'Critical').length
      }
    };
  }

  /**
   * 验证采购工作流完整性
   */
  private async verifyPurchaseWorkflowIntegrity(
    context: WorkflowContext,
    stepResults: WorkflowStepResult[]
  ): Promise<any[]> {
    const issues: any[] = [];
    
    // 检查采购订单创建
    const orderCreation = stepResults.find(s => s.step === 'create_purchase_order');
    if (orderCreation && !orderCreation.result?.id) {
      issues.push({
        type: 'Missing Purchase Order ID',
        severity: 'Critical',
        description: '采购订单创建后缺少订单ID'
      });
    }
    
    // 检查收货单创建
    const receiptCreation = stepResults.find(s => s.step === 'create_receipt');
    if (receiptCreation && !receiptCreation.result?.success) {
      issues.push({
        type: 'Receipt Creation Failed',
        severity: 'High',
        description: '收货单创建失败'
      });
    }
    
    // 检查应付账款创建
    const payableCreation = stepResults.find(s => s.step === 'create_payable');
    if (payableCreation && !payableCreation.result?.total_amount) {
      issues.push({
        type: 'Missing Payable Amount',
        severity: 'High',
        description: '应付账款缺少总金额'
      });
    }
    
    return issues;
  }

  /**
   * 验证销售工作流完整性
   */
  private async verifySalesWorkflowIntegrity(
    context: WorkflowContext,
    stepResults: WorkflowStepResult[]
  ): Promise<any[]> {
    const issues: any[] = [];
    
    // 检查销售订单创建
    const orderCreation = stepResults.find(s => s.step === 'create_sales_order');
    if (orderCreation && !orderCreation.result?.id) {
      issues.push({
        type: 'Missing Sales Order ID',
        severity: 'Critical',
        description: '销售订单创建后缺少订单ID'
      });
    }
    
    // 检查库存预留
    const stockReservation = stepResults.find(s => s.step === 'reserve_stock');
    if (stockReservation && !stockReservation.result?.success) {
      issues.push({
        type: 'Stock Reservation Failed',
        severity: 'High',
        description: '库存预留失败'
      });
    }
    
    // 检查应收账款创建
    const receivableCreation = stepResults.find(s => s.step === 'create_receivable');
    if (receivableCreation && !receivableCreation.result?.total_amount) {
      issues.push({
        type: 'Missing Receivable Amount',
        severity: 'High',
        description: '应收账款缺少总金额'
      });
    }
    
    return issues;
  }

  /**
   * 验证库存工作流完整性
   */
  private async verifyInventoryWorkflowIntegrity(
    context: WorkflowContext,
    stepResults: WorkflowStepResult[]
  ): Promise<any[]> {
    const issues: any[] = [];
    
    // 检查库存更新操作
    const inventoryUpdates = stepResults.filter(s => s.step.includes('inventory'));
    inventoryUpdates.forEach(update => {
      if (!update.result?.success) {
        issues.push({
          type: 'Inventory Update Failed',
          severity: 'High',
          description: `库存更新操作失败: ${update.step}`
        });
      }
    });
    
    return issues;
  }

  /**
   * 验证财务工作流完整性
   */
  private async verifyFinancialWorkflowIntegrity(
    context: WorkflowContext,
    stepResults: WorkflowStepResult[]
  ): Promise<any[]> {
    const issues: any[] = [];
    
    // 检查财务操作
    const financialSteps = stepResults.filter(s => 
      s.step.includes('payable') || s.step.includes('receivable') || s.step.includes('payment') || s.step.includes('receipt')
    );
    
    financialSteps.forEach(step => {
      if (!step.result?.success && !step.result?.total_amount) {
        issues.push({
          type: 'Financial Operation Failed',
          severity: 'Critical',
          description: `财务操作失败: ${step.step}`
        });
      }
    });
    
    return issues;
  }

  /**
   * 初始化工作流定义
   */
  private initializeWorkflows(): void {
    // 完整采购工作流
    this.workflows.set('purchase_complete_workflow', [
      {
        step: 'create_purchase_order',
        service: 'purchaseOrderService',
        method: 'createPurchaseOrder',
        params: ['$testData.purchaseOrderData'],
        dataValidation: (result) => result && result.id && result.order_number
      },
      {
        step: 'create_receipt',
        service: 'purchaseReceiptService',
        method: 'createReceipt',
        params: ['$create_purchase_order.id'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'update_inventory',
        service: 'inventoryService',
        method: 'updateFromReceipt',
        params: ['$create_receipt.id'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'create_payable',
        service: 'accountsPayableService',
        method: 'createPayable',
        params: ['$create_purchase_order.id'],
        dataValidation: (result) => result && result.total_amount > 0
      },
      {
        step: 'process_payment',
        service: 'accountsPayableService',
        method: 'processPayment',
        params: ['$create_payable.id', 1000],
        dataValidation: (result) => result && result.success
      }
    ]);

    // 完整销售工作流
    this.workflows.set('sales_complete_workflow', [
      {
        step: 'create_sales_order',
        service: 'salesOrderService',
        method: 'createSalesOrder',
        params: ['$testData.salesOrderData'],
        dataValidation: (result) => result && result.id && result.order_number
      },
      {
        step: 'reserve_stock',
        service: 'inventoryService',
        method: 'reserveStock',
        params: ['$testData.productId', '$testData.quantity'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'create_delivery',
        service: 'salesDeliveryService',
        method: 'createDelivery',
        params: ['$create_sales_order.id'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'update_inventory',
        service: 'inventoryService',
        method: 'updateFromDelivery',
        params: ['$create_delivery.id'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'create_receivable',
        service: 'accountsReceivableService',
        method: 'createReceivable',
        params: ['$create_sales_order.id'],
        dataValidation: (result) => result && result.total_amount > 0
      },
      {
        step: 'process_receipt',
        service: 'accountsReceivableService',
        method: 'processReceipt',
        params: ['$create_receivable.id', 500],
        dataValidation: (result) => result && result.success
      }
    ]);

    // 库存管理工作流
    this.workflows.set('inventory_management_workflow', [
      {
        step: 'stock_in',
        service: 'inventoryService',
        method: 'stockIn',
        params: ['$testData.productId', '$testData.quantity'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'stock_out',
        service: 'inventoryService',
        method: 'stockOut',
        params: ['$testData.productId', '$testData.outQuantity'],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'stock_transfer',
        service: 'warehouseService',
        method: 'transferStock',
        params: ['$testData.productId', '$testData.fromWarehouse', '$testData.toWarehouse', '$testData.transferQuantity'],
        dataValidation: (result) => result && result.success
      }
    ]);

    // 财务对账工作流
    this.workflows.set('financial_reconciliation_workflow', [
      {
        step: 'calculate_ap_balance',
        service: 'accountsPayableService',
        method: 'calculateBalance',
        params: [],
        dataValidation: (result) => typeof result === 'number'
      },
      {
        step: 'calculate_ar_balance',
        service: 'accountsReceivableService',
        method: 'calculateBalance',
        params: [],
        dataValidation: (result) => typeof result === 'number'
      },
      {
        step: 'reconcile_payments',
        service: 'accountsPayableService',
        method: 'reconcilePayments',
        params: [],
        dataValidation: (result) => result && result.success
      },
      {
        step: 'reconcile_receipts',
        service: 'accountsReceivableService',
        method: 'reconcileReceipts',
        params: [],
        dataValidation: (result) => result && result.success
      }
    ]);
  }
}