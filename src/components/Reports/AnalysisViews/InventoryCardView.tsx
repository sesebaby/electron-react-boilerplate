import React, { useState, useEffect, useMemo } from 'react';
import { WarehouseCardData, InventoryFilterOptions, InventoryCardViewState, ProductStockInfo } from '../../../types/inventoryCard';
import WarehouseCard from './WarehouseCard';
import InventoryFilter from '../../Inventory/InventoryFilter';
import InventorySearch from '../../Inventory/InventorySearch';
import WarehouseSelector from '../../Inventory/WarehouseSelector';
import WarehouseDetailModal from '../../Inventory/WarehouseDetailModal';
import WarehouseCardSkeleton from './WarehouseCardSkeleton';
import { notificationHelper } from '../../../utils/notificationHelper';
import { serviceManager } from '../../../services/core';

const InventoryCardView: React.FC = () => {
  const [state, setState] = useState<InventoryCardViewState>({
    warehouses: [],
    filteredWarehouses: [],
    filters: {
      warehouseIds: [],
      searchKeyword: '',
      stockStatus: 'all',
      category: '',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    loading: true,
    error: null,
    selectedWarehouse: null
  });

  const [showDetailModal, setShowDetailModal] = useState(false);

  // 加载仓库数据
  const loadWarehouseData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // 获取真实的仓库卡片数据
      const warehousesResult = await inventoryCardService.getWarehouseCardData('default');
      const warehousesData = warehousesResult.success ? warehousesResult.data : null;
      
      // Transform service data to WarehouseCardData format
      const productStockInfos: ProductStockInfo[] = Array.isArray(warehousesData) 
        ? warehousesData.map((item: any) => ({
            productId: item.id || 'unknown',
            productName: item.name || '未知商品',
            sku: item.sku || '',
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            maxStock: item.maxStock || 0,
            unit: item.unit || '个',
            unitPrice: item.unitPrice || 0,
            totalValue: (item.currentStock || 0) * (item.unitPrice || 0),
            isLowStock: (item.currentStock || 0) <= (item.minStock || 0),
            isOutOfStock: (item.currentStock || 0) === 0,
            lastUpdated: new Date(item.updatedAt || Date.now()),
            category: item.category || '未分类'
          }))
        : [];

      const warehouses: WarehouseCardData[] = [{
        warehouseId: 'default',
        warehouseName: '默认仓库',
        warehouseCode: 'WH001',
        products: productStockInfos,
        totalProducts: productStockInfos.length,
        totalValue: productStockInfos.reduce((sum, p) => sum + p.totalValue, 0),
        lowStockCount: productStockInfos.filter(p => p.isLowStock).length,
        outOfStockCount: productStockInfos.filter(p => p.isOutOfStock).length
      }];

      setState(prev => ({
        ...prev,
        warehouses,
        filteredWarehouses: warehouses,
        loading: false
      }));

      // 检查是否有库存预警（暂时跳过，因为方法不存在）
      // const lowStockWarnings = await inventoryCardService.getLowStockWarnings();
      // if (lowStockWarnings.length > 0) {
      //   notificationHelper.showWarning(
      //     '库存预警',
      //     `发现 ${lowStockWarnings.length} 个商品库存不足，请及时补货`
      //   );
      // }

    } catch (error: any) {
      console.error('加载仓库数据失败:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error?.message || '加载仓库数据失败，请重试'
      }));
      notificationHelper.showError('数据加载失败', '无法获取仓库数据，请检查网络连接后重试');
    }
  };

  // 应用筛选条件
  const applyFilters = useMemo(() => {
    let filtered = [...state.warehouses];

    // 仓库筛选
    if (state.filters.warehouseIds.length > 0) {
      filtered = filtered.filter(warehouse => 
        state.filters.warehouseIds.includes(warehouse.warehouseId)
      );
    }

    // 搜索关键词
    if (state.filters.searchKeyword) {
      const keyword = state.filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(warehouse =>
        warehouse.warehouseName.toLowerCase().includes(keyword) ||
        warehouse.warehouseCode.toLowerCase().includes(keyword) ||
        warehouse.products.some(product =>
          product.productName.toLowerCase().includes(keyword) ||
          product.sku.toLowerCase().includes(keyword)
        )
      );
    }

    // 库存状态筛选
    if (state.filters.stockStatus !== 'all') {
      filtered = filtered.filter(warehouse => {
        switch (state.filters.stockStatus) {
          case 'low':
            return warehouse.lowStockCount > 0;
          case 'out':
            return warehouse.outOfStockCount > 0;
          case 'normal':
            return warehouse.lowStockCount === 0 && warehouse.outOfStockCount === 0;
          default:
            return true;
        }
      });
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.filters.sortBy) {
        case 'name':
          aValue = a.warehouseName;
          bValue = b.warehouseName;
          break;
        case 'stock':
          aValue = a.totalProducts;
          bValue = b.totalProducts;
          break;
        case 'value':
          aValue = a.totalValue;
          bValue = b.totalValue;
          break;
        default:
          aValue = a.warehouseName;
          bValue = b.warehouseName;
      }

      if (typeof aValue === 'string') {
        const result = aValue.localeCompare(bValue);
        return state.filters.sortOrder === 'asc' ? result : -result;
      } else {
        const result = aValue - bValue;
        return state.filters.sortOrder === 'asc' ? result : -result;
      }
    });

    return filtered;
  }, [state.warehouses, state.filters]);

  // 更新筛选结果
  useEffect(() => {
    setState(prev => ({
      ...prev,
      filteredWarehouses: applyFilters
    }));
  }, [applyFilters]);

  // 初始化加载
  useEffect(() => {
    loadWarehouseData();
  }, []);

  // 处理筛选条件变更
  const handleFilterChange = (newFilters: Partial<InventoryFilterOptions>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters }
    }));
  };

  // 处理仓库卡片点击
  const handleWarehouseClick = (warehouseId: string) => {
    setState(prev => ({
      ...prev,
      selectedWarehouse: warehouseId
    }));

    // 打开详情模态框
    setShowDetailModal(true);

    // 显示选中反馈
    const warehouse = state.warehouses.find(w => w.warehouseId === warehouseId);
    if (warehouse) {
      notificationHelper.showInfo(
        '仓库详情',
        `正在查看 ${warehouse.warehouseName} 的详细信息`
      );
    }
  };

  // 关闭详情模态框
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setState(prev => ({
      ...prev,
      selectedWarehouse: null
    }));
  };

  // 刷新数据
  const handleRefresh = () => {
    loadWarehouseData();
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center glass-surface backdrop-blur-lg rounded-xl p-8">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 mx-auto mb-4"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/60 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
          </div>
          <p className="text-white text-lg font-medium drop-shadow-lg">正在加载仓库数据...</p>
          <p className="text-white/80 text-sm mt-2 drop-shadow-md">请稍候，正在获取最新的库存信息</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center glass-surface backdrop-blur-lg rounded-xl p-8">
          <div className="text-red-400 text-6xl mb-4 drop-shadow-lg">⚠️</div>
          <h3 className="text-lg font-medium text-white mb-2 drop-shadow-lg">加载失败</h3>
          <p className="text-white/80 mb-4 drop-shadow-md">{state.error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 glass-surface backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/30 drop-shadow-md"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">库存总览</h1>
          <p className="text-white/80 mt-1 drop-shadow-md">查看各仓库库存情况</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="px-4 py-2 glass-surface backdrop-blur-md text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/30 flex items-center gap-2 drop-shadow-md"
        >
          🔄 刷新
        </button>
      </div>

      {/* 搜索区域 */}
      <div className="glass-surface backdrop-blur-lg rounded-xl p-4 lg:p-6 border border-white/20">
        <InventorySearch
          value={state.filters.searchKeyword}
          onChange={(keyword) => handleFilterChange({ searchKeyword: keyword })}
        />
      </div>

      {/* 仓库选择区域 */}
      <WarehouseSelector
        warehouses={state.warehouses}
        selectedIds={state.filters.warehouseIds}
        onChange={(warehouseIds) => handleFilterChange({ warehouseIds })}
      />

      {/* 筛选区域 */}
      <div className="glass-surface backdrop-blur-lg rounded-xl p-4 lg:p-6 border border-white/20">
        <InventoryFilter
          filters={state.filters}
          warehouses={state.warehouses}
          onChange={handleFilterChange}
        />
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="glass-surface backdrop-blur-lg rounded-xl p-3 lg:p-4 text-center border border-white/20">
          <div className="text-xl lg:text-2xl font-bold text-blue-300 drop-shadow-lg">{state.filteredWarehouses.length}</div>
          <div className="text-xs lg:text-sm text-white/80 drop-shadow-md">仓库总数</div>
        </div>
        <div className="glass-surface backdrop-blur-lg rounded-xl p-3 lg:p-4 text-center border border-white/20">
          <div className="text-xl lg:text-2xl font-bold text-green-300 drop-shadow-lg">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.totalProducts, 0)}
          </div>
          <div className="text-xs lg:text-sm text-white/80 drop-shadow-md">商品种类</div>
        </div>
        <div className="glass-surface backdrop-blur-lg rounded-xl p-3 lg:p-4 text-center border border-white/20">
          <div className="text-xl lg:text-2xl font-bold text-yellow-300 drop-shadow-lg">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.lowStockCount, 0)}
          </div>
          <div className="text-xs lg:text-sm text-white/80 drop-shadow-md">低库存商品</div>
        </div>
        <div className="glass-surface backdrop-blur-lg rounded-xl p-3 lg:p-4 text-center border border-white/20">
          <div className="text-xl lg:text-2xl font-bold text-red-300 drop-shadow-lg">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.outOfStockCount, 0)}
          </div>
          <div className="text-xs lg:text-sm text-white/80 drop-shadow-md">缺货商品</div>
        </div>
      </div>

      {/* 仓库卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
        {state.loading ? (
          <WarehouseCardSkeleton count={6} />
        ) : (
          state.filteredWarehouses.map(warehouse => (
            <WarehouseCard
              key={warehouse.warehouseId}
              warehouse={warehouse}
              onClick={() => handleWarehouseClick(warehouse.warehouseId)}
              isSelected={state.selectedWarehouse === warehouse.warehouseId}
            />
          ))
        )}
      </div>

      {/* 空状态 */}
      {state.filteredWarehouses.length === 0 && (
        <div className="text-center py-12 glass-surface backdrop-blur-lg rounded-xl border border-white/20">
          <div className="text-white/60 text-6xl mb-4 drop-shadow-lg">📦</div>
          <h3 className="text-lg font-medium text-white mb-2 drop-shadow-lg">暂无仓库数据</h3>
          <p className="text-white/80 drop-shadow-md">请检查筛选条件或联系管理员</p>
        </div>
      )}

      {/* 仓库详情模态框 */}
      <WarehouseDetailModal
        warehouse={state.selectedWarehouse ? state.warehouses.find(w => w.warehouseId === state.selectedWarehouse) || null : null}
        isOpen={showDetailModal}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default InventoryCardView;
