#!/usr/bin/env node

// 修复缺失的应付账款记录
// 为测试场景B的已完成采购订单生成应付账款

const sqlite3 = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 数据库路径
const DB_PATH = path.join(process.cwd(), 'data', 'inventory.db');

class PayableFixManager {
  constructor(dbPath) {
    this.db = new sqlite3(dbPath);
  }

  close() {
    this.db.close();
  }

  // 查找缺少应付账款的已完成采购订单
  findMissingPayables() {
    console.log('🔍 查找缺少应付账款的已完成采购订单...');
    
    const query = `
      SELECT 
        po.id,
        po.order_no,
        po.supplier_id,
        po.final_amount,
        po.status,
        s.name as supplier_name,
        s.payment_terms
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN accounts_payable ap ON po.id = ap.order_id
      WHERE po.status = 'completed' AND ap.id IS NULL
    `;

    const missingPayables = this.db.prepare(query).all();
    
    console.log(`📊 发现 ${missingPayables.length} 个缺少应付账款的已完成采购订单`);
    
    missingPayables.forEach(order => {
      console.log(`  📋 ${order.order_no}: ${order.supplier_name}, 金额¥${order.final_amount.toFixed(2)}`);
    });

    return missingPayables;
  }

  // 为采购订单创建应付账款
  createAccountsPayable(order) {
    const payableId = uuidv4();
    const billNo = `AP${Date.now()}${Math.floor(Math.random() * 1000)}`;
    
    // 解析付款条件，默认30天
    let paymentDays = 30;
    if (order.payment_terms && order.payment_terms.includes('天')) {
      const match = order.payment_terms.match(/(\d+)天/);
      if (match) {
        paymentDays = parseInt(match[1]);
      }
    }

    const billDate = new Date().toISOString().split('T')[0]; // 今天
    const dueDate = new Date(Date.now() + paymentDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    this.db.prepare(`
      INSERT INTO accounts_payable 
      (id, bill_no, supplier_id, order_id, bill_date, due_date, total_amount, paid_amount, balance_amount, status, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'unpaid', ?)
    `).run(
      payableId, 
      billNo, 
      order.supplier_id, 
      order.id, 
      billDate, 
      dueDate, 
      order.final_amount, 
      order.final_amount, 
      `补充生成的应付账款 - 订单${order.order_no}`
    );

    return {
      payableId,
      billNo,
      billDate,
      dueDate,
      totalAmount: order.final_amount
    };
  }

  // 修复所有缺失的应付账款
  fixMissingPayables() {
    console.log('');
    console.log('🔧 开始修复缺失的应付账款...');
    
    const missingPayables = this.findMissingPayables();
    
    if (missingPayables.length === 0) {
      console.log('✅ 没有发现缺失的应付账款，无需修复');
      return {
        fixed: 0,
        details: []
      };
    }

    const fixedPayables = [];
    
    this.db.exec('BEGIN TRANSACTION');
    
    try {
      for (const order of missingPayables) {
        console.log(`🔧 为订单 ${order.order_no} 创建应付账款...`);
        
        const payable = this.createAccountsPayable(order);
        
        console.log(`✅ 创建应付账款: ${payable.billNo}, 金额¥${payable.totalAmount.toFixed(2)}, 到期日${payable.dueDate}`);
        
        fixedPayables.push({
          orderNo: order.order_no,
          supplierName: order.supplier_name,
          billNo: payable.billNo,
          amount: payable.totalAmount,
          dueDate: payable.dueDate
        });
      }
      
      this.db.exec('COMMIT');
      
      console.log('');
      console.log(`🎉 成功修复 ${fixedPayables.length} 个缺失的应付账款！`);
      
    } catch (error) {
      this.db.exec('ROLLBACK');
      console.error('❌ 修复过程中发生错误，已回滚:', error.message);
      throw error;
    }

    return {
      fixed: fixedPayables.length,
      details: fixedPayables
    };
  }

  // 验证修复结果
  validateFix() {
    console.log('');
    console.log('🔍 验证修复结果...');
    
    // 重新检查是否还有缺失的应付账款
    const stillMissing = this.findMissingPayables();
    
    // 检查新创建的应付账款
    const newPayables = this.db.prepare(`
      SELECT 
        ap.bill_no,
        ap.total_amount,
        ap.balance_amount,
        ap.status,
        ap.due_date,
        po.order_no,
        s.name as supplier_name
      FROM accounts_payable ap
      JOIN purchase_orders po ON ap.order_id = po.id
      JOIN suppliers s ON ap.supplier_id = s.id
      WHERE ap.remark LIKE '%补充生成的应付账款%'
      ORDER BY ap.created_at DESC
    `).all();

    console.log('');
    console.log('📊 修复结果验证:');
    console.log(`  剩余缺失应付账款: ${stillMissing.length} 个`);
    console.log(`  新创建应付账款: ${newPayables.length} 个`);
    
    if (newPayables.length > 0) {
      console.log('');
      console.log('新创建的应付账款详情:');
      newPayables.forEach(payable => {
        console.log(`  📋 ${payable.bill_no}: ${payable.supplier_name}, 订单${payable.order_no}`);
        console.log(`      金额¥${payable.total_amount.toFixed(2)}, 状态${payable.status}, 到期${payable.due_date}`);
      });
    }

    return {
      stillMissing: stillMissing.length,
      newPayables: newPayables.length,
      success: stillMissing.length === 0
    };
  }

  // 生成修复报告
  generateFixReport(fixResult, validationResult) {
    const report = [
      '📊 应付账款修复报告',
      '='.repeat(50),
      '',
      `修复时间: ${new Date().toLocaleString()}`,
      `数据库路径: ${DB_PATH}`,
      '',
      '修复结果:',
      `  🔧 修复的应付账款数量: ${fixResult.fixed} 个`,
      `  ✅ 验证结果: ${validationResult.success ? '成功' : '失败'}`,
      `  📋 剩余缺失数量: ${validationResult.stillMissing} 个`,
      '',
      '修复详情:',
      ...fixResult.details.map(detail => 
        `  📋 ${detail.billNo}: ${detail.supplierName}, 订单${detail.orderNo}, 金额¥${detail.amount.toFixed(2)}`
      ),
      '',
      '影响评估:',
      '  ✅ 财务记录完整性得到修复',
      '  ✅ 应付账款与采购订单一致性恢复',
      '  ✅ 财务报表数据准确性提升',
      '',
      '后续建议:',
      '  🔧 检查财务集成触发器的实现',
      '  🔧 确保订单状态变更时自动生成财务记录',
      '  🔧 定期运行财务完整性检查'
    ];

    return report.join('\n');
  }
}

// 主函数
async function main() {
  console.log('🚀 开始修复缺失的应付账款...');
  console.log('');

  const fixManager = new PayableFixManager(DB_PATH);
  
  try {
    // 执行修复
    const fixResult = fixManager.fixMissingPayables();
    
    // 验证修复结果
    const validationResult = fixManager.validateFix();
    
    // 生成报告
    const report = fixManager.generateFixReport(fixResult, validationResult);
    console.log('');
    console.log(report);
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'payable-fix-report.txt');
    require('fs').writeFileSync(reportPath, report);
    console.log(`📄 修复报告已保存到: ${reportPath}`);
    
    if (validationResult.success) {
      console.log('');
      console.log('🎉 应付账款修复成功完成！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 应付账款修复未完全成功！');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 修复过程中发生错误:', error);
    process.exit(1);
  } finally {
    fixManager.close();
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { PayableFixManager };
