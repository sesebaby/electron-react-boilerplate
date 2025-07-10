// 这个脚本需要在Electron应用中运行
// 可以通过开发者控制台执行

async function fixDatabase() {
  console.log('开始修复数据库...');
  
  try {
    // 1. 添加分类数据
    console.log('1. 添加商品分类数据...');
    
    const categories = [
      { id: 'cat-001', name: '电子产品', description: '电子设备和配件', parent_id: null },
      { id: 'cat-002', name: '办公用品', description: '办公室日常用品', parent_id: null },
      { id: 'cat-003', name: '食品饮料', description: '食品和饮料类商品', parent_id: null },
      { id: 'cat-004', name: '服装鞋帽', description: '服装、鞋子、帽子等', parent_id: null },
      { id: 'cat-005', name: '家居用品', description: '家庭日用品', parent_id: null },
      { id: 'cat-006', name: '手机数码', description: '手机和数码产品', parent_id: 'cat-001' },
      { id: 'cat-007', name: '电脑配件', description: '电脑及其配件', parent_id: 'cat-001' },
      { id: 'cat-008', name: '文具用品', description: '笔、纸张等文具', parent_id: 'cat-002' },
      { id: 'cat-009', name: '办公设备', description: '打印机、复印机等', parent_id: 'cat-002' },
      { id: 'cat-010', name: '零食小食', description: '各类零食', parent_id: 'cat-003' }
    ];
    
    // 使用原始SQL执行
    for (const cat of categories) {
      const query = `
        INSERT OR IGNORE INTO categories (id, name, description, parent_id, created_at, updated_at) 
        VALUES ('${cat.id}', '${cat.name}', '${cat.description}', ${cat.parent_id ? `'${cat.parent_id}'` : 'NULL'}, datetime('now'), datetime('now'))
      `;
      
      try {
        const result = await window.electronAPI.dbExecuteQuery({ query, params: [] });
        if (result.success) {
          console.log(`   添加分类: ${cat.name}`);
        }
      } catch (err) {
        console.log(`   分类 ${cat.name} 可能已存在`);
      }
    }
    
    // 2. 添加供应商数据
    console.log('2. 添加供应商数据...');
    
    const suppliers = [
      { id: 'sup-001', code: 'SUP001', name: '华为技术有限公司', contact_person: '张经理', phone: '010-12345678', email: 'zhang@huawei.com', address: '深圳市龙岗区华为基地' },
      { id: 'sup-002', code: 'SUP002', name: '小米科技有限公司', contact_person: '李经理', phone: '010-87654321', email: 'li@xiaomi.com', address: '北京市海淀区小米科技园' },
      { id: 'sup-003', code: 'SUP003', name: '得力集团有限公司', contact_person: '王经理', phone: '0574-12345678', email: 'wang@deli.com', address: '宁波市鄞州区得力工业园' },
      { id: 'sup-004', code: 'SUP004', name: '联想集团有限公司', contact_person: '赵经理', phone: '010-11223344', email: 'zhao@lenovo.com', address: '北京市海淀区联想大厦' },
      { id: 'sup-005', code: 'SUP005', name: '三只松鼠股份有限公司', contact_person: '钱经理', phone: '0553-55667788', email: 'qian@3songshu.com', address: '安徽省芜湖市三只松鼠总部' }
    ];
    
    for (const sup of suppliers) {
      const query = `
        INSERT OR IGNORE INTO suppliers (id, code, name, contact_person, phone, email, address, created_at, updated_at) 
        VALUES ('${sup.id}', '${sup.code}', '${sup.name}', '${sup.contact_person}', '${sup.phone}', '${sup.email}', '${sup.address}', datetime('now'), datetime('now'))
      `;
      
      try {
        const result = await window.electronAPI.dbExecuteQuery({ query, params: [] });
        if (result.success) {
          console.log(`   添加供应商: ${sup.name}`);
        }
      } catch (err) {
        console.log(`   供应商 ${sup.name} 可能已存在`);
      }
    }
    
    // 3. 检查并添加基础单位数据
    console.log('3. 检查单位数据...');
    
    const unitCheckResult = await window.electronAPI.dbExecuteQuery({ 
      query: 'SELECT COUNT(*) as count FROM units', 
      params: [] 
    });
    
    if (unitCheckResult.success && unitCheckResult.data.rows[0].count === 0) {
      console.log('   单位表为空，添加基础单位数据...');
      
      const basicUnits = [
        { id: 'unit-001', name: '个', symbol: 'pcs', type: 'quantity', precision: 0, description: '个数单位，用于计数商品' },
        { id: 'unit-002', name: '件', symbol: 'piece', type: 'quantity', precision: 0, description: '件数单位，用于计数商品' },
        { id: 'unit-003', name: '套', symbol: 'set', type: 'quantity', precision: 0, description: '套装单位，用于成套商品' },
        { id: 'unit-004', name: '包', symbol: 'pack', type: 'quantity', precision: 0, description: '包装单位，用于包装商品' },
        { id: 'unit-005', name: '箱', symbol: 'box', type: 'quantity', precision: 0, description: '箱装单位，用于大包装商品' },
        { id: 'unit-006', name: '盒', symbol: 'case', type: 'quantity', precision: 0, description: '盒装单位，用于盒装商品' },
        { id: 'unit-011', name: '克', symbol: 'g', type: 'weight', precision: 2, description: '克重量单位，用于轻量商品' },
        { id: 'unit-012', name: '千克', symbol: 'kg', type: 'weight', precision: 2, description: '千克重量单位，用于重量商品' },
        { id: 'unit-015', name: '厘米', symbol: 'cm', type: 'length', precision: 2, description: '厘米长度单位，用于小尺寸测量' },
        { id: 'unit-016', name: '米', symbol: 'm', type: 'length', precision: 2, description: '米长度单位，用于长度测量' }
      ];
      
      for (const unit of basicUnits) {
        const query = `
          INSERT OR IGNORE INTO units (id, name, symbol, type, precision, description, is_active, created_at, updated_at) 
          VALUES ('${unit.id}', '${unit.name}', '${unit.symbol}', '${unit.type}', ${unit.precision}, '${unit.description}', 1, datetime('now'), datetime('now'))
        `;
        
        try {
          const result = await window.electronAPI.dbExecuteQuery({ query, params: [] });
          if (result.success) {
            console.log(`   添加单位: ${unit.name} (${unit.symbol})`);
          }
        } catch (err) {
          console.log(`   单位 ${unit.name} 添加失败: ${err.message}`);
        }
      }
    } else {
      console.log('   单位数据已存在');
    }
    
    // 4. 添加示例商品数据
    console.log('4. 添加示例商品数据...');
    
    const sampleProducts = [
      {
        id: 'item-001',
        name: 'iPhone 15 Pro',
        description: '苹果iPhone 15 Pro 256GB 深空黑色',
        sku: 'IPHONE15PRO256',
        category: 'cat-006',
        supplier: 'sup-001',
        stockQuantity: 50,
        unitPrice: 8999.00,
        reorderLevel: 10,
        maxStock: 200
      },
      {
        id: 'item-002', 
        name: '小米13 Ultra',
        description: '小米13 Ultra 512GB 陶瓷黑',
        sku: 'MI13ULTRA512',
        category: 'cat-006',
        supplier: 'sup-002',
        stockQuantity: 30,
        unitPrice: 5999.00,
        reorderLevel: 5,
        maxStock: 100
      },
      {
        id: 'item-003',
        name: '得力文具套装',
        description: '得力学生文具套装 包含笔、橡皮、尺子等',
        sku: 'DELI_SET_001',
        category: 'cat-008',
        supplier: 'sup-003',
        stockQuantity: 100,
        unitPrice: 29.90,
        reorderLevel: 20,
        maxStock: 500
      }
    ];
    
    for (const product of sampleProducts) {
      const totalValue = product.stockQuantity * product.unitPrice;
      const query = `
        INSERT OR IGNORE INTO inventory_items (
          id, name, description, sku, category, supplier,
          stock_quantity, reserved_quantity, unit_price, total_value,
          status, location, reorder_level, max_stock,
          last_updated, created_at, updated_at
        ) VALUES (
          '${product.id}', '${product.name}', '${product.description}', '${product.sku}', 
          '${product.category}', '${product.supplier}', ${product.stockQuantity}, 
          0, ${product.unitPrice}, ${totalValue}, 'in-stock', '', 
          ${product.reorderLevel}, ${product.maxStock}, 
          datetime('now'), datetime('now'), datetime('now')
        )
      `;
      
      try {
        const result = await window.electronAPI.dbExecuteQuery({ query, params: [] });
        if (result.success) {
          console.log(`   添加商品: ${product.name}`);
        }
      } catch (err) {
        console.log(`   商品 ${product.name} 可能已存在`);
      }
    }
    
    // 5. 验证修复结果
    console.log('\n=== 修复结果验证 ===');
    
    const categoryResult = await window.electronAPI.dbExecuteQuery({ query: 'SELECT COUNT(*) as count FROM categories', params: [] });
    const supplierResult = await window.electronAPI.dbExecuteQuery({ query: 'SELECT COUNT(*) as count FROM suppliers', params: [] });
    const unitResult = await window.electronAPI.dbExecuteQuery({ query: 'SELECT COUNT(*) as count FROM units', params: [] });
    const productResult = await window.electronAPI.dbExecuteQuery({ query: 'SELECT COUNT(*) as count FROM inventory_items', params: [] });
    
    if (categoryResult.success) console.log(`分类数量: ${categoryResult.data.rows[0].count}`);
    if (supplierResult.success) console.log(`供应商数量: ${supplierResult.data.rows[0].count}`);
    if (unitResult.success) console.log(`单位数量: ${unitResult.data.rows[0].count}`);
    if (productResult.success) console.log(`商品数量: ${productResult.data.rows[0].count}`);
    
    console.log('\n数据库修复完成！现在可以正常创建仓库和商品了。');
    
  } catch (error) {
    console.error('数据库修复失败:', error);
  }
}

// 执行修复
fixDatabase();
