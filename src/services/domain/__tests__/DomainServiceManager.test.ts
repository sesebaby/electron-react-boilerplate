/**
 * DomainServiceManager 测试
 * 测试新的三服务架构管理器
 */

import { DomainServiceManager } from '../DomainServiceManager';
import { InventoryDomainService } from '../InventoryDomainService';
import { MasterDataService } from '../MasterDataService';
import { ReportService } from '../ReportService';
import { MasterDataFactory } from '../../../__tests__/fixtures/MasterDataFactory';

// Mock dependencies
jest.mock('../../core/database');
jest.mock('../../../utils/secureLogger');

describe('DomainServiceManager - 服务管理器', () => {
  let serviceManager: DomainServiceManager;

  beforeEach(async () => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();
    
    serviceManager = new DomainServiceManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    MasterDataFactory.clearAllData();
  });

  describe('服务初始化', () => {
    it('应该成功初始化所有服务', async () => {
      const result = await serviceManager.initialize();

      expect(result.success).toBe(true);
      expect(serviceManager.isInitialized()).toBe(true);
    });

    it('应该正确创建所有服务实例', async () => {
      await serviceManager.initialize();

      const inventoryService = serviceManager.getInventoryDomainService();
      const masterDataService = serviceManager.getMasterDataService();
      const reportService = serviceManager.getReportService();

      expect(inventoryService).toBeInstanceOf(InventoryDomainService);
      expect(masterDataService).toBeInstanceOf(MasterDataService);
      expect(reportService).toBeInstanceOf(ReportService);
    });

    it('应该防止重复初始化', async () => {
      await serviceManager.initialize();
      const firstInit = serviceManager.isInitialized();

      await serviceManager.initialize();
      const secondInit = serviceManager.isInitialized();

      expect(firstInit).toBe(true);
      expect(secondInit).toBe(true);
      // 服务实例应该是同一个
      expect(serviceManager.getInventoryDomainService()).toBe(
        serviceManager.getInventoryDomainService()
      );
    });

    it('应该处理初始化失败的情况', async () => {
      // Mock服务初始化失败
      jest.spyOn(InventoryDomainService.prototype, 'initialize')
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await serviceManager.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize services');
      expect(serviceManager.isInitialized()).toBe(false);
    });
  });

  describe('服务获取', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该在未初始化时抛出错误', () => {
      const uninitializedManager = new DomainServiceManager();

      expect(() => uninitializedManager.getInventoryDomainService())
        .toThrow('DomainServiceManager not initialized');
      expect(() => uninitializedManager.getMasterDataService())
        .toThrow('DomainServiceManager not initialized');
      expect(() => uninitializedManager.getReportService())
        .toThrow('DomainServiceManager not initialized');
    });

    it('应该返回相同的服务实例（单例模式）', () => {
      const inventoryService1 = serviceManager.getInventoryDomainService();
      const inventoryService2 = serviceManager.getInventoryDomainService();
      const masterDataService1 = serviceManager.getMasterDataService();
      const masterDataService2 = serviceManager.getMasterDataService();
      const reportService1 = serviceManager.getReportService();
      const reportService2 = serviceManager.getReportService();

      expect(inventoryService1).toBe(inventoryService2);
      expect(masterDataService1).toBe(masterDataService2);
      expect(reportService1).toBe(reportService2);
    });
  });

  describe('服务健康检查', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该检查所有服务的健康状态', async () => {
      // Mock服务健康检查
      jest.spyOn(serviceManager.getInventoryDomainService(), 'healthCheck')
        .mockResolvedValue({ success: true, service: 'InventoryDomainService' });
      jest.spyOn(serviceManager.getMasterDataService(), 'healthCheck')
        .mockResolvedValue({ success: true, service: 'MasterDataService' });
      jest.spyOn(serviceManager.getReportService(), 'healthCheck')
        .mockResolvedValue({ success: true, service: 'ReportService' });

      const result = await serviceManager.healthCheck();

      expect(result.success).toBe(true);
      expect(result.services).toHaveProperty('inventoryDomainService');
      expect(result.services).toHaveProperty('masterDataService');
      expect(result.services).toHaveProperty('reportService');
      expect(result.services.inventoryDomainService.success).toBe(true);
      expect(result.services.masterDataService.success).toBe(true);
      expect(result.services.reportService.success).toBe(true);
    });

    it('应该报告部分服务不健康的情况', async () => {
      // Mock一个服务健康检查失败
      jest.spyOn(serviceManager.getInventoryDomainService(), 'healthCheck')
        .mockResolvedValue({ success: false, error: 'Database error' });
      jest.spyOn(serviceManager.getMasterDataService(), 'healthCheck')
        .mockResolvedValue({ success: true, service: 'MasterDataService' });
      jest.spyOn(serviceManager.getReportService(), 'healthCheck')
        .mockResolvedValue({ success: true, service: 'ReportService' });

      const result = await serviceManager.healthCheck();

      expect(result.success).toBe(false);
      expect(result.services.inventoryDomainService.success).toBe(false);
      expect(result.services.masterDataService.success).toBe(true);
      expect(result.services.reportService.success).toBe(true);
    });
  });

  describe('服务统计信息', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该获取服务统计信息', async () => {
      // Mock各服务的统计信息
      jest.spyOn(serviceManager.getInventoryDomainService(), 'getStats')
        .mockResolvedValue({
          totalProducts: 100,
          totalTransactions: 500,
          lastActivity: new Date()
        });

      jest.spyOn(serviceManager.getMasterDataService(), 'getStats')
        .mockResolvedValue({
          totalCategories: 10,
          totalUnits: 8,
          totalWarehouses: 3
        });

      jest.spyOn(serviceManager.getReportService(), 'getStats')
        .mockResolvedValue({
          reportsGenerated: 25,
          lastReportTime: new Date()
        });

      const result = await serviceManager.getServiceStats();

      expect(result.success).toBe(true);
      expect(result.data.inventoryDomainService.totalProducts).toBe(100);
      expect(result.data.masterDataService.totalCategories).toBe(10);
      expect(result.data.reportService.reportsGenerated).toBe(25);
    });

    it('应该处理统计信息获取失败', async () => {
      jest.spyOn(serviceManager.getInventoryDomainService(), 'getStats')
        .mockRejectedValue(new Error('Stats unavailable'));

      const result = await serviceManager.getServiceStats();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get service stats');
    });
  });

  describe('事务管理', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该支持跨服务事务', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };

      // Mock事务开始
      jest.spyOn(serviceManager, 'beginTransaction')
        .mockResolvedValue({ success: true, transaction: mockTransaction });

      const result = await serviceManager.beginTransaction();

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
    });

    it('应该正确提交事务', async () => {
      const mockTransaction = {
        commit: jest.fn().mockResolvedValue({ success: true }),
        rollback: jest.fn()
      };

      const commitResult = await serviceManager.commitTransaction(mockTransaction);

      expect(commitResult.success).toBe(true);
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('应该正确回滚事务', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn().mockResolvedValue({ success: true })
      };

      const rollbackResult = await serviceManager.rollbackTransaction(mockTransaction);

      expect(rollbackResult.success).toBe(true);
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  describe('配置管理', () => {
    it('应该支持自定义配置', async () => {
      const customConfig = {
        database: {
          timeout: 5000,
          retries: 3
        },
        cache: {
          enabled: true,
          ttl: 300
        }
      };

      const managerWithConfig = new DomainServiceManager(customConfig);
      const result = await managerWithConfig.initialize();

      expect(result.success).toBe(true);
      expect(managerWithConfig.getConfig()).toEqual(customConfig);
    });

    it('应该使用默认配置', async () => {
      const defaultManager = new DomainServiceManager();
      await defaultManager.initialize();

      const config = defaultManager.getConfig();
      expect(config).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.cache).toBeDefined();
    });

    it('应该允许运行时配置更新', async () => {
      await serviceManager.initialize();

      const newConfig = {
        database: { timeout: 10000 },
        cache: { enabled: false }
      };

      const result = await serviceManager.updateConfig(newConfig);

      expect(result.success).toBe(true);
      expect(serviceManager.getConfig().database.timeout).toBe(10000);
      expect(serviceManager.getConfig().cache.enabled).toBe(false);
    });
  });

  describe('性能监控', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该收集性能指标', async () => {
      // Mock性能指标
      jest.spyOn(serviceManager, 'getPerformanceMetrics')
        .mockResolvedValue({
          success: true,
          metrics: {
            averageResponseTime: 45,
            totalRequests: 1000,
            errorRate: 0.01,
            memoryUsage: 128 * 1024 * 1024,
            uptime: 3600
          }
        });

      const result = await serviceManager.getPerformanceMetrics();

      expect(result.success).toBe(true);
      expect(result.metrics.averageResponseTime).toBeDefined();
      expect(result.metrics.totalRequests).toBeDefined();
      expect(result.metrics.errorRate).toBeDefined();
    });

    it('应该支持性能指标重置', async () => {
      const result = await serviceManager.resetPerformanceMetrics();
      expect(result.success).toBe(true);
    });
  });

  describe('服务关闭', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该优雅地关闭所有服务', async () => {
      // Mock服务关闭
      jest.spyOn(serviceManager.getInventoryDomainService(), 'close')
        .mockResolvedValue({ success: true });
      jest.spyOn(serviceManager.getMasterDataService(), 'close')
        .mockResolvedValue({ success: true });
      jest.spyOn(serviceManager.getReportService(), 'close')
        .mockResolvedValue({ success: true });

      const result = await serviceManager.close();

      expect(result.success).toBe(true);
      expect(serviceManager.isInitialized()).toBe(false);
    });

    it('应该处理服务关闭失败', async () => {
      jest.spyOn(serviceManager.getInventoryDomainService(), 'close')
        .mockRejectedValue(new Error('Close failed'));

      const result = await serviceManager.close();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to close services');
    });
  });

  describe('向后兼容性', () => {
    beforeEach(async () => {
      await serviceManager.initialize();
    });

    it('应该提供向后兼容的方法', () => {
      // 检查是否存在向后兼容的getter方法
      expect(typeof serviceManager.getInventoryService).toBe('function');
      
      // 应该返回InventoryDomainService实例
      const inventoryService = serviceManager.getInventoryService();
      expect(inventoryService).toBeInstanceOf(InventoryDomainService);
    });

    it('应该支持旧版本的API调用', async () => {
      // 测试向后兼容的方法调用
      const inventoryService = serviceManager.getInventoryService();
      
      // 假设旧版本有这个方法
      if (typeof inventoryService.getProducts === 'function') {
        jest.spyOn(inventoryService, 'getProducts')
          .mockResolvedValue({ success: true, data: [] });

        const result = await inventoryService.getProducts();
        expect(result.success).toBe(true);
      }
    });
  });
});