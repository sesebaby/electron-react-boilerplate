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
        const hasRule = false; // 暂时设为false，需要实现hasConversionRule方法
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
        color: 'var(--error-color)',
        bgColor: 'var(--error-color)',
        icon: '❌',
        label: '缺货'
      };
    } else if (product.isLowStock) {
      return {
        status: 'low',
        color: 'var(--warning-color)',
        bgColor: 'var(--warning-color)',
        icon: '⚠️',
        label: '预警'
      };
    } else {
      return {
        status: 'normal',
        color: 'var(--success-color)',
        bgColor: 'var(--success-color)',
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
            <span className="font-medium text-sm truncate drop-shadow-lg" style={{color: 'var(--text-primary)'}}>
              {product.productName}
            </span>
          </div>
          <div className="text-xs truncate drop-shadow-md" style={{color: 'var(--text-secondary)'}}>
            SKU: {product.sku}
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium drop-shadow-lg" style={{color: stockStatus.color}}>
              {quantityDisplay.current}
            </div>
            {hasConversion && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="text-xs transition-colors drop-shadow-md"
                style={{color: 'var(--text-accent)'}}
                title={displayMode === 'base' ? '切换到包装单位' : '切换到基础单位'}
              >
                📦
              </button>
            )}
          </div>
          <div className="text-xs drop-shadow-md" style={{color: 'var(--text-tertiary)'}}>
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
            <h3 className="font-semibold truncate" style={{color: 'var(--text-primary)'}}>
              {product.productName}
            </h3>
            <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: `${stockStatus.bgColor}20`, color: stockStatus.color}}>
              {stockStatus.label}
            </span>
          </div>
          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>SKU: {product.sku}</p>
          {product.category && (
            <p className="text-xs mt-1" style={{color: 'var(--text-tertiary)'}}>分类: {product.category}</p>
          )}
        </div>
      </div>

      {/* 库存信息 */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs" style={{color: 'var(--text-tertiary)'}}>当前库存</div>
            {hasConversion && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="text-xs transition-colors px-1 py-0.5 rounded"
                style={{color: 'var(--text-accent)'}}
                title={displayMode === 'base' ? '切换到包装单位' : '切换到基础单位'}
              >
                📦
              </button>
            )}
          </div>
          <div className="text-lg font-bold" style={{color: stockStatus.color}}>
            {quantityDisplay.current}
          </div>
        </div>
        <div>
          <div className="text-xs mb-1" style={{color: 'var(--text-tertiary)'}}>库存价值</div>
          <div className="text-lg font-bold" style={{color: 'var(--financial-positive)'}}>
            {formatCurrency(product.totalValue)}
          </div>
        </div>
      </div>

      {/* 库存阈值 */}
      <div className="flex justify-between items-center mb-3 text-sm">
        <div className="flex items-center gap-4">
          <span style={{color: 'var(--text-secondary)'}}>
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
          <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>库存水平</span>
          <span className="text-xs" style={{color: 'var(--text-tertiary)'}}>
            {Math.round((product.currentStock / (product.maxStock || product.minStock * 2)) * 100)}%
          </span>
        </div>
        <div className="w-full rounded-full h-2" style={{backgroundColor: 'var(--surface-background)'}}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{
              backgroundColor: product.isOutOfStock
                ? 'var(--error-color)'
                : product.isLowStock
                ? 'var(--warning-color)'
                : 'var(--success-color)',
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
      <div className="flex justify-between items-center text-xs" style={{color: 'var(--text-tertiary)'}}>
        <span>最后更新: {formatDate(product.lastUpdated)}</span>
        {onClick && <span>点击查看详情 →</span>}
      </div>
    </div>
  );
};

export default ProductItem;
