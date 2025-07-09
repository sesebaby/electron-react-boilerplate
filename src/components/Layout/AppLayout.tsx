import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // 监听哈希变化来同步当前页面
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPage(hash);
      }
    };

    // 初始化
    handleHashChange();

    // 监听哈希变化
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  return (
    <div className="h-screen overflow-hidden">
      {/* 移动端遮罩层 */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Table布局容器 */}
      <div className="table-layout-container">
        {/* 第一行: 左侧导航栏 + 顶部栏 */}
        <div className="table-row-topbar">
          {/* 左侧导航栏单元格 */}
          <div className={`table-cell-sidebar ${!sidebarCollapsed ? 'expanded' : ''}`}>
            <div className="sidebar-container">
              <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
          
          {/* 顶部栏 */}
          <div className="table-cell-topbar">
            <div className="topbar-container">
              <TopBar
                currentPage={currentPage}
                onToggleSidebar={toggleSidebar}
                sidebarCollapsed={sidebarCollapsed}
              />
            </div>
          </div>
        </div>

        {/* 第二行: 主内容区 */}
        <div className="table-row-main">
          {/* 跳过左侧导航栏列 - 留空 */}
          <div className="table-cell-sidebar"></div>
          
          {/* 主内容区 */}
          <div className="table-cell-main">
            <main className="main-content">
              <div className="p-3 sm:p-4 md:p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;