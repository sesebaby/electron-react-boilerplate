import React from 'react';
import { ScrollArea } from '../ui/scroll-area';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  badge?: number;
  children?: MenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: string;
  onPageChange: (page: string) => void;
}

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: '仪表板',
    icon: '📊'
  },
  {
    id: 'inventory',
    label: '库存管理',
    icon: '📦',
    children: [
      { id: 'inventory-overview', label: '库存概览', icon: '📋' },
      { id: 'inventory-card-view', label: '卡片视图', icon: '🗂️' },
      { id: 'calendar-overview', label: '日历视图', icon: '📅' },
      { id: 'daily-consumption', label: '逐日消耗', icon: '📈' },
      { id: 'monthly-balance', label: '月度结余', icon: '📊' }, // 月度结余功能 - 第5个位置
      { id: 'products', label: '商品管理', icon: '🏷️' },
      { id: 'categories', label: '分类管理', icon: '📂' },
      { id: 'warehouses', label: '仓库管理', icon: '🏭' },
      { id: 'stock-in', label: '入库管理', icon: '📥' },
      { id: 'stock-out', label: '出库管理', icon: '📤' },
      { id: 'stock-adjust', label: '库存调整', icon: '⚖️' }
    ]
  },
  {
    id: 'purchase',
    label: '采购管理',
    icon: '🛒',
    children: [
      { id: 'suppliers', label: '供应商管理', icon: '🏢' },
      { id: 'purchase-orders', label: '采购订单', icon: '📋' },
      { id: 'purchase-receipts', label: '采购收货', icon: '📦' }
    ]
  },
  {
    id: 'sales',
    label: '销售管理',
    icon: '💰',
    children: [
      { id: 'customers', label: '客户管理', icon: '👥' },
      { id: 'sales-orders', label: '销售订单', icon: '📝' },
      { id: 'sales-delivery', label: '销售出库', icon: '🚚' }
    ]
  },
  {
    id: 'finance',
    label: '财务管理',
    icon: '💳',
    children: [
      { id: 'accounts-payable', label: '应付账款', icon: '💸' },
      { id: 'accounts-receivable', label: '应收账款', icon: '💰' },
      { id: 'payments', label: '付款记录', icon: '🧾' },
      { id: 'receipts', label: '收款记录', icon: '🧾' }
    ]
  },
  {
    id: 'reports',
    label: '报表分析',
    icon: '📈',
    children: [
      { id: 'inventory-reports', label: '库存报表', icon: '📊' },
      { id: 'sales-reports', label: '销售报表', icon: '📈' },
      { id: 'purchase-reports', label: '采购报表', icon: '📉' },
      { id: 'financial-reports', label: '财务报表', icon: '💹' }
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    icon: '⚙️',
    children: [
      { id: 'users', label: '用户管理', icon: '👤' },
      { id: 'permissions', label: '权限管理', icon: '🔐' },
      { id: 'settings', label: '系统设置', icon: '🔧' },
      { id: 'logs', label: '操作日志', icon: '📋' }
    ]
  }
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed, 
  onToggle, 
  currentPage, 
  onPageChange 
}) => {
  const [expandedMenus, setExpandedMenus] = React.useState<string[]>(['inventory']);

  const toggleMenu = (menuId: string) => {
    if (collapsed) return; // 收缩状态下不展开子菜单
    
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      toggleMenu(item.id);
    } else {
      onPageChange(item.id);
    }
  };

  // 检查菜单项是否应该显示为激活状态
  const isMenuActive = (item: MenuItem): boolean => {
    if (currentPage === item.id) {
      return true;
    }
    // 如果当前页面是该菜单的子页面，也显示为激活状态
    if (item.children) {
      return item.children.some(child => child.id === currentPage);
    }
    return false;
  };

  return (
    <div className={`
      fixed left-0 top-0 h-full z-40 transition-all duration-300 flex flex-col
      ${collapsed ? 'w-16' : 'w-64'}
      glass-surface border-r border-white/10
    `}>
      {/* Logo和标题区域 */}
      <div className="h-16 flex-shrink-0 flex items-center justify-center px-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="text-2xl">📦</div>
          {!collapsed && (
            <div className="text-left">
              <h1 className="text-lg font-bold text-white leading-tight">进销存系统</h1>
              <p className="text-xs text-white/60">Inventory System</p>
            </div>
          )}
        </div>
      </div>

      {/* 导航菜单 */}
      <ScrollArea className="flex-1 py-4 px-2">
        <ul className="space-y-1">
          {menuItems.map(item => (
            <li key={item.id}>
              <button
                type="button"
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-all duration-200 group
                  ${isMenuActive(item)
                    ? 'bg-white/20 text-white border border-white/30'
                    : 'text-white/80 hover:bg-white/10 hover:text-white border border-transparent'
                  }
                `}
                onClick={() => handleMenuClick(item)}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                    {item.children && item.children.length > 0 && (
                      <span className={`
                        text-sm transition-transform duration-200 flex-shrink-0
                        ${expandedMenus.includes(item.id) ? 'rotate-0' : 'rotate-180'}
                      `}>
                        ⏷
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* 子菜单 */}
              {item.children && !collapsed && (
                <div className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${expandedMenus.includes(item.id) ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
                `}>
                  <ul className="mt-1 ml-6 space-y-1">
                    {item.children.map(child => (
                      <li key={child.id}>
                        <button
                          type="button"
                          className={`
                            w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
                            transition-all duration-200 text-sm
                            ${currentPage === child.id
                              ? 'bg-white/15 text-white border border-white/20'
                              : 'text-white/70 hover:bg-white/8 hover:text-white border border-transparent'
                            }
                          `}
                          onClick={() => onPageChange(child.id)}
                        >
                          <span className="text-base flex-shrink-0">{child.icon}</span>
                          <span className="flex-1">{child.label}</span>
                          {child.badge && (
                            <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                              {child.badge}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>

      {/* 底部区域 */}
      <div className="flex-shrink-0 border-t border-white/10 p-2">
        {!collapsed ? (
          // 展开状态的用户信息
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                👤
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">系统管理员</div>
                <div className="text-xs text-white/60 truncate">Administrator</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white/70">系统正常</span>
              </div>
              <span className="text-white/50">v1.0.0</span>
            </div>
          </div>
        ) : (
          // 收缩状态的用户头像
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm relative">
              👤
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;