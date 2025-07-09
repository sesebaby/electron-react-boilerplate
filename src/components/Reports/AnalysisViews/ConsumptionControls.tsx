/**
 * 逐日消耗控制面板组件
 */

import React, { useState } from 'react';
import { 
  ConsumptionControlsProps, 
  DailyConsumptionViewConfig,
  DisplayMode 
} from '../../../types/consumption';

// 基准日期配置 - 当前月份第1天的起始日期
const _getBaseDate = () => {
  const _now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const ConsumptionControls: React.FC<ConsumptionControlsProps> = ({
  config,
  onChange,
  onRefresh,
  onExport,
  loading = false,
  className = ''
}) => {
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  /**
   * 处理日期范围变更
   */
  const _handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    const newConfig: DailyConsumptionViewConfig = {
      ...config,
      dateRange: {
        ...config.dateRange,
        [field]: new Date(value)
      }
    };
    onChange(newConfig);
  };

  /**
   * 处理显示模式变更
   */
  const _handleDisplayModeChange = (mode: DisplayMode) => {
    const newConfig: DailyConsumptionViewConfig = {
      ...config,
      displayMode: mode
    };
    onChange(newConfig);
  };

  /**
   * 处理快速日期选择
   */
  const _handleQuickDateSelect = (days: number) => {
    const _endDate = new Date();
    const _startDate = new Date();
    startDate.setDate(endDate.getDate() - days + 1);
    
    const newConfig: DailyConsumptionViewConfig = {
      ...config,
      dateRange: {
        startDate,
        endDate
      }
    };
    onChange(newConfig);
  };

  /**
   * 处理周快速选择
   */
  const _handleWeekSelect = (weekNumber: number) => {
    // 计算该周的开始日期和结束日期
    const _baseDate = getBaseDate();
    const _startDate = new Date(baseDate);
    startDate.setDate(baseDate.getDate() + (weekNumber - 1) * 7);
    
    const _endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const newConfig: DailyConsumptionViewConfig = {
      ...config,
      dateRange: {
        startDate,
        endDate
      }
    };
    onChange(newConfig);
  };

  /**
   * 格式化日期为输入框格式
   */
  const _formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /**
   * 获取显示模式的图标
   */
  const _getDisplayModeIcon = (mode: DisplayMode): string => {
    switch (mode) {
      case DisplayMode.QUANTITY:
        return '📦';
      case DisplayMode.CONVERTED:
        return '📊';
      case DisplayMode.AMOUNT:
        return '💰';
      default:
        return '📦';
    }
  };

  /**
   * 获取显示模式的标题
   */
  const _getDisplayModeTitle = (mode: DisplayMode): string => {
    switch (mode) {
      case DisplayMode.QUANTITY:
        return '数量统计';
      case DisplayMode.CONVERTED:
        return '换算数量';
      case DisplayMode.AMOUNT:
        return '金额统计';
      default:
        return '数量统计';
    }
  };

  return (
    <div className={`glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-6 ${className}`}>
      {/* 主控制区域 */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        
        {/* 日期范围选择 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white/90 drop-shadow-md">日期范围:</label>
          <input
            type="date"
            value={formatDateForInput(config.dateRange.startDate)}
            onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm"
            disabled={loading}
          />
          <span className="text-white/70">至</span>
          <input
            type="date"
            value={formatDateForInput(config.dateRange.endDate)}
            onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 backdrop-blur-sm"
            disabled={loading}
          />
        </div>

        {/* 快速日期选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">快选:</span>
          {[7, 15, 30].map(days => (
            <button
              key={days}
              onClick={() => handleQuickDateSelect(days)}
              disabled={loading}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-sm text-white/90 transition-colors duration-200 disabled:opacity-50"
            >
              {days}天
            </button>
          ))}
        </div>

        {/* 周快速选择 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">周选:</span>
          {[1, 2, 3, 4, 5].map(week => (
            <button
              key={week}
              onClick={() => handleWeekSelect(week)}
              disabled={loading}
              className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-md text-sm text-white/90 transition-colors duration-200 disabled:opacity-50"
            >
              第{week}周
            </button>
          ))}
        </div>

        {/* 显示模式切换 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-white/90 drop-shadow-md">显示模式:</label>
          <div className="flex bg-white/10 rounded-lg border border-white/20 overflow-hidden">
            {Object.values(DisplayMode).map(mode => (
              <button
                key={mode}
                onClick={() => handleDisplayModeChange(mode)}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                  config.displayMode === mode
                    ? 'bg-blue-500/30 text-white/95 border-blue-400/50'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <span>{getDisplayModeIcon(mode)}</span>
                <span>{getDisplayModeTitle(mode)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 高级选项切换 */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white/90 transition-colors duration-200 flex items-center gap-2"
          >
            <span>⚙️</span>
            <span>高级</span>
            <span className={`transform transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {/* 刷新按钮 */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg text-sm text-white/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span>刷新</span>
          </button>

          {/* 导出按钮 */}
          <button
            onClick={onExport}
            disabled={loading}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 rounded-lg text-sm text-white/90 transition-colors duration-200 flex items-center gap-2 disabled:opacity-50"
          >
            <span>📤</span>
            <span>导出</span>
          </button>
        </div>
      </div>

      {/* 高级选项区域 */}
      {showAdvanced && (
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* 时间段配置 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90 drop-shadow-md">时间段配置:</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-300 w-8">早:</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.morning.start}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                  <span className="text-xs text-white/70">-</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.morning.end}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-300 w-8">中:</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.afternoon.start}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                  <span className="text-xs text-white/70">-</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.afternoon.end}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-purple-300 w-8">晚:</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.evening.start}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                  <span className="text-xs text-white/70">-</span>
                  <input
                    type="time"
                    value={config.timeSlotConfig.evening.end}
                    className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white/90 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 显示选项 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90 drop-shadow-md">显示选项:</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.showSubCategories}
                    className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                  <span className="text-sm text-white/80">显示子分类</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.groupByCategory}
                    className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-400/50"
                    disabled={loading}
                  />
                  <span className="text-sm text-white/80">按分类分组</span>
                </label>
              </div>
            </div>

            {/* 筛选选项 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90 drop-shadow-md">筛选选项:</label>
              <div className="space-y-2">
                <select
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  disabled={loading}
                >
                  <option value="">选择分类筛选</option>
                  {/* 这里应该动态加载分类选项 */}
                </select>
                <select
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white/90 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  disabled={loading}
                >
                  <option value="">选择仓库筛选</option>
                  {/* 这里应该动态加载仓库选项 */}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionControls;
