import React, { useState, useEffect, useRef } from 'react';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
import QuickActions from './QuickActions';
import { InventoryService } from '../../services/inventory/inventoryService';
import { InventoryItem } from '../../types/inventory';
import { notificationHelper } from '../../utils/notificationHelper';
import { SimpleNotification, NotificationType } from '../../types/simpleNotification';

interface TopBarProps {
  currentPage: string;
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

// 页面标题映射
const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  'dashboard': { title: '仪表盘', breadcrumb: ['仪表盘'] },

  // 库存管理
  'inventory-card-view': { title: '库存卡片视图', breadcrumb: ['库存管理', '库存卡片视图'] },
  'daily-consumption': { title: '逐日消耗视图', breadcrumb: ['库存管理', '逐日消耗视图'] },
  'products': { title: '商品管理', breadcrumb: ['库存管理', '商品管理'] },
  'categories': { title: '分类管理', breadcrumb: ['库存管理', '分类管理'] },
  'warehouses': { title: '仓库管理', breadcrumb: ['库存管理', '仓库管理'] },
  'stock-in': { title: '入库管理', breadcrumb: ['库存管理', '入库管理'] },
  'stock-out': { title: '出库管理', breadcrumb: ['库存管理', '出库管理'] },
  'stock-adjust': { title: '库存调整', breadcrumb: ['库存管理', '库存调整'] },

  // 采购管理
  'suppliers': { title: '供应商管理', breadcrumb: ['采购管理', '供应商管理'] },
  'purchase-orders': { title: '采购订单', breadcrumb: ['采购管理', '采购订单'] },
  'purchase-receipts': { title: '采购收货', breadcrumb: ['采购管理', '采购收货'] },

  // 销售管理
  'customers': { title: '客户管理', breadcrumb: ['销售管理', '客户管理'] },
  'sales-orders': { title: '销售订单', breadcrumb: ['销售管理', '销售订单'] },
  'sales-delivery': { title: '销售出库', breadcrumb: ['销售管理', '销售出库'] },

  // 财务管理
  'accounts-payable': { title: '应付账款', breadcrumb: ['财务管理', '应付账款'] },
  'accounts-receivable': { title: '应收账款', breadcrumb: ['财务管理', '应收账款'] },
  'payments': { title: '付款记录', breadcrumb: ['财务管理', '付款记录'] },
  'receipts': { title: '收款记录', breadcrumb: ['财务管理', '收款记录'] },

  // 报表分析
  'inventory-reports': { title: '库存报表', breadcrumb: ['报表分析', '库存报表'] },
  'inventory-entry-registration': { title: '出入库登记', breadcrumb: ['报表分析', '出入库登记'] },
  'sales-reports': { title: '销售报表', breadcrumb: ['报表分析', '销售报表'] },
  'purchase-reports': { title: '采购报表', breadcrumb: ['报表分析', '采购报表'] },
  'financial-reports': { title: '财务报表', breadcrumb: ['报表分析', '财务报表'] },

