import React, { useState, useEffect } from 'react';
import { salesDeliveryService, salesOrderService, customerService, warehouseService, productService } from '../../services/business';
import { SalesDelivery, SalesDeliveryItem, DeliveryStatus, SalesOrder, SalesOrderStatus, Customer, Warehouse, Product } from '../../types/entities';

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

export const SalesDeliveryManagement: React.FC<SalesDeliveryManagementProps> = ({ className }) => {
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

  const getStatusClass = (status: DeliveryStatus): string => {
    switch (status) {
      case DeliveryStatus.DRAFT: return 'status-draft';
      case DeliveryStatus.SHIPPED: return 'status-shipped';
      case DeliveryStatus.COMPLETED: return 'status-completed';
      default: return '';
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
      <div className={`sales-delivery-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载销售出库数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`sales-delivery-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>销售出库管理</h2>
          <p>管理销售出库单，跟踪商品配送和交付状态</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">📦</span>
            新建出库单
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
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总出库单数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">🚚</div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingDeliveries}</div>
                <div className="stat-label">待发货</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
                <div className="stat-label">出库总值</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalQuantity}</div>
                <div className="stat-label">出库总量</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索出库单</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索出库单号、客户、订单号、备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>出库状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as DeliveryStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={DeliveryStatus.DRAFT}>草稿</option>
              <option value={DeliveryStatus.SHIPPED}>已发货</option>
              <option value={DeliveryStatus.COMPLETED}>已完成</option>
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

          <div className="filter-group">
            <label>仓库</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="glass-select"
            >
              <option value="">全部仓库</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 出库单列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>销售出库单列表</h3>
          <span className="item-count">共 {filteredDeliveries.length} 个出库单</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>出库信息</th>
                <th>关联订单</th>
                <th>客户</th>
                <th>仓库</th>
                <th>出库日期</th>
                <th>出库金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map(delivery => (
                <tr key={delivery.id}>
                  <td className="delivery-info-cell">
                    <div className="delivery-info">
                      <div className="delivery-no">{delivery.deliveryNo}</div>
                      <div className="delivery-person">配送员: {delivery.deliveryPerson}</div>
                      {delivery.remark && (
                        <div className="delivery-remark">{delivery.remark}</div>
                      )}
                    </div>
                  </td>
                  <td className="order-cell">
                    <div className="order-info">
                      <div className="order-no">{getOrderNo(delivery.orderId)}</div>
                    </div>
                  </td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <div className="customer-name">{getCustomerName(delivery.customerId)}</div>
                    </div>
                  </td>
                  <td className="warehouse-cell">
                    <div className="warehouse-info">
                      <div className="warehouse-name">{getWarehouseName(delivery.warehouseId)}</div>
                    </div>
                  </td>
                  <td className="date-cell">
                    {formatDate(delivery.deliveryDate)}
                  </td>
                  <td className="amount-cell">
                    <div className="amount-info">
                      <div className="total-amount">¥{delivery.totalAmount.toLocaleString()}</div>
                      <div className="quantity-info">{delivery.totalQuantity} 件</div>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(delivery.status)}`}>
                      {getStatusText(delivery.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(delivery)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {delivery.status === DeliveryStatus.DRAFT && (
                      <button 
                        className="action-btn confirm"
                        onClick={() => handleStatusUpdate(delivery.id, DeliveryStatus.SHIPPED)}
                        title="确认发货"
                      >
                        🚚
                      </button>
                    )}

                    {delivery.status === DeliveryStatus.SHIPPED && (
                      <button 
                        className="action-btn complete"
                        onClick={() => handleStatusUpdate(delivery.id, DeliveryStatus.COMPLETED)}
                        title="确认完成"
                      >
                        ✅
                      </button>
                    )}
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(delivery.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredDeliveries.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>没有找到销售出库单</h3>
              <p>请调整搜索条件或创建新的出库单</p>
            </div>
          )}
        </div>
      </div>

      {/* 出库单表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>{editingDelivery ? '编辑销售出库单' : '新建销售出库单'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="sales-delivery-form">
              {/* 基本信息 */}
              <div className="form-section">
                <h4>基本信息</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>关联订单 *</label>
                    <select
                      value={formData.orderId}
                      onChange={(e) => handleOrderChange(e.target.value)}
                      className="glass-select"
                      required
                    >
                      <option value="">请选择销售订单</option>
                      {orders.filter(order => order.status === SalesOrderStatus.CONFIRMED || order.status === SalesOrderStatus.SHIPPED).map(order => (
                        <option key={order.id} value={order.id}>
                          {order.orderNo} - {getCustomerName(order.customerId)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>客户</label>
                    <input
                      type="text"
                      value={getCustomerName(formData.customerId)}
                      className="glass-input"
                      disabled
                      placeholder="选择订单后自动填充"
                    />
                  </div>

                  <div className="form-group">
                    <label>出库仓库 *</label>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                      className="glass-select"
                      required
                    >
                      <option value="">请选择仓库</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>出库日期 *</label>
                    <input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                      className="glass-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>出库状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as DeliveryStatus)}
                      className="glass-select"
                    >
                      <option value={DeliveryStatus.DRAFT}>草稿</option>
                      <option value={DeliveryStatus.SHIPPED}>已发货</option>
                      <option value={DeliveryStatus.COMPLETED}>已完成</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>配送员 *</label>
                    <input
                      type="text"
                      value={formData.deliveryPerson}
                      onChange={(e) => handleInputChange('deliveryPerson', e.target.value)}
                      className="glass-input"
                      placeholder="配送员姓名"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>备注说明</label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => handleInputChange('remark', e.target.value)}
                      className="glass-textarea"
                      placeholder="出库备注说明"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* 出库项目 */}
              <div className="form-section">
                <div className="section-header">
                  <h4>出库项目</h4>
                  <button
                    type="button"
                    className="glass-button primary"
                    onClick={addItem}
                    disabled={!formData.orderId}
                  >
                    <span className="button-icon">➕</span>
                    添加项目
                  </button>
                </div>

                {formItems.length === 0 ? (
                  <div className="empty-items">
                    <div className="empty-icon">📦</div>
                    <p>暂无出库项目，请先选择订单并点击"添加项目"按钮添加</p>
                  </div>
                ) : (
                  <div className="items-table-container">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>商品</th>
                          <th>订单项</th>
                          <th>出库数量</th>
                          <th>单价</th>
                          <th>金额</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formItems.map(item => {
                          const amount = item.quantity * item.unitPrice;
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
                                  className="glass-select"
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

              {/* 出库汇总 */}
              {formItems.length > 0 && (
                <div className="form-section">
                  <h4>出库汇总</h4>
                  <div className="order-summary">
                    <div className="summary-row">
                      <span className="summary-label">总数量：</span>
                      <span className="summary-value">{formItems.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
                    </div>
                    <div className="summary-row total">
                      <span className="summary-label">出库总额：</span>
                      <span className="summary-value">¥{getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingDelivery ? '更新出库单' : '创建出库单'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDeliveryManagement;