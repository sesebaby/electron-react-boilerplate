/**
 * 数据库处理器测试验证
 * 用于验证重构后的处理器是否正常工作
 */

const { setupDatabaseHandlers, validateHandlerSetup } = require('./index');

/**
 * 测试数据库处理器设置
 * @param {Object} db - 数据库实例
 * @returns {Object} 测试结果
 */
async function testDatabaseHandlers(db) {
  const testResults = {
    success: true,
    tests: [],
    errors: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // 模拟 IPC 对象
  const mockIpcMain = {
    handlers: new Map(),
    handle: function(channel, handler) {
      this.handlers.set(channel, handler);
    },
    removeHandler: function(channel) {
      this.handlers.delete(channel);
    },
    listenerCount: function(channel) {
      return this.handlers.has(channel) ? 1 : 0;
    }
  };

  try {
    // 测试 1: 设置处理器
    console.log('🧪 Testing handler setup...');
    setupDatabaseHandlers(mockIpcMain, db);
    testResults.tests.push({
      name: 'Handler Setup',
      passed: true,
      message: 'All handlers registered successfully'
    });

    // 测试 2: 验证必需的处理器
    console.log('🧪 Testing required handlers...');
    const validationResult = validateHandlerSetup(mockIpcMain, db);
    testResults.tests.push({
      name: 'Required Handlers Validation',
      passed: validationResult,
      message: validationResult ? 'All required handlers present' : 'Some required handlers missing'
    });

    // 测试 3: 检查处理器数量
    console.log('🧪 Testing handler count...');
    const handlerCount = mockIpcMain.handlers.size;
    const expectedMinCount = 40; // 预期最少处理器数量
    const countTestPassed = handlerCount >= expectedMinCount;
    testResults.tests.push({
      name: 'Handler Count',
      passed: countTestPassed,
      message: `Registered ${handlerCount} handlers (expected >= ${expectedMinCount})`
    });

    // 测试 4: 测试核心处理器
    console.log('🧪 Testing core handlers...');
    const coreHandlers = [
      'db-get-all-items',
      'db-get-all-warehouses',
      'db-get-all-units',
      'db-get-system-status',
      'db-backup'
    ];

    for (const handler of coreHandlers) {
      const exists = mockIpcMain.handlers.has(handler);
      testResults.tests.push({
        name: `Core Handler: ${handler}`,
        passed: exists,
        message: exists ? 'Handler registered' : 'Handler missing'
      });
    }

    // 测试 5: 数据库连接
    console.log('🧪 Testing database connection...');
    const dbConnected = db && db.open !== false;
    testResults.tests.push({
      name: 'Database Connection',
      passed: dbConnected,
      message: dbConnected ? 'Database connected' : 'Database not connected'
    });

    // 如果数据库连接正常，测试基本查询
    if (dbConnected) {
      try {
        const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
        testResults.tests.push({
          name: 'Database Query Test',
          passed: true,
          message: `Database query successful (${result.count} tables)`
        });
      } catch (error) {
        testResults.tests.push({
          name: 'Database Query Test',
          passed: false,
          message: `Database query failed: ${error.message}`
        });
      }
    }

  } catch (error) {
    testResults.success = false;
    testResults.errors.push(error.message);
    console.error('🚨 Test execution failed:', error);
  }

  // 计算测试统计
  testResults.summary.total = testResults.tests.length;
  testResults.summary.passed = testResults.tests.filter(t => t.passed).length;
  testResults.summary.failed = testResults.summary.total - testResults.summary.passed;

  return testResults;
}

/**
 * 生成测试报告
 * @param {Object} results - 测试结果
 */
function generateTestReport(results) {
  console.log('\n📋 Database Handlers Test Report');
  console.log('================================');
  console.log(`✅ Total Tests: ${results.summary.total}`);
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`📊 Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  if (results.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`  - ${test.name}: ${test.message}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n🚨 Errors:');
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
}

/**
 * 运行基准测试
 * @param {Object} db - 数据库实例
 */
async function runBenchmark(db) {
  console.log('\n🏁 Running Performance Benchmark...');
  
  const benchmarks = [];
  
  // 测试数据库查询性能
  if (db) {
    try {
      const start = Date.now();
      const result = db.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
      const end = Date.now();
      
      benchmarks.push({
        name: 'Database Query',
        duration: end - start,
        result: `${result.count} tables`
      });
    } catch (error) {
      benchmarks.push({
        name: 'Database Query',
        duration: -1,
        result: `Error: ${error.message}`
      });
    }
  }
  
  // 测试处理器设置性能
  const mockIpcMain = {
    handlers: new Map(),
    handle: function(channel, handler) { this.handlers.set(channel, handler); },
    removeHandler: function(channel) { this.handlers.delete(channel); },
    listenerCount: function(channel) { return this.handlers.has(channel) ? 1 : 0; }
  };
  
  try {
    const start = Date.now();
    setupDatabaseHandlers(mockIpcMain, db);
    const end = Date.now();
    
    benchmarks.push({
      name: 'Handler Setup',
      duration: end - start,
      result: `${mockIpcMain.handlers.size} handlers`
    });
  } catch (error) {
    benchmarks.push({
      name: 'Handler Setup',
      duration: -1,
      result: `Error: ${error.message}`
    });
  }
  
  console.log('\n📊 Benchmark Results:');
  benchmarks.forEach(bench => {
    const status = bench.duration >= 0 ? '✅' : '❌';
    const duration = bench.duration >= 0 ? `${bench.duration}ms` : 'Failed';
    console.log(`${status} ${bench.name}: ${duration} - ${bench.result}`);
  });
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  const Database = require('better-sqlite3');
  const path = require('path');
  
  // 尝试连接到测试数据库
  const testDbPath = path.join(__dirname, '../../inventory.db');
  let db;
  
  try {
    db = new Database(testDbPath);
    console.log('📁 Connected to test database:', testDbPath);
  } catch (error) {
    console.warn('⚠️  Could not connect to database:', error.message);
    db = null;
  }
  
  // 运行测试
  testDatabaseHandlers(db).then(results => {
    generateTestReport(results);
    return runBenchmark(db);
  }).then(() => {
    if (db) {
      db.close();
      console.log('\n🔒 Database connection closed');
    }
    
    console.log('\n🎉 Test completed successfully!');
  }).catch(error => {
    console.error('🚨 Test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testDatabaseHandlers,
  generateTestReport,
  runBenchmark
};