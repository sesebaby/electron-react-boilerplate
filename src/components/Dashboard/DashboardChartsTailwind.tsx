import React, { useState, useEffect } from 'react';
import dashboardService, { DashboardChartData } from '../../services/dashboard/dashboardService';
import { GlassCard, GlassButton } from '../ui/FormControls';

interface DashboardChartsProps {
  className?: string;
}

export const DashboardChartsTailwind: React.FC<DashboardChartsProps> = ({ className }) => {
  const [chartData, setChartData] = useState<DashboardChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getChartData();
      setChartData(data);
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('zh-CN').format(value);
  };

  const getBarColor = (index: number): string => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-cyan-500 to-cyan-600'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className={`${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载图表数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className={`${className || ''}`}>
        <GlassCard className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无图表数据</h3>
          <p className="text-white/70 mb-4">无法加载图表数据，请重试</p>
          <GlassButton onClick={loadChartData} variant="primary">重新加载</GlassButton>
        </GlassCard>
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
              const maxValue = Math.max(...chartData.inventoryByCategory.map(d => d.value));
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              
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
                      style={{ width: `${percentage}%` }}
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
                const maxValue = Math.max(
                  ...chartData.stockMovement.flatMap(d => [d.stockIn, d.stockOut, d.adjustment])
                );
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="flex items-end gap-1 h-32">
                      <div 
                        className="w-6 bg-green-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{ height: `${maxValue > 0 ? (item.stockIn / maxValue) * 100 : 0}%` }}
                      >
                        {item.stockIn > 0 && (
                          <span className="text-xs text-white font-medium mb-1">{item.stockIn}</span>
                        )}
                      </div>
                      <div 
                        className="w-6 bg-red-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{ height: `${maxValue > 0 ? (item.stockOut / maxValue) * 100 : 0}%` }}
                      >
                        {item.stockOut > 0 && (
                          <span className="text-xs text-white font-medium mb-1">{item.stockOut}</span>
                        )}
                      </div>
                      <div 
                        className="w-6 bg-yellow-500 rounded-t transition-all duration-1000 ease-out flex items-end justify-center"
                        style={{ height: `${maxValue > 0 ? (item.adjustment / maxValue) * 100 : 0}%` }}
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
              const maxValue = Math.max(...chartData.topProducts.map(p => p.value));
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              
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
                      style={{ width: `${percentage}%` }}
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
                      style={{ width: `${item.percentage}%` }}
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
                const levelColors = {
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
};

export default DashboardChartsTailwind;