import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardOverview from './DashboardOverview';
import DashboardCharts from './DashboardCharts';
import DashboardQuickActions from './DashboardQuickActions';
import { businessServiceManager } from '../../services/business';
import { GlassCard, GlassButton } from '../ui/FormControls';

interface DashboardProps {
  className?: string;
}

const Dashboard: React.FC<DashboardProps> = React.memo(({ className }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'actions'>('overview');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 确保业务服务已初始化
      if (!businessServiceManager.isInitialized) {
        console.log('Initializing business services...');
        await businessServiceManager.initialize();
      }

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      setError(error instanceof Error ? error.message : '仪表板初始化失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeDashboard();
  }, [initializeDashboard]);

  const tabItems = useMemo(() => [
    { key: 'overview', label: '📊 概览', icon: '📊' },
    { key: 'charts', label: '📈 图表', icon: '📈' },
    { key: 'actions', label: '⚡ 操作', icon: '⚡' }
  ], []);

  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'overview':
        return <DashboardOverview />;
      case 'charts':
        return <DashboardCharts />;
      case 'actions':
        return <DashboardQuickActions />;
      default:
        return <DashboardOverview />;
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className={`${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">正在初始化仪表板...</h2>
              <p className="text-white/70">正在加载系统数据和服务</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className || ''}`}>
        <GlassCard className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-2">仪表板加载失败</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <GlassButton onClick={initializeDashboard} variant="primary">
            重试
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className={`${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-6">
            <div className="text-6xl">⏳</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">系统准备中</h2>
              <p className="text-white/70">请稍等片刻...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 标签页导航 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {tabItems.map((tab) => (
              <button
                key={tab.key}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                  ${activeTab === tab.key 
                    ? 'bg-white/20 text-white border border-white/30 shadow-lg' 
                    : 'text-white/80 hover:text-white hover:bg-white/10 border border-transparent'
                  }
                `}
                onClick={() => setActiveTab(tab.key as any)}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* 系统状态指示器 */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-white/80 text-sm font-medium">系统运行正常</span>
          </div>
        </div>
      </GlassCard>

      {/* 内容区域 */}
      <div className="min-h-96">
        {renderContent}
      </div>
    </div>
  );
});

export { Dashboard };
export default Dashboard;