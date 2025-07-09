import React from 'react';
import { InventoryFilterOptions, WarehouseCardData } from '../../types/inventoryCard';

interface InventoryFilterProps {
  filters: InventoryFilterOptions;
  warehouses: WarehouseCardData[];
  onChange: (filters: Partial<InventoryFilterOptions>) => void;
}

const InventoryFilter: React.FC<InventoryFilterProps> = ({
  filters,
  warehouses,
  onChange
}) => {
  // 库存状态选项
  const _stockStatusOptions = [
    { value: 'all', label: '全部状态', icon: '📦' },
    { value: 'normal', label: '库存正常', icon: '✅' },
    { value: 'low', label: '库存预警', icon: '⚠️' },
    { value: 'out', label: '库存缺货', icon: '❌' }
  ];

  // 排序选项
  const _sortOptions = [
    { value: 'name', label: '仓库名称' },
    { value: 'stock', label: '商品数量' },
    { value: 'value', label: '库存价值' }
  ];

  // 获取所有分类
  const _getCategories = () => {
    const _categories = new Set<string>();
    warehouses.forEach(warehouse => {
      warehouse.products.forEach(product => {
        if (product.category) {
          categories.add(product.category);
        }
      });
    });
    return Array.from(categories).sort();
  };

  // 重置筛选条件
  const _handleReset = () => {
    onChange({
      stockStatus: 'all',
      category: '',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  // 检查是否有活动筛选条件
  const _hasActiveFilters = () => {
    return (
      filters.stockStatus !== 'all' ||
      filters.category !== '' ||
      filters.sortBy !== 'name' ||
      filters.sortOrder !== 'asc'
    );
  };

  return (
    <div className="space-y-4">
      {/* 筛选标题和重置按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">筛选条件</h3>
        {hasActiveFilters() && (
          <button
            type="button"
            onClick={handleReset}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            重置筛选
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* 库存状态筛选 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            库存状态
          </label>
          <select
            value={filters.stockStatus}
            onChange={(e) => onChange({ stockStatus: e.target.value as 'all' | 'normal' | 'low' | 'out' })}
            className="
              block w-full px-3 py-2 border border-gray-300 rounded-lg
              bg-white/50 backdrop-blur-sm text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-all duration-200
            "
          >
            {stockStatusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 商品分类筛选 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            商品分类
          </label>
          <select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="
              block w-full px-3 py-2 border border-gray-300 rounded-lg
              bg-white/50 backdrop-blur-sm text-sm
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              transition-all duration-200
            "
          >
            <option value="">全部分类</option>
            {getCategories().map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* 排序设置 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            排序方式
          </label>
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => onChange({ sortBy: e.target.value as 'name' | 'stock' | 'value' | 'updated' })}
              className="
                flex-1 px-3 py-2 border border-gray-300 rounded-lg
                bg-white/50 backdrop-blur-sm text-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                transition-all duration-200
              "
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange({
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
              })}
              className="
                px-3 py-2 border border-gray-300 rounded-lg
                bg-white/50 backdrop-blur-sm text-sm
                hover:bg-white/70 focus:ring-2 focus:ring-blue-500
                transition-all duration-200
              "
              title={filters.sortOrder === 'asc' ? '升序' : '降序'}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* 活动筛选条件显示 */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-gray-500">活动筛选:</span>

          {filters.stockStatus !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              状态: {stockStatusOptions.find(opt => opt.value === filters.stockStatus)?.label}
              <button
                type="button"
                onClick={() => onChange({ stockStatus: 'all' })}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                ×
              </button>
            </span>
          )}

          {filters.category && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              分类: {filters.category}
              <button
                type="button"
                onClick={() => onChange({ category: '' })}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryFilter;
