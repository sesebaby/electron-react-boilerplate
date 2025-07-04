import React, { useState, useEffect } from 'react';
import { inventoryStockService, productService, categoryService, warehouseService } from '../../services/business';
import { Product, Category, Warehouse } from '../../types/entities';

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
      case 'normal': return 'status-normal';
      case 'low': return 'status-low';
      case 'out': return 'status-out';
      case 'excess': return 'status-excess';
      default: return '';
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
      <div className={`inventory-reports ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载库存报表数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`inventory-reports ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>库存报表</h2>
          <p>库存分析、周转率和库存预警报表</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button secondary"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            <span className="button-icon">📊</span>
            导出报表
          </button>
          <button 
            className="glass-button primary"
            onClick={generateReport}
          >
            <span className="button-icon">🔄</span>
            刷新数据
          </button>
        </div>
      </div>

      {/* 导出选项 */}
      {showExportOptions && (
        <div className="export-options">
          <div className="export-container">
            <h4>导出选项</h4>
            <div className="export-buttons">
              <button className="glass-button primary" onClick={exportToCSV}>
                <span className="button-icon">📄</span>
                导出CSV
              </button>
              <button className="glass-button secondary" onClick={() => setShowExportOptions(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 汇总统计 */}
      <div className="statistics-section">
        <div className="statistics-grid">
          <div className="stat-item total">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalItems}</div>
              <div className="stat-label">库存品种</div>
            </div>
          </div>
          
          <div className="stat-item value">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
              <div className="stat-label">库存总值</div>
            </div>
          </div>
          
          <div className="stat-item warning">
            <div className="stat-icon">⚠️</div>
            <div className="stat-content">
              <div className="stat-value">{stats.lowStockItems}</div>
              <div className="stat-label">库存不足</div>
            </div>
          </div>
          
          <div className="stat-item danger">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <div className="stat-value">{stats.outOfStockItems}</div>
              <div className="stat-label">缺货商品</div>
            </div>
          </div>

          <div className="stat-item turnover">
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <div className="stat-value">{stats.avgTurnover.toFixed(1)}</div>
              <div className="stat-label">平均周转率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选条件 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>商品分类</label>
            <select
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
              className="glass-select"
            >
              <option value="">全部分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>仓库</label>
            <select
              value={filters.warehouseId}
              onChange={(e) => handleFilterChange('warehouseId', e.target.value)}
              className="glass-select"
            >
              <option value="">全部仓库</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>库存状态</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value="normal">正常</option>
              <option value="low">库存不足</option>
              <option value="out">缺货</option>
              <option value="excess">库存过剩</option>
            </select>
          </div>

          <div className="filter-group">
            <label>时间范围</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="glass-select"
            >
              <option value="7">最近7天</option>
              <option value="30">最近30天</option>
              <option value="90">最近90天</option>
              <option value="365">最近一年</option>
            </select>
          </div>
        </div>
      </div>

      {/* 报表数据 */}
      <div className="content-section">
        <div className="section-header">
          <h3>库存明细报表</h3>
          <span className="item-count">共 {sortedData.length} 个库存记录</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table sortable-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('productSku')} className="sortable">
                  商品编码 {sortField === 'productSku' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('productName')} className="sortable">
                  商品名称 {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('categoryName')} className="sortable">
                  分类 {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('warehouseName')} className="sortable">
                  仓库 {sortField === 'warehouseName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('currentStock')} className="sortable">
                  当前库存 {sortField === 'currentStock' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('avgCost')} className="sortable">
                  平均成本 {sortField === 'avgCost' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('totalValue')} className="sortable">
                  库存价值 {sortField === 'totalValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('turnoverRate')} className="sortable">
                  周转率 {sortField === 'turnoverRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('stockStatus')} className="sortable">
                  状态 {sortField === 'stockStatus' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <tr key={`${item.productId}-${item.warehouseName}`}>
                  <td className="code-cell">
                    <span className="product-sku">{item.productSku}</span>
                  </td>
                  <td className="name-cell">
                    <div className="product-info">
                      <div className="product-name">{item.productName}</div>
                    </div>
                  </td>
                  <td className="category-cell">
                    {item.categoryName}
                  </td>
                  <td className="warehouse-cell">
                    {item.warehouseName}
                  </td>
                  <td className="stock-cell">
                    <div className="stock-info">
                      <div className="current-stock">{item.currentStock}</div>
                      <div className="stock-details">
                        可用: {item.availableStock} | 预留: {item.reservedStock}
                      </div>
                      <div className="stock-range">
                        范围: {item.minStock} - {item.maxStock}
                      </div>
                    </div>
                  </td>
                  <td className="cost-cell">
                    ¥{item.avgCost.toFixed(2)}
                  </td>
                  <td className="value-cell">
                    <div className="value-amount">¥{item.totalValue.toLocaleString()}</div>
                  </td>
                  <td className="turnover-cell">
                    <div className="turnover-info">
                      <div className="turnover-rate">{item.turnoverRate?.toFixed(1)}次/年</div>
                      <div className="days-in-stock">{item.daysInStock}天</div>
                    </div>
                  </td>
                  <td className="status-cell">
                    <span className={`status-badge ${getStatusClass(item.stockStatus)}`}>
                      {getStatusText(item.stockStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedData.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>没有找到库存数据</h3>
              <p>请调整筛选条件或检查库存数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;