/**
 * 集成测试全局设置
 * 在每个测试文件运行前执行
 */

import * as path from 'path';
import * as fs from 'fs';

// 设置测试数据库路径
process.env.TEST_DB_PATH = path.join(__dirname, '../../test-db');

// 确保测试数据库目录存在
beforeAll(async () => {
  const testDbDir = process.env.TEST_DB_PATH!;
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }
});

// 清理测试数据库
afterEach(async () => {
  const testDbDir = process.env.TEST_DB_PATH!;
  const files = fs.readdirSync(testDbDir);
  
  // 删除所有 .db 文件
  files.forEach(file => {
    if (file.endsWith('.db')) {
      try {
        fs.unlinkSync(path.join(testDbDir, file));
      } catch (error) {
        // 忽略删除错误
      }
    }
  });
});

// 设置更长的测试超时时间
jest.setTimeout(30000);

// 禁用控制台日志（可选）
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}