import React, { useState, useEffect } from 'react';
import dashboardService, { DashboardChartData } from '../../services/dashboard/dashboardService';

interface DashboardChartsProps {
  className?: string;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ className }) => {
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

  if (loading) {
    return (
      <div className={`dashboard-charts ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载图表数据中...</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className={`dashboard-charts ${className || ''}`}>
        <div className="no-data">
          <p>暂无图表数据</p>
          <button onClick={loadChartData}>重新加载</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-charts ${className || ''}`}>
      {/* 按分类库存分布 */}
      <div className="chart-section">
        <h3>按分类库存分布</h3>
        <div className="chart-container category-chart">
          {chartData.inventoryByCategory.length > 0 ? (
            <div className="bar-chart">
              {chartData.inventoryByCategory.map((item, index) => {
                const maxValue = Math.max(...chartData.inventoryByCategory.map(d => d.value));
                const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="bar-item">
                    <div className="bar-label">{item.category}</div>
                    <div className="bar-container">
                      <div 
                        className="bar-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          background: `hsl(${200 + index * 40}, 70%, 60%)`
                        }}
                      ></div>
                    </div>
                    <div className="bar-value">
                      {formatCurrency(item.value)}
                      <span className="bar-count">({item.count}个商品)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-chart-data">
              <p>暂无分类库存数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 库存流水趋势 */}
      <div className="chart-section">
        <h3>近期库存流水趋势</h3>
        <div className="chart-container movement-chart">
          {chartData.stockMovement.length > 0 ? (
            <div className="line-chart">
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color in"></span>
                  <span>入库</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color out"></span>
                  <span>出库</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color adjust"></span>
                  <span>调整</span>
                </div>
              </div>
              <div className="movement-chart-grid">
                {chartData.stockMovement.map((item, index) => (
                  <div key={index} className="movement-item">
                    <div className="movement-date">
                      {new Date(item.date).toLocaleDateString('zh-CN', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="movement-bars">
                      <div className="movement-bar in" style={{ height: `${item.stockIn * 2}px` }}>
                        <span className="movement-value">{item.stockIn}</span>
                      </div>
                      <div className="movement-bar out" style={{ height: `${item.stockOut * 2}px` }}>
                        <span className="movement-value">{item.stockOut}</span>
                      </div>
                      <div className="movement-bar adjust" style={{ height: `${item.adjustment * 2}px` }}>
                        <span className="movement-value">{item.adjustment}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-chart-data">
              <p>暂无库存流水数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 热门产品 */}
      <div className="chart-section">
        <h3>库存价值TOP10商品</h3>
        <div className="chart-container top-products">
          {chartData.topProducts.length > 0 ? (
            <div className="product-list">
              {chartData.topProducts.slice(0, 10).map((item, index) => (
                <div key={index} className="product-item">
                  <div className="product-rank">#{index + 1}</div>
                  <div className="product-info">
                    <div className="product-name">{item.product}</div>
                    <div className="product-details">
                      库存: {formatNumber(item.quantity)} | 价值: {formatCurrency(item.value)}
                    </div>
                  </div>
                  <div className="product-value-bar">
                    <div 
                      className="value-fill"
                      style={{ 
                        width: `${(item.value / Math.max(...chartData.topProducts.map(p => p.value))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-chart-data">
              <p>暂无产品数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 供应商评级分布 */}
      <div className="chart-section">
        <h3>供应商评级分布</h3>
        <div className="chart-container supplier-rating">
          {chartData.supplierDistribution.length > 0 ? (
            <div className="rating-chart">
              {chartData.supplierDistribution.map((item, index) => (
                <div key={index} className="rating-item">
                  <div className="rating-label">评级 {item.rating}</div>
                  <div className="rating-bar">
                    <div 
                      className="rating-fill"
                      style={{ 
                        width: `${item.percentage}%`,
                        background: `hsl(${120 - index * 30}, 70%, 60%)`
                      }}
                    ></div>
                  </div>
                  <div className="rating-stats">
                    {item.count}家 ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-chart-data">
              <p>暂无供应商数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 客户等级分布 */}
      <div className="chart-section">
        <h3>客户等级分布</h3>
        <div className="chart-container customer-levels">
          {chartData.customerLevels.length > 0 ? (
            <div className="levels-chart">
              {chartData.customerLevels.map((item, index) => {
                const colors = {
                  'VIP': '#ff6b6b',
                  'Gold': '#ffd93d',
                  'Silver': '#c0c0c0',
                  'Bronze': '#cd7f32'
                };
                
                return (
                  <div key={index} className="level-item">
                    <div 
                      className="level-icon"
                      style={{ background: colors[item.level as keyof typeof colors] || '#999' }}
                    >
                      {item.level}
                    </div>
                    <div className="level-info">
                      <div className="level-count">{formatNumber(item.count)}</div>
                      <div className="level-name">{item.level}客户</div>
                      <div className="level-value">{formatCurrency(item.totalValue)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="no-chart-data">
              <p>暂无客户数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;