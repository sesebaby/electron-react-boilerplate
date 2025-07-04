// 快速诊断脚本
const fs = require('fs');
const path = require('path');

console.log('🔍 项目诊断开始...\n');

// 检查关键文件
const criticalFiles = [
  'src/App.tsx',
  'src/components/MinimalDashboard.tsx',
  'src/services/dashboard/minimalDashboardService.ts',
  'src/globals.css',
  'public/index.html',
  'webpack.config.js'
];

console.log('📁 检查关键文件:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n📦 检查package.json配置:');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
console.log(`  名称: ${packageJson.name}`);
console.log(`  版本: ${packageJson.version}`);
console.log(`  主文件: ${packageJson.main}`);
console.log(`  脚本数量: ${Object.keys(packageJson.scripts).length}`);

console.log('\n🎯 检查构建输出:');
const distExists = fs.existsSync(path.join(__dirname, 'dist'));
console.log(`  dist目录: ${distExists ? '✅' : '❌'}`);

if (distExists) {
  const distFiles = fs.readdirSync(path.join(__dirname, 'dist'));
  console.log(`  构建文件: ${distFiles.join(', ')}`);
}

console.log('\n📋 当前App.tsx内容摘要:');
try {
  const appContent = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8');
  const lines = appContent.split('\n');
  console.log(`  总行数: ${lines.length}`);
  console.log(`  导入的组件: ${appContent.match(/import.*from/g)?.length || 0}`);
  console.log(`  useState使用: ${appContent.includes('useState') ? '✅' : '❌'}`);
  console.log(`  MinimalDashboard: ${appContent.includes('MinimalDashboard') ? '✅' : '❌'}`);
} catch (error) {
  console.log(`  ❌ 无法读取App.tsx: ${error.message}`);
}

console.log('\n🚀 诊断完成！');
console.log('现在可以运行 "npm start" 启动应用程序');
console.log('如果遇到空白页面，请在浏览器按 F12 查看控制台错误信息');