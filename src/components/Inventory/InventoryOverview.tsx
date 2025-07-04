import React, { useState, useEffect } from 'react';
import { inventoryStockService } from '../../services/business';
import { InventoryStock } from '../../types/entities';

interface InventoryOverviewProps {
  className?: string;
}

interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  categories: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  recentMovements: Array<{
    id: string;
    productName: string;
    type: 'in' | 'out' | 'adjust';
    quantity: number;
    timestamp: Date;
  }>;
}

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({ className }) => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInventoryStats();
  }, []);

  const loadInventoryStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 获取库存统计数据
      const [
        allStocks,
        lowStockItems,
        outOfStockItems
      ] = await Promise.all([
        inventoryStockService.findAllStocks(),
        inventoryStockService.findLowStockItems(),
        inventoryStockService.findOutOfStockItems()
      ]);

      // 计算总值
      const totalValue = allStocks.reduce((sum, stock) => {
        return sum + (stock.currentStock * stock.unitPrice);
      }, 0);

      // 按分类统计
      const categoryStats = new Map<string, { count: number; value: number }>();
      allStocks.forEach(stock => {
        const category = stock.productId; // 简化处理，实际应该关联Product表
        if (!categoryStats.has(category)) {
          categoryStats.set(category, { count: 0, value: 0 });
        }
        const stat = categoryStats.get(category)!;
        stat.count += 1;
        stat.value += stock.currentStock * stock.unitPrice;
      });

      const categories = Array.from(categoryStats.entries()).map(([name, stat]) => ({
        name,
        count: stat.count,
        value: stat.value
      }));

      // 模拟最近库存变动
      const recentMovements = allStocks.slice(0, 5).map(stock => ({
        id: stock.id,
        productName: `商品-${stock.productId}`,
        type: 'in' as const,
        quantity: Math.floor(Math.random() * 100),
        timestamp: new Date()
      }));

      setStats({
        totalItems: allStocks.length,
        totalValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        categories,
        recentMovements
      });
    } catch (err) {
      setError('加载库存统计失败');
      console.error('Failed to load inventory stats:', err);
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

  const getMovementIcon = (type: 'in' | 'out' | 'adjust'): string => {
    switch (type) {
      case 'in': return '📦';
      case 'out': return '📤';
      case 'adjust': return '📝';
      default: return '📊';
    }
  };

  const getMovementColor = (type: 'in' | 'out' | 'adjust'): string => {
    switch (type) {
      case 'in': return '#52c41a';
      case 'out': return '#ff4d4f';
      case 'adjust': return '#faad14';
      default: return '#1890ff';
    }
  };

  if (loading) {
    return (
      <div className={`inventory-overview ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载库存数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inventory-overview ${className || ''}`}>
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={loadInventoryStats} className="retry-button">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`inventory-overview ${className || ''}`}>
      <div className="inventory-header">
        <h2>库存概览</h2>
        <div className="inventory-actions">
          <button className="action-button primary">
            📦 库存入库
          </button>
          <button className="action-button secondary">
            📤 库存出库
          </button>
          <button className="action-button secondary">
            🔄 库存调整
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* 库存统计卡片 */}
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>商品总数</h3>
                <p className="stat-value">{formatNumber(stats.totalItems)}</p>
                <span className="stat-label">种商品</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>库存总值</h3>
                <p className="stat-value">{formatCurrency(stats.totalValue)}</p>
                <span className="stat-label">当前价值</span>
              </div>
            </div>

            <div className="stat-card warning">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <h3>低库存</h3>
                <p className="stat-value">{formatNumber(stats.lowStockCount)}</p>
                <span className="stat-label">需要补货</span>
              </div>
            </div>

            <div className="stat-card danger">
              <div className="stat-icon">🚨</div>
              <div className="stat-content">
                <h3>缺货</h3>
                <p className="stat-value">{formatNumber(stats.outOfStockCount)}</p>
                <span className="stat-label">紧急补货</span>
              </div>
            </div>
          </div>

          {/* 分类统计 */}
          <div className="inventory-section">
            <h3>分类统计</h3>
            <div className="category-grid">
              {stats.categories.map((category, index) => (
                <div key={index} className="category-card">
                  <div className="category-header">
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">{category.count}种</span>
                  </div>
                  <div className="category-value">
                    {formatCurrency(category.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最近库存变动 */}
          <div className="inventory-section">
            <h3>最近库存变动</h3>
            <div className="movements-list">
              {stats.recentMovements.map((movement) => (
                <div key={movement.id} className="movement-item">
                  <div className="movement-icon" style={{ color: getMovementColor(movement.type) }}>
                    {getMovementIcon(movement.type)}
                  </div>
                  <div className="movement-content">
                    <div className="movement-product">{movement.productName}</div>
                    <div className="movement-details">
                      数量: {formatNumber(movement.quantity)} | 
                      时间: {movement.timestamp.toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="movement-type">
                    {movement.type === 'in' ? '入库' : 
                     movement.type === 'out' ? '出库' : '调整'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InventoryOverview;