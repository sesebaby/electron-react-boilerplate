/**
 * better-sqlite3 兼容性测试用例
 * 
 * 目的：防止 better-sqlite3 编译问题再次发生
 * 错误ID：better-sqlite3-compilation-error-20250713
 * 
 * 测试内容：
 * 1. 验证 better-sqlite3 模块是否正确加载
 * 2. 检查模块版本兼容性
 * 3. 验证基本数据库操作
 * 4. 检查 Electron 环境兼容性
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 开始 better-sqlite3 兼容性检查...\n');

// 测试1: 模块加载检查
function testModuleLoading() {
    console.log('1. 测试模块加载...');
    try {
        const Database = require('better-sqlite3');
        console.log('   ✅ better-sqlite3 模块加载成功');
        return { success: true, Database };
    } catch (error) {
        console.log('   ❌ better-sqlite3 模块加载失败:', error.message);
        return { success: false, error };
    }
}

// 测试2: 版本兼容性检查
function testVersionCompatibility() {
    console.log('2. 测试版本兼容性...');
    try {
        const packageJson = require('../package.json');
        const sqliteVersion = packageJson.dependencies['better-sqlite3'];
        console.log(`   📦 项目中的 better-sqlite3 版本: ${sqliteVersion}`);
        
        const nodeVersion = process.version;
        console.log(`   📦 当前 Node.js 版本: ${nodeVersion}`);
        
        // 检查是否为预编译版本（没有编译错误通常意味着使用了预编译版本）
        const packagePath = path.join(__dirname, '../node_modules/better-sqlite3/package.json');
        if (fs.existsSync(packagePath)) {
            console.log('   ✅ better-sqlite3 包已安装');
        } else {
            console.log('   ❌ better-sqlite3 包未找到');
            return { success: false };
        }
        
        return { success: true };
    } catch (error) {
        console.log('   ❌ 版本兼容性检查失败:', error.message);
        return { success: false, error };
    }
}

// 测试3: 基本数据库操作
function testBasicOperations(Database) {
    console.log('3. 测试基本数据库操作...');
    try {
        const tempDbPath = path.join(__dirname, 'temp_test.db');
        
        // 创建内存数据库避免文件权限问题
        const db = new Database(':memory:');
        
        // 创建测试表
        db.exec(`
            CREATE TABLE test_table (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 插入测试数据
        const insert = db.prepare('INSERT INTO test_table (name) VALUES (?)');
        insert.run('test_record');
        
        // 查询测试数据
        const select = db.prepare('SELECT * FROM test_table WHERE name = ?');
        const result = select.get('test_record');
        
        if (result && result.name === 'test_record') {
            console.log('   ✅ 基本数据库操作测试通过');
            db.close();
            return { success: true };
        } else {
            console.log('   ❌ 数据查询结果不正确');
            db.close();
            return { success: false };
        }
        
    } catch (error) {
        console.log('   ❌ 基本数据库操作失败:', error.message);
        return { success: false, error };
    }
}

// 测试4: Electron 环境兼容性检查
function testElectronCompatibility() {
    console.log('4. 测试 Electron 环境兼容性...');
    try {
        // 检查是否在 Electron 环境中
        const isElectron = process.versions.electron !== undefined;
        
        if (isElectron) {
            console.log(`   🔋 运行在 Electron 环境中，版本: ${process.versions.electron}`);
            console.log(`   📦 Electron 内置 Node.js 版本: ${process.versions.node}`);
        } else {
            console.log('   💻 运行在标准 Node.js 环境中');
        }
        
        // 检查原生模块版本匹配
        if (process.versions.modules) {
            console.log(`   🔧 NODE_MODULE_VERSION: ${process.versions.modules}`);
        }
        
        console.log('   ✅ 环境兼容性检查完成');
        return { success: true, isElectron };
        
    } catch (error) {
        console.log('   ❌ 环境兼容性检查失败:', error.message);
        return { success: false, error };
    }
}

// 主测试函数
function runCompatibilityTest() {
    console.log('='.repeat(60));
    console.log('🧪 better-sqlite3 兼容性测试套件');
    console.log('='.repeat(60));
    
    const results = [];
    
    // 执行所有测试
    const moduleTest = testModuleLoading();
    results.push({ name: '模块加载', ...moduleTest });
    
    const versionTest = testVersionCompatibility();
    results.push({ name: '版本兼容性', ...versionTest });
    
    if (moduleTest.success && moduleTest.Database) {
        const operationTest = testBasicOperations(moduleTest.Database);
        results.push({ name: '基本操作', ...operationTest });
    } else {
        results.push({ name: '基本操作', success: false, error: '模块加载失败，跳过测试' });
    }
    
    const electronTest = testElectronCompatibility();
    results.push({ name: 'Electron 兼容性', ...electronTest });
    
    // 生成测试报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果总结');
    console.log('='.repeat(60));
    
    let passedTests = 0;
    let totalTests = results.length;
    
    results.forEach((result, index) => {
        const status = result.success ? '✅ 通过' : '❌ 失败';
        console.log(`${index + 1}. ${result.name}: ${status}`);
        
        if (!result.success && result.error) {
            console.log(`   错误详情: ${result.error.message || result.error}`);
        }
        
        if (result.success) passedTests++;
    });
    
    console.log('\n' + '-'.repeat(40));
    console.log(`总测试数: ${totalTests}`);
    console.log(`通过数: ${passedTests}`);
    console.log(`失败数: ${totalTests - passedTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 所有测试通过！better-sqlite3 配置正确。');
        process.exit(0);
    } else {
        console.log('\n⚠️  存在失败的测试，请检查 better-sqlite3 配置。');
        console.log('\n💡 建议执行以下命令修复：');
        console.log('   npm uninstall better-sqlite3');
        console.log('   npm install better-sqlite3 --build-from-source=false');
        process.exit(1);
    }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
    runCompatibilityTest();
}

module.exports = {
    runCompatibilityTest,
    testModuleLoading,
    testVersionCompatibility,
    testBasicOperations,
    testElectronCompatibility
};