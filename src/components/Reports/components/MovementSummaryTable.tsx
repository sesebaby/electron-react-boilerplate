import React, { useMemo } from 'react';
import { 
  InventoryMovementSummaryData,
  MovementSummaryConfig,
  ColumnDisplayConfig,
  MovementDimension
} from '../../../types/inventoryMovement';
import { Card, CardContent } from '../../ui/card';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty as _TableEmpty,
  TableLoading
} from '../../ui/table';

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
  const _formatNumber = (value: number, decimals: number = 2): string => {
    if (value === 0) return '0';
    return value.toLocaleString('zh-CN', { 
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals 
    });
  };

  /**
   * 格式化金额显示
   */
  const _formatAmount = (value: number): string => {
    if (value === 0) return '¥0.00';
    return `¥${formatNumber(value, 2)}`;
  };

  /**
   * 计算表格最小宽度
   */
  const _tableMinWidth = useMemo(() => {
    const _width = 400; // 固定列基础宽度
    
    // 每个主列组（期初、入库、出库、期末）
    const _mainColumns = ['openingStock', 'inboundTotal', 'outboundTotal', 'closingStock'];
    
    mainColumns.forEach(column => {
      const _columnConfig = columnDisplay[column as keyof ColumnDisplayConfig];
      const _columnWidth = 0;
      
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
  const _renderTableHeader = () => {
    return (
      <TableHeader sticky>
        {/* 第一层表头 */}
        <TableRow>
          {/* 固定列区域 */}
          <TableHead
            fixed 
            fixedPosition="left" 
            fixedOffset={0}
            className="min-w-[60px] text-center border-r border-white/20 table-header-fixed"
            rowSpan={2}
          >
            序号
          </TableHead>
          <TableHead
            fixed 
            fixedPosition="left" 
            fixedOffset="60px"
            className="min-w-[200px] text-left border-r border-white/20 table-header-fixed"
            rowSpan={2}
          >
            物品名称
          </TableHead>
          <TableHead
            fixed 
            fixedPosition="left" 
            fixedOffset="260px"
            className="min-w-[100px] text-center border-r border-white/20 table-header-fixed"
            rowSpan={2}
          >
            一级分类
          </TableHead>
          <TableHead
            fixed 
            fixedPosition="left" 
            fixedOffset="360px"
            className="min-w-[100px] text-center border-r-2 border-white/30 table-header-fixed"
            rowSpan={2}
          >
            二级分类
          </TableHead>

          {/* 数据列区域 */}
          <TableHead className="text-center border-r border-white/20" colSpan={getColumnSpan('openingStock')}>
            期初库存
          </TableHead>
          <TableHead className="text-center border-r border-white/20" colSpan={getColumnSpan('inboundTotal')}>
            入库合计
          </TableHead>
          <TableHead className="text-center border-r border-white/20" colSpan={getColumnSpan('outboundTotal')}>
            出库合计
          </TableHead>
          <TableHead className="text-center" colSpan={getColumnSpan('closingStock')}>
            期末库存
          </TableHead>
        </TableRow>

        {/* 第二层表头 */}
        <TableRow>
          {/* 期初库存子列 */}
          {renderSubHeaders('openingStock')}
          {/* 入库合计子列 */}
          {renderSubHeaders('inboundTotal')}
          {/* 出库合计子列 */}
          {renderSubHeaders('outboundTotal')}
          {/* 期末库存子列 */}
          {renderSubHeaders('closingStock')}
        </TableRow>
      </TableHeader>
    );
  };

  /**
   * 获取主列的跨列数
   */
  const _getColumnSpan = (columnKey: keyof ColumnDisplayConfig): number => {
    const _columnConfig = columnDisplay[columnKey];
    const _span = 0;
    
    if (columnConfig.quantity) span++;
    if (columnConfig.convertedQuantity && config.showConvertedQuantity) span++;
    if (columnConfig.amount) span++;
    
    return Math.max(span, 1);
  };

  /**
   * 渲染子表头
   */
  const _renderSubHeaders = (columnKey: keyof ColumnDisplayConfig) => {
    const _columnConfig = columnDisplay[columnKey];
    const _headers = [];

    if (columnConfig.quantity) {
      headers.push(
        <TableHead key={`${columnKey}-quantity`} className="min-w-[80px] text-center border-r border-white/10">
          数量
        </TableHead>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      headers.push(
        <TableHead key={`${columnKey}-converted`} className="min-w-[80px] text-center border-r border-white/10">
          换算数量
        </TableHead>
      );
    }

    if (columnConfig.amount) {
      headers.push(
        <TableHead key={`${columnKey}-amount`} className="min-w-[100px] text-center border-r border-white/10">
          金额
        </TableHead>
      );
    }

    return headers;
  };

  /**
   * 渲染数据行
   */
  const _renderDataRow = (row: InventoryMovementSummaryData, index: number) => {
    return (
      <TableRow
        key={row.id}
        className="cursor-pointer"
        onClick={() => onRowClick?.(row)}
      >
        {/* 固定列 */}
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset={0}
          className="min-w-[60px] text-center border-r border-white/10"
        >
          {row.sequence}
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="60px"
          className="min-w-[200px] border-r border-white/10"
        >
          <div>
            <div className="font-medium text-white/90">{row.productName}</div>
            <div className="text-xs text-white/60">{row.productSku}</div>
          </div>
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="260px"
          className="min-w-[100px] text-center border-r border-white/10"
        >
          <span className="text-sm text-white/80">{row.primaryCategory}</span>
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="360px"
          className="min-w-[100px] text-center border-r-2 border-white/20"
        >
          <span className="text-sm text-white/80">{row.secondaryCategory}</span>
        </TableCell>

        {/* 数据列 */}
        {renderDataCells(row, 'openingStock')}
        {renderDataCells(row, 'inboundTotal')}
        {renderDataCells(row, 'outboundTotal')}
        {renderDataCells(row, 'closingStock')}
      </TableRow>
    );
  };

  /**
   * 渲染数据单元格
   */
  const _renderDataCells = (row: InventoryMovementSummaryData, columnKey: keyof ColumnDisplayConfig) => {
    const _columnConfig = columnDisplay[columnKey];
    const _stockData = row[columnKey];
    const _cells = [];

    if (columnConfig.quantity) {
      cells.push(
        <TableCell key={`${columnKey}-quantity`} className="text-right border-r border-white/5">
          <span className="text-white/90">{formatNumber(stockData.quantity, 0)}</span>
          {row.unit && <span className="text-xs text-white/60 ml-1">{row.unit}</span>}
        </TableCell>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      cells.push(
        <TableCell key={`${columnKey}-converted`} className="text-right border-r border-white/5">
          <span className="text-white/90">{formatNumber(stockData.convertedQuantity, 2)}</span>
          {row.convertedUnit && <span className="text-xs text-white/60 ml-1">{row.convertedUnit}</span>}
        </TableCell>
      );
    }

    if (columnConfig.amount) {
      const _amountClass = getAmountColorClass(stockData.amount, columnKey);
      cells.push(
        <TableCell key={`${columnKey}-amount`} className="text-right border-r border-white/5">
          <span className={amountClass}>{formatAmount(stockData.amount)}</span>
        </TableCell>
      );
    }

    return cells;
  };

  /**
   * 获取金额颜色样式类
   */
  const _getAmountColorClass = (amount: number, columnKey: keyof ColumnDisplayConfig): string => {
    if (amount === 0) return 'financial-value-neutral';

    switch (columnKey) {
      case 'inboundTotal':
        return 'financial-value-positive';
      case 'outboundTotal':
        return 'financial-value-negative';
      case 'openingStock':
      case 'closingStock':
        return 'inventory-value-total';
      default:
        return 'financial-value-neutral';
    }
  };

  /**
   * 渲染合计行
   */
  const _renderTotalRow = () => {
    const _totals = data.reduce((acc, row) => {
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
      <TableRow className="font-semibold table-total-background">
        {/* 固定列 */}
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset={0}
          className="min-w-[60px] text-center border-r border-white/20 font-bold"
        >
          合计
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="60px"
          className="min-w-[200px] border-r border-white/20"
        >
          <span className="font-bold text-white/90">总计 ({data.length} 项)</span>
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="260px"
          className="min-w-[100px] border-r border-white/20"
        >
        </TableCell>
        <TableCell 
          fixed 
          fixedPosition="left" 
          fixedOffset="360px"
          className="min-w-[100px] border-r-2 border-white/30"
        >
        </TableCell>

        {/* 合计数据 */}
        {renderTotalCells(totals, 'openingStock')}
        {renderTotalCells(totals, 'inboundTotal')}
        {renderTotalCells(totals, 'outboundTotal')}
        {renderTotalCells(totals, 'closingStock')}
      </TableRow>
    );
  };

  /**
   * 渲染合计单元格
   */
  const _renderTotalCells = (totals: any, columnKey: keyof ColumnDisplayConfig) => {
    const _columnConfig = columnDisplay[columnKey];
    const _stockData = totals[columnKey];
    const _cells = [];

    if (columnConfig.quantity) {
      cells.push(
        <TableCell key={`total-${columnKey}-quantity`} className="text-right border-r border-white/10 font-bold">
          <span className="text-white/90">{formatNumber(stockData.quantity, 0)}</span>
        </TableCell>
      );
    }

    if (columnConfig.convertedQuantity && config.showConvertedQuantity) {
      cells.push(
        <TableCell key={`total-${columnKey}-converted`} className="text-right border-r border-white/10 font-bold">
          <span className="text-white/90">{formatNumber(stockData.convertedQuantity, 2)}</span>
        </TableCell>
      );
    }

    if (columnConfig.amount) {
      const _amountClass = getAmountColorClass(stockData.amount, columnKey);
      cells.push(
        <TableCell key={`total-${columnKey}-amount`} className="text-right border-r border-white/10 font-bold">
          <span className={amountClass}>{formatAmount(stockData.amount)}</span>
        </TableCell>
      );
    }

    return cells;
  };

  if (loading) {
    return (
      <Card className={`glass-card h-full ${className}`}>
        <CardContent className="p-0 h-full">
          <TableLoading message="加载汇总表格数据中..." />
        </CardContent>
      </Card>
    );
  }

  // 空状态检查
  if (data.length === 0) {
    return (
      <Card className={`glass-card h-full ${className}`}>
        <CardContent className="p-0 h-full">
          <TableEmpty
            icon={<div className="text-6xl">📊</div>}
            message="暂无汇总数据"
            description="请调整筛选条件或时间范围"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card h-full max-h-full flex flex-col overflow-hidden ${className}`}>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0 max-h-full">
        {/* 表格标题 */}
        <div className="flex-shrink-0 p-4 border-b border-white/20 table-header-section">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
              出入库汇总明细表
            </h3>
            <span className="text-sm" style={{color: 'var(--text-secondary)'}}>
              共 {data.length} 条记录
            </span>
          </div>
        </div>

        {/* 单一表格结构 - 使用 TableContainer */}
        <TableContainer height="600px" className="flex-1">
          <Table stickyHeader minWidth={`${tableMinWidth}px`}>
            {renderTableHeader()}
            
            <TableBody>
              {data.map((row, index) => renderDataRow(row, index))}
              {renderTotalRow()}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
