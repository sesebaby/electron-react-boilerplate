#!/usr/bin/env node

// 测试场景A: 标准采购销售流程
// 完整的采购入库 → 销售出库流程测试

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

// 测试场景A的参数
const SCENARIO_A = {
  name: '标准采购销售流程',
  description: '测试完整的采购入库到销售出库流程',
  
  // 采购订单参数
  purchase: {
    supplier_code: 'SUP001', // 苹果科技供应商
    product_sku: 'IP15PRO-256-BLK', // iPhone 15 Pro
    warehouse_code: 'WH001', // 总仓库
    quantity: 100,
    unit_price: 8000,
    discount_rate: 0.05, // 5%折扣
    tax_rate: 0.13 // 13%税率
  },
  
  // 销售订单参数
  sales: {
    customer_code: 'CUS001', // ABC科技有限公司
    product_sku: 'IP15PRO-256-BLK', // 同一产品
    warehouse_code: 'WH001', // 同一仓库
    quantity: 50,
    unit_price: 9999,
    discount_rate: 0.1 // 10%折扣
  }
};

// 数据库操作类
class TestDatabase {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
    this.ensureTablesExist();
  }

  // 确保必要的表存在
  ensureTablesExist() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS inventory_stocks (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        current_stock REAL NOT NULL DEFAULT 0,
        available_stock REAL NOT NULL DEFAULT 0,
        reserved_stock REAL NOT NULL DEFAULT 0,
        avg_cost REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_id, warehouse_id)
      )`,

      `CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjust')),
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        amount REAL NOT NULL,
        reference_type TEXT,
        reference_id TEXT,
        operator TEXT,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        order_no TEXT UNIQUE NOT NULL,
        supplier_id TEXT NOT NULL,
        order_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'partial', 'completed', 'cancelled')) DEFAULT 'draft',
        total_amount REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        final_amount REAL NOT NULL DEFAULT 0,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        discount_rate REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL,
        received_quantity REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_receipts (
        id TEXT PRIMARY KEY,
        receipt_no TEXT UNIQUE NOT NULL,
        order_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        warehouse_id TEXT NOT NULL,
        receipt_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'cancelled')) DEFAULT 'draft',
        total_quantity REAL NOT NULL DEFAULT 0,
        receiver TEXT,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS purchase_receipt_items (
        id TEXT PRIMARY KEY,
        receipt_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        order_item_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS sales_orders (
        id TEXT PRIMARY KEY,
        order_no TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL,
        order_date DATE NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'shipped', 'completed', 'cancelled')) DEFAULT 'draft',
        total_amount REAL NOT NULL DEFAULT 0,
        discount_amount REAL NOT NULL DEFAULT 0,
        final_amount REAL NOT NULL DEFAULT 0,
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS sales_order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        discount_rate REAL NOT NULL DEFAULT 0,
        amount REAL NOT NULL,
        shipped_quantity REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS accounts_payable (
        id TEXT PRIMARY KEY,
        bill_no TEXT UNIQUE NOT NULL,
        supplier_id TEXT NOT NULL,
        order_id TEXT,
        bill_date DATE NOT NULL,
        due_date DATE NOT NULL,
        total_amount REAL NOT NULL,
        paid_amount REAL NOT NULL DEFAULT 0,
        balance_amount REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS accounts_receivable (
        id TEXT PRIMARY KEY,
        bill_no TEXT UNIQUE NOT NULL,
        customer_id TEXT NOT NULL,
        order_id TEXT,
        bill_date DATE NOT NULL,
        due_date DATE NOT NULL,
        total_amount REAL NOT NULL,
        received_amount REAL NOT NULL DEFAULT 0,
        balance_amount REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
        remark TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const sql of tables) {
      try {
        this.db.exec(sql);
      } catch (error) {
        console.warn('创建表时出现警告:', error.message);
      }
    }
  }

  close() {
    this.db.close();
  }

  // 获取基础数据ID
  getBasicDataIds() {
    const supplier = this.db.prepare('SELECT id FROM suppliers WHERE code = ?').get(SCENARIO_A.purchase.supplier_code);
    const customer = this.db.prepare('SELECT id FROM customers WHERE code = ?').get(SCENARIO_A.sales.customer_code);
    const product = this.db.prepare('SELECT id, unit_id FROM products WHERE sku = ?').get(SCENARIO_A.purchase.product_sku);
    const warehouse = this.db.prepare('SELECT id FROM warehouses WHERE code = ?').get(SCENARIO_A.purchase.warehouse_code);

    if (!supplier || !customer || !product || !warehouse) {
      throw new Error('基础数据不完整，请先运行 create-test-data.js');
    }

    return { supplier, customer, product, warehouse };
  }

  // 获取库存信息
  getInventoryStock(productId, warehouseId) {
    const stock = this.db.prepare(`
      SELECT * FROM inventory_stocks 
      WHERE product_id = ? AND warehouse_id = ?
    `).get(productId, warehouseId);

    return stock || {
      current_stock: 0,
      available_stock: 0,
      reserved_stock: 0,
      avg_cost: 0
    };
  }

  // 创建库存记录（如果不存在）
  createInventoryStock(productId, warehouseId) {
    const stockId = uuidv4();
    this.db.prepare(`
      INSERT OR IGNORE INTO inventory_stocks 
      (id, product_id, warehouse_id, current_stock, available_stock, reserved_stock, avg_cost)
      VALUES (?, ?, ?, 0, 0, 0, 0)
    `).run(stockId, productId, warehouseId);
    return stockId;
  }

  // 创建采购订单
  createPurchaseOrder(params) {
    const orderId = uuidv4();
    const orderNo = `PO${Date.now()}`;
    const itemId = uuidv4();

    // 计算金额
    const itemAmount = params.quantity * params.unit_price * (1 - params.discount_rate);
    const totalAmount = itemAmount;
    const discountAmount = params.quantity * params.unit_price * params.discount_rate;
    const taxAmount = totalAmount * params.tax_rate;
    const finalAmount = totalAmount + taxAmount;

    this.db.exec('BEGIN TRANSACTION');
    try {
      // 创建采购订单
      this.db.prepare(`
        INSERT INTO purchase_orders 
        (id, order_no, supplier_id, order_date, status, total_amount, discount_amount, tax_amount, final_amount, remark)
        VALUES (?, ?, ?, DATE('now'), 'confirmed', ?, ?, ?, ?, ?)
      `).run(orderId, orderNo, params.supplier_id, totalAmount, discountAmount, taxAmount, finalAmount, '测试场景A采购订单');

      // 创建采购订单明细
      this.db.prepare(`
        INSERT INTO purchase_order_items 
        (id, order_id, product_id, quantity, unit_price, discount_rate, amount, received_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(itemId, orderId, params.product_id, params.quantity, params.unit_price, params.discount_rate, itemAmount);

      this.db.exec('COMMIT');
      
      return {
        orderId,
        orderNo,
        itemId,
        calculations: {
          itemAmount,
          totalAmount,
          discountAmount,
          taxAmount,
          finalAmount
        }
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 创建采购收货
  createPurchaseReceipt(params) {
    const receiptId = uuidv4();
    const receiptNo = `PR${Date.now()}`;
    const itemId = uuidv4();

    this.db.exec('BEGIN TRANSACTION');
    try {
      // 创建采购收货单
      this.db.prepare(`
        INSERT INTO purchase_receipts 
        (id, receipt_no, order_id, supplier_id, warehouse_id, receipt_date, status, total_quantity, receiver, remark)
        VALUES (?, ?, ?, ?, ?, DATE('now'), 'confirmed', ?, '测试员', ?)
      `).run(receiptId, receiptNo, params.order_id, params.supplier_id, params.warehouse_id, params.quantity, '测试场景A采购收货');

      // 创建采购收货明细
      this.db.prepare(`
        INSERT INTO purchase_receipt_items 
        (id, receipt_id, product_id, order_item_id, quantity, unit_price, amount)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, receiptId, params.product_id, params.order_item_id, params.quantity, params.unit_price, params.quantity * params.unit_price);

      // 更新采购订单项目的收货数量
      this.db.prepare(`
        UPDATE purchase_order_items 
        SET received_quantity = received_quantity + ?
        WHERE id = ?
      `).run(params.quantity, params.order_item_id);

      // 更新采购订单状态
      const orderItem = this.db.prepare('SELECT quantity, received_quantity FROM purchase_order_items WHERE order_id = ?').all(params.order_id);
      const totalOrdered = orderItem.reduce((sum, item) => sum + item.quantity, 0);
      const totalReceived = orderItem.reduce((sum, item) => sum + item.received_quantity, 0);
      
      let orderStatus = 'confirmed';
      if (totalReceived > 0 && totalReceived < totalOrdered) {
        orderStatus = 'partial';
      } else if (totalReceived >= totalOrdered) {
        orderStatus = 'completed';
      }

      this.db.prepare('UPDATE purchase_orders SET status = ? WHERE id = ?').run(orderStatus, params.order_id);

      this.db.exec('COMMIT');
      
      return {
        receiptId,
        receiptNo,
        itemId,
        orderStatus
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 库存入库操作
  stockIn(params) {
    const transactionId = uuidv4();
    
    this.db.exec('BEGIN TRANSACTION');
    try {
      // 获取当前库存
      const currentStock = this.getInventoryStock(params.product_id, params.warehouse_id);
      
      // 计算新的库存数量和平均成本
      const newCurrentStock = currentStock.current_stock + params.quantity;
      const newAvgCost = currentStock.current_stock === 0 
        ? params.unit_price
        : (currentStock.current_stock * currentStock.avg_cost + params.quantity * params.unit_price) / newCurrentStock;
      const newAvailableStock = newCurrentStock - currentStock.reserved_stock;

      // 更新库存主表
      this.db.prepare(`
        INSERT OR REPLACE INTO inventory_stocks 
        (id, product_id, warehouse_id, current_stock, available_stock, reserved_stock, avg_cost, updated_at)
        VALUES (
          COALESCE((SELECT id FROM inventory_stocks WHERE product_id = ? AND warehouse_id = ?), ?),
          ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
        )
      `).run(params.product_id, params.warehouse_id, uuidv4(), params.product_id, params.warehouse_id, newCurrentStock, newAvailableStock, currentStock.reserved_stock, newAvgCost);

      // 记录库存流水
      this.db.prepare(`
        INSERT INTO inventory_transactions 
        (id, product_id, warehouse_id, transaction_type, quantity, unit_price, amount, reference_type, reference_id, operator, remark)
        VALUES (?, ?, ?, 'in', ?, ?, ?, 'purchase_receipt', ?, '测试员', ?)
      `).run(transactionId, params.product_id, params.warehouse_id, params.quantity, params.unit_price, params.quantity * params.unit_price, params.receipt_id, '测试场景A入库');

      this.db.exec('COMMIT');
      
      return {
        transactionId,
        stockBefore: currentStock,
        stockAfter: {
          current_stock: newCurrentStock,
          available_stock: newAvailableStock,
          reserved_stock: currentStock.reserved_stock,
          avg_cost: newAvgCost
        }
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 创建应付账款
  createAccountsPayable(params) {
    const payableId = uuidv4();
    const billNo = `AP${Date.now()}`;

    this.db.prepare(`
      INSERT INTO accounts_payable 
      (id, bill_no, supplier_id, order_id, bill_date, due_date, total_amount, paid_amount, balance_amount, status, remark)
      VALUES (?, ?, ?, ?, DATE('now'), DATE('now', '+30 days'), ?, 0, ?, 'unpaid', ?)
    `).run(payableId, billNo, params.supplier_id, params.order_id, params.total_amount, params.total_amount, '测试场景A应付账款');

    return { payableId, billNo };
  }

  // 创建销售订单
  createSalesOrder(params) {
    const orderId = uuidv4();
    const orderNo = `SO${Date.now()}`;
    const itemId = uuidv4();

    // 计算金额
    const itemAmount = params.quantity * params.unit_price * (1 - params.discount_rate);
    const totalAmount = itemAmount;
    const discountAmount = params.quantity * params.unit_price * params.discount_rate;
    const finalAmount = totalAmount;

    this.db.exec('BEGIN TRANSACTION');
    try {
      // 检查库存可用性
      const stock = this.getInventoryStock(params.product_id, params.warehouse_id);
      if (stock.available_stock < params.quantity) {
        throw new Error(`库存不足: 可用${stock.available_stock}, 需要${params.quantity}`);
      }

      // 创建销售订单
      this.db.prepare(`
        INSERT INTO sales_orders 
        (id, order_no, customer_id, order_date, status, total_amount, discount_amount, final_amount, remark)
        VALUES (?, ?, ?, DATE('now'), 'confirmed', ?, ?, ?, ?)
      `).run(orderId, orderNo, params.customer_id, totalAmount, discountAmount, finalAmount, '测试场景A销售订单');

      // 创建销售订单明细
      this.db.prepare(`
        INSERT INTO sales_order_items 
        (id, order_id, product_id, quantity, unit_price, discount_rate, amount, shipped_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `).run(itemId, orderId, params.product_id, params.quantity, params.unit_price, params.discount_rate, itemAmount);

      // 预留库存
      this.db.prepare(`
        UPDATE inventory_stocks 
        SET reserved_stock = reserved_stock + ?, 
            available_stock = available_stock - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND warehouse_id = ?
      `).run(params.quantity, params.quantity, params.product_id, params.warehouse_id);

      this.db.exec('COMMIT');
      
      return {
        orderId,
        orderNo,
        itemId,
        calculations: {
          itemAmount,
          totalAmount,
          discountAmount,
          finalAmount
        }
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 销售出库操作
  stockOut(params) {
    const transactionId = uuidv4();
    
    this.db.exec('BEGIN TRANSACTION');
    try {
      // 获取当前库存
      const currentStock = this.getInventoryStock(params.product_id, params.warehouse_id);
      
      // 验证库存充足
      if (currentStock.current_stock < params.quantity) {
        throw new Error(`当前库存不足: ${currentStock.current_stock} < ${params.quantity}`);
      }
      if (currentStock.reserved_stock < params.quantity) {
        throw new Error(`预留库存不足: ${currentStock.reserved_stock} < ${params.quantity}`);
      }

      // 计算新的库存数量
      const newCurrentStock = currentStock.current_stock - params.quantity;
      const newReservedStock = currentStock.reserved_stock - params.quantity;
      const newAvailableStock = newCurrentStock - newReservedStock;

      // 更新库存主表
      this.db.prepare(`
        UPDATE inventory_stocks 
        SET current_stock = ?, available_stock = ?, reserved_stock = ?, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND warehouse_id = ?
      `).run(newCurrentStock, newAvailableStock, newReservedStock, params.product_id, params.warehouse_id);

      // 记录库存流水
      this.db.prepare(`
        INSERT INTO inventory_transactions 
        (id, product_id, warehouse_id, transaction_type, quantity, unit_price, amount, reference_type, reference_id, operator, remark)
        VALUES (?, ?, ?, 'out', ?, ?, ?, 'sales_order', ?, '测试员', ?)
      `).run(transactionId, params.product_id, params.warehouse_id, -params.quantity, params.unit_price, -params.quantity * params.unit_price, params.order_id, '测试场景A出库');

      // 更新销售订单项目的出库数量
      this.db.prepare(`
        UPDATE sales_order_items 
        SET shipped_quantity = shipped_quantity + ?
        WHERE id = ?
      `).run(params.quantity, params.order_item_id);

      // 更新销售订单状态
      const orderItem = this.db.prepare('SELECT quantity, shipped_quantity FROM sales_order_items WHERE order_id = ?').all(params.order_id);
      const totalOrdered = orderItem.reduce((sum, item) => sum + item.quantity, 0);
      const totalShipped = orderItem.reduce((sum, item) => sum + item.shipped_quantity, 0);
      
      let orderStatus = 'confirmed';
      if (totalShipped > 0 && totalShipped < totalOrdered) {
        orderStatus = 'shipped';
      } else if (totalShipped >= totalOrdered) {
        orderStatus = 'completed';
      }

      this.db.prepare('UPDATE sales_orders SET status = ? WHERE id = ?').run(orderStatus, params.order_id);

      this.db.exec('COMMIT');
      
      return {
        transactionId,
        stockBefore: currentStock,
        stockAfter: {
          current_stock: newCurrentStock,
          available_stock: newAvailableStock,
          reserved_stock: newReservedStock,
          avg_cost: currentStock.avg_cost
        },
        orderStatus
      };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  // 创建应收账款
  createAccountsReceivable(params) {
    const receivableId = uuidv4();
    const billNo = `AR${Date.now()}`;

    this.db.prepare(`
      INSERT INTO accounts_receivable 
      (id, bill_no, customer_id, order_id, bill_date, due_date, total_amount, received_amount, balance_amount, status, remark)
      VALUES (?, ?, ?, ?, DATE('now'), DATE('now', '+30 days'), ?, 0, ?, 'unpaid', ?)
    `).run(receivableId, billNo, params.customer_id, params.order_id, params.total_amount, params.total_amount, '测试场景A应收账款');

    return { receivableId, billNo };
  }
}

// 主测试函数
async function runScenarioA() {
  console.log('🚀 开始执行测试场景A: 标准采购销售流程');
  console.log('');

  const testDb = new TestDatabase(DB_PATH);
  const results = {
    scenario: SCENARIO_A.name,
    steps: [],
    errors: [],
    summary: {}
  };

  try {
    // 步骤1: 获取基础数据
    console.log('📋 步骤1: 获取基础数据...');
    const basicData = testDb.getBasicDataIds();
    console.log(`✅ 供应商: ${basicData.supplier.id}`);
    console.log(`✅ 客户: ${basicData.customer.id}`);
    console.log(`✅ 商品: ${basicData.product.id}`);
    console.log(`✅ 仓库: ${basicData.warehouse.id}`);
    
    // 确保库存记录存在
    testDb.createInventoryStock(basicData.product.id, basicData.warehouse.id);
    
    results.steps.push({
      step: 1,
      name: '获取基础数据',
      status: 'success',
      data: basicData
    });

    // 步骤2: 创建采购订单
    console.log('');
    console.log('📝 步骤2: 创建采购订单...');
    const purchaseOrder = testDb.createPurchaseOrder({
      supplier_id: basicData.supplier.id,
      product_id: basicData.product.id,
      quantity: SCENARIO_A.purchase.quantity,
      unit_price: SCENARIO_A.purchase.unit_price,
      discount_rate: SCENARIO_A.purchase.discount_rate,
      tax_rate: SCENARIO_A.purchase.tax_rate
    });
    console.log(`✅ 采购订单: ${purchaseOrder.orderNo}`);
    console.log(`✅ 订单金额: ¥${purchaseOrder.calculations.finalAmount.toFixed(2)}`);
    
    results.steps.push({
      step: 2,
      name: '创建采购订单',
      status: 'success',
      data: purchaseOrder
    });

    // 步骤3: 采购收货
    console.log('');
    console.log('📦 步骤3: 采购收货...');
    const purchaseReceipt = testDb.createPurchaseReceipt({
      order_id: purchaseOrder.orderId,
      order_item_id: purchaseOrder.itemId,
      supplier_id: basicData.supplier.id,
      warehouse_id: basicData.warehouse.id,
      product_id: basicData.product.id,
      quantity: SCENARIO_A.purchase.quantity,
      unit_price: SCENARIO_A.purchase.unit_price
    });
    console.log(`✅ 收货单: ${purchaseReceipt.receiptNo}`);
    console.log(`✅ 订单状态: ${purchaseReceipt.orderStatus}`);
    
    results.steps.push({
      step: 3,
      name: '采购收货',
      status: 'success',
      data: purchaseReceipt
    });

    // 步骤4: 库存入库
    console.log('');
    console.log('📈 步骤4: 库存入库...');
    const stockInResult = testDb.stockIn({
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_A.purchase.quantity,
      unit_price: SCENARIO_A.purchase.unit_price,
      receipt_id: purchaseReceipt.receiptId
    });
    console.log(`✅ 库存变化: ${stockInResult.stockBefore.current_stock} → ${stockInResult.stockAfter.current_stock}`);
    console.log(`✅ 平均成本: ¥${stockInResult.stockAfter.avg_cost.toFixed(2)}`);
    
    results.steps.push({
      step: 4,
      name: '库存入库',
      status: 'success',
      data: stockInResult
    });

    // 步骤5: 生成应付账款
    console.log('');
    console.log('💰 步骤5: 生成应付账款...');
    const accountsPayable = testDb.createAccountsPayable({
      supplier_id: basicData.supplier.id,
      order_id: purchaseOrder.orderId,
      total_amount: purchaseOrder.calculations.finalAmount
    });
    console.log(`✅ 应付账款: ${accountsPayable.billNo}`);
    console.log(`✅ 应付金额: ¥${purchaseOrder.calculations.finalAmount.toFixed(2)}`);
    
    results.steps.push({
      step: 5,
      name: '生成应付账款',
      status: 'success',
      data: accountsPayable
    });

    // 步骤6: 创建销售订单
    console.log('');
    console.log('🛒 步骤6: 创建销售订单...');
    const salesOrder = testDb.createSalesOrder({
      customer_id: basicData.customer.id,
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_A.sales.quantity,
      unit_price: SCENARIO_A.sales.unit_price,
      discount_rate: SCENARIO_A.sales.discount_rate
    });
    console.log(`✅ 销售订单: ${salesOrder.orderNo}`);
    console.log(`✅ 订单金额: ¥${salesOrder.calculations.finalAmount.toFixed(2)}`);
    
    results.steps.push({
      step: 6,
      name: '创建销售订单',
      status: 'success',
      data: salesOrder
    });

    // 步骤7: 销售出库
    console.log('');
    console.log('📉 步骤7: 销售出库...');
    const stockOutResult = testDb.stockOut({
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_A.sales.quantity,
      unit_price: SCENARIO_A.sales.unit_price,
      order_id: salesOrder.orderId,
      order_item_id: salesOrder.itemId
    });
    console.log(`✅ 库存变化: ${stockOutResult.stockBefore.current_stock} → ${stockOutResult.stockAfter.current_stock}`);
    console.log(`✅ 预留释放: ${stockOutResult.stockBefore.reserved_stock} → ${stockOutResult.stockAfter.reserved_stock}`);
    console.log(`✅ 订单状态: ${stockOutResult.orderStatus}`);
    
    results.steps.push({
      step: 7,
      name: '销售出库',
      status: 'success',
      data: stockOutResult
    });

    // 步骤8: 生成应收账款
    console.log('');
    console.log('💵 步骤8: 生成应收账款...');
    const accountsReceivable = testDb.createAccountsReceivable({
      customer_id: basicData.customer.id,
      order_id: salesOrder.orderId,
      total_amount: salesOrder.calculations.finalAmount
    });
    console.log(`✅ 应收账款: ${accountsReceivable.billNo}`);
    console.log(`✅ 应收金额: ¥${salesOrder.calculations.finalAmount.toFixed(2)}`);
    
    results.steps.push({
      step: 8,
      name: '生成应收账款',
      status: 'success',
      data: accountsReceivable
    });

    // 汇总结果
    results.summary = {
      purchase_amount: purchaseOrder.calculations.finalAmount,
      sales_amount: salesOrder.calculations.finalAmount,
      profit: salesOrder.calculations.finalAmount - (SCENARIO_A.sales.quantity * stockInResult.stockAfter.avg_cost),
      final_stock: stockOutResult.stockAfter.current_stock,
      accounts_payable: purchaseOrder.calculations.finalAmount,
      accounts_receivable: salesOrder.calculations.finalAmount
    };

    console.log('');
    console.log('📊 测试场景A执行完成！');
    console.log(`💰 采购金额: ¥${results.summary.purchase_amount.toFixed(2)}`);
    console.log(`💵 销售金额: ¥${results.summary.sales_amount.toFixed(2)}`);
    console.log(`📈 毛利润: ¥${results.summary.profit.toFixed(2)}`);
    console.log(`📦 最终库存: ${results.summary.final_stock} 台`);

  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    results.errors.push(error.message);
  } finally {
    testDb.close();
  }

  return results;
}

// 主函数
async function main() {
  try {
    const results = await runScenarioA();
    
    // 保存测试结果
    const reportPath = path.join(process.cwd(), 'scenario-a-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 测试结果已保存到: ${reportPath}`);
    
    if (results.errors.length === 0) {
      console.log('🎉 测试场景A执行成功！');
      process.exit(0);
    } else {
      console.log('❌ 测试场景A执行失败！');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 测试执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { runScenarioA };
