import { FullConfig } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';

/**
 * 增强的全局测试设置
 * 在所有测试执行前运行一次
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 开始E2E测试全局设置...');

  try {
    // 1. 清理之前的测试数据
    await cleanupTestData();

    // 2. 设置测试环境变量
    await setupEnvironmentVariables();

    // 3. 准备测试数据库
    await setupTestDatabase();

    // 4. 验证Electron应用可以启动
    await verifyElectronApp();

    // 5. 预热系统组件
    await warmupSystemComponents();

    console.log('✅ E2E测试全局设置完成');
  } catch (error) {
    console.error('❌ 全局设置失败:', error);
    throw error;
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  const testDbPath = path.join(__dirname, '../test-db');
  const testResultsDir = path.join(__dirname, '../test-results');

  // 清理测试数据库
  if (fs.existsSync(testDbPath)) {
    fs.rmSync(testDbPath, { recursive: true, force: true });
  }
  fs.mkdirSync(testDbPath, { recursive: true });

  // 清理测试结果目录
  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    for (const file of files) {
      const filePath = path.join(testResultsDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  } else {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // 创建必要的子目录
  const subDirs = ['artifacts', 'screenshots', 'videos', 'traces', 'html-report'];
  subDirs.forEach(dir => {
    const dirPath = path.join(testResultsDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  console.log('🧹 清理了之前的测试数据和结果');
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

/**
 * 设置测试环境变量
 */
async function setupEnvironmentVariables() {
  // 设置测试模式环境变量
  process.env.NODE_ENV = 'test';
  process.env.ELECTRON_IS_DEV = 'false';
  process.env.TEST_MODE = 'true';
  process.env.TEST_DB_PATH = path.join(__dirname, '../test-db/inventory.db');

  // 禁用一些在测试中不需要的功能
  process.env.DISABLE_AUTO_UPDATE = 'true';
  process.env.DISABLE_CRASH_REPORTER = 'true';
  process.env.DISABLE_METRICS = 'true';

  console.log('🔧 测试环境变量设置完成');
}

/**
 * 预热系统组件
 */
async function warmupSystemComponents() {
  // 这里可以预热一些系统组件，比如数据库连接池等
  // 对于Electron应用，可以预先加载一些必要的模块
  console.log('🔥 系统组件预热完成');
}

export default globalSetup;