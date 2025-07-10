import React, { useState, useEffect } from 'react';
import { serviceManager } from '../../services/core';
import { MonthlyBalanceStatistics } from '../../types/monthlyBalance';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface MonthlyBalanceStatisticsViewProps {
  selectedPeriod?: { year: number; month: number } | null;
}

export const MonthlyBalanceStatisticsView: React.FC<MonthlyBalanceStatisticsViewProps> = ({ selectedPeriod }) => {
  const [statistics, setStatistics] = useState<MonthlyBalanceStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    return selectedPeriod?.year || new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return selectedPeriod?.month || new Date().getMonth() + 1;
  });

  useEffect(() => {
    if (selectedPeriod) {
      setSelectedYear(selectedPeriod.year);
      setSelectedMonth(selectedPeriod.month);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadStatistics();
  }, [selectedYear, selectedMonth]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const reportService = serviceManager.getReportService();
      const result = await reportService.getMonthlyBalanceStats();

      if (!result.success) {
        setError(result.error || '获取统计数据失败');
        setStatistics(null);
        return;
      }

      setStatistics(result.data!);

    } catch (err) {
      console.error('Failed to load statistics:', err);
      setError('加载统计数据失败');
      setStatistics(null);
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

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const formatPeriod = (year: number, month: number): string => {
    return `${year}年${month}月`;
  };

  // 生成年份和月份选项
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载统计数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">月度结余统计分析</h2>
          <p className="text-white/70">
            查看指定期间的月度结余统计分析报告
          </p>
        </div>
        
        {/* 期间选择 */}
        <div className="flex gap-3 items-center">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            {yearOptions.map(year => (
              <option key={year} value={year} className="bg-gray-800">
                {year}年
              </option>
            ))}
          </select>
          
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            {monthOptions.map(month => (
              <option key={month} value={month} className="bg-gray-800">
                {month}月
              </option>
            ))}
          </select>
          
          <GlassButton variant="primary" onClick={loadStatistics}>
            <span className="mr-2">📊</span>
            查看统计
          </GlassButton>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <GlassCard className="border-red-400/30 bg-red-500/10">
          <div className="p-4 flex items-center gap-3 text-red-300">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-sm text-red-200/80 mt-1">
                请检查是否已生成{formatPeriod(selectedYear, selectedMonth)}的月度结余数据
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 统计数据展示 */}
      {statistics && (
        <>
          {/* 基础统计 */}
          <GlassCard title={`${formatPeriod(statistics.period.year, statistics.period.month)} 基础统计`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatNumber(statistics.basic.totalRecords)}
                </div>
                <div className="text-white/70 text-sm">结余记录</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatNumber(statistics.basic.totalProducts)}
                </div>
                <div className="text-white/70 text-sm">涉及产品</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatNumber(statistics.basic.totalBatches)}
                </div>
                <div className="text-white/70 text-sm">库存批次</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(statistics.basic.totalValue)}
                </div>
                <div className="text-white/70 text-sm">总结余价值</div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(statistics.basic.avgBatchValue)}
                </div>
                <div className="text-white/70 text-sm">平均批次价值</div>
              </div>
            </div>
          </GlassCard>

          {/* 年龄分析 */}
          <GlassCard title="📊 批次年龄分析">
            <div className="space-y-6">
              {/* 年龄分布 */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">年龄分布</h4>
                <div className="space-y-3">
                  {statistics.ageAnalysis.ranges.map((range, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-20 text-white/70 text-sm font-medium">
                        {range.range}
                      </div>
                      <div className="flex-1 bg-white/10 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500/60 to-purple-500/60 rounded-full transition-all duration-500"
                          style={{ width: `${range.percentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                          {formatPercentage(range.percentage)}
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        <div className="text-white font-medium text-sm">
                          {formatNumber(range.batchCount)}批次
                        </div>
                        <div className="text-white/60 text-xs">
                          {formatCurrency(range.totalValue)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 年龄概况 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-lg font-semibold text-white mb-2">
                    {statistics.ageAnalysis.avgAge.toFixed(1)} 天
                  </div>
                  <div className="text-white/70 text-sm">平均批次年龄</div>
                </div>

                {statistics.ageAnalysis.oldestBatch && (
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-lg font-semibold text-white mb-2">
                      {statistics.ageAnalysis.oldestBatch.age} 天
                    </div>
                    <div className="text-white/70 text-sm">最老批次年龄</div>
                    <div className="text-white/50 text-xs mt-1">
                      {statistics.ageAnalysis.oldestBatch.productName} - {statistics.ageAnalysis.oldestBatch.batchNo}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* 价值分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 价值TOP产品 */}
            <GlassCard title="💰 价值TOP产品">
              <div className="space-y-3">
                {statistics.valueAnalysis.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-yellow-300">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {product.productName}
                      </div>
                      <div className="text-white/60 text-sm">
                        {formatNumber(product.batchCount)} 批次 • {formatPercentage(product.percentage)}
                      </div>
                    </div>
                    <div className="text-white font-semibold text-sm">
                      {formatCurrency(product.totalValue)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* 价值TOP仓库 */}
            <GlassCard title="🏢 价值TOP仓库">
              <div className="space-y-3">
                {statistics.valueAnalysis.topWarehouses.slice(0, 5).map((warehouse, index) => (
                  <div key={warehouse.warehouseId} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-green-300">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {warehouse.warehouseName}
                      </div>
                      <div className="text-white/60 text-sm">
                        {formatNumber(warehouse.batchCount)} 批次 • {formatPercentage(warehouse.percentage)}
                      </div>
                    </div>
                    <div className="text-white font-semibold text-sm">
                      {formatCurrency(warehouse.totalValue)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* 价值TOP分类 */}
            <GlassCard title="🏷️ 价值TOP分类">
              <div className="space-y-3">
                {statistics.valueAnalysis.topCategories.slice(0, 5).map((category, index) => (
                  <div key={category.categoryId} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center text-xs font-bold text-purple-300">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {category.categoryName}
                      </div>
                      <div className="text-white/60 text-sm">
                        {formatNumber(category.batchCount)} 批次 • {formatPercentage(category.percentage)}
                      </div>
                    </div>
                    <div className="text-white font-semibold text-sm">
                      {formatCurrency(category.totalValue)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* 过期和周转分析 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 过期分析 */}
            <GlassCard title="⚠️ 过期分析">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
                    <div className="text-lg font-semibold text-red-300 mb-1">
                      {formatNumber(statistics.expiryAnalysis.expiredBatches)}
                    </div>
                    <div className="text-red-200/80 text-sm">已过期批次</div>
                    <div className="text-red-200/60 text-xs mt-1">
                      {formatCurrency(statistics.expiryAnalysis.expiredValue)} • {formatPercentage(statistics.expiryAnalysis.expiredPercentage)}
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                    <div className="text-lg font-semibold text-yellow-300 mb-1">
                      {formatNumber(statistics.expiryAnalysis.soonToExpire.batchCount)}
                    </div>
                    <div className="text-yellow-200/80 text-sm">即将过期(30天内)</div>
                    <div className="text-yellow-200/60 text-xs mt-1">
                      {formatCurrency(statistics.expiryAnalysis.soonToExpire.totalValue)} • {formatPercentage(statistics.expiryAnalysis.soonToExpire.percentage)}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* 周转分析 */}
            <GlassCard title="🔄 库存周转分析">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-500/10 border border-orange-400/30 rounded-lg">
                    <div className="text-lg font-semibold text-orange-300 mb-1">
                      {formatNumber(statistics.turnoverAnalysis.slowMoving.batchCount)}
                    </div>
                    <div className="text-orange-200/80 text-sm">滞销批次(&gt;90天)</div>
                    <div className="text-orange-200/60 text-xs mt-1">
                      {formatCurrency(statistics.turnoverAnalysis.slowMoving.totalValue)} • {formatPercentage(statistics.turnoverAnalysis.slowMoving.percentage)}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-500/10 border border-gray-400/30 rounded-lg">
                    <div className="text-lg font-semibold text-gray-300 mb-1">
                      {formatNumber(statistics.turnoverAnalysis.deadStock.batchCount)}
                    </div>
                    <div className="text-gray-200/80 text-sm">死库存(&gt;365天)</div>
                    <div className="text-gray-200/60 text-xs mt-1">
                      {formatCurrency(statistics.turnoverAnalysis.deadStock.totalValue)} • {formatPercentage(statistics.turnoverAnalysis.deadStock.percentage)}
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {/* 空状态 */}
      {!loading && !error && !statistics && (
        <GlassCard className="p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">选择查看期间</h3>
          <p className="text-white/70">
            请选择年份和月份来查看对应的月度结余统计分析
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default MonthlyBalanceStatisticsView;