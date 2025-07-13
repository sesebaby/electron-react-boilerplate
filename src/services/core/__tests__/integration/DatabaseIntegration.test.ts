/**
 * 数据库集成测试
 * 测试新三服务架构的数据库集成和一致性
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from '../../database';
import { DomainServiceManager } from '../../../domain/DomainServiceManager';
import { MasterDataFactory } from '../../../../__tests__/fixtures/MasterDataFactory';
import { InventoryDomainFactory } from '../../../../__tests__/fixtures/InventoryDomainFactory';
import { ScenarioTemplates } from '../../../../__tests__/fixtures/ScenarioTemplates';

describe('数据库集成测试 - 新三服务架构', () => {
  const testDbPath = path.join(__dirname, 'test.db');
  let db: Database.Database;
  let domainServiceManager: DomainServiceManager;

  beforeEach(async () => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();

    // 删除测试数据库（如果存在）
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // 创建真实的数据库连接
    db = new Database(testDbPath);
    
    // 初始化新的服务管理器
    domainServiceManager = new DomainServiceManager({
      database: { path: testDbPath }
    });
    
    // 创建必要的数据库表结构
    await setupTestDatabase();
  });

  afterEach(async () => {
    // 清理数据工厂
    MasterDataFactory.clearAllData();
    InventoryDomainFactory.clearAllData();

    // 关闭服务
    if (domainServiceManager && domainServiceManager.isInitialized()) {
      await domainServiceManager.close();
    }

    // 关闭数据库连接
    if (db) {
      db.close();
    }

    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  async function setupTestDatabase() {
    // 创建基础表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        level INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT UNIQUE,
        type TEXT NOT NULL,
        precision INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS warehouses (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        location TEXT,
        is_default BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        description TEXT,
        category_id TEXT,
        unit_id TEXT,
        brand TEXT,
        model TEXT,
        barcode TEXT,
        purchase_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        min_stock INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id),
        FOREIGN KEY (unit_id) REFERENCES units (id)
      );

      CREATE TABLE IF NOT EXISTS inventory_stocks (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        quantity INTEGER DEFAULT 0,
        reserved_quantity INTEGER DEFAULT 0,
        last_transaction_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
        UNIQUE(product_id, warehouse_id)
      );

      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        operator TEXT,
        remark TEXT,
        related_id TEXT,
        related_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
      );
    `);
  }

  describe('三服务架构集成测试', () => {
    it('应该初始化所有三个领域服务', async () => {
      const result = await domainServiceManager.initialize();
      
      expect(result.success).toBe(true);
      expect(domainServiceManager.isInitialized()).toBe(true);
      
      // 验证服务实例
      const inventoryService = domainServiceManager.getInventoryDomainService();
      const masterDataService = domainServiceManager.getMasterDataService();
      const reportService = domainServiceManager.getReportService();
      
      expect(inventoryService).toBeDefined();
      expect(masterDataService).toBeDefined();
      expect(reportService).toBeDefined();
    });

    it('应该支持跨服务的数据一致性', async () => {
      await domainServiceManager.initialize();
      
      // 使用数据工厂创建完整的基础数据
      const masterDataSet = MasterDataFactory.createMasterDataSet();
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(3);
      
      const masterDataService = domainServiceManager.getMasterDataService();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      
      // 插入基础数据到数据库
      for (const category of masterDataSet.categories) {
        const result = await masterDataService.createCategory(category);
        expect(result.success).toBe(true);
      }
      
      for (const unit of masterDataSet.units) {
        const result = await masterDataService.createUnit(unit);
        expect(result.success).toBe(true);
      }
      
      for (const warehouse of masterDataSet.warehouses) {
        const result = await masterDataService.createWarehouse(warehouse);
        expect(result.success).toBe(true);
      }
      
      // 验证数据一致性
      const categoriesResult = await masterDataService.getCategories();
      const unitsResult = await masterDataService.getUnits();
      const warehousesResult = await masterDataService.getWarehouses();
      
      expect(categoriesResult.success).toBe(true);
      expect(unitsResult.success).toBe(true);
      expect(warehousesResult.success).toBe(true);
      expect(categoriesResult.data).toHaveLength(5);
      expect(unitsResult.data).toHaveLength(6);
      expect(warehousesResult.data).toHaveLength(3);
    });
  });

  describe('业务场景集成测试', () => {
    beforeEach(async () => {
      await domainServiceManager.initialize();
    });

    it('应该完整执行新产品上架场景', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('新产品上架流程');
      const { category, unit, warehouse, product } = scenarioData.data;
      
      const masterDataService = domainServiceManager.getMasterDataService();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      
      // 1. 创建基础数据
      const categoryResult = await masterDataService.createCategory(category);
      const unitResult = await masterDataService.createUnit(unit);
      const warehouseResult = await masterDataService.createWarehouse(warehouse);
      
      expect(categoryResult.success).toBe(true);
      expect(unitResult.success).toBe(true);
      expect(warehouseResult.success).toBe(true);
      
      // 2. 创建产品
      const productResult = await inventoryService.createProduct(product);
      expect(productResult.success).toBe(true);
      
      // 3. 验证数据库中的数据一致性
      const dbCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(category.id);
      const dbUnit = db.prepare('SELECT * FROM units WHERE id = ?').get(unit.id);
      const dbWarehouse = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(warehouse.id);
      const dbProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
      
      expect(dbCategory.name).toBe(category.name);
      expect(dbUnit.symbol).toBe(unit.symbol);
      expect(dbWarehouse.code).toBe(warehouse.code);
      expect(dbProduct.sku).toBe(product.sku);
      expect(dbProduct.category_id).toBe(category.id);
      expect(dbProduct.unit_id).toBe(unit.id);
      
      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });

    it('应该处理库存盘点场景的事务一致性', async () => {
      const scenarioData = ScenarioTemplates.executeScenario('库存盘点场景');
      const { products, adjustmentTransactions } = scenarioData.data;
      
      const inventoryService = domainServiceManager.getInventoryDomainService();
      
      // 开始事务
      const transaction = await domainServiceManager.beginTransaction();
      expect(transaction.success).toBe(true);
      
      try {
        // 执行多个库存调整
        for (const adjustment of adjustmentTransactions.slice(0, 3)) { // 只测试前3个
          const result = await inventoryService.adjustStock({
            productId: adjustment.productId,
            warehouseId: adjustment.warehouseId,
            quantity: adjustment.quantity,
            operator: adjustment.operator,
            remark: adjustment.remark
          });
          expect(result.success).toBe(true);
        }
        
        // 提交事务
        const commitResult = await domainServiceManager.commitTransaction(transaction.transaction);
        expect(commitResult.success).toBe(true);
        
        // 验证事务记录
        const transactionCount = db.prepare('SELECT COUNT(*) as count FROM inventory_transactions').get();
        expect(transactionCount.count).toBeGreaterThan(0);
        
      } catch (error) {
        // 回滚事务
        await domainServiceManager.rollbackTransaction(transaction.transaction);
        throw error;
      }
      
      // 清理场景数据
      if (scenarioData.cleanup) {
        scenarioData.cleanup();
      }
    });
  });

  describe('报表服务集成测试', () => {
    beforeEach(async () => {
      await domainServiceManager.initialize();
      
      // 创建基础测试数据
      const masterDataSet = MasterDataFactory.createMasterDataSet();
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(5);
      
      const masterDataService = domainServiceManager.getMasterDataService();
      
      // 插入基础数据
      for (const category of masterDataSet.categories) {
        await masterDataService.createCategory(category);
      }
      for (const unit of masterDataSet.units) {
        await masterDataService.createUnit(unit);
      }
      for (const warehouse of masterDataSet.warehouses) {
        await masterDataService.createWarehouse(warehouse);
      }
    });

    it('应该生成准确的跨服务统计报表', async () => {
      const reportService = domainServiceManager.getReportService();
      
      const statisticsResult = await reportService.getInventoryStatistics();
      
      expect(statisticsResult.success).toBe(true);
      expect(statisticsResult.data.totalProducts).toBeGreaterThanOrEqual(0);
      expect(statisticsResult.data.warehouseStats).toBeInstanceOf(Array);
      expect(statisticsResult.data.categoryStats).toBeInstanceOf(Array);
    });

    it('应该正确聚合多服务的数据', async () => {
      const masterDataService = domainServiceManager.getMasterDataService();
      const reportService = domainServiceManager.getReportService();
      
      // 获取基础数据统计
      const categoriesResult = await masterDataService.getCategories();
      const warehousesResult = await masterDataService.getWarehouses();
      
      // 获取报表统计
      const statsResult = await reportService.getInventoryStatistics();
      
      expect(categoriesResult.success).toBe(true);
      expect(warehousesResult.success).toBe(true);
      expect(statsResult.success).toBe(true);
      
      // 验证数据一致性
      expect(statsResult.data.categoryStats.length).toBe(categoriesResult.data.length);
      expect(statsResult.data.warehouseStats.length).toBe(warehousesResult.data.length);
    });
  });

  describe('并发和性能测试', () => {
    beforeEach(async () => {
      await domainServiceManager.initialize();
    });

    it('应该处理并发的多服务操作', async () => {
      const masterDataService = domainServiceManager.getMasterDataService();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      
      // 并发创建基础数据
      const categoryPromises = Array.from({ length: 5 }, (_, i) => 
        masterDataService.createCategory(MasterDataFactory.createCategory({
          name: `并发分类_${i}`
        }))
      );
      
      const unitPromises = Array.from({ length: 3 }, (_, i) => 
        masterDataService.createUnit(MasterDataFactory.createUnit({
          name: `并发单位_${i}`,
          symbol: `CU${i}`
        }))
      );
      
      // 等待所有操作完成
      const categoryResults = await Promise.all(categoryPromises);
      const unitResults = await Promise.all(unitPromises);
      
      // 验证所有操作都成功
      categoryResults.forEach(result => expect(result.success).toBe(true));
      unitResults.forEach(result => expect(result.success).toBe(true));
      
      // 验证数据库中的数据
      const dbCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get();
      const dbUnits = db.prepare('SELECT COUNT(*) as count FROM units').get();
      
      expect(dbCategories.count).toBeGreaterThanOrEqual(5);
      expect(dbUnits.count).toBeGreaterThanOrEqual(3);
    });

    it('应该在合理时间内完成复杂查询', async () => {
      // 创建大量测试数据
      const { products, stocks } = InventoryDomainFactory.createProductCatalog(20);
      
      const reportService = domainServiceManager.getReportService();
      
      const startTime = Date.now();
      const result = await reportService.getInventoryStatistics();
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // 2秒内完成
    });
  });

  describe('错误处理和恢复', () => {
    beforeEach(async () => {
      await domainServiceManager.initialize();
    });

    it('应该正确处理跨服务操作失败', async () => {
      const inventoryService = domainServiceManager.getInventoryDomainService();
      
      // 尝试创建产品，但引用不存在的分类ID
      const result = await inventoryService.createProduct({
        name: '测试产品',
        sku: 'TEST-001',
        categoryId: 'non-existent-category',
        unitId: 'non-existent-unit',
        purchasePrice: 100,
        salePrice: 150
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('foreign key');
    });

    it('应该支持事务回滚', async () => {
      const masterDataService = domainServiceManager.getMasterDataService();
      
      const transaction = await domainServiceManager.beginTransaction();
      expect(transaction.success).toBe(true);
      
      try {
        // 创建一个分类
        await masterDataService.createCategory(MasterDataFactory.createCategory());
        
        // 故意创建一个重复的分类（应该失败）
        await masterDataService.createCategory(MasterDataFactory.createCategory({
          name: '重复分类'
        }));
        await masterDataService.createCategory(MasterDataFactory.createCategory({
          name: '重复分类' // 同名分类
        }));
        
        await domainServiceManager.commitTransaction(transaction.transaction);
        
      } catch (error) {
        // 回滚事务
        const rollbackResult = await domainServiceManager.rollbackTransaction(transaction.transaction);
        expect(rollbackResult.success).toBe(true);
        
        // 验证数据已回滚
        const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
        expect(categoryCount.count).toBe(0);
      }
    });
  });
});