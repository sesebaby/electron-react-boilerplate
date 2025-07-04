import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryStock } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const StockAdjustTailwind: React.FC<StockAdjustProps> = ({ className }) => {
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

  const getAdjustmentTypeStyles = (type: string): string => {
    switch (type) {
      case 'increase': return 'text-green-300 bg-green-500/20 border-green-400/30';
      case 'decrease': return 'text-red-300 bg-red-500/20 border-red-400/30';
      case 'set': return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      default: return 'text-white/80';
    }
  };

  const getAdjustmentQuantityStyles = (type: string): string => {
    switch (type) {
      case 'increase': return 'text-green-300';
      case 'decrease': return 'text-red-300';
      default: return 'text-white/80';
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  const adjustmentSummary = getAdjustmentSummary();

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">库存调整</h1>
          <p className="text-white/70">处理库存盘点差异、损耗调整和其他库存纠正操作</p>
        </div>
        <GlassButton
          type="button"
          variant="secondary"
          onClick={() => setFormData(emptyForm)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">🔄</span>
          重置表单
        </GlassButton>
      </div>

      {/* 成功消息 */}
      {successMessage && (
        <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-lg flex items-center gap-3">
          <span className="text-green-400 text-xl">✅</span>
          <span className="text-green-300">{successMessage}</span>
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl">❌</span>
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* 调整表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <GlassCard title="调整信息">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSelect
              label="调整类型"
              value={formData.adjustmentType}
              onChange={(e) => setFormData(prev => ({ ...prev, adjustmentType: e.target.value }))}
              required
            >
              <option value="">选择调整类型</option>
              <option value="盘点调整">盘点调整</option>
              <option value="损耗调整">损耗调整</option>
              <option value="系统纠错">系统纠错</option>
              <option value="过期处理">过期处理</option>
              <option value="质量问题">质量问题</option>
              <option value="其他调整">其他调整</option>
            </GlassSelect>

            <GlassInput
              label="调整原因"
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="详细的调整原因"
              required
            />

            <GlassInput
              label="操作员"
              type="text"
              value={formData.operator}
              onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value }))}
              placeholder="操作员姓名"
              required
            />
          </div>

          <div className="mt-4">
            <label className="block text-white/90 text-sm font-medium mb-2">备注说明</label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
              placeholder="调整备注说明"
              rows={3}
            />
          </div>
        </GlassCard>

        {/* 调整项目列表 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">调整项目</h3>
            <GlassButton
              type="button"
              variant="primary"
              onClick={addItem}
            >
              <span className="mr-2">➕</span>
              添加调整项目
            </GlassButton>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold text-white mb-2">暂无调整项目</h3>
              <p className="text-white/70 mb-4">请点击"添加调整项目"按钮添加</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[180px]">商品</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">仓库</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">当前库存</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">调整后库存</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">调整类型</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">调整数量</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">单价</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">调整金额</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">备注</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => {
                    const adjustmentAmount = Math.abs(item.adjustedStock - item.currentStock) * item.unitPrice;
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
                            value={item.warehouseId}
                            onChange={(e) => updateItem(item.id, 'warehouseId', e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
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
                        <td className="py-3 px-4">
                          <span className="font-mono text-white">
                            {item.currentStock.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.adjustedStock}
                            onChange={(e) => updateItem(item.id, 'adjustedStock', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                            placeholder="调整后库存"
                            required
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getAdjustmentTypeStyles(item.adjustmentType)}`}>
                            {item.adjustmentType === 'increase' && '➕'}
                            {item.adjustmentType === 'decrease' && '➖'}
                            {item.adjustmentType === 'set' && '🎯'}
                            <span>{getAdjustmentTypeText(item.adjustmentType)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-mono font-semibold ${getAdjustmentQuantityStyles(item.adjustmentType)}`}>
                            {item.adjustmentType === 'increase' && '+'}
                            {item.adjustmentType === 'decrease' && '-'}
                            {item.adjustmentQuantity.toFixed(2)}
                          </span>
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
                          <span className={`font-mono font-semibold ${getAdjustmentQuantityStyles(item.adjustmentType)}`}>
                            {item.adjustmentType === 'increase' && '+'}
                            {item.adjustmentType === 'decrease' && '-'}
                            ¥{adjustmentAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                            placeholder="调整备注"
                          />
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

        {/* 调整汇总 */}
        {formData.items.length > 0 && (
          <GlassCard title="调整汇总">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{formData.items.length}</div>
                <div className="text-white/70 text-sm">调整项目</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300 mb-1">+{adjustmentSummary.increases.toFixed(2)}</div>
                <div className="text-white/70 text-sm">库存增加</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-300 mb-1">-{adjustmentSummary.decreases.toFixed(2)}</div>
                <div className="text-white/70 text-sm">库存减少</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">¥{getTotalAdjustmentValue().toFixed(2)}</div>
                <div className="text-white/70 text-sm">总调整金额</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-400/20">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-lg">
                  ➕
                </div>
                <div>
                  <div className="text-green-300 font-semibold">增加价值</div>
                  <div className="text-white/80">¥{adjustmentSummary.increaseValue.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-400/20">
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-lg">
                  ➖
                </div>
                <div>
                  <div className="text-red-300 font-semibold">减少价值</div>
                  <div className="text-white/80">¥{adjustmentSummary.decreaseValue.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-400/20">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-lg">
                  🔄
                </div>
                <div>
                  <div className="text-blue-300 font-semibold">净影响</div>
                  <div className="text-white/80">¥{(adjustmentSummary.increaseValue - adjustmentSummary.decreaseValue).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 提交按钮 */}
        <div className="flex justify-center pt-4">
          <GlassButton
            type="submit"
            variant="primary"
            disabled={submitting || formData.items.length === 0}
            className="px-8 py-3 text-lg"
          >
            {submitting ? (
              <>
                <span className="mr-2">⏳</span>
                处理中...
              </>
            ) : (
              <>
                <span className="mr-2">⚖️</span>
                确认调整
              </>
            )}
          </GlassButton>
        </div>
      </form>
    </div>
  );
};

export default StockAdjustTailwind;