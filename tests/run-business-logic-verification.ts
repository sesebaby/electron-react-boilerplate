/**
 * 业务逻辑验证执行脚本
 * 执行完整的业务逻辑验证计划
 */

import { BusinessLogicTester, testConfigurations } from '../src/utils/businessLogicTester';

async function main() {
  console.log('🚀 开始执行业务逻辑验证计划...\n');
  
  const tester = new BusinessLogicTester();
  
  try {
    // 阶段1: 库存管理重点验证
    console.log('📦 阶段1: 库存管理验证');
    console.log('='.repeat(50));
    
    const inventoryResult = await tester.runVerificationScenario('inventory_basic_operations', {
      productCount: 5,
      batchCount: 3,
      warehouseCount: 2
    });
    
    console.log(`✅ 库存验证完成: ${inventoryResult.passed ? '通过' : '失败'}`);
    console.log(`   - 操作数: ${inventoryResult.results.length}`);
    console.log(`   - 成功率: ${inventoryResult.summary.successRate.toFixed(1)}%\n`);
    
    // 阶段2: 采购工作流验证
    console.log('🛒 阶段2: 采购工作流验证');
    console.log('='.repeat(50));
    
    const purchaseResult = await tester.runVerificationScenario('purchase_complete_workflow', {
      supplierCount: 3,
      productCount: 10,
      orderCount: 5
    });
    
    console.log(`✅ 采购验证完成: ${purchaseResult.completed ? '通过' : '失败'}`);
    console.log(`   - 步骤数: ${purchaseResult.steps.length}`);
    console.log(`   - 成功率: ${purchaseResult.summary.successRate.toFixed(1)}%\n`);
    
    // 阶段3: 销售工作流验证
    console.log('💰 阶段3: 销售工作流验证');
    console.log('='.repeat(50));
    
    const salesResult = await tester.runVerificationScenario('sales_complete_workflow', {
      customerCount: 5,
      productCount: 15,
      orderCount: 8
    });
    
    console.log(`✅ 销售验证完成: ${salesResult.completed ? '通过' : '失败'}`);
    console.log(`   - 步骤数: ${salesResult.steps.length}`);
    console.log(`   - 成功率: ${salesResult.summary.successRate.toFixed(1)}%\n`);
    
    // 阶段4: 多仓库操作验证
    console.log('🏪 阶段4: 多仓库操作验证');
    console.log('='.repeat(50));
    
    const warehouseResult = await tester.runVerificationScenario('multi_warehouse_operations', {
      warehouseCount: 5,
      productCount: 20,
      transferCount: 10
    });
    
    console.log(`✅ 多仓库验证完成: ${warehouseResult.passed ? '通过' : '失败'}`);
    console.log(`   - 操作数: ${warehouseResult.results.length}`);
    console.log(`   - 成功率: ${warehouseResult.summary.successRate.toFixed(1)}%\n`);
    
    // 阶段5: 财务对账验证
    console.log('💳 阶段5: 财务对账验证');
    console.log('='.repeat(50));
    
    const financialResult = await tester.runVerificationScenario('financial_reconciliation', {
      transactionCount: 50,
      paymentCount: 25,
      receiptCount: 30
    });
    
    console.log(`✅ 财务验证完成: ${financialResult.passed ? '通过' : '失败'}`);
    console.log(`   - 操作数: ${financialResult.results.length}`);
    console.log(`   - 成功率: ${financialResult.summary.successRate.toFixed(1)}%\n`);
    
    // 阶段6: 完整系统验证
    console.log('🔧 阶段6: 完整系统验证');
    console.log('='.repeat(50));
    
    const fullTestConfig = {
      ...testConfigurations.fullVerification,
      testDataSpecs: {
        productCount: 100,
        categoryCount: 10,
        supplierCount: 20,
        customerCount: 30,
        warehouseCount: 5,
        orderCount: 50,
        userCount: 10
      }
    };
    
    const fullResult = await tester.runFullVerification(fullTestConfig);
    
    console.log(`✅ 完整验证完成: ${fullResult.passed ? '通过' : '失败'}`);
    console.log(`   - 方法验证: ${fullResult.methodResults.length}`);
    console.log(`   - 工作流验证: ${fullResult.workflowResults.length}`);
    console.log(`   - 发现问题: ${fullResult.issues.length}`);
    console.log(`   - 数据完整性: ${fullResult.dataIntegrityReport?.passed ? '通过' : '失败'}\n`);
    
    // 生成总结报告
    generateSummaryReport([
      inventoryResult,
      purchaseResult,
      salesResult,
      warehouseResult,
      financialResult,
      fullResult
    ]);
    
  } catch (error) {
    console.error('❌ 验证过程中发生错误:', error);
    process.exit(1);
  }
}

function generateSummaryReport(results: any[]) {
  console.log('📊 验证总结报告');
  console.log('='.repeat(60));
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed || r.completed).length;
  const successRate = (passedTests / totalTests) * 100;
  
  console.log(`总测试场景: ${totalTests}`);
  console.log(`通过场景: ${passedTests}`);
  console.log(`失败场景: ${totalTests - passedTests}`);
  console.log(`总体成功率: ${successRate.toFixed(1)}%`);
  
  console.log('\n🔍 详细结果:');
  results.forEach((result, index) => {
    const scenarios = [
      '库存管理',
      '采购工作流',
      '销售工作流', 
      '多仓库操作',
      '财务对账',
      '完整系统'
    ];
    
    const status = (result.passed || result.completed) ? '✅' : '❌';
    const name = scenarios[index] || '未知场景';
    
    console.log(`  ${status} ${name}: ${(result.passed || result.completed) ? '通过' : '失败'}`);
    
    if (result.issues && result.issues.length > 0) {
      console.log(`     问题数: ${result.issues.length}`);
    }
    
    if (result.summary) {
      console.log(`     成功率: ${result.summary.successRate?.toFixed(1) || 'N/A'}%`);
    }
  });
  
  console.log(`\n📁 详细报告已保存到 tests/results/ 目录`);
  console.log(`🔧 如发现问题，请查看具体的验证报告进行修复`);
}

// 运行验证
if (require.main === module) {
  main().catch(console.error);
}

export { main as runBusinessLogicVerification };