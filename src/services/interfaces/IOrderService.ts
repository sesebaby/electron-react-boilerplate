/**
 * 订单服务接口（采购订单和销售订单的通用接口）
 */

import { 
  PurchaseOrder, 
  SalesOrder, 
  OrderStatus, 
  PurchaseOrderItem, 
  SalesOrderItem 
} from '../../types/entities';
import { 
  IBusinessService, 
  PaginatedResult, 
  PaginationParams, 
  BaseFilter, 
  ServiceResult,
  ServiceStatistics,
  BatchOperationResult
} from './IBusinessService';

/**
 * 订单查询过滤器基类
 */
export interface BaseOrderFilter extends BaseFilter {
  /** 订单状态 */
  status?: OrderStatus;
  /** 订单日期范围 */
  orderDateFrom?: Date;
  orderDateTo?: Date;
  /** 预期日期范围 */
  expectedDateFrom?: Date;
  expectedDateTo?: Date;
  /** 订单金额范围 */
  totalAmountFrom?: number;
  totalAmountTo?: number;
  /** 订单号 */
  orderNumber?: string;
}

/**
 * 采购订单查询过滤器
 */
export interface PurchaseOrderFilter extends BaseOrderFilter {
  /** 供应商ID */
  supplierId?: string;
  /** 采购员ID */
  purchaserId?: string;
}

/**
 * 销售订单查询过滤器
 */
export interface SalesOrderFilter extends BaseOrderFilter {
  /** 客户ID */
  customerId?: string;
  /** 销售员ID */
  salespersonId?: string;
}

/**
 * 订单统计信息基类
 */
export interface BaseOrderStatistics extends ServiceStatistics {
  /** 各状态订单数量 */
  countByStatus: Record<OrderStatus, number>;
  /** 总订单金额 */
  totalOrderAmount: number;
  /** 平均订单金额 */
  averageOrderAmount: number;
  /** 待处理订单数 */
  pendingOrderCount: number;
  /** 已完成订单数 */
  completedOrderCount: number;
  /** 已取消订单数 */
  cancelledOrderCount: number;
}

/**
 * 采购订单统计信息
 */
export interface PurchaseOrderStatistics extends BaseOrderStatistics {
  /** 各供应商订单数量 */
  countBySupplier: Record<string, number>;
  /** 总采购金额 */
  totalPurchaseAmount: number;
  /** 待收货金额 */
  pendingReceiptAmount: number;
}

/**
 * 销售订单统计信息
 */
export interface SalesOrderStatistics extends BaseOrderStatistics {
  /** 各客户订单数量 */
  countByCustomer: Record<string, number>;
  /** 总销售金额 */
  totalSalesAmount: number;
  /** 待发货金额 */
  pendingDeliveryAmount: number;
}

/**
 * 订单履行状态
 */
export interface OrderFulfillmentStatus {
  /** 订单ID */
  orderId: string;
  /** 总数量 */
  totalQuantity: number;
  /** 已履行数量 */
  fulfilledQuantity: number;
  /** 待履行数量 */
  pendingQuantity: number;
  /** 履行率 */
  fulfillmentRate: number;
  /** 预期完成日期 */
  expectedCompletionDate?: Date;
  /** 实际完成日期 */
  actualCompletionDate?: Date;
}

/**
 * 采购订单服务接口
 */
