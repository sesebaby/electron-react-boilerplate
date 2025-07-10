import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseOrderService, supplierService, productService } from '../../services/business';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier, Product } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';
import ErrorDisplay from '../ui/ErrorDisplay';
import { TableContainer, Table, TableHeader, TableBody, TableCell, TableHead, TableRow, TableEmpty } from '../ui/table';

interface PurchaseOrderManagementProps {
  className?: string;
}

// 定义订单项验证模式
const orderItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, '请选择商品'),
  quantity: z.number().min(0.01, '数量必须大于0').max(999999, '数量过大'),
  unitPrice: z.number().min(0.01, '单价必须大于0').max(999999.99, '单价过大'),
  discountRate: z.number().min(0, '折扣率不能为负数').max(1, '折扣率不能超过1')
});

// 定义订单表单验证模式
const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, '请选择供应商'),
  orderDate: z.string().min(1, '请选择订单日期'),
  expectedDate: z.string().min(1, '请选择预计到货日期'),
  status: z.nativeEnum(PurchaseOrderStatus),
  discountAmount: z.number().min(0, '折扣金额不能为负数').max(999999.99, '折扣金额过大'),
  taxAmount: z.number().min(0, '税额不能为负数').max(999999.99, '税额过大'),
  remark: z.string().max(500, '备注最多500个字符').optional().or(z.literal('')),
  creator: z.string().min(1, '创建人不能为空'),
  items: z.array(orderItemSchema).min(1, '请至少添加一个采购项目')
}).refine((data) => {
  const orderDate = new Date(data.orderDate);
  const expectedDate = new Date(data.expectedDate);
  return expectedDate >= orderDate;
}, {
  message: '预计到货日期不能早于订单日期',
  path: ['expectedDate']
});

type PurchaseOrderForm = z.infer<typeof purchaseOrderSchema>;
type OrderItemForm = z.infer<typeof orderItemSchema>;

