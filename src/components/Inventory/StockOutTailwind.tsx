import React, { useState, useEffect } from 'react';
import { productService, warehouseService, inventoryStockService } from '../../services/business';
import { Product, Warehouse, InventoryStock } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const StockOutTailwind: React.FC<StockOutProps> = ({ className }) => {
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

  const getStockStatusStyles = (status: string): string => {
    switch (status) {
      case 'out-of-stock': return 'text-red-300 bg-red-500/20 border-red-400/30';
      case 'insufficient': return 'text-red-300 bg-red-500/20 border-red-400/30';
      case 'low-stock': return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case 'normal': return 'text-green-300 bg-green-500/20 border-green-400/30';
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

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">库存出库</h1>
          <p className="text-white/70">处理商品出库操作，减少库存数量</p>
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

      {/* 出库表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <GlassCard title="基本信息">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassSelect
              label="参考类型"
              value={formData.referenceType}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceType: e.target.value }))}
            >
              <option value="">选择参考类型</option>
              <option value="手工出库">手工出库</option>
              <option value="销售出库">销售出库</option>
              <option value="调拨出库">调拨出库</option>
              <option value="生产出库">生产出库</option>
              <option value="损耗出库">损耗出库</option>
              <option value="其他出库">其他出库</option>
            </GlassSelect>

            <GlassInput
              label="参考单号"
              type="text"
              value={formData.referenceId}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
              placeholder="如：销售单号、调拨单号等"
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
              placeholder="出库备注说明"
              rows={3}
            />
          </div>
        </GlassCard>

        {/* 出库商品列表 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">出库商品</h3>
            <GlassButton
              type="button"
              variant="primary"
              onClick={addItem}
            >
              <span className="mr-2">➕</span>
              添加商品
            </GlassButton>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-white mb-2">暂无出库商品</h3>
              <p className="text-white/70 mb-4">请点击"添加商品"按钮添加</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[180px]">商品</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">仓库</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">当前库存</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">可用库存</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">出库数量</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">单价</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">金额</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">备注</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => {
                    const stockStatus = getStockStatus(item);
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
                          <span className="text-white/80 font-mono">
                            {item.currentStock !== undefined ? item.currentStock.toFixed(2) : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <span className={`font-mono ${getStockStatusStyles(stockStatus)}`}>
                              {item.availableStock !== undefined ? item.availableStock.toFixed(2) : '-'}
                            </span>
                            {stockStatus && stockStatus !== 'normal' && (
                              <div className={`text-xs px-2 py-1 rounded-full border ${getStockStatusStyles(stockStatus)}`}>
                                {getStockStatusText(stockStatus)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={item.availableStock || 999999}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg text-white placeholder-white/50 focus:outline-none transition-all ${
                              stockStatus === 'insufficient' 
                                ? 'bg-red-500/20 border-red-400/30 focus:border-red-400/50' 
                                : 'bg-white/10 border-white/20 focus:border-white/40 focus:bg-white/15'
                            }`}
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
                        <td className="py-3 px-4 text-white font-semibold">
                          ¥{(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={item.remark || ''}
                            onChange={(e) => updateItem(item.id, 'remark', e.target.value)}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                            placeholder="备注"
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

        {/* 汇总信息 */}
        {formData.items.length > 0 && (
          <GlassCard title="汇总信息">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{formData.items.length}</div>
                <div className="text-white/70 text-sm">商品种类</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{getTotalQuantity().toFixed(2)}</div>
                <div className="text-white/70 text-sm">总数量</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">¥{getTotalAmount().toFixed(2)}</div>
                <div className="text-white/70 text-sm">总金额</div>
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
                <span className="mr-2">📤</span>
                确认出库
              </>
            )}
          </GlassButton>
        </div>
      </form>
    </div>
  );
};

export default StockOutTailwind;