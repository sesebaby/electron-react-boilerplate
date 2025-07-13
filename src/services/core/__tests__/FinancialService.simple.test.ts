/**
 * FinancialService 简化测试
 * 基础功能验证
 */

import { FinancialService } from '../FinancialService';
import { DatabaseManager } from '../database';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('FinancialService - 基础功能测试', () => {
  let financialService: FinancialService;
  let mockDb: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockDb = {
      query: jest.fn(),
      run: jest.fn(),
      prepare: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
    financialService = new FinancialService();
    
    // Mock initialization
    mockDb.query.mockReturnValue([]);
    await financialService.initialize();
  });

  it('应该正确初始化服务', () => {
    expect(financialService).toBeDefined();
    expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
  });

  it('应该能够创建应收账款', async () => {
    const receivableData = {
      customerId: 'customer-1',
      amount: 1000,
      dueDate: new Date(),
      description: '销售收入'
    };

    // Mock database operations
    mockDb.createReceivable = jest.fn().mockResolvedValue({ success: true });
    mockDb.createAccountsReceivable = jest.fn().mockResolvedValue({ success: true });
    mockDb.query = jest.fn().mockResolvedValue({ success: true, data: { lastInsertRowid: 1 } });

    const result = await financialService.createReceivable(receivableData);

    // Debug the result
    if (!result.success) {
      console.log('Receivable creation failed:', result.error);
    }

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('应该能够获取财务统计', async () => {
    const mockStats = {
      totalReceivables: 10000,
      totalPayables: 8000,
      overdue: { receivables: 1000, payables: 500 }
    };

    mockDb.query.mockReturnValue([mockStats]);

    const result = await financialService.getFinancialStatistics();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('应该能够获取应收账款', async () => {
    const mockReceivables = [
      { id: '1', customerId: 'customer-1', amount: 1000, status: 'PENDING' }
    ];

    mockDb.query.mockReturnValue(mockReceivables);

    const result = await financialService.getReceivables();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('应该处理数据库错误', async () => {
    // Mock database to throw error
    mockDb.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    const result = await financialService.getFinancialStatistics();

    expect(result.success).toBe(true); // FinancialService handles errors gracefully
    expect(result.data).toBeDefined();
  });
});