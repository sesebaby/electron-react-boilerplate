import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { serviceManager } from '../../services/core';
import { SalesOrder, SalesOrderItem, SalesOrderStatus, PaymentStatus, Customer, Product } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';
import ErrorDisplay from '../ui/ErrorDisplay';
import { TableContainer, Table, TableHeader, TableBody, TableCell, TableHead, TableRow, TableEmpty } from '../ui/table';

interface SalesOrderManagementProps {
  className?: string;
}

// 定义订单项验证模式
const orderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, '请选择商品'),
  quantity: z.number().min(1, '数量必须大于0').max(999999, '数量过大'),
  unitPrice: z.number().min(0.01, '单价必须大于0').max(999999.99, '单价过大'),
  discountRate: z.number().min(0, '折扣率不能为负数').max(1, '折扣率不能超过1')
});

// 定义订单表单验证模式
const salesOrderSchema = z.object({
  customerId: z.string().min(1, '请选择客户'),
  orderDate: z.string().min(1, '请选择订单日期'),
  deliveryDate: z.string().min(1, '请选择交货日期'),
  status: z.nativeEnum(SalesOrderStatus),
  paymentStatus: z.nativeEnum(PaymentStatus),
  discountAmount: z.number().min(0, '折扣金额不能为负数').max(999999.99, '折扣金额过大'),
  taxAmount: z.number().min(0, '税额不能为负数').max(999999.99, '税额过大'),
  remark: z.string().max(500, '备注最多500个字符').optional().or(z.literal('')),
  creator: z.string().min(1, '创建人不能为空'),
  items: z.array(orderItemSchema).min(1, '请至少添加一个订单项')
}).refine((data) => {
  const orderDate = new Date(data.orderDate);
  const deliveryDate = new Date(data.deliveryDate);
  return deliveryDate >= orderDate;
}, {
  message: '交货日期不能早于订单日期',
  path: ['deliveryDate']
});

type SalesOrderForm = z.infer<typeof salesOrderSchema>;
type OrderItemForm = z.infer<typeof orderItemSchema>;

interface OrderFormLegacy {
  customerId: string;
  orderDate: string;
  deliveryDate: string;
  status: SalesOrderStatus;
  paymentStatus: PaymentStatus;
  discountAmount: number;
  taxAmount: number;
  remark: string;
  creator: string;
}

interface OrderItemFormLegacy {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
}

const emptyForm: SalesOrderForm = {
  customerId: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7天后
  status: SalesOrderStatus.DRAFT,
  paymentStatus: PaymentStatus.UNPAID,
  discountAmount: 0,
  taxAmount: 0,
  remark: '',
  creator: '销售员',
  items: []
};

const emptyItem: OrderItemForm = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  discountRate: 0
};

