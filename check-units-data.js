/**
 * 检查单位数据的脚本
 */

const fs = require('fs');
const path = require('path');

// 检查数据库文件是否存在
const dbPath = path.join(__dirname, 'data', 'inventory.db');
console.log('数据库文件路径:', dbPath);
console.log('数据库文件是否存在:', fs.existsSync(dbPath));

if (fs.existsSync(dbPath)) {
  const stats = fs.statSync(dbPath);
  console.log('数据库文件大小:', stats.size, 'bytes');
  console.log('数据库文件修改时间:', stats.mtime);
}

// 检查mock-data.sql文件
const mockDataPath = path.join(__dirname, 'mock-data.sql');
console.log('\nmock-data.sql文件是否存在:', fs.existsSync(mockDataPath));

if (fs.existsSync(mockDataPath)) {
  const mockData = fs.readFileSync(mockDataPath, 'utf8');
  
  // 检查是否包含单位数据
  const hasUnitsData = mockData.includes('INSERT INTO units');
  console.log('mock-data.sql包含单位数据:', hasUnitsData);
  
  if (hasUnitsData) {
    // 统计单位数据行数
    const unitLines = mockData.split('\n').filter(line => 
      line.includes("('unit-") && line.includes("INSERT INTO units") === false
    );
    console.log('单位数据行数:', unitLines.length);
    
    // 显示前几个单位数据示例
    console.log('\n前5个单位数据示例:');
    unitLines.slice(0, 5).forEach((line, index) => {
      const match = line.match(/'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/);
      if (match) {
        console.log(`${index + 1}. ID: ${match[1]}, 名称: ${match[2]}, 符号: ${match[3]}, 类型: ${match[4]}`);
      }
    });
  }
}

// 检查单位服务文件
const unitServicePath = path.join(__dirname, 'src', 'services', 'business', 'unitService.ts');
console.log('\n单位服务文件是否存在:', fs.existsSync(unitServicePath));

// 检查单位管理组件
const unitManagementPath = path.join(__dirname, 'src', 'components', 'Settings', 'UnitManagement.tsx');
console.log('单位管理组件是否存在:', fs.existsSync(unitManagementPath));

// 检查数据库处理器
const unitHandlerPath = path.join(__dirname, 'public', 'database', 'handlers', 'unitHandlers.js');
console.log('单位数据库处理器是否存在:', fs.existsSync(unitHandlerPath));

console.log('\n=== 检查完成 ===');
console.log('建议操作:');
console.log('1. 启动应用程序');
console.log('2. 导航到侧边栏的"单位管理"');
console.log('3. 如果页面显示"暂无单位数据"，点击"重新导入单位"按钮');
console.log('4. 检查是否显示了预期的单位数据');
