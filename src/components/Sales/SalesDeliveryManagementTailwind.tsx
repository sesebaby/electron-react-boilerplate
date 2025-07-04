import React, { useState, useEffect } from 'react';
import { salesDeliveryService, salesOrderService, customerService, warehouseService, productService } from '../../services/business';
import { SalesDelivery, SalesDeliveryItem, DeliveryStatus, SalesOrder, SalesOrderStatus, Customer, Warehouse, Product } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface SalesDeliveryManagementProps {
  className?: string;
}

interface DeliveryForm {
  orderId: string;
  customerId: string;
  warehouseId: string;
  deliveryDate: string;
  status: DeliveryStatus;
  deliveryPerson: string;
  remark: string;
}

interface DeliveryItemForm {
  id: string;
  productId: string;
  orderItemId: string;
  quantity: number;
  unitPrice: number;
}

const emptyForm: DeliveryForm = {
  orderId: '',
  customerId: '',
  warehouseId: '',
  deliveryDate: new Date().toISOString().split('T')[0],
  status: DeliveryStatus.DRAFT,
  deliveryPerson: '',
  remark: ''
};

const emptyItem: Omit<DeliveryItemForm, 'id'> = {
  productId: '',
  orderItemId: '',
  quantity: 0,
  unitPrice: 0
};

