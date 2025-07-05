import React, { useState, useEffect } from 'react';
import { inventoryStockService } from '../../services/business';
import { InventoryStock } from '../../types/entities';

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

export const InventoryList: React.FC<InventoryListProps> = ({ className }) => {
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

  const getStockStatusClass = (item: InventoryStock): string => {
    if (item.currentStock === 0) return 'out-of-stock';
    if (item.currentStock <= item.minStock) return 'low-stock';
    return 'normal-stock';
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
      <div className={`inventory-list ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载库存数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`inventory-list ${className || ''}`}>
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={loadInventories} className="retry-button">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`inventory-list ${className || ''}`}>
      <div className="inventory-header">
        <h2>库存列表</h2>
        <div className="inventory-actions">
          <button 
            className="action-button primary"
            onClick={() => {
              // Navigate to product management page to create new product
              window.location.hash = '#/products';
            }}
          >
            ➕ 新建库存
          </button>
          <button 
            className="action-button secondary"
            onClick={() => {
              // Export inventory data as CSV
              const headers = ['商品ID', '仓库ID', '当前库存', '最小库存', '最大库存', '单价', '总价值', '状态', '最后更新'];
              const csvData = filteredInventories.map(item => [
                item.productId,
                item.warehouseId,
                item.currentStock,
                item.minStock,
                item.maxStock,
                item.unitPrice,
                item.currentStock * item.unitPrice,
                getStockStatusText(item),
                item.lastMovementDate?.toLocaleDateString('zh-CN') || '-'
              ]);
              
              const csvContent = [headers, ...csvData]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.href = url;
              link.download = `库存列表_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
            }}
          >
            📤 导出数据
          </button>
        </div>
      </div>

      {/* 过滤器 */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <label>搜索</label>
            <input
              type="text"
              placeholder="搜索商品或仓库..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input"
            />
          </div>
          
          <div className="filter-group">
            <label>库存状态</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
              className="filter-select"
            >
              <option value="all">全部</option>
              <option value="normal">正常</option>
              <option value="low">低库存</option>
              <option value="out">缺货</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>排序方式</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="name">商品名称</option>
              <option value="stock">库存数量</option>
              <option value="value">库存价值</option>
              <option value="updated">更新时间</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>排序顺序</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="filter-select"
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>

      {/* 库存表格 */}
      <div className="inventory-table-section">
        <div className="table-header">
          <span className="table-info">
            显示 {filteredInventories.length} 条记录，共 {inventories.length} 条
          </span>
        </div>
        
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>商品ID</th>
                <th>仓库ID</th>
                <th>当前库存</th>
                <th>最小库存</th>
                <th>最大库存</th>
                <th>单价</th>
                <th>总价值</th>
                <th>状态</th>
                <th>最后更新</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventories.map((item) => (
                <tr key={item.id} className={getStockStatusClass(item)}>
                  <td className="product-cell">
                    <div className="product-info">
                      <span className="product-id">{item.productId}</span>
                    </div>
                  </td>
                  <td>{item.warehouseId}</td>
                  <td className="stock-cell">
                    <span className="stock-amount">{formatNumber(item.currentStock)}</span>
                  </td>
                  <td>{formatNumber(item.minStock)}</td>
                  <td>{formatNumber(item.maxStock)}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td className="value-cell">
                    {formatCurrency(item.currentStock * item.unitPrice)}
                  </td>
                  <td>
                    <span className={`status-badge ${getStockStatusClass(item)}`}>
                      {getStockStatusText(item)}
                    </span>
                  </td>
                  <td className="date-cell">
                    {item.lastMovementDate?.toLocaleDateString('zh-CN') || '-'}
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit" 
                      title="编辑库存"
                      onClick={() => {
                        // Navigate to stock adjustment page for this item
                        window.location.hash = `#/stock-adjust?product=${item.productId}&warehouse=${item.warehouseId}`;
                      }}
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn adjust" 
                      title="库存调整"
                      onClick={() => {
                        // Navigate to stock adjustment page
                        window.location.hash = `#/stock-adjust?product=${item.productId}&warehouse=${item.warehouseId}`;
                      }}
                    >
                      📝
                    </button>
                    <button 
                      className="action-btn delete" 
                      title="删除库存记录"
                      onClick={() => {
                        if (confirm(`确定要删除商品 ${item.productId} 在仓库 ${item.warehouseId} 的库存记录吗？`)) {
                          alert('删除功能需要后端API支持，请联系开发人员实现。');
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryList;