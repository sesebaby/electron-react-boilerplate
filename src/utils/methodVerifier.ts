/**
 * 方法验证器
 * 用于验证业务服务方法的正确性
 */

export interface MethodTestCase {
  id: string;
  description: string;
  params: any[];
  expectedResult?: any;
  expectedError?: string;
  preconditions?: () => Promise<void>;
  postconditions?: (result: any) => Promise<boolean>;
}

export interface MethodVerificationResult {
  service: string;
  method: string;
  testCase: string;
  passed: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  dataChanges?: any;
  businessRuleChecks?: any;
}

export class MethodVerifier {
  private services: Map<string, any> = new Map();
  
  constructor() {
    this.initializeServices();
  }

  /**
   * 验证服务的所有方法
   */
  async verifyService(serviceName: string, testData: any): Promise<MethodVerificationResult[]> {
    console.log(`[MethodVerifier] 验证服务: ${serviceName}`);
    
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`服务 ${serviceName} 未找到`);
    }

    const results: MethodVerificationResult[] = [];
    const testCases = this.generateTestCases(serviceName, testData);
    
    for (const [methodName, cases] of testCases.entries()) {
      for (const testCase of cases) {
        const result = await this.verifyMethod(service, serviceName, methodName, testCase);
        results.push(result);
      }
    }
    
    return results;
  }

  /**
   * 验证单个方法
   */
  async verifyMethod(
    service: any,
    serviceName: string,
    methodName: string,
    testCase: MethodTestCase
  ): Promise<MethodVerificationResult> {
    const startTime = Date.now();
    
    console.log(`[MethodVerifier] 验证方法: ${serviceName}.${methodName} (${testCase.id})`);
    
    try {
      // 执行前置条件
      if (testCase.preconditions) {
        await testCase.preconditions();
      }
      
      // 执行方法
      const result = await service[methodName](...testCase.params);
      const executionTime = Date.now() - startTime;
      
      // 验证结果
      let passed = true;
      let errorMessage = '';
      
      // 检查预期结果
      if (testCase.expectedResult !== undefined) {
        passed = this.compareResults(result, testCase.expectedResult);
        if (!passed) {
          errorMessage = `结果不匹配。预期: ${JSON.stringify(testCase.expectedResult)}, 实际: ${JSON.stringify(result)}`;
        }
      }
      
      // 执行后置条件
      if (passed && testCase.postconditions) {
        passed = await testCase.postconditions(result);
        if (!passed) {
          errorMessage = '后置条件验证失败';
        }
      }
      
      // 执行业务规则检查
      const businessRuleChecks = await this.checkBusinessRules(serviceName, methodName, testCase.params, result);
      if (!businessRuleChecks.passed) {
        passed = false;
        errorMessage = `业务规则违反: ${businessRuleChecks.violations.join(', ')}`;
      }
      
      return {
        service: serviceName,
        method: methodName,
        testCase: testCase.id,
        passed,
        result,
        error: errorMessage || undefined,
        executionTime,
        businessRuleChecks
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // 检查是否是预期的错误
      if (testCase.expectedError) {
        const passed = errorMessage.includes(testCase.expectedError);
        return {
          service: serviceName,
          method: methodName,
          testCase: testCase.id,
          passed,
          error: passed ? undefined : `预期错误不匹配。预期: ${testCase.expectedError}, 实际: ${errorMessage}`,
          executionTime
        };
      }
      
      return {
        service: serviceName,
        method: methodName,
        testCase: testCase.id,
        passed: false,
        error: errorMessage,
        executionTime
      };
    }
  }

  /**
   * 生成测试用例
   */
  private generateTestCases(serviceName: string, testData: any): Map<string, MethodTestCase[]> {
    const testCases = new Map<string, MethodTestCase[]>();
    
    switch (serviceName) {
      case 'inventoryService':
        testCases.set('getInventoryItems', this.generateInventoryTestCases(testData));
        testCases.set('updateInventoryItem', this.generateInventoryUpdateTestCases(testData));
        testCases.set('calculateAvailableStock', this.generateStockCalculationTestCases(testData));
        break;
        
      case 'fifoInventoryService':
        testCases.set('calculateFifoConsumption', this.generateFifoCalculationTestCases(testData));
        testCases.set('updateFifoQueue', this.generateFifoUpdateTestCases(testData));
        break;
        
      case 'purchaseOrderService':
        testCases.set('createPurchaseOrder', this.generatePurchaseOrderCreationTestCases(testData));
        testCases.set('updateOrderStatus', this.generateOrderStatusUpdateTestCases(testData));
        break;
        
      case 'salesOrderService':
        testCases.set('createSalesOrder', this.generateSalesOrderCreationTestCases(testData));
        testCases.set('reserveStock', this.generateStockReservationTestCases(testData));
        break;
        
      case 'accountsPayableService':
        testCases.set('createPayable', this.generatePayableCreationTestCases(testData));
        testCases.set('processPayment', this.generatePaymentProcessingTestCases(testData));
        break;
        
      case 'accountsReceivableService':
        testCases.set('createReceivable', this.generateReceivableCreationTestCases(testData));
        testCases.set('processReceipt', this.generateReceiptProcessingTestCases(testData));
        break;
        
      case 'warehouseService':
        testCases.set('transferStock', this.generateStockTransferTestCases(testData));
        testCases.set('getWarehouseStock', this.generateWarehouseStockTestCases(testData));
        break;
    }
    
    return testCases;
  }

  /**
   * 生成库存服务测试用例
   */
  private generateInventoryTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'inventory_get_all',
        description: '获取所有库存项目',
        params: [],
        postconditions: async (result) => {
          return Array.isArray(result) && result.length >= 0;
        }
      },
      {
        id: 'inventory_get_by_product',
        description: '根据产品ID获取库存',
        params: [testData.products[0]?.id],
        postconditions: async (result) => {
          return Array.isArray(result);
        }
      },
      {
        id: 'inventory_get_invalid_product',
        description: '获取不存在产品的库存',
        params: [99999],
        expectedResult: []
      }
    ];
  }

  /**
   * 生成库存更新测试用例
   */
  private generateInventoryUpdateTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'inventory_update_valid',
        description: '更新有效库存项目',
        params: [testData.inventoryStocks[0]?.id, { stock_quantity: 100 }],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'inventory_update_negative_stock',
        description: '尝试设置负库存',
        params: [testData.inventoryStocks[0]?.id, { stock_quantity: -10 }],
        expectedError: '库存数量不能为负数'
      }
    ];
  }

  /**
   * 生成库存计算测试用例
   */
  private generateStockCalculationTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'stock_calc_valid_product',
        description: '计算有效产品的可用库存',
        params: [testData.products[0]?.id],
        postconditions: async (result) => {
          return typeof result === 'number' && result >= 0;
        }
      },
      {
        id: 'stock_calc_invalid_product',
        description: '计算无效产品的可用库存',
        params: [99999],
        expectedResult: 0
      }
    ];
  }

  /**
   * 生成FIFO计算测试用例
   */
  private generateFifoCalculationTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'fifo_calc_normal',
        description: '正常FIFO消耗计算',
        params: [testData.products[0]?.id, 10],
        postconditions: async (result) => {
          return result && Array.isArray(result.consumedBatches);
        }
      },
      {
        id: 'fifo_calc_excessive',
        description: '超出库存的FIFO计算',
        params: [testData.products[0]?.id, 99999],
        expectedError: '库存不足'
      }
    ];
  }

  /**
   * 生成FIFO更新测试用例
   */
  private generateFifoUpdateTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'fifo_update_consumption',
        description: '更新FIFO消耗',
        params: [testData.products[0]?.id, 5, 'consumption'],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'fifo_update_addition',
        description: '添加新FIFO批次',
        params: [testData.products[0]?.id, 20, 'addition', { unit_cost: 15.50 }],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      }
    ];
  }

  /**
   * 生成采购订单创建测试用例
   */
  private generatePurchaseOrderCreationTestCases(testData: any): MethodTestCase[] {
    const orderData = {
      supplier_id: testData.suppliers[0]?.id,
      items: [
        {
          product_id: testData.products[0]?.id,
          quantity: 50,
          unit_price: 10.00
        }
      ]
    };

    return [
      {
        id: 'po_create_valid',
        description: '创建有效采购订单',
        params: [orderData],
        postconditions: async (result) => {
          return result && result.id && result.order_number;
        }
      },
      {
        id: 'po_create_invalid_supplier',
        description: '使用无效供应商创建采购订单',
        params: [{ ...orderData, supplier_id: 99999 }],
        expectedError: '供应商不存在'
      }
    ];
  }

  /**
   * 生成订单状态更新测试用例
   */
  private generateOrderStatusUpdateTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'po_status_valid_transition',
        description: '有效的状态转换',
        params: [testData.purchaseOrders[0]?.id, 'approved'],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'po_status_invalid_transition',
        description: '无效的状态转换',
        params: [testData.purchaseOrders[0]?.id, 'invalid_status'],
        expectedError: '无效的状态转换'
      }
    ];
  }

  /**
   * 生成销售订单创建测试用例
   */
  private generateSalesOrderCreationTestCases(testData: any): MethodTestCase[] {
    const orderData = {
      customer_id: testData.customers[0]?.id,
      items: [
        {
          product_id: testData.products[0]?.id,
          quantity: 10,
          unit_price: 25.00
        }
      ]
    };

    return [
      {
        id: 'so_create_valid',
        description: '创建有效销售订单',
        params: [orderData],
        postconditions: async (result) => {
          return result && result.id && result.order_number;
        }
      },
      {
        id: 'so_create_insufficient_stock',
        description: '库存不足的销售订单',
        params: [{
          ...orderData,
          items: [{ ...orderData.items[0], quantity: 99999 }]
        }],
        expectedError: '库存不足'
      }
    ];
  }

  /**
   * 生成库存预留测试用例
   */
  private generateStockReservationTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'stock_reserve_valid',
        description: '有效的库存预留',
        params: [testData.products[0]?.id, 5],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'stock_reserve_excessive',
        description: '超出库存的预留',
        params: [testData.products[0]?.id, 99999],
        expectedError: '预留数量超出可用库存'
      }
    ];
  }

  /**
   * 生成应付账款创建测试用例
   */
  private generatePayableCreationTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'ap_create_valid',
        description: '创建有效应付账款',
        params: [testData.purchaseOrders[0]?.id],
        postconditions: async (result) => {
          return result && result.id && result.total_amount > 0;
        }
      }
    ];
  }

  /**
   * 生成付款处理测试用例
   */
  private generatePaymentProcessingTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'payment_process_valid',
        description: '处理有效付款',
        params: [testData.accountsPayable[0]?.id, 1000],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'payment_process_overpayment',
        description: '超额付款',
        params: [testData.accountsPayable[0]?.id, 999999],
        expectedError: '付款金额超过应付金额'
      }
    ];
  }

  /**
   * 生成应收账款创建测试用例
   */
  private generateReceivableCreationTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'ar_create_valid',
        description: '创建有效应收账款',
        params: [testData.salesOrders[0]?.id],
        postconditions: async (result) => {
          return result && result.id && result.total_amount > 0;
        }
      }
    ];
  }

  /**
   * 生成收款处理测试用例
   */
  private generateReceiptProcessingTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'receipt_process_valid',
        description: '处理有效收款',
        params: [testData.accountsReceivable[0]?.id, 500],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'receipt_process_over_receipt',
        description: '超额收款',
        params: [testData.accountsReceivable[0]?.id, 999999],
        expectedError: '收款金额超过应收金额'
      }
    ];
  }

  /**
   * 生成库存转移测试用例
   */
  private generateStockTransferTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'transfer_valid',
        description: '有效的库存转移',
        params: [
          testData.products[0]?.id,
          testData.warehouses[0]?.id,
          testData.warehouses[1]?.id,
          10
        ],
        postconditions: async (result) => {
          return result && result.success === true;
        }
      },
      {
        id: 'transfer_insufficient_stock',
        description: '库存不足的转移',
        params: [
          testData.products[0]?.id,
          testData.warehouses[0]?.id,
          testData.warehouses[1]?.id,
          99999
        ],
        expectedError: '源仓库库存不足'
      }
    ];
  }

  /**
   * 生成仓库库存查询测试用例
   */
  private generateWarehouseStockTestCases(testData: any): MethodTestCase[] {
    return [
      {
        id: 'warehouse_stock_valid',
        description: '查询有效仓库库存',
        params: [testData.warehouses[0]?.id],
        postconditions: async (result) => {
          return Array.isArray(result);
        }
      },
      {
        id: 'warehouse_stock_invalid',
        description: '查询无效仓库库存',
        params: [99999],
        expectedResult: []
      }
    ];
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
   * 检查业务规则
   */
  private async checkBusinessRules(
    serviceName: string,
    methodName: string,
    params: any[],
    result: any
  ): Promise<any> {
    const violations = [];
    
    // 根据服务和方法检查相应的业务规则
    switch (serviceName) {
      case 'inventoryService':
        if (methodName === 'updateInventoryItem') {
          const updateData = params[1];
          if (updateData.stock_quantity < 0) {
            violations.push('库存数量不能为负数');
          }
        }
        break;
        
      case 'fifoInventoryService':
        if (methodName === 'calculateFifoConsumption') {
          if (result && result.totalCost < 0) {
            violations.push('FIFO总成本不能为负数');
          }
        }
        break;
        
      case 'accountsPayableService':
        if (methodName === 'processPayment') {
          const paymentAmount = params[1];
          if (paymentAmount <= 0) {
            violations.push('付款金额必须大于0');
          }
        }
        break;
        
      case 'accountsReceivableService':
        if (methodName === 'processReceipt') {
          const receiptAmount = params[1];
          if (receiptAmount <= 0) {
            violations.push('收款金额必须大于0');
          }
        }
        break;
    }
    
    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * 初始化服务
   */
  private initializeServices(): void {
    // 这里应该导入并初始化所有需要测试的服务
    // 为了演示，这里使用模拟对象
    
    // 实际实现中，应该这样导入服务：
    // import { inventoryService } from '../services/inventory/inventoryService';
    // this.services.set('inventoryService', inventoryService);
    
    // 模拟服务对象（用于演示）
    this.services.set('inventoryService', this.createMockInventoryService());
    this.services.set('fifoInventoryService', this.createMockFifoService());
    this.services.set('purchaseOrderService', this.createMockPurchaseOrderService());
    this.services.set('salesOrderService', this.createMockSalesOrderService());
    this.services.set('accountsPayableService', this.createMockAccountsPayableService());
    this.services.set('accountsReceivableService', this.createMockAccountsReceivableService());
    this.services.set('warehouseService', this.createMockWarehouseService());
  }

  // 模拟服务对象（实际使用时应该删除这些方法）
  
  private createMockInventoryService() {
    return {
      getInventoryItems: async () => [],
      updateInventoryItem: async (id: number, data: any) => ({ success: true }),
      calculateAvailableStock: async (productId: number) => 100
    };
  }

  private createMockFifoService() {
    return {
      calculateFifoConsumption: async (productId: number, quantity: number) => ({
        consumedBatches: [],
        totalCost: 100
      }),
      updateFifoQueue: async (productId: number, quantity: number, type: string) => ({ success: true })
    };
  }

  private createMockPurchaseOrderService() {
    return {
      createPurchaseOrder: async (orderData: any) => ({ id: 1, order_number: 'PO000001' }),
      updateOrderStatus: async (orderId: number, status: string) => ({ success: true })
    };
  }

  private createMockSalesOrderService() {
    return {
      createSalesOrder: async (orderData: any) => ({ id: 1, order_number: 'SO000001' }),
      reserveStock: async (productId: number, quantity: number) => ({ success: true })
    };
  }

  private createMockAccountsPayableService() {
    return {
      createPayable: async (purchaseOrderId: number) => ({ id: 1, total_amount: 1000 }),
      processPayment: async (payableId: number, amount: number) => ({ success: true })
    };
  }

  private createMockAccountsReceivableService() {
    return {
      createReceivable: async (salesOrderId: number) => ({ id: 1, total_amount: 500 }),
      processReceipt: async (receivableId: number, amount: number) => ({ success: true })
    };
  }

  private createMockWarehouseService() {
    return {
      transferStock: async (productId: number, fromWarehouse: number, toWarehouse: number, quantity: number) => ({ success: true }),
      getWarehouseStock: async (warehouseId: number) => []
    };
  }
}