import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  inventoryStockService, 
  productService, 
  categoryService, 
  warehouseService 
} from '../../services/business';
import { Product, Category, Warehouse, InventoryTransaction } from '../../types/entities';
import { 
  InventoryMovementSummaryData,
  MovementSummaryFilters,
  MovementSummaryConfig,
  MovementSummaryStats,
  TimeRangeFilter,
  MovementDimension,
  QuickTimeRange,
  ColumnDisplayConfig,
  SortConfig,
  ExportOptions
} from '../../types/inventoryMovement';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import { 
  MovementSummaryTable, 
  TimeControl,
  ExportOptions as ExportOptionsComponent,
  ColumnDisplayConfig as ColumnDisplayConfigComponent
} from './components';
import {
  saveColumnDisplayConfig,
  loadColumnDisplayConfig,
  getDefaultColumnDisplayConfig,
  saveMovementConfig,
  loadMovementConfig,
  saveMovementFilters,
  loadMovementFilters,
  getCurrentMonthRange,
  validateColumnDisplayConfig
} from '../../utils/inventoryMovementStorage';

interface InventoryMovementSummaryProps {
  className?: string;
}

const InventoryMovementSummary: React.FC<InventoryMovementSummaryProps> = ({ className }) => {
  // =============== 状态管理 ===============
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryMovementSummaryData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // 筛选条件
  const [filters, setFilters] = useState<MovementSummaryFilters>(() => {
    const savedFilters = loadMovementFilters();
    const currentMonthRange = getCurrentMonthRange();

    return {
      timeRange: currentMonthRange,
      showZeroMovement: savedFilters?.showZeroMovement ?? false,
      productId: savedFilters?.productId,
      categoryId: savedFilters?.categoryId,
      warehouseId: savedFilters?.warehouseId,
      searchKeyword: savedFilters?.searchKeyword
    };
  });

  // 组件配置
  const [config, setConfig] = useState<MovementSummaryConfig>(() => {
    const savedConfig = loadMovementConfig();
    return savedConfig || {
      displayDimension: MovementDimension.QUANTITY,
      groupByWarehouse: false,
      showConvertedQuantity: true,
      enableColumnToggle: true,
      autoRefreshInterval: undefined
    };
  });

  // 列显示配置
  const [columnDisplay, setColumnDisplay] = useState<ColumnDisplayConfig>(() => {
    const savedColumnDisplay = loadColumnDisplayConfig();
    return savedColumnDisplay && validateColumnDisplayConfig(savedColumnDisplay)
      ? savedColumnDisplay
      : getDefaultColumnDisplayConfig();
  });

  // 排序配置
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'productName',
    direction: 'asc'
  });

  // =============== 数据获取 ===============
  const loadBasicData = useCallback(async () => {
    try {
      const [productsData, categoriesData, warehousesData] = await Promise.all([
        productService.findAll(),
        categoryService.findAll(),
        warehouseService.findAll()
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
      setWarehouses(warehousesData);
    } catch (err) {
      console.error('加载基础数据失败:', err);
      setError('加载基础数据失败，请稍后重试');
    }
  }, []);

  const calculateMovementSummary = useCallback(async (): Promise<InventoryMovementSummaryData[]> => {
    const { timeRange } = filters;
    
    // 获取所有相关的库存事务
    const transactions = await inventoryStockService.findTransactionsByDateRange(
      timeRange.startDate,
      timeRange.endDate
    );

    // 获取期初库存（时间范围开始前的库存状态）
    const openingStockTransactions = await inventoryStockService.findTransactionsByDateRange(
      new Date('2000-01-01'), // 从很早的日期开始
      new Date(timeRange.startDate.getTime() - 1) // 到开始日期前一天
    );

    // 按产品分组计算
    const productGroups = new Map<string, {
      product: Product;
      openingStock: { quantity: number; amount: number };
      inboundTotal: { quantity: number; amount: number };
      outboundTotal: { quantity: number; amount: number };
    }>();

    // 计算期初库存
    for (const transaction of openingStockTransactions) {
      const key = transaction.productId;
      if (!productGroups.has(key)) {
        const product = products.find(p => p.id === transaction.productId);
        if (!product) continue;
        
        productGroups.set(key, {
          product,
          openingStock: { quantity: 0, amount: 0 },
          inboundTotal: { quantity: 0, amount: 0 },
          outboundTotal: { quantity: 0, amount: 0 }
        });
      }

      const group = productGroups.get(key)!;
      group.openingStock.quantity += transaction.quantity;
      group.openingStock.amount += transaction.totalAmount;
    }

    // 计算期间内的入库和出库
    for (const transaction of transactions) {
      const key = transaction.productId;
      if (!productGroups.has(key)) {
        const product = products.find(p => p.id === transaction.productId);
        if (!product) continue;
        
        productGroups.set(key, {
          product,
          openingStock: { quantity: 0, amount: 0 },
          inboundTotal: { quantity: 0, amount: 0 },
          outboundTotal: { quantity: 0, amount: 0 }
        });
      }

      const group = productGroups.get(key)!;
      if (transaction.quantity > 0) {
        // 入库
        group.inboundTotal.quantity += transaction.quantity;
        group.inboundTotal.amount += transaction.totalAmount;
      } else {
        // 出库
        group.outboundTotal.quantity += Math.abs(transaction.quantity);
        group.outboundTotal.amount += Math.abs(transaction.totalAmount);
      }
    }

    // 转换为组件数据格式
    const result: InventoryMovementSummaryData[] = [];
    let sequence = 1;

    for (const [productId, group] of productGroups) {
      const { product, openingStock, inboundTotal, outboundTotal } = group;
      
      // 获取分类信息
      const category = categories.find(c => c.id === product.categoryId);
      const primaryCategory = category?.parentId 
        ? categories.find(c => c.id === category.parentId)?.name || '未分类'
        : category?.name || '未分类';
      const secondaryCategory = category?.parentId 
        ? category.name 
        : '无子分类';

      // 计算期末库存
      const closingQuantity = openingStock.quantity + inboundTotal.quantity - outboundTotal.quantity;
      const closingAmount = openingStock.amount + inboundTotal.amount - outboundTotal.amount;

      // 计算换算数量（这里简化处理，实际应该根据产品的换算关系）
      const conversionRate = 1; // 默认换算比率
      
      const summaryData: InventoryMovementSummaryData = {
        id: productId,
        sequence: sequence++,
        productId,
        productName: product.name,
        productSku: product.sku,
        primaryCategory,
        secondaryCategory,
        unit: '件', // 应该从产品信息中获取
        convertedUnit: '箱',
        conversionRate,
        openingStock: {
          quantity: openingStock.quantity,
          convertedQuantity: openingStock.quantity / conversionRate,
          amount: openingStock.amount
        },
        inboundTotal: {
          quantity: inboundTotal.quantity,
          convertedQuantity: inboundTotal.quantity / conversionRate,
          amount: inboundTotal.amount
        },
        outboundTotal: {
          quantity: outboundTotal.quantity,
          convertedQuantity: outboundTotal.quantity / conversionRate,
          amount: outboundTotal.amount
        },
        closingStock: {
          quantity: closingQuantity,
          convertedQuantity: closingQuantity / conversionRate,
          amount: closingAmount
        }
      };

      // 根据筛选条件决定是否包含
      if (!filters.showZeroMovement && 
          inboundTotal.quantity === 0 && 
          outboundTotal.quantity === 0) {
        continue;
      }

      if (filters.productId && productId !== filters.productId) {
        continue;
      }

      if (filters.categoryId && product.categoryId !== filters.categoryId) {
        continue;
      }

      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        if (!product.name.toLowerCase().includes(keyword) &&
            !product.sku.toLowerCase().includes(keyword)) {
          continue;
        }
      }

      result.push(summaryData);
    }

    return result;
  }, [filters, products, categories]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const summaryData = await calculateMovementSummary();
      
      // 应用排序
      const sortedData = [...summaryData].sort((a, b) => {
        const aValue = a[sortConfig.field as keyof InventoryMovementSummaryData];
        const bValue = b[sortConfig.field as keyof InventoryMovementSummaryData];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' 
            ? aValue - bValue
            : bValue - aValue;
        }
        
        return 0;
      });

      setData(sortedData);
    } catch (err) {
      console.error('生成报表失败:', err);
      setError('生成报表失败，请检查数据或稍后重试');
    } finally {
      setLoading(false);
    }
  }, [calculateMovementSummary, sortConfig]);

  // =============== 事件处理 ===============
  const handleFilterChange = (field: keyof MovementSummaryFilters, value: any) => {
    const newFilters = {
      ...filters,
      [field]: value
    };
    setFilters(newFilters);

    // 保存非时间相关的筛选条件
    if (field !== 'timeRange') {
      saveMovementFilters(newFilters);
    }
  };

  const handleTimeRangeChange = (timeRange: TimeRangeFilter) => {
    setFilters(prev => ({
      ...prev,
      timeRange
    }));
  };

  const handleConfigChange = (field: keyof MovementSummaryConfig, value: any) => {
    const newConfig = {
      ...config,
      [field]: value
    };
    setConfig(newConfig);
    saveMovementConfig(newConfig);
  };

  const handleColumnDisplayChange = (newColumnDisplay: ColumnDisplayConfig) => {
    // 验证至少有一列被选中
    if (!validateColumnDisplayConfig(newColumnDisplay)) {
      setError('至少需要显示一列数据');
      return;
    }

    setColumnDisplay(newColumnDisplay);
    saveColumnDisplayConfig(newColumnDisplay);
    setError(null);
  };

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortConfig({ field, direction });
  };

  const handleExport = (options: ExportOptions) => {
    // 导出逻辑
    console.log('Exporting with options:', options);
  };

  // =============== 初始化 ===============
  useEffect(() => {
    loadBasicData();
  }, [loadBasicData]);

  useEffect(() => {
    if (products.length > 0) {
      generateReport();
    }
  }, [products, generateReport]);

  // =============== 计算统计信息 ===============
  const stats = useMemo((): MovementSummaryStats => {
    const totalProducts = data.length;
    const totalOpeningValue = data.reduce((sum, item) => sum + item.openingStock.amount, 0);
    const totalInboundValue = data.reduce((sum, item) => sum + item.inboundTotal.amount, 0);
    const totalOutboundValue = data.reduce((sum, item) => sum + item.outboundTotal.amount, 0);
    const totalClosingValue = data.reduce((sum, item) => sum + item.closingStock.amount, 0);
    const netMovementValue = totalInboundValue - totalOutboundValue;
    const turnoverRate = totalOpeningValue > 0 ? totalOutboundValue / totalOpeningValue : 0;

    return {
      totalProducts,
      totalOpeningValue,
      totalInboundValue,
      totalOutboundValue,
      totalClosingValue,
      netMovementValue,
      turnoverRate
    };
  }, [data]);

  if (loading && data.length === 0) {
    return (
      <div className={`min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
            <p className="financial-subtitle">加载出入库汇总数据中...</p>
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
              出入库汇总
            </h1>
            <p className="financial-subtitle mt-1">库存进出汇总分析，支持按数量、换算数量和金额统计</p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="financial-subtitle"
            >
              <span className="mr-2">⚙️</span>
              列设置
            </GlassButton>
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
              loading={loading}
            >
              <span className="mr-2">🔄</span>
              刷新数据
            </GlassButton>
          </div>
        </div>

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

        {/* 导出选项 */}
        {showExportOptions && (
          <ExportOptionsComponent
            data={data}
            onClose={() => setShowExportOptions(false)}
          />
        )}

        {/* 列显示配置 */}
        {showColumnConfig && (
          <ColumnDisplayConfigComponent
            columnDisplay={columnDisplay}
            onChange={handleColumnDisplayChange}
            onClose={() => setShowColumnConfig(false)}
          />
        )}

        {/* 时间控制 */}
        <TimeControl
          timeRange={filters.timeRange}
          onChange={handleTimeRangeChange}
          loading={loading}
        />

        {/* 汇总统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-xl font-bold inventory-value-items">{stats.totalProducts}</div>
            <div className="text-xs financial-description">商品种类</div>
          </GlassCard>

          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">📥</div>
            <div className="text-xl font-bold inventory-value-total">¥{(stats.totalOpeningValue / 10000).toFixed(1)}万</div>
            <div className="text-xs financial-description">期初库存</div>
          </GlassCard>

          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">⬆️</div>
            <div className="text-xl font-bold financial-value-positive">¥{(stats.totalInboundValue / 10000).toFixed(1)}万</div>
            <div className="text-xs financial-description">入库金额</div>
          </GlassCard>

          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">⬇️</div>
            <div className="text-xl font-bold financial-value-negative">¥{(stats.totalOutboundValue / 10000).toFixed(1)}万</div>
            <div className="text-xs financial-description">出库金额</div>
          </GlassCard>

          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">📤</div>
            <div className="text-xl font-bold inventory-value-total">¥{(stats.totalClosingValue / 10000).toFixed(1)}万</div>
            <div className="text-xs financial-description">期末库存</div>
          </GlassCard>

          <GlassCard className="text-center p-4">
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-xl font-bold inventory-value-turnover">{(stats.turnoverRate * 100).toFixed(1)}%</div>
            <div className="text-xs financial-description">周转率</div>
          </GlassCard>
        </div>

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">商品分类</label>
              <GlassSelect
                value={filters.categoryId || ''}
                onChange={(e) => handleFilterChange('categoryId', e.target.value || undefined)}
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
              <label className="block text-sm font-medium financial-subtitle mb-2">商品筛选</label>
              <GlassSelect
                value={filters.productId || ''}
                onChange={(e) => handleFilterChange('productId', e.target.value || undefined)}
              >
                <option value="">全部商品</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">搜索关键词</label>
              <GlassInput
                type="text"
                placeholder="商品名称或编码"
                value={filters.searchKeyword || ''}
                onChange={(e) => handleFilterChange('searchKeyword', e.target.value || undefined)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">显示选项</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={filters.showZeroMovement}
                    onChange={(e) => handleFilterChange('showZeroMovement', e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500/50"
                  />
                  <span className="text-sm financial-subtitle">显示无变动</span>
                </label>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* 主要数据表格 */}
        <MovementSummaryTable
          data={data}
          config={config}
          columnDisplay={columnDisplay}
          loading={loading}
          onSort={handleSort}
        />
      </div>
    </div>
  );
};

export default InventoryMovementSummary;
