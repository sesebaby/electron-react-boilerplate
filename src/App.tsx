import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import PageContainer from './components/PageContainer';
import { serviceManager } from './services/core';
import { ErrorBoundary } from './components/ErrorBoundary';
import GlobalDialogProvider from './components/providers/GlobalDialogProvider';
import { AuthProvider } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GlobalPasswordChangeModal from './components/GlobalPasswordChangeModal';
import './globals.css';
import './styles/theme-adaptations.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useTheme();

  // 简单的哈希路由处理
  useEffect(() => {
    // 初始化主题
    const savedTheme = localStorage.getItem('inventory-system-theme') || 'glass-future';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // 应用主题背景和文字颜色
    document.body.style.background = 'var(--app-background)';
    document.body.style.minHeight = '100vh';
    document.body.style.color = 'var(--text-primary)';
    
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPage(hash);
      } else {
        // 如果没有hash，默认设置为dashboard
        setCurrentPage('dashboard');
        window.location.hash = 'dashboard';
      }
    };

    // 初始化页面
    handleHashChange();

    // 监听哈希变化
    window.addEventListener('hashchange', handleHashChange);

    // 简化的系统初始化 - 立即执行，不延迟
    const initSystem = async () => {
      try {
        console.log('开始初始化系统...');

        // 使用新的核心服务管理器进行初始化
        await serviceManager.initialize();

        console.log('系统初始化完成');
        setIsLoading(false);
      } catch (error) {
        console.error('系统初始化失败:', error);
        setError('系统初始化失败，请刷新页面重试');
        setIsLoading(false);
      }
    };

    // 立即执行初始化，不使用延迟
    initSystem();

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // 页面变化处理
  const _handlePageChange = (page: string) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{background: 'var(--app-background)'}} data-testid="loading-screen">
        {/* 现代化背景效果 */}
        <div className="absolute inset-0">
          <div className="absolute w-72 h-72 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/3"></div>
          <div className="absolute w-64 h-64 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 right-1/3 top-2/3"></div>
          <div className="absolute w-80 h-80 bg-gradient-to-r from-cyan-500/8 to-blue-500/8 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-2/3 top-1/4"></div>
        </div>

        {/* 网格背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-white/[0.05]" 
             style={{
               backgroundImage: `
                 linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
               `,
               backgroundSize: '50px 50px'
             }}>
        </div>

        {/* 左右分栏布局 */}
        <div className="relative z-10 min-h-screen flex lg:flex-row flex-col">
          {/* 左侧：公司信息 */}
          <div className="lg:w-1/2 w-full flex flex-col justify-center px-8 lg:px-16 py-12">
            <div className="max-w-lg w-full mx-auto lg:mx-0">
              {/* 公司品牌 */}
              <div className="mb-12">
                <div className="mb-8">
                  <h1 className="text-3xl lg:text-4xl font-bold mb-3 leading-tight" style={{color: 'var(--text-primary)'}}>
                    唐山市无踪信息科技
                  </h1>
                  <p className="text-lg font-medium mb-2" style={{color: 'var(--text-secondary)'}}>
                    专业软件开发 · 技术创新领航
                  </p>
                  <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>
                    为企业提供高质量的数字化解决方案
                  </p>
                </div>

                {/* 特色标签 */}
                <div className="flex flex-wrap gap-2 mb-8">
                  <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-xs font-medium">
                    企业级系统
                  </span>
                  <span className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-green-300 text-xs font-medium">
                    永久免费
                  </span>
                  <span className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-purple-300 text-xs font-medium">
                    定制开发
                  </span>
                </div>
              </div>

              {/* 开发者信息卡片 */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-2xl mb-6">
                <h3 className="text-base font-semibold mb-4 flex items-center" style={{color: 'var(--text-primary)'}}>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3"></div>
                  开发团队
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{color: 'var(--text-primary)'}}>远古牛哥</p>
                      <p className="text-sm" style={{color: 'var(--text-secondary)'}}>首席开发工程师</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium" style={{color: 'var(--text-primary)'}}>18833305508</p>
                      <p className="text-sm" style={{color: 'var(--text-secondary)'}}>技术支持热线</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 服务说明 */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-2xl p-5 border border-emerald-400/20">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-base mb-2" style={{color: 'var(--success-color)'}}>免费使用承诺</h4>
                    <p className="text-sm leading-relaxed mb-3" style={{color: 'var(--text-secondary)'}}>
                      本软件完全免费使用，无隐藏费用。如需定制开发、功能扩展或界面美化，欢迎联系我们的专业团队。
                    </p>
                    <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                      技术咨询 · 定制开发 · 系统集成 · 主题设计
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：加载界面 */}
          <div className="lg:w-1/2 w-full flex flex-col justify-center px-8 lg:px-16 py-12">
            <div className="max-w-md w-full mx-auto">
              {/* 加载卡片 */}
              <div className="glass-card backdrop-blur-xl bg-white/[0.08] border-white/20 shadow-2xl p-8 text-center">
                {/* 加载动画区域 */}
                <div className="mb-8">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg relative">
                    <div className="absolute inset-0 border-4 border-white/20 rounded-2xl"></div>
                    <div className="absolute inset-0 border-4 border-t-white border-r-white/50 rounded-2xl animate-spin"></div>
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  
                  <div className="flex justify-center gap-2 mb-6">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]"></div>
                  </div>
                </div>

                {/* 系统标题 */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>进销存管理系统</h2>
                  <p className="mb-4" style={{color: 'var(--text-secondary)'}}>系统正在初始化...</p>
                  <p className="text-sm" style={{color: 'var(--text-tertiary)'}}>正在加载核心业务服务和数据库连接</p>
                </div>
                
                {/* 进度条 */}
                <div className="w-full bg-white/20 rounded-full h-2 mb-6">
                  <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2 rounded-full animate-pulse w-[70%]"></div>
                </div>

                {/* 功能特性 */}
                <div className="space-y-2 text-left mb-8">
                  <p className="text-sm flex items-center gap-2" style={{color: 'var(--text-secondary)'}}>
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--text-primary)'}}></span>
                    全新UI界面设计
                  </p>
                  <p className="text-sm flex items-center gap-2" style={{color: 'var(--text-secondary)'}}>
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--text-primary)'}}></span>
                    左侧导航栏可收缩
                  </p>
                  <p className="text-sm flex items-center gap-2" style={{color: 'var(--text-secondary)'}}>
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor: 'var(--text-primary)'}}></span>
                    丰富的Dashboard功能
                  </p>
                </div>

                {/* 底部提示 */}
                <div className="pt-4 border-t border-white/10 text-center">
                  <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>
                    如遇问题，请联系技术支持 · 免费使用 · 专业服务
                  </p>
                </div>
              </div>
            </div>
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
          <h2 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>系统初始化失败</h2>
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'var(--error-color)', borderColor: 'var(--error-color)' }}>
            <p style={{color: 'var(--text-primary)'}}>{error}</p>
          </div>
          <button
            type="button"
            className="glass-button px-6 py-3 rounded-lg font-medium hover:transform hover:-translate-y-0.5 transition-all duration-300"
            style={{ backgroundColor: 'var(--error-color)', color: 'var(--text-primary)' }}
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
        // 这里可以发送错误报告到监控服务
      }}
    >
      <AuthProvider>
        <GlobalDialogProvider>
          <ProtectedRoute>
            <div className="min-h-screen" data-testid="app-loaded">
              <AppLayout>
                <PageContainer currentPage={currentPage} />
              </AppLayout>
              <GlobalPasswordChangeModal />
            </div>
          </ProtectedRoute>
        </GlobalDialogProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;