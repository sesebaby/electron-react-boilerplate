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
    <div className="flex h-screen overflow-hidden">
      {/* 左侧导航栏 */}
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        currentPage={currentPage}
        onPageChange={handlePageChange}
      />
      
      {/* 右侧主内容区 */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* 顶部导航栏 */}
        <TopBar 
          currentPage={currentPage}
          onToggleSidebar={toggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
        />
        
        {/* 主内容区 */}
        <main className="flex-1 overflow-auto p-6 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;