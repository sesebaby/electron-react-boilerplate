/**
 * 启动前环境检查脚本
 * 确保所有依赖和配置正确
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 执行启动前检查...\n');

let hasError = false;

// 1. 检查 Node.js 版本
console.log('1. 检查 Node.js 版本...');
const nodeVersion = process.version;
console.log(`   当前版本: ${nodeVersion}`);
if (!nodeVersion.match(/^v(16|18|20)\./)) {
  console.error('   ❌ Node.js 版本不兼容，需要 v16、v18 或 v20');
  hasError = true;
} else {
  console.log('   ✅ Node.js 版本正确');
}

// 2. 检查 Electron 是否安装
console.log('\n2. 检查 Electron...');
try {
  const electronPath = require('electron');
  console.log(`   ✅ Electron 已安装: ${electronPath}`);
} catch (e) {
  console.error('   ❌ Electron 未安装');
  hasError = true;
}

// 3. 检查 better-sqlite3 原生模块
console.log('\n3. 检查 better-sqlite3...');
try {
  const Database = require('better-sqlite3');
  const testDb = new Database(':memory:');
  testDb.close();
  console.log('   ✅ better-sqlite3 正常工作');
} catch (e) {
  console.error('   ❌ better-sqlite3 加载失败:', e.message);
  console.log('   尝试重新编译...');
  try {
    execSync('npm rebuild better-sqlite3 --runtime=electron --target=30.5.1', { stdio: 'inherit' });
    console.log('   ✅ 重新编译成功');
  } catch (rebuildError) {
    console.error('   ❌ 重新编译失败');
    hasError = true;
  }
}

// 4. 检查必要的目录
console.log('\n4. 检查目录结构...');
const requiredDirs = [
  'dist',
  'public',
  'src',
  'public/database'
];

requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir} 存在`);
  } else {
    console.error(`   ❌ ${dir} 不存在`);
    hasError = true;
  }
});

// 5. 检查关键文件
console.log('\n5. 检查关键文件...');
const requiredFiles = [
  'public/main.js',
  'public/preload.js',
  'public/database/index.js'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} 存在`);
  } else {
    console.error(`   ❌ ${file} 不存在`);
    hasError = true;
  }
});

// 6. 检查环境变量
console.log('\n6. 检查环境变量...');
const requiredEnvVars = ['NODE_ENV'];
const optionalEnvVars = ['DATABASE_PATH', 'LOG_LEVEL'];

requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`   ✅ ${envVar}: ${process.env[envVar]}`);
  } else {
    console.log(`   ⚠️  ${envVar} 未设置（将使用默认值）`);
  }
});

// 7. 检查数据库可写性
console.log('\n7. 检查数据库目录权限...');
const appDataPath = process.env.APPDATA || 
                   (process.platform === 'darwin' 
                     ? path.join(process.env.HOME, 'Library', 'Application Support')
                     : path.join(process.env.HOME, '.config'));
const dbDir = path.join(appDataPath, 'inventory-management');

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // 测试写入权限
  const testFile = path.join(dbDir, '.test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`   ✅ 数据库目录可写: ${dbDir}`);
} catch (e) {
  console.error(`   ❌ 数据库目录不可写: ${dbDir}`);
  hasError = true;
}

// 8. 检查端口占用（如果使用开发服务器）
console.log('\n8. 检查端口...');
const checkPort = (port) => {
  try {
    execSync(`netstat -an | findstr :${port}`, { encoding: 'utf8' });
    return true;
  } catch (e) {
    return false;
  }
};

const devPort = 3000;
if (checkPort(devPort)) {
  console.log(`   ⚠️  端口 ${devPort} 已被占用`);
} else {
  console.log(`   ✅ 端口 ${devPort} 可用`);
}

// 总结
console.log('\n' + '='.repeat(50));
if (hasError) {
  console.error('\n❌ 检查失败！请解决以上问题后再启动应用。');
  process.exit(1);
} else {
  console.log('\n✅ 所有检查通过！可以启动应用。');
}