/**
 * 出入库汇总相关类型定义
 */

// =============== 基础枚举 ===============

/**
 * 统计维度枚举
 */
export enum MovementDimension {
  QUANTITY = 'quantity',           // 数量统计
  CONVERTED = 'converted',         // 换算数量
  AMOUNT = 'amount'                // 金额统计
}

/**
 * 快捷时间选择枚举
 */
export enum QuickTimeRange {
  LAST_LAST_MONTH = 'lastLastMonth',  // 上上月
  LAST_MONTH = 'lastMonth',           // 上月
  CURRENT_MONTH = 'currentMonth'      // 当月
}

// =============== 数据结构 ===============

/**
 * 库存数量信息
 */
export interface StockQuantityInfo {
  quantity: number;           // 基础数量
  convertedQuantity: number;  // 换算数量
  amount: number;             // 金额
}

/**
 * 出入库汇总数据行
 */
export interface InventoryMovementSummaryData {
  // 基础信息
  id: string;                    // 唯一标识
  sequence: number;              // 序号
  productId: string;             // 产品ID
  productName: string;           // 物品名称
  productSku: string;            // 产品编码
  primaryCategory: string;       // 一级分类
  secondaryCategory: string;     // 二级分类
  unit: string;                  // 基础单位
  convertedUnit?: string;        // 换算单位
  conversionRate?: number;       // 换算比率

  // 期初库存
  openingStock: StockQuantityInfo;

  // 入库合计
  inboundTotal: StockQuantityInfo;

  // 出库合计
  outboundTotal: StockQuantityInfo;

  // 期末库存
  closingStock: StockQuantityInfo;

  // 关联信息
  warehouseId?: string;          // 仓库ID（如果按仓库分组）
  warehouseName?: string;        // 仓库名称
}

/**
 * 时间范围筛选
 */
export interface TimeRangeFilter {
  startDate: Date;               // 开始日期
  endDate: Date;                 // 结束日期
}

/**
 * 出入库汇总筛选条件
 */
export interface MovementSummaryFilters {
  timeRange: TimeRangeFilter;    // 时间范围
  productId?: string;            // 产品筛选
  categoryId?: string;           // 分类筛选
  warehouseId?: string;          // 仓库筛选
  searchKeyword?: string;        // 搜索关键词
  showZeroMovement?: boolean;    // 是否显示无变动的商品
}

/**
 * 出入库汇总配置
 */
export interface MovementSummaryConfig {
  displayDimension: MovementDimension;  // 当前显示维度
  groupByWarehouse: boolean;            // 是否按仓库分组
  showConvertedQuantity: boolean;       // 是否显示换算数量
  enableColumnToggle: boolean;          // 是否启用列显示控制
  autoRefreshInterval?: number;         // 自动刷新间隔（秒）
}

/**
 * 列显示配置
 */
export interface ColumnDisplayConfig {
  openingStock: {
    quantity: boolean;
    convertedQuantity: boolean;
    amount: boolean;
  };
  inboundTotal: {
    quantity: boolean;
    convertedQuantity: boolean;
    amount: boolean;
  };
  outboundTotal: {
    quantity: boolean;
    convertedQuantity: boolean;
    amount: boolean;
  };
  closingStock: {
    quantity: boolean;
    convertedQuantity: boolean;
    amount: boolean;
  };
}

/**
 * 汇总统计信息
 */
export interface MovementSummaryStats {
  totalProducts: number;         // 商品总数
  totalOpeningValue: number;     // 期初库存总值
  totalInboundValue: number;     // 入库总值
  totalOutboundValue: number;    // 出库总值
  totalClosingValue: number;     // 期末库存总值
  netMovementValue: number;      // 净变动值
  turnoverRate: number;          // 周转率
}

/**
 * 库存事务汇总
 */
export interface TransactionSummary {
  productId: string;
  warehouseId: string;
  totalQuantity: number;
  totalAmount: number;
  avgUnitPrice: number;
  transactionCount: number;
}

/**
 * FIFO批次信息
 */
export interface FifoBatchInfo {
  batchId: string;
  quantity: number;
  unitCost: number;
  inboundDate: Date;
  remainingQuantity: number;
}

/**
 * 期初库存计算结果
 */
export interface OpeningStockResult {
  productId: string;
  warehouseId: string;
  quantity: number;
  avgCost: number;
  totalValue: number;
  fifoBatches: FifoBatchInfo[];
}

/**
 * 出入库计算结果
 */
export interface MovementCalculationResult {
  openingStock: Map<string, OpeningStockResult>;  // key: productId-warehouseId
  inboundSummary: Map<string, TransactionSummary>;
  outboundSummary: Map<string, TransactionSummary>;
  closingStock: Map<string, OpeningStockResult>;
}

// =============== 组件Props ===============

/**
 * 出入库汇总组件Props
 */
export interface InventoryMovementSummaryProps {
  className?: string;
  defaultFilters?: Partial<MovementSummaryFilters>;
  defaultConfig?: Partial<MovementSummaryConfig>;
  onDataChange?: (data: InventoryMovementSummaryData[]) => void;
  onError?: (error: string) => void;
}

/**
 * 时间控制组件Props
 */
export interface TimeControlProps {
  timeRange: TimeRangeFilter;
  onChange: (timeRange: TimeRangeFilter) => void;
  loading?: boolean;
  className?: string;
}

/**
 * 汇总表格组件Props
 */
export interface MovementSummaryTableProps {
  data: InventoryMovementSummaryData[];
  config: MovementSummaryConfig;
  columnDisplay: ColumnDisplayConfig;
  loading?: boolean;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (row: InventoryMovementSummaryData) => void;
  className?: string;
}

// =============== 工具类型 ===============

/**
 * 排序配置
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 分页配置
 */
export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHeaders: boolean;
  includeStats: boolean;
  filename?: string;
}
