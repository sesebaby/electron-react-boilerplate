import React from 'react';
import { WeeklyCalendarData, DailyBusinessSummary } from '../../../types/entities';
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
  const _weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const _today = new Date();
  today.setHours(0, 0, 0, 0);

  const _formatCurrency = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return `${amount.toLocaleString()}`;
  };

  const _formatDateRange = (start: Date, end: Date): string => {
    const _startStr = start.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const _endStr = end.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    return `${startStr} - ${endStr}`;
  };

  const _isToday = (date: Date): boolean => {
    const _checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const _isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    const _checkDate = new Date(date);
    const _selected = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    selected.setHours(0, 0, 0, 0);
    return checkDate.getTime() === selected.getTime();
  };

  return (
    <div className="glass-surface backdrop-blur-lg rounded-xl border border-white/20">
      {/* 周标题和汇总 */}
      <div className="p-4 border-b border-white/20">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-white drop-shadow-lg">
            {formatDateRange(weekData.weekStart, weekData.weekEnd)}
          </h3>
          <div className="text-sm text-white/70 drop-shadow-md">
            {weekData.weekStart.getFullYear()}年 第{Math.ceil((weekData.weekStart.getTime() - new Date(weekData.weekStart.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}周
          </div>
        </div>

        {/* 周汇总统计 */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-blue-300 font-medium drop-shadow-md">采购总额</div>
            <div className="text-lg font-bold text-blue-200 drop-shadow-lg">
              {formatCurrency(weekData.weeklyTotals.purchases)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-green-300 font-medium drop-shadow-md">销售总额</div>
            <div className="text-lg font-bold text-green-200 drop-shadow-lg">
              {formatCurrency(weekData.weeklyTotals.sales)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-white/80 font-medium drop-shadow-md">净变化</div>
            <div className={`text-lg font-bold drop-shadow-lg ${
              weekData.weeklyTotals.netChange > 0 ? 'text-green-200' :
              weekData.weeklyTotals.netChange < 0 ? 'text-red-200' : 'text-white/80'
            }`}>
              {weekData.weeklyTotals.netChange > 0 ? '+' : ''}{weekData.weeklyTotals.netChange}
            </div>
          </div>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 border-b border-white/20">
        {weekDays.map((day, index) => (
          <div key={day} className={`p-3 text-center text-sm font-medium drop-shadow-md ${
            index >= 5 ? 'text-white/60 bg-white/5' : 'text-white/80'
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* 日历格子 */}
      <div className="grid grid-cols-7 gap-0">
        {weekData.days.map((dayData, index) => (
          <div key={index} className="border-r border-white/20 last:border-r-0">
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
      <div className="p-4 border-t border-white/20 bg-white/5 backdrop-blur-sm">
        <div className="flex flex-wrap gap-4 text-xs text-white/80 drop-shadow-md">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full shadow-sm"></div>
            <span>高活跃度</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-sm"></div>
            <span>中活跃度</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full shadow-sm"></div>
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
