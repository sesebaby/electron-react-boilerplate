import React, { useState, useEffect } from 'react';
import dashboardService, { RecentActivity } from '../../services/dashboard/dashboardService';
import { GlassCard, GlassButton } from '../ui/FormControls';

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

export const DashboardQuickActionsTailwind: React.FC<DashboardQuickActionsProps> = ({ className }) => {
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

  const getActionStyles = (type: QuickAction['type']): string => {
    switch (type) {
      case 'low_stock': return 'border-l-4 border-l-yellow-400 bg-yellow-500/10';
      case 'out_of_stock': return 'border-l-4 border-l-red-400 bg-red-500/10';
      case 'system_issue': return 'border-l-4 border-l-purple-400 bg-purple-500/10';
      default: return 'border-l-4 border-l-blue-400 bg-blue-500/10';
    }
  };

  const getActionButtonStyles = (type: QuickAction['type']): string => {
    switch (type) {
      case 'low_stock': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30 hover:bg-yellow-500/30';
      case 'out_of_stock': return 'bg-red-500/20 text-red-300 border-red-400/30 hover:bg-red-500/30';
      case 'system_issue': return 'bg-purple-500/20 text-purple-300 border-purple-400/30 hover:bg-purple-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30';
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

  const getShortcutIcon = (icon: string): string => {
    switch (icon) {
      case 'plus': return '➕';
      case 'import': return '📥';
      case 'export': return '📤';
      case 'shopping-cart': return '🛒';
      case 'dollar-sign': return '💰';
      case 'bar-chart': return '📊';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className={`${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载快速操作数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 需要关注的事项 */}
      {quickActions?.needAttention && quickActions.needAttention.length > 0 && (
        <GlassCard title="⚠️ 需要关注" className="p-6">
          <div className="space-y-4">
            {quickActions.needAttention.map((item: any, index: number) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${getActionStyles(item.type)}`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">
                    {getActionIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-semibold mb-1">
                      {item.description}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-white">{item.count}</span>
                      <span className="text-white/70">项</span>
                    </div>
                  </div>
                  <button 
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${getActionButtonStyles(item.type)}`}
                    onClick={() => console.log(`Handle ${item.type}:`, item)}
                  >
                    {item.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 快速操作按钮 */}
      {quickActions?.shortcuts && (
        <GlassCard title="🚀 快速操作" className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.shortcuts.map((shortcut: any, index: number) => (
              <button 
                key={index}
                className="p-4 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 hover:border-white/20 transition-all group"
                onClick={() => console.log('Navigate to:', shortcut.route)}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl group-hover:scale-110 transition-transform">
                    {getShortcutIcon(shortcut.icon)}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{shortcut.name}</div>
                    <div className="text-white/70 text-sm">{shortcut.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近活动 */}
        <GlassCard title="🕒 最近活动" className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="text-xl flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium mb-1">
                      {getActivityTypeText(activity.type)}
                    </div>
                    <div className="text-white/80 text-sm mb-1 truncate">
                      {activity.description}
                    </div>
                    <div className="text-white/60 text-xs">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-white/70 mb-4">暂无最近活动记录</p>
                <GlassButton 
                  onClick={loadQuickActionsData}
                  variant="secondary"
                  className="text-sm"
                >
                  刷新活动记录
                </GlassButton>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 系统状态快速检查 */}
        <GlassCard title="🔧 系统状态" className="p-6">
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 hover:border-white/20 transition-all group"
              onClick={() => console.log('Run system health check')}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏥</div>
              <div className="text-white font-medium text-sm">健康检查</div>
            </button>
            
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 hover:border-white/20 transition-all group"
              onClick={() => console.log('Backup data')}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💾</div>
              <div className="text-white font-medium text-sm">数据备份</div>
            </button>
            
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 hover:border-white/20 transition-all group"
              onClick={loadQuickActionsData}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔄</div>
              <div className="text-white font-medium text-sm">刷新数据</div>
            </button>
            
            <button 
              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg border border-white/10 hover:border-white/20 transition-all group"
              onClick={() => console.log('Export reports')}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
              <div className="text-white font-medium text-sm">导出报表</div>
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default DashboardQuickActionsTailwind;