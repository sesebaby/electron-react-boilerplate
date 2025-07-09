import React, { useState, useEffect } from 'react';
import { inventoryStockService, productService, categoryService, warehouseService } from '../../services/business';
import { Product, Category, Warehouse } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty as _TableEmpty,
  TableLoading
} from '../ui/table';

interface InventoryReportsProps {
  className?: string;
}

interface InventoryReportData {
  productId: string;
  productName: string;
  productSku: string;
  categoryName: string;
  warehouseName: string;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  avgCost: number;
  totalValue: number;
  minStock: number;
  maxStock: number;
  stockStatus: 'normal' | 'low' | 'out' | 'excess';
  turnoverRate?: number;
  daysInStock?: number;
}

interface ReportFilters {
  categoryId: string;
  warehouseId: string;
  stockStatus: string;
  dateRange: string;
}

const emptyFilters: ReportFilters = {
  categoryId: '',
  warehouseId: '',
  stockStatus: '',
  dateRange: '30'
};

export const InventoryReports: React.FC<InventoryReportsProps> = ({ className }) => {
  const [reportData, setReportData] = useState<InventoryReportData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [sortField, setSortField] = useState<keyof InventoryReportData>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generateReport();
  }, [filters]);

  const _loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesData, warehousesData] = await Promise.all([
        categoryService.findAll(),
        warehouseService.findAll()
      ]);
      
      setCategories(categoriesData);
      setWarehouses(warehousesData);
      
      await generateReport();
    } catch (err) {
      setError('加载报表数据失败');
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const _generateReport = async () => {
    try {
      const [products, stocks] = await Promise.all([
        productService.findAll(),
        inventoryStockService.findAllStocks()
      ]);

      const reportItems: InventoryReportData[] = [];

      for (const product of products) {
        // 筛选分类
        if (filters.categoryId && product.categoryId !== filters.categoryId) {
          continue;
        }

        const _productStocks = stocks.filter(s => s.productId === product.id);
        
        for (const stock of productStocks) {
          // 筛选仓库
          if (filters.warehouseId && stock.warehouseId !== filters.warehouseId) {
            continue;
          }

          const _category = categories.find(c => c.id === product.categoryId);
          const _warehouse = warehouses.find(w => w.id === stock.warehouseId);
          
          // 计算库存状态
          let stockStatus: 'normal' | 'low' | 'out' | 'excess' = 'normal';
          if (stock.currentStock === 0) {
            stockStatus = 'out';
          } else if (stock.currentStock <= product.minStock) {
            stockStatus = 'low';
          } else if (stock.currentStock >= product.maxStock) {
            stockStatus = 'excess';
          }

          // 筛选库存状态
          if (filters.stockStatus && stockStatus !== filters.stockStatus) {
            continue;
          }

          // 计算周转率（模拟数据）
          const _turnoverRate = Math.random() * 5 + 1; // 1-6次/年
          const _daysInStock = Math.floor(365 / turnoverRate);

          const reportItem: InventoryReportData = {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            categoryName: category?.name || '未分类',
            warehouseName: warehouse?.name || '未知仓库',
            currentStock: stock.currentStock,
            availableStock: stock.availableStock,
            reservedStock: stock.reservedStock,
            avgCost: stock.avgCost,
            totalValue: stock.currentStock * stock.avgCost,
            minStock: product.minStock,
            maxStock: product.maxStock,
            stockStatus,
            turnoverRate,
            daysInStock
          };

          reportItems.push(reportItem);
        }
      }

      setReportData(reportItems);
    } catch (err) {
      setError('生成报表失败');
      console.error('Failed to generate report:', err);
    }
  };

  const _handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const _handleSort = (field: keyof InventoryReportData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const _sortedData = [...reportData].sort((a, b) => {
    const _aValue = a[sortField];
    const _bValue = b[sortField];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    }
    
    return 0;
  });

  const _getStatusText = (status: string): string => {
    switch (status) {
      case 'normal': return '正常';
      case 'low': return '库存不足';
      case 'out': return '缺货';
      case 'excess': return '库存过剩';
      default: return status;
    }
  };

  const _getStatusClass = (status: string): string => {
    switch (status) {
      case 'normal': return 'inventory-status-normal';
      case 'low': return 'inventory-status-low';
      case 'out': return 'inventory-status-out';
      case 'excess': return 'inventory-status-excess';
      default: return 'inventory-status-default';
    }
  };

  const _getSummaryStats = () => {
    const _totalValue = sortedData.reduce((sum, item) => sum + item.totalValue, 0);
    const _totalItems = sortedData.length;
    const _lowStockItems = sortedData.filter(item => item.stockStatus === 'low').length;
    const _outOfStockItems = sortedData.filter(item => item.stockStatus === 'out').length;
    const _avgTurnover = sortedData.reduce((sum, item) => sum + (item.turnoverRate || 0), 0) / totalItems;

    return {
      totalValue,
      totalItems,
      lowStockItems,
      outOfStockItems,
      avgTurnover: avgTurnover || 0
    };
  };

  const _exportToCSV = () => {
    const _headers = [
      '商品编码', '商品名称', '分类', '仓库', '当前库存', '可用库存', '预留库存',
      '平均成本', '库存价值', '最小库存', '最大库存', '库存状态', '周转率', '库存天数'
    ];
    
    const _csvContent = [
      headers.join(','),
      ...sortedData.map(item => [
        item.productSku,
        item.productName,
        item.categoryName,
        item.warehouseName,
        item.currentStock,
        item.availableStock,
        item.reservedStock,
        item.avgCost.toFixed(2),
        item.totalValue.toFixed(2),
        item.minStock,
        item.maxStock,
        getStatusText(item.stockStatus),
        item.turnoverRate?.toFixed(2) || '',
        item.daysInStock || ''
      ].join(','))
    ].join('\n');

    const _blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const _link = document.createElement('a');
    const _url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `库存报表_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const _stats = getSummaryStats();

  if (loading) {
    return (
      <div className={`min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
            <p className="financial-subtitle">加载库存报表数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${className || ''}`}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold financial-title">
              库存报表
            </h1>
            <p className="financial-subtitle mt-1">库存分析、周转率和库存预警报表</p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="financial-subtitle"
            >
              <span className="mr-2">📊</span>
              导出报表
            </GlassButton>
            <GlassButton
              onClick={generateReport}
              className="financial-value-neutral"
            >
              <span className="mr-2">🔄</span>
              刷新数据
            </GlassButton>
          </div>
        </div>

        {/* 导出选项 */}
        {showExportOptions && (
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold financial-title mb-4">导出选项</h4>
            <div className="flex gap-3">
              <GlassButton
                onClick={exportToCSV}
                className="financial-value-positive"
              >
                <span className="mr-2">📄</span>
                导出CSV
              </GlassButton>
              <GlassButton
                onClick={() => setShowExportOptions(false)}
                className="financial-subtitle"
              >
                取消
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* 错误消息 */}
        {error && (
          <GlassCard className="aging-card-danger">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>❌</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="financial-value-negative hover:opacity-80 transition-opacity"
              >
                ✕
              </button>
            </div>
          </GlassCard>
        )}

        {/* 汇总统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📦</div>
            <div className="text-2xl font-bold inventory-value-items">{stats.totalItems}</div>
            <div className="text-sm financial-description">库存品种</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-2xl font-bold inventory-value-total">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
            <div className="text-sm financial-description">库存总值</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-2xl font-bold inventory-value-low">{stats.lowStockItems}</div>
            <div className="text-sm financial-description">库存不足</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">❌</div>
            <div className="text-2xl font-bold inventory-value-out">{stats.outOfStockItems}</div>
            <div className="text-sm financial-description">缺货商品</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">🔄</div>
            <div className="text-2xl font-bold inventory-value-turnover">{stats.avgTurnover.toFixed(1)}</div>
            <div className="text-sm financial-description">平均周转率</div>
          </GlassCard>
        </div>

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">商品分类</label>
              <GlassSelect
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              >
                <option value="">全部分类</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">仓库</label>
              <GlassSelect
                value={filters.warehouseId}
                onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              >
                <option value="">全部仓库</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">库存状态</label>
              <GlassSelect
                value={filters.stockStatus}
                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              >
                <option value="">全部状态</option>
                <option value="normal">正常</option>
                <option value="low">库存不足</option>
                <option value="out">缺货</option>
                <option value="excess">库存过剩</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">时间范围</label>
              <GlassSelect
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
                <option value="365">最近一年</option>
              </GlassSelect>
            </div>
          </div>
        </GlassCard>

        {/* 报表数据 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold financial-title">库存明细报表</h3>
              <span className="text-sm financial-subtitle">共 {sortedData.length} 个库存记录</span>
            </div>
          </div>

          <TableContainer height="600px">
            <Table stickyHeader minWidth="1200px">
              <TableHeader sticky>
                <TableRow>
                  <TableHead
                    onClick={() => handleSort('productSku')}
                    className="min-w-[120px] text-left cursor-pointer hover:bg-white/50"
                  >
                    商品编码 {sortField === 'productSku' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('productName')}
                    className="min-w-[150px] text-left cursor-pointer hover:bg-white/50"
                  >
                    商品名称 {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('categoryName')}
                    className="min-w-[100px] text-left cursor-pointer hover:bg-white/50"
                  >
                    分类 {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('warehouseName')}
                    className="min-w-[100px] text-left cursor-pointer hover:bg-white/50"
                  >
                    仓库 {sortField === 'warehouseName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('currentStock')}
                    className="min-w-[140px] text-left cursor-pointer hover:bg-white/50"
                  >
                    当前库存 {sortField === 'currentStock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('avgCost')}
                    className="min-w-[100px] text-right cursor-pointer hover:bg-white/50"
                  >
                    平均成本 {sortField === 'avgCost' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('totalValue')}
                    className="min-w-[120px] text-right cursor-pointer hover:bg-white/50"
                  >
                    库存价值 {sortField === 'totalValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('turnoverRate')}
                    className="min-w-[100px] text-center cursor-pointer hover:bg-white/50"
                  >
                    周转率 {sortField === 'turnoverRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('stockStatus')}
                    className="min-w-[100px] text-center cursor-pointer hover:bg-white/50"
                  >
                    状态 {sortField === 'stockStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((item, index) => (
                  <TableRow key={`${item.productId}-${item.warehouseName}`}>
                    <TableCell className="min-w-[120px]">
                      <span className="font-mono text-sm financial-table-cell">{item.productSku}</span>
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="font-medium financial-table-cell">{item.productName}</div>
                    </TableCell>
                    <TableCell className="min-w-[100px] financial-subtitle">
                      {item.categoryName}
                    </TableCell>
                    <TableCell className="min-w-[100px] financial-subtitle">
                      {item.warehouseName}
                    </TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="financial-table-cell">
                        <div className="font-semibold">{item.currentStock}</div>
                        <div className="text-xs financial-description">
                          可用: {item.availableStock} | 预留: {item.reservedStock}
                        </div>
                        <div className="text-xs financial-description">
                          范围: {item.minStock} - {item.maxStock}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px] text-right financial-table-cell">
                      ¥{item.avgCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="min-w-[120px] text-right">
                      <div className="font-semibold financial-table-cell">¥{item.totalValue.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="min-w-[100px] text-center">
                      <div className="financial-table-cell">
                        <div className="font-medium">{item.turnoverRate?.toFixed(1)}次/年</div>
                        <div className="text-xs financial-description">{item.daysInStock}天</div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[100px] text-center">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusClass(item.stockStatus)}`}>
                        {getStatusText(item.stockStatus)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {sortedData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium financial-title mb-2">没有找到库存数据</h3>
              <p className="financial-subtitle">请调整筛选条件或检查库存数据</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default InventoryReports;