import React, { useState, useEffect } from 'react';
import { inventoryStockService, productService, categoryService, warehouseService } from '../../services/business';
import { Product, Category, Warehouse } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const InventoryReportsTailwind: React.FC<InventoryReportsProps> = ({ className }) => {
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

  const loadData = async () => {
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

  const generateReport = async () => {
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

        const productStocks = stocks.filter(s => s.productId === product.id);
        
        for (const stock of productStocks) {
          // 筛选仓库
          if (filters.warehouseId && stock.warehouseId !== filters.warehouseId) {
            continue;
          }

          const category = categories.find(c => c.id === product.categoryId);
          const warehouse = warehouses.find(w => w.id === stock.warehouseId);
          
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
          const turnoverRate = Math.random() * 5 + 1; // 1-6次/年
          const daysInStock = Math.floor(365 / turnoverRate);

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

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (field: keyof InventoryReportData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedData = [...reportData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
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

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'normal': return '正常';
      case 'low': return '库存不足';
      case 'out': return '缺货';
      case 'excess': return '库存过剩';
      default: return status;
    }
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50 border-green-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'out': return 'text-red-600 bg-red-50 border-red-200';
      case 'excess': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSummaryStats = () => {
    const totalValue = sortedData.reduce((sum, item) => sum + item.totalValue, 0);
    const totalItems = sortedData.length;
    const lowStockItems = sortedData.filter(item => item.stockStatus === 'low').length;
    const outOfStockItems = sortedData.filter(item => item.stockStatus === 'out').length;
    const avgTurnover = sortedData.reduce((sum, item) => sum + (item.turnoverRate || 0), 0) / totalItems;

    return {
      totalValue,
      totalItems,
      lowStockItems,
      outOfStockItems,
      avgTurnover: avgTurnover || 0
    };
  };

  const exportToCSV = () => {
    const headers = [
      '商品编码', '商品名称', '分类', '仓库', '当前库存', '可用库存', '预留库存',
      '平均成本', '库存价值', '最小库存', '最大库存', '库存状态', '周转率', '库存天数'
    ];
    
    const csvContent = [
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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `库存报表_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = getSummaryStats();

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载库存报表数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              库存报表
            </h1>
            <p className="text-gray-600 mt-1">库存分析、周转率和库存预警报表</p>
          </div>
          <div className="flex gap-3">
            <GlassButton 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <span className="mr-2">📊</span>
              导出报表
            </GlassButton>
            <GlassButton 
              onClick={generateReport}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
            >
              <span className="mr-2">🔄</span>
              刷新数据
            </GlassButton>
          </div>
        </div>

        {/* 导出选项 */}
        {showExportOptions && (
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">导出选项</h4>
            <div className="flex gap-3">
              <GlassButton 
                onClick={exportToCSV}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700"
              >
                <span className="mr-2">📄</span>
                导出CSV
              </GlassButton>
              <GlassButton 
                onClick={() => setShowExportOptions(false)}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                取消
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* 错误消息 */}
        {error && (
          <GlassCard className="border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <span>❌</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
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
            <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
            <div className="text-sm text-gray-600">库存品种</div>
          </GlassCard>
          
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-2xl font-bold text-purple-600">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
            <div className="text-sm text-gray-600">库存总值</div>
          </GlassCard>
          
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">⚠️</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
            <div className="text-sm text-gray-600">库存不足</div>
          </GlassCard>
          
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">❌</div>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
            <div className="text-sm text-gray-600">缺货商品</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">🔄</div>
            <div className="text-2xl font-bold text-green-600">{stats.avgTurnover.toFixed(1)}</div>
            <div className="text-sm text-gray-600">平均周转率</div>
          </GlassCard>
        </div>

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">商品分类</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">仓库</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">库存状态</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">时间范围</label>
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
              <h3 className="text-lg font-semibold text-gray-800">库存明细报表</h3>
              <span className="text-sm text-gray-600">共 {sortedData.length} 个库存记录</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th 
                    onClick={() => handleSort('productSku')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    商品编码 {sortField === 'productSku' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('productName')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    商品名称 {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('categoryName')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    分类 {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('warehouseName')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    仓库 {sortField === 'warehouseName' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('currentStock')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    当前库存 {sortField === 'currentStock' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('avgCost')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    平均成本 {sortField === 'avgCost' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('totalValue')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    库存价值 {sortField === 'totalValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('turnoverRate')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    周转率 {sortField === 'turnoverRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('stockStatus')} 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50"
                  >
                    状态 {sortField === 'stockStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {sortedData.map((item, index) => (
                  <tr key={`${item.productId}-${item.warehouseName}`} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{item.productSku}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.categoryName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {item.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        <div className="font-semibold">{item.currentStock}</div>
                        <div className="text-xs text-gray-500">
                          可用: {item.availableStock} | 预留: {item.reservedStock}
                        </div>
                        <div className="text-xs text-gray-400">
                          范围: {item.minStock} - {item.maxStock}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      ¥{item.avgCost.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">¥{item.totalValue.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        <div className="font-medium">{item.turnoverRate?.toFixed(1)}次/年</div>
                        <div className="text-xs text-gray-500">{item.daysInStock}天</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusClass(item.stockStatus)}`}>
                        {getStatusText(item.stockStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sortedData.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到库存数据</h3>
                <p className="text-gray-500">请调整筛选条件或检查库存数据</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default InventoryReportsTailwind;