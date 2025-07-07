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
  enabledTypes: NotificationType[];  // 启用的消息类型
  showOnlyImportant: boolean;        // 只显示重要消息（警告和错误）
}

// 消息重要性级别定义
export const IMPORTANT_MESSAGE_TYPES: NotificationType[] = ['warning', 'error'];
export const ALL_MESSAGE_TYPES: NotificationType[] = ['info', 'success', 'warning', 'error'];

// 默认配置
export const DEFAULT_NOTIFICATION_CONFIG: SimpleNotificationConfig = {
  enabled: true,
  maxDisplay: 5,
  enableSound: true,
  enabledTypes: ALL_MESSAGE_TYPES,   // 默认启用所有类型
  showOnlyImportant: false           // 默认显示所有消息
};
