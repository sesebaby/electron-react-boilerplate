/**
 * 逐日消耗表格双层表头组件
 */

import React from 'react';
import { ConsumptionTableHeaderProps, DisplayMode } from '../../../types/consumption';

const ConsumptionTableHeader: React.FC<ConsumptionTableHeaderProps> = ({
  dateColumns,
  displayMode,
  className = ''
}) => {
  
  /**
   * 获取显示模式的标题
   */
  const _getDisplayModeTitle = (mode: DisplayMode): string => {
    switch (mode) {
      case DisplayMode.QUANTITY:
        return '数量';
      case DisplayMode.CONVERTED:
        return '换算数量';
      case DisplayMode.AMOUNT:
        return '金额';
      default:
        return '数量';
    }
  };

  /**
   * 获取显示模式的单位
   */
  const _getDisplayModeUnit = (mode: DisplayMode): string => {
    switch (mode) {
      case DisplayMode.QUANTITY:
        return '(个)';
      case DisplayMode.CONVERTED:
        return '(包装单位)';
      case DisplayMode.AMOUNT:
        return '(元)';
      default:
        return '';
    }
  };

  /**
   * 格式化日期显示
   */
  const _formatDateDisplay = (dateString: string): string => {
    const _date = new Date(dateString);
    const _month = date.getMonth() + 1;
    const _day = date.getDate();
    const _weekDay = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
    return `${month}/${day} 周${weekDay}`;
  };

  return (
    <thead className={`consumption-table-header table-header-sticky ${className}`}>
      {/* 第一层表头：分类列 + 日期分组 + 合计列 */}
      <tr className="table-header-row-primary border-b border-white/20">
        <th
          className="table-cell-fixed left-0 z-50 px-4 py-3 text-left font-semibold text-white/90 border-r border-white/20"
          rowSpan={2}
        >
          <div className="flex flex-col">
            <span className="text-sm drop-shadow-md">分类/产品</span>
            <span className="text-xs text-white/70 mt-1">Category/Product</span>
          </div>
        </th>
        
        {/* 日期列分组 */}
        {dateColumns.map((date) => (
          <th
            key={date}
            className="table-header-date-group px-2 py-3 text-center font-medium text-white/90 border-r border-white/20"
            colSpan={3}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm drop-shadow-md">{formatDateDisplay(date)}</span>
              <span className="text-xs text-white/70 mt-1">{getDisplayModeTitle(displayMode)}</span>
            </div>
          </th>
        ))}

        {/* 合计列 */}
        <th
          className="table-cell-fixed right-0 z-50 px-4 py-3 text-center font-semibold text-white/90 border-l border-white/30"
          rowSpan={2}
        >
          <div className="flex flex-col items-center">
            <span className="text-sm drop-shadow-md">合计</span>
            <span className="text-xs text-white/70 mt-1">
              {getDisplayModeTitle(displayMode)} {getDisplayModeUnit(displayMode)}
            </span>
          </div>
        </th>
      </tr>

      {/* 第二层表头：时间段 */}
      <tr className="table-header-row-secondary border-b border-white/20">
        {dateColumns.map((date) => (
          <React.Fragment key={`${date}-slots`}>
            {/* 早 */}
            <th className="table-header-time-slot table-header-time-morning px-3 py-2 text-center text-sm font-medium text-yellow-300 border-r border-white/10">
              <div className="flex flex-col items-center">
                <span className="drop-shadow-md">早</span>
                <span className="text-xs text-yellow-200/80">06-12</span>
              </div>
            </th>

            {/* 中 */}
            <th className="table-header-time-slot table-header-time-afternoon px-3 py-2 text-center text-sm font-medium text-blue-300 border-r border-white/10">
              <div className="flex flex-col items-center">
                <span className="drop-shadow-md">中</span>
                <span className="text-xs text-blue-200/80">12-18</span>
              </div>
            </th>

            {/* 晚 */}
            <th className="table-header-time-slot table-header-time-evening px-3 py-2 text-center text-sm font-medium text-purple-300 border-r border-white/20">
              <div className="flex flex-col items-center">
                <span className="drop-shadow-md">晚</span>
                <span className="text-xs text-purple-200/80">18-06</span>
              </div>
            </th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
};

export default ConsumptionTableHeader;
