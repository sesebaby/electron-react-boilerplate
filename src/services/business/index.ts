/**
 * 业务服务兼容性层
 * 为旧组件提供兼容接口，重新导出核心服务
 */

import { serviceManager } from '../core';

// 重新导出核心服务类型
export * from '../core/types';

// 重新导出实体类型
export * from '../../types/entities';

// 兼容性服务实例获取器
export const getProductService = () => serviceManager.getInventoryService();
export const getCategoryService = () => serviceManager.getInventoryService();
export const getInventoryStockService = () => serviceManager.getInventoryService();
export const getWarehouseService = () => serviceManager.getInventoryService();
export const getUnitService = () => serviceManager.getInventoryService();

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

// 直接服务实例导出 (向后兼容)
export const productService = serviceManager.getInventoryService();
export const categoryService = serviceManager.getInventoryService();
export const inventoryStockService = serviceManager.getInventoryService();
export const warehouseService = serviceManager.getInventoryService();
export const unitService = serviceManager.getInventoryService();

export const purchaseOrderService = serviceManager.getOrderService();
export const salesOrderService = serviceManager.getOrderService();
export const purchaseReceiptService = serviceManager.getOrderService();
export const salesDeliveryService = serviceManager.getOrderService();

export const accountsPayableService = serviceManager.getFinancialService();
export const accountsReceivableService = serviceManager.getFinancialService();

export const userService = serviceManager.getSystemService();
export const customerService = serviceManager.getSystemService();
export const supplierService = serviceManager.getSystemService();
export const permissionService = serviceManager.getSystemService();

export const reportService = serviceManager.getReportService();
export const inventoryCardService = serviceManager.getReportService();
export const dailyConsumptionService = serviceManager.getReportService();
export const calendarDataService = serviceManager.getReportService();

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