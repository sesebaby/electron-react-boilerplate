#!/usr/bin/env ts-node

// 系统全面测试脚本
import { systemTester } from '../utils/systemTest';
import { systemOptimizer } from '../utils/systemOptimization';
import { systemHealthMonitor } from '../utils/systemHealth';

async function runCompleteSystemTest() {
  console.log('🎯 开始进销存管理系统全面测试');
  console.log('='.repeat(80));

  try {
    // 1. 系统集成测试
    console.log('\n🧪 第一阶段: 系统集成测试');
    console.log('-'.repeat(40));
    const testReport = await systemTester.runAllTests();

    // 2. 系统优化分析
    console.log('\n🔧 第二阶段: 系统优化分析');
    console.log('-'.repeat(40));
    const optimizationReport = await systemOptimizer.analyzeAndOptimize();

    // 3. 系统健康检查
    console.log('\n🏥 第三阶段: 系统健康检查');
    console.log('-'.repeat(40));
    const healthReport = await systemHealthMonitor.performHealthCheck();

    // 4. 生成综合报告
    console.log('\n📋 第四阶段: 综合报告生成');
    console.log('-'.repeat(40));
    
    const overallScore = calculateOverallScore(testReport, optimizationReport, healthReport);
    const systemGrade = getSystemGrade(overallScore);
    
    printFinalReport({
      testReport,
      optimizationReport,
      healthReport,
      overallScore,
      systemGrade
    });

    // 5. 输出建议
    printRecommendations(testReport, optimizationReport, healthReport);

    console.log('\n✅ 系统全面测试完成!');
    
    return {
      success: true,
      overallScore,
      systemGrade,
      reports: { testReport, optimizationReport, healthReport }
    };

  } catch (error) {
    console.error('❌ 系统测试失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    };
  }
}

function calculateOverallScore(testReport: any, optimizationReport: any, healthReport: any): number {
  // 加权计算综合得分
  const testScore = (testReport.passedTests / testReport.totalTests) * 100;
  const optimizationScore = optimizationReport.performanceScore;
  const healthScore = healthReport.healthScore;

  // 权重: 测试30%, 优化40%, 健康30%
  const overallScore = (testScore * 0.3) + (optimizationScore * 0.4) + (healthScore * 0.3);
  
  return Math.round(overallScore);
}

function getSystemGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

function printFinalReport(data: any) {
  const { testReport, optimizationReport, healthReport, overallScore, systemGrade } = data;
  
  console.log('\n🎯 进销存管理系统 - 综合评估报告');
  console.log('='.repeat(80));
  
  console.log(`📅 测试时间: ${new Date().toLocaleString()}`);
  console.log(`🏆 综合得分: ${overallScore}/100`);
  console.log(`📊 系统等级: ${systemGrade}`);
  
  console.log('\n📈 各模块得分:');
  console.log(`  🧪 集成测试: ${Math.round((testReport.passedTests / testReport.totalTests) * 100)}/100`);
  console.log(`  🔧 系统优化: ${optimizationReport.performanceScore}/100`);
  console.log(`  🏥 系统健康: ${healthReport.healthScore}/100`);

  console.log('\n📊 详细统计:');
  console.log('┌─────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│     模块名称    │    通过/总数   │    耗时/状态   │    等级/状态   │');
  console.log('├─────────────────┼──────────────┼──────────────┼──────────────┤');
  console.log(`│ 🧪 集成测试     │   ${testReport.passedTests.toString().padStart(2)}/${testReport.totalTests.toString().padEnd(9)} │   ${(testReport.totalDuration + 'ms').padStart(11)} │      ${getModuleGrade((testReport.passedTests / testReport.totalTests) * 100).padStart(7)} │`);
  console.log(`│ 🔧 系统优化     │   ${optimizationReport.implementedOptimizations.toString().padStart(2)}/${optimizationReport.totalOptimizations.toString().padEnd(9)} │   ${(optimizationReport.performanceScore + '/100').padStart(11)} │      ${getModuleGrade(optimizationReport.performanceScore).padStart(7)} │`);
  console.log(`│ 🏥 系统健康     │   ${healthReport.summary.healthy.toString().padStart(2)}/${(healthReport.summary.healthy + healthReport.summary.warnings + healthReport.summary.critical).toString().padEnd(9)} │   ${(healthReport.healthScore + '/100').padStart(11)} │      ${getModuleGrade(healthReport.healthScore).padStart(7)} │`);
  console.log('└─────────────────┴──────────────┴──────────────┴──────────────┘');

  console.log('\n🎨 功能模块完成度:');
  const modules = [
    { name: '📦 库存管理', status: '✅ 完成', completion: 100 },
    { name: '🛒 采购管理', status: '✅ 完成', completion: 100 },
    { name: '💰 销售管理', status: '✅ 完成', completion: 100 },
    { name: '📊 报表分析', status: '🟡 部分', completion: 80 },
    { name: '⚙️ 系统管理', status: '🟡 部分', completion: 70 },
    { name: '💵 财务管理', status: '📋 规划', completion: 20 },
    { name: '👥 用户管理', status: '📋 规划', completion: 10 }
  ];

  modules.forEach(module => {
    const progressBar = '█'.repeat(Math.floor(module.completion / 10)) + 
                       '░'.repeat(10 - Math.floor(module.completion / 10));
    console.log(`  ${module.name}: ${progressBar} ${module.completion}% ${module.status}`);
  });
}

function getModuleGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function printRecommendations(testReport: any, optimizationReport: any, healthReport: any) {
  console.log('\n💡 系统改进建议:');
  console.log('='.repeat(50));

  const recommendations: Array<{
    priority: string;
    category: string;
    message: string;
  }> = [];

  // 测试相关建议
  if (testReport.failedTests > 0) {
    recommendations.push({
      priority: 'high',
      category: '测试',
      suggestion: `修复 ${testReport.failedTests} 个失败的测试用例`,
      impact: '提升系统稳定性'
    });
  }

  // 优化相关建议
  const pendingOptimizations = optimizationReport.totalOptimizations - optimizationReport.implementedOptimizations;
  if (pendingOptimizations > 0) {
    recommendations.push({
      priority: 'medium',
      category: '优化',
      suggestion: `实施 ${pendingOptimizations} 项待完成的优化措施`,
      impact: '提升系统性能'
    });
  }

  // 健康相关建议
  if (healthReport.summary.critical > 0) {
    recommendations.push({
      priority: 'high',
      category: '健康',
      suggestion: `紧急处理 ${healthReport.summary.critical} 个严重问题`,
      impact: '确保系统稳定运行'
    });
  }

  if (healthReport.summary.warnings > 0) {
    recommendations.push({
      priority: 'medium',
      category: '健康',
      suggestion: `关注并解决 ${healthReport.summary.warnings} 个警告问题`,
      impact: '预防潜在问题'
    });
  }

  // 功能完善建议
  recommendations.push({
    priority: 'low',
    category: '功能',
    suggestion: '完善财务管理模块（应收应付、资金流）',
    impact: '提供完整的业务流程'
  });

  recommendations.push({
    priority: 'low',
    category: '功能',
    suggestion: '实现用户权限管理系统',
    impact: '增强系统安全性'
  });

  recommendations.push({
    priority: 'medium',
    category: '体验',
    suggestion: '添加数据导入导出功能',
    impact: '提升用户便利性'
  });

  // 按优先级分组输出
  const priorityOrder = ['high', 'medium', 'low'];
  const priorityNames = { high: '🔴 高优先级', medium: '🟡 中优先级', low: '🟢 低优先级' };

  priorityOrder.forEach(priority => {
    const items = recommendations.filter(r => r.priority === priority);
    if (items.length > 0) {
      console.log(`\n${priorityNames[priority as keyof typeof priorityNames]}:`);
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. [${item.category}] ${item.suggestion}`);
        console.log(`     影响: ${item.impact}`);
      });
    }
  });

  console.log('\n🎯 下一步行动计划:');
  console.log('  1. 🔧 优先解决高优先级问题');
  console.log('  2. 📈 持续监控系统健康状态');
  console.log('  3. 🚀 逐步完善中低优先级功能');
  console.log('  4. 📊 定期进行系统评估和优化');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runCompleteSystemTest()
    .then(result => {
      if (result.success) {
        console.log(`\n🎉 系统测试完成！总体等级: ${result.systemGrade}`);
        process.exit(0);
      } else {
        console.error(`\n💥 系统测试失败: ${result.error}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 测试脚本执行失败:', error);
      process.exit(1);
    });
}

export { runCompleteSystemTest };