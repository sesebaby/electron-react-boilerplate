import React, { useState, useEffect } from 'react';
import dashboardService, { DashboardOverview as DashboardOverviewType, QuickStats, SystemHealth } from '../../services/dashboard/dashboardService';

interface DashboardOverviewProps {
  className?: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ className }) => {
  const [overview, setOverview] = useState<DashboardOverviewType | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    // 设置定时刷新（每30秒）
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.refreshData();
      setOverview(data.overview);
      setQuickStats(data.quickStats);
      setSystemHealth(data.systemHealth);
      setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('zh-CN').format(value);
  };

  const getHealthStatusColor = (status: SystemHealth['status']): string => {
    switch (status) {
      case 'healthy': return '#52c41a';
      case 'warning': return '#faad14';
      case 'error': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getHealthStatusText = (status: SystemHealth['status']): string => {
    switch (status) {
      case 'healthy': return '系统运行正常';
      case 'warning': return '需要关注';
      case 'error': return '存在问题';
      default: return '未知状态';
    }
  };

  if (loading && !overview) {
    return (
      <div className={`dashboard-overview ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载仪表板数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-overview ${className || ''}`}>
      {/* 页面标题 */}
      <div className="dashboard-header">
        <h1>进销存管理系统</h1>
        <div className="dashboard-meta">
          {lastUpdated && (
            <span className="last-updated">
              最后更新: {lastUpdated.toLocaleString('zh-CN')}
            </span>
          )}
          <button 
            className="refresh-btn"
            onClick={loadDashboardData}
            disabled={loading}
          >
            {loading ? '刷新中...' : '刷新数据'}
          </button>
        </div>
      </div>

      {/* 系统健康状态 */}
      {systemHealth && (
        <div className="system-health-bar">
          <div 
            className="health-indicator"
            style={{ backgroundColor: getHealthStatusColor(systemHealth.status) }}
          ></div>
          <span className="health-text">
            {getHealthStatusText(systemHealth.status)}
          </span>
          {systemHealth.issues.length > 0 && (
            <span className="health-issues">
              ({systemHealth.issues.length} 个问题需要处理)
            </span>
          )}
        </div>
      )}

      {/* 概览卡片 */}
      {overview && (
        <div className="overview-cards">
          <div className="overview-card">
            <div className="card-icon products-icon">📦</div>
            <div className="card-content">
              <h3>商品总数</h3>
              <p className="card-value">{formatNumber(overview.totalProducts)}</p>
              <span className="card-label">个商品</span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon inventory-icon">📊</div>
            <div className="card-content">
              <h3>库存总值</h3>
              <p className="card-value">{formatCurrency(overview.totalInventoryValue)}</p>
              <span className="card-label">当前库存价值</span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon suppliers-icon">🏢</div>
            <div className="card-content">
              <h3>供应商</h3>
              <p className="card-value">{formatNumber(overview.totalSuppliers)}</p>
              <span className="card-label">合作供应商</span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon customers-icon">👥</div>
            <div className="card-content">
              <h3>客户</h3>
              <p className="card-value">{formatNumber(overview.totalCustomers)}</p>
              <span className="card-label">注册客户</span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon warehouses-icon">🏭</div>
            <div className="card-content">
              <h3>仓库</h3>
              <p className="card-value">{formatNumber(overview.totalWarehouses)}</p>
              <span className="card-label">管理仓库</span>
            </div>
          </div>

          <div className="overview-card warning">
            <div className="card-icon warning-icon">⚠️</div>
            <div className="card-content">
              <h3>库存预警</h3>
              <p className="card-value">{formatNumber(overview.lowStockItems)}</p>
              <span className="card-label">低库存商品</span>
            </div>
          </div>

          <div className="overview-card danger">
            <div className="card-icon danger-icon">🚨</div>
            <div className="card-content">
              <h3>缺货商品</h3>
              <p className="card-value">{formatNumber(overview.outOfStockItems)}</p>
              <span className="card-label">需要补货</span>
            </div>
          </div>

          <div className="overview-card">
            <div className="card-icon transactions-icon">📈</div>
            <div className="card-content">
              <h3>库存流水</h3>
              <p className="card-value">{formatNumber(overview.recentTransactions)}</p>
              <span className="card-label">总流水记录</span>
            </div>
          </div>
        </div>
      )}

      {/* 详细统计 */}
      {quickStats && (
        <div className="quick-stats">
          <div className="stats-section">
            <h3>商品统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">总商品数</span>
                <span className="stat-value">{formatNumber(quickStats.productsStats.total)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">活跃商品</span>
                <span className="stat-value">{formatNumber(quickStats.productsStats.active)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">停用商品</span>
                <span className="stat-value">{formatNumber(quickStats.productsStats.inactive)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">低库存商品</span>
                <span className="stat-value">{formatNumber(quickStats.productsStats.lowStock)}</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h3>库存统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">库存总值</span>
                <span className="stat-value">{formatCurrency(quickStats.inventoryStats.totalValue)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">库存品种</span>
                <span className="stat-value">{formatNumber(quickStats.inventoryStats.totalItems)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">平均单品价值</span>
                <span className="stat-value">{formatCurrency(quickStats.inventoryStats.avgItemValue)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">库存周转率</span>
                <span className="stat-value">{quickStats.inventoryStats.stockTurnover.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="stats-section">
            <h3>业务统计</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">供应商数量</span>
                <span className="stat-value">{formatNumber(quickStats.businessStats.suppliers)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">客户数量</span>
                <span className="stat-value">{formatNumber(quickStats.businessStats.customers)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">VIP客户</span>
                <span className="stat-value">{formatNumber(quickStats.businessStats.vipCustomers)}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">优质供应商</span>
                <span className="stat-value">{formatNumber(quickStats.businessStats.topSuppliers)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;