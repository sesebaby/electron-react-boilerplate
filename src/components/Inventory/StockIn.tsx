import React, { useState, useEffect } from 'react';
import { serviceManager } from '../../services/core';
import { Product, Warehouse } from '../../types/entities';
import { ProductWithStock } from '../../services/domain/InventoryDomainService';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface StockInProps {
  className?: string;
}

interface StockInItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
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
  unitCost: 0,
  remark: ''
};

export const StockIn: React.FC<StockInProps> = ({ className }) => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
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
      
      const inventoryService = serviceManager.getInventoryService(); // 现在返回InventoryDomainService
      const masterDataService = serviceManager.getMasterDataService();
      const [productsResult, warehousesResult] = await Promise.all([
        inventoryService.getProductsWithStock(),
        masterDataService.getWarehouses()
      ]);

      const productsData = productsResult.success ?
        (Array.isArray(productsResult.data) ? productsResult.data : []) : [];
      const warehousesData = warehousesResult.success ?
        (Array.isArray(warehousesResult.data) ? warehousesResult.data : []) : [];

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
      
      // 使用事务处理批量入库操作
      const inventoryService = serviceManager.getInventoryService();
      
      try {
        // 准备批量入库数据
        const stockInData = formData.items.map(item => ({
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          remark: `${formData.referenceType || '手工入库'}: ${item.remark || '无备注'}`,
          operator: formData.operator || '系统管理员'
        }));
        
        // 使用批量入库操作（事务处理）
        const result = await inventoryService.batchStockIn(stockInData);
        
        if (result.success) {
          setSuccessMessage(`成功处理 ${formData.items.length} 个入库项目`);
          setFormData(emptyForm);
          
          // 3秒后清除成功消息
          setTimeout(() => setSuccessMessage(null), 3000);
        } else {
          throw new Error(result.error || '批量入库失败');
        }
      } catch (batchError) {
        console.error('批量入库失败，回退到逐个处理:', batchError);
        
        // 回退到逐个处理（用于兼容旧版本）
        const results = [];
        for (const item of formData.items) {
          const result = await inventoryService.updateStock(
            item.productId,
            item.warehouseId,
            item.quantity,
            'IN' as any,
            `${formData.referenceType || '手工入库'}: ${item.remark || '无备注'}`
          );
          results.push(result);
        }
        
        setSuccessMessage(`成功处理 ${results.length} 个入库项目（兼容模式）`);
        setFormData(emptyForm);
        
        // 3秒后清除成功消息
        setTimeout(() => setSuccessMessage(null), 3000);
      }
      
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
          <h1 className="text-3xl font-bold text-white mb-2">库存入库</h1>
          <p className="text-white/70">添加新的库存入库记录，更新商品库存数量</p>
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

      {/* 入库表单 */}
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
              <option value="手工入库">手工入库</option>
              <option value="采购入库">采购入库</option>
              <option value="调拨入库">调拨入库</option>
              <option value="退货入库">退货入库</option>
              <option value="其他入库">其他入库</option>
            </GlassSelect>

            <GlassInput
              label="参考单号"
              type="text"
              value={formData.referenceId}
              onChange={(e) => setFormData(prev => ({ ...prev, referenceId: e.target.value }))}
              placeholder="如：采购单号、调拨单号等"
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
              placeholder="入库备注说明"
              rows={3}
            />
          </div>
        </GlassCard>

        {/* 入库商品列表 */}
        <GlassCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">入库商品</h3>
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
              <h3 className="text-xl font-semibold text-white mb-2">暂无入库商品</h3>
              <p className="text-white/70 mb-4">请点击"添加商品"按钮添加</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">商品</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">仓库</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">数量</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">单价</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">金额</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[150px]">备注</th>
                    <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[80px]">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => (
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
                  ))}
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
                <span className="mr-2">📥</span>
                确认入库
              </>
            )}
          </GlassButton>
        </div>
      </form>
    </div>
  );
};

export default StockIn;