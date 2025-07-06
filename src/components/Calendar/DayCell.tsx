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
    'relative p-3 border border-gray-200 rounded-lg cursor-pointer transition-all duration-200',
    'hover:shadow-md hover:border-blue-300',
    isToday && 'ring-2 ring-blue-500 ring-opacity-50',
    isSelected && 'bg-blue-50 border-blue-400',
    isWeekend && 'bg-gray-50',
    !isWeekend && 'bg-white'
  ].filter(Boolean).join(' ');

  const activityIndicatorClasses = [
    'absolute top-1 right-1 w-2 h-2 rounded-full',
    activityLevel === 'high' && 'bg-green-500',
    activityLevel === 'medium' && 'bg-yellow-500',
    activityLevel === 'low' && 'bg-gray-300'
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
        <div className="absolute top-1 left-1 text-xs text-blue-600 font-bold">
          今日
        </div>
      )}

      {/* 日期 */}
      <div className="flex justify-between items-start mb-2">
        <span className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {dayNumber}
        </span>
        {/* 净变化指示器 */}
        {netChange !== 0 && (
          <span className={`text-xs px-1 py-0.5 rounded ${
            isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
            <span className="text-blue-600 flex items-center">
              📦 采购
            </span>
            <span className="font-medium text-blue-700">
              {formatCurrency(data.purchases.totalValue)}
            </span>
          </div>
        )}

        {/* 销售数据 */}
        {data.sales.totalValue > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-green-600 flex items-center">
              💰 销售
            </span>
            <span className="font-medium text-green-700">
              {formatCurrency(data.sales.totalValue)}
            </span>
          </div>
        )}

        {/* 库存警告 */}
        {(data.inventory.lowStockCount > 0 || data.inventory.outOfStockCount > 0) && (
          <div className="flex justify-between items-center">
            <span className="text-orange-600 flex items-center">
              ⚠️ 库存
            </span>
            <span className="font-medium text-orange-700">
              {data.inventory.lowStockCount + data.inventory.outOfStockCount}
            </span>
          </div>
        )}

        {/* 新商品 */}
        {data.inventory.newProductCount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-purple-600 flex items-center">
              ✨ 新品
            </span>
            <span className="font-medium text-purple-700">
              {data.inventory.newProductCount}
            </span>
          </div>
        )}
      </div>

      {/* 订单数量指示器 */}
      {(data.purchases.orderCount > 0 || data.sales.orderCount > 0) && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
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
        <div className="flex items-center justify-center h-16 text-gray-400 text-xs">
          无活动
        </div>
      )}
    </div>
  );
};

export default DayCell;
