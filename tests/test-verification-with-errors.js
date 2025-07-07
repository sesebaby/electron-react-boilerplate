/**
 * 带有故意错误的业务逻辑验证测试
 * 用于验证错误检测和报告功能
 */

const { SimpleVerifier } = require('./test-verification.js');

class ErrorProneVerifier extends SimpleVerifier {
  // 重写操作模拟，引入各种错误场景
  async simulateOperation(operation, testData) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    switch (operation.type) {
      case 'stock_in':
        // 正常入库操作
        return {
          success: true,
          message: '库存入库成功',
          data: { updated_quantity: 120 }
        };
        
      case 'stock_out':
        // 故意引入库存不足错误
        return {
          success: false,
          message: '库存不足',
          error: '尝试出库50个单位，但可用库存仅有30个单位',
          issues: ['库存不足', '可能存在超卖风险']
        };
        
      case 'stock_adjust':
        // 故意引入负库存错误
        return {
          success: false,
          message: '库存调整失败',
          error: '调整后库存数量为负数：-15',
          issues: ['库存调整导致负库存', '业务规则违反']
        };
        
      case 'fifo_calc':
        // 故意引入FIFO计算错误
        return {
          success: false,
          message: 'FIFO计算失败',
          error: 'FIFO队列数据不一致，总数量100与库存数量95不匹配',
          issues: ['FIFO队列数据不一致', '成本计算可能错误']
        };
        
      default:
        return {
          success: false,
          error: `未知操作类型: ${operation.type}`
        };
    }
  }
  
  // 重写工作流步骤模拟，引入工作流错误
  async simulateWorkflowStep(step, workflowData) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    switch (step.step) {
      case 'create_purchase_order':
        return {
          success: true,
          message: '采购订单创建成功',
          outputData: {
            purchase_order: {
              id: Math.floor(Math.random() * 1000),
              order_number: `PO${Date.now()}`,
              total_amount: 1000
            }
          }
        };
        
      case 'create_receipt':
        // 故意引入收货失败
        return {
          success: false,
          message: '收货单创建失败',
          error: '供应商ID不存在，无法创建收货单',
          outputData: null
        };
        
      case 'update_inventory':
        // 由于收货失败，库存更新也应该失败
        return {
          success: false,
          message: '库存更新失败',
          error: '没有有效的收货单，无法更新库存',
          outputData: null
        };
        
      case 'create_payable':
        return {
          success: false,
          message: '应付账款创建失败',
          error: '采购流程未完成，无法创建应付账款',
          outputData: null
        };
        
      case 'create_sales_order':
        // 故意引入库存不足错误
        return {
          success: false,
          message: '销售订单创建失败',
          error: '产品ID 1的库存不足，需要100个单位，但仅有30个可用',
          outputData: null
        };
        
      case 'reserve_stock':
        return {
          success: false,
          message: '库存预留失败',
          error: '销售订单创建失败，无法预留库存',
          outputData: null
        };
        
      case 'create_delivery':
        return {
          success: false,
          message: '发货单创建失败',
          error: '没有有效的库存预留，无法创建发货单',
          outputData: null
        };
        
      case 'update_inventory_delivery':
        return {
          success: false,
          message: '库存更新失败',
          error: '发货单创建失败，无法更新库存',
          outputData: null
        };
        
      case 'create_receivable':
        return {
          success: false,
          message: '应收账款创建失败',
          error: '销售流程未完成，无法创建应收账款',
          outputData: null
        };
        
      default:
        return {
          success: false,
          error: `未知工作流步骤: ${step.step}`
        };
    }
  }
  
  // 重写完整性检查，引入更多违规情况
  async simulateIntegrityCheck(check, testData) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30));
    
    switch (check.check) {
      case 'stock_non_negative':
        // 故意报告负库存违规
        return {
          passed: false,
          violations: [
            {
              type: 'Negative Stock',
              description: '产品 1 的库存数量为负数: -15',
              severity: 'Critical'
            },
            {
              type: 'Negative Stock',
              description: '产品 3 的库存数量为负数: -5',
              severity: 'Critical'
            }
          ]
        };
        
      case 'fifo_consistency':
        // 故意报告FIFO不一致违规
        return {
          passed: false,
          violations: [
            {
              type: 'FIFO Inconsistency',
              description: '产品 1 的FIFO队列总数量 100 与库存数量 95 不匹配',
              severity: 'High'
            },
            {
              type: 'FIFO Missing Batch',
              description: '产品 2 缺少FIFO批次记录',
              severity: 'Medium'
            }
          ]
        };
        
      case 'financial_balance':
        // 故意报告财务余额错误
        return {
          passed: false,
          violations: [
            {
              type: 'Balance Mismatch',
              description: '供应商A的应付账款余额计算错误：期望 5000，实际 4800',
              severity: 'High'
            },
            {
              type: 'Overpayment',
              description: '客户B的已收金额 15000 超过应收总额 12000',
              severity: 'Critical'
            }
          ]
        };
        
      case 'foreign_key_integrity':
        // 故意报告外键违规
        return {
          passed: false,
          violations: [
            {
              type: 'Foreign Key Violation',
              description: '库存记录引用了不存在的产品ID: 999',
              severity: 'Critical'
            },
            {
              type: 'Foreign Key Violation',
              description: '销售订单引用了不存在的客户ID: 888',
              severity: 'High'
            }
          ]
        };
        
      default:
        return {
          passed: false,
          violations: [{
            type: 'Unknown Check',
            description: `未知的完整性检查: ${check.check}`,
            severity: 'Medium'
          }]
        };
    }
  }
  
  // 重写最终报告生成，突出错误情况
  generateFinalReport(results, executionTime) {
    console.log('='.repeat(60));
    console.log('📊 业务逻辑验证最终报告 (包含错误检测)');
    console.log('='.repeat(60));
    
    const totalScenarios = results.length;
    const passedScenarios = results.filter(r => r.passed || r.completed).length;
    const overallSuccessRate = (passedScenarios / totalScenarios) * 100;
    
    console.log(`执行时间: ${(executionTime / 1000).toFixed(2)} 秒`);
    console.log(`测试场景: ${totalScenarios}`);
    console.log(`通过场景: ${passedScenarios}`);
    console.log(`失败场景: ${totalScenarios - passedScenarios}`);
    console.log(`总体成功率: ${overallSuccessRate.toFixed(1)}%\n`);
    
    console.log('详细结果:');
    results.forEach((result, index) => {
      const scenarioNames = ['库存管理', '采购工作流', '销售工作流', '数据完整性'];
      const scenarioName = scenarioNames[index] || '未知场景';
      const status = (result.passed || result.completed) ? '✅' : '❌';
      
      console.log(`  ${status} ${scenarioName}`);
      
      if (result.summary) {
        if (result.summary.successRate !== undefined) {
          console.log(`     成功率: ${result.summary.successRate.toFixed(1)}%`);
        }
        
        if (result.summary.issues && result.summary.issues.length > 0) {
          console.log(`     问题 (${result.summary.issues.length}):`);
          result.summary.issues.slice(0, 3).forEach((issue, i) => {
            console.log(`       ${i + 1}. ${issue}`);
          });
          if (result.summary.issues.length > 3) {
            console.log(`       ... 还有 ${result.summary.issues.length - 3} 个问题`);
          }
        }
        
        if (result.summary.totalViolations > 0) {
          console.log(`     数据违规: ${result.summary.totalViolations} 项 (严重: ${result.summary.criticalViolations})`);
        }
      }
      
      // 显示具体的违规详情
      if (result.checks) {
        const failedChecks = result.checks.filter(c => !c.passed);
        if (failedChecks.length > 0) {
          console.log(`     失败检查:`);
          failedChecks.forEach(check => {
            console.log(`       - ${check.check}`);
            if (check.violations) {
              check.violations.slice(0, 2).forEach(v => {
                console.log(`         [${v.severity}] ${v.description}`);
              });
            }
          });
        }
      }
    });
    
    console.log('\n🚨 发现的主要问题:');
    console.log('1. 库存管理存在严重问题:');
    console.log('   - 多个产品出现负库存');
    console.log('   - FIFO队列数据不一致');
    console.log('   - 库存操作失败率高');
    
    console.log('\n2. 工作流程存在阻断:');
    console.log('   - 采购流程在收货环节失败');
    console.log('   - 销售流程在订单创建环节失败');
    console.log('   - 数据传递链条中断');
    
    console.log('\n3. 数据完整性严重受损:');
    console.log('   - 外键完整性违规');
    console.log('   - 财务数据不平衡');
    console.log('   - 业务规则违反');
    
    console.log('\n🎯 验证总结:');
    if (overallSuccessRate >= 90) {
      console.log('✅ 系统业务逻辑整体健康');
    } else if (overallSuccessRate >= 70) {
      console.log('⚠️  系统存在一些业务逻辑问题，需要关注');
    } else {
      console.log('❌ 系统存在严重的业务逻辑问题，需要立即修复！');
    }
    
    console.log('\n📋 建议的修复优先级:');
    console.log('1. 🔴 立即修复: 负库存问题、外键违规');
    console.log('2. 🟡 尽快修复: FIFO计算错误、工作流阻断');
    console.log('3. 🟢 计划修复: 数据验证规则、错误处理机制');
    
    console.log('\n📁 建议进行以下修复工作:');
    console.log('- 检查库存调整和出库逻辑');
    console.log('- 修复FIFO队列维护机制');
    console.log('- 加强工作流错误处理');
    console.log('- 完善数据验证规则');
    console.log('- 建立数据一致性监控');
  }
}

// 执行包含错误的验证
async function runErrorProneTest() {
  console.log('🧪 开始执行包含错误检测的业务逻辑验证...\n');
  
  const verifier = new ErrorProneVerifier();
  
  try {
    await verifier.runFullVerification();
    console.log('\n🔍 错误检测验证完成！');
  } catch (error) {
    console.error('\n💥 验证执行失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runErrorProneTest();
}

module.exports = { ErrorProneVerifier, runErrorProneTest };