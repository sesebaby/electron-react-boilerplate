/**
 * 财务服务接口
 */

import { 
  IBusinessService, 
  PaginatedResult, 
  PaginationParams, 
  BaseFilter, 
  ServiceResult,
  ServiceStatistics,
  BatchOperationResult,
  ServiceHealthStatus
} from './IBusinessService';

// Re-export types needed by accountsPayableService
export type {
  PaginatedResult,
  ServiceResult,
  PaginationParams,
  ServiceHealthStatus
};
export type { BatchOperationResult };

/**
 * 应付账款记录
 */
export interface AccountsPayable {
  /** 记录ID */
  id: string;
  /** 供应商ID */
  supplierId: string;
  /** 采购订单ID */
  purchaseOrderId?: string;
  /** 发票号 */
  invoiceNumber?: string;
  /** 应付金额 */
  amount: number;
  /** 已付金额 */
  paidAmount: number;
  /** 未付金额 */
  remainingAmount: number;
  /** 到期日期 */
  dueDate: Date;
  /** 发票日期 */
  invoiceDate: Date;
  /** 状态 */
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  /** 付款条件 */
  paymentTerms?: string;
  /** 备注 */
  notes?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 应收账款记录
 */
export interface AccountsReceivable {
  /** 记录ID */
  id: string;
  /** 客户ID */
  customerId: string;
  /** 销售订单ID */
  salesOrderId?: string;
  /** 发票号 */
  invoiceNumber?: string;
  /** 应收金额 */
  amount: number;
  /** 已收金额 */
  receivedAmount: number;
  /** 未收金额 */
  remainingAmount: number;
  /** 到期日期 */
  dueDate: Date;
  /** 发票日期 */
  invoiceDate: Date;
  /** 状态 */
  status: 'pending' | 'partial' | 'received' | 'overdue';
  /** 付款条件 */
  paymentTerms?: string;
  /** 备注 */
  notes?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 付款记录
 */
export interface PaymentRecord {
  /** 付款ID */
  id: string;
  /** 关联的应付/应收账款ID */
  accountId: string;
  /** 付款类型 */
  type: 'payment' | 'receipt';
  /** 付款金额 */
  amount: number;
  /** 付款日期 */
  paymentDate: Date;
  /** 付款方式 */
  paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'other';
  /** 参考号（如支票号、转账单号等） */
  referenceNumber?: string;
  /** 银行账户 */
  bankAccount?: string;
  /** 备注 */
  notes?: string;
  /** 操作人 */
  operatorId?: string;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 财务查询过滤器
 */
export interface FinancialFilter extends BaseFilter {
  /** 供应商/客户ID */
  partnerId?: string;
  /** 供应商ID */
  supplierId?: string;
  /** 客户ID */
  customerId?: string;
  /** 状态 */
  status?: 'pending' | 'partial' | 'paid' | 'received' | 'overdue';
  /** 金额范围 */
  amountFrom?: number;
  amountTo?: number;
  /** 到期日期范围 */
  dueDateFrom?: Date;
  dueDateTo?: Date;
  /** 发票日期范围 */
  invoiceDateFrom?: Date;
  invoiceDateTo?: Date;
  /** 开始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
}

/**
 * 财务统计信息
 */
export interface FinancialStatistics extends ServiceStatistics {
  /** 应付账款统计 */
  accountsPayable: {
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    overdueAmount: number;
    countByStatus: Record<string, number>;
  };
  /** 应收账款统计 */
  accountsReceivable: {
    totalAmount: number;
    receivedAmount: number;
    remainingAmount: number;
    overdueAmount: number;
    countByStatus: Record<string, number>;
  };
  /** 现金流统计 */
  cashFlow: {
    totalInflow: number;
    totalOutflow: number;
    netCashFlow: number;
  };
}

/**
 * 账龄分析
 */
export interface AgingAnalysis {
  /** 分析类型 */
  type: 'payable' | 'receivable';
  /** 账龄区间 */
  agingBuckets: Array<{
    label: string;
    daysFrom: number;
    daysTo: number;
    amount: number;
    count: number;
    percentage: number;
  }>;
  /** 总金额 */
  totalAmount: number;
  /** 总记录数 */
  totalCount: number;
  /** 分析日期 */
  analysisDate: Date;
}

/**
 * 应付账款服务接口
 */
export interface IAccountsPayableService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建应付账款记录
   */
  create(data: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<AccountsPayable>;

  /**
   * 根据ID获取应付账款
   */
  findById(id: string): Promise<AccountsPayable | null>;

  /**
   * 获取所有应付账款
   */
  findAll(): Promise<AccountsPayable[]>;

  /**
   * 分页查询应付账款
   */
  findPaginated(params: PaginationParams, filter?: FinancialFilter): Promise<PaginatedResult<AccountsPayable>>;

  /**
   * 更新应付账款
   */
  update(id: string, data: Partial<AccountsPayable>, currentUserId?: string): Promise<AccountsPayable>;

  /**
   * 删除应付账款
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 查询方法 ====================

  /**
   * 根据供应商查询应付账款
   */
  findBySupplier(supplierId: string): Promise<AccountsPayable[]>;

  /**
   * 根据采购订单查询应付账款
   */
  findByPurchaseOrder(purchaseOrderId: string): Promise<AccountsPayable[]>;

  /**
   * 根据状态查询应付账款
   */
  findByStatus(status: AccountsPayable['status']): Promise<AccountsPayable[]>;

  /**
   * 获取逾期应付账款
   */
  getOverduePayables(): Promise<AccountsPayable[]>;

  /**
   * 获取即将到期的应付账款
   */
  getUpcomingPayables(days: number): Promise<AccountsPayable[]>;

  // ==================== 付款操作 ====================

  /**
   * 记录付款
   */
  recordPayment(
    payableId: string,
    amount: number,
    paymentDate: Date,
    paymentMethod: PaymentRecord['paymentMethod'],
    referenceNumber?: string,
    notes?: string,
    currentUserId?: string
  ): Promise<PaymentRecord>;

  /**
   * 获取付款记录
   */
  getPaymentRecords(payableId: string): Promise<PaymentRecord[]>;

  /**
   * 批量付款
   */
  batchPayment(
    payments: Array<{
      payableId: string;
      amount: number;
      paymentMethod: PaymentRecord['paymentMethod'];
      referenceNumber?: string;
    }>,
    paymentDate: Date,
    currentUserId?: string
  ): Promise<BatchOperationResult<PaymentRecord>>;

  // ==================== 统计和分析 ====================

  /**
   * 获取应付账款统计
   */
  getStatistics(): Promise<FinancialStatistics['accountsPayable']>;

  /**
   * 获取账龄分析
   */
  getAgingAnalysis(): Promise<AgingAnalysis>;

  /**
   * 获取供应商应付账款汇总
   */
  getSupplierSummary(supplierId: string): Promise<{
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    overdueAmount: number;
    paymentHistory: PaymentRecord[];
  }>;
}

/**
 * 应收账款服务接口
 */
export interface IAccountsReceivableService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建应收账款记录
   */
  create(data: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<AccountsReceivable>;

  /**
   * 根据ID获取应收账款
   */
  findById(id: string): Promise<AccountsReceivable | null>;

  /**
   * 获取所有应收账款
   */
  findAll(): Promise<AccountsReceivable[]>;

  /**
   * 分页查询应收账款
   */
  findPaginated(params: PaginationParams, filter?: FinancialFilter): Promise<PaginatedResult<AccountsReceivable>>;

  /**
   * 更新应收账款
   */
  update(id: string, data: Partial<AccountsReceivable>, currentUserId?: string): Promise<AccountsReceivable>;

  /**
   * 删除应收账款
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 查询方法 ====================

  /**
   * 根据客户查询应收账款
   */
  findByCustomer(customerId: string): Promise<AccountsReceivable[]>;

  /**
   * 根据销售订单查询应收账款
   */
  findBySalesOrder(salesOrderId: string): Promise<AccountsReceivable[]>;

  /**
   * 根据状态查询应收账款
   */
  findByStatus(status: AccountsReceivable['status']): Promise<AccountsReceivable[]>;

  /**
   * 获取逾期应收账款
   */
  getOverdueReceivables(): Promise<AccountsReceivable[]>;

  /**
   * 获取即将到期的应收账款
   */
  getUpcomingReceivables(days: number): Promise<AccountsReceivable[]>;

  // ==================== 收款操作 ====================

  /**
   * 记录收款
   */
  recordReceipt(
    receivableId: string,
    amount: number,
    receiptDate: Date,
    paymentMethod: PaymentRecord['paymentMethod'],
    referenceNumber?: string,
    notes?: string,
    currentUserId?: string
  ): Promise<PaymentRecord>;

  /**
   * 获取收款记录
   */
  getReceiptRecords(receivableId: string): Promise<PaymentRecord[]>;

  /**
   * 批量收款
   */
  batchReceipt(
    receipts: Array<{
      receivableId: string;
      amount: number;
      paymentMethod: PaymentRecord['paymentMethod'];
      referenceNumber?: string;
    }>,
    receiptDate: Date,
    currentUserId?: string
  ): Promise<BatchOperationResult<PaymentRecord>>;

  // ==================== 统计和分析 ====================

  /**
   * 获取应收账款统计
   */
  getStatistics(): Promise<FinancialStatistics['accountsReceivable']>;

  /**
   * 获取账龄分析
   */
  getAgingAnalysis(): Promise<AgingAnalysis>;

  /**
   * 获取客户应收账款汇总
   */
  getCustomerSummary(customerId: string): Promise<{
    totalAmount: number;
    receivedAmount: number;
    remainingAmount: number;
    overdueAmount: number;
    receiptHistory: PaymentRecord[];
  }>;

  // ==================== 催收管理 ====================

  /**
   * 生成催收清单
   */
  generateCollectionList(overdueDays?: number): Promise<Array<{
    receivable: AccountsReceivable;
    customerInfo: {
      name: string;
      contactInfo: string;
    };
    overdueDays: number;
    recommendedAction: string;
  }>>;

  /**
   * 记录催收活动
   */
  recordCollectionActivity(
    receivableId: string,
    activityType: 'call' | 'email' | 'letter' | 'visit',
    description: string,
    nextFollowUp?: Date,
    currentUserId?: string
  ): Promise<void>;
}

/**
 * 综合财务服务接口
 */
export interface IFinancialService extends IBusinessService {
  /**
   * 获取综合财务统计
   */
  getComprehensiveStatistics(): Promise<FinancialStatistics>;

  /**
   * 获取现金流分析
   */
  getCashFlowAnalysis(startDate: Date, endDate: Date): Promise<{
    inflows: Array<{
      date: Date;
      amount: number;
      source: string;
    }>;
    outflows: Array<{
      date: Date;
      amount: number;
      destination: string;
    }>;
    netCashFlow: number;
    projectedCashFlow: number;
  }>;

  /**
   * 获取财务健康度评分
   */
  getFinancialHealthScore(): Promise<{
    score: number;
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      description: string;
    }>;
    recommendations: string[];
  }>;

  /**
   * 生成财务报表
   */
  generateFinancialReport(
    reportType: 'balance_sheet' | 'income_statement' | 'cash_flow',
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<any>>;
}
