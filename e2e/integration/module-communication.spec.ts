import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { DatabaseHelpers } from '../utils/database-helpers';
import { DataIsolationManager } from '../utils/data-isolation-manager';
import { MockServiceManager } from '../mocks/mock-service-manager';

/**
 * 模块间通信集成测试
 * 验证前端组件、IPC通信、后端服务、数据库层之间的协调工作
 */
test.describe('模块间通信集成测试', () => {
  let electronApp: any;
  let page: any;
  let isolationManager: DataIsolationManager;
  let mockManager: MockServiceManager;

  test.beforeEach(async () => {
    electronApp = await TestHelpers.launchElectronApp();
    page = await electronApp.firstWindow();
    await TestHelpers.waitForAppLoad(page);
    await TestHelpers.login(page);
    
    isolationManager = new DataIsolationManager(page, `module_comm_test_${Date.now()}`);
    await isolationManager.startIsolationSession();
    
    mockManager = new MockServiceManager(page);
  });

  test.afterEach(async () => {
    if (mockManager) {
      await mockManager.clearAllMocks();
    }
    if (isolationManager) {
      await isolationManager.endIsolationSession();
    }
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('前端到后端的IPC通信验证', async () => {
    // 1. 测试基本的IPC调用
    const ipcTestResult = await page.evaluate(async () => {
      // @ts-ignore
      const systemInfo = await window.electronAPI?.getSystemInfo?.();
      return systemInfo;
    });

    expect(ipcTestResult).toBeTruthy();
    expect(ipcTestResult.platform).toBeTruthy();
    expect(ipcTestResult.version).toBeTruthy();

    // 2. 测试带参数的IPC调用
    const testData = { name: 'IPC测试', value: 123 };
    const parameterTestResult = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.testIpcWithParameters?.(data);
    }, testData);

    expect(parameterTestResult.success).toBe(true);
    expect(parameterTestResult.receivedData).toEqual(testData);

    // 3. 测试异步IPC调用
    const asyncTestResult = await page.evaluate(async () => {
      const startTime = Date.now();
      // @ts-ignore
      const result = await window.electronAPI?.testAsyncOperation?.();
      const endTime = Date.now();
      
      return {
        result,
        duration: endTime - startTime
      };
    });

    expect(asyncTestResult.result.success).toBe(true);
    expect(asyncTestResult.duration).toBeGreaterThan(100); // 应该有一定的异步延迟

    // 4. 测试IPC错误处理
    const errorTestResult = await page.evaluate(async () => {
      try {
        // @ts-ignore
        await window.electronAPI?.testIpcError?.();
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: error.message 
        };
      }
    });

    expect(errorTestResult.success).toBe(false);
    expect(errorTestResult.error).toContain('测试错误');

    console.log('✅ 前端到后端的IPC通信验证测试通过');
  });

  test('服务层之间的协调工作', async () => {
    // 1. 测试服务管理器的初始化
    const serviceManagerStatus = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.getServiceManagerStatus?.();
    });

    expect(serviceManagerStatus.initialized).toBe(true);
    expect(serviceManagerStatus.services.length).toBeGreaterThan(0);

    // 2. 测试服务间的依赖关系
    const serviceDependencies = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.getServiceDependencies?.();
    });

    // 验证关键服务的依赖关系
    expect(serviceDependencies.databaseService).toBeTruthy();
    expect(serviceDependencies.inventoryDomainService.dependencies).toContain('databaseService');
    expect(serviceDependencies.reportService.dependencies).toContain('inventoryDomainService');

    // 3. 测试服务间的数据传递
    const serviceDataFlow = await page.evaluate(async () => {
      // 模拟一个需要多个服务协作的操作
      // @ts-ignore
      return await window.electronAPI?.testServiceDataFlow?.({
        operation: 'stock-in',
        productId: 'test-product-id',
        quantity: 50
      });
    });

    expect(serviceDataFlow.success).toBe(true);
    expect(serviceDataFlow.servicesInvolved).toContain('inventoryDomainService');
    expect(serviceDataFlow.servicesInvolved).toContain('databaseService');
    expect(serviceDataFlow.servicesInvolved).toContain('auditService');

    // 4. 测试服务的错误传播
    await mockManager.mockDatabaseService({
      method: 'dbGetProduct',
      error: '数据库连接失败'
    });

    const errorPropagationResult = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.testServiceErrorPropagation?.('test-product-id');
    });

    expect(errorPropagationResult.success).toBe(false);
    expect(errorPropagationResult.error).toContain('数据库连接失败');
    expect(errorPropagationResult.failedService).toBe('databaseService');

    console.log('✅ 服务层之间的协调工作测试通过');
  });

  test('数据库连接池和事务管理', async () => {
    // 1. 测试数据库连接池状态
    const connectionPoolStatus = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.getConnectionPoolStatus?.();
    });

    expect(connectionPoolStatus.totalConnections).toBeGreaterThan(0);
    expect(connectionPoolStatus.activeConnections).toBeGreaterThanOrEqual(0);
    expect(connectionPoolStatus.idleConnections).toBeGreaterThanOrEqual(0);

    // 2. 测试并发数据库操作
    const concurrentOperations = [];
    for (let i = 1; i <= 5; i++) {
      concurrentOperations.push(
        page.evaluate(async (index) => {
          // @ts-ignore
          return await window.electronAPI?.testConcurrentDbOperation?.({
            operation: 'select',
            table: 'products',
            id: `test-${index}`
          });
        }, i)
      );
    }

    const concurrentResults = await Promise.all(concurrentOperations);
    const successCount = concurrentResults.filter(r => r.success).length;
    expect(successCount).toBe(5); // 所有操作都应该成功

    // 3. 测试事务管理
    const transactionTestResult = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.testTransactionManagement?.({
        operations: [
          { type: 'insert', table: 'test_table', data: { name: 'test1' } },
          { type: 'insert', table: 'test_table', data: { name: 'test2' } },
          { type: 'update', table: 'test_table', id: 'test1', data: { name: 'updated' } }
        ]
      });
    });

    expect(transactionTestResult.success).toBe(true);
    expect(transactionTestResult.transactionId).toBeTruthy();

    // 4. 测试事务回滚
    const rollbackTestResult = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.testTransactionRollback?.({
        operations: [
          { type: 'insert', table: 'test_table', data: { name: 'rollback_test1' } },
          { type: 'insert', table: 'test_table', data: { name: 'rollback_test2' } },
          { type: 'error', message: '模拟事务错误' } // 故意触发错误
        ]
      });
    });

    expect(rollbackTestResult.success).toBe(false);
    expect(rollbackTestResult.rolledBack).toBe(true);

    console.log('✅ 数据库连接池和事务管理测试通过');
  });

  test('事件系统和消息传递', async () => {
    // 1. 测试事件发布和订阅
    const eventTestResult = await page.evaluate(async () => {
      const events = [];
      
      // 订阅事件
      // @ts-ignore
      window.electronAPI?.subscribeToEvent?.('test-event', (data) => {
        events.push(data);
      });

      // 发布事件
      // @ts-ignore
      await window.electronAPI?.publishEvent?.('test-event', { message: 'Hello World' });
      
      // 等待事件处理
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return events;
    });

    expect(eventTestResult.length).toBe(1);
    expect(eventTestResult[0].message).toBe('Hello World');

    // 2. 测试系统级事件
    const systemEventResult = await page.evaluate(async () => {
      const systemEvents = [];
      
      // 订阅系统事件
      // @ts-ignore
      window.electronAPI?.subscribeToSystemEvents?.((eventType, data) => {
        systemEvents.push({ type: eventType, data });
      });

      // 触发系统事件
      // @ts-ignore
      await window.electronAPI?.triggerSystemEvent?.('database-connected');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return systemEvents;
    });

    expect(systemEventResult.length).toBeGreaterThan(0);
    expect(systemEventResult.some(e => e.type === 'database-connected')).toBe(true);

    // 3. 测试跨模块消息传递
    const crossModuleMessageResult = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.testCrossModuleMessage?.({
        from: 'inventory-module',
        to: 'report-module',
        message: { type: 'stock-updated', productId: 'test-product', newStock: 100 }
      });
    });

    expect(crossModuleMessageResult.success).toBe(true);
    expect(crossModuleMessageResult.messageDelivered).toBe(true);
    expect(crossModuleMessageResult.responseReceived).toBe(true);

    // 4. 测试消息队列和批处理
    const messageQueueResult = await page.evaluate(async () => {
      const messages = [];
      for (let i = 1; i <= 10; i++) {
        messages.push({
          type: 'batch-test',
          data: { index: i, timestamp: Date.now() }
        });
      }

      // @ts-ignore
      return await window.electronAPI?.processBatchMessages?.(messages);
    });

    expect(messageQueueResult.success).toBe(true);
    expect(messageQueueResult.processedCount).toBe(10);
    expect(messageQueueResult.failedCount).toBe(0);

    console.log('✅ 事件系统和消息传递测试通过');
  });

  test('缓存系统和数据同步', async () => {
    // 1. 测试缓存的基本操作
    const cacheTestResult = await page.evaluate(async () => {
      const testData = { id: 'cache-test', name: '缓存测试数据', value: 12345 };
      
      // 设置缓存
      // @ts-ignore
      await window.electronAPI?.setCacheData?.('test-key', testData);
      
      // 获取缓存
      // @ts-ignore
      const cachedData = await window.electronAPI?.getCacheData?.('test-key');
      
      return {
        original: testData,
        cached: cachedData
      };
    });

    expect(cacheTestResult.cached).toEqual(cacheTestResult.original);

    // 2. 测试缓存失效和更新
    const cacheInvalidationResult = await page.evaluate(async () => {
      // 设置初始缓存
      // @ts-ignore
      await window.electronAPI?.setCacheData?.('invalidation-test', { version: 1 });
      
      // 更新数据（应该触发缓存失效）
      // @ts-ignore
      await window.electronAPI?.updateDataAndInvalidateCache?.('invalidation-test', { version: 2 });
      
      // 获取缓存（应该是新数据）
      // @ts-ignore
      const updatedData = await window.electronAPI?.getCacheData?.('invalidation-test');
      
      return updatedData;
    });

    expect(cacheInvalidationResult.version).toBe(2);

    // 3. 测试分布式缓存同步
    const distributedCacheResult = await page.evaluate(async () => {
      // 模拟多个实例的缓存同步
      // @ts-ignore
      return await window.electronAPI?.testDistributedCacheSync?.({
        key: 'distributed-test',
        data: { message: '分布式缓存测试' },
        instances: ['instance-1', 'instance-2', 'instance-3']
      });
    });

    expect(distributedCacheResult.success).toBe(true);
    expect(distributedCacheResult.syncedInstances).toBe(3);

    // 4. 测试缓存性能
    const cachePerformanceResult = await page.evaluate(async () => {
      const iterations = 1000;
      const testData = { large: 'x'.repeat(1000) }; // 1KB数据
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        // @ts-ignore
        await window.electronAPI?.setCacheData?.(`perf-test-${i}`, testData);
        // @ts-ignore
        await window.electronAPI?.getCacheData?.(`perf-test-${i}`);
      }
      
      const endTime = Date.now();
      
      return {
        iterations,
        totalTime: endTime - startTime,
        avgTime: (endTime - startTime) / iterations
      };
    });

    expect(cachePerformanceResult.avgTime).toBeLessThan(10); // 平均每次操作应少于10ms

    console.log('✅ 缓存系统和数据同步测试通过');
  });

  test('错误处理和恢复机制', async () => {
    // 1. 测试模块级错误隔离
    const errorIsolationResult = await page.evaluate(async () => {
      // 模拟一个模块发生错误
      // @ts-ignore
      await window.electronAPI?.simulateModuleError?.('inventory-module', 'critical-error');
      
      // 检查其他模块是否仍然正常工作
      // @ts-ignore
      const otherModuleStatus = await window.electronAPI?.checkModuleStatus?.('report-module');
      
      return otherModuleStatus;
    });

    expect(errorIsolationResult.status).toBe('healthy');
    expect(errorIsolationResult.affected).toBe(false);

    // 2. 测试自动恢复机制
    const autoRecoveryResult = await page.evaluate(async () => {
      // 触发可恢复的错误
      // @ts-ignore
      await window.electronAPI?.triggerRecoverableError?.('database-connection-lost');
      
      // 等待自动恢复
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 检查恢复状态
      // @ts-ignore
      return await window.electronAPI?.getRecoveryStatus?.();
    });

    expect(autoRecoveryResult.recovered).toBe(true);
    expect(autoRecoveryResult.attempts).toBeGreaterThan(0);

    // 3. 测试降级服务
    const degradedServiceResult = await page.evaluate(async () => {
      // 模拟主服务不可用
      // @ts-ignore
      await window.electronAPI?.disablePrimaryService?.('search-service');
      
      // 使用降级服务
      // @ts-ignore
      return await window.electronAPI?.performSearchWithFallback?.('test query');
    });

    expect(degradedServiceResult.success).toBe(true);
    expect(degradedServiceResult.usedFallback).toBe(true);

    // 4. 测试错误报告和监控
    const errorReportingResult = await page.evaluate(async () => {
      // 触发错误并检查报告
      try {
        // @ts-ignore
        await window.electronAPI?.triggerMonitoredError?.('test-error');
      } catch (error) {
        // 预期的错误
      }
      
      // 获取错误报告
      // @ts-ignore
      return await window.electronAPI?.getErrorReports?.();
    });

    expect(errorReportingResult.length).toBeGreaterThan(0);
    expect(errorReportingResult[0].type).toBe('test-error');
    expect(errorReportingResult[0].timestamp).toBeTruthy();

    console.log('✅ 错误处理和恢复机制测试通过');
  });
});
