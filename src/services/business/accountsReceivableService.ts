// 应收账款服务
import { 
  AccountsReceivable, 
  Receipt, 
  ReceivableStatus, 
  PaymentMethod,
  Customer,
  SalesOrder 
} from '../../types/entities';
import { 
  AccountsReceivableSchema, 
  ReceiptSchema,
  validateEntity 
} from '../../schemas/validation';

export class AccountsReceivableService {
  private receivables: Map<string, AccountsReceivable> = new Map();
  private receipts: Map<string, Receipt> = new Map();
  private billNoIndex: Map<string, string> = new Map();
  private receiptsByReceivable: Map<string, string[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('AccountsReceivableService already initialized');
      return;
    }

    console.log('Initializing AccountsReceivableService...');
    
    // 不再自动创建示例数据，保持空白状态
    
    this.initialized = true;
    console.log('AccountsReceivableService initialized successfully');
  }



  // 创建应收账款
  async create(data: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsReceivable> {
    const _validation = validateEntity(AccountsReceivableSchema, data);
    if (!validation.success) {
      throw new Error(`应收账款数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查发票编号是否已存在
    if (this.billNoIndex.has(data.billNo)) {
      throw new Error(`发票编号 ${data.billNo} 已存在`);
    }

    const receivable: AccountsReceivable = {
      ...data,
      id: `receivable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.receivables.set(receivable.id, receivable);
    this.billNoIndex.set(receivable.billNo, receivable.id);
    this.receiptsByReceivable.set(receivable.id, []);

    return receivable;
  }

  // 更新应收账款
  async update(id: string, data: Partial<Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AccountsReceivable> {
    const _existing = this.receivables.get(id);
    if (!existing) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    // 如果更新发票编号，检查新编号是否已存在
    if (data.billNo && data.billNo !== existing.billNo) {
      if (this.billNoIndex.has(data.billNo)) {
        throw new Error(`发票编号 ${data.billNo} 已存在`);
      }
      this.billNoIndex.delete(existing.billNo);
      this.billNoIndex.set(data.billNo, id);
    }

    const updated: AccountsReceivable = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    const _validation = validateEntity(AccountsReceivableSchema, updated);
    if (!validation.success) {
      throw new Error(`应收账款数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.receivables.set(id, updated);
    return updated;
  }

  // 删除应收账款
  async delete(id: string): Promise<void> {
    const _receivable = this.receivables.get(id);
    if (!receivable) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    // 检查是否有关联的收款记录
    const _receipts = this.receiptsByReceivable.get(id) || [];
    if (receipts.length > 0) {
      throw new Error('无法删除已有收款记录的应收账款');
    }

    this.receivables.delete(id);
    this.billNoIndex.delete(receivable.billNo);
    this.receiptsByReceivable.delete(id);
  }

  // 查找所有应收账款
  async findAll(): Promise<AccountsReceivable[]> {
    return Array.from(this.receivables.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 根据ID查找应收账款
  async findById(id: string): Promise<AccountsReceivable | null> {
    return this.receivables.get(id) || null;
  }

  // 根据发票编号查找应收账款
  async findByInvoiceNo(billNo: string): Promise<AccountsReceivable | null> {
    const _id = this.billNoIndex.get(billNo);
    return id ? this.receivables.get(id) || null : null;
  }

  // 根据客户查找应收账款
  async findByCustomer(customerId: string): Promise<AccountsReceivable[]> {
    return Array.from(this.receivables.values())
      .filter(receivable => receivable.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 根据状态查找应收账款
  async findByStatus(status: ReceivableStatus): Promise<AccountsReceivable[]> {
    return Array.from(this.receivables.values())
      .filter(receivable => receivable.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 查找逾期应收账款
  async findOverdue(): Promise<AccountsReceivable[]> {
    const _now = new Date();
    return Array.from(this.receivables.values())
      .filter(receivable => 
        receivable.status !== ReceivableStatus.PAID && 
        receivable.dueDate < now
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // 添加收款记录
  async addReceipt(data: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    const _validation = validateEntity(ReceiptSchema, data);
    if (!validation.success) {
      throw new Error(`收款记录数据验证失败: ${validation.errors?.join(', ')}`);
    }

    const _receivable = this.receivables.get(data.receivableId);
    if (!receivable) {
      throw new Error(`应收账款不存在: ${data.receivableId}`);
    }

    if (receivable.status === ReceivableStatus.PAID) {
      throw new Error('该应收账款已完全收款');
    }

    if (data.amount > receivable.balanceAmount) {
      throw new Error('收款金额不能超过余额');
    }

    const receipt: Receipt = {
      ...data,
      id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.receipts.set(receipt.id, receipt);
    
    const _receiptIds = this.receiptsByReceivable.get(data.receivableId) || [];
    receiptIds.push(receipt.id);
    this.receiptsByReceivable.set(data.receivableId, receiptIds);

    // 更新应收账款状态
    await this.updateReceivableStatus(data.receivableId, data.amount);

    return receipt;
  }

  // 更新应收账款状态
  private async updateReceivableStatus(receivableId: string, receivedAmount: number): Promise<void> {
    const _receivable = this.receivables.get(receivableId);
    if (!receivable) return;

    const _newReceivedAmount = receivable.receivedAmount + receivedAmount;
    const _newBalanceAmount = receivable.totalAmount - newReceivedAmount;
    
    let newStatus: ReceivableStatus;
    if (newBalanceAmount <= 0) {
      newStatus = ReceivableStatus.PAID;
    } else if (newReceivedAmount > 0) {
      newStatus = ReceivableStatus.PARTIAL;
    } else {
      newStatus = ReceivableStatus.UNPAID;
    }

    await this.update(receivableId, {
      receivedAmount: newReceivedAmount,
      balanceAmount: Math.max(0, newBalanceAmount),
      status: newStatus
    });
  }

  // 获取应收账款的收款记录
  async getReceipts(receivableId: string): Promise<Receipt[]> {
    const _receiptIds = this.receiptsByReceivable.get(receivableId) || [];
    return receiptIds
      .map(id => this.receipts.get(id))
      .filter((receipt): receipt is Receipt => receipt !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 删除收款记录
  async removeReceipt(receiptId: string): Promise<void> {
    const _receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error(`收款记录不存在: ${receiptId}`);
    }

    // 更新应收账款状态
    const _receivable = this.receivables.get(receipt.receivableId);
    if (receivable) {
      const _newReceivedAmount = receivable.receivedAmount - receipt.amount;
      const _newBalanceAmount = receivable.totalAmount - newReceivedAmount;
      
      let newStatus: ReceivableStatus;
      if (newBalanceAmount <= 0) {
        newStatus = ReceivableStatus.PAID;
      } else if (newReceivedAmount > 0) {
        newStatus = ReceivableStatus.PARTIAL;
      } else {
        newStatus = ReceivableStatus.UNPAID;
      }

      await this.update(receipt.receivableId, {
        receivedAmount: Math.max(0, newReceivedAmount),
        balanceAmount: Math.max(0, newBalanceAmount),
        status: newStatus
      });
    }

    // 删除收款记录
    this.receipts.delete(receiptId);
    
    const _receiptIds = this.receiptsByReceivable.get(receipt.receivableId) || [];
    const _index = receiptIds.indexOf(receiptId);
    if (index > -1) {
      receiptIds.splice(index, 1);
      this.receiptsByReceivable.set(receipt.receivableId, receiptIds);
    }
  }

  // 生成下一个发票编号
  async generateInvoiceNo(): Promise<string> {
    const _prefix = 'AR';
    const _year = new Date().getFullYear().toString().slice(-2);
    const _month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const _maxNumber = 0;
    const _pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const billNo of this.billNoIndex.keys()) {
      const _match = billNo.match(pattern);
      if (match) {
        const _number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const _nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${year}${month}${nextNumber}`;
  }

  // 生成下一个收款单号
  async generateReceiptNo(): Promise<string> {
    const _prefix = 'REC';
    const _year = new Date().getFullYear().toString().slice(-2);
    const _month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const _maxNumber = 0;
    const _pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const receipt of this.receipts.values()) {
      const _match = receipt.receiptNo.match(pattern);
      if (match) {
        const _number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const _nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${year}${month}${nextNumber}`;
  }

  // 获取应收账款统计
  async getReceivableStats(): Promise<{
    total: number;
    unpaid: number;
    partial: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    receivedAmount: number;
    balanceAmount: number;
    avgCollectionPeriod: number;
  }> {
    const _receivables = await this.findAll();
    const _overdueReceivables = await this.findOverdue();
    
    const _totalAmount = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
    const _receivedAmount = receivables.reduce((sum, r) => sum + r.receivedAmount, 0);
    const _balanceAmount = receivables.reduce((sum, r) => sum + r.balanceAmount, 0);
    
    // 计算平均收款周期
    const _paidReceivables = receivables.filter(r => r.status === ReceivableStatus.PAID);
    const _avgCollectionPeriod = paidReceivables.length > 0 
      ? paidReceivables.reduce((sum, r) => {
          const _billDate = new Date(r.billDate);
          const _collectionDate = new Date(r.updatedAt); // 简化：使用更新时间作为收款时间
          return sum + (collectionDate.getTime() - billDate.getTime()) / (24 * 60 * 60 * 1000);
        }, 0) / paidReceivables.length
      : 0;

    return {
      total: receivables.length,
      unpaid: receivables.filter(r => r.status === ReceivableStatus.UNPAID).length,
      partial: receivables.filter(r => r.status === ReceivableStatus.PARTIAL).length,
      paid: receivables.filter(r => r.status === ReceivableStatus.PAID).length,
      overdue: overdueReceivables.length,
      totalAmount,
      receivedAmount,
      balanceAmount,
      avgCollectionPeriod: Math.round(avgCollectionPeriod)
    };
  }

  // 获取所有收款记录
  async findAllReceipts(): Promise<Receipt[]> {
    return Array.from(this.receipts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 根据收款方式统计
  async getReceiptMethodStats(): Promise<Record<PaymentMethod, { count: number; amount: number }>> {
    const _receipts = await this.findAllReceipts();
    const stats: Record<PaymentMethod, { count: number; amount: number }> = {
      [PaymentMethod.CASH]: { count: 0, amount: 0 },
      [PaymentMethod.BANK]: { count: 0, amount: 0 },
      [PaymentMethod.BANK_TRANSFER]: { count: 0, amount: 0 },
      [PaymentMethod.CHECK]: { count: 0, amount: 0 },
      [PaymentMethod.CREDIT_CARD]: { count: 0, amount: 0 },
      [PaymentMethod.OTHER]: { count: 0, amount: 0 }
    };

    receipts.forEach(receipt => {
      stats[receipt.paymentMethod].count++;
      stats[receipt.paymentMethod].amount += receipt.amount;
    });

    return stats;
  }

  // =============== 业务集成方法 ===============

  /**
   * 从销售订单自动生成应收账款
   */
  async createFromSalesOrder(salesOrder: SalesOrder, paymentTermsDays: number = 30): Promise<AccountsReceivable> {
    // 检查是否已经为此订单生成过应收账款
    const _existingReceivable = Array.from(this.receivables.values())
      .find(r => r.orderId === salesOrder.id);
    
    if (existingReceivable) {
      console.log(`应收账款已存在于订单 ${salesOrder.orderNo}: ${existingReceivable.billNo}`);
      return existingReceivable;
    }

    // 生成应收账款单号
    const _billNo = await this.generateBillNo();
    
    // 计算到期日期（根据付款条件）
    const _billDate = new Date();
    const _dueDate = new Date(billDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    const _receivableData = {
      billNo,
      customerId: salesOrder.customerId,
      orderId: salesOrder.id,
      billDate,
      dueDate,
      totalAmount: salesOrder.finalAmount,
      receivedAmount: 0,
      balanceAmount: salesOrder.finalAmount,
      status: ReceivableStatus.UNPAID,
      terms: `${paymentTermsDays}天付款期`,
      reference: `销售订单: ${salesOrder.orderNo}`
    };

    console.log(`自动生成应收账款: 订单 ${salesOrder.orderNo} -> 应收账款 ${billNo}, 金额 ${salesOrder.finalAmount}`);
    
    return await this.create(receivableData);
  }

  /**
   * 生成应收账款单号
   */
  private async generateBillNo(): Promise<string> {
    const _now = new Date();
    const _dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const _sequence = String(this.receivables.size + 1).padStart(3, '0');
    return `AR${dateStr}${sequence}`;
  }
}

// 创建并导出服务实例
const _accountsReceivableService = new AccountsReceivableService();
export default accountsReceivableService;