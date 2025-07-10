/**
 * 核心服务类型定义
 * 简化的类型系统，替代复杂的接口继承
 */

// 基础类型
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T = any> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 基础过滤器
export interface BaseFilter {
  keyword?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
}

// 批量操作结果
export interface BatchOperationResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

// 统计信息
export interface ServiceStatistics {
  totalCount: number;
  [key: string]: any;
}

// 实体类型重导出
export type {
  Product,
  ProductStatus,
  Category,
  Unit,
  Warehouse,
  Supplier,
  Customer,
  User,
  InventoryItem,
  PurchaseOrder,
  SalesOrder,
  PurchaseReceipt,
  SalesDelivery
} from '../../types/entities';