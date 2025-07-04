import React from 'react';

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
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo和标题区域 */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">📦</span>
          {!collapsed && (
            <div className="logo-text">
              <h1>进销存系统</h1>
              <p>Inventory System</p>
            </div>
          )}
        </div>
        <button 
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? '展开导航栏' : '收缩导航栏'}
        >
          {collapsed ? '➡️' : '⬅️'}
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map(item => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${isMenuActive(item) ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </>
                )}
              </button>

              {/* 子菜单 */}
              {item.children && !collapsed && expandedMenus.includes(item.id) && (
                <ul className="nav-submenu">
                  {item.children.map(child => (
                    <li key={child.id} className="nav-subitem">
                      <button
                        className={`nav-sublink ${currentPage === child.id ? 'active' : ''}`}
                        onClick={() => onPageChange(child.id)}
                      >
                        <span className="nav-subicon">{child.icon}</span>
                        <span className="nav-sublabel">{child.label}</span>
                        {child.badge && (
                          <span className="nav-subbadge">{child.badge}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* 用户信息区域 */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">👤</div>
            <div className="user-details">
              <div className="user-name">系统管理员</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
          <div className="system-info">
            <div className="system-status">
              <span className="status-dot online"></span>
              <span className="status-text">系统正常</span>
            </div>
            <div className="system-version">v1.0.0</div>
          </div>
        </div>
      )}

      {/* 收缩状态下的用户头像 */}
      {collapsed && (
        <div className="sidebar-footer-collapsed">
          <div className="user-avatar-collapsed">👤</div>
          <div className="status-dot online"></div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;