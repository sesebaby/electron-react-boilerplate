/**
 * 库存数据库操作集成测试
 * 测试真实的数据库交互
 */

import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

describe('库存数据库集成测试', () => {
  let db: Database.Database;
  const testDbPath = path.join(__dirname, '../../../test-inventory.db');
  
  beforeEach(() => {
    // 删除旧的测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // 创建新的测试数据库
    db = new Database(testDbPath);
    
    // 创建表结构
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE NOT NULL,
        stock_quantity INTEGER NOT NULL DEFAULT 0,
        unit_price REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
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
  
  describe('库存物品管理', () => {
    it('应该创建库存物品并正确保存', () => {
      // 准备数据
      const item = {
        id: 'ITEM-001',
        name: '测试产品',
        sku: 'TEST-SKU-001',
        stock_quantity: 100,
        unit_price: 50.00
      };
      
      // 插入数据
      const stmt = db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `);
      
      const result = stmt.run(item);
      
      // 验证插入成功
      expect(result.changes).toBe(1);
      
      // 查询验证
      const selectStmt = db.prepare('SELECT * FROM inventory_items WHERE id = ?');
      const savedItem = selectStmt.get(item.id);
      
      expect(savedItem).toBeDefined();
      expect(savedItem.name).toBe(item.name);
      expect(savedItem.sku).toBe(item.sku);
      expect(savedItem.stock_quantity).toBe(item.stock_quantity);
      expect(savedItem.unit_price).toBe(item.unit_price);
    });
    
    it('应该强制执行 SKU 唯一性约束', () => {
      // 创建第一个物品
      const item1 = {
        id: 'ITEM-001',
        name: '产品1',
        sku: 'DUPLICATE-SKU',
        stock_quantity: 100,
        unit_price: 50.00
      };
      
      const stmt = db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `);
      
      stmt.run(item1);
      
      // 尝试创建具有相同 SKU 的第二个物品
      const item2 = {
        id: 'ITEM-002',
        name: '产品2',
        sku: 'DUPLICATE-SKU', // 相同的 SKU
        stock_quantity: 50,
        unit_price: 30.00
      };
      
      // 应该抛出唯一性约束错误
      expect(() => stmt.run(item2)).toThrow('UNIQUE constraint failed');
    });
  });
  
  describe('库存交易处理', () => {
    beforeEach(() => {
      // 创建测试物品
      const item = {
        id: 'ITEM-TEST',
        name: '测试物品',
        sku: 'TEST-TRANS',
        stock_quantity: 100,
        unit_price: 50.00
      };
      
      db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `).run(item);
    });
    
    it('应该正确记录入库交易', () => {
      // 创建入库交易
      const transaction = {
        id: 'TRX-IN-001',
        item_id: 'ITEM-TEST',
        transaction_type: 'in',
        quantity: 50,
        unit_price: 45.00
      };
      
      const stmt = db.prepare(`
        INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_price)
        VALUES (@id, @item_id, @transaction_type, @quantity, @unit_price)
      `);
      
      const result = stmt.run(transaction);
      expect(result.changes).toBe(1);
      
      // 验证交易记录
      const selectStmt = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?');
      const savedTransaction = selectStmt.get(transaction.id);
      
      expect(savedTransaction).toBeDefined();
      expect(savedTransaction.transaction_type).toBe('in');
      expect(savedTransaction.quantity).toBe(50);
    });
    
    it('应该正确计算库存余额', () => {
      // 创建多个交易
      const transactions = [
        { id: 'TRX-1', item_id: 'ITEM-TEST', transaction_type: 'in', quantity: 100, unit_price: 50 },
        { id: 'TRX-2', item_id: 'ITEM-TEST', transaction_type: 'out', quantity: 30, unit_price: 50 },
        { id: 'TRX-3', item_id: 'ITEM-TEST', transaction_type: 'in', quantity: 50, unit_price: 55 },
        { id: 'TRX-4', item_id: 'ITEM-TEST', transaction_type: 'out', quantity: 20, unit_price: 55 },
        { id: 'TRX-5', item_id: 'ITEM-TEST', transaction_type: 'adjustment', quantity: -5, unit_price: 0 }
      ];
      
      const stmt = db.prepare(`
        INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_price)
        VALUES (@id, @item_id, @transaction_type, @quantity, @unit_price)
      `);
      
      transactions.forEach(t => stmt.run(t));
      
      // 计算库存余额
      const balanceStmt = db.prepare(`
        SELECT 
          SUM(CASE 
            WHEN transaction_type = 'in' THEN quantity
            WHEN transaction_type = 'out' THEN -quantity
            WHEN transaction_type = 'adjustment' THEN quantity
          END) as balance
        FROM inventory_transactions 
        WHERE item_id = ?
      `);
      
      const result = balanceStmt.get('ITEM-TEST');
      
      // 100 - 30 + 50 - 20 - 5 = 95
      expect(result.balance).toBe(95);
    });
    
    it('应该强制执行外键约束', () => {
      // 尝试为不存在的物品创建交易
      const transaction = {
        id: 'TRX-FK-001',
        item_id: 'NON-EXISTENT-ITEM',
        transaction_type: 'in',
        quantity: 50,
        unit_price: 45.00
      };
      
      const stmt = db.prepare(`
        INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_price)
        VALUES (@id, @item_id, @transaction_type, @quantity, @unit_price)
      `);
      
      // 应该因外键约束失败
      expect(() => stmt.run(transaction)).toThrow('FOREIGN KEY constraint failed');
    });
  });
  
  describe('复杂查询和报表', () => {
    beforeEach(() => {
      // 创建测试数据
      const items = [
        { id: 'ITEM-A', name: '产品A', sku: 'SKU-A', stock_quantity: 100, unit_price: 50 },
        { id: 'ITEM-B', name: '产品B', sku: 'SKU-B', stock_quantity: 200, unit_price: 30 },
        { id: 'ITEM-C', name: '产品C', sku: 'SKU-C', stock_quantity: 50, unit_price: 100 }
      ];
      
      const itemStmt = db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `);
      
      items.forEach(item => itemStmt.run(item));
      
      // 创建交易记录
      const transactions = [
        { id: 'TRX-A1', item_id: 'ITEM-A', transaction_type: 'in', quantity: 50, unit_price: 45 },
        { id: 'TRX-A2', item_id: 'ITEM-A', transaction_type: 'out', quantity: 30, unit_price: 50 },
        { id: 'TRX-B1', item_id: 'ITEM-B', transaction_type: 'in', quantity: 100, unit_price: 25 },
        { id: 'TRX-B2', item_id: 'ITEM-B', transaction_type: 'out', quantity: 50, unit_price: 30 },
        { id: 'TRX-C1', item_id: 'ITEM-C', transaction_type: 'in', quantity: 30, unit_price: 90 }
      ];
      
      const transStmt = db.prepare(`
        INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_price)
        VALUES (@id, @item_id, @transaction_type, @quantity, @unit_price)
      `);
      
      transactions.forEach(t => transStmt.run(t));
    });
    
    it('应该生成库存价值报表', () => {
      // 查询每个物品的库存价值
      const reportStmt = db.prepare(`
        SELECT 
          i.id,
          i.name,
          i.sku,
          i.stock_quantity,
          i.unit_price,
          i.stock_quantity * i.unit_price as total_value
        FROM inventory_items i
        ORDER BY total_value DESC
      `);
      
      const report = reportStmt.all();
      
      expect(report).toHaveLength(3);
      
      // 验证排序（按价值降序）
      expect(report[0].name).toBe('产品B'); // 200 * 30 = 6000
      expect(report[1].name).toBe('产品A'); // 100 * 50 = 5000
      expect(report[2].name).toBe('产品C'); // 50 * 100 = 5000
      
      // 验证总价值
      const totalValue = report.reduce((sum, item) => sum + item.total_value, 0);
      expect(totalValue).toBe(16000);
    });
    
    it('应该生成交易汇总报表', () => {
      // 按物品和交易类型汇总
      const summaryStmt = db.prepare(`
        SELECT 
          i.name,
          t.transaction_type,
          COUNT(*) as transaction_count,
          SUM(t.quantity) as total_quantity,
          SUM(t.quantity * t.unit_price) as total_value
        FROM inventory_transactions t
        JOIN inventory_items i ON t.item_id = i.id
        GROUP BY i.id, t.transaction_type
        ORDER BY i.name, t.transaction_type
      `);
      
      const summary = summaryStmt.all();
      
      // 验证汇总数据
      const productASummary = summary.filter(s => s.name === '产品A');
      expect(productASummary).toHaveLength(2); // in 和 out
      
      const productAIn = productASummary.find(s => s.transaction_type === 'in');
      expect(productAIn.total_quantity).toBe(50);
      expect(productAIn.total_value).toBe(2250); // 50 * 45
      
      const productAOut = productASummary.find(s => s.transaction_type === 'out');
      expect(productAOut.total_quantity).toBe(30);
      expect(productAOut.total_value).toBe(1500); // 30 * 50
    });
  });
  
  describe('事务处理', () => {
    it('应该正确处理事务回滚', () => {
      // 开始事务
      const insertStmt = db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `);
      
      const transaction = db.transaction((items: any[]) => {
        for (const item of items) {
          insertStmt.run(item);
          
          // 模拟错误：第三个物品有重复的 SKU
          if (item.id === 'ITEM-3') {
            throw new Error('Duplicate SKU');
          }
        }
      });
      
      const items = [
        { id: 'ITEM-1', name: '产品1', sku: 'SKU-1', stock_quantity: 100, unit_price: 50 },
        { id: 'ITEM-2', name: '产品2', sku: 'SKU-2', stock_quantity: 200, unit_price: 30 },
        { id: 'ITEM-3', name: '产品3', sku: 'SKU-1', stock_quantity: 150, unit_price: 40 } // 重复的 SKU
      ];
      
      // 执行事务（应该失败）
      expect(() => transaction(items)).toThrow('Duplicate SKU');
      
      // 验证没有任何数据被插入（事务回滚）
      const count = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get();
      expect(count.count).toBe(0);
    });
    
    it('应该成功提交完整的事务', () => {
      const insertItemStmt = db.prepare(`
        INSERT INTO inventory_items (id, name, sku, stock_quantity, unit_price)
        VALUES (@id, @name, @sku, @stock_quantity, @unit_price)
      `);
      
      const insertTransStmt = db.prepare(`
        INSERT INTO inventory_transactions (id, item_id, transaction_type, quantity, unit_price)
        VALUES (@id, @item_id, @transaction_type, @quantity, @unit_price)
      `);
      
      const updateStockStmt = db.prepare(`
        UPDATE inventory_items 
        SET stock_quantity = stock_quantity + @quantity 
        WHERE id = @item_id
      `);
      
      // 创建一个完整的入库事务
      const createInboundTransaction = db.transaction((itemId: string, quantity: number, unitPrice: number) => {
        // 1. 创建交易记录
        insertTransStmt.run({
          id: `TRX-${Date.now()}`,
          item_id: itemId,
          transaction_type: 'in',
          quantity: quantity,
          unit_price: unitPrice
        });
        
        // 2. 更新库存数量
        updateStockStmt.run({
          item_id: itemId,
          quantity: quantity
        });
        
        return true;
      });
      
      // 先创建物品
      insertItemStmt.run({
        id: 'ITEM-TX',
        name: '事务测试产品',
        sku: 'TX-TEST',
        stock_quantity: 100,
        unit_price: 50
      });
      
      // 执行入库事务
      const result = createInboundTransaction('ITEM-TX', 50, 45);
      expect(result).toBe(true);
      
      // 验证结果
      const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get('ITEM-TX');
      expect(item.stock_quantity).toBe(150); // 100 + 50
      
      const transactions = db.prepare('SELECT * FROM inventory_transactions WHERE item_id = ?').all('ITEM-TX');
      expect(transactions).toHaveLength(1);
      expect(transactions[0].quantity).toBe(50);
    });
  });
});