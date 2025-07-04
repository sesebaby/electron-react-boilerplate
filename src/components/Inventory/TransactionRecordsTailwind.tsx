import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryTransaction, TransactionType } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const TransactionRecordsTailwind: React.FC<TransactionRecordsProps> = ({ className }) => {
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

  const getTransactionTypeStyles = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.IN: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case TransactionType.OUT: return 'text-red-300 bg-red-500/20 border-red-400/30';
      case TransactionType.ADJUST: return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      default: return 'text-white/80';
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

  const getAmountStyles = (type: TransactionType): string => {
    switch (type) {
      case TransactionType.IN: return 'text-green-300';
      case TransactionType.OUT: return 'text-red-300';
      case TransactionType.ADJUST: return 'text-yellow-300';
      default: return 'text-white';
    }
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
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载交易记录中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">库存交易记录</h1>
          <p className="text-white/70">查看和分析所有库存变动的详细记录</p>
        </div>
        <div className="flex gap-3">
          <GlassButton
            type="button"
            variant="secondary"
            onClick={resetFilters}
          >
            <span className="mr-2">🔄</span>
            重置筛选
          </GlassButton>
          <GlassButton
            type="button"
            variant="primary"
            onClick={exportTransactions}
            disabled={filteredTransactions.length === 0}
          >
            <span className="mr-2">📊</span>
            导出记录
          </GlassButton>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl">❌</span>
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
              📋
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics.total}</div>
              <div className="text-white/70 text-sm">总交易数</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
              📥
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics.inCount}</div>
              <div className="text-white/70 text-sm">入库交易</div>
              <div className="text-green-300 text-sm">¥{statistics.inAmount.toFixed(2)}</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-2xl">
              📤
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics.outCount}</div>
              <div className="text-white/70 text-sm">出库交易</div>
              <div className="text-red-300 text-sm">¥{statistics.outAmount.toFixed(2)}</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
              ⚖️
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics.adjustCount}</div>
              <div className="text-white/70 text-sm">调整交易</div>
              <div className="text-yellow-300 text-sm">¥{statistics.adjustAmount.toFixed(2)}</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* 筛选区域 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">筛选条件</h3>
          <span className="text-white/70">找到 {filteredTransactions.length} 条记录</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <GlassInput
            label="开始日期"
            type="date"
            value={filter.startDate}
            onChange={(e) => updateFilter('startDate', e.target.value)}
          />
          
          <GlassInput
            label="结束日期"
            type="date"
            value={filter.endDate}
            onChange={(e) => updateFilter('endDate', e.target.value)}
          />
          
          <GlassSelect
            label="商品筛选"
            value={filter.productId}
            onChange={(e) => updateFilter('productId', e.target.value)}
          >
            <option value="">全部商品</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </GlassSelect>
          
          <GlassSelect
            label="仓库筛选"
            value={filter.warehouseId}
            onChange={(e) => updateFilter('warehouseId', e.target.value)}
          >
            <option value="">全部仓库</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </GlassSelect>
          
          <GlassSelect
            label="交易类型"
            value={filter.transactionType}
            onChange={(e) => updateFilter('transactionType', e.target.value as TransactionType)}
          >
            <option value="">全部类型</option>
            <option value={TransactionType.IN}>入库</option>
            <option value={TransactionType.OUT}>出库</option>
            <option value={TransactionType.ADJUST}>调整</option>
          </GlassSelect>
          
          <GlassInput
            label="操作员"
            type="text"
            value={filter.operator}
            onChange={(e) => updateFilter('operator', e.target.value)}
            placeholder="操作员姓名"
          />
          
          <GlassInput
            label="搜索内容"
            type="text"
            value={filter.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            placeholder="交易单号、备注等"
          />
        </div>
      </GlassCard>

      {/* 交易记录列表 */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">交易记录</h3>
          <div className="text-white/70">
            第 {currentPage} 页，共 {totalPages} 页
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到交易记录</h3>
            <p className="text-white/70">请调整筛选条件或检查时间范围</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">交易信息</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">商品</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">仓库</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">数量变动</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">金额</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">参考信息</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">操作员</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">交易时间</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getTransactionIcon(transaction.transactionType)}
                            </span>
                            <span className="font-mono text-white text-sm">{transaction.transactionNo}</span>
                          </div>
                          <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getTransactionTypeStyles(transaction.transactionType)}`}>
                            {getTransactionTypeText(transaction.transactionType)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white">{getProductName(transaction.productId)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white/80">{getWarehouseName(transaction.warehouseId)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className={`font-mono font-semibold ${getAmountStyles(transaction.transactionType)}`}>
                            {transaction.transactionType === TransactionType.OUT ? '-' : '+'}
                            {Math.abs(transaction.quantity).toFixed(2)}
                          </div>
                          <div className="text-white/60 text-xs">
                            单价: ¥{transaction.unitPrice.toFixed(2)}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-mono font-semibold ${getAmountStyles(transaction.transactionType)}`}>
                          {formatAmount(transaction.totalAmount)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {transaction.referenceType && (
                            <div className="text-white/80 text-sm">{transaction.referenceType}</div>
                          )}
                          {transaction.referenceId && (
                            <div className="font-mono text-white/60 text-xs">{transaction.referenceId}</div>
                          )}
                          {transaction.remark && (
                            <div 
                              className="text-white/60 text-xs max-w-xs truncate" 
                              title={transaction.remark}
                            >
                              {transaction.remark}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white/80">{transaction.operator}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white/70 text-sm">
                          {formatDateTime(transaction.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <GlassButton
                  variant="secondary"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2"
                >
                  首页
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2"
                >
                  上一页
                </GlassButton>
                
                {/* 页码显示 */}
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            pageNum === currentPage
                              ? 'bg-white/20 text-white border border-white/30'
                              : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white'
                          }`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
                
                <GlassButton
                  variant="secondary"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2"
                >
                  下一页
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2"
                >
                  尾页
                </GlassButton>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
};

export default TransactionRecordsTailwind;