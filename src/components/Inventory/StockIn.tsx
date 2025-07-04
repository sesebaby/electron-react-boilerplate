import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse } from '../../types/entities';

interface StockInProps {
  className?: string;
}

interface StockInItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  remark?: string;
}

interface StockInForm {
  referenceType: string;
  referenceId: string;
  remark: string;
  operator: string;
  items: StockInItem[];
}

const emptyForm: StockInForm = {
  referenceType: '',
  referenceId: '',
  remark: '',
  operator: '系统管理员',
  items: []
};

const emptyItem: Omit<StockInItem, 'id'> = {
  productId: '',
  warehouseId: '',
  quantity: 0,
  unitPrice: 0,
  remark: ''
};

export const StockIn: React.FC<StockInProps> = ({ className }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StockInForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsData, warehousesData] = await Promise.all([
        productService.findAll(),
        warehouseService.findAll()
      ]);
      
      setProducts(productsData);
      setWarehouses(warehousesData);
    } catch (err) {
      setError('加载数据失败');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: StockInItem = {
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

  const updateItem = (itemId: string, field: keyof StockInItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.items.length === 0) {
      setError('请至少添加一个入库商品');
      return;
    }

    // 验证所有项目
    for (const item of formData.items) {
      if (!item.productId || !item.warehouseId || item.quantity <= 0 || item.unitPrice <= 0) {
        setError('请完整填写所有入库项目信息');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 逐个处理入库项目
      const results = [];
      for (const item of formData.items) {
        const result = await inventoryStockService.stockIn({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          referenceType: formData.referenceType || '手工入库',
          referenceId: formData.referenceId || `MANUAL_${Date.now()}`,
          remark: item.remark || formData.remark,
          operator: formData.operator
        });
        results.push(result);
      }
      
      setSuccessMessage(`成功处理 ${results.length} 个入库项目`);
      setFormData(emptyForm);
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '入库操作失败');
      console.error('Stock in failed:', err);
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

  if (loading) {
    return (
      <div className={`stock-in ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`stock-in ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>库存入库</h2>
          <p>添加新的库存入库记录，更新商品库存数量</p>
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

      {/* 入库表单 */}
      <form onSubmit={handleSubmit} className="stock-in-form">
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
                <option value="手工入库">手工入库</option>
                <option value="采购入库">采购入库</option>
                <option value="调拨入库">调拨入库</option>
                <option value="退货入库">退货入库</option>
                <option value="其他入库">其他入库</option>
              </select>
            </div>

            <div className="form-group">
              <label>参考单号</label>
              <input
                type="text"
                value={formData.referenceId}
                onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
                className="glass-input"
                placeholder="如：采购单号、调拨单号等"
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
                placeholder="入库备注说明"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 入库商品列表 */}
        <div className="form-section">
          <div className="section-header">
            <h3>入库商品</h3>
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
              <p>暂无入库商品，请点击"添加商品"按钮添加</p>
            </div>
          ) : (
            <div className="items-table-container">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>仓库</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => (
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
                  ))}
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
                <span className="button-icon">📥</span>
                确认入库
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockIn;