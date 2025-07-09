import React from 'react';
import { WarehouseCardData } from '../../types/inventoryCard';
import ProductItem from './ProductItem';

interface WarehouseDetailModalProps {
  warehouse: WarehouseCardData | null;
  isOpen: boolean;
  onClose: () => void;
}

const WarehouseDetailModal: React.FC<WarehouseDetailModalProps> = ({
  warehouse,
  isOpen,
  onClose
}) => {
  if (!isOpen || !warehouse) return null;

  // 格式化金额
  const _formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // 获取库存状态样式
  const _getStockStatusStyle = () => {
    if (warehouse.outOfStockCount > 0) {
      return 'text-red-600 bg-red-100';
    } else if (warehouse.lowStockCount > 0) {
      return 'text-yellow-600 bg-yellow-100';
    } else {
      return 'text-green-600 bg-green-100';
    }
  };

  // 获取状态文本
  const _getStatusText = () => {
    if (warehouse.outOfStockCount > 0) {
      return '有缺货商品';
    } else if (warehouse.lowStockCount > 0) {
      return '有预警商品';
    } else {
      return '库存正常';
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* 模态框内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="glass-surface rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* 模态框头部 */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {warehouse.warehouseName}
                </h2>
                <p className="text-white/70">{warehouse.warehouseCode}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStockStatusStyle()}`}>
                {getStatusText()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/60 hover:text-white/80 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 模态框内容 */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* 仓库基本信息 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">仓库信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-surface rounded-lg p-4">
                  <div className="text-sm text-white/60 mb-1">仓库名称</div>
                  <div className="font-medium text-white">{warehouse.warehouseName}</div>
                </div>
                <div className="glass-surface rounded-lg p-4">
                  <div className="text-sm text-white/60 mb-1">仓库编码</div>
                  <div className="font-medium text-white">{warehouse.warehouseCode}</div>
                </div>
                <div className="glass-surface rounded-lg p-4 md:col-span-2">
                  <div className="text-sm text-white/60 mb-1">描述</div>
                  <div className="font-medium text-white">
                    {warehouse.description || '暂无描述'}
                  </div>
                </div>
              </div>
            </div>

            {/* 库存统计 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">库存统计</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-surface rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {warehouse.totalProducts}
                  </div>
                  <div className="text-sm text-white/60">商品种类</div>
                </div>
                <div className="glass-surface rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {formatCurrency(warehouse.totalValue)}
                  </div>
                  <div className="text-sm text-white/60">总价值</div>
                </div>
                <div className="glass-surface rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400 mb-1">
                    {warehouse.lowStockCount}
                  </div>
                  <div className="text-sm text-white/60">预警商品</div>
                </div>
                <div className="glass-surface rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {warehouse.outOfStockCount}
                  </div>
                  <div className="text-sm text-white/60">缺货商品</div>
                </div>
              </div>
            </div>

            {/* 商品列表 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">商品列表</h3>
                <span className="text-sm text-white/60">
                  共 {warehouse.products.length} 个商品
                </span>
              </div>
              
              {warehouse.products.length === 0 ? (
                <div className="glass-surface rounded-lg p-8 text-center">
                  <div className="text-white/40 text-4xl mb-4">📦</div>
                  <h4 className="text-lg font-medium text-white mb-2">暂无商品</h4>
                  <p className="text-white/60">该仓库暂未存放任何商品</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {warehouse.products.map(product => (
                    <ProductItem
                      key={product.productId}
                      product={product}
                      compact={false}
                      onClick={() => {
                        // TODO: 可以添加商品详情查看逻辑
                        console.log('查看商品详情:', product.productName);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 模态框底部 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-white/80 bg-white/10 rounded-lg hover:bg-white/20 transition-colors border border-white/20"
            >
              关闭
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => {
                // TODO: 可以添加编辑仓库信息的逻辑
                console.log('编辑仓库:', warehouse.warehouseName);
              }}
            >
              编辑仓库
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDetailModal;
