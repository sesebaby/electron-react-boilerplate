import React, { useMemo } from 'react';
import { 
  InventoryMovementSummaryData,
  MovementSummaryConfig,
  ColumnDisplayConfig,
  MovementDimension
} from '../../../types/inventoryMovement';
import { GlassCard } from '../../ui/FormControls';

interface MovementSummaryTableProps {
  data: InventoryMovementSummaryData[];
  config: MovementSummaryConfig;
  columnDisplay: ColumnDisplayConfig;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: InventoryMovementSummaryData) => void;
  className?: string;
}

export const MovementSummaryTable: React.FC<MovementSummaryTableProps> = ({
  data,
  config,
  columnDisplay,
  loading = false,
  onSort,
  onRowClick,
  className = ''
}) => {

  /**
   * 格式化数值显示
   */
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (value === 0) return '0';
    return value.toLocaleString('zh-CN', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  };

  /**
   * 格式化金额显示
   */
  const formatAmount = (value: number): string => {
    if (value === 0) return '¥0.00';
    return `¥${formatNumber(value, 2)}`;
  };

  /**
   * 计算表格最小宽度
   */
  const tableMinWidth = useMemo(() => {
    let width = 400; // 固定列基础宽度
    
    // 每个主列组（期初、入库、出库、期末）
    const mainColumns = ['openingStock', 'inboundTotal', 'outboundTotal', 'closingStock'];
    
    mainColumns.forEach(column => {
      const columnConfig = columnDisplay[column as keyof ColumnDisplayConfig];
      let columnWidth = 0;
      
      if (columnConfig.quantity) columnWidth += 100;
      if (columnConfig.convertedQuantity && config.showConvertedQuantity) columnWidth += 100;
      if (columnConfig.amount) columnWidth += 120;
      
      width += Math.max(columnWidth, 120); // 每个主列最小120px
    });
    
    return width;
  }, [columnDisplay, config.showConvertedQuantity]);

  /**
   * 渲染表头
   */
  const renderTableHeader = () => {
    return (
      <thead className="sticky top-0 z-10">
        {/* 第一层表头 */}
        <tr>
          {/* 固定列区域 */}
          <th
            className="sticky left-0 z-20 px-3 py-3 text-center border-r border-white/20 table-header-fixed-column"
            style={{ minWidth: '60px' }}
            rowSpan={2}
          >
            序号
          </th>
          <th
            className="sticky left-[60px] z-20 px-4 py-3 text-left border-r border-white/20 table-header-fixed-column"
            style={{ minWidth: '200px' }}
            rowSpan={2}
          >
            物品名称
          </th>
          <th
            className="sticky left-[260px] z-20 px-3 py-3 text-center border-r border-white/20 table-header-fixed-column"
            style={{ minWidth: '100px' }}
            rowSpan={2}
          >
            一级分类
          </th>
          <th
            className="sticky left-[360px] z-20 px-3 py-3 text-center border-r-2 border-white/30 table-header-fixed-column"
            style={{ minWidth: '100px' }}
            rowSpan={2}
          >
            二级分类
          </th>

          {/* 数据列区域 */}
          <th className="px-4 py-3 text-center border-r border-white/20 table-header-fixed" colSpan={getColumnSpan('openingStock')}>
            期初库存
          </th>
          <th className="px-4 py-3 text-center border-r border-white/20 table-header-fixed" colSpan={getColumnSpan('inboundTotal')}>
            入库合计
          </th>
          <th className="px-4 py-3 text-center border-r border-white/20 table-header-fixed" colSpan={getColumnSpan('outboundTotal')}>
            出库合计
          </th>
          <th className="px-4 py-3 text-center table-header-fixed" colSpan={getColumnSpan('closingStock')}>
            期末库存
          </th>
        </tr>

        {/* 第二层表头 */}
        <tr>
          {/* 期初库存子列 */}
          {renderSubHeaders('openingStock')}
          {/* 入库合计子列 */}
          {renderSubHeaders('inboundTotal')}
          {/* 出库合计子列 */}
          {renderSubHeaders('outboundTotal')}
          {/* 期末库存子列 */}
          {renderSubHeaders('closingStock')}
        </tr>
      </thead>
    );
  };

  /**
   * 获取主列的跨列数
   */
  const getColumnSpan = (columnKey: keyof ColumnDisplayConfig): number => {
    const columnConfig = columnDisplay[columnKey];
    let span = 0;
    
    if (columnConfig.quantity) span++;
    if (columnConfig.convertedQuantity && config.showConvertedQuantity) span++;
    if (columnConfig.amount) span++;
    
    return Math.max(span, 1);
  };

  /**
   * 渲染子表头
   */
  const renderSubHeaders = (columnKey: keyof ColumnDisplayConfig) => {
    const columnConfig = columnDisplay[columnKey];
    const headers = [];

    if (columnConfig.quantity) {
      headers.push(
        <th key={`${columnKey}-quantity`} className="px-3 py-2 text-center border-r border-white/10 table-header-fixed" style={{ minWidth: '80px' }}>
          数量
        </th>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      headers.push(
        <th key={`${columnKey}-converted`} className="px-3 py-2 text-center border-r border-white/10 table-header-fixed" style={{ minWidth: '80px' }}>
          换算数量
        </th>
      );
    }

    if (columnConfig.amount) {
      headers.push(
        <th key={`${columnKey}-amount`} className="px-3 py-2 text-center border-r border-white/10 table-header-fixed" style={{ minWidth: '100px' }}>
          金额
        </th>
      );
    }

    return headers;
  };

  /**
   * 渲染数据行
   */
  const renderDataRow = (row: InventoryMovementSummaryData, index: number) => {
    return (
      <tr
        key={row.id}
        className="border-b border-white/5 movement-table-row transition-colors cursor-pointer"
        onClick={() => onRowClick?.(row)}
      >
        {/* 固定列 */}
        <td className="sticky left-0 z-10 px-3 py-3 text-center border-r border-white/10 table-fixed-column-clear">
          {row.sequence}
        </td>
        <td className="sticky left-[60px] z-10 px-4 py-3 border-r border-white/10 table-fixed-column-clear">
          <div>
            <div className="font-medium text-white/90">{row.productName}</div>
            <div className="text-xs text-white/60">{row.productSku}</div>
          </div>
        </td>
        <td className="sticky left-[260px] z-10 px-3 py-3 text-center border-r border-white/10 table-fixed-column-clear">
          <span className="text-sm text-white/80">{row.primaryCategory}</span>
        </td>
        <td className="sticky left-[360px] z-10 px-3 py-3 text-center border-r-2 border-white/20 table-fixed-column-clear">
          <span className="text-sm text-white/80">{row.secondaryCategory}</span>
        </td>

        {/* 数据列 */}
        {renderDataCells(row, 'openingStock')}
        {renderDataCells(row, 'inboundTotal')}
        {renderDataCells(row, 'outboundTotal')}
        {renderDataCells(row, 'closingStock')}
      </tr>
    );
  };

  /**
   * 渲染数据单元格
   */
  const renderDataCells = (row: InventoryMovementSummaryData, columnKey: keyof ColumnDisplayConfig) => {
    const columnConfig = columnDisplay[columnKey];
    const stockData = row[columnKey];
    const cells = [];

    if (columnConfig.quantity) {
      cells.push(
        <td key={`${columnKey}-quantity`} className="px-3 py-3 text-right border-r border-white/5 movement-table-cell">
          <span className="text-white/90">{formatNumber(stockData.quantity, 0)}</span>
          {row.unit && <span className="text-xs text-white/60 ml-1">{row.unit}</span>}
        </td>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      cells.push(
        <td key={`${columnKey}-converted`} className="px-3 py-3 text-right border-r border-white/5 movement-table-cell">
          <span className="text-white/90">{formatNumber(stockData.convertedQuantity, 2)}</span>
          {row.convertedUnit && <span className="text-xs text-white/60 ml-1">{row.convertedUnit}</span>}
        </td>
      );
    }

    if (columnConfig.amount) {
      const amountClass = getAmountColorClass(stockData.amount, columnKey);
      cells.push(
        <td key={`${columnKey}-amount`} className="px-3 py-3 text-right border-r border-white/5 movement-table-cell">
          <span className={amountClass}>{formatAmount(stockData.amount)}</span>
        </td>
      );
    }

    return cells;
  };

  /**
   * 获取金额颜色样式类
   */
  const getAmountColorClass = (amount: number, columnKey: keyof ColumnDisplayConfig): string => {
    if (amount === 0) return 'text-white/60';
    
    switch (columnKey) {
      case 'inboundTotal':
        return 'financial-value-positive';
      case 'outboundTotal':
        return 'financial-value-negative';
      case 'openingStock':
      case 'closingStock':
        return 'inventory-value-total';
      default:
        return 'text-white/90';
    }
  };

  /**
   * 渲染合计行
   */
  const renderTotalRow = () => {
    const totals = data.reduce((acc, row) => {
      acc.openingStock.quantity += row.openingStock.quantity;
      acc.openingStock.convertedQuantity += row.openingStock.convertedQuantity;
      acc.openingStock.amount += row.openingStock.amount;
      
      acc.inboundTotal.quantity += row.inboundTotal.quantity;
      acc.inboundTotal.convertedQuantity += row.inboundTotal.convertedQuantity;
      acc.inboundTotal.amount += row.inboundTotal.amount;
      
      acc.outboundTotal.quantity += row.outboundTotal.quantity;
      acc.outboundTotal.convertedQuantity += row.outboundTotal.convertedQuantity;
      acc.outboundTotal.amount += row.outboundTotal.amount;
      
      acc.closingStock.quantity += row.closingStock.quantity;
      acc.closingStock.convertedQuantity += row.closingStock.convertedQuantity;
      acc.closingStock.amount += row.closingStock.amount;
      
      return acc;
    }, {
      openingStock: { quantity: 0, convertedQuantity: 0, amount: 0 },
      inboundTotal: { quantity: 0, convertedQuantity: 0, amount: 0 },
      outboundTotal: { quantity: 0, convertedQuantity: 0, amount: 0 },
      closingStock: { quantity: 0, convertedQuantity: 0, amount: 0 }
    });

    return (
      <tr className="movement-table-total font-semibold">
        {/* 固定列 */}
        <td className="sticky left-0 z-10 px-3 py-3 text-center border-r border-white/20 table-fixed-column-clear">
          合计
        </td>
        <td className="sticky left-[60px] z-10 px-4 py-3 border-r border-white/20 table-fixed-column-clear">
          <span className="font-bold financial-title">总计 ({data.length} 项)</span>
        </td>
        <td className="sticky left-[260px] z-10 px-3 py-3 border-r border-white/20 table-fixed-column-clear"></td>
        <td className="sticky left-[360px] z-10 px-3 py-3 border-r-2 border-white/30 table-fixed-column-clear"></td>

        {/* 合计数据 */}
        {renderTotalCells(totals, 'openingStock')}
        {renderTotalCells(totals, 'inboundTotal')}
        {renderTotalCells(totals, 'outboundTotal')}
        {renderTotalCells(totals, 'closingStock')}
      </tr>
    );
  };

  /**
   * 渲染合计单元格
   */
  const renderTotalCells = (totals: any, columnKey: keyof ColumnDisplayConfig) => {
    const columnConfig = columnDisplay[columnKey];
    const stockData = totals[columnKey];
    const cells = [];

    if (columnConfig.quantity) {
      cells.push(
        <td key={`total-${columnKey}-quantity`} className="px-3 py-3 text-right border-r border-white/10 font-bold movement-table-cell">
          <span className="financial-text">{formatNumber(stockData.quantity, 0)}</span>
        </td>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      cells.push(
        <td key={`total-${columnKey}-converted`} className="px-3 py-3 text-right border-r border-white/10 font-bold movement-table-cell">
          <span className="financial-text">{formatNumber(stockData.convertedQuantity, 2)}</span>
        </td>
      );
    }

    if (columnConfig.amount) {
      const amountClass = getAmountColorClass(stockData.amount, columnKey);
      cells.push(
        <td key={`total-${columnKey}-amount`} className="px-3 py-3 text-right border-r border-white/10 font-bold movement-table-cell">
          <span className={amountClass}>{formatAmount(stockData.amount)}</span>
        </td>
      );
    }

    return cells;
  };

  if (loading) {
    return (
      <GlassCard className={className}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
          <p className="financial-subtitle">加载表格数据中...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={className}>
      <div className="overflow-hidden">
        {/* 表格标题 */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold financial-title">
              出入库汇总明细表
            </h3>
            <span className="text-sm financial-subtitle">
              共 {data.length} 条记录
            </span>
          </div>
        </div>

        {/* 表格容器 */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table 
            className="w-full border-collapse"
            style={{ minWidth: `${tableMinWidth}px` }}
          >
            {renderTableHeader()}
            
            <tbody>
              {data.length > 0 ? (
                <>
                  {data.map((row, index) => renderDataRow(row, index))}
                  {renderTotalRow()}
                </>
              ) : (
                <tr>
                  <td colSpan={20} className="p-8 text-center">
                    <div className="text-white/60">
                      <div className="text-4xl mb-4">📊</div>
                      <p>暂无数据</p>
                      <p className="text-sm mt-2">请调整筛选条件或时间范围</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </GlassCard>
  );
};
