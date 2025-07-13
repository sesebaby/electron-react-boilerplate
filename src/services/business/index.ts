/**
 * 业务服务兼容性层
 * 为旧组件提供兼容接口，重新导出核心服务
 */

import { serviceManager } from '../core';

// 重新导出核心服务类型
export type {
  ServiceResult,
  PaginatedResult,
  PaginationParams,
  BaseFilter,
  ServiceStatistics
} from '../core/types';

// 重新导出实体类型，避免 BatchOperationResult 冲突
export type {
  Product,
  ProductStatus,
  Category,
  Unit,
  UnitType,
  Warehouse,
  InventoryItem,
  InventoryStock,
  InventoryTransaction,
  TransactionType,
  Supplier,
  Customer,
  User,
  UserRole,
  UserStatus,
  PurchaseOrder,
  PurchaseOrderStatus,
  SalesOrderStatus,
  AccountsPayable,
  AccountsReceivable,
  ReceivableStatus,
  PaymentStatus,
} from '../../types/entities';


// 兼容性服务实例获取器 - 使用新的领域服务
export const getProductService = () => serviceManager.getInventoryService();
export const getCategoryService = () => serviceManager.getMasterDataService();
export const getInventoryStockService = () => serviceManager.getInventoryService();
export const getWarehouseService = () => serviceManager.getMasterDataService();
export const getUnitService = () => serviceManager.getMasterDataService();

export const getPurchaseOrderService = () => serviceManager.getOrderService();
export const getSalesOrderService = () => serviceManager.getOrderService();
export const getPurchaseReceiptService = () => serviceManager.getOrderService();
export const getSalesDeliveryService = () => serviceManager.getOrderService();

export const getAccountsPayableService = () => serviceManager.getFinancialService();
export const getAccountsReceivableService = () => serviceManager.getFinancialService();

export const getUserService = () => serviceManager.getSystemService();
export const getCustomerService = () => serviceManager.getSystemService();
export const getSupplierService = () => serviceManager.getSystemService();
export const getPermissionService = () => serviceManager.getSystemService();

export const getReportService = () => serviceManager.getReportService();
export const getInventoryCardService = () => serviceManager.getReportService();
export const getDailyConsumptionService = () => serviceManager.getReportService();
export const getCalendarDataService = () => serviceManager.getReportService();

// 简化的服务管理器
export const businessServiceManager = {
  getProductService,
  getCategoryService,
  getInventoryStockService,
  getWarehouseService,
  getUnitService,
  getPurchaseOrderService,
  getSalesOrderService,
  getPurchaseReceiptService,
  getSalesDeliveryService,
  getAccountsPayableService,
  getAccountsReceivableService,
  getUserService,
  getCustomerService,
  getSupplierService,
  getPermissionService,
  getReportService,
  getInventoryCardService,
  getDailyConsumptionService,
  getCalendarDataService
};

// 简化的服务实例导出 (向后兼容)
// 注释掉直接导出，推荐使用 getXXXService() 函数

// 注意：不要直接导出服务实例，因为会在模块加载时立即调用 serviceManager
// 推荐使用上面的 getXXXService() 函数或直接调用 serviceManager.getXXXService()

// 注释掉直接服务实例导出，避免在模块加载时调用未初始化的 serviceManager
// export const productService = serviceManager.getInventoryService();
// export const categoryService = serviceManager.getInventoryService();
// export const inventoryStockService = serviceManager.getInventoryService();
// export const warehouseService = serviceManager.getInventoryService();
// export const unitService = serviceManager.getInventoryService();
// export const purchaseOrderService = serviceManager.getOrderService();

// export const salesOrderService = serviceManager.getOrderService();
// export const purchaseReceiptService = serviceManager.getOrderService();
// export const salesDeliveryService = serviceManager.getOrderService();
// export const accountsPayableService = serviceManager.getFinancialService();
// export const accountsReceivableService = serviceManager.getFinancialService();
// export const userService = serviceManager.getSystemService();
// export const customerService = serviceManager.getSystemService();
// export const supplierService = serviceManager.getSystemService();
// export const permissionService = serviceManager.getSystemService();

// export const reportService = serviceManager.getReportService();
// export const inventoryCardService = serviceManager.getReportService();
// export const dailyConsumptionService = serviceManager.getReportService();
// export const calendarDataService = serviceManager.getReportService();

// 日历数据服务工具类
export class CalendarDataService {
  /**
   * 获取周的开始日期（周一）
   */
  static getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    return new Date(d.setDate(diff));
  }

  /**
   * 获取周的结束日期（周日）
   */
  static getWeekEnd(date: Date): Date {
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd;
  }

  /**
   * 格式化日期为字符串
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * 获取两个日期之间的天数
   */
  static getDaysBetween(startDate: Date, endDate: Date): number {
    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
}

// 默认导出
export default businessServiceManager;