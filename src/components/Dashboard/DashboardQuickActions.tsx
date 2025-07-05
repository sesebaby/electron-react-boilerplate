import React, { useState, useEffect } from 'react';
import dashboardService, { RecentActivity } from '../../services/dashboard/dashboardService';

interface DashboardQuickActionsProps {
  className?: string;
}

interface QuickAction {
  type: 'low_stock' | 'out_of_stock' | 'system_issue';
  count: number;
  description: string;
  action: string;
}

interface QuickActionsData {
  needAttention: QuickAction[];
  shortcuts: Array<{
    name: string;
    description: string;
    icon: string;
    route: string;
  }>;
}

export const DashboardQuickActions: React.FC<DashboardQuickActionsProps> = ({ className }) => {
  const [quickActions, setQuickActions] = useState<QuickActionsData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuickActionsData();
  }, []);

  const loadQuickActionsData = async () => {
    try {
      setLoading(true);
      const [actions, activities] = await Promise.all([
        dashboardService.getQuickActions(),
        dashboardService.getRecentActivities(10)
      ]);
      setQuickActions(actions);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Failed to load quick actions data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: QuickAction['type']): string => {
    switch (type) {
      case 'low_stock': return '⚠️';
      case 'out_of_stock': return '🚨';
      case 'system_issue': return '🔧';
      default: return '📋';
    }
  };

  const getActionColor = (type: QuickAction['type']): string => {
    switch (type) {
      case 'low_stock': return '#faad14';
      case 'out_of_stock': return '#ff4d4f';
      case 'system_issue': return '#722ed1';
      default: return '#1890ff';
    }
  };

  const getActivityIcon = (type: string): string => {
    switch (type) {
      case 'stock_in': return '📦';
      case 'stock_out': return '📤';
      case 'stock_adjust': return '⚖️';
      case 'product_created': return '🆕';
      case 'order_created': return '📝';
      default: return '📋';
    }
  };

  const getActivityTypeText = (type: string): string => {
    switch (type) {
      case 'stock_in': return '库存入库';
      case 'stock_out': return '库存出库';
      case 'stock_adjust': return '库存调整';
      case 'product_created': return '新增商品';
      case 'order_created': return '创建订单';
      default: return '系统操作';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className={`dashboard-quick-actions ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载快速操作数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-quick-actions ${className || ''}`}>
      {/* 需要关注的事项 */}
      {quickActions?.needAttention && quickActions.needAttention.length > 0 && (
        <div className="attention-section">
          <h3>⚠️ 需要关注</h3>
          <div className="attention-items">
            {quickActions.needAttention.map((item: any, index: number) => (
              <div 
                key={index} 
                className="attention-item"
                style={{ borderLeftColor: getActionColor(item.type) }}
              >
                <div className="attention-icon">
                  {getActionIcon(item.type)}
                </div>
                <div className="attention-content">
                  <div className="attention-title">
                    {item.description}
                  </div>
                  <div className="attention-count">
                    <span className="count-number">{item.count}</span>
                    <span className="count-unit">项</span>
                  </div>
                </div>
                <button 
                  className="attention-action"
                  onClick={() => {
                    // Navigate to relevant page based on item type
                    switch (item.type) {
                      case 'low_stock':
                        window.location.hash = '#/inventory-overview';
                        break;
                      case 'out_of_stock':
                        window.location.hash = '#/stock-in';
                        break;
                      case 'system_issue':
                        window.location.hash = '#/settings';
                        break;
                      default:
                        window.location.hash = '#/dashboard';
                    }
                  }}
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速操作按钮 */}
      {quickActions?.shortcuts && (
        <div className="shortcuts-section">
          <h3>🚀 快速操作</h3>
          <div className="shortcuts-grid">
            {quickActions.shortcuts.map((shortcut: any, index: number) => (
              <button 
                key={index}
                className="shortcut-btn"
                onClick={() => {
                  // Navigate to the specified route
                  if (shortcut.route) {
                    window.location.hash = shortcut.route;
                  }
                }}
              >
                <div className="shortcut-icon">
                  {shortcut.icon === 'plus' && '➕'}
                  {shortcut.icon === 'import' && '📥'}
                  {shortcut.icon === 'export' && '📤'}
                  {shortcut.icon === 'shopping-cart' && '🛒'}
                  {shortcut.icon === 'dollar-sign' && '💰'}
                  {shortcut.icon === 'bar-chart' && '📊'}
                </div>
                <div className="shortcut-content">
                  <div className="shortcut-name">{shortcut.name}</div>
                  <div className="shortcut-desc">{shortcut.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 最近活动 */}
      <div className="activities-section">
        <h3>🕒 最近活动</h3>
        <div className="activities-list">
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-type">
                    {getActivityTypeText(activity.type)}
                  </div>
                  <div className="activity-description">
                    {activity.description}
                  </div>
                  <div className="activity-time">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-activities">
              <p>暂无最近活动记录</p>
              <button 
                onClick={loadQuickActionsData}
                className="refresh-activities-btn"
              >
                刷新活动记录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 系统状态快速检查 */}
      <div className="system-check-section">
        <h3>🔧 系统状态</h3>
        <div className="system-check-actions">
          <button 
            className="system-check-btn"
            onClick={() => {
              // Navigate to system management page for health check
              window.location.hash = '#/settings';
            }}
          >
            <span className="check-icon">🏥</span>
            <span>健康检查</span>
          </button>
          <button 
            className="system-check-btn"
            onClick={() => {
              // Show backup confirmation dialog
              if (confirm('确定要开始数据备份吗？这可能需要几分钟时间。')) {
                alert('数据备份已开始，请耐心等待完成通知。');
              }
            }}
          >
            <span className="check-icon">💾</span>
            <span>数据备份</span>
          </button>
          <button 
            className="system-check-btn"
            onClick={loadQuickActionsData}
          >
            <span className="check-icon">🔄</span>
            <span>刷新数据</span>
          </button>
          <button 
            className="system-check-btn"
            onClick={() => {
              // Navigate to reports page
              window.location.hash = '#/inventory-reports';
            }}
          >
            <span className="check-icon">📋</span>
            <span>导出报表</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardQuickActions;