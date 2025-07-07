import React from 'react';
import { WarehouseCardData } from '../../types/inventoryCard';

interface WarehouseSelectorProps {
  warehouses: WarehouseCardData[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}

const WarehouseSelector: React.FC<WarehouseSelectorProps> = ({
  warehouses,
  selectedIds,
  onChange
}) => {
  // 处理单个仓库选择
  const handleWarehouseToggle = (warehouseId: string) => {
    const isSelected = selectedIds.includes(warehouseId);
    if (isSelected) {
      // 取消选择
      onChange(selectedIds.filter(id => id !== warehouseId));
    } else {
      // 添加选择
      onChange([...selectedIds, warehouseId]);
    }
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.length === warehouses.length) {
      // 当前全选，执行取消全选
      onChange([]);
    } else {
      // 执行全选
      onChange(warehouses.map(w => w.warehouseId));
    }
  };

  // 检查是否全选
  const isAllSelected = selectedIds.length === warehouses.length && warehouses.length > 0;
  
  // 检查是否部分选择
  const isPartialSelected = selectedIds.length > 0 && selectedIds.length < warehouses.length;

  return (
    <div className="glass-surface backdrop-blur-lg rounded-xl p-4 lg:p-6 border border-white/20">
      {/* 标题和全选按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white drop-shadow-lg">选择仓库</h3>
          <p className="text-sm text-white/80 drop-shadow-md">
            已选择 {selectedIds.length} / {warehouses.length} 个仓库
          </p>
        </div>
        
        <button
          onClick={handleSelectAll}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
            glass-surface backdrop-blur-md border border-white/30
            hover:bg-white/20 hover:scale-105 drop-shadow-md
            ${isAllSelected 
              ? 'text-blue-300 ring-2 ring-blue-400/50' 
              : isPartialSelected 
                ? 'text-yellow-300 ring-2 ring-yellow-400/50'
                : 'text-white'
            }
          `}
          title={isAllSelected ? '取消全选' : '全选'}
        >
          {isAllSelected ? '✓ 全选' : isPartialSelected ? '◐ 部分' : '☐ 全选'}
        </button>
      </div>

      {/* 仓库卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
        {warehouses.map(warehouse => {
          const isSelected = selectedIds.includes(warehouse.warehouseId);
          
          return (
            <div
              key={warehouse.warehouseId}
              onClick={() => handleWarehouseToggle(warehouse.warehouseId)}
              className={`
                glass-surface backdrop-blur-md rounded-lg p-3 cursor-pointer
                transition-all duration-200 border
                hover:scale-[1.02] hover:shadow-xl
                ${isSelected 
                  ? 'ring-2 ring-blue-400/50 bg-blue-500/20 border-blue-300/50 scale-[1.02]' 
                  : 'border-white/20 hover:bg-white/10'
                }
                min-h-[80px] flex flex-col justify-center
              `}
            >
              {/* 选择状态指示器 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`
                    font-medium text-sm truncate drop-shadow-lg
                    ${isSelected ? 'text-blue-100' : 'text-white'}
                  `}>
                    {warehouse.warehouseName}
                  </h4>
                  <p className={`
                    text-xs truncate drop-shadow-md
                    ${isSelected ? 'text-blue-200/80' : 'text-white/80'}
                  `}>
                    {warehouse.warehouseCode}
                  </p>
                </div>
                
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center
                  transition-all duration-200 flex-shrink-0 ml-2
                  ${isSelected 
                    ? 'bg-blue-500 border-blue-300 text-white' 
                    : 'border-white/50 bg-white/10'
                  }
                `}>
                  {isSelected && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              {/* 仓库统计信息 */}
              <div className="flex items-center justify-between text-xs">
                <span className={`
                  drop-shadow-md
                  ${isSelected ? 'text-blue-200/80' : 'text-white/70'}
                `}>
                  {warehouse.totalProducts} 种商品
                </span>
                
                {/* 库存状态指示 */}
                {warehouse.outOfStockCount > 0 ? (
                  <span className="text-red-300 drop-shadow-md">
                    ❌ {warehouse.outOfStockCount}
                  </span>
                ) : warehouse.lowStockCount > 0 ? (
                  <span className="text-yellow-300 drop-shadow-md">
                    ⚠️ {warehouse.lowStockCount}
                  </span>
                ) : (
                  <span className="text-green-300 drop-shadow-md">
                    ✅ 正常
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 空状态 */}
      {warehouses.length === 0 && (
        <div className="text-center py-8">
          <div className="text-white/60 text-4xl mb-2 drop-shadow-lg">🏪</div>
          <p className="text-white/80 drop-shadow-md">暂无仓库数据</p>
        </div>
      )}
    </div>
  );
};

export default WarehouseSelector;
