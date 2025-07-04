import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryTransaction, TransactionType } from '../../types/entities';
import './Inventory.css';

interface TransactionRecordsProps {
  className?: string;
}

interface TransactionFilter {
  startDate: string;
  endDate: string;
  productId: string;
  warehouseId: string;
  transactionType: TransactionType | '';
  operator: string;
  searchTerm: string;
}

const emptyFilter: TransactionFilter = {
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30天前
  endDate: new Date().toISOString().split('T')[0], // 今天
  productId: '',
  warehouseId: '',
  transactionType: '',
  operator: '',
  searchTerm: ''
};

export const TransactionRecords: React.FC<TransactionRecordsProps> = ({ className }) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>(emptyFilter);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [transactionsData, productsData, warehousesData] = await Promise.all([
        inventoryStockService.findAllTransactions(),
        productService.findAll(),
        warehouseService.findAll()
      ]);
      
      // 按创建时间降序排序
      const sortedTransactions = transactionsData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTransactions(sortedTransactions);
      setProducts(productsData);
      setWarehouses(warehousesData);
      
    } catch (err) {
      setError('加载交易记录失败');
      console.error('Failed to load transaction records:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // 日期过滤
    if (filter.startDate) {
      const startDate = new Date(filter.startDate);
      filtered = filtered.filter(t => new Date(t.createdAt) >= startDate);
    }
    
    if (filter.endDate) {
      const endDate = new Date(filter.endDate + 'T23:59:59');
      filtered = filtered.filter(t => new Date(t.createdAt) <= endDate);
    }

    // 商品过滤
    if (filter.productId) {
      filtered = filtered.filter(t => t.productId === filter.productId);
    }

    // 仓库过滤
    if (filter.warehouseId) {
      filtered = filtered.filter(t => t.warehouseId === filter.warehouseId);
    }

    // 交易类型过滤
    if (filter.transactionType) {
      filtered = filtered.filter(t => t.transactionType === filter.transactionType);
    }

    // 操作员过滤
    if (filter.operator) {
      filtered = filtered.filter(t => 
        t.operator.toLowerCase().includes(filter.operator.toLowerCase())
      );
    }

    // 搜索词过滤（搜索交易单号、备注等）
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.transactionNo.toLowerCase().includes(term) ||
        (t.remark && t.remark.toLowerCase().includes(term)) ||
        (t.referenceType && t.referenceType.toLowerCase().includes(term)) ||
        (t.referenceId && t.referenceId.toLowerCase().includes(term))
      );
    }

    setFilteredTransactions(filtered);
    setCurrentPage(1); // 重置到第一页
  };

  const updateFilter = (field: keyof TransactionFilter, value: string) => {
    setFilter(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilter(emptyFilter);
  };

  const exportTransactions = () => {
    // 简单的CSV导出
    const headers = [
      '交易单号', '交易类型', '商品', '仓库', '数量', '单价', '总金额', 
      '参考类型', '参考单号', '操作员', '备注', '创建时间'
    ];
    
    const csvData = filteredTransactions.map(t => [
      t.transactionNo,
      getTransactionTypeText(t.transactionType),
      getProductName(t.productId),
      getWarehouseName(t.warehouseId),
      t.quantity.toString(),
      t.unitPrice.toString(),
      t.totalAmount.toString(),
      t.referenceType || '',
      t.referenceId || '',
      t.operator,
      t.remark || '',
      new Date(t.createdAt).toLocaleString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `库存交易记录_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : `未知商品(${productId})`;
  };

  const getWarehouseName = (warehouseId: string): string => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : `未知仓库(${warehouseId})`;
  };

  const getTransactionTypeText = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.IN: return '入库';
      case TransactionType.OUT: return '出库';
      case TransactionType.ADJUST: return '调整';
      default: return type;
    }
  };

  const getTransactionTypeClass = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.IN: return 'transaction-in';
      case TransactionType.OUT: return 'transaction-out';
      case TransactionType.ADJUST: return 'transaction-adjust';
      default: return '';
    }
  };

  const getTransactionIcon = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.IN: return '📥';
      case TransactionType.OUT: return '📤';
      case TransactionType.ADJUST: return '⚖️';
      default: return '📋';
    }
  };

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatAmount = (amount: number): string => {
    return amount >= 0 ? `+¥${amount.toFixed(2)}` : `-¥${Math.abs(amount).toFixed(2)}`;
  };

  const getStatistics = () => {
    const stats = filteredTransactions.reduce((acc, t) => {
      acc.total++;
      switch (t.transactionType) {
        case TransactionType.IN:
          acc.inCount++;
          acc.inAmount += t.totalAmount;
          break;
        case TransactionType.OUT:
          acc.outCount++;
          acc.outAmount += Math.abs(t.totalAmount);
          break;
        case TransactionType.ADJUST:
          acc.adjustCount++;
          acc.adjustAmount += Math.abs(t.totalAmount);
          break;
      }
      return acc;
    }, {
      total: 0,
      inCount: 0,
      outCount: 0,
      adjustCount: 0,
      inAmount: 0,
      outAmount: 0,
      adjustAmount: 0
    });

    return stats;
  };

  // 分页计算
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTransactions = filteredTransactions.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);

  const statistics = getStatistics();

  if (loading) {
    return (
      <div className={`transaction-records ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载交易记录中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`transaction-records ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>库存交易记录</h2>
          <p>查看和分析所有库存变动的详细记录</p>
        </div>
        <div className="header-actions">
          <button 
            type="button"
            className="glass-button secondary"
            onClick={resetFilters}
          >
            <span className="button-icon">🔄</span>
            重置筛选
          </button>
          <button 
            type="button"
            className="glass-button primary"
            onClick={exportTransactions}
            disabled={filteredTransactions.length === 0}
          >
            <span className="button-icon">📊</span>
            导出记录
          </button>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}

      {/* 统计信息 */}
      <div className="statistics-section">
        <div className="statistics-grid">
          <div className="stat-item total">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.total}</div>
              <div className="stat-label">总交易数</div>
            </div>
          </div>
          
          <div className="stat-item in">
            <div className="stat-icon">📥</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.inCount}</div>
              <div className="stat-label">入库交易</div>
              <div className="stat-amount">¥{statistics.inAmount.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="stat-item out">
            <div className="stat-icon">📤</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.outCount}</div>
              <div className="stat-label">出库交易</div>
              <div className="stat-amount">¥{statistics.outAmount.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="stat-item adjust">
            <div className="stat-icon">⚖️</div>
            <div className="stat-content">
              <div className="stat-value">{statistics.adjustCount}</div>
              <div className="stat-label">调整交易</div>
              <div className="stat-amount">¥{statistics.adjustAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="filter-section">
        <div className="filter-header">
          <h3>筛选条件</h3>
          <span className="filter-results">找到 {filteredTransactions.length} 条记录</span>
        </div>
        
        <div className="filter-grid">
          <div className="filter-group">
            <label>开始日期</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="glass-input"
            />
          </div>
          
          <div className="filter-group">
            <label>结束日期</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="glass-input"
            />
          </div>
          
          <div className="filter-group">
            <label>商品筛选</label>
            <select
              value={filter.productId}
              onChange={(e) => updateFilter('productId', e.target.value)}
              className="glass-select"
            >
              <option value="">全部商品</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>仓库筛选</label>
            <select
              value={filter.warehouseId}
              onChange={(e) => updateFilter('warehouseId', e.target.value)}
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
            <label>交易类型</label>
            <select
              value={filter.transactionType}
              onChange={(e) => updateFilter('transactionType', e.target.value as TransactionType)}
              className="glass-select"
            >
              <option value="">全部类型</option>
              <option value={TransactionType.IN}>入库</option>
              <option value={TransactionType.OUT}>出库</option>
              <option value={TransactionType.ADJUST}>调整</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>操作员</label>
            <input
              type="text"
              value={filter.operator}
              onChange={(e) => updateFilter('operator', e.target.value)}
              className="glass-input"
              placeholder="操作员姓名"
            />
          </div>
          
          <div className="filter-group">
            <label>搜索内容</label>
            <input
              type="text"
              value={filter.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="glass-input"
              placeholder="交易单号、备注等"
            />
          </div>
        </div>
      </div>

      {/* 交易记录列表 */}
      <div className="records-section">
        <div className="section-header">
          <h3>交易记录</h3>
          <div className="pagination-info">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="empty-records">
            <div className="empty-icon">📋</div>
            <h3>没有找到交易记录</h3>
            <p>请调整筛选条件或检查时间范围</p>
          </div>
        ) : (
          <>
            <div className="records-table-container">
              <table className="records-table">
                <thead>
                  <tr>
                    <th>交易信息</th>
                    <th>商品</th>
                    <th>仓库</th>
                    <th>数量变动</th>
                    <th>金额</th>
                    <th>参考信息</th>
                    <th>操作员</th>
                    <th>交易时间</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map(transaction => (
                    <tr key={transaction.id} className={getTransactionTypeClass(transaction.transactionType)}>
                      <td className="transaction-info-cell">
                        <div className="transaction-info">
                          <div className="transaction-header">
                            <span className="transaction-icon">
                              {getTransactionIcon(transaction.transactionType)}
                            </span>
                            <span className="transaction-no">{transaction.transactionNo}</span>
                          </div>
                          <div className="transaction-type">
                            <span className={`type-badge ${transaction.transactionType}`}>
                              {getTransactionTypeText(transaction.transactionType)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="product-cell">
                        <div className="product-info">
                          <div className="product-name">{getProductName(transaction.productId)}</div>
                        </div>
                      </td>
                      <td>{getWarehouseName(transaction.warehouseId)}</td>
                      <td className={`quantity-cell ${transaction.transactionType}`}>
                        <span className="quantity-value">
                          {transaction.transactionType === TransactionType.OUT ? '-' : '+'}
                          {Math.abs(transaction.quantity).toFixed(2)}
                        </span>
                        <div className="unit-price">
                          单价: ¥{transaction.unitPrice.toFixed(2)}
                        </div>
                      </td>
                      <td className={`amount-cell ${transaction.transactionType}`}>
                        {formatAmount(transaction.totalAmount)}
                      </td>
                      <td className="reference-cell">
                        {transaction.referenceType && (
                          <div className="reference-info">
                            <div className="reference-type">{transaction.referenceType}</div>
                            {transaction.referenceId && (
                              <div className="reference-id">{transaction.referenceId}</div>
                            )}
                          </div>
                        )}
                        {transaction.remark && (
                          <div className="transaction-remark" title={transaction.remark}>
                            {transaction.remark.length > 30 
                              ? transaction.remark.substring(0, 30) + '...' 
                              : transaction.remark}
                          </div>
                        )}
                      </td>
                      <td>{transaction.operator}</td>
                      <td className="datetime-cell">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  首页
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  上一页
                </button>
                
                {/* 页码显示 */}
                <div className="page-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          className={`page-number ${pageNum === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
                
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一页
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  尾页
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionRecords;