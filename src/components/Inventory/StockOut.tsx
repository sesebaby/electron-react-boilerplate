import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryStock } from '../../types/entities';

interface StockOutProps {
  className?: string;
}

interface StockOutItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  remark?: string;
  currentStock?: number;
  availableStock?: number;
}

interface StockOutForm {
  referenceType: string;
  referenceId: string;
  remark: string;
  operator: string;
  items: StockOutItem[];
}

const emptyForm: StockOutForm = {
  referenceType: '',
  referenceId: '',
  remark: '',
  operator: '系统管理员',
  items: []
};

const emptyItem: Omit<StockOutItem, 'id'> = {
  productId: '',
  warehouseId: '',
  quantity: 0,
  unitPrice: 0,
  remark: '',
  currentStock: 0,
  availableStock: 0
};

export const StockOut: React.FC<StockOutProps> = ({ className }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockData, setStockData] = useState<Map<string, InventoryStock>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StockOutForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsData, warehousesData, stocksData] = await Promise.all([
        productService.findAll(),
        warehouseService.findAll(),
        inventoryStockService.findAllStocks()
      ]);
      
      setProducts(productsData);
      setWarehouses(warehousesData);
      
      // 创建库存数据映射 (productId:warehouseId -> stock)
      const stockMap = new Map<string, InventoryStock>();
      stocksData.forEach(stock => {
        const key = `${stock.productId}:${stock.warehouseId}`;
        stockMap.set(key, stock);
      });
      setStockData(stockMap);
      
    } catch (err) {
      setError('加载数据失败');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: StockOutItem = {
      ...emptyItem,
      id: Date.now().toString()
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof StockOutItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // 当产品或仓库变化时，更新库存信息
          if (field === 'productId' || field === 'warehouseId') {
            if (updatedItem.productId && updatedItem.warehouseId) {
              const stockKey = `${updatedItem.productId}:${updatedItem.warehouseId}`;
              const stock = stockData.get(stockKey);
              if (stock) {
                updatedItem.currentStock = stock.currentStock;
                updatedItem.availableStock = stock.availableStock;
                // 设置建议单价为平均成本
                if (field === 'productId' || field === 'warehouseId') {
                  updatedItem.unitPrice = stock.avgCost || 0;
                }
              } else {
                updatedItem.currentStock = 0;
                updatedItem.availableStock = 0;
              }
            }
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      setError('请至少添加一个出库商品');
      return;
    }

    // 验证所有项目
    for (const item of formData.items) {
      if (!item.productId || !item.warehouseId || item.quantity <= 0 || item.unitPrice <= 0) {
        setError('请完整填写所有出库项目信息');
        return;
      }
      
      // 检查库存是否足够
      if (item.availableStock !== undefined && item.quantity > item.availableStock) {
        const product = products.find(p => p.id === item.productId);
        const warehouse = warehouses.find(w => w.id === item.warehouseId);
        setError(`商品 "${product?.name}" 在仓库 "${warehouse?.name}" 的可用库存不足，当前可用: ${item.availableStock}，需要: ${item.quantity}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 逐个处理出库项目
      const results = [];
      for (const item of formData.items) {
        const result = await inventoryStockService.stockOut({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          referenceType: formData.referenceType || '手工出库',
          referenceId: formData.referenceId || `MANUAL_${Date.now()}`,
          remark: item.remark || formData.remark,
          operator: formData.operator
        });
        results.push(result);
      }
      
      setSuccessMessage(`成功处理 ${results.length} 个出库项目`);
      setFormData(emptyForm);
      
      // 重新加载库存数据
      await loadData();
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '出库操作失败');
      console.error('Stock out failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (productId: string): string => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : '';
  };

  const getWarehouseName = (warehouseId: string): string => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? warehouse.name : '';
  };

  const getTotalAmount = (): number => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const getTotalQuantity = (): number => {
    return formData.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getStockStatus = (item: StockOutItem): string => {
    if (!item.productId || !item.warehouseId) return '';
    if (item.availableStock === undefined) return '';
    
    if (item.availableStock <= 0) return 'out-of-stock';
    if (item.quantity > item.availableStock) return 'insufficient';
    if (item.availableStock <= 10) return 'low-stock';
    return 'normal';
  };

  const getStockStatusText = (status: string): string => {
    switch (status) {
      case 'out-of-stock': return '缺货';
      case 'insufficient': return '库存不足';
      case 'low-stock': return '库存偏低';
      case 'normal': return '库存正常';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className={`stock-out ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`stock-out ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>库存出库</h2>
          <p>处理商品出库操作，减少库存数量</p>
        </div>
        <div className="header-actions">
          <button 
            type="button"
            className="glass-button secondary"
            onClick={() => setFormData(emptyForm)}
          >
            <span className="button-icon">🔄</span>
            重置表单
          </button>
        </div>
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <div className="success-message">
          <span className="success-icon">✅</span>
          {successMessage}
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
        </div>
      )}

      {/* 出库表单 */}
      <form onSubmit={handleSubmit} className="stock-out-form">
        {/* 基本信息 */}
        <div className="form-section">
          <div className="section-header">
            <h3>基本信息</h3>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>参考类型</label>
              <select
                value={formData.referenceType}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceType: e.target.value }))}
                className="glass-select"
              >
                <option value="">选择参考类型</option>
                <option value="手工出库">手工出库</option>
                <option value="销售出库">销售出库</option>
                <option value="调拨出库">调拨出库</option>
                <option value="生产出库">生产出库</option>
                <option value="损耗出库">损耗出库</option>
                <option value="其他出库">其他出库</option>
              </select>
            </div>

            <div className="form-group">
              <label>参考单号</label>
              <input
                type="text"
                value={formData.referenceId}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
                className="glass-input"
                placeholder="如：销售单号、调拨单号等"
              />
            </div>

            <div className="form-group">
              <label>操作员</label>
              <input
                type="text"
                value={formData.operator}
                onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
                className="glass-input"
                placeholder="操作员姓名"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>备注说明</label>
              <textarea
                value={formData.remark}
                onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
                className="glass-textarea"
                placeholder="出库备注说明"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 出库商品列表 */}
        <div className="form-section">
          <div className="section-header">
            <h3>出库商品</h3>
            <button
              type="button"
              className="glass-button primary"
              onClick={addItem}
            >
              <span className="button-icon">➕</span>
              添加商品
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="empty-items">
              <div className="empty-icon">📦</div>
              <p>暂无出库商品，请点击"添加商品"按钮添加</p>
            </div>
          ) : (
            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>仓库</th>
                    <th>当前库存</th>
                    <th>可用库存</th>
                    <th>出库数量</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <tr key={item.id} className={stockStatus ? `stock-status-${stockStatus}` : ''}>
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
                            value={item.warehouseId}
                            onChange={(e) => updateItem(item.id, 'warehouseId', e.target.value)}
                            className="glass-select"
                            required
                          >
                            <option value="">选择仓库</option>
                            {warehouses.map(warehouse => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="stock-cell">
                          <span className="stock-value">
                            {item.currentStock !== undefined ? item.currentStock.toFixed(2) : '-'}
                          </span>
                        </td>
                        <td className="stock-cell">
                          <span className={`stock-value ${stockStatus}`}>
                            {item.availableStock !== undefined ? item.availableStock.toFixed(2) : '-'}
                          </span>
                          {stockStatus && (
                            <div className="stock-status-badge">
                              {getStockStatusText(stockStatus)}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={item.availableStock || 999999}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`glass-input ${stockStatus === 'insufficient' ? 'error' : ''}`}
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
                          ¥{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                            className="glass-input"
                            placeholder="备注"
                          />
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

        {/* 汇总信息 */}
        {formData.items.length > 0 && (
          <div className="form-section">
            <div className="section-header">
              <h3>汇总信息</h3>
            </div>
            
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">商品种类：</span>
                <span className="summary-value">{formData.items.length} 种</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">总数量：</span>
                <span className="summary-value">{getTotalQuantity().toFixed(2)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">总金额：</span>
                <span className="summary-value">¥{getTotalAmount().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="form-actions">
          <button
            type="submit"
            className="glass-button primary large"
            disabled={submitting || formData.items.length === 0}
          >
            {submitting ? (
              <>
                <span className="button-icon">⏳</span>
                处理中...
              </>
            ) : (
              <>
                <span className="button-icon">📤</span>
                确认出库
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockOut;