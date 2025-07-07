import { SimpleNotification, NotificationType } from '../types/simpleNotification';
import { notificationStore } from './notificationStore';

class NotificationHelper {
  // 核心业务通知方法

  // 显示库存不足警告
  showStockWarning(productName: string, currentStock: number, threshold: number = 10): SimpleNotification {
    return notificationStore.add({
      type: 'warning',
      title: '库存不足警告',
      message: `商品"${productName}"库存不足，当前库存：${currentStock}，建议及时补货`,
      isRead: false
    });
  }

  // 显示订单状态变更通知
  showOrderStatusChange(orderNo: string, newStatus: string, orderType: 'sales' | 'purchase' = 'sales'): SimpleNotification {
    const typeText = orderType === 'sales' ? '销售订单' : '采购订单';
    return notificationStore.add({
      type: 'info',
      title: '订单状态更新',
      message: `${typeText} ${orderNo} 状态已更新为：${newStatus}`,
      isRead: false
    });
  }

  // 显示操作结果反馈
  showOperationResult(operation: string, success: boolean, details?: string): SimpleNotification {
    return notificationStore.add({
      type: success ? 'success' : 'error',
      title: success ? '操作成功' : '操作失败',
      message: success
        ? `${operation}操作已成功完成${details ? '：' + details : ''}`
        : `${operation}操作失败${details ? '：' + details : '，请重试或联系管理员'}`,
      isRead: false
    });
  }

  // 显示一般信息通知
  showInfo(title: string, message: string): SimpleNotification {
    return notificationStore.add({
      type: 'info',
      title,
      message,
      isRead: false
    });
  }

  // 显示成功通知
  showSuccess(title: string, message: string): SimpleNotification {
    return notificationStore.add({
      type: 'success',
      title,
      message,
      isRead: false
    });
  }

  // 显示警告通知
  showWarning(title: string, message: string): SimpleNotification {
    return notificationStore.add({
      type: 'warning',
      title,
      message,
      isRead: false
    });
  }

  // 显示错误通知
  showError(title: string, message: string): SimpleNotification {
    return notificationStore.add({
      type: 'error',
      title,
      message,
      isRead: false
    });
  }

  // 基本显示和管理方法

  // 获取最新通知
  getRecentNotifications(count?: number): SimpleNotification[] {
    const config = notificationStore.getConfig();
    const maxCount = count || config.maxDisplay;
    return notificationStore.getRecent(maxCount);
  }

  // 获取未读通知数量
  getUnreadCount(): number {
    return notificationStore.getUnreadCount();
  }

  // 标记通知为已读
  markAsRead(id: string): boolean {
    return notificationStore.markAsRead(id);
  }

  // 标记所有通知为已读
  markAllAsRead(): void {
    notificationStore.markAllAsRead();
  }

  // 删除通知
  deleteNotification(id: string): boolean {
    return notificationStore.remove(id);
  }

  // 清空所有通知
  clearAllNotifications(): void {
    notificationStore.clear();
  }

  // 配置管理方法

  // 获取通知配置
  getConfig() {
    return notificationStore.getConfig();
  }

  // 更新通知配置
  updateConfig(config: Partial<typeof notificationStore.getConfig>) {
    notificationStore.updateConfig(config);
  }

  // 检查通知是否启用
  isEnabled(): boolean {
    return notificationStore.getConfig().enabled;
  }

  // 工具方法

  // 获取通知类型的显示文本
  getTypeDisplayText(type: NotificationType): string {
    const typeMap = {
      'info': '信息',
      'success': '成功',
      'warning': '警告',
      'error': '错误'
    };
    return typeMap[type] || type;
  }

  // 获取通知类型的图标
  getTypeIcon(type: NotificationType): string {
    const iconMap = {
      'info': '💡',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    return iconMap[type] || '📢';
  }

  // 获取通知类型的样式类
  getTypeStyles(type: NotificationType): string {
    const styleMap = {
      'info': 'bg-blue-50 border-blue-200 text-blue-800',
      'success': 'bg-green-50 border-green-200 text-green-800',
      'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
      'error': 'bg-red-50 border-red-200 text-red-800'
    };
    return styleMap[type] || 'bg-gray-50 border-gray-200 text-gray-800';
  }
}

// 单例实例
export const notificationHelper = new NotificationHelper();

// 默认导出
export default notificationHelper;
