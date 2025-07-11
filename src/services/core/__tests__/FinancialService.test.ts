/**
 * FinancialService 场景驱动测试
 * 测试场景：财务计算和结算完整流程
 */

import { FinancialService } from '../FinancialService';
import { DatabaseManager } from '../database';
import { 
  AccountsPayable, 
  AccountsReceivable, 
  PayableStatus, 
  ReceivableStatus,
  PaymentStatus,
  InventoryTransaction,
  TransactionType
} from '../../../types/entities';
import { ValidationError, BusinessError } from '../../../utils/errors';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('FinancialService - 财务计算和结算完整流程', () => {
  let financialService: FinancialService;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      createAccountsPayable: jest.fn(),
      updateAccountsPayable: jest.fn(),
      getAccountsPayable: jest.fn(),
      createAccountsReceivable: jest.fn(),
      updateAccountsReceivable: jest.fn(),
      getAccountsReceivable: jest.fn(),
      createPaymentRecord: jest.fn(),
      getInventoryTransactions: jest.fn(),
      updateInventoryCost: jest.fn(),
      calculateFifoCost: jest.fn(),
      generateMonthlyBalance: jest.fn(),
      getFinancialSummary: jest.fn(),
      query: jest.fn(),
      run: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
    financialService = new FinancialService();
  });

  describe('场景1：FIFO成本计算完整流程', () => {
    it('应该正确计算FIFO成本：多次入库后按先进先出原则计算出库成本', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      // 模拟库存交易历史：多次不同价格入库
      const mockTransactions: InventoryTransaction[] = [
        {
          id: 'trans-1',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 100,
          unitCost: 10.00,
          totalCost: 1000.00,
          remainingQuantity: 50, // 已出库50
          transactionDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        },
        {
          id: 'trans-2',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 200,
          unitCost: 12.00,
          totalCost: 2400.00,
          remainingQuantity: 200, // 未出库
          transactionDate: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02')
        },
        {
          id: 'trans-3',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 150,
          unitCost: 15.00,
          totalCost: 2250.00,
          remainingQuantity: 150, // 未出库
          transactionDate: new Date('2024-01-03'),
          createdAt: new Date('2024-01-03'),
          updatedAt: new Date('2024-01-03')
        }
      ];

      mockDb.getInventoryTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      mockDb.updateInventoryCost.mockResolvedValue({ success: true });
      mockDb.calculateFifoCost.mockResolvedValue({ success: true });

      // 出库100个单位，应该按FIFO原则：
      // 先出完第一批剩余的50个(单价10.00) + 第二批的50个(单价12.00)
      const outQuantity = 100;
      const expectedCost = (50 * 10.00) + (50 * 12.00); // 500 + 600 = 1100
      const expectedUnitCost = expectedCost / outQuantity; // 11.00

      const result = await financialService.calculateFifoCost(
        productId, 
        warehouseId, 
        outQuantity,
        TransactionType.OUT
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalCost: expectedCost,
        averageUnitCost: expectedUnitCost,
        affectedTransactions: expect.arrayContaining([
          expect.objectContaining({ id: 'trans-1', usedQuantity: 50 }),
          expect.objectContaining({ id: 'trans-2', usedQuantity: 50 })
        ])
      }));

      expect(mockDb.getInventoryTransactions).toHaveBeenCalledWith({
        productId,
        warehouseId,
        type: TransactionType.IN,
        hasRemaining: true,
        orderBy: 'transactionDate ASC'
      });
    });

    it('应该在库存不足时抛出BusinessError', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      // 模拟库存不足的情况
      const mockTransactions: InventoryTransaction[] = [
        {
          id: 'trans-1',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 50,
          unitCost: 10.00,
          totalCost: 500.00,
          remainingQuantity: 30, // 仅剩30个
          transactionDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockDb.getInventoryTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });

      // 尝试出库100个，但只有30个可用
      await expect(financialService.calculateFifoCost(
        productId, 
        warehouseId, 
        100,
        TransactionType.OUT
      )).rejects.toThrow(BusinessError);

      expect(mockDb.updateInventoryCost).not.toHaveBeenCalled();
    });

    it('应该正确处理负数调整的成本计算', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      const mockTransactions: InventoryTransaction[] = [
        {
          id: 'trans-1',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 100,
          unitCost: 20.00,
          totalCost: 2000.00,
          remainingQuantity: 100,
          transactionDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockDb.getInventoryTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      mockDb.updateInventoryCost.mockResolvedValue({ success: true });

      // 负数调整（盘亏）10个
      const result = await financialService.calculateFifoCost(
        productId, 
        warehouseId, 
        10,
        TransactionType.ADJUST_OUT
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalCost: 200.00, // 10 * 20.00
        averageUnitCost: 20.00
      }));
    });
  });

  describe('场景2：应收应付管理完整流程', () => {
    it('应该完成从销售订单到收款的完整应收流程', async () => {
      const customerId = 'cust-1';
      const salesOrderId = 'so-1';
      const amount = 15000.00;
      
      const accountsReceivable: AccountsReceivable = {
        id: 'ar-1',
        customerId,
        salesOrderId,
        amount,
        paidAmount: 0,
        outstandingAmount: amount,
        status: ReceivableStatus.PENDING,
        dueDate: new Date('2024-02-15'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.createAccountsReceivable.mockResolvedValue({ 
        success: true, 
        data: accountsReceivable 
      });
      mockDb.getAccountsReceivable.mockResolvedValue({ 
        success: true, 
        data: accountsReceivable 
      });
      mockDb.updateAccountsReceivable.mockResolvedValue({ success: true });
      mockDb.createPaymentRecord.mockResolvedValue({ success: true });

      // 1. 创建应收账款
      const createResult = await financialService.createAccountsReceivable({
        customerId,
        salesOrderId,
        amount,
        dueDate: accountsReceivable.dueDate
      });
      expect(createResult.success).toBe(true);
      expect(mockDb.createAccountsReceivable).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId,
          salesOrderId,
          amount,
          outstandingAmount: amount
        })
      );

      // 2. 部分收款
      const partialPayment = 8000.00;
      const partialResult = await financialService.processReceivablePayment(
        accountsReceivable.id,
        partialPayment,
        'bank_transfer',
        'user-finance'
      );
      expect(partialResult.success).toBe(true);
      expect(mockDb.updateAccountsReceivable).toHaveBeenCalledWith(
        accountsReceivable.id,
        expect.objectContaining({
          paidAmount: partialPayment,
          outstandingAmount: amount - partialPayment,
          status: ReceivableStatus.PARTIAL
        })
      );

      // 3. 完成收款
      const finalPayment = 7000.00;
      const finalResult = await financialService.processReceivablePayment(
        accountsReceivable.id,
        finalPayment,
        'cash',
        'user-finance'
      );
      expect(finalResult.success).toBe(true);
      expect(mockDb.updateAccountsReceivable).toHaveBeenCalledWith(
        accountsReceivable.id,
        expect.objectContaining({
          paidAmount: amount,
          outstandingAmount: 0,
          status: ReceivableStatus.PAID
        })
      );

      expect(mockDb.createPaymentRecord).toHaveBeenCalledTimes(2);
    });

    it('应该完成从采购订单到付款的完整应付流程', async () => {
      const supplierId = 'sup-1';
      const purchaseOrderId = 'po-1';
      const amount = 25000.00;
      
      const accountsPayable: AccountsPayable = {
        id: 'ap-1',
        supplierId,
        purchaseOrderId,
        amount,
        paidAmount: 0,
        outstandingAmount: amount,
        status: PayableStatus.PENDING,
        dueDate: new Date('2024-02-20'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.createAccountsPayable.mockResolvedValue({ 
        success: true, 
        data: accountsPayable 
      });
      mockDb.getAccountsPayable.mockResolvedValue({ 
        success: true, 
        data: accountsPayable 
      });
      mockDb.updateAccountsPayable.mockResolvedValue({ success: true });
      mockDb.createPaymentRecord.mockResolvedValue({ success: true });

      // 1. 创建应付账款
      const createResult = await financialService.createAccountsPayable({
        supplierId,
        purchaseOrderId,
        amount,
        dueDate: accountsPayable.dueDate
      });
      expect(createResult.success).toBe(true);

      // 2. 完整付款
      const paymentResult = await financialService.processPayablePayment(
        accountsPayable.id,
        amount,
        'bank_transfer',
        'user-finance'
      );
      expect(paymentResult.success).toBe(true);
      expect(mockDb.updateAccountsPayable).toHaveBeenCalledWith(
        accountsPayable.id,
        expect.objectContaining({
          paidAmount: amount,
          outstandingAmount: 0,
          status: PayableStatus.PAID
        })
      );
    });

    it('应该在超额付款时抛出BusinessError', async () => {
      const accountsReceivable: AccountsReceivable = {
        id: 'ar-1',
        customerId: 'cust-1',
        salesOrderId: 'so-1',
        amount: 10000.00,
        paidAmount: 7000.00,
        outstandingAmount: 3000.00, // 只剩3000未收
        status: ReceivableStatus.PARTIAL,
        dueDate: new Date('2024-02-15'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.getAccountsReceivable.mockResolvedValue({ 
        success: true, 
        data: accountsReceivable 
      });

      // 尝试收款5000，超过未收金额3000
      await expect(financialService.processReceivablePayment(
        accountsReceivable.id,
        5000.00,
        'cash',
        'user-finance'
      )).rejects.toThrow(BusinessError);

      expect(mockDb.updateAccountsReceivable).not.toHaveBeenCalled();
    });
  });

  describe('场景3：月度财务结算流程', () => {
    it('应该正确生成月度财务余额报表', async () => {
      const year = 2024;
      const month = 1;
      
      // 模拟财务数据
      const mockFinancialData = {
        totalSales: 150000.00,
        totalPurchases: 100000.00,
        totalReceivables: 30000.00,
        totalPayables: 20000.00,
        overdueReceivables: 5000.00,
        overduePayables: 3000.00,
        inventoryValue: 80000.00,
        costOfGoodsSold: 75000.00,
        grossProfit: 75000.00
      };

      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ total_sales: mockFinancialData.totalSales }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ total_purchases: mockFinancialData.totalPurchases }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ total_receivables: mockFinancialData.totalReceivables }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ total_payables: mockFinancialData.totalPayables }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ overdue_receivables: mockFinancialData.overdueReceivables }] 
      });
      mockDb.query.mockResolvedValueOnce({ 
        success: true, 
        data: [{ overdue_payables: mockFinancialData.overduePayables }] 
      });
      mockDb.generateMonthlyBalance.mockResolvedValue({ success: true });

      const result = await financialService.generateMonthlyBalance(year, month);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        year,
        month,
        totalSales: mockFinancialData.totalSales,
        totalPurchases: mockFinancialData.totalPurchases,
        totalReceivables: mockFinancialData.totalReceivables,
        totalPayables: mockFinancialData.totalPayables,
        netAmount: mockFinancialData.totalReceivables - mockFinancialData.totalPayables,
        overdueReceivables: mockFinancialData.overdueReceivables,
        overduePayables: mockFinancialData.overduePayables
      }));

      expect(mockDb.generateMonthlyBalance).toHaveBeenCalledWith(
        expect.objectContaining({
          year,
          month,
          totalSales: mockFinancialData.totalSales,
          totalPurchases: mockFinancialData.totalPurchases
        })
      );
    });

    it('应该正确计算财务汇总统计', async () => {
      const mockSummaryData = [
        {
          total_receivables: 50000.00,
          total_payables: 30000.00,
          overdue_receivables: 8000.00,
          overdue_payables: 5000.00,
          paid_receivables: 120000.00,
          paid_payables: 90000.00
        }
      ];

      mockDb.getFinancialSummary.mockResolvedValue({
        success: true,
        data: mockSummaryData[0]
      });

      const result = await financialService.getFinancialSummary();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalReceivables: 50000.00,
        totalPayables: 30000.00,
        overdueReceivables: 8000.00,
        overduePayables: 5000.00,
        netAmount: 20000.00, // 50000 - 30000
        overdueReceivableAmount: 8000.00,
        overduePayableAmount: 5000.00
      }));
    });
  });

  describe('场景4：财务精度处理', () => {
    it('应该正确处理小数点精度计算', async () => {
      const productId = 'prod-1';
      const warehouseId = 'wh-1';
      
      // 模拟复杂的小数计算场景
      const mockTransactions: InventoryTransaction[] = [
        {
          id: 'trans-1',
          productId,
          warehouseId,
          type: TransactionType.IN,
          quantity: 33,
          unitCost: 10.333, // 三位小数
          totalCost: 340.989, // 33 * 10.333
          remainingQuantity: 33,
          transactionDate: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01')
        }
      ];

      mockDb.getInventoryTransactions.mockResolvedValue({
        success: true,
        data: mockTransactions
      });
      mockDb.updateInventoryCost.mockResolvedValue({ success: true });

      // 出库13个单位
      const outQuantity = 13;
      const expectedCost = Math.round((13 * 10.333) * 100) / 100; // 四舍五入到两位小数
      const expectedUnitCost = Math.round((expectedCost / outQuantity) * 100) / 100;

      const result = await financialService.calculateFifoCost(
        productId, 
        warehouseId, 
        outQuantity,
        TransactionType.OUT
      );

      expect(result.success).toBe(true);
      expect(result.data.totalCost).toBeCloseTo(expectedCost, 2);
      expect(result.data.averageUnitCost).toBeCloseTo(expectedUnitCost, 2);
    });

    it('应该正确处理汇率转换计算', async () => {
      const originalAmount = 1000.00; // 美元
      const exchangeRate = 7.2456; // 美元对人民币汇率
      const expectedRmbAmount = Math.round(originalAmount * exchangeRate * 100) / 100;

      const result = await financialService.convertCurrency(
        originalAmount,
        'USD',
        'CNY',
        exchangeRate
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        originalAmount,
        convertedAmount: expectedRmbAmount,
        exchangeRate,
        fromCurrency: 'USD',
        toCurrency: 'CNY'
      }));
    });
  });

  describe('场景5：事务处理和错误恢复', () => {
    it('应该在复杂财务操作中正确使用事务', async () => {
      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.commit.mockResolvedValue({ success: true });
      mockDb.createAccountsReceivable.mockResolvedValue({ success: true });
      mockDb.updateInventoryCost.mockResolvedValue({ success: true });
      mockDb.createPaymentRecord.mockResolvedValue({ success: true });

      // 复杂的财务操作：创建应收 + 更新库存成本 + 记录付款
      const result = await financialService.processComplexFinancialTransaction({
        salesOrderId: 'so-1',
        customerId: 'cust-1',
        amount: 15000.00,
        inventoryTransactions: [
          { productId: 'prod-1', warehouseId: 'wh-1', quantity: 10, unitCost: 1000.00 }
        ],
        paymentInfo: {
          amount: 5000.00,
          method: 'bank_transfer',
          processor: 'user-finance'
        }
      });

      expect(result.success).toBe(true);
      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.commit).toHaveBeenCalled();
      expect(mockDb.rollback).not.toHaveBeenCalled();
    });

    it('应该在操作失败时正确回滚事务', async () => {
      mockDb.beginTransaction.mockResolvedValue({ success: true });
      mockDb.rollback.mockResolvedValue({ success: true });
      mockDb.createAccountsReceivable.mockResolvedValue({ success: true });
      mockDb.updateInventoryCost.mockRejectedValue(new Error('库存更新失败'));

      await expect(financialService.processComplexFinancialTransaction({
        salesOrderId: 'so-1',
        customerId: 'cust-1',
        amount: 15000.00,
        inventoryTransactions: [
          { productId: 'prod-1', warehouseId: 'wh-1', quantity: 10, unitCost: 1000.00 }
        ]
      })).rejects.toThrow();

      expect(mockDb.beginTransaction).toHaveBeenCalled();
      expect(mockDb.rollback).toHaveBeenCalled();
      expect(mockDb.commit).not.toHaveBeenCalled();
    });
  });
});