interface OrderFormLegacy {
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  status: PurchaseOrderStatus;
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

const emptyForm: PurchaseOrderForm = {
  supplierId: '',
  orderDate: new Date().toISOString().split('T')[0],
  expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7天后
  status: PurchaseOrderStatus.DRAFT,
  discountAmount: 0,
  taxAmount: 0,
  remark: '',
  creator: '系统管理员',
  items: []
};

const emptyItem: OrderItemForm = {
  productId: '',
  quantity: 1,
  unitPrice: 0,
  discountRate: 0
};

export const PurchaseOrderManagement: React.FC<PurchaseOrderManagementProps> = ({ className }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PurchaseOrderStatus | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
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
  } = useForm<PurchaseOrderForm>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: emptyForm,
    mode: 'onBlur'
  });

  // useFieldArray for dynamic order items
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

  const loadData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);

      const [ordersData, suppliersData, productsData, statsData] = await Promise.all([
        purchaseOrderService.findAll(),
        supplierService.findAll(),
        productService.findAll(),
        purchaseOrderService.getOrderStats()
      ]);

      setOrders(ordersData);
      setSuppliers(suppliersData);
      setProducts(productsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load purchase order data:', err);

      // 提供更友好的错误信息和重试机制
      if (retryCount < 2) {
        // 自动重试最多2次
        setTimeout(() => loadData(retryCount + 1), 1000 * (retryCount + 1));
        setError(`数据加载失败，正在重试... (${retryCount + 1}/2)`);
      } else {
        setError('数据加载失败，请检查网络连接后点击重试按钮');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PurchaseOrderForm) => {
    try {
      setError(null);
      
      let order: PurchaseOrder;
      
      if (editingOrder) {
        // 更新订单
        order = await purchaseOrderService.update(editingOrder.id, {
          supplierId: data.supplierId,
          orderDate: new Date(data.orderDate),
          expectedDate: new Date(data.expectedDate),
          status: data.status,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          remark: data.remark || undefined,
          creator: data.creator
        });
        
        // 更新订单项目（简化：删除所有重新添加）
        const existingItems = await purchaseOrderService.getOrderItems(editingOrder.id);
        for (const item of existingItems) {
          await purchaseOrderService.removeOrderItem(item.id, editingOrder.id);
        }
      } else {
        // 创建新订单
        order = await purchaseOrderService.create({
          supplierId: data.supplierId,
          orderDate: new Date(data.orderDate),
          expectedDate: new Date(data.expectedDate),
          status: data.status,
          discountAmount: data.discountAmount,
          taxAmount: data.taxAmount,
          remark: data.remark || undefined,
          creator: data.creator
        });
      }
      
      // 添加订单项目
      for (const itemData of data.items) {
        await purchaseOrderService.addOrderItem(order.id, {
          productId: itemData.productId,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice,
          discountRate: itemData.discountRate,
          receivedQuantity: 0
        });
      }
      
      await loadData();
      setShowForm(false);
      setEditingOrder(null);
      reset(emptyForm);
      clearErrors();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存采购订单失败');
      console.error('Failed to save purchase order:', err);
    }
  };

  const handleEdit = async (order: PurchaseOrder) => {
    setEditingOrder(order);
    
    // 加载订单项目
    const items = (await purchaseOrderService.getOrderItems(order.id)) as any[];
    
    reset({
      supplierId: order.supplierId,
      orderDate: order.orderDate.toISOString().split('T')[0],
      expectedDate: order.expectedDate?.toISOString().split('T')[0] || '',
      status: order.status,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      remark: order.remark || '',
      creator: order.creator,
      items: items.map(item => ({
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
      await purchaseOrderService.delete(deleteTargetId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除采购订单失败');
      console.error('Failed to delete purchase order:', err);
    } finally {
      setShowConfirmDialog(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setDeleteTargetId(null);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: PurchaseOrderStatus) => {
    try {
      await purchaseOrderService.updateStatus(orderId, newStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新订单状态失败');
      console.error('Failed to update order status:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingOrder(null);
    reset(emptyForm);
    clearErrors();
    setError(null); // 清除错误信息
  };

  const addItem = () => {
    append(emptyItem);
  };

  const removeItem = (index: number) => {
    remove(index);
  };

  const handleCreateNew = () => {
    reset(emptyForm);
    clearErrors();
    setShowForm(true);
  };

  const getStatusText = (status: PurchaseOrderStatus): string => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT: return '草稿';
      case PurchaseOrderStatus.CONFIRMED: return '已确认';
      case PurchaseOrderStatus.PARTIAL: return '部分收货';
      case PurchaseOrderStatus.COMPLETED: return '已完成';
      case PurchaseOrderStatus.CANCELLED: return '已取消';
      default: return status;
    }
  };

  const getStatusStyles = (status: PurchaseOrderStatus): string => {
    switch (status) {
      case PurchaseOrderStatus.DRAFT: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      case PurchaseOrderStatus.CONFIRMED: return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      case PurchaseOrderStatus.PARTIAL: return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case PurchaseOrderStatus.COMPLETED: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case PurchaseOrderStatus.CANCELLED: return 'text-red-300 bg-red-500/20 border-red-400/30';
      default: return 'text-white/80';
    }
  };

  const getSupplierName = (supplierId: string): string => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : '未知供应商';
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

  const isOverdue = (order: PurchaseOrder): boolean => {
    if (!order.expectedDate) return false;
    const now = new Date();
    return order.expectedDate < now && 
           (order.status === PurchaseOrderStatus.CONFIRMED || order.status === PurchaseOrderStatus.PARTIAL);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || order.status === selectedStatus;
    const matchesSupplier = !selectedSupplier || order.supplierId === selectedSupplier;
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载采购订单数据中...</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">采购订单管理</h1>
          <p className="text-white/70">创建、管理和跟踪采购订单，控制采购流程</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleCreateNew}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">➕</span>
          新建采购订单
        </GlassButton>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl">❌</span>
          <span className="text-red-300 flex-1">{error}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => loadData()}
              className="px-3 py-1 text-xs bg-red-500/30 text-red-200 border border-red-400/50 rounded hover:bg-red-500/40 transition-colors"
            >
              重试
            </button>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-300 hover:text-red-200 w-6 h-6 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                📋
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/50">🔍</span>
            </div>
            <GlassInput
              label="搜索订单"
              type="text"
              placeholder="搜索订单号、供应商、备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="订单状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as PurchaseOrderStatus)}
          >
            <option value="">全部状态</option>
            <option value={PurchaseOrderStatus.DRAFT}>草稿</option>
            <option value={PurchaseOrderStatus.CONFIRMED}>已确认</option>
            <option value={PurchaseOrderStatus.PARTIAL}>部分收货</option>
            <option value={PurchaseOrderStatus.COMPLETED}>已完成</option>
            <option value={PurchaseOrderStatus.CANCELLED}>已取消</option>
          </GlassSelect>

          <GlassSelect
            label="供应商"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            <option value="">全部供应商</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 订单列表 */}
      <GlassCard title={`采购订单列表 (${filteredOrders.length})`}>
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到采购订单</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的采购订单</p>
            <GlassButton variant="primary" onClick={handleCreateNew}>
              创建第一个订单
            </GlassButton>
          </div>
        ) : (
          <TableContainer className="min-w-[1000px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">订单信息</TableHead>
                  <TableHead className="min-w-[150px]">供应商</TableHead>
                  <TableHead className="min-w-[100px]">订单日期</TableHead>
                  <TableHead className="min-w-[100px]">预计到货</TableHead>
                  <TableHead className="min-w-[120px]">订单金额</TableHead>
                  <TableHead className="min-w-[100px]">状态</TableHead>
                  <TableHead className="min-w-[150px]">操作</TableHead>
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
                      <div className="text-white">{getSupplierName(order.supplierId)}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="text-white/80">{formatDate(order.orderDate)}</div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {order.expectedDate ? (
                        <div className={`text-white/80 ${isOverdue(order) ? 'text-red-300' : ''}`}>
                          {formatDate(order.expectedDate)}
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(order)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {order.status === PurchaseOrderStatus.DRAFT && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, PurchaseOrderStatus.CONFIRMED)}
                            className="px-3 py-1 text-xs bg-green-500/20 text-green-300 border border-green-400/30 rounded hover:bg-green-500/30 transition-colors"
                            title="确认订单"
                          >
                            ✅
                          </button>
                        )}
                        
                        {(order.status === PurchaseOrderStatus.DRAFT || order.status === PurchaseOrderStatus.CONFIRMED) && (
                          <button
                            onClick={() => handleStatusUpdate(order.id, PurchaseOrderStatus.CANCELLED)}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                            title="取消订单"
                          >
                            ❌
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-2 sm:p-4">
          <div className="glass-card w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* 弹出窗口头部 - 固定不滚动 */}
            <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {editingOrder ? '编辑采购订单' : '新建采购订单'}
              </h3>
              <button
                onClick={handleCancel}
                className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white touch-manipulation"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {/* 弹出窗口内容 - 可滚动区域 */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
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
                    label="供应商"
                    register={register('supplierId')}
                    error={errors.supplierId?.message}
                    required
                  >
                    <option value="">请选择供应商</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
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
                    label="预计到货日期"
                    type="date"
                    register={register('expectedDate')}
                    error={errors.expectedDate?.message}
                    required
                  />

                  <GlassSelect
                    label="订单状态"
                    register={register('status')}
                    error={errors.status?.message}
                  >
                    <option value={PurchaseOrderStatus.DRAFT}>草稿</option>
                    <option value={PurchaseOrderStatus.CONFIRMED}>已确认</option>
                    <option value={PurchaseOrderStatus.CANCELLED}>已取消</option>
                  </GlassSelect>

                  <GlassInput
                    label="订单折散"
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
                    onClick={addItem}
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
                          const itemData = formData.items[index];
                          const amount = itemData ? itemData.quantity * itemData.unitPrice * (1 - itemData.discountRate) : 0;
                          return (
                            <TableRow key={field.id}>
                              <TableCell className="py-3 px-4">
                                <select
                                  {...register(`items.${index}.productId` as const)}
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
                                  min="0.01"
                                  step="0.01"
                                  {...register(`items.${index}.quantity` as const, {
                                    setValueAs: (value) => parseFloat(value) || 0
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
                                  {...register(`items.${index}.unitPrice` as const, {
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
                                  {...register(`items.${index}.discountRate` as const, {
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
                                  onClick={() => removeItem(index)}
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

              </form>
            </div>

            {/* 弹出窗口底部 - 固定不滚动 */}
            <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
              <div className="flex gap-3 sm:gap-4">
                <GlassButton
                  type="button"
                  variant="primary"
                  loading={isSubmitting}
                  className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                  onClick={handleSubmit(onSubmit)}
                >
                  {editingOrder ? '更新订单' : '创建订单'}
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                >
                  取消
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="删除采购订单"
        message="确定要删除这个采购订单吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default PurchaseOrderManagement;