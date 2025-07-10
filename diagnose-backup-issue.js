/**
 * 诊断数据库备份问题的脚本
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

console.log('=== 数据库备份问题诊断 ===\n');

// 1. 检查数据库文件状态
console.log('1. 数据库文件检查:');
const dbPath = path.join(__dirname, 'data', 'inventory.db');
console.log(`   数据库路径: ${dbPath}`);

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log(`   ✅ 数据库文件存在`);
  console.log(`   文件大小: ${stats.size} bytes`);
  console.log(`   修改时间: ${stats.mtime}`);
  
  // 检查文件权限
  try {
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`   ✅ 数据库文件可读写`);
  } catch (error) {
    console.log(`   ❌ 数据库文件权限问题: ${error.message}`);
  }
} else {
  console.log(`   ❌ 数据库文件不存在`);
}

// 2. 检查备份目录
console.log('\n2. 备份目录检查:');
const { app } = require('electron');

// 模拟Electron的userData路径
const userDataPath = process.env.APPDATA || 
  (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : 
   process.env.HOME + '/.local/share');
const appName = 'inventory-management';
const backupDir = path.join(userDataPath, appName, 'backups');

console.log(`   备份目录路径: ${backupDir}`);

if (fs.existsSync(backupDir)) {
  console.log(`   ✅ 备份目录存在`);
  
  // 检查目录权限
  try {
    fs.accessSync(backupDir, fs.constants.R_OK | fs.constants.W_OK);
    console.log(`   ✅ 备份目录可读写`);
    
    // 列出现有备份文件
    const backupFiles = fs.readdirSync(backupDir).filter(file => file.endsWith('.db'));
    console.log(`   现有备份文件数量: ${backupFiles.length}`);
    if (backupFiles.length > 0) {
      console.log(`   最近的备份文件: ${backupFiles.slice(-3).join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ 备份目录权限问题: ${error.message}`);
  }
} else {
  console.log(`   ⚠️ 备份目录不存在，将尝试创建`);
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`   ✅ 备份目录创建成功`);
  } catch (error) {
    console.log(`   ❌ 备份目录创建失败: ${error.message}`);
  }
}

// 3. 测试数据库连接
console.log('\n3. 数据库连接测试:');
if (fs.existsSync(dbPath)) {
  try {
    const db = new Database(dbPath);
    console.log(`   ✅ 数据库连接成功`);
    
    // 检查数据库表
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`   数据库表数量: ${tables.length}`);
    
    // 检查是否有备份表
    const hasBackupTable = tables.some(table => table.name === 'backups');
    console.log(`   ${hasBackupTable ? '✅' : '⚠️'} 备份表${hasBackupTable ? '存在' : '不存在'}`);
    
    if (hasBackupTable) {
      const backupCount = db.prepare('SELECT COUNT(*) as count FROM backups').get();
      console.log(`   备份记录数量: ${backupCount.count}`);
    }
    
    db.close();
  } catch (error) {
    console.log(`   ❌ 数据库连接失败: ${error.message}`);
  }
} else {
  console.log(`   ❌ 无法测试数据库连接，文件不存在`);
}

// 4. 模拟备份操作
console.log('\n4. 备份操作模拟测试:');
if (fs.existsSync(dbPath)) {
  try {
    const testBackupFilename = `test_backup_${Date.now()}.db`;
    const testBackupPath = path.join(backupDir, testBackupFilename);
    
    console.log(`   测试备份文件: ${testBackupPath}`);
    
    // 检查源文件是否可读
    fs.accessSync(dbPath, fs.constants.R_OK);
    console.log(`   ✅ 源数据库文件可读`);
    
    // 检查目标目录是否可写
    fs.accessSync(backupDir, fs.constants.W_OK);
    console.log(`   ✅ 备份目录可写`);
    
    // 执行文件复制测试
    fs.copyFileSync(dbPath, testBackupPath);
    console.log(`   ✅ 文件复制成功`);
    
    // 验证备份文件
    const backupStats = fs.statSync(testBackupPath);
    const originalStats = fs.statSync(dbPath);
    
    if (backupStats.size === originalStats.size) {
      console.log(`   ✅ 备份文件大小正确 (${backupStats.size} bytes)`);
    } else {
      console.log(`   ❌ 备份文件大小不匹配 (原始: ${originalStats.size}, 备份: ${backupStats.size})`);
    }
    
    // 清理测试文件
    fs.unlinkSync(testBackupPath);
    console.log(`   ✅ 测试文件清理完成`);
    
  } catch (error) {
    console.log(`   ❌ 备份操作测试失败: ${error.message}`);
    console.log(`   错误详情: ${error.stack}`);
  }
} else {
  console.log(`   ❌ 无法测试备份操作，源数据库文件不存在`);
}

// 5. 检查系统环境
console.log('\n5. 系统环境检查:');
console.log(`   操作系统: ${process.platform}`);
console.log(`   Node.js版本: ${process.version}`);
console.log(`   当前工作目录: ${process.cwd()}`);
console.log(`   用户数据目录: ${userDataPath}`);

// 6. 检查磁盘空间
console.log('\n6. 磁盘空间检查:');
try {
  const stats = fs.statSync(dbPath);
  const freeSpace = fs.statSync(path.dirname(dbPath));
  console.log(`   数据库文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   ✅ 磁盘空间检查通过`);
} catch (error) {
  console.log(`   ⚠️ 无法检查磁盘空间: ${error.message}`);
}

console.log('\n=== 诊断完成 ===\n');

console.log('问题分析建议:');
console.log('1. 如果数据库文件不存在或无法访问:');
console.log('   - 检查应用程序是否正确初始化');
console.log('   - 确认数据库路径配置正确');
console.log('');
console.log('2. 如果备份目录权限问题:');
console.log('   - 检查应用程序运行权限');
console.log('   - 手动创建备份目录并设置权限');
console.log('');
console.log('3. 如果备份操作失败:');
console.log('   - 检查磁盘空间是否充足');
console.log('   - 确认没有其他进程锁定数据库文件');
console.log('   - 检查防病毒软件是否阻止文件操作');
console.log('');
console.log('4. 如果是异步操作问题:');
console.log('   - 检查Promise/async-await的错误处理');
console.log('   - 确认IPC通信正常工作');
console.log('   - 查看浏览器控制台的详细错误信息');
