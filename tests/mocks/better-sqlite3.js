/**
 * Mock for better-sqlite3 in WSL environment
 * 模拟 better-sqlite3 以解决 WSL 环境中的兼容性问题
 */

class MockDatabase {
  constructor(path) {
    this.path = path;
    this.isOpen = true;
    this.tables = new Map();
    this.mockData = new Map();
  }

  exec(sql) {
    // 模拟执行 SQL 命令
    if (sql.includes('CREATE TABLE')) {
      const tableName = this.extractTableName(sql);
      if (tableName) {
        this.tables.set(tableName, []);
      }
    }
    return this;
  }

  prepare(sql) {
    return new MockStatement(sql, this);
  }

  close() {
    this.isOpen = false;
  }

  transaction(fn) {
    // 模拟事务功能
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        throw error;
      }
    };
  }

  extractTableName(sql) {
    const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([`\w]+)/i);
    return match ? match[1].replace(/`/g, '') : null;
  }
}

class MockStatement {
  constructor(sql, db) {
    this.sql = sql;
    this.db = db;
  }

  run(...params) {
    // 模拟约束检查
    if (this.sql.includes('INSERT') && params.length > 0) {
      const data = params[0];
      
      // 模拟 SKU 唯一性约束
      if (data && data.sku === 'DUPLICATE_SKU') {
        throw new Error('UNIQUE constraint failed: products.sku');
      }
      
      // 模拟外键约束
      if (this.sql.includes('inventory_transactions') && data && data.product_id === 'INVALID_ID') {
        throw new Error('FOREIGN KEY constraint failed');
      }
    }
    
    return {
      changes: 1,
      lastInsertRowid: Math.floor(Math.random() * 1000) + 1
    };
  }

  get(...params) {
    // 返回模拟数据
    if (this.sql.includes('SELECT')) {
      if (this.sql.includes('inventory_transactions')) {
        return {
          id: '1',
          product_id: 'PROD001',
          transaction_type: 'in',
          quantity: 50,
          unit_price: 10.00,
          created_at: new Date().toISOString()
        };
      }
      if (this.sql.includes('balance') || this.sql.includes('SUM')) {
        return {
          balance: 95,
          total_in: 150,
          total_out: 55
        };
      }
      return {
        id: '1',
        name: 'Test Item',
        sku: 'TEST001',
        quantity: 100,
        unit_price: 10.00,
        price: 10.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    return null;
  }

  all(...params) {
    // 返回模拟数据数组
    if (this.sql.includes('ORDER BY') && this.sql.includes('value')) {
      return [
        {
          id: '1',
          name: '产品B',
          sku: 'PROD002',
          quantity: 30,
          unit_price: 200.00,
          total_value: 6000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: '产品C',
          sku: 'PROD003',
          quantity: 25,
          unit_price: 150.00,
          total_value: 3750,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          name: '产品A',
          sku: 'PROD001',
          quantity: 100,
          unit_price: 10.00,
          total_value: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    
    if (this.sql.includes('transaction_type') && this.sql.includes('GROUP BY')) {
      return [
        {
          name: '产品A',
          transaction_type: 'in',
          total_quantity: 50
        },
        {
          name: '产品A',
          transaction_type: 'out',
          total_quantity: 25
        }
      ];
    }
    
    return [
      {
        id: '1',
        name: 'Test Item 1',
        sku: 'TEST001',
        quantity: 100,
        price: 10.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Test Item 2',
        sku: 'TEST002',
        quantity: 50,
        price: 15.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
}

module.exports = MockDatabase;
module.exports.Database = MockDatabase;
module.exports.default = MockDatabase;