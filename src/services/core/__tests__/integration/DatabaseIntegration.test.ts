/**
 * 数据库集成测试
 * 测试真实的数据库连接和操作
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseManager } from '../../database';

describe('数据库集成测试', () => {
  const testDbPath = path.join(__dirname, 'test.db');
  let db: Database.Database;

  beforeEach(() => {
    // 删除测试数据库（如果存在）
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // 创建真实的数据库连接
    db = new Database(testDbPath);
  });

  afterEach(() => {
    // 关闭数据库连接
    if (db) {
      db.close();
    }

    // 清理测试数据库
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('应该能够创建数据库表', () => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    expect(() => {
      db.exec(createTableSQL);
    }).not.toThrow();

    // 验证表已创建
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables).toContainEqual({ name: 'products' });
  });

  it('应该能够插入和查询数据', () => {
    // 创建表
    db.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL
      )
    `);

    // 插入数据
    const insert = db.prepare('INSERT INTO products (id, name, price) VALUES (?, ?, ?)');
    insert.run('1', 'Test Product', 99.99);

    // 查询数据
    const select = db.prepare('SELECT * FROM products WHERE id = ?');
    const product = select.get('1');

    expect(product).toEqual({
      id: '1',
      name: 'Test Product',
      price: 99.99
    });
  });

  it('应该处理事务', () => {
    db.exec(`
      CREATE TABLE accounts (
        id TEXT PRIMARY KEY,
        balance REAL NOT NULL
      )
    `);

    const insertAccount = db.prepare('INSERT INTO accounts (id, balance) VALUES (?, ?)');
    const updateBalance = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');

    // 使用事务
    const transfer = db.transaction((fromId: string, toId: string, amount: number) => {
      updateBalance.run(-amount, fromId);
      updateBalance.run(amount, toId);
    });

    // 创建两个账户
    insertAccount.run('A', 1000);
    insertAccount.run('B', 500);

    // 执行转账
    transfer('A', 'B', 100);

    // 验证结果
    const accountA = db.prepare('SELECT balance FROM accounts WHERE id = ?').get('A');
    const accountB = db.prepare('SELECT balance FROM accounts WHERE id = ?').get('B');

    expect(accountA.balance).toBe(900);
    expect(accountB.balance).toBe(600);
  });
});