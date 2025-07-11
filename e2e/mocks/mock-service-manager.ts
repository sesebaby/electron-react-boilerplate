import { Page } from '@playwright/test';

/**
 * Mock服务管理器
 * 用于在测试中模拟各种服务和API响应
 */
export class MockServiceManager {
  private page: Page;
  private activeMocks: Map<string, any> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 模拟数据库服务响应
   */
  async mockDatabaseService(mockConfig: {
    method: string;
    response?: any;
    error?: string;
    delay?: number;
  }): Promise<void> {
    const { method, response, error, delay = 0 } = mockConfig;
    
    await this.page.addInitScript(({ method, response, error, delay }) => {
      // @ts-ignore
      if (!window.__mockServices) {
        // @ts-ignore
        window.__mockServices = {};
      }
      
      // @ts-ignore
      window.__mockServices[method] = async (...args: any[]) => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        if (error) {
          throw new Error(error);
        }
        
        return response || { success: true, data: null };
      };
    }, { method, response, error, delay });

    this.activeMocks.set(method, mockConfig);
  }

  /**
   * 模拟文件系统操作
   */
  async mockFileSystemOperations(operations: {
    [operation: string]: {
      success?: boolean;
      error?: string;
      data?: any;
    };
  }): Promise<void> {
    await this.page.addInitScript((ops) => {
      // @ts-ignore
      if (!window.__mockFileSystem) {
        // @ts-ignore
        window.__mockFileSystem = {};
      }
      
      Object.entries(ops).forEach(([operation, config]) => {
        // @ts-ignore
        window.__mockFileSystem[operation] = () => {
          if (config.error) {
            throw new Error(config.error);
          }
          return config.data || config.success;
        };
      });
    }, operations);
  }

  /**
   * 模拟网络请求
   */
  async mockNetworkRequests(requests: {
    [url: string]: {
      status?: number;
      body?: any;
      headers?: Record<string, string>;
      delay?: number;
    };
  }): Promise<void> {
    for (const [url, config] of Object.entries(requests)) {
      await this.page.route(url, async route => {
        if (config.delay) {
          await new Promise(resolve => setTimeout(resolve, config.delay));
        }
        
        await route.fulfill({
          status: config.status || 200,
          body: JSON.stringify(config.body || {}),
          headers: config.headers || { 'Content-Type': 'application/json' }
        });
      });
    }
  }

  /**
   * 模拟系统错误
   */
  async mockSystemError(errorType: 'memory' | 'disk' | 'network' | 'permission'): Promise<void> {
    await this.page.addInitScript((type) => {
      // @ts-ignore
      window.__systemError = type;
      
      // 模拟不同类型的系统错误
      switch (type) {
        case 'memory':
          // 模拟内存不足
          // @ts-ignore
          window.__simulateMemoryError = true;
          break;
        case 'disk':
          // 模拟磁盘空间不足
          // @ts-ignore
          window.__simulateDiskError = true;
          break;
        case 'network':
          // 模拟网络错误
          // @ts-ignore
          window.__simulateNetworkError = true;
          break;
        case 'permission':
          // 模拟权限错误
          // @ts-ignore
          window.__simulatePermissionError = true;
          break;
      }
    }, errorType);
  }

  /**
   * 模拟慢速操作
   */
  async mockSlowOperations(operations: string[], delay: number = 3000): Promise<void> {
    await this.page.addInitScript(({ operations, delay }) => {
      // @ts-ignore
      if (!window.__slowOperations) {
        // @ts-ignore
        window.__slowOperations = new Set();
      }
      
      operations.forEach(op => {
        // @ts-ignore
        window.__slowOperations.add(op);
      });
      
      // @ts-ignore
      window.__slowOperationDelay = delay;
    }, { operations, delay });
  }

  /**
   * 模拟数据验证错误
   */
  async mockValidationErrors(validationRules: {
    [field: string]: string; // field -> error message
  }): Promise<void> {
    await this.page.addInitScript((rules) => {
      // @ts-ignore
      window.__validationErrors = rules;
    }, validationRules);
  }

  /**
   * 模拟并发冲突
   */
  async mockConcurrencyConflict(resourceId: string): Promise<void> {
    await this.page.addInitScript((id) => {
      // @ts-ignore
      if (!window.__concurrencyConflicts) {
        // @ts-ignore
        window.__concurrencyConflicts = new Set();
      }
      // @ts-ignore
      window.__concurrencyConflicts.add(id);
    }, resourceId);
  }

  /**
   * 清除所有Mock
   */
  async clearAllMocks(): Promise<void> {
    await this.page.addInitScript(() => {
      // @ts-ignore
      delete window.__mockServices;
      // @ts-ignore
      delete window.__mockFileSystem;
      // @ts-ignore
      delete window.__systemError;
      // @ts-ignore
      delete window.__slowOperations;
      // @ts-ignore
      delete window.__validationErrors;
      // @ts-ignore
      delete window.__concurrencyConflicts;
      // @ts-ignore
      delete window.__simulateMemoryError;
      // @ts-ignore
      delete window.__simulateDiskError;
      // @ts-ignore
      delete window.__simulateNetworkError;
      // @ts-ignore
      delete window.__simulatePermissionError;
    });

    this.activeMocks.clear();
  }

  /**
   * 获取活跃的Mock列表
   */
  getActiveMocks(): Map<string, any> {
    return new Map(this.activeMocks);
  }

  /**
   * 验证Mock是否被调用
   */
  async verifyMockCalled(mockName: string): Promise<boolean> {
    return await this.page.evaluate((name) => {
      // @ts-ignore
      return window.__mockCallHistory && window.__mockCallHistory[name] > 0;
    }, mockName);
  }

  /**
   * 获取Mock调用次数
   */
  async getMockCallCount(mockName: string): Promise<number> {
    return await this.page.evaluate((name) => {
      // @ts-ignore
      return window.__mockCallHistory?.[name] || 0;
    }, mockName);
  }

  /**
   * 模拟特定的业务场景
   */
  async mockBusinessScenario(scenario: 'high-load' | 'data-corruption' | 'partial-failure'): Promise<void> {
    switch (scenario) {
      case 'high-load':
        await this.mockSlowOperations(['db-query', 'file-operation'], 2000);
        await this.mockSystemError('memory');
        break;
        
      case 'data-corruption':
        await this.mockDatabaseService({
          method: 'dbValidateIntegrity',
          response: { success: false, error: 'Data corruption detected' }
        });
        break;
        
      case 'partial-failure':
        await this.mockDatabaseService({
          method: 'dbBatchOperation',
          response: { success: false, error: 'Partial operation failure', partialResults: [] }
        });
        break;
    }
  }

  /**
   * 恢复特定Mock
   */
  async restoreMock(mockName: string): Promise<void> {
    await this.page.addInitScript((name) => {
      // @ts-ignore
      if (window.__mockServices && window.__mockServices[name]) {
        // @ts-ignore
        delete window.__mockServices[name];
      }
    }, mockName);

    this.activeMocks.delete(mockName);
  }

  /**
   * 设置Mock调用追踪
   */
  async enableMockTracking(): Promise<void> {
    await this.page.addInitScript(() => {
      // @ts-ignore
      if (!window.__mockCallHistory) {
        // @ts-ignore
        window.__mockCallHistory = {};
      }
      
      // 包装所有Mock方法以追踪调用
      // @ts-ignore
      const originalMockServices = window.__mockServices || {};
      // @ts-ignore
      window.__mockServices = new Proxy(originalMockServices, {
        get(target, prop) {
          return function(...args: any[]) {
            // @ts-ignore
            window.__mockCallHistory[prop] = (window.__mockCallHistory[prop] || 0) + 1;
            return target[prop]?.apply(this, args);
          };
        }
      });
    });
  }
}
