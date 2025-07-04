import React, { useState, useEffect } from 'react';
import AppLayout from './components/Layout/AppLayout';
import PageContainer from './components/PageContainer';
import TestDataGenerator from './services/testData';
import './globals.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 简单的哈希路由处理
  useEffect(() => {
    // 初始化主题
    const savedTheme = localStorage.getItem('inventory-system-theme') || 'glass-future';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.className = `theme-${savedTheme}`;
    
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPage(hash);
      }
    };

    // 初始化页面
    handleHashChange();

    // 监听哈希变化
    window.addEventListener('hashchange', handleHashChange);

    // 初始化测试数据和系统
    const initSystem = async () => {
      try {
        await TestDataGenerator.initializeTestData();
        setIsLoading(false);
      } catch (error) {
        console.error('系统初始化失败:', error);
        setError('系统初始化失败，请刷新页面重试');
        setIsLoading(false);
      }
    };
    
    const initTimer = setTimeout(initSystem, 1000);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      clearTimeout(initTimer);
    };
  }, []);

  // 页面变化处理
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="loading-spinner"></div>
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h2 className="loading-title">进销存管理系统</h2>
          <p className="loading-text">系统正在初始化...</p>
          <div className="loading-progress">
            <div className="progress-bar"></div>
          </div>
          <div className="loading-tips">
            <p>✨ 全新UI界面设计</p>
            <p>🚀 左侧导航栏可收缩</p>
            <p>📊 丰富的Dashboard功能</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="app-error">
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h2 className="error-title">系统初始化失败</h2>
          <p className="error-message">{error}</p>
          <button 
            className="error-retry"
            onClick={() => window.location.reload()}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 主应用界面
  return (
    <div className="app">
      <AppLayout>
        <PageContainer currentPage={currentPage} />
      </AppLayout>
    </div>
  );
};

export default App;