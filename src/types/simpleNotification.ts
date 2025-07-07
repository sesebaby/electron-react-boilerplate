// 简化的通知类型定义
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface SimpleNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface SimpleNotificationConfig {
  enabled: boolean;
  maxDisplay: 3 | 5 | 10;
  enableSound: boolean;
}

// 默认配置
export const DEFAULT_NOTIFICATION_CONFIG: SimpleNotificationConfig = {
  enabled: true,
  maxDisplay: 5,
  enableSound: true
};
