import React, { useState, useEffect } from 'react';
import { serviceManager } from '../../services/core';
import { 
  MonthlyBalanceStatistics, 
  MonthlyBalanceGenerateParams,
  MonthlyBalanceQueryParams 
} from '../../types/monthlyBalance';
import { GlassButton, GlassCard } from '../ui/FormControls';
import { MonthlyBalanceGenerator } from './MonthlyBalanceGenerator';
import { MonthlyBalanceList } from './MonthlyBalanceList';
import { MonthlyBalanceStatisticsView } from './MonthlyBalanceStatisticsView';

interface MonthlyBalanceOverviewProps {
  className?: string;
}

interface OverviewStats {
  totalPeriods: number;
  totalValue: number;
  totalBatches: number;
  totalProducts: number;
  latestPeriod?: {
    year: number;
    month: number;
    value: number;
    batchCount: number;
  };
}

export const MonthlyBalanceOverview: React.FC<MonthlyBalanceOverviewProps> = ({ className }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'generate' | 'list' | 'statistics'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    loadOverviewStats();
  }, []);

  const loadOverviewStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取服务统计
      const reportService = serviceManager.getReportService();
      const serviceStats = await reportService.getMonthlyBalanceStats();
      
      // 这里可以添加更多统计逻辑，比如获取最新期间的数据
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // 尝试获取上个月的结余数据
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      
      let latestPeriod = undefined;
      try {
        const queryResult = await reportService.queryMonthlyBalance({
          year: lastYear,
          month: lastMonth
        });
        
        if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
          const balances = queryResult.data;
          latestPeriod = {
            year: lastYear,
            month: lastMonth,
            value: balances.reduce((sum, b) => sum + b.totalValue, 0),
            batchCount: balances.length
          };
        }
      } catch (err) {
        console.log('No data for latest period:', err);
      }

      setStats({
        totalPeriods: serviceStats.success ? serviceStats.data?.totalRecords || 0 : 0,
        totalValue: serviceStats.success ? serviceStats.data?.totalValue || 0 : 0,
        totalBatches: serviceStats.success ? serviceStats.data?.totalRecords || 0 : 0,
        totalProducts: serviceStats.success ? serviceStats.data?.totalRecords || 0 : 0,
        latestPeriod
      });
    } catch (err) {
      setError('加载月度结余统计失败');
      console.error('Failed to load monthly balance stats:', err);
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

  const formatPeriod = (year: number, month: number): string => {
    return `${year}年${month}月`;
  };

  const handleGenerateSuccess = () => {
    loadOverviewStats();
    setActiveTab('list');
  };

  const handleViewStatistics = (year: number, month: number) => {
    setSelectedPeriod({ year, month });
    setActiveTab('statistics');
  };

  const renderTabButton = (
    tabKey: typeof activeTab, 
    label: string, 
    icon: string
  ) => (
    <button
      onClick={() => setActiveTab(tabKey)}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        activeTab === tabKey
          ? 'bg-white/20 text-white border border-white/30'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载月度结余数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <GlassCard className="p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl font-semibold text-white mb-2">加载失败</h3>
          <p className="text-white/70 mb-6">{error}</p>
          <GlassButton onClick={loadOverviewStats} variant="primary">
            重新加载
          </GlassButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">月度结余</h1>
          <p className="text-white/70">每月末库存结余统计，支持FIFO批次管理</p>
        </div>
        
        {/* 标签页导航 */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
          {renderTabButton('overview', '概览', '📊')}
          {renderTabButton('generate', '生成', '⚙️')}
          {renderTabButton('list', '列表', '📋')}
          {renderTabButton('statistics', '统计', '📈')}
        </div>
      </div>

      {/* 标签页内容 */}
      {activeTab === 'overview' && stats && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                  📅
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.totalPeriods)}</div>
                  <div className="text-white/70 text-sm">历史期间</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
                  💰
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalValue)}</div>
                  <div className="text-white/70 text-sm">总结余价值</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                  📦
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.totalBatches)}</div>
                  <div className="text-white/70 text-sm">结余批次</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-2xl">
                  🏷️
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.totalProducts)}</div>
                  <div className="text-white/70 text-sm">涉及产品</div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* 最新期间信息 */}
          {stats.latestPeriod && (
            <GlassCard title="最新结余期间">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {formatPeriod(stats.latestPeriod.year, stats.latestPeriod.month)}
                    </h3>
                    <p className="text-white/70">最新的月度结余数据</p>
                  </div>
                  <GlassButton
                    variant="primary"
                    onClick={() => handleViewStatistics(stats.latestPeriod!.year, stats.latestPeriod!.month)}
                  >
                    查看详情
                  </GlassButton>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-lg font-semibold text-white">
                      {formatCurrency(stats.latestPeriod.value)}
                    </div>
                    <div className="text-white/70 text-sm">结余总价值</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-lg font-semibold text-white">
                      {formatNumber(stats.latestPeriod.batchCount)}
                    </div>
                    <div className="text-white/70 text-sm">批次数量</div>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* 快速操作 */}
          <GlassCard title="快速操作">
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <GlassButton
                  variant="primary"
                  onClick={() => setActiveTab('generate')}
                  className="p-4 h-auto"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">⚙️</div>
                    <div className="font-medium">生成月度结余</div>
                    <div className="text-sm text-white/70 mt-1">创建新的月度结余记录</div>
                  </div>
                </GlassButton>

                <GlassButton
                  variant="secondary"
                  onClick={() => setActiveTab('list')}
                  className="p-4 h-auto"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="font-medium">查看结余列表</div>
                    <div className="text-sm text-white/70 mt-1">浏览历史结余记录</div>
                  </div>
                </GlassButton>

                <GlassButton
                  variant="secondary"
                  onClick={() => setActiveTab('statistics')}
                  className="p-4 h-auto"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📈</div>
                    <div className="font-medium">统计分析</div>
                    <div className="text-sm text-white/70 mt-1">查看结余统计分析</div>
                  </div>
                </GlassButton>
              </div>
            </div>
          </GlassCard>

          {/* 空状态提示 */}
          {stats.totalPeriods === 0 && (
            <GlassCard className="p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">暂无月度结余数据</h3>
              <p className="text-white/70 mb-6">
                还没有生成过月度结余，点击下方按钮开始生成第一个月度结余
              </p>
              <GlassButton
                variant="primary"
                onClick={() => setActiveTab('generate')}
              >
                <span className="mr-2">⚙️</span>
                立即生成
              </GlassButton>
            </GlassCard>
          )}
        </>
      )}

      {activeTab === 'generate' && (
        <MonthlyBalanceGenerator onSuccess={handleGenerateSuccess} />
      )}

      {activeTab === 'list' && (
        <MonthlyBalanceList onViewStatistics={handleViewStatistics} />
      )}

      {activeTab === 'statistics' && (
        <MonthlyBalanceStatisticsView selectedPeriod={selectedPeriod} />
      )}
    </div>
  );
};

export default MonthlyBalanceOverview;