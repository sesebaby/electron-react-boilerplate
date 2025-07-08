import React from 'react';
import { WarehouseCardData, ProductStockInfo } from '../../../types/inventoryCard';
import ProductItem from '../../Inventory/ProductItem';

interface WarehouseCardProps {
  warehouse: WarehouseCardData;
  onClick: () => void;
  isSelected?: boolean;
}

const WarehouseCard: React.FC<WarehouseCardProps> = ({
  warehouse,
  onClick,
  isSelected = false
}) => {
  // 获取库存状态样式
  const getStockStatusStyle = () => {
    if (warehouse.outOfStockCount > 0) {
      return 'border-red-300/50 bg-red-500/10';
    } else if (warehouse.lowStockCount > 0) {
      return 'border-yellow-300/50 bg-yellow-500/10';
    } else {
      return 'border-green-300/50 bg-green-500/10';
    }
  };

  // 获取状态指示器
  const getStatusIndicator = () => {
    if (warehouse.outOfStockCount > 0) {
      return (
        <div className="flex items-center gap-1 text-red-300 text-xs drop-shadow-md">
          <span className="w-2 h-2 bg-red-400 rounded-full shadow-sm"></span>
          缺货
        </div>
      );
    } else if (warehouse.lowStockCount > 0) {
      return (
        <div className="flex items-center gap-1 text-yellow-300 text-xs drop-shadow-md">
          <span className="w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></span>
          预警
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-green-300 text-xs drop-shadow-md">
          <span className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></span>
          正常
        </div>
      );
    }
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div
      className={`
        glass-surface backdrop-blur-lg rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border border-white/20
        ${isSelected ? 'ring-2 ring-blue-400/50 ring-opacity-50 scale-[1.02] shadow-lg' : ''}
        ${getStockStatusStyle()}
        min-h-[280px] sm:min-h-[320px] flex flex-col
      `}
      onClick={onClick}
    >
      {/* 卡片头部 */}
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate text-sm sm:text-base drop-shadow-lg">
            {warehouse.warehouseName}
          </h3>
          <p className="text-xs sm:text-sm text-white/80 truncate drop-shadow-md">
            {warehouse.warehouseCode}
          </p>
          {warehouse.description && (
            <p className="text-xs text-white/70 mt-1 line-clamp-2 hidden sm:block drop-shadow-md">
              {warehouse.description}
            </p>
          )}
        </div>
        <div className="ml-2 flex-shrink-0">
          {getStatusIndicator()}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="text-center p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg border border-white/10">
          <div className="text-base sm:text-lg font-bold text-blue-300 drop-shadow-lg">
            {warehouse.totalProducts}
          </div>
          <div className="text-xs text-white/80 drop-shadow-md">商品种类</div>
        </div>
        <div className="text-center p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg border border-white/10">
          <div className="text-base sm:text-lg font-bold text-green-300 drop-shadow-lg">
            {formatCurrency(warehouse.totalValue)}
          </div>
          <div className="text-xs text-white/80 drop-shadow-md">总价值</div>
        </div>
      </div>

      {/* 库存状态统计 */}
      <div className="flex justify-between items-center mb-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></span>
          <span className="text-white/80 drop-shadow-md">
            正常: {warehouse.totalProducts - warehouse.lowStockCount - warehouse.outOfStockCount}
          </span>
        </div>
        {warehouse.lowStockCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></span>
            <span className="text-white/80 drop-shadow-md">预警: {warehouse.lowStockCount}</span>
          </div>
        )}
        {warehouse.outOfStockCount > 0 && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-red-400 rounded-full shadow-sm"></span>
            <span className="text-white/80 drop-shadow-md">缺货: {warehouse.outOfStockCount}</span>
          </div>
        )}
      </div>

      {/* 产品列表预览 */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs sm:text-sm font-medium text-white drop-shadow-lg">商品列表</h4>
          {warehouse.products.length > 3 && (
            <span className="text-xs text-white/70 drop-shadow-md">
              显示 3/{warehouse.products.length} 项
            </span>
          )}
        </div>

        {warehouse.products.length === 0 ? (
          <div className="text-center py-3 sm:py-4 text-white/70 text-xs sm:text-sm drop-shadow-md">
            暂无商品数据
          </div>
        ) : (
          <div className="max-h-24 sm:max-h-32 overflow-y-auto space-y-1">
            {warehouse.products.slice(0, 3).map(product => (
              <ProductItem
                key={product.productId}
                product={product}
                compact={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* 卡片底部操作提示 */}
      <div className="mt-4 pt-3 border-t border-white/20">
        <div className="flex items-center justify-between text-xs text-white/70 drop-shadow-md">
          <span>点击查看详情</span>
          <span>→</span>
        </div>
      </div>
    </div>
  );
};

export default WarehouseCard;
