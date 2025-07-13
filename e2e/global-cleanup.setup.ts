import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * 全局测试清理设置
 * 在所有测试完成后执行清理工作
 */
setup('global cleanup', async () => {
  console.log('🧹 开始全局测试清理...');
  
  try {
    // 1. 清理测试数据库
    await cleanupTestDatabase();
    
    // 2. 整理测试结果
    await organizeTestResults();
    
    // 3. 生成测试摘要
    await generateTestSummary();
    
    console.log('✅ 全局测试清理完成');
  } catch (error) {
    console.error('❌ 全局清理失败:', error);
    // 不抛出错误，避免影响测试结果
  }
});

/**
 * 清理测试数据库
 */
async function cleanupTestDatabase() {
  const testDbPath = path.join(__dirname, '../test-db/inventory.db');
  const backupDbPath = path.join(__dirname, '../test-db/inventory_backup.db');
  
  // 如果有备份数据库，恢复它
  if (fs.existsSync(backupDbPath)) {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    fs.copyFileSync(backupDbPath, testDbPath);
    fs.unlinkSync(backupDbPath);
    console.log('📄 测试数据库已恢复');
  }
}

/**
 * 整理测试结果
 */
async function organizeTestResults() {
  const testResultsDir = path.join(__dirname, '../test-results');
  
  if (!fs.existsSync(testResultsDir)) {
    return;
  }
  
  // 创建时间戳目录
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveDir = path.join(testResultsDir, 'archive', timestamp);
  
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  // 移动测试结果到归档目录
  const files = fs.readdirSync(testResultsDir);
  for (const file of files) {
    if (file === 'archive') continue;
    
    const sourcePath = path.join(testResultsDir, file);
    const targetPath = path.join(archiveDir, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
      fs.rmSync(sourcePath, { recursive: true, force: true });
    } else {
      fs.copyFileSync(sourcePath, targetPath);
      fs.unlinkSync(sourcePath);
    }
  }
  
  console.log(`📁 测试结果已归档到: ${archiveDir}`);
}

/**
 * 生成测试摘要
 */
async function generateTestSummary() {
  const testResultsDir = path.join(__dirname, '../test-results');
  const summaryPath = path.join(testResultsDir, 'test-summary.md');
  
  const summary = `# E2E测试执行摘要

## 测试信息
- 执行时间: ${new Date().toLocaleString('zh-CN')}
- 测试环境: ${process.platform}
- Node版本: ${process.version}

## 测试结果
测试结果详情请查看相应的报告文件：
- HTML报告: \`html-report/index.html\`
- JSON报告: \`results.json\`
- JUnit报告: \`junit.xml\`
- 覆盖率报告: \`coverage-report.html\`

## 测试文件
测试相关文件已归档到 \`archive/\` 目录中。

---
*此摘要由E2E测试框架自动生成*
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`📋 测试摘要已生成: ${summaryPath}`);
}
