#!/usr/bin/env node

// 业务逻辑正确性验证脚本
// 验证采购收货、销售出库等关键业务逻辑的正确性

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

class BusinessLogicValidator {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
  }

  close() {
    this.db.close();
  }

  // 验证采购订单状态与收货数量的一致性
  validatePurchaseOrderStatus() {
    console.log('🔍 验证采购订单状态逻辑...');
    
    const query = `
      SELECT 
        po.id,
        po.order_no,
        po.status,
        SUM(poi.quantity) as total_ordered,
        SUM(poi.received_quantity) as total_received,
        CASE 
          WHEN SUM(poi.received_quantity) = 0 THEN 'confirmed'
          WHEN SUM(poi.received_quantity) < SUM(poi.quantity) THEN 'partial'
          WHEN SUM(poi.received_quantity) = SUM(poi.quantity) THEN 'completed'
          WHEN SUM(poi.received_quantity) > SUM(poi.quantity) THEN 'over_received'
        END as expected_status,
        s.name as supplier_name
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.order_id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE po.status NOT IN ('draft', 'cancelled')
      GROUP BY po.id, po.order_no, po.status, s.name
    `;

    const results = this.db.prepare(query).all();
    const inconsistencies = results.filter(row => row.status !== row.expected_status);

    console.log(`📊 检查了 ${results.length} 个采购订单`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ 采购订单状态逻辑检查通过');
      results.forEach(row => {
        console.log(`  📋 ${row.order_no}: ${row.supplier_name}, 状态${row.status}, 收货进度${row.total_received}/${row.total_ordered}`);
      });
    } else {
      console.log(`❌ 发现 ${inconsistencies.length} 个采购订单状态不一致问题:`);
      inconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: 当前状态${row.status}, 应为${row.expected_status}, 收货${row.total_received}/${row.total_ordered}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: inconsistencies.length,
      details: results,
      passed: inconsistencies.length === 0
    };
  }

  // 验证销售订单状态与出库数量的一致性
  validateSalesOrderStatus() {
    console.log('');
    console.log('🔍 验证销售订单状态逻辑...');
    
    const query = `
      SELECT 
        so.id,
        so.order_no,
        so.status,
        SUM(soi.quantity) as total_ordered,
        SUM(soi.shipped_quantity) as total_shipped,
        CASE 
          WHEN SUM(soi.shipped_quantity) = 0 THEN 'confirmed'
          WHEN SUM(soi.shipped_quantity) < SUM(soi.quantity) THEN 'shipped'
          WHEN SUM(soi.shipped_quantity) = SUM(soi.quantity) THEN 'completed'
          WHEN SUM(soi.shipped_quantity) > SUM(soi.quantity) THEN 'over_shipped'
        END as expected_status,
        c.name as customer_name
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.status NOT IN ('draft', 'cancelled')
      GROUP BY so.id, so.order_no, so.status, c.name
    `;

    const results = this.db.prepare(query).all();
    const inconsistencies = results.filter(row => row.status !== row.expected_status);

    console.log(`📊 检查了 ${results.length} 个销售订单`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ 销售订单状态逻辑检查通过');
      results.forEach(row => {
        console.log(`  📋 ${row.order_no}: ${row.customer_name}, 状态${row.status}, 出库进度${row.total_shipped}/${row.total_ordered}`);
      });
    } else {
      console.log(`❌ 发现 ${inconsistencies.length} 个销售订单状态不一致问题:`);
      inconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: 当前状态${row.status}, 应为${row.expected_status}, 出库${row.total_shipped}/${row.total_ordered}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: inconsistencies.length,
      details: results,
      passed: inconsistencies.length === 0
    };
  }

  // 验证收货数量不超过订单数量
  validateReceiptQuantityLimits() {
    console.log('');
    console.log('🔍 验证收货数量限制逻辑...');
    
    const query = `
      SELECT 
        poi.id,
        po.order_no,
        p.sku as product_sku,
        poi.quantity as ordered_quantity,
        poi.received_quantity,
        (poi.received_quantity - poi.quantity) as over_received,
        s.name as supplier_name
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.order_id = po.id
      JOIN products p ON poi.product_id = p.id
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      WHERE poi.received_quantity > poi.quantity
    `;

    const violations = this.db.prepare(query).all();

    console.log(`📊 检查收货数量限制`);
    
    if (violations.length === 0) {
      console.log('✅ 收货数量限制检查通过，无超量收货');
    } else {
      console.log(`❌ 发现 ${violations.length} 个超量收货问题:`);
      violations.forEach(row => {
        console.log(`  ⚠️  ${row.order_no} - ${row.product_sku}: 订购${row.ordered_quantity}, 收货${row.received_quantity}, 超量${row.over_received}`);
      });
    }

    return {
      violations: violations.length,
      details: violations,
      passed: violations.length === 0
    };
  }

  // 验证出库数量不超过订单数量
  validateShipmentQuantityLimits() {
    console.log('');
    console.log('🔍 验证出库数量限制逻辑...');
    
    const query = `
      SELECT 
        soi.id,
        so.order_no,
        p.sku as product_sku,
        soi.quantity as ordered_quantity,
        soi.shipped_quantity,
        (soi.shipped_quantity - soi.quantity) as over_shipped,
        c.name as customer_name
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.order_id = so.id
      JOIN products p ON soi.product_id = p.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE soi.shipped_quantity > soi.quantity
    `;

    const violations = this.db.prepare(query).all();

    console.log(`📊 检查出库数量限制`);
    
    if (violations.length === 0) {
      console.log('✅ 出库数量限制检查通过，无超量出库');
    } else {
      console.log(`❌ 发现 ${violations.length} 个超量出库问题:`);
      violations.forEach(row => {
        console.log(`  ⚠️  ${row.order_no} - ${row.product_sku}: 订购${row.ordered_quantity}, 出库${row.shipped_quantity}, 超量${row.over_shipped}`);
      });
    }

    return {
      violations: violations.length,
      details: violations,
      passed: violations.length === 0
    };
  }

  // 验证库存流水与业务操作的对应关系
  validateTransactionBusinessLogic() {
    console.log('');
    console.log('🔍 验证库存流水业务逻辑...');
    
    // 检查入库流水是否都有对应的收货记录
    const inboundWithoutReceipts = this.db.prepare(`
      SELECT 
        t.id,
        t.product_id,
        t.warehouse_id,
        t.quantity,
        t.reference_id,
        p.sku as product_sku,
        w.code as warehouse_code
      FROM inventory_transactions t
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN warehouses w ON t.warehouse_id = w.id
      WHERE t.transaction_type = 'in' 
      AND t.reference_type = 'purchase_receipt'
      AND NOT EXISTS (
        SELECT 1 FROM purchase_receipts pr 
        WHERE pr.id = t.reference_id
      )
    `).all();

    // 检查出库流水是否都有对应的销售订单
    const outboundWithoutOrders = this.db.prepare(`
      SELECT 
        t.id,
        t.product_id,
        t.warehouse_id,
        t.quantity,
        t.reference_id,
        p.sku as product_sku,
        w.code as warehouse_code
      FROM inventory_transactions t
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN warehouses w ON t.warehouse_id = w.id
      WHERE t.transaction_type = 'out' 
      AND t.reference_type = 'sales_order'
      AND NOT EXISTS (
        SELECT 1 FROM sales_orders so 
        WHERE so.id = t.reference_id
      )
    `).all();

    // 检查是否有收货记录但没有对应的入库流水
    const receiptsWithoutTransactions = this.db.prepare(`
      SELECT 
        pr.id,
        pr.receipt_no,
        pri.quantity,
        p.sku as product_sku,
        w.code as warehouse_code
      FROM purchase_receipts pr
      JOIN purchase_receipt_items pri ON pr.id = pri.receipt_id
      LEFT JOIN products p ON pri.product_id = p.id
      LEFT JOIN warehouses w ON pr.warehouse_id = w.id
      WHERE pr.status = 'confirmed'
      AND NOT EXISTS (
        SELECT 1 FROM inventory_transactions t
        WHERE t.reference_type = 'purchase_receipt' 
        AND t.reference_id = pr.id
        AND t.product_id = pri.product_id
      )
    `).all();

    console.log(`📊 检查库存流水业务逻辑`);
    
    let passed = true;
    
    if (inboundWithoutReceipts.length === 0) {
      console.log('✅ 所有入库流水都有对应的收货记录');
    } else {
      console.log(`❌ 发现 ${inboundWithoutReceipts.length} 个入库流水缺少收货记录:`);
      inboundWithoutReceipts.forEach(row => {
        console.log(`  ⚠️  流水${row.id}: ${row.product_sku} @ ${row.warehouse_code}, 数量${row.quantity}, 引用${row.reference_id}`);
      });
      passed = false;
    }

    if (outboundWithoutOrders.length === 0) {
      console.log('✅ 所有出库流水都有对应的销售订单');
    } else {
      console.log(`❌ 发现 ${outboundWithoutOrders.length} 个出库流水缺少销售订单:`);
      outboundWithoutOrders.forEach(row => {
        console.log(`  ⚠️  流水${row.id}: ${row.product_sku} @ ${row.warehouse_code}, 数量${row.quantity}, 引用${row.reference_id}`);
      });
      passed = false;
    }

    if (receiptsWithoutTransactions.length === 0) {
      console.log('✅ 所有确认收货都有对应的入库流水');
    } else {
      console.log(`❌ 发现 ${receiptsWithoutTransactions.length} 个确认收货缺少入库流水:`);
      receiptsWithoutTransactions.forEach(row => {
        console.log(`  ⚠️  收货${row.receipt_no}: ${row.product_sku} @ ${row.warehouse_code}, 数量${row.quantity}`);
      });
      passed = false;
    }

    return {
      inbound_without_receipts: inboundWithoutReceipts.length,
      outbound_without_orders: outboundWithoutOrders.length,
      receipts_without_transactions: receiptsWithoutTransactions.length,
      passed: passed
    };
  }

  // 验证订单金额计算逻辑
  validateOrderAmountCalculation() {
    console.log('');
    console.log('🔍 验证订单金额计算逻辑...');
    
    // 验证采购订单金额计算
    const purchaseOrderIssues = this.db.prepare(`
      SELECT
        po.id,
        po.order_no,
        po.total_amount,
        po.discount_amount,
        po.tax_amount,
        po.final_amount,
        SUM(poi.amount) as calculated_total,
        SUM(poi.quantity * poi.unit_price * poi.discount_rate) as calculated_discount,
        (SUM(poi.amount) + po.tax_amount) as calculated_final,
        ABS(po.total_amount - SUM(poi.amount)) as total_diff,
        ABS(po.final_amount - (SUM(poi.amount) + po.tax_amount)) as final_diff
      FROM purchase_orders po
      JOIN purchase_order_items poi ON po.id = poi.order_id
      GROUP BY po.id, po.order_no, po.total_amount, po.discount_amount, po.tax_amount, po.final_amount
      HAVING total_diff > 0.01 OR final_diff > 0.01
    `).all();

    // 验证销售订单金额计算
    const salesOrderIssues = this.db.prepare(`
      SELECT
        so.id,
        so.order_no,
        so.total_amount,
        so.discount_amount,
        so.final_amount,
        SUM(soi.amount) as calculated_total,
        SUM(soi.quantity * soi.unit_price * soi.discount_rate) as calculated_discount,
        SUM(soi.amount) as calculated_final,
        ABS(so.total_amount - SUM(soi.amount)) as total_diff,
        ABS(so.final_amount - SUM(soi.amount)) as final_diff
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.order_id
      GROUP BY so.id, so.order_no, so.total_amount, so.discount_amount, so.final_amount
      HAVING total_diff > 0.01 OR final_diff > 0.01
    `).all();

    console.log(`📊 检查订单金额计算逻辑`);
    
    let passed = true;
    
    if (purchaseOrderIssues.length === 0) {
      console.log('✅ 采购订单金额计算逻辑正确');
    } else {
      console.log(`❌ 发现 ${purchaseOrderIssues.length} 个采购订单金额计算问题:`);
      purchaseOrderIssues.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: 总额差异¥${row.total_diff.toFixed(2)}, 最终金额差异¥${row.final_diff.toFixed(2)}`);
      });
      passed = false;
    }

    if (salesOrderIssues.length === 0) {
      console.log('✅ 销售订单金额计算逻辑正确');
    } else {
      console.log(`❌ 发现 ${salesOrderIssues.length} 个销售订单金额计算问题:`);
      salesOrderIssues.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: 总额差异¥${row.total_diff.toFixed(2)}, 最终金额差异¥${row.final_diff.toFixed(2)}`);
      });
      passed = false;
    }

    return {
      purchase_order_issues: purchaseOrderIssues.length,
      sales_order_issues: salesOrderIssues.length,
      passed: passed
    };
  }

  // 生成完整的业务逻辑验证报告
  generateBusinessLogicReport(results) {
    const report = [
      '📊 业务逻辑正确性验证报告',
      '='.repeat(50),
      '',
      `验证时间: ${new Date().toLocaleString()}`,
      `数据库路径: ${DB_PATH}`,
      '',
      '验证结果汇总:',
      `  📋 采购订单状态逻辑: ${results.purchaseOrderStatus.passed ? '✅ 通过' : '❌ 失败'} (不一致${results.purchaseOrderStatus.inconsistencies}/${results.purchaseOrderStatus.total_checked})`,
      `  🛒 销售订单状态逻辑: ${results.salesOrderStatus.passed ? '✅ 通过' : '❌ 失败'} (不一致${results.salesOrderStatus.inconsistencies}/${results.salesOrderStatus.total_checked})`,
      `  📦 收货数量限制: ${results.receiptLimits.passed ? '✅ 通过' : '❌ 失败'} (违规${results.receiptLimits.violations}个)`,
      `  🚚 出库数量限制: ${results.shipmentLimits.passed ? '✅ 通过' : '❌ 失败'} (违规${results.shipmentLimits.violations}个)`,
      `  📊 库存流水业务逻辑: ${results.transactionLogic.passed ? '✅ 通过' : '❌ 失败'}`,
      `  💰 订单金额计算: ${results.amountCalculation.passed ? '✅ 通过' : '❌ 失败'}`,
      '',
      `总体评估: ${Object.values(results).every(r => r.passed) ? '✅ 所有检查通过' : '❌ 发现业务逻辑问题'}`,
      ''
    ];

    if (!Object.values(results).every(r => r.passed)) {
      report.push('发现的问题详情:');
      
      if (!results.purchaseOrderStatus.passed) {
        report.push(`  采购订单状态问题: ${results.purchaseOrderStatus.inconsistencies}个不一致`);
      }
      
      if (!results.salesOrderStatus.passed) {
        report.push(`  销售订单状态问题: ${results.salesOrderStatus.inconsistencies}个不一致`);
      }
      
      if (!results.receiptLimits.passed) {
        report.push(`  收货数量违规: ${results.receiptLimits.violations}个超量收货`);
      }
      
      if (!results.shipmentLimits.passed) {
        report.push(`  出库数量违规: ${results.shipmentLimits.violations}个超量出库`);
      }
      
      if (!results.transactionLogic.passed) {
        report.push('  库存流水业务逻辑问题:');
        if (results.transactionLogic.inbound_without_receipts > 0) {
          report.push(`    - ${results.transactionLogic.inbound_without_receipts}个入库流水缺少收货记录`);
        }
        if (results.transactionLogic.outbound_without_orders > 0) {
          report.push(`    - ${results.transactionLogic.outbound_without_orders}个出库流水缺少销售订单`);
        }
        if (results.transactionLogic.receipts_without_transactions > 0) {
          report.push(`    - ${results.transactionLogic.receipts_without_transactions}个收货缺少入库流水`);
        }
      }
      
      if (!results.amountCalculation.passed) {
        report.push('  订单金额计算问题:');
        if (results.amountCalculation.purchase_order_issues > 0) {
          report.push(`    - ${results.amountCalculation.purchase_order_issues}个采购订单金额计算错误`);
        }
        if (results.amountCalculation.sales_order_issues > 0) {
          report.push(`    - ${results.amountCalculation.sales_order_issues}个销售订单金额计算错误`);
        }
      }
      
      report.push('');
    }

    report.push('建议措施:');
    if (Object.values(results).every(r => r.passed)) {
      report.push('  ✅ 业务逻辑正确性良好，无需特殊措施');
    } else {
      report.push('  🔧 建议检查订单状态更新逻辑');
      report.push('  🔧 建议检查数量验证规则');
      report.push('  🔧 建议检查库存流水生成逻辑');
      report.push('  🔧 建议检查金额计算公式');
    }

    return report.join('\n');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始业务逻辑正确性验证...');
  console.log('');

  const validator = new BusinessLogicValidator(DB_PATH);
  
  try {
    // 执行所有验证
    const results = {
      purchaseOrderStatus: validator.validatePurchaseOrderStatus(),
      salesOrderStatus: validator.validateSalesOrderStatus(),
      receiptLimits: validator.validateReceiptQuantityLimits(),
      shipmentLimits: validator.validateShipmentQuantityLimits(),
      transactionLogic: validator.validateTransactionBusinessLogic(),
      amountCalculation: validator.validateOrderAmountCalculation()
    };

    // 生成报告
    console.log('');
    const report = validator.generateBusinessLogicReport(results);
    console.log(report);

    // 保存报告
    const reportPath = path.join(process.cwd(), 'business-logic-validation-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 验证报告已保存到: ${reportPath}`);

    // 判断总体结果
    const allPassed = Object.values(results).every(r => r.passed);
    
    if (allPassed) {
      console.log('');
      console.log('🎉 业务逻辑正确性验证全部通过！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 业务逻辑正确性验证发现问题！');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 验证过程中发生错误:', error);
    process.exit(1);
  } finally {
    validator.close();
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { BusinessLogicValidator };
