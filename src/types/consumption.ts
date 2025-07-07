/**
 * 逐日消耗视图相关类型定义
 */

// =============== 基础数据类型 ===============

/**
 * 时间段枚举
 */
export enum TimeSlot {
  MORNING = 'morning',     // 早 (06:00-12:00)
  AFTERNOON = 'afternoon', // 中 (12:00-18:00)
  EVENING = 'evening'      // 晚 (18:00-06:00)
}

/**
 * 显示模式枚举
 */
export enum DisplayMode {
  QUANTITY = 'quantity',           // 数量统计
  CONVERTED = 'converted',         // 换算数量
  AMOUNT = 'amount'                // 金额统计
}

/**
 * 时间段配置
 */
export interface TimeSlotConfig {
  morning: { start: string; end: string };    // "06:00" - "12:00"
  afternoon: { start: string; end: string };  // "12:00" - "18:00"
  evening: { start: string; end: string };    // "18:00" - "06:00"
}

/**
 * 时间段消耗数据
 */
export interface ConsumptionSlotData {
  quantity: number;           // 基础数量
  convertedQuantity?: number; // 换算数量（如果有单位转换）
  amount: number;             // 金额
  transactionCount: number;   // 交易次数
  avgUnitPrice?: number;      // 平均单价
}

/**
 * 时间段数据（包含三个时间段）
 */
export interface TimeSlotData {
  morning: ConsumptionSlotData;
  afternoon: ConsumptionSlotData;
  evening: ConsumptionSlotData;
  dailyTotal: ConsumptionSlotData;
}

// =============== 配置和筛选 ===============

/**
 * 逐日消耗视图配置
 */
export interface DailyConsumptionViewConfig {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  displayMode: DisplayMode;
  categoryFilter?: string[];     // 分类筛选
  productFilter?: string[];      // 产品筛选
  warehouseFilter?: string[];    // 仓库筛选
  timeSlotConfig: TimeSlotConfig;
  showSubCategories: boolean;    // 是否显示子分类
  groupByCategory: boolean;      // 是否按分类分组
}

/**
 * 筛选条件
 */
export interface ConsumptionFilter {
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  categoryIds?: string[];
  productIds?: string[];
  warehouseIds?: string[];
  transactionTypes?: string[];   // 交易类型筛选
}

// =============== 数据结构 ===============

/**
 * 逐日消耗数据项
 */
export interface DailyConsumptionItem {
  date: string;                  // YYYY-MM-DD
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string;
  categoryName: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  warehouseId: string;
  warehouseName: string;
  timeSlots: TimeSlotData;
  hasUnitConversion: boolean;    // 是否有单位转换
  baseUnit: string;              // 基础单位
  convertedUnit?: string;        // 转换单位
  conversionRate?: number;       // 转换比率
}

/**
 * 分类行数据
 */
export interface CategoryRowData {
  categoryId: string;
  categoryName: string;
  level: number;                 // 分类层级
  parentId?: string;
  isExpanded: boolean;           // 是否展开
  hasChildren: boolean;          // 是否有子分类
  children?: CategoryRowData[];
  products: ProductRowData[];    // 该分类下的产品
  data: Map<string, TimeSlotData>; // key: date, value: 时间段数据
  rowTotal: ConsumptionSlotData; // 行总计
  sortOrder: number;             // 排序
}

/**
 * 产品行数据
 */
export interface ProductRowData {
  productId: string;
  productName: string;
  productSku: string;
  categoryId: string;
  data: Map<string, TimeSlotData>; // key: date, value: 时间段数据
  rowTotal: ConsumptionSlotData;   // 行总计
  hasUnitConversion: boolean;
  baseUnit: string;
  convertedUnit?: string;
  conversionRate?: number;
}

/**
 * 表格数据结构
 */
export interface ConsumptionTableData {
  categories: CategoryRowData[];
  dateColumns: string[];         // 日期列表 (YYYY-MM-DD)
  config: DailyConsumptionViewConfig;
  totals: ConsumptionTotals;
  lastUpdated: Date;
}

