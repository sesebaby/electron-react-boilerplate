import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dashboardService, { DashboardChartData } from '../../services/dashboard/dashboardService';
import { GlassCard } from '../ui/FormControls';
import { formatCurrency, formatNumber, getBarColor, calculatePercentage, findMaxValue } from '../../utils/formatters';
import { ChartSkeleton, ErrorState } from '../ui/SkeletonLoader';

interface DashboardChartsProps {
  className?: string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = React.memo(({ className }) => {
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const _loadChartData = useCallback(async () => {
    try {
      setLoading(true);
      const _data = await dashboardService.getChartData();
      setChartData(data);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 缓存复杂计算结果
  const _categoryMaxValue = useMemo(() => {
    return chartData?.inventoryByCategory ? findMaxValue(chartData.inventoryByCategory) : 0;
  }, [chartData?.inventoryByCategory]);

  const _stockMovementMaxValue = useMemo(() => {
    if (!chartData?.stockMovement) return 0;
    return Math.max(
      ...chartData.stockMovement.flatMap(d => [d.stockIn, d.stockOut, d.adjustment])
    );
  }, [chartData?.stockMovement]);

  const _topProductsMaxValue = useMemo(() => {
    return chartData?.topProducts ? findMaxValue(chartData.topProducts) : 0;
  }, [chartData?.topProducts]);


  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <ChartSkeleton title="按分类库存分布" />
        <ChartSkeleton title="近期库存流水趋势" />
        <ChartSkeleton title="库存价值TOP10商品" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton title="供应商评级分布" />
          <ChartSkeleton title="客户等级分布" />
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className={`${className || ''}`}>
        <ErrorState
          title="暂无图表数据"
          message="无法加载图表数据，请重试"
          onRetry={loadChartData}
          retryLabel="重新加载"
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 按分类库存分布 */}
      <GlassCard title="按分类库存分布" className="p-6">
        {chartData.inventoryByCategory.length > 0 ? (
          <div className="space-y-4">
            {chartData.inventoryByCategory.map((item, index) => {
              const _percentage = calculatePercentage(item.value, categoryMaxValue);
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{item.category}</span>
                    <div className="text-right">
                      <div className="text-white font-semibold">{formatCurrency(item.value)}</div>
                      <div className="text-white/60 text-sm">({item.count}个商品)</div>
                    </div>
                  </div>
                  <div className="h-6 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getBarColor(index)} transition-all duration-1000 ease-out`}
                      style={{width: `${percentage}%`}}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-white/70">暂无分类库存数据</p>
          </div>
        )}
      </GlassCard>

      {/* 库存流水趋势 */}
      <GlassCard title="近期库存流水趋势" className="p-6">
        {chartData.stockMovement.length > 0 ? (
          <div className="space-y-6">
            {/* 图例 */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-white/80 text-sm">入库</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-white/80 text-sm">出库</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-white/80 text-sm">调整</span>
              </div>
            </div>
            
            {/* 图表 */}
            <div className="flex items-end justify-between gap-2 h-48 border-b border-white/10">
              {chartData.stockMovement.map((item, index) => {
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-32">
                      <div 
                        className="w-6 bg-green-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{height: `${calculatePercentage(item.stockIn, stockMovementMaxValue)}%`}}
                      >
                        {item.stockIn > 0 && (
                          <span className="text-xs text-white font-medium mb-1">{item.stockIn}</span>
                        )}
                      </div>
                      <div 
                        className="w-6 bg-red-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{height: `${calculatePercentage(item.stockOut, stockMovementMaxValue)}%`}}
                      >
                        {item.stockOut > 0 && (
                          <span className="text-xs text-white font-medium mb-1">{item.stockOut}</span>
                        )}
                      </div>
                      <div 
                        className="w-6 bg-yellow-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{height: `${calculatePercentage(item.adjustment, stockMovementMaxValue)}%`}}
                      >
                        {item.adjustment > 0 && (
                          <span className="text-xs text-white font-medium mb-1">{item.adjustment}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-white/60 text-center">
                      {new Date(item.date).toLocaleDateString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-white/70">暂无库存流水数据</p>
          </div>
        )}
      </GlassCard>

      {/* 热门产品 */}
      <GlassCard title="库存价值TOP10商品" className="p-6">
        {chartData.topProducts.length > 0 ? (
          <div className="space-y-4">
            {chartData.topProducts.slice(0, 10).map((item, index) => {
              const _percentage = calculatePercentage(item.value, topProductsMaxValue);
              
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold
                    ${index < 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : 'bg-white/10 text-white/80'}
                  `}>
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{item.product}</div>
                    <div className="text-white/60 text-sm">
                      库存: {formatNumber(item.quantity)} | 价值: {formatCurrency(item.value)}
                    </div>
                  </div>
                  
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getBarColor(index)} transition-all duration-1000 ease-out`}
                      style={{width: `${percentage}%`}}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📦</div>
            <p className="text-white/70">暂无产品数据</p>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 供应商评级分布 */}
        <GlassCard title="供应商评级分布" className="p-6">
          {chartData.supplierDistribution.length > 0 ? (
            <div className="space-y-4">
              {chartData.supplierDistribution.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">评级 {item.rating}</span>
                    <span className="text-white/80 text-sm">
                      {item.count}家 ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${getBarColor(index)} transition-all duration-1000 ease-out`}
                      style={{width: `${item.percentage}%`}}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🏢</div>
              <p className="text-white/70">暂无供应商数据</p>
            </div>
          )}
        </GlassCard>

        {/* 客户等级分布 */}
        <GlassCard title="客户等级分布" className="p-6">
          {chartData.customerLevels.length > 0 ? (
            <div className="space-y-4">
              {chartData.customerLevels.map((item, index) => {
                const _levelColors = {
                  'VIP': 'from-red-500 to-red-600',
                  'Gold': 'from-yellow-500 to-yellow-600',
                  'Silver': 'from-gray-400 to-gray-500',
                  'Bronze': 'from-orange-500 to-orange-600'
                };
                
                return (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 flex items-center justify-center rounded-lg text-white font-bold text-sm
                      bg-gradient-to-r ${levelColors[item.level as keyof typeof levelColors] || 'from-gray-500 to-gray-600'}
                    `}>
                      {item.level}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white font-medium">{item.level}客户</span>
                        <span className="text-white/80 text-sm">{formatNumber(item.count)}</span>
                      </div>
                      <div className="text-white/60 text-sm">{formatCurrency(item.totalValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-white/70">暂无客户数据</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';

export default DashboardCharts;