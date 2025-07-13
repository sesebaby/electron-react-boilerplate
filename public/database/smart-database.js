/**
 * 智能数据库适配器
 * 自动选择最佳的数据库实现
 */

const path = require('path');
const fs = require('fs');

class SmartDatabase {
  constructor() {
    this.db = null;
    this.type = 'unknown';
  }

  async initialize(dbPath) {
    console.log('Initializing Smart Database...');
    
    // 策略1: 尝试 better-sqlite3
    try {
      const Database = require('better-sqlite3');
      this.db = new Database(dbPath || ':memory:');
      this.type = 'sqlite3';
      console.log('✅ Using better-sqlite3');
      return this;
    } catch (e) {
      console.warn('⚠️ better-sqlite3 failed:', e.message);
    }

    // 策略2: 尝试 sql.js (纯 JavaScript SQLite)
    try {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      
      if (dbPath && fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath);
        this.db = new SQL.Database(data);
      } else {
        this.db = new SQL.Database();
      }
      
      this.type = 'sql.js';
      console.log('✅ Using sql.js');
      return this;
    } catch (e) {
      console.warn('⚠️ sql.js failed:', e.message);
    }

    // 策略3: 使用 IndexedDB (浏览器环境)
    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        const { IndexedDBAdapter } = require('./indexeddb-adapter');
        this.db = new IndexedDBAdapter();
        await this.db.initialize();
        this.type = 'indexeddb';
        console.log('✅ Using IndexedDB');
        return this;
      } catch (e) {
        console.warn('⚠️ IndexedDB failed:', e.message);
      }
    }

    // 策略4: 最后的备选 - 内存 Mock
    console.warn('⚠️ All database strategies failed, using in-memory mock');
    const MockDatabase = require('./mock-database');
    this.db = new MockDatabase();
    this.type = 'mock';
    
    // 显示警告
    if (global.window && global.window.alert) {
      setTimeout(() => {
        alert('注意：应用正在使用模拟数据库，数据不会被保存！');
      }, 1000);
    }
    
    return this;
  }

  // 代理所有数据库方法
  prepare(...args) {
    if (!this.db) throw new Error('Database not initialized');
    
    if (this.type === 'mock') {
      return this.db.prepare(...args);
    } else if (this.type === 'sql.js') {
      // sql.js 的适配
      return {
        run: (...params) => {
          this.db.run(args[0], params);
          return { changes: 1 };
        },
        get: (...params) => {
          const stmt = this.db.prepare(args[0]);
          stmt.bind(params);
          if (stmt.step()) {
            return stmt.getAsObject();
          }
          return null;
        },
        all: (...params) => {
          const stmt = this.db.prepare(args[0]);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          return results;
        }
      };
    }
    
    return this.db.prepare(...args);
  }

  exec(...args) {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.exec(...args);
  }

  transaction(...args) {
    if (!this.db) throw new Error('Database not initialized');
    
    if (this.type === 'mock' || this.type === 'sql.js') {
      // 简单的事务模拟
      return (fn) => {
        try {
          return fn(...args);
        } catch (e) {
          console.error('Transaction failed:', e);
          throw e;
        }
      };
    }
    
    return this.db.transaction(...args);
  }

  close() {
    if (this.db && this.db.close) {
      this.db.close();
    }
  }

  // 获取数据库信息
  getInfo() {
    return {
      type: this.type,
      isRealDatabase: this.type !== 'mock',
      supportsPersistence: this.type !== 'mock',
      supportsTransactions: this.type === 'sqlite3',
      features: {
        sqlite3: this.type === 'sqlite3' ? '✅' : '❌',
        sqljs: this.type === 'sql.js' ? '✅' : '❌',
        indexeddb: this.type === 'indexeddb' ? '✅' : '❌',
        mock: this.type === 'mock' ? '⚠️' : '❌'
      }
    };
  }
}

module.exports = SmartDatabase;