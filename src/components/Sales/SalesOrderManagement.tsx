import React, { useState, useEffect } from 'react';
import { salesOrderService, customerService, productService } from '../../services/business';
import { SalesOrder, SalesOrderItem, SalesOrderStatus, PaymentStatus, Customer, Product } from '../../types/entities';
import './Sales.css';

interface SalesOrderManagementProps {
  className?: string;
}

interface OrderForm {
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

interface OrderItemForm {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
}

const emptyForm: OrderForm = {
  customerId: '',
  orderDate: new Date().toISOString().split('T')[0],
  deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7天后
  status: SalesOrderStatus.DRAFT,
  paymentStatus: PaymentStatus.UNPAID,
  discountAmount: 0,
  taxAmount: 0,
  remark: '',
  creator: '销售员'
};

const emptyItem: Omit<OrderItemForm, 'id'> = {
  productId: '',
  quantity: 0,
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
  const [formData, setFormData] = useState<OrderForm>(emptyForm);
  const [formItems, setFormItems] = useState<OrderItemForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SalesOrderStatus | ''>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<PaymentStatus | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersData, customersData, productsData, statsData] = await Promise.all([
        salesOrderService.findAll(),
        customerService.findAll(),
        productService.findAll(),
        salesOrderService.getOrderStats()
      ]);
      
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
      setStats(statsData);
    } catch (err) {
      setError('加载销售订单数据失败');
      console.error('Failed to load sales order data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formItems.length === 0) {
      setError('请至少添加一个销售项目');
      return;
    }

    // 验证所有项目
    for (const item of formItems) {
      if (!item.productId || item.quantity <= 0 || item.unitPrice <= 0) {
        setError('请完整填写所有销售项目信息');
        return;
      }
    }
    
    try {
      let order: SalesOrder;
      
      if (editingOrder) {
        // 更新订单
        order = await salesOrderService.update(editingOrder.id, {
          ...formData,
          orderDate: new Date(formData.orderDate),
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined
        });
        
        // 更新订单项目（简化：删除所有重新添加）
        const existingItems = await salesOrderService.getOrderItems(editingOrder.id);
        for (const item of existingItems) {
          await salesOrderService.removeOrderItem(item.id);
        }
      } else {
        // 创建新订单
        order = await salesOrderService.create({
          ...formData,
          orderDate: new Date(formData.orderDate),
          deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate) : undefined
        });
      }
      
      // 添加订单项目
      for (const itemData of formItems) {
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
      setFormData(emptyForm);
      setFormItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存销售订单失败');
      console.error('Failed to save sales order:', err);
    }
  };

  const handleEdit = async (order: SalesOrder) => {
    setEditingOrder(order);
    setFormData({
      customerId: order.customerId,
      orderDate: order.orderDate.toISOString().split('T')[0],
      deliveryDate: order.deliveryDate?.toISOString().split('T')[0] || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      discountAmount: order.discountAmount,
      taxAmount: order.taxAmount,
      remark: order.remark || '',
      creator: order.creator
    });
    
    // 加载订单项目
    const items = await salesOrderService.getOrderItems(order.id);
    setFormItems(items.map(item => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountRate: item.discountRate
    })));
    
    setShowForm(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('确定要删除这个销售订单吗？删除后无法恢复！')) return;
    
    try {
      await salesOrderService.delete(orderId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除销售订单失败');
      console.error('Failed to delete sales order:', err);
    }
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
    setFormData(emptyForm);
    setFormItems([]);
  };

  const handleInputChange = (field: keyof OrderForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addItem = () => {
    const newItem: OrderItemForm = {
      ...emptyItem,
      id: Date.now().toString()
    };
    setFormItems(prev => [...prev, newItem]);
  };

  const removeItem = (itemId: string) => {
    setFormItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof OrderItemForm, value: any) => {
    setFormItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
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

  const getStatusClass = (status: SalesOrderStatus): string => {
    switch (status) {
      case SalesOrderStatus.DRAFT: return 'status-draft';
      case SalesOrderStatus.CONFIRMED: return 'status-confirmed';
      case SalesOrderStatus.SHIPPED: return 'status-shipped';
      case SalesOrderStatus.COMPLETED: return 'status-completed';
      case SalesOrderStatus.CANCELLED: return 'status-cancelled';
      default: return '';
    }
  };

  const getPaymentStatusClass = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.UNPAID: return 'payment-status-unpaid';
      case PaymentStatus.PARTIAL: return 'payment-status-partial';
      case PaymentStatus.PAID: return 'payment-status-paid';
      default: return '';
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
    return formItems.reduce((sum, item) => {
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
      <div className={`sales-order-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载销售订单数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`sales-order-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>销售订单管理</h2>
          <p>创建、管理和跟踪销售订单，控制销售流程</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">📄</span>
            新建销售订单
          </button>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="statistics-section">
          <div className="statistics-grid">
            <div className="stat-item total">
              <div className="stat-icon">📄</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总订单数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingOrders}</div>
                <div className="stat-label">待处理订单</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
                <div className="stat-label">订单总值</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.overdueOrders}</div>
                <div className="stat-label">逾期订单</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索订单</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索订单号、客户、备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>订单状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as SalesOrderStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={SalesOrderStatus.DRAFT}>草稿</option>
              <option value={SalesOrderStatus.CONFIRMED}>已确认</option>
              <option value={SalesOrderStatus.SHIPPED}>已发货</option>
              <option value={SalesOrderStatus.COMPLETED}>已完成</option>
              <option value={SalesOrderStatus.CANCELLED}>已取消</option>
            </select>
          </div>

          <div className="filter-group">
            <label>付款状态</label>
            <select
              value={selectedPaymentStatus}
              onChange={(e) => setSelectedPaymentStatus(e.target.value as PaymentStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={PaymentStatus.UNPAID}>未付款</option>
              <option value={PaymentStatus.PARTIAL}>部分付款</option>
              <option value={PaymentStatus.PAID}>已付款</option>
            </select>
          </div>

          <div className="filter-group">
            <label>客户</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="glass-select"
            >
              <option value="">全部客户</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 订单列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>销售订单列表</h3>
          <span className="item-count">共 {filteredOrders.length} 个订单</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>订单信息</th>
                <th>客户</th>
                <th>订单日期</th>
                <th>交货日期</th>
                <th>订单金额</th>
                <th>状态</th>
                <th>付款状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} className={isOverdue(order) ? 'order-overdue' : ''}>
                  <td className="order-info-cell">
                    <div className="order-info">
                      <div className="order-no">{order.orderNo}</div>
                      <div className="order-creator">创建人: {order.creator}</div>
                      {order.remark && (
                        <div className="order-remark">{order.remark}</div>
                      )}
                    </div>
                  </td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <div className="customer-name">{getCustomerName(order.customerId)}</div>
                    </div>
                  </td>
                  <td className="date-cell">
                    {formatDate(order.orderDate)}
                  </td>
                  <td className="date-cell">
                    {order.deliveryDate ? (
                      <div className={isOverdue(order) ? 'date-overdue' : ''}>
                        {formatDate(order.deliveryDate)}
                        {isOverdue(order) && <span className="overdue-indicator">⚠️</span>}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="amount-cell">
                    <div className="amount-info">
                      <div className="final-amount">¥{order.finalAmount.toLocaleString()}</div>
                      {order.items && order.items.length > 0 && (
                        <div className="item-count">{order.items.length} 个项目</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getPaymentStatusClass(order.paymentStatus)}`}>
                      {getPaymentStatusText(order.paymentStatus)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(order)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {order.status === SalesOrderStatus.DRAFT && (
                      <button 
                        className="action-btn confirm"
                        onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.CONFIRMED)}
                        title="确认订单"
                      >
                        ✅
                      </button>
                    )}

                    {order.status === SalesOrderStatus.CONFIRMED && (
                      <button 
                        className="action-btn ship"
                        onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.SHIPPED)}
                        title="标记发货"
                      >
                        🚚
                      </button>
                    )}
                    
                    {(order.status === SalesOrderStatus.DRAFT || order.status === SalesOrderStatus.CONFIRMED) && (
                      <button 
                        className="action-btn cancel"
                        onClick={() => handleStatusUpdate(order.id, SalesOrderStatus.CANCELLED)}
                        title="取消订单"
                      >
                        ❌
                      </button>
                    )}

                    {order.paymentStatus !== PaymentStatus.PAID && (
                      <button 
                        className="action-btn payment"
                        onClick={() => handlePaymentStatusUpdate(order.id, 
                          order.paymentStatus === PaymentStatus.UNPAID ? PaymentStatus.PARTIAL : PaymentStatus.PAID
                        )}
                        title="更新付款状态"
                      >
                        💰
                      </button>
                    )}
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(order.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3>没有找到销售订单</h3>
              <p>请调整搜索条件或创建新的销售订单</p>
            </div>
          )}
        </div>
      </div>

      {/* 订单表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>{editingOrder ? '编辑销售订单' : '新建销售订单'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="sales-order-form">
              {/* 基本信息 */}
              <div className="form-section">
                <h4>基本信息</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>客户 *</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => handleInputChange('customerId', e.target.value)}
                      className="glass-select"
                      required
                    >
                      <option value="">请选择客户</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>订单日期 *</label>
                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) => handleInputChange('orderDate', e.target.value)}
                      className="glass-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>交货日期</label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="glass-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>订单状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as SalesOrderStatus)}
                      className="glass-select"
                    >
                      <option value={SalesOrderStatus.DRAFT}>草稿</option>
                      <option value={SalesOrderStatus.CONFIRMED}>已确认</option>
                      <option value={SalesOrderStatus.CANCELLED}>已取消</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>付款状态</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => handleInputChange('paymentStatus', e.target.value as PaymentStatus)}
                      className="glass-select"
                    >
                      <option value={PaymentStatus.UNPAID}>未付款</option>
                      <option value={PaymentStatus.PARTIAL}>部分付款</option>
                      <option value={PaymentStatus.PAID}>已付款</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>订单折扣</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discountAmount}
                      onChange={(e) => handleInputChange('discountAmount', parseFloat(e.target.value) || 0)}
                      className="glass-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>税费</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.taxAmount}
                      onChange={(e) => handleInputChange('taxAmount', parseFloat(e.target.value) || 0)}
                      className="glass-input"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group">
                    <label>创建人</label>
                    <input
                      type="text"
                      value={formData.creator}
                      onChange={(e) => handleInputChange('creator', e.target.value)}
                      className="glass-input"
                      placeholder="创建人姓名"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>备注说明</label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => handleInputChange('remark', e.target.value)}
                      className="glass-textarea"
                      placeholder="订单备注说明"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* 订单项目 */}
              <div className="form-section">
                <div className="section-header">
                  <h4>订单项目</h4>
                  <button
                    type="button"
                    className="glass-button primary"
                    onClick={addItem}
                  >
                    <span className="button-icon">➕</span>
                    添加项目
                  </button>
                </div>

                {formItems.length === 0 ? (
                  <div className="empty-items">
                    <div className="empty-icon">📦</div>
                    <p>暂无订单项目，请点击"添加项目"按钮添加</p>
                  </div>
                ) : (
                  <div className="items-table-container">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>商品</th>
                          <th>数量</th>
                          <th>单价</th>
                          <th>折扣率</th>
                          <th>金额</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.map(item => {
                          const amount = item.quantity * item.unitPrice * (1 - item.discountRate);
                          return (
                            <tr key={item.id}>
                              <td>
                                <select
                                  value={item.productId}
                                  onChange={(e) => updateItem(item.id, 'productId', e.target.value)}
                                  className="glass-select"
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
                              <td>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="glass-input"
                                  placeholder="数量"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="glass-input"
                                  placeholder="单价"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  value={item.discountRate}
                                  onChange={(e) => updateItem(item.id, 'discountRate', parseFloat(e.target.value) || 0)}
                                  className="glass-input"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="amount-cell">
                                ¥{amount.toFixed(2)}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="action-btn delete"
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
              </div>

              {/* 订单汇总 */}
              {formItems.length > 0 && (
                <div className="form-section">
                  <h4>订单汇总</h4>
                  <div className="order-summary">
                    <div className="summary-row">
                      <span className="summary-label">项目小计：</span>
                      <span className="summary-value">¥{getTotalItemAmount().toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">订单折扣：</span>
                      <span className="summary-value">-¥{formData.discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">税费：</span>
                      <span className="summary-value">+¥{formData.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="summary-row total">
                      <span className="summary-label">订单总额：</span>
                      <span className="summary-value">¥{getFinalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingOrder ? '更新订单' : '创建订单'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrderManagement;