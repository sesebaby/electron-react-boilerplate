/**
 * 逐日消耗表格行组件
 */

import React from 'react';
import { 
  ConsumptionTableRowProps, 
  CategoryRowData, 
  ProductRowData, 
  TimeSlot 
} from '../../types/consumption';
import ConsumptionCalculator from '../../utils/consumptionCalculator';
import TimeSlotHelper from '../../utils/timeSlotHelper';

const ConsumptionTableRow: React.FC<ConsumptionTableRowProps> = ({
  rowData,
  dateColumns,
  displayMode,
  level,
  onToggle,
  onCellClick,
  className = ''
}) => {
  
  const isCategoryRow = 'children' in rowData;
  const categoryData = isCategoryRow ? rowData as CategoryRowData : null;
  const productData = !isCategoryRow ? rowData as ProductRowData : null;

  /**
   * 处理行展开/折叠
   */
  const handleToggle = () => {
    if (onToggle && isCategoryRow) {
      onToggle(categoryData!.categoryId);
    }
  };

  /**
   * 处理单元格点击
   */
  const handleCellClick = (date: string, timeSlot: TimeSlot) => {
    if (onCellClick) {
      const id = isCategoryRow ? categoryData!.categoryId : productData!.productId;
      onCellClick(id, date, timeSlot);
    }
  };

  /**
   * 格式化显示值
   */
  const formatValue = (value: number): string => {
    if (value === 0) return '-';
    return ConsumptionCalculator.formatDisplayValue(value, displayMode);
  };

  /**
   * 获取单元格样式
   */
  const getCellStyle = (value: number, timeSlot: TimeSlot): string => {
    const baseStyle = "px-3 py-2 text-center text-sm border-r border-white/10 cursor-pointer transition-colors duration-200";
    const timeSlotStyle = TimeSlotHelper.getTimeSlotColorTheme(timeSlot);
    
    if (value === 0) {
      return `${baseStyle} text-white/40 hover:bg-white/5`;
    }
    
    return `${baseStyle} text-white/90 hover:bg-white/10 ${timeSlotStyle}`;
  };

  /**
   * 获取行样式
   */
  const getRowStyle = (): string => {
    const baseStyle = "border-b border-white/10 hover:bg-white/5 transition-colors duration-200";
    
    if (isCategoryRow) {
      const levelStyle = level === 1 ? 'bg-white/5' : 'bg-white/3';
      return `${baseStyle} ${levelStyle} ${className}`;
    }
    
    return `${baseStyle} ${className}`;
  };

  /**
   * 获取分类名称样式
   */
  const getCategoryNameStyle = (): string => {
    const baseStyle = "flex items-center text-white/90 drop-shadow-md";
    const indentStyle = `ml-${Math.min(level * 4, 16)}`;
    
    return `${baseStyle} ${indentStyle}`;
  };

  /**
   * 渲染分类行
   */
  const renderCategoryRow = () => {
    if (!categoryData) return null;

    return (
      <tr className={getRowStyle()}>
        {/* 分类名称列 */}
        <td className="table-cell-fixed left-0 z-20 px-4 py-3 border-r border-white/20">
          <div className={getCategoryNameStyle()}>
            {/* 展开/折叠按钮 */}
            {categoryData.hasChildren && (
              <button
                onClick={handleToggle}
                className="mr-2 w-4 h-4 flex items-center justify-center text-white/70 hover:text-white/90 transition-colors"
              >
                {categoryData.isExpanded ? '▼' : '▶'}
              </button>
            )}
            
            {/* 分类图标 */}
            <span className="mr-2 text-blue-300">📁</span>
            
            {/* 分类名称 */}
            <div className="flex flex-col">
              <span className="font-medium">{categoryData.categoryName}</span>
              <span className="text-xs text-white/60">
                {categoryData.products.length} 个产品
              </span>
            </div>
          </div>
        </td>

        {/* 日期数据列 */}
        {dateColumns.map((date) => {
          const timeSlotData = categoryData.data.get(date);
          if (!timeSlotData) {
            return (
              <React.Fragment key={`${categoryData.categoryId}-${date}`}>
                <td className={getCellStyle(0, TimeSlot.MORNING)}>-</td>
                <td className={getCellStyle(0, TimeSlot.AFTERNOON)}>-</td>
                <td className={getCellStyle(0, TimeSlot.EVENING)}>-</td>
              </React.Fragment>
            );
          }

          const morningValue = ConsumptionCalculator.getDisplayValue(timeSlotData.morning, displayMode);
          const afternoonValue = ConsumptionCalculator.getDisplayValue(timeSlotData.afternoon, displayMode);
          const eveningValue = ConsumptionCalculator.getDisplayValue(timeSlotData.evening, displayMode);

          return (
            <React.Fragment key={`${categoryData.categoryId}-${date}`}>
              <td 
                className={getCellStyle(morningValue, TimeSlot.MORNING)}
                onClick={() => handleCellClick(date, TimeSlot.MORNING)}
              >
                {formatValue(morningValue)}
              </td>
              <td 
                className={getCellStyle(afternoonValue, TimeSlot.AFTERNOON)}
                onClick={() => handleCellClick(date, TimeSlot.AFTERNOON)}
              >
                {formatValue(afternoonValue)}
              </td>
              <td 
                className={getCellStyle(eveningValue, TimeSlot.EVENING)}
                onClick={() => handleCellClick(date, TimeSlot.EVENING)}
              >
                {formatValue(eveningValue)}
              </td>
            </React.Fragment>
          );
        })}

        {/* 合计列 */}
        <td className="px-4 py-3 text-center font-semibold text-white/90 bg-white/10 border-l border-white/30">
          {formatValue(ConsumptionCalculator.getDisplayValue(categoryData.rowTotal, displayMode))}
        </td>
      </tr>
    );
  };

  /**
   * 渲染产品行
   */
  const renderProductRow = () => {
    if (!productData) return null;

    return (
      <tr className={getRowStyle()}>
        {/* 产品名称列 */}
        <td className="table-cell-fixed left-0 z-15 px-4 py-3 border-r border-white/20">
          <div className={`flex items-center text-white/80 ml-${Math.min((level + 1) * 4, 20)}`}>
            {/* 产品图标 */}
            <span className="mr-2 text-green-300">📦</span>
            
            {/* 产品信息 */}
            <div className="flex flex-col">
              <span className="font-medium">{productData.productName}</span>
              <span className="text-xs text-white/60">
                SKU: {productData.productSku}
              </span>
              {productData.hasUnitConversion && (
                <span className="text-xs text-blue-300">
                  {productData.baseUnit} → {productData.convertedUnit}
                </span>
              )}
            </div>
          </div>
        </td>

        {/* 日期数据列 */}
        {dateColumns.map((date) => {
          const timeSlotData = productData.data.get(date);
          if (!timeSlotData) {
            return (
              <React.Fragment key={`${productData.productId}-${date}`}>
                <td className={getCellStyle(0, TimeSlot.MORNING)}>-</td>
                <td className={getCellStyle(0, TimeSlot.AFTERNOON)}>-</td>
                <td className={getCellStyle(0, TimeSlot.EVENING)}>-</td>
              </React.Fragment>
            );
          }

          const morningValue = ConsumptionCalculator.getDisplayValue(timeSlotData.morning, displayMode);
          const afternoonValue = ConsumptionCalculator.getDisplayValue(timeSlotData.afternoon, displayMode);
          const eveningValue = ConsumptionCalculator.getDisplayValue(timeSlotData.evening, displayMode);

          return (
            <React.Fragment key={`${productData.productId}-${date}`}>
              <td 
                className={getCellStyle(morningValue, TimeSlot.MORNING)}
                onClick={() => handleCellClick(date, TimeSlot.MORNING)}
              >
                {formatValue(morningValue)}
              </td>
              <td 
                className={getCellStyle(afternoonValue, TimeSlot.AFTERNOON)}
                onClick={() => handleCellClick(date, TimeSlot.AFTERNOON)}
              >
                {formatValue(afternoonValue)}
              </td>
              <td 
                className={getCellStyle(eveningValue, TimeSlot.EVENING)}
                onClick={() => handleCellClick(date, TimeSlot.EVENING)}
              >
                {formatValue(eveningValue)}
              </td>
            </React.Fragment>
          );
        })}

        {/* 合计列 */}
        <td className="px-4 py-3 text-center font-medium text-white/80 bg-white/5 border-l border-white/30">
          {formatValue(ConsumptionCalculator.getDisplayValue(productData.rowTotal, displayMode))}
        </td>
      </tr>
    );
  };

  return isCategoryRow ? renderCategoryRow() : renderProductRow();
};

export default ConsumptionTableRow;
