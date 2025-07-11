import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright配置文件 - 进销存管理系统E2E测试配置
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',
  
  // 全局设置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // 报告配置
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['list']
  ],
  
  // 全局配置
  use: {
    // 基础URL - Electron应用不需要
    // baseURL: 'http://localhost:3000',
    
    // 测试配置
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 超时设置
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  // 测试项目配置
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    
    {
      name: 'electron-main',
      use: {
        ...devices['Desktop Chrome'],
        // Electron特定配置
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH || undefined,
        },
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
    },
  ],

  // 输出目录
  outputDir: 'test-results/',
  
  // 全局设置和清理
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),
});