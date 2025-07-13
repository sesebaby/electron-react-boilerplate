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

  beforeEach(() => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();
    
    serviceManager = new DomainServiceManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    MasterDataFactory.clearAllData();
    DomainServiceManager.resetInstance();
  });

  describe('服务创建', () => {
    it('应该成功创建所有服务', () => {
      // DomainServiceManager 直接在构造函数中创建服务，无需异步初始化
      expect(serviceManager.getInventoryDomainService()).toBeDefined();
      expect(serviceManager.getMasterDataService()).toBeDefined();
      expect(serviceManager.getReportService()).toBeDefined();
    });

    it('应该正确创建所有服务实例', () => {
      const inventoryService = serviceManager.getInventoryDomainService();
      const masterDataService = serviceManager.getMasterDataService();
      const reportService = serviceManager.getReportService();

      expect(inventoryService).toBeInstanceOf(InventoryDomainService);
      expect(masterDataService).toBeInstanceOf(MasterDataService);
      expect(reportService).toBeInstanceOf(ReportService);
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

  describe('单例模式', () => {
    it('应该返回相同的管理器实例', () => {
      const manager1 = DomainServiceManager.getInstance();
      const manager2 = DomainServiceManager.getInstance();
      
      expect(manager1).toBe(manager2);
    });

    it('应该能重置实例', () => {
      const manager1 = DomainServiceManager.getInstance();
      DomainServiceManager.resetInstance();
      const manager2 = DomainServiceManager.getInstance();
      
      expect(manager1).not.toBe(manager2);
    });
  });

  describe('服务健康检查', () => {
    it('应该检查所有服务的健康状态', async () => {
      // Mock服务健康检查方法
      jest.spyOn(serviceManager.getInventoryDomainService(), 'getProductsWithStock')
        .mockResolvedValue({ success: true, data: [] });
      jest.spyOn(serviceManager.getMasterDataService(), 'getCategories')
        .mockResolvedValue({ success: true, data: [] });
      jest.spyOn(serviceManager.getReportService(), 'getInventoryStatistics')
        .mockResolvedValue({ success: true, data: {} });

      const result = await serviceManager.getHealthStatus();

      expect(result.inventoryDomainService).toBe(true);
      expect(result.masterDataService).toBe(true);
      expect(result.reportService).toBe(true);
    });

    it('应该处理健康检查失败的情况', async () => {
      // Mock一个服务健康检查失败
      jest.spyOn(serviceManager.getInventoryDomainService(), 'getProductsWithStock')
        .mockRejectedValue(new Error('Database error'));
      jest.spyOn(serviceManager.getMasterDataService(), 'getCategories')
        .mockResolvedValue({ success: true, data: [] });
      jest.spyOn(serviceManager.getReportService(), 'getInventoryStatistics')
        .mockResolvedValue({ success: true, data: {} });

      const result = await serviceManager.getHealthStatus();

      expect(result.inventoryDomainService).toBe(false);
      expect(result.masterDataService).toBe(true);
      expect(result.reportService).toBe(true);
    });
  });

  describe('向后兼容性', () => {
    it('应该提供向后兼容的方法', () => {
      // 检查是否存在向后兼容的getter方法
      const inventoryService = serviceManager.getInventoryDomainService();
      expect(inventoryService).toBeInstanceOf(InventoryDomainService);
    });

    it('应该支持服务间的协作', async () => {
      // 测试服务间的基本协作
      const inventoryService = serviceManager.getInventoryDomainService();
      const masterDataService = serviceManager.getMasterDataService();
      
      // Mock基础方法
      jest.spyOn(masterDataService, 'getCategories')
        .mockResolvedValue({ success: true, data: [] });
      jest.spyOn(inventoryService, 'getProductsWithStock')
        .mockResolvedValue({ success: true, data: [] });

      const categoriesResult = await masterDataService.getCategories();
      const productsResult = await inventoryService.getProductsWithStock();
      
      expect(categoriesResult.success).toBe(true);
      expect(productsResult.success).toBe(true);
    });
  });
});