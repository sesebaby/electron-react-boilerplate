// 简化版应付账款服务 - 用于测试导入
export class AccountsPayableServiceSimple {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('AccountsPayableServiceSimple already initialized');
      return;
    }

    console.log('Initializing AccountsPayableServiceSimple...');
    this.initialized = true;
    console.log('AccountsPayableServiceSimple initialized successfully');
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
    return {
      total: 0,
      unpaid: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      balanceAmount: 0,
      avgPaymentPeriod: 0
    };
  }

  // 查找所有应付账款
  async findAll(): Promise<any[]> {
    return [];
  }

  // 获取所有付款记录
  async findAllPayments(): Promise<any[]> {
    return [];
  }
}

// 创建并导出服务实例
const accountsPayableServiceSimple = new AccountsPayableServiceSimple();
export default accountsPayableServiceSimple;
