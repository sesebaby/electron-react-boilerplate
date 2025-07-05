import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
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
    
    // 应用Tailwind主题背景
    const themeColors = {
      'glass-future': 'linear-gradient(135deg, oklch(0.585 0.233 277.117) 0%, oklch(0.511 0.262 276.966) 100%)',
      'dark-tech': 'linear-gradient(135deg, oklch(0.208 0.042 265.755) 0%, oklch(0.279 0.041 260.031) 100%)',
      'warm-business': 'linear-gradient(135deg, oklch(0.828 0.189 84.429) 0%, oklch(0.769 0.188 70.08) 100%)'
    };
    document.body.style.background = themeColors[savedTheme as keyof typeof themeColors] || themeColors['glass-future'];
    document.body.style.minHeight = '100vh';
    document.body.style.color = 'white';
    
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
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600">
        <div className="glass-card p-12 text-center max-w-md w-full mx-4">
          <div className="mb-8">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">进销存管理系统</h2>
          <p className="text-white/90 mb-6">系统正在初始化...</p>
          <div className="w-full bg-white/20 rounded-full h-2 mb-6">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2 rounded-full animate-pulse w-[70%]"></div>
          </div>
          <div className="space-y-2 text-left">
            <p className="text-white/80 text-sm flex items-center gap-2">✨ 全新UI界面设计</p>
            <p className="text-white/80 text-sm flex items-center gap-2">🚀 左侧导航栏可收缩</p>
            <p className="text-white/80 text-sm flex items-center gap-2">📊 丰富的Dashboard功能</p>
          </div>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600">
        <div className="glass-card p-12 text-center max-w-md w-full mx-4">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">系统初始化失败</h2>
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 mb-6">
            <p className="text-white/90">{error}</p>
          </div>
          <button 
            className="glass-button px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-medium hover:transform hover:-translate-y-0.5 transition-all duration-300"
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
    <div className="min-h-screen">
      <AppLayout>
        <PageContainer currentPage={currentPage} />
      </AppLayout>
    </div>
  );
};

export default App;