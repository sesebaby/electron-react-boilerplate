import path from 'path';
import fs from 'fs';

/**
 * 全局测试清理
 * 在所有测试执行完成后运行一次
 */
async function globalTeardown() {
  console.log('🧹 开始E2E测试全局清理...');
  
  // 1. 生成测试报告摘要
  await generateTestSummary();
  
  // 2. 清理临时文件（可选保留用于调试）
  if (process.env.CLEANUP_TEST_DATA !== 'false') {
    await cleanupTempFiles();
  }
  
  console.log('✅ E2E测试全局清理完成');
}

/**
 * 生成测试报告摘要
 */
async function generateTestSummary() {
  const resultPath = path.join(__dirname, '../test-results/results.json');
  
  if (fs.existsSync(resultPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
      const summary = {
        timestamp: new Date().toISOString(),
        total: results.stats?.expected || 0,
        passed: results.stats?.passed || 0,
        failed: results.stats?.failed || 0,
        skipped: results.stats?.skipped || 0,
        duration: results.stats?.duration || 0,
      };
      
      const summaryPath = path.join(__dirname, '../test-results/summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      console.log('📊 测试摘要已生成:', summary);
    } catch (error) {
      console.error('生成测试摘要失败:', error);
    }
  }
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
  const tempPaths = [
    path.join(__dirname, '../test-db'),
    path.join(__dirname, '../test-results/trace'),
    path.join(__dirname, '../test-results/video'),
  ];
  
  for (const tempPath of tempPaths) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
        console.log(`🗑️ 已清理: ${tempPath}`);
      } catch (error) {
        console.warn(`清理失败 ${tempPath}:`, error);
      }
    }
  }
}

export default globalTeardown;