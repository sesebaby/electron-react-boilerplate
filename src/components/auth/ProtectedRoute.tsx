import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import LoginPage from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { getCurrentTheme } = useTheme();
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
  
  // 使用CSS变量替代硬编码颜色
  const spinnerStyle = {
    borderColor: 'var(--glass-border, rgba(255, 255, 255, 0.2))',
    borderTopColor: 'var(--text-primary)',
    borderRightColor: 'var(--text-secondary)'
  };
  const iconStyle = { color: 'var(--text-primary)' };
  const tagStyle = {
    backgroundColor: 'var(--surface-background)',
    borderColor: 'var(--glass-border)',
    color: 'var(--text-secondary)'
  };

  if (isLoading) {
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
              <div className="absolute inset-0 border-4 rounded-full" style={spinnerStyle}></div>
              <div className="absolute inset-0 border-4 rounded-full animate-spin" style={spinnerStyle}></div>
              <div className="absolute inset-2 rounded-full flex items-center justify-center" style={tagStyle}>
                <svg className="w-8 h-8" style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
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
              <span className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm" style={tagStyle}>
                企业级系统
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm" style={tagStyle}>
                永久免费
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm" style={tagStyle}>
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

          {/* 加载状态信息 */}
          <div className="text-center">
            <h2 className={`text-xl font-bold ${textColor} mb-2`}>验证身份中...</h2>
            <p className={`${textColorSecondary} text-sm`}>正在检查您的登录状态，请稍候</p>
          </div>

          {/* 底部提示 */}
          <div className={`mt-6 pt-4 border-t ${isWarmBusiness ? 'border-slate-800/15' : 'border-white/10'} text-center`}>
            <p className={`${textColorMuted} text-xs`}>
              如遇问题，请联系技术支持 · 免费使用 · 专业服务
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;