export interface IPurchaseOrderService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建采购订单
   */
  create(data: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<PurchaseOrder>;

  /**
   * 根据ID获取采购订单
   */
  findById(id: string): Promise<PurchaseOrder | null>;

  /**
   * 根据订单号获取采购订单
   */
  findByOrderNumber(orderNumber: string): Promise<PurchaseOrder | null>;

  /**
   * 获取所有采购订单
   */
  findAll(): Promise<PurchaseOrder[]>;

  /**
   * 分页查询采购订单
   */
  findPaginated(params: PaginationParams, filter?: PurchaseOrderFilter): Promise<PaginatedResult<PurchaseOrder>>;

  /**
   * 更新采购订单
   */
  update(id: string, data: Partial<PurchaseOrder>, currentUserId?: string): Promise<PurchaseOrder>;

  /**
   * 删除采购订单
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 订单项管理 ====================

  /**
   * 添加订单项
   */
  addOrderItem(orderId: string, item: Omit<PurchaseOrderItem, 'id'>, currentUserId?: string): Promise<PurchaseOrderItem>;

  /**
   * 更新订单项
   */
  updateOrderItem(orderId: string, itemId: string, data: Partial<PurchaseOrderItem>, currentUserId?: string): Promise<PurchaseOrderItem>;

  /**
   * 删除订单项
   */
  removeOrderItem(orderId: string, itemId: string, currentUserId?: string): Promise<void>;

  /**
   * 获取订单项列表
   */
  getOrderItems(orderId: string): Promise<PurchaseOrderItem[]>;

  // ==================== 状态管理 ====================

  /**
   * 提交订单（草稿 -> 待审核）
   */
  submit(id: string, currentUserId?: string): Promise<void>;

  /**
   * 审核订单（待审核 -> 已审核）
   */
  approve(id: string, currentUserId?: string): Promise<void>;

  /**
   * 拒绝订单（待审核 -> 已拒绝）
   */
  reject(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 确认订单（已审核 -> 已确认）
   */
  confirm(id: string, currentUserId?: string): Promise<void>;

  /**
   * 取消订单
   */
  cancel(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 完成订单
   */
  complete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 查询方法 ====================

  /**
   * 根据供应商查询订单
   */
  findBySupplier(supplierId: string): Promise<PurchaseOrder[]>;

  /**
   * 根据状态查询订单
   */
  findByStatus(status: OrderStatus): Promise<PurchaseOrder[]>;

  /**
   * 获取待收货订单
   */
  getPendingReceiptOrders(): Promise<PurchaseOrder[]>;

  /**
   * 获取逾期订单
   */
  getOverdueOrders(): Promise<PurchaseOrder[]>;

  // ==================== 统计和分析 ====================

  /**
   * 获取采购订单统计
   */
  getStatistics(): Promise<PurchaseOrderStatistics>;

  /**
   * 获取订单履行状态
   */
  getFulfillmentStatus(orderId: string): Promise<OrderFulfillmentStatus>;

  /**
   * 获取供应商绩效分析
   */
  getSupplierPerformance(supplierId: string, startDate: Date, endDate: Date): Promise<{
    totalOrders: number;
    totalAmount: number;
    averageLeadTime: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
  }>;
}

/**
 * 销售订单服务接口
 */
export interface ISalesOrderService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建销售订单
   */
  create(data: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<SalesOrder>;

  /**
   * 根据ID获取销售订单
   */
  findById(id: string): Promise<SalesOrder | null>;

  /**
   * 根据订单号获取销售订单
   */
  findByOrderNumber(orderNumber: string): Promise<SalesOrder | null>;

  /**
   * 获取所有销售订单
   */
  findAll(): Promise<SalesOrder[]>;

  /**
   * 分页查询销售订单
   */
  findPaginated(params: PaginationParams, filter?: SalesOrderFilter): Promise<PaginatedResult<SalesOrder>>;

  /**
   * 更新销售订单
   */
  update(id: string, data: Partial<SalesOrder>, currentUserId?: string): Promise<SalesOrder>;

  /**
   * 删除销售订单
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 订单项管理 ====================

  /**
   * 添加订单项
   */
  addOrderItem(orderId: string, item: Omit<SalesOrderItem, 'id'>, currentUserId?: string): Promise<SalesOrderItem>;

  /**
   * 更新订单项
   */
  updateOrderItem(orderId: string, itemId: string, data: Partial<SalesOrderItem>, currentUserId?: string): Promise<SalesOrderItem>;

  /**
   * 删除订单项
   */
  removeOrderItem(orderId: string, itemId: string, currentUserId?: string): Promise<void>;

  /**
   * 获取订单项列表
   */
  getOrderItems(orderId: string): Promise<SalesOrderItem[]>;

  // ==================== 状态管理 ====================

  /**
   * 提交订单（草稿 -> 待审核）
   */
  submit(id: string, currentUserId?: string): Promise<void>;

  /**
   * 审核订单（待审核 -> 已审核）
   */
  approve(id: string, currentUserId?: string): Promise<void>;

  /**
   * 拒绝订单（待审核 -> 已拒绝）
   */
  reject(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 确认订单（已审核 -> 已确认）
   */
  confirm(id: string, currentUserId?: string): Promise<void>;

  /**
   * 取消订单
   */
  cancel(id: string, reason: string, currentUserId?: string): Promise<void>;

  /**
   * 完成订单
   */
  complete(id: string, currentUserId?: string): Promise<void>;

  // ==================== 查询方法 ====================

  /**
   * 根据客户查询订单
   */
  findByCustomer(customerId: string): Promise<SalesOrder[]>;

  /**
   * 根据状态查询订单
   */
  findByStatus(status: OrderStatus): Promise<SalesOrder[]>;

  /**
   * 获取待发货订单
   */
  getPendingDeliveryOrders(): Promise<SalesOrder[]>;

  /**
   * 获取逾期订单
   */
  getOverdueOrders(): Promise<SalesOrder[]>;

  // ==================== 统计和分析 ====================

  /**
   * 获取销售订单统计
   */
  getStatistics(): Promise<SalesOrderStatistics>;

  /**
   * 获取订单履行状态
   */
  getFulfillmentStatus(orderId: string): Promise<OrderFulfillmentStatus>;

  /**
   * 获取客户绩效分析
   */
  getCustomerPerformance(customerId: string, startDate: Date, endDate: Date): Promise<{
    totalOrders: number;
    totalAmount: number;
    averageOrderValue: number;
    repeatOrderRate: number;
    paymentTermsCompliance: number;
  }>;

  // ==================== 库存检查 ====================

  /**
   * 检查订单库存可用性
   */
  checkInventoryAvailability(orderId: string): Promise<{
    isAvailable: boolean;
    unavailableItems: Array<{
      productId: string;
      requiredQuantity: number;
      availableQuantity: number;
      shortfall: number;
    }>;
  }>;

  /**
   * 预留订单库存
   */
  reserveInventory(orderId: string, currentUserId?: string): Promise<void>;

  /**
   * 释放订单库存预留
   */
  releaseInventoryReservation(orderId: string, currentUserId?: string): Promise<void>;
}
