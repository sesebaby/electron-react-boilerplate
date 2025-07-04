import React, { useState, useEffect } from 'react';
import { inventoryStockService } from '../../services/business';
import { InventoryStock } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface InventoryListProps {
  className?: string;
}

interface InventoryFilters {
  search: string;
  category: string;
  stockStatus: 'all' | 'low' | 'out' | 'normal';
  sortBy: 'name' | 'stock' | 'value' | 'updated';
  sortOrder: 'asc' | 'desc';
}

export const InventoryListTailwind: React.FC<InventoryListProps> = ({ className }) => {
  const [inventories, setInventories] = useState<InventoryStock[]>([]);
  const [filteredInventories, setFilteredInventories] = useState<InventoryStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  useEffect(() => {
    loadInventories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [inventories, filters]);

  const loadInventories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryStockService.findAllStocks();
      setInventories(data);
    } catch (err) {
      setError('加载库存数据失败');
      console.error('Failed to load inventories:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...inventories];

    // 搜索过滤
    if (filters.search) {
      filtered = filtered.filter(item => 
        item.productId.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.warehouseId.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // 库存状态过滤
    switch (filters.stockStatus) {
      case 'low':
        filtered = filtered.filter(item => item.currentStock <= item.minStock);
        break;
      case 'out':
        filtered = filtered.filter(item => item.currentStock === 0);
        break;
      case 'normal':
        filtered = filtered.filter(item => item.currentStock > item.minStock);
        break;
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.productId;
          bValue = b.productId;
          break;
        case 'stock':
          aValue = a.currentStock;
          bValue = b.currentStock;
          break;
        case 'value':
          aValue = a.currentStock * a.unitPrice;
          bValue = b.currentStock * b.unitPrice;
          break;
        case 'updated':
          aValue = a.lastMovementDate;
          bValue = b.lastMovementDate;
          break;
        default:
          aValue = a.productId;
          bValue = b.productId;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredInventories(filtered);
  };

  const getStockStatusStyles = (item: InventoryStock): string => {
    if (item.currentStock === 0) return 'text-red-300 bg-red-500/20 border-red-400/30';
    if (item.currentStock <= item.minStock) return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
    return 'text-green-300 bg-green-500/20 border-green-400/30';
  };

  const getStockStatusText = (item: InventoryStock): string => {
    if (item.currentStock === 0) return '缺货';
    if (item.currentStock <= item.minStock) return '低库存';
    return '正常';
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

  const handleFilterChange = (key: keyof InventoryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
          <GlassButton onClick={loadInventories} variant="primary">
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
          <h1 className="text-3xl font-bold text-white mb-2">库存列表</h1>
          <p className="text-white/70">查看和管理所有库存信息</p>
        </div>
        <div className="flex gap-3">
          <GlassButton variant="primary">
            <span className="mr-2">➕</span>
            新建库存
          </GlassButton>
          <GlassButton variant="secondary">
            <span className="mr-2">📤</span>
            导出数据
          </GlassButton>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassInput
            label="搜索"
            type="text"
            placeholder="搜索商品或仓库..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          
          <GlassSelect
            label="库存状态"
            value={filters.stockStatus}
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
          >
            <option value="all">全部</option>
            <option value="normal">正常</option>
            <option value="low">低库存</option>
            <option value="out">缺货</option>
          </GlassSelect>
          
          <GlassSelect
            label="排序方式"
            value={filters.sortBy}
            onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          >
            <option value="name">商品名称</option>
            <option value="stock">库存数量</option>
            <option value="value">库存价值</option>
            <option value="updated">更新时间</option>
          </GlassSelect>
          
          <GlassSelect
            label="排序顺序"
            value={filters.sortOrder}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          >
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 库存表格 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            库存列表 (显示 {filteredInventories.length} 条，共 {inventories.length} 条)
          </h3>
        </div>

        {filteredInventories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到库存数据</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的库存记录</p>
            <GlassButton variant="primary">
              新建库存
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">商品ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">仓库ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">当前库存</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">最小库存</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">最大库存</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">单价</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">总价值</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[80px]">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">最后更新</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventories.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono text-white">{item.productId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-white/80">{item.warehouseId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white font-semibold">
                        {formatNumber(item.currentStock)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white/80">
                        {formatNumber(item.minStock)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white/80">
                        {formatNumber(item.maxStock)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white/80">
                        {formatCurrency(item.unitPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-white font-semibold">
                        {formatCurrency(item.currentStock * item.unitPrice)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStockStatusStyles(item)}`}>
                        {getStockStatusText(item)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-white/70 text-sm">
                        {item.lastMovementDate?.toLocaleDateString('zh-CN') || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 rounded hover:bg-yellow-500/30 transition-colors"
                          title="调整"
                        >
                          📝
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default InventoryListTailwind;