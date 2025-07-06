#!/usr/bin/env node

// 测试场景B: 复杂业务流程
// 测试部分收货、库存不足、补充收货等复杂情况

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

// 测试场景B的参数
const SCENARIO_B = {
  name: '复杂业务流程',
  description: '测试部分收货、库存不足、补充收货等复杂情况',
  
  // 采购订单参数
  purchase: {
    supplier_code: 'SUP002', // 办公用品供应商
    product_sku: 'MBA2024-512-SLV', // MacBook Air
    warehouse_code: 'WH001', // 总仓库
    total_quantity: 50,
    unit_price: 9000,
    first_receipt_quantity: 30, // 第一次收货30台
    second_receipt_quantity: 20, // 第二次收货20台
    discount_rate: 0.02, // 2%折扣
    tax_rate: 0.13 // 13%税率
  },
  
  // 销售订单参数
  sales: {
    customer_code: 'CUS002', // XYZ贸易公司
    product_sku: 'MBA2024-512-SLV', // 同一产品
    warehouse_code: 'WH001', // 同一仓库
    quantity: 40, // 尝试销售40台（但只有30台可用）
    unit_price: 11999,
    discount_rate: 0.05 // 5%折扣
  }
};

// 复用测试场景A的数据库操作类
class TestDatabase {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
    this.ensureTablesExist();
  }

  close() {
    this.db.close();
  }

  // 确保必要的表存在（复用场景A的代码）
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

  // 获取基础数据ID
  getBasicDataIds() {
    const supplier = this.db.prepare('SELECT id FROM suppliers WHERE code = ?').get(SCENARIO_B.purchase.supplier_code);
    const customer = this.db.prepare('SELECT id FROM customers WHERE code = ?').get(SCENARIO_B.sales.customer_code);
    const product = this.db.prepare('SELECT id, unit_id FROM products WHERE sku = ?').get(SCENARIO_B.purchase.product_sku);
    const warehouse = this.db.prepare('SELECT id FROM warehouses WHERE code = ?').get(SCENARIO_B.purchase.warehouse_code);

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
      `).run(orderId, orderNo, params.supplier_id, totalAmount, discountAmount, taxAmount, finalAmount, '测试场景B采购订单');

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

  // 创建采购收货（支持部分收货）
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
      `).run(receiptId, receiptNo, params.order_id, params.supplier_id, params.warehouse_id, params.quantity, params.remark || '测试场景B采购收货');

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
        orderStatus,
        totalOrdered,
        totalReceived
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
      `).run(transactionId, params.product_id, params.warehouse_id, params.quantity, params.unit_price, params.quantity * params.unit_price, params.receipt_id, params.remark || '测试场景B入库');

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

  // 尝试创建销售订单（可能因库存不足失败）
  tryCreateSalesOrder(params) {
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
        // 库存不足，回滚事务并返回错误信息
        this.db.exec('ROLLBACK');
        return {
          success: false,
          error: `库存不足: 可用${stock.available_stock}, 需要${params.quantity}`,
          availableStock: stock.available_stock,
          requestedQuantity: params.quantity,
          shortfall: params.quantity - stock.available_stock
        };
      }

      // 库存充足，创建销售订单
      this.db.prepare(`
        INSERT INTO sales_orders 
        (id, order_no, customer_id, order_date, status, total_amount, discount_amount, final_amount, remark)
        VALUES (?, ?, ?, DATE('now'), 'confirmed', ?, ?, ?, ?)
      `).run(orderId, orderNo, params.customer_id, totalAmount, discountAmount, finalAmount, '测试场景B销售订单');

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
        success: true,
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
}

// 主测试函数
async function runScenarioB() {
  console.log('🚀 开始执行测试场景B: 复杂业务流程');
  console.log('');

  const testDb = new TestDatabase(DB_PATH);
  const results = {
    scenario: SCENARIO_B.name,
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
      quantity: SCENARIO_B.purchase.total_quantity,
      unit_price: SCENARIO_B.purchase.unit_price,
      discount_rate: SCENARIO_B.purchase.discount_rate,
      tax_rate: SCENARIO_B.purchase.tax_rate
    });
    console.log(`✅ 采购订单: ${purchaseOrder.orderNo}`);
    console.log(`✅ 订单数量: ${SCENARIO_B.purchase.total_quantity} 台`);
    console.log(`✅ 订单金额: ¥${purchaseOrder.calculations.finalAmount.toFixed(2)}`);

    results.steps.push({
      step: 2,
      name: '创建采购订单',
      status: 'success',
      data: purchaseOrder
    });

    // 步骤3: 第一次部分收货
    console.log('');
    console.log('📦 步骤3: 第一次部分收货...');
    const firstReceipt = testDb.createPurchaseReceipt({
      order_id: purchaseOrder.orderId,
      order_item_id: purchaseOrder.itemId,
      supplier_id: basicData.supplier.id,
      warehouse_id: basicData.warehouse.id,
      product_id: basicData.product.id,
      quantity: SCENARIO_B.purchase.first_receipt_quantity,
      unit_price: SCENARIO_B.purchase.unit_price,
      remark: '第一次部分收货'
    });
    console.log(`✅ 收货单: ${firstReceipt.receiptNo}`);
    console.log(`✅ 收货数量: ${SCENARIO_B.purchase.first_receipt_quantity} 台`);
    console.log(`✅ 订单状态: ${firstReceipt.orderStatus}`);
    console.log(`✅ 收货进度: ${firstReceipt.totalReceived}/${firstReceipt.totalOrdered}`);

    results.steps.push({
      step: 3,
      name: '第一次部分收货',
      status: 'success',
      data: firstReceipt
    });

    // 步骤4: 第一次库存入库
    console.log('');
    console.log('📈 步骤4: 第一次库存入库...');
    const firstStockIn = testDb.stockIn({
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_B.purchase.first_receipt_quantity,
      unit_price: SCENARIO_B.purchase.unit_price,
      receipt_id: firstReceipt.receiptId,
      remark: '第一次入库'
    });
    console.log(`✅ 库存变化: ${firstStockIn.stockBefore.current_stock} → ${firstStockIn.stockAfter.current_stock}`);
    console.log(`✅ 可用库存: ${firstStockIn.stockAfter.available_stock} 台`);
    console.log(`✅ 平均成本: ¥${firstStockIn.stockAfter.avg_cost.toFixed(2)}`);

    results.steps.push({
      step: 4,
      name: '第一次库存入库',
      status: 'success',
      data: firstStockIn
    });

    // 步骤5: 尝试创建销售订单（库存不足）
    console.log('');
    console.log('🛒 步骤5: 尝试创建销售订单（预期库存不足）...');
    const salesOrderAttempt = testDb.tryCreateSalesOrder({
      customer_id: basicData.customer.id,
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_B.sales.quantity,
      unit_price: SCENARIO_B.sales.unit_price,
      discount_rate: SCENARIO_B.sales.discount_rate
    });

    if (!salesOrderAttempt.success) {
      console.log(`❌ 销售订单创建失败: ${salesOrderAttempt.error}`);
      console.log(`📊 库存状况: 可用${salesOrderAttempt.availableStock}台, 需要${salesOrderAttempt.requestedQuantity}台, 缺少${salesOrderAttempt.shortfall}台`);

      results.steps.push({
        step: 5,
        name: '尝试创建销售订单（库存不足）',
        status: 'expected_failure',
        data: salesOrderAttempt
      });
    } else {
      console.log(`⚠️  意外成功: 销售订单创建成功，但预期应该失败`);
      results.errors.push('销售订单创建意外成功，库存检查可能有问题');

      results.steps.push({
        step: 5,
        name: '尝试创建销售订单（库存不足）',
        status: 'unexpected_success',
        data: salesOrderAttempt
      });
    }

    // 步骤6: 第二次补充收货
    console.log('');
    console.log('📦 步骤6: 第二次补充收货...');
    const secondReceipt = testDb.createPurchaseReceipt({
      order_id: purchaseOrder.orderId,
      order_item_id: purchaseOrder.itemId,
      supplier_id: basicData.supplier.id,
      warehouse_id: basicData.warehouse.id,
      product_id: basicData.product.id,
      quantity: SCENARIO_B.purchase.second_receipt_quantity,
      unit_price: SCENARIO_B.purchase.unit_price,
      remark: '第二次补充收货'
    });
    console.log(`✅ 收货单: ${secondReceipt.receiptNo}`);
    console.log(`✅ 收货数量: ${SCENARIO_B.purchase.second_receipt_quantity} 台`);
    console.log(`✅ 订单状态: ${secondReceipt.orderStatus}`);
    console.log(`✅ 收货进度: ${secondReceipt.totalReceived}/${secondReceipt.totalOrdered}`);

    results.steps.push({
      step: 6,
      name: '第二次补充收货',
      status: 'success',
      data: secondReceipt
    });

    // 步骤7: 第二次库存入库
    console.log('');
    console.log('📈 步骤7: 第二次库存入库...');
    const secondStockIn = testDb.stockIn({
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_B.purchase.second_receipt_quantity,
      unit_price: SCENARIO_B.purchase.unit_price,
      receipt_id: secondReceipt.receiptId,
      remark: '第二次入库'
    });
    console.log(`✅ 库存变化: ${secondStockIn.stockBefore.current_stock} → ${secondStockIn.stockAfter.current_stock}`);
    console.log(`✅ 可用库存: ${secondStockIn.stockAfter.available_stock} 台`);
    console.log(`✅ 平均成本: ¥${secondStockIn.stockAfter.avg_cost.toFixed(2)}`);

    results.steps.push({
      step: 7,
      name: '第二次库存入库',
      status: 'success',
      data: secondStockIn
    });

    // 步骤8: 再次尝试创建销售订单（现在应该成功）
    console.log('');
    console.log('🛒 步骤8: 再次尝试创建销售订单（现在应该成功）...');
    const salesOrderSuccess = testDb.tryCreateSalesOrder({
      customer_id: basicData.customer.id,
      product_id: basicData.product.id,
      warehouse_id: basicData.warehouse.id,
      quantity: SCENARIO_B.sales.quantity,
      unit_price: SCENARIO_B.sales.unit_price,
      discount_rate: SCENARIO_B.sales.discount_rate
    });

    if (salesOrderSuccess.success) {
      console.log(`✅ 销售订单: ${salesOrderSuccess.orderNo}`);
      console.log(`✅ 订单数量: ${SCENARIO_B.sales.quantity} 台`);
      console.log(`✅ 订单金额: ¥${salesOrderSuccess.calculations.finalAmount.toFixed(2)}`);

      results.steps.push({
        step: 8,
        name: '再次尝试创建销售订单（成功）',
        status: 'success',
        data: salesOrderSuccess
      });
    } else {
      console.log(`❌ 销售订单创建仍然失败: ${salesOrderSuccess.error}`);
      results.errors.push('补充收货后销售订单创建仍然失败');

      results.steps.push({
        step: 8,
        name: '再次尝试创建销售订单（成功）',
        status: 'failure',
        data: salesOrderSuccess
      });
    }

    // 汇总结果
    results.summary = {
      purchase_total_quantity: SCENARIO_B.purchase.total_quantity,
      first_receipt_quantity: SCENARIO_B.purchase.first_receipt_quantity,
      second_receipt_quantity: SCENARIO_B.purchase.second_receipt_quantity,
      final_stock: secondStockIn.stockAfter.current_stock,
      sales_quantity: SCENARIO_B.sales.quantity,
      inventory_shortage_handled: !salesOrderAttempt.success && salesOrderSuccess.success,
      partial_receipt_workflow: firstReceipt.orderStatus === 'partial' && secondReceipt.orderStatus === 'completed'
    };

    console.log('');
    console.log('📊 测试场景B执行完成！');
    console.log(`📦 采购总数量: ${results.summary.purchase_total_quantity} 台`);
    console.log(`📦 第一次收货: ${results.summary.first_receipt_quantity} 台`);
    console.log(`📦 第二次收货: ${results.summary.second_receipt_quantity} 台`);
    console.log(`📦 最终库存: ${results.summary.final_stock} 台`);
    console.log(`✅ 库存不足处理: ${results.summary.inventory_shortage_handled ? '正确' : '异常'}`);
    console.log(`✅ 部分收货流程: ${results.summary.partial_receipt_workflow ? '正确' : '异常'}`);

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
    const results = await runScenarioB();

    // 保存测试结果
    const reportPath = path.join(process.cwd(), 'scenario-b-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 测试结果已保存到: ${reportPath}`);

    if (results.errors.length === 0) {
      console.log('🎉 测试场景B执行成功！');
      process.exit(0);
    } else {
      console.log('❌ 测试场景B执行失败！');
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

module.exports = { runScenarioB };
