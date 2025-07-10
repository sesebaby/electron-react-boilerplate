import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardOverview from './DashboardOverview';
import DashboardCharts from './DashboardCharts';
import DashboardQuickActions from './DashboardQuickActions';
import { serviceManager } from '../../services/core';
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
      console.log('Dashboard using core services...');

      setInitialized(true);
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      setError(error instanceof Error ? error.message : '仪表盘初始化失败');
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
            <div
              className="w-16 h-16 border-4 rounded-full animate-spin"
              style={{
                borderColor: 'var(--loading-spinner-track)',
                borderTopColor: 'var(--loading-spinner-active)'
              }}
            ></div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>正在初始化仪表盘...</h2>
              <p style={{ color: 'var(--text-secondary)' }}>正在加载系统数据和服务</p>
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
          <div className="text-6xl mb-4" style={{ color: 'var(--error-color)' }}>❌</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>仪表盘加载失败</h2>
          <p className="mb-6" style={{ color: 'var(--error-color)' }}>{error}</p>
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
              <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>系统准备中</h2>
              <p style={{ color: 'var(--text-secondary)' }}>请稍等片刻...</p>
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
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border
                  ${activeTab === tab.key ? 'tab-active' : 'tab-inactive'}
                `}
                style={activeTab === tab.key ? {
                  background: 'var(--tab-active-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--tab-active-border)',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                } : {
                  color: 'var(--tab-inactive-text)',
                  borderColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.background = 'var(--hover-overlay)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) {
                    e.currentTarget.style.color = 'var(--tab-inactive-text)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
                onClick={() => setActiveTab(tab.key as 'overview' | 'charts' | 'actions')}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm sm:text-base">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* 系统状态指示器 */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              background: 'var(--status-indicator-bg)',
              borderColor: 'var(--status-indicator-border)'
            }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: 'var(--status-indicator-active)' }}
            ></div>
            <span className="text-sm font-medium" style={{ color: 'var(--tab-inactive-text)' }}>系统运行正常</span>
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