#!/usr/bin/env node

// 财务数据准确性验证脚本
// 验证应收应付账款的自动生成和金额计算

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

class FinancialValidator {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
  }

  close() {
    this.db.close();
  }

  // 验证应付账款金额与采购订单金额的一致性
  validateAccountsPayableAccuracy() {
    console.log('🔍 验证应付账款数据准确性...');
    
    const query = `
      SELECT 
        ap.id as payable_id,
        ap.bill_no,
        ap.total_amount as payable_amount,
        ap.paid_amount,
        ap.balance_amount,
        ap.status as payable_status,
        po.id as order_id,
        po.order_no,
        po.final_amount as order_amount,
        po.status as order_status,
        s.name as supplier_name,
        (ap.total_amount - po.final_amount) as amount_difference,
        (ap.paid_amount + ap.balance_amount - ap.total_amount) as balance_difference
      FROM accounts_payable ap
      LEFT JOIN purchase_orders po ON ap.order_id = po.id
      LEFT JOIN suppliers s ON ap.supplier_id = s.id
      ORDER BY ap.created_at
    `;

    const results = this.db.prepare(query).all();
    
    // 检查金额一致性
    const amountInconsistencies = results.filter(row => Math.abs(row.amount_difference) > 0.01);
    
    // 检查余额计算
    const balanceInconsistencies = results.filter(row => Math.abs(row.balance_difference) > 0.01);

    console.log(`📊 检查了 ${results.length} 个应付账款记录`);
    
    let passed = true;
    
    if (amountInconsistencies.length === 0) {
      console.log('✅ 应付账款金额与订单金额一致性检查通过');
    } else {
      console.log(`❌ 发现 ${amountInconsistencies.length} 个应付账款金额不一致问题:`);
      amountInconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 应付¥${row.payable_amount.toFixed(2)}, 订单¥${row.order_amount.toFixed(2)}, 差异¥${row.amount_difference.toFixed(2)}`);
      });
      passed = false;
    }

    if (balanceInconsistencies.length === 0) {
      console.log('✅ 应付账款余额计算一致性检查通过');
    } else {
      console.log(`❌ 发现 ${balanceInconsistencies.length} 个应付账款余额计算问题:`);
      balanceInconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 总额¥${row.payable_amount.toFixed(2)}, 已付¥${row.paid_amount.toFixed(2)}, 余额¥${row.balance_amount.toFixed(2)}`);
      });
      passed = false;
    }

    // 显示正确的记录
    if (passed) {
      results.forEach(row => {
        console.log(`  📋 ${row.bill_no}: ${row.supplier_name}, 总额¥${row.payable_amount.toFixed(2)}, 状态${row.payable_status}`);
      });
    }

    return {
      total_checked: results.length,
      amount_inconsistencies: amountInconsistencies.length,
      balance_inconsistencies: balanceInconsistencies.length,
      details: results,
      passed: passed
    };
  }

  // 验证应收账款金额与销售订单金额的一致性
  validateAccountsReceivableAccuracy() {
    console.log('');
    console.log('🔍 验证应收账款数据准确性...');
    
    const query = `
      SELECT 
        ar.id as receivable_id,
        ar.bill_no,
        ar.total_amount as receivable_amount,
        ar.received_amount,
        ar.balance_amount,
        ar.status as receivable_status,
        so.id as order_id,
        so.order_no,
        so.final_amount as order_amount,
        so.status as order_status,
        c.name as customer_name,
        (ar.total_amount - so.final_amount) as amount_difference,
        (ar.received_amount + ar.balance_amount - ar.total_amount) as balance_difference
      FROM accounts_receivable ar
      LEFT JOIN sales_orders so ON ar.order_id = so.id
      LEFT JOIN customers c ON ar.customer_id = c.id
      ORDER BY ar.created_at
    `;

    const results = this.db.prepare(query).all();
    
    // 检查金额一致性
    const amountInconsistencies = results.filter(row => Math.abs(row.amount_difference) > 0.01);
    
    // 检查余额计算
    const balanceInconsistencies = results.filter(row => Math.abs(row.balance_difference) > 0.01);

    console.log(`📊 检查了 ${results.length} 个应收账款记录`);
    
    let passed = true;
    
    if (amountInconsistencies.length === 0) {
      console.log('✅ 应收账款金额与订单金额一致性检查通过');
    } else {
      console.log(`❌ 发现 ${amountInconsistencies.length} 个应收账款金额不一致问题:`);
      amountInconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 应收¥${row.receivable_amount.toFixed(2)}, 订单¥${row.order_amount.toFixed(2)}, 差异¥${row.amount_difference.toFixed(2)}`);
      });
      passed = false;
    }

    if (balanceInconsistencies.length === 0) {
      console.log('✅ 应收账款余额计算一致性检查通过');
    } else {
      console.log(`❌ 发现 ${balanceInconsistencies.length} 个应收账款余额计算问题:`);
      balanceInconsistencies.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 总额¥${row.receivable_amount.toFixed(2)}, 已收¥${row.received_amount.toFixed(2)}, 余额¥${row.balance_amount.toFixed(2)}`);
      });
      passed = false;
    }

    // 显示正确的记录
    if (passed) {
      results.forEach(row => {
        console.log(`  📋 ${row.bill_no}: ${row.customer_name}, 总额¥${row.receivable_amount.toFixed(2)}, 状态${row.receivable_status}`);
      });
    }

    return {
      total_checked: results.length,
      amount_inconsistencies: amountInconsistencies.length,
      balance_inconsistencies: balanceInconsistencies.length,
      details: results,
      passed: passed
    };
  }

  // 验证财务记录的完整性
  validateFinancialCompleteness() {
    console.log('');
    console.log('🔍 验证财务记录完整性...');
    
    // 检查已完成的采购订单是否都有对应的应付账款
    const missingPayables = this.db.prepare(`
      SELECT 
        po.id,
        po.order_no,
        po.final_amount,
        s.name as supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN accounts_payable ap ON po.id = ap.order_id
      WHERE po.status = 'completed' AND ap.id IS NULL
    `).all();

    // 检查已完成的销售订单是否都有对应的应收账款
    const missingReceivables = this.db.prepare(`
      SELECT 
        so.id,
        so.order_no,
        so.final_amount,
        c.name as customer_name
      FROM sales_orders so
      LEFT JOIN customers c ON so.customer_id = c.id
      LEFT JOIN accounts_receivable ar ON so.id = ar.order_id
      WHERE so.status = 'completed' AND ar.id IS NULL
    `).all();

    // 检查孤立的财务记录（没有对应订单的）
    const orphanedPayables = this.db.prepare(`
      SELECT 
        ap.id,
        ap.bill_no,
        ap.total_amount,
        ap.order_id
      FROM accounts_payable ap
      LEFT JOIN purchase_orders po ON ap.order_id = po.id
      WHERE ap.order_id IS NOT NULL AND po.id IS NULL
    `).all();

    const orphanedReceivables = this.db.prepare(`
      SELECT 
        ar.id,
        ar.bill_no,
        ar.total_amount,
        ar.order_id
      FROM accounts_receivable ar
      LEFT JOIN sales_orders so ON ar.order_id = so.id
      WHERE ar.order_id IS NOT NULL AND so.id IS NULL
    `).all();

    console.log(`📊 检查财务记录完整性`);
    
    let passed = true;
    
    if (missingPayables.length === 0) {
      console.log('✅ 所有已完成采购订单都有对应的应付账款');
    } else {
      console.log(`❌ 发现 ${missingPayables.length} 个缺少应付账款的已完成采购订单:`);
      missingPayables.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: ${row.supplier_name}, 金额¥${row.final_amount.toFixed(2)}`);
      });
      passed = false;
    }

    if (missingReceivables.length === 0) {
      console.log('✅ 所有已完成销售订单都有对应的应收账款');
    } else {
      console.log(`❌ 发现 ${missingReceivables.length} 个缺少应收账款的已完成销售订单:`);
      missingReceivables.forEach(row => {
        console.log(`  ⚠️  ${row.order_no}: ${row.customer_name}, 金额¥${row.final_amount.toFixed(2)}`);
      });
      passed = false;
    }

    if (orphanedPayables.length === 0) {
      console.log('✅ 所有应付账款都有有效的订单引用');
    } else {
      console.log(`❌ 发现 ${orphanedPayables.length} 个孤立的应付账款记录:`);
      orphanedPayables.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 引用订单ID ${row.order_id} 不存在`);
      });
      passed = false;
    }

    if (orphanedReceivables.length === 0) {
      console.log('✅ 所有应收账款都有有效的订单引用');
    } else {
      console.log(`❌ 发现 ${orphanedReceivables.length} 个孤立的应收账款记录:`);
      orphanedReceivables.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 引用订单ID ${row.order_id} 不存在`);
      });
      passed = false;
    }

    return {
      missing_payables: missingPayables.length,
      missing_receivables: missingReceivables.length,
      orphaned_payables: orphanedPayables.length,
      orphaned_receivables: orphanedReceivables.length,
      passed: passed
    };
  }

  // 验证财务状态的正确性
  validateFinancialStatus() {
    console.log('');
    console.log('🔍 验证财务状态正确性...');
    
    // 检查应付账款状态
    const payableStatusIssues = this.db.prepare(`
      SELECT 
        id,
        bill_no,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        due_date,
        CASE 
          WHEN balance_amount = 0 AND status != 'paid' THEN 'should_be_paid'
          WHEN balance_amount > 0 AND balance_amount < total_amount AND status != 'partial' THEN 'should_be_partial'
          WHEN balance_amount = total_amount AND paid_amount = 0 AND status != 'unpaid' THEN 'should_be_unpaid'
          WHEN DATE(due_date) < DATE('now') AND balance_amount > 0 AND status != 'overdue' THEN 'should_be_overdue'
          ELSE 'correct'
        END as expected_status
      FROM accounts_payable
      WHERE expected_status != 'correct'
    `).all();

    // 检查应收账款状态
    const receivableStatusIssues = this.db.prepare(`
      SELECT 
        id,
        bill_no,
        total_amount,
        received_amount,
        balance_amount,
        status,
        due_date,
        CASE 
          WHEN balance_amount = 0 AND status != 'paid' THEN 'should_be_paid'
          WHEN balance_amount > 0 AND balance_amount < total_amount AND status != 'partial' THEN 'should_be_partial'
          WHEN balance_amount = total_amount AND received_amount = 0 AND status != 'unpaid' THEN 'should_be_unpaid'
          WHEN DATE(due_date) < DATE('now') AND balance_amount > 0 AND status != 'overdue' THEN 'should_be_overdue'
          ELSE 'correct'
        END as expected_status
      FROM accounts_receivable
      WHERE expected_status != 'correct'
    `).all();

    console.log(`📊 检查财务状态正确性`);
    
    let passed = true;
    
    if (payableStatusIssues.length === 0) {
      console.log('✅ 所有应付账款状态正确');
    } else {
      console.log(`❌ 发现 ${payableStatusIssues.length} 个应付账款状态问题:`);
      payableStatusIssues.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 当前状态${row.status}, 应为${row.expected_status.replace('should_be_', '')}`);
      });
      passed = false;
    }

    if (receivableStatusIssues.length === 0) {
      console.log('✅ 所有应收账款状态正确');
    } else {
      console.log(`❌ 发现 ${receivableStatusIssues.length} 个应收账款状态问题:`);
      receivableStatusIssues.forEach(row => {
        console.log(`  ⚠️  ${row.bill_no}: 当前状态${row.status}, 应为${row.expected_status.replace('should_be_', '')}`);
      });
      passed = false;
    }

    return {
      payable_status_issues: payableStatusIssues.length,
      receivable_status_issues: receivableStatusIssues.length,
      passed: passed
    };
  }

  // 生成完整的财务验证报告
  generateFinancialReport(results) {
    const report = [
      '📊 财务数据准确性验证报告',
      '='.repeat(50),
      '',
      `验证时间: ${new Date().toLocaleString()}`,
      `数据库路径: ${DB_PATH}`,
      '',
      '验证结果汇总:',
      `  💰 应付账款准确性: ${results.payableAccuracy.passed ? '✅ 通过' : '❌ 失败'} (金额不一致${results.payableAccuracy.amount_inconsistencies}个, 余额错误${results.payableAccuracy.balance_inconsistencies}个)`,
      `  💵 应收账款准确性: ${results.receivableAccuracy.passed ? '✅ 通过' : '❌ 失败'} (金额不一致${results.receivableAccuracy.amount_inconsistencies}个, 余额错误${results.receivableAccuracy.balance_inconsistencies}个)`,
      `  📋 财务记录完整性: ${results.completeness.passed ? '✅ 通过' : '❌ 失败'} (缺少应付${results.completeness.missing_payables}个, 缺少应收${results.completeness.missing_receivables}个)`,
      `  🏷️  财务状态正确性: ${results.status.passed ? '✅ 通过' : '❌ 失败'} (应付状态错误${results.status.payable_status_issues}个, 应收状态错误${results.status.receivable_status_issues}个)`,
      '',
      `总体评估: ${Object.values(results).every(r => r.passed) ? '✅ 所有检查通过' : '❌ 发现财务数据问题'}`,
      ''
    ];

    if (!Object.values(results).every(r => r.passed)) {
      report.push('发现的问题详情:');
      
      if (!results.payableAccuracy.passed) {
        report.push('  应付账款问题:');
        if (results.payableAccuracy.amount_inconsistencies > 0) {
          report.push(`    - ${results.payableAccuracy.amount_inconsistencies}个金额不一致问题`);
        }
        if (results.payableAccuracy.balance_inconsistencies > 0) {
          report.push(`    - ${results.payableAccuracy.balance_inconsistencies}个余额计算错误`);
        }
      }
      
      if (!results.receivableAccuracy.passed) {
        report.push('  应收账款问题:');
        if (results.receivableAccuracy.amount_inconsistencies > 0) {
          report.push(`    - ${results.receivableAccuracy.amount_inconsistencies}个金额不一致问题`);
        }
        if (results.receivableAccuracy.balance_inconsistencies > 0) {
          report.push(`    - ${results.receivableAccuracy.balance_inconsistencies}个余额计算错误`);
        }
      }
      
      if (!results.completeness.passed) {
        report.push('  财务记录完整性问题:');
        if (results.completeness.missing_payables > 0) {
          report.push(`    - ${results.completeness.missing_payables}个已完成采购订单缺少应付账款`);
        }
        if (results.completeness.missing_receivables > 0) {
          report.push(`    - ${results.completeness.missing_receivables}个已完成销售订单缺少应收账款`);
        }
        if (results.completeness.orphaned_payables > 0) {
          report.push(`    - ${results.completeness.orphaned_payables}个孤立的应付账款记录`);
        }
        if (results.completeness.orphaned_receivables > 0) {
          report.push(`    - ${results.completeness.orphaned_receivables}个孤立的应收账款记录`);
        }
      }
      
      if (!results.status.passed) {
        report.push('  财务状态问题:');
        if (results.status.payable_status_issues > 0) {
          report.push(`    - ${results.status.payable_status_issues}个应付账款状态错误`);
        }
        if (results.status.receivable_status_issues > 0) {
          report.push(`    - ${results.status.receivable_status_issues}个应收账款状态错误`);
        }
      }
      
      report.push('');
    }

    report.push('建议措施:');
    if (Object.values(results).every(r => r.passed)) {
      report.push('  ✅ 财务数据准确性良好，无需特殊措施');
    } else {
      report.push('  🔧 建议检查财务集成逻辑');
      report.push('  🔧 建议检查订单状态变更触发器');
      report.push('  🔧 建议重新计算不一致的财务数据');
    }

    return report.join('\n');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始财务数据准确性验证...');
  console.log('');

  const validator = new FinancialValidator(DB_PATH);
  
  try {
    // 执行所有验证
    const results = {
      payableAccuracy: validator.validateAccountsPayableAccuracy(),
      receivableAccuracy: validator.validateAccountsReceivableAccuracy(),
      completeness: validator.validateFinancialCompleteness(),
      status: validator.validateFinancialStatus()
    };

    // 生成报告
    console.log('');
    const report = validator.generateFinancialReport(results);
    console.log(report);

    // 保存报告
    const reportPath = path.join(process.cwd(), 'financial-validation-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 验证报告已保存到: ${reportPath}`);

    // 判断总体结果
    const allPassed = Object.values(results).every(r => r.passed);
    
    if (allPassed) {
      console.log('');
      console.log('🎉 财务数据准确性验证全部通过！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 财务数据准确性验证发现问题！');
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

module.exports = { FinancialValidator };