export const SalesOrderManagement: React.FC<SalesOrderManagementProps> = ({ className }) => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SalesOrderStatus | ''>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [stats, setStats] = useState<any>(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    clearErrors,
    control
  } = useForm<SalesOrderForm>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: emptyForm,
    mode: 'onBlur'
  });

  // 使用useFieldArray管理动态订单项
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items'
  });

  const formData = watch(); // 监听表单数据变化

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersResult, customersResult, productsResult, statsResult] = await Promise.all([
        salesOrderService.findAll(),
        customerService.findAll(),
        productService.findAll(),
        salesOrderService.getOrderStats()
      ]);

      const ordersData = ordersResult.success ? 
        (Array.isArray(ordersResult.data) ? ordersResult.data : ordersResult.data?.items || []) : [];
      const customersData = customersResult.success ? 
        (Array.isArray(customersResult.data) ? customersResult.data : customersResult.data?.items || []) : [];
      const productsData = productsResult.success ? 
        (Array.isArray(productsResult.data) ? productsResult.data : productsResult.data?.items || []) : [];
      const statsData = statsResult.success ? (statsResult.data || {}) : {};

      setOrders((Array.isArray(ordersData) ? ordersData : []) as SalesOrder[]);
      setCustomers((Array.isArray(customersData) ? customersData : []) as Customer[]);
      setProducts((Array.isArray(productsData) ? productsData : []) as Product[]);
      setStats(statsData);
    } catch (err) {
      setError('加载销售订单数据失败');
      console.error('Failed to load sales order data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SalesOrderForm) => {
    try {
      // 处理订单数据
      const orderData = {
        ...data,
        orderDate: new Date(data.orderDate),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        remark: data.remark || undefined
      };
      
      // 从 orderData 中移除 items 字段，因为 API 不需要这个字段
      const { items, ...orderFields } = orderData;
      
      let order: SalesOrder;
      
      if (editingOrder) {
        // 更新订单
        const orderResult = await salesOrderService.update(editingOrder.id, orderFields);
        if (!orderResult.success) {
          setError(orderResult.error || '更新订单失败');
          return;
        }
        order = orderResult.data as SalesOrder;

        // 更新订单项目（简化：删除所有重新添加）
        const existingItemsResult = await salesOrderService.getOrderItems(editingOrder.id);
        const existingItems = existingItemsResult.success ? (existingItemsResult.data || []) : [];
        for (const item of existingItems) {
          await salesOrderService.removeOrderItem(item.id);
        }
      } else {
        // 创建新订单
        const createResult = await salesOrderService.create(orderFields);
        if (!createResult.success) {
          throw new Error(createResult.error || '创建订单失败');
        }
        order = createResult.data as SalesOrder;
      }
      
      // 添加订单项目
      for (const itemData of data.items) {
        await salesOrderService.addOrderItem(order.id, {
          productId: itemData.productId,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          discountRate: itemData.discountRate,
          deliveredQuantity: 0
        });
      }
      
      await loadData();
      setShowForm(false);
      setEditingOrder(null);
      reset(emptyForm);
      clearErrors();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存销售订单失败');
      console.error('Failed to save sales order:', err);
    }
  };

  const handleEdit = async (order: SalesOrder) => {
    setEditingOrder(order);
    
    // 加载订单项目
    const itemsResult = await salesOrderService.getOrderItems(order.id);
    const items = itemsResult.success ? (itemsResult.data || []) : [];

    reset({
      customerId: order.customerId,
      orderDate: order.orderDate.toISOString().split('T')[0],
      deliveryDate: order.deliveryDate?.toISOString().split('T')[0] || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      remark: order.remark || '',
      creator: order.creator,
      items: items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate
      }))
    });
    
    clearErrors();
    setShowForm(true);
  };

  const handleDelete = (orderId: string) => {
    setDeleteTargetId(orderId);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await salesOrderService.delete(deleteTargetId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除销售订单失败');
      console.error('Failed to delete sales order:', err);
    } finally {
      setShowConfirmDialog(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setDeleteTargetId(null);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: SalesOrderStatus) => {
    try {
      await salesOrderService.updateStatus(orderId, newStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新订单状态失败');
      console.error('Failed to update order status:', err);
    }
  };

  const handlePaymentStatusUpdate = async (orderId: string, newPaymentStatus: PaymentStatus) => {
    try {
      await salesOrderService.updatePaymentStatus(orderId, newPaymentStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新付款状态失败');
      console.error('Failed to update payment status:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrder(null);
    reset(emptyForm);
    clearErrors();
    setError(null); // 清除错误信息
  };

  const handleCreateNew = () => {
    reset(emptyForm);
    clearErrors();
    setShowForm(true);
  };

  // 添加订单项
  const addOrderItem = () => {
    append(emptyItem);
  };

  // 删除订单项
  const removeOrderItem = (index: number) => {
    remove(index);
  };

  // 获取商品信息并更新价格
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.unitPrice`, product.salePrice);
    }
  };


  const getStatusText = (status: SalesOrderStatus): string => {
    switch (status) {
      case SalesOrderStatus.DRAFT: return '草稿';
      case SalesOrderStatus.CONFIRMED: return '已确认';
      case SalesOrderStatus.SHIPPED: return '已发货';
      case SalesOrderStatus.COMPLETED: return '已完成';
      case SalesOrderStatus.CANCELLED: return '已取消';
      default: return status;
    }
  };

  const getPaymentStatusText = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.UNPAID: return '未付款';
      case PaymentStatus.PARTIAL: return '部分付款';
      case PaymentStatus.PAID: return '已付款';
      default: return status;
    }
  };

  const getStatusStyles = (status: SalesOrderStatus): string => {
    switch (status) {
      case SalesOrderStatus.DRAFT: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      case SalesOrderStatus.CONFIRMED: return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      case SalesOrderStatus.SHIPPED: return 'text-orange-300 bg-orange-500/20 border-orange-400/30';
      case SalesOrderStatus.COMPLETED: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case SalesOrderStatus.CANCELLED: return 'text-red-300 bg-red-500/20 border-red-400/30';
      default: return 'text-white/80';
    }
  };

  const getPaymentStatusStyles = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.UNPAID: return 'text-red-300 bg-red-500/20 border-red-400/30';
      case PaymentStatus.PARTIAL: return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case PaymentStatus.PAID: return 'text-green-300 bg-green-500/20 border-green-400/30';
      default: return 'text-white/80';
    }
  };

  const getCustomerName = (customerId: string): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : '未知客户';
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : '未知商品';
  };

  const getTotalItemAmount = (): number => {
    return formData.items.reduce((sum, item) => {
      const amount = item.quantity * item.unitPrice * (1 - item.discountRate);
      return sum + amount;
    }, 0);
  };

  const getFinalAmount = (): number => {
    return getTotalItemAmount() - formData.discountAmount + formData.taxAmount;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const isOverdue = (order: SalesOrder): boolean => {
    if (!order.deliveryDate) return false;
    const now = new Date();
    return order.deliveryDate < now && 
           (order.status === SalesOrderStatus.CONFIRMED || order.status === SalesOrderStatus.SHIPPED);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || order.status === selectedStatus;
    const matchesPaymentStatus = !selectedPaymentStatus || order.paymentStatus === selectedPaymentStatus;
    const matchesCustomer = !selectedCustomer || order.customerId === selectedCustomer;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesCustomer;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载销售订单数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">销售订单管理</h1>
          <p className="text-white/70">创建、管理和跟踪销售订单，控制销售流程</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">📄</span>
          新建销售订单
        </GlassButton>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl">❌</span>
          <span className="text-red-300 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-300 hover:text-red-200 w-6 h-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                📄
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总订单数</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.pendingOrders}</div>
                <div className="text-white/70 text-sm">待处理订单</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <div className="text-2xl font-bold text-white">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
                <div className="text-white/70 text-sm">订单总值</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.overdueOrders}</div>
                <div className="text-white/70 text-sm">逾期订单</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/50">🔍</span>
            </div>
            <GlassInput
              label="搜索订单"
              type="text"
              placeholder="搜索订单号、客户、备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="订单状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as SalesOrderStatus)}
          >
            <option value="">全部状态</option>
            <option value={SalesOrderStatus.DRAFT}>草稿</option>
            <option value={SalesOrderStatus.CONFIRMED}>已确认</option>
            <option value={SalesOrderStatus.SHIPPED}>已发货</option>
            <option value={SalesOrderStatus.COMPLETED}>已完成</option>
            <option value={SalesOrderStatus.CANCELLED}>已取消</option>
          </GlassSelect>

          <GlassSelect
            label="付款状态"
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
          >
            <option value="">全部状态</option>
            <option value={PaymentStatus.UNPAID}>未付款</option>
            <option value={PaymentStatus.PARTIAL}>部分付款</option>
            <option value={PaymentStatus.PAID}>已付款</option>
          </GlassSelect>

          <GlassSelect
            label="客户"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          >
            <option value="">全部客户</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 订单列表 */}
      <GlassCard title={`销售订单列表 (${filteredOrders.length})`}>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到销售订单</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的销售订单</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              创建第一个订单
            </GlassButton>
          </div>
        ) : (
          <TableContainer className="min-w-[1200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">订单信息</TableHead>
                  <TableHead className="min-w-[150px]">客户</TableHead>
                  <TableHead className="min-w-[100px]">订单日期</TableHead>
                  <TableHead className="min-w-[100px]">交货日期</TableHead>
                  <TableHead className="min-w-[120px]">订单金额</TableHead>
                  <TableHead className="min-w-[100px]">状态</TableHead>
                  <TableHead className="min-w-[100px]">付款状态</TableHead>
                  <TableHead className="min-w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id} className={`${isOverdue(order) ? 'bg-red-500/10' : ''}`}>
                    <TableCell className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white mb-1">{order.orderNo}</div>
                        <div className="text-white/70 text-sm">创建人: {order.creator}</div>
                        {order.remark && (
                          <div className="text-white/60 text-sm max-w-xs truncate" title={order.remark}>
                            {order.remark}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="text-white">{getCustomerName(order.customerId)}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="text-white/80">{formatDate(order.orderDate)}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {order.deliveryDate ? (
                        <div className={`text-white/80 ${isOverdue(order) ? 'text-red-300' : ''}`}>
                          {formatDate(order.deliveryDate)}
                          {isOverdue(order) && <span className="ml-1">⚠️</span>}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white">¥{order.finalAmount.toLocaleString()}</div>
                        {order.items && order.items.length > 0 && (
                          <div className="text-white/70 text-sm">{order.items.length} 个项目</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getPaymentStatusStyles(order.paymentStatus)}`}>
                        {getPaymentStatusText(order.paymentStatus)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => handleEdit(order)}
                          className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {order.status === SalesOrderStatus.DRAFT && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.CONFIRMED)}
                            className="px-2 py-1 text-xs bg-green-500/20 text-green-300 border border-green-400/30 rounded hover:bg-green-500/30 transition-colors"
                            title="确认订单"
                          >
                            ✅
                          </button>
                        )}

                        {order.status === SalesOrderStatus.CONFIRMED && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.SHIPPED)}
                            className="px-2 py-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded hover:bg-orange-500/30 transition-colors"
                            title="标记发货"
                          >
                            🚚
                          </button>
                        )}
                        
                        {(order.status === SalesOrderStatus.DRAFT || order.status === SalesOrderStatus.CONFIRMED) && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.CANCELLED)}
                            className="px-2 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                            title="取消订单"
                          >
                            ❌
                          </button>
                        )}

                        {order.paymentStatus !== PaymentStatus.PAID && (
                          <button
                            onClick={() => handlePaymentStatusUpdate(order.id, 
                              order.paymentStatus === PaymentStatus.UNPAID ? PaymentStatus.PARTIAL : PaymentStatus.PAID
                            )}
                            className="px-2 py-1 text-xs bg-green-500/20 text-green-300 border border-green-400/30 rounded hover:bg-green-500/30 transition-colors"
                            title="更新付款状态"
                          >
                            💰
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </GlassCard>

      {/* 订单表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
          <div className="glass-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingOrder ? '编辑销售订单' : '新建销售订单'}
              </h3>
              <button
                onClick={handleCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 错误信息显示 */}
              {error && (
                <ErrorDisplay
                  error={new Error(error)}
                  variant="inline"
                  onClear={() => setError(null)}
                />
              )}

              {/* 基本信息 */}
              <GlassCard title="基本信息">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <GlassSelect
                    label="客户"
                    register={register('customerId')}
                    error={errors.customerId?.message}
                    required
                  >
                    <option value="">请选择客户</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.code})
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassInput
                    label="订单日期"
                    type="date"
                    register={register('orderDate')}
                    error={errors.orderDate?.message}
                    required
                  />

                  <GlassInput
                    label="交货日期"
                    type="date"
                    register={register('deliveryDate')}
                    error={errors.deliveryDate?.message}
                  />

                  <GlassSelect
                    label="订单状态"
                    register={register('status')}
                    error={errors.status?.message}
                  >
                    <option value={SalesOrderStatus.DRAFT}>草稿</option>
                    <option value={SalesOrderStatus.CONFIRMED}>已确认</option>
                    <option value={SalesOrderStatus.CANCELLED}>已取消</option>
                  </GlassSelect>

                  <GlassSelect
                    label="付款状态"
                    register={register('paymentStatus')}
                    error={errors.paymentStatus?.message}
                  >
                    <option value={PaymentStatus.UNPAID}>未付款</option>
                    <option value={PaymentStatus.PARTIAL}>部分付款</option>
                    <option value={PaymentStatus.PAID}>已付款</option>
                  </GlassSelect>

                  <GlassInput
                    label="订单折扣"
                    type="number"
                    min="0"
                    step="0.01"
                    register={register('discountAmount', {
                      setValueAs: (value) => parseFloat(value) || 0
                    })}
                    error={errors.discountAmount?.message}
                    placeholder="0.00"
                  />

                  <GlassInput
                    label="税费"
                    type="number"
                    min="0"
                    step="0.01"
                    register={register('taxAmount', {
                      setValueAs: (value) => parseFloat(value) || 0
                    })}
                    error={errors.taxAmount?.message}
                    placeholder="0.00"
                  />

                  <GlassInput
                    label="创建人"
                    type="text"
                    register={register('creator')}
                    error={errors.creator?.message}
                    placeholder="创建人姓名"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-white/90 text-sm font-medium mb-2">备注说明</label>
                  <textarea
                    {...register('remark')}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                    placeholder="订单备注说明"
                    rows={3}
                  />
                  {errors.remark && (
                    <p className="text-sm text-red-400 mt-1">{errors.remark.message}</p>
                  )}
                </div>
              </GlassCard>

              {/* 订单项目 */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-white">订单项目</h4>
                  <GlassButton
                    type="button"
                    variant="primary"
                    onClick={addOrderItem}
                  >
                    <span className="mr-2">➕</span>
                    添加项目
                  </GlassButton>
                </div>

                {fields.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-white mb-2">暂无订单项目</h3>
                    <p className="text-white/70 mb-4">请点击"添加项目"按钮添加</p>
                  </div>
                ) : (
                  <TableContainer className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">商品</TableHead>
                          <TableHead className="min-w-[100px]">数量</TableHead>
                          <TableHead className="min-w-[100px]">单价</TableHead>
                          <TableHead className="min-w-[100px]">折扣率</TableHead>
                          <TableHead className="min-w-[100px]">金额</TableHead>
                          <TableHead className="min-w-[80px]">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const item = formData.items[index];
                          const amount = item ? item.quantity * item.unitPrice * (1 - item.discountRate) : 0;
                          return (
                            <TableRow key={field.id}>
                              <TableCell className="py-3 px-4">
                                <select
                                  {...register(`items.${index}.productId`)}
                                  onChange={(e) => handleProductChange(index, e.target.value)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  required
                                >
                                  <option value="">选择商品</option>
                                  {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                      {product.name} ({product.sku})
                                    </option>
                                  ))}
                                </select>
                                {errors.items?.[index]?.productId && (
                                  <p className="text-sm text-red-400 mt-1">{errors.items[index]?.productId?.message}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  {...register(`items.${index}.quantity`, {
                                    setValueAs: (value) => parseInt(value) || 1
                                  })}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="数量"
                                  required
                                />
                                {errors.items?.[index]?.quantity && (
                                  <p className="text-sm text-red-400 mt-1">{errors.items[index]?.quantity?.message}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  {...register(`items.${index}.unitPrice`, {
                                    setValueAs: (value) => parseFloat(value) || 0
                                  })}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="单价"
                                  required
                                />
                                {errors.items?.[index]?.unitPrice && (
                                  <p className="text-sm text-red-400 mt-1">{errors.items[index]?.unitPrice?.message}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  {...register(`items.${index}.discountRate`, {
                                    setValueAs: (value) => parseFloat(value) || 0
                                  })}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="0.00"
                                />
                                {errors.items?.[index]?.discountRate && (
                                  <p className="text-sm text-red-400 mt-1">{errors.items[index]?.discountRate?.message}</p>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="font-semibold text-white">¥{amount.toFixed(2)}</span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <button
                                  type="button"
                                  className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                                  onClick={() => removeOrderItem(index)}
                                  title="删除"
                                >
                                  🗑️
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </GlassCard>

              {/* 订单汇总 */}
              {fields.length > 0 && (
                <GlassCard title="订单汇总">
                  <div className="space-y-3">
                    <div className="flex justify-between text-white/80">
                      <span>项目小计：</span>
                      <span>¥{getTotalItemAmount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>订单折扣：</span>
                      <span>-¥{formData.discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white/80">
                      <span>税费：</span>
                      <span>+¥{formData.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold text-lg border-t border-white/20 pt-3">
                      <span>订单总额：</span>
                      <span>¥{getFinalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </GlassCard>
              )}

              <div className="flex gap-4 pt-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  取消
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                >
                  {editingOrder ? '更新订单' : '创建订单'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="删除销售订单"
        message="确定要删除这个销售订单吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default SalesOrderManagement;