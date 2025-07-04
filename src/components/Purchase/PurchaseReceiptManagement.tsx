import React, { useState, useEffect } from 'react';
import { purchaseReceiptService, purchaseOrderService, warehouseService, productService } from '../../services/business';
import { PurchaseReceipt, PurchaseReceiptItem, ReceiptStatus, PurchaseOrder, Warehouse, Product } from '../../types/entities';
import './Purchase.css';

interface PurchaseReceiptManagementProps {
  className?: string;
}

interface ReceiptForm {
  orderId: string;
  warehouseId: string;
  receiptDate: string;
  status: ReceiptStatus;
  receiver: string;
  remark: string;
}

interface ReceiptItemForm {
  id: string;
  productId: string;
  orderItemId: string;
  quantity: number;
  unitPrice: number;
  maxQuantity: number; // 可收货的最大数量
}

const emptyForm: ReceiptForm = {
  orderId: '',
  warehouseId: '',
  receiptDate: new Date().toISOString().split('T')[0],
  status: ReceiptStatus.DRAFT,
  receiver: '仓库管理员',
  remark: ''
};

export const PurchaseReceiptManagement: React.FC<PurchaseReceiptManagementProps> = ({ className }) => {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<PurchaseReceipt | null>(null);
  const [formData, setFormData] = useState<ReceiptForm>(emptyForm);
  const [formItems, setFormItems] = useState<ReceiptItemForm[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ReceiptStatus | ''>('');
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
      
      const [receiptsData, ordersData, warehousesData, productsData, statsData] = await Promise.all([
        purchaseReceiptService.findAll(),
        purchaseOrderService.findAll(),
        warehouseService.findAll(),
        productService.findAll(),
        purchaseReceiptService.getReceiptStats()
      ]);
      
      setReceipts(receiptsData);
      setOrders(ordersData);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setStats(statsData);
    } catch (err) {
      setError('加载采购收货数据失败');
      console.error('Failed to load purchase receipt data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderChange = async (orderId: string) => {
    if (!orderId) {
      setAvailableOrderItems([]);
      setFormItems([]);
      return;
    }

    try {
      const { orderItems } = await purchaseReceiptService.getPendingReceiptsForOrder(orderId);
      setAvailableOrderItems(orderItems);
      
      // 自动添加可收货的项目
      const newFormItems: ReceiptItemForm[] = orderItems
        .filter(item => item.canReceive)
        .map(item => ({
          id: Date.now().toString() + Math.random(),
          productId: item.productId,
          orderItemId: item.id,
          quantity: item.pendingQuantity,
          unitPrice: item.unitPrice,
          maxQuantity: item.pendingQuantity
        }));
      
      setFormItems(newFormItems);

      // 自动填充供应商仓库信息
      const order = orders.find(o => o.id === orderId);
      if (order && warehouses.length > 0) {
        const defaultWarehouse = warehouses.find(w => w.isDefault) || warehouses[0];
        setFormData(prev => ({
          ...prev,
          orderId,
          warehouseId: defaultWarehouse.id
        }));
      }
    } catch (err) {
      setError('加载订单信息失败');
      console.error('Failed to load order items:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formItems.length === 0) {
      setError('请至少添加一个收货项目');
      return;
    }

    // 验证所有项目
    for (const item of formItems) {
      if (!item.productId || item.quantity <= 0 || item.quantity > item.maxQuantity) {
        setError('请检查收货项目信息，收货数量不能超过可收货数量');
        return;
      }
    }
    
    try {
      const order = orders.find(o => o.id === formData.orderId);
      if (!order) {
        setError('请选择有效的采购订单');
        return;
      }

      let receipt: PurchaseReceipt;
      
      if (editingReceipt) {
        // 更新收货单
        receipt = await purchaseReceiptService.update(editingReceipt.id, {
          ...formData,
          supplierId: order.supplierId,
          receiptDate: new Date(formData.receiptDate)
        });
        
        // 更新收货项目（简化：删除所有重新添加）
        const existingItems = await purchaseReceiptService.getReceiptItems(editingReceipt.id);
        for (const item of existingItems) {
          await purchaseReceiptService.removeReceiptItem(item.id);
        }
      } else {
        // 创建新收货单
        receipt = await purchaseReceiptService.create({
          ...formData,
          supplierId: order.supplierId,
          receiptDate: new Date(formData.receiptDate)
        });
      }
      
      // 添加收货项目
      for (const itemData of formItems) {
        await purchaseReceiptService.addReceiptItem(receipt.id, {
          productId: itemData.productId,
          orderItemId: itemData.orderItemId,
          quantity: itemData.quantity,
          unitPrice: itemData.unitPrice
        });
      }
      
      await loadData();
      setShowForm(false);
      setEditingReceipt(null);
      setFormData(emptyForm);
      setFormItems([]);
      setAvailableOrderItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存采购收货单失败');
      console.error('Failed to save purchase receipt:', err);
    }
  };

  const handleEdit = async (receipt: PurchaseReceipt) => {
    setEditingReceipt(receipt);
    setFormData({
      orderId: receipt.orderId,
      warehouseId: receipt.warehouseId,
      receiptDate: receipt.receiptDate.toISOString().split('T')[0],
      status: receipt.status,
      receiver: receipt.receiver,
      remark: receipt.remark || ''
    });
    
    // 加载收货项目
    const items = await purchaseReceiptService.getReceiptItems(receipt.id);
    await handleOrderChange(receipt.orderId);
    
    setFormItems(items.map(item => ({
      id: item.id,
      productId: item.productId,
      orderItemId: item.orderItemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      maxQuantity: item.quantity // 编辑时允许原数量
    })));
    
    setShowForm(true);
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('确定要删除这个采购收货单吗？删除后无法恢复！')) return;
    
    try {
      await purchaseReceiptService.delete(receiptId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除采购收货单失败');
      console.error('Failed to delete purchase receipt:', err);
    }
  };

  const handleStatusUpdate = async (receiptId: string, newStatus: ReceiptStatus) => {
    try {
      await purchaseReceiptService.updateStatus(receiptId, newStatus);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新收货状态失败');
      console.error('Failed to update receipt status:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingReceipt(null);
    setFormData(emptyForm);
    setFormItems([]);
    setAvailableOrderItems([]);
  };

  const handleInputChange = (field: keyof ReceiptForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateItem = (itemId: string, field: keyof ReceiptItemForm, value: any) => {
    setFormItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (itemId: string) => {
    setFormItems(prev => prev.filter(item => item.id !== itemId));
  };

  const getStatusText = (status: ReceiptStatus): string => {
    switch (status) {
      case ReceiptStatus.DRAFT: return '草稿';
      case ReceiptStatus.CONFIRMED: return '已确认';
      default: return status;
    }
  };

  const getStatusClass = (status: ReceiptStatus): string => {
    switch (status) {
      case ReceiptStatus.DRAFT: return 'status-draft';
      case ReceiptStatus.CONFIRMED: return 'status-confirmed';
      default: return '';
    }
  };

  const getOrderInfo = (orderId: string): string => {
    const order = orders.find(o => o.id === orderId);
    return order ? `${order.orderNo} - ${order.supplier?.name || '未知供应商'}` : '未知订单';
  };

  const getWarehouseName = (warehouseId: string): string => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : '未知仓库';
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : '未知商品';
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const getTotalAmount = (): number => {
    return formItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.order?.orderNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.supplier?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.warehouse?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.receiver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || receipt.status === selectedStatus;
    const matchesWarehouse = !selectedWarehouse || receipt.warehouseId === selectedWarehouse;
    
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  if (loading) {
    return (
      <div className={`purchase-receipt-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载采购收货数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`purchase-receipt-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>采购收货管理</h2>
          <p>处理采购收货、验收和入库，更新库存信息</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">📦</span>
            新建收货单
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
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总收货单数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.byStatus.confirmed}</div>
                <div className="stat-label">已确认收货</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalQuantity}</div>
                <div className="stat-label">总收货数量</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
                <div className="stat-label">收货总值</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索收货单</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索收货单号、订单号、供应商、仓库、收货人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>收货状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ReceiptStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={ReceiptStatus.DRAFT}>草稿</option>
              <option value={ReceiptStatus.CONFIRMED}>已确认</option>
            </select>
          </div>

          <div className="filter-group">
            <label>收货仓库</label>
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

      {/* 收货单列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>采购收货单列表</h3>
          <span className="item-count">共 {filteredReceipts.length} 个收货单</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>收货单信息</th>
                <th>采购订单</th>
                <th>收货仓库</th>
                <th>收货日期</th>
                <th>收货数量</th>
                <th>收货金额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.map(receipt => (
                <tr key={receipt.id}>
                  <td className="receipt-info-cell">
                    <div className="receipt-info">
                      <div className="receipt-no">{receipt.receiptNo}</div>
                      <div className="receipt-receiver">收货人: {receipt.receiver}</div>
                      {receipt.remark && (
                        <div className="receipt-remark">{receipt.remark}</div>
                      )}
                    </div>
                  </td>
                  <td className="order-cell">
                    <div className="order-info">
                      <div className="order-no">{getOrderInfo(receipt.orderId)}</div>
                    </div>
                  </td>
                  <td className="warehouse-cell">
                    {getWarehouseName(receipt.warehouseId)}
                  </td>
                  <td className="date-cell">
                    {formatDate(receipt.receiptDate)}
                  </td>
                  <td className="quantity-cell">
                    <div className="quantity-info">
                      <div className="total-quantity">{receipt.totalQuantity}</div>
                      {receipt.items && receipt.items.length > 0 && (
                        <div className="item-count">{receipt.items.length} 个项目</div>
                      )}
                    </div>
                  </td>
                  <td className="amount-cell">
                    ¥{receipt.totalAmount.toLocaleString()}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(receipt.status)}`}>
                      {getStatusText(receipt.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(receipt)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {receipt.status === ReceiptStatus.DRAFT && (
                      <button 
                        className="action-btn confirm"
                        onClick={() => handleStatusUpdate(receipt.id, ReceiptStatus.CONFIRMED)}
                        title="确认收货"
                      >
                        ✅
                      </button>
                    )}
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(receipt.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceipts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>没有找到采购收货单</h3>
              <p>请调整搜索条件或创建新的收货单</p>
            </div>
          )}
        </div>
      </div>

      {/* 收货单表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>{editingReceipt ? '编辑采购收货单' : '新建采购收货单'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="purchase-receipt-form">
              {/* 基本信息 */}
              <div className="form-section">
                <h4>基本信息</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>采购订单 *</label>
                    <select
                      value={formData.orderId}
                      onChange={(e) => handleOrderChange(e.target.value)}
                      className="glass-select"
                      required
                    >
                      <option value="">请选择采购订单</option>
                      {orders
                        .filter(order => order.status === 'confirmed' || order.status === 'partial')
                        .map(order => (
                          <option key={order.id} value={order.id}>
                            {order.orderNo} - {order.supplier?.name} - ¥{order.finalAmount.toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>收货仓库 *</label>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                      className="glass-select"
                      required
                    >
                      <option value="">请选择收货仓库</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name} ({warehouse.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>收货日期 *</label>
                    <input
                      type="date"
                      value={formData.receiptDate}
                      onChange={(e) => handleInputChange('receiptDate', e.target.value)}
                      className="glass-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>收货状态</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as ReceiptStatus)}
                      className="glass-select"
                    >
                      <option value={ReceiptStatus.DRAFT}>草稿</option>
                      <option value={ReceiptStatus.CONFIRMED}>已确认</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>收货人</label>
                    <input
                      type="text"
                      value={formData.receiver}
                      onChange={(e) => handleInputChange('receiver', e.target.value)}
                      className="glass-input"
                      placeholder="收货人姓名"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>备注说明</label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => handleInputChange('remark', e.target.value)}
                      className="glass-textarea"
                      placeholder="收货备注说明"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* 收货项目 */}
              <div className="form-section">
                <div className="section-header">
                  <h4>收货项目</h4>
                </div>

                {formItems.length === 0 ? (
                  <div className="empty-items">
                    <div className="empty-icon">📦</div>
                    <p>请先选择采购订单，系统将自动加载可收货的项目</p>
                  </div>
                ) : (
                  <div className="items-table-container">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>商品</th>
                          <th>收货数量</th>
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
                                <div className="product-info">
                                  <div className="product-name">{getProductName(item.productId)}</div>
                                  <div className="product-note">最大可收: {item.maxQuantity}</div>
                                </div>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0.01"
                                  max={item.maxQuantity}
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="glass-input"
                                  placeholder="收货数量"
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

              {/* 收货汇总 */}
              {formItems.length > 0 && (
                <div className="form-section">
                  <h4>收货汇总</h4>
                  <div className="receipt-summary">
                    <div className="summary-row">
                      <span className="summary-label">收货项目数：</span>
                      <span className="summary-value">{formItems.length} 个</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">收货总数量：</span>
                      <span className="summary-value">{formItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="summary-row total">
                      <span className="summary-label">收货总金额：</span>
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
                  {editingReceipt ? '更新收货单' : '创建收货单'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReceiptManagement;