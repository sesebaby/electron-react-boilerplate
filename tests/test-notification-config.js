// 测试通知配置功能
import { notificationHelper } from '../src/utils/notificationHelper.js';

console.log('=== 通知配置功能测试 ===');

// 1. 测试默认配置
console.log('\n1. 默认配置：');
console.log(notificationHelper.getConfig());

// 2. 测试消息类型过滤
console.log('\n2. 添加不同类型的测试消息：');
notificationHelper.showInfo('测试信息', '这是一条信息消息');
notificationHelper.showSuccess('测试成功', '这是一条成功消息');
notificationHelper.showWarning('测试警告', '这是一条警告消息');
notificationHelper.showError('测试错误', '这是一条错误消息');

console.log('所有消息：', notificationHelper.getRecentNotifications(10));

// 3. 测试只显示重要消息模式
console.log('\n3. 切换到只显示重要消息模式：');
notificationHelper.updateConfig({ showOnlyImportant: true });
console.log('重要消息：', notificationHelper.getRecentNotifications(10));
console.log('未读数量：', notificationHelper.getUnreadCount());

// 4. 测试自定义类型过滤
console.log('\n4. 自定义类型过滤（只显示错误）：');
notificationHelper.updateConfig({ 
  showOnlyImportant: false, 
  enabledTypes: ['error'] 
});
console.log('只显示错误：', notificationHelper.getRecentNotifications(10));

// 5. 测试类型检查
console.log('\n5. 类型启用状态检查：');
console.log('info启用：', notificationHelper.isTypeEnabled('info'));
console.log('warning启用：', notificationHelper.isTypeEnabled('warning'));
console.log('error启用：', notificationHelper.isTypeEnabled('error'));
console.log('success启用：', notificationHelper.isTypeEnabled('success'));

// 6. 恢复默认配置
console.log('\n6. 恢复默认配置：');
notificationHelper.updateConfig({ 
  showOnlyImportant: false, 
  enabledTypes: ['info', 'success', 'warning', 'error'] 
});
console.log('恢复后的消息：', notificationHelper.getRecentNotifications(10));

console.log('\n=== 测试完成 ===');
