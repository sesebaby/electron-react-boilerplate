import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import './Layout.css';

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
    <div className="app-layout">
      {/* 左侧导航栏 */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
      
      {/* 右侧主内容区 */}
      <div className={`main-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* 顶部导航栏 */}
        <TopBar 
          currentPage={currentPage}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        {/* 主内容区 */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;