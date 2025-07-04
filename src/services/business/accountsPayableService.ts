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
  AccountsPayableSchema, 
  PaymentSchema,
  validateEntity 
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

  private async createSampleData(): Promise<void> {
    const samplePayables = [
      {
        billNo: 'AP001',
        supplierId: 'supplier-1',
        orderId: 'purchase-order-1',
        billDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30天前
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15天前（已逾期）
        totalAmount: 150000,
        paidAmount: 50000,
        balanceAmount: 100000,
        status: PayableStatus.PARTIAL
      },
      {
        billNo: 'AP002',
        supplierId: 'supplier-2',
        orderId: 'purchase-order-2',
        billDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20天前
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10天后
        totalAmount: 89000,
        paidAmount: 0,
        balanceAmount: 89000,
        status: PayableStatus.UNPAID
      },
      {
        billNo: 'AP003',
        supplierId: 'supplier-1',
        billDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20天后
        totalAmount: 45000,
        paidAmount: 45000,
        balanceAmount: 0,
        status: PayableStatus.PAID
      }
    ];

    for (const payableData of samplePayables) {
      await this.create(payableData);
    }

    // 创建示例付款记录
    const samplePayments = [
      {
        paymentNo: 'PAY001',
        payableId: '', // 将在下面设置
        paymentDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        amount: 50000,
        remark: '首期付款',
        operator: '财务专员'
      },
      {
        paymentNo: 'PAY002',
        payableId: '', // 将在下面设置
        paymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        amount: 45000,
        remark: '全额付款',
        operator: '财务专员'
      }
    ];

    // 为付款记录分配应付账款ID
    const payableIds = Array.from(this.payables.keys());
    if (payableIds.length >= 2) {
      samplePayments[0].payableId = payableIds[0];
      samplePayments[1].payableId = payableIds[2];

      for (const paymentData of samplePayments) {
        await this.addPayment(paymentData);
      }
    }
  }

  // 创建应付账款
  async create(data: Omit<AccountsPayable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsPayable> {
    const validation = validateEntity(AccountsPayableSchema, data);
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

    const validation = validateEntity(AccountsPayableSchema, updated);
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
    const now = new Date();
    return Array.from(this.payables.values())
      .filter(payable => 
        payable.status !== PayableStatus.PAID && 
        payable.dueDate < now
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // 添加付款记录
  async addPayment(data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payment> {
    const validation = validateEntity(PaymentSchema, data);
    if (!validation.success) {
      throw new Error(`付款记录数据验证失败: ${validation.errors?.join(', ')}`);
    }

    const payable = this.payables.get(data.payableId);
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
    
    const paymentIds = this.paymentsByPayable.get(data.payableId) || [];
    paymentIds.push(payment.id);
    this.paymentsByPayable.set(data.payableId, paymentIds);

    // 更新应付账款状态
    await this.updatePayableStatus(data.payableId, data.amount);

    return payment;
  }

  // 更新应付账款状态
  private async updatePayableStatus(payableId: string, paidAmount: number): Promise<void> {
    const payable = this.payables.get(payableId);
    if (!payable) return;

    const newPaidAmount = payable.paidAmount + paidAmount;
    const newBalanceAmount = payable.totalAmount - newPaidAmount;
    
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
    const paymentIds = this.paymentsByPayable.get(payableId) || [];
    return paymentIds
      .map(id => this.payments.get(id))
      .filter((payment): payment is Payment => payment !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 删除付款记录
  async removePayment(paymentId: string): Promise<void> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new Error(`付款记录不存在: ${paymentId}`);
    }

    // 更新应付账款状态
    const payable = this.payables.get(payment.payableId);
    if (payable) {
      const newPaidAmount = payable.paidAmount - payment.amount;
      const newBalanceAmount = payable.totalAmount - newPaidAmount;
      
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
    
    const paymentIds = this.paymentsByPayable.get(payment.payableId) || [];
    const index = paymentIds.indexOf(paymentId);
    if (index > -1) {
      paymentIds.splice(index, 1);
      this.paymentsByPayable.set(payment.payableId, paymentIds);
    }
  }

  // 生成下一个账单编号
  async generateBillNo(): Promise<string> {
    const prefix = 'AP';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    let maxNumber = 0;
    const pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const billNo of this.billNoIndex.keys()) {
      const match = billNo.match(pattern);
      if (match) {
        const number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${prefix}${year}${month}${nextNumber}`;
  }

  // 生成下一个付款单号
  async generatePaymentNo(): Promise<string> {
    const prefix = 'PAY';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    let maxNumber = 0;
    const pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const payment of this.payments.values()) {
      const match = payment.paymentNo.match(pattern);
      if (match) {
        const number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
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
    const payables = await this.findAll();
    const overduePayables = await this.findOverdue();
    
    const totalAmount = payables.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidAmount = payables.reduce((sum, p) => sum + p.paidAmount, 0);
    const balanceAmount = payables.reduce((sum, p) => sum + p.balanceAmount, 0);
    
    // 计算平均付款周期
    const paidPayables = payables.filter(p => p.status === PayableStatus.PAID);
    const avgPaymentPeriod = paidPayables.length > 0 
      ? paidPayables.reduce((sum, p) => {
          const billDate = new Date(p.billDate);
          const paymentDate = new Date(p.updatedAt); // 简化：使用更新时间作为付款时间
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
    const payments = await this.findAllPayments();
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
}

// 创建并导出服务实例
const accountsPayableService = new AccountsPayableService();
export default accountsPayableService;