import React, { useState, useEffect } from 'react';
import { ProductStockInfo } from '../../types/inventoryCard';
import { unitConversionHelper } from '../../utils/unitConversionHelper';

interface ProductItemProps {
  product: ProductStockInfo;
  compact?: boolean;
  onClick?: () => void;
}

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  compact = false,
  onClick
}) => {
  const [displayMode, setDisplayMode] = useState<'base' | 'package'>('base');
  const [hasConversion, setHasConversion] = useState(false);
  const [quantityDisplay, setQuantityDisplay] = useState({
    current: `${product.currentStock} ${product.unit}`,
    min: `${product.minStock} ${product.unit}`,
    max: product.maxStock ? `${product.maxStock} ${product.unit}` : null
  });

  // 检查并设置单位转换
  useEffect(() => {
    const checkConversion = async () => {
      try {
        const hasRule = await unitConversionHelper.hasConversionRule(product.productId);
        setHasConversion(hasRule);

        if (hasRule) {
          await updateQuantityDisplay('base');
        }
      } catch (error) {
        console.error('检查单位转换失败:', error);
      }
    };

    checkConversion();
  }, [product.productId]);

  // 更新数量显示
  const updateQuantityDisplay = async (mode: 'base' | 'package') => {
    try {
      if (mode === 'base') {
        setQuantityDisplay({
          current: `${product.currentStock} ${product.unit}`,
          min: `${product.minStock} ${product.unit}`,
          max: product.maxStock ? `${product.maxStock} ${product.unit}` : null
        });
      } else {
        const currentDisplay = await unitConversionHelper.getSmartQuantityDisplay(
          product.productId,
          product.currentStock,
          true
        );
        const minDisplay = await unitConversionHelper.getSmartQuantityDisplay(
          product.productId,
          product.minStock,
          true
        );
        const maxDisplay = product.maxStock
          ? await unitConversionHelper.getSmartQuantityDisplay(product.productId, product.maxStock, true)
          : null;

        setQuantityDisplay({
          current: currentDisplay,
          min: minDisplay,
          max: maxDisplay
        });
      }
    } catch (error) {
      console.error('更新数量显示失败:', error);
    }
  };

  // 切换显示单位
  const toggleDisplayMode = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发父组件的点击事件

    if (!hasConversion) return;

    const newMode = displayMode === 'base' ? 'package' : 'base';
    setDisplayMode(newMode);
    await updateQuantityDisplay(newMode);
  };
  // 获取库存状态
  const getStockStatus = () => {
    if (product.isOutOfStock) {
      return {
        status: 'out',
        color: 'text-red-300',
        bgColor: 'bg-red-500/20',
        icon: '❌',
        label: '缺货'
      };
    } else if (product.isLowStock) {
      return {
        status: 'low',
        color: 'text-yellow-300',
        bgColor: 'bg-yellow-500/20',
        icon: '⚠️',
        label: '预警'
      };
    } else {
      return {
        status: 'normal',
        color: 'text-green-300',
        bgColor: 'bg-green-500/20',
        icon: '✅',
        label: '正常'
      };
    }
  };

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // 格式化日期
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const stockStatus = getStockStatus();

  if (compact) {
    // 紧凑模式 - 用于卡片内的产品列表
    return (
      <div
        className={`
          flex items-center justify-between p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/10
          ${onClick ? 'cursor-pointer' : ''}
        `}
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs drop-shadow-md">{stockStatus.icon}</span>
            <span className="font-medium text-sm text-white truncate drop-shadow-lg">
              {product.productName}
            </span>
          </div>
          <div className="text-xs text-white/80 truncate drop-shadow-md">
            SKU: {product.sku}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="flex items-center gap-1">
            <div className={`text-sm font-medium ${stockStatus.color} drop-shadow-lg`}>
              {quantityDisplay.current}
            </div>
            {hasConversion && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="text-xs text-blue-300 hover:text-blue-200 transition-colors drop-shadow-md"
                title={displayMode === 'base' ? '切换到包装单位' : '切换到基础单位'}
              >
                📦
              </button>
            )}
          </div>
          <div className="text-xs text-white/70 drop-shadow-md">
            最低: {quantityDisplay.min}
          </div>
        </div>
      </div>
    );
  }

  // 完整模式 - 用于详细列表
  return (
    <div
      className={`
        glass-surface rounded-lg p-4 transition-all duration-200 hover:shadow-md
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
      `}
      onClick={onClick}
    >
      {/* 产品头部信息 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {product.productName}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${stockStatus.bgColor} ${stockStatus.color}`}>
              {stockStatus.label}
            </span>
          </div>
          <p className="text-sm text-gray-600">SKU: {product.sku}</p>
          {product.category && (
            <p className="text-xs text-gray-500 mt-1">分类: {product.category}</p>
          )}
        </div>
      </div>

      {/* 库存信息 */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-500">当前库存</div>
            {hasConversion && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="text-xs text-blue-500 hover:text-blue-700 transition-colors px-1 py-0.5 rounded"
                title={displayMode === 'base' ? '切换到包装单位' : '切换到基础单位'}
              >
                📦
              </button>
            )}
          </div>
          <div className={`text-lg font-bold ${stockStatus.color}`}>
            {quantityDisplay.current}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">库存价值</div>
          <div className="text-lg font-bold text-green-600">
            {formatCurrency(product.totalValue)}
          </div>
        </div>
      </div>

      {/* 库存阈值 */}
      <div className="flex justify-between items-center mb-3 text-sm">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            最低: <span className="font-medium">{quantityDisplay.min}</span>
          </span>
          {quantityDisplay.max && (
            <span className="text-gray-600">
              最高: <span className="font-medium">{quantityDisplay.max}</span>
            </span>
          )}
        </div>
        <span className="text-gray-600">
          单价: <span className="font-medium">{formatCurrency(product.unitPrice)}</span>
        </span>
      </div>

      {/* 库存进度条 */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-500">库存水平</span>
          <span className="text-xs text-gray-500">
            {Math.round((product.currentStock / (product.maxStock || product.minStock * 2)) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              product.isOutOfStock
                ? 'bg-red-500'
                : product.isLowStock
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  (product.currentStock / (product.maxStock || product.minStock * 2)) * 100
                )
              )}%`
            }}
          ></div>
        </div>
      </div>

      {/* 最后更新时间 */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>最后更新: {formatDate(product.lastUpdated)}</span>
        {onClick && <span>点击查看详情 →</span>}
      </div>
    </div>
  );
};

export default ProductItem;
