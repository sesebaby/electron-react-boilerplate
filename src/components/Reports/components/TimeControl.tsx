import React from 'react';
import { TimeRangeFilter, QuickTimeRange } from '../../../types/inventoryMovement';
import { GlassButton, GlassCard } from '../../ui/FormControls';

interface TimeControlProps {
  timeRange: TimeRangeFilter;
  onChange: (timeRange: TimeRangeFilter) => void;
  loading?: boolean;
  className?: string;
}

export const TimeControl: React.FC<TimeControlProps> = ({
  timeRange,
  onChange,
  loading = false,
  className = ''
}) => {
  
  /**
   * 格式化日期为输入框格式
   */
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /**
   * 处理日期范围变化
   */
  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    const newDate = new Date(value);
    const newTimeRange: TimeRangeFilter = {
      ...timeRange,
      [field]: newDate
    };
    
    // 验证日期范围
    if (newTimeRange.startDate <= newTimeRange.endDate) {
      onChange(newTimeRange);
    }
  };

  /**
   * 处理快捷时间选择
   */
  const handleQuickTimeSelect = (quickRange: QuickTimeRange) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (quickRange) {
      case QuickTimeRange.LAST_LAST_MONTH:
        // 上上月：前两个月的完整月份
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - 1, 0); // 上上月最后一天
        break;
        
      case QuickTimeRange.LAST_MONTH:
        // 上月：上个月的完整月份
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0); // 上月最后一天
        break;
        
      case QuickTimeRange.CURRENT_MONTH:
        // 当月：当前月份从月初到今天
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(); // 今天
        break;
        
      default:
        return;
    }

    onChange({ startDate, endDate });
  };

  /**
   * 获取快捷按钮的显示文本
   */
  const getQuickButtonText = (quickRange: QuickTimeRange): string => {
    const now = new Date();
    
    switch (quickRange) {
      case QuickTimeRange.LAST_LAST_MONTH:
        const lastLastMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return `${lastLastMonth.getMonth() + 1}月`;
        
      case QuickTimeRange.LAST_MONTH:
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return `${lastMonth.getMonth() + 1}月`;
        
      case QuickTimeRange.CURRENT_MONTH:
        return `${now.getMonth() + 1}月`;
        
      default:
        return '';
    }
  };

  /**
   * 检查快捷按钮是否为当前选中状态
   */
  const isQuickRangeActive = (quickRange: QuickTimeRange): boolean => {
    const now = new Date();
    let expectedStart: Date;
    let expectedEnd: Date;

    switch (quickRange) {
      case QuickTimeRange.LAST_LAST_MONTH:
        expectedStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        expectedEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
        break;
        
      case QuickTimeRange.LAST_MONTH:
        expectedStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        expectedEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
        
      case QuickTimeRange.CURRENT_MONTH:
        expectedStart = new Date(now.getFullYear(), now.getMonth(), 1);
        expectedEnd = new Date();
        expectedEnd.setHours(23, 59, 59, 999); // 设置为当天结束
        break;
        
      default:
        return false;
    }

    // 比较日期（忽略时间部分）
    const startMatches = timeRange.startDate.toDateString() === expectedStart.toDateString();
    const endMatches = timeRange.endDate.toDateString() === expectedEnd.toDateString() ||
                      (quickRange === QuickTimeRange.CURRENT_MONTH && 
                       timeRange.endDate.toDateString() === new Date().toDateString());

    return startMatches && endMatches;
  };

  return (
    <GlassCard className={className}>
      <div className="p-4">
        <h3 className="text-lg font-semibold financial-title mb-4">时间范围</h3>
        
        <div className="space-y-4">
          {/* 快捷时间选择按钮 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium financial-subtitle self-center mr-2">快捷选择:</span>
            
            <GlassButton
              onClick={() => handleQuickTimeSelect(QuickTimeRange.LAST_LAST_MONTH)}
              disabled={loading}
              className={`text-sm px-3 py-1 ${
                isQuickRangeActive(QuickTimeRange.LAST_LAST_MONTH) 
                  ? 'financial-value-positive' 
                  : 'financial-subtitle'
              }`}
            >
              上上月({getQuickButtonText(QuickTimeRange.LAST_LAST_MONTH)})
            </GlassButton>
            
            <GlassButton
              onClick={() => handleQuickTimeSelect(QuickTimeRange.LAST_MONTH)}
              disabled={loading}
              className={`text-sm px-3 py-1 ${
                isQuickRangeActive(QuickTimeRange.LAST_MONTH) 
                  ? 'financial-value-positive' 
                  : 'financial-subtitle'
              }`}
            >
              上月({getQuickButtonText(QuickTimeRange.LAST_MONTH)})
            </GlassButton>
            
            <GlassButton
              onClick={() => handleQuickTimeSelect(QuickTimeRange.CURRENT_MONTH)}
              disabled={loading}
              className={`text-sm px-3 py-1 ${
                isQuickRangeActive(QuickTimeRange.CURRENT_MONTH) 
                  ? 'financial-value-positive' 
                  : 'financial-subtitle'
              }`}
            >
              当月({getQuickButtonText(QuickTimeRange.CURRENT_MONTH)})
            </GlassButton>
          </div>

          {/* 自定义日期范围选择 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">
                开始日期
              </label>
              <input
                type="date"
                value={formatDateForInput(timeRange.startDate)}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">
                结束日期
              </label>
              <input
                type="date"
                value={formatDateForInput(timeRange.endDate)}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* 日期范围信息显示 */}
          <div className="text-sm financial-description">
            <span>统计时间段: </span>
            <span className="financial-subtitle">
              {timeRange.startDate.toLocaleDateString('zh-CN')} 
              {' 至 '}
              {timeRange.endDate.toLocaleDateString('zh-CN')}
            </span>
            <span className="ml-2">
              (共 {Math.ceil((timeRange.endDate.getTime() - timeRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} 天)
            </span>
          </div>

          {/* 日期验证提示 */}
          {timeRange.startDate > timeRange.endDate && (
            <div className="text-sm text-red-400 flex items-center space-x-1">
              <span>⚠️</span>
              <span>开始日期不能晚于结束日期</span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
