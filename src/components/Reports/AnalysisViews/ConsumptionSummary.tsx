/**
 * 逐日消耗汇总信息组件
 */

import React from 'react';
import { 
  ConsumptionSummaryProps, 
  DisplayMode,
  TimeSlot 
} from '../../../types/consumption';
import ConsumptionCalculator from '../../../utils/consumptionCalculator';
import TimeSlotHelper from '../../../utils/timeSlotHelper';

const ConsumptionSummary: React.FC<ConsumptionSummaryProps> = ({
  totals,
  displayMode,
  dateRange,
  className = ''
}) => {
  
  /**
   * 计算日期范围天数
   */
  const getDaysCount = (): number => {
    return TimeSlotHelper.getDaysBetween(dateRange.startDate, dateRange.endDate) + 1;
  };

  /**
   * 计算平均值
   */
  const getAverageValue = (total: number): number => {
    const days = getDaysCount();
    return days > 0 ? total / days : 0;
  };

  /**
   * 格式化显示值
   */
  const formatValue = (value: number): string => {
    return ConsumptionCalculator.formatDisplayValue(value, displayMode);
  };

  /**
   * 获取显示单位
   */
  const getUnit = (): string => {
    return ConsumptionCalculator.getDisplayUnit(displayMode, '个', '包装单位');
  };

  /**
   * 获取时间段颜色主题
   */
  const getTimeSlotTheme = (timeSlot: TimeSlot): string => {
    return TimeSlotHelper.getTimeSlotColorTheme(timeSlot);
  };

  const grandTotalValue = ConsumptionCalculator.getDisplayValue(totals.grandTotal, displayMode);
  const morningTotalValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.morning, displayMode);
  const afternoonTotalValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.afternoon, displayMode);
  const eveningTotalValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.evening, displayMode);

  return (
    <div className={`glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-6 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">📊</span>
        <div>
          <h3 className="text-lg font-semibold text-white/95 drop-shadow-md">消耗数据汇总</h3>
          <p className="text-sm text-white/70">
            {dateRange.startDate.toLocaleDateString('zh-CN')} - {dateRange.endDate.toLocaleDateString('zh-CN')}
            （共 {getDaysCount()} 天）
          </p>
        </div>
      </div>

      {/* 总计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* 总计 */}
        <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">总计</span>
            <span className="text-xl">🎯</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-white/95 drop-shadow-md">
              {formatValue(grandTotalValue)}
            </div>
            <div className="text-xs text-white/70">
              日均: {formatValue(getAverageValue(grandTotalValue))}
            </div>
            <div className="text-xs text-white/60">
              交易次数: {totals.grandTotal.transactionCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 早上时间段 */}
        <div className={`rounded-lg p-4 border border-white/20 ${getTimeSlotTheme(TimeSlot.MORNING)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">早 (06-12)</span>
            <span className="text-xl">🌅</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold text-white/95 drop-shadow-md">
              {formatValue(morningTotalValue)}
            </div>
            <div className="text-xs text-white/70">
              占比: {grandTotalValue > 0 ? ((morningTotalValue / grandTotalValue) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-white/60">
              交易: {totals.timeSlotTotals.morning.transactionCount}
            </div>
          </div>
        </div>

        {/* 下午时间段 */}
        <div className={`rounded-lg p-4 border border-white/20 ${getTimeSlotTheme(TimeSlot.AFTERNOON)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">中 (12-18)</span>
            <span className="text-xl">☀️</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold text-white/95 drop-shadow-md">
              {formatValue(afternoonTotalValue)}
            </div>
            <div className="text-xs text-white/70">
              占比: {grandTotalValue > 0 ? ((afternoonTotalValue / grandTotalValue) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-white/60">
              交易: {totals.timeSlotTotals.afternoon.transactionCount}
            </div>
          </div>
        </div>

        {/* 晚上时间段 */}
        <div className={`rounded-lg p-4 border border-white/20 ${getTimeSlotTheme(TimeSlot.EVENING)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white/80">晚 (18-06)</span>
            <span className="text-xl">🌙</span>
          </div>
          <div className="space-y-1">
            <div className="text-xl font-bold text-white/95 drop-shadow-md">
              {formatValue(eveningTotalValue)}
            </div>
            <div className="text-xs text-white/70">
              占比: {grandTotalValue > 0 ? ((eveningTotalValue / grandTotalValue) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-xs text-white/60">
              交易: {totals.timeSlotTotals.evening.transactionCount}
            </div>
          </div>
        </div>
      </div>

      {/* 详细统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 时间段分布图 */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-sm font-medium text-white/90 mb-3 drop-shadow-md">时间段分布</h4>
          <div className="space-y-3">
            {[
              { slot: TimeSlot.MORNING, name: '早上', value: morningTotalValue, icon: '🌅' },
              { slot: TimeSlot.AFTERNOON, name: '下午', value: afternoonTotalValue, icon: '☀️' },
              { slot: TimeSlot.EVENING, name: '晚上', value: eveningTotalValue, icon: '🌙' }
            ].map(({ slot, name, value, icon }) => {
              const percentage = grandTotalValue > 0 ? (value / grandTotalValue) * 100 : 0;
              return (
                <div key={slot} className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-white/80">{name}</span>
                      <span className="text-sm text-white/90 font-medium">
                        {formatValue(value)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getTimeSlotTheme(slot)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 统计信息 */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h4 className="text-sm font-medium text-white/90 mb-3 drop-shadow-md">统计信息</h4>
          <div className="space-y-3">
            
            {/* 平均单价 */}
            {displayMode === DisplayMode.AMOUNT && totals.grandTotal.avgUnitPrice && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">平均单价:</span>
                <span className="text-sm text-white/90 font-medium">
                  ¥{totals.grandTotal.avgUnitPrice.toFixed(2)}
                </span>
              </div>
            )}

            {/* 总交易次数 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">总交易次数:</span>
              <span className="text-sm text-white/90 font-medium">
                {totals.grandTotal.transactionCount.toLocaleString()}
              </span>
            </div>

            {/* 日均交易次数 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">日均交易次数:</span>
              <span className="text-sm text-white/90 font-medium">
                {(totals.grandTotal.transactionCount / getDaysCount()).toFixed(1)}
              </span>
            </div>

            {/* 分类数量 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">涉及分类:</span>
              <span className="text-sm text-white/90 font-medium">
                {totals.categoryTotals.size} 个
              </span>
            </div>

            {/* 数据单位 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">数据单位:</span>
              <span className="text-sm text-white/90 font-medium">
                {getUnit()}
              </span>
            </div>

            {/* 最活跃时间段 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/70">最活跃时间段:</span>
              <span className="text-sm text-white/90 font-medium">
                {morningTotalValue >= afternoonTotalValue && morningTotalValue >= eveningTotalValue ? '早上' :
                 afternoonTotalValue >= eveningTotalValue ? '下午' : '晚上'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionSummary;
