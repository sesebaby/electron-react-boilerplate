// 应付账款服务
import { 
  AccountsPayable, 
  Payment, 
  PayableStatus, 
  PaymentMethod,
  Supplier,
  PurchaseOrder 
} from '../../types/entities';
import { 
  _AccountsPayableSchema, 
  _PaymentSchema,
  _validateEntity 
} from '../../schemas/validation';

export class AccountsPayableService {
  private payables: Map<string, AccountsPayable> = new Map();
  private payments: Map<string, Payment> = new Map();
  private billNoIndex: Map<string, string> = new Map();
  private paymentsByPayable: Map<string, string[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('AccountsPayableService already initialized');
      return;
    }

    console.log('Initializing AccountsPayableService...');
    
    // 不再自动创建示例数据，保持空白状态
    
    this.initialized = true;
    console.log('AccountsPayableService initialized successfully');
  }



  // 创建应付账款
  async create(data: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsPayable> {
    const validation = _validateEntity(_AccountsPayableSchema, data);
    if (!validation.success) {
      throw new Error(`应付账款数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 检查账单编号是否已存在
    if (this.billNoIndex.has(data.billNo)) {
      throw new Error(`账单编号 ${data.billNo} 已存在`);
    }

    const payable: AccountsPayable = {
      ...data,
      id: `payable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.payables.set(payable.id, payable);
    this.billNoIndex.set(payable.billNo, payable.id);
    this.paymentsByPayable.set(payable.id, []);

    return payable;
  }

  // 更新应付账款
  async update(id: string, data: Partial<Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AccountsPayable> {
    const existing = this.payables.get(id);
    if (!existing) {
      throw new Error(`应付账款不存在: ${id}`);
    }

    // 如果更新账单编号，检查新编号是否已存在
    if (data.billNo && data.billNo !== existing.billNo) {
      if (this.billNoIndex.has(data.billNo)) {
        throw new Error(`账单编号 ${data.billNo} 已存在`);
      }
      this.billNoIndex.delete(existing.billNo);
      this.billNoIndex.set(data.billNo, id);
    }

    const updated: AccountsPayable = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    const validation = _validateEntity(_AccountsPayableSchema, updated);
    if (!validation.success) {
      throw new Error(`应付账款数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.payables.set(id, updated);
    return updated;
  }

  // 删除应付账款
  async delete(id: string): Promise<void> {
    const payable = this.payables.get(id);
    if (!payable) {
      throw new Error(`应付账款不存在: ${id}`);
    }

    // 检查是否有关联的付款记录
    const payments = this.paymentsByPayable.get(id) || [];
    if (payments.length > 0) {
      throw new Error('无法删除已有付款记录的应付账款');
    }

    this.payables.delete(id);
    this.billNoIndex.delete(payable.billNo);
    this.paymentsByPayable.delete(id);
  }

  // 查找所有应付账款
  async findAll(): Promise<AccountsPayable[]> {
    return Array.from(this.payables.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 根据ID查找应付账款
  async findById(id: string): Promise<AccountsPayable | null> {
    return this.payables.get(id) || null;
  }

  // 根据账单编号查找应付账款
  async findByBillNo(billNo: string): Promise<AccountsPayable | null> {
    const id = this.billNoIndex.get(billNo);
    return id ? this.payables.get(id) || null : null;
  }

  // 根据供应商查找应付账款
  async findBySupplier(supplierId: string): Promise<AccountsPayable[]> {
    return Array.from(this.payables.values())
      .filter(payable => payable.supplierId === supplierId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 根据状态查找应付账款
  async findByStatus(status: PayableStatus): Promise<AccountsPayable[]> {
    return Array.from(this.payables.values())
      .filter(payable => payable.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 查找逾期应付账款
  async findOverdue(): Promise<AccountsPayable[]> {
    const _now = new Date();
    return Array.from(this.payables.values())
      .filter(payable => 
        payable.status !== PayableStatus.PAID && 
        payable.dueDate < now
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // 添加付款记录
  async addPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const _validation = validateEntity(PaymentSchema, data);
    if (!validation.success) {
      throw new Error(`付款记录数据验证失败: ${validation.errors?.join(', ')}`);
    }

    const _payable = this.payables.get(data.payableId);
    if (!payable) {
      throw new Error(`应付账款不存在: ${data.payableId}`);
    }

    if (payable.status === PayableStatus.PAID) {
      throw new Error('该应付账款已完全付款');
    }

    if (data.amount > payable.balanceAmount) {
      throw new Error('付款金额不能超过余额');
    }

    const payment: Payment = {
      ...data,
      id: `payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.payments.set(payment.id, payment);
    
    const _paymentIds = this.paymentsByPayable.get(data.payableId) || [];
    paymentIds.push(payment.id);
    this.paymentsByPayable.set(data.payableId, paymentIds);

    // 更新应付账款状态
    await this.updatePayableStatus(data.payableId, data.amount);

    return payment;
  }

  // 更新应付账款状态
  private async updatePayableStatus(payableId: string, paidAmount: number): Promise<void> {
    const _payable = this.payables.get(payableId);
    if (!payable) return;

    const _newPaidAmount = payable.paidAmount + paidAmount;
    const _newBalanceAmount = payable.totalAmount - newPaidAmount;
    
    let newStatus: PayableStatus;
    if (newBalanceAmount <= 0) {
      newStatus = PayableStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = PayableStatus.PARTIAL;
    } else {
      newStatus = PayableStatus.UNPAID;
    }

    await this.update(payableId, {
      paidAmount: newPaidAmount,
      balanceAmount: Math.max(0, newBalanceAmount),
      status: newStatus
    });
  }

  // 获取应付账款的付款记录
  async getPayments(payableId: string): Promise<Payment[]> {
    const _paymentIds = this.paymentsByPayable.get(payableId) || [];
    return paymentIds
      .map(id => this.payments.get(id))
      .filter((payment): payment is Payment => payment !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 删除付款记录
  async removePayment(paymentId: string): Promise<void> {
    const _payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`付款记录不存在: ${paymentId}`);
    }

    // 更新应付账款状态
    const _payable = this.payables.get(payment.payableId);
    if (payable) {
      const _newPaidAmount = payable.paidAmount - payment.amount;
      const _newBalanceAmount = payable.totalAmount - newPaidAmount;
      
      let newStatus: PayableStatus;
      if (newBalanceAmount <= 0) {
        newStatus = PayableStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = PayableStatus.PARTIAL;
      } else {
        newStatus = PayableStatus.UNPAID;
      }

      await this.update(payment.payableId, {
        paidAmount: Math.max(0, newPaidAmount),
        balanceAmount: Math.max(0, newBalanceAmount),
        status: newStatus
      });
    }

    // 删除付款记录
    this.payments.delete(paymentId);
    
    const _paymentIds = this.paymentsByPayable.get(payment.payableId) || [];
    const _index = paymentIds.indexOf(paymentId);
    if (index > -1) {
      paymentIds.splice(index, 1);
      this.paymentsByPayable.set(payment.payableId, paymentIds);
    }
  }


  // 生成下一个付款单号
  async generatePaymentNo(): Promise<string> {
    const _prefix = 'PAY';
    const _year = new Date().getFullYear().toString().slice(-2);
    const _month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    const _maxNumber = 0;
    const _pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const payment of this.payments.values()) {
      const _match = payment.paymentNo.match(pattern);
      if (match) {
        const _number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const _nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${year}${month}${nextNumber}`;
  }

  // 获取应付账款统计
  async getPayableStats(): Promise<{
    total: number;
    unpaid: number;
    partial: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    avgPaymentPeriod: number;
  }> {
    const _payables = await this.findAll();
    const _overduePayables = await this.findOverdue();
    
    const _totalAmount = payables.reduce((sum, p) => sum + p.totalAmount, 0);
    const _paidAmount = payables.reduce((sum, p) => sum + p.paidAmount, 0);
    const _balanceAmount = payables.reduce((sum, p) => sum + p.balanceAmount, 0);
    
    // 计算平均付款周期
    const _paidPayables = payables.filter(p => p.status === PayableStatus.PAID);
    const _avgPaymentPeriod = paidPayables.length > 0 
      ? paidPayables.reduce((sum, p) => {
          const _billDate = new Date(p.billDate);
          const _paymentDate = new Date(p.updatedAt); // 简化：使用更新时间作为付款时间
          return sum + (paymentDate.getTime() - billDate.getTime()) / (24 * 60 * 60 * 1000);
        }, 0) / paidPayables.length
      : 0;

    return {
      total: payables.length,
      unpaid: payables.filter(p => p.status === PayableStatus.UNPAID).length,
      partial: payables.filter(p => p.status === PayableStatus.PARTIAL).length,
      paid: payables.filter(p => p.status === PayableStatus.PAID).length,
      overdue: overduePayables.length,
      totalAmount,
      paidAmount,
      balanceAmount,
      avgPaymentPeriod: Math.round(avgPaymentPeriod)
    };
  }

  // 获取所有付款记录
  async findAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // 根据付款方式统计
  async getPaymentMethodStats(): Promise<Record<PaymentMethod, { count: number; amount: number }>> {
    const _payments = await this.findAllPayments();
    const stats: Record<PaymentMethod, { count: number; amount: number }> = {
      [PaymentMethod.CASH]: { count: 0, amount: 0 },
      [PaymentMethod.BANK]: { count: 0, amount: 0 },
      [PaymentMethod.BANK_TRANSFER]: { count: 0, amount: 0 },
      [PaymentMethod.CHECK]: { count: 0, amount: 0 },
      [PaymentMethod.CREDIT_CARD]: { count: 0, amount: 0 },
      [PaymentMethod.OTHER]: { count: 0, amount: 0 }
    };

    payments.forEach(payment => {
      stats[payment.paymentMethod].count++;
      stats[payment.paymentMethod].amount += payment.amount;
    });

    return stats;
  }

  // =============== 业务集成方法 ===============

  /**
   * 从采购订单自动生成应付账款
   */
  async createFromPurchaseOrder(purchaseOrder: PurchaseOrder, paymentTermsDays: number = 30): Promise<AccountsPayable> {
    // 检查是否已经为此订单生成过应付账款
    const _existingPayable = Array.from(this.payables.values())
      .find(p => p.orderId === purchaseOrder.id);
    
    if (existingPayable) {
      console.log(`应付账款已存在于订单 ${purchaseOrder.orderNo}: ${existingPayable.billNo}`);
      return existingPayable;
    }

    // 生成应付账款单号
    const _billNo = await this.generateBillNo();
    
    // 计算到期日期（根据付款条件）
    const _billDate = new Date();
    const _dueDate = new Date(billDate.getTime() + paymentTermsDays * 24 * 60 * 60 * 1000);

    const _payableData = {
      billNo,
      supplierId: purchaseOrder.supplierId,
      orderId: purchaseOrder.id,
      billDate,
      dueDate,
      totalAmount: purchaseOrder.finalAmount,
      paidAmount: 0,
      balanceAmount: purchaseOrder.finalAmount,
      status: PayableStatus.UNPAID,
      terms: `${paymentTermsDays}天付款期`,
      reference: `采购订单: ${purchaseOrder.orderNo}`
    };

    console.log(`自动生成应付账款: 订单 ${purchaseOrder.orderNo} -> 应付账款 ${billNo}, 金额 ${purchaseOrder.finalAmount}`);
    
    return await this.create(payableData);
  }

  /**
   * 生成应付账款单号
   */
  async generateBillNo(): Promise<string> {
    const _now = new Date();
    const _dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const _sequence = String(this.payables.size + 1).padStart(3, '0');
    return `AP${dateStr}${sequence}`;
  }
}

// 创建并导出服务实例
const _accountsPayableService = new AccountsPayableService();
export default accountsPayableService;