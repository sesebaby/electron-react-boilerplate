import React, { useState, useEffect } from 'react';
import DashboardOverview from './DashboardOverview';
import DashboardCharts from './DashboardCharts';
import DashboardQuickActions from './DashboardQuickActions';
import { businessServiceManager } from '../../services/business';

interface DashboardProps {
  className?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'actions'>('overview');
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // 确保业务服务已初始化
      if (!businessServiceManager.isInitialized()) {
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
  };

  const tabItems = [
    { key: 'overview', label: '📊 概览', icon: '📊' },
    { key: 'charts', label: '📈 图表', icon: '📈' },
    { key: 'actions', label: '⚡ 操作', icon: '⚡' }
  ];

  if (loading) {
    return (
      <div className={`dashboard-main ${className || ''}`}>
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h2>正在初始化仪表板...</h2>
            <p>正在加载系统数据和服务</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`dashboard-main ${className || ''}`}>
        <div className="dashboard-error">
          <div className="error-container">
            <div className="error-icon">❌</div>
            <h2>仪表板加载失败</h2>
            <p className="error-message">{error}</p>
            <button 
              className="retry-btn"
              onClick={initializeDashboard}
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className={`dashboard-main ${className || ''}`}>
        <div className="dashboard-not-ready">
          <div className="not-ready-container">
            <div className="not-ready-icon">⏳</div>
            <h2>系统准备中</h2>
            <p>请稍等片刻...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
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
  };

  return (
    <div className={`dashboard-main ${className || ''}`}>
      {/* 标签页导航 */}
      <div className="dashboard-tabs">
        <div className="tabs-container">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* 系统状态指示器 */}
        <div className="system-status">
          <div className="status-indicator active"></div>
          <span className="status-text">系统运行正常</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="dashboard-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;