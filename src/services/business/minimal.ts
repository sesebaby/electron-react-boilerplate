// 最小业务服务 - 用于渐进式开发测试

// 简单的服务管理器，确保基础功能正常
export class MinimalBusinessServiceManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('Business services already initialized');
      return;
    }

    console.log('Initializing minimal business services...');
    
    // 模拟初始化延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.initialized = true;
    console.log('Minimal business services initialized successfully');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getSystemStatus(): Promise<{
    initialized: boolean;
    services: Array<{
      name: string;
      status: 'active' | 'error';
    }>;
  }> {
    return {
      initialized: this.initialized,
      services: [
        { name: 'MinimalService', status: 'active' }
      ]
    };
  }
}

// 创建并导出服务管理器实例
export const minimalBusinessServiceManager = new MinimalBusinessServiceManager();

// 默认导出
export default minimalBusinessServiceManager;