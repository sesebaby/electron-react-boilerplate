/**
 * 财务服务 - 整合应收应付和财务管理
 * 整合服务: AccountsPayableService, AccountsReceivableService, FifoInventoryService, MonthlyBalanceService
 */

import {
  AccountsPayable,
  AccountsReceivable,
  PayableStatus,
  ReceivableStatus,
  PaymentStatus,
  InventoryTransaction,
  TransactionType
} from '../../types/entities';
import { ServiceResult, PaginatedResult, PaginationParams, BaseFilter } from './types';
import { DatabaseManager } from './database';
import { v4 as uuidv4 } from 'uuid';

// 财务过滤器
interface FinancialFilter extends BaseFilter {
  customerId?: string;
  supplierId?: string;
  paymentStatus?: PaymentStatus;
  receivableStatus?: ReceivableStatus;
  payableStatus?: PayableStatus;
  amountFrom?: number;
  amountTo?: number;
  dueDate?: Date;
  overdue?: boolean;
}

// 财务统计
interface FinancialStatistics {
  totalReceivables: number;
  totalPayables: number;
  overdueReceivables: number;
  overduePayables: number;
  totalReceivableAmount: number;
  totalPayableAmount: number;
  overdueReceivableAmount: number;
  overduePayableAmount: number;
  netAmount: number;
}

// 付款记录
interface PaymentRecord {
  id: string;
  type: 'receivable' | 'payable';
  referenceId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

/**
 * 财务服务实现
 * 负责应收账款、应付账款和财务报表管理
 */
export class FinancialService {
  private database: any;
  private initialized = false;

  // 内存缓存
  private receivables: Map<string, AccountsReceivable> = new Map();
  private payables: Map<string, AccountsPayable> = new Map();
  private paymentRecords: Map<string, PaymentRecord> = new Map();

  // 索引
  private customerReceivableIndex: Map<string, string[]> = new Map();
  private supplierPayableIndex: Map<string, string[]> = new Map();

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.database = await DatabaseManager.getInstance();
      await this.loadData();
      this.initialized = true;
    } catch (error) {
      console.error('FinancialService initialization failed:', error);
      throw error;
    }
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      // 加载应收账款
      const receivables = await this.database.getAccountsReceivable() || [];
      this.receivables.clear();
      this.customerReceivableIndex.clear();
      
      receivables.forEach((receivable: AccountsReceivable) => {
        this.receivables.set(receivable.id, receivable);
        
        if (!this.customerReceivableIndex.has(receivable.customerId)) {
          this.customerReceivableIndex.set(receivable.customerId, []);
        }
        this.customerReceivableIndex.get(receivable.customerId)!.push(receivable.id);
      });

      // 加载应付账款
      const payables = await this.database.getAccountsPayable() || [];
      this.payables.clear();
      this.supplierPayableIndex.clear();
      
      payables.forEach((payable: AccountsPayable) => {
        this.payables.set(payable.id, payable);
        
        if (!this.supplierPayableIndex.has(payable.supplierId)) {
          this.supplierPayableIndex.set(payable.supplierId, []);
        }
        this.supplierPayableIndex.get(payable.supplierId)!.push(payable.id);
      });

