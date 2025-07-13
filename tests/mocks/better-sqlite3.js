/**
 * better-sqlite3 mock for integration tests
 * 模拟SQLite数据库以便在测试环境中使用
 */

class MockStatement {
  constructor(sql) {
    this.sql = sql;
    this.mockData = new Map();
  }

  run(...params) {
    // 模拟运行SQL语句
    return {
      changes: 1,
      lastInsertRowid: Math.floor(Math.random() * 1000) + 1
    };
  }

  get(...params) {
    // 模拟获取单条记录
    if (this.sql.includes('SELECT')) {
      return {
        id: '1',
        name: 'Test Item',
        sku: 'TEST-001',
        category: 'Test Category',
        stock_quantity: 100,
        unit_price: 10.99
      };
    }
    return null;
  }

  all(...params) {
    // 模拟获取多条记录
    if (this.sql.includes('SELECT')) {
      return [
        {
          id: '1',
          name: 'Test Item 1',
          sku: 'TEST-001',
          category: 'Test Category',
          stock_quantity: 100,
          unit_price: 10.99
        },
        {
          id: '2',
          name: 'Test Item 2',
          sku: 'TEST-002',
          category: 'Test Category',
          stock_quantity: 50,
          unit_price: 15.99
        }
      ];
    }
    return [];
  }

  pluck() {
    return this;
  }

  expand() {
    return this;
  }
}

class MockDatabase {
  constructor(path) {
    this.path = path;
    this.isOpen = true;
    console.log(`Mock database initialized at: ${path}`);
  }

  prepare(sql) {
    return new MockStatement(sql);
  }

  exec(sql) {
    // 模拟执行SQL脚本
    console.log(`Executing SQL: ${sql.substring(0, 100)}...`);
    return this;
  }

  pragma(name, value) {
    // 模拟pragma命令
    if (value !== undefined) {
      return this;
    }
    return 'mock_value';
  }

  transaction(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        throw error;
      }
    };
  }

  close() {
    this.isOpen = false;
    console.log('Mock database closed');
  }

  backup(destination) {
    return {
      transfer: () => ({ totalPages: 1, remainingPages: 0 }),
      close: () => {}
    };
  }

  // 添加常用的数据库方法
  function(name, fn) {
    return this;
  }

  aggregate(name, fn) {
    return this;
  }
}

// 模拟better-sqlite3的主要导出
function Database(path, options = {}) {
  return new MockDatabase(path);
}

// 静态方法
Database.SqliteError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
};

// 常用的SQLite常量
Database.OPEN_READONLY = 1;
Database.OPEN_READWRITE = 2;
Database.OPEN_CREATE = 4;

module.exports = Database;