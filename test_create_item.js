// 测试创建物品功能
const { ipcRenderer } = require('electron');

async function testCreateItem() {
  try {
    console.log('测试创建物品...');
    
    const newItem = {
      name: "测试商品",
      sku: "TEST-" + Date.now(),
      categoryId: "cat-001",  // 使用 categoryId
      unitId: "unit-001",
      purchasePrice: 50,
      salePrice: 80,
      minStock: 10,
      maxStock: 100,
      status: "active"
    };
    
    console.log('发送数据:', JSON.stringify(newItem, null, 2));
    
    const result = await ipcRenderer.invoke('db-create-item', newItem);
    
    if (result.success) {
      console.log('✓ 创建成功!');
      console.log('创建的物品:', JSON.stringify(result.data, null, 2));
    } else {
      console.error('✗ 创建失败:', result.error);
    }
  } catch (error) {
    console.error('测试出错:', error);
  }
}

// 如果在渲染进程中运行
if (typeof window !== 'undefined') {
  window.testCreateItem = testCreateItem;
  console.log('测试函数已挂载到 window.testCreateItem()');
}

module.exports = { testCreateItem };