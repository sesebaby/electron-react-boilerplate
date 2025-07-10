/**
 * 订单服务 - 整合采购和销售订单管理
 * 整合原有的 PurchaseOrderService, SalesOrderService, PurchaseReceiptService, SalesDeliveryService
 */

import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  PurchaseReceipt,
  PurchaseReceiptItem,
  ReceiptStatus,
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  SalesDelivery,
  SalesDeliveryItem,
  DeliveryStatus,
  OrderItemStatus,
  PaymentStatus,
  Supplier,
  Customer,
  TransactionType
} from '../../types/entities';
import {
  ServiceResult,
  PaginatedResult,
  PaginationParams,
  BatchOperationResult,
  BaseFilter,
  ServiceStatistics
} from './types';
import { DatabaseManager } from './database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/secureLogger';
import { ValidationError, BusinessError } from '../../utils/errors';

// 订单服务专用过滤器
export interface OrderFilter extends BaseFilter {
  orderNo?: string;
  supplierId?: string;
  customerId?: string;
  status?: string;
  orderDateFrom?: Date;
  orderDateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  creator?: string;
}

// 订单统计信息
export interface OrderStatistics extends ServiceStatistics {
  // 采购统计
  purchaseOrders: {
    totalCount: number;
    totalAmount: number;
    countByStatus: Record<PurchaseOrderStatus, number>;
    avgOrderAmount: number;
  };
  // 销售统计
  salesOrders: {
    totalCount: number;
    totalAmount: number;
    countByStatus: Record<SalesOrderStatus, number>;
    avgOrderAmount: number;
  };
  // 收发货统计
  receipts: {
    totalCount: number;
    totalAmount: number;
    pendingCount: number;
  };
  deliveries: {
    totalCount: number;
    totalAmount: number;
    pendingCount: number;
  };
}

/**
 * 订单服务实现
 */
export class OrderService {
  private initialized = false;
  private database: any = null;

  // 内存缓存
  private purchaseOrders: Map<string, PurchaseOrder> = new Map();
  private purchaseOrderItems: Map<string, PurchaseOrderItem> = new Map();
  private purchaseReceipts: Map<string, PurchaseReceipt> = new Map();
  private purchaseReceiptItems: Map<string, PurchaseReceiptItem> = new Map();
  private salesOrders: Map<string, SalesOrder> = new Map();
  private salesOrderItems: Map<string, SalesOrderItem> = new Map();
  private salesDeliveries: Map<string, SalesDelivery> = new Map();
  private salesDeliveryItems: Map<string, SalesDeliveryItem> = new Map();

