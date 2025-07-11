# 最佳实践：避免"测试通过但运行失败"

## 1. 🏗️ 建立完整的测试金字塔

### 测试类型和职责
```
┌─────────────────────┐
│   手动测试 (5%)    │ 探索性测试、用户体验
├─────────────────────┤
│   E2E 测试 (10%)   │ 完整用户流程、跨平台
├─────────────────────┤
│  集成测试 (25%)    │ 数据库、文件系统、API
├─────────────────────┤
│  单元测试 (60%)    │ 业务逻辑、纯函数
└─────────────────────┘
```

### 实施方案

#### 单元测试（已有）
```typescript
// ✅ 好的单元测试
describe('FinancialService', () => {
  it('should calculate FIFO cost', () => {
    // Mock 所有依赖
    const mockDb = { getInventoryTransactions: jest.fn() };
    // 测试纯逻辑
  });
});
```

#### 集成测试（需要添加）
```typescript
// ⚠️ 需要的集成测试
describe('Database Integration', () => {
  let realDb;
  
  beforeEach(() => {
    // 使用真实数据库
    realDb = new Database(':memory:');
  });
  
  it('should perform real database operations', () => {
    // 测试真实的 SQL 执行
  });
});
```

#### E2E 测试（需要添加）
```typescript
// ⚠️ 需要的 E2E 测试
describe('Application E2E', () => {
  it('should complete purchase order flow', async () => {
    // 启动真实应用
    // 模拟用户操作
    // 验证结果
  });
});
```

## 2. 🔧 环境一致性

### Docker 化开发环境
```dockerfile
# Dockerfile.dev
FROM node:18

# 安装 Electron 依赖
RUN apt-get update && apt-get install -y \
    libgtk-3-0 \
    libnotify-dev \
    libnss3 \
    libxss1 \
    libxtst6

WORKDIR /app
COPY package*.json ./
RUN npm install
```

### 使用环境变量
```javascript
// config.js
module.exports = {
  database: {
    path: process.env.DB_PATH || ':memory:',
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite' | 'mock'
  },
  testing: {
    useMockDb: process.env.USE_MOCK_DB === 'true'
  }
};
```

## 3. 📋 CI/CD 流水线

### GitHub Actions 示例
```yaml
name: Complete Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit

  integration-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:integration

  e2e-tests:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run build
      - run: npm run test:e2e
```

## 4. 🚨 早期警告系统

### 启动检查
```javascript
// prestart-check.js
const checks = [
  checkNodeVersion,
  checkNativeModules,
  checkDatabaseAccess,
  checkFilePermissions,
  checkPortAvailability
];

async function runChecks() {
  for (const check of checks) {
    const result = await check();
    if (!result.success) {
      console.error(`❌ ${check.name}: ${result.error}`);
      process.exit(1);
    }
  }
}
```

### 运行时诊断
```javascript
// diagnostics.js
class DiagnosticsService {
  async runDiagnostics() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      nativeModules: await this.checkNativeModules(),
      databaseStatus: await this.checkDatabase(),
      permissions: await this.checkPermissions()
    };
  }
}
```

## 5. 🔄 渐进式降级

### 数据库降级策略
```javascript
class DatabaseFactory {
  static async create() {
    try {
      // 尝试使用 better-sqlite3
      const Database = require('better-sqlite3');
      return new SqliteAdapter(new Database(dbPath));
    } catch (e) {
      console.warn('Native SQLite failed, using mock database');
      
      if (process.env.NODE_ENV === 'production') {
        // 生产环境：使用 IndexedDB
        return new IndexedDBAdapter();
      } else {
        // 开发环境：使用内存 Mock
        return new MockDatabaseAdapter();
      }
    }
  }
}
```

## 6. 📊 监控和告警

### 错误追踪
```javascript
// error-tracking.js
class ErrorTracker {
  static track(error, context) {
    console.error('Error occurred:', error);
    
    // 发送到监控服务
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket, etc.
      Sentry.captureException(error, { extra: context });
    }
    
    // 本地日志
    logger.error({
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
}
```

## 7. 📚 文档和知识共享

### README 模板
```markdown
## 环境要求
- Node.js: v16, v18, v20
- Electron: v30.5.1
- 平台: Windows 10+, macOS 10.15+, Ubuntu 20.04+

## 快速开始
1. 克隆仓库
2. 安装依赖: `npm install`
3. 环境检查: `npm run prestart`
4. 运行测试: `npm run test:all`
5. 启动应用: `npm start`

## 故障排除
### better-sqlite3 错误
- Windows: `npm run rebuild:win`
- macOS: `npm run rebuild:mac`
- Linux: `npm run rebuild:linux`
```

## 总结

避免"测试通过但运行失败"的关键是：

1. **不要只依赖单元测试** - 添加集成测试和 E2E 测试
2. **环境一致性** - 使用 Docker 或虚拟机
3. **早期检测** - 启动前检查，CI/CD 流水线
4. **渐进式降级** - 有备用方案
5. **持续监控** - 错误追踪和日志
6. **知识共享** - 文档化常见问题

记住：**测试不是为了证明代码工作，而是为了发现它不工作的情况。**