export const SalesDeliveryManagementTailwind: React.FC<SalesDeliveryManagementProps> = ({ className }) => {
  const [deliveries, setDeliveries] = useState<SalesDelivery[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<SalesDelivery | null>(null);
  const [formData, setFormData] = useState<DeliveryForm>(emptyForm);
  const [formItems, setFormItems] = useState<DeliveryItemForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [availableOrderItems, setAvailableOrderItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [deliveriesData, ordersData, customersData, warehousesData, productsData, statsData] = await Promise.all([
        salesDeliveryService.findAll(),
        salesOrderService.findAll(),
        customerService.findAll(),
        warehouseService.findAll(),
        productService.findAll(),
        salesDeliveryService.getDeliveryStats()
      ]);
      
      setDeliveries(deliveriesData);
      setOrders(ordersData);
      setCustomers(customersData);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setStats(statsData);
    } catch (err) {
      setError('加载销售出库数据失败');
      console.error('Failed to load sales delivery data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrderItems = async (orderId: string) => {
    if (!orderId) {
      setAvailableOrderItems([]);
      return;
    }

    try {
      const orderItems = await salesOrderService.getOrderItems(orderId);
      setAvailableOrderItems(orderItems);
    } catch (err) {
      console.error('Failed to load order items:', err);
      setAvailableOrderItems([]);
    }
  };

  const handleOrderChange = async (orderId: string) => {
    handleInputChange('orderId', orderId);
    
    if (orderId) {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        handleInputChange('customerId', order.customerId);
        await loadOrderItems(orderId);
      }
    } else {
      setAvailableOrderItems([]);
      setFormItems([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formItems.length === 0) {
      setError('请至少添加一个出库项目');
      return;
    }

    // 验证所有项目
    for (const item of formItems) {
      if (!item.productId || !item.orderItemId || item.quantity <= 0 || item.unitPrice <= 0) {
        setError('请完整填写所有出库项目信息');
        return;
      }
    }
    
    try {
      let delivery: SalesDelivery;
      
      if (editingDelivery) {
        // 更新出库单
        delivery = await salesDeliveryService.update(editingDelivery.id, {
          ...formData,
          deliveryDate: new Date(formData.deliveryDate)
        });
        
        // 更新出库项目（简化：删除所有重新添加）
        const existingItems = await salesDeliveryService.getDeliveryItems(editingDelivery.id);
        for (const item of existingItems) {
          await salesDeliveryService.removeDeliveryItem(item.id);
        }
      } else {
        // 创建新出库单
        delivery = await salesDeliveryService.create({
          ...formData,
          deliveryDate: new Date(formData.deliveryDate)
        });
      }
      
      // 添加出库项目
      for (const itemData of formItems) {
        await salesDeliveryService.addDeliveryItem(delivery.id, {
          productId: itemData.productId,
          orderItemId: itemData.orderItemId,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice
        });
      }
      
      await loadData();
      setShowForm(false);
      setEditingDelivery(null);
      setFormData(emptyForm);
      setFormItems([]);
      setAvailableOrderItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存销售出库单失败');
      console.error('Failed to save sales delivery:', err);
    }
  };

  const handleEdit = async (delivery: SalesDelivery) => {
    setEditingDelivery(delivery);
    setFormData({
      orderId: delivery.orderId,
      customerId: delivery.customerId,
      warehouseId: delivery.warehouseId,
      deliveryDate: delivery.deliveryDate.toISOString().split('T')[0],
      status: delivery.status,
      deliveryPerson: delivery.deliveryPerson,
      remark: delivery.remark || ''
    });
    
    // 加载订单项目和出库项目
    await loadOrderItems(delivery.orderId);
    const items = await salesDeliveryService.getDeliveryItems(delivery.id);
    setFormItems(items.map(item => ({
      id: item.id,
      productId: item.productId,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice
    })));
    
    setShowForm(true);
  };

  const handleDelete = async (deliveryId: string) => {
    if (!confirm('确定要删除这个销售出库单吗？删除后无法恢复！')) return;
    
    try {
      await salesDeliveryService.delete(deliveryId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除销售出库单失败');
      console.error('Failed to delete sales delivery:', err);
    }
  };

  const handleStatusUpdate = async (deliveryId: string, newStatus: DeliveryStatus) => {
    try {
      await salesDeliveryService.updateStatus(deliveryId, newStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新出库状态失败');
      console.error('Failed to update delivery status:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDelivery(null);
    setFormData(emptyForm);
    setFormItems([]);
    setAvailableOrderItems([]);
  };

  const handleInputChange = (field: keyof DeliveryForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: DeliveryItemForm = {
      ...emptyItem,
      id: Date.now().toString()
    };
    setFormItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setFormItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof DeliveryItemForm, value: any) => {
    setFormItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const getStatusText = (status: DeliveryStatus): string => {
    switch (status) {
      case DeliveryStatus.DRAFT: return '草稿';
      case DeliveryStatus.SHIPPED: return '已发货';
      case DeliveryStatus.COMPLETED: return '已完成';
      default: return status;
    }
  };

  const getStatusStyles = (status: DeliveryStatus): string => {
    switch (status) {
      case DeliveryStatus.DRAFT: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      case DeliveryStatus.SHIPPED: return 'text-orange-300 bg-orange-500/20 border-orange-400/30';
      case DeliveryStatus.COMPLETED: return 'text-green-300 bg-green-500/20 border-green-400/30';
      default: return 'text-white/80';
    }
  };

  const getCustomerName = (customerId: string): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : '未知客户';
  };

  const getWarehouseName = (warehouseId: string): string => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : '未知仓库';
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : '未知商品';
  };

  const getOrderNo = (orderId: string): string => {
    const order = orders.find(o => o.id === orderId);
    return order ? order.orderNo : '未知订单';
  };

  const getTotalAmount = (): number => {
    return formItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const getTotalQuantity = (): number => {
    return formItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = !searchTerm || 
      delivery.deliveryNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(delivery.customerId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getOrderNo(delivery.orderId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || delivery.status === selectedStatus;
    const matchesCustomer = !selectedCustomer || delivery.customerId === selectedCustomer;
    const matchesWarehouse = !selectedWarehouse || delivery.warehouseId === selectedWarehouse;
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesWarehouse;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载销售出库数据中...</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">销售出库管理</h1>
          <p className="text-white/70">管理销售出库单，跟踪商品配送和交付状态</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">📦</span>
          新建出库单
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
                📦
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总出库单数</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-2xl">
                🚚
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.pendingDeliveries}</div>
                <div className="text-white/70 text-sm">待发货</div>
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
                <div className="text-white/70 text-sm">出库总值</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalQuantity}</div>
                <div className="text-white/70 text-sm">出库总量</div>
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
              label="搜索出库单"
              type="text"
              placeholder="搜索出库单号、客户、订单号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="出库状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as DeliveryStatus)}
          >
            <option value="">全部状态</option>
            <option value={DeliveryStatus.DRAFT}>草稿</option>
            <option value={DeliveryStatus.SHIPPED}>已发货</option>
            <option value={DeliveryStatus.COMPLETED}>已完成</option>
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

          <GlassSelect
            label="仓库"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">全部仓库</option>
            {warehouses.map(warehouse => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 出库单列表 */}
      <GlassCard title={`销售出库单列表 (${filteredDeliveries.length})`}>
        {filteredDeliveries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到销售出库单</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的出库单</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              创建第一个出库单
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">出库信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">关联订单</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">客户</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">仓库</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">出库日期</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">出库金额</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map(delivery => (
                  <tr key={delivery.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white mb-1">{delivery.deliveryNo}</div>
                        <div className="text-white/70 text-sm">配送员: {delivery.deliveryPerson}</div>
                        {delivery.remark && (
                          <div className="text-white/60 text-sm max-w-xs truncate" title={delivery.remark}>
                            {delivery.remark}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{getOrderNo(delivery.orderId)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{getCustomerName(delivery.customerId)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80">{getWarehouseName(delivery.warehouseId)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80">{formatDate(delivery.deliveryDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white">¥{delivery.totalAmount.toLocaleString()}</div>
                        <div className="text-white/70 text-sm">{delivery.totalQuantity} 件</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(delivery.status)}`}>
                        {getStatusText(delivery.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(delivery)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {delivery.status === DeliveryStatus.DRAFT && (
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, DeliveryStatus.SHIPPED)}
                            className="px-3 py-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-400/30 rounded hover:bg-orange-500/30 transition-colors"
                            title="确认发货"
                          >
                            🚚
                          </button>
                        )}

                        {delivery.status === DeliveryStatus.SHIPPED && (
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, DeliveryStatus.COMPLETED)}
                            className="px-3 py-1 text-xs bg-green-500/20 text-green-300 border border-green-400/30 rounded hover:bg-green-500/30 transition-colors"
                            title="确认完成"
                          >
                            ✅
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(delivery.id)}
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* 出库单表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingDelivery ? '编辑销售出库单' : '新建销售出库单'}
              </h3>
              <button
                onClick={handleCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 基本信息 */}
              <GlassCard title="基本信息">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <GlassSelect
                    label="关联订单"
                    value={formData.orderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
                    required
                  >
                    <option value="">请选择销售订单</option>
                    {orders.filter(order => order.status === SalesOrderStatus.CONFIRMED || order.status === SalesOrderStatus.SHIPPED).map(order => (
                      <option key={order.id} value={order.id}>
                        {order.orderNo} - {getCustomerName(order.customerId)}
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassInput
                    label="客户"
                    type="text"
                    value={getCustomerName(formData.customerId)}
                    placeholder="选择订单后自动填充"
                    disabled
                  />

                  <GlassSelect
                    label="出库仓库"
                    value={formData.warehouseId}
                    onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                    required
                  >
                    <option value="">请选择仓库</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassInput
                    label="出库日期"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    required
                  />

                  <GlassSelect
                    label="出库状态"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as DeliveryStatus)}
                  >
                    <option value={DeliveryStatus.DRAFT}>草稿</option>
                    <option value={DeliveryStatus.SHIPPED}>已发货</option>
                    <option value={DeliveryStatus.COMPLETED}>已完成</option>
                  </GlassSelect>

                  <GlassInput
                    label="配送员"
                    type="text"
                    value={formData.deliveryPerson}
                    onChange={(e) => handleInputChange('deliveryPerson', e.target.value)}
                    placeholder="配送员姓名"
                    required
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-white/90 text-sm font-medium mb-2">备注说明</label>
                  <textarea
                    value={formData.remark}
                    onChange={(e) => handleInputChange('remark', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                    placeholder="出库备注说明"
                    rows={3}
                  />
                </div>
              </GlassCard>

              {/* 出库项目 */}
              <GlassCard>
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-white">出库项目</h4>
                  <GlassButton
                    type="button"
                    variant="primary"
                    onClick={addItem}
                    disabled={!formData.orderId}
                  >
                    <span className="mr-2">➕</span>
                    添加项目
                  </GlassButton>
                </div>

                {formItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-white mb-2">暂无出库项目</h3>
                    <p className="text-white/70 mb-4">请先选择订单并点击"添加项目"按钮添加</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">商品</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">订单项</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">出库数量</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">单价</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">金额</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[80px]">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.map(item => {
                          const amount = item.quantity * item.unitPrice;
                          return (
                            <tr key={item.id} className="border-b border-white/5">
                              <td className="py-3 px-4">
                                <select
                                  value={item.productId}
                                  onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
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
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={item.orderItemId}
                                  onChange={(e) => {
                                    updateItem(item.id, 'orderItemId', e.target.value);
                                    // 自动填充产品信息
                                    const orderItem = availableOrderItems.find(oi => oi.id === e.target.value);
                                    if (orderItem) {
                                      updateItem(item.id, 'productId', orderItem.productId);
                                      updateItem(item.id, 'unitPrice', orderItem.unitPrice);
                                    }
                                  }}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  required
                                >
                                  <option value="">选择订单项</option>
                                  {availableOrderItems.map(orderItem => (
                                    <option key={orderItem.id} value={orderItem.id}>
                                      {getProductName(orderItem.productId)} - 剩余 {orderItem.quantity - orderItem.deliveredQuantity}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="数量"
                                  required
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="单价"
                                  required
                                />
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-semibold text-white">¥{amount.toFixed(2)}</span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                                  onClick={() => removeItem(item.id)}
                                  title="删除"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </GlassCard>

              {/* 出库汇总 */}
              {formItems.length > 0 && (
                <GlassCard title="出库汇总">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">{formItems.length}</div>
                      <div className="text-white/70 text-sm">出库项目数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">{getTotalQuantity().toFixed(2)}</div>
                      <div className="text-white/70 text-sm">出库总数量</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">¥{getTotalAmount().toFixed(2)}</div>
                      <div className="text-white/70 text-sm">出库总金额</div>
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
                >
                  {editingDelivery ? '更新出库单' : '创建出库单'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDeliveryManagementTailwind;