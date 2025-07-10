/**
 * 报表服务接口
 */

import { 
  IBusinessService, 
  ServiceResult
} from './IBusinessService';

/**
 * 报表类型
 */
export enum ReportType {
  /** 库存报表 */
  Inventory = 'inventory',
  /** 销售报表 */
  Sales = 'sales',
  /** 采购报表 */
  Purchase = 'purchase',
  /** 财务报表 */
  Financial = 'financial',
  /** 客户报表 */
  Customer = 'customer',
  /** 供应商报表 */
  Supplier = 'supplier',
  /** 产品报表 */
  Product = 'product',
  /** 自定义报表 */
  Custom = 'custom'
}

/**
 * 报表格式
 */
export enum ReportFormat {
  /** Excel格式 */
  Excel = 'excel',
  /** PDF格式 */
  PDF = 'pdf',
  /** CSV格式 */
  CSV = 'csv',
  /** JSON格式 */
  JSON = 'json',
  /** HTML格式 */
  HTML = 'html'
}

/**
 * 报表参数
 */
export interface ReportParameters {
  /** 开始日期 */
  startDate?: Date;
  /** 结束日期 */
  endDate?: Date;
  /** 仓库ID */
  warehouseId?: string;
  /** 分类ID */
  categoryId?: string;
  /** 产品ID */
  productId?: string;
  /** 客户ID */
  customerId?: string;
  /** 供应商ID */
  supplierId?: string;
  /** 用户ID */
  userId?: string;
  /** 状态过滤 */
  status?: string;
  /** 自定义参数 */
  customParams?: Record<string, any>;
}

/**
 * 报表定义
 */
export interface ReportDefinition {
  /** 报表ID */
  id: string;
  /** 报表名称 */
  name: string;
  /** 报表描述 */
  description?: string;
  /** 报表类型 */
  type: ReportType;
  /** 数据源查询 */
  dataSource: {
    /** 主表 */
    mainTable: string;
    /** 关联表 */
    joinTables?: Array<{
      table: string;
      joinType: 'inner' | 'left' | 'right';
      condition: string;
    }>;
    /** 查询条件 */
    whereConditions?: string[];
    /** 分组字段 */
    groupBy?: string[];
    /** 排序字段 */
    orderBy?: Array<{
      field: string;
      direction: 'asc' | 'desc';
    }>;
  };
  /** 字段定义 */
  fields: Array<{
    /** 字段名 */
    name: string;
    /** 显示标题 */
    title: string;
    /** 数据类型 */
    dataType: 'string' | 'number' | 'date' | 'boolean';
    /** 格式化规则 */
    format?: string;
    /** 是否可见 */
    visible: boolean;
    /** 列宽 */
    width?: number;
    /** 对齐方式 */
    align?: 'left' | 'center' | 'right';
    /** 聚合函数 */
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  }>;
  /** 参数定义 */
  parameters: Array<{
    /** 参数名 */
    name: string;
    /** 显示标题 */
    title: string;
    /** 参数类型 */
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    /** 是否必填 */
    required: boolean;
    /** 默认值 */
    defaultValue?: any;
    /** 选项列表（用于select类型） */
    options?: Array<{
      label: string;
      value: any;
    }>;
  }>;
  /** 创建者 */
  createdBy?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 报表数据
 */
export interface ReportData {
  /** 报表ID */
  reportId: string;
  /** 报表名称 */
  reportName: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 参数 */
  parameters: ReportParameters;
  /** 数据行 */
  rows: Array<Record<string, any>>;
  /** 汇总数据 */
  summary?: Record<string, any>;
  /** 总记录数 */
  totalCount: number;
  /** 执行时间（毫秒） */
  executionTime: number;
}

/**
 * 报表导出结果
 */
export interface ReportExportResult {
  /** 文件路径 */
  filePath: string;
  /** 文件名 */
  fileName: string;
  /** 文件大小（字节） */
  fileSize: number;
  /** 导出格式 */
  format: ReportFormat;
  /** 导出时间 */
  exportedAt: Date;
  /** 下载URL */
  downloadUrl?: string;
}

/**
 * 预定义报表配置
 */
export interface PredefinedReports {
  /** 库存报表 */
  inventory: {
    /** 库存汇总报表 */
    summary: ReportDefinition;
    /** 库存明细报表 */
    detail: ReportDefinition;
    /** 库存变动报表 */
    movement: ReportDefinition;
    /** 低库存报表 */
    lowStock: ReportDefinition;
    /** 库存周转率报表 */
    turnover: ReportDefinition;
  };
  /** 销售报表 */
  sales: {
    /** 销售汇总报表 */
    summary: ReportDefinition;
    /** 销售明细报表 */
    detail: ReportDefinition;
    /** 客户销售排行 */
    customerRanking: ReportDefinition;
    /** 产品销售排行 */
    productRanking: ReportDefinition;
    /** 销售趋势分析 */
    trend: ReportDefinition;
  };
  /** 采购报表 */
  purchase: {
    /** 采购汇总报表 */
    summary: ReportDefinition;
    /** 采购明细报表 */
    detail: ReportDefinition;
    /** 供应商采购排行 */
    supplierRanking: ReportDefinition;
    /** 采购价格分析 */
    priceAnalysis: ReportDefinition;
  };
  /** 财务报表 */
  financial: {
    /** 应收账款报表 */
    accountsReceivable: ReportDefinition;
    /** 应付账款报表 */
    accountsPayable: ReportDefinition;
    /** 现金流报表 */
    cashFlow: ReportDefinition;
    /** 利润分析报表 */
    profitAnalysis: ReportDefinition;
  };
}

/**
 * 报表服务接口
 */
export interface IReportService extends IBusinessService {
  // ==================== 报表定义管理 ====================

