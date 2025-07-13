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

    // 策略0: 尝试简单的 SQLite 实现（使用现有数据库文件）
    if (dbPath && fs.existsSync(dbPath)) {
      try {
        const SimpleSQLite = require('./simple-sqlite');
        this.db = new SimpleSQLite(dbPath);
        await this.db.initialize();
        this.type = 'simple-sqlite';
        console.log('✅ Using Simple SQLite with existing database');
        return this;
      } catch (e) {
        console.warn('⚠️ Simple SQLite failed:', e.message);
      }
    }

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

    // 策略4: 最后的备选 - 内存 Mock (仅限开发环境)
    const isProduction = process.env.NODE_ENV === 'production' ||
                        (global.process && global.process.env.NODE_ENV === 'production') ||
                        (typeof require !== 'undefined' && require('electron') && require('electron').app && require('electron').app.isPackaged);

    // 检查是否强制要求真实数据库
    const forceRealDatabase = process.env.FORCE_REAL_DATABASE === 'true';

    // 🚨 生产环境严格禁止使用Mock数据库
    if (isProduction || forceRealDatabase) {
      console.error('🚨 CRITICAL ERROR: Cannot use mock database in production environment!');
      console.error('Production environment detected:', {
        NODE_ENV: process.env.NODE_ENV,
        isPackaged: typeof require !== 'undefined' && require('electron') && require('electron').app && require('electron').app.isPackaged,
        forceRealDatabase: forceRealDatabase
      });

      const error = new Error('🚨 PRODUCTION ERROR: 数据库连接失败，生产环境禁止使用模拟数据库。请检查数据库配置和文件权限。');
      error.code = 'DATABASE_CONNECTION_FAILED';
      throw error;
    }

    console.warn('⚠️ All database strategies failed, using in-memory mock (DEVELOPMENT ONLY)');
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
    } else if (this.type === 'simple-sqlite') {
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

    if (this.type === 'simple-sqlite') {
      return (fn) => {
        return this.db.transaction(fn);
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
      supportsTransactions: this.type === 'sqlite3' || this.type === 'simple-sqlite',
      features: {
        sqlite3: this.type === 'sqlite3' ? '✅' : '❌',
        'simple-sqlite': this.type === 'simple-sqlite' ? '✅' : '❌',
        sqljs: this.type === 'sql.js' ? '✅' : '❌',
        indexeddb: this.type === 'indexeddb' ? '✅' : '❌',
        mock: this.type === 'mock' ? '⚠️' : '❌'
      }
    };
  }
}

module.exports = SmartDatabase;