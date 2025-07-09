import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { DatabaseConfig, QueryResult } from '../../types/database';

class DatabaseConnection {
  private db: sqlite3.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbPath = this.config.path;
      
      // 确保数据库目录存在
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
        } else {
          console.log(`Connected to SQLite database at ${dbPath}`);
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(new Error(`Failed to close database: ${err.message}`));
          } else {
            this.db = null;
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(query: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(query, params, function(err) {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`));
        } else {
          resolve({
            data: [],
            rowsAffected: this.changes
          });
        }
      });
    });
  }

  async get(query: string, params: any[] = []): Promise<any> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.get(query, params, (err, row) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`));
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    return new Promise((resolve, reject) => {
      this.db!.all(query, params, (err, rows) => {
        if (err) {
          reject(new Error(`Query failed: ${err.message}`));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
    return {
      run: this.run.bind(this),
      get: this.get.bind(this),
      all: this.all.bind(this),
      commit: () => this.run('COMMIT'),
      rollback: () => this.run('ROLLBACK')
    };
  }

  isConnected(): boolean {
    return this.db !== null;
  }
}

// 单例模式管理数据库连接
class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: DatabaseConnection | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async initialize(config?: Partial<DatabaseConfig>): Promise<void> {
    const defaultConfig: DatabaseConfig = {
      path: path.join(process.cwd(), 'data', 'inventory.db'),
      timeout: 5000
    };

    const finalConfig = { ...defaultConfig, ...config };
    
    if (this.connection) {
      await this.connection.disconnect();
    }

    this.connection = new DatabaseConnection(finalConfig);
    await this.connection.connect();
    
    // 初始化数据库表结构
    await this.initializeSchema();
  }

  private async initializeSchema(): Promise<void> {
    try {
      // 使用与main.js相同的嵌入式schema，确保一致性
      // 注意：这个文件可能不再被使用，如果项目使用main.js中的数据库初始化
      const schema = `
        -- 用户表
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nickname TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          avatar TEXT,
          role TEXT NOT NULL CHECK(role IN ('admin', 'purchaser', 'salesperson', 'warehouse', 'finance')),
          status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'locked')) DEFAULT 'active',
          last_login_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 仓库表
        CREATE TABLE IF NOT EXISTS warehouses (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          address TEXT,
          manager TEXT,
          phone TEXT,
          is_default BOOLEAN NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 客户表
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          customer_type TEXT NOT NULL CHECK(customer_type IN ('individual', 'company')) DEFAULT 'individual',
          credit_limit REAL NOT NULL DEFAULT 0,
          payment_terms TEXT,
          discount_rate REAL NOT NULL DEFAULT 0,
          level TEXT NOT NULL CHECK(level IN ('VIP', 'Gold', 'Silver', 'Bronze')) DEFAULT 'Bronze',
          status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 分类表
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          parent_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES categories(id)
        );

        -- 供应商表
        CREATE TABLE IF NOT EXISTS suppliers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 计量单位表
        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          symbol TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('weight', 'length', 'volume', 'quantity', 'area', 'time')),
          precision INTEGER NOT NULL DEFAULT 2 CHECK(precision >= 0 AND precision <= 6),
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- 库存交易记录表
        CREATE TABLE IF NOT EXISTS inventory_transactions (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjustment')),
          quantity INTEGER NOT NULL,
          unit_price REAL,
          total_amount REAL,
          reference_number TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT,
          FOREIGN KEY (item_id) REFERENCES inventory_items(id)
        );

        -- 库存物品表
        CREATE TABLE IF NOT EXISTS inventory_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          sku TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL,
          supplier TEXT,
          stock_quantity INTEGER NOT NULL DEFAULT 0,
          reserved_quantity INTEGER NOT NULL DEFAULT 0,
          unit_price REAL NOT NULL DEFAULT 0,
          total_value REAL NOT NULL DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT CHECK(status IN ('in-stock', 'low-stock', 'out-of-stock', 'discontinued')) DEFAULT 'in-stock',
          location TEXT,
          reorder_level INTEGER DEFAULT 0,
          max_stock INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
        CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
        CREATE INDEX IF NOT EXISTS idx_customers_level ON customers(level);
        CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
        CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
        CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
        CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
        CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
        CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);
        CREATE INDEX IF NOT EXISTS idx_units_type ON units(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_item ON inventory_transactions(item_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON inventory_transactions(transaction_type);
      `;
      
      // 拆分SQL语句并执行
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      for (const statement of statements) {
        await this.connection!.run(statement);
      }
      
      console.log('Database schema initialized successfully');
    } catch (error) {
      console.log('Failed to initialize database schema:', error);
      throw error;
    }
  }

  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.disconnect();
      this.connection = null;
    }
  }
}

export { DatabaseManager, DatabaseConnection };
export default DatabaseManager.getInstance();