import React, { useState, useEffect, useRef } from 'react';
import ThemeSwitcher from '../ThemeSwitcher/ThemeSwitcher';
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
  'dashboard': { title: '仪表板', breadcrumb: ['仪表板'] },

  // 库存管理
  'inventory-overview': { title: '库存概览', breadcrumb: ['库存管理', '库存概览'] },
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

  return (
    <header className={`
      fixed top-0 right-0 z-30 h-16 transition-all duration-300
      ${sidebarCollapsed ? 'left-16' : 'left-64'}
      glass-surface border-b border-white/10
    `}>
      <div className="h-full px-4 flex items-center justify-between">
        
        {/* 左侧区域 */}
        <div className="flex items-center gap-4">
          {/* 移动端菜单按钮 */}
          <button
            type="button"
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
            onClick={onToggleSidebar}
          >
            ☰
          </button>

          {/* 面包屑导航和标题 */}
          <div className="flex flex-col">
            <nav className="flex items-center text-sm text-white/60 mb-1">
              {currentPageInfo.breadcrumb.map((crumb, index) => (
                <span key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-white/40">/</span>}
                  <span className={`transition-colors ${
                    index === currentPageInfo.breadcrumb.length - 1 
                      ? 'text-white/90 font-medium' 
                      : 'hover:text-white/80'
                  }`}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
            <h1 className="text-xl font-bold text-white leading-tight">{currentPageInfo.title}</h1>
          </div>
        </div>

        {/* 中间区域 - 搜索框 */}
        <div className="flex-1 max-w-md mx-8 hidden md:block">
          <div className="relative" ref={searchResultsRef}>
            <form onSubmit={handleSearch}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                  {isSearching ? '⏳' : '🔍'}
                </span>
                <input
                  type="text"
                  className="w-full h-10 pl-10 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                  placeholder="搜索商品、订单、客户..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
                {searchValue && (
                  <button 
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/80 transition-colors"
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
                      <h3 className="text-sm font-medium text-white/80">
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
                          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white/60 text-sm">
                            📦
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{item.name}</div>
                            <div className="text-white/60 text-sm truncate">
                              SKU: {item.sku} | 分类: {item.category}
                            </div>
                            <div className="text-white/50 text-xs">
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
                    <div className="text-white/40 text-4xl mb-2">🔍</div>
                    <div className="text-white/60 text-sm">
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
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
              title="新增商品"
            >
              ➕
            </button>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
              title="刷新数据"
            >
              🔄
            </button>
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
              title="导出数据"
            >
              📊
            </button>
          </div>

          {/* 通知 */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all border border-white/10 hover:border-white/20"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="absolute top-12 right-0 w-80 popup-dropdown z-50">
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">通知消息</h3>
                    <button
                      type="button"
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      onClick={() => setShowNotifications(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="p-4 text-center text-white/60">
                        <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-2"></div>
                        加载中...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center text-white/60">
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
                            <p className="text-white text-sm font-medium mb-1">{notification.title}</p>
                            <p className="text-white/80 text-xs mb-2">{notification.message}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-white/60 text-xs">
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
                        className="w-full text-center text-white/80 hover:text-white text-sm font-medium py-2 rounded-lg hover:bg-white/10 transition-colors"
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all border border-white/10 hover:border-white/20"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                👤
              </div>
              <span className="text-white text-sm font-medium hidden sm:block">管理员</span>
              <span className="text-white/60 text-xs hidden sm:block">⏷</span>
            </button>

            {showUserMenu && (
              <>
                <div className="absolute top-12 right-0 w-64 popup-dropdown z-50">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">系统管理员</div>
                        <div className="text-white/70 text-sm truncate">Administrator</div>
                        <div className="text-white/50 text-xs truncate">admin@system.com</div>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left">
                      <span className="text-base">👤</span>
                      <span className="text-sm">个人资料</span>
                    </button>
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left">
                      <span className="text-base">⚙️</span>
                      <span className="text-sm">系统设置</span>
                    </button>
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left">
                      <span className="text-base">🔐</span>
                      <span className="text-sm">修改密码</span>
                    </button>
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors text-left">
                      <span className="text-base">📋</span>
                      <span className="text-sm">操作日志</span>
                    </button>
                    <div className="my-2 border-t border-white/10"></div>
                    <button type="button" className="w-full flex items-center gap-3 px-4 py-2 text-red-300 hover:text-red-200 hover:bg-red-500/10 transition-colors text-left">
                      <span className="text-base">🚪</span>
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
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-white/70 text-sm">在线</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;