/**
 * 汇总数据
 */
export interface ConsumptionTotals {
  categoryTotals: Map<string, ConsumptionSlotData>; // 每个分类的总计
  dateTotals: Map<string, ConsumptionSlotData>;     // 每个日期的总计
  timeSlotTotals: {                                 // 每个时间段的总计
    morning: ConsumptionSlotData;
    afternoon: ConsumptionSlotData;
    evening: ConsumptionSlotData;
  };
  grandTotal: ConsumptionSlotData;                  // 总计
}

// =============== 组件Props ===============

/**
 * 主视图组件Props
 */
export interface DailyConsumptionViewProps {
  className?: string;
  initialConfig?: Partial<DailyConsumptionViewConfig>;
  onConfigChange?: (config: DailyConsumptionViewConfig) => void;
  onDataExport?: (data: ConsumptionTableData) => void;
}

/**
 * 表格组件Props
 */
export interface ConsumptionTableProps {
  data: ConsumptionTableData;
  loading?: boolean;
  onCategoryToggle?: (categoryId: string) => void;
  onCellClick?: (categoryId: string, date: string, timeSlot: TimeSlot) => void;
  className?: string;
}

/**
 * 表头组件Props
 */
export interface ConsumptionTableHeaderProps {
  dateColumns: string[];
  displayMode: DisplayMode;
  className?: string;
}

/**
 * 表格行组件Props
 */
export interface ConsumptionTableRowProps {
  rowData: CategoryRowData | ProductRowData;
  dateColumns: string[];
  displayMode: DisplayMode;
  level: number;
  onToggle?: (id: string) => void;
  onCellClick?: (id: string, date: string, timeSlot: TimeSlot) => void;
  className?: string;
}

/**
 * 控制面板组件Props
 */
export interface ConsumptionControlsProps {
  config: DailyConsumptionViewConfig;
  onChange: (config: DailyConsumptionViewConfig) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * 汇总信息组件Props
 */
export interface ConsumptionSummaryProps {
  totals: ConsumptionTotals;
  displayMode: DisplayMode;
  dateRange: { startDate: Date; endDate: Date };
  className?: string;
}

// =============== 服务接口 ===============

/**
 * 消耗数据查询参数
 */
export interface ConsumptionQueryParams {
  filter: ConsumptionFilter;
  config: DailyConsumptionViewConfig;
  pagination?: {
    page: number;
    pageSize: number;
  };
}

/**
 * 消耗数据查询结果
 */
export interface ConsumptionQueryResult {
  data: ConsumptionTableData;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  performance: {
    queryTime: number;
    recordCount: number;
  };
}

// =============== 工具类型 ===============

/**
 * 时间段判断结果
 */
export interface TimeSlotResult {
  timeSlot: TimeSlot;
  hour: number;
  isValidTime: boolean;
}

/**
 * 单位转换结果
 */
export interface UnitConversionResult {
  originalQuantity: number;
  convertedQuantity: number;
  baseUnit: string;
  convertedUnit: string;
  conversionRate: number;
  hasConversion: boolean;
}

/**
 * 数据验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =============== 事件类型 ===============

/**
 * 表格事件数据
 */
export interface TableEventData {
  categoryId?: string;
  productId?: string;
  date: string;
  timeSlot: TimeSlot;
  data: ConsumptionSlotData;
}

/**
 * 配置变更事件数据
 */
export interface ConfigChangeEventData {
  field: keyof DailyConsumptionViewConfig;
  oldValue: any;
  newValue: any;
  config: DailyConsumptionViewConfig;
}

// =============== 导出类型 ===============

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  EXCEL = 'excel',
  CSV = 'csv',
  PDF = 'pdf'
}

/**
 * 导出配置
 */
export interface ExportConfig {
  format: ExportFormat;
  fileName?: string;
  includeCharts: boolean;
  includeSummary: boolean;
  dateRange?: { startDate: Date; endDate: Date };
}
