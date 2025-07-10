// 这个脚本需要在Electron应用的开发者控制台中运行

async function reimportMockData() {
  console.log('开始重新导入Mock数据...');
  
  try {
    // 使用系统的重新导入Mock数据功能
    const result = await window.electronAPI.dbImportMockData();
    
    if (result.success) {
      console.log('Mock数据导入成功！');
      
      // 验证导入结果
      console.log('\n=== 验证导入结果 ===');
      
      const categoryResult = await window.electronAPI.dbExecuteQuery({ 
        query: 'SELECT COUNT(*) as count FROM categories', 
        params: [] 
      });
      
      const supplierResult = await window.electronAPI.dbExecuteQuery({ 
        query: 'SELECT COUNT(*) as count FROM suppliers', 
        params: [] 
      });
      
      const unitResult = await window.electronAPI.dbExecuteQuery({ 
        query: 'SELECT COUNT(*) as count FROM units', 
        params: [] 
      });
      
      const productResult = await window.electronAPI.dbExecuteQuery({ 
        query: 'SELECT COUNT(*) as count FROM inventory_items', 
        params: [] 
      });
      
      if (categoryResult.success) {
        console.log(`分类数量: ${categoryResult.data.rows[0].count}`);
      }
      
      if (supplierResult.success) {
        console.log(`供应商数量: ${supplierResult.data.rows[0].count}`);
      }
      
      if (unitResult.success) {
        console.log(`单位数量: ${unitResult.data.rows[0].count}`);
      }
      
      if (productResult.success) {
        console.log(`商品数量: ${productResult.data.rows[0].count}`);
      }
      
      console.log('\n数据导入完成！现在可以正常创建仓库和商品了。');
      console.log('请刷新页面以查看最新数据。');
      
    } else {
      console.error('Mock数据导入失败:', result.error);
      
      // 如果导入失败，尝试手动添加基础数据
      console.log('\n尝试手动添加基础数据...');
      await addBasicData();
    }
    
  } catch (error) {
    console.error('重新导入Mock数据失败:', error);
    
    // 如果导入失败，尝试手动添加基础数据
    console.log('\n尝试手动添加基础数据...');
    await addBasicData();
  }
}

async function addBasicData() {
  console.log('开始手动添加基础数据...');
  
  try {
    // 1. 添加分类数据
    console.log('1. 添加商品分类...');
    const categories = [
      { id: 'cat-001', name: '电子产品', description: '电子设备和配件' },
      { id: 'cat-002', name: '办公用品', description: '办公室日常用品' },
      { id: 'cat-003', name: '食品饮料', description: '食品和饮料类商品' },
      { id: 'cat-006', name: '手机数码', description: '手机和数码产品' },
      { id: 'cat-007', name: '电脑配件', description: '电脑及其配件' },
      { id: 'cat-008', name: '文具用品', description: '笔、纸张等文具' }
    ];
    
    for (const cat of categories) {
      const query = `INSERT OR IGNORE INTO categories (id, name, description, created_at, updated_at) VALUES ('${cat.id}', '${cat.name}', '${cat.description}', datetime('now'), datetime('now'))`;
      try {
        await window.electronAPI.dbExecuteQuery({ query, params: [] });
        console.log(`   添加分类: ${cat.name}`);
      } catch (err) {
        console.log(`   分类 ${cat.name} 可能已存在`);
      }
    }
    
    // 2. 添加供应商数据
    console.log('2. 添加供应商...');
    const suppliers = [
      { id: 'sup-001', code: 'SUP001', name: '华为技术有限公司' },
      { id: 'sup-002', code: 'SUP002', name: '小米科技有限公司' },
      { id: 'sup-003', code: 'SUP003', name: '得力集团有限公司' },
      { id: 'sup-004', code: 'SUP004', name: '联想集团有限公司' }
    ];
    
    for (const sup of suppliers) {
      const query = `INSERT OR IGNORE INTO suppliers (id, code, name, created_at, updated_at) VALUES ('${sup.id}', '${sup.code}', '${sup.name}', datetime('now'), datetime('now'))`;
      try {
        await window.electronAPI.dbExecuteQuery({ query, params: [] });
        console.log(`   添加供应商: ${sup.name}`);
      } catch (err) {
        console.log(`   供应商 ${sup.name} 可能已存在`);
      }
    }
    
    // 3. 添加基础单位数据
    console.log('3. 添加基础单位...');
    const units = [
      { id: 'unit-001', name: '个', symbol: 'pcs', type: 'quantity' },
      { id: 'unit-002', name: '件', symbol: 'piece', type: 'quantity' },
      { id: 'unit-003', name: '套', symbol: 'set', type: 'quantity' },
      { id: 'unit-004', name: '包', symbol: 'pack', type: 'quantity' },
      { id: 'unit-005', name: '箱', symbol: 'box', type: 'quantity' }
    ];
    
    for (const unit of units) {
      const query = `INSERT OR IGNORE INTO units (id, name, symbol, type, precision, is_active, created_at, updated_at) VALUES ('${unit.id}', '${unit.name}', '${unit.symbol}', '${unit.type}', 0, 1, datetime('now'), datetime('now'))`;
      try {
        await window.electronAPI.dbExecuteQuery({ query, params: [] });
        console.log(`   添加单位: ${unit.name} (${unit.symbol})`);
      } catch (err) {
        console.log(`   单位 ${unit.name} 可能已存在`);
      }
    }
    
    console.log('\n基础数据添加完成！');
    
  } catch (error) {
    console.error('手动添加基础数据失败:', error);
  }
}

// 执行重新导入
reimportMockData();
