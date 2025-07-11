/**
 * Mock 数据库实现
 * 用于开发和测试环境，避免原生模块依赖问题
 */

class MockDatabase {
  constructor() {
    this.data = {
      products: new Map(),
      categories: new Map(),
      warehouses: new Map(),
      inventory_stocks: new Map(),
      accounts_receivable: new Map(),
      accounts_payable: new Map(),
      purchase_orders: new Map(),
      sales_orders: new Map(),
    };
    
    console.log('Using Mock Database (Development Mode)');
  }

  // 模拟 better-sqlite3 的 API
  prepare(sql) {
    return {
      run: (...args) => {
        console.log('Mock SQL Run:', sql, args);
        return { changes: 1, lastInsertRowid: Date.now() };
      },
      get: (...args) => {
        console.log('Mock SQL Get:', sql, args);
        // 返回模拟数据
        return null;
      },
      all: (...args) => {
        console.log('Mock SQL All:', sql, args);
        return [];
      }
    };
  }

  exec(sql) {
    console.log('Mock SQL Exec:', sql);
  }

  transaction(fn) {
    return (...args) => {
      console.log('Mock Transaction');
      return fn(...args);
    };
  }

  close() {
    console.log('Mock Database Closed');
  }

  // 模拟数据操作
  createProduct(product) {
    this.data.products.set(product.id, product);
    return { success: true, data: product };
  }

  getProduct(criteria) {
    for (const [id, product] of this.data.products) {
      if (criteria.id === id || criteria.sku === product.sku) {
        return { success: true, data: product };
      }
    }
    return { success: true, data: null };
  }

  getProducts() {
    return Array.from(this.data.products.values());
  }

  updateProduct(id, updates) {
    const product = this.data.products.get(id);
    if (product) {
      const updated = { ...product, ...updates };
      this.data.products.set(id, updated);
      return { success: true, data: updated };
    }
    return { success: false, error: 'Product not found' };
  }
}

module.exports = MockDatabase;