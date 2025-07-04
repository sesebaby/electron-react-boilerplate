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
      const schemaPath = path.join(__dirname, '../../data/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      
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
      console.error('Failed to initialize database schema:', error);
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