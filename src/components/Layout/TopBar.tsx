import React, { useState } from 'react';

interface TopBarProps {
  currentPage: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

// 页面标题映射
const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  'dashboard': { title: '仪表板', breadcrumb: ['首页', '仪表板'] },
  'inventory-overview': { title: '库存概览', breadcrumb: ['库存管理', '库存概览'] },
  'products': { title: '商品管理', breadcrumb: ['库存管理', '商品管理'] },
  'categories': { title: '分类管理', breadcrumb: ['库存管理', '分类管理'] },
  'warehouses': { title: '仓库管理', breadcrumb: ['库存管理', '仓库管理'] },
  'stock-in': { title: '入库管理', breadcrumb: ['库存管理', '入库管理'] },
  'stock-out': { title: '出库管理', breadcrumb: ['库存管理', '出库管理'] },
  'stock-adjust': { title: '库存调整', breadcrumb: ['库存管理', '库存调整'] },
  'suppliers': { title: '供应商管理', breadcrumb: ['采购管理', '供应商管理'] },
  'purchase-orders': { title: '采购订单', breadcrumb: ['采购管理', '采购订单'] },
  'customers': { title: '客户管理', breadcrumb: ['销售管理', '客户管理'] },
  'sales-orders': { title: '销售订单', breadcrumb: ['销售管理', '销售订单'] },
  'reports': { title: '报表分析', breadcrumb: ['报表分析'] },
  'system': { title: '系统管理', breadcrumb: ['系统管理'] }
};

export const TopBar: React.FC<TopBarProps> = ({ 
  currentPage, 
  onToggleSidebar, 
  sidebarCollapsed 
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentPageInfo = pageTitles[currentPage] || { 
    title: '未知页面', 
    breadcrumb: ['未知页面'] 
  };

  const notifications = [
    { id: 1, type: 'warning', message: '有3个商品库存不足', time: '5分钟前' },
    { id: 2, type: 'info', message: '采购订单PO20240104已确认', time: '10分钟前' },
    { id: 3, type: 'success', message: '销售订单SO20240104已完成', time: '1小时前' }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('搜索:', searchValue);
    // TODO: 实现搜索功能
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* 移动端菜单按钮 */}
        <button 
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
        >
          ☰
        </button>

        {/* 面包屑导航 */}
        <nav className="breadcrumb">
          {currentPageInfo.breadcrumb.map((crumb, index) => (
            <span key={index} className="breadcrumb-item">
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <span className={index === currentPageInfo.breadcrumb.length - 1 ? 'current' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>

        {/* 页面标题 */}
        <h1 className="page-title">{currentPageInfo.title}</h1>
      </div>

      <div className="topbar-center">
        {/* 搜索框 */}
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="搜索商品、订单、客户..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <button 
                type="button"
                className="search-clear"
                onClick={() => setSearchValue('')}
              >
                ✕
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="topbar-right">
        {/* 快捷操作 */}
        <div className="quick-actions">
          <button className="quick-action-btn" title="新增商品">
            ➕
          </button>
          <button className="quick-action-btn" title="刷新数据">
            🔄
          </button>
          <button className="quick-action-btn" title="导出数据">
            📊
          </button>
        </div>

        {/* 通知 */}
        <div className="notification-wrapper">
          <button 
            className="notification-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            <span className="notification-badge">3</span>
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>通知消息</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowNotifications(false)}
                >
                  ✕
                </button>
              </div>
              <div className="notification-list">
                {notifications.map(notification => (
                  <div key={notification.id} className={`notification-item ${notification.type}`}>
                    <div className="notification-content">
                      <p>{notification.message}</p>
                      <span className="notification-time">{notification.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="notification-footer">
                <button className="view-all-btn">查看全部</button>
              </div>
            </div>
          )}
        </div>

        {/* 用户菜单 */}
        <div className="user-menu-wrapper">
          <button 
            className="user-menu-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">👤</div>
            <span className="user-name">管理员</span>
            <span className="dropdown-arrow">⏷</span>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="avatar-large">👤</div>
                <div className="user-details">
                  <div className="name">系统管理员</div>
                  <div className="role">Administrator</div>
                  <div className="email">admin@system.com</div>
                </div>
              </div>
              <div className="user-menu-divider"></div>
              <ul className="user-menu-list">
                <li>
                  <button className="user-menu-item">
                    <span className="menu-icon">👤</span>
                    个人资料
                  </button>
                </li>
                <li>
                  <button className="user-menu-item">
                    <span className="menu-icon">⚙️</span>
                    系统设置
                  </button>
                </li>
                <li>
                  <button className="user-menu-item">
                    <span className="menu-icon">🔐</span>
                    修改密码
                  </button>
                </li>
                <li>
                  <button className="user-menu-item">
                    <span className="menu-icon">📋</span>
                    操作日志
                  </button>
                </li>
                <li className="menu-divider"></li>
                <li>
                  <button className="user-menu-item logout">
                    <span className="menu-icon">🚪</span>
                    退出登录
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 系统状态 */}
        <div className="system-status">
          <span className="status-indicator online"></span>
          <span className="status-text">在线</span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;