  // 索引
  private purchaseOrderNoIndex: Map<string, string> = new Map();
  private salesOrderNoIndex: Map<string, string> = new Map();
  private supplierOrderIndex: Map<string, string[]> = new Map();
  private customerOrderIndex: Map<string, string[]> = new Map();

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.database = await DatabaseManager.getInstance();
      await this.loadData();
      this.initialized = true;
      logger.info('OrderService initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OrderService', error);
      throw error;
    }
  }

  private async loadData(): Promise<void> {
    await Promise.all([
      this.loadPurchaseOrders(),
      this.loadPurchaseReceipts(),
      this.loadSalesOrders(),
      this.loadSalesDeliveries()
    ]);

    this.buildIndexes();
  }

  private async loadPurchaseOrders(): Promise<void> {
    try {
      const orders = await this.database.getAllPurchaseOrders();
      const items = await this.database.getAllPurchaseOrderItems();

      this.purchaseOrders.clear();
      this.purchaseOrderItems.clear();

      orders.forEach((order: PurchaseOrder) => {
        this.purchaseOrders.set(order.id, order);
      });

      items.forEach((item: PurchaseOrderItem) => {
        this.purchaseOrderItems.set(item.id, item);
      });
    } catch (error) {
      logger.error('Failed to load purchase orders', error);
    }
  }

  private async loadPurchaseReceipts(): Promise<void> {
    try {
      const receipts = await this.database.getAllPurchaseReceipts();
      const items = await this.database.getAllPurchaseReceiptItems();

      this.purchaseReceipts.clear();
      this.purchaseReceiptItems.clear();

      receipts.forEach((receipt: PurchaseReceipt) => {
        this.purchaseReceipts.set(receipt.id, receipt);
      });

      items.forEach((item: PurchaseReceiptItem) => {
        this.purchaseReceiptItems.set(item.id, item);
      });
    } catch (error) {
      logger.error('Failed to load purchase receipts', error);
    }
  }

  private async loadSalesOrders(): Promise<void> {
    try {
      const orders = await this.database.getAllSalesOrders();
      const items = await this.database.getAllSalesOrderItems();

      this.salesOrders.clear();
      this.salesOrderItems.clear();

      orders.forEach((order: SalesOrder) => {
        this.salesOrders.set(order.id, order);
      });

      items.forEach((item: SalesOrderItem) => {
        this.salesOrderItems.set(item.id, item);
      });
    } catch (error) {
      logger.error('Failed to load sales orders', error);
    }
  }

  private async loadSalesDeliveries(): Promise<void> {
    try {
      const deliveries = await this.database.getAllSalesDeliveries();
      const items = await this.database.getAllSalesDeliveryItems();

      this.salesDeliveries.clear();
      this.salesDeliveryItems.clear();

      deliveries.forEach((delivery: SalesDelivery) => {
        this.salesDeliveries.set(delivery.id, delivery);
      });

      items.forEach((item: SalesDeliveryItem) => {
        this.salesDeliveryItems.set(item.id, item);
      });
    } catch (error) {
      logger.error('Failed to load sales deliveries', error);
    }
  }

  private buildIndexes(): void {
    // 构建订单号索引
    this.purchaseOrderNoIndex.clear();
    this.salesOrderNoIndex.clear();
    this.supplierOrderIndex.clear();
    this.customerOrderIndex.clear();

    this.purchaseOrders.forEach((order) => {
      this.purchaseOrderNoIndex.set(order.orderNo, order.id);
      
      if (!this.supplierOrderIndex.has(order.supplierId)) {
        this.supplierOrderIndex.set(order.supplierId, []);
      }
      this.supplierOrderIndex.get(order.supplierId)!.push(order.id);
    });

    this.salesOrders.forEach((order) => {
      this.salesOrderNoIndex.set(order.orderNo, order.id);
      
      if (!this.customerOrderIndex.has(order.customerId)) {
        this.customerOrderIndex.set(order.customerId, []);
      }
      this.customerOrderIndex.get(order.customerId)!.push(order.id);
    });
  }

  // ==================== 采购订单管理 ====================

  async createPurchaseOrder(orderData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<PurchaseOrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>[]): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // 验证订单号唯一性
      if (this.purchaseOrderNoIndex.has(orderData.orderNo)) {
        return {
          success: false,
          error: `采购订单号 "${orderData.orderNo}" 已存在`
        };
      }

      // 创建订单
      const order: PurchaseOrder = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 创建订单明细
      const orderItems: PurchaseOrderItem[] = items.map(itemData => ({
        ...itemData,
        id: uuidv4(),
        orderId: order.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 开始事务
      await this.database.beginTransaction();

      try {
        // 保存订单
        await this.database.insertPurchaseOrder(order);
        
        // 保存订单明细
        for (const item of orderItems) {
          await this.database.insertPurchaseOrderItem(item);
        }

        await this.database.commitTransaction();

        // 更新内存缓存
        this.purchaseOrders.set(order.id, order);
        orderItems.forEach(item => {
          this.purchaseOrderItems.set(item.id, item);
        });

        // 更新索引
        this.purchaseOrderNoIndex.set(order.orderNo, order.id);
        if (!this.supplierOrderIndex.has(order.supplierId)) {
          this.supplierOrderIndex.set(order.supplierId, []);
        }
        this.supplierOrderIndex.get(order.supplierId)!.push(order.id);

        return {
          success: true,
          data: order
        };
      } catch (error) {
        await this.database.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to create purchase order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建采购订单失败'
      };
    }
  }

  async updatePurchaseOrder(id: string, updateData: Partial<PurchaseOrder>): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const existingOrder = this.purchaseOrders.get(id);
      if (!existingOrder) {
        return {
          success: false,
          error: '采购订单不存在'
        };
      }

      // 验证订单号唯一性（如果有更新）
      if (updateData.orderNo && updateData.orderNo !== existingOrder.orderNo) {
        if (this.purchaseOrderNoIndex.has(updateData.orderNo)) {
          return {
            success: false,
            error: `采购订单号 "${updateData.orderNo}" 已存在`
          };
        }
      }

      const updatedOrder: PurchaseOrder = {
        ...existingOrder,
        ...updateData,
        updatedAt: new Date()
      };

      // 更新数据库
      await this.database.updatePurchaseOrder(id, updatedOrder);
      
      // 更新内存缓存
      this.purchaseOrders.set(id, updatedOrder);
      
      // 更新索引
      if (existingOrder.orderNo !== updatedOrder.orderNo) {
        this.purchaseOrderNoIndex.delete(existingOrder.orderNo);
        this.purchaseOrderNoIndex.set(updatedOrder.orderNo, id);
      }

      return {
        success: true,
        data: updatedOrder
      };
    } catch (error) {
      logger.error('Failed to update purchase order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新采购订单失败'
      };
    }
  }

  async deletePurchaseOrder(id: string): Promise<ServiceResult<boolean>> {
    try {
      const order = this.purchaseOrders.get(id);
      if (!order) {
        return {
          success: false,
          error: '采购订单不存在'
        };
      }

      // 检查订单状态
      if (order.status !== PurchaseOrderStatus.DRAFT) {
        return {
          success: false,
          error: '只能删除草稿状态的订单'
        };
      }

      // 开始事务
      await this.database.beginTransaction();

      try {
        // 删除订单明细
        const orderItems = Array.from(this.purchaseOrderItems.values()).filter(
          item => item.orderId === id
        );
        for (const item of orderItems) {
          await this.database.deletePurchaseOrderItem(item.id);
        }

        // 删除订单
        await this.database.deletePurchaseOrder(id);

        await this.database.commitTransaction();

        // 更新内存缓存
        this.purchaseOrders.delete(id);
        orderItems.forEach(item => {
          this.purchaseOrderItems.delete(item.id);
        });

        // 更新索引
        this.purchaseOrderNoIndex.delete(order.orderNo);
        const supplierOrders = this.supplierOrderIndex.get(order.supplierId);
        if (supplierOrders) {
          const index = supplierOrders.indexOf(id);
          if (index > -1) {
            supplierOrders.splice(index, 1);
          }
        }

        return {
          success: true,
          data: true
        };
      } catch (error) {
        await this.database.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to delete purchase order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除采购订单失败'
      };
    }
  }

  async getPurchaseOrder(id: string): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const order = this.purchaseOrders.get(id);
      if (!order) {
        return {
          success: false,
          error: '采购订单不存在'
        };
      }

      // 附加订单明细
      const items = Array.from(this.purchaseOrderItems.values()).filter(
        item => item.orderId === id
      );
      const orderWithItems = { ...order, items };

      return {
        success: true,
        data: orderWithItems
      };
    } catch (error) {
      logger.error('Failed to get purchase order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取采购订单失败'
      };
    }
  }

  async getPurchaseOrders(filter?: OrderFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<PurchaseOrder>>> {
    try {
      let orders = Array.from(this.purchaseOrders.values());

      // 应用过滤器
      if (filter) {
        orders = orders.filter(order => {
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!order.orderNo.toLowerCase().includes(keyword)) {
              return false;
            }
          }

          if (filter.orderNo && order.orderNo !== filter.orderNo) {
            return false;
          }

          if (filter.supplierId && order.supplierId !== filter.supplierId) {
            return false;
          }

          if (filter.status && order.status !== filter.status) {
            return false;
          }

          if (filter.creator && order.creator !== filter.creator) {
            return false;
          }

          if (filter.orderDateFrom && order.orderDate < filter.orderDateFrom) {
            return false;
          }

          if (filter.orderDateTo && order.orderDate > filter.orderDateTo) {
            return false;
          }

          if (filter.amountFrom && order.finalAmount < filter.amountFrom) {
            return false;
          }

          if (filter.amountTo && order.finalAmount > filter.amountTo) {
            return false;
          }

          return true;
        });
      }

      // 按创建时间倒序排序
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = orders.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = orders.slice(offset, offset + pageSize);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to get purchase orders', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取采购订单列表失败'
      };
    }
  }

  // ==================== 采购收货管理 ====================

  async createPurchaseReceipt(orderId: string, receiptData: Omit<PurchaseReceipt, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>, items: Omit<PurchaseReceiptItem, 'id' | 'receiptId' | 'createdAt' | 'updatedAt'>[]): Promise<ServiceResult<PurchaseReceipt>> {
    try {
      const order = this.purchaseOrders.get(orderId);
      if (!order) {
        return {
          success: false,
          error: '采购订单不存在'
        };
      }

      // 创建收货单
      const receipt: PurchaseReceipt = {
        ...receiptData,
        id: uuidv4(),
        orderId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 创建收货明细
      const receiptItems: PurchaseReceiptItem[] = items.map(itemData => ({
        ...itemData,
        id: uuidv4(),
        receiptId: receipt.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 开始事务
      await this.database.beginTransaction();

      try {
        // 保存收货单
        await this.database.insertPurchaseReceipt(receipt);
        
        // 保存收货明细
        for (const item of receiptItems) {
          await this.database.insertPurchaseReceiptItem(item);
        }

        await this.database.commitTransaction();

        // 更新内存缓存
        this.purchaseReceipts.set(receipt.id, receipt);
        receiptItems.forEach(item => {
          this.purchaseReceiptItems.set(item.id, item);
        });

        return {
          success: true,
          data: receipt
        };
      } catch (error) {
        await this.database.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to create purchase receipt', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建采购收货单失败'
      };
    }
  }

  async confirmPurchaseReceipt(receiptId: string): Promise<ServiceResult<boolean>> {
    try {
      const receipt = this.purchaseReceipts.get(receiptId);
      if (!receipt) {
        return {
          success: false,
          error: '采购收货单不存在'
        };
      }

      if (receipt.status !== ReceiptStatus.DRAFT) {
        return {
          success: false,
          error: '只能确认草稿状态的收货单'
        };
      }

      // 获取收货明细
      const receiptItems = Array.from(this.purchaseReceiptItems.values()).filter(
        item => item.receiptId === receiptId
      );

      // 开始事务
      await this.database.beginTransaction();

      try {
        // 更新收货单状态
        const updatedReceipt = {
          ...receipt,
          status: ReceiptStatus.CONFIRMED,
          updatedAt: new Date()
        };
        await this.database.updatePurchaseReceipt(receiptId, updatedReceipt);

        // 更新库存（这里需要调用InventoryService，暂时跳过）
        // TODO: 调用 InventoryService.updateStock() 更新库存

        await this.database.commitTransaction();

        // 更新内存缓存
        this.purchaseReceipts.set(receiptId, updatedReceipt);

        return {
          success: true,
          data: true
        };
      } catch (error) {
        await this.database.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to confirm purchase receipt', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '确认采购收货单失败'
      };
    }
  }

  // ==================== 销售订单管理 ====================

  async createSalesOrder(orderData: Omit<SalesOrder, 'id' | 'createdAt' | 'updatedAt'>, items: Omit<SalesOrderItem, 'id' | 'orderId' | 'createdAt' | 'updatedAt'>[]): Promise<ServiceResult<SalesOrder>> {
    try {
      // 验证订单号唯一性
      if (this.salesOrderNoIndex.has(orderData.orderNo)) {
        return {
          success: false,
          error: `销售订单号 "${orderData.orderNo}" 已存在`
        };
      }

      // 创建订单
      const order: SalesOrder = {
        ...orderData,
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 创建订单明细
      const orderItems: SalesOrderItem[] = items.map(itemData => ({
        ...itemData,
        id: uuidv4(),
        orderId: order.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // 开始事务
      await this.database.beginTransaction();

      try {
        // 保存订单
        await this.database.insertSalesOrder(order);
        
        // 保存订单明细
        for (const item of orderItems) {
          await this.database.insertSalesOrderItem(item);
        }

        await this.database.commitTransaction();

        // 更新内存缓存
        this.salesOrders.set(order.id, order);
        orderItems.forEach(item => {
          this.salesOrderItems.set(item.id, item);
        });

        // 更新索引
        this.salesOrderNoIndex.set(order.orderNo, order.id);
        if (!this.customerOrderIndex.has(order.customerId)) {
          this.customerOrderIndex.set(order.customerId, []);
        }
        this.customerOrderIndex.get(order.customerId)!.push(order.id);

        return {
          success: true,
          data: order
        };
      } catch (error) {
        await this.database.rollbackTransaction();
        throw error;
      }
    } catch (error) {
      logger.error('Failed to create sales order', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建销售订单失败'
      };
    }
  }

  async getSalesOrders(filter?: OrderFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<SalesOrder>>> {
    try {
      let orders = Array.from(this.salesOrders.values());

      // 应用过滤器
      if (filter) {
        orders = orders.filter(order => {
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!order.orderNo.toLowerCase().includes(keyword)) {
              return false;
            }
          }

          if (filter.orderNo && order.orderNo !== filter.orderNo) {
            return false;
          }

          if (filter.customerId && order.customerId !== filter.customerId) {
            return false;
          }

          if (filter.status && order.status !== filter.status) {
            return false;
          }

          return true;
        });
      }

      // 按创建时间倒序排序
      orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = orders.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = orders.slice(offset, offset + pageSize);

      return {
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to get sales orders', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取销售订单列表失败'
      };
    }
  }

  // ==================== 统计信息 ====================

  async getStatistics(): Promise<ServiceResult<OrderStatistics>> {
    try {
      const stats: OrderStatistics = {
        totalCount: this.purchaseOrders.size + this.salesOrders.size,
        purchaseOrders: {
          totalCount: this.purchaseOrders.size,
          totalAmount: Array.from(this.purchaseOrders.values()).reduce((sum, order) => sum + order.finalAmount, 0),
          countByStatus: {} as Record<PurchaseOrderStatus, number>,
          avgOrderAmount: 0
        },
        salesOrders: {
          totalCount: this.salesOrders.size,
          totalAmount: Array.from(this.salesOrders.values()).reduce((sum, order) => sum + order.finalAmount, 0),
          countByStatus: {} as Record<SalesOrderStatus, number>,
          avgOrderAmount: 0
        },
        receipts: {
          totalCount: this.purchaseReceipts.size,
          totalAmount: Array.from(this.purchaseReceipts.values()).reduce((sum, receipt) => sum + receipt.totalAmount, 0),
          pendingCount: Array.from(this.purchaseReceipts.values()).filter(r => r.status === ReceiptStatus.DRAFT).length
        },
        deliveries: {
          totalCount: this.salesDeliveries.size,
          totalAmount: Array.from(this.salesDeliveries.values()).reduce((sum, delivery) => sum + delivery.totalAmount, 0),
          pendingCount: Array.from(this.salesDeliveries.values()).filter(d => d.status === DeliveryStatus.DRAFT).length
        }
      };

      // 统计采购订单状态分布
      for (const status of Object.values(PurchaseOrderStatus)) {
        stats.purchaseOrders.countByStatus[status] = Array.from(this.purchaseOrders.values()).filter(o => o.status === status).length;
      }

      // 统计销售订单状态分布
      for (const status of Object.values(SalesOrderStatus)) {
        stats.salesOrders.countByStatus[status] = Array.from(this.salesOrders.values()).filter(o => o.status === status).length;
      }

      // 计算平均订单金额
      if (stats.purchaseOrders.totalCount > 0) {
        stats.purchaseOrders.avgOrderAmount = stats.purchaseOrders.totalAmount / stats.purchaseOrders.totalCount;
      }

      if (stats.salesOrders.totalCount > 0) {
        stats.salesOrders.avgOrderAmount = stats.salesOrders.totalAmount / stats.salesOrders.totalCount;
      }

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to get order statistics', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取订单统计失败'
      };
    }
  }
}