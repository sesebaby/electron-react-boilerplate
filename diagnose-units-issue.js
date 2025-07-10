/**
 * 诊断单位管理问题的脚本
 */

const fs = require('fs');
const path = require('path');

console.log('=== 单位管理模块诊断报告 ===\n');

// 1. 检查文件结构
console.log('1. 文件结构检查:');
const files = [
  { path: 'data/inventory.db', desc: '数据库文件' },
  { path: 'mock-data.sql', desc: 'Mock数据文件' },
  { path: 'src/services/business/unitService.ts', desc: '单位服务' },
  { path: 'src/components/Settings/UnitManagement.tsx', desc: '单位管理组件' },
  { path: 'public/database/handlers/unitHandlers.js', desc: '单位数据库处理器' },
  { path: 'src/components/System/UnitManagementTab.tsx', desc: '单位管理标签组件' }
];

files.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file.path));
  console.log(`   ${exists ? '✅' : '❌'} ${file.desc}: ${file.path}`);
});

// 2. 检查mock-data.sql中的单位数据
console.log('\n2. Mock数据检查:');
const mockDataPath = path.join(__dirname, 'mock-data.sql');
if (fs.existsSync(mockDataPath)) {
  const mockData = fs.readFileSync(mockDataPath, 'utf8');
  
  // 检查单位数据
  const unitInsertMatch = mockData.match(/INSERT INTO units[\s\S]*?(?=(?:INSERT INTO \w+|$))/);
  if (unitInsertMatch) {
    const unitLines = unitInsertMatch[0].split('\n').filter(line => 
      line.trim().startsWith("('unit-")
    );
    console.log(`   ✅ 找到 ${unitLines.length} 个单位数据定义`);
    
    // 分析单位类型
    const types = {};
    unitLines.forEach(line => {
      const match = line.match(/'([^']+)',\s*'[^']+',\s*'[^']+',\s*'([^']+)'/);
      if (match) {
        const type = match[2];
        types[type] = (types[type] || 0) + 1;
      }
    });
    
    console.log('   单位类型分布:');
    Object.entries(types).forEach(([type, count]) => {
      const typeName = {
        'quantity': '数量',
        'weight': '重量', 
        'length': '长度',
        'volume': '体积',
        'area': '面积',
        'time': '时间'
      }[type] || type;
      console.log(`     - ${typeName}: ${count}个`);
    });
  } else {
    console.log('   ❌ 未找到单位数据定义');
  }
  
  // 检查转换规则数据
  const conversionMatch = mockData.match(/INSERT INTO global_conversion_rules[\s\S]*?(?=(?:INSERT INTO \w+|$))/);
  if (conversionMatch) {
    const conversionLines = conversionMatch[0].split('\n').filter(line => 
      line.trim().startsWith("('rule-")
    );
    console.log(`   ✅ 找到 ${conversionLines.length} 个转换规则定义`);
  }
} else {
  console.log('   ❌ mock-data.sql文件不存在');
}

// 3. 检查路由配置
console.log('\n3. 路由配置检查:');
const pageContainerPath = path.join(__dirname, 'src/components/PageContainer.tsx');
if (fs.existsSync(pageContainerPath)) {
  const pageContainer = fs.readFileSync(pageContainerPath, 'utf8');
  const hasUnitsRoute = pageContainer.includes("'units': UnitManagement");
  const hasConversionRoute = pageContainer.includes("'conversion-rules': ConversionRulesManagement");
  
  console.log(`   ${hasUnitsRoute ? '✅' : '❌'} 单位管理路由: 'units'`);
  console.log(`   ${hasConversionRoute ? '✅' : '❌'} 转换规则路由: 'conversion-rules'`);
} else {
  console.log('   ❌ PageContainer.tsx文件不存在');
}

// 4. 检查侧边栏导航
console.log('\n4. 侧边栏导航检查:');
const sidebarPath = path.join(__dirname, 'src/components/Layout/Sidebar.tsx');
if (fs.existsSync(sidebarPath)) {
  const sidebar = fs.readFileSync(sidebarPath, 'utf8');
  const hasUnitsNav = sidebar.includes("{ id: 'units', label: '单位管理'");
  const hasConversionNav = sidebar.includes("{ id: 'conversion-rules', label: '换算规则'");
  
  console.log(`   ${hasUnitsNav ? '✅' : '❌'} 单位管理导航链接`);
  console.log(`   ${hasConversionNav ? '✅' : '❌'} 换算规则导航链接`);
} else {
  console.log('   ❌ Sidebar.tsx文件不存在');
}

// 5. 检查服务注册
console.log('\n5. 服务注册检查:');
const containerConfigPath = path.join(__dirname, 'src/services/container/containerConfig.ts');
if (fs.existsSync(containerConfigPath)) {
  const containerConfig = fs.readFileSync(containerConfigPath, 'utf8');
  const hasUnitService = containerConfig.includes('SERVICE_TOKENS.UnitService');
  const hasConversionService = containerConfig.includes('SERVICE_TOKENS.GlobalConversionService');
  
  console.log(`   ${hasUnitService ? '✅' : '❌'} UnitService 注册`);
  console.log(`   ${hasConversionService ? '✅' : '❌'} GlobalConversionService 注册`);
} else {
  console.log('   ❌ containerConfig.ts文件不存在');
}

console.log('\n=== 诊断完成 ===\n');

console.log('问题分析和解决方案:');
console.log('1. 如果所有文件都存在但单位管理页面显示"暂无单位数据":');
console.log('   - 可能是数据库中没有单位数据');
console.log('   - 解决方案: 在单位管理页面点击"重新导入单位"按钮');
console.log('');
console.log('2. 如果无法访问单位管理页面:');
console.log('   - 检查侧边栏是否有"单位管理"链接');
console.log('   - 检查URL是否为 #units');
console.log('');
console.log('3. 如果服务初始化失败:');
console.log('   - 检查浏览器控制台是否有错误信息');
console.log('   - 检查网络请求是否正常');
console.log('');
console.log('建议测试步骤:');
console.log('1. 启动应用: npm run electron:dev');
console.log('2. 登录系统');
console.log('3. 点击侧边栏"通用设置" -> "单位管理"');
console.log('4. 如果显示空数据，点击"重新导入单位"');
console.log('5. 验证是否显示41个单位数据');
