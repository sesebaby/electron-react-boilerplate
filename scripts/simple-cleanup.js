#!/usr/bin/env node

// 简化的数据清理脚本
// 直接删除数据库文件，让应用重新创建

const path = require('path');
const fs = require('fs');
const os = require('os');

// 获取可能的数据库路径
function getElectronUserDataPath() {
  const appName = 'inventory-management';
  
  if (process.platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Roaming', appName);
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName);
  } else {
    return path.join(os.homedir(), '.config', appName);
  }
}

const POSSIBLE_DB_PATHS = [
  path.join(getElectronUserDataPath(), 'inventory.db'),
  path.join(process.cwd(), 'data', 'inventory.db'),
  path.join(process.cwd(), 'inventory.db')
];

function findAndDeleteDatabases() {
  const deletedFiles = [];
  const errors = [];

  console.log('🔍 搜索数据库文件...');
  
  for (const dbPath of POSSIBLE_DB_PATHS) {
    try {
      if (fs.existsSync(dbPath)) {
        console.log(`找到数据库文件: ${dbPath}`);
        
        // 备份文件
        const backupPath = `${dbPath}.backup.${Date.now()}`;
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ 已备份到: ${backupPath}`);
        
        // 删除原文件
        fs.unlinkSync(dbPath);
        console.log(`🗑️  已删除: ${dbPath}`);
        
        deletedFiles.push({
          original: dbPath,
          backup: backupPath
        });
      } else {
        console.log(`❌ 文件不存在: ${dbPath}`);
      }
    } catch (error) {
      const errorMsg = `处理文件 ${dbPath} 时出错: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  return { deletedFiles, errors };
}

function createEmptyDatabase() {
  console.log('📝 创建空的数据目录...');
  
  try {
    // 创建项目数据目录
    const projectDataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(projectDataDir)) {
      fs.mkdirSync(projectDataDir, { recursive: true });
      console.log(`✅ 创建目录: ${projectDataDir}`);
    }

    // 创建Electron用户数据目录
    const electronDataDir = getElectronUserDataPath();
    if (!fs.existsSync(electronDataDir)) {
      fs.mkdirSync(electronDataDir, { recursive: true });
      console.log(`✅ 创建目录: ${electronDataDir}`);
    }

    return true;
  } catch (error) {
    console.error(`创建目录时出错: ${error.message}`);
    return false;
  }
}

function generateReport(deletedFiles, errors) {
  const report = [
    '📊 数据清理报告',
    '='.repeat(50),
    '',
    `清理时间: ${new Date().toLocaleString()}`,
    `清理方式: 删除数据库文件`,
    '',
    `已删除的数据库文件 (${deletedFiles.length}):`,
    ...deletedFiles.map(file => `  ✅ ${file.original}`),
    '',
    `备份文件位置:`,
    ...deletedFiles.map(file => `  💾 ${file.backup}`),
    ''
  ];

  if (errors.length > 0) {
    report.push(`错误信息 (${errors.length}):`);
    report.push(...errors.map(error => `  ❌ ${error}`));
    report.push('');
  }

  report.push('说明:');
  report.push('  - 所有业务数据已通过删除数据库文件的方式清除');
  report.push('  - 原数据库文件已备份，如需恢复可使用备份文件');
  report.push('  - 应用程序下次启动时将创建新的空数据库');
  report.push('  - 基础配置数据需要重新设置');
  report.push('');
  report.push('下一步:');
  report.push('  1. 启动应用程序以创建新的数据库');
  report.push('  2. 重新设置基础配置数据（用户、分类、单位等）');
  report.push('  3. 开始数据流程测试');

  return report.join('\n');
}

async function main() {
  console.log('🚀 启动简化数据清理脚本...');
  console.log('⚠️  警告: 此操作将删除整个数据库文件');
  console.log('');

  try {
    // 查找并删除数据库文件
    const { deletedFiles, errors } = findAndDeleteDatabases();
    
    // 创建空目录
    const dirCreated = createEmptyDatabase();
    
    // 生成报告
    const report = generateReport(deletedFiles, errors);
    console.log('');
    console.log(report);
    
    // 保存报告
    const reportPath = path.join(process.cwd(), 'simple-cleanup-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`📄 清理报告已保存到: ${reportPath}`);
    
    // 判断成功状态
    if (deletedFiles.length > 0 && errors.length === 0 && dirCreated) {
      console.log('');
      console.log('🎉 数据清理成功完成！');
      console.log('💡 提示: 请启动应用程序以创建新的数据库');
      process.exit(0);
    } else if (deletedFiles.length === 0 && errors.length === 0) {
      console.log('');
      console.log('ℹ️  没有找到需要清理的数据库文件');
      console.log('💡 提示: 数据库可能已经是空的，或者使用了不同的路径');
      process.exit(0);
    } else {
      console.log('');
      console.log('⚠️  数据清理部分成功，请检查报告');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 数据清理脚本执行失败:', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { main };
