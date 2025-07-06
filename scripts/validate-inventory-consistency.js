#!/usr/bin/env node

// 库存数据一致性验证脚本
// 验证库存总量、可用库存、预留库存的计算正确性

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

class InventoryValidator {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
  }

  close() {
    this.db.close();
  }

  // 验证库存总量 = 入库总量 - 出库总量
  validateStockQuantityConsistency() {
    console.log('🔍 验证库存总量一致性...');
    
    const query = `
      SELECT 
        s.product_id,
        s.warehouse_id,
        p.sku as product_sku,
        p.name as product_name,
        w.code as warehouse_code,
        s.current_stock,
        COALESCE(inbound.total_in, 0) as total_in,
        COALESCE(outbound.total_out, 0) as total_out,
        (COALESCE(inbound.total_in, 0) - COALESCE(outbound.total_out, 0)) as calculated_stock,
        (s.current_stock - (COALESCE(inbound.total_in, 0) - COALESCE(outbound.total_out, 0))) as difference
      FROM inventory_stocks s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      LEFT JOIN (
        SELECT product_id, warehouse_id, SUM(quantity) as total_in
        FROM inventory_transactions 
        WHERE transaction_type = 'in'
        GROUP BY product_id, warehouse_id
      ) inbound ON s.product_id = inbound.product_id AND s.warehouse_id = inbound.warehouse_id
      LEFT JOIN (
        SELECT product_id, warehouse_id, SUM(ABS(quantity)) as total_out
        FROM inventory_transactions 
        WHERE transaction_type = 'out'
        GROUP BY product_id, warehouse_id
      ) outbound ON s.product_id = outbound.product_id AND s.warehouse_id = outbound.warehouse_id
      ORDER BY s.product_id, s.warehouse_id
    `;

    const results = this.db.prepare(query).all();
    const inconsistencies = results.filter(row => Math.abs(row.difference) > 0.01);

    console.log(`📊 检查了 ${results.length} 个库存记录`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ 库存总量一致性检查通过');
      results.forEach(row => {
        console.log(`  📦 ${row.product_sku} @ ${row.warehouse_code}: 当前${row.current_stock} = 入库${row.total_in} - 出库${row.total_out}`);
      });
    } else {
      console.log(`❌ 发现 ${inconsistencies.length} 个库存总量不一致问题:`);
      inconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.product_sku} @ ${row.warehouse_code}: 当前${row.current_stock}, 计算值${row.calculated_stock}, 差异${row.difference}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: inconsistencies.length,
      details: results,
      passed: inconsistencies.length === 0
    };
  }

  // 验证可用库存 = 当前库存 - 预留库存
  validateAvailableStockConsistency() {
    console.log('');
    console.log('🔍 验证可用库存一致性...');
    
    const query = `
      SELECT 
        s.product_id,
        s.warehouse_id,
        p.sku as product_sku,
        p.name as product_name,
        w.code as warehouse_code,
        s.current_stock,
        s.reserved_stock,
        s.available_stock,
        (s.current_stock - s.reserved_stock) as calculated_available,
        (s.available_stock - (s.current_stock - s.reserved_stock)) as difference
      FROM inventory_stocks s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      ORDER BY s.product_id, s.warehouse_id
    `;

    const results = this.db.prepare(query).all();
    const inconsistencies = results.filter(row => Math.abs(row.difference) > 0.01);

    console.log(`📊 检查了 ${results.length} 个库存记录`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ 可用库存一致性检查通过');
      results.forEach(row => {
        console.log(`  📦 ${row.product_sku} @ ${row.warehouse_code}: 可用${row.available_stock} = 当前${row.current_stock} - 预留${row.reserved_stock}`);
      });
    } else {
      console.log(`❌ 发现 ${inconsistencies.length} 个可用库存不一致问题:`);
      inconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.product_sku} @ ${row.warehouse_code}: 可用${row.available_stock}, 计算值${row.calculated_available}, 差异${row.difference}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: inconsistencies.length,
      details: results,
      passed: inconsistencies.length === 0
    };
  }

  // 验证预留库存的合理性
  validateReservedStockConsistency() {
    console.log('');
    console.log('🔍 验证预留库存合理性...');

    // 简化验证：检查预留库存是否为非负数且不超过当前库存
    const query = `
      SELECT
        s.product_id,
        s.warehouse_id,
        p.sku as product_sku,
        w.code as warehouse_code,
        s.current_stock,
        s.reserved_stock,
        s.available_stock,
        CASE
          WHEN s.reserved_stock < 0 THEN 'negative_reserved'
          WHEN s.reserved_stock > s.current_stock THEN 'reserved_exceeds_current'
          WHEN s.available_stock < 0 THEN 'negative_available'
          ELSE 'valid'
        END as validation_status
      FROM inventory_stocks s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      ORDER BY s.product_id, s.warehouse_id
    `;

    const results = this.db.prepare(query).all();
    const issues = results.filter(row => row.validation_status !== 'valid');

    console.log(`📊 检查了 ${results.length} 个库存记录`);

    if (issues.length === 0) {
      console.log('✅ 预留库存合理性检查通过');
      results.forEach(row => {
        if (row.reserved_stock > 0) {
          console.log(`  📦 ${row.product_sku} @ ${row.warehouse_code}: 当前${row.current_stock}, 预留${row.reserved_stock}, 可用${row.available_stock}`);
        }
      });
    } else {
      console.log(`❌ 发现 ${issues.length} 个预留库存问题:`);
      issues.forEach(row => {
        let message = '';
        switch (row.validation_status) {
          case 'negative_reserved':
            message = `预留库存为负数: ${row.reserved_stock}`;
            break;
          case 'reserved_exceeds_current':
            message = `预留库存超过当前库存: 预留${row.reserved_stock} > 当前${row.current_stock}`;
            break;
          case 'negative_available':
            message = `可用库存为负数: ${row.available_stock}`;
            break;
        }
        console.log(`  ⚠️  ${row.product_sku} @ ${row.warehouse_code}: ${message}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: issues.length,
      details: results,
      passed: issues.length === 0
    };
  }

  // 验证库存流水记录的完整性
  validateTransactionCompleteness() {
    console.log('');
    console.log('🔍 验证库存流水记录完整性...');
    
    // 检查是否所有库存变动都有对应的流水记录
    const stocksWithoutTransactions = this.db.prepare(`
      SELECT 
        s.product_id,
        s.warehouse_id,
        p.sku as product_sku,
        w.code as warehouse_code,
        s.current_stock
      FROM inventory_stocks s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      LEFT JOIN inventory_transactions t ON s.product_id = t.product_id AND s.warehouse_id = t.warehouse_id
      WHERE s.current_stock > 0 AND t.id IS NULL
    `).all();

    // 检查流水记录的参考完整性
    const orphanedTransactions = this.db.prepare(`
      SELECT 
        t.id,
        t.product_id,
        t.warehouse_id,
        t.reference_type,
        t.reference_id,
        p.sku as product_sku,
        w.code as warehouse_code
      FROM inventory_transactions t
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN warehouses w ON t.warehouse_id = w.id
      WHERE t.reference_type = 'purchase_receipt' 
      AND NOT EXISTS (SELECT 1 FROM purchase_receipts pr WHERE pr.id = t.reference_id)
      OR t.reference_type = 'sales_order'
      AND NOT EXISTS (SELECT 1 FROM sales_orders so WHERE so.id = t.reference_id)
    `).all();

    console.log(`📊 检查库存流水记录完整性`);
    
    let passed = true;
    
    if (stocksWithoutTransactions.length === 0) {
      console.log('✅ 所有有库存的记录都有对应的流水记录');
    } else {
      console.log(`❌ 发现 ${stocksWithoutTransactions.length} 个有库存但无流水记录的问题:`);
      stocksWithoutTransactions.forEach(row => {
        console.log(`  ⚠️  ${row.product_sku} @ ${row.warehouse_code}: 库存${row.current_stock}但无流水记录`);
      });
      passed = false;
    }

    if (orphanedTransactions.length === 0) {
      console.log('✅ 所有流水记录的参考完整性检查通过');
    } else {
      console.log(`❌ 发现 ${orphanedTransactions.length} 个流水记录参考不完整的问题:`);
      orphanedTransactions.forEach(row => {
        console.log(`  ⚠️  流水${row.id}: ${row.product_sku} @ ${row.warehouse_code}, 参考类型${row.reference_type}, 参考ID${row.reference_id}不存在`);
      });
      passed = false;
    }

    return {
      stocks_without_transactions: stocksWithoutTransactions.length,
      orphaned_transactions: orphanedTransactions.length,
      passed: passed
    };
  }

  // 验证平均成本计算
  validateAverageCostCalculation() {
    console.log('');
    console.log('🔍 验证平均成本计算...');
    
    const query = `
      SELECT 
        s.product_id,
        s.warehouse_id,
        p.sku as product_sku,
        w.code as warehouse_code,
        s.current_stock,
        s.avg_cost,
        CASE 
          WHEN s.current_stock = 0 THEN 0
          ELSE (
            SELECT SUM(t.quantity * t.unit_price) / SUM(t.quantity)
            FROM inventory_transactions t
            WHERE t.product_id = s.product_id 
            AND t.warehouse_id = s.warehouse_id
            AND t.transaction_type = 'in'
          )
        END as calculated_avg_cost
      FROM inventory_stocks s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN warehouses w ON s.warehouse_id = w.id
      WHERE s.current_stock > 0
      ORDER BY s.product_id, s.warehouse_id
    `;

    const results = this.db.prepare(query).all();
    const inconsistencies = results.filter(row => {
      if (row.current_stock === 0) return false;
      return Math.abs(row.avg_cost - (row.calculated_avg_cost || 0)) > 0.01;
    });

    console.log(`📊 检查了 ${results.length} 个有库存的记录`);
    
    if (inconsistencies.length === 0) {
      console.log('✅ 平均成本计算一致性检查通过');
      results.forEach(row => {
        console.log(`  📦 ${row.product_sku} @ ${row.warehouse_code}: 平均成本¥${row.avg_cost.toFixed(2)} (计算值¥${(row.calculated_avg_cost || 0).toFixed(2)})`);
      });
    } else {
      console.log(`❌ 发现 ${inconsistencies.length} 个平均成本计算不一致问题:`);
      inconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.product_sku} @ ${row.warehouse_code}: 当前¥${row.avg_cost.toFixed(2)}, 计算值¥${(row.calculated_avg_cost || 0).toFixed(2)}`);
      });
    }

    return {
      total_checked: results.length,
      inconsistencies: inconsistencies.length,
      details: results,
      passed: inconsistencies.length === 0
    };
  }

  // 生成完整的验证报告
  generateValidationReport(results) {
    const report = [
      '📊 库存数据一致性验证报告',
      '='.repeat(50),
      '',
      `验证时间: ${new Date().toLocaleString()}`,
      `数据库路径: ${DB_PATH}`,
      '',
      '验证结果汇总:',
      `  📦 库存总量一致性: ${results.stockQuantity.passed ? '✅ 通过' : '❌ 失败'} (${results.stockQuantity.inconsistencies}/${results.stockQuantity.total_checked})`,
      `  📊 可用库存一致性: ${results.availableStock.passed ? '✅ 通过' : '❌ 失败'} (${results.availableStock.inconsistencies}/${results.availableStock.total_checked})`,
      `  🔒 预留库存一致性: ${results.reservedStock.passed ? '✅ 通过' : '❌ 失败'} (${results.reservedStock.inconsistencies}/${results.reservedStock.total_checked})`,
      `  📋 流水记录完整性: ${results.transactionCompleteness.passed ? '✅ 通过' : '❌ 失败'}`,
      `  💰 平均成本计算: ${results.averageCost.passed ? '✅ 通过' : '❌ 失败'} (${results.averageCost.inconsistencies}/${results.averageCost.total_checked})`,
      '',
      `总体评估: ${Object.values(results).every(r => r.passed) ? '✅ 所有检查通过' : '❌ 发现数据不一致问题'}`,
      ''
    ];

    if (!Object.values(results).every(r => r.passed)) {
      report.push('发现的问题详情:');
      
      if (!results.stockQuantity.passed) {
        report.push('  库存总量不一致:');
        results.stockQuantity.details.filter(d => Math.abs(d.difference) > 0.01).forEach(d => {
          report.push(`    - ${d.product_sku} @ ${d.warehouse_code}: 差异${d.difference}`);
        });
      }
      
      if (!results.availableStock.passed) {
        report.push('  可用库存不一致:');
        results.availableStock.details.filter(d => Math.abs(d.difference) > 0.01).forEach(d => {
          report.push(`    - ${d.product_sku} @ ${d.warehouse_code}: 差异${d.difference}`);
        });
      }
      
      if (!results.reservedStock.passed) {
        report.push('  预留库存不一致:');
        results.reservedStock.details.filter(d => Math.abs(d.difference) > 0.01).forEach(d => {
          report.push(`    - ${d.product_sku} @ ${d.warehouse_code}: 差异${d.difference}`);
        });
      }
      
      if (!results.transactionCompleteness.passed) {
        report.push('  流水记录不完整:');
        report.push(`    - 无流水记录的库存: ${results.transactionCompleteness.stocks_without_transactions}个`);
        report.push(`    - 参考不完整的流水: ${results.transactionCompleteness.orphaned_transactions}个`);
      }
      
      if (!results.averageCost.passed) {
        report.push('  平均成本计算不一致:');
        results.averageCost.details.filter(d => Math.abs(d.avg_cost - (d.calculated_avg_cost || 0)) > 0.01).forEach(d => {
          report.push(`    - ${d.product_sku} @ ${d.warehouse_code}: 当前¥${d.avg_cost.toFixed(2)}, 计算值¥${(d.calculated_avg_cost || 0).toFixed(2)}`);
        });
      }
      
      report.push('');
    }

    report.push('建议措施:');
    if (Object.values(results).every(r => r.passed)) {
      report.push('  ✅ 库存数据一致性良好，无需特殊措施');
    } else {
      report.push('  🔧 建议检查业务逻辑实现');
      report.push('  🔧 建议检查并发控制机制');
      report.push('  🔧 建议重新计算不一致的数据');
    }

    return report.join('\n');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始库存数据一致性验证...');
  console.log('');

  const validator = new InventoryValidator(DB_PATH);
  
  try {
    // 执行所有验证
    const results = {
      stockQuantity: validator.validateStockQuantityConsistency(),
      availableStock: validator.validateAvailableStockConsistency(),
      reservedStock: validator.validateReservedStockConsistency(),
      transactionCompleteness: validator.validateTransactionCompleteness(),
      averageCost: validator.validateAverageCostCalculation()
    };

    // 生成报告
    console.log('');
    const report = validator.generateValidationReport(results);
    console.log(report);

    // 保存报告
    const reportPath = path.join(process.cwd(), 'inventory-validation-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 验证报告已保存到: ${reportPath}`);

    // 判断总体结果
    const allPassed = Object.values(results).every(r => r.passed);
    
    if (allPassed) {
      console.log('');
      console.log('🎉 库存数据一致性验证全部通过！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 库存数据一致性验证发现问题！');
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

module.exports = { InventoryValidator };
