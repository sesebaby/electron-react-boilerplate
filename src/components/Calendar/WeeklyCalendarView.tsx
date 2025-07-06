import React from 'react';
import { WeeklyCalendarData, DailyBusinessSummary } from '../../types/entities';
import DayCell from './DayCell';

interface WeeklyCalendarViewProps {
  weekData: WeeklyCalendarData;
  selectedDate?: Date;
  onDayClick?: (data: DailyBusinessSummary) => void;
}

const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  weekData,
  selectedDate,
  onDayClick
}) => {
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatCurrency = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return `${amount.toLocaleString()}`;
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startStr = start.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const endStr = end.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    return `${startStr} - ${endStr}`;
  };

  const isToday = (date: Date): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const checkDate = new Date(date);
    const selected = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return checkDate.getTime() === selected.getTime();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 周标题和汇总 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {formatDateRange(weekData.weekStart, weekData.weekEnd)}
          </h3>
          <div className="text-sm text-gray-500">
            {weekData.weekStart.getFullYear()}年 第{Math.ceil((weekData.weekStart.getTime() - new Date(weekData.weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}周
          </div>
        </div>

        {/* 周汇总统计 */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-blue-600 font-medium">采购总额</div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(weekData.weeklyTotals.purchases)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-green-600 font-medium">销售总额</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(weekData.weeklyTotals.sales)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 font-medium">净变化</div>
            <div className={`text-lg font-bold ${
              weekData.weeklyTotals.netChange > 0 ? 'text-green-700' : 
              weekData.weeklyTotals.netChange < 0 ? 'text-red-700' : 'text-gray-700'
            }`}>
              {weekData.weeklyTotals.netChange > 0 ? '+' : ''}{weekData.weeklyTotals.netChange}
            </div>
          </div>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {weekDays.map((day, index) => (
          <div key={day} className={`p-3 text-center text-sm font-medium ${
            index >= 5 ? 'text-gray-500 bg-gray-50' : 'text-gray-700'
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-0">
        {weekData.days.map((dayData, index) => (
          <div key={index} className="border-r border-gray-200 last:border-r-0">
            <DayCell
              data={dayData}
              isToday={isToday(dayData.date)}
              isSelected={isSelected(dayData.date)}
              onClick={onDayClick}
            />
          </div>
        ))}
      </div>

      {/* 图例 */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>高活跃度</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>中活跃度</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            <span>低活跃度</span>
          </div>
          <div className="flex items-center gap-1">
            <span>📦</span>
            <span>采购</span>
          </div>
          <div className="flex items-center gap-1">
            <span>💰</span>
            <span>销售</span>
          </div>
          <div className="flex items-center gap-1">
            <span>⚠️</span>
            <span>库存警告</span>
          </div>
          <div className="flex items-center gap-1">
            <span>✨</span>
            <span>新商品</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendarView;
