import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * 增强的Playwright配置 - 专为Electron桌面应用优化
 * 进销存管理系统E2E测试配置
 */
export default defineConfig({
  // 测试目录
  testDir: './e2e',

  // 全局设置 - 桌面应用优化
  fullyParallel: false, // 桌面应用建议关闭并行以避免资源冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 本地环境也允许重试一次
  workers: 1, // 桌面应用建议单线程

  // 测试超时配置
  timeout: 120000, // 桌面应用启动较慢，增加超时时间
  expect: {
    timeout: 15000, // 增加断言超时
  },
  
  // 报告配置
  reporter: [
    ['html', {
      outputFolder: 'test-results/html-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    // 添加自定义报告器用于测试覆盖率
    ['./e2e/reporters/coverage-reporter.ts']
  ],
  
  // 全局配置
  use: {
    // 基础URL - Electron应用不需要
    // baseURL: 'http://localhost:3000',

    // 测试配置
    trace: 'retain-on-failure', // 桌面应用调试很重要
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 超时设置
    actionTimeout: 15000,
    navigationTimeout: 45000, // 增加导航超时

    // 桌面应用特定设置
    viewport: { width: 1400, height: 900 }, // 匹配应用默认窗口大小
    ignoreHTTPSErrors: true,

    // 测试环境变量
    extraHTTPHeaders: {
      'X-Test-Mode': 'true'
    }
  },

  // 测试项目配置
  projects: [
    // 全局设置项目
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup'
    },

    // 清理项目
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // 主要测试项目 - Electron应用
    {
      name: 'electron-desktop',
      use: {
        ...devices['Desktop Chrome'],
        // Electron特定配置
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH || undefined,
          args: [
            '--test-mode',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-sandbox'
          ]
        },
      },
      dependencies: ['setup'],
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/*.setup.ts', '**/*.cleanup.ts']
    },

    // 性能测试项目
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.ELECTRON_PATH || undefined,
          args: ['--test-mode', '--performance-mode']
        },
      },
      dependencies: ['setup'],
      testMatch: '**/performance/*.spec.ts'
    }
  ],

  // 输出目录
  outputDir: 'test-results/artifacts',

  // 全局设置和清理
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  globalTeardown: require.resolve('./e2e/global-teardown.ts'),

  // 测试匹配模式
  testMatch: [
    '**/*.spec.ts',
    '**/*.test.ts'
  ],

  // 忽略的测试文件
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**'
  ],

  // 元数据
  metadata: {
    'test-framework': 'playwright',
    'app-type': 'electron-desktop',
    'test-env': process.env.NODE_ENV || 'test'
  }
});