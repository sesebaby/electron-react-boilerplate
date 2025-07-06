import React, { useState, useEffect, useMemo } from 'react';
import { WarehouseCardData, InventoryFilterOptions, InventoryCardViewState } from '../types/inventoryCard';
import WarehouseCard from '../components/Inventory/WarehouseCard';
import InventoryFilter from '../components/Inventory/InventoryFilter';
import InventorySearch from '../components/Inventory/InventorySearch';
import { notificationHelper } from '../utils/notificationHelper';

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

  // 加载仓库数据
  const loadWarehouseData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // TODO: 实现实际的数据获取逻辑
      // const warehouses = await inventoryService.getWarehouseCardData();
      
      // 模拟数据（第2天会替换为真实数据）
      const mockWarehouses: WarehouseCardData[] = [
        {
          warehouseId: '1',
          warehouseName: '主仓库',
          warehouseCode: 'WH001',
          description: '主要存储仓库',
          products: [],
          totalProducts: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalValue: 0
        }
      ];

      setState(prev => ({
        ...prev,
        warehouses: mockWarehouses,
        filteredWarehouses: mockWarehouses,
        loading: false
      }));

    } catch (error) {
      console.error('加载仓库数据失败:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: '加载仓库数据失败，请重试'
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
    // TODO: 可以添加导航到仓库详情页面的逻辑
  };

  // 刷新数据
  const handleRefresh = () => {
    loadWarehouseData();
  };

  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载仓库数据...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{state.error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900">库存总览</h1>
          <p className="text-gray-600 mt-1">查看各仓库库存情况</p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
        >
          🔄 刷新
        </button>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="glass-surface rounded-lg p-4 space-y-4">
        <InventorySearch
          value={state.filters.searchKeyword}
          onChange={(keyword) => handleFilterChange({ searchKeyword: keyword })}
        />
        <InventoryFilter
          filters={state.filters}
          warehouses={state.warehouses}
          onChange={handleFilterChange}
        />
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-surface rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{state.filteredWarehouses.length}</div>
          <div className="text-sm text-gray-600">仓库总数</div>
        </div>
        <div className="glass-surface rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.totalProducts, 0)}
          </div>
          <div className="text-sm text-gray-600">商品种类</div>
        </div>
        <div className="glass-surface rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.lowStockCount, 0)}
          </div>
          <div className="text-sm text-gray-600">低库存商品</div>
        </div>
        <div className="glass-surface rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            {state.filteredWarehouses.reduce((sum, w) => sum + w.outOfStockCount, 0)}
          </div>
          <div className="text-sm text-gray-600">缺货商品</div>
        </div>
      </div>

      {/* 仓库卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {state.filteredWarehouses.map(warehouse => (
          <WarehouseCard
            key={warehouse.warehouseId}
            warehouse={warehouse}
            onClick={() => handleWarehouseClick(warehouse.warehouseId)}
            isSelected={state.selectedWarehouse === warehouse.warehouseId}
          />
        ))}
      </div>

      {/* 空状态 */}
      {state.filteredWarehouses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无仓库数据</h3>
          <p className="text-gray-600">请检查筛选条件或联系管理员</p>
        </div>
      )}
    </div>
  );
};

export default InventoryCardView;
