import React from 'react';
import { DailyBusinessSummary } from '../../../types/entities';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DailyBusinessSummary | null;
}

const DayDetailModal: React.FC<DayDetailModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  if (!isOpen || !data) return null;

  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const netChange = data.movements.inbound - data.movements.outbound;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] backdrop-blur-sm">
      <div className="glass-surface backdrop-blur-xl rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/30">
        {/* 标题栏 */}
        <div className="flex justify-between items-center p-6 border-b border-white/20">
          <h2 className="text-xl font-bold text-white drop-shadow-lg">
            {formatDate(data.date)} 业务详情
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors glass-surface backdrop-blur-md p-2 rounded-lg border border-white/30"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* 概览统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-sm font-medium">采购总额</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(data.purchases.totalValue)}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {data.purchases.orderCount} 个订单
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 text-sm font-medium">销售总额</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(data.sales.totalValue)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                {data.sales.orderCount} 个订单
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-gray-600 text-sm font-medium">库存价值</div>
              <div className="text-2xl font-bold text-gray-700">
                {formatCurrency(data.inventory.totalValue)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                总库存价值
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              netChange > 0 ? 'bg-green-50' : netChange < 0 ? 'bg-red-50' : 'bg-gray-50'
            }`}>
              <div className={`text-sm font-medium ${
                netChange > 0 ? 'text-green-600' : netChange < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                净变化
              </div>
              <div className={`text-2xl font-bold ${
                netChange > 0 ? 'text-green-700' : netChange < 0 ? 'text-red-700' : 'text-gray-700'
              }`}>
                {netChange > 0 ? '+' : ''}{netChange}
              </div>
              <div className={`text-xs mt-1 ${
                netChange > 0 ? 'text-green-600' : netChange < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                入库 - 出库
              </div>
            </div>
          </div>

          {/* 详细数据 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 采购详情 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📦 采购详情
              </h3>
              
              {data.purchases.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {data.purchases.topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <div>
                        <div className="font-medium text-gray-900">{product.productName}</div>
                        <div className="text-sm text-gray-600">数量: {product.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-700">{formatCurrency(product.value)}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t border-blue-200">
                    <div className="flex justify-between text-sm">
                      <span>总数量:</span>
                      <span className="font-medium">{data.purchases.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>订单数:</span>
                      <span className="font-medium">{data.purchases.orderCount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  今日无采购活动
                </div>
              )}
            </div>

            {/* 销售详情 */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                💰 销售详情
              </h3>
              
              {data.sales.topProducts.length > 0 ? (
                <div className="space-y-3">
                  {data.sales.topProducts.map((product, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded">
                      <div>
                        <div className="font-medium text-gray-900">{product.productName}</div>
                        <div className="text-sm text-gray-600">数量: {product.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-700">{formatCurrency(product.value)}</div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-3 border-t border-green-200">
                    <div className="flex justify-between text-sm">
                      <span>总数量:</span>
                      <span className="font-medium">{data.sales.totalAmount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>订单数:</span>
                      <span className="font-medium">{data.sales.orderCount}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  今日无销售活动
                </div>
              )}
            </div>
          </div>

          {/* 库存状态 */}
          {(data.inventory.lowStockCount > 0 || data.inventory.outOfStockCount > 0 || data.inventory.newProductCount > 0) && (
            <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📊 库存状态
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.inventory.lowStockCount > 0 && (
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-orange-600 font-medium">低库存商品</div>
                    <div className="text-2xl font-bold text-orange-700">{data.inventory.lowStockCount}</div>
                  </div>
                )}
                
                {data.inventory.outOfStockCount > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-red-600 font-medium">缺货商品</div>
                    <div className="text-2xl font-bold text-red-700">{data.inventory.outOfStockCount}</div>
                  </div>
                )}
                
                {data.inventory.newProductCount > 0 && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-purple-600 font-medium">新增商品</div>
                    <div className="text-2xl font-bold text-purple-700">{data.inventory.newProductCount}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 库存变动 */}
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              🔄 库存变动
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-blue-600 font-medium">入库</div>
                <div className="text-2xl font-bold text-blue-700">+{data.movements.inbound}</div>
              </div>
              
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-red-600 font-medium">出库</div>
                <div className="text-2xl font-bold text-red-700">-{data.movements.outbound}</div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-gray-600 font-medium">调整</div>
                <div className={`text-2xl font-bold ${
                  data.movements.adjustments > 0 ? 'text-green-700' : 
                  data.movements.adjustments < 0 ? 'text-red-700' : 'text-gray-700'
                }`}>
                  {data.movements.adjustments > 0 ? '+' : ''}{data.movements.adjustments}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailModal;
