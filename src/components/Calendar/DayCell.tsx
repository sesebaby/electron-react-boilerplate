import React from 'react';
import { DailyBusinessSummary } from '../../types/entities';

interface DayCellProps {
  data: DailyBusinessSummary;
  isToday?: boolean;
  isSelected?: boolean;
  onClick?: (data: DailyBusinessSummary) => void;
}

const DayCell: React.FC<DayCellProps> = ({
  data,
  isToday = false,
  isSelected = false,
  onClick
}) => {
  const date = new Date(data.date);
  const dayNumber = date.getDate();
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // 计算活动强度（用于颜色编码）
  const totalActivity = data.purchases.totalValue + data.sales.totalValue;
  const activityLevel = totalActivity > 20000 ? 'high' : totalActivity > 10000 ? 'medium' : 'low';

  // 计算净变化
  const netChange = data.movements.inbound - data.movements.outbound;
  const isPositive = netChange > 0;
  const isNegative = netChange < 0;

  // 样式类
  const cellClasses = [
    'relative p-3 border border-white/20 rounded-lg cursor-pointer transition-all duration-200 glass-surface backdrop-blur-md',
    'hover:shadow-lg hover:border-blue-300/50 hover:bg-white/10',
    isToday && 'ring-2 ring-blue-400/50 ring-opacity-50',
    isSelected && 'bg-blue-500/20 border-blue-400/50',
    isWeekend && 'bg-white/5',
    !isWeekend && 'bg-white/10'
  ].filter(Boolean).join(' ');

  const activityIndicatorClasses = [
    'absolute top-1 right-1 w-2 h-2 rounded-full shadow-sm',
    activityLevel === 'high' && 'bg-green-400',
    activityLevel === 'medium' && 'bg-yellow-400',
    activityLevel === 'low' && 'bg-gray-400'
  ].filter(Boolean).join(' ');

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return `${amount.toLocaleString()}`;
  };

  const formatQuantity = (quantity: number): string => {
    if (quantity >= 1000) {
      return `${(quantity / 1000).toFixed(1)}k`;
    }
    return quantity.toString();
  };

  const handleClick = () => {
    if (onClick) {
      onClick(data);
    }
  };

  return (
    <div className={cellClasses} onClick={handleClick}>
      {/* 活动强度指示器 */}
      <div className={activityIndicatorClasses} />
      
      {/* 今日标识 */}
      {isToday && (
        <div className="absolute top-1 left-1 text-xs text-blue-300 font-bold drop-shadow-lg">
          今日
        </div>
      )}

      {/* 日期 */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-lg font-bold drop-shadow-lg ${isToday ? 'text-blue-300' : 'text-white'}`}>
          {dayNumber}
        </span>
        {/* 净变化指示器 */}
        {netChange !== 0 && (
          <span className={`text-xs px-1 py-0.5 rounded backdrop-blur-sm border border-white/20 drop-shadow-md ${
            isPositive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
          }`}>
            {isPositive ? '+' : ''}{formatQuantity(netChange)}
          </span>
        )}
      </div>

      {/* 业务数据 */}
      <div className="space-y-1 text-xs">
        {/* 采购数据 */}
        {data.purchases.totalValue > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-blue-300 flex items-center drop-shadow-md">
              📦 采购
            </span>
            <span className="font-medium text-blue-200 drop-shadow-lg">
              {formatCurrency(data.purchases.totalValue)}
            </span>
          </div>
        )}

        {/* 销售数据 */}
        {data.sales.totalValue > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-green-300 flex items-center drop-shadow-md">
              💰 销售
            </span>
            <span className="font-medium text-green-200 drop-shadow-lg">
              {formatCurrency(data.sales.totalValue)}
            </span>
          </div>
        )}

        {/* 库存警告 */}
        {(data.inventory.lowStockCount > 0 || data.inventory.outOfStockCount > 0) && (
          <div className="flex justify-between items-center">
            <span className="text-orange-300 flex items-center drop-shadow-md">
              ⚠️ 库存
            </span>
            <span className="font-medium text-orange-200 drop-shadow-lg">
              {data.inventory.lowStockCount + data.inventory.outOfStockCount}
            </span>
          </div>
        )}

        {/* 新商品 */}
        {data.inventory.newProductCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-purple-300 flex items-center drop-shadow-md">
              ✨ 新品
            </span>
            <span className="font-medium text-purple-200 drop-shadow-lg">
              {data.inventory.newProductCount}
            </span>
          </div>
        )}
      </div>

      {/* 订单数量指示器 */}
      {(data.purchases.orderCount > 0 || data.sales.orderCount > 0) && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="flex justify-between text-xs text-white/70 drop-shadow-md">
            {data.purchases.orderCount > 0 && (
              <span>{data.purchases.orderCount}个采购单</span>
            )}
            {data.sales.orderCount > 0 && (
              <span>{data.sales.orderCount}个销售单</span>
            )}
          </div>
        </div>
      )}

      {/* 无活动状态 */}
      {totalActivity === 0 && (
        <div className="flex items-center justify-center h-16 text-white/60 text-xs drop-shadow-md">
          无活动
        </div>
      )}
    </div>
  );
};

export default DayCell;
