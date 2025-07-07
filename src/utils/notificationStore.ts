import { SimpleNotification, SimpleNotificationConfig, DEFAULT_NOTIFICATION_CONFIG, NotificationType, IMPORTANT_MESSAGE_TYPES } from '../types/simpleNotification';

const STORAGE_KEY = 'simple-notifications';
const CONFIG_KEY = 'simple-notification-config';
const MAX_STORED_NOTIFICATIONS = 50; // 最多存储50条通知

class NotificationStore {
  private notifications: SimpleNotification[] = [];
  private config: SimpleNotificationConfig = DEFAULT_NOTIFICATION_CONFIG;

  constructor() {
    this.loadFromStorage();
  }

  // 从localStorage加载数据
  private loadFromStorage(): void {
    try {
      // 加载通知数据
      const storedNotifications = localStorage.getItem(STORAGE_KEY);
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        this.notifications = parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        }));
      }

      // 加载配置数据
      const storedConfig = localStorage.getItem(CONFIG_KEY);
      if (storedConfig) {
        this.config = { ...DEFAULT_NOTIFICATION_CONFIG, ...JSON.parse(storedConfig) };
      }
    } catch (error) {
      console.error('加载通知数据失败:', error);
      this.notifications = [];
      this.config = DEFAULT_NOTIFICATION_CONFIG;
    }
  }

  // 保存到localStorage
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('保存通知数据失败:', error);
    }
  }

  // 添加通知
  add(notification: Omit<SimpleNotification, 'id' | 'createdAt'>): SimpleNotification {
    const newNotification: SimpleNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      ...notification,
      isRead: notification.isRead ?? false
    };

    // 添加到数组开头
    this.notifications.unshift(newNotification);

    // 限制存储数量
    if (this.notifications.length > MAX_STORED_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, MAX_STORED_NOTIFICATIONS);
    }

    this.saveToStorage();
    return newNotification;
  }

  // 获取最新通知（根据配置过滤）
  getRecent(count: number = 5): SimpleNotification[] {
    const filteredNotifications = this.getFilteredNotifications();
    return filteredNotifications.slice(0, count);
  }

  // 根据配置过滤通知
  private getFilteredNotifications(): SimpleNotification[] {
    if (!this.config.enabled) {
      return [];
    }

    let enabledTypes: NotificationType[];

    if (this.config.showOnlyImportant) {
      // 只显示重要消息模式
      enabledTypes = IMPORTANT_MESSAGE_TYPES;
    } else {
      // 使用用户自定义的类型配置
      enabledTypes = this.config.enabledTypes;
    }

    return this.notifications.filter(notification =>
      enabledTypes.includes(notification.type)
    );
  }

  // 获取所有通知（根据配置过滤）
  getAll(): SimpleNotification[] {
    return this.getFilteredNotifications();
  }

  // 获取所有通知（不过滤）
  getAllUnfiltered(): SimpleNotification[] {
    return [...this.notifications];
  }

  // 获取未读数量（根据配置过滤）
  getUnreadCount(): number {
    const filteredNotifications = this.getFilteredNotifications();
    return filteredNotifications.filter(n => !n.isRead).length;
  }

  // 标记为已读
  markAsRead(id: string): boolean {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // 标记所有为已读
  markAllAsRead(): void {
    let hasChanges = false;
    this.notifications.forEach(n => {
      if (!n.isRead) {
        n.isRead = true;
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      this.saveToStorage();
    }
  }

  // 删除通知
  remove(id: string): boolean {
    const index = this.notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // 清空所有通知
  clear(): void {
    this.notifications = [];
    this.saveToStorage();
  }

  // 获取配置
  getConfig(): SimpleNotificationConfig {
    return { ...this.config };
  }

  // 更新配置
  updateConfig(newConfig: Partial<SimpleNotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveToStorage();
  }
}

// 单例实例
export const notificationStore = new NotificationStore();
