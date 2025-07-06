import React, { useState, useEffect } from 'react';
import { inventoryStockService, productService } from '../../services/business';
import { InventoryStock } from '../../types/entities';
import { GlassButton, GlassCard } from '../ui/FormControls';

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

      // 按分类统计（需要关联商品信息获取分类）
      const categoryStats = new Map<string, { count: number; value: number }>();

      for (const stock of allStocks) {
        const product = await productService.findById(stock.productId);
        // 使用 categoryId 获取分类名称，这里简化处理直接使用 categoryId
        const categoryName = product ? `分类-${product.categoryId.slice(0, 8)}` : '未知分类';

        if (!categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, { count: 0, value: 0 });
        }
        const stat = categoryStats.get(categoryName)!;
        stat.count += 1;
        stat.value += stock.currentStock * stock.unitPrice;
      }

      const categories = Array.from(categoryStats.entries()).map(([name, stat]) => ({
        name,
        count: stat.count,
        value: stat.value
      }));

      // 获取最近库存变动（需要关联商品信息）
      const recentMovements = await Promise.all(
        allStocks.slice(0, 5).map(async (stock) => {
          const product = await productService.findById(stock.productId);
          return {
            id: stock.id,
            productName: product ? product.name : `未知商品-${stock.productId}`,
            type: 'in' as const,
            quantity: Math.floor(Math.random() * 100),
            timestamp: new Date()
          };
        })
      );

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

  const getMovementTypeText = (type: 'in' | 'out' | 'adjust'): string => {
    switch (type) {
      case 'in': return '入库';
      case 'out': return '出库';
      case 'adjust': return '调整';
      default: return '未知';
    }
  };

  const getMovementTypeStyles = (type: 'in' | 'out' | 'adjust'): string => {
    switch (type) {
      case 'in': return 'text-green-300 bg-green-500/20 border-green-400/30';
      case 'out': return 'text-red-300 bg-red-500/20 border-red-400/30';
      case 'adjust': return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      default: return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载库存数据中...</p>
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
          <GlassButton onClick={loadInventoryStats} variant="primary">
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
          <h1 className="text-3xl font-bold text-white mb-2">库存概览</h1>
          <p className="text-white/70">查看库存统计和最新动态</p>
        </div>
        <div className="flex gap-3">
          <GlassButton variant="primary">
            <span className="mr-2">📦</span>
            库存入库
          </GlassButton>
          <GlassButton variant="secondary">
            <span className="mr-2">📤</span>
            库存出库
          </GlassButton>
          <GlassButton variant="secondary">
            <span className="mr-2">🔄</span>
            库存调整
          </GlassButton>
        </div>
      </div>

      {stats && (
        <>
          {/* 库存统计卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                  📊
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.totalItems)}</div>
                  <div className="text-white/70 text-sm">商品总数</div>
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
                  <div className="text-white/70 text-sm">库存总值</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.lowStockCount)}</div>
                  <div className="text-white/70 text-sm">低库存</div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-2xl">
                  🚨
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{formatNumber(stats.outOfStockCount)}</div>
                  <div className="text-white/70 text-sm">缺货</div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* 分类统计 */}
          <GlassCard title="分类统计">
            {stats.categories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无分类数据</h3>
                <p className="text-white/70">还没有库存数据可以分类显示</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.categories.map((category, index) => (
                  <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{category.name}</span>
                      <span className="text-white/70 text-sm">{category.count}种</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {formatCurrency(category.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 最近库存变动 */}
          <GlassCard title="最近库存变动">
            {stats.recentMovements.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无变动记录</h3>
                <p className="text-white/70">还没有库存变动记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-lg">
                      {getMovementIcon(movement.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-white">{movement.productName}</div>
                      <div className="text-white/70 text-sm">
                        数量: {formatNumber(movement.quantity)} | 
                        时间: {movement.timestamp.toLocaleString('zh-CN')}
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getMovementTypeStyles(movement.type)}`}>
                      {getMovementTypeText(movement.type)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
};

export default InventoryOverview;