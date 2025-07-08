/**
 * 逐日消耗表格主组件
 */

import React, { useState, useMemo } from 'react';
import { 
  ConsumptionTableProps, 
  CategoryRowData, 
  ProductRowData,
  TimeSlot 
} from '../../types/consumption';
import ConsumptionTableHeader from './ConsumptionTableHeader';
import ConsumptionTableRow from './ConsumptionTableRow';
import ConsumptionCalculator from '../../utils/consumptionCalculator';

const ConsumptionTable: React.FC<ConsumptionTableProps> = ({
  data,
  loading = false,
  onCategoryToggle,
  onCellClick,
  className = ''
}) => {
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  /**
   * 处理分类展开/折叠
   */
  const handleCategoryToggle = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
    
    if (onCategoryToggle) {
      onCategoryToggle(categoryId);
    }
  };

  /**
   * 处理单元格点击
   */
  const handleCellClick = (id: string, date: string, timeSlot: TimeSlot) => {
    if (onCellClick) {
      onCellClick(id, date, timeSlot);
    }
  };

  /**
   * 渲染分类及其子项
   */
  const renderCategoryWithChildren = (category: CategoryRowData, level: number = 1): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    
    // 渲染分类行
    const updatedCategory = {
      ...category,
      isExpanded: expandedCategories.has(category.categoryId)
    };
    
    rows.push(
      <ConsumptionTableRow
        key={`category-${category.categoryId}`}
        rowData={updatedCategory}
        dateColumns={data.dateColumns}
        displayMode={data.config.displayMode}
        level={level}
        onToggle={handleCategoryToggle}
        onCellClick={handleCellClick}
      />
    );

    // 如果分类展开，渲染子项
    if (expandedCategories.has(category.categoryId)) {
      // 渲染产品
      category.products.forEach(product => {
        rows.push(
          <ConsumptionTableRow
            key={`product-${product.productId}`}
            rowData={product}
            dateColumns={data.dateColumns}
            displayMode={data.config.displayMode}
            level={level + 1}
            onCellClick={handleCellClick}
          />
        );
      });

      // 渲染子分类
      if (category.children) {
        category.children.forEach(childCategory => {
          rows.push(...renderCategoryWithChildren(childCategory, level + 1));
        });
      }
    }

    return rows;
  };

  /**
   * 渲染合计行
   */
  const renderTotalRow = () => {
    const { totals, config, dateColumns } = data;
    
    return (
      <tr className="border-t-2 border-white/30 bg-white/10 font-semibold">
        {/* 合计标签 */}
        <td className="sticky left-0 z-10 px-4 py-3 border-r border-white/30" style={{backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)', background: 'rgba(255, 255, 255, 0.25)', boxShadow: '2px 0 12px rgba(0, 0, 0, 0.15)'}}>
          <div className="flex items-center text-white/95 drop-shadow-lg">
            <span className="mr-2 text-yellow-300">📊</span>
            <div className="flex flex-col">
              <span className="font-bold">总计</span>
              <span className="text-xs text-white/70">
                {ConsumptionCalculator.getDisplayUnit(
                  config.displayMode, 
                  '个', 
                  '包装单位'
                )}
              </span>
            </div>
          </div>
        </td>

        {/* 日期合计列 */}
        {dateColumns.map((date) => {
          const dateTotal = totals.dateTotals.get(date);
          if (!dateTotal) {
            return (
              <React.Fragment key={`total-${date}`}>
                <td className="px-3 py-3 text-center text-white/70 bg-yellow-500/10 border-r border-white/10">-</td>
                <td className="px-3 py-3 text-center text-white/70 bg-blue-500/10 border-r border-white/10">-</td>
                <td className="px-3 py-3 text-center text-white/70 bg-purple-500/10 border-r border-white/20">-</td>
              </React.Fragment>
            );
          }

          // 计算各时间段的值（需要从日期总计中分解）
          const morningValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.morning, config.displayMode);
          const afternoonValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.afternoon, config.displayMode);
          const eveningValue = ConsumptionCalculator.getDisplayValue(totals.timeSlotTotals.evening, config.displayMode);

          return (
            <React.Fragment key={`total-${date}`}>
              <td className="px-3 py-3 text-center text-white/95 bg-yellow-500/20 border-r border-white/10 drop-shadow-md">
                {ConsumptionCalculator.formatDisplayValue(morningValue, config.displayMode)}
              </td>
              <td className="px-3 py-3 text-center text-white/95 bg-blue-500/20 border-r border-white/10 drop-shadow-md">
                {ConsumptionCalculator.formatDisplayValue(afternoonValue, config.displayMode)}
              </td>
              <td className="px-3 py-3 text-center text-white/95 bg-purple-500/20 border-r border-white/20 drop-shadow-md">
                {ConsumptionCalculator.formatDisplayValue(eveningValue, config.displayMode)}
              </td>
            </React.Fragment>
          );
        })}

        {/* 总计列 */}
        <td className="px-4 py-3 text-center font-bold text-white/95 bg-white/20 border-l border-white/40 drop-shadow-lg">
          {ConsumptionCalculator.formatDisplayValue(
            ConsumptionCalculator.getDisplayValue(totals.grandTotal, config.displayMode),
            config.displayMode
          )}
        </td>
      </tr>
    );
  };

  /**
   * 计算表格的最小宽度
   */
  const tableMinWidth = useMemo(() => {
    const categoryColumnWidth = 300; // 分类列宽度
    const timeSlotColumnWidth = 80;   // 时间段列宽度
    const totalColumnWidth = 120;     // 合计列宽度
    
    return categoryColumnWidth + 
           (data.dateColumns.length * 3 * timeSlotColumnWidth) + 
           totalColumnWidth;
  }, [data.dateColumns.length]);

  if (loading) {
    return (
      <div className={`glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70"></div>
          <span className="ml-3 text-white/80 drop-shadow-md">加载消耗数据中...</span>
        </div>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className={`glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-8 ${className}`}>
        <div className="text-center text-white/70 drop-shadow-md">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-lg mb-2">暂无消耗数据</p>
          <p className="text-sm">请选择不同的日期范围或检查筛选条件</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-surface backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden ${className}`}>
      {/* 固定表头 - 在ScrollArea外部 */}
      <div className="flex-shrink-0 relative z-30">
        <table 
          className="w-full border-collapse"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <ConsumptionTableHeader
            dateColumns={data.dateColumns}
            displayMode={data.config.displayMode}
          />
        </table>
      </div>

      {/* 滚动表体 */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] flex-1">
        <table 
          className="w-full border-collapse"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          {/* 隐藏的表头（用于对齐列宽） */}
          <thead className="invisible">
            <ConsumptionTableHeader
              dateColumns={data.dateColumns}
              displayMode={data.config.displayMode}
            />
          </thead>

          {/* 表体 */}
          <tbody>
            {data.categories.map(category => 
              renderCategoryWithChildren(category)
            )}
            
            {/* 合计行 */}
            {renderTotalRow()}
          </tbody>
        </table>
      </div>

      {/* 表格信息 */}
      <div className="px-4 py-3 border-t border-white/20 bg-white/5">
        <div className="flex justify-between items-center text-sm text-white/70">
          <span>
            共 {data.categories.length} 个分类，
            {data.categories.reduce((sum, cat) => sum + cat.products.length, 0)} 个产品
          </span>
          <span>
            数据更新时间: {data.lastUpdated.toLocaleString('zh-CN')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ConsumptionTable;
