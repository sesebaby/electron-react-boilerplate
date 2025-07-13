import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceManager } from '../../services/core';
import { InventoryStock } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import { Card, CardContent } from '../ui/card';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
  TableLoading
} from '../ui/table';
import { formatCurrency, formatNumber } from '../../utils/formatters';

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

export const InventoryList: React.FC<InventoryListProps> = React.memo(({ className }) => {
  const [inventories, setInventories] = useState<InventoryStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: 'all',
    stockStatus: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const loadInventories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const inventoryService = serviceManager.getInventoryService();
      // TODO: Implement method to get all inventory stocks
      const data: any[] = []; // Mock data for now
      setInventories(data);
    } catch (err) {
      setError('加载库存数据失败');
      console.error('Failed to load inventories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventories();
  }, [loadInventories]);

  // 使用useMemo优化过滤和排序逻辑
  const filteredInventories = useMemo(() => {
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
      let aValue: string | number | Date, bValue: string | number | Date;
      
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
          aValue = a.lastMovementDate || new Date(0);
          bValue = b.lastMovementDate || new Date(0);
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

    return filtered;
  }, [inventories, filters]);

  const getStockStatusStyles = useCallback((item: InventoryStock): string => {
    if (item.currentStock === 0) return 'text-red-300 bg-red-500/20 border-red-400/30';
    if (item.currentStock <= item.minStock) return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
    return 'text-green-300 bg-green-500/20 border-green-400/30';
  }, []);

  const getStockStatusText = useCallback((item: InventoryStock): string => {
    if (item.currentStock === 0) return '缺货';
    if (item.currentStock <= item.minStock) return '低库存';
    return '正常';
  }, []);


  const handleFilterChange = useCallback((key: keyof InventoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 加载状态
  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        {/* 页面头部 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">库存列表</h1>
            <p className="text-white/70">查看和管理所有库存信息</p>
          </div>
        </div>
        <Card className="glass-card h-full">
          <CardContent className="p-0 h-full">
            <TableLoading message="正在加载库存数据..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        {/* 页面头部 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">库存列表</h1>
            <p className="text-white/70">查看和管理所有库存信息</p>
          </div>
        </div>
        <GlassCard className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-white mb-2">加载失败</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <GlassButton onClick={loadInventories}>重新加载</GlassButton>
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
      <Card className="glass-card h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* 表格标题 */}
          <div className="flex-shrink-0 p-4 border-b border-white/20 bg-white/5">
            <h3 className="text-lg font-semibold text-white/90">
              库存列表 (显示 {filteredInventories.length} 条，共 {inventories.length} 条)
            </h3>
          </div>

          {/* 空状态检查 */}
          {filteredInventories.length === 0 ? (
            <TableEmpty
              icon={<div className="text-6xl">📦</div>}
              message="暂无数据"
              description="请调整搜索条件或创建新的库存记录"
            />
          ) : (
            /* 表格内容 */
            <TableContainer height="600px" className="flex-1">
              <Table stickyHeader minWidth="1200px">
                <TableHeader sticky>
                  <TableRow>
                    <TableHead
                      fixed
                      fixedPosition="left"
                      fixedOffset={0}
                      className="min-w-[120px] table-first-column-enhanced"
                    >
                      商品ID
                    </TableHead>
                    <TableHead className="min-w-[120px] table-header-enhanced">仓库ID</TableHead>
                    <TableHead className="min-w-[100px] text-center table-header-enhanced">当前库存</TableHead>
                    <TableHead className="min-w-[100px] text-center table-header-enhanced">最小库存</TableHead>
                    <TableHead className="min-w-[100px] text-center table-header-enhanced">最大库存</TableHead>
                    <TableHead className="min-w-[100px] text-right table-header-enhanced">单价</TableHead>
                    <TableHead className="min-w-[100px] text-right table-header-enhanced">总价值</TableHead>
                    <TableHead className="min-w-[80px] text-center table-header-enhanced">状态</TableHead>
                    <TableHead className="min-w-[100px] table-header-enhanced">最后更新</TableHead>
                    <TableHead className="min-w-[120px] text-center table-header-enhanced">操作</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredInventories.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell 
                        fixed 
                        fixedPosition="left" 
                        fixedOffset={0}
                        className="min-w-[120px]"
                      >
                        <div className="font-mono text-white">{item.productId}</div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="font-mono text-white/80">{item.warehouseId}</div>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        <span className="font-mono text-white font-semibold">
                          {formatNumber(item.currentStock)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        <span className="font-mono text-white/80">
                          {formatNumber(item.minStock)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        <span className="font-mono text-white/80">
                          {formatNumber(item.maxStock)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-right">
                        <span className="font-mono text-white/80">
                          {formatCurrency(item.unitPrice)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-right">
                        <span className="font-mono text-white font-semibold">
                          {formatCurrency(item.currentStock * item.unitPrice)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[80px] text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStockStatusStyles(item)}`}>
                          {getStockStatusText(item)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[100px]">
                        <span className="text-white/70 text-sm">
                          {item.lastMovementDate?.toLocaleDateString('zh-CN') || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px] text-center">
                        <div className="flex gap-2 justify-center">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default InventoryList;