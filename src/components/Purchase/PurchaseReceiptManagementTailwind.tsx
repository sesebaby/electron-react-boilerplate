import React, { useState, useEffect } from 'react';
import { purchaseReceiptService, purchaseOrderService, warehouseService, productService } from '../../services/business';
import { PurchaseReceipt, PurchaseReceiptItem, ReceiptStatus, PurchaseOrder, Warehouse, Product } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const PurchaseReceiptManagementTailwind: React.FC<PurchaseReceiptManagementProps> = ({ className }) => {
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

  const getStatusStyles = (status: ReceiptStatus): string => {
    switch (status) {
      case ReceiptStatus.DRAFT: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      case ReceiptStatus.CONFIRMED: return 'text-green-300 bg-green-500/20 border-green-400/30';
      default: return 'text-white/80';
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

  const getTotalQuantity = (): number => {
    return formItems.reduce((sum, item) => sum + item.quantity, 0);
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
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载采购收货数据中...</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">采购收货管理</h1>
          <p className="text-white/70">处理采购收货、验收和入库，更新库存信息</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">📦</span>
          新建收货单
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
                📋
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总收货单数</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.byStatus.confirmed}</div>
                <div className="text-white/70 text-sm">已确认收货</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                📦
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.totalQuantity}</div>
                <div className="text-white/70 text-sm">总收货数量</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <div className="text-2xl font-bold text-white">¥{(stats.totalValue / 10000).toFixed(1)}万</div>
                <div className="text-white/70 text-sm">收货总值</div>
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
              label="搜索收货单"
              type="text"
              placeholder="搜索收货单号、订单号、供应商、仓库、收货人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="收货状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ReceiptStatus)}
          >
            <option value="">全部状态</option>
            <option value={ReceiptStatus.DRAFT}>草稿</option>
            <option value={ReceiptStatus.CONFIRMED}>已确认</option>
          </GlassSelect>

          <GlassSelect
            label="收货仓库"
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

      {/* 收货单列表 */}
      <GlassCard title={`采购收货单列表 (${filteredReceipts.length})`}>
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到采购收货单</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的收货单</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              创建第一个收货单
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">收货单信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">采购订单</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">收货仓库</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">收货日期</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">收货数量</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">收货金额</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map(receipt => (
                  <tr key={receipt.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white mb-1">{receipt.receiptNo}</div>
                        <div className="text-white/70 text-sm">收货人: {receipt.receiver}</div>
                        {receipt.remark && (
                          <div className="text-white/60 text-sm max-w-xs truncate" title={receipt.remark}>
                            {receipt.remark}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{getOrderInfo(receipt.orderId)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80">{getWarehouseName(receipt.warehouseId)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80">{formatDate(receipt.receiptDate)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white">{receipt.totalQuantity}</div>
                        {receipt.items && receipt.items.length > 0 && (
                          <div className="text-white/70 text-sm">{receipt.items.length} 个项目</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">¥{receipt.totalAmount.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(receipt.status)}`}>
                        {getStatusText(receipt.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(receipt)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {receipt.status === ReceiptStatus.DRAFT && (
                          <button
                            onClick={() => handleStatusUpdate(receipt.id, ReceiptStatus.CONFIRMED)}
                            className="px-3 py-1 text-xs bg-green-500/20 text-green-300 border border-green-400/30 rounded hover:bg-green-500/30 transition-colors"
                            title="确认收货"
                          >
                            ✅
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDelete(receipt.id)}
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

      {/* 收货单表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingReceipt ? '编辑采购收货单' : '新建采购收货单'}
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
                    label="采购订单"
                    value={formData.orderId}
                    onChange={(e) => handleOrderChange(e.target.value)}
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
                  </GlassSelect>

                  <GlassSelect
                    label="收货仓库"
                    value={formData.warehouseId}
                    onChange={(e) => handleInputChange('warehouseId', e.target.value)}
                    required
                  >
                    <option value="">请选择收货仓库</option>
                    {warehouses.map(warehouse => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </GlassSelect>

                  <GlassInput
                    label="收货日期"
                    type="date"
                    value={formData.receiptDate}
                    onChange={(e) => handleInputChange('receiptDate', e.target.value)}
                    required
                  />

                  <GlassSelect
                    label="收货状态"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as ReceiptStatus)}
                  >
                    <option value={ReceiptStatus.DRAFT}>草稿</option>
                    <option value={ReceiptStatus.CONFIRMED}>已确认</option>
                  </GlassSelect>

                  <GlassInput
                    label="收货人"
                    type="text"
                    value={formData.receiver}
                    onChange={(e) => handleInputChange('receiver', e.target.value)}
                    placeholder="收货人姓名"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-white/90 text-sm font-medium mb-2">备注说明</label>
                  <textarea
                    value={formData.remark}
                    onChange={(e) => handleInputChange('remark', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                    placeholder="收货备注说明"
                    rows={3}
                  />
                </div>
              </GlassCard>

              {/* 收货项目 */}
              <GlassCard title="收货项目">
                {formItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-semibold text-white mb-2">暂无收货项目</h3>
                    <p className="text-white/70 mb-4">请先选择采购订单，系统将自动加载可收货的项目</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">商品</th>
                          <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">收货数量</th>
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
                                <div>
                                  <div className="text-white font-medium">{getProductName(item.productId)}</div>
                                  <div className="text-white/60 text-sm">最大可收: {item.maxQuantity}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  min="0.01"
                                  max={item.maxQuantity}
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                                  placeholder="收货数量"
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

              {/* 收货汇总 */}
              {formItems.length > 0 && (
                <GlassCard title="收货汇总">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">{formItems.length}</div>
                      <div className="text-white/70 text-sm">收货项目数</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">{getTotalQuantity().toFixed(2)}</div>
                      <div className="text-white/70 text-sm">收货总数量</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">¥{getTotalAmount().toFixed(2)}</div>
                      <div className="text-white/70 text-sm">收货总金额</div>
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
                  {editingReceipt ? '更新收货单' : '创建收货单'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseReceiptManagementTailwind;