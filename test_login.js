const { ipcRenderer } = require('electron');

// 模拟登录测试
async function testLogin() {
  try {
    console.log('开始测试登录...');
    
    // 首先尝试认证用户
    const authResult = await ipcRenderer.invoke('db-authenticate-user', 'admin', '123456');
    console.log('认证结果:', authResult);
    
    if (authResult.success) {
      console.log('✅ 登录成功！');
      console.log('用户信息:', authResult.data);
    } else {
      console.log('❌ 登录失败:', authResult.error);
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 如果这个脚本在渲染进程中运行
if (typeof window !== 'undefined' && window.electronAPI) {
  testLogin();
}