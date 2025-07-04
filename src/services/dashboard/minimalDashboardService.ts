// 最小Dashboard服务 - 用于渐进式开发测试

export interface MinimalDashboardOverview {
  totalProducts: number;
  totalSuppliers: number;
  totalCustomers: number;
  totalWarehouses: number;
  systemStatus: string;
}

export class MinimalDashboardService {
  async initialize(): Promise<void> {
    console.log('Minimal dashboard service initialized');
  }

  async getOverview(): Promise<MinimalDashboardOverview> {
    // 返回模拟数据
    return {
      totalProducts: 150,
      totalSuppliers: 25,
      totalCustomers: 80,
      totalWarehouses: 3,
      systemStatus: 'healthy'
    };
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
  }> {
    return {
      status: 'healthy',
      message: '系统运行正常'
    };
  }
}

export default new MinimalDashboardService();