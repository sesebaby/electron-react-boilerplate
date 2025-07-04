import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryStock } from '../../types/entities';

interface StockAdjustProps {
  className?: string;
}

interface StockAdjustItem {
  id: string;
  productId: string;
  warehouseId: string;
  currentStock: number;
  adjustedStock: number;
  adjustmentQuantity: number;
  unitPrice: number;
  remark?: string;
  adjustmentType: 'increase' | 'decrease' | 'set';
}

interface StockAdjustForm {
  adjustmentType: string;
  reason: string;
  remark: string;
  operator: string;
  items: StockAdjustItem[];
}

const emptyForm: StockAdjustForm = {
  adjustmentType: '',
  reason: '',
  remark: '',
  operator: '系统管理员',
  items: []
};

const emptyItem: Omit<StockAdjustItem, 'id'> = {
  productId: '',
  warehouseId: '',
  currentStock: 0,
  adjustedStock: 0,
  adjustmentQuantity: 0,
  unitPrice: 0,
  remark: '',
  adjustmentType: 'set'
};

export const StockAdjust: React.FC<StockAdjustProps> = ({ className }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stockData, setStockData] = useState<Map<string, InventoryStock>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StockAdjustForm>(emptyForm);
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
    const newItem: StockAdjustItem = {
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

  const updateItem = (itemId: string, field: keyof StockAdjustItem, value: any) => {
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
                updatedItem.adjustedStock = stock.currentStock;
                updatedItem.adjustmentQuantity = 0;
                updatedItem.unitPrice = stock.avgCost || 0;
              } else {
                updatedItem.currentStock = 0;
                updatedItem.adjustedStock = 0;
                updatedItem.adjustmentQuantity = 0;
              }
            }
          }
          
          // 当调整后库存变化时，重新计算调整数量和类型
          if (field === 'adjustedStock') {
            const difference = updatedItem.adjustedStock - updatedItem.currentStock;
            updatedItem.adjustmentQuantity = Math.abs(difference);
            
            if (difference > 0) {
              updatedItem.adjustmentType = 'increase';
            } else if (difference < 0) {
              updatedItem.adjustmentType = 'decrease';
            } else {
              updatedItem.adjustmentType = 'set';
              updatedItem.adjustmentQuantity = 0;
            }
          }
          
          // 当调整数量或调整类型变化时，重新计算调整后库存
          if (field === 'adjustmentQuantity' || field === 'adjustmentType') {
            if (updatedItem.adjustmentType === 'increase') {
              updatedItem.adjustedStock = updatedItem.currentStock + updatedItem.adjustmentQuantity;
            } else if (updatedItem.adjustmentType === 'decrease') {
              updatedItem.adjustedStock = Math.max(0, updatedItem.currentStock - updatedItem.adjustmentQuantity);
            } else if (field === 'adjustmentQuantity' && updatedItem.adjustmentType === 'set') {
              updatedItem.adjustedStock = updatedItem.adjustmentQuantity;
              updatedItem.adjustmentQuantity = Math.abs(updatedItem.adjustedStock - updatedItem.currentStock);
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
      setError('请至少添加一个调整项目');
      return;
    }

    // 验证所有项目
    for (const item of formData.items) {
      if (!item.productId || !item.warehouseId || item.unitPrice <= 0) {
        setError('请完整填写所有调整项目信息');
        return;
      }
      
      if (item.adjustmentQuantity === 0) {
        setError('调整数量不能为0，请检查调整项目');
        return;
      }
      
      if (item.adjustedStock < 0) {
        setError('调整后库存不能为负数');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // 逐个处理调整项目
      const results = [];
      for (const item of formData.items) {
        const result = await inventoryStockService.stockAdjust({
          productId: item.productId,
          warehouseId: item.warehouseId,
          newQuantity: item.adjustedStock,
          unitPrice: item.unitPrice,
          remark: `${formData.reason} - ${item.remark || formData.remark || '库存调整'}`,
          operator: formData.operator
        });
        results.push(result);
      }
      
      setSuccessMessage(`成功处理 ${results.length} 个库存调整项目`);
      setFormData(emptyForm);
      
      // 重新加载库存数据
      await loadData();
      
      // 3秒后清除成功消息
      setTimeout(() => setSuccessMessage(null), 3000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '库存调整操作失败');
      console.error('Stock adjustment failed:', err);
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

  const getTotalAdjustmentValue = (): number => {
    return formData.items.reduce((sum, item) => {
      const adjustmentValue = Math.abs(item.adjustedStock - item.currentStock) * item.unitPrice;
      return sum + adjustmentValue;
    }, 0);
  };

  const getAdjustmentSummary = () => {
    const summary = formData.items.reduce((acc, item) => {
      const difference = item.adjustedStock - item.currentStock;
      if (difference > 0) {
        acc.increases += difference;
        acc.increaseValue += difference * item.unitPrice;
      } else if (difference < 0) {
        acc.decreases += Math.abs(difference);
        acc.decreaseValue += Math.abs(difference) * item.unitPrice;
      }
      return acc;
    }, {
      increases: 0,
      decreases: 0,
      increaseValue: 0,
      decreaseValue: 0
    });

    return summary;
  };

  const getAdjustmentTypeText = (type: string): string => {
    switch (type) {
      case 'increase': return '增加';
      case 'decrease': return '减少';
      case 'set': return '设定';
      default: return type;
    }
  };

  const getAdjustmentTypeClass = (type: string): string => {
    switch (type) {
      case 'increase': return 'adjustment-increase';
      case 'decrease': return 'adjustment-decrease';
      case 'set': return 'adjustment-set';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className={`stock-adjust ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载数据中...</p>
        </div>
      </div>
    );
  }

  const adjustmentSummary = getAdjustmentSummary();

  return (
    <div className={`stock-adjust ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>库存调整</h2>
          <p>处理库存盘点差异、损耗调整和其他库存纠正操作</p>
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

      {/* 调整表单 */}
      <form onSubmit={handleSubmit} className="stock-adjust-form">
        {/* 基本信息 */}
        <div className="form-section">
          <div className="section-header">
            <h3>调整信息</h3>
          </div>
          
          <div className="form-grid">
            <div className="form-group">
              <label>调整类型</label>
              <select
                value={formData.adjustmentType}
                onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
                className="glass-select"
                required
              >
                <option value="">选择调整类型</option>
                <option value="盘点调整">盘点调整</option>
                <option value="损耗调整">损耗调整</option>
                <option value="系统纠错">系统纠错</option>
                <option value="过期处理">过期处理</option>
                <option value="质量问题">质量问题</option>
                <option value="其他调整">其他调整</option>
              </select>
            </div>

            <div className="form-group">
              <label>调整原因</label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                className="glass-input"
                placeholder="详细的调整原因"
                required
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
                placeholder="调整备注说明"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* 调整项目列表 */}
        <div className="form-section">
          <div className="section-header">
            <h3>调整项目</h3>
            <button
              type="button"
              className="glass-button primary"
              onClick={addItem}
            >
              <span className="button-icon">➕</span>
              添加调整项目
            </button>
          </div>

          {formData.items.length === 0 ? (
            <div className="empty-items">
              <div className="empty-icon">⚖️</div>
              <p>暂无调整项目，请点击"添加调整项目"按钮添加</p>
            </div>
          ) : (
            <div className="items-table-container">
              <table className="items-table adjustment-table">
                <thead>
                  <tr>
                    <th>商品</th>
                    <th>仓库</th>
                    <th>当前库存</th>
                    <th>调整后库存</th>
                    <th>调整类型</th>
                    <th>调整数量</th>
                    <th>单价</th>
                    <th>调整金额</th>
                    <th>备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => {
                    const adjustmentAmount = Math.abs(item.adjustedStock - item.currentStock) * item.unitPrice;
                    return (
                      <tr key={item.id} className={getAdjustmentTypeClass(item.adjustmentType)}>
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
                          <span className="stock-value current">
                            {item.currentStock.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.adjustedStock}
                            onChange={(e) => updateItem(item.id, 'adjustedStock', parseFloat(e.target.value) || 0)}
                            className="glass-input"
                            placeholder="调整后库存"
                            required
                          />
                        </td>
                        <td className="adjustment-type-cell">
                          <span className={`adjustment-type-badge ${item.adjustmentType}`}>
                            {item.adjustmentType === 'increase' && '➕'}
                            {item.adjustmentType === 'decrease' && '➖'}
                            {item.adjustmentType === 'set' && '🎯'}
                            {getAdjustmentTypeText(item.adjustmentType)}
                          </span>
                        </td>
                        <td className="adjustment-quantity-cell">
                          <span className={`adjustment-quantity ${item.adjustmentType}`}>
                            {item.adjustmentType === 'increase' && '+'}
                            {item.adjustmentType === 'decrease' && '-'}
                            {item.adjustmentQuantity.toFixed(2)}
                          </span>
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
                        <td className={`amount-cell ${item.adjustmentType}`}>
                          {item.adjustmentType === 'increase' && '+'}
                          {item.adjustmentType === 'decrease' && '-'}
                          ¥{adjustmentAmount.toFixed(2)}
                        </td>
                        <td>
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                            className="glass-input"
                            placeholder="调整备注"
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

        {/* 调整汇总 */}
        {formData.items.length > 0 && (
          <div className="form-section">
            <div className="section-header">
              <h3>调整汇总</h3>
            </div>
            
            <div className="adjustment-summary">
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">调整项目：</span>
                  <span className="summary-value">{formData.items.length} 项</span>
                </div>
                <div className="summary-item increase">
                  <span className="summary-label">库存增加：</span>
                  <span className="summary-value">+{adjustmentSummary.increases.toFixed(2)}</span>
                </div>
                <div className="summary-item decrease">
                  <span className="summary-label">库存减少：</span>
                  <span className="summary-value">-{adjustmentSummary.decreases.toFixed(2)}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">总调整金额：</span>
                  <span className="summary-value">¥{getTotalAdjustmentValue().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="adjustment-detail">
                <div className="detail-item increase">
                  <span className="detail-icon">➕</span>
                  <span className="detail-text">
                    增加价值: ¥{adjustmentSummary.increaseValue.toFixed(2)}
                  </span>
                </div>
                <div className="detail-item decrease">
                  <span className="detail-icon">➖</span>
                  <span className="detail-text">
                    减少价值: ¥{adjustmentSummary.decreaseValue.toFixed(2)}
                  </span>
                </div>
                <div className="detail-item net">
                  <span className="detail-icon">🔄</span>
                  <span className="detail-text">
                    净影响: ¥{(adjustmentSummary.increaseValue - adjustmentSummary.decreaseValue).toFixed(2)}
                  </span>
                </div>
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
                <span className="button-icon">⚖️</span>
                确认调整
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockAdjust;