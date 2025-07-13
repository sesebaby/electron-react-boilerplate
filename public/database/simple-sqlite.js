/**
 * 简单的 SQLite 数据库访问器
 * 使用 Node.js 的 child_process 来执行 SQLite 命令
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SimpleSQLite {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.isInitialized = false;
  }

  async initialize() {
    // 检查数据库文件是否存在
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(`Database file not found: ${this.dbPath}`);
    }
    
    // 检查是否可以访问 sqlite3 命令
    try {
      execSync('sqlite3 --version', { stdio: 'ignore' });
      this.isInitialized = true;
      console.log('✅ Using system SQLite3');
      return this;
    } catch (e) {
      throw new Error('SQLite3 command not available on system');
    }
  }

  prepare(sql) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    return {
      run: (...params) => {
        return this.run(sql, params);
      },
      get: (...params) => {
        return this.get(sql, params);
      },
      all: (...params) => {
        return this.all(sql, params);
      }
    };
  }

  run(sql, params = []) {
    try {
      // 构建 SQLite 命令
      const command = this.buildCommand(sql, params);
      const result = execSync(command, { encoding: 'utf8' });
      
      // 解析结果
      return { changes: 1, lastInsertRowid: null };
    } catch (error) {
      throw new Error(`SQLite run error: ${error.message}`);
    }
  }

  get(sql, params = []) {
    try {
      // 构建 SQLite 命令
      const command = this.buildCommand(sql, params);
      const result = execSync(command, { encoding: 'utf8' });
      
      if (!result.trim()) {
        return null;
      }

      // 解析 JSON 结果
      const lines = result.trim().split('\n');
      if (lines.length > 0) {
        try {
          return JSON.parse(lines[0]);
        } catch (e) {
          // 如果不是 JSON，尝试解析为简单对象
          return this.parseSimpleResult(lines[0]);
        }
      }
      
      return null;
    } catch (error) {
      throw new Error(`SQLite get error: ${error.message}`);
    }
  }

  all(sql, params = []) {
    try {
      // 构建 SQLite 命令
      const command = this.buildCommand(sql, params);
      const result = execSync(command, { encoding: 'utf8' });
      
      if (!result.trim()) {
        return [];
      }

      // 解析结果
      const lines = result.trim().split('\n');
      const results = [];
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            results.push(JSON.parse(line));
          } catch (e) {
            results.push(this.parseSimpleResult(line));
          }
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`SQLite all error: ${error.message}`);
    }
  }

  buildCommand(sql, params = []) {
    // 转义参数
    const escapedParams = params.map(param => {
      if (param === null || param === undefined) {
        return 'NULL';
      }
      if (typeof param === 'string') {
        return `'${param.replace(/'/g, "''")}'`;
      }
      return param.toString();
    });

    // 替换参数占位符
    let processedSql = sql;
    for (let i = 0; i < escapedParams.length; i++) {
      processedSql = processedSql.replace('?', escapedParams[i]);
    }

    // 构建命令
    return `sqlite3 "${this.dbPath}" ".mode json" "${processedSql}"`;
  }

  parseSimpleResult(line) {
    // 简单的结果解析器
    const parts = line.split('|');
    if (parts.length === 1) {
      return { value: parts[0] };
    }
    
    // 尝试构建对象
    const result = {};
    parts.forEach((part, index) => {
      result[`col_${index}`] = part;
    });
    
    return result;
  }

  transaction(fn) {
    // 简单的事务实现
    try {
      this.run('BEGIN TRANSACTION');
      const result = fn();
      this.run('COMMIT');
      return result;
    } catch (error) {
      this.run('ROLLBACK');
      throw error;
    }
  }

  close() {
    // 没有需要关闭的连接
    this.isInitialized = false;
  }
}

module.exports = SimpleSQLite;
