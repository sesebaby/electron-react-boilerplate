import React, { useState, useEffect } from 'react';
import dashboardService, { DashboardOverview as DashboardOverviewType, QuickStats, SystemHealth } from '../../services/dashboard/dashboardService';
import { GlassCard, GlassButton } from '../ui/FormControls';

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

  const getHealthStatusStyles = (status: SystemHealth['status']): string => {
    switch (status) {
      case 'healthy': return 'bg-green-500 text-green-100 border-green-400';
      case 'warning': return 'bg-yellow-500 text-yellow-100 border-yellow-400';
      case 'error': return 'bg-red-500 text-red-100 border-red-400';
      default: return 'bg-gray-500 text-gray-100 border-gray-400';
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
      <div className={`${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载仪表板数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面标题 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">进销存管理系统</h1>
            <p className="text-white/70">实时监控系统运行状态和关键业务指标</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {lastUpdated && (
              <span className="text-white/60 text-sm">
                最后更新: {lastUpdated.toLocaleString('zh-CN')}
              </span>
            )}
            <GlassButton
              onClick={loadDashboardData}
              disabled={loading}
              variant="secondary"
              className="self-start sm:self-auto"
            >
              {loading ? '刷新中...' : '刷新数据'}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* 系统健康状态 */}
      {systemHealth && (
        <div className={`
          flex items-center gap-3 p-4 rounded-lg border
          ${getHealthStatusStyles(systemHealth.status)}
        `}>
          <div className="w-3 h-3 rounded-full bg-current animate-pulse"></div>
          <span className="font-medium">
            {getHealthStatusText(systemHealth.status)}
          </span>
          {systemHealth.issues.length > 0 && (
            <span className="text-sm opacity-90">
              ({systemHealth.issues.length} 个问题需要处理)
            </span>
          )}
        </div>
      )}

      {/* 概览卡片 */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">商品总数</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(overview.totalProducts)}</p>
                <span className="text-white/60 text-sm">个商品</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">库存总值</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatCurrency(overview.totalInventoryValue)}</p>
                <span className="text-white/60 text-sm">当前库存价值</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                🏢
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">供应商</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(overview.totalSuppliers)}</p>
                <span className="text-white/60 text-sm">合作供应商</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">客户</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(overview.totalCustomers)}</p>
                <span className="text-white/60 text-sm">注册客户</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-2xl">
                🏭
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">仓库</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(overview.totalWarehouses)}</p>
                <span className="text-white/60 text-sm">管理仓库</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-yellow-400/30 bg-yellow-500/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-yellow-300 font-semibold mb-1">库存预警</h3>
                <p className="text-3xl font-bold text-yellow-200 mb-1">{formatNumber(overview.lowStockItems)}</p>
                <span className="text-yellow-300/80 text-sm">低库存商品</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-red-400/30 bg-red-500/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-2xl">
                🚨
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-red-300 font-semibold mb-1">缺货商品</h3>
                <p className="text-3xl font-bold text-red-200 mb-1">{formatNumber(overview.outOfStockItems)}</p>
                <span className="text-red-300/80 text-sm">需要补货</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center text-2xl">
                📈
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white/90 font-semibold mb-1">库存流水</h3>
                <p className="text-3xl font-bold text-white mb-1">{formatNumber(overview.recentTransactions)}</p>
                <span className="text-white/60 text-sm">总流水记录</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 详细统计 */}
      {quickStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GlassCard title="商品统计" className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">总商品数</span>
                <span className="text-white font-semibold">{formatNumber(quickStats.productsStats.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">活跃商品</span>
                <span className="text-green-300 font-semibold">{formatNumber(quickStats.productsStats.active)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">停用商品</span>
                <span className="text-gray-300 font-semibold">{formatNumber(quickStats.productsStats.inactive)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">低库存商品</span>
                <span className="text-yellow-300 font-semibold">{formatNumber(quickStats.productsStats.lowStock)}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="库存统计" className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">库存总值</span>
                <span className="text-white font-semibold">{formatCurrency(quickStats.inventoryStats.totalValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">库存品种</span>
                <span className="text-blue-300 font-semibold">{formatNumber(quickStats.inventoryStats.totalItems)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">平均单品价值</span>
                <span className="text-purple-300 font-semibold">{formatCurrency(quickStats.inventoryStats.avgItemValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">库存周转率</span>
                <span className="text-cyan-300 font-semibold">{quickStats.inventoryStats.stockTurnover.toFixed(2)}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="业务统计" className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">供应商数量</span>
                <span className="text-white font-semibold">{formatNumber(quickStats.businessStats.suppliers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">客户数量</span>
                <span className="text-indigo-300 font-semibold">{formatNumber(quickStats.businessStats.customers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">VIP客户</span>
                <span className="text-yellow-300 font-semibold">{formatNumber(quickStats.businessStats.vipCustomers)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">优质供应商</span>
                <span className="text-green-300 font-semibold">{formatNumber(quickStats.businessStats.topSuppliers)}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;