      // 加载付款记录
      const payments = await this.database.getPaymentRecords() || [];
      this.paymentRecords.clear();
      payments.forEach((payment: PaymentRecord) => {
        this.paymentRecords.set(payment.id, payment);
      });

    } catch (error) {
      console.error('Failed to load financial data:', error);
      // 如果数据加载失败，初始化为空数据
    }
  }

  // ==================== 应收账款管理 ====================

  /**
   * 创建应收账款
   */
  async createReceivable(receivableData: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<AccountsReceivable>> {
    try {
      const receivable: AccountsReceivable = {
        id: uuidv4(),
        ...receivableData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createAccountsReceivable(receivable);
      
      // 更新缓存
      this.receivables.set(receivable.id, receivable);
      
      // 更新索引
      if (!this.customerReceivableIndex.has(receivable.customerId)) {
        this.customerReceivableIndex.set(receivable.customerId, []);
      }
      this.customerReceivableIndex.get(receivable.customerId)!.push(receivable.id);

      return { success: true, data: receivable };
    } catch (error) {
      return { success: false, error: `创建应收账款失败: ${error}` };
    }
  }

  /**
   * 更新应收账款
   */
  async updateReceivable(id: string, updates: Partial<AccountsReceivable>): Promise<ServiceResult<AccountsReceivable>> {
    try {
      const existing = this.receivables.get(id);
      if (!existing) {
        return { success: false, error: '应收账款不存在' };
      }

      const updated: AccountsReceivable = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      await this.database.updateAccountsReceivable(id, updated);
      this.receivables.set(id, updated);

      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: `更新应收账款失败: ${error}` };
    }
  }

  /**
   * 获取应收账款列表
   */
  async getReceivables(filter?: FinancialFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<AccountsReceivable>>> {
    try {
      let receivables = Array.from(this.receivables.values());

      // 应用过滤器
      if (filter) {
        receivables = receivables.filter(receivable => {
          if (filter.customerId && receivable.customerId !== filter.customerId) return false;
          if (filter.receivableStatus && receivable.status !== filter.receivableStatus) return false;
          const amount = receivable.amount || receivable.totalAmount;
          if (filter.amountFrom && amount < filter.amountFrom) return false;
          if (filter.amountTo && amount > filter.amountTo) return false;
          if (filter.overdue && new Date(receivable.dueDate) > new Date()) return false;
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!receivable.orderId?.toLowerCase().includes(keyword) &&
                !receivable.description?.toLowerCase().includes(keyword)) return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = receivables.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = receivables.slice(offset, offset + pageSize);

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages }
      };
    } catch (error) {
      return { success: false, error: `获取应收账款列表失败: ${error}` };
    }
  }

  /**
   * 收款
   */
  async receivePayment(receivableId: string, amount: number, paymentMethod: string, notes?: string): Promise<ServiceResult<AccountsReceivable>> {
    try {
      const receivable = this.receivables.get(receivableId);
      if (!receivable) {
        return { success: false, error: '应收账款不存在' };
      }

      if (amount <= 0) {
        return { success: false, error: '收款金额必须大于0' };
      }

      const currentAmount = receivable.amount || receivable.totalAmount;
      if (receivable.receivedAmount + amount > currentAmount) {
        return { success: false, error: '收款金额超过应收金额' };
      }

      // 更新应收账款
      const updatedReceivable: AccountsReceivable = {
        ...receivable,
        receivedAmount: receivable.receivedAmount + amount,
        balanceAmount: currentAmount - (receivable.receivedAmount + amount),
        status: (receivable.receivedAmount + amount >= currentAmount) ? ReceivableStatus.PAID : ReceivableStatus.PARTIAL,
        updatedAt: new Date()
      };

      // 创建付款记录
      const paymentRecord: PaymentRecord = {
        id: uuidv4(),
        type: 'receivable',
        referenceId: receivableId,
        amount,
        paymentDate: new Date(),
        paymentMethod,
        notes,
        createdAt: new Date(),
        createdBy: 'system'
      };

      // 保存到数据库
      await this.database.updateAccountsReceivable(receivableId, updatedReceivable);
      await this.database.createPaymentRecord(paymentRecord);

      // 更新缓存
      this.receivables.set(receivableId, updatedReceivable);
      this.paymentRecords.set(paymentRecord.id, paymentRecord);

      return { success: true, data: updatedReceivable };
    } catch (error) {
      return { success: false, error: `收款失败: ${error}` };
    }
  }

  // ==================== 应付账款管理 ====================

  /**
   * 创建应付账款
   */
  async createPayable(payableData: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<AccountsPayable>> {
    try {
      const payable: AccountsPayable = {
        id: uuidv4(),
        ...payableData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createAccountsPayable(payable);
      
      // 更新缓存
      this.payables.set(payable.id, payable);
      
      // 更新索引
      if (!this.supplierPayableIndex.has(payable.supplierId)) {
        this.supplierPayableIndex.set(payable.supplierId, []);
      }
      this.supplierPayableIndex.get(payable.supplierId)!.push(payable.id);

      return { success: true, data: payable };
    } catch (error) {
      return { success: false, error: `创建应付账款失败: ${error}` };
    }
  }

  /**
   * 更新应付账款
   */
  async updatePayable(id: string, updates: Partial<AccountsPayable>): Promise<ServiceResult<AccountsPayable>> {
    try {
      const existing = this.payables.get(id);
      if (!existing) {
        return { success: false, error: '应付账款不存在' };
      }

      const updated: AccountsPayable = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      await this.database.updateAccountsPayable(id, updated);
      this.payables.set(id, updated);

      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: `更新应付账款失败: ${error}` };
    }
  }

  /**
   * 获取应付账款列表
   */
  async getPayables(filter?: FinancialFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<AccountsPayable>>> {
    try {
      let payables = Array.from(this.payables.values());

      // 应用过滤器
      if (filter) {
        payables = payables.filter(payable => {
          if (filter.supplierId && payable.supplierId !== filter.supplierId) return false;
          if (filter.payableStatus && payable.status !== filter.payableStatus) return false;
          const amount = payable.amount || payable.totalAmount || 0;
          if (filter.amountFrom && amount < filter.amountFrom) return false;
          if (filter.amountTo && amount > filter.amountTo) return false;
          if (filter.overdue && new Date(payable.dueDate) > new Date()) return false;
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!payable.orderId?.toLowerCase().includes(keyword) &&
                !payable.description?.toLowerCase().includes(keyword)) return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = payables.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = payables.slice(offset, offset + pageSize);

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages }
      };
    } catch (error) {
      return { success: false, error: `获取应付账款列表失败: ${error}` };
    }
  }

  /**
   * 付款
   */
  async makePayment(payableId: string, amount: number, paymentMethod: string, notes?: string): Promise<ServiceResult<AccountsPayable>> {
    try {
      const payable = this.payables.get(payableId);
      if (!payable) {
        return { success: false, error: '应付账款不存在' };
      }

      if (amount <= 0) {
        return { success: false, error: '付款金额必须大于0' };
      }

      const currentAmount = payable.amount || payable.totalAmount;
      if (payable.paidAmount + amount > currentAmount) {
        return { success: false, error: '付款金额超过应付金额' };
      }

      // 更新应付账款
      const updatedPayable: AccountsPayable = {
        ...payable,
        paidAmount: payable.paidAmount + amount,
        balanceAmount: currentAmount - (payable.paidAmount + amount),
        status: (payable.paidAmount + amount >= currentAmount) ? PayableStatus.PAID : PayableStatus.PARTIAL,
        updatedAt: new Date()
      };

      // 创建付款记录
      const paymentRecord: PaymentRecord = {
        id: uuidv4(),
        type: 'payable',
        referenceId: payableId,
        amount,
        paymentDate: new Date(),
        paymentMethod,
        notes,
        createdAt: new Date(),
        createdBy: 'system'
      };

      // 保存到数据库
      await this.database.updateAccountsPayable(payableId, updatedPayable);
      await this.database.createPaymentRecord(paymentRecord);

      // 更新缓存
      this.payables.set(payableId, updatedPayable);
      this.paymentRecords.set(paymentRecord.id, paymentRecord);

      return { success: true, data: updatedPayable };
    } catch (error) {
      return { success: false, error: `付款失败: ${error}` };
    }
  }

  // ==================== 财务统计 ====================

  /**
   * 获取财务统计信息
   */
  async getFinancialStatistics(): Promise<ServiceResult<FinancialStatistics>> {
    try {
      const receivables = Array.from(this.receivables.values());
      const payables = Array.from(this.payables.values());
      const now = new Date();

      // 应收账款统计
      const totalReceivableAmount = receivables.reduce((sum, r) => sum + (r.amount || r.totalAmount), 0);
      const overdueReceivables = receivables.filter(r => new Date(r.dueDate) < now && r.status !== ReceivableStatus.PAID);
      const overdueReceivableAmount = overdueReceivables.reduce((sum, r) => sum + ((r.amount || r.totalAmount) - r.receivedAmount), 0);

      // 应付账款统计
      const totalPayableAmount = payables.reduce((sum, p) => sum + (p.amount || p.totalAmount), 0);
      const overduePayables = payables.filter(p => new Date(p.dueDate) < now && p.status !== PayableStatus.PAID);
      const overduePayableAmount = overduePayables.reduce((sum, p) => sum + ((p.amount || p.totalAmount) - p.paidAmount), 0);

      const statistics: FinancialStatistics = {
        totalReceivables: receivables.length,
        totalPayables: payables.length,
        overdueReceivables: overdueReceivables.length,
        overduePayables: overduePayables.length,
        totalReceivableAmount,
        totalPayableAmount,
        overdueReceivableAmount,
        overduePayableAmount,
        netAmount: totalReceivableAmount - totalPayableAmount
      };

      return { success: true, data: statistics };
    } catch (error) {
      return { success: false, error: `获取财务统计失败: ${error}` };
    }
  }

  /**
   * 获取逾期账款
   */
  async getOverdueAccounts(): Promise<ServiceResult<{ receivables: AccountsReceivable[]; payables: AccountsPayable[] }>> {
    try {
      const now = new Date();
      
      const overdueReceivables = Array.from(this.receivables.values()).filter(
        r => new Date(r.dueDate) < now && r.status !== ReceivableStatus.PAID
      );
      
      const overduePayables = Array.from(this.payables.values()).filter(
        p => new Date(p.dueDate) < now && p.status !== PayableStatus.PAID
      );

      return {
        success: true,
        data: {
          receivables: overdueReceivables,
          payables: overduePayables
        }
      };
    } catch (error) {
      return { success: false, error: `获取逾期账款失败: ${error}` };
    }
  }

  /**
   * 获取付款记录
   */
  async getPaymentRecords(referenceId?: string, type?: 'receivable' | 'payable'): Promise<ServiceResult<PaymentRecord[]>> {
    try {
      let records = Array.from(this.paymentRecords.values());

      if (referenceId) {
        records = records.filter(r => r.referenceId === referenceId);
      }

      if (type) {
        records = records.filter(r => r.type === type);
      }

      // 按日期降序排序
      records.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

      return { success: true, data: records };
    } catch (error) {
      return { success: false, error: `获取付款记录失败: ${error}` };
    }
  }
}