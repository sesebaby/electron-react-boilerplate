/**
 * 库存数据库操作集成测试（使用中央化Mock数据）
 * 演示如何正确使用Mock数据进行集成测试
 */

import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { mockDataProvider } from '../../mocks/mockDataProvider';
import { transformDatabaseToFrontend } from '../../mocks/centralMockData';

describe('库存数据库集成测试（使用中央Mock）', () => {
  let db: Database.Database;
  const testDbPath = path.join(__dirname, '../../../test-inventory-mocks.db');
  
  beforeEach(() => {
    // 删除旧的测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // 创建新的测试数据库
    db = new Database(testDbPath);
    
    // 创建与实际项目一致的表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sku TEXT UNIQUE NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        reserved_quantity INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0,
        purchase_price REAL NOT NULL DEFAULT 0,
        total_value REAL NOT NULL DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        reorder_level INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        category INTEGER,
        supplier INTEGER,
        location TEXT,
        status TEXT DEFAULT 'active',
        unit_id INTEGER,
        brand TEXT,
        model TEXT,
        barcode TEXT,
        is_active BOOLEAN DEFAULT 1,
        images TEXT
      );
      
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjustment')),
        quantity INTEGER NOT NULL,
        unit_price REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id)
      );
      
      CREATE INDEX idx_transactions_item ON inventory_transactions(item_id);
      CREATE INDEX idx_transactions_type ON inventory_transactions(transaction_type);
    `);
  });
  
  afterEach(() => {
    // 关闭数据库连接
    db.close();
    
    // 删除测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });
  
  describe('使用中央Mock数据的库存管理', () => {
    it('应该正确插入和查询Mock数据', () => {
      // 获取中央化的Mock数据
      const mockItems = mockDataProvider.getRawDatabaseItems();
      const testItem = mockItems[0];
      
      // 插入数据（不包含id，让数据库自动生成）
      const stmt = db.prepare(`
        INSERT INTO inventory_items (
          name, description, sku, stock_quantity, reserved_quantity,
          unit_price, purchase_price, total_value, last_updated,
          reorder_level, max_stock, category, supplier, location,
          status, unit_id, brand, model, barcode, is_active, images
        ) VALUES (
          @name, @description, @sku, @stock_quantity, @reserved_quantity,
          @unit_price, @purchase_price, @total_value, @last_updated,
          @reorder_level, @max_stock, @category, @supplier, @location,
          @status, @unit_id, @brand, @model, @barcode, @is_active, @images
        )
      `);
      
      const result = stmt.run(testItem);
      
      // 验证插入成功
      expect(result.changes).toBe(1);
      const insertedId = result.lastInsertRowid;
      
      // 查询验证
      const selectStmt = db.prepare('SELECT * FROM inventory_items WHERE id = ?');
      const savedItem = selectStmt.get(insertedId);
      
      expect(savedItem).toBeDefined();
      expect(savedItem.name).toBe(testItem.name);
      expect(savedItem.sku).toBe(testItem.sku);
      expect(savedItem.stock_quantity).toBe(testItem.stock_quantity);
      expect(savedItem.unit_price).toBe(testItem.unit_price);
      
      // 验证字段映射正确性
      const transformedItem = transformDatabaseToFrontend(savedItem);
      expect(transformedItem.stockQuantity).toBe(testItem.stock_quantity);
      expect(transformedItem.salePrice).toBe(testItem.unit_price);
      expect(transformedItem.minStock).toBe(testItem.reorder_level);
    });
    
    it('应该正确处理批量Mock数据插入', () => {
      const mockItems = mockDataProvider.getRawDatabaseItems();
      
      const stmt = db.prepare(`
        INSERT INTO inventory_items (
          name, description, sku, stock_quantity, reserved_quantity,
          unit_price, purchase_price, total_value, last_updated,
          reorder_level, max_stock, category, supplier, location,
          status, unit_id, brand, model, barcode, is_active, images
        ) VALUES (
          @name, @description, @sku, @stock_quantity, @reserved_quantity,
          @unit_price, @purchase_price, @total_value, @last_updated,
          @reorder_level, @max_stock, @category, @supplier, @location,
          @status, @unit_id, @brand, @model, @barcode, @is_active, @images
        )
      `);
      
      // 批量插入
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item);
        }
      });
      
      insertMany(mockItems);
      
      // 验证所有数据已插入
      const count = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get();
      expect(count.count).toBe(mockItems.length);
      
      // 验证数据完整性
      const allItems = db.prepare('SELECT * FROM inventory_items').all();
      expect(allItems).toHaveLength(mockItems.length);
      
      // 验证每个项目的SKU都存在
      for (const mockItem of mockItems) {
        const dbItem = allItems.find(item => item.sku === mockItem.sku);
        expect(dbItem).toBeDefined();
      }
    });
    
    it('应该正确搜索Mock数据', () => {
      // 先插入所有Mock数据
      const mockItems = mockDataProvider.getRawDatabaseItems();
      const stmt = db.prepare(`
        INSERT INTO inventory_items (
          name, description, sku, stock_quantity, reserved_quantity,
          unit_price, purchase_price, total_value, last_updated,
          reorder_level, max_stock, category, supplier, location,
          status, unit_id, brand, model, barcode, is_active, images
        ) VALUES (
          @name, @description, @sku, @stock_quantity, @reserved_quantity,
          @unit_price, @purchase_price, @total_value, @last_updated,
          @reorder_level, @max_stock, @category, @supplier, @location,
          @status, @unit_id, @brand, @model, @barcode, @is_active, @images
        )
      `);
      
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item);
        }
      });
      
      insertMany(mockItems);
      
      // 测试搜索功能
      const searchStmt = db.prepare(`
        SELECT * FROM inventory_items 
        WHERE name LIKE @search OR sku LIKE @search OR description LIKE @search
      `);
      
      const searchTerm = '%鼠标%';
      const searchResults = searchStmt.all({ search: searchTerm });
      
      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].name).toContain('鼠标');
      
      // 验证搜索结果与Mock数据提供者的搜索功能一致
      const mockSearchResults = mockDataProvider.searchItems('鼠标');
      expect(searchResults.length).toBe(mockSearchResults.length);
    });
    
    it('应该正确识别低库存Mock数据', () => {
      // 插入Mock数据
      const mockItems = mockDataProvider.getRawDatabaseItems();
      
      // 修改一些数据使其成为低库存
      const modifiedItems = mockItems.map((item, index) => ({
        ...item,
        stock_quantity: index === 0 ? 10 : item.stock_quantity, // 第一个项目设为低库存
        reorder_level: index === 0 ? 30 : item.reorder_level
      }));
      
      const stmt = db.prepare(`
        INSERT INTO inventory_items (
          name, description, sku, stock_quantity, reserved_quantity,
          unit_price, purchase_price, total_value, last_updated,
          reorder_level, max_stock, category, supplier, location,
          status, unit_id, brand, model, barcode, is_active, images
        ) VALUES (
          @name, @description, @sku, @stock_quantity, @reserved_quantity,
          @unit_price, @purchase_price, @total_value, @last_updated,
          @reorder_level, @max_stock, @category, @supplier, @location,
          @status, @unit_id, @brand, @model, @barcode, @is_active, @images
        )
      `);
      
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          stmt.run(item);
        }
      });
      
      insertMany(modifiedItems);
      
      // 查询低库存项目
      const lowStockStmt = db.prepare(`
        SELECT * FROM inventory_items 
        WHERE stock_quantity <= reorder_level
      `);
      
      const lowStockItems = lowStockStmt.all();
      
      expect(lowStockItems.length).toBeGreaterThan(0);
      expect(lowStockItems[0].stock_quantity).toBeLessThanOrEqual(lowStockItems[0].reorder_level);
    });
  });
  
  describe('字段映射验证', () => {
    it('应该验证所有字段映射的正确性', () => {
      const mockItem = mockDataProvider.getRawDatabaseItems()[0];
      
      // 插入数据
      const stmt = db.prepare(`
        INSERT INTO inventory_items (
          name, description, sku, stock_quantity, reserved_quantity,
          unit_price, purchase_price, total_value, last_updated,
          reorder_level, max_stock, category, supplier, location,
          status, unit_id, brand, model, barcode, is_active, images
        ) VALUES (
          @name, @description, @sku, @stock_quantity, @reserved_quantity,
          @unit_price, @purchase_price, @total_value, @last_updated,
          @reorder_level, @max_stock, @category, @supplier, @location,
          @status, @unit_id, @brand, @model, @barcode, @is_active, @images
        )
      `);
      
      const result = stmt.run(mockItem);
      const insertedId = result.lastInsertRowid;
      
      // 查询数据
      const selectStmt = db.prepare('SELECT * FROM inventory_items WHERE id = ?');
      const dbItem = selectStmt.get(insertedId);
      
      // 转换并验证
      const frontendItem = transformDatabaseToFrontend(dbItem);
      
      // 验证关键字段映射
      expect(frontendItem.stockQuantity).toBe(dbItem.stock_quantity);
      expect(frontendItem.reservedQuantity).toBe(dbItem.reserved_quantity);
      expect(frontendItem.salePrice).toBe(dbItem.unit_price);
      expect(frontendItem.purchasePrice).toBe(dbItem.purchase_price);
      expect(frontendItem.minStock).toBe(dbItem.reorder_level);
      expect(frontendItem.maxStock).toBe(dbItem.max_stock);
      expect(frontendItem.categoryId).toBe(dbItem.category);
      expect(frontendItem.supplierId).toBe(dbItem.supplier);
      expect(frontendItem.isActive).toBe(Boolean(dbItem.is_active));
      
      // 验证计算字段
      expect(frontendItem.availableQuantity).toBe(
        dbItem.stock_quantity - dbItem.reserved_quantity
      );
    });
  });
});