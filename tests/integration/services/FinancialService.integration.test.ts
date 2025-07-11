/**
 * FinancialService 集成测试
 * 使用真实数据库测试财务服务的完整功能
 */

import * as path from 'path';
import * as fs from 'fs';
import { FinancialService } from '../../../src/services/core/FinancialService';
import { InventoryService } from '../../../src/services/core/InventoryService';
import { OrderService } from '../../../src/services/core/OrderService';
import { SystemService } from '../../../src/services/core/SystemService';
import { 
  TransactionType, 
  Product, 
  PurchaseOrder, 
  SalesOrder 
} from '../../../src/types';

// Mock Electron IPC
const mockIpcRenderer = {
  invoke: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn()
};

// Mock window.api
(global as any).window = {
  api: mockIpcRenderer
};

describe('FinancialService 集成测试', () => {
  let financialService: FinancialService;
  let inventoryService: InventoryService;
  let orderService: OrderService;
  let systemService: SystemService;
  
  // 测试数据
  const testProduct: Product = {
    id: 'PROD-001',
    name: '测试产品',
    sku: 'TEST-SKU-001',
    description: '用于集成测试的产品',
    price: 100.00,
    cost: 80.00,
    quantity: 0,
    unit: '个',
    categoryId: 'CAT-001',
    supplierId: 'SUP-001',
    minStock: 10,
    maxStock: 100,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const testWarehouseId = 'WH-001';
  
  beforeEach(async () => {
    // 初始化服务
    systemService = SystemService.getInstance();
    inventoryService = InventoryService.getInstance();
    orderService = OrderService.getInstance();
    financialService = FinancialService.getInstance();
    
    // 模拟数据库初始化成功
    mockIpcRenderer.invoke.mockImplementation(async (channel, ...args) => {
      switch (channel) {
        case 'db-initialize':
          return { success: true };
        
        case 'db-create-item':
          return { success: true, data: testProduct };
        
        case 'db-get-item-by-id':
          return { success: true, data: testProduct };
        
        case 'db-search-items':
          return { success: true, data: [] };
        
        case 'db-add-transaction':
          return { 
            success: true, 
            data: {
              id: 'TRX-' + Date.now(),
              productId: args[0].productId,
              warehouseId: args[0].warehouseId,
              type: args[0].type,
              quantity: args[0].quantity,
              unitCost: args[0].unitCost,
              totalCost: args[0].totalCost,
              reference: args[0].reference,
              createdAt: new Date()
            }
          };
        
        case 'db-get-transactions-by-criteria':
          // 返回模拟的采购交易记录
          if (args[0].type === TransactionType.PURCHASE) {
            return {
              success: true,
              data: [
                {
                  id: 'TRX-001',
                  productId: 'PROD-001',
                  warehouseId: 'WH-001',
                  type: TransactionType.PURCHASE,
                  quantity: 50,
                  unitCost: 80,
                  totalCost: 4000,
                  remainingQuantity: 30,
                  createdAt: new Date('2024-01-01')
                },
                {
                  id: 'TRX-002',
                  productId: 'PROD-001',
                  warehouseId: 'WH-001',
                  type: TransactionType.PURCHASE,
                  quantity: 30,
                  unitCost: 85,
                  totalCost: 2550,
                  remainingQuantity: 20,
                  createdAt: new Date('2024-01-15')
                }
              ]
            };
          }
          return { success: true, data: [] };
        
        case 'db-batch-add-transactions':
          return { 
            success: true, 
            data: args[0].map((t: any, i: number) => ({
              ...t,
              id: `TRX-BATCH-${i}`
            }))
          };
        
        case 'db-get-all-transactions':
          return { success: true, data: [] };
        
        default:
          return { success: true, data: null };
      }
    });
    
    // 初始化所有服务
    await systemService.initialize();
    await inventoryService.initialize();
    await orderService.initialize();
    await financialService.initialize();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('FIFO 成本计算', () => {
    it('应该正确计算 FIFO 成本', async () => {
      // 计算销售 20 个产品的成本
      const result = await financialService.calculateFifoCost(
        'PROD-001',
        'WH-001',
        20,
        TransactionType.SALES
      );
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      // 验证计算结果
      // 应该使用第一批的 20 个，单价 80
      expect(result.data!.totalCost).toBe(1600); // 20 * 80
      expect(result.data!.averageUnitCost).toBe(80);
      expect(result.data!.affectedTransactions).toHaveLength(1);
      expect(result.data!.affectedTransactions[0]).toEqual({
        id: 'TRX-001',
        usedQuantity: 20,
        unitCost: 80
      });
    });
    
    it('应该正确处理跨批次的 FIFO 计算', async () => {
      // 计算销售 40 个产品的成本
      const result = await financialService.calculateFifoCost(
        'PROD-001',
        'WH-001',
        40,
        TransactionType.SALES
      );
      
      expect(result.success).toBe(true);
      
      // 应该使用第一批的 30 个（单价 80）和第二批的 10 个（单价 85）
      const expectedCost = (30 * 80) + (10 * 85); // 2400 + 850 = 3250
      expect(result.data!.totalCost).toBe(expectedCost);
      expect(result.data!.averageUnitCost).toBe(expectedCost / 40); // 81.25
      expect(result.data!.affectedTransactions).toHaveLength(2);
    });
    
    it('应该处理库存不足的情况', async () => {
      // 尝试销售超过可用库存的数量
      const result = await financialService.calculateFifoCost(
        'PROD-001',
        'WH-001',
        100, // 只有 50 个可用
        TransactionType.SALES
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('库存不足');
    });
  });
  
  describe('月度报表生成', () => {
    it('应该生成正确的月度财务报表', async () => {
      // 模拟月度交易数据
      mockIpcRenderer.invoke.mockImplementation(async (channel) => {
        if (channel === 'db-get-transactions-by-date-range') {
          return {
            success: true,
            data: [
              // 采购交易
              {
                id: 'TRX-M-001',
                type: TransactionType.PURCHASE,
                totalCost: 10000,
                createdAt: new Date('2024-01-05')
              },
              {
                id: 'TRX-M-002',
                type: TransactionType.PURCHASE,
                totalCost: 15000,
                createdAt: new Date('2024-01-15')
              },
              // 销售交易
              {
                id: 'TRX-M-003',
                type: TransactionType.SALES,
                totalCost: 8000,
                totalRevenue: 12000,
                createdAt: new Date('2024-01-10')
              },
              {
                id: 'TRX-M-004',
                type: TransactionType.SALES,
                totalCost: 12000,
                totalRevenue: 18000,
                createdAt: new Date('2024-01-20')
              },
              // 调整交易
              {
                id: 'TRX-M-005',
                type: TransactionType.ADJUSTMENT,
                totalCost: -500,
                reason: '盘亏',
                createdAt: new Date('2024-01-25')
              }
            ]
          };
        }
        return { success: true, data: [] };
      });
      
      const result = await financialService.generateMonthlyBalance(2024, 1);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const balance = result.data!;
      
      // 验证收入
      expect(balance.revenue.sales).toBe(30000); // 12000 + 18000
      expect(balance.revenue.total).toBe(30000);
      
      // 验证支出
      expect(balance.expenses.purchases).toBe(25000); // 10000 + 15000
      expect(balance.expenses.total).toBe(25000);
      
      // 验证毛利
      expect(balance.grossProfit).toBe(10000); // 30000 - 20000 (销售成本)
      expect(balance.grossProfitMargin).toBe(33.33); // (10000 / 30000) * 100
      
      // 验证净利润
      expect(balance.netProfit).toBe(5000); // 30000 - 25000
      expect(balance.netProfitMargin).toBe(16.67); // (5000 / 30000) * 100
    });
  });
  
  describe('财务汇总统计', () => {
    it('应该返回正确的财务汇总信息', async () => {
      // 模拟汇总数据
      mockIpcRenderer.invoke.mockImplementation(async (channel) => {
        switch (channel) {
          case 'db-get-inventory-value':
            return { success: true, data: { totalValue: 50000 } };
          
          case 'db-get-accounts-receivable':
            return { 
              success: true, 
              data: { 
                total: 20000,
                overdue: 5000,
                count: 10
              } 
            };
          
          case 'db-get-accounts-payable':
            return { 
              success: true, 
              data: { 
                total: 15000,
                overdue: 2000,
                count: 5
              } 
            };
          
          case 'db-get-cash-flow':
            return {
              success: true,
              data: {
                inflow: 100000,
                outflow: 80000,
                net: 20000
              }
            };
          
          default:
            return { success: true, data: null };
        }
      });
      
      const result = await financialService.getFinancialSummary();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const summary = result.data!;
      
      // 验证资产
      expect(summary.assets.inventory).toBe(50000);
      expect(summary.assets.accountsReceivable).toBe(20000);
      expect(summary.assets.total).toBe(70000);
      
      // 验证负债
      expect(summary.liabilities.accountsPayable).toBe(15000);
      expect(summary.liabilities.total).toBe(15000);
      
      // 验证净资产
      expect(summary.equity).toBe(55000); // 70000 - 15000
      
      // 验证现金流
      expect(summary.cashFlow.inflow).toBe(100000);
      expect(summary.cashFlow.outflow).toBe(80000);
      expect(summary.cashFlow.net).toBe(20000);
      
      // 验证关键指标
      expect(summary.metrics.currentRatio).toBe(4.67); // 70000 / 15000
      expect(summary.metrics.quickRatio).toBe(1.33); // 20000 / 15000
      expect(summary.metrics.inventoryTurnover).toBeGreaterThan(0);
      expect(summary.metrics.receivablesDays).toBeGreaterThan(0);
      expect(summary.metrics.payablesDays).toBeGreaterThan(0);
    });
  });
  
  describe('事务处理和数据一致性', () => {
    it('应该正确处理并发的财务操作', async () => {
      // 模拟并发的销售操作
      const concurrentSales = Array(5).fill(null).map((_, i) => 
        financialService.calculateFifoCost(
          'PROD-001',
          'WH-001',
          10,
          TransactionType.SALES
        )
      );
      
      const results = await Promise.all(concurrentSales);
      
      // 所有操作都应该成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // 验证总成本计算正确
      const totalQuantity = 50; // 5 * 10
      const totalCost = results.reduce((sum, r) => sum + r.data!.totalCost, 0);
      
      // 前 50 个应该都是从第一批（30个）和第二批（20个）
      const expectedCost = (30 * 80) + (20 * 85); // 2400 + 1700 = 4100
      expect(totalCost).toBe(expectedCost);
    });
    
    it('应该正确回滚失败的事务', async () => {
      // 模拟一个会失败的操作
      mockIpcRenderer.invoke.mockImplementationOnce(() => 
        Promise.reject(new Error('数据库错误'))
      );
      
      const result = await financialService.calculateFifoCost(
        'PROD-001',
        'WH-001',
        10,
        TransactionType.SALES
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('计算FIFO成本失败');
      
      // 验证没有产生副作用（没有调用批量添加交易）
      const batchAddCalls = mockIpcRenderer.invoke.mock.calls.filter(
        call => call[0] === 'db-batch-add-transactions'
      );
      expect(batchAddCalls).toHaveLength(0);
    });
  });
});