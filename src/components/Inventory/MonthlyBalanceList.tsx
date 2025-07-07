import React, { useState, useEffect } from 'react';
import monthlyBalanceService from '../../services/business/monthlyBalanceService';
import warehouseService from '../../services/business/warehouseService';
import categoryService from '../../services/business/categoryService';
import { 
  MonthlyBalance, 
  MonthlyBalanceQueryParams, 
  MonthlyBalanceStatus 
} from '../../types/monthlyBalance';
import { Warehouse, Category } from '../../types/entities';
import { GlassButton, GlassCard } from '../ui/FormControls';

interface MonthlyBalanceListProps {
  onViewStatistics?: (year: number, month: number) => void;
}

export const MonthlyBalanceList: React.FC<MonthlyBalanceListProps> = ({ onViewStatistics }) => {
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // 查询参数
  const [queryParams, setQueryParams] = useState<MonthlyBalanceQueryParams>({
    sortBy: 'balanceDate',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });

  useEffect(() => {
    loadFormData();
    loadBalances();
  }, [queryParams]);

  const loadFormData = async () => {
    try {
      const [warehouseList, categoryList] = await Promise.all([
        warehouseService.findAll(),
        categoryService.findAll()
      ]);
      
      setWarehouses(warehouseList);
      setCategories(categoryList);
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
  };

  const loadBalances = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await monthlyBalanceService.queryMonthlyBalance(queryParams);

      if (!result.success) {
        setError(result.error?.message || '查询失败');
        return;
      }

      setBalances(result.data || []);
      
      // 计算总页数（简化处理，实际应该从服务端返回）
      const totalItems = result.data?.length || 0;
      const pageSize = queryParams.pageSize || 20;
      setTotalPages(Math.ceil(totalItems / pageSize));

    } catch (err) {
      console.error('Failed to load monthly balances:', err);
      setError('加载月度结余失败');
    } finally {
      setLoading(false);
    }
  };

  const handleParamChange = (key: keyof MonthlyBalanceQueryParams, value: any) => {
    setQueryParams(prev => ({ 
      ...prev, 
      [key]: value,
      page: key !== 'page' ? 1 : value // 除了页码变化外，其他条件变化都重置到第一页
    }));
    if (key !== 'page') {
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    setQueryParams({
      sortBy: 'balanceDate',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20
    });
    setCurrentPage(1);
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

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatPeriod = (year: number, month: number): string => {
    return `${year}年${month}月`;
  };

  const getStatusColor = (status: MonthlyBalanceStatus): string => {
    switch (status) {
      case MonthlyBalanceStatus.ACTIVE:
        return 'text-green-300 bg-green-500/20 border-green-400/30';
      case MonthlyBalanceStatus.EXPIRED:
        return 'text-red-300 bg-red-500/20 border-red-400/30';
      case MonthlyBalanceStatus.ADJUSTED:
        return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case MonthlyBalanceStatus.ARCHIVED:
        return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      default:
        return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
    }
  };

  const getStatusText = (status: MonthlyBalanceStatus): string => {
    switch (status) {
      case MonthlyBalanceStatus.ACTIVE:
        return '正常';
      case MonthlyBalanceStatus.EXPIRED:
        return '已过期';
      case MonthlyBalanceStatus.ADJUSTED:
        return '已调整';
      case MonthlyBalanceStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
  };

  // 按期间分组
  const groupedBalances = balances.reduce((groups, balance) => {
    const key = `${balance.year}-${balance.month}`;
    if (!groups[key]) {
      groups[key] = {
        year: balance.year,
        month: balance.month,
        balanceDate: balance.balanceDate,
        balances: [],
        totalValue: 0,
        totalQuantity: 0,
        batchCount: 0
      };
    }
    groups[key].balances.push(balance);
    groups[key].totalValue += balance.totalValue;
    groups[key].totalQuantity += balance.remainingQuantity;
    groups[key].batchCount += 1;
    return groups;
  }, {} as Record<string, any>);

  const periods = Object.values(groupedBalances).sort((a: any, b: any) => 
    new Date(b.balanceDate).getTime() - new Date(a.balanceDate).getTime()
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载月度结余列表中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">月度结余列表</h2>
          <p className="text-white/70">
            查看历史月度结余记录，按期间展示详细信息
          </p>
        </div>
        
        <div className="flex gap-3">
          <GlassButton
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <span className="mr-2">🔍</span>
            {showFilters ? '隐藏筛选' : '显示筛选'}
          </GlassButton>
          
          <GlassButton variant="secondary" onClick={loadBalances}>
            <span className="mr-2">🔄</span>
            刷新
          </GlassButton>
        </div>
      </div>

      {/* 筛选条件 */}
      {showFilters && (
        <GlassCard title="筛选条件">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 年份 */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">年份</label>
                <select
                  value={queryParams.year || ''}
                  onChange={(e) => handleParamChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-gray-800">全部年份</option>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year} className="bg-gray-800">{year}年</option>
                  ))}
                </select>
              </div>

              {/* 月份 */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">月份</label>
                <select
                  value={queryParams.month || ''}
                  onChange={(e) => handleParamChange('month', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-gray-800">全部月份</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month} className="bg-gray-800">{month}月</option>
                  ))}
                </select>
              </div>

              {/* 仓库 */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">仓库</label>
                <select
                  value={queryParams.warehouseId || ''}
                  onChange={(e) => handleParamChange('warehouseId', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-gray-800">全部仓库</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id} className="bg-gray-800">
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 分类 */}
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">分类</label>
                <select
                  value={queryParams.categoryId || ''}
                  onChange={(e) => handleParamChange('categoryId', e.target.value || undefined)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                >
                  <option value="" className="bg-gray-800">全部分类</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id} className="bg-gray-800">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <GlassButton variant="primary" onClick={loadBalances}>
                <span className="mr-2">🔍</span>
                应用筛选
              </GlassButton>
              <GlassButton variant="secondary" onClick={handleClearFilters}>
                <span className="mr-2">🔄</span>
                清空筛选
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {/* 结果统计 */}
      {balances.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-lg font-semibold text-white">
              {formatNumber(periods.length)}
            </div>
            <div className="text-white/70 text-sm">结余期间</div>
          </div>
          
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-lg font-semibold text-white">
              {formatNumber(balances.length)}
            </div>
            <div className="text-white/70 text-sm">结余记录</div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-lg font-semibold text-white">
              {formatCurrency(balances.reduce((sum, b) => sum + b.totalValue, 0))}
            </div>
            <div className="text-white/70 text-sm">总结余价值</div>
          </div>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-lg font-semibold text-white">
              {formatNumber(new Set(balances.map(b => b.productId)).size)}
            </div>
            <div className="text-white/70 text-sm">涉及产品</div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <GlassCard className="border-red-400/30 bg-red-500/10">
          <div className="p-4 flex items-center gap-3 text-red-300">
            <span className="text-xl">❌</span>
            <span>{error}</span>
          </div>
        </GlassCard>
      )}

      {/* 按期间展示结余列表 */}
      {periods.length === 0 && !loading ? (
        <GlassCard className="p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-white mb-2">暂无结余记录</h3>
          <p className="text-white/70">
            {queryParams.year || queryParams.month || queryParams.warehouseId || queryParams.categoryId
              ? '当前筛选条件下没有找到结余记录'
              : '还没有生成任何月度结余记录'
            }
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {periods.map((period: any) => (
            <GlassCard 
              key={`${period.year}-${period.month}`}
            >
              {/* 期间标题 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {formatPeriod(period.year, period.month)}
                    </h3>
                    <p className="text-white/60 text-sm">
                      结余日期: {formatDate(period.balanceDate)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onViewStatistics && (
                    <GlassButton
                      variant="secondary"
                      onClick={() => onViewStatistics(period.year, period.month)}
                      className="text-sm"
                    >
                      <span className="mr-1">📈</span>
                      统计分析
                    </GlassButton>
                  )}
                </div>
              </div>

              {/* 期间汇总 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-lg font-semibold text-white">
                    {formatCurrency(period.totalValue)}
                  </div>
                  <div className="text-white/70 text-sm">期间总价值</div>
                </div>
                
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(period.batchCount)}
                  </div>
                  <div className="text-white/70 text-sm">批次数量</div>
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-lg font-semibold text-white">
                    {formatNumber(new Set(period.balances.map((b: MonthlyBalance) => b.productId)).size)}
                  </div>
                  <div className="text-white/70 text-sm">涉及产品</div>
                </div>
              </div>

              {/* 前10条结余记录 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/80 mb-3">
                  结余明细 (显示前10条，共{period.batchCount}条)
                </h4>
                
                {period.balances.slice(0, 10).map((balance: MonthlyBalance) => (
                  <div 
                    key={balance.id}
                    className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-blue-300 font-medium">
                          {balance.productName}
                        </span>
                        <span className="text-white/60 text-sm">
                          SKU: {balance.productSku}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(balance.status)}`}>
                          {getStatusText(balance.status)}
                        </span>
                      </div>
                      <div className="text-white font-semibold">
                        {formatCurrency(balance.totalValue)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-white/70">
                      <div>
                        <span className="text-white/50">批次号:</span> {balance.batchNo}
                      </div>
                      <div>
                        <span className="text-white/50">仓库:</span> {balance.warehouseName}
                      </div>
                      <div>
                        <span className="text-white/50">数量:</span> {formatNumber(balance.remainingQuantity)} {balance.unitSymbol}
                      </div>
                      <div>
                        <span className="text-white/50">单价:</span> {formatCurrency(balance.unitCost)}
                      </div>
                      <div>
                        <span className="text-white/50">入库:</span> {formatDate(balance.inboundDate)}
                      </div>
                      <div>
                        <span className="text-white/50">年龄:</span> {balance.batchAge}天
                      </div>
                      <div>
                        <span className="text-white/50">分类:</span> {balance.categoryName}
                      </div>
                      {balance.expiryDate && (
                        <div>
                          <span className="text-white/50">过期:</span> {formatDate(balance.expiryDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {period.batchCount > 10 && (
                  <div className="text-center py-4">
                    <p className="text-white/60 text-sm">
                      还有 {period.batchCount - 10} 条记录未显示
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonthlyBalanceList;