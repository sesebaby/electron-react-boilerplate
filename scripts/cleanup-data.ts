#!/usr/bin/env ts-node

// 数据清理执行脚本
// 使用方法: npm run cleanup-data 或 ts-node scripts/cleanup-data.ts

const { dataCleanupManager } = require('../src/utils/dataCleanup');
const DatabaseManager = require('../src/services/database/connection').default;

async function main() {
  console.log('🚀 启动数据清理脚本...');
  console.log('⚠️  警告: 此操作将清除所有业务数据，但保留基础配置数据');
  console.log('');

  try {
    // 初始化数据库连接
    console.log('📡 初始化数据库连接...');
    await DatabaseManager.initialize();
    console.log('✅ 数据库连接成功');
    console.log('');

    // 询问用户确认（在实际环境中可以添加交互式确认）
    console.log('🔄 开始执行数据清理...');
    
    // 执行数据清理
    const cleanupResult = await dataCleanupManager.cleanupAllBusinessData();
    
    // 验证清理结果
    console.log('');
    const validationResult = await dataCleanupManager.validateCleanupResult();
    
    // 生成并显示报告
    console.log('');
    const report = dataCleanupManager.generateCleanupReport(cleanupResult, validationResult);
    console.log(report);
    
    // 保存报告到文件
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(process.cwd(), 'data-cleanup-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 清理报告已保存到: ${reportPath}`);
    
    // 根据结果设置退出码
    if (cleanupResult.success && validationResult.businessTablesEmpty) {
      console.log('');
      console.log('🎉 数据清理成功完成！');
      process.exit(0);
    } else {
      console.log('');
      console.log('❌ 数据清理未完全成功，请检查报告');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 数据清理脚本执行失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { cleanupData: main };
