/**
 * 应收账款服务实现
 * 
 * 支持依赖注入的应收账款服务实现
 */

import { AccountsReceivable, PaymentStatus, ReceivableStatus } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';
import electronDatabase from '../database/electronDatabase';
import { 
  IFinancialService,
  FinancialFilter,
  FinancialStatistics,
  PaginatedResult,
  PaginationParams,
  ServiceResult,
  ServiceHealthStatus,
  BatchOperationResult
} from '../interfaces/IFinancialService';
import { IBusinessService } from '../interfaces/IBusinessService';
import { logger } from '../../utils/secureLogger';
import { ValidationError, BusinessError } from '../../utils/errors';

/**
 * 应收账款服务实现类
 */
export class AccountsReceivableService implements IFinancialService, IBusinessService {
  private receivables: Map<string, AccountsReceivable> = new Map();
  private customerIndex: Map<string, string[]> = new Map(); // CustomerId -> ReceivableIds
  private initialized = false;

  // ==================== 生命周期管理 ====================

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('AccountsReceivableService already initialized');
      return;
    }

    console.log('Initializing AccountsReceivableService...');
    
    try {
      // 临时实现：直接初始化空数据，避免数据库方法不存在错误
      const dbReceivables: any[] = [];
      console.log(`Loaded ${dbReceivables.length} accounts receivable from database`);
      
      // 转换并缓存数据
      for (const dbReceivable of dbReceivables) {
        const receivable: AccountsReceivable = {
          id: dbReceivable.id,
          billNo: dbReceivable.billNo || `AR-${dbReceivable.id}`,
          customerId: dbReceivable.customerId,
          salesOrderId: dbReceivable.salesOrderId,
          billDate: new Date(dbReceivable.billDate || dbReceivable.createdAt || Date.now()),
          amount: dbReceivable.amount,
          totalAmount: dbReceivable.totalAmount || dbReceivable.amount,
          receivedAmount: dbReceivable.receivedAmount || 0,
          balanceAmount: (dbReceivable.totalAmount || dbReceivable.amount) - (dbReceivable.receivedAmount || 0),
          remainingAmount: dbReceivable.amount - (dbReceivable.receivedAmount || 0),
          dueDate: new Date(dbReceivable.dueDate),
          status: this.mapLegacyStatusToReceivableStatus(dbReceivable.status || 'pending'),
          description: dbReceivable.description || '',
          createdAt: new Date(dbReceivable.createdAt || Date.now()),
          updatedAt: new Date(dbReceivable.updatedAt || Date.now())
        };
        
        this.addToCache(receivable);
      }

      this.initialized = true;
      console.log('AccountsReceivableService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AccountsReceivableService:', error);
      throw error;
    }
  }

  /**
   * 映射旧状态到新状态
   */
  private mapLegacyStatusToReceivableStatus(legacyStatus: string): ReceivableStatus {
    switch (legacyStatus.toLowerCase()) {
      case 'pending':
        return ReceivableStatus.UNPAID;
      case 'partial':
        return ReceivableStatus.PARTIAL;
      case 'paid':
      case 'received':
        return ReceivableStatus.PAID;
      case 'overdue':
        return ReceivableStatus.OVERDUE;
      default:
        return ReceivableStatus.UNPAID;
    }
  }

  /**
   * 添加到缓存
   */
  private addToCache(receivable: AccountsReceivable): void {
    this.receivables.set(receivable.id, receivable);
    
    // 更新客户索引
    if (!this.customerIndex.has(receivable.customerId)) {
      this.customerIndex.set(receivable.customerId, []);
    }
    this.customerIndex.get(receivable.customerId)!.push(receivable.id);
  }

  // ==================== 基础CRUD操作 ====================

  /**
   * 创建应收账款
   */
  async create(data: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsReceivable> {
    const receivable: AccountsReceivable = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // 临时实现：跳过数据库操作，直接缓存
      // const result = await electronDatabase.createAccountsReceivable(...);

      // 添加到缓存
      this.addToCache(receivable);

      logger.info('Accounts receivable created', { receivableId: receivable.id, amount: receivable.amount });
      return receivable;

    } catch (error) {
      logger.error('Failed to create accounts receivable', { error, receivableData: data });
      throw new BusinessError(`创建应收账款失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 根据ID查找应收账款
   */
  async findById(id: string): Promise<AccountsReceivable | null> {
    return this.receivables.get(id) || null;
  }

  /**
   * 查找所有应收账款
   */
  async findAll(): Promise<AccountsReceivable[]> {
    return Array.from(this.receivables.values());
  }

  /**
   * 根据客户查找应收账款
   */
  async findByCustomerId(customerId: string): Promise<AccountsReceivable[]> {
    const receivableIds = this.customerIndex.get(customerId) || [];
    return receivableIds.map(id => this.receivables.get(id)!).filter(Boolean);
  }

  /**
   * 更新应收账款
   */
  async update(id: string, data: Partial<Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AccountsReceivable> {
    const existingReceivable = this.receivables.get(id);
    if (!existingReceivable) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    const updatedReceivable: AccountsReceivable = {
      ...existingReceivable,
      ...data,
      updatedAt: new Date()
    };

    // 重新计算剩余金额
    updatedReceivable.remainingAmount = (updatedReceivable.amount || updatedReceivable.totalAmount) - updatedReceivable.receivedAmount;

    try {
      // 临时实现：跳过数据库操作
      // const result = await electronDatabase.updateAccountsReceivable(id, {
      //   customerId: updatedReceivable.customerId,
      //   salesOrderId: updatedReceivable.salesOrderId,
      //   amount: updatedReceivable.amount,
      //   receivedAmount: updatedReceivable.receivedAmount,
      //   dueDate: updatedReceivable.dueDate.toISOString(),
      //   status: updatedReceivable.status,
      //   description: updatedReceivable.description,
      //   updatedAt: updatedReceivable.updatedAt.toISOString()
      // });

      // if (!result.success) {
      //   throw new Error(result.error || '更新应收账款失败');
      // }

      // 更新缓存
      this.receivables.set(id, updatedReceivable);

      return updatedReceivable;
    } catch (error) {
      throw new BusinessError(`更新应收账款失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 删除应收账款
   */
  async delete(id: string): Promise<void> {
    const receivable = this.receivables.get(id);
    if (!receivable) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    try {
      // 从数据库删除
      // 临时实现：跳过数据库操作
      // const result = await electronDatabase.deleteAccountsReceivable(id);

      // 从缓存删除
      this.receivables.delete(id);
      
      // 更新客户索引
      const customerReceivables = this.customerIndex.get(receivable.customerId);
      if (customerReceivables) {
        const index = customerReceivables.indexOf(id);
        if (index > -1) {
          customerReceivables.splice(index, 1);
        }
        if (customerReceivables.length === 0) {
          this.customerIndex.delete(receivable.customerId);
        }
      }

      console.log(`Accounts receivable deleted: ${id}`);
    } catch (error) {
      throw new BusinessError(`删除应收账款失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  // ==================== 业务操作 ====================

  /**
   * 记录收款（标准方法）
   */
  async recordPayment(id: string, amount: number, paymentDate: Date, notes?: string): Promise<AccountsReceivable> {
    const receivable = this.receivables.get(id);
    if (!receivable) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    if (amount <= 0) {
      throw new ValidationError('收款金额必须大于0');
    }

    const totalAmount = receivable.amount || receivable.totalAmount;
    if (receivable.receivedAmount + amount > totalAmount) {
      throw new ValidationError('收款金额超过应收金额');
    }

    const newReceivedAmount = receivable.receivedAmount + amount;
    const newRemainingAmount = totalAmount - newReceivedAmount;
    
    let newStatus = receivable.status;
    if (newRemainingAmount === 0) {
      newStatus = ReceivableStatus.PAID;
    } else if (newReceivedAmount > 0) {
      newStatus = ReceivableStatus.PARTIAL;
    }

    return this.update(id, {
      receivedAmount: newReceivedAmount,
      remainingAmount: newRemainingAmount,
      status: newStatus
    });
  }

  // ==================== 统计和查询 ====================

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<FinancialStatistics> {
    const receivables = Array.from(this.receivables.values());
    const now = new Date();

    const totalAmount = receivables.reduce((sum, r) => sum + (r.amount || r.totalAmount || 0), 0);
    const receivedAmount = receivables.reduce((sum, r) => sum + r.receivedAmount, 0);
    const remainingAmount = receivables.reduce((sum, r) => sum + (r.remainingAmount || r.balanceAmount || 0), 0);
    const overdueAmount = receivables
      .filter(r => r.dueDate < now && r.status !== ReceivableStatus.PAID)
      .reduce((sum, r) => sum + (r.remainingAmount || r.balanceAmount || 0), 0);

    const countByStatus = {
      [ReceivableStatus.UNPAID]: receivables.filter(r => r.status === ReceivableStatus.UNPAID).length,
      [ReceivableStatus.PARTIAL]: receivables.filter(r => r.status === ReceivableStatus.PARTIAL).length,
      [ReceivableStatus.PAID]: receivables.filter(r => r.status === ReceivableStatus.PAID).length,
      [ReceivableStatus.OVERDUE]: receivables.filter(r => r.status === ReceivableStatus.OVERDUE).length
    };

    return {
      totalCount: receivables.length,
      activeCount: receivables.filter(r => r.status !== ReceivableStatus.PAID).length,
      todayAdded: receivables.filter(r => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return r.createdAt >= today;
      }).length,
      weekAdded: receivables.filter(r => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return r.createdAt >= weekAgo;
      }).length,
      monthAdded: receivables.filter(r => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return r.createdAt >= monthAgo;
      }).length,
      lastUpdated: new Date(),
      accountsPayable: {
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        overdueAmount: 0,
        countByStatus: {}
      },
      accountsReceivable: {
        totalAmount,
        receivedAmount,
        remainingAmount,
        overdueAmount,
        countByStatus
      },
      cashFlow: {
        totalInflow: receivedAmount,
        totalOutflow: 0,
        netCashFlow: receivedAmount
      }
    };
  }

  /**
   * 获取逾期应收账款
   */
  async getOverdueReceivables(): Promise<AccountsReceivable[]> {
    const now = new Date();
    return Array.from(this.receivables.values())
      .filter(r => r.dueDate < now && r.status !== ReceivableStatus.PAID);
  }

  /**
   * 分页查询
   */
  async findWithPagination(params: PaginationParams, filter?: FinancialFilter): Promise<PaginatedResult<AccountsReceivable>> {
    let receivables = Array.from(this.receivables.values());

    // 应用过滤器
    if (filter) {
      if (filter.status) {
        receivables = receivables.filter(r => r.status === filter.status);
      }
      if (filter.customerId) {
        receivables = receivables.filter(r => r.customerId === filter.customerId);
      }
      if (filter.startDate) {
        receivables = receivables.filter(r => r.createdAt >= filter.startDate!);
      }
      if (filter.endDate) {
        receivables = receivables.filter(r => r.createdAt <= filter.endDate!);
      }
    }

    // 分页
    const total = receivables.length;
    const offset = (params.page - 1) * params.pageSize;
    const paginatedReceivables = receivables.slice(offset, offset + params.pageSize);

    return {
      items: paginatedReceivables,
      data: paginatedReceivables,
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.ceil(total / params.pageSize),
      hasNext: params.page < Math.ceil(total / params.pageSize),
      hasPrevious: params.page > 1
    };
  }

  /**
   * 批量操作
   */
  async batchUpdate(updates: Array<{ id: string; data: Partial<AccountsReceivable> }>): Promise<BatchOperationResult<AccountsReceivable>> {
    const results: BatchOperationResult<AccountsReceivable> = {
      total: updates.length,
      successful: 0,
      failed: 0,
      successfulItems: [],
      failedItems: []
    };

    for (const update of updates) {
      try {
        const updatedReceivable = await this.update(update.id, update.data);
        results.successful++;
        results.successfulItems.push(updatedReceivable);
      } catch (error) {
        results.failed++;
        const existingReceivable = this.receivables.get(update.id);
        results.failedItems.push({
          item: existingReceivable || { id: update.id } as AccountsReceivable,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return results;
  }

  // ==================== 扩展业务方法 ====================

  /**
   * 获取应收账款统计
   */
  async getReceivableStats(): Promise<any> {
    const stats = await this.getStatistics();
    return {
      totalAmount: stats.accountsReceivable.totalAmount,
      receivedAmount: stats.accountsReceivable.receivedAmount,
      remainingAmount: stats.accountsReceivable.remainingAmount,
      overdueAmount: stats.accountsReceivable.overdueAmount,
      overdueCount: Object.values(stats.accountsReceivable.countByStatus).reduce((sum, count) => sum + count, 0) - (stats.accountsReceivable.countByStatus[ReceivableStatus.PAID] || 0),
      totalCount: stats.totalCount
    };
  }

  /**
   * 记录收款（别名方法）
   */
  async recordReceipt(receivableId: string, amount: number, receiptDate: Date, notes?: string): Promise<AccountsReceivable> {
    return this.recordPayment(receivableId, amount, receiptDate, notes);
  }

  /**
   * 添加收款记录
   */
  async addReceipt(receivableId: string, amount: number, receiptDate: Date, notes?: string): Promise<any> {
    return this.recordPayment(receivableId, amount, receiptDate, notes);
  }

  /**
   * 生成收款单号
   */
  async generateReceiptNo(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `REC${dateStr}${timeStr}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /**
   * 获取收款记录
   */
  async getReceipts(receivableId: string): Promise<any[]> {
    // 这里应该从收款记录表获取数据，暂时返回空数组
    return [];
  }

  /**
   * 生成发票号
   */
  async generateInvoiceNo(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `INV${dateStr}${timeStr}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  /**
   * 查找所有收款记录
   */
  async findAllReceipts(): Promise<any[]> {
    // 这里应该从收款记录表获取数据，暂时返回空数组
    return [];
  }

  /**
   * 获取收款方式统计
   */
  async getReceiptMethodStats(): Promise<any> {
    return {
      cash: { count: 0, amount: 0 },
      bank: { count: 0, amount: 0 },
      check: { count: 0, amount: 0 },
      other: { count: 0, amount: 0 }
    };
  }

  /**
   * 从销售订单创建应收账款
   */
  async createFromSalesOrder(salesOrder: any): Promise<any> {
    const receivable = {
      id: `AR-${Date.now()}`,
      customerId: salesOrder.customerId,
      billDate: new Date(),
      billNo: `BILL-${Date.now()}`,
      amount: salesOrder.totalAmount,
      totalAmount: salesOrder.totalAmount,
      balanceAmount: salesOrder.totalAmount,
      receivedAmount: 0,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后到期
      status: ReceivableStatus.PENDING,
      referenceId: salesOrder.id,
      referenceType: 'sales_order',
      description: `销售订单 ${salesOrder.orderNumber} 应收款`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.create(receivable);
  }

  // ==================== IFinancialService 接口方法 ====================

  /**
   * 获取综合财务统计
   */
  async getComprehensiveStatistics(): Promise<FinancialStatistics> {
    return this.getStatistics();
  }

  /**
   * 获取现金流分析
   */
  async getCashFlowAnalysis(startDate: Date, endDate: Date): Promise<{
    inflows: Array<{ date: Date; amount: number; source: string; }>;
    outflows: Array<{ date: Date; amount: number; destination: string; }>;
    netCashFlow: number;
    projectedCashFlow: number;
  }> {
    const receivables = Array.from(this.receivables.values())
      .filter(r => r.createdAt >= startDate && r.createdAt <= endDate);

    const inflows = receivables.map(r => ({
      date: r.createdAt,
      amount: r.receivedAmount || 0,
      source: `Customer: ${r.customerId}`
    }));

    const totalInflow = inflows.reduce((sum, i) => sum + i.amount, 0);

    return {
      inflows,
      outflows: [], // 应收账款服务不处理支出
      netCashFlow: totalInflow,
      projectedCashFlow: totalInflow * 1.1 // 简单预测
    };
  }

  /**
   * 获取财务健康度评分
   */
  async getFinancialHealthScore(): Promise<{
    score: number;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      description: string;
    }>;
    recommendations: string[];
  }> {
    const receivables = Array.from(this.receivables.values());
    const now = new Date();
    const overdue = receivables.filter(r => r.dueDate < now && r.status !== ReceivableStatus.PAID);
    
    const overdueRatio = receivables.length > 0 ? overdue.length / receivables.length : 0;
    const collectionRatio = receivables.length > 0 ? 
      receivables.filter(r => r.status === ReceivableStatus.PAID).length / receivables.length : 1;

    const factors = [
      {
        name: '逾期应收账款比例',
        score: Math.max(0, 100 - overdueRatio * 100),
        weight: 0.4,
        description: `逾期应收账款占比 ${(overdueRatio * 100).toFixed(1)}%`
      },
      {
        name: '收款完成率',
        score: collectionRatio * 100,
        weight: 0.6,
        description: `已完成收款占比 ${(collectionRatio * 100).toFixed(1)}%`
      }
    ];

    const score = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

    const recommendations = [];
    if (overdueRatio > 0.1) {
      recommendations.push('建议优先处理逾期应收账款');
    }
    if (collectionRatio < 0.8) {
      recommendations.push('建议提高收款处理效率');
    }

    return { score, factors, recommendations };
  }

  /**
   * 生成财务报表
   */
  async generateFinancialReport(
    reportType: 'balance_sheet' | 'income_statement' | 'cash_flow',
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<any>> {
    try {
      const receivables = Array.from(this.receivables.values())
        .filter(r => r.createdAt >= startDate && r.createdAt <= endDate);

      let reportData: any = {};

      switch (reportType) {
        case 'balance_sheet':
          reportData = {
            assets: {
              accountsReceivable: receivables.reduce((sum, r) => sum + (r.remainingAmount || 0), 0)
            }
          };
          break;
        case 'cash_flow':
          reportData = {
            operatingActivities: {
              accountsReceivableChanges: receivables.reduce((sum, r) => sum + (r.receivedAmount || 0), 0)
            }
          };
          break;
        default:
          reportData = { message: '此报表类型不适用于应收账款服务' };
      }

      return {
        success: true,
        data: reportData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '生成报表失败'
      };
    }
  }

  // ==================== 健康检查 ====================

  getHealthStatus(): ServiceHealthStatus {
    return {
      isHealthy: this.initialized,
      message: this.initialized ? '应收账款服务运行正常' : '应收账款服务未初始化',
      lastChecked: new Date(),
      details: {
        initialized: this.initialized,
        receivableCount: this.receivables.size,
        customerIndexSize: this.customerIndex.size
      }
    };
  }

  reset(): void {
    this.receivables.clear();
    this.customerIndex.clear();
    this.initialized = false;
    console.log('AccountsReceivableService reset');
  }
}

// 创建并导出服务实例
export const accountsReceivableService = new AccountsReceivableService();

// 默认导出
export default accountsReceivableService;
