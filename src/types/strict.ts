/**
 * 严格类型定义
 * 替换项目中的any类型，提供类型安全
 */

// 数据库查询结果类型
export interface DatabaseQueryResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

// 数据库行类型
export interface DatabaseRow {
  [key: string]: string | number | boolean | null;
}

// API响应类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 错误处理类型
export interface ErrorInfo {
  message: string;
  stack?: string;
  code?: string | number;
  context?: Record<string, unknown>;
}

// 事件监听器类型
export type EventListener<T = unknown> = (data: T) => void | Promise<void>;

// IPC通信类型
export interface IpcRequest<T = unknown> {
  channel: string;
  data?: T;
  requestId?: string;
}

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// 表单验证类型
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface FormField {
  name: string;
  value: unknown;
  required?: boolean;
  validators?: Array<(value: unknown) => string | null>;
}

// 搜索和筛选类型
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 文件操作类型
export interface FileInfo {
  path: string;
  name: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
}

export interface FileOperationResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// 系统状态类型
export interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    free: number;
    total: number;
    percentage: number;
  };
  lastUpdate: Date;
}

// 日志记录类型
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  source?: string;
  data?: Record<string, unknown>;
}

// 配置类型
export interface AppConfig {
  database: {
    path: string;
    timeout: number;
    maxRetries: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    maxFiles: number;
    maxSize: string;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    pageSize: number;
  };
}

// 批量操作类型
export interface BatchOperation<T> {
  operation: 'create' | 'update' | 'delete';
  items: T[];
  options?: Record<string, unknown>;
}

export interface BatchResult<T> {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    item: T;
    success: boolean;
    error?: string;
  }>;
}

// 导入导出类型
export interface ImportOptions {
  format: 'excel' | 'csv' | 'json';
  skipHeaders?: boolean;
  columnMapping?: Record<string, string>;
  validation?: boolean;
}

export interface ExportOptions {
  format: 'excel' | 'csv' | 'json' | 'pdf';
  columns?: string[];
  filename?: string;
  includeHeaders?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// 权限类型
export interface Permission {
  resource: string;
  actions: string[];
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

// 测试相关类型
export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedResult: unknown;
}

export interface TestStep {
  action: string;
  target?: string;
  data?: Record<string, unknown>;
  expected?: unknown;
}

export interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

// 报表类型
export interface ReportConfig {
  title: string;
  description?: string;
  dataSource: string;
  filters?: Record<string, unknown>;
  groupBy?: string[];
  aggregations?: Record<string, 'sum' | 'avg' | 'count' | 'min' | 'max'>;
  format: 'table' | 'chart' | 'export';
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  xAxis: string;
  yAxis: string[];
  colors?: string[];
  title?: string;
}

// 通用工具类型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never;
}[keyof T];

// 类型守卫辅助函数
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// 断言函数
export function assertString(value: unknown, name: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(`Expected ${name} to be a string, got ${typeof value}`);
  }
}

export function assertNumber(value: unknown, name: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(`Expected ${name} to be a number, got ${typeof value}`);
  }
}

export function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`Expected ${name} to be an object, got ${typeof value}`);
  }
}