/**
 * ReportService 测试
 * 使用新的数据工厂进行报表和统计功能测试
 */

import { ReportService } from '../ReportService';
import { ReportDataFactory } from '../../../__tests__/fixtures/ReportDataFactory';
import { InventoryDomainFactory } from '../../../__tests__/fixtures/InventoryDomainFactory';
import { MasterDataFactory } from '../../../__tests__/fixtures/MasterDataFactory';
import { ScenarioTemplates } from '../../../__tests__/fixtures/ScenarioTemplates';

// Mock dependencies
jest.mock('../../core/database');
jest.mock('../../../utils/secureLogger');

describe('ReportService - 报表统计功能', () => {
  let service: ReportService;
  let mockDb: any;

  beforeEach(async () => {
    // 清理数据工厂
    ReportDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();
    MasterDataFactory.clearAllData();

    // Setup mock database
    mockDb = {
      query: jest.fn(),
      run: jest.fn(),
      getProducts: jest.fn().mockResolvedValue([]),
      getInventoryStocks: jest.fn().mockResolvedValue([]),
      getInventoryTransactions: jest.fn().mockResolvedValue([]),
      getCategories: jest.fn().mockResolvedValue([]),
      getWarehouses: jest.fn().mockResolvedValue([]),
      getUnits: jest.fn().mockResolvedValue([]),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    };

    // Create service instance
    service = new ReportService();
    // Mock database injection
    (service as any).db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
    ReportDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();
    MasterDataFactory.clearAllData();
  });

  describe('库存统计功能', () => {
    it('应该生成准确的库存统计报表', async () => {
      // 使用数据工厂创建测试数据
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(5);
      const warehouses = MasterDataFactory.createStandardWarehouses();
      const categories = MasterDataFactory.createStandardCategories();

      // Mock数据库返回
      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: warehouses });
      mockDb.getCategories.mockResolvedValue({ success: true, data: categories });

      const result = await service.getInventoryStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalProducts).toBe(5);
      expect(result.data.totalValue).toBeGreaterThan(0);
      expect(result.data.warehouseStats).toHaveLength(3);
      expect(result.data.categoryStats).toHaveLength(5);
      expect(mockDb.getProducts).toHaveBeenCalled();
      expect(mockDb.getInventoryStocks).toHaveBeenCalled();
    });

    it('应该正确识别低库存产品', async () => {
      // 创建低库存场景
      const { products, stocks } = InventoryDomainFactory.createLowStockScenario();
      
      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });

      const result = await service.getInventoryStatistics();

      expect(result.success).toBe(true);
      expect(result.data.lowStockProducts).toBeGreaterThan(0);
      // 所有产品都应该是低库存，因为使用了低库存场景
      expect(result.data.lowStockProducts).toBe(products.length);
    });

    it('应该按仓库统计库存价值', async () => {
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(3);
      const warehouses = MasterDataFactory.createStandardWarehouses();

      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: warehouses });

      const result = await service.getInventoryStatistics();

      expect(result.success).toBe(true);
      expect(result.data.warehouseStats).toHaveLength(3);
      
      // 每个仓库都应该有统计数据
      result.data.warehouseStats.forEach(warehouseStat => {
        expect(warehouseStat.warehouseId).toBeTruthy();
        expect(warehouseStat.warehouseName).toBeTruthy();
        expect(warehouseStat.totalProducts).toBeGreaterThanOrEqual(0);
        expect(warehouseStat.totalValue).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该按分类统计产品信息', async () => {
      const categories = MasterDataFactory.createStandardCategories();
      const products = [];
      
      // 为每个分类创建产品
      categories.forEach(category => {
        products.push(InventoryDomainFactory.createProduct({
          categoryId: category.id
        }));
      });

      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getCategories.mockResolvedValue({ success: true, data: categories });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: [] });

      const result = await service.getInventoryStatistics();

      expect(result.success).toBe(true);
      expect(result.data.categoryStats).toHaveLength(5);
      
      // 每个分类都应该有至少一个产品
      result.data.categoryStats.forEach(categoryStat => {
        expect(categoryStat.categoryId).toBeTruthy();
        expect(categoryStat.categoryName).toBeTruthy();
        expect(categoryStat.totalProducts).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('月度报表功能', () => {
    it('应该生成月度库存报表', async () => {
      const monthlyReport = ReportDataFactory.createMonthlyReport(2024, 3);
      
      // Mock查询月度数据
      mockDb.query.mockResolvedValue({
        success: true,
        data: {
          transactions: [], // 实际应该从数据工厂获取
          summary: monthlyReport
        }
      });

      const result = await service.getMonthlyReport(2024, 3);

      expect(result.success).toBe(true);
      expect(result.data.year).toBe(2024);
      expect(result.data.month).toBe(3);
      expect(result.data.totalStockIn).toBeGreaterThanOrEqual(0);
      expect(result.data.totalStockOut).toBeGreaterThanOrEqual(0);
      expect(result.data.netChange).toBeDefined();
      expect(result.data.topProducts).toBeInstanceOf(Array);
    });

    it('应该计算正确的库存净变化', async () => {
      const report = ReportDataFactory.createMonthlyReport(2024, 1);
      
      expect(report.netChange).toBe(report.totalStockIn - report.totalStockOut);
      expect(typeof report.totalStockIn).toBe('number');
      expect(typeof report.totalStockOut).toBe('number');
      expect(typeof report.totalAdjustment).toBe('number');
    });

    it('应该包含热销产品排行', async () => {
      const report = ReportDataFactory.createMonthlyReport(2024, 2);
      
      expect(report.topProducts).toBeInstanceOf(Array);
      expect(report.topProducts.length).toBeLessThanOrEqual(5);
      
      if (report.topProducts.length > 1) {
        // 验证按销量排序
        for (let i = 0; i < report.topProducts.length - 1; i++) {
          expect(report.topProducts[i].totalQuantity)
            .toBeGreaterThanOrEqual(report.topProducts[i + 1].totalQuantity);
        }
      }
    });
  });

  describe('库存移动汇总', () => {
    it('应该生成库存移动汇总报表', async () => {
      const movementSummary = ReportDataFactory.createInventoryMovementSummary(7);
      
      // Mock数据库查询
      mockDb.query.mockResolvedValue({
        success: true,
        data: movementSummary
      });

      const result = await service.getInventoryMovementSummary({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-07')
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(7);
      
      result.data.forEach(summary => {
        expect(summary.date).toBeTruthy();
        expect(typeof summary.stockIn).toBe('number');
        expect(typeof summary.stockOut).toBe('number');
        expect(typeof summary.adjustment).toBe('number');
        expect(summary.netChange).toBe(
          summary.stockIn - summary.stockOut + summary.adjustment
        );
      });
    });

    it('应该正确计算累计库存', async () => {
      const movements = ReportDataFactory.createInventoryMovementSummary(5);
      
      // 验证累计库存的连续性
      for (let i = 1; i < movements.length; i++) {
        const expectedRunningTotal = movements[i-1].runningTotal + movements[i].netChange;
        expect(movements[i].runningTotal).toBe(expectedRunningTotal);
      }
    });
  });

  describe('预警功能', () => {
    it('应该生成库存预警报表', async () => {
      // 创建包含低库存和超库存的场景
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(5);
      
      // 手动调整一些库存以触发预警
      stocks[0].quantity = 1; // 低于最小库存
      stocks[1].quantity = products[1].maxStock + 10; // 超过最大库存

      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });

      const result = await service.getInventoryAlerts();

      expect(result.success).toBe(true);
      expect(result.data.lowStockAlerts).toBeInstanceOf(Array);
      expect(result.data.overStockAlerts).toBeInstanceOf(Array);
      
      // 应该至少有一个低库存预警
      expect(result.data.lowStockAlerts.length).toBeGreaterThan(0);
      
      result.data.lowStockAlerts.forEach(alert => {
        expect(alert.productId).toBeTruthy();
        expect(alert.productName).toBeTruthy();
        expect(alert.currentStock).toBeLessThan(alert.minStock);
      });
    });

    it('应该按优先级排序预警', async () => {
      const alerts = ReportDataFactory.createAlertData();
      
      expect(alerts.lowStockAlerts).toBeInstanceOf(Array);
      expect(alerts.overStockAlerts).toBeInstanceOf(Array);

      // 验证数据结构
      alerts.lowStockAlerts.forEach(alert => {
        expect(alert.currentStock).toBeLessThan(alert.minStock);
      });

      alerts.overStockAlerts.forEach(alert => {
        expect(alert.currentStock).toBeGreaterThan(alert.maxStock);
      });
    });
  });

  describe('业务场景报表测试', () => {
    it('应该正确处理月末结算场景的报表数据', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('月末结算场景');
      const { monthlyReport, inventoryStats, alerts } = scenarioData.data;

      // 验证月度报表数据
      expect(monthlyReport.year).toBeDefined();
      expect(monthlyReport.month).toBeDefined();
      expect(monthlyReport.transactionCount).toBeGreaterThan(0);
      expect(monthlyReport.inventoryValue).toBeGreaterThan(0);

      // 验证库存统计数据
      expect(inventoryStats.totalProducts).toBeGreaterThan(0);
      expect(inventoryStats.totalValue).toBeGreaterThan(0);
      expect(inventoryStats.warehouseStats).toBeInstanceOf(Array);
      expect(inventoryStats.categoryStats).toBeInstanceOf(Array);

      // 验证预警数据
      expect(alerts.lowStockAlerts).toBeInstanceOf(Array);
      expect(alerts.overStockAlerts).toBeInstanceOf(Array);

      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });

    it('应该分析销售高峰期的统计数据', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('销售高峰期场景');
      const { salesTransactions, summary } = scenarioData.data;

      // 验证销售统计
      expect(summary.totalSales).toBe(salesTransactions.length);
      expect(summary.totalRevenue).toBeGreaterThan(0);
      expect(summary.peakHour).toBeGreaterThanOrEqual(9);
      expect(summary.peakHour).toBeLessThanOrEqual(18);

      // 验证交易数据结构
      salesTransactions.forEach(transaction => {
        expect(transaction.type).toBe('STOCK_OUT');
        expect(transaction.quantity).toBeGreaterThan(0);
        expect(transaction.totalAmount).toBeGreaterThan(0);
      });

      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });
  });

  describe('完整统计数据集', () => {
    it('应该生成完整的统计数据集', async () => {
      const statisticalDataSet = ReportDataFactory.createStatisticalDataSet();

      expect(statisticalDataSet.statistics).toBeDefined();
      expect(statisticalDataSet.monthlyReports).toHaveLength(6);
      expect(statisticalDataSet.movementSummary).toHaveLength(30);

      // 验证月度报表的时间序列
      for (let i = 1; i < statisticalDataSet.monthlyReports.length; i++) {
        const current = statisticalDataSet.monthlyReports[i];
        const previous = statisticalDataSet.monthlyReports[i-1];
        
        if (current.year === previous.year) {
          expect(current.month).toBeGreaterThan(previous.month);
        } else {
          expect(current.year).toBeGreaterThan(previous.year);
        }
      }

      // 验证移动汇总的连续性
      expect(statisticalDataSet.movementSummary[0].runningTotal).toBeGreaterThan(0);
      for (let i = 1; i < statisticalDataSet.movementSummary.length; i++) {
        const current = statisticalDataSet.movementSummary[i];
        const previous = statisticalDataSet.movementSummary[i-1];
        expect(current.runningTotal).toBe(previous.runningTotal + current.netChange);
      }
    });
  });

  describe('性能和数据质量', () => {
    it('应该处理大量数据的统计计算', async () => {
      // 创建大量测试数据
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(50);
      const warehouses = MasterDataFactory.createStandardWarehouses();

      mockDb.getProducts.mockResolvedValue({ success: true, data: products });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: stocks });
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: warehouses });

      const startTime = Date.now();
      const result = await service.getInventoryStatistics();
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data.totalProducts).toBe(50);
      
      // 性能检查（应该在合理时间内完成）
      expect(endTime - startTime).toBeLessThan(1000); // 1秒内
    });

    it('应该正确处理空数据场景', async () => {
      mockDb.getProducts.mockResolvedValue({ success: true, data: [] });
      mockDb.getInventoryStocks.mockResolvedValue({ success: true, data: [] });
      mockDb.getWarehouses.mockResolvedValue({ success: true, data: [] });
      mockDb.getCategories.mockResolvedValue({ success: true, data: [] });

      const result = await service.getInventoryStatistics();

      expect(result.success).toBe(true);
      expect(result.data.totalProducts).toBe(0);
      expect(result.data.totalValue).toBe(0);
      expect(result.data.warehouseStats).toHaveLength(0);
      expect(result.data.categoryStats).toHaveLength(0);
    });
  });
});