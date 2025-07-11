import { FullConfig } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * 全局测试设置
 * 在所有测试执行前运行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始E2E测试全局设置...');
  
  // 1. 清理之前的测试数据
  await cleanupTestData();
  
  // 2. 准备测试数据库
  await setupTestDatabase();
  
  // 3. 验证Electron应用可以启动
  await verifyElectronApp();
  
  console.log('✅ E2E测试全局设置完成');
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  const testDbPath = path.join(__dirname, '../test-db');
  if (fs.existsSync(testDbPath)) {
    fs.rmSync(testDbPath, { recursive: true, force: true });
  }
  fs.mkdirSync(testDbPath, { recursive: true });
}

/**
 * 设置测试数据库
 */
async function setupTestDatabase() {
  // 复制主数据库到测试数据库
  const mainDbPath = path.join(__dirname, '../data/inventory.db');
  const testDbPath = path.join(__dirname, '../test-db/inventory.db');
  
  if (fs.existsSync(mainDbPath)) {
    fs.copyFileSync(mainDbPath, testDbPath);
  }
  
  console.log('📄 测试数据库已准备就绪');
}

/**
 * 验证Electron应用可以正常启动
 */
async function verifyElectronApp() {
  try {
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../public/main.js'),
        '--test-mode', // 测试模式标志
        '--test-db-path=' + path.join(__dirname, '../test-db/inventory.db')
      ],
      timeout: 30000,
    });
    
    // 验证窗口可以正常创建
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // 关闭测试实例
    await electronApp.close();
    
    console.log('✅ Electron应用启动验证成功');
  } catch (error) {
    console.error('❌ Electron应用启动验证失败:', error);
    throw error;
  }
}

export default globalSetup;