  // 系统管理
  'users': { title: '用户管理', breadcrumb: ['系统管理', '用户管理'] },
  'permissions': { title: '权限管理', breadcrumb: ['系统管理', '权限管理'] },
  'settings': { title: '系统设置', breadcrumb: ['系统管理', '系统设置'] },
  'logs': { title: '操作日志', breadcrumb: ['系统管理', '操作日志'] }
};

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  onToggleSidebar,
  sidebarCollapsed
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 通知相关状态
  const [notifications, setNotifications] = useState<SimpleNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const inventoryService = useRef(new InventoryService());

  // 点击外部关闭弹出窗体
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showNotifications || showUserMenu || showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications, showUserMenu, showSearchResults]);

  const currentPageInfo = pageTitles[currentPage] || {
    title: '未知页面',
    breadcrumb: ['未知页面']
  };

  // 加载通知数据
  const loadNotifications = () => {
    setIsLoadingNotifications(true);
    try {
      const recentNotifications = notificationHelper.getRecentNotifications();
      const unreadCount = notificationHelper.getUnreadCount();

      setNotifications(recentNotifications);
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('加载通知失败:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  // 组件挂载时加载通知
  useEffect(() => {
    loadNotifications();
  }, []);



  // 标记通知为已读
  const handleNotificationClick = (notificationId: string) => {
    try {
      notificationHelper.markAsRead(notificationId);
      // 重新加载通知数据
      loadNotifications();
    } catch (error) {
      console.error('标记通知已读失败:', error);
    }
  };

  // 标记所有通知为已读
  const handleMarkAllAsRead = () => {
    try {
      notificationHelper.markAllAsRead();
      loadNotifications();
      setShowNotifications(false);
    } catch (error) {
      console.error('标记所有通知已读失败:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      await inventoryService.current.initialize();
      const results = await inventoryService.current.searchItems(searchValue.trim());
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // 实时搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue.trim()) {
        handleSearch({ preventDefault: () => {} } as React.FormEvent);
      } else {
        setShowSearchResults(false);
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  const handleSearchResultClick = (item: InventoryItem) => {
    setShowSearchResults(false);
    setSearchValue('');
    
    // 导航到商品管理页面，并通过URL参数传递选中的商品SKU
    const targetPage = 'products';
    const searchParams = new URLSearchParams();
    searchParams.set('search', item.sku);
    searchParams.set('highlight', item.id);
    
    // 更新URL hash进行导航
    window.location.hash = `${targetPage}?${searchParams.toString()}`;
    
    // 触发浏览器的hashchange事件以确保页面更新
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const getNotificationTypeStyles = (type: NotificationType) => {
    switch (type) {
      case 'warning': return 'border-l-4 border-l-yellow-400 bg-yellow-500/10';
      case 'info': return 'border-l-4 border-l-blue-400 bg-blue-500/10';
      case 'success': return 'border-l-4 border-l-green-400 bg-green-500/10';
      case 'error': return 'border-l-4 border-l-red-400 bg-red-500/10';
      default: return 'border-l-4 border-l-gray-400 bg-gray-500/10';
    }
  };

  // 刷新数据处理函数
  const handleRefreshData = () => {
    // 重新加载通知
    loadNotifications();
    
    // 触发页面数据刷新
    window.dispatchEvent(new CustomEvent('refresh-data'));
    
    // 显示刷新成功通知
    notificationHelper.showOperationResult('数据刷新', true, '页面数据已刷新');
  };

  // 导出数据处理函数
  const handleExportData = () => {
    // 根据当前页面导出对应数据
    const exportActions: Record<string, () => void> = {
      'products': () => {
        window.dispatchEvent(new CustomEvent('export-products'));
      },
      'purchase-orders': () => {
        window.dispatchEvent(new CustomEvent('export-purchase-orders'));
      },
      'sales-orders': () => {
        window.dispatchEvent(new CustomEvent('export-sales-orders'));
      },
      default: () => {
        window.dispatchEvent(new CustomEvent('export-current-page'));
      }
    };

    const action = exportActions[currentPage] || exportActions.default;
    action();
    
    // 显示导出提示
    notificationHelper.showInfo('数据导出', '正在导出当前页面数据...');
  };

  return (
    <header className={`
      fixed top-0 right-0 z-50 h-20 transition-all duration-300
      ${sidebarCollapsed ? 'left-16' : 'left-64'}
      topbar-surface
    `}
      style={{ 
        borderBottom: '1px solid var(--glass-border)',
        color: 'var(--text-primary)' 
      }}>
      <div className="h-full px-4 flex items-center justify-between">
        
        {/* 左侧区域 */}
        <div className="flex items-center gap-4">
          {/* 移动端菜单按钮 */}
          <button
            type="button"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors"
            style={{ 
              color: 'var(--text-primary)',
              background: 'var(--hover-background)' 
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--active-background)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--hover-background)'}
            onClick={onToggleSidebar}
          >
            ☰
          </button>

          {/* 面包屑导航和标题 */}
          <div className="flex flex-col justify-center min-h-0">
            <nav className="flex items-center text-sm mb-1">
              {currentPageInfo.breadcrumb.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2" style={{ color: 'var(--text-accent)' }}>/</span>}
                  <span className={`transition-colors ${
                    index === currentPageInfo.breadcrumb.length - 1
                      ? 'font-medium'
                      : ''
                  }`}
                    style={{ 
                      color: index === currentPageInfo.breadcrumb.length - 1 
                        ? 'var(--text-primary)' 
                        : 'var(--text-secondary)',
                      textShadow: 'var(--popup-text-shadow)'
                    }}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
            <h1 className="text-xl font-bold leading-tight" style={{ 
              color: 'var(--text-primary)',
              textShadow: 'var(--popup-text-shadow)'
            }}>{currentPageInfo.title}</h1>
          </div>
        </div>

        {/* 中间区域 - 搜索框 */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative" ref={searchResultsRef}>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ 
                  color: 'var(--text-tertiary)',
                  textShadow: 'var(--popup-text-shadow)'
                }}>
                  {isSearching ? '⏳' : '🔍'}
                </span>
                <input
                  type="text"
                  className="glass-input w-full h-10 pl-10 pr-10 rounded-lg focus:outline-none transition-all"
                  placeholder="搜索商品、订单、客户..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  style={{
                    color: 'var(--text-primary)',
                    background: 'var(--card-background)',
                    border: 'var(--glass-border)',
                    textShadow: 'var(--popup-text-shadow)'
                  }}
                />
                {searchValue && (
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors"
                    style={{ 
                      color: 'var(--text-tertiary)',
                      textShadow: 'var(--popup-text-shadow)'
                    }}
                    onClick={() => {
                      setSearchValue('');
                      setShowSearchResults(false);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            {/* 搜索结果下拉框 */}
            {showSearchResults && (
              <div className="absolute top-12 left-0 right-0 popup-dropdown z-50 max-h-80 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    <div className="p-3 border-b border-white/10">
                      <h3 className="text-sm font-medium" style={{ color: 'var(--popup-text-secondary)' }}>
                        找到 {searchResults.length} 个商品
                      </h3>
                    </div>
                    {searchResults.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        className="w-full p-3 text-left hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                        onClick={() => handleSearchResultClick(item)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-sm" style={{ color: 'var(--popup-text-tertiary)' }}>
                            📦
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" style={{ color: 'var(--popup-text-primary)' }}>{item.name}</div>
                            <div className="text-sm truncate" style={{ color: 'var(--popup-text-secondary)' }}>
                              SKU: {item.sku} | 分类: {item.category}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--popup-text-tertiary)' }}>
                              库存: {item.stockQuantity} | ¥{item.unitPrice}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'in-stock' ? 'bg-green-500/20 text-green-300' :
                            item.status === 'low-stock' ? 'bg-yellow-500/20 text-yellow-300' :
                            item.status === 'out-of-stock' ? 'bg-red-500/20 text-red-300' :
                            'bg-gray-500/20 text-gray-300'
                          }`}>
                            {item.status === 'in-stock' ? '有库存' :
                             item.status === 'low-stock' ? '库存不足' :
                             item.status === 'out-of-stock' ? '缺货' : '已停产'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <div className="text-4xl mb-2" style={{ color: 'var(--popup-text-tertiary)' }}>🔍</div>
                    <div className="text-sm" style={{ color: 'var(--popup-text-secondary)' }}>
                      {isSearching ? '搜索中...' : `未找到包含 "${searchValue}" 的商品`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧区域 */}
        <div className="flex items-center gap-3">
          {/* 快捷操作 */}
          <div className="hidden lg:flex items-center gap-2">
            <QuickActions
              onRefresh={handleRefreshData}
              onExportData={handleExportData}
            />
          </div>

          {/* 通知 */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              className="glass-button relative w-9 h-9 flex items-center justify-center rounded-lg transition-all"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                color: 'var(--text-primary)',
                background: 'var(--card-background)',
                border: 'var(--glass-border)',
                textShadow: 'var(--popup-text-shadow)'
              }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--error-color)', color: 'var(--text-primary)' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="absolute top-12 right-0 w-80 popup-dropdown z-50">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--popup-text-primary)' }}>通知消息</h3>
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--popup-text-secondary)' }}
                      onClick={() => setShowNotifications(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="p-4 text-center" style={{ color: 'var(--popup-text-tertiary)' }}>
                        <div className="animate-spin w-6 h-6 border-2 rounded-full mx-auto mb-2" style={{ borderColor: 'var(--popup-text-tertiary)', borderTopColor: 'var(--popup-text-secondary)' }}></div>
                        加载中...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center" style={{ color: 'var(--popup-text-tertiary)' }}>
                        暂无通知消息
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${getNotificationTypeStyles(notification.type)}`}
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div>
                            <p className="text-sm font-medium mb-1" style={{ color: 'var(--popup-text-primary)' }}>{notification.title}</p>
                            <p className="text-xs mb-2" style={{ color: 'var(--popup-text-secondary)' }}>{notification.message}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs" style={{ color: 'var(--popup-text-tertiary)' }}>
                                {new Date(notification.createdAt).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {!notification.isRead && (
                                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-white/10">
                      <button
                        type="button"
                        className="w-full text-center text-sm font-medium py-2 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--popup-text-secondary)' }}
                        onClick={handleMarkAllAsRead}
                      >
                        标记全部已读
                      </button>
                    </div>
                  )}
                </div>
                <div className="popup-overlay" onClick={() => setShowNotifications(false)}></div>
              </>
            )}
          </div>

          {/* 用户菜单 */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              className="glass-button flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                color: 'var(--text-primary)',
                background: 'var(--card-background)',
                border: 'var(--glass-border)',
                textShadow: 'var(--popup-text-shadow)'
              }}
            >
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                👤
              </div>
              <span className="text-sm font-medium hidden sm:block" style={{ 
                color: 'var(--text-primary)',
                textShadow: 'var(--popup-text-shadow)'
              }}>管理员</span>
              <span className="text-xs hidden sm:block" style={{ 
                color: 'var(--text-tertiary)',
                textShadow: 'var(--popup-text-shadow)'
              }}>⏷</span>
            </button>

            {showUserMenu && (
              <>
                <div className="absolute top-12 right-0 w-64 popup-dropdown z-50">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center font-semibold" style={{ color: 'var(--text-primary)' }}>
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate" style={{ color: 'var(--popup-text-primary)' }}>系统管理员</div>
                        <div className="text-sm truncate" style={{ color: 'var(--popup-text-secondary)' }}>Administrator</div>
                        <div className="text-xs truncate" style={{ color: 'var(--popup-text-tertiary)' }}>admin@system.com</div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button type="button" className="user-menu-item">
                      <span className="menu-icon">👤</span>
                      <span className="text-sm">个人资料</span>
                    </button>
                    <button type="button" className="user-menu-item">
                      <span className="menu-icon">⚙️</span>
                      <span className="text-sm">系统设置</span>
                    </button>
                    <button type="button" className="user-menu-item">
                      <span className="menu-icon">🔐</span>
                      <span className="text-sm">修改密码</span>
                    </button>
                    <button type="button" className="user-menu-item">
                      <span className="menu-icon">📋</span>
                      <span className="text-sm">操作日志</span>
                    </button>
                    <div className="user-menu-divider"></div>
                    <button type="button" className="user-menu-item logout">
                      <span className="menu-icon">🚪</span>
                      <span className="text-sm">退出登录</span>
                    </button>
                  </div>
                </div>
                <div className="popup-overlay" onClick={() => setShowUserMenu(false)}></div>
              </>
            )}
          </div>

          {/* 主题切换器 */}
          <ThemeSwitcher />

          {/* 系统状态 */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg glass-surface" style={{
            background: 'var(--card-background)',
            border: 'var(--glass-border)'
          }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--success-color)' }}></span>
            <span className="text-sm" style={{ 
              color: 'var(--text-secondary)',
              textShadow: 'var(--popup-text-shadow)'
            }}>在线</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;