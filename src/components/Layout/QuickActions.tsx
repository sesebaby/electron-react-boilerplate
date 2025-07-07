import React, { useState, useRef, useEffect } from 'react';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  page: string;
  params?: Record<string, string>;
  action?: () => void;
}

interface QuickActionsProps {
  onRefresh?: () => void;
  onExportData?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onRefresh,
  onExportData
}) => {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭弹出框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showActions]);

  // 快捷操作配置
  const quickActions: QuickAction[] = [
    {
      id: 'add-product',
      icon: '🏷️',
      label: '添加商品',
      page: 'products'
    },
    {
      id: 'purchase-order',
      icon: '🛒',
      label: '商品采购',
      page: 'purchase-orders'
    },
    {
      id: 'stock-in',
      icon: '📥',
      label: '商品入库',
      page: 'stock-in'
    },
    {
      id: 'stock-out',
      icon: '📤',
      label: '商品出库',
      page: 'stock-out'
    },
    {
      id: 'stock-adjust',
      icon: '⚖️',
      label: '库存调整',
      page: 'stock-adjust'
    },
    {
      id: 'sales-order',
      icon: '💰',
      label: '销售订单',
      page: 'sales-orders'
    },
    {
      id: 'refresh',
      icon: '🔄',
      label: '刷新数据',
      page: '',
      action: () => {
        console.log('执行刷新数据操作');
        if (onRefresh) {
          onRefresh();
        } else {
          // 触发自定义刷新事件
          window.dispatchEvent(new CustomEvent('quickaction-refresh'));
          // 显示刷新提示
          console.log('数据已刷新');
        }
      }
    },
    {
      id: 'unit-conversion',
      icon: '📏',
      label: '单位换算',
      page: 'settings'
    },
    {
      id: 'export-data',
      icon: '📊',
      label: '导出数据',
      page: '',
      action: () => {
        console.log('执行导出数据操作');
        if (onExportData) {
          onExportData();
        } else {
          // 触发自定义导出事件
          window.dispatchEvent(new CustomEvent('quickaction-export'));
          // 显示导出提示
          console.log('开始导出数据...');
        }
      }
    }
  ];

  // 处理快捷操作点击
  const handleActionClick = (action: QuickAction) => {
    setShowActions(false);
    
    if (action.action) {
      // 执行自定义操作
      action.action();
    } else if (action.page) {
      // 页面跳转 - 简化跳转逻辑，确保兼容性
      console.log(`快捷操作：跳转到页面 ${action.page}`);
      
      // 直接设置hash，不使用复杂的URL参数
      window.location.hash = action.page;
      
      // 强制触发页面更新
      setTimeout(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }, 50);
      
      // 如果有参数，通过localStorage临时存储
      if (action.params) {
        localStorage.setItem('quickAction_params', JSON.stringify(action.params));
        // 1秒后清除参数，避免影响后续操作
        setTimeout(() => {
          localStorage.removeItem('quickAction_params');
        }, 1000);
      }
    }
  };

  return (
    <div className="relative" ref={actionsRef}>
      {/* 快捷操作触发按钮 */}
      <button
        type="button"
        className="glass-button w-9 h-9 flex items-center justify-center rounded-lg transition-all"
        title="快捷操作"
        onClick={() => setShowActions(!showActions)}
      >
        ⚡
      </button>

      {/* 快捷操作弹出框 */}
      {showActions && (
        <>
          <div className="absolute top-12 right-0 w-80 popup-dropdown z-50">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--popup-text-primary)' }}>
                快捷操作
              </h3>
              <button
                type="button"
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--popup-text-secondary)' }}
                onClick={() => setShowActions(false)}
              >
                ✕
              </button>
            </div>

            {/* 九宫格操作区域 */}
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="flex flex-col items-center justify-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group"
                    onClick={() => handleActionClick(action)}
                  >
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-200">
                      {action.icon}
                    </div>
                    <span 
                      className="text-xs text-center leading-tight" 
                      style={{ color: 'var(--popup-text-secondary)' }}
                    >
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 底部提示 */}
            <div className="px-4 pb-4">
              <div className="text-xs text-center p-2 bg-white/5 rounded-lg" style={{ color: 'var(--popup-text-tertiary)' }}>
                💡 点击图标快速访问常用功能
              </div>
            </div>
          </div>
          
          {/* 遮罩层 */}
          <div className="popup-overlay" onClick={() => setShowActions(false)}></div>
        </>
      )}
    </div>
  );
};

export default QuickActions;