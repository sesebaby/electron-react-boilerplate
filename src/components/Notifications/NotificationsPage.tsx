import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GlassCard, GlassButton, GlassSelect, GlassInput } from '../ui/FormControls';
import { notificationHelper } from '../../utils/notificationHelper';
import { SimpleNotification, NotificationType } from '../../types/simpleNotification';

interface NotificationsPageProps {
  className?: string;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ className }) => {
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const pageSize = 10;

  // 加载通知数据
  const loadNotifications = useCallback(() => {
    setLoading(true);
    try {
      const config = notificationHelper.getConfig();
      const allNotifications = notificationHelper.getAllUnfiltered?.() || [];
      
      // 根据过滤条件过滤通知
      let filteredNotifications = allNotifications;
      
      if (filter === 'unread') {
        filteredNotifications = allNotifications.filter(n => !n.isRead);
      } else if (filter !== 'all') {
        filteredNotifications = allNotifications.filter(n => n.type === filter);
      }
      
      // 根据搜索查询过滤
      if (searchQuery.trim()) {
        filteredNotifications = filteredNotifications.filter(n =>
          n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          n.message.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setNotifications(filteredNotifications);
    } catch (error) {
      console.error('加载通知失败:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // 分页数据
  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return notifications.slice(startIndex, endIndex);
  }, [notifications, currentPage, pageSize]);

  const totalPages = Math.ceil(notifications.length / pageSize);

  // 处理通知点击
  const handleNotificationClick = (notification: SimpleNotification) => {
    if (!notification.isRead) {
      notificationHelper.markAsRead(notification.id);
      loadNotifications();
    }
  };

  // 批量操作
  const handleSelectAll = () => {
    if (selectedNotifications.length === paginatedNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(paginatedNotifications.map(n => n.id));
    }
  };

  const handleBatchMarkAsRead = () => {
    selectedNotifications.forEach(id => {
      notificationHelper.markAsRead(id);
    });
    setSelectedNotifications([]);
    loadNotifications();
  };

  const handleBatchDelete = () => {
    selectedNotifications.forEach(id => {
      notificationHelper.deleteNotification(id);
    });
    setSelectedNotifications([]);
    loadNotifications();
  };

  // 获取通知类型样式
  const getNotificationTypeStyles = (type: NotificationType) => {
    switch (type) {
      case 'warning': return 'border-l-4 border-l-yellow-400 bg-yellow-500/10';
      case 'info': return 'border-l-4 border-l-blue-400 bg-blue-500/10';
      case 'success': return 'border-l-4 border-l-green-400 bg-green-500/10';
      case 'error': return 'border-l-4 border-l-red-400 bg-red-500/10';
      default: return 'border-l-4 border-l-gray-400 bg-gray-500/10';
    }
  };

  // 获取通知类型显示文本
  const getTypeDisplayText = (type: NotificationType) => {
    const typeMap = {
      'info': '信息',
      'success': '成功',
      'warning': '警告',
      'error': '错误'
    };
    return typeMap[type] || type;
  };

  // 获取通知类型图标
  const getTypeIcon = (type: NotificationType) => {
    const iconMap = {
      'info': '💡',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    return iconMap[type] || '📢';
  };

  const filterOptions = [
    { value: 'all', label: '全部通知' },
    { value: 'unread', label: '未读通知' },
    { value: 'info', label: '信息通知' },
    { value: 'success', label: '成功通知' },
    { value: 'warning', label: '警告通知' },
    { value: 'error', label: '错误通知' }
  ];

  return (
    <div className={`notifications-page ${className || ''}`}>
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          通知中心
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          管理和查看所有系统通知
        </p>
      </div>

      <GlassCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <GlassSelect
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full sm:w-auto"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </GlassSelect>
            <GlassInput
              type="text"
              placeholder="搜索通知..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
          <div className="flex gap-2">
            <GlassButton
              onClick={() => notificationHelper.markAllAsRead()}
              className="text-sm"
              disabled={notifications.filter(n => !n.isRead).length === 0}
            >
              全部标记已读
            </GlassButton>
            <GlassButton
              onClick={loadNotifications}
              className="text-sm"
            >
              刷新
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {selectedNotifications.length > 0 && (
        <GlassCard className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              已选择 {selectedNotifications.length} 条通知
            </span>
            <div className="flex gap-2">
              <GlassButton
                onClick={handleBatchMarkAsRead}
                className="text-sm"
                variant="secondary"
              >
                标记已读
              </GlassButton>
              <GlassButton
                onClick={handleBatchDelete}
                className="text-sm"
                variant="danger"
              >
                删除
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-2" 
                style={{ borderColor: 'var(--text-tertiary)', borderTopColor: 'var(--text-secondary)' }}>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
                暂无通知
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {filter === 'unread' ? '所有通知都已读完' : '系统当前没有通知消息'}
              </p>
            </div>
          ) : (
            <>
              {/* 批量操作栏 */}
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === paginatedNotifications.length}
                    onChange={handleSelectAll}
                    className="form-checkbox"
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    全选
                  </span>
                </label>
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  共 {notifications.length} 条通知
                </span>
              </div>

              {/* 通知列表 */}
              <div className="space-y-3">
                {paginatedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      getNotificationTypeStyles(notification.type)
                    } ${!notification.isRead ? 'bg-opacity-20' : 'bg-opacity-10'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <label className="mt-1">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (e.target.checked) {
                              setSelectedNotifications([...selectedNotifications, notification.id]);
                            } else {
                              setSelectedNotifications(selectedNotifications.filter(id => id !== notification.id));
                            }
                          }}
                          className="form-checkbox"
                        />
                      </label>
                      <div className="text-xl">{getTypeIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''}`} 
                            style={{ color: 'var(--text-primary)' }}>
                            {notification.title}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/20" 
                            style={{ color: 'var(--text-secondary)' }}>
                            {getTypeDisplayText(notification.type)}
                          </span>
                          {!notification.isRead && (
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          {notification.message}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            {new Date(notification.createdAt).toLocaleString('zh-CN')}
                          </span>
                          <div className="flex gap-2">
                            {!notification.isRead && (
                              <GlassButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification);
                                }}
                                className="text-xs px-2 py-1"
                                variant="secondary"
                              >
                                标记已读
                              </GlassButton>
                            )}
                            <GlassButton
                              onClick={(e) => {
                                e.stopPropagation();
                                notificationHelper.deleteNotification(notification.id);
                                loadNotifications();
                              }}
                              className="text-xs px-2 py-1"
                              variant="danger"
                            >
                              删除
                            </GlassButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 border-t" 
                  style={{ borderColor: 'var(--glass-border)' }}>
                  <GlassButton
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-sm px-3 py-1"
                  >
                    上一页
                  </GlassButton>
                  <span className="text-sm px-3" style={{ color: 'var(--text-secondary)' }}>
                    {currentPage} / {totalPages}
                  </span>
                  <GlassButton
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="text-sm px-3 py-1"
                  >
                    下一页
                  </GlassButton>
                </div>
              )}
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default NotificationsPage;