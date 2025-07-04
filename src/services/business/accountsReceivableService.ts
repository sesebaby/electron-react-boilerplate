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
    
    // 创建示例应收账款数据
    await this.createSampleData();
    
    this.initialized = true;
    console.log('AccountsReceivableService initialized successfully');
  }

  private async createSampleData(): Promise<void> {
    const sampleReceivables = [
      {
        billNo: 'AR001',
        customerId: 'customer-1',
        orderId: 'sales-order-1',
        billDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000), // 25天前
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10天前（已逾期）
        totalAmount: 89000,
        receivedAmount: 30000,
        balanceAmount: 59000,
        status: ReceivableStatus.PARTIAL
      },
      {
        billNo: 'AR002',
        customerId: 'customer-2',
        orderId: 'sales-order-2',
        billDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18天前
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // 12天后
        totalAmount: 125000,
        receivedAmount: 0,
        balanceAmount: 125000,
        status: ReceivableStatus.UNPAID
      },
      {
        billNo: 'AR003',
        customerId: 'customer-1',
        billDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8天前
        dueDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // 22天后
        totalAmount: 67000,
        receivedAmount: 67000,
        balanceAmount: 0,
        status: ReceivableStatus.PAID
      }
    ];

    for (const receivableData of sampleReceivables) {
      await this.create(receivableData);
    }

    // 创建示例收款记录
    const sampleReceipts = [
      {
        receiptNo: 'REC001',
        receivableId: '', // 将在下面设置
        receiptDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        amount: 30000,
        remark: '首期收款',
        operator: '销售专员'
      },
      {
        receiptNo: 'REC002',
        receivableId: '', // 将在下面设置
        receiptDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        amount: 67000,
        remark: '全额收款',
        operator: '销售专员'
      }
    ];

    // 为收款记录分配应收账款ID
    const receivableIds = Array.from(this.receivables.keys());
    if (receivableIds.length >= 2) {
      sampleReceipts[0].receivableId = receivableIds[0];
      sampleReceipts[1].receivableId = receivableIds[2];

      for (const receiptData of sampleReceipts) {
        await this.addReceipt(receiptData);
      }
    }
  }

  // 创建应收账款
  async create(data: Omit<AccountsReceivable, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountsReceivable> {
    const validation = validateEntity(AccountsReceivableSchema, data);
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
    const existing = this.receivables.get(id);
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

    const validation = validateEntity(AccountsReceivableSchema, updated);
    if (!validation.success) {
      throw new Error(`应收账款数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.receivables.set(id, updated);
    return updated;
  }

  // 删除应收账款
  async delete(id: string): Promise<void> {
    const receivable = this.receivables.get(id);
    if (!receivable) {
      throw new Error(`应收账款不存在: ${id}`);
    }

    // 检查是否有关联的收款记录
    const receipts = this.receiptsByReceivable.get(id) || [];
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
    const id = this.billNoIndex.get(billNo);
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
    const now = new Date();
    return Array.from(this.receivables.values())
      .filter(receivable => 
        receivable.status !== ReceivableStatus.PAID && 
        receivable.dueDate < now
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  // 添加收款记录
  async addReceipt(data: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<Receipt> {
    const validation = validateEntity(ReceiptSchema, data);
    if (!validation.success) {
      throw new Error(`收款记录数据验证失败: ${validation.errors?.join(', ')}`);
    }

    const receivable = this.receivables.get(data.receivableId);
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
    
    const receiptIds = this.receiptsByReceivable.get(data.receivableId) || [];
    receiptIds.push(receipt.id);
    this.receiptsByReceivable.set(data.receivableId, receiptIds);

    // 更新应收账款状态
    await this.updateReceivableStatus(data.receivableId, data.amount);

    return receipt;
  }

  // 更新应收账款状态
  private async updateReceivableStatus(receivableId: string, receivedAmount: number): Promise<void> {
    const receivable = this.receivables.get(receivableId);
    if (!receivable) return;

    const newReceivedAmount = receivable.receivedAmount + receivedAmount;
    const newBalanceAmount = receivable.totalAmount - newReceivedAmount;
    
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
    const receiptIds = this.receiptsByReceivable.get(receivableId) || [];
    return receiptIds
      .map(id => this.receipts.get(id))
      .filter((receipt): receipt is Receipt => receipt !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 删除收款记录
  async removeReceipt(receiptId: string): Promise<void> {
    const receipt = this.receipts.get(receiptId);
    if (!receipt) {
      throw new Error(`收款记录不存在: ${receiptId}`);
    }

    // 更新应收账款状态
    const receivable = this.receivables.get(receipt.receivableId);
    if (receivable) {
      const newReceivedAmount = receivable.receivedAmount - receipt.amount;
      const newBalanceAmount = receivable.totalAmount - newReceivedAmount;
      
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
    
    const receiptIds = this.receiptsByReceivable.get(receipt.receivableId) || [];
    const index = receiptIds.indexOf(receiptId);
    if (index > -1) {
      receiptIds.splice(index, 1);
      this.receiptsByReceivable.set(receipt.receivableId, receiptIds);
    }
  }

  // 生成下一个发票编号
  async generateInvoiceNo(): Promise<string> {
    const prefix = 'AR';
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

  // 生成下一个收款单号
  async generateReceiptNo(): Promise<string> {
    const prefix = 'REC';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    
    let maxNumber = 0;
    const pattern = new RegExp(`^${prefix}${year}${month}(\\d{3})$`);
    
    for (const receipt of this.receipts.values()) {
      const match = receipt.receiptNo.match(pattern);
      if (match) {
        const number = parseInt(match[1]);
        maxNumber = Math.max(maxNumber, number);
      }
    }
    
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
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
    const receivables = await this.findAll();
    const overdueReceivables = await this.findOverdue();
    
    const totalAmount = receivables.reduce((sum, r) => sum + r.totalAmount, 0);
    const receivedAmount = receivables.reduce((sum, r) => sum + r.receivedAmount, 0);
    const balanceAmount = receivables.reduce((sum, r) => sum + r.balanceAmount, 0);
    
    // 计算平均收款周期
    const paidReceivables = receivables.filter(r => r.status === ReceivableStatus.PAID);
    const avgCollectionPeriod = paidReceivables.length > 0 
      ? paidReceivables.reduce((sum, r) => {
          const billDate = new Date(r.billDate);
          const collectionDate = new Date(r.updatedAt); // 简化：使用更新时间作为收款时间
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
    const receipts = await this.findAllReceipts();
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
}

// 创建并导出服务实例
const accountsReceivableService = new AccountsReceivableService();
export default accountsReceivableService;