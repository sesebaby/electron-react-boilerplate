import React, { useState, useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import PageContainer from './components/PageContainer';
import { businessServiceManager } from './services/business';
import { dataInitializer } from './services/dataInitializer';
// testDataInitializer removed - using database mock data instead
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
  const { getCurrentTheme } = useTheme();

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

    // 初始化系统和数据
    const initSystem = async () => {
      try {
        // 首先初始化数据库
        console.log('Initializing database...');
        if (window.electronAPI) {
          // 使用 electronDatabase 服务进行初始化
          const { default: electronDatabase } = await import('./services/database/electronDatabase');
          await electronDatabase.initialize();
          console.log('Database initialized successfully');
        }

        // 然后初始化业务服务（会从数据库加载数据）
        console.log('Initializing business services...');
        await businessServiceManager.initialize();

        // 最后初始化其他数据
        console.log('Initializing additional data...');
        await dataInitializer.initializeData();

        // TODO: 初始化库存卡片视图测试数据（暂时禁用）
        // await testDataInitializer.initializeInventoryCardTestData();

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
    const currentTheme = getCurrentTheme();
    
    // 根据主题确定文字颜色
    const isWarmBusiness = currentTheme.name === 'warm-business';
    const textColor = isWarmBusiness ? 'text-slate-800' : 'text-white';
    const textColorSecondary = isWarmBusiness ? 'text-slate-600' : 'text-white/80';
    const textColorTertiary = isWarmBusiness ? 'text-slate-500' : 'text-white/60';
    const textColorMuted = isWarmBusiness ? 'text-slate-400' : 'text-white/50';
    
    // 背景装饰颜色
    const decorationColor = isWarmBusiness ? 'bg-slate-800/5' : 'bg-white/5';
    const decorationColorSecondary = isWarmBusiness ? 'bg-slate-800/3' : 'bg-white/3';
    const decorationColorTertiary = isWarmBusiness ? 'bg-slate-800/4' : 'bg-white/4';
    
    // 网格背景颜色
    const gridColor = isWarmBusiness ? 'rgba(51,65,85,0.1)' : 'rgba(255,255,255,0.03)';
    
    // 卡片背景和边框
    const cardBg = isWarmBusiness ? 'bg-white/[0.15]' : 'bg-white/[0.08]';
    const cardBorder = isWarmBusiness ? 'border-slate-800/20' : 'border-white/20';
    
    // 加载动画颜色
    const spinnerColor = isWarmBusiness ? 'border-slate-800/20' : 'border-white/20';
    const spinnerActiveColor = isWarmBusiness ? 'border-t-slate-800 border-r-slate-800/50' : 'border-t-white border-r-white/50';
    const spinnerBg = isWarmBusiness ? 'bg-slate-800/10' : 'bg-white/10';
    const iconColor = isWarmBusiness ? 'text-slate-800' : 'text-white';
    
    // 标签背景
    const tagBg = isWarmBusiness ? 'bg-slate-800/10' : 'bg-white/10';
    const tagBorder = isWarmBusiness ? 'border-slate-800/20' : 'border-white/20';
    const tagText = isWarmBusiness ? 'text-slate-700' : 'text-white/80';

    return (
      <div className="fixed inset-0 flex items-center justify-center min-h-screen relative overflow-hidden"
           style={{ background: currentTheme.preview }}>
        
        {/* 背景装饰效果 */}
        <div className="absolute inset-0">
          <div className={`absolute w-96 h-96 ${decorationColor} rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-1/4 top-1/3 animate-pulse`}></div>
          <div className={`absolute w-80 h-80 ${decorationColorSecondary} rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 right-1/3 top-2/3 animate-pulse [animation-delay:1s]`}></div>
          <div className={`absolute w-72 h-72 ${decorationColorTertiary} rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 left-2/3 top-1/4 animate-pulse [animation-delay:2s]`}></div>
        </div>

        {/* 网格背景 */}
        <div className={`absolute inset-0 ${isWarmBusiness ? 'bg-gradient-to-br from-white/[0.05] to-white/[0.08]' : 'bg-gradient-to-br from-white/[0.02] to-white/[0.05]'}`}
             style={{
               backgroundImage: `
                 linear-gradient(${gridColor} 1px, transparent 1px),
                 linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
               `,
               backgroundSize: '40px 40px'
             }}>
        </div>

        {/* 主加载卡片 */}
        <div className={`relative z-10 glass-card p-8 text-center max-w-lg w-full mx-4 backdrop-blur-xl ${cardBg} ${cardBorder} shadow-2xl`}>
          
          {/* 加载动画区域 */}
          <div className="mb-8">
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className={`absolute inset-0 border-4 ${spinnerColor} rounded-full`}></div>
              <div className={`absolute inset-0 border-4 ${spinnerActiveColor} rounded-full animate-spin`}></div>
              <div className={`absolute inset-2 ${spinnerBg} rounded-full flex items-center justify-center`}>
                <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
            
            <div className="flex justify-center gap-2 mb-6">
              <div className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full animate-bounce [animation-delay:0ms]`}></div>
              <div className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full animate-bounce [animation-delay:150ms]`}></div>
              <div className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full animate-bounce [animation-delay:300ms]`}></div>
            </div>
          </div>

          {/* 公司品牌信息 */}
          <div className="mb-8">
            <div className="mb-6">
              <h1 className={`text-4xl font-bold ${textColor} mb-3 tracking-wide`}>ultrathink</h1>
              <p className={`${textColorSecondary} text-lg font-medium mb-2`}>唐山市无踪信息科技</p>
              <p className={`${textColorTertiary} text-sm`}>专业软件开发 · 技术创新领航</p>
            </div>

            {/* 特色标签 */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className={`px-3 py-1 ${tagBg} border ${tagBorder} rounded-full ${tagText} text-xs font-medium backdrop-blur-sm`}>
                企业级系统
              </span>
              <span className={`px-3 py-1 ${tagBg} border ${tagBorder} rounded-full ${tagText} text-xs font-medium backdrop-blur-sm`}>
                永久免费
              </span>
              <span className={`px-3 py-1 ${tagBg} border ${tagBorder} rounded-full ${tagText} text-xs font-medium backdrop-blur-sm`}>
                定制开发
              </span>
            </div>
          </div>

          {/* 开发者信息卡片 */}
          <div className={`${isWarmBusiness ? 'bg-white/8' : 'bg-white/5'} backdrop-blur-xl rounded-2xl p-5 border ${isWarmBusiness ? 'border-slate-800/15' : 'border-white/10'} shadow-lg mb-6`}>
            <h3 className={`${textColor} text-base font-semibold mb-4 flex items-center justify-center`}>
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></div>
              开发团队
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className={`${textColor} font-medium`}>远古牛哥</p>
                  <p className={`${textColorTertiary} text-sm`}>首席开发工程师</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <p className={`${textColor} font-medium`}>18833305508</p>
                  <p className={`${textColorTertiary} text-sm`}>技术支持热线</p>
                </div>
              </div>
            </div>
          </div>

          {/* 进度条和状态 */}
          <div className="mb-6">
            <div className="text-center mb-4">
              <h2 className={`text-xl font-bold ${textColor} mb-2`}>系统正在初始化...</h2>
              <p className={`${textColorSecondary} text-sm`}>正在加载核心业务服务和数据库连接</p>
            </div>
            
            <div className={`w-full ${isWarmBusiness ? 'bg-slate-800/20' : 'bg-white/20'} rounded-full h-2 mb-4`}>
              <div className={`bg-gradient-to-r ${isWarmBusiness ? 'from-slate-800 to-slate-600' : 'from-blue-400 to-cyan-400'} h-2 rounded-full animate-pulse w-[70%]`}></div>
            </div>
          </div>

          {/* 功能特性 */}
          <div className="space-y-2 text-left mb-6">
            <p className={`${textColorSecondary} text-sm flex items-center gap-2`}>
              <span className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full`}></span>
              全新UI界面设计
            </p>
            <p className={`${textColorSecondary} text-sm flex items-center gap-2`}>
              <span className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full`}></span>
              左侧导航栏可收缩
            </p>
            <p className={`${textColorSecondary} text-sm flex items-center gap-2`}>
              <span className={`w-2 h-2 ${isWarmBusiness ? 'bg-slate-800' : 'bg-white'} rounded-full`}></span>
              丰富的Dashboard功能
            </p>
          </div>

          {/* 底部提示 */}
          <div className={`pt-4 border-t ${isWarmBusiness ? 'border-slate-800/15' : 'border-white/10'} text-center`}>
            <p className={`${textColorMuted} text-xs`}>
              如遇问题，请联系技术支持 · 免费使用 · 专业服务
            </p>
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
            type="button"
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
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error, errorInfo);
        // 这里可以发送错误报告到监控服务
      }}
    >
      <AuthProvider>
        <GlobalDialogProvider>
          <ProtectedRoute>
            <div className="min-h-screen">
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