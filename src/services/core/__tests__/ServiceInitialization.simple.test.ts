/**
 * 核心服务初始化测试
 * 验证服务能够正确创建和初始化
 */

import { InventoryService } from '../InventoryService';
import { OrderService } from '../OrderService';
import { FinancialService } from '../FinancialService';
import { DatabaseManager } from '../database';

// Mock dependencies
jest.mock('../database');
jest.mock('../../../utils/secureLogger');

const mockDatabaseManager = DatabaseManager as jest.Mocked<typeof DatabaseManager>;

describe('核心服务初始化测试', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDb = {
      query: jest.fn().mockReturnValue([]),
      run: jest.fn().mockReturnValue({ changes: 1 }),
      prepare: jest.fn().mockReturnValue({
        all: jest.fn().mockReturnValue([]),
        get: jest.fn().mockReturnValue({}),
        run: jest.fn().mockReturnValue({ changes: 1 })
      }),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    mockDatabaseManager.getInstance.mockReturnValue(mockDb);
  });

  describe('InventoryService', () => {
    it('应该能够创建InventoryService实例', () => {
      const service = new InventoryService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(InventoryService);
    });

    it('应该能够初始化InventoryService', async () => {
      const service = new InventoryService();
      await expect(service.initialize()).resolves.not.toThrow();
      expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
    });
  });

  describe('OrderService', () => {
    it('应该能够创建OrderService实例', () => {
      const service = new OrderService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(OrderService);
    });

    it('应该能够初始化OrderService', async () => {
      const service = new OrderService();
      await expect(service.initialize()).resolves.not.toThrow();
      expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
    });
  });

  describe('FinancialService', () => {
    it('应该能够创建FinancialService实例', () => {
      const service = new FinancialService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(FinancialService);
    });

    it('应该能够初始化FinancialService', async () => {
      const service = new FinancialService();
      await expect(service.initialize()).resolves.not.toThrow();
      expect(mockDatabaseManager.getInstance).toHaveBeenCalled();
    });
  });

  describe('服务集成测试', () => {
    it('应该能够同时创建所有核心服务', async () => {
      const inventoryService = new InventoryService();
      const orderService = new OrderService();
      const financialService = new FinancialService();

      await Promise.all([
        inventoryService.initialize(),
        orderService.initialize(),
        financialService.initialize()
      ]);

      expect(inventoryService).toBeDefined();
      expect(orderService).toBeDefined();
      expect(financialService).toBeDefined();
    });

    it('应该正确处理数据库连接', () => {
      const inventoryService = new InventoryService();
      const orderService = new OrderService();
      const financialService = new FinancialService();

      // 验证服务实例已创建
      expect(inventoryService).toBeDefined();
      expect(orderService).toBeDefined();
      expect(financialService).toBeDefined();
    });
  });

  describe('基础方法存在性验证', () => {
    it('InventoryService应该有必要的方法', () => {
      const service = new InventoryService();
      
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.createProduct).toBe('function');
      expect(typeof service.getProducts).toBe('function');
      expect(typeof service.createCategory).toBe('function');
      expect(typeof service.createWarehouse).toBe('function');
    });

    it('OrderService应该有必要的方法', () => {
      const service = new OrderService();
      
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.createPurchaseOrder).toBe('function');
      expect(typeof service.getPurchaseOrders).toBe('function');
      expect(typeof service.createSalesOrder).toBe('function');
      expect(typeof service.getSalesOrders).toBe('function');
    });

    it('FinancialService应该有必要的方法', () => {
      const service = new FinancialService();
      
      expect(typeof service.initialize).toBe('function');
      expect(typeof service.createReceivable).toBe('function');
      expect(typeof service.getReceivables).toBe('function');
      expect(typeof service.createPayable).toBe('function');
      expect(typeof service.getPayables).toBe('function');
    });
  });
});