  /**
   * 创建报表定义
   */
  createReportDefinition(definition: Omit<ReportDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportDefinition>;

  /**
   * 获取报表定义
   */
  getReportDefinition(id: string): Promise<ReportDefinition | null>;

  /**
   * 获取所有报表定义
   */
  getAllReportDefinitions(): Promise<ReportDefinition[]>;

  /**
   * 根据类型获取报表定义
   */
  getReportDefinitionsByType(type: ReportType): Promise<ReportDefinition[]>;

  /**
   * 更新报表定义
   */
  updateReportDefinition(id: string, definition: Partial<ReportDefinition>): Promise<ReportDefinition>;

  /**
   * 删除报表定义
   */
  deleteReportDefinition(id: string): Promise<void>;

  // ==================== 预定义报表 ====================

  /**
   * 获取预定义报表配置
   */
  getPredefinedReports(): Promise<PredefinedReports>;

  /**
   * 初始化预定义报表
   */
  initializePredefinedReports(): Promise<void>;

  // ==================== 报表生成 ====================

  /**
   * 生成报表数据
   */
  generateReport(reportId: string, parameters?: ReportParameters): Promise<ReportData>;

  /**
   * 生成库存汇总报表
   */
  generateInventorySummaryReport(parameters?: {
    warehouseId?: string;
    categoryId?: string;
    asOfDate?: Date;
  }): Promise<ReportData>;

  /**
   * 生成销售报表
   */
  generateSalesReport(parameters: {
    startDate: Date;
    endDate: Date;
    customerId?: string;
    productId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ReportData>;

  /**
   * 生成采购报表
   */
  generatePurchaseReport(parameters: {
    startDate: Date;
    endDate: Date;
    supplierId?: string;
    productId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ReportData>;

  /**
   * 生成财务报表
   */
  generateFinancialReport(parameters: {
    startDate: Date;
    endDate: Date;
    reportType: 'receivables' | 'payables' | 'cashflow';
  }): Promise<ReportData>;

  /**
   * 生成库存周转率报表
   */
  generateInventoryTurnoverReport(parameters: {
    startDate: Date;
    endDate: Date;
    productId?: string;
    categoryId?: string;
  }): Promise<ReportData>;

  // ==================== 报表导出 ====================

  /**
   * 导出报表
   */
  exportReport(
    reportData: ReportData,
    format: ReportFormat,
    options?: {
      fileName?: string;
      includeCharts?: boolean;
      pageOrientation?: 'portrait' | 'landscape';
      pageSize?: 'A4' | 'A3' | 'Letter';
    }
  ): Promise<ReportExportResult>;

  /**
   * 批量导出报表
   */
  batchExportReports(
    exports: Array<{
      reportId: string;
      parameters?: ReportParameters;
      format: ReportFormat;
      fileName?: string;
    }>
  ): Promise<ReportExportResult[]>;

  // ==================== 报表调度 ====================

  /**
   * 创建定时报表任务
   */
  createScheduledReport(config: {
    reportId: string;
    name: string;
    schedule: string; // Cron表达式
    parameters?: ReportParameters;
    format: ReportFormat;
    recipients: string[];
    enabled: boolean;
  }): Promise<{
    scheduleId: string;
    nextRunTime: Date;
  }>;

  /**
   * 获取定时报表任务
   */
  getScheduledReports(): Promise<Array<{
    scheduleId: string;
    reportId: string;
    name: string;
    schedule: string;
    nextRunTime: Date;
    lastRunTime?: Date;
    enabled: boolean;
  }>>;

  /**
   * 执行定时报表
   */
  executeScheduledReport(scheduleId: string): Promise<ReportExportResult>;

  // ==================== 报表缓存 ====================

  /**
   * 缓存报表数据
   */
  cacheReportData(reportId: string, parameters: ReportParameters, data: ReportData, ttl?: number): Promise<void>;

  /**
   * 获取缓存的报表数据
   */
  getCachedReportData(reportId: string, parameters: ReportParameters): Promise<ReportData | null>;

  /**
   * 清除报表缓存
   */
  clearReportCache(reportId?: string): Promise<void>;

  // ==================== 报表分析 ====================

  /**
   * 获取报表使用统计
   */
  getReportUsageStatistics(): Promise<{
    totalReports: number;
    totalGenerations: number;
    popularReports: Array<{
      reportId: string;
      reportName: string;
      generationCount: number;
      lastGenerated: Date;
    }>;
    usageByType: Record<ReportType, number>;
    usageByFormat: Record<ReportFormat, number>;
  }>;

  /**
   * 获取报表性能指标
   */
  getReportPerformanceMetrics(): Promise<{
    averageGenerationTime: number;
    slowestReports: Array<{
      reportId: string;
      reportName: string;
      averageTime: number;
      maxTime: number;
    }>;
    cacheHitRate: number;
  }>;

  // ==================== 数据验证 ====================

  /**
   * 验证报表定义
   */
  validateReportDefinition(definition: Partial<ReportDefinition>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 测试报表查询
   */
  testReportQuery(reportId: string, parameters?: ReportParameters): Promise<{
    isValid: boolean;
    rowCount: number;
    executionTime: number;
    errors?: string[];
  }>;
}
